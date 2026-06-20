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

function setEditing(on: boolean): void {
  editing = on;
  const toggle = document.getElementById(TOGGLE_ID);
  const bar = document.getElementById('cr-hud-edit-bar');
  toggle?.classList.toggle('cr-hud-editing', on);
  if (toggle) toggle.innerHTML = on ? '🔓 HUD: editing' : '🔒 Move HUD';
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
  if (typeof document === 'undefined' || document.getElementById(TOGGLE_ID)) return;
  // Only show the HUD-move toggle when the in-game HUD is actually present
  // (don't clutter the landing/home page, which has no minimap/globes/bar).
  const hasHud = TARGETS.some((t) => document.getElementById(t.id));
  if (!hasHud) return;
  ensureStyle();
  applySavedPositions();

  const toggle = document.createElement('button');
  toggle.id = TOGGLE_ID;
  toggle.type = 'button';
  toggle.title = 'Move / lock HUD elements';
  toggle.innerHTML = '🔒 Move HUD';
  toggle.addEventListener('click', () => setEditing(!editing));
  document.body.appendChild(toggle);

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
