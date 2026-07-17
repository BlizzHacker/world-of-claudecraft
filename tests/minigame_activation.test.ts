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
import { MINIGAME_FEATURES } from '../src/sim/minigames';
import { createHousingLot, placeHousingPiece } from '../src/sim/minigames/housing';

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

describe('activated town minigames', () => {
  beforeEach(() => vi.stubEnv('ALLOW_MINIGAME_PREVIEW', '0'));
  afterEach(() => vi.unstubAllEnvs());

  it('runs RTS and zombie defense online without the preview override', () => {
    expect(MINIGAME_FEATURES.find((feature) => feature.id === 'town_rts')?.enabled).toBe(true);
    expect(MINIGAME_FEATURES.find((feature) => feature.id === 'zombie_defense')?.enabled).toBe(
      true,
    );

    const server = new GameServer();
    const owner = join(server, fakeWs(), 71, 'Rtsowner');
    send(server, owner, { cmd: 'mg_create', kind: 'town_rts', maxPlayers: 4 });
    const sessions = (server as any).minigameSessions as Map<number, any>;
    const rtsId = [...sessions.keys()][0];
    send(server, owner, { cmd: 'mg_ready', ready: true });
    step(server, 61);
    send(server, owner, { cmd: 'mg_rts_build', kind: 'wall', x: 1, z: 1 });
    expect((server as any).arcadeSessions.get(rtsId).rts.structures).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'wall', cell: { x: 1, z: 1 } })]),
    );

    send(server, owner, { cmd: 'mg_abort' });
    send(server, owner, { cmd: 'mg_create', kind: 'zombie_defense', maxPlayers: 4 });
    const zombieId = [...sessions.keys()].at(-1)!;
    send(server, owner, { cmd: 'mg_ready', ready: true });
    step(server, 61);
    send(server, owner, { cmd: 'mg_zombie_start' });
    send(server, owner, { cmd: 'mg_zombie_build', kind: 'arrow', x: -3, z: 1 });
    const zombie = (server as any).zombieDefenseSessions.get(zombieId);
    expect(zombie.state.status).toBe('active');
    expect(zombie.state.towers).toHaveLength(1);
  });

  it('creates racing and four-player brawler sessions without a preview override', () => {
    expect(MINIGAME_FEATURES.find((feature) => feature.id === 'racing')?.enabled).toBe(true);
    expect(MINIGAME_FEATURES.find((feature) => feature.id === 'brawler')?.enabled).toBe(true);
    const server = new GameServer();
    const owner = join(server, fakeWs(), 73, 'Arcadeowner');
    const sessions = (server as any).minigameSessions as Map<number, any>;
    send(server, owner, { cmd: 'mg_create', kind: 'racing', maxPlayers: 4 });
    expect([...sessions.values()][0]?.kind).toBe('racing');
    send(server, owner, { cmd: 'mg_abort' });
    send(server, owner, { cmd: 'mg_create', kind: 'brawler', maxPlayers: 4 });
    expect([...sessions.values()][1]?.kind).toBe('brawler');
  });

  it('recovers a persisted housing lot into a new online session', async () => {
    const db = await import('../server/db');
    const lot = createHousingLot('cryptic', 'eastbrook', 999);
    expect(
      placeHousingPiece(lot, 999, {
        id: 'recovered-floor',
        kind: 'floor',
        cell: { x: 1, z: 1 },
        rotation: 0,
      }),
    ).toBe(true);
    vi.mocked(db.loadWorldState).mockImplementation(async (key: string) =>
      key.includes('housing') ? lot : null,
    );

    const server = new GameServer();
    await server.loadMinigameWorldState();
    const owner = join(server, fakeWs(), 72, 'Homeowner');
    send(server, owner, { cmd: 'mg_create', kind: 'housing', maxPlayers: 4 });
    const sessions = (server as any).minigameSessions as Map<number, any>;
    const id = [...sessions.keys()][0];
    send(server, owner, { cmd: 'mg_ready', ready: true });
    step(server, 61);
    const housing = (server as any).arcadeSessions.get(id).housing;
    expect(housing.pieces).toEqual([
      expect.objectContaining({ id: 'recovered-floor', cell: { x: 1, z: 1 } }),
    ]);
    expect(housing.acl[owner.pid]).toBe('builder');
  });
});
