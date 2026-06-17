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

  // Donate button: hide whenever the realm doesn't explicitly opt in.
  setHiddenAll('.donate-cta', b.showDonate !== true);

  // Authentik SSO button: visible by default, hidden when the realm opts out.
  setHiddenAll('#btn-sso-authentik', b.showAuthentikSso === false);

  // Tag <body> so realm-specific CSS rules can hang off it if needed.
  for (const r of REALM_LIST) {
    document.body.classList.remove(`cr-realm-${r.id}`);
  }
  document.body.classList.add(`cr-realm-${realm.id}`);
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
