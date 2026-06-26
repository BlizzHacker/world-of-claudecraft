import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const navJs = readFileSync(new URL('../public/nav.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const navVersionedJs = readFileSync(new URL('../public/nav.v1782009763m.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const dashboardChromeTs = readFileSync(new URL('../src/ui/cryptic/dashboard_chrome.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const userMainTs = readFileSync(new URL('../src/user/main.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const moderatorMainTs = readFileSync(new URL('../src/moderator/main.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('site and dashboard navigation', () => {
  it('uses direct document URLs for standalone and dashboard nav pages', () => {
    for (const source of [navJs, navVersionedJs, dashboardChromeTs]) {
      expect(source).toContain("href: '/links.html'");
      expect(source).toContain("href: '/whitepaper.html'");
      expect(source).toContain("href: '/contributions.html'");
      expect(source).not.toContain("href: '/#links'");
      expect(source).not.toContain("href: '/#whitepaper'");
      expect(source).not.toContain("href: '/#contributions'");
    }
  });

  it('remounts dashboard chrome after account and moderator body rerenders', () => {
    expect(dashboardChromeTs).toContain("p.startsWith('/me') || p === '/user.html'");
    expect(dashboardChromeTs).toContain('data-cr-main-menu');
    expect(dashboardChromeTs).toContain('class="mobile-menu-toggle"');
    expect(dashboardChromeTs).toContain('class="header-menu-container"');
    expect(dashboardChromeTs).toContain('class="donate-cta"');
    expect(dashboardChromeTs).not.toContain('portalLinks');
    expect(dashboardChromeTs).not.toContain('nav-sep');

    for (const source of [userMainTs, moderatorMainTs]) {
      expect(source).toContain("import { mountDashboardChrome } from '../ui/cryptic/dashboard_chrome';");
      const rerenders = source.match(/document\.body\.innerHTML = `/g) ?? [];
      const remounts = source.match(/mountDashboardChrome\(\);/g) ?? [];
      expect(rerenders.length).toBeGreaterThan(0);
      expect(remounts.length).toBeGreaterThanOrEqual(rerenders.length);
    }
  });
});
