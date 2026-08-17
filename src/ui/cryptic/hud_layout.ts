// Relocatable + lockable HUD — WoW-style "move anything" editor for the
// on-screen HUD elements (minimap, health/mana globes, action bar, community
// HUD). A floating "HUD" toggle enters Edit mode: registered elements get a
// drag overlay and can be repositioned; positions persist per element. Outside
// Edit mode everything is locked (normal play, no accidental drags).
//
// Positions are stored per-element in localStorage keyed by element id, so they
// survive reloads. "Reset" clears them back to the stylesheet defaults.

const TOGGLE_ID = 'cr-hud-edit-toggle';
const STYLE_ID = 'cr-hud-layout-style';
const POS_PREFIX = 'cr_hud_pos_';

// HUD elements that can be moved. Label shows in the drag handle during edit.
const TARGETS: { id: string; label: string }[] = [
  { id: 'minimap-wrap', label: 'Minimap' },
  { id: 'cr-hud-globes', label: 'Globes' },
  { id: 'actionbar-stack', label: 'Action Bar' },
  { id: 'community-hud', label: 'Social' },
];

let editing = false;

function posKey(id: string): string { return `${POS_PREFIX}${id}`; }

function readPos(id: string): { left: number; top: number } | null {
  try {
    const p = JSON.parse(localStorage.getItem(posKey(id)) ?? 'null');
    return p && typeof p.left === 'number' && typeof p.top === 'number' ? p : null;
  } catch { return null; }
}
function savePos(id: string, left: number, top: number): void {
  try { localStorage.setItem(posKey(id), JSON.stringify({ left, top })); } catch { /* ignore */ }
}
function clearPos(id: string): void {
  try { localStorage.removeItem(posKey(id)); } catch { /* ignore */ }
}

// Apply a saved position to an element: pin via left/top, clear the stylesheet's
// right/bottom so our coordinates win.
function applyPos(el: HTMLElement, p: { left: number; top: number }): void {
  el.style.left = `${p.left}px`;
  el.style.top = `${p.top}px`;
  el.style.right = 'auto';
  el.style.bottom = 'auto';
}

function applySavedPositions(): void {
  for (const t of TARGETS) {
    const el = document.getElementById(t.id);
    const p = el ? readPos(t.id) : null;
    if (el && p) applyPos(el, p);
  }
}

const STYLE = `
  #${TOGGLE_ID} {
    position: fixed; right: 12px; bottom: 92px; z-index: 60;
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 11px; border-radius: 6px;
    border: 1px solid var(--cr-border, #5f4b1a); background: rgba(10,9,6,0.9);
    color: var(--cr-gold, #ffd166); font: 700 12px/1 var(--cr-font-ui, system-ui, sans-serif);
    letter-spacing: .5px; cursor: pointer;
  }
  #${TOGGLE_ID}:hover { border-color: var(--cr-gold, #ffd166); background: rgba(255,209,0,0.12); }
  #${TOGGLE_ID}.cr-hud-editing { background: rgba(255,209,0,0.2); color: #fff; }
  .cr-hud-editable { outline: 2px dashed rgba(255,209,0,0.7) !important; cursor: grab; }
  .cr-hud-editable.cr-hud-dragging { cursor: grabbing; outline-color: #fff !important; }
  .cr-hud-edit-handle {
    position: absolute; top: -18px; left: 0; z-index: 99;
    font: 700 10px/1 var(--cr-font-ui, system-ui, sans-serif);
    color: #120d04; background: var(--cr-gold, #ffd166);
    padding: 2px 6px; border-radius: 3px; white-space: nowrap; pointer-events: none;
  }
  #cr-hud-edit-bar {
    position: fixed; right: 12px; bottom: 124px; z-index: 60;
    display: none; gap: 6px; background: rgba(10,9,6,0.95);
    border: 1px solid var(--cr-border, #5f4b1a); border-radius: 6px; padding: 6px;
  }
  #cr-hud-edit-bar.show { display: flex; }
  /* The admin body editor. It used to be a fixed bottom-right button at
     z-index 9000, which put it OVER every window and modal in the game and
     could never be moved. It is HUD chrome now: parked above the Move HUD
     button, in the same z band, and registered as a Move HUD target below so
     the operator can drag it wherever they want (position persists). */
  #cr-edit-bodies-btn {
    position: fixed; right: 12px; bottom: 156px; z-index: 60;
    background: #2a1e10; color: #f4e6c8; border: 1px solid #7a5a2a;
    border-radius: 8px; padding: 8px 12px; cursor: pointer;
    font: 600 13px var(--cr-font-ui, system-ui, sans-serif);
    box-shadow: 0 4px 16px rgba(0,0,0,.4);
  }
  #cr-edit-bodies-btn:hover { border-color: var(--cr-gold, #ffd166); }
  #cr-hud-edit-bar button {
    padding: 5px 9px; border-radius: 4px; border: 1px solid #5f4b1a;
    background: rgba(0,0,0,0.3); color: #d7c9a8; font-size: 11px; font-weight: 700; cursor: pointer;
  }
  #cr-hud-edit-bar button:hover { border-color: var(--cr-gold, #ffd166); color: var(--cr-gold, #ffd166); }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = STYLE;
  document.head.appendChild(s);
}

function makeDraggable(el: HTMLElement, id: string): void {
  if ((el as unknown as { _crDrag?: boolean })._crDrag) return;
  (el as unknown as { _crDrag?: boolean })._crDrag = true;
  el.addEventListener('pointerdown', (ev) => {
    if (!editing) return;
    ev.preventDefault();
    ev.stopPropagation();
    el.setPointerCapture?.(ev.pointerId);
    el.classList.add('cr-hud-dragging');
    const rect = el.getBoundingClientRect();
    const ox = ev.clientX - rect.left;
    const oy = ev.clientY - rect.top;
    const move = (m: PointerEvent) => {
      const left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, m.clientX - ox));
      const top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, m.clientY - oy));
      applyPos(el, { left, top });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      el.classList.remove('cr-hud-dragging');
      const r = el.getBoundingClientRect();
      savePos(id, r.left, r.top);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  });
}

/**
 * Add one more element to the Move HUD editor's target list at runtime.
 *
 * The static TARGETS above all exist by the time mountHudLayout runs. The admin
 * "Edit Bodies" button does not: it is appended only after an async /me role
 * check, which is exactly why it was previously stranded as an unmovable fixed
 * button. Registering here gives it the same treatment as the minimap or the
 * globes: its saved position is applied immediately, and if the operator is
 * already in Move HUD mode it picks up the drag handle without a re-toggle.
 * Idempotent.
 */
export function registerHudLayoutTarget(id: string, label: string): void {
  if (typeof document === 'undefined') return;
  if (TARGETS.some((t) => t.id === id)) return;
  TARGETS.push({ id, label });
  ensureStyle();
  const el = document.getElementById(id);
  const saved = el ? readPos(id) : null;
  if (el && saved) applyPos(el, saved);
  if (editing) setEditing(true);
}

// Exported so the single master "Move HUD" button (move_hud_button.ts) drives HUD-layout
// edit mode too — one control unlocks the unit frames AND these layout targets, instead of
// two competing toggles. Idempotent.
export function setHudLayoutEditing(on: boolean): void {
  setEditing(on);
}

function setEditing(on: boolean): void {
  editing = on;
  const bar = document.getElementById('cr-hud-edit-bar');
  bar?.classList.toggle('show', on);
  for (const t of TARGETS) {
    const el = document.getElementById(t.id);
    if (!el) continue;
    el.classList.toggle('cr-hud-editable', on);
    let handle = el.querySelector<HTMLElement>(':scope > .cr-hud-edit-handle');
    if (on) {
      if (getComputedStyle(el).position === 'static') el.style.position = 'absolute';
      makeDraggable(el, t.id);
      if (!handle) {
        handle = document.createElement('div');
        handle.className = 'cr-hud-edit-handle';
        handle.textContent = t.label;
        el.appendChild(handle);
      }
    } else if (handle) {
      handle.remove();
    }
  }
}

export function mountHudLayout(): void {
  // Idempotent: the edit-bar is our "already mounted" marker now (the old toggle button
  // was removed in favor of the single master Move HUD button).
  if (typeof document === 'undefined' || document.getElementById('cr-hud-edit-bar')) return;
  // Only wire HUD-move when the in-game HUD is actually present (don't clutter the
  // landing/home page, which has no minimap/globes/bar).
  const hasHud = TARGETS.some((t) => document.getElementById(t.id));
  if (!hasHud) return;
  ensureStyle();
  applySavedPositions();

  // No standalone toggle button here anymore — the single master "Move HUD" button
  // (move_hud_button.ts) drives edit mode via setHudLayoutEditing(). This removes the
  // duplicate "🔒 Move HUD" control the user saw alongside the draggable one.
  const bar = document.createElement('div');
  bar.id = 'cr-hud-edit-bar';
  bar.innerHTML = `
    <button type="button" data-act="done">Done</button>
    <button type="button" data-act="reset">Reset layout</button>`;
  bar.querySelector('[data-act="done"]')?.addEventListener('click', () => setEditing(false));
  bar.querySelector('[data-act="reset"]')?.addEventListener('click', () => {
    for (const t of TARGETS) {
      clearPos(t.id);
      const el = document.getElementById(t.id);
      if (el) { el.style.left = ''; el.style.top = ''; el.style.right = ''; el.style.bottom = ''; }
    }
  });
  document.body.appendChild(bar);
}
