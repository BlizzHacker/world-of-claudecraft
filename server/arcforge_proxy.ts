// Admin/moderator-gated proxy to the ArcForge asset pipeline on the MoveWeight
// infra. The in-game live editor runs in the player's session, so we authorize
// with the player's bearer token + role check (admin OR moderator), then forward
// to the pipeline over the LAN. The browser can't reach the LAN host directly
// (cross-origin + private IP), so this server-side hop is required.
//
// Routes (mounted under /me/api/arcforge/* in handleUserApi):
//   GET  /me/api/arcforge/health    -> upstream ArcForge backend health
//   GET  /me/api/arcforge/status    -> pipeline status (queue depth, etc.)
//   POST /me/api/arcforge/enqueue   -> enqueue an asset-regeneration job
//
// Config (env, set per-realm in env.d via shared .env):
//   ARCFORGE_PIPELINE_BASE  default http://192.168.0.150:5173  (Vite pipeline)
//   ARCFORGE_BACKEND_BASE   default http://192.168.0.150:8098  (FastAPI health)
import * as http from 'node:http';
import { readBody } from './http_util';
import { accountForToken, isAdminAccount, isModeratorAccount } from './db';

const PIPELINE_BASE = (process.env.ARCFORGE_PIPELINE_BASE ?? 'http://192.168.0.150:5173').replace(/\/$/, '');
const BACKEND_BASE = (process.env.ARCFORGE_BACKEND_BASE ?? 'http://192.168.0.150:8098').replace(/\/$/, '');

function send(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function bearerAccountId(req: http.IncomingMessage): Promise<number | null> {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '');
  return m ? accountForToken(m[1]) : null;
}

/** True iff the request's session belongs to an admin or moderator. */
async function authorizeBuilder(req: http.IncomingMessage): Promise<boolean> {
  const accountId = await bearerAccountId(req);
  if (accountId === null) return false;
  const [admin, mod] = await Promise.all([
    isAdminAccount(accountId),
    isModeratorAccount(accountId),
  ]);
  return admin || mod;
}

// Forward a request to an upstream base, returning its status + JSON-ish body.
async function forward(
  method: 'GET' | 'POST',
  base: string,
  path: string,
  body?: string,
): Promise<{ status: number; body: string; contentType: string }> {
  const r = await fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body,
    signal: AbortSignal.timeout(20_000),
  });
  return {
    status: r.status,
    body: await r.text(),
    contentType: r.headers.get('content-type') ?? 'application/json',
  };
}

/** Returns true if it handled the request (path matched /me/api/arcforge/*). */
export async function handleArcForgeProxy(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<boolean> {
  const path = (req.url ?? '/').split('?')[0];
  if (!path.startsWith('/me/api/arcforge/')) return false;

  if (!(await authorizeBuilder(req))) {
    send(res, 403, { error: 'admin or moderator access required' });
    return true;
  }

  try {
    if (req.method === 'GET' && path === '/me/api/arcforge/health') {
      const up = await forward('GET', BACKEND_BASE, '/api/health');
      res.writeHead(up.status, { 'Content-Type': up.contentType });
      res.end(up.body);
      return true;
    }
    if (req.method === 'GET' && path === '/me/api/arcforge/status') {
      const up = await forward('GET', PIPELINE_BASE, '/api/pipeline/status');
      res.writeHead(up.status, { 'Content-Type': up.contentType });
      res.end(up.body);
      return true;
    }
    if (req.method === 'POST' && path === '/me/api/arcforge/enqueue') {
      const raw = await readBody(req);
      const up = await forward('POST', PIPELINE_BASE, '/api/pipeline/enqueue', JSON.stringify(raw));
      res.writeHead(up.status, { 'Content-Type': up.contentType });
      res.end(up.body);
      return true;
    }
    send(res, 404, { error: 'arcforge route not found' });
    return true;
  } catch (err) {
    send(res, 502, { error: 'pipeline unreachable', detail: err instanceof Error ? err.message : String(err) });
    return true;
  }
}
