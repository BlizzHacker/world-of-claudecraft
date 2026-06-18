// Purchase ledger types + safety checks. The DB writes live in
// server/economy/db.ts. Append-only — purchases are never updated or
// deleted, only marked refunded with a separate row that references the
// original.

import type { PurchaseRecord, CurrencyId } from './types';

export interface PurchaseRequest {
  buyerAccountId: number;
  itemId: string;
  quantity: number;
  expectedPrice: { amount: number; currency: CurrencyId };
  realmContext: import('../sim/realms/types').RealmId;
}

export interface PurchaseResult {
  ok: boolean;
  record?: PurchaseRecord;
  reason?:
    | 'insufficient-funds'
    | 'item-not-found'
    | 'item-not-purchasable'
    | 'realm-locked'
    | 'requirement-not-met'
    | 'daily-cap-exceeded';
}

/** Validate a request without touching the DB. Lets the API surface 400s
 *  before we open a transaction. */
export function validatePurchaseShape(req: PurchaseRequest): { ok: true } | { ok: false; reason: string } {
  if (req.quantity <= 0) return { ok: false, reason: 'quantity must be positive' };
  if (req.expectedPrice.amount < 0) return { ok: false, reason: 'price must not be negative' };
  return { ok: true };
}
