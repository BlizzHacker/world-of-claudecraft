// Item catalog. ADDITIVE — the upstream src/sim/content/items.ts BASE_ITEMS
// table is untouched. This module holds the realm-aware economy items
// (cosmetics / mounts / pets / premium unlocks / cross-realm gear) and
// optionally wraps individual BASE_ITEMS entries to expose them through
// the same realm-scope filtering.

import type { EconomyItem, EconomyItemType, EconomyRarity, RealmScope } from './types';
import { ECONOMY_DISCLOSURE } from './types';
import type { RealmId } from '../sim/realms/types';

/** Curated catalog. Add new items here. Each ID must be globally unique. */
export const ECONOMY_ITEMS: Record<string, EconomyItem> = {
  // ── Shared cosmetic skins (work in any realm) ────────────────────────
  skin_void_blade: {
    id: 'skin_void_blade',
    name: 'Void Blade Skin',
    description: 'A sword visual sheathed in cold void light. Cosmetic only.',
    realm: 'shared',
    itemType: 'cosmetic',
    rarity: 'epic',
    asset: { kind: 'image', src: '/economy/skins/void_blade.png' },
    price: { amount: 5, currency: 'platinum' },
    tradable: true,
    transferableBetweenRealms: true,
  },
  skin_emberweave_cloak: {
    id: 'skin_emberweave_cloak',
    name: 'Emberweave Cloak',
    description: 'A back-slot cosmetic cloak woven from heat-shimmer threads.',
    realm: 'shared',
    itemType: 'cosmetic',
    rarity: 'rare',
    asset: { kind: 'image', src: '/economy/skins/emberweave_cloak.png' },
    price: { amount: 2, currency: 'platinum' },
    tradable: true,
    transferableBetweenRealms: true,
  },

  // ── Infernal realm-only mount ────────────────────────────────────────
  mount_infernal_steed: {
    id: 'mount_infernal_steed',
    name: 'Infernal Steed',
    description: 'A hellforged mount usable only in the Infernal realm.',
    realm: 'infernal',
    itemType: 'mount',
    rarity: 'legendary',
    asset: { kind: 'glb', src: '/cr-realms/infernal/mount_steed.glb' },
    requirements: { level: 20, realmAchievement: 'world_boss_first_kill' },
    price: { amount: 25, currency: 'platinum' },
    tradable: false,
    transferableBetweenRealms: false,
  },

  // ── Arcane realm-only spellbook ──────────────────────────────────────
  cr_spellbook_voidwalker: {
    id: 'cr_spellbook_voidwalker',
    name: "Voidwalker's Codex",
    description:
      'A spellbook that unlocks two additional ability slots for Voidwalker ' +
      'characters in the Arcane realm. Realm-locked.',
    realm: 'arcane',
    itemType: 'premium',
    rarity: 'legendary',
    asset: { kind: 'image', src: '/economy/items/voidwalker_codex.png' },
    requirements: { level: 15 },
    price: { amount: 10, currency: 'platinum' },
    tradable: false,
    transferableBetweenRealms: false,
  },

  // ── Account-global premium unlock (works in any realm) ───────────────
  premium_extra_bag_slots: {
    id: 'premium_extra_bag_slots',
    name: 'Expanded Bags',
    description: 'Permanent: +8 inventory slots on every character. Account-wide.',
    realm: 'shared',
    itemType: 'premium',
    rarity: 'epic',
    asset: { kind: 'image', src: '/economy/items/expanded_bags.png' },
    price: { amount: 8, currency: 'platinum' },
    tradable: false,
    transferableBetweenRealms: true,
  },
};

/** Get the items visible to a player currently playing in `realm`. Shared
 *  items always show; realm-locked items show only for their realm; items
 *  from a different home realm are hidden. */
export function itemsForRealmContext(realm: RealmId): EconomyItem[] {
  const out: EconomyItem[] = [];
  for (const item of Object.values(ECONOMY_ITEMS)) {
    if (item.realm === 'shared') out.push(item);
    else if (item.realm === realm) out.push(item);
  }
  return out;
}

/** Filter by type within the catalog (cosmetic / mount / premium / …). */
export function itemsByType(type: EconomyItemType, realm?: RealmId): EconomyItem[] {
  const pool = realm ? itemsForRealmContext(realm) : Object.values(ECONOMY_ITEMS);
  return pool.filter((i) => i.itemType === type);
}

/** Filter by rarity. */
export function itemsByRarity(rarity: EconomyRarity, realm?: RealmId): EconomyItem[] {
  const pool = realm ? itemsForRealmContext(realm) : Object.values(ECONOMY_ITEMS);
  return pool.filter((i) => i.rarity === rarity);
}

/** Filter by scope (shared / per-realm / cross-realm). */
export function itemsByScope(scope: RealmScope): EconomyItem[] {
  return Object.values(ECONOMY_ITEMS).filter((i) => i.realm === scope);
}

/** Lookup. */
export function getItem(id: string): EconomyItem | null {
  return ECONOMY_ITEMS[id] ?? null;
}

/** Wire the safety disclosure into anything returned from this module. */
export { ECONOMY_DISCLOSURE };
