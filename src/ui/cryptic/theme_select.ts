// Theme / realm picker — vanilla-TS port of cryptic/CRThemeSelect.jsx.
// Renders a compact button that opens a popover listing every realm pack.
// Clicking a realm persists the choice and applies the CSS data-theme to
// `document.documentElement` immediately (no reload required).
//
// Wire this up by importing once from src/main.ts and calling mountThemeSelect()
// against an element id (the index.html overlay places <div id="theme-picker">).

import './theme.css';
import {
  REALM_LIST,
  resolveActiveRealmId,
  persistActiveRealm,
  isRealmId,
  type RealmContent,
  type RealmId,
} from '../../sim/realms';

export interface ThemeSelectOptions {
  /** Element id of the host container. Default 'theme-picker'. */
  hostId?: string;
  /** Called after the user picks a realm. Receives the new realm. */
  onPick?: (realm: RealmContent) => void;
}

const POPOVER_CLASS = 'cr-theme-popover';
const BUTTON_CLASS = 'cr-theme-trigger';
const OPTION_CLASS = 'cr-theme-option';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

function applyThemeToDocument(id: RealmId): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', id);
  }
}

function renderOptions(activeId: RealmId): string {
  return REALM_LIST.map((r) => {
    const isActive = r.id === activeId;
    const swatch = `background: linear-gradient(135deg, ${escapeHtml(r.previewColors.primary)}, ${escapeHtml(r.previewColors.secondary)});`;
    return `<button type="button" class="${OPTION_CLASS}${isActive ? ' active' : ''}" data-realm="${escapeHtml(r.id)}" role="menuitemradio" aria-checked="${isActive}">
      <span class="cr-theme-option-swatch" style="${swatch}"></span>
      <span class="cr-theme-option-text">
        <span class="cr-theme-option-name">${escapeHtml(r.name)}</span>
        <span class="cr-theme-option-tagline">${escapeHtml(r.tagline)}</span>
      </span>
    </button>`;
  }).join('');
}

function renderTrigger(active: RealmContent): string {
  const swatch = `background: ${escapeHtml(active.accentHex)};`;
  return `<button type="button" class="${BUTTON_CLASS}" aria-haspopup="menu" aria-expanded="false" title="Switch realm">
    <span class="cr-theme-trigger-swatch" style="${swatch}"></span>
    <span class="cr-theme-trigger-kicker">Realm</span>
    <span class="cr-theme-trigger-label">${escapeHtml(active.name)}</span>
    <span class="cr-theme-trigger-caret" aria-hidden="true">▾</span>
  </button>`;
}

export function mountThemeSelect(opts: ThemeSelectOptions = {}): void {
  if (typeof document === 'undefined') return;
  const hostId = opts.hostId ?? 'theme-picker';
  const host = document.getElementById(hostId);
  if (!host) return;

  let activeId: RealmId = resolveActiveRealmId();
  applyThemeToDocument(activeId);

  const render = () => {
    const active = REALM_LIST.find((r) => r.id === activeId) ?? REALM_LIST[0];
    host.classList.add('cr-theme-picker');
    host.innerHTML = `${renderTrigger(active)}
      <div class="${POPOVER_CLASS}" role="menu" hidden>
        <div class="cr-theme-popover-title">Choose a realm</div>
        ${renderOptions(activeId)}
      </div>`;
  };

  render();

  const onClick = (ev: Event) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const optionBtn = target.closest(`.${OPTION_CLASS}`) as HTMLElement | null;
    if (optionBtn) {
      const id = optionBtn.dataset.realm;
      if (isRealmId(id)) {
        activeId = id;
        persistActiveRealm(id);
        applyThemeToDocument(id);
        render();
        // Notify branding + asset-manifest layers so they re-apply.
        window.dispatchEvent(new CustomEvent('cr-realm-change'));
        const realm = REALM_LIST.find((r) => r.id === id);
        if (realm && opts.onPick) opts.onPick(realm);
      }
      closePopover();
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }

    const trigger = target.closest(`.${BUTTON_CLASS}`) as HTMLElement | null;
    if (trigger) {
      togglePopover();
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
  };

  const togglePopover = () => {
    const pop = host.querySelector(`.${POPOVER_CLASS}`) as HTMLElement | null;
    const trig = host.querySelector(`.${BUTTON_CLASS}`) as HTMLElement | null;
    if (!pop || !trig) return;
    const willOpen = pop.hasAttribute('hidden');
    if (willOpen) pop.removeAttribute('hidden'); else pop.setAttribute('hidden', '');
    trig.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  };

  const closePopover = () => {
    const pop = host.querySelector(`.${POPOVER_CLASS}`) as HTMLElement | null;
    const trig = host.querySelector(`.${BUTTON_CLASS}`) as HTMLElement | null;
    pop?.setAttribute('hidden', '');
    trig?.setAttribute('aria-expanded', 'false');
  };

  host.addEventListener('click', onClick);
  document.addEventListener('click', (ev) => {
    if (!host.contains(ev.target as Node)) closePopover();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closePopover();
  });
}
