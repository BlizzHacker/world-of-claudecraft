import type { Input, TouchMoveInput } from './input';

export const PHONE_TOUCH_QUERY = '(pointer: coarse) and (max-width: 940px), (pointer: coarse) and (max-height: 760px)';
const DEADZONE = 0.22;
const CAMERA_SENSITIVITY = 0.8;
// Pinch: each pixel the two fingers spread/close maps to this many yards of
// camera distance. Tuned so a comfortable thumb-to-finger pinch sweeps roughly
// the full 3..22yd zoom range in one gesture.
const PINCH_ZOOM_SCALE = 0.04;

// Haptic feedback: short Vibration-API buzzes so touch actions feel physical.
// On by default (own localStorage key, like music's ev_music_on); try/catch +
// feature-detect guarded so it no-ops on desktop and under Vitest/jsdom.
export const HAPTICS_STORE_KEY = 'woc_haptics_on';
export const HAPTIC_TAP = 10;        // a button press
export const HAPTIC_JOYSTICK = 6;    // grabbing a joystick
export const HAPTIC_CONFIRM = [12, 40, 12]; // haptics toggled back on

type VibrationNavigator = { vibrate?: (pattern: number | number[]) => boolean };

export function loadHapticsEnabled(storage: Pick<Storage, 'getItem'> | null = safeLocalStorage()): boolean {
  if (!storage) return true;
  try {
    return storage.getItem(HAPTICS_STORE_KEY) !== '0';
  } catch {
    return true;
  }
}

export function saveHapticsEnabled(on: boolean, storage: Pick<Storage, 'setItem'> | null = safeLocalStorage()): void {
  try { storage?.setItem(HAPTICS_STORE_KEY, on ? '1' : '0'); } catch { /* storage unavailable */ }
}

/** Fire a haptic pulse when enabled and the Vibration API exists. Returns whether it fired. */
export function triggerHaptic(
  pattern: number | number[],
  enabled: boolean,
  nav: VibrationNavigator | null = typeof navigator !== 'undefined' ? navigator : null,
): boolean {
  if (!enabled || !nav || typeof nav.vibrate !== 'function') return false;
  try {
    return nav.vibrate(pattern);
  } catch {
    return false;
  }
}

function safeLocalStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export interface MobileControlCallbacks {
  onAttackNearest(): void;
  onJump(): void;
  onTarget(): void;
  onInteract(): void;
  onAutorun(): boolean;
  onChat(): void;
  onMenu(): void;
  onSocial(): void;
  onEmotes(): void;
  onArena(): void;
  onQuestLog(): void;
  onCharacter(): void;
  onBags(): void;
  onSpellbook(): void;
  onTalents(): void;
  onMap(): void;
  onLeaderboard(): void;
  /** Toggle world nameplates; returns the new on/off state to sync the button glow. */
  onNameplates(): boolean;
  /** Toggle background music; returns whether music is now enabled. */
  onMusic(): boolean;
}

export function isPhoneTouchDevice(win: Pick<Window, 'matchMedia'> = window): boolean {
  return win.matchMedia(PHONE_TOUCH_QUERY).matches;
}

export interface OriginBounds { left: number; top: number; right: number; bottom: number; }

/**
 * Clamp a floating joystick's spawn centre so the whole circle (given `radius`)
 * stays inside `bounds`. If the zone is narrower/shorter than the joystick on an
 * axis, the centre falls back to the midpoint of that axis.
 */
export function clampJoystickOrigin(px: number, py: number, radius: number, bounds: OriginBounds): { x: number; y: number } {
  const clamp = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  return {
    x: clamp(px, bounds.left + radius, bounds.right - radius),
    y: clamp(py, bounds.top + radius, bounds.bottom - radius),
  };
}

export function mapJoystickVector(x: number, y: number, deadzone = DEADZONE): TouchMoveInput {
  const mag = Math.hypot(x, y);
  if (mag < deadzone) return { forward: false, back: false, strafeLeft: false, strafeRight: false };
  const axis = deadzone * 0.85;
  return {
    forward: y < -axis,
    back: y > axis,
    strafeLeft: x < -axis,
    strafeRight: x > axis,
  };
}

export class MobileControls {
  private active = false;
  private hapticsOn = loadHapticsEnabled();
  private joyPointer: number | null = null;
  private lookPointer: number | null = null;
  private mq: MediaQueryList | null = null;

  private moveOriginX = 0;
  private moveOriginY = 0;
  private moveRadius = 1;

  // two-finger pinch-to-zoom on the game view (phones have no scroll wheel)
  private pinchPointers = new Map<number, { x: number; y: number }>();
  private pinchPrevDist: number | null = null;

  private canvas = document.getElementById('game-canvas') as HTMLElement | null;
  private root = document.getElementById('mobile-controls') as HTMLElement | null;
  private moveZone = document.getElementById('mobile-move-zone') as HTMLElement | null;
  private moveJoystick = document.getElementById('mobile-move-joystick') as HTMLElement | null;
  private moveStick = document.getElementById('mobile-move-stick') as HTMLElement | null;
  private cameraJoystick = document.getElementById('mobile-camera-joystick') as HTMLElement | null;
  private cameraStick = document.getElementById('mobile-camera-stick') as HTMLElement | null;
  private autorunButton = document.getElementById('mobile-autorun') as HTMLElement | null;

  constructor(private input: Input, private callbacks: MobileControlCallbacks) {}

  start(): void {
    if (!this.root || !this.moveJoystick || !this.moveStick || !this.cameraJoystick || !this.cameraStick) return;
    this.mq = window.matchMedia(PHONE_TOUCH_QUERY);
    this.setActive(this.mq.matches);
    this.mq.addEventListener?.('change', (e) => this.setActive(e.matches));

    // The move joystick floats: the pointer lifecycle lives on the lower-left
    // capture zone (so a thumb can land anywhere), while the joystick element is
    // just the visual that JS repositions under the touch. Fall back to the
    // joystick element itself if the zone is absent (e.g. an older shell).
    const moveSurface = this.moveZone ?? this.moveJoystick;
    moveSurface.addEventListener('pointerdown', (e) => this.onMoveDown(e));
    moveSurface.addEventListener('pointermove', (e) => this.onMoveMove(e));
    moveSurface.addEventListener('pointerup', (e) => this.onMoveEnd(e));
    moveSurface.addEventListener('pointercancel', (e) => this.onMoveEnd(e));
    moveSurface.addEventListener('lostpointercapture', (e) => this.onMoveEnd(e));

    this.cameraJoystick.addEventListener('pointerdown', (e) => this.onCameraDown(e));
    this.cameraJoystick.addEventListener('pointermove', (e) => this.onCameraMove(e));
    this.cameraJoystick.addEventListener('pointerup', (e) => this.onCameraEnd(e));
    this.cameraJoystick.addEventListener('pointercancel', (e) => this.onCameraEnd(e));
    this.cameraJoystick.addEventListener('lostpointercapture', (e) => this.onCameraEnd(e));

    window.addEventListener('pointermove', (e) => {
      this.onMoveMove(e);
      this.onCameraMove(e);
    });
    window.addEventListener('pointerup', (e) => {
      this.onMoveEnd(e);
      this.onCameraEnd(e);
    });
    window.addEventListener('pointercancel', (e) => {
      this.onMoveEnd(e);
      this.onCameraEnd(e);
    });
    window.addEventListener('blur', () => {
      this.releaseMove();
      this.releaseCamera();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.releaseMove();
        this.releaseCamera();
      }
    });

    this.autorunButton?.addEventListener('click', (e) => {
      if (!this.active) return;
      e.preventDefault();
      triggerHaptic(HAPTIC_TAP, this.hapticsOn);
      const on = this.callbacks.onAutorun();
      this.autorunButton?.classList.toggle('active', on);
    });

    this.canvas?.addEventListener('pointerdown', (e) => this.onPinchDown(e));
    this.canvas?.addEventListener('pointermove', (e) => this.onPinchMove(e));
    this.canvas?.addEventListener('pointerup', (e) => this.onPinchEnd(e));
    this.canvas?.addEventListener('pointercancel', (e) => this.onPinchEnd(e));

    this.bindButton('mobile-attack-nearest', () => this.callbacks.onAttackNearest());
    this.bindButton('mobile-jump', () => this.callbacks.onJump());
    this.bindButton('mobile-target', () => this.callbacks.onTarget());
    this.bindButton('mobile-interact', () => this.callbacks.onInteract());
    this.bindButton('mobile-chat', () => this.toggleChat());
    this.bindButton('mobile-menu', () => this.callbacks.onMenu());
    this.bindButton('mobile-social', () => this.callbacks.onSocial());
    this.bindButton('mobile-emote', () => this.callbacks.onEmotes());
    this.bindButton('mobile-arena', () => this.callbacks.onArena());
    this.bindButton('mobile-quest', () => this.callbacks.onQuestLog());
    this.bindButton('mobile-char', () => this.callbacks.onCharacter());
    this.bindButton('mobile-bags', () => this.callbacks.onBags());
    this.bindButton('mobile-spellbook', () => this.callbacks.onSpellbook());
    this.bindButton('mobile-talents', () => this.callbacks.onTalents());
    this.bindButton('mobile-map', () => this.callbacks.onMap());
    this.bindButton('mobile-leaderboard', () => this.callbacks.onLeaderboard());
    const nameplatesBtn = document.getElementById('mobile-nameplates');
    this.bindButton('mobile-nameplates', () => {
      const on = this.callbacks.onNameplates();
      nameplatesBtn?.classList.toggle('active', on);
    });
    const musicBtn = document.getElementById('mobile-music');
    this.bindButton('mobile-music', () => {
      const on = this.callbacks.onMusic();
      // mirror the desktop #mm-music control: a diagonal slash (.mm-muted) signals
      // "off", rather than dimming the note
      musicBtn?.classList.toggle('mm-muted', !on);
    });
    this.bindHapticsToggle('mobile-haptics');
    this.bindButton('mobile-more', () => {
      this.root?.classList.toggle('expanded');
      document.body.classList.toggle('mobile-more-open', this.root?.classList.contains('expanded') ?? false);
    });
  }

  private setActive(active: boolean): void {
    this.active = active;
    document.body.classList.toggle('mobile-touch', active);
    if (!active) {
      this.root?.classList.remove('expanded');
      this.autorunButton?.classList.remove('active');
      document.body.classList.remove('mobile-more-open', 'mobile-chat-open');
      this.releaseMove();
      this.releaseCamera();
      this.releasePinch();
    } else {
      document.body.classList.remove('mobile-chat-open');
    }
  }

  private bindButton(id: string, cb: () => void): void {
    const button = document.getElementById(id);
    button?.addEventListener('click', (e) => {
      if (!this.active) return;
      e.preventDefault();
      triggerHaptic(HAPTIC_TAP, this.hapticsOn);
      cb();
      if (button.closest('#mobile-extra-controls')) {
        this.root?.classList.remove('expanded');
        document.body.classList.remove('mobile-more-open');
      }
    });
  }

  /** The haptics button is a stateful toggle, so it bypasses bindButton (no tray
   *  auto-close, no buzz on the press that turns buzzing off) and reflects state
   *  via aria-pressed + an .is-on class. */
  private bindHapticsToggle(id: string): void {
    const button = document.getElementById(id);
    if (!button) return;
    this.syncHapticsButton(button);
    button.addEventListener('click', (e) => {
      if (!this.active) return;
      e.preventDefault();
      this.hapticsOn = !this.hapticsOn;
      saveHapticsEnabled(this.hapticsOn);
      this.syncHapticsButton(button);
      // confirm with a pulse only when enabling, so the player feels what they turned on
      if (this.hapticsOn) triggerHaptic(HAPTIC_CONFIRM, true);
    });
  }

  private syncHapticsButton(button: HTMLElement): void {
    button.classList.toggle('is-on', this.hapticsOn);
    button.setAttribute('aria-pressed', this.hapticsOn ? 'true' : 'false');
    const label = button.querySelector('.mobile-label');
    if (label) label.textContent = this.hapticsOn ? 'Haptics' : 'Haptics Off';
  }

  private toggleChat(): void {
    document.body.classList.toggle('mobile-chat-open');
    if (document.body.classList.contains('mobile-chat-open')) {
      this.callbacks.onChat();
    } else {
      const input = document.getElementById('chat-input') as HTMLInputElement | null;
      if (input) {
        input.value = '';
        input.style.display = 'none';
        input.blur();
      }
    }
  }

  private onMoveDown(e: PointerEvent): void {
    if (!this.active || this.joyPointer !== null || !this.moveJoystick) return;
    e.preventDefault();
    this.joyPointer = e.pointerId;
    triggerHaptic(HAPTIC_JOYSTICK, this.hapticsOn);
    // Spawn the joystick base under the thumb, clamped so the circle stays
    // on-screen, then pin the stick offset to that floating centre.
    const radius = Math.max(1, this.moveJoystick.offsetWidth / 2 || 61);
    const zone = (this.moveZone ?? this.moveJoystick).getBoundingClientRect();
    const origin = clampJoystickOrigin(e.clientX, e.clientY, radius, zone);
    this.moveOriginX = origin.x;
    this.moveOriginY = origin.y;
    this.moveRadius = radius;
    this.moveJoystick.style.left = `${(origin.x - radius).toFixed(1)}px`;
    this.moveJoystick.style.top = `${(origin.y - radius).toFixed(1)}px`;
    this.moveJoystick.classList.add('floating', 'active');
    try { (this.moveZone ?? this.moveJoystick).setPointerCapture(e.pointerId); } catch { /* synthetic test event */ }
    this.onMoveMove(e);
  }

  private onMoveMove(e: PointerEvent): void {
    if (!this.active || e.pointerId !== this.joyPointer || !this.moveStick) return;
    e.preventDefault();
    const radius = this.moveRadius;
    const rawX = (e.clientX - this.moveOriginX) / radius;
    const rawY = (e.clientY - this.moveOriginY) / radius;
    const mag = Math.max(1, Math.hypot(rawX, rawY));
    const x = rawX / mag;
    const y = rawY / mag;
    this.moveStick.style.transform = `translate(${(x * radius * 0.46).toFixed(1)}px, ${(y * radius * 0.46).toFixed(1)}px)`;
    const move = mapJoystickVector(x, y);
    this.input.setTouchMove(move);
    // setTouchMove cancels autorun on forward/back input — keep the button glow honest.
    if (move.forward || move.back) this.autorunButton?.classList.remove('active');
  }

  private onMoveEnd(e: PointerEvent): void {
    if (e.pointerId !== this.joyPointer) return;
    e.preventDefault();
    this.releaseMove();
  }

  private releaseMove(): void {
    if (this.joyPointer !== null) {
      try {
        const moveSurface = this.moveZone ?? this.moveJoystick;
        if (moveSurface?.hasPointerCapture?.(this.joyPointer)) {
          moveSurface.releasePointerCapture(this.joyPointer);
        }
      } catch { /* capture may already be gone on mobile browser gesture changes */ }
    }
    this.joyPointer = null;
    this.input.clearTouchMove();
    if (this.moveStick) this.moveStick.style.transform = '';
    if (this.moveJoystick) {
      this.moveJoystick.classList.remove('floating', 'active');
      this.moveJoystick.style.left = '';
      this.moveJoystick.style.top = '';
    }
  }

  private onCameraDown(e: PointerEvent): void {
    if (!this.active || this.lookPointer !== null) return;
    e.preventDefault();
    this.lookPointer = e.pointerId;
    this.cameraJoystick?.classList.add('active');
    this.input.setTouchLook(true);
    triggerHaptic(HAPTIC_JOYSTICK, this.hapticsOn);
    try { this.cameraJoystick?.setPointerCapture(e.pointerId); } catch { /* synthetic test event */ }
    this.onCameraMove(e);
  }

  private onCameraMove(e: PointerEvent): void {
    if (!this.active || e.pointerId !== this.lookPointer || !this.cameraJoystick || !this.cameraStick) return;
    e.preventDefault();
    const r = this.cameraJoystick.getBoundingClientRect();
    const radius = Math.max(1, r.width / 2);
    const rawX = (e.clientX - (r.left + radius)) / radius;
    const rawY = (e.clientY - (r.top + radius)) / radius;
    const mag = Math.max(1, Math.hypot(rawX, rawY));
    const x = rawX / mag;
    const y = rawY / mag;
    this.cameraStick.style.transform = `translate(${(x * radius * 0.42).toFixed(1)}px, ${(y * radius * 0.42).toFixed(1)}px)`;
    this.input.setTouchLookVector(mapLookVector(x, y));
  }

  private onCameraEnd(e: PointerEvent): void {
    if (e.pointerId !== this.lookPointer) return;
    e.preventDefault();
    this.releaseCamera();
  }

  private releaseCamera(): void {
    if (this.lookPointer !== null) {
      try {
        if (this.cameraJoystick?.hasPointerCapture?.(this.lookPointer)) {
          this.cameraJoystick.releasePointerCapture(this.lookPointer);
        }
      } catch { /* capture may already be gone on mobile browser gesture changes */ }
    }
    this.lookPointer = null;
    this.cameraJoystick?.classList.remove('active');
    this.input.setTouchLook(false);
    this.input.setTouchLookVector({ x: 0, y: 0 });
    if (this.cameraStick) this.cameraStick.style.transform = '';
  }

  private onPinchDown(e: PointerEvent): void {
    if (!this.active || e.pointerType !== 'touch') return;
    this.pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinchPointers.size === 2) this.pinchPrevDist = this.currentPinchDist();
  }

  private onPinchMove(e: PointerEvent): void {
    if (!this.active || !this.pinchPointers.has(e.pointerId)) return;
    this.pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinchPointers.size === 2 && this.pinchPrevDist !== null) {
      e.preventDefault();
      const cur = this.currentPinchDist();
      this.input.zoomBy(pinchZoomDelta(this.pinchPrevDist, cur));
      this.pinchPrevDist = cur;
    }
  }

  private onPinchEnd(e: PointerEvent): void {
    this.pinchPointers.delete(e.pointerId);
    if (this.pinchPointers.size < 2) this.pinchPrevDist = null;
  }

  private releasePinch(): void {
    this.pinchPointers.clear();
    this.pinchPrevDist = null;
  }

  private currentPinchDist(): number {
    const pts = [...this.pinchPointers.values()];
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }
}

export function mapLookVector(x: number, y: number, deadzone = DEADZONE): { x: number; y: number } {
  if (Math.hypot(x, y) < deadzone) return { x: 0, y: 0 };
  return { x: x * CAMERA_SENSITIVITY, y: y * CAMERA_SENSITIVITY };
}

/**
 * Camera-distance delta for a pinch frame, in yards. Fingers spreading apart
 * (curDist > prevDist) zooms IN, i.e. returns a negative delta to shrink camDist;
 * pinching together zooms out. Matches the sign convention of the wheel handler.
 */
export function pinchZoomDelta(prevDist: number, curDist: number, scale = PINCH_ZOOM_SCALE): number {
  return (prevDist - curDist) * scale;
}
