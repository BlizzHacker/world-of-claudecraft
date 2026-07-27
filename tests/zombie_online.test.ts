import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/db', () => ({
  loadAccountFlair: vi.fn(async () => ({ ai: false, streamer: false, links: {} })),
  saveCharacterAndMarketState: vi.fn(async () => {}),
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

import { type ClientSession, GameServer } from '../server/game';

function fakeWs() {
  const sent: any[] = [];
  return { sent, ws: { readyState: 1, send: (payload: string) => sent.push(JSON.parse(payload)) } };
}

function join(
  server: GameServer,
  ws: ReturnType<typeof fakeWs>,
  id: number,
  name: string,
): ClientSession {
  const session = server.join(ws.ws as any, id, id, name, 'warrior', null);
  if ('error' in session) throw new Error(session.error);
  session.blockListLoaded = true;
  return session;
}

function send(server: GameServer, session: ClientSession, payload: Record<string, unknown>): void {
  server.handleMessage(session, JSON.stringify({ t: 'cmd', ...payload }));
}

function step(server: GameServer, count: number): void {
  for (let i = 0; i < count; i += 1) {
    server.sim.tick();
    (server as any).stepMinigameSessions();
  }
}

describe('online zombie defense preview', () => {
  beforeEach(() => vi.stubEnv('ALLOW_MINIGAME_PREVIEW', '1'));
  afterEach(() => vi.unstubAllEnvs());

  it('runs the four-player lifecycle through the server roster and snapshot wire', () => {
    const server = new GameServer();
    const ownerWs = fakeWs();
    const memberWs = fakeWs();
    const owner = join(server, ownerWs, 1, 'Zowner');
    const member = join(server, memberWs, 2, 'Zmember');
    server.sim.partyInvite(member.pid, owner.pid);
    server.sim.partyAccept(member.pid);

    send(server, owner, { cmd: 'mg_create', kind: 'zombie_defense', maxPlayers: 4 });
    const sessions = (server as any).minigameSessions as Map<number, any>;
    expect(sessions.size).toBe(1);
    const id = [...sessions.keys()][0];
    send(server, owner, { cmd: 'mg_invite', targetPlayerId: member.pid });
    expect(
      memberWs.sent.some(
        (message) =>
          message.t === 'events' &&
          message.list.some(
            (event: any) => event.type === 'minigameInvite' && event.sessionId === id,
          ),
      ),
    ).toBe(true);
    send(server, member, { cmd: 'mg_join', sessionId: id });
    send(server, owner, { cmd: 'mg_ready', ready: true });
    send(server, member, { cmd: 'mg_ready', ready: true });
    step(server, 61);
    expect(sessions.get(id).phase).toBe('active');

    send(server, owner, { cmd: 'mg_zombie_start' });
    send(server, owner, { cmd: 'mg_zombie_build', kind: 'arrow', x: -3, z: 1 });
    const zombie = (server as any).zombieDefenseSessions.get(id);
    expect(zombie.state.status).toBe('active');
    expect(zombie.state.towers).toHaveLength(1);

    const ownerSnap = JSON.parse(
      (server as any).selfWireJson(
        owner,
        server.sim.entities.get(owner.pid)!,
        server.sim.meta(owner.pid)!,
        owner,
      ),
    );
    expect(ownerSnap.mgz.sessionId).toBe(id);
    expect(ownerSnap.mgz.state.route).toHaveLength(13);
    expect(ownerSnap.mgz.state.towers[0].kind).toBe('arrow');
  });

  it('rejects malformed or non-roster build attempts without mutating the board', () => {
    const server = new GameServer();
    const ownerWs = fakeWs();
    const outsiderWs = fakeWs();
    const owner = join(server, ownerWs, 10, 'Zownerx');
    const outsider = join(server, outsiderWs, 11, 'Zoutside');
    send(server, owner, { cmd: 'mg_create', kind: 'zombie_defense', maxPlayers: 4 });
    const id = [...((server as any).minigameSessions as Map<number, any>).keys()][0];
    send(server, owner, { cmd: 'mg_ready', ready: true });
    step(server, 61);
    send(server, owner, { cmd: 'mg_zombie_start' });
    const zombie = (server as any).zombieDefenseSessions.get(id);
    const before = zombie.state.towers.length;
    send(server, outsider, { cmd: 'mg_zombie_build', kind: 'cannon', x: 0, z: 0 });
    send(server, owner, { cmd: 'mg_zombie_build', kind: 'cheat', x: 0, z: 0 });
    send(server, owner, { cmd: 'mg_zombie_build', kind: 'cannon', x: 999, z: 0 });
    expect(zombie.state.towers).toHaveLength(before);
  });
});
