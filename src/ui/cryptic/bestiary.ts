// Monster Chronicle — renders the active realm's bestiary (acts → zones,
// monsters, bosses) in a modal. Ported concept from the original Cryptic
// Realm CRMonsterChronicle. Display-only: reads RealmContent.bestiary, never
// touches sim state. Self-mounts a launcher button when the active realm has
// a bestiary; no-op otherwise.

import './realm_env';
import { getActiveRealm } from '../../sim/realms';
import type { RealmAct, RealmBoss, RealmMonster } from '../../sim/realms/types';
import { realmSystemTitle } from '../../sim/realms/system_text';
import { mountToolLauncher, renderToolWindow, toggleToolWindow } from './tools_host';

const WINDOW_ID = 'cr-bestiary-window';
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
  #${WINDOW_ID} { border-color: var(--cr-gold, #ffd100); }

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

/** Paint the window body from the active realm's bestiary acts. */
function paintWindow(): void {
  const realm = getActiveRealm();
  const bestiary = realm.bestiary;
  if (!bestiary || bestiary.length === 0) return;
  const body = renderToolWindow(
    WINDOW_ID,
    `${realm.name} - ${realmSystemTitle('bestiary', 'Monster Chronicle')}`,
  );
  body.innerHTML = bestiary.map(actSection).join('');
}

function realmHasBestiary(): boolean {
  try {
    const realm = getActiveRealm();
    return !!realm.bestiary && realm.bestiary.length > 0;
  } catch {
    return false;
  }
}

/** Open or close the Monster Chronicle (rail button + keybind share this). */
export function toggleBestiary(): void {
  if (typeof document === 'undefined' || !realmHasBestiary()) return;
  ensureStyle();
  toggleToolWindow(WINDOW_ID, paintWindow);
}

/**
 * Mount the Monster Chronicle launcher onto the game's micro-menu rail. Only
 * when the active realm ships a bestiary.
 */
export function mountBestiary(): void {
  if (typeof document === 'undefined' || !realmHasBestiary()) return;
  ensureStyle();
  mountToolLauncher({
    id: BTN_ID,
    icon: 'skull',
    glyph: '\u{1F4D6}',
    label: realmSystemTitle('bestiary', 'Monster Chronicle'),
    onOpen: toggleBestiary,
  });
}
