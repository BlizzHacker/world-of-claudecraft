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
  mood: 'Classic · Heroic · Familiar',
  accentHex: '#4a9eff',
  bgGradient: 'linear-gradient(135deg, #0a1428 0%, #050a14 100%)',
  previewColors: { primary: '#4a9eff', secondary: '#ffd700', bg: '#0a1428' },
  classes: [],
};
