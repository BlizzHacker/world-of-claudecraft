// Health + resource globes — optional Cryptic Realm HUD skin that replaces
// the upstream rectangular player-frame bars with two SVG globes. Hermes/Qwen
// origin: the LXC visuals; reimplemented here as a pull-safe additive overlay
// instead of forking hud.ts.
//
// How it works:
//   - mountHudGlobes() finds the upstream `#player-frame` container, injects
//     a sibling `<div id="cr-hud-globes">` with two SVG circles, and starts
//     an rAF loop that mirrors whatever hud.ts wrote to `#pf-hp-text`,
//     `#pf-res-text`, and `#pf-resource` (the bar's class encodes resource
//     type: rage/energy/mana).
//   - The skin is stored in `localStorage.cr_hud_skin` ('classic' | 'globes').
//     'classic' restores the upstream bars exactly; 'globes' hides the bars
//     and shows the globes. Default is 'globes' for themed realms (infernal/
//     classic/dominion/arcane) and 'classic' for the claudecraft realm.
//   - No hud.ts edits. CSS toggles via the `cr-hud-skin-*` class on <body>.

import './realm_env';
import { resolveActiveRealmId } from '../../sim/realms';

export type HudSkin = 'classic' | 'globes';

const STORE_KEY = 'cr_hud_skin';
const HOST_ID = 'cr-hud-globes';

function isHudSkin(s: string | null | undefined): s is HudSkin {
  return s === 'classic' || s === 'globes';
}

function defaultSkinForRealm(): HudSkin {
  return resolveActiveRealmId() === 'claudecraft' ? 'classic' : 'globes';
}

export function resolveHudSkin(): HudSkin {
  try {
    const v = typeof window !== 'undefined' ? window.localStorage?.getItem(STORE_KEY) : null;
    if (isHudSkin(v)) return v;
  } catch { /* storage unavailable */ }
  return defaultSkinForRealm();
}

export function persistHudSkin(skin: HudSkin): void {
  try {
    window.localStorage?.setItem(STORE_KEY, skin);
  } catch { /* storage unavailable */ }
}

function applyBodyClass(skin: HudSkin): void {
  const body = document.body;
  body.classList.remove('cr-hud-skin-classic', 'cr-hud-skin-globes');
  body.classList.add(`cr-hud-skin-${skin}`);
}

// Pre-computed circumference for r=42 → 2πr ≈ 263.89.
const GLOBE_RADIUS = 42;
const GLOBE_CIRC = 2 * Math.PI * GLOBE_RADIUS;

function buildGlobesMarkup(): string {
  const ringStyle = `fill: transparent; stroke-width: 8; stroke-linecap: round;`;
  const bgRingStyle = `${ringStyle} stroke: rgba(0, 0, 0, 0.45);`;
  // Reverse stroke direction so the dashoffset animates clockwise from 12 o'clock.
  const ring = (id: string, color: string, glow: string) =>
    `<circle class="cr-globe-bg" cx="50" cy="50" r="${GLOBE_RADIUS}" style="${bgRingStyle}"></circle>
     <circle class="cr-globe-fill" id="${id}" cx="50" cy="50" r="${GLOBE_RADIUS}"
       style="${ringStyle} stroke: ${color}; filter: drop-shadow(0 0 6px ${glow}); transform: rotate(-90deg); transform-origin: 50% 50%;
              stroke-dasharray: ${GLOBE_CIRC}; stroke-dashoffset: 0;"></circle>`;
  // Inner glass orb effect: radial gradient circle for the "ball" look.
  const orb = (label: string, gradId: string, color: string, valueId: string) =>
    `<svg class="cr-globe" viewBox="0 0 100 100" role="img" aria-label="${label}">
       <defs>
         <radialGradient id="${gradId}" cx="50%" cy="40%" r="55%">
           <stop offset="0%" stop-color="${color}" stop-opacity="0.95"/>
           <stop offset="60%" stop-color="${color}" stop-opacity="0.45"/>
           <stop offset="100%" stop-color="#000" stop-opacity="0.85"/>
         </radialGradient>
       </defs>
       <circle cx="50" cy="50" r="${GLOBE_RADIUS - 2}" fill="url(#${gradId})"></circle>
       ${ring(valueId, color, color)}
       <ellipse cx="50" cy="30" rx="22" ry="9" fill="rgba(255,255,255,0.18)"></ellipse>
     </svg>`;
  return `<div class="cr-globe-pair">
    ${orb('Health globe', 'cr-grad-hp', '#c83a2a', 'cr-globe-hp-fill')}
    <div class="cr-globe-divider" aria-hidden="true"></div>
    ${orb('Resource globe', 'cr-grad-res', '#3a7ad4', 'cr-globe-res-fill')}
  </div>
  <div class="cr-globe-text-pair">
    <span class="cr-globe-text" id="cr-globe-hp-text">--</span>
    <span class="cr-globe-text" id="cr-globe-res-text">--</span>
  </div>`;
}

interface GlobeState {
  host: HTMLDivElement;
  hpFill: SVGCircleElement;
  resFill: SVGCircleElement;
  hpText: HTMLElement;
  resText: HTMLElement;
  /** Cached resource color so we don't restyle every frame. */
  lastResType: 'rage' | 'energy' | 'mana' | null;
}

function parseFraction(text: string | null): number {
  if (!text) return 0;
  const m = text.match(/(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const cur = parseFloat(m[1]);
  const max = parseFloat(m[2]);
  if (!Number.isFinite(cur) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(1, cur / max));
}

function resourceTypeFromBarClass(el: Element | null): 'rage' | 'energy' | 'mana' {
  if (!el) return 'mana';
  if (el.classList.contains('rage')) return 'rage';
  if (el.classList.contains('energy')) return 'energy';
  return 'mana';
}

function resourceColor(t: 'rage' | 'energy' | 'mana'): string {
  if (t === 'rage') return '#c0392b';
  if (t === 'energy') return '#f1c40f';
  return '#3a7ad4';
}

function injectGlobes(): GlobeState | null {
  const playerFrame = document.getElementById('player-frame');
  if (!playerFrame || !playerFrame.parentElement) return null;

  // Avoid double-mount on hot reload / repeated mount calls.
  let host = document.getElementById(HOST_ID) as HTMLDivElement | null;
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.className = 'cr-hud-globes';
    host.setAttribute('aria-hidden', 'false');
    host.innerHTML = buildGlobesMarkup();
    playerFrame.parentElement.insertBefore(host, playerFrame);
  }

  const hpFill = host.querySelector('#cr-globe-hp-fill') as SVGCircleElement | null;
  const resFill = host.querySelector('#cr-globe-res-fill') as SVGCircleElement | null;
  const hpText = host.querySelector('#cr-globe-hp-text') as HTMLElement | null;
  const resText = host.querySelector('#cr-globe-res-text') as HTMLElement | null;
  if (!hpFill || !resFill || !hpText || !resText) return null;

  return { host, hpFill, resFill, hpText, resText, lastResType: null };
}

function updateGlobes(state: GlobeState): void {
  const hpFraction = parseFraction(document.getElementById('pf-hp-text')?.textContent ?? null);
  const resFraction = parseFraction(document.getElementById('pf-res-text')?.textContent ?? null);

  state.hpFill.style.strokeDashoffset = `${GLOBE_CIRC * (1 - hpFraction)}`;
  state.resFill.style.strokeDashoffset = `${GLOBE_CIRC * (1 - resFraction)}`;

  state.hpText.textContent = document.getElementById('pf-hp-text')?.textContent ?? '';
  state.resText.textContent = document.getElementById('pf-res-text')?.textContent ?? '';

  const resType = resourceTypeFromBarClass(document.getElementById('pf-resource'));
  if (resType !== state.lastResType) {
    state.lastResType = resType;
    const c = resourceColor(resType);
    state.resFill.style.stroke = c;
    state.resFill.style.filter = `drop-shadow(0 0 6px ${c})`;
  }
}

export interface MountHudGlobesOptions {
  /** If true, will keep ticking even when the page is hidden. Default false. */
  alwaysOnRaf?: boolean;
}

let mountInfo: {
  raf: number;
  state: GlobeState;
} | null = null;

export function setHudSkin(skin: HudSkin): void {
  persistHudSkin(skin);
  applyBodyClass(skin);
}

export function mountHudGlobes(_opts: MountHudGlobesOptions = {}): void {
  if (typeof document === 'undefined') return;
  const skin = resolveHudSkin();
  applyBodyClass(skin);

  const tryMount = () => {
    const state = injectGlobes();
    if (!state) {
      // Player frame not in DOM yet (still on the login / loading screen).
      // Retry once the user clicks into the game by watching for the frame.
      const obs = new MutationObserver(() => {
        if (document.getElementById('player-frame')) {
          obs.disconnect();
          tryMount();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      return;
    }
    if (mountInfo) cancelAnimationFrame(mountInfo.raf);
    const tick = () => {
      updateGlobes(state);
      mountInfo!.raf = requestAnimationFrame(tick);
    };
    mountInfo = { raf: requestAnimationFrame(tick), state };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryMount);
  } else {
    tryMount();
  }
}
