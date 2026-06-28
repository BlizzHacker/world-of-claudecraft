// ArcForge world builder — admin/mod in-game prop placement.
//
// Minecraft-style: pick a prop from the palette, click the ground to place it,
// click a placed prop to select, then nudge/rotate/scale or delete it. All
// mutations go through IWorld (placeProp/moveProp/removeProp) → the server,
// which re-validates the admin/mod role and persists to realm_props. Placed
// props are normal `object` entities, so every player sees them live.
//
// This module owns ONLY the builder palette + pointer interaction. It reaches
// the live game via window.__game (set in main.ts): { world, renderer }.

import { placeablePropKeys } from '../../render/props';

interface GameHandle {
  world: {
    placeProp(key: string, x: number, z: number, yaw: number, scale: number): void;
    moveProp(dbId: number, x: number, z: number, yaw: number, scale: number): void;
    removeProp(dbId: number): void;
    entities?: Map<number, { id: number; templateId?: string; pos: { x: number; z: number }; facing?: number; scale?: number }>;
  };
  renderer: {
    groundPoint(clientX: number, clientY: number, planeY: number): { x: number; z: number } | null;
  };
}

function game(): GameHandle | null {
  const g = (window as unknown as { __game?: GameHandle }).__game;
  return g && g.world && g.renderer ? g : null;
}

// Map a freshly-placed entity to its DB id, learned from the server's
// `propPlaced` event (entId → dbId). Selection uses this to move/delete.
const dbIdByEnt = new Map<number, number>();
export function notePropPlaced(entId: number, dbId: number): void {
  dbIdByEnt.set(entId, dbId);
}

type BuilderState = {
  active: boolean;
  selectedKey: string | null;   // armed prop to place on next ground click
  selectedEnt: number | null;   // currently selected placed entity id
  yaw: number;
  scale: number;
};
const state: BuilderState = { active: false, selectedKey: null, selectedEnt: null, yaw: 0, scale: 1 };

let pointerHandler: ((ev: PointerEvent) => void) | null = null;
let keyHandler: ((ev: KeyboardEvent) => void) | null = null;

function onGroundPointer(ev: PointerEvent): void {
  const g = game();
  if (!g) return;
  // Only left clicks on the canvas, and only when placing.
  if (ev.button !== 0 || !state.selectedKey) return;
  const gp = g.renderer.groundPoint(ev.clientX, ev.clientY, 0);
  if (!gp) return;
  g.world.placeProp(state.selectedKey, gp.x, gp.z, state.yaw, state.scale);
  ev.preventDefault();
  ev.stopPropagation();
}

function onBuilderKey(ev: KeyboardEvent): void {
  if (!state.active) return;
  // Rotate armed/selected prop with [ ], scale with - =, delete selected.
  if (ev.key === '[') { state.yaw -= Math.PI / 8; reflectSelected(); }
  else if (ev.key === ']') { state.yaw += Math.PI / 8; reflectSelected(); }
  else if (ev.key === '-') { state.scale = Math.max(0.25, state.scale - 0.1); reflectSelected(); }
  else if (ev.key === '=') { state.scale = Math.min(4, state.scale + 0.1); reflectSelected(); }
  else if ((ev.key === 'Delete' || ev.key === 'Backspace') && state.selectedEnt != null) {
    const dbId = dbIdByEnt.get(state.selectedEnt);
    if (dbId != null) { game()?.world.removeProp(dbId); dbIdByEnt.delete(state.selectedEnt); }
    state.selectedEnt = null;
  } else return;
  ev.preventDefault();
}

// Apply current yaw/scale to the selected placed prop (live move).
function reflectSelected(): void {
  const g = game();
  if (!g || state.selectedEnt == null) return;
  const dbId = dbIdByEnt.get(state.selectedEnt);
  const e = g.world.entities?.get(state.selectedEnt);
  if (dbId == null || !e) return;
  g.world.moveProp(dbId, e.pos.x, e.pos.z, state.yaw, state.scale);
}

function enableInteraction(): void {
  if (pointerHandler) return;
  pointerHandler = onGroundPointer;
  keyHandler = onBuilderKey;
  // Capture phase so we beat the game's own click-to-move/target handler.
  window.addEventListener('pointerdown', pointerHandler, { capture: true });
  window.addEventListener('keydown', keyHandler, { capture: true });
}
function disableInteraction(): void {
  if (pointerHandler) window.removeEventListener('pointerdown', pointerHandler, { capture: true });
  if (keyHandler) window.removeEventListener('keydown', keyHandler, { capture: true });
  pointerHandler = null; keyHandler = null;
}

/** Render the builder palette into `root` and wire interaction. */
export function mountWorldBuilder(root: HTMLElement): void {
  const keys = placeablePropKeys();
  root.innerHTML =
    '<div class="cr-modal-section-title">World Builder — place ClaudeCraft props</div>' +
    '<p class="cr-afe-blurb">Pick a prop, then click the ground to place it. ' +
    'Click a placed prop to select; <b>[</b> <b>]</b> rotate, <b>-</b> <b>=</b> scale, <b>Del</b> remove. ' +
    'Placed props persist for the realm and everyone sees them.</p>' +
    '<label class="cr-afe-build-toggle"><input type="checkbox" data-cr-build-active> Builder active (capture clicks)</label>' +
    `<div class="cr-afe-build-status" data-cr-build-status>armed: none · yaw 0° · scale 1.0×</div>` +
    '<div class="cr-afe-build-palette">' +
    keys.map((k) => `<button type="button" class="cr-afe-place" data-build-key="${escapeAttr(k)}">${escapeAttr(k)}</button>`).join('') +
    '</div>';

  const statusEl = root.querySelector<HTMLElement>('[data-cr-build-status]');
  const refreshStatus = () => {
    if (statusEl) {
      statusEl.textContent =
        `armed: ${state.selectedKey ?? 'none'} · yaw ${Math.round((state.yaw * 180 / Math.PI) % 360)}° · scale ${state.scale.toFixed(1)}×`;
    }
  };

  const activeBox = root.querySelector<HTMLInputElement>('[data-cr-build-active]');
  activeBox?.addEventListener('change', () => {
    state.active = !!activeBox.checked;
    if (state.active) enableInteraction(); else { disableInteraction(); state.selectedKey = null; }
    refreshStatus();
  });

  root.querySelectorAll<HTMLButtonElement>('[data-build-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedKey = btn.dataset.buildKey || null;
      root.querySelectorAll('[data-build-key]').forEach((b) => b.classList.remove('sel'));
      btn.classList.add('sel');
      if (!state.active && activeBox) { activeBox.checked = true; state.active = true; enableInteraction(); }
      refreshStatus();
    });
  });
  refreshStatus();
}

/**
 * Try to select a clicked entity as a builder target. Returns true if the
 * builder is active AND the entity is a placed prop (click consumed); false
 * lets normal targeting/move proceed.
 */
export function tryBuilderSelect(entId: number): boolean {
  if (!state.active) return false;
  const g = game();
  const e = g?.world.entities?.get(entId);
  if (!e || !e.templateId || !e.templateId.startsWith('prop:')) return false;
  state.selectedEnt = entId;
  state.yaw = e.facing ?? 0;
  state.scale = e.scale ?? 1;
  return true;
}

/** Called when the editor closes, so we stop capturing world clicks. */
export function unmountWorldBuilder(): void {
  state.active = false;
  state.selectedKey = null;
  disableInteraction();
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
