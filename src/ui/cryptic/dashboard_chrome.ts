// Shared dashboard chrome — renders the homepage header contract for /me/,
// /mod/, and /admin/. These pages are standalone entries, so links navigate
// instead of switching in-page views, but the DOM/classes intentionally mirror
// index.html's .homepage-header menu instead of carrying a dashboard-only nav.
//
// Home is the canonical source of nav order/labels; keep this list in sync
// with public/nav.js. Self-mounts on DOMContentLoaded.

import { mountRealmBranding } from './branding';
import { mountThemeSelect } from './theme_select';
import { mountUserDropdown } from './user_dropdown';

const CHROME_ID = 'cr-dash-chrome';
const STYLE_ID = 'cr-dash-chrome-style';

type PageKind = 'admin' | 'mod' | 'me';

function pageKind(): PageKind | null {
  const p = window.location.pathname;
  if (p.startsWith('/admin')) return 'admin';
  if (p.startsWith('/mod')) return 'mod';
  if (p.startsWith('/me') || p === '/user.html') return 'me';
  return null;
}

interface NavLink {
  href: string;
  label: string;
  current?: boolean;
}

// Primary nav — SINGLE SOURCE OF TRUTH is public/nav.js (window.CR_NAV_ITEMS),
// loaded by every page. Read it when present so the dashboard nav can never
// drift from the rest of the site; fall back to a copy only if nav.js hasn't
// loaded. To change the nav, edit public/nav.js — not here.
function primaryLinks(): NavLink[] {
  const shared = (window as unknown as { CR_NAV_ITEMS?: { href: string; label: string }[] })
    .CR_NAV_ITEMS;
  const base =
    Array.isArray(shared) && shared.length
      ? shared.map((i) => ({ href: i.href, label: i.label }))
      : [
          { href: '/#play', label: 'Play' },
          { href: '/#highscores', label: 'High Scores' },
          { href: '/wiki', label: 'Wiki' },
          { href: '/#news', label: 'News' },
          { href: '/contributions.html', label: 'Contributions' },
          { href: '/#download', label: 'Download' },
          { href: '/links.html', label: 'Links' },
          { href: '/whitepaper.html', label: 'White Paper' },
          { href: '/#login', label: 'Login/Register' },
        ];
  const kind = pageKind();
  const context =
    kind === 'admin'
      ? { href: '/admin/', label: 'Admin', current: true }
      : kind === 'mod'
        ? { href: '/mod/', label: 'Moderator', current: true }
        : kind === 'me'
          ? { href: '/me/', label: 'My Account', current: true }
          : null;
  if (!context) return base;
  if (base.some((l) => l.href === context.href)) {
    return base.map((l) => ({ ...l, current: l.href === context.href }));
  }
  const loginIdx = base.findIndex((l) => l.href.includes('#login'));
  const out = base.slice();
  out.splice(loginIdx >= 0 ? loginIdx : out.length, 0, context);
  return out;
}

function navId(label: string): string {
  return `nav-link-${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

function navItem(l: NavLink): string {
  const cls = `nav-link${l.current ? ' active' : ''}`;
  const aria = l.current ? ' aria-current="page"' : '';
  return `<li class="nav-item"><a class="${cls}" id="${navId(l.label)}" href="${l.href}"${aria}>${l.label}</a></li>`;
}

function buildHtml(): string {
  const primary = primaryLinks().map(navItem).join('');
  return `
    <header class="homepage-header cr-dash-header" id="${CHROME_ID}" data-cr-main-menu>
      <div class="header-logo-container">
        <a class="header-logo-btn" href="/" title="Back to homepage" aria-label="Back to homepage">
          <img class="header-logo" src="/icon-192.png" alt="Cryptic Realm" />
        </a>
      </div>
      <button type="button" class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="Toggle menu" aria-expanded="false">
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
      </button>
      <div class="header-menu-container" id="header-menu-container">
        <nav class="homepage-nav" aria-label="Main navigation">
          <ul class="nav-list" role="list">${primary}</ul>
        </nav>
        <div class="header-actions">
          <div id="theme-picker" aria-label="Realm selector"></div>
          <a class="donate-cta" href="solana:GncAXx6j38osJns395XZtf6rSA9MU3K1gwafTrHpBJpi" rel="noopener noreferrer" title="Tip $CR or SOL to GncA...BJpi" aria-label="Tip $CR or SOL to support Cryptic Realm at GncAXx6j38osJns395XZtf6rSA9MU3K1gwafTrHpBJpi">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span>Tip $CR</span>
          </a>
        </div>
      </div>
    </header>
  `;
}

// Self-contained copy of the homepage header rules. Dashboard pages do not load
// index.html's inline CSS, so this must preserve the approved main-menu look.
const STYLE = `
  .cr-dash-header.homepage-header {
    width: 100%;
    background: linear-gradient(180deg, rgba(28, 24, 16, 0.98) 0%, rgba(11, 11, 18, 0.95) 100%);
    border-bottom: 2px solid transparent;
    border-image: linear-gradient(to right, rgba(78, 61, 29, 0.2), #c8a838, rgba(78, 61, 29, 0.2)) 1;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 8px 24px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
    z-index: 50;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    font-family: Arial, Helvetica, sans-serif;
  }
  .cr-dash-header .header-menu-container { display: contents; }
  .cr-dash-header .header-logo-container { display: flex; align-items: center; justify-self: start; }
  .cr-dash-header .header-actions { display: flex; align-items: center; gap: 8px; justify-self: end; }
  .cr-dash-header #theme-picker { display: flex; align-items: center; min-width: 0; }
  .cr-dash-header .header-logo-btn {
    background: none; border: none; cursor: pointer; padding: 0; margin: 0;
    display: flex; align-items: center; border-radius: 4px; transition: filter 0.2s;
  }
  .cr-dash-header .header-logo-btn:hover { filter: brightness(1.2); }
  .cr-dash-header .header-logo-btn:focus-visible {
    outline: 3px solid #c8a838 !important; outline-offset: 2px !important;
  }
  .cr-dash-header .header-logo {
    height: 40px; width: 40px; margin: 0; border-radius: 4px;
    filter: drop-shadow(0 0 10px rgba(199, 148, 26, 0.3)) drop-shadow(1px 1px 2px #000);
  }
  .cr-dash-header .mobile-menu-toggle {
    display: none; flex-direction: column; justify-content: space-between;
    width: 40px; height: 40px; background: none; border: none; cursor: pointer;
    padding: 11px 8px; margin: 0; z-index: 20; border-radius: 4px;
    transition: box-shadow 0.2s;
  }
  .cr-dash-header .mobile-menu-toggle:focus-visible {
    outline: 3px solid #c8a838; outline-offset: 4px; box-shadow: 0 0 8px rgba(255, 209, 0, 0.2);
  }
  .cr-dash-header .hamburger-bar {
    width: 24px; align-self: center; height: 2px; background-color: #c8a838;
    border-radius: 1px; transition: transform 0.2s, opacity 0.2s, background-color 0.2s;
  }
  .cr-dash-header .mobile-menu-toggle:hover .hamburger-bar,
  .cr-dash-header .mobile-menu-toggle:focus-visible .hamburger-bar { background-color: #ffd100; }
  .cr-dash-header.menu-open .mobile-menu-toggle .hamburger-bar:nth-child(1) { transform: translateY(8px) rotate(45deg); }
  .cr-dash-header.menu-open .mobile-menu-toggle .hamburger-bar:nth-child(2) { opacity: 0; }
  .cr-dash-header.menu-open .mobile-menu-toggle .hamburger-bar:nth-child(3) { transform: translateY(-8px) rotate(-45deg); }
  .cr-dash-header .homepage-nav { display: flex; align-items: center; justify-self: center; }
  .cr-dash-header .nav-list {
    display: flex; gap: 8px; align-items: center; margin: 0; padding: 0; list-style: none;
  }
  .cr-dash-header .nav-item { display: flex; }
  .cr-dash-header .nav-link {
    display: inline-flex; align-items: center; justify-content: center;
    min-height: 32px; background: transparent; border: 1px solid transparent;
    border-radius: 4px; color: #998d6a;
    font-family: 'Cinzel', 'Palatino Linotype', Palatino, Georgia, serif;
    font-size: 13.5px; letter-spacing: 0.5px; padding: 6px 16px;
    cursor: pointer; text-decoration: none; white-space: nowrap;
    transition: color 0.2s, border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
  }
  .cr-dash-header .nav-link:hover,
  .cr-dash-header .nav-link:focus-visible {
    color: #ffd100; border-color: #c8a838; box-shadow: 0 0 8px rgba(255, 209, 0, 0.2);
    background-color: rgba(255, 209, 0, 0.03); outline: none;
  }
  .cr-dash-header .nav-link.active {
    color: #ffd100; border-color: #c8a838;
    background: linear-gradient(180deg, rgba(200, 168, 56, 0.2) 0%, rgba(110, 90, 42, 0.05) 60%, rgba(11, 11, 18, 0.4) 100%);
    box-shadow: inset 0 0 5px rgba(255, 209, 0, 0.15), 0 0 8px rgba(255, 209, 0, 0.2);
  }
  .cr-dash-header .donate-cta {
    display: inline-flex; align-items: center; gap: 7px; min-height: 40px;
    box-sizing: border-box; padding: 7px 16px; border-radius: 4px;
    border: 1px solid #c8a838; background: #f0c34d; color: #2a1c05;
    font-family: 'Cinzel', 'Palatino Linotype', Palatino, Georgia, serif;
    font-size: 13.5px; font-weight: 700; letter-spacing: 0; text-decoration: none;
    white-space: nowrap; box-shadow: 0 2px 10px rgba(255, 209, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.35);
    transition: filter 0.2s, box-shadow 0.2s, transform 0.2s;
  }
  .cr-dash-header .donate-cta:hover,
  .cr-dash-header .donate-cta:focus-visible {
    filter: brightness(1.08); background: #ffd86b;
    box-shadow: 0 0 14px rgba(255, 209, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.45);
    transform: translateY(-1px); outline: none;
  }
  .cr-dash-header .donate-cta svg { width: 16px; height: 16px; display: block; }
  @media (max-width: 860px) {
    .cr-dash-header.homepage-header {
      display: flex; flex-direction: row; justify-content: space-between; align-items: center;
      padding-top: calc(8px + env(safe-area-inset-top));
      padding-right: max(16px, env(safe-area-inset-right));
      padding-bottom: 8px;
      padding-left: max(16px, env(safe-area-inset-left));
    }
    .cr-dash-header .mobile-menu-toggle { display: flex; }
    .cr-dash-header .header-menu-container {
      display: none; position: absolute; top: 100%; left: 0; right: 0;
      background: rgba(11, 11, 18, 0.98); border-bottom: 2px solid #4e3d1d;
      flex-direction: column; align-items: center; padding: 16px; gap: 16px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.8); z-index: 99;
    }
    .cr-dash-header.menu-open .header-menu-container { display: flex; }
    .cr-dash-header .homepage-nav { width: 100%; justify-content: center; }
    .cr-dash-header .nav-list { flex-direction: column; width: 100%; gap: 4px; }
    .cr-dash-header .nav-link {
      width: 100%; text-align: center; min-height: 40px; display: flex;
      align-items: center; justify-content: center; padding: 8px; font-size: 14px;
    }
    .cr-dash-header .header-actions {
      width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .cr-dash-header #theme-picker { width: 100%; justify-content: center; }
  }
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.appendChild(style);
}

export function mountDashboardChrome(): void {
  if (typeof document === 'undefined') return;
  const kind = pageKind();
  if (!kind) return;
  if (document.getElementById(CHROME_ID)) {
    mountDashboardEnhancements();
    return;
  }
  ensureStyle();
  const host = document.createElement('div');
  host.innerHTML = buildHtml();
  const header = host.firstElementChild as HTMLElement;
  const toggle = header.querySelector<HTMLButtonElement>('#mobile-menu-toggle');
  toggle?.addEventListener('click', () => {
    const open = !header.classList.contains('menu-open');
    header.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.body.insertBefore(header, document.body.firstChild);
  mountDashboardEnhancements();
}

function mountDashboardEnhancements(): void {
  mountRealmBranding();
  mountThemeSelect({ hostId: 'theme-picker' });
  void mountUserDropdown();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountDashboardChrome);
  } else {
    mountDashboardChrome();
  }
}
