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
import { getToken } from '../../user/api';

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
  // Only left clicks, and only when a prop is armed for placement.
  if (ev.button !== 0 || !state.selectedKey) return;
  // Ignore clicks that land on UI (the dock, HUD, any overlay) — only the bare
  // game canvas should place. If the click target isn't the canvas, bail.
  const target = ev.target as HTMLElement | null;
  if (!target || target.closest(`#${DOCK_ID}`)) return;
  if (target.tagName !== 'CANVAS' && !target.closest('canvas')) return;
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
  builderRefreshStatus?.();
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

const DOCK_ID = 'cr-world-builder-dock';

/**
 * Open the World Builder as a NON-BLOCKING right-side dock. Unlike the ArcForge
 * modal (full-screen overlay), this dock occupies only its own strip so the game
 * world stays visible AND clickable — that's the whole point: pick a prop in the
 * dock, then click the ground directly. No "capture clicks" hack, no escaping a
 * modal. Mirrors the classic ArcForge Evolve sidebar.
 */
export function openWorldBuilderDock(): void {
  if (typeof document === 'undefined') return;
  let dock = document.getElementById(DOCK_ID);
  if (dock) { dock.hidden = false; state.active = true; enableInteraction(); return; }

  dock = document.createElement('div');
  dock.id = DOCK_ID;
  dock.className = 'cr-wb-dock';
  const keys = placeablePropKeys();
  dock.innerHTML =
    '<div class="cr-wb-head"><span class="cr-wb-title">World Builder</span>' +
    '<button type="button" class="cr-wb-close" data-wb-close aria-label="Close">×</button></div>' +
    '<p class="cr-wb-hint">Pick a prop, then click the ground to place it. ' +
    'Click a placed prop to select — <b>[</b> <b>]</b> rotate, <b>-</b> <b>=</b> scale, <b>Del</b> remove.</p>' +
    `<div class="cr-wb-status" data-wb-status></div>` +
    '<input type="search" class="cr-wb-filter" data-wb-filter placeholder="Filter props…" autocomplete="off">' +
    '<div class="cr-wb-secthead">Native props</div>' +
    '<div class="cr-wb-palette" data-wb-palette>' +
    keys.map((k) => `<button type="button" class="cr-afe-place" data-build-key="${escapeAttr(k)}">${escapeAttr(k)}</button>`).join('') +
    '</div>' +
    '<div class="cr-wb-secthead">Forged (generated / uploaded)' +
    '<button type="button" class="cr-wb-upload" data-wb-upload title="Upload a .glb">⬆ Upload</button>' +
    '<button type="button" class="cr-wb-refresh" data-wb-refresh title="Refresh list">⟳</button></div>' +
    '<div class="cr-wb-palette cr-wb-forged" data-wb-forged><div class="cr-wb-empty">loading…</div></div>' +
    '<input type="file" accept=".glb" data-wb-file style="display:none">';
  document.body.appendChild(dock);

  const statusEl = dock.querySelector<HTMLElement>('[data-wb-status]');
  const refreshStatus = () => {
    if (!statusEl) return;
    const sel = state.selectedEnt != null ? ' · selected ✏' : '';
    statusEl.textContent =
      `armed: ${state.selectedKey ?? 'none'} · yaw ${Math.round((state.yaw * 180 / Math.PI) % 360)}° · scale ${state.scale.toFixed(1)}×${sel}`;
  };
  builderRefreshStatus = refreshStatus;

  dock.querySelector('[data-wb-close]')?.addEventListener('click', () => closeWorldBuilderDock());

  const filter = dock.querySelector<HTMLInputElement>('[data-wb-filter]');
  filter?.addEventListener('input', () => {
    const q = (filter.value || '').toLowerCase();
    dock!.querySelectorAll<HTMLElement>('[data-build-key]').forEach((b) => {
      b.style.display = !q || (b.dataset.buildKey || '').toLowerCase().includes(q) ? '' : 'none';
    });
  });

  // Delegated arm-on-click: works for native props AND forged buttons added later.
  const armKey = (key: string, btn: HTMLElement) => {
    state.selectedKey = key;
    state.selectedEnt = null; // arming a new prop clears the edit selection
    dock!.querySelectorAll('[data-build-key]').forEach((b) => b.classList.remove('sel'));
    btn.classList.add('sel');
    refreshStatus();
  };
  dock.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest('[data-build-key]') as HTMLElement | null;
    if (btn && btn.dataset.buildKey) armKey(btn.dataset.buildKey, btn);
  });

  // Forged props: fetch the USB4 catalog and render a "forged:<key>" button each.
  const forgedHost = dock.querySelector<HTMLElement>('[data-wb-forged]');
  const loadForged = async () => {
    if (!forgedHost) return;
    forgedHost.innerHTML = '<div class="cr-wb-empty">loading…</div>';
    try {
      const res = await fetch('/api/forged-props', { credentials: 'same-origin' });
      const data = await res.json();
      const items: Array<{ key: string; name: string }> = data.props || [];
      forgedHost.innerHTML = items.length
        ? items.map((p) => `<button type="button" class="cr-afe-place" data-build-key="forged:${escapeAttr(p.key)}" title="${escapeAttr(p.name)}">${escapeAttr(p.name)}</button>`).join('')
        : '<div class="cr-wb-empty">none yet — generate or upload a GLB</div>';
    } catch {
      forgedHost.innerHTML = '<div class="cr-wb-empty">failed to load</div>';
    }
  };
  dock.querySelector('[data-wb-refresh]')?.addEventListener('click', () => { void loadForged(); });

  // Upload a .glb → POST to the forged store → refresh the list.
  const fileInput = dock.querySelector<HTMLInputElement>('[data-wb-file]');
  dock.querySelector('[data-wb-upload]')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    const token = getToken();
    try {
      const res = await fetch(`/me/api/arcforge/upload-glb?name=${encodeURIComponent(f.name)}`, {
        method: 'POST',
        headers: { 'content-type': 'model/gltf-binary', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: await f.arrayBuffer(),
      });
      if (!res.ok) { alert('Upload failed: ' + (await res.text()).slice(0, 200)); return; }
      await loadForged();
    } catch (e) { alert('Upload error: ' + e); }
    finally { fileInput.value = ''; }
  });
  void loadForged();

  // Active whenever the dock is open — placement is armed by selecting a prop.
  state.active = true;
  enableInteraction();
  refreshStatus();
}

export function closeWorldBuilderDock(): void {
  const dock = document.getElementById(DOCK_ID);
  if (dock) dock.remove();
  state.active = false;
  state.selectedKey = null;
  state.selectedEnt = null;
  disableInteraction();
}

let builderRefreshStatus: (() => void) | null = null;

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
  state.selectedKey = null; // selecting an existing prop disarms placement
  state.yaw = e.facing ?? 0;
  state.scale = e.scale ?? 1;
  builderRefreshStatus?.();
  return true;
}

/** Back-compat: the builder is now its own dock; closing the editor no longer
 *  tears it down (the dock has its own close button). Left as a safe no-op-ish
 *  helper in case a caller wants to force-close. */
export function unmountWorldBuilder(): void {
  // intentionally does NOT close the dock — the dock is independent of the modal.
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
