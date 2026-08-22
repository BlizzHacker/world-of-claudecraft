// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  extractDocFragment,
  normalizeSpaDocLinks,
  spaRouteForHref,
} from '../src/ui/cryptic/doc_fragment';

describe('SPA document fragments', () => {
  it('leaves real documents alone and maps only live SPA routes', () => {
    expect(spaRouteForHref('/links.html')).toBeNull();
    expect(spaRouteForHref('/whitepaper.html')).toBeNull();
    expect(spaRouteForHref('/contributions.html')).toBeNull();
    expect(spaRouteForHref('/wiki.html')).toBeNull();
    expect(spaRouteForHref('/')).toBe('play');
    expect(spaRouteForHref('/index.html')).toBe('play');
    expect(spaRouteForHref('/#downloads')).toBe('downloads');
    expect(spaRouteForHref('https://example.com/')).toBeNull();
  });

  it('strips standalone chrome and keeps document links navigating normally', () => {
    const html = extractDocFragment(`<!doctype html>
      <html><head><style>.bad{}</style><script>bad()</script></head><body>
      <nav><a href="/">Play</a></nav>
      <main>
        <h1>Official Links</h1>
        <a id="home" href="/index.html">Home</a>
        <a id="white" href="/whitepaper.html" target="_blank" rel="noopener">White Paper</a>
        <a id="contrib" href="/contributions.html">Contributions</a>
        <a id="external" href="https://solscan.io/token/abc" target="_blank">Solscan</a>
        <script>bad()</script>
      </main>
      </body></html>`);
    const host = document.createElement('div');
    host.innerHTML = html;

    expect(host.querySelector('script')).toBeNull();
    expect(host.querySelector('style')).toBeNull();
    expect(host.querySelector('nav')).toBeNull();
    expect(host.querySelector<HTMLAnchorElement>('#home')?.getAttribute('href')).toBe('/#play');
    expect(host.querySelector<HTMLAnchorElement>('#home')?.dataset.crSpaRoute).toBe('play');
    expect(host.querySelector<HTMLAnchorElement>('#white')?.getAttribute('href')).toBe(
      '/whitepaper.html',
    );
    expect(host.querySelector<HTMLAnchorElement>('#white')?.dataset.crSpaRoute).toBeUndefined();
    expect(host.querySelector<HTMLAnchorElement>('#white')?.getAttribute('target')).toBe('_blank');
    expect(host.querySelector<HTMLAnchorElement>('#contrib')?.getAttribute('href')).toBe(
      '/contributions.html',
    );
    expect(host.querySelector<HTMLAnchorElement>('#external')?.getAttribute('href')).toBe(
      'https://solscan.io/token/abc',
    );
  });

  it('can normalize an already-mounted fragment', () => {
    const host = document.createElement('div');
    host.innerHTML =
      '<a href="/index.html">Play</a><a href="/links.html">Links</a><a href="/api/status">Status</a>';
    normalizeSpaDocLinks(host);

    const links = host.querySelectorAll('a');
    expect(links[0].getAttribute('href')).toBe('/#play');
    expect(links[0].getAttribute('data-cr-spa-route')).toBe('play');
    expect(links[1].getAttribute('href')).toBe('/links.html');
    expect(links[1].hasAttribute('data-cr-spa-route')).toBe(false);
    expect(links[2].getAttribute('href')).toBe('/api/status');
  });
});
