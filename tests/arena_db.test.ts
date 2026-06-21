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

  it('uses legacy-compatible 1v1 state fields by default', async () => {
    dbMock.query.mockResolvedValueOnce({ rows: [] });

    await topArenaRatings();

    const [sql] = dbMock.query.mock.calls[0];
    expect(sql).toContain("state->>'arena1v1Rating'");
    expect(sql).toContain("state->>'arenaRating'");
    expect(sql).toContain("state->>'arena1v1Wins'");
    expect(sql).toContain("state->>'arenaWins'");
    expect(sql).not.toContain("state->>'arena2v2Rating'");
  });

  it('uses independent 2v2 state fields when requested', async () => {
    dbMock.query.mockResolvedValueOnce({ rows: [] });

    await topArenaRatings(20, '2v2');

    const [sql] = dbMock.query.mock.calls[0];
    expect(sql).toContain("state->>'arena2v2Rating'");
    expect(sql).toContain("state->>'arena2v2Wins'");
    expect(sql).toContain("state->>'arena2v2Losses'");
    expect(sql).not.toContain("state->>'arena1v1Rating'");
    expect(sql).not.toContain("state->>'arenaRating'");
  });
});
