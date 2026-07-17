import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('online arcade minigame preview', () => {
  beforeEach(() => vi.stubEnv('ALLOW_MINIGAME_PREVIEW', '1'));
  afterEach(() => vi.unstubAllEnvs());

  it('runs a racing lobby, validates input, advances vehicles, and wires mgr', () => {
    const server = new GameServer();
    const ws = fakeWs();
    const owner = join(server, ws, 21, 'Raceowner');
    send(server, owner, { cmd: 'mg_create', kind: 'racing', maxPlayers: 4 });
    const sessions = (server as any).minigameSessions as Map<number, any>;
    const id = [...sessions.keys()][0];
    send(server, owner, { cmd: 'mg_ready', ready: true });
    step(server, 61);
    expect(sessions.get(id).phase).toBe('active');
    const arcade = (server as any).arcadeSessions.get(id);
    const before = arcade.race.vehicles[0].z;
    send(server, owner, { cmd: 'mg_race_input', throttle: 1, steer: 0, drift: false });
    step(server, 3);
    expect(arcade.race.vehicles[0].z).toBeGreaterThan(before);
    send(server, owner, { cmd: 'mg_race_input', throttle: NaN, steer: Infinity });
    expect(Number.isFinite(arcade.race.vehicles[0].z)).toBe(true);
    const snap = JSON.parse(
      (server as any).selfWireJson(
        owner,
        server.sim.entities.get(owner.pid)!,
        server.sim.meta(owner.pid)!,
        owner,
      ),
    );
    expect(snap.mga.kind).toBe('racing');
    expect(snap.mga.race.itemRng).toBeUndefined();
  });

  it('runs brawler and RTS actions through one authoritative adapter', async () => {
    // Housing is no longer an arcade mode (Eastbrook Homes is a premium
    // feature, not a minigame): its mg_create is inert, asserted below.
    const server = new GameServer();
    const ws = fakeWs();
    const owner = join(server, ws, 31, 'Arcadeowner');
    for (const kind of ['brawler', 'town_rts'] as const) {
      send(server, owner, { cmd: 'mg_create', kind, maxPlayers: 4 });
      const sessions = (server as any).minigameSessions as Map<number, any>;
      const id = [...sessions.keys()].at(-1)!;
      send(server, owner, { cmd: 'mg_ready', ready: true });
      step(server, 61);
      if (kind === 'brawler')
        send(server, owner, { cmd: 'mg_brawler_input', move: 1, jump: true, attack: true });
      if (kind === 'town_rts') {
        send(server, owner, { cmd: 'mg_rts_build', kind: 'wall', x: 1, z: 1 });
        send(server, owner, { cmd: 'mg_rts_train', kind: 'guard' });
      }
      const arcade = (server as any).arcadeSessions.get(id);
      expect(arcade.kind).toBe(kind);
      if (kind === 'town_rts')
        expect(arcade.rts.structures.some((structure: any) => structure.kind === 'wall')).toBe(
          true,
        );
      send(server, owner, { cmd: 'mg_abort' });
    }
    // the retired housing arcade mode creates NO session
    const before = ((server as any).minigameSessions as Map<number, any>).size;
    send(server, owner, { cmd: 'mg_create', kind: 'housing', maxPlayers: 4 });
    expect(((server as any).minigameSessions as Map<number, any>).size).toBe(before);
    await Promise.resolve();
    const db = await import('../server/db');
    expect(vi.mocked(db.saveWorldState)).toHaveBeenCalledWith(
      expect.stringMatching(/^minigame:rts:/),
      expect.any(Object),
    );
  });

  it('fills a one-player online practice lobby with server-owned CPU racers', () => {
    const server = new GameServer();
    const ws = fakeWs();
    const owner = join(server, ws, 41, 'Practiceowner');
    send(server, owner, { cmd: 'mg_create', kind: 'racing', maxPlayers: 1 });
    const sessions = (server as any).minigameSessions as Map<number, any>;
    const id = [...sessions.keys()][0];
    const session = sessions.get(id);
    expect(session.maxPlayers).toBe(4);
    expect(session.players).toHaveLength(4);
    expect(session.players.filter((player: any) => player.bot)).toHaveLength(3);
    expect((server as any).arcadeSessions.get(id).botPids).toHaveLength(3);
    send(server, owner, { cmd: 'mg_ready', ready: true });
    step(server, 61);
    expect(sessions.get(id).phase).toBe('active');
  });

  it('persists authoritative placement scores when the server closes a race', () => {
    const server = new GameServer();
    const ws = fakeWs();
    const owner = join(server, ws, 51, 'Scoreowner');
    send(server, owner, { cmd: 'mg_create', kind: 'racing', maxPlayers: 4 });
    const sessions = (server as any).minigameSessions as Map<number, any>;
    const id = [...sessions.keys()][0];
    send(server, owner, { cmd: 'mg_ready', ready: true });
    step(server, 61);
    expect(server.finishMinigame(id, [owner.pid])).toBe(true);
    expect(sessions.get(id).phase).toBe('finished');
    expect(sessions.get(id).players.find((player: any) => player.pid === owner.pid).score).toBe(
      400,
    );
  });
});
