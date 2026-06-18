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

import type { Input } from '../../game/input';
import { isAutoFpsEnabled } from './ingame_options';

const STORE_KEY = 'cr_fps_mode';
const RETICLE_ID = 'cr-fps-reticle';
const FPS_CAM_DIST = 0.55;
const FPS_CAM_PITCH = 0.04;
const DIABLO_CAM_DIST = 18;
const DIABLO_CAM_PITCH = 0.92;

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

/** Programmatically set FPS mode. Used by the header toggle button. */
export function setFpsMode(input: Input, mode: FpsMode): void {
  if (!runtime) return;
  applyCameraMode(input, runtime, mode);
  persistFpsMode(mode);
}

export function mountFpsMode(input: Input, opts: MountFpsOptions = {}): void {
  if (typeof document === 'undefined') return;
  if (runtime) return; // already mounted

  runtime = { mode: 'off', savedDist: input.camDist, savedPitch: input.camPitch };
  injectReticle();

  const initial = resolveFpsMode();
  if (initial !== 'off') applyCameraMode(input, runtime, initial);

  // Auto-FPS on full zoom-in: when the user scrolls the camera all the way
  // in (camDist hits the minimum clamp of 3), flip to FPS automatically.
  // Scrolling back out exits FPS the same way. Tick-driven rather than
  // wheel-driven so we catch every path that mutates camDist (touch pinch,
  // settings slider, scripted zooms).
  const tick = () => {
    if (!runtime) return;
    if (isAutoFpsEnabled()) {
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
    const next: FpsMode = runtime!.mode === 'on' ? 'off' : 'on';
    setFpsMode(input, next);
    ev.preventDefault();
  });

  // Other modules (e.g. a header button) dispatch this event after persisting
  // the desired mode to localStorage. We re-read storage so the button and
  // listener can't disagree about which side toggled first.
  window.addEventListener('cr-fps-toggle', () => {
    if (!runtime) return;
    const desired = resolveFpsMode();
    applyCameraMode(input, runtime, desired);
  });
}

export function isFpsActive(): boolean {
  return runtime?.mode === 'on';
}
