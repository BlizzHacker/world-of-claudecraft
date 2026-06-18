// Wallet service. Two responsibilities:
//
//   1. Issue a per-account signature challenge that the player signs in
//      their Phantom/Solflare wallet. The server verifies the signature
//      and writes the (accountId, walletAddress) pair into
//      `economy_wallet_links`. Same pattern used by every Sign-In-With-Solana
//      / Sign-In-With-Ethereum flow.
//
//   2. Resolve an accountId → linked wallet address (and back) for the
//      economy + chain layers.
//
// We deliberately don't import any chain library here; that lives in
// `solanaAdapter.ts` and `server/economy/solana_verify.ts`. This module
// stays small and dependency-free so it can be reused by tests.

import { randomBytes } from 'node:crypto';

/** A challenge string the wallet signs. Includes a domain + nonce + ttl. */
export interface SignChallenge {
  message: string;
  nonce: string;
  issuedAt: string;     // ISO-8601 UTC
  expiresAt: string;    // ISO-8601 UTC
  accountId: number;
}

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

/** Build a challenge string. The wallet signs the `message` field. The server
 *  later verifies (signature, publicKey, message) with ed25519. */
export function buildSignChallenge(accountId: number, domain = 'crypticrealm.com'): SignChallenge {
  const nonce = randomBytes(16).toString('hex');
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  // Standard SIWS-style message body. The wallet shows this verbatim to
  // the user, so we keep it plain English + machine-parseable.
  const message =
    `${domain} wants you to sign in with your Solana account.\n\n` +
    `Account: ${accountId}\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${issuedAt}\n` +
    `Expires At: ${expiresAt}`;
  return { message, nonce, issuedAt, expiresAt, accountId };
}

export function isChallengeExpired(challenge: SignChallenge, now: Date = new Date()): boolean {
  return now.getTime() > new Date(challenge.expiresAt).getTime();
}

/** Shape persisted into `economy_wallet_links`. */
export interface WalletLink {
  accountId: number;
  walletAddress: string;
  network: 'solana' | 'solana-devnet';
  linkedAt: string;
  /** Signature the user provided on link — kept for audit. */
  linkSignature: string;
}
