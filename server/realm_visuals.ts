// Runtime, admin-editable overrides for realm class/NPC body assets. The code
// ships default class/NPC -> GLB assignments (src/ui/cryptic/realm_class_presentation
// + src/render/characters/infernal_roster); this store lets an operator reassign
// any of them on the fly from either the in-game builder or arcforge.moveweight.com
// (which proxies /api/* to the game) and have it take effect for every player on
// the next load, with NO code deploy. Persisted realm-scoped in world_state under
// `realm_visuals:<realm>`, so a write from any realm process is read by all.
//
// Routes (mounted in main.ts routeHttpRequest, next to the asset-library arm):
//   GET    /api/realm-visuals/<realm>            -> { realm, overrides } (public read)
//   PUT    /api/realm-visuals/<realm>            -> upsert one override (admin only)
//     body { key, assetUrl, assetName? }
//   DELETE /api/realm-visuals/<realm>?key=<key>  -> remove one override (admin only)
//
// A write is gated to a full-scope ADMIN session (the operator's own account),
// mirroring the arcforge builder gate. The read is public: it only names which
// GLB a class/NPC uses, which the client needs to render anyway.

import type http from 'node:http';
import { accountAndScopeForToken, isAdminAccount, loadWorldState, saveWorldState } from './db';
import { readBody } from './http_util';

const REALM_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
// class:<engineClass> | hero:<Canonical Name> | npc:<template_id>
const OVERRIDE_KEY_RE = /^(class|hero|npc):[A-Za-z0-9][A-Za-z0-9 _/'.-]{0,79}$/;
// Only internal, already-served asset paths may be assigned: the cr-realms store,
// the unified asset library, the forged store, the bundled models, or an uploaded
// user asset. No protocol, no traversal.
const ASSET_URL_RE =
  /^\/(cr-realms|asset-library|forged|models|api\/assets)\/[A-Za-z0-9 _.()/'-]+\.glb$/;
const MAX_OVERRIDES = 500;
const MAX_NAME_LEN = 80;

export interface RealmVisualOverride {
  assetUrl: string;
  assetName?: string;
  updatedAt: string;
  updatedBy: number;
}

export interface RealmVisualsDoc {
  overrides: Record<string, RealmVisualOverride>;
}

function docKey(realm: string): string {
  return `realm_visuals:${realm}`;
}

function sanitizeDoc(raw: unknown): RealmVisualsDoc {
  const out: RealmVisualsDoc = { overrides: {} };
  if (!raw || typeof raw !== 'object') return out;
  const overrides = (raw as { overrides?: unknown }).overrides;
  if (!overrides || typeof overrides !== 'object') return out;
  let count = 0;
  for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
    if (count >= MAX_OVERRIDES) break;
    if (!OVERRIDE_KEY_RE.test(key) || !value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    const assetUrl = typeof row.assetUrl === 'string' ? row.assetUrl : '';
    if (!ASSET_URL_RE.test(assetUrl) || assetUrl.includes('..')) continue;
    const entry: RealmVisualOverride = {
      assetUrl,
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date(0).toISOString(),
      updatedBy: Number.isFinite(row.updatedBy) ? Number(row.updatedBy) : 0,
    };
    if (typeof row.assetName === 'string' && row.assetName.trim()) {
      entry.assetName = row.assetName.trim().slice(0, MAX_NAME_LEN);
    }
    out.overrides[key] = entry;
    count++;
  }
  return out;
}

export async function loadRealmVisuals(realm: string): Promise<RealmVisualsDoc> {
  if (!REALM_RE.test(realm)) return { overrides: {} };
  return sanitizeDoc(await loadWorldState<unknown>(docKey(realm)));
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const encoded = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(encoded)),
    'cache-control': 'no-store',
  });
  res.end(encoded);
}

async function adminAccountId(req: http.IncomingMessage): Promise<number | null> {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '');
  if (!m) return null;
  const scoped = await accountAndScopeForToken(m[1]);
  if (scoped?.scope !== 'full') return null;
  return (await isAdminAccount(scoped.accountId)) ? scoped.accountId : null;
}

/** Returns true if it handled the request (path matched /api/realm-visuals/*). */
export async function handleRealmVisuals(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<boolean> {
  const parsed = new URL(req.url ?? '/', 'http://localhost');
  const match = /^\/api\/realm-visuals\/([a-z0-9][a-z0-9_-]{0,31})$/.exec(parsed.pathname);
  if (!match) {
    // Reached via the main.ts prefix arm: a malformed sub-path still gets a
    // definite response rather than a hung request.
    if (parsed.pathname.startsWith('/api/realm-visuals/')) {
      sendJson(res, 404, { error: 'realm not found' });
      return true;
    }
    return false;
  }
  const realm = match[1];

  if (req.method === 'GET' || req.method === 'HEAD') {
    const doc = await loadRealmVisuals(realm);
    if (req.method === 'HEAD') {
      res.writeHead(200, { 'cache-control': 'no-store' });
      res.end();
      return true;
    }
    sendJson(res, 200, { realm, overrides: doc.overrides });
    return true;
  }

  if (req.method === 'PUT' || req.method === 'DELETE') {
    const accountId = await adminAccountId(req);
    if (accountId === null) {
      sendJson(res, 403, { error: 'admin access required' });
      return true;
    }
    const doc = await loadRealmVisuals(realm);

    if (req.method === 'DELETE') {
      const key = parsed.searchParams.get('key') ?? '';
      if (!OVERRIDE_KEY_RE.test(key)) {
        sendJson(res, 400, { error: 'a valid override key is required' });
        return true;
      }
      delete doc.overrides[key];
      await saveWorldState(docKey(realm), doc);
      sendJson(res, 200, { realm, overrides: doc.overrides });
      return true;
    }

    // PUT: upsert one override.
    const body = (await readBody(req)) as Record<string, unknown> | null;
    const key = typeof body?.key === 'string' ? body.key : '';
    const assetUrl = typeof body?.assetUrl === 'string' ? body.assetUrl : '';
    if (!OVERRIDE_KEY_RE.test(key)) {
      sendJson(res, 400, { error: 'a valid override key is required' });
      return true;
    }
    if (!ASSET_URL_RE.test(assetUrl) || assetUrl.includes('..')) {
      sendJson(res, 400, { error: 'assetUrl must be an internal .glb asset path' });
      return true;
    }
    if (Object.keys(doc.overrides).length >= MAX_OVERRIDES && !(key in doc.overrides)) {
      sendJson(res, 409, { error: 'override limit reached for this realm' });
      return true;
    }
    const entry: RealmVisualOverride = {
      assetUrl,
      updatedAt: new Date().toISOString(),
      updatedBy: accountId,
    };
    const assetName = typeof body?.assetName === 'string' ? body.assetName.trim() : '';
    if (assetName) entry.assetName = assetName.slice(0, MAX_NAME_LEN);
    doc.overrides[key] = entry;
    await saveWorldState(docKey(realm), doc);
    sendJson(res, 200, { realm, override: entry, overrides: doc.overrides });
    return true;
  }

  res.writeHead(405, { allow: 'GET, HEAD, PUT, DELETE' });
  res.end();
  return true;
}
