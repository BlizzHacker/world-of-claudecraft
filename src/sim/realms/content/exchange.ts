// The Exchange — the cross-realm marketplace + auction hub. Players from any
// home realm (infernal / classic / dominion / arcane / claudecraft) can visit
// the Exchange with their character. While present they can browse listings,
// place bids, and trade items 1-on-1 with people from other realms. Combat,
// questing, and progression are disabled inside the Exchange — it's a
// neutral-ground bazaar, not a play world.
//
// Architecturally The Exchange is its own server process (`REALM_NAME=Exchange`)
// running alongside the five themed realm processes. The auction listings
// table lives in the shared DB and is read by every realm process but only
// written by the Exchange process. This is how items cross realm borders.

import type { RealmContent } from '../types';

export const EXCHANGE_REALM: RealmContent = {
  id: 'exchange',
  name: 'The Exchange',
  tagline: 'Neutral marketplace — auctions, cross-realm trade, no combat',
  description:
    'A torchlit hall under five banners — the one place where heroes from every ' +
    'realm step out of the war for an hour to bid, barter, and walk the long ' +
    'auction floor together. Drop your gear at the consignment desk, place a ' +
    'starting bid, or talk a Dominion soldier into selling you the void blade ' +
    'an Arcane assassin wants. Combat sheathes itself at the door.',
  mood: 'Neutral · Mercantile · Crowded',
  season: {
    eyebrow: 'Season 1',
    title: "The Trader's Consignment",
    body: 'Limited weapon skins consigned to the Exchange floor by traders out of every realm. Account-wide, purely cosmetic, and shown to everyone around you.',
  },
  accentHex: '#c9a14a',
  bgGradient: 'linear-gradient(135deg, #1a1408 0%, #0a0805 100%)',
  previewColors: { primary: '#c9a14a', secondary: '#f3dfaa', bg: '#1a1408' },
  crossRealm: true,
  branding: {
    logoSrc: '/cryptic-realm-logo-512.webp',
    brandText: 'The Exchange - Cryptic Realm',
    loadingScreenSrc: '/cryptic-realm-loading-bg.webp',
    loadingArtHasWordmark: true,
    discordUrl: 'https://discord.gg/WnxcamHJdh',
    showDonate: false,
    showAuthentikSso: true,
  },
  // The Exchange doesn't ship its own class skins — visiting characters keep
  // whatever class they're playing in their home realm.
  classes: [],
  // Grander settlement re-skin (see classic.ts note): scale/spread only.
  worldTheme: { buildingScale: 1.5, buildingSpread: 2.0 },
};
