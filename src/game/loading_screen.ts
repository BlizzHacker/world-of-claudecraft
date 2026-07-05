// The one shared world loading screen (#loading-screen in index.html). Extracted
// from main.ts so BOTH world-entry (main.ts) and in-session transitions that need a
// cover — delve entry (ui/hud.ts) — drive the SAME branded screen instead of a
// bespoke overlay. Leaf module: only DOM + realm branding + i18n, no game/sim/render
// imports, so hud.ts can import it without a cycle.

import { getActiveRealm } from '../sim/realms';
import { t } from '../ui/i18n';

export const LOADING_FADE_MS = 350; // keep in sync with the #loading-screen CSS transition

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T =>
  document.querySelector(sel) as T;

let loadingHideTimer: number | null = null;

/** Show the branded loading screen with a status line. Idempotent — safe to call
 *  while already visible (it just updates the status + cancels a pending fade). */
export function showLoadingScreen(statusText: string): void {
  const el = $('#loading-screen');
  if (!el) return;
  // Per-realm loading art: each realm's content pack names its own loading screen
  // (branding.loadingScreenSrc); the CSS default is the Cryptic Realm art.
  const realmLoading = getActiveRealm().branding?.loadingScreenSrc;
  if (realmLoading) el.style.backgroundImage = `url("${realmLoading}")`;
  if (loadingHideTimer !== null) {
    window.clearTimeout(loadingHideTimer);
    loadingHideTimer = null;
  }
  el.classList.remove('fade');
  el.classList.add('visible');
  document.body.classList.add('is-entering-world');
  setLoadingStatus(statusText);
}

export function setLoadingStatus(text: string): void {
  const el = $('#ls-status');
  if (el) el.textContent = text;
}

/** Update the determinate progress bar (world-object streaming). */
export function setLoadingProgress(done: number, total: number): void {
  const fill = $('#ls-fill');
  if (fill) fill.style.width = total > 0 ? `${Math.round((done / total) * 100)}%` : '0%';
  setLoadingStatus(t('loading.worldProgress', { done, total }));
}

export function hideLoadingScreen(): void {
  const el = $('#loading-screen');
  if (!el || !el.classList.contains('visible')) return;
  el.classList.add('fade');
  loadingHideTimer = window.setTimeout(() => {
    el.classList.remove('visible', 'fade');
    document.body.classList.remove('is-entering-world');
    loadingHideTimer = null;
  }, LOADING_FADE_MS);
}
