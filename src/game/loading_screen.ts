// The one shared world loading screen (#loading-screen in index.html). Extracted
// from main.ts so BOTH world-entry (main.ts) and in-session transitions that need a
// cover — delve entry (ui/hud.ts) — drive the SAME branded screen instead of a
// bespoke overlay. Leaf module: only DOM + realm branding + i18n, no game/sim/render
// imports, so hud.ts can import it without a cycle.

import { assetHostUrl } from '../client_origin';
import { getActiveRealm } from '../sim/realms';
import { t } from '../ui/i18n';
import { createLoadingTipRotation, type LoadingTipRotation } from '../ui/loading_tips';

export const LOADING_FADE_MS = 350; // keep in sync with the #loading-screen CSS transition

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => document.querySelector(sel) as T;

let loadingHideTimer: number | null = null;

/** Show the branded loading screen with a status line. Idempotent — safe to call
 *  while already visible (it just updates the status + cancels a pending fade). */

const LOADING_TIP_ROTATE_MS = 5000;
let loadingTipRotation: LoadingTipRotation | null = null;
let loadingTipTimer: number | null = null;

// Rotating "did you know" copy under the progress bar, purely cosmetic (no
// gameplay-relevant info), so entering/leaving the loading screen sets it up
// and tears it down independent of the actual asset/scene-build progress.
function startLoadingTips(): void {
  if (loadingTipTimer !== null) return; // already running
  loadingTipRotation = createLoadingTipRotation();
  const tipEl = document.querySelector<HTMLElement>('#ls-tip');
  if (!tipEl) return;
  tipEl.textContent = loadingTipRotation.current();
  loadingTipTimer = window.setInterval(() => {
    if (!loadingTipRotation) return;
    tipEl.textContent = loadingTipRotation.next();
  }, LOADING_TIP_ROTATE_MS);
}

function stopLoadingTips(): void {
  if (loadingTipTimer !== null) {
    window.clearInterval(loadingTipTimer);
    loadingTipTimer = null;
  }
  loadingTipRotation = null;
}

export function showLoadingScreen(statusText: string): void {
  const el = $('#loading-screen');
  if (!el) return;
  // Per-realm loading art: each realm's content pack names its own loading screen
  // (branding.loadingScreenSrc); the CSS default is the Cryptic Realm art.
  // assetHostUrl: remote asset origin for bundles with no local public/ tree
  // (Facebook Instant Games); identity everywhere else. A CSP-blocked image
  // there fails soft to the plain backdrop colour.
  const realmLoading = getActiveRealm().branding?.loadingScreenSrc;
  if (realmLoading) el.style.backgroundImage = `url("${assetHostUrl(realmLoading)}")`;
  if (loadingHideTimer !== null) {
    window.clearTimeout(loadingHideTimer);
    loadingHideTimer = null;
  }
  el.classList.remove('fade');
  el.classList.add('visible');
  document.body.classList.add('is-entering-world');
  setLoadingStatus(statusText);
  startLoadingTips();
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
  stopLoadingTips();
}
