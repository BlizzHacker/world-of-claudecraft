// In-game options-menu CR section. Injects a top-level "Customization" entry
// into the upstream options menu and opens a CR-styled modal with HUD, camera,
// realm skin, and wallet/token controls.

import './realm_env';
import {
  getActiveRealm,
  persistActiveRealm,
  REALM_LIST,
  type RealmContent,
  type RealmId,
  resolveActiveRealmId,
} from '../../sim/realms';
import { socialsForRealm } from '../../sim/realms/social_links';
import {
  arcForgeEditorAllowedCached,
  canUseArcForgeEditor,
  openArcForgeEditor,
} from './arcforge_editor';
import { persistAutoFps, resolveAutoFps } from './auto_fps';
import { openBugReport } from './bug_report';
import { persistFpsMode, resolveFpsMode } from './fps_mode';
import { type HudSkin, resolveHudSkin, setHudSkin } from './globes';

const MODAL_ID = 'cr-customization-modal';
// ArcForge Studio is a separate app on the MoveWeight infra (not this realm),
// so the menu entry opens it in a new tab rather than an in-game modal.
const ARCFORGE_URL = 'https://arcforge.moveweight.com';
const WOC_TOKEN_MINT = '3WjLscH2JsXLEFJZRA9z8ti8yRGxWGKbqymPd7UicRth';
type OptionsTab = 'customization' | 'mods';
type RealmStage = 'live' | 'beta' | 'alpha' | 'dev';
let activeTab: OptionsTab = 'customization';

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

function shortAddress(s: string): string {
  return s.length > 12 ? `${s.slice(0, 4)}...${s.slice(-4)}` : s;
}

function applyThemeToDocument(id: RealmId): void {
  document.documentElement.setAttribute('data-theme', id);
}

function stageStorageKey(realmId: RealmId): string {
  return `cr_realm_stage_${realmId}`;
}

function realmStage(realmId: RealmId): RealmStage {
  const stored = localStorage.getItem(stageStorageKey(realmId));
  return stored === 'beta' || stored === 'alpha' || stored === 'dev' ? stored : 'live';
}

function persistRealmStage(realmId: RealmId, stage: RealmStage): void {
  localStorage.setItem(stageStorageKey(realmId), stage);
  window.dispatchEvent(new CustomEvent('cr-realm-stage-change', { detail: { realmId, stage } }));
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
  const classes =
    realm.classes.length > 0
      ? `${realm.classes.length} realm class skins`
      : realm.id === 'claudecraft'
        ? 'Upstream class set'
        : 'Shared class set';
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

function tabButton(tab: OptionsTab, label: string): string {
  return `<button type="button" class="cr-modal-tab ${activeTab === tab ? 'active' : ''}" data-cr-tab="${tab}" aria-pressed="${activeTab === tab ? 'true' : 'false'}">${escapeHtml(label)}</button>`;
}

function stageRows(realm: RealmContent): string {
  const activeStage = realmStage(realm.id);
  const stages: { id: RealmStage; label: string; rate: string; note: string }[] = [
    {
      id: 'live',
      label: 'Live',
      rate: '1x Platinum',
      note: 'Stable characters and public economy.',
    },
    {
      id: 'beta',
      label: 'Beta',
      rate: '1.5x Platinum',
      note: 'Monthly candidate realm for public promotion.',
    },
    {
      id: 'alpha',
      label: 'Alpha',
      rate: '2x Platinum',
      note: 'Two-week tester realm with reset-prone characters.',
    },
    {
      id: 'dev',
      label: 'Dev',
      rate: '3x Platinum',
      note: 'Fast iteration realm for admins, moderators, and builders.',
    },
  ];
  return `<div class="cr-stage-grid" role="group" aria-label="Realm stage">
    ${stages
      .map(
        (
          stage,
        ) => `<button type="button" class="cr-stage-card ${activeStage === stage.id ? 'active' : ''}" data-cr-stage="${stage.id}">
      <strong>${escapeHtml(stage.label)}</strong>
      <span>${escapeHtml(stage.rate)}</span>
      <small>${escapeHtml(stage.note)}</small>
    </button>`,
      )
      .join('')}
  </div>`;
}

function customizationTabHtml(
  skin: HudSkin,
  fps: 'on' | 'off' | 'diablo',
  realm: RealmContent,
  activeId: RealmId,
): string {
  const autoFps = resolveAutoFps();
  return `
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
  `;
}

function modsTabHtml(realm: RealmContent): string {
  return `
    <div class="cr-modal-section">
      <div class="cr-modal-section-title">Realm stage</div>
      <p class="cr-modal-blurb">Each realm keeps separate Live, Beta, Alpha, and Dev tracks. Tester tracks earn higher off-chain Platinum because characters may reset while work graduates forward.</p>
      ${stageRows(realm)}
    </div>

    <div class="cr-modal-section">
      <div class="cr-modal-section-title">Reports</div>
      <p class="cr-modal-blurb">Capture a timestamped local diagnostic report with URL, realm, player position, performance data, and a game-canvas screenshot when available.</p>
      <button type="button" class="cr-options-pill cr-report-bug-btn" data-cr-bug-report>Report Bug</button>
    </div>

    ${arcForgeSectionHtml()}
  `;
}

// Role-aware ArcForge entry. Admins/mods get the in-game live asset editor;
// everyone else gets the public studio link. The admin check is async, so we
// render from the cached result and refresh the modal once it resolves.
function arcForgeSectionHtml(): string {
  const allowed = arcForgeEditorAllowedCached();
  const adminCta = `<button type="button" class="cr-options-pill cr-afe-open" data-cr-arcforge-editor>Open Live Asset Editor</button>`;
  const publicCta = `<a class="cr-code-link" href="${ARCFORGE_URL}" target="_blank" rel="noopener noreferrer">Open ArcForge Studio ↗</a>`;
  const body =
    allowed === true
      ? `<p class="cr-modal-blurb">Flag a monster, item, or character and regenerate its art through the ArcForge pipeline — live, without leaving the game.</p>${adminCta}`
      : allowed === false
        ? `<p class="cr-modal-blurb">Generate and manage game assets in ArcForge Studio.</p>${publicCta}`
        : `<p class="cr-modal-blurb">Checking access…</p>${publicCta}`;
  return `<div class="cr-modal-section" data-cr-arcforge-section>
      <div class="cr-modal-section-title">ArcForge</div>
      ${body}
    </div>`;
}

function buildModalHtml(skin: HudSkin, fps: 'on' | 'off' | 'diablo'): string {
  const activeId = resolveActiveRealmId();
  const realm = getActiveRealm();
  return `
    <div class="cr-modal-overlay" data-cr-overlay>
      <div class="cr-modal-panel" role="dialog" aria-modal="true" aria-labelledby="cr-cust-title">
        <header class="cr-modal-header">
          <h2 id="cr-cust-title">${activeTab === 'mods' ? 'Mods' : 'Customization'}</h2>
          <button type="button" class="cr-modal-close" data-cr-close aria-label="Close">x</button>
        </header>

        <div class="cr-modal-tabs" role="tablist" aria-label="Cryptic Realm options">
          ${tabButton('customization', 'Customization')}
          ${tabButton('mods', 'Mods')}
        </div>

        ${activeTab === 'mods' ? modsTabHtml(realm) : customizationTabHtml(skin, fps, realm, activeId)}

        <p class="cr-modal-footer-hint">Press <kbd>V</kbd> to toggle first-person view. Diablo angle uses a locked ARPG camera.</p>
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

export function openCustomization(): void {
  activeTab = 'customization';
  openCustomizationHost();
}

export function openMods(): void {
  activeTab = 'mods';
  openCustomizationHost();
}

function openCustomizationHost(): void {
  const host = ensureModalHost();
  const refresh = () => {
    host.innerHTML = buildModalHtml(resolveHudSkin(), resolveFpsMode());
  };

  refresh();
  host.removeAttribute('hidden');
  // Resolve admin/mod status, then re-render so the ArcForge section shows the
  // live-editor CTA (admins) or the studio link (everyone else) instead of the
  // "Checking access…" placeholder.
  const wasResolved = arcForgeEditorAllowedCached() !== null;
  void canUseArcForgeEditor().then(() => {
    // Only re-render if the result was still pending when we opened (avoids a
    // needless rebuild when the cache was already warm).
    if (!wasResolved && !host.hasAttribute('hidden')) refresh();
  });
  host.onclick = (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    if (target.hasAttribute('data-cr-close') || target.hasAttribute('data-cr-overlay')) {
      closeCustomization();
      return;
    }

    const tabBtn = target.closest('[data-cr-tab]') as HTMLElement | null;
    if (tabBtn?.dataset.crTab === 'customization' || tabBtn?.dataset.crTab === 'mods') {
      activeTab = tabBtn.dataset.crTab;
      refresh();
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

    const stageBtn = target.closest('[data-cr-stage]') as HTMLElement | null;
    if (stageBtn) {
      const next = stageBtn.dataset.crStage as RealmStage | undefined;
      if (next === 'live' || next === 'beta' || next === 'alpha' || next === 'dev') {
        persistRealmStage(getActiveRealm().id, next);
        refresh();
      }
      return;
    }

    if (target.closest('[data-cr-bug-report]')) {
      openBugReport();
      return;
    }

    if (target.closest('[data-cr-arcforge-editor]')) {
      openArcForgeEditor();
      return;
    }

    const copyBtn = target.closest('[data-cr-copy]') as HTMLElement | null;
    if (copyBtn?.dataset.crCopy) {
      void navigator.clipboard?.writeText(copyBtn.dataset.crCopy).catch(() => undefined);
      copyBtn.textContent = 'Copied';
    }
  };
}

// Surfaced as a button in the in-game Game Menu. Keep the player inside the
// game: admins/mods can launch the live editor from the Mods tab, while the
// standalone Studio link remains inside that ArcForge section.
export function openArcForge(): void {
  activeTab = 'mods';
  openCustomizationHost();
}

export function mountIngameOptions(): void {
  if (typeof document === 'undefined') return;

  // The Customization / ArcForge entries are now rendered directly by the HUD's
  // renderOptions() (hud.ts) alongside Key Bindings / Graphics / Audio, instead
  // of being injected via a MutationObserver — the observer race meant the
  // buttons silently failed to appear. This mount now only owns Escape-to-close
  // for the Customization modal.
  window.addEventListener(
    'keydown',
    (ev) => {
      if (ev.key !== 'Escape') return;
      const host = document.getElementById(MODAL_ID);
      if (host && !host.hasAttribute('hidden')) {
        closeCustomization();
        ev.preventDefault();
        ev.stopPropagation();
      }
    },
    { capture: true },
  );
}

export function isAutoFpsEnabled(): boolean {
  return resolveAutoFps();
}
