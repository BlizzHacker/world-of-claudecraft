// Shared dashboard chrome — renders the SAME top navigation as the homepage
// header (index.html .homepage-header) so /me/, /mod/, and /admin/ match the
// home page instead of carrying a divergent menu. Because the dashboards are
// standalone pages (their own HTML + SPA, not index.html's in-page views), the
// document pages use normal URLs while pure SPA destinations still use the
// homepage hash routes handled by landing.ts/main.ts.
//
// Home is the canonical source of nav order/labels; keep this list in sync
// with the .nav-list in index.html. Self-mounts on DOMContentLoaded.

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
  const shared = (window as unknown as { CR_NAV_ITEMS?: { href: string; label: string }[] }).CR_NAV_ITEMS;
  if (Array.isArray(shared) && shared.length) {
    return shared.map((i) => ({ href: i.href, label: i.label }));
  }
  return [
    { href: '/#play', label: 'Play' },
    { href: '/#highscores', label: 'High Scores' },
    { href: '/wiki.html', label: 'Wiki' },
    { href: '/#news', label: 'News' },
    { href: '/contributions.html', label: 'Contributions' },
    { href: '/#download', label: 'Download' },
    { href: '/links.html', label: 'Links' },
    { href: '/whitepaper.html', label: 'White Paper' },
    { href: '/#login', label: 'Login/Register' },
  ];
}

// Dashboard portal links — highlights the current page.
function portalLinks(kind: PageKind): NavLink[] {
  return [
    { href: '/me/', label: 'My Account', current: kind === 'me' },
    { href: '/mod/', label: 'Moderator', current: kind === 'mod' },
    { href: '/admin/', label: 'Admin', current: kind === 'admin' },
  ];
}

function navItem(l: NavLink): string {
  const cls = `nav-link${l.current ? ' active' : ''}`;
  const aria = l.current ? ' aria-current="page"' : '';
  return `<li class="nav-item"><a class="${cls}" href="${l.href}"${aria}>${l.label}</a></li>`;
}

function buildHtml(kind: PageKind): string {
  const primary = primaryLinks().map(navItem).join('');
  const portal = portalLinks(kind).map(navItem).join('');
  return `
    <header class="homepage-header cr-dash-header" id="${CHROME_ID}">
      <div class="header-logo-container">
        <a class="header-logo-btn" href="/" title="Back to homepage" aria-label="Back to homepage">
          <img class="header-logo" src="/cr_logo_square.webp" alt="Cryptic Realm" />
        </a>
      </div>
      <nav class="homepage-nav" aria-label="Main navigation">
        <ul class="nav-list" role="list">
          ${primary}
          <li class="nav-sep" role="separator"></li>
          ${portal}
        </ul>
      </nav>
      <div class="header-actions"></div>
    </header>
  `;
}

// Self-contained styles using theme.css --cr-* tokens so the header is themed
// correctly on dashboard pages (which don't load index.html's inline CSS).
// Visually mirrors the homepage header: sticky bar, horizontal nav, gold
// accents, active/hover states.
const STYLE = `
  .cr-dash-header {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 20px;
    background: linear-gradient(180deg, rgba(28, 24, 16, 0.98) 0%, rgba(11, 11, 18, 0.95) 100%);
    border-bottom: 2px solid var(--cr-border, #4e3d1d);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
    position: sticky;
    top: 0;
    z-index: 50;
    font-family: var(--cr-font-ui, system-ui, sans-serif);
  }
  .cr-dash-header .header-logo-container { display: flex; align-items: center; flex-shrink: 0; }
  .cr-dash-header .header-logo-btn { display: flex; align-items: center; padding: 0; border: none; background: none; cursor: pointer; }
  .cr-dash-header .header-logo { height: 38px; width: auto; border-radius: 6px; transition: filter 0.2s; }
  .cr-dash-header .header-logo-btn:hover .header-logo { filter: brightness(1.15); }
  .cr-dash-header .homepage-nav { flex: 1; min-width: 0; }
  .cr-dash-header .nav-list {
    display: flex; flex-wrap: wrap; align-items: center; gap: 4px;
    margin: 0; padding: 0; list-style: none;
  }
  .cr-dash-header .nav-item { display: flex; }
  .cr-dash-header .nav-sep {
    width: 1px; align-self: stretch; margin: 4px 8px;
    background: var(--cr-border, #4e3d1d); opacity: 0.6;
  }
  .cr-dash-header .nav-link {
    display: inline-block; padding: 8px 12px; border-radius: 6px;
    color: var(--cr-text-dim, #c9bfa8); text-decoration: none;
    font-size: 14px; font-weight: 600; white-space: nowrap;
    background: none; border: none; cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }
  .cr-dash-header .nav-link:hover { color: var(--cr-gold, #d4af37); background: rgba(212, 175, 55, 0.08); }
  .cr-dash-header .nav-link.active {
    color: var(--cr-gold, #d4af37);
    background: rgba(212, 175, 55, 0.12);
    box-shadow: inset 0 -2px 0 var(--cr-gold, #d4af37);
  }
  @media (max-width: 640px) {
    .cr-dash-header { flex-wrap: wrap; padding: 8px 12px; }
    .cr-dash-header .nav-list { gap: 2px; }
    .cr-dash-header .nav-link { padding: 6px 9px; font-size: 13px; }
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
  if (document.getElementById(CHROME_ID)) return;
  ensureStyle();
  const host = document.createElement('div');
  host.innerHTML = buildHtml(kind);
  const header = host.firstElementChild as Node;
  document.body.insertBefore(header, document.body.firstChild);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountDashboardChrome);
  } else {
    mountDashboardChrome();
  }
}
