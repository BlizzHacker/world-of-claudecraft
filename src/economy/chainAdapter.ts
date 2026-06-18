// ChainAdapter interface — the seam that lets the economy work today with no
// blockchain at all, and lets us drop in real Solana calls later without
// rewriting any callers.
//
// LocalMockAdapter (the default) reports isAvailable() = false and throws
// from ownsToken / mintToken. The economy layer always checks isAvailable()
// before touching chain functions; nothing breaks if the chain is offline.

import type { ChainRef } from './types';

export interface ChainAdapter {
  /** Display name (UI uses this in the "Connected to: <name>" pill). */
  readonly name: string;

  /** True when the adapter can make real on-chain calls. False for mocks
   *  and for the production adapter when env vars aren't set. */
  isAvailable(): boolean;

  /** Resolve the on-chain wallet address linked to a local account, if any.
   *  Reads from `economy_wallet_links` table. */
  walletForAccount(accountId: number): Promise<string | null>;

  /** True when `wallet` currently owns at least 1 of the SPL token at the
   *  given mint. Used to gate items behind on-chain ownership. */
  ownsToken(wallet: string, ref: ChainRef): Promise<boolean>;

  /** Return on-chain balance (decimals already applied) of an SPL token
   *  for the given wallet, or null when not linked / not available. */
  tokenBalance(wallet: string, ref: ChainRef): Promise<number | null>;

  /** Mint `amount` of an SPL token to a destination wallet. ONLY called
   *  from server-side claim handlers — the deploy script seeds the mint
   *  authority once and the signer key lives in the server env. */
  mintTo(destWallet: string, ref: ChainRef, amount: number): Promise<{ txSig: string }>;
}

/** No-op adapter used when no chain integration is configured. */
export class LocalMockChainAdapter implements ChainAdapter {
  readonly name = 'local-mock';
  isAvailable(): boolean { return false; }
  async walletForAccount(): Promise<string | null> { return null; }
  async ownsToken(): Promise<boolean> { return false; }
  async tokenBalance(): Promise<number | null> { return null; }
  async mintTo(): Promise<{ txSig: string }> {
    throw new Error('local-mock chain adapter cannot mint — set CR_SOLANA_RPC + CR_SOLANA_MINT to enable real chain');
  }
}

/** Singleton accessor. Server replaces this with the Solana adapter at boot
 *  when env is configured; everything else just imports `getChain()`. */
let _adapter: ChainAdapter = new LocalMockChainAdapter();
export function setChainAdapter(adapter: ChainAdapter): void { _adapter = adapter; }
export function getChain(): ChainAdapter { return _adapter; }
