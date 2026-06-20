import type { MoveInput } from '../sim/types';
import { createGamepadCursor, type GamepadCursor } from './gamepad_cursor';

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
