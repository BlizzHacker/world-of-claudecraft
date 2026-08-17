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
import { realmSystemTitle } from '../../sim/realms/system_text';
import { mountToolLauncher, renderToolWindow, toggleToolWindow } from './tools_host';

const WINDOW_ID = 'cr-pickit-window';
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
  #${WINDOW_ID} { border-color:#e0a93b; }

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

/** Paint the window body: the rule textarea, its actions, and the test table. */
function paintWindow(): void {
  const body = renderToolWindow(WINDOW_ID, realmSystemTitle('pickit', 'Pickit Filter'));
  const filter = loadFilter();
  body.innerHTML = `<p class="cr-pk-hint">Write rules to control which loot is shown. First match wins.<br>
      <code>SHOW|HIDE rarity&gt;=rare slot=weapon level&gt;=20 [HIGHLIGHT] [COLOR:#ff8c00]</code></p>
    <textarea class="cr-pk-textarea" spellcheck="false">${escapeHtml(filter)}</textarea>
    <div class="cr-pk-actions">
      <button type="button" class="cr-pk-btn primary" data-act="test">Test and Save</button>
      <button type="button" class="cr-pk-btn" data-act="reset">Reset to default</button>
    </div>
    <div class="cr-pk-results"></div>`;
  const ta = body.querySelector('.cr-pk-textarea') as HTMLTextAreaElement;
  const results = body.querySelector('.cr-pk-results') as HTMLElement;
  const runTest = () => {
    saveFilter(ta.value);
    results.innerHTML = renderResults(ta.value);
  };
  body.querySelector('[data-act="test"]')?.addEventListener('click', runTest);
  body.querySelector('[data-act="reset"]')?.addEventListener('click', () => {
    ta.value = DEFAULT_FILTER;
    runTest();
  });
  results.innerHTML = renderResults(filter);
}

/** Open or close the Pickit editor window (rail button + keybind share this). */
export function togglePickitPanel(): void {
  if (typeof document === 'undefined') return;
  ensureStyle();
  toggleToolWindow(WINDOW_ID, paintWindow);
}

/** Mount the Pickit editor launcher onto the game's micro-menu rail. */
export function mountPickitPanel(): void {
  if (typeof document === 'undefined') return;
  ensureStyle();
  mountToolLauncher({
    id: BTN_ID,
    icon: 'target',
    glyph: '\u{1F3AF}',
    label: realmSystemTitle('pickit', 'Pickit Filter'),
    onOpen: togglePickitPanel,
  });
}
