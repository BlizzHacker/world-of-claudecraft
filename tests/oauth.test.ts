import type * as http from 'node:http';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the db + auth + oauth_db surface so we don't need Postgres. Both the
// Cryptic Realm Authentik OIDC handler and upstream's OAuth (PKCE / device /
// authorize / revoke) handler live in server/oauth.ts, so the db mock has to
// cover the functions BOTH suites exercise.
vi.mock('../server/db', () => ({
  loadAccountFlair: vi.fn(async () => ({ ai: false, streamer: false, links: {} })),
  walletForAccount: vi.fn(async () => null),
  saveCharacterAndMarketState: vi.fn(async () => {}),
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  // Authentik OIDC handler (fork) surface:
  upsertOAuthAccount: vi.fn(),
  touchLogin: vi.fn(),
  accountForToken: vi.fn(),
  // Shared:
  saveToken: vi.fn(async () => {}),
  // Upstream OAuth handler surface:
  accountAndScopeForToken: vi.fn(async () => ({ accountId: 5, scope: 'full' })),
  moderationStatusForAccount: vi.fn(async () => ({ locked: false, message: '' })),
  revokeReadToken: vi.fn(async () => true),
}));
vi.mock('../server/auth', () => ({ newToken: vi.fn(() => 'c'.repeat(64)) }));
vi.mock('../server/oauth_db', () => ({
  getOAuthClient: vi.fn(async () => ({
    client_id: 'companion',
    name: 'Companion',
    redirect_uris: 'https://app.example/cb',
  })),
  upsertOAuthClient: vi.fn(async () => {}),
  createAuthCode: vi.fn(async () => {}),
  consumeAuthCode: vi.fn(),
  createDeviceCode: vi.fn(async () => {}),
  getDeviceByUserCode: vi.fn(),
  approveDeviceCode: vi.fn(),
  getDeviceByDeviceCode: vi.fn(),
  consumeDeviceCode: vi.fn(),
}));

function fakeReq(opts: { method?: string; url?: string; cookie?: string } = {}) {
  const req: any = new EventEmitter();
  req.method = opts.method ?? 'GET';
  req.url = opts.url ?? '/api/oauth/authentik';
  req.headers = opts.cookie ? { cookie: opts.cookie } : {};
  req.socket = { remoteAddress: '10.0.0.1' };
  return req;
}

function fakeRes() {
  const headers: Record<string, string | string[]> = {};
  const res: any = {
    statusCode: 0,
    body: null as any,
    setHeader(k: string, v: string | string[]) { headers[k.toLowerCase()] = v; },
    getHeader(k: string) { return headers[k.toLowerCase()]; },
    writeHead(status: number, h?: Record<string, string>) {
      this.statusCode = status;
      if (h) for (const k of Object.keys(h)) headers[k.toLowerCase()] = h[k];
    },
    end(data?: string) { this.body = data ? (() => { try { return JSON.parse(data); } catch { return data; } })() : null; },
  };
  res._headers = headers;
  return res;
}

describe('Authentik OIDC handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set env BEFORE importing the module so the CONFIG cache picks it up.
    process.env.AUTHENTIK_ISSUER = 'https://auth.test.local/application/o/cryptic';
    process.env.AUTHENTIK_CLIENT_ID = 'client-id';
    process.env.AUTHENTIK_CLIENT_SECRET = 'client-secret';
    process.env.AUTHENTIK_REDIRECT_URI = 'https://cryptic.test/api/oauth/authentik/callback';
    vi.resetModules();
  });
  afterEach(() => {
    delete process.env.AUTHENTIK_ISSUER;
    delete process.env.AUTHENTIK_CLIENT_ID;
    delete process.env.AUTHENTIK_CLIENT_SECRET;
    delete process.env.AUTHENTIK_REDIRECT_URI;
  });

  it('redirects to Authentik authorize URL with a state cookie', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      authorization_endpoint: 'https://auth.test.local/application/o/authorize/',
      token_endpoint: 'https://auth.test.local/application/o/token/',
      userinfo_endpoint: 'https://auth.test.local/application/o/userinfo/',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const { handleAuthentikRoute } = await import('../server/oauth');
    const req = fakeReq({ method: 'GET', url: '/api/oauth/authentik' });
    const res = fakeRes();
    await handleAuthentikRoute(req, res);
    expect(res.statusCode).toBe(302);
    const loc = res._headers.location as string;
    expect(loc).toMatch(/^https:\/\/auth\.test\.local\/application\/o\/authorize\/\?/);
    expect(loc).toContain('client_id=client-id');
    expect(loc).toContain('response_type=code');
    expect(loc).toContain('scope=openid+profile+email');
    const setCookie = res._headers['set-cookie'] as string;
    expect(setCookie).toMatch(/^cr_oauth_state=[a-f0-9]{48};/);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    vi.unstubAllGlobals();
  });

  it('returns 501 when no env config is set', async () => {
    delete process.env.AUTHENTIK_ISSUER;
    vi.resetModules();
    const { handleAuthentikRoute } = await import('../server/oauth');
    const req = fakeReq({ method: 'GET', url: '/api/oauth/authentik' });
    const res = fakeRes();
    await handleAuthentikRoute(req, res);
    expect(res.statusCode).toBe(501);
    expect(res.body.error).toMatch(/not configured/);
  });

  it('callback rejects mismatched state', async () => {
    const { handleAuthentikRoute } = await import('../server/oauth');
    const req = fakeReq({
      method: 'GET',
      url: '/api/oauth/authentik/callback?code=abc&state=does-not-match',
      cookie: 'cr_oauth_state=different-state',
    });
    const res = fakeRes();
    await handleAuthentikRoute(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/state/);
  });

  it('callback returns a browser hash bridge with auth token on success', async () => {
    const dbMod = await import('../server/db');
    vi.mocked(dbMod.upsertOAuthAccount).mockResolvedValue({ id: 9, username: 'authetiker', created: true });
    vi.mocked(dbMod.touchLogin).mockResolvedValue(undefined);
    vi.mocked(dbMod.saveToken).mockResolvedValue(undefined);

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/.well-known/openid-configuration')) {
        return new Response(JSON.stringify({
          authorization_endpoint: 'https://auth.test.local/application/o/authorize/',
          token_endpoint: 'https://auth.test.local/application/o/token/',
          userinfo_endpoint: 'https://auth.test.local/application/o/userinfo/',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.endsWith('/token/')) {
        return new Response(JSON.stringify({ access_token: 'access-token-xyz' }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.endsWith('/userinfo/')) {
        return new Response(JSON.stringify({
          sub: 'authentik-subject-7', preferred_username: 'authetiker', name: 'Authy',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      throw new Error(`unexpected fetch URL ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { handleAuthentikRoute } = await import('../server/oauth');
    const req = fakeReq({
      method: 'GET',
      url: '/api/oauth/authentik/callback?code=auth-code&state=cookie-state',
      cookie: 'cr_oauth_state=cookie-state',
    });
    const res = fakeRes();
    await handleAuthentikRoute(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._headers['content-type']).toMatch(/text\/html/);
    expect(String(res.body)).toContain('window.location.replace');
    expect(String(res.body)).toContain('auth_token=c'.padEnd('auth_token='.length + 64, 'c'));
    expect(String(res.body)).toContain('auth_user=authetiker');
    expect(String(res.body)).toContain('auth_via=authentik');
    expect(dbMod.saveToken).toHaveBeenCalledWith('c'.repeat(64), 9);
    expect(dbMod.touchLogin).toHaveBeenCalledWith(9);

    vi.unstubAllGlobals();
  });

  it('callback returns a native app deep link after app SSO start', async () => {
    const dbMod = await import('../server/db');
    vi.mocked(dbMod.upsertOAuthAccount).mockResolvedValue({ id: 12, username: 'moveweight', created: true });
    vi.mocked(dbMod.touchLogin).mockResolvedValue(undefined);
    vi.mocked(dbMod.saveToken).mockResolvedValue(undefined);

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/.well-known/openid-configuration')) {
        return new Response(JSON.stringify({
          authorization_endpoint: 'https://auth.test.local/application/o/authorize/',
          token_endpoint: 'https://auth.test.local/application/o/token/',
          userinfo_endpoint: 'https://auth.test.local/application/o/userinfo/',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.endsWith('/token/')) {
        return new Response(JSON.stringify({ access_token: 'access-token-native' }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.endsWith('/userinfo/')) {
        return new Response(JSON.stringify({
          sub: 'authentik-subject-native', preferred_username: 'moveweight',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      throw new Error(`unexpected fetch URL ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { handleAuthentikRoute } = await import('../server/oauth');
    const startReq = fakeReq({ method: 'GET', url: '/api/oauth/authentik?native=1' });
    const startRes = fakeRes();
    await handleAuthentikRoute(startReq, startRes);
    const loc = new URL(startRes._headers.location as string);
    const state = loc.searchParams.get('state');
    expect(state).toMatch(/^[a-f0-9]{48}$/);

    const req = fakeReq({
      method: 'GET',
      url: `/api/oauth/authentik/callback?code=auth-code&state=${state}`,
    });
    const res = fakeRes();
    await handleAuthentikRoute(req, res);

    expect(res.statusCode).toBe(200);
    expect(String(res.body)).toContain('crypticrealm://auth/callback#auth_token=');
    expect(String(res.body)).toContain('auth_user=moveweight');
    expect(String(res.body)).toContain('setTimeout');
    expect(String(res.body)).toContain("window.location.replace('/'+h)");
    expect(dbMod.saveToken).toHaveBeenCalledWith('c'.repeat(64), 12);

    vi.unstubAllGlobals();
  });

  it('callback returns 502 when token exchange fails', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/.well-known/openid-configuration')) {
        return new Response(JSON.stringify({
          authorization_endpoint: 'https://auth.test.local/application/o/authorize/',
          token_endpoint: 'https://auth.test.local/application/o/token/',
          userinfo_endpoint: 'https://auth.test.local/application/o/userinfo/',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('boom', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { handleAuthentikRoute } = await import('../server/oauth');
    const req = fakeReq({
      method: 'GET',
      url: '/api/oauth/authentik/callback?code=auth-code&state=cookie-state',
      cookie: 'cr_oauth_state=cookie-state',
    });
    const res = fakeRes();
    await handleAuthentikRoute(req, res);
    expect(res.statusCode).toBe(502);
    expect(res.body.error).toMatch(/token exchange failed/);
    vi.unstubAllGlobals();
  });
});

// Upstream OAuth handler (PKCE / device grant / authorize / revoke). These
// import the handler + db + oauth_db lazily so the top-level mocks apply.
const {
  handleOAuth,
  verifyPkce,
  pkceChallengeFromVerifier,
  newUserCode,
  normalizeUserCode,
  redirectAllowed,
} = await import('../server/oauth');
const db = await import('../server/db');
const oauthDb = await import('../server/oauth_db');

function makeReq(method: string, url: string, body: unknown, headers: Record<string, string> = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  const req = Readable.from([Buffer.from(payload)]) as Readable & {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  req.method = method;
  req.url = url;
  req.headers = { 'content-type': 'application/json', ...headers };
  return req as unknown as http.IncomingMessage;
}
function makeRes() {
  return {
    statusCode: 0,
    body: '',
    headers: {} as Record<string, unknown>,
    writeHead(s: number, h?: Record<string, unknown>) {
      this.statusCode = s;
      if (h) Object.assign(this.headers, h);
    },
    setHeader(k: string, v: unknown) {
      this.headers[k] = v;
    },
    end(d?: string) {
      this.body = d ?? '';
    },
  };
}
async function call(method: string, url: string, body: unknown, headers?: Record<string, string>) {
  const res = makeRes();
  await handleOAuth(makeReq(method, url, body, headers), res as unknown as http.ServerResponse);
  return { status: res.statusCode, json: res.body ? JSON.parse(res.body) : null };
}

async function callRaw(
  method: string,
  url: string,
  body: unknown,
  headers?: Record<string, string>,
) {
  const res = makeRes();
  await handleOAuth(makeReq(method, url, body, headers), res as unknown as http.ServerResponse);
  return { status: res.statusCode, body: res.body, headers: res.headers };
}

const BEARER = { authorization: `Bearer ${'a'.repeat(64)}` };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.accountAndScopeForToken).mockResolvedValue({ accountId: 5, scope: 'full' });
  vi.mocked(db.moderationStatusForAccount).mockResolvedValue({
    locked: false,
    banned: false,
    suspendedUntil: null,
    reason: '',
    message: '',
    chatMutedUntil: null,
    chatStrikes: 0,
  });
  vi.mocked(oauthDb.getOAuthClient).mockResolvedValue({
    client_id: 'companion',
    name: 'Companion',
    redirect_uris: 'https://app.example/cb',
  });
});

describe('PKCE', () => {
  it('matches the RFC 7636 S256 test vector', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
    expect(pkceChallengeFromVerifier(verifier)).toBe(challenge);
    expect(verifyPkce(verifier, challenge, 'S256')).toBe(true);
  });
  it('rejects a tampered verifier and unknown methods', () => {
    const verifier = 'a'.repeat(43);
    const challenge = pkceChallengeFromVerifier(verifier);
    expect(verifyPkce('b'.repeat(43), challenge, 'S256')).toBe(false);
    expect(verifyPkce(verifier, challenge, 'weird')).toBe(false);
    expect(verifyPkce('', challenge, 'S256')).toBe(false);
  });
  it('rejects the plain method (no downgrade from S256)', () => {
    // A 'plain' challenge equals the verifier; it must still be rejected.
    const verifier = 'a'.repeat(43);
    expect(verifyPkce(verifier, verifier, 'plain')).toBe(false);
  });
});

describe('user codes & redirect allowlist', () => {
  it('formats user codes as XXXX-XXXX from an unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = newUserCode();
      expect(code).toMatch(/^[BCDFGHJKLMNPQRSTVWXZ23456789]{4}-[BCDFGHJKLMNPQRSTVWXZ23456789]{4}$/);
      expect(normalizeUserCode(code)).toHaveLength(8);
    }
  });
  it('matches redirect URIs exactly against the allowlist', () => {
    const list = 'https://app.example/cb\nhttps://other.example/done';
    expect(redirectAllowed(list, 'https://app.example/cb')).toBe(true);
    expect(redirectAllowed(list, 'https://app.example/cb/evil')).toBe(false);
    expect(redirectAllowed(list, 'https://evil.example/cb')).toBe(false);
  });
});

describe('authorization-code grant (happy path, one-time, PKCE)', () => {
  it('issues a read token on a valid code + verifier', async () => {
    const verifier = 'v'.repeat(43);
    vi.mocked(oauthDb.consumeAuthCode).mockResolvedValueOnce({
      account_id: 5,
      client_id: 'companion',
      redirect_uri: 'https://app.example/cb',
      code_challenge: pkceChallengeFromVerifier(verifier),
      code_challenge_method: 'S256',
      scope: 'character:read',
    });
    const r = await call('POST', '/oauth/token', {
      grant_type: 'authorization_code',
      code: 'thecode',
      code_verifier: verifier,
      client_id: 'companion',
      redirect_uri: 'https://app.example/cb',
    });
    expect(r.status).toBe(200);
    expect(r.json.token_type).toBe('bearer');
    expect(r.json.scope).toBe('character:read');
    expect(r.json.access_token).toMatch(/^[a-f0-9]{64}$/);
    // The issued token is persisted as scope='read'.
    expect(db.saveToken).toHaveBeenCalledWith(
      expect.any(String),
      5,
      expect.any(Number),
      'read',
      expect.stringContaining('oauth:'),
    );
  });

  it('rejects a reused (already-consumed) code', async () => {
    vi.mocked(oauthDb.consumeAuthCode).mockResolvedValueOnce(null); // already consumed -> null
    const r = await call('POST', '/oauth/token', {
      grant_type: 'authorization_code',
      code: 'thecode',
      code_verifier: 'v'.repeat(43),
      client_id: 'companion',
      redirect_uri: 'https://app.example/cb',
    });
    expect(r.status).toBe(400);
    expect(r.json.error).toBe('invalid_grant');
    expect(db.saveToken).not.toHaveBeenCalled();
  });

  it('rejects a bad PKCE verifier', async () => {
    vi.mocked(oauthDb.consumeAuthCode).mockResolvedValueOnce({
      account_id: 5,
      client_id: 'companion',
      redirect_uri: 'https://app.example/cb',
      code_challenge: pkceChallengeFromVerifier('the-real-verifier'),
      code_challenge_method: 'S256',
      scope: 'character:read',
    });
    const r = await call('POST', '/oauth/token', {
      grant_type: 'authorization_code',
      code: 'thecode',
      code_verifier: 'wrong-verifier',
      client_id: 'companion',
      redirect_uri: 'https://app.example/cb',
    });
    expect(r.status).toBe(400);
    expect(r.json.error).toBe('invalid_grant');
    expect(db.saveToken).not.toHaveBeenCalled();
  });
});

describe('device-code grant', () => {
  const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';

  it('reports authorization_pending until approved, then issues a token once', async () => {
    vi.mocked(oauthDb.getDeviceByDeviceCode).mockResolvedValueOnce({
      account_id: null,
      approved: false,
      scope: 'character:read',
      expired: false,
      consumed: false,
    });
    const pending = await call('POST', '/oauth/token', {
      grant_type: DEVICE_GRANT,
      device_code: 'dc',
      client_id: 'companion',
    });
    expect(pending.status).toBe(400);
    expect(pending.json.error).toBe('authorization_pending');

    vi.mocked(oauthDb.getDeviceByDeviceCode).mockResolvedValueOnce({
      account_id: 5,
      approved: true,
      scope: 'character:read',
      expired: false,
      consumed: false,
    });
    vi.mocked(oauthDb.consumeDeviceCode).mockResolvedValueOnce({
      account_id: 5,
      scope: 'character:read',
    });
    const ok = await call('POST', '/oauth/token', {
      grant_type: DEVICE_GRANT,
      device_code: 'dc',
      client_id: 'companion',
    });
    expect(ok.status).toBe(200);
    expect(ok.json.access_token).toMatch(/^[a-f0-9]{64}$/);
    expect(db.saveToken).toHaveBeenCalledWith(
      expect.any(String),
      5,
      expect.any(Number),
      'read',
      expect.any(String),
    );
  });

  it('rejects an expired device code', async () => {
    vi.mocked(oauthDb.getDeviceByDeviceCode).mockResolvedValueOnce({
      account_id: null,
      approved: false,
      scope: 'character:read',
      expired: true,
      consumed: false,
    });
    const r = await call('POST', '/oauth/token', {
      grant_type: DEVICE_GRANT,
      device_code: 'dc',
      client_id: 'companion',
    });
    expect(r.status).toBe(400);
    expect(r.json.error).toBe('expired_token');
  });

  it('starts a device authorization with a user code + poll interval', async () => {
    const r = await call('POST', '/oauth/device_authorization', { client_id: 'companion' });
    expect(r.status).toBe(200);
    expect(r.json.user_code).toMatch(
      /^[BCDFGHJKLMNPQRSTVWXZ23456789]{4}-[BCDFGHJKLMNPQRSTVWXZ23456789]{4}$/,
    );
    expect(r.json.device_code).toMatch(/^[a-f0-9]{64}$/);
    expect(r.json.interval).toBeGreaterThan(0);
    expect(oauthDb.createDeviceCode).toHaveBeenCalled();
  });

  it('stores the user code normalized so approval matches the lookup', async () => {
    // Regression: the displayed user_code is dashed (XXXX-XXXX) but it must be
    // stored normalized, because approveDevice normalizes the submitted code and
    // looks it up with an exact match. If they disagree, approval never works.
    const start = await call('POST', '/oauth/device_authorization', { client_id: 'companion' });
    const displayed = start.json.user_code as string;
    expect(displayed).toContain('-');

    const stored = vi.mocked(oauthDb.createDeviceCode).mock.calls[0][1].userCode as string;
    expect(stored).toBe(normalizeUserCode(displayed));
    expect(stored).not.toContain('-');

    // Approving with the dashed code the user sees must resolve to the stored value.
    vi.mocked(oauthDb.getDeviceByUserCode).mockResolvedValueOnce({
      device_code: 'dc',
      user_code: stored,
      client_id: 'companion',
      scope: 'character:read',
      account_id: null,
      approved: false,
      expired: false,
      consumed: false,
    });
    vi.mocked(oauthDb.approveDeviceCode).mockResolvedValueOnce(true);
    const approve = await call('POST', '/oauth/device', { user_code: displayed }, BEARER);
    expect(approve.status).toBe(200);
    expect(oauthDb.getDeviceByUserCode).toHaveBeenCalledWith(expect.anything(), stored);
    expect(oauthDb.approveDeviceCode).toHaveBeenCalledWith(expect.anything(), stored, 5);
  });
});

describe('authorize approval reuses the web session', () => {
  it('escapes the embedded request JSON so OAuth params cannot break out of the inline script', async () => {
    const payload = '</script><script>globalThis.__owned=1</script>';
    const r = await callRaw(
      'GET',
      `/oauth/authorize?client_id=companion&redirect_uri=${encodeURIComponent('https://app.example/cb')}&response_type=code&code_challenge=${encodeURIComponent(payload)}&code_challenge_method=S256&state=${encodeURIComponent(payload)}`,
      {},
    );
    expect(r.status).toBe(200);
    expect(r.body).not.toContain(payload);
    expect(r.body).toContain('\\u003c/script>');
  });

  it('creates a code and returns a redirect for a full session', async () => {
    const r = await call(
      'POST',
      '/oauth/authorize',
      {
        client_id: 'companion',
        redirect_uri: 'https://app.example/cb',
        code_challenge: 'abc',
        code_challenge_method: 'S256',
        state: 'xyz',
      },
      BEARER,
    );
    expect(r.status).toBe(200);
    expect(r.json.redirect).toContain('https://app.example/cb?');
    expect(r.json.redirect).toContain('state=xyz');
    expect(oauthDb.createAuthCode).toHaveBeenCalled();
  });

  it('refuses to authorize with a read-only token (no escalation)', async () => {
    vi.mocked(db.accountAndScopeForToken).mockResolvedValue({ accountId: 5, scope: 'read' });
    const r = await call(
      'POST',
      '/oauth/authorize',
      {
        client_id: 'companion',
        redirect_uri: 'https://app.example/cb',
        code_challenge: 'abc',
        code_challenge_method: 'S256',
      },
      BEARER,
    );
    expect(r.status).toBe(401);
    expect(oauthDb.createAuthCode).not.toHaveBeenCalled();
  });
});

describe('POST /oauth/revoke (RFC 7009)', () => {
  it('revokes the presented token and returns 200', async () => {
    const r = await call('POST', '/oauth/revoke', { token: 'a'.repeat(64) });
    expect(r.status).toBe(200);
    // It deletes only via the scope='read'-restricted revoke (never a full session).
    expect(db.revokeReadToken).toHaveBeenCalledWith('a'.repeat(64));
  });

  it('accepts a form-encoded body', async () => {
    const r = await call('POST', '/oauth/revoke', `token=${'b'.repeat(64)}`, {
      'content-type': 'application/x-www-form-urlencoded',
    });
    expect(r.status).toBe(200);
    expect(db.revokeReadToken).toHaveBeenCalledWith('b'.repeat(64));
  });

  it('still returns 200 for an unknown / already-revoked token', async () => {
    vi.mocked(db.revokeReadToken).mockResolvedValueOnce(false);
    const r = await call('POST', '/oauth/revoke', { token: 'deadbeef' });
    expect(r.status).toBe(200);
  });

  it('returns 200 with no token and does not call the DB', async () => {
    const r = await call('POST', '/oauth/revoke', {});
    expect(r.status).toBe(200);
    expect(db.revokeReadToken).not.toHaveBeenCalled();
  });
});
