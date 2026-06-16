import { beforeEach, describe, expect, it, vi } from 'vitest';

// db.ts builds a pg Pool and requires DATABASE_URL at import time; stub both so
// the module loads and every query goes through a spy we can assert against.
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgres://test/test';
});
vi.mock('pg', () => ({
  Pool: function Pool() {
    return { query };
  },
}));

import { deleteCharacter } from '../server/db';
import { REALM } from '../server/realm';

beforeEach(() => {
  query.mockReset();
});

describe('deleteCharacter', () => {
  it('scopes the delete to the current realm so cross-realm characters are safe', async () => {
    query.mockResolvedValueOnce({ rowCount: 1 } as any);

    await deleteCharacter(7, 42);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/realm/i);
    expect(params).toContain(REALM);
    // id + account + realm — the same three predicates getCharacter/renameCharacter use
    expect(params).toEqual(expect.arrayContaining([42, 7, REALM]));
  });

  it('reports whether a row was actually deleted', async () => {
    query.mockResolvedValueOnce({ rowCount: 0 } as any);
    expect(await deleteCharacter(7, 42)).toBe(false);

    query.mockResolvedValueOnce({ rowCount: 1 } as any);
    expect(await deleteCharacter(7, 42)).toBe(true);
  });
});
