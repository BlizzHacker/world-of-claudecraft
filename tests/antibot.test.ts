import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTracker, addEvidence, removeEvidence, recomputeScore, observeAction, observeEvent, onSimTick,
  type BotEvidence, type BotTracker, type BotSessionRef,
} from '../server/antibot';

// Mock antibot_db so no DB calls fire during unit tests.
vi.mock('../server/antibot_db', () => ({
  createAutomatedBotReport: vi.fn().mockResolvedValue(undefined),
}));

import { createAutomatedBotReport } from '../server/antibot_db';

const mockSession: BotSessionRef = {
  accountId: 1, characterId: 1, name: 'TestBot', dbSessionId: null,
};

function evidence(kind: BotEvidence['kind'], weight: number, ttl = 60_000): BotEvidence {
  return { kind, weight, expiresAt: Date.now() + ttl, detail: 'test' };
}

// ---------------------------------------------------------------------------
// createTracker
// ---------------------------------------------------------------------------
describe('createTracker', () => {
  it('initialises with zero score and empty state', () => {
    const t = createTracker();
    expect(t.score).toBe(0);
    expect(t.evidence).toHaveLength(0);
    expect(t.distinctKinds).toBe(0);
    expect(t.throttleMultiplier).toBe(1.0);
    expect(t.autoReportSent).toBe(false);
    expect(t.aboveLogSince).toBeNull();
    expect(t.aboveThrottleSince).toBeNull();
    expect(t.aboveKickSince).toBeNull();
    expect(t.throttleActiveSince).toBeNull();
    expect(t.reactionPending).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// addEvidence
// ---------------------------------------------------------------------------
describe('addEvidence', () => {
  it('adds evidence when slot is empty', () => {
    const t = createTracker();
    addEvidence(t, evidence('timing', 0.7));
    expect(t.evidence).toHaveLength(1);
    expect(t.evidence[0].weight).toBe(0.7);
  });

  it('replaces weaker evidence of same kind', () => {
    const t = createTracker();
    addEvidence(t, evidence('timing', 0.3));
    addEvidence(t, evidence('timing', 0.7));
    expect(t.evidence).toHaveLength(1);
    expect(t.evidence[0].weight).toBe(0.7);
  });

  it('discards weaker update when existing is stronger', () => {
    const t = createTracker();
    addEvidence(t, evidence('timing', 0.7));
    addEvidence(t, evidence('timing', 0.3));
    expect(t.evidence).toHaveLength(1);
    expect(t.evidence[0].weight).toBe(0.7);
  });

  it('keeps evidence of different kinds independently', () => {
    const t = createTracker();
    addEvidence(t, evidence('timing', 0.7));
    addEvidence(t, evidence('reaction', 0.6));
    addEvidence(t, evidence('multi_ip', 0.4));
    expect(t.evidence).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// removeEvidence
// ---------------------------------------------------------------------------
describe('removeEvidence', () => {
  it('removes evidence of the given kind', () => {
    const t = createTracker();
    addEvidence(t, evidence('timing', 0.7));
    removeEvidence(t, 'timing');
    expect(t.evidence).toHaveLength(0);
  });

  it('is a no-op when the kind is absent', () => {
    const t = createTracker();
    addEvidence(t, evidence('timing', 0.7));
    removeEvidence(t, 'multi_ip');
    expect(t.evidence).toHaveLength(1);
  });

  it('leaves other kinds intact', () => {
    const t = createTracker();
    addEvidence(t, evidence('timing', 0.7));
    addEvidence(t, evidence('multi_ip', 0.4));
    removeEvidence(t, 'multi_ip');
    expect(t.evidence.map(e => e.kind)).toEqual(['timing']);
  });
});

// ---------------------------------------------------------------------------
// recomputeScore
// ---------------------------------------------------------------------------
describe('recomputeScore', () => {
  it('sums weights correctly', () => {
    const t = createTracker();
    addEvidence(t, evidence('timing', 0.7));
    addEvidence(t, evidence('reaction', 0.6));
    recomputeScore(t, Date.now());
    expect(t.score).toBeCloseTo(1.3);
    expect(t.distinctKinds).toBe(2);
  });

  it('prunes expired evidence', () => {
    const t = createTracker();
    t.evidence.push({ kind: 'timing', weight: 0.7, expiresAt: Date.now() - 1, detail: 'expired' });
    t.evidence.push({ kind: 'reaction', weight: 0.6, expiresAt: Infinity, detail: 'live' });
    recomputeScore(t, Date.now());
    expect(t.evidence).toHaveLength(1);
    expect(t.score).toBeCloseTo(0.6);
    expect(t.distinctKinds).toBe(1);
  });

  it('two evidences of same kind count as distinctKinds=1', () => {
    // This shouldn't happen after addEvidence, but recomputeScore must handle it.
    const t = createTracker();
    t.evidence.push({ kind: 'timing', weight: 0.7, expiresAt: Infinity, detail: 'a' });
    t.evidence.push({ kind: 'timing', weight: 0.3, expiresAt: Infinity, detail: 'b' });
    recomputeScore(t, Date.now());
    expect(t.distinctKinds).toBe(1);
  });

  it('preserves session-scoped evidence (expiresAt = Infinity)', () => {
    const t = createTracker();
    t.evidence.push({ kind: 'multi_ip', weight: 0.4, expiresAt: Infinity, detail: 'session' });
    recomputeScore(t, Date.now());
    expect(t.evidence).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Action timing variance
// ---------------------------------------------------------------------------
describe('Action timing variance', () => {
  function simulateActions(t: BotTracker, count: number, delta: number, jitter = 0): void {
    let now = Date.now();
    for (let i = 0; i < count; i++) {
      now += delta + (Math.random() - 0.5) * jitter;
      observeAction(t, 'attack', now);
    }
  }

  it('produces weight 0.7 evidence when stdDev < 15ms (naive bot)', () => {
    const t = createTracker();
    simulateActions(t, 15, 500, 0);  // perfectly regular 500ms intervals
    const ev = t.evidence.find(e => e.kind === 'timing');
    expect(ev).toBeDefined();
    expect(ev!.weight).toBe(0.7);
  });

  it('produces no evidence for stdDev in [15,50)ms (moderate band dropped — flagged rhythmic humans)', () => {
    const t = createTracker();
    // Deterministic ~20ms stdDev (alternating 480/520ms), inside the old 0.3 band.
    let now = Date.now();
    for (let i = 0; i < 15; i++) {
      now += i % 2 === 0 ? 480 : 520;
      observeAction(t, 'attack', now);
    }
    expect(t.evidence.find(e => e.kind === 'timing')).toBeUndefined();
  });

  it('produces no evidence when stdDev >= 50ms (human-like)', () => {
    const t = createTracker();
    // Highly irregular human-like intervals: 200ms, 800ms, 350ms, 1200ms, etc.
    const humanDeltas = [200, 850, 320, 1100, 450, 780, 230, 960, 410, 670, 280, 890];
    let now = Date.now();
    for (const d of humanDeltas) {
      now += d;
      observeAction(t, 'attack', now);
    }
    expect(t.evidence.find(e => e.kind === 'timing')).toBeUndefined();
  });

  it('ignores non-combat commands (target, tab)', () => {
    const t = createTracker();
    let now = Date.now();
    for (let i = 0; i < 20; i++) {
      now += 500;
      observeAction(t, 'target', now);
      observeAction(t, 'tab', now);
    }
    expect(t.evidence.find(e => e.kind === 'timing')).toBeUndefined();
    expect(t.timing.lastActionAt).toBe(0);
  });

  it('tracks loot and interact as combat commands', () => {
    const t = createTracker();
    let now = Date.now();
    for (let i = 0; i < 15; i++) {
      now += 500;
      observeAction(t, i % 2 === 0 ? 'loot' : 'interact', now);
    }
    expect(t.timing.lastActionAt).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Reaction times (disabled — self-generated stimulus removed)
// ---------------------------------------------------------------------------
describe('Reaction times (disabled: self-generated stimulus removed)', () => {
  // REACTION_EVENTS is empty: the player's own death/castStop no longer arm a
  // measurement window. The signal produces no evidence until re-introduced with
  // an external stimulus.
  it('does not arm a window on the player\'s own death', () => {
    const t = createTracker();
    observeEvent(t, 'death', Date.now());
    expect(t.reactionPending).toBeNull();
  });

  it('does not arm a window on the player\'s own castStop', () => {
    const t = createTracker();
    observeEvent(t, 'castStop', Date.now());
    expect(t.reactionPending).toBeNull();
  });

  it('never produces reaction evidence, even for fast regular responses', () => {
    const t = createTracker();
    let now = Date.now();
    for (let i = 0; i < 15; i++) {
      now += 1000;
      observeEvent(t, 'castStop', now);  // disabled → no-op
      now += 30;                          // would have been a 30ms "reaction"
      observeAction(t, 'cast', now);
    }
    expect(t.evidence.find(e => e.kind === 'reaction')).toBeUndefined();
    expect(t.reactionDeltas).toHaveLength(0);
  });

  // The measurement/closing logic is retained for a future re-introduction with an
  // external stimulus. Exercised here directly (reactionPending armed by hand) to
  // pin the corrected behaviour: ONLY a COMBAT_CMD closes the window.
  describe('closing logic (dormant; retained for external-stimulus re-introduction)', () => {
    it('a non-combat command does not close the window', () => {
      const t = createTracker();
      const now = Date.now();
      t.reactionPending = { eventType: 'external', eventAt: now };
      observeAction(t, 'tab', now + 40);
      expect(t.reactionPending).not.toBeNull();
      expect(t.reactionDeltas).toHaveLength(0);
    });

    it('a combat command closes the window and records the delta', () => {
      const t = createTracker();
      const now = Date.now();
      t.reactionPending = { eventType: 'external', eventAt: now };
      observeAction(t, 'attack', now + 120);
      expect(t.reactionPending).toBeNull();
      expect(t.reactionDeltas).toEqual([120]);
    });
  });
});

// ---------------------------------------------------------------------------
// Escalation state machine
// ---------------------------------------------------------------------------
describe('Escalation state machine', () => {
  beforeEach(() => {
    vi.mocked(createAutomatedBotReport).mockClear();
  });

  // Escalation now gates on behavioral FAMILIES (behavioralFamilyCount), not raw
  // distinctKinds: cadence (timing+reaction) is one family, multi_ip never gates.
  // Tests that exercise log/throttle/kick therefore pair `timing` with an
  // independent behavioral kind (`impossible`). Active responses also require
  // `enforce = true` (the ANTIBOT_ENFORCE flag); report-only is the default.

  it('stays at none when score < 0.5', () => {
    const t = createTracker();
    addEvidence(t, { kind: 'timing', weight: 0.3, expiresAt: Infinity, detail: 'x' });
    addEvidence(t, { kind: 'impossible', weight: 0.1, expiresAt: Infinity, detail: 'y' });
    const action = onSimTick(t, mockSession, Date.now(), true);
    expect(action).toBe('none');
    expect(t.aboveLogSince).toBeNull();
  });

  it('stays at none when score >= 0.5 but < 2 behavioral families', () => {
    const t = createTracker();
    addEvidence(t, { kind: 'timing', weight: 0.7, expiresAt: Infinity, detail: 'x' });
    const action = onSimTick(t, mockSession, Date.now(), true);
    expect(action).toBe('none');
    expect(t.aboveLogSince).toBeNull();
  });

  it('sets aboveLogSince when score >= 0.5 with >= 2 behavioral families', () => {
    const t = createTracker();
    addEvidence(t, { kind: 'timing', weight: 0.4, expiresAt: Infinity, detail: 'x' });
    addEvidence(t, { kind: 'impossible', weight: 0.3, expiresAt: Infinity, detail: 'y' });
    const now = Date.now();
    onSimTick(t, mockSession, now);
    expect(t.aboveLogSince).toBe(now);
  });

  it('fires auto-report after 30s above log threshold (even in report-only)', () => {
    const t = createTracker();
    addEvidence(t, { kind: 'timing', weight: 0.4, expiresAt: Infinity, detail: 'x' });
    addEvidence(t, { kind: 'impossible', weight: 0.3, expiresAt: Infinity, detail: 'y' });
    const start = Date.now();
    onSimTick(t, mockSession, start);           // sets aboveLogSince = start (enforce=false)
    onSimTick(t, mockSession, start + 29_999);  // not yet
    expect(createAutomatedBotReport).not.toHaveBeenCalled();
    onSimTick(t, mockSession, start + 30_000);  // fires
    expect(createAutomatedBotReport).toHaveBeenCalledOnce();
    expect(t.autoReportSent).toBe(true);
  });

  it('does not fire second auto-report once autoReportSent is true', () => {
    const t = createTracker();
    addEvidence(t, { kind: 'timing', weight: 0.4, expiresAt: Infinity, detail: 'x' });
    addEvidence(t, { kind: 'impossible', weight: 0.3, expiresAt: Infinity, detail: 'y' });
    const start = Date.now();
    onSimTick(t, mockSession, start);
    onSimTick(t, mockSession, start + 30_000);
    onSimTick(t, mockSession, start + 60_000);
    expect(createAutomatedBotReport).toHaveBeenCalledOnce();
  });

  it('activates shadow-throttle after 60s above 0.8 (enforce on, >= 2 families)', () => {
    const t = createTracker();
    addEvidence(t, { kind: 'timing', weight: 0.5, expiresAt: Infinity, detail: 'x' });
    addEvidence(t, { kind: 'impossible', weight: 0.4, expiresAt: Infinity, detail: 'y' });
    const start = Date.now();
    onSimTick(t, mockSession, start, true);
    expect(t.throttleMultiplier).toBe(1.0);
    onSimTick(t, mockSession, start + 59_999, true);
    expect(t.throttleMultiplier).toBe(1.0);
    onSimTick(t, mockSession, start + 60_000, true);
    expect(t.throttleMultiplier).toBe(2.0);
    expect(t.throttleActiveSince).toBe(start + 60_000);
  });

  it('returns kick after 2min above score 1.0 (enforce on, >= 2 families)', () => {
    const t = createTracker();
    addEvidence(t, { kind: 'timing', weight: 0.7, expiresAt: Infinity, detail: 'x' });
    addEvidence(t, { kind: 'impossible', weight: 0.6, expiresAt: Infinity, detail: 'y' });
    const start = Date.now();
    onSimTick(t, mockSession, start, true);
    expect(onSimTick(t, mockSession, start + 119_999, true)).toBe('none');
    expect(onSimTick(t, mockSession, start + 120_000, true)).toBe('kick');
  });

  it('does NOT kick when score >= 1.0 but < 2 behavioral families (single-signal)', () => {
    const t = createTracker();
    // One strong signal alone (e.g. a honeypot hit) is one family → never kicks.
    addEvidence(t, { kind: 'honeypot', weight: 1.0, expiresAt: Infinity, detail: 'honeypot' });
    const start = Date.now();
    onSimTick(t, mockSession, start, true);
    expect(onSimTick(t, mockSession, start + 120_000, true)).toBe('none');
    expect(t.aboveKickSince).toBeNull();
  });

  it('resets escalation timers when score drops', () => {
    const t = createTracker();
    addEvidence(t, { kind: 'timing', weight: 0.4, expiresAt: Infinity, detail: 'x' });
    addEvidence(t, { kind: 'impossible', weight: 0.3, expiresAt: Infinity, detail: 'y' });
    const start = Date.now();
    onSimTick(t, mockSession, start, true);
    expect(t.aboveLogSince).not.toBeNull();
    // Score drops (evidence expires)
    t.evidence = [];
    onSimTick(t, mockSession, start + 1_000, true);
    expect(t.aboveLogSince).toBeNull();
    expect(t.aboveThrottleSince).toBeNull();
  });

  it('forces kick path after 30min of sustained throttle (safety valve, enforce on)', () => {
    const t = createTracker();
    addEvidence(t, { kind: 'timing', weight: 0.5, expiresAt: Infinity, detail: 'x' });
    addEvidence(t, { kind: 'impossible', weight: 0.4, expiresAt: Infinity, detail: 'y' });
    // Fast-forward to throttle state
    const start = Date.now();
    onSimTick(t, mockSession, start, true);
    onSimTick(t, mockSession, start + 60_000, true);  // throttle activates
    expect(t.throttleActiveSince).not.toBeNull();

    // 30 min later without score reaching 1.0+2families — safety valve kicks in
    const MAX_THROTTLE_MS = 30 * 60_000;
    onSimTick(t, mockSession, start + 60_000 + MAX_THROTTLE_MS, true);
    expect(t.aboveKickSince).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Report-only mode (ANTIBOT_ENFORCE off — the production default)
// ---------------------------------------------------------------------------
describe('Report-only mode (enforce = false)', () => {
  beforeEach(() => {
    vi.mocked(createAutomatedBotReport).mockClear();
  });

  it('files a moderation report but never throttles or kicks, even at score >= 1.0', () => {
    const t = createTracker();
    addEvidence(t, { kind: 'timing', weight: 0.7, expiresAt: Infinity, detail: 'x' });
    addEvidence(t, { kind: 'impossible', weight: 0.6, expiresAt: Infinity, detail: 'y' });
    const start = Date.now();
    onSimTick(t, mockSession, start);                       // enforce defaults to false
    onSimTick(t, mockSession, start + 30_000);              // report fires
    expect(createAutomatedBotReport).toHaveBeenCalledOnce();
    // Well past the throttle (60s) and kick (120s) thresholds:
    expect(onSimTick(t, mockSession, start + 200_000)).toBe('none');
    expect(t.throttleMultiplier).toBe(1.0);
    expect(t.throttleActiveSince).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// False-positive regression guards
//
// One active test per legitimate-player scenario the report-only corrections fixed:
// the named human must NOT be flagged. Plus anti-regression (real bots are still
// caught) and one skipped test for the future external-stimulus reaction work.
// ---------------------------------------------------------------------------
describe('False-positive regression guards', () => {
  beforeEach(() => {
    vi.mocked(createAutomatedBotReport).mockClear();
  });

  it('ability-queueing (own cast finishing → pre-pressed next ability) produces no reaction evidence', () => {
    // A caster chaining a planned rotation reacts to nothing: their own cast
    // finishing is no longer a stimulus, so no reaction evidence accrues.
    const t = createTracker();
    let now = Date.now();
    for (let i = 0; i < 12; i++) {
      observeEvent(t, 'castStop', now);   // own cast finishing — no longer a stimulus
      now += 65;
      observeAction(t, 'castSlot', now);  // pre-queued next ability
      now += 935;
    }
    expect(t.evidence.find(e => e.kind === 'reaction')).toBeUndefined();
  });

  it('a fast rhythmic rotation (cadence only) never escalates, even under enforcement', () => {
    // timing + reaction are one cadence family → one behavioral kind → gate unmet.
    const t = createTracker();
    addEvidence(t, { kind: 'timing', weight: 0.7, expiresAt: Infinity, detail: 'low-variance intervals' });
    addEvidence(t, { kind: 'reaction', weight: 0.6, expiresAt: Infinity, detail: 'fast chaining' });
    const start = Date.now();
    onSimTick(t, mockSession, start, true);
    expect(onSimTick(t, mockSession, start + 120_000, true)).toBe('none');
    expect(t.aboveLogSince).toBeNull();
  });

  it('a shared connection plus one cadence flag never escalates', () => {
    // multi_ip is network context, not a behavioral family → it cannot be the
    // second gating kind. The score may exceed 1.0 but the gate stays unmet.
    const t = createTracker();
    addEvidence(t, { kind: 'multi_ip', weight: 0.4, expiresAt: Infinity, detail: 'shared household' });
    addEvidence(t, { kind: 'timing', weight: 0.7, expiresAt: Infinity, detail: 'low-variance intervals' });
    const start = Date.now();
    onSimTick(t, mockSession, start, true);
    expect(onSimTick(t, mockSession, start + 120_000, true)).toBe('none');
  });

  it('multi_ip still contributes to the composite score (context, not gating)', () => {
    const t = createTracker();
    addEvidence(t, { kind: 'multi_ip', weight: 0.4, expiresAt: Infinity, detail: 'shared household' });
    addEvidence(t, { kind: 'timing', weight: 0.3, expiresAt: Infinity, detail: 'low-variance intervals' });
    recomputeScore(t, Date.now());
    expect(t.score).toBeCloseTo(0.7);  // multi_ip is summed into the score
  });

  // --- anti-regression: real bots must STILL be caught ---

  it('a fixed-interval bot still earns strong timing evidence', () => {
    const t = createTracker();
    let now = Date.now();
    for (let i = 0; i < 15; i++) {
      now += 500;                       // perfectly regular — naive script
      observeAction(t, 'cast', now);
    }
    expect(t.evidence.find(e => e.kind === 'timing')?.weight).toBe(0.7);
  });

  it('cadence plus an independent behavioral signal still escalates under enforcement', () => {
    // Proves the corrections did not over-block: a genuinely independent second
    // family (here, repeated impossible actions) restores the kick path.
    const t = createTracker();
    addEvidence(t, { kind: 'timing', weight: 0.7, expiresAt: Infinity, detail: 'low-variance intervals' });
    addEvidence(t, { kind: 'impossible', weight: 0.6, expiresAt: Infinity, detail: 'out-of-range spam' });
    const start = Date.now();
    onSimTick(t, mockSession, start, true);
    expect(onSimTick(t, mockSession, start + 120_000, true)).toBe('kick');
  });

  // --- future: reaction signal re-introduction with an external stimulus ---

  it.skip('a genuine external stimulus answered quickly still earns reaction evidence', () => {
    // When the reaction signal is re-introduced with an external, target-bearing
    // stimulus, a sub-threshold response repeated many times is still bot-like.
    const t = createTracker();
    let now = Date.now();
    for (let i = 0; i < 12; i++) {
      observeEvent(t, 'incomingHostileCast', now);  // external stimulus (to be added)
      now += 30;
      observeAction(t, 'cast', now);
      now += 970;
    }
    expect(t.evidence.find(e => e.kind === 'reaction')).toBeDefined();
  });
});
