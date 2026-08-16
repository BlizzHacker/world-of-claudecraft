// Monster Chronicle — renders the active realm's bestiary (acts → zones,
// monsters, bosses) in a modal. Ported concept from the original Cryptic
// Realm CRMonsterChronicle. Display-only: reads RealmContent.bestiary, never
// touches sim state. Self-mounts a launcher button when the active realm has
// a bestiary; no-op otherwise.

import './realm_env';
import { getActiveRealm } from '../../sim/realms';
import type { RealmAct, RealmBoss, RealmMonster } from '../../sim/realms/types';
import { ensureToolsHost } from './tools_host';

const MODAL_ID = 'cr-bestiary-modal';
const BTN_ID = 'cr-bestiary-btn';
const STYLE_ID = 'cr-bestiary-style';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

function monsterRow(m: RealmMonster): string {
  return `<tr>
    <td class="cr-best-name">${escapeHtml(m.name)}</td>
    <td>${m.level}</td>
    <td><span class="cr-best-type">${escapeHtml(m.type)}</span></td>
    <td>${m.hp}</td>
    <td>${m.dmg}</td>
    <td>${m.xp}</td>
  </tr>`;
}

function bossCard(b: RealmBoss): string {
  const phases = b.phases
    .map((p) => `<li><strong>${p.threshold}% HP:</strong> ${escapeHtml(p.ability)}</li>`)
    .join('');
  return `<div class="cr-best-boss">
    <div class="cr-best-boss-head">
      <span class="cr-best-boss-name">${escapeHtml(b.name)}</span>
      <span class="cr-best-boss-meta">Lv ${b.level} · ${escapeHtml(b.type)} · ${b.hp} HP</span>
    </div>
    <p class="cr-best-boss-lore">${escapeHtml(b.lore)}</p>
    <div class="cr-best-boss-abilities">${b.abilities.map((a) => `<span>${escapeHtml(a)}</span>`).join('')}</div>
    <ul class="cr-best-boss-phases">${phases}</ul>
    <div class="cr-best-boss-loot"><strong>Loot:</strong> ${b.loot.map(escapeHtml).join(' · ')}</div>
  </div>`;
}

function actSection(act: RealmAct): string {
  return `<section class="cr-best-act">
    <h3 class="cr-best-act-title">${escapeHtml(act.name)} <span>Lv ${act.level[0]}–${act.level[1]}</span></h3>
    <p class="cr-best-act-desc">${escapeHtml(act.desc)}</p>
    <div class="cr-best-zones">${act.zones.map((z) => `<span>${escapeHtml(z)}</span>`).join('')}</div>
    <table class="cr-best-table">
      <thead><tr><th>Monster</th><th>Lv</th><th>Type</th><th>HP</th><th>Dmg</th><th>XP</th></tr></thead>
      <tbody>${act.monsters.map(monsterRow).join('')}</tbody>
    </table>
    <div class="cr-best-bosses">${act.bosses.map(bossCard).join('')}</div>
  </section>`;
}

const STYLE = `
  #${BTN_ID} {
    display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px;
    border: 1px solid var(--cr-border, #5f4b1a); border-radius: 5px;
    background: rgba(255,209,0,0.06); color: var(--cr-gold, #ffd100);
    font: 700 12px/1 var(--cr-font-ui, system-ui, sans-serif);
    letter-spacing: .5px; cursor: pointer;
  }
  #${BTN_ID}:hover { border-color: var(--cr-gold, #ffd100); background: rgba(255,209,0,0.12); }
  #${MODAL_ID} {
    position: fixed; inset: 0; z-index: 200; display: none;
    align-items: center; justify-content: center; padding: 16px;
    background: rgba(4,4,8,0.82); backdrop-filter: blur(6px);
  }
  #${MODAL_ID}.open { display: flex; }
  #${MODAL_ID} .cr-best-shell {
    width: min(820px, 100%); max-height: 88vh; overflow-y: auto;
    background: linear-gradient(180deg, rgba(20,16,10,0.98), rgba(8,8,12,0.98));
    border: 1px solid var(--cr-gold, #ffd100); border-radius: 10px; padding: 18px 20px;
    color: #f4ead0; font-family: var(--cr-font-ui, system-ui, sans-serif);
  }
  #${MODAL_ID} .cr-best-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  #${MODAL_ID} h2 { margin: 0; color: var(--cr-gold, #ffd100); font-size: 20px; }
  #${MODAL_ID} .cr-best-close { background: none; border: 1px solid #5f4b1a; color: #f4ead0; border-radius: 5px; width: 30px; height: 30px; cursor: pointer; font-size: 16px; }
  .cr-best-act { margin-top: 18px; border-top: 1px solid rgba(255,209,0,0.18); padding-top: 12px; }
  .cr-best-act-title { color: #ffd100; font-size: 16px; margin: 0 0 2px; }
  .cr-best-act-title span { color: #b8aa82; font-size: 12px; font-weight: 400; }
  .cr-best-act-desc { color: #c9bf9f; font-size: 13px; margin: 0 0 8px; line-height: 1.45; }
  .cr-best-zones { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .cr-best-zones span { font-size: 11px; color: #7bdff2; border: 1px solid #2a3f44; border-radius: 4px; padding: 2px 7px; }
  .cr-best-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 12px; }
  .cr-best-table th { text-align: left; color: #b8aa82; font-weight: 600; border-bottom: 1px solid #463a1c; padding: 4px 6px; }
  .cr-best-table td { padding: 4px 6px; border-bottom: 1px solid rgba(70,58,28,0.4); }
  .cr-best-name { color: #fff6db; font-weight: 600; }
  .cr-best-type { color: #abd473; font-size: 11px; }
  .cr-best-boss { border: 1px solid #6b3a3a; border-radius: 7px; padding: 10px 12px; margin-bottom: 10px; background: rgba(40,12,12,0.3); }
  .cr-best-boss-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .cr-best-boss-name { color: #ff7b7b; font-weight: 800; font-size: 14px; }
  .cr-best-boss-meta { color: #b8aa82; font-size: 11px; }
  .cr-best-boss-lore { color: #d7c9a8; font-size: 12px; font-style: italic; margin: 6px 0; line-height: 1.45; }
  .cr-best-boss-abilities { display: flex; flex-wrap: wrap; gap: 5px; margin: 6px 0; }
  .cr-best-boss-abilities span { font-size: 11px; color: #ffd166; border: 1px solid #5f4b1a; border-radius: 4px; padding: 2px 6px; }
  .cr-best-boss-phases { margin: 6px 0; padding-left: 18px; color: #c9bf9f; font-size: 12px; }
  .cr-best-boss-phases strong { color: #ff9b9b; }
  .cr-best-boss-loot { font-size: 12px; color: #abd473; margin-top: 4px; }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID; s.textContent = STYLE;
  document.head.appendChild(s);
}

function openModal(): void {
  const realm = getActiveRealm();
  const bestiary = realm.bestiary;
  if (!bestiary || bestiary.length === 0) return;
  let modal = document.getElementById(MODAL_ID);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  }
  modal.innerHTML = `
    <div class="cr-best-shell" role="dialog" aria-modal="true" aria-label="Monster Chronicle">
      <div class="cr-best-top">
        <h2>${escapeHtml(realm.name)} — Monster Chronicle</h2>
        <button type="button" class="cr-best-close" aria-label="Close">✕</button>
      </div>
      ${bestiary.map(actSection).join('')}
    </div>`;
  modal.querySelector('.cr-best-close')?.addEventListener('click', closeModal);
  modal.classList.add('open');
  document.addEventListener('keydown', onEsc);
}

function closeModal(): void {
  document.getElementById(MODAL_ID)?.classList.remove('open');
  document.removeEventListener('keydown', onEsc);
}

function onEsc(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeModal();
}

/** Mount a Bestiary launcher button into a page-provided #cr-bestiary-host,
 *  or the shared fixed in-game toolbar (see tools_host.ts — a bare
 *  document.body append lands under the fixed #game-canvas and is never
 *  visible in the world). Only when the active realm has a bestiary. */
export function mountBestiary(): void {
  if (typeof document === 'undefined') return;
  try {
    const realm = getActiveRealm();
    if (!realm.bestiary || realm.bestiary.length === 0) return;
  } catch { return; }
  if (document.getElementById(BTN_ID)) return;
  ensureStyle();
  const host = document.getElementById('cr-bestiary-host') ?? ensureToolsHost();
  const btn = document.createElement('button');
  btn.id = BTN_ID;
  btn.type = 'button';
  btn.innerHTML = '<span aria-hidden="true">📖</span> Monster Chronicle';
  btn.addEventListener('click', openModal);
  host.appendChild(btn);
}
