process.env.DATABASE_URL ||= 'postgres://test:test@127.0.0.1:5433/realm_visuals_units';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpError } from '../server/http/errors';
import {
  deleteDraftRealmVisual,
  loadDraftRealmVisuals,
  loadPublishedRealmVisuals,
  loadRealmVisualHistory,
  publishDraftRealmVisuals,
  realmVisualTargets,
  resetRealmVisualsAuthDbForTests,
  resetRealmVisualsDbForTests,
  rollbackPublishedRealmVisuals,
  routes,
  sanitizeRealmVisualsState,
  setRealmVisualsAuthDbForTests,
  setRealmVisualsDbForTests,
  upsertDraftRealmVisual,
} from '../server/realm_visuals';
import { fakeCtx, nextGuard } from './server/helpers';

const store = new Map<string, unknown>();
const TOKEN = 'a'.repeat(64);

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

beforeEach(() => {
  store.clear();
  setRealmVisualsDbForTests({
    load: async (key) => clone(store.get(key) ?? null),
    mutate: async <T>(key: string, transform: (current: unknown | null) => T): Promise<T> => {
      const next = transform(clone(store.get(key) ?? null));
      store.set(key, clone(next));
      return clone(next);
    },
  });
});

afterEach(() => {
  resetRealmVisualsDbForTests();
  resetRealmVisualsAuthDbForTests();
});

describe('revisioned realm visual store', () => {
  it('imports the old overrides document without changing its live assignment', async () => {
    store.set('realm_visuals:infernal', {
      overrides: {
        'hero:Amazon': {
          assetUrl: '/cr-realms/infernal/infernal_human_iron_ranger.glb',
          updatedAt: '2026-07-20T00:00:00.000Z',
          updatedBy: 3,
        },
        'weapon:bad': { assetUrl: '/cr-realms/infernal/x.glb' },
        'hero:Evil': { assetUrl: 'https://evil.example/x.glb' },
      },
    });

    const published = (await loadPublishedRealmVisuals('infernal')) as {
      overrides: Record<string, unknown>;
    };
    const draft = (await loadDraftRealmVisuals('infernal')) as {
      overrides: Record<string, unknown>;
    };
    expect(Object.keys(published.overrides)).toEqual(['hero:Amazon']);
    expect(draft.overrides).toEqual(published.overrides);
  });

  it('keeps draft edits private until an authorized publish', async () => {
    const draft = (await upsertDraftRealmVisual({
      realm: 'infernal',
      key: 'hero:Paladin',
      assetUrl: '/cr-realms/infernal/infernal_human_vanguard.glb',
      assetName: 'Vanguard',
      expectedDraftRevision: 0,
      actorAccountId: 42,
      now: '2026-07-21T10:00:00.000Z',
    })) as { draftRevision: number; overrides: Record<string, unknown> };
    expect(draft.draftRevision).toBe(1);
    expect(draft.overrides).toHaveProperty('hero:Paladin');

    const before = (await loadPublishedRealmVisuals('infernal')) as {
      revision: number;
      overrides: Record<string, unknown>;
    };
    expect(before.revision).toBe(0);
    expect(before.overrides).toEqual({});

    const published = (await publishDraftRealmVisuals({
      realm: 'infernal',
      expectedDraftRevision: 1,
      actorAccountId: 7,
      now: '2026-07-21T10:01:00.000Z',
    })) as { revision: number; overrides: Record<string, unknown> };
    expect(published.revision).toBe(1);
    expect(published.overrides).toHaveProperty('hero:Paladin');
  });

  it('preserves independent edits and rejects an explicitly stale revision', async () => {
    await upsertDraftRealmVisual({
      realm: 'crypticrealm',
      key: 'npc:brother_aldric',
      assetUrl: '/cr-realms/infernal/infernal_human_white_sage.glb',
      actorAccountId: 1,
      now: '2026-07-21T10:00:00.000Z',
    });
    await upsertDraftRealmVisual({
      realm: 'crypticrealm',
      key: 'npc:marshal_redbrook',
      assetUrl: '/cr-realms/infernal/infernal_human_iron_warden.glb',
      actorAccountId: 2,
      now: '2026-07-21T10:00:01.000Z',
    });
    const draft = (await loadDraftRealmVisuals('crypticrealm')) as {
      draftRevision: number;
      overrides: Record<string, unknown>;
    };
    expect(draft.draftRevision).toBe(2);
    expect(Object.keys(draft.overrides).sort()).toEqual([
      'npc:brother_aldric',
      'npc:marshal_redbrook',
    ]);

    await expect(
      deleteDraftRealmVisual({
        realm: 'crypticrealm',
        key: 'npc:brother_aldric',
        expectedDraftRevision: 1,
        actorAccountId: 3,
      }),
    ).rejects.toMatchObject({ status: 409, code: 'db.conflict' });
  });

  it('records audit history and rolls a published snapshot forward safely', async () => {
    await upsertDraftRealmVisual({
      realm: 'infernal',
      key: 'hero:Warrior',
      assetUrl: '/cr-realms/infernal/infernal_human_iron_warden.glb',
      actorAccountId: 4,
      now: '2026-07-21T11:00:00.000Z',
    });
    await publishDraftRealmVisuals({
      realm: 'infernal',
      expectedDraftRevision: 1,
      actorAccountId: 4,
      now: '2026-07-21T11:01:00.000Z',
    });
    await upsertDraftRealmVisual({
      realm: 'infernal',
      key: 'hero:Warrior',
      assetUrl: '/cr-realms/infernal/infernal_human_vanguard.glb',
      actorAccountId: 5,
      now: '2026-07-21T11:02:00.000Z',
    });
    await publishDraftRealmVisuals({
      realm: 'infernal',
      expectedDraftRevision: 2,
      actorAccountId: 5,
      now: '2026-07-21T11:03:00.000Z',
    });

    const rolledBack = (await rollbackPublishedRealmVisuals({
      realm: 'infernal',
      revision: 1,
      expectedPublishedRevision: 2,
      actorAccountId: 9,
      now: '2026-07-21T11:04:00.000Z',
    })) as { revision: number; overrides: Record<string, { assetUrl: string }> };
    expect(rolledBack.revision).toBe(3);
    expect(rolledBack.overrides['hero:Warrior'].assetUrl).toContain('iron_warden');

    const history = (await loadRealmVisualHistory('infernal')) as {
      snapshots: Array<{ revision: number; action: string; sourceRevision?: number }>;
      audit: Array<{ action: string }>;
    };
    expect(history.snapshots.map((snapshot) => snapshot.revision)).toEqual([1, 2, 3]);
    expect(history.snapshots.at(-1)).toMatchObject({ action: 'rollback', sourceRevision: 1 });
    expect(history.audit.map((event) => event.action)).toEqual([
      'upsert',
      'publish',
      'upsert',
      'publish',
      'rollback',
    ]);
  });

  it('rejects external URLs, traversal, and malformed target keys', async () => {
    for (const [key, assetUrl] of [
      ['hero:Paladin', 'https://evil.example/x.glb'],
      ['hero:Paladin', '/cr-realms/infernal/../secret.glb'],
      ['weapon:sword', '/cr-realms/infernal/sword.glb'],
    ]) {
      await expect(
        upsertDraftRealmVisual({
          realm: 'infernal',
          key,
          assetUrl,
          actorAccountId: 7,
        }),
      ).rejects.toMatchObject({ ok: false });
    }
    expect(store.size).toBe(0);
  });

  it('accepts explicit mob-template body assignments', async () => {
    const draft = (await upsertDraftRealmVisual({
      realm: 'infernal',
      key: 'mob:vale_bandit',
      assetUrl: '/cr-realms/infernal/dark_paladin_commander.glb',
      actorAccountId: 7,
    })) as { overrides: Record<string, unknown> };
    expect(draft.overrides).toHaveProperty('mob:vale_bandit');
  });

  it('sanitizes impossible revisions and bounded documents', () => {
    const state = sanitizeRealmVisualsState({
      draftRevision: -1,
      publishedRevision: Number.NaN,
      draftOverrides: null,
      publishedOverrides: [],
      snapshots: [{ action: 'unknown' }],
      audit: [{ action: 'unknown' }],
    });
    expect(state).toMatchObject({
      draftRevision: 0,
      publishedRevision: 0,
      draftOverrides: {},
      publishedOverrides: {},
      snapshots: [],
      audit: [],
    });
  });
});

describe('realm visual route permissions', () => {
  function routeGuard(method: string, suffix = '') {
    const path = `/api/realm-visuals/:realm${suffix}`;
    const route = routes.find(
      (candidate) => candidate.method === method && candidate.path === path,
    );
    if (!route?.middleware?.[0]) throw new Error(`missing guard for ${method} ${path}`);
    return route.middleware[0];
  }

  it('lets an editor change drafts but not publish them', async () => {
    setRealmVisualsAuthDbForTests({
      accountAndScopeForToken: async () => ({ accountId: 11, scope: 'full' }),
      accountForAuthentikAccessToken: async () => null,
      adminRolesForAccount: async () => ({ username: 'editor', roles: ['moderator'] }),
    });
    const ctx = fakeCtx({ headers: { authorization: `Bearer ${TOKEN}` } });
    let editReached = false;
    await routeGuard('PUT')(
      ctx,
      nextGuard(() => {
        editReached = true;
      }),
    );
    expect(editReached).toBe(true);
    expect(ctx.account?.accountId).toBe(11);

    await expect(routeGuard('POST', '/publish')(ctx, nextGuard())).rejects.toEqual(
      expect.objectContaining({ status: 403, code: 'auth.forbidden' }),
    );
  });

  it('requires a full token and grants publish/rollback only to authorized admins', async () => {
    setRealmVisualsAuthDbForTests({
      accountAndScopeForToken: async () => ({ accountId: 12, scope: 'read' }),
      accountForAuthentikAccessToken: async () => null,
      adminRolesForAccount: async () => ({ username: 'admin', roles: ['admin'] }),
    });
    const readTokenCtx = fakeCtx({ headers: { authorization: `Bearer ${TOKEN}` } });
    await expect(routeGuard('POST', '/publish')(readTokenCtx, nextGuard())).rejects.toEqual(
      expect.objectContaining({ status: 403, code: 'auth.forbidden' }),
    );

    setRealmVisualsAuthDbForTests({
      accountAndScopeForToken: async () => ({ accountId: 12, scope: 'full' }),
      accountForAuthentikAccessToken: async () => null,
      adminRolesForAccount: async () => ({ username: 'admin', roles: ['admin'] }),
    });
    for (const suffix of ['/publish', '/rollback']) {
      let reached = false;
      await routeGuard('POST', suffix)(
        fakeCtx({ headers: { authorization: `Bearer ${TOKEN}` } }),
        nextGuard(() => {
          reached = true;
        }),
      );
      expect(reached, suffix).toBe(true);
    }
  });

  it('accepts a linked Authentik account but still enforces its current staff roles', async () => {
    setRealmVisualsAuthDbForTests({
      accountAndScopeForToken: async () => null,
      accountForAuthentikAccessToken: async () => ({ accountId: 13, scope: 'full' }),
      adminRolesForAccount: async () => ({ username: 'moveweight', roles: ['admin'] }),
    });
    const ctx = fakeCtx({ headers: { authorization: `Bearer ${TOKEN}` } });
    let publishReached = false;
    await routeGuard('POST', '/publish')(
      ctx,
      nextGuard(() => {
        publishReached = true;
      }),
    );
    expect(publishReached).toBe(true);
    expect(ctx.account?.accountId).toBe(13);

    setRealmVisualsAuthDbForTests({
      accountAndScopeForToken: async () => null,
      accountForAuthentikAccessToken: async () => ({ accountId: 14, scope: 'full' }),
      adminRolesForAccount: async () => ({ username: 'linked-player', roles: [] }),
    });
    await expect(
      routeGuard('PUT')(fakeCtx({ headers: { authorization: `Bearer ${TOKEN}` } }), nextGuard()),
    ).rejects.toMatchObject({ status: 403, code: 'auth.forbidden' });
  });

  it('fails closed on missing bearer credentials', async () => {
    await expect(routeGuard('PUT')(fakeCtx(), nextGuard())).rejects.toBeInstanceOf(HttpError);
    await expect(routeGuard('PUT')(fakeCtx(), nextGuard())).rejects.toMatchObject({
      status: 401,
      code: 'auth.token_missing',
    });
  });
});

describe('realm visual target catalog', () => {
  it('exposes every Infernal faction character once plus classes, NPCs, and creatures', () => {
    const { targets } = realmVisualTargets('infernal');
    const factionTargets = targets.filter((target) => target.section === 'Faction characters');
    expect(factionTargets).toHaveLength(24);
    expect(new Set(factionTargets.map((target) => target.key)).size).toBe(24);
    expect(factionTargets.find((target) => target.label.startsWith('Dark Paladin'))?.faction).toBe(
      'hell',
    );
    expect(targets.some((target) => target.key === 'class:warrior')).toBe(true);
    expect(targets.some((target) => target.key.startsWith('npc:'))).toBe(true);
    expect(targets.some((target) => target.key.startsWith('mob:'))).toBe(true);
  });

  it('does not leak Infernal faction choices into other realms', () => {
    expect(
      realmVisualTargets('crypticrealm').targets.some(
        (target) => target.section === 'Faction characters',
      ),
    ).toBe(false);
  });
});
