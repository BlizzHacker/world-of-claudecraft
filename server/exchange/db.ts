// Exchange custody persistence. Every mutation locks the listing and the
// affected character rows in one transaction so an item, currency, and
// provenance entry cannot be committed independently.

import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { ITEMS } from '../../src/sim/data';
import {
  EXCHANGE_FEE_BPS,
  type ExchangeEscrowListing,
  type ExchangeProvenance,
} from '../../src/sim/exchange/custody';
import type { CharacterState } from '../../src/sim/sim';
import type { InvSlot } from '../../src/sim/types';

export const EXCHANGE_SCHEMA = `
CREATE TABLE IF NOT EXISTS exchange_listings (
  listing_id UUID PRIMARY KEY,
  seller_character_id INT NOT NULL REFERENCES characters(id),
  source_realm TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_count INT NOT NULL CHECK (item_count > 0),
  price_copper BIGINT NOT NULL CHECK (price_copper > 0),
  fee_bps INT NOT NULL DEFAULT ${EXCHANGE_FEE_BPS},
  status TEXT NOT NULL CHECK (status IN ('escrowed','settled','cancelled')),
  source_item_locked BOOLEAN NOT NULL DEFAULT TRUE,
  provenance JSONB NOT NULL,
  buyer_character_id INT REFERENCES characters(id),
  destination_realm TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS exchange_listings_active
  ON exchange_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS exchange_listings_source_realm
  ON exchange_listings(source_realm, status);

CREATE TABLE IF NOT EXISTS exchange_events (
  event_id UUID PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES exchange_listings(listing_id),
  event_type TEXT NOT NULL CHECK (event_type IN ('escrowed','settled','cancelled')),
  actor_character_id INT NOT NULL REFERENCES characters(id),
  source_realm TEXT NOT NULL,
  destination_realm TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exchange_events_listing
  ON exchange_events(listing_id, occurred_at ASC);
`;

export async function applyExchangeSchema(pool: Pool): Promise<void> {
  await pool.query(EXCHANGE_SCHEMA);
}

export interface ExchangeListingRow extends ExchangeEscrowListing {
  createdAt: string;
  settledAt?: string;
  cancelledAt?: string;
  buyerCharacterId?: number;
  destinationRealm?: string;
}

export interface ExchangeAuditEvent {
  eventId: string;
  listingId: string;
  eventType: 'escrowed' | 'settled' | 'cancelled';
  actorCharacterId: number;
  sourceRealm: string;
  destinationRealm?: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

function positive(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
}

function text(value: string, field: string): string {
  const clean = value.trim();
  if (!clean) throw new Error(`${field} is required`);
  return clean;
}

function stateOf(value: unknown): CharacterState {
  if (!value || typeof value !== 'object') throw new Error('character has no saved state');
  const state = value as CharacterState;
  if (!Array.isArray(state.inventory)) throw new Error('character inventory is invalid');
  if (!Number.isSafeInteger(state.copper) || state.copper < 0) {
    throw new Error('character currency is invalid');
  }
  return state;
}

function removeFromInventory(inventory: InvSlot[], itemId: string, count: number): void {
  let remaining = count;
  for (let i = inventory.length - 1; i >= 0 && remaining > 0; i--) {
    const slot = inventory[i];
    if (slot.itemId !== itemId || slot.instance) continue;
    const taken = Math.min(slot.count, remaining);
    slot.count -= taken;
    remaining -= taken;
    if (slot.count <= 0) inventory.splice(i, 1);
  }
  if (remaining > 0) throw new Error('source character does not own that item count');
}

function addToInventory(inventory: InvSlot[], itemId: string, count: number): void {
  const def = ITEMS[itemId];
  const maxStack = def?.stackSize ?? (def?.kind === 'weapon' || def?.kind === 'armor' ? 1 : 20);
  let remaining = count;
  for (const slot of inventory) {
    if (slot.itemId !== itemId || slot.instance || slot.count >= maxStack) continue;
    const added = Math.min(maxStack - slot.count, remaining);
    slot.count += added;
    remaining -= added;
    if (remaining === 0) return;
  }
  while (remaining > 0) {
    if (inventory.length >= 128) throw new Error('destination inventory is full');
    const added = Math.min(maxStack, remaining);
    inventory.push({ itemId, count: added });
    remaining -= added;
  }
}

function rowToListing(row: Record<string, unknown>): ExchangeListingRow {
  const provenance = row.provenance as ExchangeProvenance;
  return {
    id: String(row.listing_id),
    sellerCharacterId: Number(row.seller_character_id),
    sourceRealm: String(row.source_realm),
    itemId: String(row.item_id),
    count: Number(row.item_count),
    priceCopper: Number(row.price_copper),
    feeBps: Number(row.fee_bps),
    status: row.status as ExchangeEscrowListing['status'],
    sourceItemLocked: Boolean(row.source_item_locked),
    provenance,
    createdAt: new Date(String(row.created_at)).toISOString(),
    settledAt: row.settled_at ? new Date(String(row.settled_at)).toISOString() : undefined,
    cancelledAt: row.cancelled_at ? new Date(String(row.cancelled_at)).toISOString() : undefined,
    buyerCharacterId: row.buyer_character_id ? Number(row.buyer_character_id) : undefined,
    destinationRealm: row.destination_realm ? String(row.destination_realm) : undefined,
  };
}

async function insertEvent(
  client: PoolClient,
  listingId: string,
  eventType: 'escrowed' | 'settled' | 'cancelled',
  actorCharacterId: number,
  sourceRealm: string,
  destinationRealm: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `INSERT INTO exchange_events
       (event_id, listing_id, event_type, actor_character_id, source_realm, destination_realm, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      randomUUID(),
      listingId,
      eventType,
      actorCharacterId,
      sourceRealm,
      destinationRealm,
      JSON.stringify(payload),
    ],
  );
}

export async function createListing(
  pool: Pool,
  input: { sellerCharacterId: number; itemId: string; count: number; priceCopper: number },
): Promise<ExchangeListingRow> {
  const sellerCharacterId = positive(input.sellerCharacterId, 'seller character id');
  const itemId = text(input.itemId, 'item id');
  const count = positive(input.count, 'item count');
  const priceCopper = positive(input.priceCopper, 'price');
  const def = ITEMS[itemId];
  if (!def) throw new Error('item is not tradeable in the Exchange');
  if (def.soulbound || def.noMarketList)
    throw new Error('item is bound and cannot enter Exchange custody');

  const listingId = randomUUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const seller = await client.query(
      'SELECT id, realm, state FROM characters WHERE id = $1 FOR UPDATE',
      [sellerCharacterId],
    );
    const row = seller.rows[0];
    if (!row) throw new Error('seller character not found');
    const sourceRealm = text(String(row.realm), 'source realm');
    const state = stateOf(row.state);
    removeFromInventory(state.inventory, itemId, count);
    const provenance: ExchangeProvenance = {
      itemId,
      sourceRealm,
      sourceCharacterId: sellerCharacterId,
      sourceListingId: listingId,
      hops: 0,
    };
    await client.query('UPDATE characters SET state = $2, updated_at = now() WHERE id = $1', [
      sellerCharacterId,
      JSON.stringify(state),
    ]);
    await client.query(
      `INSERT INTO exchange_listings
         (listing_id, seller_character_id, source_realm, item_id, item_count, price_copper, fee_bps, status, provenance)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'escrowed',$8)`,
      [
        listingId,
        sellerCharacterId,
        sourceRealm,
        itemId,
        count,
        priceCopper,
        EXCHANGE_FEE_BPS,
        JSON.stringify(provenance),
      ],
    );
    await insertEvent(client, listingId, 'escrowed', sellerCharacterId, sourceRealm, null, {
      itemId,
      count,
      priceCopper,
    });
    await client.query('COMMIT');
    return {
      id: listingId,
      sellerCharacterId,
      sourceRealm,
      itemId,
      count,
      priceCopper,
      feeBps: EXCHANGE_FEE_BPS,
      status: 'escrowed',
      sourceItemLocked: true,
      provenance,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function listActiveListings(
  pool: Pool,
  destinationRealm?: string,
): Promise<ExchangeListingRow[]> {
  const params: string[] = [];
  let filter = '';
  if (destinationRealm?.trim()) {
    params.push(destinationRealm.trim());
    filter = ' AND source_realm <> $1';
  }
  const result = await pool.query(
    `SELECT * FROM exchange_listings WHERE status = 'escrowed'${filter} ORDER BY created_at DESC LIMIT 200`,
    params,
  );
  return result.rows.map((row) => rowToListing(row));
}

export async function cancelListing(
  pool: Pool,
  listingId: string,
  sellerCharacterId: number,
): Promise<ExchangeListingRow> {
  const id = text(listingId, 'listing id');
  const sellerId = positive(sellerCharacterId, 'seller character id');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const listingResult = await client.query(
      'SELECT * FROM exchange_listings WHERE listing_id = $1 FOR UPDATE',
      [id],
    );
    const listing = listingResult.rows[0];
    if (!listing) throw new Error('listing not found');
    if (Number(listing.seller_character_id) !== sellerId)
      throw new Error('seller does not own listing');
    if (listing.status !== 'escrowed') throw new Error('listing is not escrowed');
    const sellerResult = await client.query(
      'SELECT state FROM characters WHERE id = $1 FOR UPDATE',
      [sellerId],
    );
    if (!sellerResult.rows[0]) throw new Error('seller character not found');
    const state = stateOf(sellerResult.rows[0].state);
    addToInventory(state.inventory, String(listing.item_id), Number(listing.item_count));
    await client.query('UPDATE characters SET state = $2, updated_at = now() WHERE id = $1', [
      sellerId,
      JSON.stringify(state),
    ]);
    await client.query(
      `UPDATE exchange_listings SET status = 'cancelled', source_item_locked = FALSE, cancelled_at = now()
       WHERE listing_id = $1`,
      [id],
    );
    await insertEvent(client, id, 'cancelled', sellerId, String(listing.source_realm), null, {
      itemId: String(listing.item_id),
      count: Number(listing.item_count),
    });
    await client.query('COMMIT');
    const updated = {
      ...listing,
      status: 'cancelled',
      source_item_locked: false,
      cancelled_at: new Date().toISOString(),
    };
    return rowToListing(updated);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function settleListing(
  pool: Pool,
  listingId: string,
  buyerCharacterId: number,
  destinationRealm: string,
): Promise<ExchangeListingRow> {
  const id = text(listingId, 'listing id');
  const buyerId = positive(buyerCharacterId, 'buyer character id');
  const destRealm = text(destinationRealm, 'destination realm');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const listingResult = await client.query(
      'SELECT * FROM exchange_listings WHERE listing_id = $1 FOR UPDATE',
      [id],
    );
    const listing = listingResult.rows[0];
    if (!listing) throw new Error('listing not found');
    if (listing.status !== 'escrowed') throw new Error('listing is not escrowed');
    if (Number(listing.seller_character_id) === buyerId)
      throw new Error('seller cannot buy own listing');
    if (String(listing.source_realm).toLowerCase() === destRealm.toLowerCase()) {
      throw new Error('Exchange requires a cross-realm destination');
    }
    const buyerResult = await client.query(
      'SELECT id, realm, class, level, state FROM characters WHERE id = $1 FOR UPDATE',
      [buyerId],
    );
    const buyer = buyerResult.rows[0];
    if (!buyer || String(buyer.realm).toLowerCase() !== destRealm.toLowerCase()) {
      throw new Error('destination character does not belong to that realm');
    }
    const def = ITEMS[String(listing.item_id)];
    if (!def || def.soulbound || def.noMarketList)
      throw new Error('item is not accepted by the destination');
    if (def.requiredClass && !def.requiredClass.includes(buyer.class))
      throw new Error('destination class cannot receive this item');
    if (def.requiredLevel && Number(buyer.level) < def.requiredLevel)
      throw new Error('destination level cannot receive this item');
    const buyerState = stateOf(buyer.state);
    const priceCopper = Number(listing.price_copper);
    if (buyerState.copper < priceCopper) throw new Error('buyer funds are not reserved');
    addToInventory(buyerState.inventory, String(listing.item_id), Number(listing.item_count));
    buyerState.copper -= priceCopper;

    const sellerResult = await client.query(
      'SELECT state FROM characters WHERE id = $1 FOR UPDATE',
      [Number(listing.seller_character_id)],
    );
    if (!sellerResult.rows[0]) throw new Error('seller character not found');
    const sellerState = stateOf(sellerResult.rows[0].state);
    const feeCopper = Math.floor((priceCopper * Number(listing.fee_bps)) / 10_000);
    sellerState.copper += priceCopper - feeCopper;
    const provenance = {
      ...(listing.provenance as ExchangeProvenance),
      destinationRealm: destRealm,
      destinationCharacterId: buyerId,
      hops: Number((listing.provenance as ExchangeProvenance).hops ?? 0) + 1,
    } satisfies ExchangeProvenance;
    await client.query('UPDATE characters SET state = $2, updated_at = now() WHERE id = $1', [
      buyerId,
      JSON.stringify(buyerState),
    ]);
    await client.query('UPDATE characters SET state = $2, updated_at = now() WHERE id = $1', [
      Number(listing.seller_character_id),
      JSON.stringify(sellerState),
    ]);
    await client.query(
      `UPDATE exchange_listings
          SET status = 'settled', source_item_locked = FALSE, buyer_character_id = $2,
              destination_realm = $3, provenance = $4, settled_at = now()
        WHERE listing_id = $1`,
      [id, buyerId, destRealm, JSON.stringify(provenance)],
    );
    await insertEvent(client, id, 'settled', buyerId, String(listing.source_realm), destRealm, {
      itemId: String(listing.item_id),
      count: Number(listing.item_count),
      priceCopper,
      feeCopper,
      sellerProceedsCopper: priceCopper - feeCopper,
    });
    await client.query('COMMIT');
    return rowToListing({
      ...listing,
      status: 'settled',
      source_item_locked: false,
      buyer_character_id: buyerId,
      destination_realm: destRealm,
      provenance,
      settled_at: new Date().toISOString(),
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function auditListing(pool: Pool, listingId: string): Promise<ExchangeAuditEvent[]> {
  const result = await pool.query(
    'SELECT * FROM exchange_events WHERE listing_id = $1 ORDER BY occurred_at ASC',
    [text(listingId, 'listing id')],
  );
  return result.rows.map((row) => ({
    eventId: String(row.event_id),
    listingId: String(row.listing_id),
    eventType: row.event_type,
    actorCharacterId: Number(row.actor_character_id),
    sourceRealm: String(row.source_realm),
    destinationRealm: row.destination_realm ? String(row.destination_realm) : undefined,
    payload: row.payload as Record<string, unknown>,
    occurredAt: new Date(String(row.occurred_at)).toISOString(),
  }));
}
