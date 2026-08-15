// Routes the landing-page theme element through a dedicated AudioContext.
//
// Why: on Android (reported on a Pixel 9a, Chrome), opening the FIRST WebAudio
// output stream while an HTMLAudioElement is already playing as a bare media
// stream forces an audio-output reconfiguration that emits a loud crack in the
// in-flight playback. The game opens its sfx/music AudioContexts at world entry,
// exactly while the landing theme is still playing, so entering the world
// cracked audibly. Verified on-device: a context opened during bare-media
// playback cracks; any later context, or a context opened first, is clean.
// Routing the theme through WebAudio from the start means the low-latency
// output path opens WITH the theme, so the world-entry inits land in the
// already-clean "additional context" case.
//
// The element keeps owning volume/mute/pause (the fade-out and the mute toggle
// in main.ts are untouched); this module only provides the graph routing and
// the "play only once the routed context is running" gate. When WebAudio is
// unavailable or wiring throws, prepare() resolves anyway and the caller's
// plain element playback proceeds exactly as before.

import { audioUnlocked } from './audio_unlock';

interface MediaSourceLike {
  connect(node: unknown): unknown;
}

export interface ThemeAudioContextLike {
  readonly destination: unknown;
  resume(): Promise<void>;
  createMediaElementSource(el: HTMLAudioElement): MediaSourceLike;
  /** Optional so existing test stubs stay valid. A context that opened already
   *  'running' (media-engagement autoplay) skips the pre-gesture guard in
   *  prepare() and resumes normally. */
  readonly state?: AudioContextState | 'interrupted';
}

export interface LandingThemeAudio {
  /** Wire the element into the dedicated context (first call only), then
   *  resolve once that context is running, so the caller may start playback.
   *  Resolves immediately when WebAudio is unavailable (plain playback).
   *  Rejects only when the routed context cannot start yet (autoplay still
   *  blocked); the caller's existing gesture retry handles that. */
  prepare(el: HTMLAudioElement): Promise<void>;
}

function defaultContextFactory(): ThemeAudioContextLike {
  return new AudioContext();
}

export function createLandingThemeAudio(
  makeContext: () => ThemeAudioContextLike = defaultContextFactory,
  isUnlocked: () => boolean = audioUnlocked,
): LandingThemeAudio {
  let ctx: ThemeAudioContextLike | null = null;
  let unavailable = false;
  let wiredEl: HTMLAudioElement | null = null;
  return {
    prepare(el: HTMLAudioElement): Promise<void> {
      if (unavailable) return Promise.resolve();
      if (!ctx) {
        try {
          ctx = makeContext();
        } catch {
          unavailable = true;
          return Promise.resolve();
        }
      }
      if (wiredEl !== el) {
        try {
          ctx.createMediaElementSource(el).connect(ctx.destination);
          wiredEl = el;
        } catch {
          // Wiring failed (already-wired element, stubbed context, ...): leave
          // the element on plain playback. The context, if it opened, opened
          // BEFORE the element plays, which is the clean ordering anyway.
        }
      }
      // Before the first user gesture, resume() can only be refused, and
      // Chrome logs "The AudioContext was not allowed to start" for every
      // refused call whether or not the rejection is handled — three lines of
      // console noise on a cold landing load. Reporting the failure without
      // making the doomed call is identical from the caller's side (it still
      // rejects, so its gesture retry stays armed) and silent.
      if (ctx.state !== 'running' && !isUnlocked()) {
        return Promise.reject(new Error('audio locked: awaiting user gesture'));
      }
      // Routed (or plain with a live context): wait for running so routed
      // playback is never swallowed by a suspended graph. A rejection keeps
      // the caller's gesture retry armed.
      return ctx.resume();
    },
  };
}
