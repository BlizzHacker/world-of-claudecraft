// Per-realm branding overrides. Reads the active realm's branding block and
// swaps the DOM elements affected by Cryptic Realm customization.

import './realm_env';
import { assetHostUrl } from '../../client_origin';
import { getActiveRealm, REALM_LIST, type RealmContent } from '../../sim/realms';
import { socialsForRealm } from '../../sim/realms/social_links';

const WOC_TOKEN_MINT = '3WjLscH2JsXLEFJZRA9z8ti8yRGxWGKbqymPd7UicRth';
const WOC_SPONSORS_URL = 'https://github.com/sponsors/levy-street';
const CR_TIP_LABEL = 'Tip $CR';

const REALM_COLOR_TOKENS: Record<string, Record<string, string>> = {
  infernal: {
    '--gold': '#d4442a',
    '--gold-dim': '#8b2e1c',
    '--border': '#6b2418',
    '--panel-bg':
      'linear-gradient(170deg, rgba(26,10,10,0.95) 0%, rgba(10,5,5,0.95) 60%, rgba(5,2,2,0.95) 100%)',
    '--color-primary-glow': 'rgba(212, 68, 42, 0.22)',
    '--color-primary-glow-heavy': 'rgba(212, 68, 42, 0.45)',
  },
  classic: {
    '--gold': '#4a9eff',
    '--gold-dim': '#2a5a8b',
    '--border': '#264363',
    '--panel-bg':
      'linear-gradient(170deg, rgba(15,26,42,0.95) 0%, rgba(8,15,26,0.95) 60%, rgba(4,8,16,0.95) 100%)',
    '--color-primary-glow': 'rgba(74, 158, 255, 0.22)',
    '--color-primary-glow-heavy': 'rgba(74, 158, 255, 0.45)',
  },
  dominion: {
    '--gold': '#3ad6c8',
    '--gold-dim': '#1a8c80',
    '--border': '#1f5a55',
    '--panel-bg':
      'linear-gradient(170deg, rgba(2,22,26,0.95) 0%, rgba(2,10,13,0.95) 60%, rgba(1,5,7,0.95) 100%)',
    '--color-primary-glow': 'rgba(58, 214, 200, 0.22)',
    '--color-primary-glow-heavy': 'rgba(58, 214, 200, 0.45)',
  },
  arcane: {
    '--gold': '#a855f7',
    '--gold-dim': '#6b2fa0',
    '--border': '#4d2675',
    '--panel-bg':
      'linear-gradient(170deg, rgba(21,8,31,0.95) 0%, rgba(10,5,16,0.95) 60%, rgba(5,2,10,0.95) 100%)',
    '--color-primary-glow': 'rgba(168, 85, 247, 0.22)',
    '--color-primary-glow-heavy': 'rgba(168, 85, 247, 0.45)',
  },
};

const RESET_TOKENS = [
  '--gold',
  '--gold-dim',
  '--border',
  '--panel-bg',
  '--color-primary-glow',
  '--color-primary-glow-heavy',
];

function setAttrAll(selector: string, attr: string, value: string): void {
  document.querySelectorAll(selector).forEach((el) => {
    el.setAttribute(attr, value);
  });
}

function setHrefAll(selector: string, value: string): void {
  document.querySelectorAll(selector).forEach((el) => {
    (el as HTMLAnchorElement).href = value;
  });
}

function setLinkTextAll(selector: string, value: string): void {
  document.querySelectorAll<HTMLAnchorElement>(selector).forEach((a) => {
    const span = a.querySelector('span');
    if (span) span.textContent = value;
  });
}

function setTextAll(selector: string, value: string): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    el.textContent = value;
  });
}

function setLinkA11yAll(selector: string, title: string, aria = title): void {
  document.querySelectorAll<HTMLAnchorElement>(selector).forEach((a) => {
    a.title = title;
    a.setAttribute('aria-label', aria);
  });
}

function setHiddenAll(selector: string, hidden: boolean): void {
  document.querySelectorAll(selector).forEach((el) => {
    (el as HTMLElement).style.display = hidden ? 'none' : '';
  });
}

function sanitizePrivateGithubLinks(): void {
  document
    .querySelectorAll<HTMLAnchorElement>('a[href*="github.com"][href*="cryptic-realm"]')
    .forEach((a) => {
      a.href = '/contributions.html';
      a.removeAttribute('target');
      a.removeAttribute('rel');
      a.title = 'Cryptic Realm contributions';
      a.setAttribute('aria-label', 'Open Cryptic Realm contributions');
      const span = a.querySelector('span');
      if (span) span.textContent = 'Contributions';
      else if ((a.textContent ?? '').trim()) a.textContent = 'Contributions';
    });
}

function applyDonateLinks(realm: RealmContent): void {
  const socials = socialsForRealm(realm.id);
  const tipWallet = socials.tipWalletSolana;
  const href = tipWallet ? `solana:${tipWallet}` : WOC_SPONSORS_URL;
  const label = tipWallet ? CR_TIP_LABEL : 'Donate';
  const title = tipWallet
    ? `${CR_TIP_LABEL} or SOL to ${tipWallet.slice(0, 4)}...${tipWallet.slice(-4)}`
    : 'Support the project';
  const aria = tipWallet
    ? `${CR_TIP_LABEL} or SOL to support Cryptic Realm at ${tipWallet}`
    : 'Donate to support Cryptic Realm';

  document
    .querySelectorAll<HTMLAnchorElement>('.donate-cta, .social-link.donate, .community-link.donate')
    .forEach((a) => {
      a.href = href;
      a.title = title;
      a.setAttribute('aria-label', aria);
      if (tipWallet) {
        a.removeAttribute('data-i18n-title');
        a.removeAttribute('data-i18n-aria');
        a.removeAttribute('target');
      } else {
        a.setAttribute('data-i18n-title', 'a11y.donateProject');
        a.setAttribute('data-i18n-aria', 'a11y.donateProject');
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      const span = a.querySelector('span');
      if (span) {
        if (tipWallet) span.removeAttribute('data-i18n');
        else span.setAttribute('data-i18n', 'nav.donate');
        span.textContent = label;
      }
    });
}

function applyTokenCard(realm: RealmContent): void {
  const container = document.getElementById('token-ca');
  const btn = document.getElementById('btn-copy-ca') as HTMLButtonElement | null;
  const label = container?.querySelector<HTMLElement>('.token-ca-label') ?? null;
  const addr = container?.querySelector<HTMLElement>('.token-ca-addr') ?? null;
  const note = container?.querySelector<HTMLElement>('.token-ca-note') ?? null;
  if (!container || !btn || !label || !addr || !note) return;

  const socials = socialsForRealm(realm.id);
  label.removeAttribute('data-i18n');
  note.removeAttribute('data-i18n');
  btn.removeAttribute('data-i18n-aria');
  if (socials.tipWalletSolana && socials.tokenMintSolana) {
    label.textContent = '$CR Contract Address';
    btn.dataset.ca = socials.tokenMintSolana;
    btn.setAttribute('aria-label', 'Copy Cryptic Realm token mint');
    addr.textContent = socials.tokenMintSolana;
    note.textContent =
      '$CR is the Cryptic Realm Solana SPL token for gameplay utility, cosmetics, achievements, and account records. It is not needed to play.';
    return;
  }

  label.textContent = '$WOC Contract Address';
  btn.dataset.ca = WOC_TOKEN_MINT;
  btn.setAttribute('aria-label', 'Copy contract address');
  addr.textContent = WOC_TOKEN_MINT;
  note.textContent =
    'WOC is our community token. It is not needed to play. Join Discord to discuss the WOC utility and flywheel.';
}

function applyWalletSurfaces(realm: RealmContent): void {
  const isClaudecraft = realm.id === 'claudecraft';
  setHiddenAll('.cs-wallet, .cs-wallet-hidden-note, .account-wallet-card', !isClaudecraft);
  setHiddenAll('#cr-wallet-panel', isClaudecraft);

  if (isClaudecraft) {
    setTextAll('.cs-wallet-label', '$WOC Wallet');
    setTextAll('.account-wallet-card .account-card-title', '$WOC Wallet');
    return;
  }

  setTextAll('.cs-wallet-label', '$CR Wallet');
  setTextAll('.account-wallet-card .account-card-title', '$CR Wallet');
}

function applyTo(realm: RealmContent): void {
  const b = realm.branding ?? {};
  const socials = socialsForRealm(realm.id);
  const hasTipWallet = Boolean(socials.tipWalletSolana);

  if (b.logoSrc) {
    setAttrAll('.header-logo', 'src', b.logoSrc);
    setAttrAll('.main-logo', 'src', b.logoSrc);
    setAttrAll('link[rel="apple-touch-icon"]', 'href', b.logoSrc);
  }

  if (b.brandText) {
    document.title = b.brandText;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', b.brandText);
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', b.brandText);
    document.querySelectorAll('.visually-hidden').forEach((el) => {
      if ((el.textContent ?? '').trim().toLowerCase().includes('claudecraft')) {
        el.textContent = b.brandText!;
      }
    });
    setAttrAll('.header-logo-btn img', 'alt', b.brandText);
    setAttrAll('.main-logo', 'alt', b.brandText);
  }

  if (b.discordUrl !== undefined) setHrefAll('.community-link.discord', b.discordUrl);
  if (b.discordUrl !== undefined)
    setHrefAll('.social-link.discord, [data-cr-social="discord"]', b.discordUrl);
  if (b.githubUrl !== undefined) setHrefAll('.community-link.github', b.githubUrl);
  if (b.githubUrl !== undefined)
    setHrefAll('.social-link.github, [data-cr-social="github"]', b.githubUrl);

  const isClaudecraft = realm.id === 'claudecraft';
  setLinkA11yAll(
    '.community-link.discord, .social-link.discord, [data-cr-social="discord"]',
    isClaudecraft
      ? 'Join the World of ClaudeCraft Discord community'
      : 'Join the Cryptic Realm Discord community',
  );
  setLinkA11yAll(
    '.community-link.github, .social-link.github, [data-cr-social="github"]',
    isClaudecraft
      ? 'Open the World of ClaudeCraft GitHub project'
      : 'Open Cryptic Realm contributions',
  );
  setLinkTextAll(
    '.footer-social-row .social-link.github, .footer-social-row [data-cr-social="github"]',
    isClaudecraft ? 'Upstream Project' : 'Contributions',
  );
  setLinkTextAll(
    '.footer-social-row .social-link.discord, .footer-social-row [data-cr-social="discord"]',
    isClaudecraft ? 'Join the Discord' : 'Cryptic Realm Discord',
  );
  if (!isClaudecraft) {
    document
      .querySelectorAll<HTMLAnchorElement>(
        '.community-link.github, .social-link.github, [data-cr-social="github"]',
      )
      .forEach((a) => {
        a.href = '/contributions.html';
        a.removeAttribute('target');
        a.removeAttribute('rel');
      });
  }

  const wantsUpstreamCommunity = isClaudecraft && b.showDonate === true;
  const wantsDiscord = Boolean(b.discordUrl || socials.discord);
  setHiddenAll('.donate-cta', !(b.showDonate === true || hasTipWallet));
  setHiddenAll('.community-link.donate', !(wantsUpstreamCommunity || hasTipWallet));
  setHiddenAll('.community-link.github', !wantsUpstreamCommunity);
  setHiddenAll('.community-link.discord', !wantsDiscord);
  setHiddenAll('.footer-social-row .social-link.donate', !(wantsUpstreamCommunity || hasTipWallet));
  setHiddenAll(
    '.footer-social-row .social-link.github, .footer-social-row [data-cr-social="github"]',
    !wantsUpstreamCommunity,
  );
  setHiddenAll(
    '.footer-social-row .social-link.discord, .footer-social-row [data-cr-social="discord"]',
    !wantsDiscord,
  );
  setHiddenAll('.footer-social-row', !(wantsUpstreamCommunity || hasTipWallet || wantsDiscord));

  setHiddenAll('#btn-sso-authentik', b.showAuthentikSso === false);

  for (const r of REALM_LIST) {
    document.body.classList.remove(`cr-realm-${r.id}`);
  }
  document.body.classList.add(`cr-realm-${realm.id}`);

  applyDonateLinks(realm);
  applyTokenCard(realm);
  applyWalletSurfaces(realm);
  sanitizePrivateGithubLinks();

  const socialPairs: [string, string | undefined][] = [
    ['x.com/WoClaudecraft', socials.x],
    ['discord.gg/GjhnUsBtw', socials.discord],
    ['github.com/levy-street/world-of-claudecraft', socials.github],
    ['instagram.com/worldofclaudecraft', socials.instagram],
    ['tiktok.com/@worldofclaudecraft', socials.tiktok],
    ['youtube.com/@WoClaudeCraft', socials.youtube],
    ['reddit.com/r/WorldofClaudecraft', socials.reddit],
  ];
  for (const [upstreamPattern, newUrl] of socialPairs) {
    if (!newUrl) continue;
    document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
      if (a.href.includes(upstreamPattern)) a.href = newUrl;
    });
  }

  for (const tok of RESET_TOKENS) document.documentElement.style.removeProperty(tok);
  const overrides = REALM_COLOR_TOKENS[realm.id];
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      document.documentElement.style.setProperty(key, value);
    }
  }

  if (b.loadingScreenSrc) {
    // assetHostUrl: these are set at RUNTIME, so they bypass any build-time URL
    // rewrite a foreign-origin bundle applies to the emitted HTML/CSS. Routing
    // them through the shared origin policy keeps the loading art resolvable
    // there (page-relative when the bundle ships it, the remote origin
    // otherwise); identity on the website build.
    const loadingSrc = assetHostUrl(b.loadingScreenSrc);
    document.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') ?? '';
      if (src.includes('loading-screen.jpg') || src.includes('LOADINGSCREEN.png')) {
        img.setAttribute('src', loadingSrc);
      }
    });
    document.documentElement.style.setProperty(
      '--cr-loading-screen',
      `url(${JSON.stringify(loadingSrc)})`,
    );
  }
}

export function mountRealmBranding(): void {
  if (typeof document === 'undefined') return;
  const apply = () => applyTo(getActiveRealm());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
  window.addEventListener('cr-realm-change', apply);
}

export function emitRealmChange(): void {
  window.dispatchEvent(new CustomEvent('cr-realm-change'));
}
