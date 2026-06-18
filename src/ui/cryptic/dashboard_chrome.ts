// Adds a top-of-dashboard chrome bar with Back, Home, switch-dashboard links
// to /admin, /mod, /me when running inside any of those SPAs. Self-mounts on
// DOMContentLoaded; lookup target by URL pathname.

const CHROME_ID = 'cr-dash-chrome';

function pageKind(): 'admin' | 'mod' | 'me' | null {
  const p = window.location.pathname;
  if (p.startsWith('/admin')) return 'admin';
  if (p.startsWith('/mod')) return 'mod';
  if (p.startsWith('/me')) return 'me';
  return null;
}

function buildHtml(kind: 'admin' | 'mod' | 'me'): string {
  const links: { href: string; label: string; current: boolean }[] = [
    { href: '/me/', label: '👤 My Account', current: kind === 'me' },
    { href: '/mod/', label: '⛨ Moderator', current: kind === 'mod' },
    { href: '/admin/', label: '⚙ Admin', current: kind === 'admin' },
  ];
  return `
    <div id="${CHROME_ID}" class="cr-dash-chrome">
      <a class="cr-dash-back" href="/" title="Back to homepage">← Back to Cryptic Realm</a>
      <nav class="cr-dash-nav">
        ${links.map((l) => `
          <a class="cr-dash-nav-item${l.current ? ' current' : ''}" href="${l.href}">${l.label}</a>
        `).join('')}
      </nav>
    </div>
  `;
}

export function mountDashboardChrome(): void {
  if (typeof document === 'undefined') return;
  const kind = pageKind();
  if (!kind) return;
  if (document.getElementById(CHROME_ID)) return;
  const host = document.createElement('div');
  host.innerHTML = buildHtml(kind);
  document.body.insertBefore(host.firstElementChild as Node, document.body.firstChild);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountDashboardChrome);
  } else {
    mountDashboardChrome();
  }
}
