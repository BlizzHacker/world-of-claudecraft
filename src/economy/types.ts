// Shared realm economy types. Lives next to the realm registry (src/sim/realms/)
// but stays a separate module so the existing upstream BASE_ITEMS table and the
// upstream sim auction code don't need to change. Anything in here is additive.
//
// LEGAL / SAFETY (echoed in every API response that returns these shapes):
//   Items and on-chain tokens granted in Cryptic Realm are utility for
//   gameplay, cosmetics, achievements, and account ownership records.
//   They are NOT investments, securities, or financial instruments. No price
//   appreciation, revenue share, staking yield, or guaranteed value is
//   implied or promised.

import type { RealmId } from '../sim/realms/types';

/** Which realm(s) an item belongs to. `shared` items work in any realm. */
export type RealmScope = RealmId | 'shared';

export type EconomyItemType =
  | 'weapon'
  | 'armor'
  | 'cosmetic'      // skin / dye / glow — non-stat, visual only
  | 'character'     // character-slot unlock
  | 'pet'
  | 'mount'
  | 'consumable'
  | 'resource'      // crafting / refining material
  | 'quest'         // quest item, soulbound
  | 'premium'       // account-level unlock (e.g. extra bag slots)
  | 'other';

export type EconomyRarity =
  | 'common'
  | 'magic'
  | 'rare'
  | 'epic'          // mapped from upstream "rare" loot drops
  | 'legendary'
  | 'mythic'
  | 'unique';

/** All currencies the economy layer knows about. The first four already
 *  exist as in-game numbers in the upstream sim; we add `platinum` here. */
export type CurrencyId = 'copper' | 'silver' | 'gold' | 'platinum';

export interface CurrencyDef {
  id: CurrencyId;
  name: string;
  /** Where the supply comes from. */
  source: 'mob-drops' | 'vendor' | 'achievement-only' | 'real-money';
  /** Per-account daily acquisition cap. 0 = no cap. */
  dailyCapPerAccount: number;
  /** Whether this currency can mint as an on-chain SPL token. */
  onChainCapable: boolean;
  /** Conversion factor TO copper (for display). Platinum is intentionally
   *  not denominated in copper — see `platinum_rules.ts`. */
  copperEquivalent: number | null;
}

/** Optional pointer to an on-chain token. NEVER required. When unset the
 *  item is purely off-chain (database row in `economy_items` / `inventory`). */
export interface ChainRef {
  network: 'solana' | 'solana-devnet' | 'mock';
  /** SPL Token mint address (base58). */
  mintAddress: string;
  /** Optional metadata pointer (Metaplex / IPFS / Arweave URI). */
  metadataUri?: string;
}

/** A single item in the catalog. Owners get one or more `OwnedItem` rows. */
export interface EconomyItem {
  id: string;
  name: string;
  description: string;
  realm: RealmScope;
  itemType: EconomyItemType;
  rarity: EconomyRarity;
  /** Visual asset reference — image path, sprite name, or GLB path. */
  asset: { kind: 'image' | 'sprite' | 'glb'; src: string };
  /** Minimum gameplay-side requirements before this item can be equipped. */
  requirements?: {
    level?: number;
    realmAchievement?: string;
  };
  /** Price + currency for the in-shop listing. Setting price to 0 marks the
   *  item as unobtainable from the shop (e.g. achievement-only drops). */
  price: { amount: number; currency: CurrencyId } | null;
  /** True when the item can move via the in-game auction house / 1v1 trade. */
  tradable: boolean;
  /** True when the item is usable across every realm. False ⇒ realm-locked. */
  transferableBetweenRealms: boolean;
  /** Optional pointer to an on-chain representation. */
  chainRef?: ChainRef;
  metadata?: Record<string, string | number | boolean>;
}

/** A specific instance of an item owned by an account. */
export interface OwnedItem {
  ownershipId: string;     // uuid
  itemId: string;          // → EconomyItem.id
  ownerAccountId: number;
  realmAcquiredIn: RealmId;
  acquiredAt: string;      // ISO-8601 UTC
  /** Stack count for stackable items. 1 for unique instances. */
  stack: number;
  /** True when soulbound (quest items, achievement rewards). */
  bound: boolean;
  /** Optional chain ownership record. Populated only when the item was
   *  claimed to the player's wallet. */
  chainOwnership?: {
    walletAddress: string;
    tokenAccount: string;
    network: ChainRef['network'];
  };
}

/** Permanent record of a purchase. Server-side append-only ledger. */
export interface PurchaseRecord {
  purchaseId: string;        // uuid
  buyerAccountId: number;
  itemId: string;
  quantity: number;
  pricePaid: { amount: number; currency: CurrencyId };
  realmContext: RealmId;
  occurredAt: string;
  /** Optional on-chain proof (Solana tx signature). */
  chainTxSig?: string;
}

/** Result of a platinum award. Server emits one of these on a triggering event;
 *  the platinum balance is stored in `economy_platinum.balance`. */
export interface PlatinumAward {
  accountId: number;
  amount: number;
  /** Why the platinum was awarded — must match a key in PLATINUM_REWARDS. */
  reason: string;
  occurredAt: string;
  realmContext: RealmId;
}

/** Snapshot of a player's wallet-side platinum balance (off-chain). */
export interface PlatinumBalance {
  accountId: number;
  /** Off-chain (database) balance. Earned by gameplay. */
  offChainBalance: number;
  /** Optional on-chain wallet balance, if the user has linked a wallet
   *  AND claimed any platinum to it. */
  onChainBalance: number | null;
  /** Lifetime award total (never decreases on claim). */
  lifetimeEarned: number;
  walletAddress: string | null;
}

/** Stable safety-language block that EVERY API response embeds, so the
 *  frontend can render it inline and so machine consumers can parse it. */
export const ECONOMY_DISCLOSURE = {
  notInvestment: true,
  text:
    'Items and on-chain tokens granted in Cryptic Realm are utility for ' +
    'gameplay, cosmetics, achievements, and account ownership records. ' +
    'They are not investments, securities, or financial instruments. ' +
    'No price appreciation, revenue share, staking yield, or guaranteed ' +
    'value is implied or promised.',
} as const;
