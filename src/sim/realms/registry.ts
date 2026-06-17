// Realm registry — Cryptic Realm overlay on top of world-of-claudecraft.
//
// Five universes (themes) ship with the game: infernal (dark gothic ARPG),
// classic (bright low-poly fantasy), dominion (sci-fi alien war), arcane
// (cosmic crystal void), and claudecraft (the pristine upstream base look).
//
// A realm pack here is *display metadata only* — lore, class skins, monster
// bestiary entries, item rarity flavor. It does NOT replace the mechanical
// classes / abilities / mobs that live in src/sim/content/*; the upstream
// engine still drives those. This keeps every realm fork-safe: upstream
// can rename, rebalance, or restructure the base game and our realm packs
// continue working because they never reach into Sim state.
//
// The active realm is resolved in this order:
//   1. ?realm=<id> query string (dev / shareable links).
//   2. localStorage 'cr_active_realm' (last-picked).
//   3. DEFAULT_REALM ('infernal') — matches the LXC overlay's default.

import { CLAUDECRAFT_REALM } from './content/claudecraft';
import { INFERNAL_REALM } from './content/infernal';
import { CLASSIC_REALM } from './content/classic';
import { DOMINION_REALM } from './content/dominion';
import { ARCANE_REALM } from './content/arcane';
import { EXCHANGE_REALM } from './content/exchange';
import type { RealmContent, RealmId } from './types';

export const REALMS: Record<RealmId, RealmContent> = {
  infernal: INFERNAL_REALM,
  classic: CLASSIC_REALM,
  dominion: DOMINION_REALM,
  arcane: ARCANE_REALM,
  claudecraft: CLAUDECRAFT_REALM,
  exchange: EXCHANGE_REALM,
};

export const REALM_LIST: readonly RealmContent[] = [
  INFERNAL_REALM,
  CLASSIC_REALM,
  DOMINION_REALM,
  ARCANE_REALM,
  CLAUDECRAFT_REALM,
  EXCHANGE_REALM,
];

/** Realms a player calls home. The Exchange is intentionally excluded —
 *  characters don't live there, they visit. */
export const HOME_REALM_LIST: readonly RealmContent[] = REALM_LIST.filter(
  (r) => !r.crossRealm,
);

/** True when the given realm is a cross-realm hub (today: only Exchange). */
export function isCrossRealm(id: RealmId): boolean {
  return REALMS[id]?.crossRealm === true;
}

export const DEFAULT_REALM: RealmId = 'infernal';

const STORE_KEY = 'cr_active_realm';

export function isRealmId(s: string | null | undefined): s is RealmId {
  return s != null && s in REALMS;
}

export function getRealm(id: RealmId): RealmContent {
  return REALMS[id] ?? REALMS[DEFAULT_REALM];
}

export function resolveActiveRealmId(): RealmId {
  try {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('realm');
      if (isRealmId(q)) return q;
      const ls = window.localStorage?.getItem(STORE_KEY);
      if (isRealmId(ls)) return ls;
    }
  } catch { /* SSR / sandboxed env: fall through */ }
  return DEFAULT_REALM;
}

export function persistActiveRealm(id: RealmId): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(STORE_KEY, id);
    }
  } catch { /* storage unavailable */ }
}

export function getActiveRealm(): RealmContent {
  return getRealm(resolveActiveRealmId());
}
