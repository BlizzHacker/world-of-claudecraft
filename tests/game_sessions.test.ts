import { describe, expect, it, vi } from 'vitest';

const openPlaySession = vi.fn(async () => 1);
const closePlaySession = vi.fn(async () => {});

vi.mock('../server/db', () => ({
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  saveCharacterState: vi.fn(async () => {}),
  openPlaySession: (...args: unknown[]) => openPlaySession(...(args as [])),
  closePlaySession: (...args: unknown[]) => closePlaySession(...(args as [])),
  insertChatLogs: vi.fn(async () => {}),
}));

import { GameServer, type ClientSession } from '../server/game';

function fakeWs() {
  return {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
  } as any;
}

function expectJoined(result: ClientSession | { error: string }): ClientSession {
  if ('error' in result) throw new Error(result.error);
  return result;
}

describe('GameServer sessions', () => {
  it('keeps the character-id session index coherent across join, duplicate join, leave, and rejoin', async () => {
    const server = new GameServer();
    const first = expectJoined(server.join(fakeWs(), 11, 101, 'Indexa', 'warrior', null));
    const second = expectJoined(server.join(fakeWs(), 12, 102, 'Indexb', 'warrior', null));

    expect((server as any).sessionByCharacterId(101)).toBe(first);
    expect((server as any).sessionByCharacterId(102)).toBe(second);
    expect(server.join(fakeWs(), 13, 101, 'Indexa', 'warrior', null)).toEqual({
      error: 'character already in world',
    });

    await server.leave(first, 'test');

    expect((server as any).sessionByCharacterId(101)).toBeNull();
    expect((server as any).sessionByCharacterId(102)).toBe(second);

    const rejoined = expectJoined(server.join(fakeWs(), 13, 101, 'Indexa', 'warrior', null));
    expect((server as any).sessionByCharacterId(101)).toBe(rejoined);
  });

  it('closes the play session even when the open insert lands after the player has left', async () => {
    openPlaySession.mockReset();
    closePlaySession.mockReset();
    closePlaySession.mockResolvedValue(undefined);

    // Defer the openPlaySession insert so the player can disconnect first.
    let resolveOpen!: (id: number) => void;
    openPlaySession.mockImplementationOnce(
      () => new Promise<number>((resolve) => { resolveOpen = resolve; }),
    );

    const server = new GameServer();
    const session = expectJoined(server.join(fakeWs(), 21, 201, 'Racer', 'warrior', null));
    expect(session.dbSessionId).toBeNull();

    // Player disconnects before the insert resolves: leave() sees a null id.
    await server.leave(session, 'test');
    expect(closePlaySession).not.toHaveBeenCalled();

    // The insert finally lands; the late callback must close the orphaned row.
    resolveOpen(99);
    await Promise.resolve();
    await Promise.resolve();
    expect(closePlaySession).toHaveBeenCalledWith(99);
  });

  it('allows two ONLINE characters per account, and lets the account back in once one leaves', async () => {
    const server = new GameServer();
    const a = expectJoined(server.join(fakeWs(), 20, 201, 'Aone', 'warrior', null));
    const a2 = expectJoined(server.join(fakeWs(), 20, 202, 'Atwo', 'mage', null));

    expect((server as any).sessionByCharacterId(202)).toBe(a2);

    // same account, a third character is rejected while two are online
    expect(server.join(fakeWs(), 20, 204, 'Athree', 'rogue', null)).toEqual({
      error: 'too many characters on this account are already in the world',
    });

    // a different account is unaffected
    const b = expectJoined(server.join(fakeWs(), 21, 203, 'Bone', 'priest', null));
    expect((server as any).sessionByCharacterId(203)).toBe(b);

    // once one of the account's online characters leaves, another of its characters may join
    await server.leave(a, 'test');
    const a3 = expectJoined(server.join(fakeWs(), 20, 204, 'Athree', 'rogue', null));
    expect((server as any).sessionByCharacterId(204)).toBe(a3);
  });

  it('exempts GM characters from the per-account session cap (for supervision)', () => {
    const server = new GameServer();
    expectJoined(server.join(fakeWs(), 30, 301, 'Gmaa', 'warrior', null));
    expectJoined(server.join(fakeWs(), 30, 302, 'Gmbb', 'warrior', null));
    // a third character on the same account joins because it is flagged GM
    expectJoined(server.join(fakeWs(), 30, 303, 'Gmcc', 'warrior', null, true));
    expect((server as any).sessionByCharacterId(303)).not.toBeNull();
  });
});
