// Economy REST API. Mounted by server/main.ts under `/api/economy/*`.
//
//   GET  /api/economy/catalog              → realm-filtered item catalog
//   GET  /api/economy/inventory            → caller's economy inventory
//   GET  /api/economy/platinum             → caller's platinum balance
//   POST /api/economy/wallet-challenge     → issue a SIWS challenge
//   POST /api/economy/wallet-link          → verify + link wallet
//   POST /api/economy/claim                → claim N platinum → mint to wallet
//
// Every response embeds ECONOMY_DISCLOSURE so machine consumers and the
// frontend get the not-investment language inline.

import * as http from 'node:http';
import { json, readBody } from '../http_util';
import { pool, accountForToken, isAdminAccount } from '../db';
import { REALM } from '../realm';
import {
  ECONOMY_ITEMS, itemsForRealmContext,
} from '../../src/economy/itemCatalog';
import { ECONOMY_DISCLOSURE } from '../../src/economy/types';
import { CURRENCIES, PLATINUM_LIFETIME_CAP_PER_ACCOUNT } from '../../src/economy/currencies';
import { buildSignChallenge, isChallengeExpired, type SignChallenge } from '../../src/economy/walletService';
import {
  awardPlatinum, getPlatinumBalance, linkWallet, listInventory, createClaim,
  markClaimFulfilled, refundClaim,
} from './db';
import { verifySolanaSignature } from './solana_verify';
import { getChain } from '../../src/economy/chainAdapter';
import { isRealmId } from '../../src/sim/realms';
import { releaseChannelInfo } from './release_channel';

function ok(res: http.ServerResponse, data: unknown): void {
  json(res, 200, { success: true, data, error: null, disclosure: ECONOMY_DISCLOSURE });
}
function fail(res: http.ServerResponse, status: number, error: string): void {
  json(res, status, { success: false, data: null, error, disclosure: ECONOMY_DISCLOSURE });
}

async function bearerAccountId(req: http.IncomingMessage): Promise<number | null> {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '');
  if (!m) return null;
  return accountForToken(m[1]);
}

// In-memory challenge store. SIWS-style — challenge is short-lived so a
// process restart wipes them all, which is fine.
const challenges = new Map<number, SignChallenge>();

const CR_SOLANA_MINT = (process.env.CR_SOLANA_MINT ?? '').trim();
const CR_SOLANA_NETWORK = (process.env.CR_SOLANA_NETWORK ?? 'solana') as 'solana' | 'solana-devnet';

/** Dispatch. Returns true when the path matched + we wrote a response. */
export async function maybeHandleEconomyApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (!pathname.startsWith('/api/economy/')) return false;

  try {
    if (pathname === '/api/economy/catalog' && req.method === 'GET') {
      const realmParam = new URL(req.url ?? '/', 'http://x').searchParams.get('realm');
      if (realmParam && !isRealmId(realmParam)) return fail(res, 400, 'invalid realm'), true;
      const realm = (realmParam ?? null) as Parameters<typeof itemsForRealmContext>[0] | null;
      const items = realm ? itemsForRealmContext(realm) : Object.values(ECONOMY_ITEMS);
      ok(res, {
        items,
        currencies: CURRENCIES,
        platinumLifetimeCap: PLATINUM_LIFETIME_CAP_PER_ACCOUNT,
        releaseChannel: releaseChannelInfo(),
        chain: { name: getChain().name, available: getChain().isAvailable() },
      });
      return true;
    }

    if (pathname === '/api/economy/inventory' && req.method === 'GET') {
      const aid = await bearerAccountId(req);
      if (aid === null) return fail(res, 401, 'not authenticated'), true;
      ok(res, await listInventory(pool, aid));
      return true;
    }

    if (pathname === '/api/economy/platinum' && req.method === 'GET') {
      const aid = await bearerAccountId(req);
      if (aid === null) return fail(res, 401, 'not authenticated'), true;
      const bal = await getPlatinumBalance(pool, aid);
      // If wallet is linked + chain is configured, attach the live on-chain
      // balance so the UI can show both numbers side by side.
      if (bal.walletAddress && CR_SOLANA_MINT && getChain().isAvailable()) {
        bal.onChainBalance = await getChain().tokenBalance(
          bal.walletAddress,
          { network: CR_SOLANA_NETWORK, mintAddress: CR_SOLANA_MINT },
        );
      }
      ok(res, bal);
      return true;
    }

    if (pathname === '/api/economy/wallet-challenge' && req.method === 'POST') {
      const aid = await bearerAccountId(req);
      if (aid === null) return fail(res, 401, 'not authenticated'), true;
      const challenge = buildSignChallenge(aid);
      challenges.set(aid, challenge);
      ok(res, challenge);
      return true;
    }

    if (pathname === '/api/economy/wallet-link' && req.method === 'POST') {
      const aid = await bearerAccountId(req);
      if (aid === null) return fail(res, 401, 'not authenticated'), true;
      const body = (await readBody(req)) as { wallet?: unknown; signature?: unknown; network?: unknown };
      const wallet = typeof body.wallet === 'string' ? body.wallet : '';
      const signature = typeof body.signature === 'string' ? body.signature : '';
      const network = (body.network === 'solana-devnet' ? 'solana-devnet' : 'solana') as 'solana' | 'solana-devnet';
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) return fail(res, 400, 'invalid wallet address'), true;
      if (!signature) return fail(res, 400, 'missing signature'), true;
      const challenge = challenges.get(aid);
      if (!challenge) return fail(res, 400, 'no active challenge — request a new one'), true;
      if (isChallengeExpired(challenge)) {
        challenges.delete(aid);
        return fail(res, 400, 'challenge expired — request a new one'), true;
      }
      const valid = await verifySolanaSignature(challenge.message, signature, wallet);
      if (!valid) return fail(res, 401, 'signature did not verify'), true;
      await linkWallet(pool, aid, wallet, network, signature);
      challenges.delete(aid);
      ok(res, { wallet, network, linked: true });
      return true;
    }

    if (pathname === '/api/economy/claim' && req.method === 'POST') {
      const aid = await bearerAccountId(req);
      if (aid === null) return fail(res, 401, 'not authenticated'), true;
      if (!getChain().isAvailable()) return fail(res, 503, 'chain not configured'), true;
      if (!CR_SOLANA_MINT) return fail(res, 503, 'CR_SOLANA_MINT not set'), true;
      const body = (await readBody(req)) as { amount?: unknown };
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000) {
        return fail(res, 400, 'amount must be a positive number ≤ 10000'), true;
      }
      const bal = await getPlatinumBalance(pool, aid);
      if (!bal.walletAddress) return fail(res, 400, 'no wallet linked'), true;
      const created = await createClaim(pool, aid, amount, bal.walletAddress, CR_SOLANA_NETWORK);
      if ('error' in created) return fail(res, 400, created.error), true;
      try {
        const tx = await getChain().mintTo(
          bal.walletAddress,
          { network: CR_SOLANA_NETWORK, mintAddress: CR_SOLANA_MINT },
          amount,
        );
        await markClaimFulfilled(pool, created.claimId, tx.txSig);
        ok(res, { claimId: created.claimId, txSig: tx.txSig, status: 'fulfilled' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'mint failed';
        await refundClaim(pool, created.claimId, msg);
        return fail(res, 502, `mint failed (refunded): ${msg}`), true;
      }
      return true;
    }

    // Admin-only: manually award platinum (for testing + ops). Body:
    //   { accountId, reason, realm }
    if (pathname === '/api/economy/admin/award-platinum' && req.method === 'POST') {
      const aid = await bearerAccountId(req);
      if (aid === null) return fail(res, 401, 'not authenticated'), true;
      if (!(await isAdminAccount(aid))) return fail(res, 403, 'admin only'), true;
      const body = (await readBody(req)) as { accountId?: unknown; reason?: unknown; realm?: unknown };
      const targetId = Number(body.accountId);
      const reason = String(body.reason ?? '');
      const realm = String(body.realm ?? REALM);
      if (!Number.isFinite(targetId)) return fail(res, 400, 'accountId required'), true;
      if (!reason) return fail(res, 400, 'reason required'), true;
      const result = await awardPlatinum(pool, targetId, reason, realm);
      ok(res, result);
      return true;
    }

    return fail(res, 404, 'economy route not found'), true;
  } catch (err) {
    return fail(res, 500, err instanceof Error ? err.message : 'internal'), true;
  }
}
