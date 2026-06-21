import { createAutomatedBotReport } from './antibot_db';

export type BotEvidenceKind =
  // One "cadence" family at the gate — not independent (see BEHAVIORAL_FAMILY).
  | 'timing' | 'reaction'
  // Independent behavioral families; not all emitted yet (future signals plug in).
  | 'sequence' | 'trajectory' | 'impossible' | 'honeypot'
  // Network context: scored and reported, but never gates a response.
  | 'multi_ip';

export interface BotEvidence {
  kind: BotEvidenceKind;
  weight: number;
  expiresAt: number;   // Date.now() ms; use Infinity for session-scoped evidence
  detail: string;
}

export interface BotTracker {
  // score and distinctKinds are stale between observeAction() and onSimTick().
  // Never read them outside onSimTick / checkEscalation.
  evidence: BotEvidence[];
  score: number;
  // Raw distinct-kind count — observability only; the gate uses behavioralFamilyCount.
  distinctKinds: number;
  aboveLogSince: number | null;
  aboveThrottleSince: number | null;
  aboveKickSince: number | null;
  throttleMultiplier: number;          // 1.0 normal, 2.0 shadow-throttle active
  throttleActiveSince: number | null;  // when throttleMultiplier became 2.0; 30-min safety valve
  autoReportSent: boolean;
  timing: { lastActionAt: number; deltas: number[] };  // ring buffer, max 20 deltas
  reactionPending: { eventType: string; eventAt: number } | null;
  reactionDeltas: number[];            // ring buffer, max 20
}

export type BotAction = 'none' | 'kick';

// Minimal session info needed by antibot_db — avoids importing ClientSession.
export interface BotSessionRef {
  accountId: number;
  characterId: number;
  name: string;
  dbSessionId: number | null;
}

// ---- constants ---------------------------------------------------------------

const TIMING_MIN_SAMPLES = 10;
const RING_MAX = 20;
const TTL_2MIN = 2 * 60_000;
const MAX_THROTTLE_MS = 30 * 60_000;

// Commands that indicate intentional combat/interaction — timing variance is
// meaningful here. Excludes target/tab (not execution), input (continuous stream).
const COMBAT_CMDS = new Set(['attack', 'cast', 'castSlot', 'loot', 'interact']);

// SimEvent types that start a reaction-time measurement. Empty on purpose: the
// original stimuli (the player's OWN castStop/death) were self-generated and
// anticipated, so this measured rotation cadence, not reaction, and flagged normal
// play. Re-enable only with an EXTERNAL stimulus (see the doc).
const REACTION_EVENTS = new Set<string>();

// Families used by the escalation gate: `timing`+`reaction` share one "cadence"
// family; `multi_ip` is absent (scores but never gates); each other kind is its own.
const BEHAVIORAL_FAMILY: Partial<Record<BotEvidenceKind, string>> = {
  timing: 'cadence',
  reaction: 'cadence',
  sequence: 'sequence',
  trajectory: 'trajectory',
  impossible: 'impossible',
  honeypot: 'honeypot',
};

// ---- public API --------------------------------------------------------------

export function createTracker(): BotTracker {
  return {
    evidence: [],
    score: 0,
    distinctKinds: 0,
    aboveLogSince: null,
    aboveThrottleSince: null,
    aboveKickSince: null,
    throttleMultiplier: 1.0,
    throttleActiveSince: null,
    autoReportSent: false,
    timing: { lastActionAt: 0, deltas: [] },
    reactionPending: null,
    reactionDeltas: [],
  };
}

export function addEvidence(tracker: BotTracker, ev: BotEvidence): void {
  const existing = tracker.evidence.find(e => e.kind === ev.kind);
  if (existing && existing.weight >= ev.weight) return;
  tracker.evidence = tracker.evidence.filter(e => e.kind !== ev.kind);
  tracker.evidence.push(ev);
}

export function removeEvidence(tracker: BotTracker, kind: BotEvidenceKind): void {
  tracker.evidence = tracker.evidence.filter(e => e.kind !== kind);
}

export function recomputeScore(tracker: BotTracker, now: number): void {
  tracker.evidence = tracker.evidence.filter(e => e.expiresAt > now);
  tracker.score = tracker.evidence.reduce((s, e) => s + e.weight, 0);
  tracker.distinctKinds = new Set(tracker.evidence.map(e => e.kind)).size;
}

// Call from dispatchMessage, after field validation, before sim.* calls.
export function observeAction(tracker: BotTracker, cmd: string, now: number): void {
  if (COMBAT_CMDS.has(cmd)) {
    if (tracker.timing.lastActionAt > 0) {
      pushRing(tracker.timing.deltas, now - tracker.timing.lastActionAt, RING_MAX);
      if (tracker.timing.deltas.length >= TIMING_MIN_SAMPLES) {
        const sd = computeStdDev(tracker.timing.deltas);
        if (sd < 15) {
          addEvidence(tracker, { kind: 'timing', weight: 0.7, expiresAt: now + TTL_2MIN,
            detail: `action interval stdDev ${sd.toFixed(1)}ms` });
        } else {
          // variance back to human-like — clear timing evidence so the score decays
          tracker.evidence = tracker.evidence.filter(e => e.kind !== 'timing');
        }
      }
    }
    tracker.timing.lastActionAt = now;
  }

  // COMBAT_CMD only — closing on any command would over-count. Dormant while empty.
  if (tracker.reactionPending !== null && COMBAT_CMDS.has(cmd)) {
    const reaction = now - tracker.reactionPending.eventAt;
    tracker.reactionPending = null;
    pushRing(tracker.reactionDeltas, reaction, RING_MAX);
    if (tracker.reactionDeltas.length >= TIMING_MIN_SAMPLES) {
      const median = computeMedian(tracker.reactionDeltas);
      const sd = computeStdDev(tracker.reactionDeltas);
      // Conservative threshold, no RTT correction yet; only valid for an external stimulus.
      if (median < 150) {
        addEvidence(tracker, { kind: 'reaction', weight: 0.6, expiresAt: now + TTL_2MIN,
          detail: `median reaction ${median.toFixed(0)}ms` });
      } else if (sd < 30) {
        addEvidence(tracker, { kind: 'reaction', weight: 0.3, expiresAt: now + TTL_2MIN,
          detail: `reaction stdDev ${sd.toFixed(1)}ms` });
      } else {
        tracker.evidence = tracker.evidence.filter(e => e.kind !== 'reaction');
      }
    }
  }
}

// Call from routeEvents when a triggering SimEvent lands in a player's mine list.
export function observeEvent(tracker: BotTracker, eventType: string, now: number): void {
  if (REACTION_EVENTS.has(eventType)) {
    tracker.reactionPending = { eventType, eventAt: now };
  }
}

// Call once per sim tick per session (skip if evidence empty and no timers set).
// `enforce` gates throttle/kick; default false = report-only (the report still fires).
export function onSimTick(tracker: BotTracker, session: BotSessionRef, now: number, enforce = false): BotAction {
  recomputeScore(tracker, now);
  return checkEscalation(tracker, session, now, enforce);
}

// Distinct behavioral families — what gates escalation. Cadence (timing+reaction)
// counts once and multi_ip is excluded, so cadence-only never reaches >= 2.
export function behavioralFamilyCount(evidence: BotEvidence[]): number {
  const families = new Set<string>();
  for (const e of evidence) {
    const family = BEHAVIORAL_FAMILY[e.kind];
    if (family !== undefined) families.add(family);
  }
  return families.size;
}

// ---- internal ----------------------------------------------------------------

function checkEscalation(tracker: BotTracker, session: BotSessionRef, now: number, enforce: boolean): BotAction {
  const { score } = tracker;
  const families = behavioralFamilyCount(tracker.evidence);

  if (score >= 0.5 && families >= 2) {
    tracker.aboveLogSince ??= now;
  } else {
    tracker.aboveLogSince = null;
  }

  if (score >= 0.8 && families >= 2) {
    tracker.aboveThrottleSince ??= now;
  } else {
    tracker.aboveThrottleSince = null;
    tracker.throttleMultiplier = 1.0;
    tracker.throttleActiveSince = null;
  }

  if (score >= 1.0 && families >= 2) {
    tracker.aboveKickSince ??= now;
  } else {
    tracker.aboveKickSince = null;
  }

  // The report fires regardless of `enforce` (it is the point of report-only);
  // only the throttle/kick below are gated.
  if (tracker.aboveLogSince !== null && now - tracker.aboveLogSince >= 30_000 && !tracker.autoReportSent) {
    tracker.autoReportSent = true;
    void createAutomatedBotReport(session, tracker)
      .catch(err => console.error('[antibot] report insert failed', err));
  }

  // Report-only: timers above still advance, but no throttle/kick is applied.
  if (!enforce) return 'none';

  if (tracker.aboveThrottleSince !== null && now - tracker.aboveThrottleSince >= 60_000) {
    tracker.throttleMultiplier = 2.0;
    tracker.throttleActiveSince ??= now;
  }

  // Safety valve: 30 min of sustained throttle without reaching kick → force kick path.
  if (tracker.throttleActiveSince !== null && now - tracker.throttleActiveSince >= MAX_THROTTLE_MS) {
    tracker.aboveKickSince ??= now;
  }

  if (tracker.aboveKickSince !== null && now - tracker.aboveKickSince >= 120_000) {
    return 'kick';  // game.ts calls game.leave(session, 'disconnected')
  }

  return 'none';
}

// ---- math helpers ------------------------------------------------------------

function computeStdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function computeMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pushRing<T>(arr: T[], item: T, max: number): void {
  arr.push(item);
  if (arr.length > max) arr.shift();
}
