import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock the db layer so no Postgres is needed; only the live GameServer command
// dispatch and event routing are under test (the 2033 stub trap: a refusal
// must be proven to flow server to client, not just emitted into the sim's
// buffer).
vi.mock('../server/db', () => ({
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  saveCharacterState: vi.fn(async () => {}),
  saveCharacterAndMarketState: vi.fn(async () => {}),
  openPlaySession: vi.fn(async () => 1),
  touchCharacterLogin: vi.fn(async () => {}),
  closePlaySession: vi.fn(async () => {}),
  insertChatLogs: vi.fn(async () => {}),
  walletForAccount: vi.fn(async () => null),
  loadAccountFlair: vi.fn(async () => ({ ai: false, streamer: false, links: {} })),
  markAccountQuestComplete: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  grantAccountMechChroma: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  setAccountWeaponSkinLoadout: vi.fn(async () => ({
    completedQuestIds: [],
    mechChromaIds: [],
    weaponSkinIds: [],
    weaponSkinLoadout: {},
  })),
}));

import {
  grantBodySkinEntitlement,
  resetBodySkinEntitlementsForTests,
} from '../server/body_skin_entitlement';
import { GameServer } from '../server/game';
import { swapBodySkin } from '../src/sim/cosmetics/body_skin_swap';
import { UNLOCKED_SKIN_LEVEL } from '../src/sim/cosmetics/body_skins';
import { Sim } from '../src/sim/sim';
import type { SimEvent } from '../src/sim/types';
import {
  bareClient,
  broadcast,
  type FakeClient,
  fakeWs,
  joinServer,
  lastSnap,
} from './helpers/bare_client';

// The four refusal literals, byte-identical to the ctx.error emits in
// src/sim/cosmetics/body_skin_swap.ts AND to the sim_i18n error.bodySkin* EXACT
// rows (the S3 guard holds all three in lockstep).
const MSG_UNKNOWN = 'That appearance does not exist.';
const MSG_LEVEL = 'You have not unlocked that appearance yet.';
const MSG_UNOWNED = 'You do not own that appearance.';
const MSG_NO_ART = 'That appearance has no body for your class.';

afterEach(() => {
  resetBodySkinEntitlementsForTests();
});

// ---------------------------------------------------------------------------
// The pure command body: one rule for every host.
// ---------------------------------------------------------------------------

function fakeCtx() {
  const errors: { pid: number; text: string }[] = [];
  return { errors, ctx: { error: (pid: number, text: string) => errors.push({ pid, text }) } };
}

function wearer(overrides: Partial<{ kind: string; templateId: string }> = {}) {
  return {
    id: 7,
    kind: overrides.kind ?? 'player',
    templateId: overrides.templateId ?? 'warrior',
    bodySkinId: null as string | null,
  };
}

describe('swapBodySkin (the pure set_body_skin body)', () => {
  it('null clears back to the class body even below every gate', () => {
    const { errors, ctx } = fakeCtx();
    const e = wearer();
    e.bodySkinId = 'heavenly_host';
    expect(swapBodySkin(ctx, e, null, { level: 1 })).toBe(true);
    expect(e.bodySkinId).toBeNull();
    expect(errors).toEqual([]);
  });

  it('writes the skin at exactly the level gate and emits nothing', () => {
    const { errors, ctx } = fakeCtx();
    const e = wearer();
    expect(swapBodySkin(ctx, e, 'heavenly_host', { level: UNLOCKED_SKIN_LEVEL })).toBe(true);
    expect(e.bodySkinId).toBe('heavenly_host');
    expect(errors).toEqual([]);
  });

  it('refuses each denial reason with its exact matcher-covered literal', () => {
    const cases: { requested: string; grants: Parameters<typeof swapBodySkin>[3]; text: string }[] =
      [
        { requested: 'not_a_skin', grants: { level: UNLOCKED_SKIN_LEVEL }, text: MSG_UNKNOWN },
        { requested: 'heavenly_host', grants: { level: UNLOCKED_SKIN_LEVEL - 1 }, text: MSG_LEVEL },
        { requested: 'famous_heroes', grants: { level: UNLOCKED_SKIN_LEVEL }, text: MSG_UNOWNED },
        // The dev grant answers level and ownership but never the catalog: the
        // premium shelf ships no bodies yet, so even a dev is refused on art.
        { requested: 'famous_heroes', grants: { level: 1, dev: true }, text: MSG_NO_ART },
      ];
    for (const { requested, grants, text } of cases) {
      const { errors, ctx } = fakeCtx();
      const e = wearer();
      expect(swapBodySkin(ctx, e, requested, grants), requested).toBe(false);
      expect(e.bodySkinId, requested).toBeNull();
      expect(errors, requested).toEqual([{ pid: 7, text }]);
    }
  });

  it('refuses a class the family has no art for (demonic rogue) at the cap', () => {
    const { errors, ctx } = fakeCtx();
    const e = wearer({ templateId: 'rogue' });
    expect(swapBodySkin(ctx, e, 'demonic', { level: UNLOCKED_SKIN_LEVEL })).toBe(false);
    expect(e.bodySkinId).toBeNull();
    expect(errors).toEqual([{ pid: 7, text: MSG_NO_ART }]);
  });

  it('ignores a non-player entity without emitting', () => {
    const { errors, ctx } = fakeCtx();
    const e = wearer({ kind: 'mob' });
    expect(swapBodySkin(ctx, e, 'heavenly_host', { level: UNLOCKED_SKIN_LEVEL, dev: true })).toBe(
      false,
    );
    expect(e.bodySkinId).toBeNull();
    expect(errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The offline Sim facade: local meta is the grant authority.
// ---------------------------------------------------------------------------

describe('Sim.setBodySkin (offline)', () => {
  it('the dev grant swaps live and the pick persists through serializeCharacter', () => {
    const sim = new Sim({ seed: 42, playerClass: 'warrior', devCommands: true });
    expect(sim.bodySkinGrants()).toEqual({
      level: sim.player.level,
      entitlements: [],
      dev: true,
    });
    sim.setBodySkin('heavenly_host');
    expect(sim.player.bodySkinId).toBe('heavenly_host');
    expect(sim.serializeCharacter(sim.player.id)?.bodySkinId).toBe('heavenly_host');
    sim.setBodySkin(null);
    expect(sim.player.bodySkinId).toBeNull();
    expect(sim.serializeCharacter(sim.player.id)?.bodySkinId).toBeUndefined();
  });

  it('without the dev grant a level 1 character is refused with the level toast', () => {
    const sim = new Sim({ seed: 42, playerClass: 'warrior' });
    expect(sim.bodySkinGrants().dev).toBe(false);
    sim.setBodySkin('heavenly_host');
    expect(sim.player.bodySkinId).toBeNull();
    const events = sim.tick();
    expect(events.some((e) => e.type === 'error' && e.text === MSG_LEVEL)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The online server: the command re-authorizes against server facts and the
// verdict reaches every viewer on the entity wire.
// ---------------------------------------------------------------------------

function send(server: GameServer, session: ReturnType<typeof joinServer>, skinId: unknown): void {
  server.handleMessage(session, JSON.stringify({ t: 'cmd', cmd: 'set_body_skin', skinId }));
}

function deliveredEvents(fc: FakeClient): SimEvent[] {
  return fc.sent.filter((m) => m.t === 'events').flatMap((m) => m.list as SimEvent[]);
}

function routeSimEvents(server: GameServer): void {
  // biome-ignore lint/suspicious/noExplicitAny: routeEvents is a private server-loop method
  (server as any).routeEvents(server.sim.drainEvents());
}

describe('set_body_skin over the live server', () => {
  it('refuses a non-staff level 1 character and the toast reaches that client', () => {
    const server = new GameServer();
    const fc = fakeWs();
    const session = joinServer(server, fc, 41, 'Plainfolk');
    send(server, session, 'heavenly_host');
    routeSimEvents(server);
    expect(server.sim.entities.get(session.pid)?.bodySkinId).toBeNull();
    expect(deliveredEvents(fc).some((e) => e.type === 'error' && e.text === MSG_LEVEL)).toBe(true);
    broadcast(server);
    expect(lastSnap(fc.sent).self.bs).toBeUndefined();
  });

  it('the handshake-resolved staff identity swaps live, rides `bs` to self AND a peer, and null clears', () => {
    const server = new GameServer();
    const fc = fakeWs();
    const fcPeer = fakeWs();
    const session = joinServer(server, fc, 42, 'Wardrobe', 'warrior', { isAdmin: true });
    const peer = joinServer(server, fcPeer, 43, 'Onlooker');
    send(server, session, 'heavenly_host');
    expect(server.sim.entities.get(session.pid)?.bodySkinId).toBe('heavenly_host');
    // The entity wire cache serializes identity once per tick, so step the sim
    // (the live loop's own tick-then-broadcast order) before each snapshot.
    server.sim.tick();
    broadcast(server);
    // Self record: identity fields rebuild every self snapshot.
    expect(lastSnap(fc.sent).self.bs).toBe('heavenly_host');
    // The peer's interest view carries the same identity field, and the peer's
    // ClientWorld mirror decodes it onto the entity the renderer live-swaps on.
    const peerView = lastSnap(fcPeer.sent).ents.find((w: { id: number }) => w.id === session.pid);
    expect(peerView?.bs).toBe('heavenly_host');
    const peerClient = bareClient(peer.pid);
    // biome-ignore lint/suspicious/noExplicitAny: applySnapshot is the private decode entry
    (peerClient as any).applySnapshot(lastSnap(fcPeer.sent));
    expect(peerClient.entities.get(session.pid)?.bodySkinId).toBe('heavenly_host');

    // Clearing: null is always allowed, and the identity field drops off the wire.
    send(server, session, null);
    expect(server.sim.entities.get(session.pid)?.bodySkinId).toBeNull();
    server.sim.tick();
    broadcast(server);
    expect(lastSnap(fc.sent).self.bs).toBeUndefined();
    // biome-ignore lint/suspicious/noExplicitAny: applySnapshot is the private decode entry
    (peerClient as any).applySnapshot(lastSnap(fcPeer.sent));
    expect(peerClient.entities.get(session.pid)?.bodySkinId).toBeNull();
  });

  it('an account entitlement flows into the dispatch context (deny reason moves off unowned)', () => {
    const server = new GameServer();
    const fc = fakeWs();
    const session = joinServer(server, fc, 44, 'Collector');
    // Without the grant the premium shelf refuses on ownership...
    send(server, session, 'famous_heroes');
    routeSimEvents(server);
    expect(deliveredEvents(fc).some((e) => e.type === 'error' && e.text === MSG_UNOWNED)).toBe(
      true,
    );
    // ...with it, the refusal moves to the art gap (nothing is sold with a
    // body yet), which proves bodySkinEntitlementsFor reached authorizeBodySkin.
    fc.sent.length = 0;
    grantBodySkinEntitlement('skin.famous_heroes', 'Collector');
    send(server, session, 'famous_heroes');
    routeSimEvents(server);
    expect(deliveredEvents(fc).some((e) => e.type === 'error' && e.text === MSG_NO_ART)).toBe(true);
    expect(server.sim.entities.get(session.pid)?.bodySkinId).toBeNull();
  });

  it('drops malformed payloads silently (never a crash, never a write)', () => {
    const server = new GameServer();
    const fc = fakeWs();
    const session = joinServer(server, fc, 45, 'Fuzzer', 'warrior', { isAdmin: true });
    for (const bad of [123, true, {}, [], '', 'x'.repeat(65)]) {
      send(server, session, bad);
    }
    routeSimEvents(server);
    expect(server.sim.entities.get(session.pid)?.bodySkinId).toBeNull();
    expect(deliveredEvents(fc).filter((e) => e.type === 'error')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The online client: optimism runs the SAME pure gate over the server-published
// verdict, and the wire command goes out regardless (the server decides).
// ---------------------------------------------------------------------------

describe('ClientWorld.setBodySkin (optimistic nudge + send)', () => {
  function riggedClient() {
    const fc = fakeWs();
    const client = bareClient(9, { ws: fc.ws });
    client.entities.set(9, {
      id: 9,
      kind: 'player',
      templateId: 'warrior',
      level: 5,
      bodySkinId: null,
      pos: { x: 0, y: 0, z: 0 },
      prevPos: { x: 0, y: 0, z: 0 },
      facing: 0,
      prevFacing: 0,
      dead: false,
      // biome-ignore lint/suspicious/noExplicitAny: minimal entity stub; only the fields the gate and decode touch
    } as any);
    return { fc, client };
  }

  it('a pick the verdict refuses falls back to base locally but still asks the server', () => {
    const old = (globalThis as { WebSocket?: unknown }).WebSocket;
    (globalThis as { WebSocket?: unknown }).WebSocket = { OPEN: 1 };
    try {
      const { fc, client } = riggedClient();
      client.setBodySkin('heavenly_host');
      expect(client.entities.get(9)?.bodySkinId).toBeNull();
      expect(fc.sent).toEqual([{ t: 'cmd', cmd: 'set_body_skin', skinId: 'heavenly_host' }]);
    } finally {
      (globalThis as { WebSocket?: unknown }).WebSocket = old;
    }
  });

  it('an unlocked verdict from the self snapshot makes the optimistic swap land', () => {
    const old = (globalThis as { WebSocket?: unknown }).WebSocket;
    (globalThis as { WebSocket?: unknown }).WebSocket = { OPEN: 1 };
    try {
      const fc = fakeWs();
      const client = bareClient(9, { ws: fc.ws });
      // The server's published verdict (wire `bodySkin`) on a minimal FULL self
      // record (identity present, so the decoder mints the entity itself), as
      // applySnapshot mirrors it: unlocked collapses the grant level to the gate.
      // biome-ignore lint/suspicious/noExplicitAny: applySnapshot is the private decode entry
      (client as any).applySnapshot({
        t: 'snap',
        ents: [],
        self: {
          id: 9,
          k: 'player',
          tid: 'warrior',
          nm: 'Rigged',
          lv: 5,
          x: 0,
          y: 0,
          z: 0,
          f: 0,
          hp: 100,
          mhp: 100,
          bodySkin: { unlocked: true, dev: false, ents: [] },
        },
      });
      expect(client.bodySkinGrants()).toEqual({
        level: UNLOCKED_SKIN_LEVEL,
        entitlements: [],
        dev: false,
      });
      client.setBodySkin('heavenly_host');
      expect(client.entities.get(9)?.bodySkinId).toBe('heavenly_host');
      expect(fc.sent.at(-1)).toEqual({ t: 'cmd', cmd: 'set_body_skin', skinId: 'heavenly_host' });
      client.setBodySkin(null);
      expect(client.entities.get(9)?.bodySkinId).toBeNull();
      expect(fc.sent.at(-1)).toEqual({ t: 'cmd', cmd: 'set_body_skin', skinId: null });
    } finally {
      (globalThis as { WebSocket?: unknown }).WebSocket = old;
    }
  });
});
