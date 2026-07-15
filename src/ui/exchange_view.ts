// Pure view model for the cross-realm Exchange window.
//
// The REST service owns custody and settlement. This module only decides what
// the painter should show for a snapshot, which keeps the UI deterministic and
// easy to exercise without a browser or a live server.

import type { InvSlot, ItemDef } from '../sim/types';

export interface ExchangeListingView {
  id: string;
  sourceRealm: string;
  itemId: string;
  count: number;
  priceCopper: number;
  feeBps: number;
  status: 'escrowed' | 'settled' | 'cancelled';
  sellerCharacterId: number;
  sourceItemLocked: boolean;
  provenance: { sourceRealm?: string; hops?: number };
  createdAt: string;
  destinationRealm?: string;
}

export interface ExchangeInventoryRow {
  slot: InvSlot;
  item: ItemDef;
}

export type ExchangeView =
  | { state: 'loading' }
  | { state: 'signed-out'; destinationRealm: string }
  | {
      state: 'ready';
      destinationRealm: string;
      copper: number;
      listings: ExchangeListingView[];
      inventory: ExchangeInventoryRow[];
    }
  | { state: 'error'; message: string };

export function buildExchangeView(input: {
  destinationRealm: string;
  copper: number;
  listings: readonly ExchangeListingView[];
  inventory: readonly InvSlot[];
  items: Record<string, ItemDef>;
  signedIn: boolean;
}): ExchangeView {
  if (!input.signedIn) return { state: 'signed-out', destinationRealm: input.destinationRealm };
  const inventory = input.inventory
    .map((slot) => ({ slot, item: input.items[slot.itemId] }))
    .filter((row): row is ExchangeInventoryRow => Boolean(row.item));
  return {
    state: 'ready',
    destinationRealm: input.destinationRealm,
    copper: input.copper,
    listings: [...input.listings],
    inventory,
  };
}

export function exchangePriceEach(
  listing: Pick<ExchangeListingView, 'priceCopper' | 'count'>,
): number {
  return listing.count > 0 ? Math.ceil(listing.priceCopper / listing.count) : listing.priceCopper;
}
