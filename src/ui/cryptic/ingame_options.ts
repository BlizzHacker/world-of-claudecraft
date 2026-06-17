// In-game options-menu CR section: injects a top-level "Customization" entry
// into the upstream `#options-menu` panel, opening its own CR-styled modal
// with HUD style + camera mode (and a slot for future settings).
//
// Implementation:
//   - hud.ts replaces #options-menu innerHTML each open. We use a
//     MutationObserver to spot when the .opt-list arrives, then prepend a
//     "Customization" button there. Idempotent — re-render swaps in a fresh
//     button, never duplicates.
//   - The modal lives as a sibling element `#cr-customization-modal` outside
//     #options-menu, so hud.ts's innerHTML rewrites don't blow it away.
//   - Esc closes the modal first, then falls through to the upstream Esc
//     handler. We don't stop propagation when our modal isn't open.

import { resolveHudSkin, setHudSkin, type HudSkin } from './globes';
import { resolveFpsMode, persistFpsMode } from './fps_mode';

const MODAL_ID = 'cr-customization-modal';
const BUTTON_CLASS = 'cr-customization-launcher';

function buildModalHtml(skin: HudSkin, fps: 'on' | 'off'): string {
  return `
    <div class="cr-modal-overlay" data-cr-overlay>
      <div class="cr-modal-panel" role="dialog" aria-modal="true" aria-labelledby="cr-cust-title">
        <header class="cr-modal-header">
          <h2 id="cr-cust-title">Customization</h2>
          <button type="button" class="cr-modal-close" data-cr-close aria-label="Close">×</button>
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
            </div>
          </div>
          <div class="cr-options-row">
            <span class="cr-options-row-label">Auto-FPS on full zoom</span>
            <div class="cr-options-row-control" role="group" aria-label="Auto first-person">
              <button type="button" class="cr-options-pill ${resolveAutoFps() ? 'active' : ''}" data-cr-autofps="off">Off</button>
              <button type="button" class="cr-options-pill ${resolveAutoFps() ? 'active' : ''}" data-cr-autofps="on">On</button>
            </div>
          </div>
        </div>

        <div class="cr-modal-section">
          <div class="cr-modal-section-title">Realm</div>
          <p class="cr-modal-hint">Switch realms from the picker in the homepage header. Each realm is its own world — characters and progress are scoped to the realm you select.</p>
        </div>

        <p class="cr-modal-footer-hint">Press <kbd>V</kbd> any time to toggle first-person view. More customization slots will land here as features land.</p>
      </div>
    </div>
  `;
}

const AUTO_FPS_KEY = 'cr_auto_fps_on_zoom';
function resolveAutoFps(): boolean {
  try { return window.localStorage?.getItem(AUTO_FPS_KEY) === 'on'; } catch { return false; }
}
function persistAutoFps(on: boolean): void {
  try { window.localStorage?.setItem(AUTO_FPS_KEY, on ? 'on' : 'off'); } catch { /* noop */ }
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

function openCustomization(): void {
  const host = ensureModalHost();
  host.innerHTML = buildModalHtml(resolveHudSkin(), resolveFpsMode());
  host.removeAttribute('hidden');

  const refresh = () => {
    host.innerHTML = buildModalHtml(resolveHudSkin(), resolveFpsMode());
  };

  host.addEventListener('click', (ev) => {
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
    const fpsBtn = target.closest('[data-cr-fps]') as HTMLElement | null;
    if (fpsBtn) {
      const next = fpsBtn.dataset.crFps as 'on' | 'off';
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
  }, { once: false });
}

function closeCustomization(): void {
  const host = document.getElementById(MODAL_ID);
  if (host) host.setAttribute('hidden', '');
}

function injectIfMissing(menuEl: HTMLElement): void {
  // Don't double-inject on every observer tick.
  if (menuEl.querySelector(`.${BUTTON_CLASS}`)) return;
  // Wait for upstream to have populated the list with .opt-list.
  const list = menuEl.querySelector('.opt-list');
  if (!list) return;

  const btn = document.createElement('button');
  btn.className = `btn opt-btn ${BUTTON_CLASS}`;
  btn.type = 'button';
  btn.textContent = 'Customization';
  btn.addEventListener('click', () => openCustomization());
  // Insert just below Key Bindings / Graphics / Audio, above Logout.
  // The simplest stable insertion: append to the list. Visually it lands
  // right above the "Return to Game" button anyway.
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

  // Esc closes our modal first.
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

/** Exported for fps_mode.ts to consult — returns whether auto-FPS on full
 *  zoom is currently enabled. */
export function isAutoFpsEnabled(): boolean {
  return resolveAutoFps();
}
