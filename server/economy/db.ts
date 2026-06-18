// Economy database schema + helpers. Idempotent — every migration is
// IF NOT EXISTS / IF NOT EXISTS COLUMN, safe to re-run on every server boot.
// Plumbed into server/db.ts's existing `ensureSchema` flow via
// `applyEconomySchema(pool)` exported below.

import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type {
  PurchaseRecord, PlatinumAward, PlatinumBalance, CurrencyId,
} from '../../src/economy/types';
import { PLATINUM_REWARDS } from '../../src/economy/platinum_rules';
import { CURRENCIES, PLATINUM_LIFETIME_CAP_PER_ACCOUNT } from '../../src/economy/currencies';
import { platinumDailyCap, platinumLifetimeCap, platinumRewardAmount } from './release_channel';

export const ECONOMY_SCHEMA = `
-- Per-account platinum balance. Off-chain; the canonical record. On-chain
-- balances are derived by reading the wallet's SPL token balance.
CREATE TABLE IF NOT EXISTS economy_platinum (
  account_id      INT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  balance         INT NOT NULL DEFAULT 0,
  lifetime_earned INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only platinum award log. Used for the lifetime cap, daily cap,
-- per-reward cooldown checks, and audit.
CREATE TABLE IF NOT EXISTS economy_platinum_awards (
  id           BIGSERIAL PRIMARY KEY,
  account_id   INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  amount       INT NOT NULL CHECK (amount > 0),
  realm        TEXT NOT NULL,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS economy_platinum_awards_account_reason
  ON economy_platinum_awards(account_id, reason, occurred_at DESC);
CREATE INDEX IF NOT EXISTS economy_platinum_awards_account_date
  ON economy_platinum_awards(account_id, occurred_at DESC);

-- Account -> wallet link. Verified via a signed message at link time.
CREATE TABLE IF NOT EXISTS economy_wallet_links (
  account_id      INT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  wallet_address  TEXT NOT NULL,
  network         TEXT NOT NULL,
  linked_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  link_signature  TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS economy_wallet_links_wallet
  ON economy_wallet_links(wallet_address, network);

-- Append-only purchase ledger.
CREATE TABLE IF NOT EXISTS economy_purchases (
  purchase_id      UUID PRIMARY KEY,
  buyer_account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id          TEXT NOT NULL,
  quantity         INT NOT NULL CHECK (quantity > 0),
  price_amount     INT NOT NULL,
  price_currency   TEXT NOT NULL,
  realm_context    TEXT NOT NULL,
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  chain_tx_sig     TEXT
);
CREATE INDEX IF NOT EXISTS economy_purchases_buyer
  ON economy_purchases(buyer_account_id, occurred_at DESC);

-- Per-account inventory of economy items (cosmetics / mounts / premiums).
-- Distinct from sim inventory (which is per-character, stored in
-- characters.state JSONB).
CREATE TABLE IF NOT EXISTS economy_inventory (
  ownership_id     UUID PRIMARY KEY,
  account_id       INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id          TEXT NOT NULL,
  realm_acquired   TEXT NOT NULL,
  acquired_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  stack            INT NOT NULL DEFAULT 1 CHECK (stack > 0),
  bound            BOOLEAN NOT NULL DEFAULT FALSE,
  chain_wallet     TEXT,
  chain_token_acct TEXT,
  chain_network    TEXT
);
CREATE INDEX IF NOT EXISTS economy_inventory_account
  ON economy_inventory(account_id, item_id);

-- Pending claims. When a player asks to mint their platinum to chain, we
-- create a row here, debit the off-chain balance, attempt the on-chain
-- mint, and either mark fulfilled (with tx sig) or refund the platinum on
-- failure.
CREATE TABLE IF NOT EXISTS economy_claims (
  claim_id     UUID PRIMARY KEY,
  account_id   INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount       INT NOT NULL CHECK (amount > 0),
  wallet       TEXT NOT NULL,
  network      TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('pending','fulfilled','failed','refunded')),
  tx_sig       TEXT,
  failure      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS economy_claims_account
  ON economy_claims(account_id, created_at DESC);
`;

export async function applyEconomySchema(pool: Pool): Promise<void> {
  await pool.query(ECONOMY_SCHEMA);
}

// ── Platinum award / balance ───────────────────────────────────────────

/** Award platinum to an account, subject to per-reward cooldown, daily cap,
 *  lifetime cap. Returns the new balance or null when no award was granted
 *  (cooldown / cap blocked). */
export async function awardPlatinum(
  pool: Pool,
  accountId: number,
  reason: string,
  realm: string,
): Promise<{ awarded: number; newBalance: number; reasonBlocked?: string } | null> {
  const rewardDef = PLATINUM_REWARDS[reason];
  if (!rewardDef) return { awarded: 0, newBalance: 0, reasonBlocked: 'unknown-reason' };
  const awardAmount = platinumRewardAmount(rewardDef.amount);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Cooldown / once-per-lifetime check.
    if (rewardDef.oncePerLifetime) {
      const existing = await client.query(
        'SELECT 1 FROM economy_platinum_awards WHERE account_id = $1 AND reason = $2 LIMIT 1',
        [accountId, reason],
      );
      if (existing.rows.length) {
        await client.query('ROLLBACK');
        return { awarded: 0, newBalance: 0, reasonBlocked: 'already-claimed' };
      }
    } else if (rewardDef.cooldownSec > 0) {
      const cooldownAt = new Date(Date.now() - rewardDef.cooldownSec * 1000).toISOString();
      const recent = await client.query(
        'SELECT 1 FROM economy_platinum_awards WHERE account_id = $1 AND reason = $2 AND occurred_at > $3 LIMIT 1',
        [accountId, reason, cooldownAt],
      );
      if (recent.rows.length) {
        await client.query('ROLLBACK');
        return { awarded: 0, newBalance: 0, reasonBlocked: 'cooldown' };
      }
    }

    // 2. Daily cap.
    const dailyCap = platinumDailyCap(CURRENCIES.platinum.dailyCapPerAccount);
    if (dailyCap > 0) {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const dayTotalRes = await client.query<{ sum: string }>(
        'SELECT COALESCE(SUM(amount), 0)::TEXT AS sum FROM economy_platinum_awards WHERE account_id = $1 AND occurred_at > $2',
        [accountId, since],
      );
      const dayTotal = Number(dayTotalRes.rows[0]?.sum ?? '0');
      if (dayTotal + awardAmount > dailyCap) {
        await client.query('ROLLBACK');
        return { awarded: 0, newBalance: 0, reasonBlocked: 'daily-cap' };
      }
    }

    // 3. Lifetime cap.
    await client.query(
      `INSERT INTO economy_platinum (account_id, balance, lifetime_earned)
       VALUES ($1, 0, 0)
       ON CONFLICT (account_id) DO NOTHING`,
      [accountId],
    );
    const lifeRes = await client.query<{ lifetime_earned: number }>(
      'SELECT lifetime_earned FROM economy_platinum WHERE account_id = $1',
      [accountId],
    );
    const lifetime = lifeRes.rows[0]?.lifetime_earned ?? 0;
    const lifetimeCap = platinumLifetimeCap(PLATINUM_LIFETIME_CAP_PER_ACCOUNT);
    if (lifetime + awardAmount > lifetimeCap) {
      await client.query('ROLLBACK');
      return { awarded: 0, newBalance: 0, reasonBlocked: 'lifetime-cap' };
    }

    // 4. Write award log + bump balances.
    await client.query(
      'INSERT INTO economy_platinum_awards (account_id, reason, amount, realm) VALUES ($1, $2, $3, $4)',
      [accountId, reason, awardAmount, realm],
    );
    const updated = await client.query<{ balance: number }>(
      `UPDATE economy_platinum
         SET balance = balance + $2,
             lifetime_earned = lifetime_earned + $2,
             updated_at = now()
       WHERE account_id = $1
       RETURNING balance`,
      [accountId, awardAmount],
    );

    await client.query('COMMIT');
    return { awarded: awardAmount, newBalance: updated.rows[0]?.balance ?? awardAmount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Read the current platinum balance + lifetime + wallet link for an account. */
export async function getPlatinumBalance(pool: Pool, accountId: number): Promise<PlatinumBalance> {
  const [bal, link] = await Promise.all([
    pool.query<{ balance: number; lifetime_earned: number }>(
      'SELECT balance, lifetime_earned FROM economy_platinum WHERE account_id = $1',
      [accountId],
    ),
    pool.query<{ wallet_address: string }>(
      'SELECT wallet_address FROM economy_wallet_links WHERE account_id = $1',
      [accountId],
    ),
  ]);
  return {
    accountId,
    offChainBalance: bal.rows[0]?.balance ?? 0,
    onChainBalance: null,
    lifetimeEarned: bal.rows[0]?.lifetime_earned ?? 0,
    walletAddress: link.rows[0]?.wallet_address ?? null,
  };
}

// ── Wallet link ─────────────────────────────────────────────────────────

export async function linkWallet(
  pool: Pool,
  accountId: number,
  walletAddress: string,
  network: 'solana' | 'solana-devnet',
  signature: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO economy_wallet_links (account_id, wallet_address, network, link_signature)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (account_id) DO UPDATE
       SET wallet_address = EXCLUDED.wallet_address,
           network = EXCLUDED.network,
           link_signature = EXCLUDED.link_signature,
           linked_at = now()`,
    [accountId, walletAddress, network, signature],
  );
}

// ── Purchase ledger ─────────────────────────────────────────────────────

export async function recordPurchase(
  pool: Pool,
  rec: Omit<PurchaseRecord, 'purchaseId' | 'occurredAt'>,
): Promise<PurchaseRecord> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO economy_purchases (
       purchase_id, buyer_account_id, item_id, quantity,
       price_amount, price_currency, realm_context, occurred_at, chain_tx_sig
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id, rec.buyerAccountId, rec.itemId, rec.quantity,
      rec.pricePaid.amount, rec.pricePaid.currency, rec.realmContext, now, rec.chainTxSig ?? null,
    ],
  );
  return { ...rec, purchaseId: id, occurredAt: now };
}

export async function listPurchases(pool: Pool, accountId: number, limit = 100): Promise<PurchaseRecord[]> {
  const res = await pool.query<{
    purchase_id: string; buyer_account_id: number; item_id: string; quantity: number;
    price_amount: number; price_currency: CurrencyId; realm_context: string;
    occurred_at: string; chain_tx_sig: string | null;
  }>(
    `SELECT purchase_id, buyer_account_id, item_id, quantity,
            price_amount, price_currency, realm_context, occurred_at, chain_tx_sig
       FROM economy_purchases
       WHERE buyer_account_id = $1
       ORDER BY occurred_at DESC
       LIMIT $2`,
    [accountId, limit],
  );
  return res.rows.map((r) => ({
    purchaseId: r.purchase_id,
    buyerAccountId: r.buyer_account_id,
    itemId: r.item_id,
    quantity: r.quantity,
    pricePaid: { amount: r.price_amount, currency: r.price_currency },
    realmContext: r.realm_context as import('../../src/sim/realms/types').RealmId,
    occurredAt: r.occurred_at,
    chainTxSig: r.chain_tx_sig ?? undefined,
  }));
}

// ── Claims (off-chain → on-chain) ───────────────────────────────────────

export async function createClaim(
  pool: Pool,
  accountId: number,
  amount: number,
  wallet: string,
  network: 'solana' | 'solana-devnet',
): Promise<{ claimId: string } | { error: string }> {
  if (amount <= 0) return { error: 'amount must be positive' };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bal = await client.query<{ balance: number }>(
      'SELECT balance FROM economy_platinum WHERE account_id = $1 FOR UPDATE',
      [accountId],
    );
    const current = bal.rows[0]?.balance ?? 0;
    if (current < amount) {
      await client.query('ROLLBACK');
      return { error: 'insufficient-platinum' };
    }
    // Debit off-chain balance up-front; we'll refund on failure.
    await client.query(
      'UPDATE economy_platinum SET balance = balance - $2, updated_at = now() WHERE account_id = $1',
      [accountId, amount],
    );
    const id = randomUUID();
    await client.query(
      `INSERT INTO economy_claims (claim_id, account_id, amount, wallet, network, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [id, accountId, amount, wallet, network],
    );
    await client.query('COMMIT');
    return { claimId: id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function markClaimFulfilled(pool: Pool, claimId: string, txSig: string): Promise<void> {
  await pool.query(
    `UPDATE economy_claims
       SET status = 'fulfilled', tx_sig = $2, resolved_at = now()
       WHERE claim_id = $1 AND status = 'pending'`,
    [claimId, txSig],
  );
}

export async function refundClaim(pool: Pool, claimId: string, reason: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query<{ account_id: number; amount: number; status: string }>(
      `UPDATE economy_claims SET status = 'refunded', failure = $2, resolved_at = now()
         WHERE claim_id = $1 AND status = 'pending'
         RETURNING account_id, amount, status`,
      [claimId, reason],
    );
    if (r.rows.length) {
      await client.query(
        'UPDATE economy_platinum SET balance = balance + $2, updated_at = now() WHERE account_id = $1',
        [r.rows[0].account_id, r.rows[0].amount],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Inventory (economy items) ───────────────────────────────────────────

export async function grantItem(
  pool: Pool,
  accountId: number,
  itemId: string,
  realmAcquired: string,
  bound: boolean,
): Promise<{ ownershipId: string }> {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO economy_inventory (ownership_id, account_id, item_id, realm_acquired, bound)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, accountId, itemId, realmAcquired, bound],
  );
  return { ownershipId: id };
}

export async function listInventory(pool: Pool, accountId: number): Promise<{
  ownershipId: string; itemId: string; realmAcquired: string; stack: number; bound: boolean;
}[]> {
  const res = await pool.query<{
    ownership_id: string; item_id: string; realm_acquired: string; stack: number; bound: boolean;
  }>(
    `SELECT ownership_id, item_id, realm_acquired, stack, bound
       FROM economy_inventory WHERE account_id = $1
       ORDER BY acquired_at DESC`,
    [accountId],
  );
  return res.rows.map((r) => ({
    ownershipId: r.ownership_id,
    itemId: r.item_id,
    realmAcquired: r.realm_acquired,
    stack: r.stack,
    bound: r.bound,
  }));
}
