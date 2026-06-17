import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../src/game/input';
import { Keybinds } from '../src/game/keybinds';

function installStorage(): void {
  const map = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
  };
}

function makeInput() {
  const canvasListeners = new Map<string, (event: any) => void>();
  const windowListeners = new Map<string, (event: any) => void>();
  const documentListeners = new Map<string, (event: any) => void>();
  const requestPointerLock = vi.fn();
  const exitPointerLock = vi.fn();
  let gameActive = true;
  let mobileTouch = false;
  const canvas = {
    style: { cursor: '' },
    addEventListener: vi.fn((type: string, cb: (event: any) => void) => {
      canvasListeners.set(type, cb);
    }),
    requestPointerLock,
  };
  (globalThis as any).window = {
    addEventListener: vi.fn((type: string, cb: (event: any) => void) => {
      windowListeners.set(type, cb);
    }),
  };
  (globalThis as any).document = {
    activeElement: null,
    body: {
      classList: {
        contains: (cls: string) => (cls === 'game-active' && gameActive) || (cls === 'mobile-touch' && mobileTouch),
      },
    },
    fullscreenElement: null,
    webkitFullscreenElement: null,
    pointerLockElement: null,
    hidden: false,
    addEventListener: vi.fn((type: string, cb: (event: any) => void) => {
      documentListeners.set(type, cb);
    }),
    exitPointerLock,
  };
  const cb = {
    onTab: vi.fn(),
    onTargetFriendly: vi.fn(),
    onCycleFriendly: vi.fn(),
    onAbility: vi.fn(),
    onUiKey: vi.fn(),
    onEmoteWheel: vi.fn(),
    onClickPick: vi.fn(),
  };
  const input = new Input(canvas as any, cb, new Keybinds());
  return {
    canvas,
    canvasListeners,
    windowListeners,
    documentListeners,
    cb,
    input,
    setGameActive: (active: boolean) => { gameActive = active; },
    setMobileTouch: (active: boolean) => { mobileTouch = active; },
  };
}

beforeEach(() => {
  installStorage();
  vi.restoreAllMocks();
});

describe('Input autorun', () => {
  it('toggleAutorun flips state and feeds forward into readMoveInput', () => {
    const { input } = makeInput();
    expect(input.autorun).toBe(false);
    expect(input.toggleAutorun()).toBe(true);
    expect(input.autorun).toBe(true);
    expect(input.readMoveInput().forward).toBe(true);
    expect(input.toggleAutorun()).toBe(false);
    expect(input.readMoveInput().forward).toBe(false);
  });

  it('a forward touch-move cancels autorun (classic tap-to-stop)', () => {
    const { input } = makeInput();
    input.toggleAutorun();
    input.setTouchMove({ forward: true, back: false, strafeLeft: false, strafeRight: false });
    expect(input.autorun).toBe(false);
  });

  it('a strafe-only touch-move keeps autorun engaged', () => {
    const { input } = makeInput();
    input.toggleAutorun();
    input.setTouchMove({ forward: false, back: false, strafeLeft: true, strafeRight: false });
    expect(input.autorun).toBe(true);
    expect(input.readMoveInput().forward).toBe(true);
  });
});

describe('Input click-to-move marker pulses', () => {
  it('increments the pulse id for every accepted click-move target', () => {
    const { input } = makeInput();
    expect(input.clickMovePulse).toBe(0);
    input.setClickMoveTarget({ x: 1, z: 2 }, 0.5);
    expect(input.clickMovePulse).toBe(1);
    expect(input.clickMovePulseTarget).toEqual({ x: 1, z: 2 });
    input.setClickMoveTarget({ x: 2, z: 3 }, 0.5);
    expect(input.clickMovePulse).toBe(2);
    expect(input.clickMovePulseTarget).toEqual({ x: 2, z: 3 });
  });
});

describe('Input pointer lock', () => {
  it('does not request pointer lock for a plain right click', () => {
    const { canvas, canvasListeners } = makeInput();

    canvasListeners.get('mousedown')!({ button: 2 });

    expect(canvas.requestPointerLock).not.toHaveBeenCalled();
  });

  it('requests pointer lock after mouse movement becomes an active drag', () => {
    const { canvas, canvasListeners, windowListeners } = makeInput();

    canvasListeners.get('mousedown')!({ button: 2, clientX: 100, clientY: 100 });
    windowListeners.get('mousemove')!({ movementX: 10, movementY: 5 });
    windowListeners.get('mousemove')!({ movementX: 4, movementY: 0 });
    expect(canvas.requestPointerLock).not.toHaveBeenCalled();
    windowListeners.get('mousemove')!({ movementX: 1, movementY: 0 });

    expect(canvas.requestPointerLock).toHaveBeenCalledTimes(1);
  });

  it('uses normal mouse dragging instead of pointer lock while browser fullscreen is active', () => {
    const { canvas, canvasListeners, windowListeners } = makeInput();
    (globalThis as any).document.fullscreenElement = (globalThis as any).document.documentElement ?? canvas;

    canvasListeners.get('mousedown')!({ button: 2, clientX: 100, clientY: 100 });
    windowListeners.get('mousemove')!({ movementX: 19, movementY: 0 });
    windowListeners.get('mousemove')!({ movementX: 1, movementY: 0 });

    expect(canvas.requestPointerLock).not.toHaveBeenCalled();
  });

  it('does not rotate the camera before the drag threshold, so short sloppy clicks stay stable', () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { canvas, input, cb, canvasListeners, windowListeners } = makeInput();
    const yaw = input.camYaw;
    const pitch = input.camPitch;

    canvasListeners.get('mousedown')!({ button: 0, clientX: 120, clientY: 160, preventDefault: vi.fn() });
    now += 40;
    windowListeners.get('mousemove')!({ movementX: 12, movementY: 3 });
    expect(input.isCameraDragActive()).toBe(false);
    expect(input.camYaw).toBe(yaw);
    expect(input.camPitch).toBe(pitch);

    now += 40;
    windowListeners.get('mouseup')!({ button: 0, clientX: 132, clientY: 163, target: canvas });
    expect(cb.onClickPick).toHaveBeenCalledWith(120, 160, 0);
  });

  it('starts camera drag by distance but discards the threshold-crossing movement', () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { canvas, input, canvasListeners, windowListeners } = makeInput();
    const yaw = input.camYaw;

    canvasListeners.get('mousedown')!({ button: 2, clientX: 100, clientY: 100, preventDefault: vi.fn() });
    windowListeners.get('mousemove')!({ movementX: 10, movementY: 5 });
    windowListeners.get('mousemove')!({ movementX: 4, movementY: 0 });
    expect(input.isCameraDragActive()).toBe(true);
    expect(input.camYaw).toBe(yaw);
    expect(canvas.requestPointerLock).not.toHaveBeenCalled();

    windowListeners.get('mousemove')!({ movementX: 2, movementY: 0 });
    expect(canvas.requestPointerLock).toHaveBeenCalledTimes(1);
    expect(input.camYaw).toBeCloseTo(yaw - 2 * 0.0045);
  });

  it('starts camera drag by hold duration even with small pointer movement', () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { input, canvasListeners, windowListeners } = makeInput();
    const yaw = input.camYaw;

    canvasListeners.get('mousedown')!({ button: 2, clientX: 100, clientY: 100, preventDefault: vi.fn() });
    now += 150;
    windowListeners.get('mousemove')!({ movementX: 1, movementY: 0 });
    expect(input.isCameraDragActive()).toBe(true);
    expect(input.camYaw).toBe(yaw);

    windowListeners.get('mousemove')!({ movementX: 2, movementY: 0 });
    expect(input.camYaw).toBeCloseTo(yaw - 2 * 0.0045);
  });

  it('does not camera-drag with the mouse button bound to click-to-move', () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { canvas, input, cb, canvasListeners, windowListeners } = makeInput();
    input.setClickMoveMouseButton(0);
    const yaw = input.camYaw;

    canvasListeners.get('mousedown')!({ button: 0, clientX: 120, clientY: 160, preventDefault: vi.fn() });
    now += 180;
    windowListeners.get('mousemove')!({ movementX: 40, movementY: 12 });
    expect(input.isCameraDragActive()).toBe(false);
    expect(input.camYaw).toBe(yaw);
    expect(canvas.requestPointerLock).not.toHaveBeenCalled();

    windowListeners.get('mouseup')!({ button: 0, clientX: 160, clientY: 172, target: canvas });
    expect(cb.onClickPick).toHaveBeenCalledWith(120, 160, 0);
  });

  it('allows the click-to-move mouse button to camera-drag after the click timer expires', () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const { canvas, input, cb, canvasListeners, windowListeners } = makeInput();
    input.setClickMoveMouseButton(2);
    const yaw = input.camYaw;

    canvasListeners.get('mousedown')!({ button: 2, clientX: 100, clientY: 100, preventDefault: vi.fn() });
    now += 281;
    windowListeners.get('mousemove')!({ movementX: 1, movementY: 0 });
    expect(input.isCameraDragActive()).toBe(true);
    expect(input.camYaw).toBe(yaw);
    expect(canvas.requestPointerLock).not.toHaveBeenCalled();

    windowListeners.get('mousemove')!({ movementX: 2, movementY: 0 });
    expect(canvas.requestPointerLock).toHaveBeenCalledTimes(1);
    expect(input.camYaw).toBeCloseTo(yaw - 2 * 0.0045);

    windowListeners.get('mouseup')!({ button: 2, clientX: 103, clientY: 100, target: canvas });
    expect(cb.onClickPick).not.toHaveBeenCalled();
  });

  it('keeps camera drag available on the unbound mouse button', () => {
    const { canvas, input, canvasListeners, windowListeners } = makeInput();
    input.setClickMoveMouseButton(0);
    const yaw = input.camYaw;

    canvasListeners.get('mousedown')!({ button: 2, clientX: 100, clientY: 100, preventDefault: vi.fn() });
    windowListeners.get('mousemove')!({ movementX: 19, movementY: 0 });
    expect(input.isCameraDragActive()).toBe(true);
    expect(input.camYaw).toBe(yaw);
    windowListeners.get('mousemove')!({ movementX: 2, movementY: 0 });

    expect(canvas.requestPointerLock).toHaveBeenCalledTimes(1);
    expect(input.camYaw).toBeCloseTo(yaw - 2 * 0.0045);
  });
});

describe('Input context menu guard', () => {
  it('suppresses the native context menu while the game is active', () => {
    const { documentListeners } = makeInput();
    const preventDefault = vi.fn();

    documentListeners.get('contextmenu')!({
      target: { tagName: 'DIV', closest: () => null },
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalled();
  });

  it('does not suppress native context menus before entering the game', () => {
    const { documentListeners, setGameActive } = makeInput();
    const preventDefault = vi.fn();
    setGameActive(false);

    documentListeners.get('contextmenu')!({
      target: { tagName: 'DIV', closest: () => null },
      preventDefault,
    });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('keeps native context menus available in editable controls', () => {
    const { documentListeners } = makeInput();
    const preventDefault = vi.fn();

    documentListeners.get('contextmenu')!({
      target: { tagName: 'INPUT', closest: () => null },
      preventDefault,
    });

    expect(preventDefault).not.toHaveBeenCalled();
  });
});

describe('Input mobile selection guard', () => {
  it('suppresses text selection during active mobile gameplay', () => {
    const { documentListeners, setMobileTouch } = makeInput();
    const preventDefault = vi.fn();
    setMobileTouch(true);

    documentListeners.get('selectstart')!({
      target: { tagName: 'DIV', closest: () => null },
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalled();
  });

  it('does not suppress selection before entering the game', () => {
    const { documentListeners, setGameActive, setMobileTouch } = makeInput();
    const preventDefault = vi.fn();
    setGameActive(false);
    setMobileTouch(true);

    documentListeners.get('selectstart')!({
      target: { tagName: 'DIV', closest: () => null },
      preventDefault,
    });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('does not suppress selection on desktop', () => {
    const { documentListeners } = makeInput();
    const preventDefault = vi.fn();

    documentListeners.get('selectstart')!({
      target: { tagName: 'DIV', closest: () => null },
      preventDefault,
    });

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('keeps selection available in editable mobile controls', () => {
    const { documentListeners, setMobileTouch } = makeInput();
    const preventDefault = vi.fn();
    setMobileTouch(true);

    documentListeners.get('selectstart')!({
      target: { tagName: 'TEXTAREA', closest: () => null },
      preventDefault,
    });

    expect(preventDefault).not.toHaveBeenCalled();
  });
});

describe('Input Escape handling', () => {
  it('dispatches Escape even when modal UI blocks game keys', () => {
    const { cb, windowListeners } = makeInput();
    (cb as any).canUseGameKeys = vi.fn(() => false);

    windowListeners.get('keydown')!({ code: 'Escape', repeat: false });
    windowListeners.get('keydown')!({ code: 'KeyB', repeat: false });

    expect(cb.onUiKey).toHaveBeenCalledTimes(1);
    expect(cb.onUiKey).toHaveBeenCalledWith('escape');
  });
});

describe('Input Space handling', () => {
  it('prevents native Space button activation while preserving jump input', () => {
    const { input, windowListeners } = makeInput();
    (globalThis as any).document.activeElement = { tagName: 'BUTTON' };
    const preventDefault = vi.fn();

    windowListeners.get('keydown')!({ code: 'Space', repeat: false, preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(input.readMoveInput().jump).toBe(true);
  });
});

describe('Input movement is not cancelled by a camera drag', () => {
  // Discord regression: walking with W (or any held key) then right/left-drag to
  // look around and releasing the button stopped movement, because exiting
  // pointer lock cleared the held keyboard keys.
  function walkAndDrag(button: number, windowListeners: Map<string, (e: any) => void>, canvasListeners: Map<string, (e: any) => void>, documentListeners: Map<string, (e: any) => void>) {
    windowListeners.get('keydown')!({ code: 'KeyW', repeat: false });        // hold forward
    canvasListeners.get('mousedown')!({ button });                           // press camera button
    windowListeners.get('mousemove')!({ movementX: 19, movementY: 0 });      // drag activates
    windowListeners.get('mousemove')!({ movementX: 1, movementY: 0 });       // drag → pointer lock
    (globalThis as any).document.pointerLockElement = (globalThis as any).document; // lock engaged
    windowListeners.get('mouseup')!({ button });                             // release → exitPointerLock
    (globalThis as any).document.pointerLockElement = null;                  // lock ends
    documentListeners.get('pointerlockchange')!({});                         // browser fires change
  }

  it('keeps walking forward after a right-drag ends', () => {
    const { input, windowListeners, canvasListeners, documentListeners } = makeInput();
    walkAndDrag(2, windowListeners, canvasListeners, documentListeners);
    expect(input.readMoveInput().forward).toBe(true);
  });

  it('keeps walking forward after a left-drag ends', () => {
    const { input, windowListeners, canvasListeners, documentListeners } = makeInput();
    walkAndDrag(0, windowListeners, canvasListeners, documentListeners);
    expect(input.readMoveInput().forward).toBe(true);
  });

  it('still forgets held keys on focus loss so movement cannot stick', () => {
    const { input, windowListeners } = makeInput();
    windowListeners.get('keydown')!({ code: 'KeyW', repeat: false });
    windowListeners.get('blur')!({});
    expect(input.readMoveInput().forward).toBe(false);
  });
});
describe('touch jump', () => {
  it('jump is off until the touch button arms it', () => {
    const { input } = makeInput();
    expect(input.readMoveInput().jump).toBe(false);
  });

  it('triggerTouchJump yields exactly one frame of jump', () => {
    const { input } = makeInput();
    input.triggerTouchJump();
    expect(input.readMoveInput().jump).toBe(true);
    // momentary: a single poll consumes it so it cannot stick on like a held key
    expect(input.readMoveInput().jump).toBe(false);
  });
});

describe('Input emote wheel hold', () => {
  it('opens on the held binding and closes when the key is released', () => {
    const { windowListeners, cb } = makeInput();
    const preventDefault = vi.fn();

    windowListeners.get('keydown')!({ code: 'KeyX', repeat: false, preventDefault });
    expect(cb.onEmoteWheel).toHaveBeenLastCalledWith(true);
    expect(preventDefault).toHaveBeenCalled();

    windowListeners.get('keyup')!({ code: 'KeyX', preventDefault });
    expect(cb.onEmoteWheel).toHaveBeenLastCalledWith(false);
  });

  it('closes the wheel on focus loss', () => {
    const { windowListeners, cb } = makeInput();
    windowListeners.get('keydown')!({ code: 'KeyX', repeat: false, preventDefault: vi.fn() });

    windowListeners.get('blur')!({});

    expect(cb.onEmoteWheel).toHaveBeenLastCalledWith(false);
  });
});
