// Exchange custody rules are pure and host-agnostic. The server/DB adapter owns
// persistence and transaction boundaries; offline uses the same transitions in a
// local profile ledger without gaining any online import/export capability.

export type ExchangeListingStatus = 'escrowed' | 'settled' | 'cancelled';

export interface ExchangeProvenance {
  itemId: string;
  sourceRealm: string;
  sourceCharacterId: number;
  sourceListingId: string;
  destinationRealm?: string;
  destinationCharacterId?: number;
  hops: number;
}

export interface ExchangeEscrowListing {
  id: string;
  sellerCharacterId: number;
  sourceRealm: string;
  itemId: string;
  count: number;
  priceCopper: number;
  feeBps: number;
  status: ExchangeListingStatus;
  sourceItemLocked: boolean;
  provenance: ExchangeProvenance;
}

export interface ExchangeSettlement {
  listing: ExchangeEscrowListing;
  buyerCharacterId: number;
  destinationRealm: string;
  sellerProceedsCopper: number;
  feeCopper: number;
  provenance: ExchangeProvenance;
}

export const EXCHANGE_FEE_BPS = 500;
const BPS_DENOMINATOR = 10_000;

function positiveInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`${field} must be a positive integer`);
  return value;
}

function nonEmpty(value: string, field: string): string {
  const clean = value.trim();
  if (!clean) throw new Error(`${field} is required`);
  return clean;
}

export function createExchangeEscrow(input: {
  id: string;
  sellerCharacterId: number;
  sourceRealm: string;
  itemId: string;
  count: number;
  priceCopper: number;
}): ExchangeEscrowListing {
  const id = nonEmpty(input.id, 'listing id');
  const sourceRealm = nonEmpty(input.sourceRealm, 'source realm');
  const itemId = nonEmpty(input.itemId, 'item id');
  const sellerCharacterId = positiveInteger(input.sellerCharacterId, 'seller character id');
  const count = positiveInteger(input.count, 'count');
  const priceCopper = positiveInteger(input.priceCopper, 'price');
  return {
    id,
    sellerCharacterId,
    sourceRealm,
    itemId,
    count,
    priceCopper,
    feeBps: EXCHANGE_FEE_BPS,
    status: 'escrowed',
    sourceItemLocked: true,
    provenance: {
      itemId,
      sourceRealm,
      sourceCharacterId: sellerCharacterId,
      sourceListingId: id,
      hops: 0,
    },
  };
}

export function settleExchangeEscrow(
  listing: ExchangeEscrowListing,
  input: {
    buyerCharacterId: number;
    destinationRealm: string;
    buyerHasFunds: boolean;
    destinationAcceptsItem: boolean;
  },
): ExchangeSettlement {
  if (listing.status !== 'escrowed') throw new Error('listing is not escrowed');
  const buyerCharacterId = positiveInteger(input.buyerCharacterId, 'buyer character id');
  const destinationRealm = nonEmpty(input.destinationRealm, 'destination realm');
  if (buyerCharacterId === listing.sellerCharacterId)
    throw new Error('seller cannot buy own listing');
  if (listing.sourceRealm === destinationRealm)
    throw new Error('Exchange requires a cross-realm destination');
  if (!input.buyerHasFunds) throw new Error('buyer funds are not reserved');
  if (!input.destinationAcceptsItem) throw new Error('destination cannot accept this item');
  const feeCopper = Math.floor((listing.priceCopper * listing.feeBps) / BPS_DENOMINATOR);
  const sellerProceedsCopper = listing.priceCopper - feeCopper;
  const provenance: ExchangeProvenance = {
    ...listing.provenance,
    destinationRealm,
    destinationCharacterId: buyerCharacterId,
    hops: listing.provenance.hops + 1,
  };
  return {
    listing: { ...listing, status: 'settled', sourceItemLocked: false, provenance },
    buyerCharacterId,
    destinationRealm,
    sellerProceedsCopper,
    feeCopper,
    provenance,
  };
}

export function cancelExchangeEscrow(
  listing: ExchangeEscrowListing,
  sellerCharacterId: number,
): ExchangeEscrowListing {
  if (listing.status !== 'escrowed') throw new Error('listing is not escrowed');
  if (sellerCharacterId !== listing.sellerCharacterId)
    throw new Error('seller does not own listing');
  return { ...listing, status: 'cancelled', sourceItemLocked: false };
}
