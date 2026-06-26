// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const CR_WALLET = 'GncAXx6j38osJns395XZtf6rSA9MU3K1gwafTrHpBJpi';
const CR_TOKEN = '3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv';
const WOC_TOKEN = '3WjLscH2JsXLEFJZRA9z8ti8yRGxWGKbqymPd7UicRth';

function setupBrandingDom(): void {
  document.body.innerHTML = `
    <a class="donate-cta" href="https://github.com/sponsors/levy-street"><span>Donate</span></a>
    <a class="community-link donate" href="https://github.com/sponsors/levy-street"><span>Donate</span></a>
    <div class="footer-social-row">
      <a class="social-link donate" href="https://github.com/sponsors/levy-street"><span>Donate</span></a>
      <a class="social-link github" href="https://github.com/levy-street/world-of-claudecraft"><span>GitHub</span></a>
      <a class="social-link discord" href="https://discord.gg/GjhnUsBtw"><span>Discord</span></a>
    </div>
    <div id="token-ca">
      <span class="token-ca-label" data-i18n="mode.caLabel">$CR Contract Address</span>
      <button type="button" id="btn-copy-ca" data-ca="${CR_TOKEN}" data-i18n-aria="mode.caCopyAria">
        <code class="token-ca-addr">${WOC_TOKEN}</code>
      </button>
      <p class="token-ca-note" data-i18n="mode.caNote">$CR is the Cryptic Realm Solana SPL token.</p>
    </div>
  `;
}

describe('Cryptic realm branding crypto surfaces', () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    setupBrandingDom();
  });

  it('uses the Cryptic Realm Solana tip wallet and token outside Claudecraft', async () => {
    window.localStorage.setItem('cr_active_realm', 'infernal');
    const { mountRealmBranding } = await import('../src/ui/cryptic/branding');

    mountRealmBranding();

    const donate = document.querySelector<HTMLAnchorElement>('.donate-cta')!;
    expect(donate.href).toBe(`solana:${CR_WALLET}`);
    expect(donate.textContent).toContain('Tip $CR');
    expect(donate.style.display).toBe('');
    expect(donate.hasAttribute('data-i18n-title')).toBe(false);
    expect(donate.hasAttribute('data-i18n-aria')).toBe(false);
    expect(donate.querySelector('span')?.hasAttribute('data-i18n')).toBe(false);
    expect(document.querySelector<HTMLElement>('.token-ca-label')?.textContent).toBe('$CR Contract Address');
    expect(document.getElementById('btn-copy-ca')?.getAttribute('data-ca')).toBe(CR_TOKEN);
    expect(document.querySelector<HTMLElement>('.token-ca-addr')?.textContent).toBe(CR_TOKEN);
    expect(document.querySelector<HTMLElement>('.token-ca-note')?.textContent).toContain('Cryptic Realm Solana SPL token');
    expect(document.querySelector<HTMLElement>('.token-ca-label')?.hasAttribute('data-i18n')).toBe(false);
    expect(document.getElementById('btn-copy-ca')?.hasAttribute('data-i18n-aria')).toBe(false);
    expect(document.querySelector<HTMLElement>('.token-ca-note')?.hasAttribute('data-i18n')).toBe(false);
    expect(document.querySelector<HTMLAnchorElement>('.social-link.github')?.href).toBe('https://github.com/BlizzHacker/cryptic-realm');
    expect(document.querySelector<HTMLElement>('.social-link.github span')?.textContent).toBe('Cryptic Realm Source');
    expect(document.querySelector<HTMLElement>('.social-link.discord span')?.textContent).toBe('Cryptic Realm Discord');
  });

  it('keeps upstream sponsors and WOC token on Claudecraft', async () => {
    window.localStorage.setItem('cr_active_realm', 'claudecraft');
    const { mountRealmBranding } = await import('../src/ui/cryptic/branding');

    mountRealmBranding();

    const donate = document.querySelector<HTMLAnchorElement>('.donate-cta')!;
    expect(donate.href).toBe('https://github.com/sponsors/levy-street');
    expect(donate.textContent).toContain('Donate');
    expect(donate.getAttribute('data-i18n-title')).toBe('a11y.donateProject');
    expect(donate.querySelector('span')?.getAttribute('data-i18n')).toBe('nav.donate');
    expect(document.querySelector<HTMLElement>('.token-ca-label')?.textContent).toBe('$WOC Contract Address');
    expect(document.getElementById('btn-copy-ca')?.getAttribute('data-ca')).toBe(WOC_TOKEN);
    expect(document.querySelector<HTMLElement>('.token-ca-addr')?.textContent).toBe(WOC_TOKEN);
    expect(document.querySelector<HTMLElement>('.token-ca-label')?.hasAttribute('data-i18n')).toBe(false);
  });
});
