import { describe, expect, it, vi } from 'vitest';

// The authoritative lifecycle test is intentionally in-memory; no Postgres is
// needed to exercise the WS command/snapshot boundary.
vi.mock('../server/db', () => ({
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  saveCharacterState: vi.fn(async () => {}),
  openPlaySession: vi.fn(async () => 1),
  touchCharacterLogin: vi.fn(async () => {}),
  closePlaySession: vi.fn(async () => {}),
  insertChatLogs: vi.fn(async () => {}),
  walletForAccount: vi.fn(async () => null),
  markAccountQuestComplete: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  grantAccountMechChroma: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  loadWorldState: vi.fn(async () => null),
  saveWorldState: vi.fn(async () => {}),
}));

import { createMinigameSession } from '../src/sim/minigames';
import { ClientWorld } from '../src/net/online';
import { GameServer } from '../server/game';

function fakeWs(): { sent: any[]; ws: any } {
  const sent: any[] = [];
  return { sent, ws: { readyState: 1, send: (payload: string) => sent.push(JSON.parse(payload)) } };
}

function lastSnap(sent: any[]): any {
  return [...sent].reverse().find((message) => message.t === 'snap') ?? null;
}

function bareClient(pid: number): ClientWorld {
  const client: any = Object.create(ClientWorld.prototype);
  client.cfg = { seed: 20061, playerClass: 'warrior' };
  client.entities = new Map();
  client.playerId = pid;
  client.ownPlayerId = pid;
  client.ownPlayerClass = 'warrior';
  client.spectating = null;
  client.cupInfo = null;
  client.sportRole = null;
  client.moveInput = {};
  client.inventory = [];
  client.vendorBuyback = [];
  client.equipment = {};
  client.accountCosmetics = { completedQuestIds: [], mechChromaIds: [] };
  client.copper = 0;
  client.xp = 0;
  client.known = [];
  client.questLog = new Map();
  client.questsDone = new Set();
  client.pendingQuestCommands = new Map();
  client.partyInfo = null;
  client.selectedDungeonDifficulty = 'normal';
  client.tradeInfo = null;
  client.duelInfo = null;
  client.lastSnapAt = 0;
  client.snapInterval = 50;
  client.serverTickHz = null;
  client.missingSince = new Map();
  client.pendingFacingDelta = 0;
  client.connected = true;
  client.eventQueue = [];
  client.mouselookFacing = null;
  client.lastInputSentAt = 0;
  client.lastInputSig = '';
  client.inputSeq = 0;
  client.pendingInputSeqSentAt = new Map();
  client.ackedInputSeq = 0;
  client.inputEchoSamples = [];
  client.spectateFacingPending = false;
  client.pendingSpectateFacing = null;
  return client;
}

describe('generic minigame lifecycle wire', () => {
  it('ships a server-owned mg snapshot and decodes it online', () => {
    const server = new GameServer();
    const transport = fakeWs();
    const joined = server.join(transport.ws, 11, 11, 'WireTester', 'warrior', null);
    if ('error' in joined) throw new Error(joined.error);
    joined.blockListLoaded = true;

    // Feature flags stay default-off in production. Injecting a session here
    // tests only the transport shape; creation itself is still rejected below.
    const state = createMinigameSession(1, 'racing', 42, joined.pid, 4);
    (server as any).minigameSessions.set(1, state);
    (server as any).broadcastSnapshots();
    const snapshot = lastSnap(transport.sent);
    expect(snapshot.self.mg).toMatchObject({ id: 1, kind: 'racing', phase: 'lobby' });
    expect(snapshot.self.mg.players).toEqual([
      expect.objectContaining({ pid: joined.pid, connected: true, ready: false }),
    ]);

    const client = bareClient(joined.pid);
    (client as any).applySnapshot(snapshot);
    expect(client.minigameSession).toMatchObject({ id: 1, seed: 42, phase: 'lobby' });
  });

  it('keeps default-off lifecycle commands inert and client sends typed tokens', () => {
    const server = new GameServer();
    const transport = fakeWs();
    const joined = server.join(transport.ws, 12, 12, 'OffTester', 'warrior', null);
    if ('error' in joined) throw new Error(joined.error);
    joined.blockListLoaded = true;
    server.handleMessage(joined, JSON.stringify({ t: 'cmd', cmd: 'mg_create', kind: 'racing' }));
    expect((server as any).minigameSessions.size).toBe(0);

    const outbound: any[] = [];
    const client: any = Object.create(ClientWorld.prototype);
    client.connected = true;
    client.spectating = null;
    client.ws = { readyState: 1, send: (payload: string) => outbound.push(JSON.parse(payload)) };
    client.minigameCreate('racing', 4);
    client.minigameJoin(7);
    client.minigameReady(true);
    client.minigameAbort();
    client.minigameClaim();
    expect(outbound.map((message) => message.cmd)).toEqual([
      'mg_create',
      'mg_join',
      'mg_ready',
      'mg_abort',
      'mg_claim',
    ]);
  });

  it('tracks linkdead/reconnect connection state without changing roster ownership', () => {
    const server = new GameServer();
    const transport = fakeWs();
    const joined = server.join(transport.ws, 13, 13, 'ReconnectTester', 'warrior', null);
    if ('error' in joined) throw new Error(joined.error);
    const state = createMinigameSession(2, 'racing', 99, joined.pid, 4);
    (server as any).minigameSessions.set(2, state);

    expect(server.socketClosed(joined, transport.ws)).toBe(true);
    expect((server as any).minigameSessions.get(2).players[0].connected).toBe(false);
    (server as any).resumeSession(joined, transport.ws, 'warrior', {});
    expect((server as any).minigameSessions.get(2).players[0].connected).toBe(true);
    expect((server as any).minigameSessions.get(2).players[0].pid).toBe(joined.pid);
  });
});
