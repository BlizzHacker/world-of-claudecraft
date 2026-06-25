// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { extractDocFragment, normalizeSpaDocLinks, spaRouteForHref } from '../src/ui/cryptic/doc_fragment';

describe('SPA document fragments', () => {
  it('maps standalone document URLs to in-app routes', () => {
    expect(spaRouteForHref('/links.html')).toBe('links');
    expect(spaRouteForHref('/whitepaper.html')).toBe('whitepaper');
    expect(spaRouteForHref('/contributions.html')).toBe('contributions');
    expect(spaRouteForHref('/wiki.html')).toBe('wiki');
    expect(spaRouteForHref('/#whitepaper')).toBe('whitepaper');
    expect(spaRouteForHref('https://example.com/links.html')).toBeNull();
  });

  it('strips standalone chrome and rewrites internal document links', () => {
    const html = extractDocFragment(`<!doctype html>
      <html><head><style>.bad{}</style><script>bad()</script></head><body>
      <nav><a href="/">Play</a></nav>
      <main>
        <h1>Official Links</h1>
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
    expect(host.querySelector<HTMLAnchorElement>('#white')?.getAttribute('href')).toBe('/#whitepaper');
    expect(host.querySelector<HTMLAnchorElement>('#white')?.dataset.crSpaRoute).toBe('whitepaper');
    expect(host.querySelector<HTMLAnchorElement>('#white')?.hasAttribute('target')).toBe(false);
    expect(host.querySelector<HTMLAnchorElement>('#contrib')?.getAttribute('href')).toBe('/#contributions');
    expect(host.querySelector<HTMLAnchorElement>('#external')?.getAttribute('href')).toBe('https://solscan.io/token/abc');
  });

  it('can normalize an already-mounted fragment', () => {
    const host = document.createElement('div');
    host.innerHTML = '<a href="/links.html">Links</a><a href="/api/status">Status</a>';
    normalizeSpaDocLinks(host);

    const links = host.querySelectorAll('a');
    expect(links[0].getAttribute('href')).toBe('/#links');
    expect(links[0].getAttribute('data-cr-spa-route')).toBe('links');
    expect(links[1].getAttribute('href')).toBe('/api/status');
  });
});
