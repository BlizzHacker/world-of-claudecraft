// Pickit Filter Editor — vanilla-TS port of CRPickitPanel. The pickit rule
// engine is already ported (src/sim/realms/pickit.ts: parsePickitFilter /
// evaluateItem); this is the editor UI: write SHOW/HIDE/HIGHLIGHT rules and
// test them against freshly-rolled items. The filter persists to localStorage
// so it survives reloads. Display/utility only — does not drive sim loot.

import { Rng } from '../../sim/rng';
import { parsePickitFilter, evaluateItem } from '../../sim/realms/pickit';
import {
  RARITY_ORDER, ITEM_SLOTS, RARITY, generateRealmItem,
  type RealmItemSlot, type RealmItem,
} from '../../sim/realms/rarity';
import { ensureToolsHost } from './tools_host';

const MODAL_ID = 'cr-pickit-modal';
const BTN_ID = 'cr-pickit-btn';
const STYLE_ID = 'cr-pickit-style';
const STORE_KEY = 'cr_pickit_filter';

const DEFAULT_FILTER = [
  '# First match wins, top to bottom.',
  '# Syntax: SHOW|HIDE  key op value ...   [HIGHLIGHT] [COLOR:#hex]',
  '# keys: rarity slot level   ops: >= <= = *=',
  'SHOW rarity>=legendary HIGHLIGHT COLOR:#ff8c00',
  'SHOW rarity>=rare slot=weapon',
  'HIDE rarity<=common',
  'SHOW rarity>=magic',
].join('\n');

const SLOTS = Object.keys(ITEM_SLOTS) as RealmItemSlot[];
let seed = (Date.now() & 0xffffff) || 1;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

function loadFilter(): string {
  try { return window.localStorage?.getItem(STORE_KEY) ?? DEFAULT_FILTER; } catch { return DEFAULT_FILTER; }
}
function saveFilter(text: string): void {
  try { window.localStorage?.setItem(STORE_KEY, text); } catch { /* unavailable */ }
}

function rollItems(n: number): RealmItem[] {
  const out: RealmItem[] = [];
  for (let i = 0; i < n; i++) {
    const rng = new Rng((seed = (seed + 0x9e3779b9) & 0xffffffff));
    const slot = SLOTS[Math.floor(rng.next() * SLOTS.length)];
    const rarity = RARITY_ORDER[Math.floor(rng.next() * RARITY_ORDER.length)];
    out.push(generateRealmItem(rng, slot, rarity, Math.floor(rng.next() * 50) + 1));
  }
  return out;
}

function renderResults(text: string): string {
  const rules = parsePickitFilter(text);
  const items = rollItems(10);
  const rows = items.map((it) => {
    const res = evaluateItem(it, rules);
    const r = RARITY[it.rarity];
    const verdict = res.show
      ? `<span class="cr-pk-show"${res.highlight ? ` style="text-shadow:0 0 6px ${escapeHtml(res.color ?? r.color)}"` : ''}>SHOW${res.highlight ? ' ★' : ''}</span>`
      : '<span class="cr-pk-hide">HIDE</span>';
    return `<tr>
      <td style="color:${escapeHtml(r.color)}">${escapeHtml(it.name ?? r.name + ' ' + (ITEM_SLOTS[it.slot]?.name ?? it.slot))}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(ITEM_SLOTS[it.slot]?.name ?? it.slot)}</td>
      <td>${it.itemLevel}</td>
      <td>${verdict}</td>
    </tr>`;
  }).join('');
  return `<div class="cr-pk-rulecount">${rules.length} rule(s) parsed</div>
    <table class="cr-pk-table">
      <thead><tr><th>Item</th><th>Rarity</th><th>Slot</th><th>iLvl</th><th>Filter</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

const STYLE = `
  #${BTN_ID} { display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border:1px solid var(--cr-border,#5f4b1a); border-radius:5px; background:rgba(214,153,55,0.08); color:#e0a93b; font:700 12px/1 var(--cr-font-ui,system-ui,sans-serif); letter-spacing:.5px; cursor:pointer; }
  #${BTN_ID}:hover { border-color:#e0a93b; background:rgba(214,153,55,0.16); }
  #${MODAL_ID} { position:fixed; inset:0; z-index:200; display:none; align-items:center; justify-content:center; padding:16px; background:rgba(4,4,8,0.82); backdrop-filter:blur(6px); }
  #${MODAL_ID}.open { display:flex; }
  #${MODAL_ID} .cr-pk-shell { width:min(820px,100%); max-height:88vh; overflow-y:auto; background:linear-gradient(180deg,rgba(20,16,10,0.98),rgba(8,8,12,0.98)); border:1px solid #e0a93b; border-radius:10px; padding:18px 20px; color:#f4ead0; font-family:var(--cr-font-ui,system-ui,sans-serif); }
  #${MODAL_ID} .cr-pk-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
  #${MODAL_ID} h2 { margin:0; color:#e0a93b; font-size:20px; }
  #${MODAL_ID} .cr-pk-close { background:none; border:1px solid #5f4b1a; color:#f4ead0; border-radius:5px; width:30px; height:30px; cursor:pointer; }
  .cr-pk-hint { font-size:12px; color:#b8aa82; line-height:1.55; margin-bottom:8px; }
  .cr-pk-hint code { color:#7bdff2; }
  .cr-pk-textarea { width:100%; min-height:140px; box-sizing:border-box; background:#0c0a07; color:#f4ead0; border:1px solid #5f4b1a; border-radius:6px; padding:10px; font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace; resize:vertical; }
  .cr-pk-actions { display:flex; gap:8px; margin:10px 0 14px; }
  .cr-pk-btn { padding:7px 14px; border-radius:6px; border:1px solid #5f4b1a; background:rgba(0,0,0,0.25); color:#d7c9a8; font-weight:700; font-size:13px; cursor:pointer; }
  .cr-pk-btn.primary { border-color:#e0a93b; color:#e0a93b; background:rgba(214,153,55,0.14); }
  .cr-pk-rulecount { font-size:11px; color:#abd473; margin-bottom:6px; }
  .cr-pk-table { width:100%; border-collapse:collapse; font-size:12.5px; }
  .cr-pk-table th { text-align:left; color:#b8aa82; border-bottom:1px solid #463a1c; padding:4px 6px; }
  .cr-pk-table td { padding:4px 6px; border-bottom:1px solid rgba(70,58,28,0.4); }
  .cr-pk-show { color:#1eff00; font-weight:700; }
  .cr-pk-hide { color:#7c6f50; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = STYLE;
  document.head.appendChild(s);
}

function openModal(): void {
  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement('div'); modal.id = MODAL_ID;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  }
  const filter = loadFilter();
  modal.innerHTML = `<div class="cr-pk-shell" role="dialog" aria-modal="true" aria-label="Pickit Filter Editor">
    <div class="cr-pk-top"><h2>Pickit Filter Editor</h2><button type="button" class="cr-pk-close" aria-label="Close">✕</button></div>
    <p class="cr-pk-hint">Write rules to control which loot is shown. First match wins.<br>
      <code>SHOW|HIDE rarity&gt;=rare slot=weapon level&gt;=20 [HIGHLIGHT] [COLOR:#ff8c00]</code></p>
    <textarea class="cr-pk-textarea" spellcheck="false">${escapeHtml(filter)}</textarea>
    <div class="cr-pk-actions">
      <button type="button" class="cr-pk-btn primary" data-act="test">▶ Test &amp; Save</button>
      <button type="button" class="cr-pk-btn" data-act="reset">Reset to default</button>
    </div>
    <div class="cr-pk-results"></div>
  </div>`;
  const ta = modal.querySelector<HTMLTextAreaElement>('.cr-pk-textarea')!;
  const results = modal.querySelector<HTMLElement>('.cr-pk-results')!;
  const runTest = () => { saveFilter(ta.value); results.innerHTML = renderResults(ta.value); };
  modal.querySelector('.cr-pk-close')?.addEventListener('click', closeModal);
  modal.querySelector('[data-act="test"]')?.addEventListener('click', runTest);
  modal.querySelector('[data-act="reset"]')?.addEventListener('click', () => { ta.value = DEFAULT_FILTER; runTest(); });
  results.innerHTML = renderResults(filter);
  modal.classList.add('open');
  document.addEventListener('keydown', onEsc);
}

function closeModal(): void {
  document.getElementById(MODAL_ID)?.classList.remove('open');
  document.removeEventListener('keydown', onEsc);
}
function onEsc(e: KeyboardEvent): void { if (e.key === 'Escape') closeModal(); }

/** Mount the Pickit editor launcher into a page-provided #cr-bestiary-host,
 *  or the shared fixed in-game toolbar (see tools_host.ts — a bare
 *  document.body append lands under the fixed #game-canvas and is never
 *  visible in the world). */
export function mountPickitPanel(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(BTN_ID)) return;
  ensureStyle();
  const host = document.getElementById('cr-bestiary-host') ?? ensureToolsHost();
  const btn = document.createElement('button');
  btn.id = BTN_ID; btn.type = 'button';
  btn.innerHTML = '<span aria-hidden="true">🎯</span> Pickit Filter';
  btn.addEventListener('click', openModal);
  host.appendChild(btn);
}
