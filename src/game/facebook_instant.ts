// Facebook Instant Games lifecycle reporting from inside the game client.
//
// The bundle page (built by scripts/build_facebook_bundle.mjs) owns the
// FBInstant SDK: it calls initializeAsync, forwards real load milestones to
// FBInstant.setLoadingProgress, and calls startGameAsync exactly once. The SDK
// lifecycle lives in the page's inline shell script because the platform
// validator (scripts/facebook/bundle_rules.mjs) requires those calls in
// index.html itself, and because the shell must report progress while the
// multi-megabyte game module is still downloading, before any of this code
// exists in the page.
//
// This module is the game's half of that contract: main.ts reports its real
// boot milestones here, and the events below carry them to the shell. Outside
// the Facebook container (FACEBOOK_APP false) every call is a no-op.

import { FACEBOOK_APP } from './facebook_context';

/** detail: { pct: number } with pct in 1..99 (100 is the ready signal's job). */
export const FACEBOOK_PROGRESS_EVENT = 'cr-fb-progress';
/** Fired once the login/character screen is interactive; the shell answers
 *  with setLoadingProgress(100) + startGameAsync(). */
export const FACEBOOK_READY_EVENT = 'cr-fb-ready';

/** Pure core (tests/facebook_instant.test.ts): clamp a reported milestone into
 *  the 1..99 band the progress event carries. The shell owns 0 (its own SDK
 *  milestones start the bar) and 100 (tied to startGameAsync), so a client
 *  milestone can never finish the bar early or move it backwards past done. */
export function clampFacebookProgress(pct: number): number {
  if (!Number.isFinite(pct)) return 1;
  return Math.min(99, Math.max(1, Math.round(pct)));
}

export interface FacebookLifecycleEvents {
  progress(pct: number): void;
  ready(): void;
}

/** Pure core: gate + clamp, with the event sink injected so it unit-tests
 *  without a DOM. Returns the sink calls it made (for the thin wrapper both
 *  answers are ignored; the boolean is for tests). */
export function reportFacebookLifecycle(
  enabled: boolean,
  sink: FacebookLifecycleEvents,
  kind: 'progress' | 'ready',
  pct = 0,
): boolean {
  if (!enabled) return false;
  if (kind === 'progress') sink.progress(clampFacebookProgress(pct));
  else sink.ready();
  return true;
}

function domSink(): FacebookLifecycleEvents {
  return {
    progress: (pct) => {
      window.dispatchEvent(new CustomEvent(FACEBOOK_PROGRESS_EVENT, { detail: { pct } }));
    },
    ready: () => {
      window.dispatchEvent(new CustomEvent(FACEBOOK_READY_EVENT));
    },
  };
}

/** Report a real load milestone (1..99) to the Instant Games shell. */
export function reportFacebookLoadProgress(pct: number): void {
  try {
    reportFacebookLifecycle(
      FACEBOOK_APP && typeof window !== 'undefined',
      domSink(),
      'progress',
      pct,
    );
  } catch {
    // Progress reporting must never block the boot path.
  }
}

/** Signal that the login/character screen is ready and interactive. */
export function signalFacebookGameReady(): void {
  try {
    reportFacebookLifecycle(FACEBOOK_APP && typeof window !== 'undefined', domSink(), 'ready');
  } catch {
    // The shell has its own never-stuck failsafe; a lost signal only delays it.
  }
}
