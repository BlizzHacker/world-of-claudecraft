// Rotating "did you know" style tips shown under the loading-screen progress
// bar. Pure and DOM-free: picks/rotates a tip key, the caller renders it via
// t(). Kept separate from main.ts (a firewall, not a home for new logic).
import { type TranslationKey, t } from './i18n';

const GENERIC_TIP_KEYS: TranslationKey[] = [
  'loading.tips.classes',
  'loading.tips.talents',
  'loading.tips.dungeons',
  'loading.tips.market',
  'loading.tips.guilds',
  'loading.tips.professions',
  'loading.tips.loadouts',
  'loading.tips.pvp',
];

// Realm-flavored tips, shown ahead of the generic gameplay list on that
// realm's loading screen. A realm not named here rotates the generic list
// alone (the fallback), so a new realm needs no entry to keep working.
const REALM_TIP_KEYS: Record<string, TranslationKey[]> = {
  infernal: [
    'loading.tips.infernal.delves',
    'loading.tips.infernal.rifts',
    'loading.tips.infernal.crypts',
  ],
  classic: [
    'loading.tips.classic.dungeons',
    'loading.tips.classic.wanderers',
    'loading.tips.classic.deeds',
  ],
  arcane: [
    'loading.tips.arcane.portals',
    'loading.tips.arcane.relics',
    'loading.tips.arcane.study',
  ],
  dominion: [
    'loading.tips.dominion.squads',
    'loading.tips.dominion.formation',
    'loading.tips.dominion.momentum',
  ],
  arcadevoid: [
    'loading.tips.arcadevoid.movement',
    'loading.tips.arcadevoid.focus',
    'loading.tips.arcadevoid.upkeep',
  ],
};

/** The tip keys a realm's loading screen rotates: its themed tips first, then
 *  the generic gameplay list; a realm with no themed list gets the generic
 *  list alone. Exported for the selection pins in tests/loading_tips.test.ts. */
export function loadingTipKeysForRealm(realmId: string | null | undefined): TranslationKey[] {
  const themed = realmId ? REALM_TIP_KEYS[realmId] : undefined;
  return themed ? [...themed, ...GENERIC_TIP_KEYS] : [...GENERIC_TIP_KEYS];
}

export interface LoadingTipRotation {
  /** Current tip text, already resolved through t(). */
  current(): string;
  /** Advances to the next tip (wraps around) and returns its text. */
  next(): string;
}

/**
 * Starts a rotation over the realm's tip list at a pseudo-random offset
 * (Date.now()/Math.random-seeded is fine here: this is cosmetic UI copy, not
 * sim state, so it's exempt from the sim's Rng-only randomness rule) so repeat
 * page loads don't always open on the same tip.
 */
export function createLoadingTipRotation(
  realmId?: string | null,
  startIndex?: number,
): LoadingTipRotation {
  const keys = loadingTipKeysForRealm(realmId);
  const start = startIndex ?? Math.floor(Math.random() * keys.length);
  let index = ((start % keys.length) + keys.length) % keys.length;
  return {
    current(): string {
      return t(keys[index]);
    },
    next(): string {
      index = (index + 1) % keys.length;
      return t(keys[index]);
    },
  };
}
