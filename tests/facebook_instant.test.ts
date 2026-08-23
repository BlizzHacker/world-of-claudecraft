import { describe, expect, it } from 'vitest';
import {
  clampFacebookProgress,
  FACEBOOK_PROGRESS_EVENT,
  FACEBOOK_READY_EVENT,
  type FacebookLifecycleEvents,
  reportFacebookLifecycle,
  reportFacebookLoadProgress,
  signalFacebookGameReady,
} from '../src/game/facebook_instant';

function recordingSink(): FacebookLifecycleEvents & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    progress: (pct) => calls.push(`progress:${pct}`),
    ready: () => calls.push('ready'),
  };
}

describe('clampFacebookProgress', () => {
  it('clamps milestones into the 1..99 band the shell owns the rest of', () => {
    expect(clampFacebookProgress(60)).toBe(60);
    expect(clampFacebookProgress(0)).toBe(1);
    expect(clampFacebookProgress(-5)).toBe(1);
    expect(clampFacebookProgress(100)).toBe(99);
    expect(clampFacebookProgress(250)).toBe(99);
    expect(clampFacebookProgress(59.6)).toBe(60);
  });

  it('degrades non-finite input to the floor instead of throwing', () => {
    expect(clampFacebookProgress(Number.NaN)).toBe(1);
    expect(clampFacebookProgress(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('reportFacebookLifecycle', () => {
  it('does nothing outside the Facebook container', () => {
    const sink = recordingSink();
    expect(reportFacebookLifecycle(false, sink, 'progress', 60)).toBe(false);
    expect(reportFacebookLifecycle(false, sink, 'ready')).toBe(false);
    expect(sink.calls).toEqual([]);
  });

  it('forwards clamped progress and the ready signal when enabled', () => {
    const sink = recordingSink();
    expect(reportFacebookLifecycle(true, sink, 'progress', 60)).toBe(true);
    expect(reportFacebookLifecycle(true, sink, 'progress', 120)).toBe(true);
    expect(reportFacebookLifecycle(true, sink, 'ready')).toBe(true);
    expect(sink.calls).toEqual(['progress:60', 'progress:99', 'ready']);
  });
});

describe('module wiring', () => {
  it('exposes the event names the bundle shell listens for', () => {
    // The literal values are load-bearing: scripts/facebook/shell_inject.mjs
    // registers listeners for exactly these names in the bundle page.
    expect(FACEBOOK_PROGRESS_EVENT).toBe('cr-fb-progress');
    expect(FACEBOOK_READY_EVENT).toBe('cr-fb-ready');
  });

  it('no-ops outside a Facebook container without a DOM', () => {
    // Plain-Node import rule (src/game/CLAUDE.md): the thin wrappers must be
    // callable in the default Vitest env, where there is no window and
    // FACEBOOK_APP resolved false at import.
    expect(() => reportFacebookLoadProgress(60)).not.toThrow();
    expect(() => signalFacebookGameReady()).not.toThrow();
  });
});
