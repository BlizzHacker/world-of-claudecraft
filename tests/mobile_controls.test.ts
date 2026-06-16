import { afterEach, describe, expect, it } from 'vitest';
import {
  clampJoystickOrigin,
  HAPTICS_STORE_KEY,
  isPhoneTouchDevice,
  loadHapticsEnabled,
  mapJoystickVector,
  mapLookVector,
  MobileControls,
  pinchZoomDelta,
  saveHapticsEnabled,
  triggerHaptic,
} from '../src/game/mobile_controls';
import type { Input, TouchMoveInput } from '../src/game/input';

describe('mapJoystickVector', () => {
  it('returns neutral inside the deadzone', () => {
    expect(mapJoystickVector(0, 0)).toEqual({ forward: false, back: false, strafeLeft: false, strafeRight: false });
    expect(mapJoystickVector(0.05, -0.08)).toEqual({ forward: false, back: false, strafeLeft: false, strafeRight: false });
  });

  it('maps cardinal movement directions', () => {
    expect(mapJoystickVector(0, -1)).toEqual({ forward: true, back: false, strafeLeft: false, strafeRight: false });
    expect(mapJoystickVector(0, 1)).toEqual({ forward: false, back: true, strafeLeft: false, strafeRight: false });
    expect(mapJoystickVector(-1, 0)).toEqual({ forward: false, back: false, strafeLeft: true, strafeRight: false });
    expect(mapJoystickVector(1, 0)).toEqual({ forward: false, back: false, strafeLeft: false, strafeRight: true });
  });

  it('maps diagonal movement directions', () => {
    expect(mapJoystickVector(0.7, -0.7)).toEqual({ forward: true, back: false, strafeLeft: false, strafeRight: true });
    expect(mapJoystickVector(-0.7, 0.7)).toEqual({ forward: false, back: true, strafeLeft: true, strafeRight: false });
  });
});

describe('isPhoneTouchDevice', () => {
  it('uses the phone touch media query', () => {
    const queries: string[] = [];
    const win = {
      matchMedia: (q: string) => {
        queries.push(q);
        return { matches: true };
      },
    } as unknown as Window;
    expect(isPhoneTouchDevice(win)).toBe(true);
    expect(queries[0]).toContain('pointer: coarse');
    expect(queries[0]).toContain('max-width: 940px');
    expect(queries[0]).toContain('max-height: 760px');
  });
});

describe('mapLookVector', () => {
  it('returns a neutral camera vector inside the deadzone', () => {
    expect(mapLookVector(0.02, 0.03)).toEqual({ x: 0, y: 0 });
  });

  it('keeps analog camera vector outside the deadzone', () => {
    const v = mapLookVector(0.45, -0.25);
    expect(v.x).toBeCloseTo(0.36);
    expect(v.y).toBeCloseTo(-0.2);
  });
});

describe('clampJoystickOrigin', () => {
  const bounds = { left: 0, top: 0, right: 400, bottom: 600 };
  const radius = 61;

  it('keeps an interior touch exactly where the thumb landed', () => {
    expect(clampJoystickOrigin(200, 300, radius, bounds)).toEqual({ x: 200, y: 300 });
  });

  it('pushes a corner touch inward so the whole circle stays on-screen', () => {
    expect(clampJoystickOrigin(5, 595, radius, bounds)).toEqual({ x: radius, y: bounds.bottom - radius });
  });

  it('clamps against the far edges too', () => {
    expect(clampJoystickOrigin(900, -50, radius, bounds)).toEqual({ x: bounds.right - radius, y: radius });
  });

  it('falls back to the axis midpoint when the zone is smaller than the joystick', () => {
    const tight = { left: 0, top: 0, right: 80, bottom: 600 };
    expect(clampJoystickOrigin(10, 300, radius, tight)).toEqual({ x: 40, y: 300 });
  });
});

describe('pinchZoomDelta', () => {
  it('returns zero when the pinch distance is unchanged', () => {
    expect(pinchZoomDelta(120, 120)).toBe(0);
  });

  it('zooms in (negative delta) when the fingers spread apart', () => {
    expect(pinchZoomDelta(100, 150, 0.04)).toBeCloseTo(-2);
  });

  it('zooms out (positive delta) when the fingers pinch together', () => {
    expect(pinchZoomDelta(150, 100, 0.04)).toBeCloseTo(2);
  });

  it('scales the delta by the magnitude of the spread', () => {
    expect(pinchZoomDelta(100, 110, 0.04)).toBeCloseTo(-0.4);
    expect(pinchZoomDelta(100, 200, 0.04)).toBeCloseTo(-4);
  });
});

describe('haptics', () => {
  const makeStore = (initial: Record<string, string> = {}) => {
    const map = new Map(Object.entries(initial));
    return {
      getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
      setItem: (k: string, v: string) => { map.set(k, v); },
      map,
    };
  };

  it('defaults to enabled when nothing is stored or storage is missing', () => {
    expect(loadHapticsEnabled(makeStore())).toBe(true);
    expect(loadHapticsEnabled(null)).toBe(true);
  });

  it('round-trips the stored preference (only "0" disables)', () => {
    const store = makeStore();
    saveHapticsEnabled(false, store);
    expect(store.map.get(HAPTICS_STORE_KEY)).toBe('0');
    expect(loadHapticsEnabled(store)).toBe(false);
    saveHapticsEnabled(true, store);
    expect(store.map.get(HAPTICS_STORE_KEY)).toBe('1');
    expect(loadHapticsEnabled(store)).toBe(true);
  });

  it('vibrates only when enabled and the API exists', () => {
    const calls: Array<number | number[]> = [];
    const nav = { vibrate: (p: number | number[]) => { calls.push(p); return true; } };
    expect(triggerHaptic(10, true, nav)).toBe(true);
    expect(triggerHaptic(10, false, nav)).toBe(false); // disabled
    expect(triggerHaptic(10, true, {})).toBe(false);    // no Vibration API
    expect(triggerHaptic(10, true, null)).toBe(false);  // no navigator
    expect(calls).toEqual([10]);
  });

  it('swallows Vibration API exceptions', () => {
    const nav = { vibrate: () => { throw new Error('blocked'); } };
    expect(triggerHaptic([12, 40, 12], true, nav)).toBe(false);
  });
});

class FakeClassList {
  private values = new Set<string>();

  add(...names: string[]): void {
    for (const name of names) this.values.add(name);
  }

  remove(...names: string[]): void {
    for (const name of names) this.values.delete(name);
  }

  contains(name: string): boolean {
    return this.values.has(name);
  }

  toggle(name: string, force?: boolean): boolean {
    const next = force ?? !this.values.has(name);
    if (next) this.values.add(name);
    else this.values.delete(name);
    return next;
  }
}

class FakeElement extends EventTarget {
  classList = new FakeClassList();
  style = { transform: '', left: '', top: '' };
  offsetWidth = 122;
  private captured = new Set<number>();

  constructor(private rect = { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }) {
    super();
  }

  getBoundingClientRect(): DOMRect {
    return this.rect as DOMRect;
  }

  setPointerCapture(pointerId: number): void {
    this.captured.add(pointerId);
  }

  releasePointerCapture(pointerId: number): void {
    this.captured.delete(pointerId);
  }

  hasPointerCapture(pointerId: number): boolean {
    return this.captured.has(pointerId);
  }

  closest(): Element | null {
    return null;
  }

  querySelector(): Element | null {
    return null;
  }

  setAttribute(): void {}
}

class FakeMediaQueryList extends EventTarget {
  matches = true;
}

const previousGlobals = {
  document: globalThis.document,
  window: globalThis.window,
};

afterEach(() => {
  Object.defineProperty(globalThis, 'document', { value: previousGlobals.document, configurable: true });
  Object.defineProperty(globalThis, 'window', { value: previousGlobals.window, configurable: true });
});

function installMobileControlDom(): {
  moveZone: FakeElement;
  moveJoystick: FakeElement;
  cameraJoystick: FakeElement;
  emoteButton: FakeElement;
  windowTarget: EventTarget;
} {
  const elements = new Map<string, FakeElement>([
    ['mobile-controls', new FakeElement()],
    ['mobile-move-zone', new FakeElement({ left: 0, top: 0, right: 240, bottom: 240, width: 240, height: 240 })],
    ['mobile-move-joystick', new FakeElement()],
    ['mobile-move-stick', new FakeElement()],
    ['mobile-camera-joystick', new FakeElement()],
    ['mobile-camera-stick', new FakeElement()],
    ['mobile-emote', new FakeElement()],
  ]);
  const body = new FakeElement();
  const documentTarget = new EventTarget();
  const windowTarget = new EventTarget() as EventTarget & { matchMedia(query: string): FakeMediaQueryList };
  windowTarget.matchMedia = () => new FakeMediaQueryList();

  const documentFake = documentTarget as EventTarget & {
    body: FakeElement;
    visibilityState: DocumentVisibilityState;
    getElementById(id: string): FakeElement | null;
  };
  documentFake.body = body;
  documentFake.visibilityState = 'visible';
  documentFake.getElementById = (id: string) => elements.get(id) ?? null;

  Object.defineProperty(globalThis, 'document', { value: documentFake, configurable: true });
  Object.defineProperty(globalThis, 'window', { value: windowTarget, configurable: true });

  return {
    moveZone: elements.get('mobile-move-zone')!,
    moveJoystick: elements.get('mobile-move-joystick')!,
    cameraJoystick: elements.get('mobile-camera-joystick')!,
    emoteButton: elements.get('mobile-emote')!,
    windowTarget,
  };
}

function pointerEvent(type: string, init: { pointerId: number; clientX?: number; clientY?: number }): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: init.pointerId },
    clientX: { value: init.clientX ?? 0 },
    clientY: { value: init.clientY ?? 0 },
  });
  return event;
}

function mobileCallbacks() {
  const noop = () => {};
  return {
    onAttackNearest: noop,
    onJump: noop,
    onTarget: noop,
    onInteract: noop,
    onAutorun: () => false,
    onChat: noop,
    onMenu: noop,
    onSocial: noop,
    onEmotes: noop,
    onArena: noop,
    onQuestLog: noop,
    onCharacter: noop,
    onBags: noop,
    onSpellbook: noop,
    onTalents: noop,
    onMap: noop,
    onLeaderboard: noop,
    onNameplates: () => false,
    onMusic: () => true,
  };
}

describe('MobileControls pointer lifecycle', () => {
  it('clears movement when the active pointer ends outside the joystick element', () => {
    const { moveZone, windowTarget } = installMobileControlDom();
    let lastMove: TouchMoveInput | null = null;
    let clearCount = 0;
    const input = {
      setTouchMove: (move: TouchMoveInput) => { lastMove = move; },
      clearTouchMove: () => { clearCount += 1; lastMove = null; },
      setTouchLook: () => {},
      setTouchLookVector: () => {},
    } as unknown as Input;

    new MobileControls(input, mobileCallbacks()).start();

    moveZone.dispatchEvent(pointerEvent('pointerdown', { pointerId: 4, clientX: 100, clientY: 50 }));
    moveZone.dispatchEvent(pointerEvent('pointermove', { pointerId: 4, clientX: 160, clientY: 50 }));

    expect(lastMove).toEqual({ forward: false, back: false, strafeLeft: false, strafeRight: true });

    windowTarget.dispatchEvent(pointerEvent('pointerup', { pointerId: 4 }));

    expect(clearCount).toBe(1);
    expect(lastMove).toBeNull();
  });

  it('keeps updating camera look when the active pointer moves outside the joystick element', () => {
    const { cameraJoystick, windowTarget } = installMobileControlDom();
    let touchLookActive = false;
    let lastLook = { x: 0, y: 0 };
    const input = {
      setTouchMove: () => {},
      clearTouchMove: () => {},
      setTouchLook: (active: boolean) => { touchLookActive = active; },
      setTouchLookVector: (look: { x: number; y: number }) => { lastLook = look; },
    } as unknown as Input;

    new MobileControls(input, mobileCallbacks()).start();

    cameraJoystick.dispatchEvent(pointerEvent('pointerdown', { pointerId: 9, clientX: 50, clientY: 50 }));
    windowTarget.dispatchEvent(pointerEvent('pointermove', { pointerId: 9, clientX: 100, clientY: 50 }));

    expect(touchLookActive).toBe(true);
    expect(lastLook).toEqual({ x: 0.8, y: 0 });

    windowTarget.dispatchEvent(pointerEvent('pointercancel', { pointerId: 9 }));

    expect(touchLookActive).toBe(false);
    expect(lastLook).toEqual({ x: 0, y: 0 });
  });

  it('fires the emote callback when the on-screen Emotes button is tapped', () => {
    const { emoteButton } = installMobileControlDom();
    const input = {
      setTouchMove: () => {},
      clearTouchMove: () => {},
      setTouchLook: () => {},
      setTouchLookVector: () => {},
    } as unknown as Input;

    let emotes = 0;
    const callbacks = { ...mobileCallbacks(), onEmotes: () => { emotes += 1; } };
    new MobileControls(input, callbacks).start();

    emoteButton.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));

    expect(emotes).toBe(1);
  });
});
