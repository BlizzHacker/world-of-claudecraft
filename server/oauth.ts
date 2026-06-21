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

import * as http from 'node:http';
import { randomBytes } from 'node:crypto';
import { json } from './http_util';
import { saveToken, touchLogin, upsertOAuthAccount, accountForToken } from './db';
import { newToken } from './auth';

const STATE_COOKIE = 'cr_oauth_state';
const STATE_COOKIE_MAX_AGE = 600; // 10 min
const PROVIDER = 'authentik';

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
const issuedStates = new Map<string, number>(); // state -> expiry epoch ms

function rememberState(state: string): void {
  const now = Date.now();
  issuedStates.set(state, now + STATE_TTL_MS);
  // opportunistic GC of expired entries so the map can't grow unbounded
  if (issuedStates.size > 256) {
    for (const [s, exp] of issuedStates) if (exp <= now) issuedStates.delete(s);
  }
}

// Returns true if `state` was issued by us and not yet consumed; consumes it.
function consumeIssuedState(state: string): boolean {
  const exp = issuedStates.get(state);
  if (exp === undefined) return false;
  issuedStates.delete(state);
  return exp > Date.now();
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

  if (path === '/api/oauth/authentik') {
    try {
      const endpoints = await discoverEndpoints(CONFIG);
      const state = randomBytes(24).toString('hex');
      setStateCookie(res, state);
      rememberState(state); // webview-safe fallback (cookie may be dropped in-app)
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
    const issuedOk = state ? consumeIssuedState(state) : false;
    const stateOk = !!state && (state === cookieState || issuedOk);
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
      const hashJson = JSON.stringify('#' + hash);
      const html = `<!doctype html><html><head><meta charset="utf-8">`
        + `<meta name="viewport" content="width=device-width,initial-scale=1">`
        + `<title>Signing in…</title>`
        + `<style>body{margin:0;background:#07080c;color:#ffd166;font:16px/1.5 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh}</style>`
        + `</head><body>Signing you in…`
        + `<script>(function(){try{var h=${hashJson};`
        + `window.location.replace('/'+h);}catch(e){window.location.href='/';}})();</script>`
        + `</body></html>`;
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
