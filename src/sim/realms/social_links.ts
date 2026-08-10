// Per-realm social + tip wallet config. Read by branding.ts and links.html.

import type { RealmId } from './types';

export interface SocialLinks {
  homepage: string;
  links: string;            // /links/ page
  x: string;
  facebook?: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  reddit: string;
  discord: string;
  github?: string;
  wiki: string;
  /** Solana wallet address. When set, shown as a tip option instead of GitHub Sponsors. */
  tipWalletSolana?: string;
  /** SPL token mint address for the realm's public token card. */
  tokenMintSolana?: string;
}

const CR_SOCIALS: SocialLinks = {
  homepage: 'https://crypticrealm.com/',
  links: 'https://crypticrealm.com/links/',
  x: 'https://x.com/CrypticMMO',
  facebook: 'https://facebook.com/crypticmmo',
  instagram: 'https://instagram.com/crypticmmo',
  tiktok: 'https://www.tiktok.com/@crypticmmo',
  youtube: 'https://www.youtube.com/@CrypticMMO',
  reddit: 'https://www.reddit.com/r/CrypticMMO',
  discord: 'https://discord.gg/WnxcamHJdh',
  wiki: 'https://crypticrealm.com/wiki/',
  tipWalletSolana: 'GncAXx6j38osJns395XZtf6rSA9MU3K1gwafTrHpBJpi',
  tokenMintSolana: '3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv',
};

const WOC_SOCIALS: SocialLinks = {
  homepage: 'https://worldofclaudecraft.com/',
  links: 'https://worldofclaudecraft.com/links/',
  x: 'https://x.com/WoClaudecraft',
  instagram: 'https://www.instagram.com/worldofclaudecraft/',
  tiktok: 'https://www.tiktok.com/@worldofclaudecraft',
  youtube: 'https://www.youtube.com/@WoClaudeCraft',
  reddit: 'https://www.reddit.com/r/WorldofClaudecraft/',
  discord: 'https://discord.gg/GjhnUsBtw',
  github: 'https://github.com/levy-street/world-of-claudecraft',
  wiki: 'https://worldofclaudecraft.com/wiki/index.php/Main_Page',
};

export function socialsForRealm(id: RealmId): SocialLinks {
  return id === 'claudecraft' ? WOC_SOCIALS : CR_SOCIALS;
}

export { CR_SOCIALS, WOC_SOCIALS };
