import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';

// Mock the db + auth surface so we don't need Postgres.
vi.mock('../server/db', () => ({
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  upsertOAuthAccount: vi.fn(),
  touchLogin: vi.fn(),
  saveToken: vi.fn(),
  accountForToken: vi.fn(),
}));
vi.mock('../server/auth', () => ({ newToken: vi.fn(() => 'c'.repeat(64)) }));

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
