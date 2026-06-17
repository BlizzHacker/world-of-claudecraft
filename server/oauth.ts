// Authentik OIDC login — adds two routes parallel to /api/login:
//   GET  /api/auth/authentik          → 302 to Authentik authorize URL
//   GET  /api/auth/authentik/callback → exchange code, upsert account, redirect
//
// Configuration (read once at startup, all optional — if any are missing the
// routes return 501 and the existing /api/login + /admin path keep working):
//   AUTHENTIK_ISSUER         e.g. https://auth.example.com/application/o/crypticrealm
//   AUTHENTIK_CLIENT_ID      e.g. cryptic-realm-client
//   AUTHENTIK_CLIENT_SECRET  the slug application client_secret
//   AUTHENTIK_REDIRECT_URI   e.g. https://crypticrealm.com/api/auth/authentik/callback
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

interface AuthentikConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
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

export function isAuthentikConfigured(): boolean {
  return CONFIG !== null;
}

function setStateCookie(res: http.ServerResponse, state: string): void {
  // Lax: the callback is the same eTLD as the issued cookie origin (our domain).
  // Secure cookie when behind a TLS-terminating proxy (Traefik sets x-forwarded-proto).
  const flags = [
    `${STATE_COOKIE}=${state}`,
    'Path=/api/auth/authentik',
    `Max-Age=${STATE_COOKIE_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
  ];
  res.setHeader('Set-Cookie', flags.join('; '));
}

function clearStateCookie(res: http.ServerResponse): void {
  res.setHeader('Set-Cookie',
    `${STATE_COOKIE}=; Path=/api/auth/authentik; Max-Age=0; HttpOnly; SameSite=Lax; Secure`);
}

function readCookie(req: http.IncomingMessage, name: string): string | null {
  const raw = req.headers.cookie ?? '';
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.split('=');
    if (k.trim() === name) return rest.join('=').trim();
  }
  return null;
}

function buildAuthorizeUrl(cfg: AuthentikConfig, state: string): string {
  // Standard OIDC: /authorize end-point lives at `${issuer}/authorize/` on
  // Authentik's application provider. The trailing slash matters for nginx.
  const params = new URLSearchParams({
    response_type: 'code',
    scope: 'openid profile email',
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    state,
  });
  return `${cfg.issuer}/authorize/?${params.toString()}`;
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

async function exchangeCode(cfg: AuthentikConfig, code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  const r = await fetch(`${cfg.issuer}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!r.ok) throw new Error(`token exchange failed: ${r.status} ${await r.text().catch(() => '')}`);
  return (await r.json()) as TokenResponse;
}

async function fetchUserInfo(cfg: AuthentikConfig, accessToken: string): Promise<UserInfo> {
  const r = await fetch(`${cfg.issuer}/userinfo/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`userinfo failed: ${r.status}`);
  return (await r.json()) as UserInfo;
}

/** Public entry: handles `/api/auth/authentik` and `/api/auth/authentik/callback`. */
export async function handleAuthentikRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;

  if (!CONFIG) {
    return json(res, 501, { error: 'Authentik SSO is not configured on this server' });
  }

  if (path === '/api/auth/authentik') {
    const state = randomBytes(24).toString('hex');
    setStateCookie(res, state);
    res.writeHead(302, { Location: buildAuthorizeUrl(CONFIG, state) });
    res.end();
    return;
  }

  if (path === '/api/auth/authentik/callback') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const cookieState = readCookie(req, STATE_COOKIE);
    if (!code || !state || state !== cookieState) {
      clearStateCookie(res);
      return json(res, 400, { error: 'invalid OAuth state — please retry sign-in' });
    }
    try {
      const tok = await exchangeCode(CONFIG, code);
      if (!tok.access_token) throw new Error('missing access_token');
      const info = await fetchUserInfo(CONFIG, tok.access_token);
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
      // Redirect to the homepage with the token + username in the hash so it
      // never lands in server access logs. Client picks it up on boot and
      // stores it the same way /api/login would.
      const hash = new URLSearchParams({
        auth_token: localToken,
        auth_user: account.username,
        auth_via: PROVIDER,
      });
      res.writeHead(302, { Location: `/#${hash.toString()}` });
      res.end();
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
