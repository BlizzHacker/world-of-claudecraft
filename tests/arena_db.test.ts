import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => {
  process.env.DATABASE_URL ??= 'postgres://test/test';
  return { query: vi.fn() };
});

vi.mock('pg', () => ({
  Pool: vi.fn(function Pool() {
    return { query: dbMock.query };
  }),
}));

import { topArenaRatings } from '../server/db';
import { REALM } from '../server/realm';

beforeEach(() => {
  dbMock.query.mockReset();
});

describe('arena leaderboard', () => {
  it('scopes the ladder to the current realm', async () => {
    dbMock.query.mockResolvedValueOnce({ rows: [] });

    await topArenaRatings();

    const [sql, params] = dbMock.query.mock.calls[0];
    // The ladder reads from the shared `characters` table; without a realm
    // predicate it would leak rankings from every other realm's process.
    expect(sql).toContain('WHERE realm = $1');
    expect(params[0]).toBe(REALM);
  });

  it('clamps the limit and binds it after the realm parameter', async () => {
    dbMock.query.mockResolvedValueOnce({ rows: [] });

    await topArenaRatings(999);

    const [sql, params] = dbMock.query.mock.calls[0];
    expect(sql).toContain('LIMIT $2');
    expect(params).toEqual([REALM, 100]);
  });

  it('coerces numeric rating/record fields from JSONB strings', async () => {
    dbMock.query.mockResolvedValueOnce({
      rows: [{ name: 'Thrall', class: 'shaman', level: 60, rating: '1832', wins: '12', losses: '3' }],
    });

    await expect(topArenaRatings(5)).resolves.toEqual([
      { name: 'Thrall', class: 'shaman', level: 60, rating: 1832, wins: 12, losses: 3 },
    ]);
  });
});
