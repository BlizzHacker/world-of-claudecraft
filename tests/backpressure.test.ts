import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the db layer so no Postgres is needed; the send/backpressure path is
// under test, mirroring snapshots.test.ts.
vi.mock('../server/db', () => ({
  loadAccountFlair: vi.fn(async () => ({ ai: false, streamer: false, links: {} })),
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  saveCharacterState: vi.fn(async () => {}),
  saveCharacterAndMarketState: vi.fn(async () => {}),
  openPlaySession: vi.fn(async () => 1),
  touchCharacterLogin: vi.fn(async () => {}),
  closePlaySession: vi.fn(async () => {}),
  insertChatLogs: vi.fn(async () => {}),
  walletForAccount: vi.fn(async () => null),
  markAccountQuestComplete: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  grantAccountMechChroma: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
}));

import { GameServer } from '../server/game';
import {
  WS_BACKPRESSURE_LIMIT_BYTES,
  WS_ENTRY_BACKPRESSURE_LIMIT_BYTES,
} from '../server/ws_backpressure';

// A fake socket whose unflushed buffer size and lifecycle we control. send()
// records frames; terminate() flips readyState and fires the 'close' handler
// the real WebSocketServer wires to game.socketClosed().
function fakeWs(bufferedAmount: number) {
  const sent: string[] = [];
  const ws: any = {
    readyState: 1,
    bufferedAmount,
    sent,
    terminated: false,
    send: (payload: string) => sent.push(payload),
    terminate() {
      ws.terminated = true;
      ws.readyState = 3; // CLOSED
    },
  };
  return ws;
}

function join(server: GameServer, ws: any, id: number, name: string) {
  const session = server.join(ws, id, id, name, 'warrior', null);
  if ('error' in session) throw new Error(session.error);
  session.blockListLoaded = true;
  return session;
}

// A fresh join sits inside the entry grace window (WS_ENTRY_GRACE_MS), where the
// raised entry backpressure limit applies; the steady-state tests below pin the
// POST-ENTRY contract, so they expire the grace explicitly.
function joinPastEntryGrace(server: GameServer, ws: any, id: number, name: string) {
  const session = join(server, ws, id, name);
  session.keepaliveGraceUntil = 0;
  return session;
}

describe('WebSocket send backpressure', () => {
  let server: GameServer;
  beforeEach(() => {
    server = new GameServer();
  });

  it('terminates a saturated session into the linkdead grace, not a full logout', () => {
    const ws = fakeWs(WS_BACKPRESSURE_LIMIT_BYTES + 1);
    const session = joinPastEntryGrace(server, ws, 1, 'Stuck');
    // join-time frames (hello, social snapshot) went out under the ENTRY grace
    // limit; from here the session is post-entry, so the standard limit rules.
    const sentAtJoin = ws.sent.length;

    (server as any).broadcastSnapshots();

    expect(ws.terminated).toBe(true);
    // a stuck reader is a network-quality problem: the character is held
    // in-world (linkdead) so the client can reconnect and resume
    expect(session.left).toBe(false);
    expect(session.linkdead).toBe(true);
    expect((server as any).clients.has(session.pid)).toBe(true);
    // nothing was pushed onto the already-saturated buffer by the broadcast
    expect(ws.sent.length).toBe(sentAtJoin);
  });

  it('keeps serving a healthy session that drains its socket', () => {
    const ws = fakeWs(0);
    const session = join(server, ws, 2, 'Healthy');

    (server as any).broadcastSnapshots();

    expect(ws.terminated).toBe(false);
    expect(session.left).toBe(false);
    expect((server as any).clients.has(session.pid)).toBe(true);
    expect(ws.sent.length).toBeGreaterThan(0);
  });

  it('does not starve other players when one session is stuck', () => {
    const stuck = fakeWs(WS_BACKPRESSURE_LIMIT_BYTES + 1);
    const healthy = fakeWs(0);
    joinPastEntryGrace(server, stuck, 3, 'Stuck');
    const live = join(server, healthy, 4, 'Healthy');

    (server as any).broadcastSnapshots();

    expect(stuck.terminated).toBe(true);
    expect(healthy.terminated).toBe(false);
    expect((server as any).clients.has(live.pid)).toBe(true);
    expect(healthy.sent.length).toBeGreaterThan(0);
  });

  // ── Entry grace (world entry is the heaviest client phase) ────────────────
  // A freshly joined client whose main thread is blocked by renderer prewarm
  // stops draining its socket for tens of seconds while 20 Hz snapshots pile
  // up. Inside the entry window that backlog is tolerated up to the raised
  // limit instead of reading as a dead peer.

  it('a session inside its entry grace window survives a backlog past the standard limit', () => {
    const ws = fakeWs(WS_BACKPRESSURE_LIMIT_BYTES + 1);
    const session = join(server, ws, 5, 'Loading'); // fresh join: in grace

    (server as any).broadcastSnapshots();

    expect(ws.terminated).toBe(false);
    expect(session.linkdead).toBe(false);
    // sends continue: the client processes the backlog once prewarm finishes
    expect(ws.sent.length).toBeGreaterThan(0);
  });

  it('the entry grace still terminates a backlog past the raised entry limit', () => {
    const ws = fakeWs(WS_ENTRY_BACKPRESSURE_LIMIT_BYTES + 1);
    const session = join(server, ws, 6, 'Runaway'); // fresh join: in grace

    (server as any).broadcastSnapshots();

    expect(ws.terminated).toBe(true);
    expect(session.linkdead).toBe(true);
    expect(ws.sent.length).toBe(0);
  });
});
