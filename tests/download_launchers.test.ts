// Download surface pins (src/ui/cryptic/download_launchers.ts): the store
// listing constants stay single-sourced and render as disabled badges while
// empty, and every shipped binary href lives under the persistent /downloads/
// store (server/main.ts serveDownloads) rather than the deploy-wiped dist root.

import { describe, expect, it } from 'vitest';
import {
  CHROME_WEB_STORE_URL,
  LAUNCHERS,
  MICROSOFT_STORE_URL,
  PLAY_TESTING_URL,
  STEAM_STORE_URL,
  STORE_LISTINGS,
  storeCardHtml,
} from '../src/ui/cryptic/download_launchers';

describe('store listing constants', () => {
  it('exports the four store constants, all empty until each listing goes live', () => {
    // Filling one in is a deliberate release step; this pin makes it a
    // conscious edit here too.
    expect(MICROSOFT_STORE_URL).toBe('');
    expect(PLAY_TESTING_URL).toBe('');
    expect(STEAM_STORE_URL).toBe('');
    expect(CHROME_WEB_STORE_URL).toBe('');
  });

  it('drives the Store listings grid from exactly those constants', () => {
    const byId = new Map(STORE_LISTINGS.map((s) => [s.id, s.url]));
    expect(byId.get('microsoft-store')).toBe(MICROSOFT_STORE_URL);
    expect(byId.get('google-play')).toBe(PLAY_TESTING_URL);
    expect(byId.get('steam')).toBe(STEAM_STORE_URL);
    expect(byId.get('chrome-web-store')).toBe(CHROME_WEB_STORE_URL);
    expect(STORE_LISTINGS).toHaveLength(4);
  });
});

describe('storeCardHtml', () => {
  it('renders an empty listing URL as a disabled badge, never a link', () => {
    for (const listing of STORE_LISTINGS.filter((s) => s.url === '')) {
      const html = storeCardHtml(listing);
      expect(html).toContain('cr-dl-disabled');
      expect(html).toContain('aria-disabled="true"');
      expect(html).not.toContain('<a ');
    }
  });

  it('renders a live listing URL as an external link', () => {
    const html = storeCardHtml({
      id: 'google-play',
      label: 'Google Play',
      badge: 'GP',
      url: 'https://play.google.com/apps/testing/com.crypticrealm',
      meta: 'closed testing track',
    });
    expect(html).toContain('href="https://play.google.com/apps/testing/com.crypticrealm"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('cr-dl-disabled');
  });
});

describe('launcher binary hrefs', () => {
  it('serves every direct binary from the persistent /downloads/ store', () => {
    const hrefs = LAUNCHERS.flatMap((l) => [
      l.primaryHref ?? '',
      l.secondaryHref ?? '',
      ...(l.actions ?? []).map((a) => a.href),
    ]).filter((href) => /\.(exe|apk|dmg|appimage|zip)$/i.test(href));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href, href).toMatch(/^\/downloads\//);
  });
});
