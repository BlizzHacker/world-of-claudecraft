// News & Updates realm filter. Injects a realm-picker chip into the existing
// upstream news view (#news-view section) and filters .news-item cards by
// their data-realm attribute. Cards without data-realm show in all realms.

import './realm_env';
import { isRealmId, persistActiveRealm, REALM_LIST } from '../../sim/realms';

const PICKER_ID = 'cr-news-realm-picker';
const STORE_KEY = 'cr_news_realm';

// Default 'all': News is a cross-realm feed, so a first visit shows every
// realm's items; a persisted chip pick still wins.
function activeNewsRealm(): string {
  try {
    return localStorage.getItem(STORE_KEY) || 'all';
  } catch {
    return 'all';
  }
}

function persistNewsRealm(id: string): void {
  try {
    localStorage.setItem(STORE_KEY, id);
  } catch {
    /* noop */
  }
}

function buildPicker(active: string): string {
  return `<div id="${PICKER_ID}" class="cr-news-picker" role="tablist">
    <span class="cr-news-picker-label">Realm:</span>
    <button type="button" class="cr-news-chip${active === 'all' ? ' active' : ''}" data-realm="all">All</button>
    ${REALM_LIST.map(
      (r) => `
      <button type="button" class="cr-news-chip${active === r.id ? ' active' : ''}" data-realm="${r.id}">${r.name}</button>
    `,
    ).join('')}
  </div>`;
}

function applyFilter(activeId: string): void {
  document.querySelectorAll<HTMLElement>('.news-item, [data-news-item]').forEach((card) => {
    const tag = card.getAttribute('data-realm') || 'all';
    const show = activeId === 'all' || tag === 'all' || tag === activeId;
    card.style.display = show ? '' : 'none';
  });
}

function mountInto(host: HTMLElement): void {
  if (host.querySelector(`#${PICKER_ID}`)) return;
  const active = activeNewsRealm();
  const wrap = document.createElement('div');
  wrap.innerHTML = buildPicker(active);
  host.insertBefore(wrap.firstElementChild as Node, host.firstChild);
  applyFilter(active);
  host.querySelector(`#${PICKER_ID}`)?.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('.cr-news-chip');
    if (!btn) return;
    const next = btn.dataset.realm ?? 'all';
    if (next !== 'all' && !isRealmId(next)) return;
    persistNewsRealm(next);
    if (next !== 'all') persistActiveRealm(next);
    host.querySelectorAll('.cr-news-chip').forEach((c) => {
      c.classList.toggle('active', (c as HTMLElement).dataset.realm === next);
    });
    applyFilter(next);
  });
}

export function mountNewsRealmFilter(): void {
  if (typeof document === 'undefined') return;
  const arm = () => {
    const target =
      document.getElementById('news-view') ||
      document.querySelector('[data-view="news"]') ||
      document.querySelector('.news-section');
    if (target) mountInto(target as HTMLElement);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm);
  } else {
    arm();
  }
  // News view may render lazily; watch for it.
  const obs = new MutationObserver(() => arm());
  obs.observe(document.body, { childList: true, subtree: true });
}
