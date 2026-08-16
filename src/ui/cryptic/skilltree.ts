// Skill Tree viewer — vanilla-TS port of the original Cryptic Realm
// CRSkillTree.jsx. For the active realm, lets the player browse each class's
// skill trees as a procedural 25-node grid (start → stat nodes → notables →
// keystone). Display-only: reads RealmContent.classes, never touches sim
// state, so it works for every realm that defines classes + skillTrees.

import './realm_env';
import { getActiveRealm } from '../../sim/realms';
import type { RealmClassSkin, RealmRole } from '../../sim/realms/types';
import { ensureToolsHost } from './tools_host';

const MODAL_ID = 'cr-skilltree-modal';
const BTN_ID = 'cr-skilltree-btn';
const STYLE_ID = 'cr-skilltree-style';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

interface TreeNode { name: string; icon: string; isStart?: boolean; isNotable?: boolean; isKeystone?: boolean; desc: string; }

const ROLE_ICONS: Record<RealmRole, string[]> = {
  Tank: ['🛡', '💪', '🏔', '⛓', '🪨'],
  DPS: ['⚔', '🔥', '💥', '⚡', '🎯'],
  Healer: ['💚', '✨', '🌿', '💫', '🩹'],
  Support: ['🔮', '🛡', '⚙', '🎭', '📯'],
  Summoner: ['☠', '👻', '🦇', '💀', '🐺'],
  Assassin: ['🗡', '👤', '🐍', '💨', '🎯'],
};

const STAT_NODES = [
  '+5 Strength', '+5 Dexterity', '+5 Vitality', '+5 Energy',
  '+3% Damage', '+3% Defense', '+2% Speed', '+10 HP',
  '+10 MP', '+2% Crit', '+3% Resist', '+4% Life Regen',
  '+2% Mana Regen', '+5% Skill Range',
];

function generateTreeNodes(cls: RealmClassSkin, treeName: string): TreeNode[] {
  const icons = ROLE_ICONS[cls.role] ?? ROLE_ICONS.DPS;
  const nodes: TreeNode[] = [];
  nodes.push({ name: 'Start', icon: cls.icon, isStart: true, desc: 'Starting point' });
  for (let i = 0; i < 14; i++) {
    nodes.push({ name: STAT_NODES[i % STAT_NODES.length], icon: icons[i % icons.length], desc: STAT_NODES[i % STAT_NODES.length] });
  }
  nodes.push({ name: `${treeName} Mastery`, icon: '⭐', isNotable: true, desc: '+15% to all tree bonuses' });
  nodes.push({ name: `${cls.role} Focus`, icon: icons[0], isNotable: true, desc: `+20% ${cls.role} effectiveness` });
  nodes.push({ name: 'Resilience', icon: '🏔', isNotable: true, desc: '+30 max HP, +10% defense' });
  nodes.push({ name: `${treeName} Keystone`, icon: '💎', isKeystone: true, desc: 'Transforms your primary skill into an enhanced version' });
  while (nodes.length < 25) nodes.push({ name: 'Empty', icon: '·', desc: 'Locked' });
  return nodes.slice(0, 25);
}

function nodeCell(n: TreeNode, color: string): string {
  const cls = `cr-st-node${n.isStart ? ' start' : ''}${n.isNotable ? ' notable' : ''}${n.isKeystone ? ' keystone' : ''}`;
  const style = (n.isNotable || n.isKeystone) ? ` style="border-color:${escapeHtml(color)}"` : '';
  return `<div class="${cls}"${style} title="${escapeHtml(n.name)}: ${escapeHtml(n.desc)}">${n.icon}${n.isKeystone ? '<span class="cr-st-kw">KEYSTONE</span>' : ''}</div>`;
}

function classBlock(cls: RealmClassSkin): string {
  const trees = cls.skillTrees ?? [];
  const treeTabs = trees.map((t, i) =>
    `<button type="button" class="cr-st-tab${i === 0 ? ' active' : ''}" data-cls="${escapeHtml(cls.id)}" data-tree="${i}">${escapeHtml(t)}</button>`,
  ).join('');
  const firstGrid = trees.length
    ? generateTreeNodes(cls, trees[0]).map((n) => nodeCell(n, cls.color)).join('')
    : '';
  return `<div class="cr-st-class" data-cls-block="${escapeHtml(cls.id)}">
    <div class="cr-st-head">
      <div class="cr-st-icon" style="border-color:${escapeHtml(cls.color)};color:${escapeHtml(cls.color)}">${cls.icon}</div>
      <div><div class="cr-st-name" style="color:${escapeHtml(cls.color)}">${escapeHtml(cls.name)} — Skill Tree</div>
      <div class="cr-st-role">${escapeHtml(cls.role)}</div></div>
    </div>
    <div class="cr-st-tabs">${treeTabs}</div>
    <div class="cr-st-grid" data-grid-for="${escapeHtml(cls.id)}">${firstGrid}</div>
  </div>`;
}

const STYLE = `
  #${BTN_ID} { display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border:1px solid var(--cr-border,#5f4b1a); border-radius:5px; background:rgba(123,223,242,0.06); color:#7bdff2; font:700 12px/1 var(--cr-font-ui,system-ui,sans-serif); letter-spacing:.5px; cursor:pointer; }
  #${BTN_ID}:hover { border-color:#7bdff2; background:rgba(123,223,242,0.12); }
  #${MODAL_ID} { position:fixed; inset:0; z-index:200; display:none; align-items:center; justify-content:center; padding:16px; background:rgba(4,4,8,0.82); backdrop-filter:blur(6px); }
  #${MODAL_ID}.open { display:flex; }
  #${MODAL_ID} .cr-st-shell { width:min(860px,100%); max-height:88vh; overflow-y:auto; background:linear-gradient(180deg,rgba(20,16,10,0.98),rgba(8,8,12,0.98)); border:1px solid #7bdff2; border-radius:10px; padding:18px 20px; color:#f4ead0; font-family:var(--cr-font-ui,system-ui,sans-serif); }
  #${MODAL_ID} .cr-st-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
  #${MODAL_ID} h2 { margin:0; color:#7bdff2; font-size:20px; }
  #${MODAL_ID} .cr-st-close { background:none; border:1px solid #5f4b1a; color:#f4ead0; border-radius:5px; width:30px; height:30px; cursor:pointer; }
  .cr-st-class { margin-top:16px; border-top:1px solid rgba(123,223,242,0.18); padding-top:12px; }
  .cr-st-head { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
  .cr-st-icon { width:50px; height:50px; border-radius:10px; border:2px solid; display:flex; align-items:center; justify-content:center; font-size:26px; background:rgba(0,0,0,0.3); }
  .cr-st-name { font-weight:900; font-size:17px; }
  .cr-st-role { font-size:12px; color:#b8aa82; }
  .cr-st-tabs { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
  .cr-st-tab { padding:7px 14px; border-radius:7px; border:1px solid var(--cr-border,#5f4b1a); background:rgba(0,0,0,0.25); color:#b8aa82; font-weight:700; font-size:13px; cursor:pointer; }
  .cr-st-tab.active { border-color:#7bdff2; color:#7bdff2; background:rgba(123,223,242,0.12); }
  .cr-st-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:14px 10px; max-width:420px; margin:0 auto; }
  .cr-st-node { width:46px; height:46px; border-radius:50%; border:2px solid #463a1c; background:rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; font-size:15px; margin:0 auto; position:relative; color:#d7c9a8; }
  .cr-st-node.start { border-color:#ffd100; }
  .cr-st-node.notable { font-size:18px; }
  .cr-st-node.keystone { font-size:22px; }
  .cr-st-kw { position:absolute; bottom:-15px; left:50%; transform:translateX(-50%); font-size:7px; font-weight:700; color:#ffd700; white-space:nowrap; letter-spacing:.5px; }
  @media (max-width:520px){ .cr-st-grid{ gap:10px 6px; } .cr-st-node{ width:40px; height:40px; } }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = STYLE;
  document.head.appendChild(s);
}

function rebuildGrid(clsId: string, treeIdx: number): void {
  const realm = getActiveRealm();
  const cls = realm.classes.find((c) => c.id === clsId);
  if (!cls) return;
  const trees = cls.skillTrees ?? [];
  const grid = document.querySelector(`#${MODAL_ID} [data-grid-for="${CSS.escape(clsId)}"]`);
  if (!grid || !trees[treeIdx]) return;
  grid.innerHTML = generateTreeNodes(cls, trees[treeIdx]).map((n) => nodeCell(n, cls.color)).join('');
}

function openModal(): void {
  const realm = getActiveRealm();
  if (!realm.classes || realm.classes.length === 0) return;
  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement('div'); modal.id = MODAL_ID;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  }
  modal.innerHTML = `<div class="cr-st-shell" role="dialog" aria-modal="true" aria-label="Skill Trees">
    <div class="cr-st-top"><h2>${escapeHtml(realm.name)} — Skill Trees</h2><button type="button" class="cr-st-close" aria-label="Close">✕</button></div>
    ${realm.classes.map(classBlock).join('')}
  </div>`;
  modal.querySelector('.cr-st-close')?.addEventListener('click', closeModal);
  modal.querySelectorAll<HTMLButtonElement>('.cr-st-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const clsId = tab.dataset.cls!; const idx = Number(tab.dataset.tree);
      modal!.querySelectorAll(`.cr-st-tab[data-cls="${CSS.escape(clsId)}"]`).forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      rebuildGrid(clsId, idx);
    });
  });
  modal.classList.add('open');
  document.addEventListener('keydown', onEsc);
}

function closeModal(): void {
  document.getElementById(MODAL_ID)?.classList.remove('open');
  document.removeEventListener('keydown', onEsc);
}
function onEsc(e: KeyboardEvent): void { if (e.key === 'Escape') closeModal(); }

/** Mount a Skill Tree launcher into a page-provided #cr-bestiary-host, or the
 *  shared fixed in-game toolbar (see tools_host.ts — a bare document.body
 *  append lands under the fixed #game-canvas and is never visible in the
 *  world). Shown when the active realm defines classes. */
export function mountSkillTree(): void {
  if (typeof document === 'undefined') return;
  try {
    const realm = getActiveRealm();
    if (!realm.classes || realm.classes.length === 0) return;
  } catch { return; }
  if (document.getElementById(BTN_ID)) return;
  ensureStyle();
  const host = document.getElementById('cr-bestiary-host') ?? ensureToolsHost();
  const btn = document.createElement('button');
  btn.id = BTN_ID; btn.type = 'button';
  btn.innerHTML = '<span aria-hidden="true">🌳</span> Skill Trees';
  btn.addEventListener('click', openModal);
  host.appendChild(btn);
}
