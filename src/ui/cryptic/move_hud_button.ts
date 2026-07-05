// Master "Move HUD" button — a small floating control that toggles edit-mode on
// every movable HUD frame at once (the player frame + target frame today), so the
// user unlocks them all with one press instead of hunting each frame's corner
// button. The button is ITSELF draggable (its own position persisted), which is
// the specific thing the user asked for: "Move-HUD button itself movable; all HUD
// moves work with it." Desktop-only (frame drag is a desktop affordance); hidden
// on the mobile layout, which owns its own fixed HUD positions.

import type { MovableFrame } from '../movable_frame';

const ID = 'cr-move-hud-btn';
const POS_KEY = 'cr_move_hud_btn_pos';

interface Pos {
  left: number;
  top: number;
}

function readPos(): Pos | null {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null');
    return p && typeof p.left === 'number' && typeof p.top === 'number' ? p : null;
  } catch {
    return null;
  }
}
function savePos(p: Pos): void {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

export interface MoveHudButtonConfig {
  /** Every movable HUD frame the master button drives. */
  frames(): MovableFrame[];
  isMobileLayout(): boolean;
}

/** Mount the master Move-HUD button once. Safe to call repeatedly (no-ops if the
 *  button already exists). */
export function mountMoveHudButton(cfg: MoveHudButtonConfig): void {
  if (typeof document === 'undefined' || document.getElementById(ID)) return;

  const el = document.createElement('button');
  el.id = ID;
  el.type = 'button';
  el.className = 'cr-move-hud-btn';
  el.setAttribute('aria-pressed', 'false');
  el.title = 'Move HUD — unlock every frame to drag; drag this button to reposition it';
  el.setAttribute('aria-label', 'Move HUD');
  el.innerHTML = '<span class="cr-mhb-glyph">✥</span><span class="cr-mhb-label">Move HUD</span>';
  document.body.appendChild(el);

  const pos = readPos();
  if (pos) {
    el.style.left = `${pos.left}px`;
    el.style.top = `${pos.top}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }

  let editing = false;
  const applyEditing = () => {
    el.classList.toggle('cr-mhb-active', editing);
    el.setAttribute('aria-pressed', editing ? 'true' : 'false');
    for (const f of cfg.frames()) f.setUnlockedPublic(editing);
  };

  // A small movement threshold lets a tap toggle edit-mode while a real drag
  // repositions the button instead (same trick the music widget uses).
  let dragging = false;
  el.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || cfg.isMobileLayout()) return;
    ev.preventDefault();
    el.setPointerCapture?.(ev.pointerId);
    const rect = el.getBoundingClientRect();
    const ox = ev.clientX - rect.left;
    const oy = ev.clientY - rect.top;
    const startX = ev.clientX;
    const startY = ev.clientY;
    let moved = false;
    const move = (m: PointerEvent) => {
      if (!moved && Math.hypot(m.clientX - startX, m.clientY - startY) < 4) return;
      moved = true;
      dragging = true;
      const left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, m.clientX - ox));
      const top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, m.clientY - oy));
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      if (moved) {
        const r = el.getBoundingClientRect();
        savePos({ left: r.left, top: r.top });
      }
      // Defer clearing the drag flag so the click handler (fires after pointerup)
      // can tell a drag from a tap and suppress the toggle on a drag.
      setTimeout(() => {
        dragging = false;
      }, 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  });

  el.addEventListener('click', (ev) => {
    ev.preventDefault();
    if (dragging) return; // this "click" was the end of a drag, not a tap
    editing = !editing;
    applyEditing();
  });

  // Re-clamp into view on viewport changes.
  window.addEventListener('resize', () => {
    const r = el.getBoundingClientRect();
    if (r.left + r.width > window.innerWidth || r.top + r.height > window.innerHeight) {
      const left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, r.left));
      const top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, r.top));
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      savePos({ left, top });
    }
  });
}
