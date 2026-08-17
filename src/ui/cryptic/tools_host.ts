// Where the fork's in-game reference tools live: the GAME's own micro-menu rail
// and the GAME's own managed-window system, not a surface of their own.
//
// History, because two earlier arrangements both failed and the reasons are the
// design constraints here:
//   - The launchers were born in the landing's #cr-bestiary-host div. Commit
//     7f2439e84a moved the mounts into main.ts startGame() and deleted that div,
//     so every mount fell back to a bare document.body append: static flow at the
//     page top-left, which the fixed full-viewport #game-canvas (z-index:0,
//     src/styles/base.css) paints over from its first frame. The handlers still
//     worked; the buttons were simply invisible for the whole session.
//   - 51721ad963 rescued them into a fixed #cr-tools-host toolbar. That made them
//     reachable, but a floating toolbar is not part of the game: it does not
//     move, focus, stack or close like Talents / Spell Book / Items / Dungeon
//     Finder, which all live on the right-edge icon rail and open as managed
//     `.window.panel` windows.
//
// This module is the join. Launchers become real `.micro-btn` entries appended to
// the micro-menu rail (#side-buttons-col-b in index.html), so they inherit the
// rail's art, hover, sizing and mobile behavior. Panels become real
// `.window.panel` windows built with the same `.panel-title` + `.x-btn` chrome
// the Book of Deeds and the Dungeon Finder use, which is the whole contract Hud
// keys off: its MutationObserver picks up any `.window.panel` added under
// document.body (initWindowManagement), and from that it gets the open-cascade
// placement, the 50-89 z-order band with click-to-front, titlebar drag
// (isWindowDragHandle looks for `.panel-title`), the resize grip, the
// mobile-window-open body class, and Escape / closeAll teardown through
// closeManagedWindow's default arm (which hides by inline display, the same way
// close() here does). No Hud edit is needed for any of that, which also keeps
// this change off the file three siblings are editing concurrently.
//
// The legacy floating host is KEPT as the last-resort fallback (below), so the
// 51721ad963 fix survives anywhere the rail does not exist: the landing chrome,
// the offline entry document before the HUD builds, and the jsdom suites.

import { hydrateIcons, svgIcon } from '../ui_icons';

/** The micro-menu column the built-in interface buttons live in (index.html). */
const RAIL_ID = 'side-buttons-col-b';
/** A page-provided host (the pre-7f2439e84a landing panel) still wins when present. */
const PAGE_HOST_ID = 'cr-bestiary-host';
const LEGACY_HOST_ID = 'cr-tools-host';
const STYLE_ID = 'cr-tools-host-style';

const STYLE = `
  #${LEGACY_HOST_ID} { position:fixed; top:calc(10px + env(safe-area-inset-top, 0px)); left:calc(10px + env(safe-area-inset-left, 0px)); z-index:5; display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
  /* The tools only mean anything in the world: startGame() mounts them, and if
     the player ever gets back to the landing chrome the toolbar must not
     linger over it. */
  body:not(.game-active) #${LEGACY_HOST_ID} { display:none; }
  /* The mobile touch HUD owns the screen edges; parking a toolbar there would
     sit over the touch controls. */
  body.mobile-touch #${LEGACY_HOST_ID} { display:none; }
  /* Launchers that landed on the legacy toolbar or a page host keep the old
     labelled-button look; a launcher on the rail is a plain .micro-btn and
     takes the rail's own art from components.css. */
  #${LEGACY_HOST_ID} .cr-tool-launch, #${PAGE_HOST_ID} .cr-tool-launch { display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border:1px solid var(--cr-border,#5f4b1a); border-radius:5px; background:rgba(123,223,242,0.06); color:#7bdff2; font:700 12px/1 var(--cr-font-ui,system-ui,sans-serif); letter-spacing:.5px; cursor:pointer; }
  #${LEGACY_HOST_ID} .cr-tool-launch:hover, #${PAGE_HOST_ID} .cr-tool-launch:hover { border-color:#7bdff2; background:rgba(123,223,242,0.12); }
  /* On the rail the emoji glyph would fight the painted icon art, so it is
     dropped and the accessible name carries the meaning. */
  #${RAIL_ID} .cr-tool-launch .cr-tool-glyph, #${RAIL_ID} .cr-tool-launch .cr-tool-label { display:none; }
  /* The window body: the tools paint their own content into this, and the
     shared .window/.panel/.panel-title chrome supplies everything around it. */
  .cr-tool-window { display:none; flex-direction:column; width:min(860px, calc(var(--app-vw, 100vw) / var(--window-scale) - 40px)); max-height:calc(var(--app-vh, 100vh) * 0.82 / var(--window-scale) - 24px); }
  .cr-tool-window > .panel-title { flex:none; }
  .cr-tool-body { flex:1 1 auto; overflow-y:auto; min-height:0; }
`;

function ensureStyle(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

/** The legacy fixed toolbar (see the header): created only when neither a
 *  page-provided host nor the micro-menu rail exists. */
export function ensureToolsHost(): HTMLElement {
  ensureStyle();
  let host = document.getElementById(LEGACY_HOST_ID);
  if (host) return host;
  host = document.createElement('div');
  host.id = LEGACY_HOST_ID;
  document.body.appendChild(host);
  return host;
}

/** Where a launcher button belongs, in preference order: a page-provided host,
 *  the game's micro-menu rail, then the legacy floating toolbar. */
export function toolLauncherHost(): HTMLElement {
  return (
    document.getElementById(PAGE_HOST_ID) ??
    document.getElementById(RAIL_ID) ??
    ensureToolsHost()
  );
}

export interface ToolLauncher {
  /** Button element id (stable; the tools and their tests name these). */
  id: string;
  /** A `[data-icon]` name from src/ui/ui_icons.ts, painted by hydrateIcons on the rail. */
  icon: string;
  /** Visible + accessible label. English: the fork tools are outside the i18n catalog. */
  label: string;
  onOpen(): void;
  /** Optional emoji kept for the non-rail hosts, which have no painted art. */
  glyph?: string;
}

/**
 * Mount one launcher into the best available host. Idempotent: a second call
 * with the same id is a no-op, so the retry-mount paths in main.ts are safe.
 */
export function mountToolLauncher(launcher: ToolLauncher): HTMLButtonElement | null {
  if (typeof document === 'undefined') return null;
  const existing = document.getElementById(launcher.id);
  if (existing) return existing as HTMLButtonElement;
  ensureStyle();
  const host = toolLauncherHost();
  const btn = document.createElement('button');
  btn.id = launcher.id;
  btn.type = 'button';
  // .micro-btn is what makes a rail entry look and size like #mm-talents; it is
  // harmless on the other two hosts, which override the look through
  // .cr-tool-launch above.
  btn.className = 'micro-btn cr-tool-launch';
  btn.dataset.icon = launcher.icon;
  btn.title = launcher.label;
  btn.setAttribute('aria-label', launcher.label);
  btn.innerHTML =
    `<span class="cr-tool-glyph" aria-hidden="true">${launcher.glyph ?? ''}</span>` +
    `<span class="cr-tool-label"></span>`;
  const label = btn.querySelector('.cr-tool-label');
  if (label) label.textContent = launcher.label;
  btn.addEventListener('click', launcher.onOpen);
  host.appendChild(btn);
  // Swap the [data-icon] placeholder for the rail's painted art / inline SVG.
  // hydrateIcons only looks at DESCENDANTS of the node it is given, so it must
  // be handed the host, not the button.
  hydrateIcons(host);
  return btn;
}

/** Windows live inside #ui with the built-in ones (they inherit the #ui zoom
 *  through --window-scale); body is the fallback for a document without it. */
function windowParent(): HTMLElement {
  return document.getElementById('ui') ?? document.body;
}

/**
 * The tool's managed window root, created on first use. `.window.panel` is the
 * whole contract (see the header): Hud's observer adopts it from here on.
 */
export function ensureToolWindow(id: string): HTMLElement {
  ensureStyle();
  let el = document.getElementById(id);
  if (el) return el;
  el = document.createElement('div');
  el.id = id;
  el.className = 'window panel cr-tool-window';
  windowParent().appendChild(el);
  return el;
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/**
 * Stamp the shared window chrome (the Book of Deeds `.panel-title` + `.x-btn`
 * shape) and return the empty body element the caller paints into. Cold path:
 * called on open, never per frame.
 */
export function renderToolWindow(id: string, title: string): HTMLElement {
  const el = ensureToolWindow(id);
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', title);
  el.innerHTML =
    `<div class="panel-title"><span>${escapeAttr(title)}</span>` +
    `<button type="button" class="x-btn" data-close aria-label="Close">${svgIcon('close')}</button>` +
    `</div><div class="cr-tool-body"></div>`;
  el.querySelector('[data-close]')?.addEventListener('click', () => closeToolWindow(id));
  return el.querySelector('.cr-tool-body') as HTMLElement;
}

/** Show the window. Inline display is deliberate: it is what Hud's observer
 *  reads (isWindowVisible) and what closeManagedWindow's default arm writes
 *  back, so Escape and the gamepad close path work without any Hud change. */
export function openToolWindow(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  // Focus the first control so keyboard users land inside the window (the
  // built-in windows do this through their own painter's focus capture).
  el.querySelector<HTMLElement>('button, [href], input, select, textarea')?.focus();
}

export function closeToolWindow(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'none';
}

export function isToolWindowOpen(id: string): boolean {
  const el = document.getElementById(id);
  return !!el && el.style.display !== 'none' && el.style.display !== '';
}

/** Launcher behavior that matches the built-ins: the rail button TOGGLES. */
export function toggleToolWindow(id: string, paint: () => void): void {
  if (isToolWindowOpen(id)) {
    closeToolWindow(id);
    return;
  }
  paint();
  openToolWindow(id);
}
