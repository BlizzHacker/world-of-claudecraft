// Currency registry. Three classic in-game denominations + Platinum.
//
// Copper / Silver / Gold are mirror-aligned with what already exists in
// src/sim/sim.ts (which only tracks a single `copper` integer per character).
// We treat them as the same pool with display-only conversion:
//   1 gold   = 100 silver
//   1 silver = 100 copper
//
// Platinum is the new currency. It is INTENTIONALLY hard to acquire. It
// cannot be converted from copper/silver/gold. It is only awarded for
// gameplay milestones — see platinum_rules.ts.

import type { CurrencyDef, CurrencyId } from './types';

export const CURRENCIES: Record<CurrencyId, CurrencyDef> = {
  copper: {
    id: 'copper',
    name: 'Copper',
    source: 'mob-drops',
    dailyCapPerAccount: 0,
    onChainCapable: false,
    copperEquivalent: 1,
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    source: 'mob-drops',
    dailyCapPerAccount: 0,
    onChainCapable: false,
    copperEquivalent: 100,
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    source: 'mob-drops',
    dailyCapPerAccount: 0,
    onChainCapable: false,
    copperEquivalent: 10_000,
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum',
    source: 'achievement-only',
    // Hard cap so a streak of perfectly-timed achievements still tops out.
    dailyCapPerAccount: 25,
    onChainCapable: true,
    // Intentionally null — Platinum is NOT denominated in copper. No vendor
    // can buy platinum, no copper purchase mints platinum.
    copperEquivalent: null,
  },
};

/** Lifetime-cap so the total platinum that can ever exist is bounded. */
export const PLATINUM_LIFETIME_CAP_PER_ACCOUNT = 1_000;

/** Format a raw copper integer as "12g 34s 56c" for display. Used wherever
 *  we render copper/silver/gold amounts (UI, API responses). */
export function formatCopperAsGSC(raw: number): string {
  const gold = Math.floor(raw / 10_000);
  const silver = Math.floor((raw % 10_000) / 100);
  const copper = raw % 100;
  const parts: string[] = [];
  if (gold > 0) parts.push(`${gold}g`);
  if (silver > 0 || gold > 0) parts.push(`${silver}s`);
  parts.push(`${copper}c`);
  return parts.join(' ');
}

/** Decompose a copper integer into gold/silver/copper for separate display
 *  (icon + number per denomination). */
export function decomposeCopper(raw: number): { gold: number; silver: number; copper: number } {
  return {
    gold: Math.floor(raw / 10_000),
    silver: Math.floor((raw % 10_000) / 100),
    copper: raw % 100,
  };
}
