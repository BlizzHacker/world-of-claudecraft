import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const navJs = readFileSync(new URL('../public/nav.js', import.meta.url), 'utf8').replace(
  /\r\n/g,
  '\n',
);
// Cache-busting copy of nav.js referenced by every standalone page; must stay
// byte-identical to nav.js (regenerate by copying nav.js to a new nav.v<ts>m.js
// and repointing the pages when the nav changes).
const NAV_VERSIONED_FILE = 'nav.v1787428220m.js';
const navVersionedJs = readFileSync(
  new URL(`../public/${NAV_VERSIONED_FILE}`, import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');
const dashboardChromeTs = readFileSync(
  new URL('../src/ui/cryptic/dashboard_chrome.ts', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');
const landingTs = readFileSync(new URL('../src/landing.ts', import.meta.url), 'utf8').replace(
  /\r\n/g,
  '\n',
);
const mainTs = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8').replace(
  /\r\n/g,
  '\n',
);
const userMainTs = readFileSync(new URL('../src/user/main.ts', import.meta.url), 'utf8').replace(
  /\r\n/g,
  '\n',
);
const moderatorMainTs = readFileSync(
  new URL('../src/moderator/main.ts', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(
  /\r\n/g,
  '\n',
);
const linksHtml = readFileSync(new URL('../public/links.html', import.meta.url), 'utf8').replace(
  /\r\n/g,
  '\n',
);
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

describe('site and dashboard navigation', () => {
  it('uses direct document URLs for standalone and dashboard nav pages', () => {
    for (const source of [navJs, navVersionedJs, dashboardChromeTs]) {
      expect(source).toContain("href: '/links.html'");
      expect(source).toContain("href: '/whitepaper.html'");
      expect(source).toContain("href: '/contributions.html'");
      expect(source).not.toContain("href: '/#links'");
      expect(source).not.toContain("href: '/#whitepaper'");
      expect(source).not.toContain("href: '/#contributions'");
      // The wiki is the guide SPA at /wiki, not the retired wiki.html shell.
      expect(source).toContain("href: '/wiki'");
      expect(source).not.toContain("href: '/wiki.html'");
    }
    // The versioned copy is byte-identical to nav.js (same single source).
    expect(navVersionedJs).toBe(navJs);
  });

  it('lists Terms and Privacy in the shared nav and mounts it on the legal pages', () => {
    for (const source of [navJs, navVersionedJs]) {
      expect(source).toContain("href: '/terms'");
      expect(source).toContain("href: '/privacy'");
    }
    const pages = [
      'terms.html',
      'privacy.html',
      'links.html',
      'wiki.html',
      'whitepaper.html',
      'contributions.html',
    ];
    for (const page of pages) {
      const html = readFileSync(new URL(`../public/${page}`, import.meta.url), 'utf8');
      expect(html, `${page} must render the shared nav`).toContain('data-cr-nav');
      expect(html, `${page} must load the versioned nav script`).toContain(
        `<script src="/${NAV_VERSIONED_FILE}" defer></script>`,
      );
    }
  });

  it('remounts dashboard chrome after account and moderator body rerenders', () => {
    expect(dashboardChromeTs).toContain("p.startsWith('/me') || p === '/user.html'");
    expect(dashboardChromeTs).toContain('data-cr-main-menu');
    expect(dashboardChromeTs).toContain('class="mobile-menu-toggle"');
    expect(dashboardChromeTs).toContain('class="header-menu-container"');
    expect(dashboardChromeTs).toContain('class="donate-cta"');
    expect(dashboardChromeTs).toContain("import { mountRealmBranding } from './branding';");
    expect(dashboardChromeTs).toContain("import { mountThemeSelect } from './theme_select';");
    expect(dashboardChromeTs).toContain("import { mountUserDropdown } from './user_dropdown';");
    expect(dashboardChromeTs).toContain('id="theme-picker"');
    expect(dashboardChromeTs).toContain("mountThemeSelect({ hostId: 'theme-picker' });");
    expect(dashboardChromeTs).not.toContain('portalLinks');
    expect(dashboardChromeTs).not.toContain('nav-sep');

    for (const source of [userMainTs, moderatorMainTs]) {
      expect(source).toContain(
        "import { mountDashboardChrome } from '../ui/cryptic/dashboard_chrome';",
      );
      const rerenders = source.match(/document\.body\.innerHTML = `/g) ?? [];
      const remounts = source.match(/mountDashboardChrome\(\);/g) ?? [];
      expect(rerenders.length).toBeGreaterThan(0);
      expect(remounts.length).toBeGreaterThanOrEqual(rerenders.length);
    }
  });

  it('only switches to view ids that exist as sections in index.html', () => {
    // Switching to a view id with no matching section hides every view and
    // blanks the page (the Wiki/Contributions/Links/White Paper bug). Pin that
    // every id named by main.ts switchMainView and landing.ts VIEWS is a real
    // element in index.html.
    const mainViews = /const views = \[([^\]]+)\]/.exec(mainTs)?.[1] ?? '';
    const landingViews = /const VIEWS = \[([^\]]+)\]/.exec(landingTs)?.[1] ?? '';
    const ids = [...`${mainViews},${landingViews}`.matchAll(/'#([a-z-]+)'/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(5);
    for (const id of ids) {
      expect(indexHtml, `index.html must contain a section with id="${id}"`).toContain(
        `id="${id}"`,
      );
    }
    // The removed phantom views stay removed: navigation to these documents is
    // a real page load, never an in-page view switch.
    for (const phantom of [
      '#wiki-view',
      '#contributions-view',
      '#links-view',
      '#whitepaper-view',
    ]) {
      expect(ids).not.toContain(phantom.slice(1));
    }
  });

  it('keeps the public footer on Cryptic versioning and Diabl0 network links', () => {
    expect(packageJson.version).toBe('0.35.1-cr.1');
    expect(indexHtml).toContain('<div id="game-version">v0.35.1-cr.1</div>');
    expect(indexHtml).toContain('ClaudeCraft target v0.35.1');

    for (const source of [indexHtml, linksHtml]) {
      expect(source).toContain('https://diabl0.net');
      expect(source).not.toContain('https://diablo.net');
      expect(source).not.toContain('Diablo.net');
    }
  });
});
