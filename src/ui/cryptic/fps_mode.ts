// First-person mode — optional Cryptic Realm camera & reticle skin sitting on
// top of the upstream third-person camera.
//
// Design choice: we DON'T fork src/game/input.ts. Instead we expose
// mountFpsMode(input) which mutates the public camDist / camPitch fields the
// engine already supports, and overlays a reticle + crosshair cursor via CSS.
// When the user toggles back out we restore the prior values.
//
// Why this is safe:
//   - input.camDist / camYaw / camPitch are public class fields (see
//     src/game/input.ts:53-55). Setting camDist near zero pushes the
//     existing camera right behind / inside the player head, which already
//     produces a first-person-style view through the existing renderer.
//   - The existing click pipeline already raycasts from the camera through
//     the cursor position. When the cursor is locked to screen-center via
//     our reticle overlay + pointer cursor, click-to-attack works through
//     the same handlePick → handlePickedEntity flow without any sim edits.
//   - Toggle is per-user (localStorage 'cr_fps_mode' ∈ {'on','off'}).
//     The keybind defaults to `V` (view) and can be intercepted before the
//     base input system sees it — we use a window-level keydown listener
//     that ignores form inputs.

import './realm_env';
import type { Input } from '../../game/input';
import { resolveAutoFps } from './auto_fps';
import { getActiveRealm } from '../../sim/realms';

/** True when the active realm locks the camera to first-person (FPS realm). */
function isFpsLockedRealm(): boolean {
  try { return getActiveRealm().fpsOnly === true; } catch { return false; }
}

const STORE_KEY = 'cr_fps_mode';
const RETICLE_ID = 'cr-fps-reticle';
const FPS_CAM_DIST = 0.55;
const FPS_CAM_PITCH = 0.04;
// Diablo camera — the DuranceOfHate reference angle, zoomed OUT a bit more for the
// overview the user wants: dist 13 (pulled back from 9) so you see more of the room
// around you, at the steep near-overhead ARPG pitch (0.98 rad ≈ 56°). Hard-LOCKED
// every frame (pitch + dist) so wheel zoom, pitch-drag, pinch, and auto-FPS can't
// drift it — this is a fixed, non-adjustable view.
const DIABLO_CAM_DIST = 13;
const DIABLO_CAM_PITCH = 0.98;

type FpsMode = 'on' | 'off' | 'diablo';

function isFpsMode(v: string | null | undefined): v is FpsMode {
  return v === 'on' || v === 'off' || v === 'diablo';
}

export function resolveFpsMode(): FpsMode {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage?.getItem(STORE_KEY) : null;
    if (isFpsMode(v)) return v;
  } catch { /* storage unavailable */ }
  return 'off';
}

export function persistFpsMode(mode: FpsMode): void {
  try {
    window.localStorage?.setItem(STORE_KEY, mode);
  } catch { /* storage unavailable */ }
}

interface FpsRuntime {
  mode: FpsMode;
  /** Camera values captured before we entered an authored camera preset. */
  savedDist: number;
  savedPitch: number;
}

function injectReticle(): HTMLElement {
  let el = document.getElementById(RETICLE_ID);
  if (el) return el;
  el = document.createElement('div');
  el.id = RETICLE_ID;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <svg viewBox="0 0 32 32" width="32" height="32" focusable="false">
      <circle cx="16" cy="16" r="2.5" fill="currentColor"></circle>
      <circle cx="16" cy="16" r="9" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.7"></circle>
      <line x1="16" y1="2"  x2="16" y2="9"  stroke="currentColor" stroke-width="1.6"></line>
      <line x1="16" y1="23" x2="16" y2="30" stroke="currentColor" stroke-width="1.6"></line>
      <line x1="2"  y1="16" x2="9"  y2="16" stroke="currentColor" stroke-width="1.6"></line>
      <line x1="23" y1="16" x2="30" y2="16" stroke="currentColor" stroke-width="1.6"></line>
    </svg>
  `;
  document.body.appendChild(el);
  return el;
}

function applyBodyClasses(mode: FpsMode): void {
  document.body.classList.toggle('cr-fps-active', mode === 'on');
  document.body.classList.toggle('cr-diablo-camera-active', mode === 'diablo');
}

function applyCameraMode(input: Input, rt: FpsRuntime, mode: FpsMode): void {
  if (mode === 'off') {
    input.camDist = rt.savedDist;
    input.camPitch = rt.savedPitch;
    rt.mode = 'off';
    applyBodyClasses('off');
    return;
  }

  if (rt.mode === 'off') {
    rt.savedDist = input.camDist;
    rt.savedPitch = input.camPitch;
  }

  if (mode === 'on') {
    input.camDist = FPS_CAM_DIST;
    input.camPitch = FPS_CAM_PITCH;
  } else {
    input.camDist = DIABLO_CAM_DIST;
    input.camPitch = DIABLO_CAM_PITCH;
  }
  rt.mode = mode;
  applyBodyClasses(mode);
}

function shouldIgnoreKey(ev: KeyboardEvent): boolean {
  const t = ev.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (t.isContentEditable) return true;
  return false;
}

export interface MountFpsOptions {
  /** Key to toggle FPS mode. Default 'v'. Case-insensitive. */
  toggleKey?: string;
}

let runtime: FpsRuntime | null = null;

/** Programmatically set FPS mode. Used by the header toggle button.
 *  No-op on FPS-locked realms — the camera stays first-person. */
export function setFpsMode(input: Input, mode: FpsMode): void {
  if (!runtime) return;
  if (isFpsLockedRealm()) return;
  applyCameraMode(input, runtime, mode);
  persistFpsMode(mode);
}

export function mountFpsMode(input: Input, opts: MountFpsOptions = {}): void {
  if (typeof document === 'undefined') return;
  if (runtime) return; // already mounted

  runtime = { mode: 'off', savedDist: input.camDist, savedPitch: input.camPitch };
  injectReticle();

  // FPS-only realm: lock to first-person on mount and ignore toggles below.
  const locked = isFpsLockedRealm();
  if (locked) {
    applyCameraMode(input, runtime, 'on');
  } else {
    const initial = resolveFpsMode();
    if (initial !== 'off') applyCameraMode(input, runtime, initial);
  }

  // Auto-FPS on full zoom-in: when the user scrolls the camera all the way
  // in (camDist hits the minimum clamp of 3), flip to FPS automatically.
  // Scrolling back out exits FPS the same way. Tick-driven rather than
  // wheel-driven so we catch every path that mutates camDist (touch pinch,
  // settings slider, scripted zooms).
  const tick = () => {
    if (!runtime) return;
    if (locked) {
      // An FPS-locked realm is first person and stays first person. Re-asserted
      // per frame for the same reason Diablo mode is: camDist has several other
      // writers (the remembered-zoom restore, the wheel, pinch, scripted zooms)
      // and a value written ONCE at mount loses to every one of them.
      input.camDist = FPS_CAM_DIST;
      requestAnimationFrame(tick);
      return;
    }
    // Diablo mode is a LOCKED camera: re-assert the fixed D2 angle/zoom every
    // frame so scroll-wheel zoom, pinch, or scripted moves can't drift it. This
    // is what "save diablo mode and lock it" needs — the angle stays put.
    if (runtime.mode === 'diablo') {
      input.camDist = DIABLO_CAM_DIST;
      input.camPitch = DIABLO_CAM_PITCH;
      requestAnimationFrame(tick);
      return; // auto-FPS never applies in Diablo mode
    }
    if (resolveAutoFps()) {
      if (input.camDist <= 3.05 && runtime.mode === 'off') applyCameraMode(input, runtime, 'on');
      else if (input.camDist > 3.5 && runtime.mode === 'on' && resolveFpsMode() === 'off') {
        applyCameraMode(input, runtime, 'off');
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const toggleKey = (opts.toggleKey ?? 'v').toLowerCase();
  window.addEventListener('keydown', (ev) => {
    if (shouldIgnoreKey(ev)) return;
    if (ev.key.toLowerCase() !== toggleKey) return;
    // Ignore when modifier keys are held — keep V free for browser shortcuts.
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    // V cycles through ALL three views: free (off) → first-person (on) →
    // locked Diablo (diablo) → back to free. This is what lets V pull the
    // player OUT of the locked Diablo camera — the lock re-asserts the fixed
    // angle every frame, but an explicit mode switch still wins.
    const order: FpsMode[] = ['off', 'on', 'diablo'];
    const cur = order.indexOf(runtime!.mode);
    const next: FpsMode = order[(cur + 1) % order.length];
    setFpsMode(input, next);
    ev.preventDefault();
  });

  // Other modules (e.g. a header button) dispatch this event after persisting
  // the desired mode to localStorage. We re-read storage so the button and
  // listener can't disagree about which side toggled first.
  window.addEventListener('cr-fps-toggle', () => {
    if (!runtime) return;
    if (isFpsLockedRealm()) return;
    const desired = resolveFpsMode();
    applyCameraMode(input, runtime, desired);
  });
}

export function isFpsActive(): boolean {
  return runtime?.mode === 'on';
}

/** True when the Diablo (DuranceOfHate) camera preset is active. */
export function isDiabloCamActive(): boolean {
  return runtime?.mode === 'diablo';
}

/**
 * Enforce the Diablo camera lock at the exact frame the game loop syncs
 * input → renderer (main.ts). The fps_mode rAF tick and the game loop are
 * separate rAF callbacks, so a tick-only lock can lose the ordering race and
 * let the input handlers' last-written pitch/dist (the default over-shoulder
 * angle) reach the renderer for a frame. Calling this immediately before the
 * renderer reads camPitch/camDist makes the lock deterministic: in Diablo mode
 * the fixed angle/zoom ALWAYS wins over wheel zoom, pitch-drag, and pinch.
 * No-op in any other mode.
 */
export function enforceDiabloLock(input: Input): void {
  // Diablo mode: fully locked (dist + pitch) — a fixed non-adjustable view.
  if (runtime?.mode === 'diablo') {
    input.camDist = DIABLO_CAM_DIST;
    input.camPitch = DIABLO_CAM_PITCH;
    return;
  }
  // FPS mode: LOCK the zoom so the wheel/pinch can't pull the camera out of
  // first-person (the pitch stays free so the player can still look around).
  if (runtime?.mode === 'on') {
    input.camDist = FPS_CAM_DIST;
  }
}

/**
 * FORCE the Diablo (DuranceOfHate) camera regardless of the player's chosen
 * mode. Called each frame the player is inside the Durance of Hate delve so the
 * dungeon always uses its authored top-down infernal angle — first-person/3rd-
 * person are overridden here, then restored automatically once they leave (the
 * player's saved mode is untouched, so nothing to undo). No-op when the player
 * is already in Diablo mode (the normal lock handles it) or in FPS mode (which
 * the player may want even in the dungeon).
 */
export function forceDiabloForDelve(input: Input): void {
  if (runtime?.mode === 'on') return; // respect an explicit first-person choice
  input.camDist = DIABLO_CAM_DIST;
  input.camPitch = DIABLO_CAM_PITCH;
}
