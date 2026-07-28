// Claudecraft — the pristine upstream look.
//
// This pack carries no class re-skins of its own; the upstream
// src/sim/content/classes.ts data flows through unchanged. We keep an empty
// `classes` array so the UI knows to fall back to the upstream class table
// instead of layering Cryptic Realm skin metadata.

import type { RealmContent } from '../types';

export const CLAUDECRAFT_REALM: RealmContent = {
  id: 'claudecraft',
  name: 'World of ClaudeCraft',
  tagline: 'The pristine base world — vanilla WoW-Classic-style micro-MMO',
  description:
    'The original World of ClaudeCraft experience exactly as the upstream engine ' +
    'ships it: nine classic classes, hand-built zones, deterministic 20 Hz sim, ' +
    'no realm overlay. Pick this realm to play the base game as the maintainers ' +
    'intended it.',
  // Upstream's own crypto and name: this realm IS World of ClaudeCraft, so the
  // translation-seam swap must be a no-op here.
  tokenSymbol: 'WOC',
  shortBrand: 'WoC',
  mood: 'Classic · Heroic · Familiar',
  accentHex: '#4a9eff',
  bgGradient: 'linear-gradient(135deg, #0a1428 0%, #050a14 100%)',
  previewColors: { primary: '#4a9eff', secondary: '#ffd700', bg: '#0a1428' },
  classes: [],
  // Pristine upstream branding stays — World of ClaudeCraft logo, GitHub link,
  // Donate button. This is the only realm that keeps the upstream identity.
  branding: {
    // Per user: keep the small square `C` emblem (cr_logo_square.webp, the
    // upstream WoC asset just renamed) for the claudecraft realm only.
    logoSrc: '/cr_logo_square.webp',
    brandText: 'World of ClaudeCraft',
    loadingScreenSrc: '/loading-screen.jpg',
    discordUrl: 'https://discord.gg/GjhnUsBtw',
    githubUrl: 'https://github.com/levy-street/world-of-claudecraft',
    showDonate: true,
    showAuthentikSso: false,
  },
};
