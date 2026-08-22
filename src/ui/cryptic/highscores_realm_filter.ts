// High Scores realm filter. Mounts a realm-picker chip row into the
// #highscores-view section (the news_realm_filter.ts chip pattern) and filters
// the global leaderboard rows client-side by their data-realm tag. The rows are
// realm-tagged at render time (src/ui/highscore_board.ts and the landing
// shell's renderer both stamp data-realm via normalizeRealmTag), so the filter
// is a pure show/hide over rows the server already returned: no extra fetch,
// and no phantom server scope. Untagged rows show in every view.

import { REALM_LIST } from '../../sim/realms';
import { esc } from '../esc';
import { t } from '../i18n';

const PICKER_ID = 'cr-hs-realm-picker';
const BOARD_ID = 'hs-leaderboard';

/** Normalized realm tag: lowercase alphanumerics only, so the server's realm
 *  display string ("Arcane Nexus"), a realm id ('arcane'), and a subdomain
 *  host label ('arcadevoid') all compare on one axis. */
export function normalizeRealmTag(realm: string | null | undefined): string {
  return (realm ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** True when a row tagged `rowTag` (already normalized) belongs on the `chip`
 *  view ('all' or a REALM_LIST id). A row matches its realm by id or display
 *  name; an untagged row shows everywhere. */
export function rowMatchesChip(rowTag: string, chip: string): boolean {
  if (chip === 'all' || rowTag === '') return true;
  const realm = REALM_LIST.find((r) => r.id === chip);
  if (!realm) return true;
  return rowTag === normalizeRealmTag(realm.id) || rowTag === normalizeRealmTag(realm.name);
}

// The active chip lives per page load: the board always opens on 'all' (the
// cross-realm board is the headline view), and a pick only lasts the session.
let activeChip = 'all';

function applyFilter(board: HTMLElement): void {
  board.querySelectorAll<HTMLElement>('.hs-row:not(.hs-head)').forEach((row) => {
    const tag = normalizeRealmTag(row.getAttribute('data-realm'));
    row.style.display = rowMatchesChip(tag, activeChip) ? '' : 'none';
  });
}

function buildPicker(): string {
  const chip = (id: string, label: string): string =>
    `<button type="button" class="cr-news-chip${activeChip === id ? ' active' : ''}" data-realm="${esc(id)}">${esc(label)}</button>`;
  return `<div id="${PICKER_ID}" class="cr-news-picker" role="group" aria-label="${esc(t('game.leaderboard.realmCol'))}">
    <span class="cr-news-picker-label">${esc(t('game.leaderboard.realmCol'))}:</span>
    ${chip('all', t('hudChrome.leaderboard.filterAll'))}
    ${REALM_LIST.map((r) => chip(r.id, r.name)).join('')}
  </div>`;
}

function mountInto(view: HTMLElement, board: HTMLElement): void {
  if (view.querySelector(`#${PICKER_ID}`)) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = buildPicker();
  const picker = wrap.firstElementChild as HTMLElement;
  board.parentElement?.insertBefore(picker, board);
  applyFilter(board);
  picker.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('.cr-news-chip');
    if (!btn) return;
    activeChip = btn.dataset.realm ?? 'all';
    picker.querySelectorAll('.cr-news-chip').forEach((c) => {
      c.classList.toggle('active', (c as HTMLElement).dataset.realm === activeChip);
    });
    applyFilter(board);
  });
  // The board repaints its whole subtree on every load; re-apply the active
  // filter to the fresh rows.
  new MutationObserver(() => applyFilter(board)).observe(board, { childList: true });
}

export function mountHighscoresRealmFilter(): void {
  if (typeof document === 'undefined') return;
  const arm = (): void => {
    const view = document.getElementById('highscores-view');
    const board = document.getElementById(BOARD_ID);
    if (view && board) mountInto(view, board);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm);
  } else {
    arm();
  }
}
