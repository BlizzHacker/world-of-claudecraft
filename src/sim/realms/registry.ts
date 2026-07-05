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

import { CRYPTICREALM_REALM } from './content/crypticrealm';
import { CLAUDECRAFT_REALM } from './content/claudecraft';
import { INFERNAL_REALM } from './content/infernal';
import { CLASSIC_REALM } from './content/classic';
import { DOMINION_REALM } from './content/dominion';
import { ARCANE_REALM } from './content/arcane';
import { ARCADE_VOID_REALM } from './content/arcade_void';
import { FPS_REALM } from './content/fps';
import { EXCHANGE_REALM } from './content/exchange';
import type { RealmContent, RealmId } from './types';

export const REALMS: Record<RealmId, RealmContent> = {
  crypticrealm: CRYPTICREALM_REALM,
  infernal: INFERNAL_REALM,
  classic: CLASSIC_REALM,
  dominion: DOMINION_REALM,
  arcane: ARCANE_REALM,
  arcadevoid: ARCADE_VOID_REALM,
  claudecraft: CLAUDECRAFT_REALM,
  fps: FPS_REALM,
  exchange: EXCHANGE_REALM,
};

// Picker order: the namesake realm leads, then the themed universes, the FPS
// realm, and finally the Exchange hub.
export const REALM_LIST: readonly RealmContent[] = [
  CRYPTICREALM_REALM,
  INFERNAL_REALM,
  CLASSIC_REALM,
  DOMINION_REALM,
  ARCANE_REALM,
  ARCADE_VOID_REALM,
  CLAUDECRAFT_REALM,
  FPS_REALM,
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

export const DEFAULT_REALM: RealmId = 'crypticrealm';

const STORE_KEY = 'cr_active_realm';

export function isRealmId(s: string | null | undefined): s is RealmId {
  return s != null && s in REALMS;
}

export function getRealm(id: RealmId): RealmContent {
  return REALMS[id] ?? REALMS[DEFAULT_REALM];
}

// Host environment seam: the sim is headless (no DOM/browser globals - see
// tests/architecture.test.ts). The browser entry injects readers for the URL
// query + persistent storage via setRealmHostEnv (wired in src/main.ts);
// Node/RL hosts leave it unset and get DEFAULT_REALM.
export interface RealmHostEnv {
  queryParam(name: string): string | null;
  storageGet(key: string): string | null;
  storageSet(key: string, value: string): void;
  notifyStageChange?(realmId: string, stage: string): void;
}
let hostEnv: RealmHostEnv | null = null;
export function setRealmHostEnv(env: RealmHostEnv | null): void {
  hostEnv = env;
}
export function realmHostEnv(): RealmHostEnv | null {
  return hostEnv;
}

export function resolveActiveRealmId(): RealmId {
  try {
    if (hostEnv) {
      const q = hostEnv.queryParam('realm');
      if (isRealmId(q)) return q;
      const ls = hostEnv.storageGet(STORE_KEY);
      if (isRealmId(ls)) return ls;
    }
  } catch { /* SSR / sandboxed env: fall through */ }
  return DEFAULT_REALM;
}

export function persistActiveRealm(id: RealmId): void {
  try {
    hostEnv?.storageSet(STORE_KEY, id);
  } catch { /* storage unavailable */ }
}

export function getActiveRealm(): RealmContent {
  return getRealm(resolveActiveRealmId());
}

// F5b: the level cap for the active realm. The D2 realms return 99, classic 80,
// and any realm without an explicit cap (claudecraft) falls back to the passed
// default (the global MAX_LEVEL). Kept here (not in sim/types.ts) so the pure
// constants module never imports the realm registry.
export function activeMaxLevel(fallback: number): number {
  return getActiveRealm().maxLevel ?? fallback;
}
