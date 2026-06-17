// Per-realm branding overrides. Reads the active realm's `branding` block
// from the registry and swaps the DOM elements affected by it:
//
//   - <img class="header-logo">    ← .branding.logoSrc
//   - <img class="main-logo">      ← .branding.logoSrc
//   - <title>                       ← .branding.brandText
//   - meta[property=og:title]       ← .branding.brandText
//   - <img class="header-logo-btn"> alt + title attrs
//   - .donate-cta                   ← hidden unless .branding.showDonate
//   - #btn-sso-authentik            ← hidden unless .branding.showAuthentikSso
//   - .community-link.discord href  ← .branding.discordUrl
//   - .community-link.github href   ← .branding.githubUrl
//
// Lives in src/ui/cryptic/ so the upstream index.html / src/main.ts stay
// pull-safe. Re-runs whenever the realm picker fires `cr-realm-change` so
// switching mid-session takes effect immediately.

import { getActiveRealm, REALM_LIST, type RealmContent } from '../../sim/realms';

/** Per-realm overrides for the upstream :root tokens. Keeps the site's
 *  primary colour, panel gradient, and border tied to the active realm's
 *  identity. Claudecraft skips this — the upstream :root defaults apply. */
const REALM_COLOR_TOKENS: Record<string, Record<string, string>> = {
  infernal: {
    '--gold': '#d4442a',
    '--gold-dim': '#8b2e1c',
    '--border': '#6b2418',
    '--panel-bg': 'linear-gradient(170deg, rgba(26,10,10,0.95) 0%, rgba(10,5,5,0.95) 60%, rgba(5,2,2,0.95) 100%)',
    '--color-primary-glow': 'rgba(212, 68, 42, 0.22)',
    '--color-primary-glow-heavy': 'rgba(212, 68, 42, 0.45)',
  },
  classic: {
    '--gold': '#4a9eff',
    '--gold-dim': '#2a5a8b',
    '--border': '#264363',
    '--panel-bg': 'linear-gradient(170deg, rgba(15,26,42,0.95) 0%, rgba(8,15,26,0.95) 60%, rgba(4,8,16,0.95) 100%)',
    '--color-primary-glow': 'rgba(74, 158, 255, 0.22)',
    '--color-primary-glow-heavy': 'rgba(74, 158, 255, 0.45)',
  },
  dominion: {
    '--gold': '#3ad6c8',
    '--gold-dim': '#1a8c80',
    '--border': '#1f5a55',
    '--panel-bg': 'linear-gradient(170deg, rgba(2,22,26,0.95) 0%, rgba(2,10,13,0.95) 60%, rgba(1,5,7,0.95) 100%)',
    '--color-primary-glow': 'rgba(58, 214, 200, 0.22)',
    '--color-primary-glow-heavy': 'rgba(58, 214, 200, 0.45)',
  },
  arcane: {
    '--gold': '#a855f7',
    '--gold-dim': '#6b2fa0',
    '--border': '#4d2675',
    '--panel-bg': 'linear-gradient(170deg, rgba(21,8,31,0.95) 0%, rgba(10,5,16,0.95) 60%, rgba(5,2,10,0.95) 100%)',
    '--color-primary-glow': 'rgba(168, 85, 247, 0.22)',
    '--color-primary-glow-heavy': 'rgba(168, 85, 247, 0.45)',
  },
};

/** Reset to base (claudecraft / upstream) tokens by clearing inline overrides. */
const RESET_TOKENS = [
  '--gold', '--gold-dim', '--border', '--panel-bg',
  '--color-primary-glow', '--color-primary-glow-heavy',
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

function setHiddenAll(selector: string, hidden: boolean): void {
  document.querySelectorAll(selector).forEach((el) => {
    (el as HTMLElement).style.display = hidden ? 'none' : '';
  });
}

function applyTo(realm: RealmContent): void {
  const b = realm.branding ?? {};

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
    // Visible header text on the homepage hero / SR-only h1
    document.querySelectorAll('.visually-hidden').forEach((el) => {
      if ((el.textContent ?? '').trim().toLowerCase().includes('claudecraft')) {
        el.textContent = b.brandText!;
      }
    });
    setAttrAll('.header-logo-btn img', 'alt', b.brandText);
    setAttrAll('.main-logo', 'alt', b.brandText);
  }

  if (b.discordUrl !== undefined) {
    setHrefAll('.community-link.discord', b.discordUrl);
  }
  if (b.githubUrl !== undefined) {
    setHrefAll('.community-link.github', b.githubUrl);
  }

  // Donate button + community + footer-social-row links: only the claudecraft
  // realm surfaces them. Other realms hide every donate / github / discord
  // entry across .community-link, .donate-cta, and .footer-social-row .social-link.
  // (Earlier passes missed .social-link — that's why the footer Donate kept
  //  showing on themed realms.)
  setHiddenAll('.donate-cta', b.showDonate !== true);
  const wantsCommunity = realm.id === 'claudecraft' && b.showDonate === true;
  setHiddenAll('.community-link.donate', !wantsCommunity);
  setHiddenAll('.community-link.github', !wantsCommunity);
  setHiddenAll('.community-link.discord', !wantsCommunity);
  // Footer social row (the homepage-footer block).
  setHiddenAll('.footer-social-row .social-link.donate', !wantsCommunity);
  setHiddenAll('.footer-social-row .social-link[href*="github"]', !wantsCommunity);
  setHiddenAll('.footer-social-row .social-link[href*="discord"]', !wantsCommunity);
  // If everything in the row is hidden, hide the row itself so the empty
  // border doesn't sit at the bottom of the page.
  setHiddenAll('.footer-social-row', !wantsCommunity);

  // Authentik SSO button: visible by default, hidden when the realm opts out.
  setHiddenAll('#btn-sso-authentik', b.showAuthentikSso === false);

  // Tag <body> so realm-specific CSS rules can hang off it if needed.
  for (const r of REALM_LIST) {
    document.body.classList.remove(`cr-realm-${r.id}`);
  }
  document.body.classList.add(`cr-realm-${realm.id}`);

  // Apply per-realm overrides for the upstream :root color tokens.
  // Clearing first lets us return to claudecraft defaults cleanly.
  for (const tok of RESET_TOKENS) document.documentElement.style.removeProperty(tok);
  const overrides = REALM_COLOR_TOKENS[realm.id];
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      document.documentElement.style.setProperty(key, value);
    }
  }

  // Loading screen: when the realm ships one, swap any element whose src
  // currently points at the upstream loading-screen.jpg.
  if (b.loadingScreenSrc) {
    document.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') ?? '';
      if (src.includes('loading-screen.jpg') || src.includes('LOADINGSCREEN.png')) {
        img.setAttribute('src', b.loadingScreenSrc!);
      }
    });
    // Stash for any boot-path consumer that reads it from CSS.
    document.documentElement.style.setProperty(
      '--cr-loading-screen', `url(${JSON.stringify(b.loadingScreenSrc)})`,
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
  // Theme picker fires this on pick. Re-apply branding immediately.
  window.addEventListener('cr-realm-change', apply);
}

/** Fire from the theme picker so other modules (branding, manifest loader)
 *  can react in lock-step. Re-exported here so consumers only import from one
 *  place. */
export function emitRealmChange(): void {
  window.dispatchEvent(new CustomEvent('cr-realm-change'));
}
