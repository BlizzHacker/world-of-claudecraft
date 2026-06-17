import { createAutomatedBotReport } from './antibot_db';

export type BotEvidenceKind = 'timing' | 'reaction' | 'multi_ip';

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
  distinctKinds: number;
  aboveLogSince: number | null;
  aboveThrottleSince: number | null;
  aboveKickSince: number | null;
  throttleMultiplier: number;          // 1.0 normal, 2.0 shadow-throttle active
  throttleActiveSince: number | null;  // when throttleMultiplier became 2.0; 30-min safety valve
  autoReportSent: boolean;
  // action timing (combat command intervals)
  timing: { lastActionAt: number; deltas: number[] };  // ring buffer, max 20 deltas
  // reaction time (stimulus → next combat command)
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

// SimEvent types whose delivery to a player starts a reaction-time measurement.
const REACTION_EVENTS = new Set(['death', 'castStop']);

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

export function recomputeScore(tracker: BotTracker, now: number): void {
  tracker.evidence = tracker.evidence.filter(e => e.expiresAt > now);
  tracker.score = tracker.evidence.reduce((s, e) => s + e.weight, 0);
  tracker.distinctKinds = new Set(tracker.evidence.map(e => e.kind)).size;
}

// Call from dispatchMessage, after field validation, before sim.* calls.
export function observeAction(tracker: BotTracker, cmd: string, now: number): void {
  // Action timing: near-zero variance in combat command intervals flags a scripted client.
  if (COMBAT_CMDS.has(cmd)) {
    if (tracker.timing.lastActionAt > 0) {
      pushRing(tracker.timing.deltas, now - tracker.timing.lastActionAt, RING_MAX);
      if (tracker.timing.deltas.length >= TIMING_MIN_SAMPLES) {
        const sd = computeStdDev(tracker.timing.deltas);
        if (sd < 15) {
          addEvidence(tracker, { kind: 'timing', weight: 0.7, expiresAt: now + TTL_2MIN,
            detail: `action interval stdDev ${sd.toFixed(1)}ms` });
        } else if (sd < 50) {
          addEvidence(tracker, { kind: 'timing', weight: 0.3, expiresAt: now + TTL_2MIN,
            detail: `action interval stdDev ${sd.toFixed(1)}ms` });
        } else {
          // Human-like variance — remove stale timing evidence so score can decay.
          tracker.evidence = tracker.evidence.filter(e => e.kind !== 'timing');
        }
      }
    }
    tracker.timing.lastActionAt = now;
  }

  // Reaction time: if a stimulus event was recorded for this session,
  // the next combat command closes the measurement window.
  if (tracker.reactionPending !== null) {
    const reaction = now - tracker.reactionPending.eventAt;
    tracker.reactionPending = null;
    pushRing(tracker.reactionDeltas, reaction, RING_MAX);
    if (tracker.reactionDeltas.length >= TIMING_MIN_SAMPLES) {
      const median = computeMedian(tracker.reactionDeltas);
      const sd = computeStdDev(tracker.reactionDeltas);
      // Phase 1: conservative 150ms threshold, no RTT correction.
      // A bot reacts in < 5ms; even at 0 RTT humans can't sustain < 150ms median.
      // Phase 2: subtract estimated RTT and tighten to 80ms.
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
export function onSimTick(tracker: BotTracker, session: BotSessionRef, now: number): BotAction {
  recomputeScore(tracker, now);
  return checkEscalation(tracker, session, now);
}

// ---- internal ----------------------------------------------------------------

function checkEscalation(tracker: BotTracker, session: BotSessionRef, now: number): BotAction {
  const { score, distinctKinds } = tracker;

  if (score >= 0.5 && distinctKinds >= 2) {
    tracker.aboveLogSince ??= now;
  } else {
    tracker.aboveLogSince = null;
  }

  if (score >= 0.8 && distinctKinds >= 2) {
    tracker.aboveThrottleSince ??= now;
  } else {
    tracker.aboveThrottleSince = null;
    tracker.throttleMultiplier = 1.0;
    tracker.throttleActiveSince = null;
  }

  // Same ≥ 2 kinds guard: a honeypot hit alone (score=1.0, kinds=1) throttles
  // + reports but never auto-kicks. Admin confirms before ban.
  if (score >= 1.0 && distinctKinds >= 2) {
    tracker.aboveKickSince ??= now;
  } else {
    tracker.aboveKickSince = null;
  }

  if (tracker.aboveLogSince !== null && now - tracker.aboveLogSince >= 30_000 && !tracker.autoReportSent) {
    tracker.autoReportSent = true;
    void createAutomatedBotReport(session, tracker)
      .catch(err => console.error('[antibot] report insert failed', err));
  }

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
