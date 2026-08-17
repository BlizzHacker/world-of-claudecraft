// Loot Vault — a loot generator + rarity showcase, ported in spirit from the
// original Cryptic Realm CRStash. Rolls real items through the ported item
// system (src/sim/realms/rarity.ts: generateRealmItem) so players can see the
// rarity tiers, slots, and affixes the engine produces. Display-only — no
// server persistence is faked; this is a showcase / loot simulator.

import './realm_env';
import { Rng } from '../../sim/rng';
import {
  RARITY, RARITY_ORDER, ITEM_SLOTS, generateRealmItem,
  type RarityId, type RealmItemSlot, type RealmItem,
} from '../../sim/realms/rarity';
import { getActiveRealm } from '../../sim/realms';
import { realmSystemTitle } from '../../sim/realms/system_text';
import { mountToolLauncher, renderToolWindow, toggleToolWindow } from './tools_host';

const WINDOW_ID = 'cr-loot-window';
const BTN_ID = 'cr-loot-btn';
const STYLE_ID = 'cr-loot-style';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

const SLOTS = Object.keys(ITEM_SLOTS) as RealmItemSlot[];
let seedCounter = Date.now() & 0xffffff;
let minRarity: RarityId = 'common';
let itemLevel = 10;

/** Roll one item per slot at >= minRarity (rarity rises with a fresh rng roll). */
function rollBatch(): RealmItem[] {
  const minIdx = RARITY_ORDER.indexOf(minRarity);
  return SLOTS.map((slot) => {
    const rng = new Rng((seedCounter = (seedCounter + 0x9e3779b9) & 0xffffffff));
    // Bias the rarity to land at or above the chosen floor.
    const span = RARITY_ORDER.length - minIdx;
    const rarity = RARITY_ORDER[minIdx + Math.floor(rng.next() * span)];
    return generateRealmItem(rng, slot, rarity, itemLevel);
  });
}

function itemCard(it: RealmItem): string {
  const r = RARITY[it.rarity];
  const slotName = ITEM_SLOTS[it.slot]?.name ?? it.slot;
  const affixes = it.affixes
    .map((a) => `<li>${escapeHtml(a.name)} <span class="cr-loot-val">+${a.value} ${escapeHtml(a.stat)}</span></li>`)
    .join('');
  const title = it.name ?? `${r.name} ${slotName}`;
  return `<div class="cr-loot-card" style="border-color:${escapeHtml(r.color)};box-shadow:0 0 10px ${escapeHtml(r.glow)}">
    <div class="cr-loot-card-head">
      <span class="cr-loot-name" style="color:${escapeHtml(r.color)}">${escapeHtml(title)}</span>
      <span class="cr-loot-rarity" style="color:${escapeHtml(r.color)}">${escapeHtml(r.name)}</span>
    </div>
    <div class="cr-loot-slot">${escapeHtml(slotName)} · iLvl ${it.itemLevel}</div>
    ${affixes ? `<ul class="cr-loot-affixes">${affixes}</ul>` : '<div class="cr-loot-noaffix">No affixes</div>'}
  </div>`;
}

function rarityFilter(): string {
  return RARITY_ORDER.map((r) =>
    `<button type="button" class="cr-loot-rbtn${r === minRarity ? ' active' : ''}" data-rarity="${r}"
       style="color:${RARITY[r].color};border-color:${RARITY[r].color}66">${escapeHtml(RARITY[r].name)}</button>`,
  ).join('');
}

const STYLE = `
  #${WINDOW_ID} { border-color:#abd473; }

  .cr-loot-controls { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:14px; }
  .cr-loot-controls .lbl { font-size:11px; color:#b8aa82; letter-spacing:.5px; }
  .cr-loot-rbtn { padding:4px 9px; border-radius:4px; border:1px solid; background:transparent; font-size:11px; font-weight:700; cursor:pointer; }
  .cr-loot-rbtn.active { background:rgba(255,255,255,0.06); }
  .cr-loot-roll { margin-left:auto; padding:7px 16px; border-radius:6px; border:1px solid #abd473; background:rgba(171,212,115,0.14); color:#abd473; font-weight:700; font-size:13px; cursor:pointer; }
  .cr-loot-roll:hover { background:rgba(171,212,115,0.24); }
  .cr-loot-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:10px; }
  .cr-loot-card { border:1px solid; border-radius:8px; padding:10px 12px; background:rgba(0,0,0,0.3); }
  .cr-loot-card-head { display:flex; align-items:baseline; justify-content:space-between; gap:6px; }
  .cr-loot-name { font-weight:800; font-size:13px; }
  .cr-loot-rarity { font-size:10px; text-transform:uppercase; letter-spacing:.5px; }
  .cr-loot-slot { color:#b8aa82; font-size:11px; margin:3px 0 6px; }
  .cr-loot-affixes { margin:0; padding-left:16px; color:#d7c9a8; font-size:11.5px; line-height:1.5; }
  .cr-loot-val { color:#7bdff2; }
  .cr-loot-noaffix { color:#7c6f50; font-size:11px; font-style:italic; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = STYLE;
  document.head.appendChild(s);
}

function renderGrid(): void {
  const grid = document.querySelector(`#${WINDOW_ID} .cr-loot-grid`);
  if (grid) grid.innerHTML = rollBatch().map(itemCard).join('');
}

/** Paint the window body: rarity floor controls, the roll button, the grid. */
function paintWindow(): void {
  const realm = getActiveRealm();
  const body = renderToolWindow(
    WINDOW_ID,
    `${realm.name} - ${realmSystemTitle('lootVault', 'Loot Vault')}`,
  );
  body.innerHTML = `<div class="cr-loot-controls">
      <span class="lbl">MIN RARITY</span>
      ${rarityFilter()}
      <button type="button" class="cr-loot-roll">Roll Loot</button>
    </div>
    <div class="cr-loot-grid"></div>`;
  body.querySelector('.cr-loot-roll')?.addEventListener('click', renderGrid);
  body.querySelectorAll<HTMLButtonElement>('.cr-loot-rbtn').forEach((b) => {
    b.addEventListener('click', () => {
      minRarity = b.dataset.rarity as RarityId;
      for (const x of body.querySelectorAll('.cr-loot-rbtn')) x.classList.remove('active');
      b.classList.add('active');
      renderGrid();
    });
  });
  renderGrid();
}

/** Open or close the Loot Vault window (rail button + keybind share this). */
export function toggleLootVault(): void {
  if (typeof document === 'undefined') return;
  ensureStyle();
  toggleToolWindow(WINDOW_ID, paintWindow);
}

/** Mount the Loot Vault launcher onto the game's micro-menu rail. */
export function mountLootVault(): void {
  if (typeof document === 'undefined') return;
  ensureStyle();
  mountToolLauncher({
    id: BTN_ID,
    icon: 'chest',
    glyph: '\u{1F4B0}',
    label: realmSystemTitle('lootVault', 'Loot Vault'),
    onOpen: toggleLootVault,
  });
}
