import { describe, expect, it, vi } from 'vitest';

vi.mock('../server/db', () => ({
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  saveCharacterState: vi.fn(async () => {}),
  openPlaySession: vi.fn(async () => 1),
  closePlaySession: vi.fn(async () => {}),
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
});
