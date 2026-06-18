// In-game options-menu CR section. Injects a top-level "Customization" entry
// into the upstream options menu and opens a CR-styled modal with HUD, camera,
// realm skin, and wallet/token controls.

import { resolveHudSkin, setHudSkin, type HudSkin } from './globes';
import { resolveFpsMode, persistFpsMode } from './fps_mode';
import {
  REALM_LIST,
  getActiveRealm,
  persistActiveRealm,
  resolveActiveRealmId,
  type RealmContent,
  type RealmId,
} from '../../sim/realms';
import { socialsForRealm } from '../../sim/realms/social_links';
import { handleMiniGameClick, miniGameSectionHtml } from './minigames';

const MODAL_ID = 'cr-customization-modal';
const BUTTON_CLASS = 'cr-customization-launcher';
const AUTO_FPS_KEY = 'cr_auto_fps_on_zoom';
const WOC_TOKEN_MINT = '3WjLscH2JsXLEFJZRA9z8ti8yRGxWGKbqymPd7UicRth';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

function shortAddress(s: string): string {
  return s.length > 12 ? `${s.slice(0, 4)}...${s.slice(-4)}` : s;
}

function resolveAutoFps(): boolean {
  try { return window.localStorage?.getItem(AUTO_FPS_KEY) === 'on'; } catch { return false; }
}

function persistAutoFps(on: boolean): void {
  try { window.localStorage?.setItem(AUTO_FPS_KEY, on ? 'on' : 'off'); } catch { /* noop */ }
}

function applyThemeToDocument(id: RealmId): void {
  document.documentElement.setAttribute('data-theme', id);
}

function realmSkinOptions(activeId: RealmId): string {
  return REALM_LIST.map((realm) => {
    const active = realm.id === activeId;
    return `<button type="button" class="cr-options-pill ${active ? 'active' : ''}" data-cr-realm="${escapeHtml(realm.id)}">
      ${escapeHtml(realm.name)}
    </button>`;
  }).join('');
}

function realmSummary(realm: RealmContent): string {
  const classes = realm.classes.length > 0
    ? `${realm.classes.length} realm class skins`
    : (realm.id === 'claudecraft' ? 'Upstream class set' : 'Shared class set');
  const scope = realm.crossRealm ? 'Cross-realm hub' : 'Home realm';
  return `${scope} - ${classes}`;
}

function tokenRows(realm: RealmContent): string {
  const socials = socialsForRealm(realm.id);
  const token = socials.tokenMintSolana ?? WOC_TOKEN_MINT;
  const tokenLabel = socials.tokenMintSolana ? '$CR token' : '$WOC token';
  const tipRow = socials.tipWalletSolana
    ? `<div class="cr-token-row">
        <span class="cr-options-row-label">Tip wallet</span>
        <code class="cr-code-pill" title="${escapeHtml(socials.tipWalletSolana)}">${escapeHtml(shortAddress(socials.tipWalletSolana))}</code>
        <button type="button" class="cr-options-pill" data-cr-copy="${escapeHtml(socials.tipWalletSolana)}">Copy</button>
      </div>`
    : `<div class="cr-token-row">
        <span class="cr-options-row-label">Support</span>
        <a class="cr-code-link" href="https://github.com/sponsors/levy-street" target="_blank" rel="noopener noreferrer">GitHub Sponsors</a>
      </div>`;

  return `<div class="cr-token-row">
      <span class="cr-options-row-label">${escapeHtml(tokenLabel)}</span>
      <code class="cr-code-pill" title="${escapeHtml(token)}">${escapeHtml(shortAddress(token))}</code>
      <button type="button" class="cr-options-pill" data-cr-copy="${escapeHtml(token)}">Copy</button>
    </div>
    ${tipRow}`;
}

function buildModalHtml(skin: HudSkin, fps: 'on' | 'off' | 'diablo'): string {
  const autoFps = resolveAutoFps();
  const activeId = resolveActiveRealmId();
  const realm = getActiveRealm();
  return `
    <div class="cr-modal-overlay" data-cr-overlay>
      <div class="cr-modal-panel" role="dialog" aria-modal="true" aria-labelledby="cr-cust-title">
        <header class="cr-modal-header">
          <h2 id="cr-cust-title">Customization</h2>
          <button type="button" class="cr-modal-close" data-cr-close aria-label="Close">x</button>
        </header>

        <div class="cr-modal-section">
          <div class="cr-modal-section-title">View</div>
          <div class="cr-options-row">
            <span class="cr-options-row-label">HUD style</span>
            <div class="cr-options-row-control" role="group" aria-label="HUD style">
              <button type="button" class="cr-options-pill ${skin === 'classic' ? 'active' : ''}" data-cr-skin="classic">Bars</button>
              <button type="button" class="cr-options-pill ${skin === 'globes' ? 'active' : ''}" data-cr-skin="globes">Globes</button>
            </div>
          </div>
          <div class="cr-options-row">
            <span class="cr-options-row-label">Camera (V)</span>
            <div class="cr-options-row-control" role="group" aria-label="Camera mode">
              <button type="button" class="cr-options-pill ${fps === 'off' ? 'active' : ''}" data-cr-fps="off">3rd person</button>
              <button type="button" class="cr-options-pill ${fps === 'on' ? 'active' : ''}" data-cr-fps="on">First person</button>
              <button type="button" class="cr-options-pill ${fps === 'diablo' ? 'active' : ''}" data-cr-fps="diablo">Diablo angle</button>
            </div>
          </div>
          <div class="cr-options-row">
            <span class="cr-options-row-label">Auto-FPS on full zoom</span>
            <div class="cr-options-row-control" role="group" aria-label="Auto first-person">
              <button type="button" class="cr-options-pill ${!autoFps ? 'active' : ''}" data-cr-autofps="off">Off</button>
              <button type="button" class="cr-options-pill ${autoFps ? 'active' : ''}" data-cr-autofps="on">On</button>
            </div>
          </div>
        </div>

        <div class="cr-modal-section">
          <div class="cr-modal-section-title">Realm</div>
          <div class="cr-options-row cr-options-row-stack">
            <span class="cr-options-row-label">Realm skin</span>
            <div class="cr-realm-pill-grid" role="group" aria-label="Realm skin">
              ${realmSkinOptions(activeId)}
            </div>
          </div>
          <div class="cr-realm-summary">
            <strong>${escapeHtml(realm.name)}</strong>
            <span>${escapeHtml(realmSummary(realm))}</span>
          </div>
        </div>

        <div class="cr-modal-section">
          <div class="cr-modal-section-title">Wallet</div>
          ${tokenRows(realm)}
        </div>

        ${miniGameSectionHtml()}

        <p class="cr-modal-footer-hint">Press <kbd>V</kbd> to toggle first-person view. Diablo angle uses a high ARPG camera.</p>
      </div>
    </div>
  `;
}

function ensureModalHost(): HTMLElement {
  let host = document.getElementById(MODAL_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = MODAL_ID;
    host.setAttribute('hidden', '');
    document.body.appendChild(host);
  }
  return host;
}

function closeCustomization(): void {
  const host = document.getElementById(MODAL_ID);
  if (host) host.setAttribute('hidden', '');
}

function openCustomization(): void {
  const host = ensureModalHost();
  const refresh = () => {
    host.innerHTML = buildModalHtml(resolveHudSkin(), resolveFpsMode());
  };

  refresh();
  host.removeAttribute('hidden');
  host.onclick = (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    if (target.hasAttribute('data-cr-close') || target.hasAttribute('data-cr-overlay')) {
      closeCustomization();
      return;
    }

    const skinBtn = target.closest('[data-cr-skin]') as HTMLElement | null;
    if (skinBtn) {
      setHudSkin(skinBtn.dataset.crSkin as HudSkin);
      refresh();
      return;
    }

    const realmBtn = target.closest('[data-cr-realm]') as HTMLElement | null;
    if (realmBtn) {
      const next = realmBtn.dataset.crRealm as RealmId | undefined;
      if (next) {
        persistActiveRealm(next);
        applyThemeToDocument(next);
        window.dispatchEvent(new CustomEvent('cr-realm-change'));
        refresh();
      }
      return;
    }

    const fpsBtn = target.closest('[data-cr-fps]') as HTMLElement | null;
    if (fpsBtn) {
      const next = fpsBtn.dataset.crFps as 'on' | 'off' | 'diablo';
      persistFpsMode(next);
      window.dispatchEvent(new CustomEvent('cr-fps-toggle'));
      refresh();
      return;
    }

    const autoBtn = target.closest('[data-cr-autofps]') as HTMLElement | null;
    if (autoBtn) {
      persistAutoFps(autoBtn.dataset.crAutofps === 'on');
      refresh();
      return;
    }

    if (handleMiniGameClick(target)) return;

    const copyBtn = target.closest('[data-cr-copy]') as HTMLElement | null;
    if (copyBtn?.dataset.crCopy) {
      void navigator.clipboard?.writeText(copyBtn.dataset.crCopy).catch(() => undefined);
      copyBtn.textContent = 'Copied';
    }
  };
}

function injectIfMissing(menuEl: HTMLElement): void {
  if (menuEl.querySelector(`.${BUTTON_CLASS}`)) return;
  const list = menuEl.querySelector('.opt-list');
  if (!list) return;

  const btn = document.createElement('button');
  btn.className = `btn opt-btn ${BUTTON_CLASS}`;
  btn.type = 'button';
  btn.textContent = 'Customization';
  btn.addEventListener('click', () => openCustomization());
  list.insertBefore(btn, list.firstChild);
}

export function mountIngameOptions(): void {
  if (typeof document === 'undefined') return;

  const arm = () => {
    const menuEl = document.getElementById('options-menu');
    if (!menuEl) return;
    const obs = new MutationObserver(() => injectIfMissing(menuEl));
    obs.observe(menuEl, { childList: true, subtree: true });
    injectIfMissing(menuEl);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm);
  } else {
    arm();
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const host = document.getElementById(MODAL_ID);
    if (host && !host.hasAttribute('hidden')) {
      closeCustomization();
      ev.preventDefault();
      ev.stopPropagation();
    }
  }, { capture: true });
}

export function isAutoFpsEnabled(): boolean {
  return resolveAutoFps();
}
