// The entry grace window: world entry is the heaviest client phase (renderer
// prewarm can block the browser main thread for tens of seconds), and a blocked
// renderer stops draining its WebSocket receive pipe — once it and the TCP
// window fill, the server's pings sit undelivered behind snapshot bytes and the
// browser's automatic pong never happens. Pong silence inside the window after a
// join/resume therefore reads "busy loading", not "black-holed": the sweep
// re-arms instead of terminating, and the first post-grace sweep judges
// normally. See server/keepalive_sweep.ts (WS_ENTRY_GRACE_MS) and the sweep in
// server/game.ts (pingLiveSessions).
import { describe, expect, it, vi } from 'vitest';

vi.mock('../server/db', () => ({
  loadAccountFlair: vi.fn(async () => ({ ai: false, streamer: false, links: {} })),
  walletForAccount: vi.fn(async () => null),
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  saveCharacterState: vi.fn(async () => {}),
  saveCharacterAndMarketState: vi.fn(async () => {}),
  openPlaySession: vi.fn(async () => 1),
  touchCharacterLogin: vi.fn(async () => {}),
  closePlaySession: vi.fn(async () => {}),
  insertChatLogs: vi.fn(async () => {}),
  markAccountQuestComplete: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  grantAccountMechChroma: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  revokeAccountMechChroma: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  acquireCharacterLease: vi.fn(async () => true),
  releaseCharacterLease: vi.fn(async () => {}),
  heartbeatCharacterLeases: vi.fn(async () => {}),
  releaseAllCharacterLeases: vi.fn(async () => {}),
}));

import { type ClientSession, GameServer } from '../server/game';
import { WS_ENTRY_GRACE_MS, inEntryGrace } from '../server/keepalive_sweep';

function fakeWs() {
  const ws: any = {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    ping: vi.fn(),
    terminate: vi.fn(() => {
      ws.readyState = 3;
    }),
  };
  return ws;
}

function expectJoined(result: ClientSession | { error: string }): ClientSession {
  if ('error' in result) throw new Error(result.error);
  return result;
}

describe('keepalive entry grace (heavy world entry must not read as a dead socket)', () => {
  it('a fresh join is stamped with the entry grace window', () => {
    const server = new GameServer();
    const session = expectJoined(server.join(fakeWs(), 21, 201, 'Fresh', 'warrior', null));
    const now = Date.now();
    expect(inEntryGrace(now, session.keepaliveGraceUntil)).toBe(true);
    // stamped from "now", so it ends within one full window
    expect(session.keepaliveGraceUntil - now).toBeLessThanOrEqual(WS_ENTRY_GRACE_MS);
    expect(session.keepaliveGraceUntil - now).toBeGreaterThan(WS_ENTRY_GRACE_MS - 60_000);
  });

  it('pong silence during the entry window re-arms instead of terminating; the first post-grace sweep still reaps', () => {
    const server = new GameServer();
    const ws = fakeWs();
    const session = expectJoined(server.join(ws, 22, 202, 'Loading', 'warrior', null));

    // Sweep 1: ping goes out, pong outstanding.
    server.pingLiveSessions();
    expect(ws.ping).toHaveBeenCalledTimes(1);
    expect(session.awaitingPong).toBe(true);

    // Sweeps 2..n while the client's main thread is pegged by prewarm: the pong
    // never arrives, but the session is inside its entry window — re-arm, keep
    // pinging (NAT/proxy idle timers stay warm), terminate nobody.
    for (let sweep = 2; sweep <= 4; sweep++) {
      server.pingLiveSessions();
      expect(ws.terminate).not.toHaveBeenCalled();
      expect(session.linkdead).toBe(false);
      expect(ws.ping).toHaveBeenCalledTimes(sweep);
      expect(session.awaitingPong).toBe(true);
    }

    // Grace over, still no pong: the very next on-time sweep terminates into
    // the linkdead grace like any black-holed socket.
    session.keepaliveGraceUntil = Date.now() - 1;
    server.pingLiveSessions();
    expect(ws.terminate).toHaveBeenCalledTimes(1);
    expect(session.linkdead).toBe(true);
    expect(session.left).toBe(false);
  });

  it('a resume re-arms the entry grace window on the new socket', () => {
    const server = new GameServer();
    const ws1 = fakeWs();
    const session = expectJoined(server.join(ws1, 23, 203, 'Rejoiner', 'warrior', null));
    // Entry finished long ago; the session then dropped.
    session.keepaliveGraceUntil = 0;
    ws1.readyState = 3;
    server.socketClosed(session, ws1);
    expect(session.linkdead).toBe(true);

    // The reconnect resumes the held session on a fresh socket — and that page
    // load may re-run the same heavy entry phase, so the grace re-arms.
    const ws2 = fakeWs();
    const resumed = expectJoined(server.join(ws2, 23, 203, 'Rejoiner', 'warrior', null));
    expect(resumed).toBe(session);
    expect(session.linkdead).toBe(false);
    expect(inEntryGrace(Date.now(), session.keepaliveGraceUntil)).toBe(true);
  });

  it('a pong inside the window keeps the normal fast-reap contract for a later real black-hole', () => {
    const server = new GameServer();
    const ws = fakeWs();
    const session = expectJoined(server.join(ws, 24, 204, 'Answered', 'warrior', null));

    server.pingLiveSessions();
    session.awaitingPong = false; // the pong handler (ws_auth.ts) cleared it

    // Grace expired; the next missed interval terminates exactly as before the
    // entry window existed.
    session.keepaliveGraceUntil = 0;
    server.pingLiveSessions(); // re-arms (awaitingPong false -> ping again)
    expect(ws.terminate).not.toHaveBeenCalled();
    server.pingLiveSessions(); // still no pong: black-holed
    expect(ws.terminate).toHaveBeenCalledTimes(1);
    expect(session.linkdead).toBe(true);
  });
});
