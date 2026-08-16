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
import { ensureToolsHost } from './tools_host';

const MODAL_ID = 'cr-loot-modal';
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
  #${BTN_ID} { display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border:1px solid var(--cr-border,#5f4b1a); border-radius:5px; background:rgba(171,212,115,0.07); color:#abd473; font:700 12px/1 var(--cr-font-ui,system-ui,sans-serif); letter-spacing:.5px; cursor:pointer; }
  #${BTN_ID}:hover { border-color:#abd473; background:rgba(171,212,115,0.14); }
  #${MODAL_ID} { position:fixed; inset:0; z-index:200; display:none; align-items:center; justify-content:center; padding:16px; background:rgba(4,4,8,0.82); backdrop-filter:blur(6px); }
  #${MODAL_ID}.open { display:flex; }
  #${MODAL_ID} .cr-loot-shell { width:min(860px,100%); max-height:88vh; overflow-y:auto; background:linear-gradient(180deg,rgba(20,16,10,0.98),rgba(8,8,12,0.98)); border:1px solid #abd473; border-radius:10px; padding:18px 20px; color:#f4ead0; font-family:var(--cr-font-ui,system-ui,sans-serif); }
  #${MODAL_ID} .cr-loot-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  #${MODAL_ID} h2 { margin:0; color:#abd473; font-size:20px; }
  #${MODAL_ID} .cr-loot-close { background:none; border:1px solid #5f4b1a; color:#f4ead0; border-radius:5px; width:30px; height:30px; cursor:pointer; }
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
  const grid = document.querySelector(`#${MODAL_ID} .cr-loot-grid`);
  if (grid) grid.innerHTML = rollBatch().map(itemCard).join('');
}

function openModal(): void {
  const realm = getActiveRealm();
  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement('div'); modal.id = MODAL_ID;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  }
  modal.innerHTML = `<div class="cr-loot-shell" role="dialog" aria-modal="true" aria-label="Loot Vault">
    <div class="cr-loot-top"><h2>${escapeHtml(realm.name)} — Loot Vault</h2><button type="button" class="cr-loot-close" aria-label="Close">✕</button></div>
    <div class="cr-loot-controls">
      <span class="lbl">MIN RARITY</span>
      ${rarityFilter()}
      <button type="button" class="cr-loot-roll">🎲 Roll Loot</button>
    </div>
    <div class="cr-loot-grid"></div>
  </div>`;
  modal.querySelector('.cr-loot-close')?.addEventListener('click', closeModal);
  modal.querySelector('.cr-loot-roll')?.addEventListener('click', renderGrid);
  modal.querySelectorAll<HTMLButtonElement>('.cr-loot-rbtn').forEach((b) => {
    b.addEventListener('click', () => {
      minRarity = b.dataset.rarity as RarityId;
      modal!.querySelectorAll('.cr-loot-rbtn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      renderGrid();
    });
  });
  renderGrid();
  modal.classList.add('open');
  document.addEventListener('keydown', onEsc);
}

function closeModal(): void {
  document.getElementById(MODAL_ID)?.classList.remove('open');
  document.removeEventListener('keydown', onEsc);
}
function onEsc(e: KeyboardEvent): void { if (e.key === 'Escape') closeModal(); }

/** Mount the Loot Vault launcher into a page-provided #cr-bestiary-host, or
 *  the shared fixed in-game toolbar (see tools_host.ts — a bare document.body
 *  append lands under the fixed #game-canvas and is never visible in the
 *  world). */
export function mountLootVault(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(BTN_ID)) return;
  ensureStyle();
  const host = document.getElementById('cr-bestiary-host') ?? ensureToolsHost();
  const btn = document.createElement('button');
  btn.id = BTN_ID; btn.type = 'button';
  btn.innerHTML = '<span aria-hidden="true">💰</span> Loot Vault';
  btn.addEventListener('click', openModal);
  host.appendChild(btn);
}
