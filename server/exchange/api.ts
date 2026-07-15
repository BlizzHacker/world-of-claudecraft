// REST surface for Exchange custody. Authentication and character ownership
// are checked here; all item/currency mutations are delegated to db.ts.

import type * as http from 'node:http';
import { accountForToken, pool } from '../db';
import { json, readBody } from '../http_util';
import {
  auditListing,
  cancelListing,
  createListing,
  listActiveListings,
  settleListing,
} from './db';

function fail(res: http.ServerResponse, status: number, error: string): void {
  json(res, status, { ok: false, error });
}

function ok(res: http.ServerResponse, data: unknown): void {
  json(res, 200, { ok: true, data });
}

async function bearerAccountId(req: http.IncomingMessage): Promise<number | null> {
  const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '')?.[1];
  return token ? accountForToken(token) : null;
}

async function ownedCharacter(accountId: number, characterId: number): Promise<boolean> {
  const row = await pool.query('SELECT 1 FROM characters WHERE id = $1 AND account_id = $2', [
    characterId,
    accountId,
  ]);
  return row.rows.length > 0;
}

function idFrom(pathname: string, suffix: string): string | null {
  const prefix = `/api/exchange/listings/`;
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) return null;
  const id = pathname.slice(prefix.length, pathname.length - suffix.length);
  return id && !id.includes('/') ? id : null;
}

/** Dispatch. Returns true when the path matched and a response was written. */
export async function maybeHandleExchangeApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (!pathname.startsWith('/api/exchange/')) return false;
  try {
    if (pathname === '/api/exchange/listings' && req.method === 'GET') {
      const destination =
        new URL(req.url ?? '/', 'http://localhost').searchParams.get('destinationRealm') ??
        undefined;
      ok(res, await listActiveListings(pool, destination));
      return true;
    }
    if (pathname === '/api/exchange/listings' && req.method === 'POST') {
      const accountId = await bearerAccountId(req);
      if (accountId === null) {
        fail(res, 401, 'not authenticated');
        return true;
      }
      const body = (await readBody(req)) as {
        characterId?: unknown;
        itemId?: unknown;
        count?: unknown;
        priceCopper?: unknown;
        idempotencyKey?: unknown;
      };
      const characterId = Number(body.characterId);
      if (!Number.isSafeInteger(characterId) || !(await ownedCharacter(accountId, characterId))) {
        fail(res, 404, 'character not found');
        return true;
      }
      ok(
        res,
        await createListing(pool, {
          sellerCharacterId: characterId,
          itemId: String(body.itemId ?? ''),
          count: Number(body.count),
          priceCopper: Number(body.priceCopper),
          idempotencyKey:
            req.headers['idempotency-key']?.toString() ??
            (typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined),
        }),
      );
      return true;
    }
    const cancelId = idFrom(pathname, '/cancel');
    if (cancelId && req.method === 'POST') {
      const accountId = await bearerAccountId(req);
      if (accountId === null) {
        fail(res, 401, 'not authenticated');
        return true;
      }
      const body = (await readBody(req)) as { characterId?: unknown };
      const characterId = Number(body.characterId);
      if (!Number.isSafeInteger(characterId) || !(await ownedCharacter(accountId, characterId))) {
        fail(res, 404, 'character not found');
        return true;
      }
      ok(res, await cancelListing(pool, cancelId, characterId));
      return true;
    }
    const settleId = idFrom(pathname, '/settle');
    if (settleId && req.method === 'POST') {
      const accountId = await bearerAccountId(req);
      if (accountId === null) {
        fail(res, 401, 'not authenticated');
        return true;
      }
      const body = (await readBody(req)) as { characterId?: unknown };
      const characterId = Number(body.characterId);
      if (!Number.isSafeInteger(characterId) || !(await ownedCharacter(accountId, characterId))) {
        fail(res, 404, 'character not found');
        return true;
      }
      const character = await pool.query(
        'SELECT realm FROM characters WHERE id = $1 AND account_id = $2',
        [characterId, accountId],
      );
      const destinationRealm = String(character.rows[0]?.realm ?? '');
      ok(res, await settleListing(pool, settleId, characterId, destinationRealm));
      return true;
    }
    const auditId = idFrom(pathname, '/audit');
    if (auditId && req.method === 'GET') {
      ok(res, await auditListing(pool, auditId));
      return true;
    }
    fail(res, 404, 'exchange route not found');
    return true;
  } catch (err) {
    fail(res, 400, err instanceof Error ? err.message : 'exchange request failed');
    return true;
  }
}
