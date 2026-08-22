// Rebrands public/links.html in place for non-claudecraft realms. Run as a
// module loaded by links.html. Checks the active realm and rewrites the
// upstream brand strings to CR equivalents.

import './realm_env';
import { getActiveRealm } from '../../sim/realms';
import { socialsForRealm } from '../../sim/realms/social_links';

function rebrand(): void {
  const realm = getActiveRealm();
  if (realm.id === 'claudecraft') return; // pristine upstream copy
  const socials = socialsForRealm(realm.id);

  document.title = 'Cryptic Realm - Official Links';

  const setContent = (sel: string, value: string) => {
    document.querySelectorAll(sel).forEach((el) => el.setAttribute('content', value));
  };
  setContent(
    'meta[name="description"]',
    'The only official channels for Cryptic Realm. Play the game and follow us on X, Facebook, Instagram, TikTok, YouTube, Reddit, and Discord. If a channel is not listed here, it is not us.',
  );
  setContent('meta[property="og:site_name"]', 'Cryptic Realm');
  setContent('meta[property="og:title"]', 'Cryptic Realm - Official Links');
  setContent(
    'meta[property="og:description"]',
    'The only official channels for Cryptic Realm. If a channel is not listed here, it is not us.',
  );
  setContent('meta[property="og:url"]', socials.links);
  setContent('meta[property="og:image"]', 'https://crypticrealm.com/cryptic-realm-logo.png');
  setContent('meta[property="og:image:alt"]', 'Cryptic Realm');
  setContent('meta[name="twitter:title"]', 'Cryptic Realm - Official Links');
  setContent(
    'meta[name="twitter:description"]',
    'The only official channels for Cryptic Realm. If a channel is not listed here, it is not us.',
  );
  setContent('meta[name="twitter:image"]', 'https://crypticrealm.com/cryptic-realm-logo.png');
  setContent('meta[name="twitter:image:alt"]', 'Cryptic Realm');

  document
    .querySelectorAll('link[rel="canonical"]')
    .forEach((el) => el.setAttribute('href', socials.links));

  // Replace plain-text "World of ClaudeCraft" mentions throughout the body
  // (titles, headings, card labels) with "Cryptic Realm". Done with a
  // TreeWalker so we only touch text nodes, never attributes.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  // eslint-disable-next-line no-cond-assign
  while ((n = walker.nextNode())) nodes.push(n as Text);
  for (const t of nodes) {
    if (!t.nodeValue) continue;
    const before = t.nodeValue;
    const after = before
      .replace(/World of ClaudeCraft/g, 'Cryptic Realm')
      .replace(/WoClaudecraft/g, 'CrypticMMO');
    if (after !== before) t.nodeValue = after;
  }
  // Rewrite all anchor hrefs that point at upstream socials to CR socials.
  // (Branding overlay does this for the main homepage; we redo it here for
  //  the links page which is a separate Vite entry.)
  const pairs: [string, string | undefined][] = [
    ['x.com/WoClaudecraft', socials.x],
    ['instagram.com/worldofclaudecraft', socials.instagram],
    ['tiktok.com/@worldofclaudecraft', socials.tiktok],
    ['youtube.com/@WoClaudeCraft', socials.youtube],
    ['reddit.com/r/WorldofClaudecraft', socials.reddit],
    ['discord.gg/GjhnUsBtw', socials.discord],
    ['github.com/levy-street/world-of-claudecraft', socials.github],
    ['worldofclaudecraft.com', 'https://crypticrealm.com'],
    ['worldofclaudecraft.com/links', socials.links],
  ];
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
    if (a.hostname.endsWith('github.com') && a.pathname.includes('cryptic-realm')) {
      a.href = '/contributions.html';
      a.removeAttribute('target');
      a.removeAttribute('rel');
      return;
    }
    for (const [pattern, replacement] of pairs) {
      if (!replacement) continue;
      if (a.href.includes(pattern)) {
        a.href = replacement;
      }
    }
  });

  // Inject a Facebook card if not present (claudcraft layout lacks one).
  const grid = document.querySelector('.links-grid, [class*="grid"], main, body');
  if (grid && socials.facebook && !document.querySelector('a[href*="facebook.com"]')) {
    const fb = document.createElement('a');
    fb.href = socials.facebook;
    fb.target = '_blank';
    fb.rel = 'noopener noreferrer';
    fb.textContent = 'Facebook - /crypticmmo';
    fb.className = 'cr-link-card';
    fb.style.cssText =
      'display:block;padding:14px 18px;margin:8px 0;border:1px solid #c8a838;border-radius:10px;color:#ffd100;text-decoration:none;font-family:Cinzel,serif;';
    grid.appendChild(fb);
  }

  // Add a Solana tip card, but only on a layout that lacks its own: the CR
  // links page ships a first-class tip card (#btn-tip) with the address, QR
  // and copy button, and injecting a second card would duplicate it.
  if (
    socials.tipWalletSolana &&
    grid &&
    !document.getElementById('btn-tip') &&
    !document.querySelector('[data-cr-tip]')
  ) {
    const tip = document.createElement('a');
    tip.href = `solana:${socials.tipWalletSolana}`;
    tip.setAttribute('data-cr-tip', '1');
    tip.textContent = `Tip $CR -> ${socials.tipWalletSolana.slice(0, 8)}...${socials.tipWalletSolana.slice(-8)}`;
    tip.title = 'Send $CR or SOL to support Cryptic Realm - not an investment';
    tip.style.cssText =
      'display:block;padding:14px 18px;margin:8px 0;border:1px solid #00ffa3;border-radius:10px;color:#00ffa3;text-decoration:none;font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;';
    grid.appendChild(tip);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rebrand);
  } else {
    rebrand();
  }
}
