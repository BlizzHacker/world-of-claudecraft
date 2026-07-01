import type { MoveInput } from '../sim/types';
import type { GamepadBindings } from './gamepad_bindings';
import { createGamepadCursor, type GamepadCursor } from './gamepad_cursor';
import {
  AXIS,
  GAMEPAD_NONE,
  GP,
  risingEdges,
  STANDARD_BUTTON_COUNT,
  stickToLook,
  stickToMoveFlags,
  TRIGGER_THRESHOLD,
} from './gamepad_map';
import type { Input } from './input';

const DEADZONE = 0.22;
const LOOK_DEADZONE = 0.18;
const LOOK_YAW_RATE = 2.9;
const LOOK_PITCH_RATE = 1.9;
const MIN_PITCH = -0.4;
const MAX_PITCH = 1.35;

const BUTTON = {
  a: 0,
  b: 1,
  x: 2,
  y: 3,
  lb: 4,
  rb: 5,
  lt: 6,
  rt: 7,
  back: 8,
  start: 9,
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
} as const;

export type GamepadButtonLike = {
  pressed?: boolean;
  value?: number;
};

export type GamepadLike = {
  index: number;
  id: string;
  axes: readonly number[];
  buttons: readonly GamepadButtonLike[];
  connected?: boolean;
};

export type GamepadStatus = {
  supported: boolean;
  connected: boolean;
  index: number | null;
  label: string;
  movementActive: boolean;
  lastInputAt: number;
};

export type GamepadControllerBridge = {
  move(moveInput: unknown, facing?: unknown): void;
  face(facing: unknown): void;
  stop(): void;
};

export type GamepadInputSurface = {
  camYaw: number;
  camPitch: number;
};

export type GamepadHooks = {
  controller: GamepadControllerBridge;
  canUseGameKeys?: () => boolean;
  onAbility?: (slot: number) => void;
  onAttackNearest?: () => void;
  onTarget?: () => void;
  onInteract?: () => void;
  onMenu?: () => void;
  onChat?: () => void;
  /** True when a clickable HTML surface is up (quest dialog, chat, menu,
   *  inventory) — cursor mode auto-arms so the pad can operate it. */
  isPointerSurfaceOpen?: () => boolean;
  getGamepads?: () => readonly (GamepadLike | null | undefined)[];
  requestAnimationFrame?: (cb: FrameRequestCallback) => number;
  cancelAnimationFrame?: (id: number) => void;
  autoStart?: boolean;
  /** Inject a cursor (tests); defaults to the real DOM virtual mouse. */
  cursor?: GamepadCursor;
};

export type MountedGamepadControls = {
  poll(now?: number): void;
  snapshot(): GamepadStatus;
  stop(): void;
};

let currentStatus: GamepadStatus = {
  supported: typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function',
  connected: false,
  index: null,
  label: 'No gamepad detected',
  movementActive: false,
  lastInputAt: 0,
};

export function getGamepadStatus(): GamepadStatus {
  return { ...currentStatus };
}

function setStatus(next: GamepadStatus): void {
  const prev = currentStatus;
  currentStatus = next;
  if (
    prev.supported === next.supported
    && prev.connected === next.connected
    && prev.index === next.index
    && prev.label === next.label
    && prev.movementActive === next.movementActive
  ) return;

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('cr-gamepad-status', { detail: getGamepadStatus() }));
  }
}

function axis(gamepad: GamepadLike, index: number, deadzone = DEADZONE): number {
  const raw = Number(gamepad.axes[index] ?? 0);
  if (!Number.isFinite(raw) || Math.abs(raw) < deadzone) return 0;
  const sign = Math.sign(raw);
  return sign * ((Math.abs(raw) - deadzone) / (1 - deadzone));
}

function buttonDown(gamepad: GamepadLike, index: number): boolean {
  const button = gamepad.buttons[index];
  return !!button && (button.pressed === true || Number(button.value ?? 0) > 0.55);
}

function pressedButtons(gamepad: GamepadLike): Set<number> {
  const pressed = new Set<number>();
  for (let i = 0; i < gamepad.buttons.length; i++) {
    if (buttonDown(gamepad, i)) pressed.add(i);
  }
  return pressed;
}

function activeGamepad(gamepads: readonly (GamepadLike | null | undefined)[]): GamepadLike | null {
  for (const gamepad of gamepads) {
    if (gamepad && gamepad.connected !== false) return gamepad;
  }
  return null;
}

function statusFor(gamepad: GamepadLike | null, supported: boolean, movementActive: boolean, lastInputAt: number): GamepadStatus {
  if (!supported) {
    return { supported: false, connected: false, index: null, label: 'Gamepad API unavailable', movementActive: false, lastInputAt };
  }
  if (!gamepad) {
    return { supported: true, connected: false, index: null, label: 'No gamepad detected', movementActive: false, lastInputAt };
  }
  return {
    supported: true,
    connected: true,
    index: gamepad.index,
    label: gamepad.id || `Gamepad ${gamepad.index + 1}`,
    movementActive,
    lastInputAt,
  };
}

export function moveInputFromGamepad(gamepad: GamepadLike): { move: MoveInput; movementActive: boolean; lookX: number; lookY: number } {
  const moveX = axis(gamepad, 0);
  const moveY = axis(gamepad, 1);
  const lookX = axis(gamepad, 2, LOOK_DEADZONE);
  const lookY = axis(gamepad, 3, LOOK_DEADZONE);
  const move: MoveInput = {
    forward: moveY < -0.18,
    back: moveY > 0.18,
    turnLeft: false,
    turnRight: false,
    strafeLeft: moveX < -0.18,
    strafeRight: moveX > 0.18,
    jump: buttonDown(gamepad, BUTTON.a),
  };
  return {
    move,
    movementActive: move.forward || move.back || move.strafeLeft || move.strafeRight,
    lookX,
    lookY,
  };
}

function applyLook(input: GamepadInputSurface, lookX: number, lookY: number, dt: number): boolean {
  if (lookX === 0 && lookY === 0) return false;
  input.camYaw -= lookX * LOOK_YAW_RATE * dt;
  input.camPitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, input.camPitch + lookY * LOOK_PITCH_RATE * dt));
  return true;
}

export function mountGamepadControls(input: GamepadInputSurface, hooks: GamepadHooks): MountedGamepadControls {
  const getGamepads = hooks.getGamepads
    ?? (() => (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : []));
  const raf = hooks.requestAnimationFrame
    ?? (typeof window !== 'undefined' && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : null);
  const caf = hooks.cancelAnimationFrame
    ?? (typeof window !== 'undefined' && window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : null);

  const cursor = hooks.cursor ?? createGamepadCursor();
  let stopped = false;
  let frameId: number | null = null;
  let lastNow = typeof performance !== 'undefined' ? performance.now() : 0;
  let lastButtons = new Set<number>();
  let controllerActive = false;
  let lastInputAt = 0;
  let cursorMode = false; // manual toggle; auto-armed when a pointer surface opens

  const stopController = () => {
    if (!controllerActive) return;
    hooks.controller.stop();
    controllerActive = false;
  };

  const edge = (pressed: Set<number>, button: number): boolean => pressed.has(button) && !lastButtons.has(button);
  const cast = (slot: number): void => hooks.onAbility?.(slot);

  const poll = (now = (typeof performance !== 'undefined' ? performance.now() : lastNow)): void => {
    const supported = typeof getGamepads === 'function';
    const pads = supported ? getGamepads() : [];
    const gamepad = supported ? activeGamepad(pads) : null;
    const dt = Math.min(0.08, Math.max(0.001, (now - lastNow) / 1000 || 0.016));
    lastNow = now;

    if (!gamepad) {
      stopController();
      lastButtons = new Set<number>();
      setStatus(statusFor(null, supported, false, lastInputAt));
      return;
    }

    const pressed = pressedButtons(gamepad);
    if (edge(pressed, BUTTON.start)) hooks.onMenu?.();

    // ── Cursor (virtual-mouse) mode ──────────────────────────────────────────
    // Auto-arm whenever a clickable HTML surface is open (quest dialog, chat,
    // menu, inventory) so you can immediately point + click. Back toggles it
    // manually otherwise. This is what makes quest accept / chat reachable.
    const surfaceOpen = hooks.isPointerSurfaceOpen?.() ?? false;
    if (edge(pressed, BUTTON.back)) cursorMode = !cursorMode;
    const inCursorMode = cursorMode || surfaceOpen;

    if (inCursorMode) {
      stopController();
      // Either stick drives the cursor (left for walk-less menus, right always).
      const cx = axis(gamepad, 2, LOOK_DEADZONE) || axis(gamepad, 0);
      const cy = axis(gamepad, 3, LOOK_DEADZONE) || axis(gamepad, 1);
      const moved = cursor.move(cx, cy, dt);
      if (!cursor.visible()) cursor.show();
      if (edge(pressed, BUTTON.a)) cursor.click();        // A = left click
      if (edge(pressed, BUTTON.x)) cursor.rightClick();   // X = right click
      if (edge(pressed, BUTTON.b) && !surfaceOpen) { cursorMode = false; cursor.hide(); } // B closes cursor when self-toggled
      if (moved || pressed.size > 0) lastInputAt = now;
      lastButtons = pressed;
      setStatus(statusFor(gamepad, supported, false, lastInputAt));
      return;
    }
    if (cursor.visible()) cursor.hide();

    const canUse = hooks.canUseGameKeys?.() ?? true;
    if (!canUse) {
      stopController();
      lastButtons = pressed;
      setStatus(statusFor(gamepad, supported, false, lastInputAt));
      return;
    }

    const { move, movementActive, lookX, lookY } = moveInputFromGamepad(gamepad);
    const looked = applyLook(input, lookX, lookY, dt);
    if (movementActive) {
      hooks.controller.move(move, input.camYaw);
      controllerActive = true;
    } else if (move.jump) {
      hooks.controller.move(move);
      controllerActive = true;
    } else {
      stopController();
    }

    // ── Skill chords ─────────────────────────────────────────────────────────
    // LT/RT act as shift layers so the 4 face buttons + d-pad cover 8 base
    // slots PLUS 8 chorded slots (e.g. LT+A, RT+Y) = up to 16 abilities, the way
    // the original Cryptic Realm bound a full skill bar to a controller.
    const lt = buttonDown(gamepad, BUTTON.lt);
    const rt = buttonDown(gamepad, BUTTON.rt);
    const layer = lt ? 8 : rt ? 12 : 0; // base / LT layer / RT layer
    // Face buttons are attack/target/interact at base, skills when a trigger is held.
    if (layer === 0) {
      if (edge(pressed, BUTTON.x)) hooks.onAttackNearest?.();
      if (edge(pressed, BUTTON.y)) hooks.onTarget?.();
      if (edge(pressed, BUTTON.b)) hooks.onInteract?.();
      if (edge(pressed, BUTTON.lb)) cast(0);
      if (edge(pressed, BUTTON.rb)) cast(1);
    } else {
      // Trigger held: A/B/X/Y → 4 skills on that layer.
      if (edge(pressed, BUTTON.a)) cast(layer + 0);
      if (edge(pressed, BUTTON.b)) cast(layer + 1);
      if (edge(pressed, BUTTON.x)) cast(layer + 2);
      if (edge(pressed, BUTTON.y)) cast(layer + 3);
    }
    // D-pad is the standard 4-slot quickbar at every layer.
    if (edge(pressed, BUTTON.dpadLeft)) cast(4);
    if (edge(pressed, BUTTON.dpadRight)) cast(5);
    if (edge(pressed, BUTTON.dpadUp)) cast(6);
    if (edge(pressed, BUTTON.dpadDown)) cast(7);

    if (movementActive || move.jump || looked || pressed.size > 0) lastInputAt = now;
    lastButtons = pressed;
    setStatus(statusFor(gamepad, supported, movementActive || move.jump, lastInputAt));
  };

  const tick: FrameRequestCallback = (now) => {
    poll(now);
    if (!stopped && raf) frameId = raf(tick);
  };

  if (hooks.autoStart !== false && raf) frameId = raf(tick);
  else poll(lastNow);

  return {
    poll,
    snapshot: getGamepadStatus,
    stop() {
      stopped = true;
      if (frameId !== null) caf?.(frameId);
      stopController();
      cursor.hide();
      setStatus(statusFor(null, typeof getGamepads === 'function', false, lastInputAt));
    },
  };
}
// Thin, poll-based consumer that turns a connected gamepad into game input.
// All the deterministic math lives in the pure core (gamepad_map.ts); this file
// owns the side effects: polling navigator.getGamepads() each frame, driving the
// Input instance (movement / camera / jump), dispatching edge-button actions via
// the host's onAction callback, the virtual-cursor UI-navigation mode, and
// haptic rumble. Modeled structurally on MobileControls.
export interface GamepadCallbacks {
  // Dispatch a bound action id (slotN / target / interact / bags / escape / ...).
  // Reuses the host's existing keybind/UI dispatch; jump & autorun are handled
  // here against Input directly and never reach this.
  onAction(id: string): void;
  // True while any interactive HUD window is open, switching the pad into the
  // virtual-cursor UI-navigation mode (movement/camera/abilities are suspended).
  isPointerMode(): boolean;
  // Current local-player health, for rumble-on-damage. Optional.
  getPlayerHealth?(): number;
}

const CURSOR_SPEED = 900; // px/sec at full stick deflection in UI cursor mode

export class GamepadManager {
  private index: number | null = null;
  private prevPressed: boolean[] = new Array(STANDARD_BUTTON_COUNT).fill(false);
  private deadzone = 0.18;
  private camSpeed = 2.4;
  private invertY = false;
  private vibration = 1;
  private lastHealth: number | null = null;
  private cursorEl: HTMLDivElement | null = null;
  private cursorX = 0;
  private cursorY = 0;
  private cursorInit = false;
  private boundConnect = (e: GamepadEvent) => this.onConnect(e);
  private boundDisconnect = (e: GamepadEvent) => this.onDisconnect(e);

  constructor(private input: Input, private bindings: GamepadBindings, private cb: GamepadCallbacks) {}

  start(): void {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
    window.addEventListener('gamepadconnected', this.boundConnect);
    window.addEventListener('gamepaddisconnected', this.boundDisconnect);
    // Pick up a pad that was already connected before we started listening.
    for (const pad of navigator.getGamepads()) {
      if (pad?.connected) { this.index = pad.index; break; }
    }
  }

  stop(): void {
    window.removeEventListener('gamepadconnected', this.boundConnect);
    window.removeEventListener('gamepaddisconnected', this.boundDisconnect);
    // Fully release the pad (mirror onDisconnect), not just the listeners: poll()
    // runs unconditionally from the main loop and activePad() keys off this.index,
    // so leaving index set would keep a still-connected pad driving movement,
    // camera, and edge buttons after the Controller setting is turned off. start()
    // re-acquires an already-connected pad on re-enable.
    this.index = null;
    this.prevPressed.fill(false);
    this.input.clearGamepadMove();
    this.hideCursor();
  }

  setDeadzone(v: number): void { this.deadzone = Math.min(0.4, Math.max(0.05, v)); }
  setCameraSpeed(v: number): void { this.camSpeed = Math.max(0.1, v); }
  setInvertY(on: boolean): void { this.invertY = on; }
  setVibration(v: number): void { this.vibration = Math.min(1, Math.max(0, v)); }

  isConnected(): boolean { return this.index !== null; }

  private onConnect(e: GamepadEvent): void {
    if (this.index === null) this.index = e.gamepad.index;
  }

  private onDisconnect(e: GamepadEvent): void {
    if (this.index === e.gamepad.index) {
      this.index = null;
      this.prevPressed.fill(false);
      this.input.clearGamepadMove();
      this.hideCursor();
    }
  }

  private activePad(): Gamepad | null {
    if (this.index === null || typeof navigator === 'undefined') return null;
    const pad = navigator.getGamepads()[this.index];
    return pad && pad.connected ? pad : null;
  }

  /** Called once per animation frame from the main loop. */
  poll(dt: number): void {
    const pad = this.activePad();
    if (!pad) return;
    const buttons = pad.buttons;
    const pressed = (i: number): boolean => {
      const b = buttons[i];
      if (!b) return false;
      // LT/RT are analog; everything else is a clean digital button.
      if (i === GP.LT || i === GP.RT) return b.value > TRIGGER_THRESHOLD;
      return b.pressed;
    };
    const cur: boolean[] = [];
    for (let i = 0; i < STANDARD_BUTTON_COUNT; i++) cur[i] = pressed(i);

    this.checkRumble();

    if (this.cb.isPointerMode()) {
      // UI-navigation cursor mode: stick drives a software pointer. Clear any
      // lingering stick movement (a non-modal window like bags doesn't freeze
      // movement on its own) and skip camera/ability dispatch.
      this.input.clearGamepadMove();
      this.updateCursor(pad, cur, dt);
      this.prevPressed = cur;
      return;
    }
    this.hideCursor();

    // Movement: left stick.
    const lx = pad.axes[AXIS.LEFT_X] ?? 0;
    const ly = pad.axes[AXIS.LEFT_Y] ?? 0;
    this.input.setGamepadMove(stickToMoveFlags(lx, ly, this.deadzone));

    // Camera: right stick.
    const rx = pad.axes[AXIS.RIGHT_X] ?? 0;
    const ry = pad.axes[AXIS.RIGHT_Y] ?? 0;
    const look = stickToLook(rx, ry, this.deadzone, this.camSpeed, this.invertY, dt);
    this.input.applyGamepadLook(look.yaw, look.pitch);

    // Edge actions: one-shot on each button's rising edge.
    for (const idx of risingEdges(this.prevPressed, cur)) this.dispatch(idx);

    this.prevPressed = cur;
  }

  private dispatch(buttonIndex: number): void {
    const action = this.bindings.actionFor(buttonIndex);
    if (action === GAMEPAD_NONE) return;
    if (action === 'jump') { this.input.triggerGamepadJump(); return; }
    if (action === 'autorun') { this.input.toggleAutorun(); return; }
    this.cb.onAction(action);
  }

  // --- Haptics -------------------------------------------------------------
  private checkRumble(): void {
    if (this.vibration <= 0 || !this.cb.getPlayerHealth) { this.lastHealth = null; return; }
    const hp = this.cb.getPlayerHealth();
    if (this.lastHealth !== null && hp < this.lastHealth) {
      const dmgFrac = Math.min(1, (this.lastHealth - hp) / Math.max(1, this.lastHealth));
      this.rumble(0.25 + 0.65 * dmgFrac, Math.round(120 + 180 * dmgFrac));
    }
    this.lastHealth = hp;
  }

  /** Fire a dual-rumble effect scaled by the vibration setting (best-effort). */
  rumble(strength: number, durationMs: number): void {
    const pad = this.activePad();
    const actuator = (pad as unknown as { vibrationActuator?: { playEffect(type: string, opts: object): Promise<unknown> } })?.vibrationActuator;
    if (!actuator?.playEffect) return;
    const mag = Math.min(1, Math.max(0, strength)) * this.vibration;
    try {
      void actuator.playEffect('dual-rumble', {
        duration: durationMs,
        strongMagnitude: mag,
        weakMagnitude: mag * 0.6,
      });
    } catch { /* unsupported actuator type */ }
  }

  // --- UI-navigation virtual cursor ---------------------------------------
  private ensureCursor(): HTMLDivElement {
    if (!this.cursorEl) {
      const el = document.createElement('div');
      el.className = 'gamepad-cursor';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
      this.cursorEl = el;
    }
    return this.cursorEl;
  }

  private updateCursor(pad: Gamepad, cur: boolean[], dt: number): void {
    const el = this.ensureCursor();
    if (!this.cursorInit) {
      this.cursorX = window.innerWidth / 2;
      this.cursorY = window.innerHeight / 2;
      this.cursorInit = true;
    }
    el.style.display = 'block';
    // Left stick (or d-pad) moves the pointer.
    let mx = pad.axes[AXIS.LEFT_X] ?? 0;
    let my = pad.axes[AXIS.LEFT_Y] ?? 0;
    if (Math.hypot(mx, my) < this.deadzone) { mx = 0; my = 0; }
    if (cur[GP.DPAD_LEFT]) mx = -1;
    if (cur[GP.DPAD_RIGHT]) mx = 1;
    if (cur[GP.DPAD_UP]) my = -1;
    if (cur[GP.DPAD_DOWN]) my = 1;
    this.cursorX = Math.min(window.innerWidth, Math.max(0, this.cursorX + mx * CURSOR_SPEED * dt));
    this.cursorY = Math.min(window.innerHeight, Math.max(0, this.cursorY + my * CURSOR_SPEED * dt));
    el.style.left = `${this.cursorX}px`;
    el.style.top = `${this.cursorY}px`;

    for (const idx of risingEdges(this.prevPressed, cur)) {
      if (idx === GP.A) this.clickAtCursor();
      else if (idx === GP.B || idx === GP.START) this.cb.onAction('escape');
    }
  }

  // Synthesizes mousedown/mouseup/click at the cursor, reusing every existing DOM
  // click handler (use/equip/sell/trade/feed). Native HTML5 drag-to-rearrange the
  // action bar is the one interaction this cannot reach; clicks cover the rest.
  private clickAtCursor(): void {
    const target = document.elementFromPoint(this.cursorX, this.cursorY) as HTMLElement | null;
    if (!target) return;
    const opts = { bubbles: true, cancelable: true, clientX: this.cursorX, clientY: this.cursorY };
    target.dispatchEvent(new MouseEvent('mousedown', opts));
    target.dispatchEvent(new MouseEvent('mouseup', opts));
    target.click();
  }

  private hideCursor(): void {
    if (this.cursorEl) this.cursorEl.style.display = 'none';
    this.cursorInit = false;
  }
}
