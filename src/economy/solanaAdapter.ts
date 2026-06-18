// Solana ChainAdapter. Server-only: the browser never imports this; the
// browser uses src/economy/phantom_client.ts and asks the server to mint via
// /api/economy/claim.
//
// The production adapter shells out to the official `spl-token` CLI with fixed
// argument arrays. That keeps the app dependency graph free of the Solana JS
// SDK while still letting an LXC with the CLI installed mint player claims.

import { execFile } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { promisify } from 'node:util';
import type { ChainAdapter } from './chainAdapter';
import type { ChainRef } from './types';

const execFileAsync = promisify(execFile);
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const CLI_TIMEOUT_MS = 45_000;

export interface SolanaAdapterConfig {
  /** RPC endpoint. Defaults to mainnet-beta if undefined. */
  rpcUrl: string;
  /** Base58 mint address of the project's SPL token. */
  mintAddress: string;
  /** Path to the mint-authority keypair JSON on disk. */
  mintAuthorityKeypairPath: string;
  /** Decimals the token was created with. SPL standard = 9. */
  decimals: number;
  /** 'solana' | 'solana-devnet'. */
  network: 'solana' | 'solana-devnet';
  /** Optional path to spl-token. Defaults to PATH lookup. */
  splTokenCli?: string;
}

function validateAddress(label: string, value: string): void {
  if (!SOLANA_ADDRESS_RE.test(value)) {
    throw new Error(`invalid Solana ${label}`);
  }
}

function assertConfiguredMint(cfg: SolanaAdapterConfig, ref: ChainRef): string {
  validateAddress('mint address', ref.mintAddress);
  if (ref.mintAddress !== cfg.mintAddress) {
    throw new Error('refusing to mint or query an unexpected token');
  }
  return ref.mintAddress;
}

function amountForCli(amount: number, decimals: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be positive');
  }
  const scale = Math.pow(10, decimals);
  const raw = Math.floor(amount * scale);
  if (raw <= 0) throw new Error(`amount is below token precision (${decimals} decimals)`);
  return (raw / scale).toFixed(decimals).replace(/\.?0+$/, '');
}

function parseJson(stdout: string): any {
  const text = stdout.trim();
  if (!text) return null;
  return JSON.parse(text);
}

function isMissingTokenAccount(msg: string): boolean {
  return /could not find token account|account not found|no account/i.test(msg);
}

function isAlreadyExists(msg: string): boolean {
  return /already.*(exists|in use)|account.*exists|custom program error: 0x0/i.test(msg);
}

async function runSpl(cfg: SolanaAdapterConfig, args: string[]): Promise<string> {
  const bin = cfg.splTokenCli || 'spl-token';
  try {
    const { stdout } = await execFileAsync(bin, args, {
      timeout: CLI_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    return String(stdout);
  } catch (err: any) {
    const stdout = String(err?.stdout ?? '');
    const stderr = String(err?.stderr ?? '');
    const detail = (stderr || stdout || err?.message || 'unknown error').trim();
    throw new Error(`spl-token ${args[0] ?? ''} failed: ${detail}`);
  }
}

async function ensureRecipientAccount(cfg: SolanaAdapterConfig, mint: string, owner: string): Promise<void> {
  try {
    await runSpl(cfg, [
      'create-account', mint,
      '--owner', owner,
      '--fee-payer', cfg.mintAuthorityKeypairPath,
      '--url', cfg.rpcUrl,
      '--output', 'json',
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!isAlreadyExists(msg)) throw err;
  }
}

async function probeCli(cfg: SolanaAdapterConfig): Promise<void> {
  validateAddress('mint address', cfg.mintAddress);
  accessSync(cfg.mintAuthorityKeypairPath, constants.R_OK);
  await runSpl(cfg, ['--version']);
}

export async function loadSolanaAdapter(cfg: SolanaAdapterConfig): Promise<ChainAdapter> {
  const fullCfg = {
    ...cfg,
    splTokenCli: cfg.splTokenCli
      || (process.env.CR_SPL_TOKEN_CLI ?? process.env.SPL_TOKEN_CLI ?? '').trim()
      || 'spl-token',
  };

  try {
    await probeCli(fullCfg);
  } catch (err) {
    console.error('Solana adapter requested but spl-token CLI is not available/configured:', err);
    return makeUnavailable();
  }

  const tokenBalance = async (wallet: string, ref: ChainRef): Promise<number | null> => {
    try {
      validateAddress('wallet address', wallet);
      const mint = assertConfiguredMint(fullCfg, ref);
      const out = await runSpl(fullCfg, [
        'balance', mint,
        '--owner', wallet,
        '--url', fullCfg.rpcUrl,
        '--output', 'json',
      ]);
      const data = parseJson(out);
      const value = Number(data?.uiAmountString ?? data?.uiAmount);
      return Number.isFinite(value) ? value : null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isMissingTokenAccount(msg)) return 0;
      console.error('Solana adapter: tokenBalance failed:', err);
      return null;
    }
  };

  return {
    name: fullCfg.network === 'solana-devnet' ? 'solana-devnet' : 'solana',
    isAvailable: () => true,

    async walletForAccount(_accountId: number): Promise<string | null> {
      return null;
    },

    async ownsToken(wallet: string, ref: ChainRef): Promise<boolean> {
      const balance = await tokenBalance(wallet, ref);
      return balance !== null && balance > 0;
    },

    tokenBalance,

    async mintTo(destWallet: string, ref: ChainRef, amount: number): Promise<{ txSig: string }> {
      validateAddress('destination wallet address', destWallet);
      const mint = assertConfiguredMint(fullCfg, ref);
      const tokenAmount = amountForCli(amount, fullCfg.decimals);
      await ensureRecipientAccount(fullCfg, mint, destWallet);
      const out = await runSpl(fullCfg, [
        'mint', mint, tokenAmount,
        '--recipient-owner', destWallet,
        '--mint-authority', fullCfg.mintAuthorityKeypairPath,
        '--fee-payer', fullCfg.mintAuthorityKeypairPath,
        '--url', fullCfg.rpcUrl,
        '--output', 'json',
      ]);
      const data = parseJson(out);
      const sig = String(data?.signature ?? '').trim();
      if (!sig) throw new Error('spl-token mint did not return a signature');
      return { txSig: sig };
    },
  };
}

function makeUnavailable(): ChainAdapter {
  return {
    name: 'solana-unavailable',
    isAvailable: () => false,
    async walletForAccount() { return null; },
    async ownsToken() { return false; },
    async tokenBalance() { return null; },
    async mintTo() { throw new Error('Solana adapter not available'); },
  };
}

/** Read env + build the adapter when the server boots. */
export async function maybeBuildSolanaFromEnv(): Promise<ChainAdapter | null> {
  const rpcUrl = (process.env.CR_SOLANA_RPC ?? '').trim();
  const mintAddress = (process.env.CR_SOLANA_MINT ?? '').trim();
  const mintAuthPath = (process.env.CR_SOLANA_MINT_AUTHORITY ?? '').trim();
  const decimals = Number(process.env.CR_SOLANA_DECIMALS ?? '9');
  const network = (process.env.CR_SOLANA_NETWORK ?? 'solana') as 'solana' | 'solana-devnet';
  const splTokenCli = (process.env.CR_SPL_TOKEN_CLI ?? process.env.SPL_TOKEN_CLI ?? '').trim() || undefined;
  if (!rpcUrl || !mintAddress || !mintAuthPath) return null;
  return loadSolanaAdapter({
    rpcUrl,
    mintAddress,
    mintAuthorityKeypairPath: mintAuthPath,
    decimals,
    network,
    splTokenCli,
  });
}
