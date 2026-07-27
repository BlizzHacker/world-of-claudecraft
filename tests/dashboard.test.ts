import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';

vi.mock('../server/db', () => ({
  loadAccountFlair: vi.fn(async () => ({ ai: false, streamer: false, links: {} })),
  walletForAccount: vi.fn(async () => null),
  saveCharacterAndMarketState: vi.fn(async () => {}),
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  findAccount: vi.fn(),
  touchLogin: vi.fn(),
  saveToken: vi.fn(),
  accountForToken: vi.fn(),
  isAdminAccount: vi.fn(),
  isModeratorAccount: vi.fn(),
  accountRoleFlags: vi.fn(),
  listCharacters: vi.fn(),
  moderationStatusForAccount: vi.fn(),
  chatMuteStatusForAccount: vi.fn(),
  accountTotpState: vi.fn(),
  setAccountTotpSecret: vi.fn(),
  enableAccountTotp: vi.fn(),
  disableAccountTotp: vi.fn(),
}));
vi.mock('../server/moderation_db', () => ({
  moderationQueue: vi.fn(),
}));
vi.mock('../server/auth', () => ({
  verifyPassword: vi.fn(),
  newToken: vi.fn(() => 'b'.repeat(64)),
}));
vi.mock('../server/realm', () => ({ REALM: 'Test' }));

import { handleUserApi, handleModeratorApi } from '../server/dashboard';
import {
  findAccount, accountForToken, isModeratorAccount, accountRoleFlags,
  listCharacters, moderationStatusForAccount, chatMuteStatusForAccount,
  accountTotpState, setAccountTotpSecret, enableAccountTotp, disableAccountTotp,
} from '../server/db';
import { moderationQueue } from '../server/moderation_db';
import { verifyPassword } from '../server/auth';
import { totpCode } from '../server/totp';

const TOKEN = 'a'.repeat(64);

function fakeReq(opts: { method?: string; url?: string; token?: string; body?: unknown } = {}) {
  const req: any = new EventEmitter();
  req.method = opts.method ?? 'GET';
  req.url = opts.url ?? '/me/api/me';
  req.headers = opts.token ? { authorization: `Bearer ${opts.token}` } : {};
  req.socket = { remoteAddress: `10.0.0.${Math.floor(Math.random() * 250) + 1}` };
  if (opts.method === 'POST') {
    setImmediate(() => {
      if (opts.body !== undefined) req.emit('data', JSON.stringify(opts.body));
      req.emit('end');
    });
  }
  return req;
}

function fakeRes() {
  const res: any = {
    statusCode: 0,
    body: null as any,
    writeHead(status: number) { this.statusCode = status; },
    end(data?: string) { this.body = data ? JSON.parse(data) : null; },
  };
  return res;
}

const STD_MOD_STATUS = {
  locked: false, banned: false, suspendedUntil: null,
  reason: '', message: '', chatMutedUntil: null, chatStrikes: 0,
};
const STD_CHAT_MUTE = { mutedUntil: null, reason: '' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(moderationStatusForAccount).mockResolvedValue(STD_MOD_STATUS);
  vi.mocked(chatMuteStatusForAccount).mockResolvedValue(STD_CHAT_MUTE);
  vi.mocked(listCharacters).mockResolvedValue([]);
  vi.mocked(accountRoleFlags).mockResolvedValue({ isAdmin: false, isModerator: false });
  vi.mocked(isModeratorAccount).mockResolvedValue(false);
  vi.mocked(accountTotpState).mockResolvedValue({ enabled: false, configured: false, secret: null });
});

describe('/me/api/login', () => {
  it('returns 200 + token for valid credentials', async () => {
    vi.mocked(findAccount).mockResolvedValue({ id: 7, username: 'wade', password_hash: 'hash', created_at: '' } as any);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const req = fakeReq({ method: 'POST', url: '/me/api/login', body: { username: 'wade', password: 'secret' } });
    const res = fakeRes();
    await handleUserApi(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toMatch(/^b+$/);
    expect(res.body.data.username).toBe('wade');
    expect(res.body.data.roles).toEqual({ isAdmin: false, isModerator: false });
  });

  it('returns 401 for bad password', async () => {
    vi.mocked(findAccount).mockResolvedValue({ id: 7, username: 'wade', password_hash: 'hash' } as any);
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const req = fakeReq({ method: 'POST', url: '/me/api/login', body: { username: 'wade', password: 'wrong' } });
    const res = fakeRes();
    await handleUserApi(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/invalid/);
  });

  it('blocks banned / suspended accounts', async () => {
    vi.mocked(findAccount).mockResolvedValue({ id: 7, username: 'wade', password_hash: 'hash' } as any);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(moderationStatusForAccount).mockResolvedValue({
      ...STD_MOD_STATUS, locked: true, banned: true, message: 'Banned for cheating',
    });
    const req = fakeReq({ method: 'POST', url: '/me/api/login', body: { username: 'wade', password: 'secret' } });
    const res = fakeRes();
    await handleUserApi(req, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Banned/);
  });

  it('requires a valid TOTP code when enabled', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    vi.mocked(findAccount).mockResolvedValue({ id: 7, username: 'wade', password_hash: 'hash' } as any);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(accountTotpState).mockResolvedValue({ enabled: true, configured: true, secret });

    const missingReq = fakeReq({ method: 'POST', url: '/me/api/login', body: { username: 'wade', password: 'secret' } });
    const missingRes = fakeRes();
    await handleUserApi(missingReq, missingRes);
    expect(missingRes.statusCode).toBe(403);
    expect(missingRes.body.error).toMatch(/two-factor/);

    const okReq = fakeReq({
      method: 'POST',
      url: '/me/api/login',
      body: { username: 'wade', password: 'secret', totpCode: totpCode(secret) },
    });
    const okRes = fakeRes();
    await handleUserApi(okReq, okRes);
    expect(okRes.statusCode).toBe(200);
    expect(okRes.body.data.token).toMatch(/^b+$/);
  });
});

describe('/me/api/me', () => {
  it('returns 401 without Bearer token', async () => {
    const req = fakeReq({ method: 'GET', url: '/me/api/me' });
    const res = fakeRes();
    await handleUserApi(req, res);
    expect(res.statusCode).toBe(401);
  });

  it('returns own account info + characters', async () => {
    vi.mocked(accountForToken).mockResolvedValue(42);
    vi.mocked(accountRoleFlags).mockResolvedValue({ isAdmin: false, isModerator: true });
    vi.mocked(listCharacters).mockResolvedValue([
      { id: 1, account_id: 42, name: 'Crypta', class: 'warrior' as any, level: 12, state: { lifetimeXp: 9999 } as any, is_gm: false, force_rename: false },
      { id: 2, account_id: 42, name: 'Vexa',   class: 'mage'    as any, level: 5,  state: null as any, is_gm: false, force_rename: false },
    ]);
    const req = fakeReq({ method: 'GET', url: '/me/api/me', token: TOKEN });
    const res = fakeRes();
    await handleUserApi(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.accountId).toBe(42);
    expect(res.body.data.realm).toBe('Test');
    expect(res.body.data.roles.isModerator).toBe(true);
    expect(res.body.data.characters.length).toBe(2);
    expect(res.body.data.characters[0]).toMatchObject({ name: 'Crypta', class: 'warrior', level: 12, lifetimeXp: 9999, realm: 'Test' });
    expect(res.body.data.characters[1].lifetimeXp).toBe(0);
  });
});

describe('/me/api/security', () => {
  it('returns TOTP security state', async () => {
    vi.mocked(accountForToken).mockResolvedValue(42);
    vi.mocked(accountTotpState).mockResolvedValue({ enabled: true, configured: true, secret: 'secret' });
    const req = fakeReq({ method: 'GET', url: '/me/api/security', token: TOKEN });
    const res = fakeRes();
    await handleUserApi(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.totp).toEqual({ enabled: true, configured: true });
  });

  it('enables TOTP after setup code verification', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    vi.mocked(accountForToken).mockResolvedValue(42);
    vi.mocked(accountTotpState).mockResolvedValue({ enabled: false, configured: true, secret });
    const req = fakeReq({
      method: 'POST',
      url: '/me/api/security/totp/enable',
      token: TOKEN,
      body: { code: totpCode(secret) },
    });
    const res = fakeRes();
    await handleUserApi(req, res);
    expect(res.statusCode).toBe(200);
    expect(enableAccountTotp).toHaveBeenCalledWith(42);
  });

  it('generates a pending TOTP setup secret', async () => {
    vi.mocked(accountForToken).mockResolvedValue(42);
    const req = fakeReq({ method: 'POST', url: '/me/api/security/totp/setup', token: TOKEN, body: {} });
    const res = fakeRes();
    await handleUserApi(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.secret).toMatch(/^[A-Z2-7]+$/);
    expect(res.body.data.otpauthUrl).toContain('otpauth://totp/');
    expect(setAccountTotpSecret).toHaveBeenCalledWith(42, res.body.data.secret);
  });

  it('disables TOTP after current code verification', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    vi.mocked(accountForToken).mockResolvedValue(42);
    vi.mocked(accountTotpState).mockResolvedValue({ enabled: true, configured: true, secret });
    const req = fakeReq({
      method: 'POST',
      url: '/me/api/security/totp/disable',
      token: TOKEN,
      body: { code: totpCode(secret) },
    });
    const res = fakeRes();
    await handleUserApi(req, res);
    expect(res.statusCode).toBe(200);
    expect(disableAccountTotp).toHaveBeenCalledWith(42);
  });
});

describe('/mod/api/login', () => {
  it('returns 403 when account is not moderator', async () => {
    vi.mocked(findAccount).mockResolvedValue({ id: 7, username: 'rando', password_hash: 'hash' } as any);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(isModeratorAccount).mockResolvedValue(false);
    const req = fakeReq({ method: 'POST', url: '/mod/api/login', body: { username: 'rando', password: 'secret' } });
    const res = fakeRes();
    await handleModeratorApi(req, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/moderator/);
  });

  it('returns 200 for a moderator account', async () => {
    vi.mocked(findAccount).mockResolvedValue({ id: 8, username: 'modgirl', password_hash: 'hash' } as any);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(isModeratorAccount).mockResolvedValue(true);
    vi.mocked(accountRoleFlags).mockResolvedValue({ isAdmin: false, isModerator: true });
    const req = fakeReq({ method: 'POST', url: '/mod/api/login', body: { username: 'modgirl', password: 'secret' } });
    const res = fakeRes();
    await handleModeratorApi(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.roles.isModerator).toBe(true);
  });

  it('requires a valid TOTP code for moderator login when enabled', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    vi.mocked(findAccount).mockResolvedValue({ id: 8, username: 'modgirl', password_hash: 'hash' } as any);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(isModeratorAccount).mockResolvedValue(true);
    vi.mocked(accountRoleFlags).mockResolvedValue({ isAdmin: false, isModerator: true });
    vi.mocked(accountTotpState).mockResolvedValue({ enabled: true, configured: true, secret });

    const missingReq = fakeReq({ method: 'POST', url: '/mod/api/login', body: { username: 'modgirl', password: 'secret' } });
    const missingRes = fakeRes();
    await handleModeratorApi(missingReq, missingRes);
    expect(missingRes.statusCode).toBe(403);
    expect(missingRes.body.error).toMatch(/two-factor/);

    const okReq = fakeReq({
      method: 'POST',
      url: '/mod/api/login',
      body: { username: 'modgirl', password: 'secret', totpCode: totpCode(secret) },
    });
    const okRes = fakeRes();
    await handleModeratorApi(okReq, okRes);
    expect(okRes.statusCode).toBe(200);
    expect(okRes.body.data.roles.isModerator).toBe(true);
  });
});

describe('/mod/api/queue', () => {
  it('returns 403 when caller is not a moderator', async () => {
    vi.mocked(accountForToken).mockResolvedValue(42);
    vi.mocked(isModeratorAccount).mockResolvedValue(false);
    const req = fakeReq({ method: 'GET', url: '/mod/api/queue', token: TOKEN });
    const res = fakeRes();
    await handleModeratorApi(req, res);
    expect(res.statusCode).toBe(403);
  });

  it('returns the queue for moderators', async () => {
    vi.mocked(accountForToken).mockResolvedValue(42);
    vi.mocked(isModeratorAccount).mockResolvedValue(true);
    vi.mocked(moderationQueue).mockResolvedValue([
      {
        accountId: 7,
        username: 'baduser',
        status: 'active',
        suspendedUntil: null,
        openReports: 3,
        latestReportAt: '2026-06-15',
        latestReason: 'spam',
        characterNames: [],
        online: false,
        isAdmin: false,
      },
    ]);
    const req = fakeReq({ method: 'GET', url: '/mod/api/queue', token: TOKEN });
    const res = fakeRes();
    await handleModeratorApi(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].username).toBe('baduser');
    expect(res.body.data[0].openReports).toBe(3);
  });
});
