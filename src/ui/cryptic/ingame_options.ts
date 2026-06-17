// In-game options-menu CR section. Adds a HUD-skin + FPS-mode picker into
// the upstream `#options-menu` panel without forking src/ui/hud.ts.
//
// How: hud.ts calls `renderOptions()` every time the options menu opens, and
// the method replaces `#options-menu`'s innerHTML each time. So we hook a
// MutationObserver that watches the element's child list, and any time the
// upstream render finishes (the panel-title button arrives), we append our
// CR section at the end. Re-applies on every re-render automatically.

import { resolveHudSkin, setHudSkin, type HudSkin } from './globes';
import { resolveFpsMode, persistFpsMode } from './fps_mode';

const SECTION_ID = 'cr-options-section';

function buildSectionHtml(skin: HudSkin, fps: 'on' | 'off'): string {
  return `
    <div id="${SECTION_ID}" class="cr-options-section">
      <div class="cr-options-section-title">Cryptic Realm</div>

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
    </div>
  `;
}

function injectIfMissing(menuEl: HTMLElement): void {
  // Don't double-inject on every observer tick.
  if (menuEl.querySelector(`#${SECTION_ID}`)) return;
  // Wait for upstream to have populated the menu — they always render a
  // .panel-title first; if we don't see one yet, this tick is too early.
  if (!menuEl.querySelector('.panel-title')) return;

  const skin = resolveHudSkin();
  const fps = resolveFpsMode();
  const wrap = document.createElement('div');
  wrap.innerHTML = buildSectionHtml(skin, fps);
  const section = wrap.firstElementChild as HTMLElement | null;
  if (!section) return;
  menuEl.appendChild(section);

  section.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const skinBtn = target.closest('[data-cr-skin]') as HTMLElement | null;
    if (skinBtn) {
      const next = skinBtn.dataset.crSkin as HudSkin;
      setHudSkin(next);
      // Re-render this section in place so the active pill updates.
      const newWrap = document.createElement('div');
      newWrap.innerHTML = buildSectionHtml(next, resolveFpsMode());
      const newSection = newWrap.firstElementChild as HTMLElement | null;
      if (newSection) section.replaceWith(newSection);
      return;
    }

    const fpsBtn = target.closest('[data-cr-fps]') as HTMLElement | null;
    if (fpsBtn) {
      const next = fpsBtn.dataset.crFps as 'on' | 'off';
      persistFpsMode(next);
      window.dispatchEvent(new CustomEvent('cr-fps-toggle'));
      const newWrap = document.createElement('div');
      newWrap.innerHTML = buildSectionHtml(resolveHudSkin(), next);
      const newSection = newWrap.firstElementChild as HTMLElement | null;
      if (newSection) section.replaceWith(newSection);
      return;
    }
  });
}

export function mountIngameOptions(): void {
  if (typeof document === 'undefined') return;

  const arm = () => {
    const menuEl = document.getElementById('options-menu');
    if (!menuEl) return;
    const obs = new MutationObserver(() => injectIfMissing(menuEl));
    obs.observe(menuEl, { childList: true, subtree: false });
    // Also try once now in case the menu is already open at mount time.
    injectIfMissing(menuEl);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm);
  } else {
    arm();
  }
}
