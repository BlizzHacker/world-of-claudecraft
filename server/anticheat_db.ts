// Anti-cheat treasury ledger. When a cheater is banned/confiscated, we record an
// auditable row in anticheat_ledger noting how much crypto is owed FROM their
// wallet TO the banned-account/hardening treasury. We NEVER move funds here —
// the admin wallet performs the on-chain refund out-of-band and then calls
// markRefundSettled(). This module is the trackable ledger + read APIs only.
//
// Schema lives in db.ts SCHEMA (anticheat_ledger), applied at boot.
import { pool } from './db';
import { REALM } from './realm';

export interface AnticheatEntryInput {
  accountId: number | null;
  characterName?: string | null;
  reason: string;
  evidence?: unknown;
  botScore?: number | null;
  cheaterWallet?: string | null;
  refundAmount?: number;        // amount owed to the treasury
  refundCurrency?: string;      // default 'CR'
}

export interface AnticheatRow {
  id: string;
  account_id: number | null;
  character_name: string | null;
  realm: string;
  reason: string;
  evidence: unknown;
  bot_score: number | null;
  cheater_wallet: string | null;
  refund_amount: string;        // NUMERIC comes back as string from pg
  refund_currency: string;
  refund_status: 'pending' | 'settled' | 'failed';
  refund_tx: string | null;
  created_at: string;
  settled_at: string | null;
}

/** Record a cheating action + the treasury refund owed. Returns the ledger id. */
export async function recordAnticheatEntry(input: AnticheatEntryInput): Promise<string | null> {
  try {
    const res = await pool.query(
      `INSERT INTO anticheat_ledger
         (account_id, character_name, realm, reason, evidence, bot_score,
          cheater_wallet, refund_amount, refund_currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        input.accountId,
        input.characterName ?? null,
        REALM,
        input.reason.slice(0, 2000),
        input.evidence ? JSON.stringify(input.evidence) : null,
        input.botScore ?? null,
        input.cheaterWallet ?? null,
        input.refundAmount ?? 0,
        input.refundCurrency ?? 'CR',
      ],
    );
    return String(res.rows[0]?.id ?? '');
  } catch (err) {
    console.error('recordAnticheatEntry failed:', err);
    return null;
  }
}

/** Pending refunds the admin wallet still needs to settle on-chain. */
export async function listPendingRefunds(limit = 100): Promise<AnticheatRow[]> {
  const res = await pool.query(
    `SELECT * FROM anticheat_ledger WHERE refund_status = 'pending'
     ORDER BY created_at DESC LIMIT $1`,
    [Math.min(Math.max(1, limit), 500)],
  );
  return res.rows;
}

/** Admin marks a refund settled AFTER performing the on-chain transfer. The
 *  tx hash is recorded for the public audit trail. We do not move funds. */
export async function markRefundSettled(id: string, tx: string): Promise<boolean> {
  try {
    const res = await pool.query(
      `UPDATE anticheat_ledger
         SET refund_status = 'settled', refund_tx = $2, settled_at = now()
       WHERE id = $1 AND refund_status = 'pending'`,
      [id, tx.slice(0, 200)],
    );
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    console.error('markRefundSettled failed:', err);
    return false;
  }
}

export async function markRefundFailed(id: string, note: string): Promise<boolean> {
  try {
    const res = await pool.query(
      `UPDATE anticheat_ledger SET refund_status = 'failed', refund_tx = $2
       WHERE id = $1 AND refund_status = 'pending'`,
      [id, note.slice(0, 200)],
    );
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    console.error('markRefundFailed failed:', err);
    return false;
  }
}
