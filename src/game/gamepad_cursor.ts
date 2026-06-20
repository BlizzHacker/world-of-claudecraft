// Controller-driven virtual mouse. Lets a gamepad click any HTML UI the game
// throws up — quest accept/turn-in buttons, chat send, menu items, inventory —
// which previously needed a real mouse. The original Cryptic Realm had this; the
// claudecraft engine's pad support could move/fight but couldn't operate menus.
//
// Model:
//   - A floating cursor element follows the RIGHT stick (or left stick in cursor
//     mode). Speed scales with stick deflection.
//   - The "click" button synthesizes pointerdown/mouseup/click at the cursor's
//     screen position via document.elementFromPoint, so normal DOM handlers fire.
//   - When a blocking dialog (quest, chat, menu) is open, cursor mode auto-arms
//     so you can immediately point-and-click without a mode toggle.
//
// Pure DOM; no sim imports. Driven each frame by mountGamepadControls.

const CURSOR_ID = 'cr-gamepad-cursor';
const BASE_SPEED = 780; // px/sec at full stick

export interface CursorState {
  x: number;
  y: number;
  visible: boolean;
}

export interface GamepadCursor {
  /** Advance the cursor by stick input. dx/dy in [-1,1]; dt seconds. */
  move(dx: number, dy: number, dt: number): boolean;
  /** Synthesize a full click at the current cursor position. */
  click(): void;
  /** Right-click (context) at the cursor — maps to in-world right-click. */
  rightClick(): void;
  show(): void;
  hide(): void;
  visible(): boolean;
  state(): CursorState;
  destroy(): void;
}

function ensureCursorEl(): HTMLElement {
  let el = document.getElementById(CURSOR_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CURSOR_ID;
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  return el;
}

function synthAt(x: number, y: number, type: string, button = 0): void {
  const target = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!target) return;
  const common = {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: x,
    clientY: y,
    button,
    view: window,
  } as MouseEventInit;
  // Fire the pointer + mouse sequence most handlers expect.
  if (type === 'click') {
    target.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerType: 'mouse' }));
    target.dispatchEvent(new MouseEvent('mousedown', common));
    target.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerType: 'mouse' }));
    target.dispatchEvent(new MouseEvent('mouseup', common));
    target.dispatchEvent(new MouseEvent('click', common));
    // Focus inputs so the on-screen keyboard / typing works.
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable) {
      target.focus();
    }
  } else if (type === 'contextmenu') {
    target.dispatchEvent(new MouseEvent('mousedown', { ...common, button: 2 }));
    target.dispatchEvent(new MouseEvent('mouseup', { ...common, button: 2 }));
    target.dispatchEvent(new MouseEvent('contextmenu', { ...common, button: 2 }));
  }
}

export function createGamepadCursor(): GamepadCursor {
  if (typeof document === 'undefined') {
    // SSR / test stub.
    const noop = () => {};
    return {
      move: () => false, click: noop, rightClick: noop, show: noop, hide: noop,
      visible: () => false, state: () => ({ x: 0, y: 0, visible: false }), destroy: noop,
    };
  }
  const el = ensureCursorEl();
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let shown = false;

  const render = () => {
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.display = shown ? 'block' : 'none';
  };
  render();

  return {
    move(dx, dy, dt) {
      if (dx === 0 && dy === 0) return false;
      x = Math.max(0, Math.min(window.innerWidth, x + dx * BASE_SPEED * dt));
      y = Math.max(0, Math.min(window.innerHeight, y + dy * BASE_SPEED * dt));
      if (!shown) { shown = true; }
      render();
      // Hover feedback so buttons highlight under the cursor.
      const under = document.elementFromPoint(x, y) as HTMLElement | null;
      under?.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y, view: window }));
      return true;
    },
    click() { synthAt(x, y, 'click'); },
    rightClick() { synthAt(x, y, 'contextmenu'); },
    show() { shown = true; render(); },
    hide() { shown = false; render(); },
    visible() { return shown; },
    state() { return { x, y, visible: shown }; },
    destroy() { el.remove(); },
  };
}
