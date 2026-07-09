// Authentik OIDC login — adds two routes parallel to /api/login:
//   GET  /api/oauth/authentik          → 302 to Authentik authorize URL
//   GET  /api/oauth/authentik/callback → exchange code, upsert account, redirect
//
// Configuration (read once at startup, all optional — if any are missing the
// routes return 501 and the existing /api/login + /admin path keep working):
//   AUTHENTIK_ISSUER         e.g. https://auth.example.com/application/o/crypticrealm
//   AUTHENTIK_CLIENT_ID      e.g. cryptic-realm-client
//   AUTHENTIK_CLIENT_SECRET  the slug application client_secret
//   AUTHENTIK_REDIRECT_URI   e.g. https://crypticrealm.com/api/oauth/authentik/callback
//
// CSRF: a short-lived `cr_oauth_state` cookie carries the state nonce we sent
// to Authentik; the callback rejects any code that arrives without a matching
// state. (Authentik also enforces the redirect_uri whitelist on its side, so
// a stolen client_id can't redirect anywhere else.)
//
// OAuth2 companion/read-token grants:
// The consent + device pages reuse the in-browser WoCC web session (the bearer
// token in localStorage 'woc_session'): the page POSTs that token to approve, so
// the flow rides the existing browser auth and passes the anti-bot login gates
// without this code touching them. The approval POST requires a FULL session
// token (a read token cannot authorize new read tokens, no escalation).

import { newToken } from './auth';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import * as http from 'node:http';
import {
  accountAndScopeForToken,
  accountForToken,
  linkOAuthToAccount,
  moderationStatusForAccount,
  oauthLinkStatus,
  pool,
  revokeReadToken,
  saveToken,
  touchLogin,
  unlinkOAuthFromAccount,
  upsertOAuthAccount,
} from './db';
import { logger } from './http/logger';
import type { RouteDef, RouteMeta } from './http/types';
import { json, readBinaryBody } from './http_util';
import {
  approveDeviceCode,
  consumeAuthCode,
  consumeDeviceCode,
  createAuthCode,
  createDeviceCode,
  getDeviceByDeviceCode,
  getDeviceByUserCode,
  getOAuthClient,
  upsertOAuthClient,
} from './oauth_db';
import { publicOriginFromRequest } from './realm';

const STATE_COOKIE = 'cr_oauth_state';
const STATE_COOKIE_MAX_AGE = 600; // 10 min
const PROVIDER = 'authentik';
const DEFAULT_NATIVE_RETURN_URL = 'crypticrealm://auth/callback';
const ALLOWED_NATIVE_SCHEMES = new Set(['crypticrealm:', 'com.crypticrealm.game:']);

// Server-side fallback for the OAuth state nonce. Embedded webviews (the Tauri
// desktop shell and the Capacitor Android app) frequently DROP the SameSite=Lax
// `cr_oauth_state` cookie across the cross-origin redirect to Authentik and back
// — the app origin (capacitor://localhost, or the Tauri custom scheme) is not the
// crypticrealm.com origin the cookie was set on, so the callback arrives with no
// cookie and the "state !== cookieState" check fails ("invalid OAuth state").
// We keep the cookie as the primary check (browser CSRF), but also remember every
// state we issued for a short window: a returned state that we ourselves minted
// and have not yet consumed is just as unguessable/CSRF-safe as the cookie match,
// and is single-use (deleted on consume). This makes SSO work in the apps without
// weakening the web flow.
const STATE_TTL_MS = STATE_COOKIE_MAX_AGE * 1000;
interface IssuedState {
  expiresAt: number;
  nativeReturnUrl: string | null;
  // CR overlay: when set, this OAuth round-trip LINKS the resulting Authentik
  // identity to this existing account (from the account page) instead of the
  // default login find-or-create.
  linkAccountId?: number;
}

const issuedStates = new Map<string, IssuedState>(); // state -> expiry + optional app return

function rememberState(
  state: string,
  nativeReturnUrl: string | null = null,
  linkAccountId?: number,
): void {
  const now = Date.now();
  issuedStates.set(state, { expiresAt: now + STATE_TTL_MS, nativeReturnUrl, linkAccountId });
  // opportunistic GC of expired entries so the map can't grow unbounded
  if (issuedStates.size > 256) {
    for (const [s, issued] of issuedStates) if (issued.expiresAt <= now) issuedStates.delete(s);
  }
}

// Returns metadata if `state` was issued by us and not yet consumed; consumes it.
function consumeIssuedState(state: string): IssuedState | null {
  const issued = issuedStates.get(state);
  if (issued === undefined) return null;
  issuedStates.delete(state);
  return issued.expiresAt > Date.now() ? issued : null;
}

interface AuthentikConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface OidcEndpoints {
  authorize: string;
  token: string;
  userinfo: string;
}

function readConfig(): AuthentikConfig | null {
  const issuer = (process.env.AUTHENTIK_ISSUER ?? '').trim().replace(/\/+$/, '');
  const clientId = (process.env.AUTHENTIK_CLIENT_ID ?? '').trim();
  const clientSecret = (process.env.AUTHENTIK_CLIENT_SECRET ?? '').trim();
  const redirectUri = (process.env.AUTHENTIK_REDIRECT_URI ?? '').trim();
  if (!issuer || !clientId || !clientSecret || !redirectUri) return null;
  return { issuer, clientId, clientSecret, redirectUri };
}

// Cached at module load. Restart the server after changing the env to pick up.
const CONFIG: AuthentikConfig | null = readConfig();

// Lazily-fetched OIDC discovery doc. Authentik's actual endpoints
// (authorize / token / userinfo) live at flat /application/o/ paths,
// NOT under the per-app issuer URL — discovery is the only reliable way
// to learn them. We fetch once on first request and cache forever.
let endpointsCache: OidcEndpoints | null = null;
let endpointsInflight: Promise<OidcEndpoints> | null = null;

async function discoverEndpoints(cfg: AuthentikConfig): Promise<OidcEndpoints> {
  if (endpointsCache) return endpointsCache;
  if (endpointsInflight) return endpointsInflight;
  endpointsInflight = (async () => {
    const r = await fetch(`${cfg.issuer}/.well-known/openid-configuration`);
    if (!r.ok) throw new Error(`OIDC discovery failed (${r.status})`);
    const j = (await r.json()) as Record<string, unknown>;
    const authorize = typeof j.authorization_endpoint === 'string' ? j.authorization_endpoint : '';
    const token = typeof j.token_endpoint === 'string' ? j.token_endpoint : '';
    const userinfo = typeof j.userinfo_endpoint === 'string' ? j.userinfo_endpoint : '';
    if (!authorize || !token || !userinfo) {
      throw new Error('OIDC discovery doc missing required endpoints');
    }
    endpointsCache = { authorize, token, userinfo };
    return endpointsCache;
  })();
  try { return await endpointsInflight; }
  finally { endpointsInflight = null; }
}

export function isAuthentikConfigured(): boolean {
  return CONFIG !== null;
}

function setStateCookie(res: http.ServerResponse, state: string): void {
  // Lax: the callback is the same eTLD as the issued cookie origin (our domain).
  // Secure cookie when behind a TLS-terminating proxy (Traefik sets x-forwarded-proto).
  const flags = [
    `${STATE_COOKIE}=${state}`,
    'Path=/api/oauth/authentik',
    `Max-Age=${STATE_COOKIE_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
  ];
  res.setHeader('Set-Cookie', flags.join('; '));
}

function clearStateCookie(res: http.ServerResponse): void {
  res.setHeader('Set-Cookie',
    `${STATE_COOKIE}=; Path=/api/oauth/authentik; Max-Age=0; HttpOnly; SameSite=Lax; Secure`);
}

function readCookie(req: http.IncomingMessage, name: string): string | null {
  const raw = req.headers.cookie ?? '';
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.split('=');
    if (k.trim() === name) return rest.join('=').trim();
  }
  return null;
}

function nativeReturnUrlForStart(url: URL): string | null {
  const wantsNative = url.searchParams.get('native') === '1'
    || url.searchParams.get('app') === '1'
    || url.searchParams.has('native_return');
  if (!wantsNative) return null;
  const raw = url.searchParams.get('native_return') || DEFAULT_NATIVE_RETURN_URL;
  try {
    const parsed = new URL(raw);
    if (!ALLOWED_NATIVE_SCHEMES.has(parsed.protocol)) return DEFAULT_NATIVE_RETURN_URL;
    if (parsed.host !== 'auth') return DEFAULT_NATIVE_RETURN_URL;
    return parsed.toString().replace(/#.*$/, '');
  } catch {
    return DEFAULT_NATIVE_RETURN_URL;
  }
}

function nativeReturnUrlWithHash(nativeReturnUrl: string, hash: string): string {
  const url = new URL(nativeReturnUrl);
  url.search = '';
  url.hash = hash.startsWith('#') ? hash.slice(1) : hash;
  return url.toString();
}

function oauthBridgeHtml(hash: string, nativeReturnUrl: string | null): string {
  const hashJson = JSON.stringify(hash);
  const nativeUrlJson = nativeReturnUrl
    ? JSON.stringify(nativeReturnUrlWithHash(nativeReturnUrl, hash))
    : 'null';
  return `<!doctype html><html><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>Signing in...</title>`
    + `<style>body{margin:0;background:#07080c;color:#ffd166;font:16px/1.5 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh}</style>`
    + `</head><body>Signing you in...`
    + `<script>(function(){try{var h=${hashJson};var n=${nativeUrlJson};`
    + `if(n){setTimeout(function(){window.location.replace('/'+h);},1600);window.location.replace(n);return;}`
    + `window.location.replace('/'+h);}catch(e){window.location.href='/';}})();</script>`
    + `</body></html>`;
}

function buildAuthorizeUrl(authorizeEndpoint: string, cfg: AuthentikConfig, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    scope: 'openid profile email',
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    state,
  });
  return `${authorizeEndpoint}?${params.toString()}`;
}

interface TokenResponse {
  access_token?: string;
  id_token?: string;
  token_type?: string;
}

interface UserInfo {
  sub?: string;
  preferred_username?: string;
  name?: string;
  email?: string;
}

async function exchangeCode(tokenEndpoint: string, cfg: AuthentikConfig, code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  const r = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!r.ok) throw new Error(`token exchange failed: ${r.status} ${await r.text().catch(() => '')}`);
  return (await r.json()) as TokenResponse;
}

async function fetchUserInfo(userinfoEndpoint: string, accessToken: string): Promise<UserInfo> {
  const r = await fetch(userinfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`userinfo failed: ${r.status}`);
  return (await r.json()) as UserInfo;
}

/** Public entry: handles `/api/oauth/authentik` and `/api/oauth/authentik/callback`. */
export async function handleAuthentikRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;

  if (!CONFIG) {
    return json(res, 501, { error: 'Authentik SSO is not configured on this server' });
  }

  // CR overlay: link status for the account page (GET, auth-gated).
  if (path === '/api/oauth/authentik/status' && req.method === 'GET') {
    const accountId = await fullSessionAccount(req);
    if (accountId === null) return json(res, 401, { error: 'not authenticated' });
    return json(res, 200, await oauthLinkStatus(accountId));
  }

  // CR overlay: start a LINK round-trip — a logged-in user connects SSO to their
  // current account. Same authorize redirect as login, but the state remembers the
  // account id so the callback binds the identity instead of find-or-create.
  if (path === '/api/oauth/authentik/link' && req.method === 'GET') {
    const accountId = await fullSessionAccount(req);
    if (accountId === null) return json(res, 401, { error: 'not authenticated' });
    try {
      const endpoints = await discoverEndpoints(CONFIG);
      const state = randomBytes(24).toString('hex');
      setStateCookie(res, state);
      rememberState(state, nativeReturnUrlForStart(url), accountId);
      res.writeHead(302, { Location: buildAuthorizeUrl(endpoints.authorize, CONFIG, state) });
      res.end();
      return;
    } catch (err) {
      return json(res, 502, { error: err instanceof Error ? err.message : 'OIDC discovery failed' });
    }
  }

  // CR overlay: unlink SSO from the current account (DELETE, auth-gated).
  if (path === '/api/oauth/authentik/link' && req.method === 'DELETE') {
    const accountId = await fullSessionAccount(req);
    if (accountId === null) return json(res, 401, { error: 'not authenticated' });
    const result = await unlinkOAuthFromAccount(accountId);
    if (result === 'needsPassword')
      return json(res, 409, { error: 'set a password before unlinking your only sign-in method' });
    if (result === 'notLinked') return json(res, 404, { error: 'no SSO link on this account' });
    return json(res, 200, { unlinked: true });
  }

  if (path === '/api/oauth/authentik') {
    try {
      const endpoints = await discoverEndpoints(CONFIG);
      const state = randomBytes(24).toString('hex');
      const nativeReturnUrl = nativeReturnUrlForStart(url);
      setStateCookie(res, state);
      rememberState(state, nativeReturnUrl); // webview-safe fallback (cookie may be dropped in-app)
      res.writeHead(302, { Location: buildAuthorizeUrl(endpoints.authorize, CONFIG, state) });
      res.end();
      return;
    } catch (err) {
      return json(res, 502, { error: err instanceof Error ? err.message : 'OIDC discovery failed' });
    }
  }

  if (path === '/api/oauth/authentik/callback') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const cookieState = readCookie(req, STATE_COOKIE);
    // Primary: cookie match (web browsers). Fallback: a state WE issued and have
    // not consumed (embedded webviews that drop the cookie — Tauri/Capacitor).
    // consumeIssuedState is called unconditionally so the nonce is single-use
    // even on the cookie-match path.
    const issued = state ? consumeIssuedState(state) : null;
    const stateOk = !!state && (state === cookieState || !!issued);
    if (!code || !stateOk) {
      clearStateCookie(res);
      return json(res, 400, { error: 'invalid OAuth state — please retry sign-in' });
    }
    try {
      const endpoints = await discoverEndpoints(CONFIG);
      const tok = await exchangeCode(endpoints.token, CONFIG, code);
      if (!tok.access_token) throw new Error('missing access_token');
      const info = await fetchUserInfo(endpoints.userinfo, tok.access_token);
      if (!info.sub) throw new Error('userinfo missing sub claim');

      // CR overlay: LINK mode — bind this identity to the account that started the
      // link, then bounce back to the account page. One identity → one account, so
      // a conflict (already linked elsewhere) is surfaced, not silently reassigned.
      if (issued?.linkAccountId) {
        const outcome = await linkOAuthToAccount(issued.linkAccountId, PROVIDER, info.sub);
        clearStateCookie(res);
        const linkHash = new URLSearchParams({
          sso_link: outcome === 'conflict' ? 'conflict' : 'ok',
        }).toString();
        const linkHtml = oauthBridgeHtml('/#account&' + linkHash, issued.nativeReturnUrl ?? null);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(linkHtml);
        return;
      }

      const account = await upsertOAuthAccount({
        provider: PROVIDER,
        sub: info.sub,
        displayName: info.preferred_username ?? info.name ?? info.email ?? info.sub,
      });
      await touchLogin(account.id);
      const localToken = newToken();
      await saveToken(localToken, account.id);
      clearStateCookie(res);
      // Deliver the token to the client. A 302 to `/#auth_token=...` does NOT
      // work reliably: URL fragments are dropped across HTTP redirects (and
      // Cloudflare strips them), so the SPA never saw the token and login
      // silently failed. Instead return a tiny HTML page that sets the hash
      // CLIENT-SIDE and then navigates to the app — the fragment is created in
      // the browser and never crosses a redirect. The token still stays out of
      // server access logs because it's only ever in the document body + hash.
      const hash = new URLSearchParams({
        auth_token: localToken,
        auth_user: account.username,
        auth_via: PROVIDER,
      }).toString();
      const html = oauthBridgeHtml('#' + hash, issued?.nativeReturnUrl ?? null);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html);
      return;
    } catch (err) {
      clearStateCookie(res);
      console.error('Authentik callback failed:', err);
      return json(res, 502, {
        error: err instanceof Error ? err.message : 'OAuth callback failed',
      });
    }
  }

  return json(res, 404, { error: 'not found' });
}

// Re-export accountForToken so callers can verify the issued token in tests
// without pulling in the full db module surface.
export { accountForToken };

// ───────────────────────────────────────────────────────────────────────────
// OAuth2 for "my character" companion access. Two grants:
//   - Authorization Code + PKCE (browser/native apps)
//   - Device Code (CLIs / TVs / no-browser apps)
// Every issued token is an ordinary scope='read' row in auth_tokens, so it works
// on /sheet and is rejected on every mutating route (bearerActiveAccount). Scope
// is character:read.
//
// The consent + device pages reuse the in-browser WoCC web session (the bearer
// token in localStorage 'woc_session'): the page POSTs that token to approve, so
// the flow rides the existing browser auth and passes the anti-bot login gates
// without this code touching them. The approval POST requires a FULL session
// token (a read token cannot authorize new read tokens — no escalation).

export const OAUTH_SCOPE = 'character:read';
const CODE_TTL_SECONDS = 600; // authorization code: 10 min
const DEVICE_TTL_SECONDS = 900; // device code: 15 min
const DEVICE_POLL_INTERVAL = 5; // seconds between device polls
const TOKEN_TTL_HOURS = 24 * 90; // issued read token lifetime: 90 days
const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';

// ── Pure helpers (exported for tests) ──────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// S256 PKCE transform: BASE64URL(SHA256(verifier)).
export function pkceChallengeFromVerifier(verifier: string): string {
  return base64url(createHash('sha256').update(verifier).digest());
}

// Constant-time string compare for the challenge match.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Verify a PKCE code_verifier against the stored challenge. Only 'S256' is
// accepted; 'plain' is rejected so a client cannot downgrade away from the
// protection against an intercepted authorization code. Returns false for
// anything else.
export function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (!verifier || !challenge) return false;
  if (method === 'S256') return safeEqual(pkceChallengeFromVerifier(verifier), challenge);
  return false;
}

// RFC 8628 user_code: 8 chars from an unambiguous alphabet (no 0/O/1/I), shown
// as XXXX-XXXX. Generated without Math.random.
const USER_CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ23456789';
export function newUserCode(): string {
  const bytes = randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += USER_CODE_ALPHABET[bytes[i] % USER_CODE_ALPHABET.length];
    if (i === 3) out += '-';
  }
  return out;
}

export function normalizeUserCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Exact-match redirect allowlist (newline-separated in oauth_clients).
export function redirectAllowed(redirectUris: string, redirectUri: string): boolean {
  return redirectUris
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(redirectUri);
}

function publicOrigin(req: http.IncomingMessage): string {
  return publicOriginFromRequest(req);
}

function appendQuery(url: string, params: Record<string, string>): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

// ── Boot seeding ────────────────────────────────────────────────────────────
// Seed first-party companion clients from env so the flow works out of the box.
// OAUTH_CLIENTS format: "id|Name|uri1,uri2 ; id2|Name2|uri". Redirect-less
// clients (device flow only) are allowed.
export async function seedOAuthClients(): Promise<void> {
  const raw = process.env.OAUTH_CLIENTS ?? '';
  for (const entry of raw.split(';')) {
    const seg = entry.trim();
    if (!seg) continue;
    const [id, name, uris] = seg.split('|').map((s) => (s ?? '').trim());
    if (!id) continue;
    const redirects = (uris ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await upsertOAuthClient(pool, id, name || id, redirects);
  }
}

// ── Bearer (full web session) for the approval POSTs ───────────────────────
async function fullSessionAccount(req: http.IncomingMessage): Promise<number | null> {
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '');
  if (!m) return null;
  const info = await accountAndScopeForToken(m[1]);
  if (info?.scope !== 'full') return null;
  const status = await moderationStatusForAccount(info.accountId);
  if (status.locked) return null;
  return info.accountId;
}

async function readForm(req: http.IncomingMessage): Promise<Record<string, string>> {
  const buf = await readBinaryBody(req, 16 * 1024);
  const text = buf.toString('utf8');
  const ct = String(req.headers['content-type'] ?? '');
  if (ct.includes('application/json')) {
    try {
      const obj = text ? JSON.parse(text) : {};
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) out[k] = String(v ?? '');
      return out;
    } catch {
      return {};
    }
  }
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(text)) out[k] = v;
  return out;
}

function oauthError(
  res: http.ServerResponse,
  status: number,
  error: string,
  description?: string,
): void {
  json(res, status, description ? { error, error_description: description } : { error });
}

// ── Router ──────────────────────────────────────────────────────────────────

export async function handleOAuth(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const path = (req.url ?? '').split('?')[0];
  try {
    if (req.method === 'GET' && path === '/oauth/authorize') return await renderAuthorize(req, res);
    if (req.method === 'POST' && path === '/oauth/authorize')
      return await approveAuthorize(req, res);
    if (req.method === 'POST' && path === '/oauth/token') return await tokenEndpoint(req, res);
    if (req.method === 'POST' && path === '/oauth/revoke') return await revokeEndpoint(req, res);
    if (req.method === 'POST' && path === '/oauth/device_authorization')
      return await deviceAuthorization(req, res);
    if (req.method === 'GET' && path === '/oauth/device') return renderDevicePage(res);
    if (req.method === 'POST' && path === '/oauth/device') return await approveDevice(req, res);
    oauthError(res, 404, 'not_found');
  } catch (err) {
    logger.error({ err }, 'oauth error');
    oauthError(res, 500, 'server_error');
  }
}

// GET /oauth/authorize: render the in-browser consent page.
async function renderAuthorize(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const q = new URL(req.url ?? '/', 'http://localhost').searchParams;
  const clientId = q.get('client_id') ?? '';
  const redirectUri = q.get('redirect_uri') ?? '';
  const responseType = q.get('response_type') ?? '';
  const codeChallenge = q.get('code_challenge') ?? '';
  const method = q.get('code_challenge_method') ?? '';
  const state = q.get('state') ?? '';
  const scope = q.get('scope') || OAUTH_SCOPE;

  const client = clientId ? await getOAuthClient(pool, clientId) : null;
  if (!client)
    return htmlError(res, 400, 'Unknown application', 'This client_id is not registered.');
  if (responseType !== 'code')
    return htmlError(res, 400, 'Unsupported request', 'response_type must be "code".');
  if (!redirectUri || !redirectAllowed(client.redirect_uris, redirectUri)) {
    return htmlError(res, 400, 'Bad redirect', 'redirect_uri is not registered for this client.');
  }
  if (!codeChallenge || method !== 'S256') {
    return htmlError(res, 400, 'PKCE required', 'A code_challenge with method S256 is required.');
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(
    authorizeHtml({
      client: client.name,
      clientId,
      redirectUri,
      codeChallenge,
      method,
      state,
      scope,
    }),
  );
}

// POST /oauth/authorize: the consent page approves, using the web session token.
async function approveAuthorize(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const accountId = await fullSessionAccount(req);
  if (accountId === null)
    return oauthError(
      res,
      401,
      'access_denied',
      'log in to your Cryptic Realm account first',
    );
  const body = await readForm(req);
  const clientId = body.client_id ?? '';
  const redirectUri = body.redirect_uri ?? '';
  const codeChallenge = body.code_challenge ?? '';
  const method = body.code_challenge_method ?? '';
  const scope = body.scope || OAUTH_SCOPE;

  const client = clientId ? await getOAuthClient(pool, clientId) : null;
  if (!client) return oauthError(res, 400, 'invalid_request', 'unknown client');
  if (!redirectUri || !redirectAllowed(client.redirect_uris, redirectUri)) {
    return oauthError(res, 400, 'invalid_request', 'redirect_uri not registered');
  }
  if (!codeChallenge || method !== 'S256') {
    return oauthError(res, 400, 'invalid_request', 'PKCE code_challenge with method S256 required');
  }
  const code = newToken();
  await createAuthCode(pool, {
    code,
    clientId,
    accountId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod: method,
    scope,
    ttlSeconds: CODE_TTL_SECONDS,
  });
  const redirect = appendQuery(redirectUri, body.state ? { code, state: body.state } : { code });
  json(res, 200, { redirect });
}

// POST /oauth/revoke: RFC 7009 token revocation. Deletes the presented token,
// restricted to scope='read' rows so it can never invalidate a full web session.
// Always 200, even for an unknown/already-revoked token (RFC 7009 §2.2).
async function revokeEndpoint(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const body = await readForm(req);
  const token = body.token ?? '';
  if (token) await revokeReadToken(token);
  json(res, 200, { ok: true });
}

// POST /oauth/token: exchange a code (PKCE) or poll a device code.
async function tokenEndpoint(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const body = await readForm(req);
  const grant = body.grant_type ?? '';
  if (grant === 'authorization_code') return tokenFromAuthCode(res, body);
  if (grant === DEVICE_GRANT) return tokenFromDeviceCode(res, body);
  return oauthError(res, 400, 'unsupported_grant_type');
}

async function tokenFromAuthCode(
  res: http.ServerResponse,
  body: Record<string, string>,
): Promise<void> {
  const code = body.code ?? '';
  const verifier = body.code_verifier ?? '';
  const clientId = body.client_id ?? '';
  const redirectUri = body.redirect_uri ?? '';
  if (!code || !verifier)
    return oauthError(res, 400, 'invalid_request', 'code and code_verifier required');
  const row = await consumeAuthCode(pool, code);
  if (!row) return oauthError(res, 400, 'invalid_grant', 'code invalid, expired, or already used');
  if (row.client_id !== clientId) return oauthError(res, 400, 'invalid_grant', 'client mismatch');
  if (row.redirect_uri !== redirectUri)
    return oauthError(res, 400, 'invalid_grant', 'redirect_uri mismatch');
  if (!verifyPkce(verifier, row.code_challenge, row.code_challenge_method)) {
    return oauthError(res, 400, 'invalid_grant', 'PKCE verification failed');
  }
  await issueReadToken(res, row.account_id, clientId, row.scope);
}

async function tokenFromDeviceCode(
  res: http.ServerResponse,
  body: Record<string, string>,
): Promise<void> {
  const deviceCode = body.device_code ?? '';
  const clientId = body.client_id ?? '';
  if (!deviceCode || !clientId)
    return oauthError(res, 400, 'invalid_request', 'device_code and client_id required');
  const row = await getDeviceByDeviceCode(pool, deviceCode, clientId);
  if (!row) return oauthError(res, 400, 'invalid_grant', 'unknown device_code');
  if (row.expired) return oauthError(res, 400, 'expired_token');
  if (row.consumed) return oauthError(res, 400, 'invalid_grant', 'device_code already used');
  if (!row.approved || row.account_id === null)
    return oauthError(res, 400, 'authorization_pending');
  const claimed = await consumeDeviceCode(pool, deviceCode);
  if (!claimed) return oauthError(res, 400, 'authorization_pending');
  await issueReadToken(res, claimed.account_id, clientId, claimed.scope);
}

async function issueReadToken(
  res: http.ServerResponse,
  accountId: number,
  clientId: string,
  scope: string,
): Promise<void> {
  const token = newToken();
  await saveToken(token, accountId, TOKEN_TTL_HOURS, 'read', `oauth:${clientId}`);
  json(res, 200, {
    access_token: token,
    token_type: 'bearer',
    scope: scope || OAUTH_SCOPE,
    expires_in: TOKEN_TTL_HOURS * 3600,
  });
}

// POST /oauth/device_authorization: start the device flow.
async function deviceAuthorization(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const body = await readForm(req);
  const clientId = body.client_id ?? '';
  const scope = body.scope || OAUTH_SCOPE;
  const client = clientId ? await getOAuthClient(pool, clientId) : null;
  if (!client) return oauthError(res, 400, 'invalid_client', 'unknown client');
  const deviceCode = newToken();
  // `userCode` is the dashed display form (XXXX-XXXX); store the normalized form
  // so it matches the lookup in approveDevice (which normalizes the submitted
  // code before an exact-match query). Without this, approval never matches.
  const userCode = newUserCode();
  await createDeviceCode(pool, {
    deviceCode,
    userCode: normalizeUserCode(userCode),
    clientId,
    scope,
    ttlSeconds: DEVICE_TTL_SECONDS,
  });
  const base = publicOrigin(req);
  json(res, 200, {
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: `${base}/oauth/device`,
    verification_uri_complete: `${base}/oauth/device?user_code=${encodeURIComponent(userCode)}`,
    expires_in: DEVICE_TTL_SECONDS,
    interval: DEVICE_POLL_INTERVAL,
  });
}

// POST /oauth/device: approve a device code by user_code (web session).
async function approveDevice(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const accountId = await fullSessionAccount(req);
  if (accountId === null) return oauthError(res, 401, 'access_denied', 'log in first');
  const body = await readForm(req);
  const userCode = normalizeUserCode(body.user_code ?? '');
  if (!userCode) return oauthError(res, 400, 'invalid_request', 'user_code required');
  const device = await getDeviceByUserCode(pool, userCode);
  if (!device || device.expired)
    return oauthError(res, 400, 'invalid_grant', 'code expired or unknown');
  const ok = await approveDeviceCode(pool, userCode, accountId);
  if (!ok) return oauthError(res, 400, 'invalid_grant', 'code already used or expired');
  json(res, 200, { ok: true });
}

// ── HTML (consent + device pages) ───────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PAGE_STYLE = `<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 50% 18%,#241910,#0a0805 70%);color:#ece2c4;
    font-family:system-ui,sans-serif;padding:24px}
  main{max-width:440px;width:100%;text-align:center;display:flex;flex-direction:column;gap:16px}
  h1{color:#ffd100;font-size:24px;margin:0}
  p{color:#c9bb92;margin:0;line-height:1.5}
  .row{display:flex;gap:10px;justify-content:center}
  button,a.btn{font:inherit;font-weight:700;padding:12px 22px;border-radius:8px;border:0;cursor:pointer;text-decoration:none}
  .primary{color:#2a1d05;background:linear-gradient(#ffe27a,#e0a52a)}
  .ghost{color:#ece2c4;background:#2a2114;border:1px solid #4a3a18}
  input{font:inherit;font-size:16px;padding:12px;border-radius:8px;border:1px solid #4a3a18;background:#1b150c;color:#ece2c4;text-align:center;letter-spacing:2px}
  .msg{min-height:20px;color:#ffb4a0}
</style>`;

function authorizeHtml(o: {
  client: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  method: string;
  state: string;
  scope: string;
}): string {
  const data = JSON.stringify({
    client_id: o.clientId,
    redirect_uri: o.redirectUri,
    code_challenge: o.codeChallenge,
    code_challenge_method: o.method,
    state: o.state,
    scope: o.scope,
  }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Authorize ${escapeHtml(o.client)} · Cryptic Realm</title><meta name="robots" content="noindex">${PAGE_STYLE}</head>
<body><main>
  <h1>Authorize access</h1>
  <p><strong>${escapeHtml(o.client)}</strong> wants <strong>read-only</strong> access to your character (${escapeHtml(o.scope)}). It cannot change anything in your account.</p>
  <div class="msg" id="msg"></div>
  <div class="row">
    <button class="primary" id="allow">Authorize</button>
    <button class="ghost" id="deny">Deny</button>
  </div>
  <p style="font-size:13px;color:#7c6f4e">Signed in via your Cryptic Realm web session.</p>
</main>
<script>
  var REQ = ${data};
  function token(){ try { return JSON.parse(localStorage.getItem('woc_session')||'{}').token || ''; } catch(e){ return ''; } }
  function denyUrl(){ var u=new URL(REQ.redirect_uri); u.searchParams.set('error','access_denied'); if(REQ.state)u.searchParams.set('state',REQ.state); return u.toString(); }
  document.getElementById('deny').onclick=function(){ location.href=denyUrl(); };
  document.getElementById('allow').onclick=function(){
    var t=token();
    if(!t){ document.getElementById('msg').textContent='Please log in to Cryptic Realm first, then reopen this link.'; return; }
    fetch('/oauth/authorize',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify(REQ)})
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,j:j}; }); })
      .then(function(x){ if(x.ok&&x.j.redirect){ location.href=x.j.redirect; } else { document.getElementById('msg').textContent=(x.j.error_description||x.j.error||'authorization failed'); } })
      .catch(function(){ document.getElementById('msg').textContent='network error'; });
  };
</script>
</body></html>`;
}

function renderDevicePage(res: http.ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link a device · Cryptic Realm</title><meta name="robots" content="noindex">${PAGE_STYLE}</head>
<body><main>
  <h1>Link a device</h1>
  <p>Enter the code shown on your device to grant it <strong>read-only</strong> access to your character.</p>
  <input id="code" placeholder="XXXX-XXXX" autocomplete="one-time-code" maxlength="9">
  <div class="msg" id="msg"></div>
  <div class="row"><button class="primary" id="ok">Approve</button></div>
  <p style="font-size:13px;color:#7c6f4e">Signed in via your Cryptic Realm web session.</p>
</main>
<script>
  var params=new URLSearchParams(location.search); var pre=params.get('user_code'); if(pre)document.getElementById('code').value=pre;
  function token(){ try { return JSON.parse(localStorage.getItem('woc_session')||'{}').token || ''; } catch(e){ return ''; } }
  document.getElementById('ok').onclick=function(){
    var t=token(); if(!t){ document.getElementById('msg').textContent='Please log in to Cryptic Realm first.'; return; }
    var code=document.getElementById('code').value;
    fetch('/oauth/device',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},body:JSON.stringify({user_code:code})})
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,j:j}; }); })
      .then(function(x){ document.getElementById('msg').textContent=x.ok?'Device approved. You can return to your device.':(x.j.error_description||x.j.error||'failed'); if(x.ok)document.getElementById('msg').style.color='#abd473'; })
      .catch(function(){ document.getElementById('msg').textContent='network error'; });
  };
</script>
</body></html>`);
}

function htmlError(res: http.ServerResponse, status: number, title: string, detail: string): void {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>${PAGE_STYLE}</head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p></main></body></html>`);
}

// ── Route table ───────────────────────────
// The 5 OAuth POST JSON endpoints as RouteDefs for the shared dispatcher.
// PARITY-FIRST: each thin Ctx handler calls the EXISTING core function above
// UNCHANGED (the cores self-read their body via readForm, resolve the web
// session via fullSessionAccount in-handler, and write every status/body
// themselves), so responses are byte-identical to the legacy handleOAuth
// ladder. No requireAccount, no withBody, no schema: the consent POSTs
// authenticate via the browser web session, NOT the API bearer scope gate.
//
// The GET consent/device HTML pages (renderAuthorize, renderDevicePage) stay
// OFF this table on purpose: a GET to these paths resolves methodNotAllowed
// and the dispatcher DELEGATES it to the legacy handleOAuth ladder, which
// renders the HTML exactly as today. Same for HEAD and for any unknown /oauth
// path (the legacy 404 { error: 'not_found' }).
//
// The one divergence is an UNEXPECTED handler throw (oauthBodyValidationRemap,
// tests/server/http/known_deviations.ts): withErrors serializes it through
// serializeOauth as 500 { error: 'server_error', error_description: ... } plus
// an X-Request-Id header, where the legacy handleOAuth catch writes the bare
// 500 { error: 'server_error' }. Same status, same RFC 6749 code; the
// description field and header are additive.

const OAUTH_META: RouteMeta = { envelope: 'oauth' };

export const routes: RouteDef[] = [
  {
    method: 'POST',
    path: '/oauth/authorize',
    surface: 'oauth',
    meta: OAUTH_META,
    handler: async (ctx) => {
      await approveAuthorize(ctx.req, ctx.res);
    },
  },
  {
    method: 'POST',
    path: '/oauth/token',
    surface: 'oauth',
    meta: OAUTH_META,
    handler: async (ctx) => {
      await tokenEndpoint(ctx.req, ctx.res);
    },
  },
  {
    method: 'POST',
    path: '/oauth/revoke',
    surface: 'oauth',
    meta: OAUTH_META,
    handler: async (ctx) => {
      await revokeEndpoint(ctx.req, ctx.res);
    },
  },
  {
    method: 'POST',
    path: '/oauth/device_authorization',
    surface: 'oauth',
    meta: OAUTH_META,
    handler: async (ctx) => {
      await deviceAuthorization(ctx.req, ctx.res);
    },
  },
  {
    method: 'POST',
    path: '/oauth/device',
    surface: 'oauth',
    meta: OAUTH_META,
    handler: async (ctx) => {
      await approveDevice(ctx.req, ctx.res);
    },
  },
];
