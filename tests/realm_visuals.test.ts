import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory world_state + injectable auth so the handler runs with no Postgres.
const store = new Map<string, unknown>();
let bodyToReturn: unknown = {};

vi.mock('../server/db', () => ({
  loadWorldState: vi.fn(async (key: string) => store.get(key) ?? null),
  saveWorldState: vi.fn(async (key: string, data: unknown) => {
    store.set(key, JSON.parse(JSON.stringify(data)));
  }),
  accountAndScopeForToken: vi.fn(),
  isAdminAccount: vi.fn(),
}));
vi.mock('../server/http_util', () => ({
  readBody: vi.fn(async () => bodyToReturn),
}));

import { accountAndScopeForToken, isAdminAccount } from '../server/db';
import { handleRealmVisuals, loadRealmVisuals } from '../server/realm_visuals';

const TOKEN = 'a'.repeat(64);

function fakeReq(method: string, url: string, auth?: string): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage;
  req.method = method;
  req.url = url;
  req.headers = auth ? { authorization: auth } : {};
  return req;
}

type CapturedRes = ServerResponse & { _status: number; _body: string };

class FakeRes {
  _status = 0;
  _body = '';
  writeHead(status: number): this {
    this._status = status;
    return this;
  }
  end(chunk?: string): this {
    if (typeof chunk === 'string') this._body += chunk;
    return this;
  }
}

function fakeRes(): CapturedRes {
  return new FakeRes() as unknown as CapturedRes;
}

function asAdmin(id = 7): void {
  vi.mocked(accountAndScopeForToken).mockResolvedValue({ accountId: id, scope: 'full' });
  vi.mocked(isAdminAccount).mockResolvedValue(true);
}

beforeEach(() => {
  store.clear();
  bodyToReturn = {};
  vi.mocked(accountAndScopeForToken).mockReset();
  vi.mocked(isAdminAccount).mockReset();
});

describe('realm-visuals override store', () => {
  it('ignores paths it does not own', async () => {
    const res = fakeRes();
    const handled = await handleRealmVisuals(fakeReq('GET', '/api/other'), res);
    expect(handled).toBe(false);
  });

  it('GET returns an empty override map for a fresh realm', async () => {
    const res = fakeRes();
    await handleRealmVisuals(fakeReq('GET', '/api/realm-visuals/infernal'), res);
    expect(res._status).toBe(200);
    expect(JSON.parse(res._body)).toEqual({ realm: 'infernal', overrides: {} });
  });

  it('PUT without an admin token is refused with 403 and writes nothing', async () => {
    vi.mocked(accountAndScopeForToken).mockResolvedValue({ accountId: 7, scope: 'read' });
    vi.mocked(isAdminAccount).mockResolvedValue(false);
    bodyToReturn = {
      key: 'hero:Paladin',
      assetUrl: '/cr-realms/infernal/infernal_human_vanguard.glb',
    };
    const res = fakeRes();
    await handleRealmVisuals(fakeReq('PUT', '/api/realm-visuals/infernal', `Bearer ${TOKEN}`), res);
    expect(res._status).toBe(403);
    expect(store.size).toBe(0);
  });

  it('PUT as admin upserts an override, and a later GET reads it back', async () => {
    asAdmin(42);
    bodyToReturn = {
      key: 'hero:Paladin',
      assetUrl: '/cr-realms/infernal/infernal_human_vanguard.glb',
      assetName: 'Vanguard',
    };
    const put = fakeRes();
    await handleRealmVisuals(fakeReq('PUT', '/api/realm-visuals/infernal', `Bearer ${TOKEN}`), put);
    expect(put._status).toBe(200);

    const doc = await loadRealmVisuals('infernal');
    expect(doc.overrides['hero:Paladin']).toMatchObject({
      assetUrl: '/cr-realms/infernal/infernal_human_vanguard.glb',
      assetName: 'Vanguard',
      updatedBy: 42,
    });

    const get = fakeRes();
    await handleRealmVisuals(fakeReq('GET', '/api/realm-visuals/infernal'), get);
    expect(JSON.parse(get._body).overrides['hero:Paladin'].assetUrl).toBe(
      '/cr-realms/infernal/infernal_human_vanguard.glb',
    );
  });

  it('PUT rejects a non-internal or non-glb assetUrl with 400', async () => {
    asAdmin();
    bodyToReturn = { key: 'hero:Paladin', assetUrl: 'https://evil.example/x.glb' };
    const res = fakeRes();
    await handleRealmVisuals(fakeReq('PUT', '/api/realm-visuals/infernal', `Bearer ${TOKEN}`), res);
    expect(res._status).toBe(400);
    expect(store.size).toBe(0);
  });

  it('PUT rejects a malformed override key with 400', async () => {
    asAdmin();
    bodyToReturn = { key: 'weapon:sword', assetUrl: '/cr-realms/infernal/x.glb' };
    const res = fakeRes();
    await handleRealmVisuals(fakeReq('PUT', '/api/realm-visuals/infernal', `Bearer ${TOKEN}`), res);
    expect(res._status).toBe(400);
  });

  it('DELETE as admin removes an override', async () => {
    asAdmin();
    store.set('realm_visuals:infernal', {
      overrides: {
        'npc:the_merchant': {
          assetUrl: '/cr-realms/infernal/infernal_human_white_sage.glb',
          updatedAt: new Date().toISOString(),
          updatedBy: 1,
        },
      },
    });
    const res = fakeRes();
    await handleRealmVisuals(
      fakeReq('DELETE', '/api/realm-visuals/infernal?key=npc:the_merchant', `Bearer ${TOKEN}`),
      res,
    );
    expect(res._status).toBe(200);
    expect(JSON.parse(res._body).overrides).toEqual({});
  });

  it('sanitizes a stored doc, dropping bad keys and urls on read', async () => {
    store.set('realm_visuals:infernal', {
      overrides: {
        'hero:Amazon': {
          assetUrl: '/cr-realms/infernal/infernal_human_iron_ranger.glb',
          updatedAt: '2026-07-20T00:00:00.000Z',
          updatedBy: 3,
        },
        'weapon:bad': { assetUrl: '/cr-realms/infernal/x.glb' },
        'hero:Evil': { assetUrl: 'http://evil/x.glb' },
      },
    });
    const doc = await loadRealmVisuals('infernal');
    expect(Object.keys(doc.overrides)).toEqual(['hero:Amazon']);
  });
});
