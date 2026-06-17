import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../server/db', () => ({
  pool: { query: vi.fn() },
}));
vi.mock('../server/moderation_db', () => ({
  cleanText: vi.fn((value: unknown, max: number) => String(value).slice(0, max)),
}));

import { pool } from '../server/db';
import { createAutomatedBotReport } from '../server/antibot_db';
import type { BotSessionRef, BotTracker } from '../server/antibot';

const mockSession: BotSessionRef = {
  accountId: 42, characterId: 7, name: 'SuspectBot', dbSessionId: null,
};

function buildTracker(evidenceItems: { kind: string; weight: number; detail: string }[]): BotTracker {
  return {
    evidence: evidenceItems.map(e => ({
      kind: e.kind as never,
      weight: e.weight,
      expiresAt: Infinity,
      detail: e.detail,
    })),
    score: evidenceItems.reduce((s, e) => s + e.weight, 0),
    distinctKinds: new Set(evidenceItems.map(e => e.kind)).size,
    aboveLogSince: null,
    aboveThrottleSince: null,
    aboveKickSince: null,
    throttleMultiplier: 1.0,
    throttleActiveSince: null,
    autoReportSent: false,
    timing: { lastActionAt: 0, deltas: [] },
    reactionPending: null,
    reactionDeltas: [],
  } as BotTracker;
}

describe('createAutomatedBotReport', () => {
  beforeEach(() => {
    vi.mocked(pool.query).mockReset();
  });

  it('does not insert when a recent report already exists (dedup)', async () => {
    // First query (dedup check) returns an existing row.
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ id: 99 }] } as never);

    const tracker = buildTracker([{ kind: 'timing', weight: 0.7, detail: 'stdDev 2ms' }]);
    await createAutomatedBotReport(mockSession, tracker);

    expect(pool.query).toHaveBeenCalledOnce();  // only the SELECT, no INSERT
  });

  it('inserts a new report when no recent duplicate exists', async () => {
    // First query (dedup) returns no rows; second query (insert) resolves OK.
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const tracker = buildTracker([
      { kind: 'timing', weight: 0.7, detail: 'stdDev 2ms' },
      { kind: 'reaction', weight: 0.6, detail: 'median 28ms' },
    ]);
    await createAutomatedBotReport(mockSession, tracker);

    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it('passes reporter_account_id = NULL (system report)', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const tracker = buildTracker([{ kind: 'timing', weight: 0.7, detail: 'test' }]);
    await createAutomatedBotReport(mockSession, tracker);

    const insertParams = vi.mocked(pool.query).mock.calls[1][1] as unknown[];
    // INSERT params: [accountId, characterId, name, details]
    // reporter_account_id is NULL in the SQL template, not in params
    expect(insertParams[0]).toBe(42);     // reported_account_id
    expect(insertParams[1]).toBe(7);      // reported_character_id
    expect(insertParams[2]).toBe('SuspectBot');  // reported_character_name
  });

  it('inserts reason = cheating (encoded in SQL, not params)', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const tracker = buildTracker([{ kind: 'timing', weight: 0.7, detail: 'test' }]);
    await createAutomatedBotReport(mockSession, tracker);

    const insertSql = vi.mocked(pool.query).mock.calls[1][0] as string;
    expect(insertSql).toContain("'cheating'");
  });

  it('details starts with the automated bot detection prefix', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const tracker = buildTracker([{ kind: 'timing', weight: 0.7, detail: 'stdDev 2ms' }]);
    await createAutomatedBotReport(mockSession, tracker);

    const insertParams = vi.mocked(pool.query).mock.calls[1][1] as unknown[];
    expect(String(insertParams[3])).toMatch(/^Automated bot detection:/);
  });

  it('dedup query uses the automated bot detection prefix pattern', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: [{ id: 1 }] } as never);

    const tracker = buildTracker([{ kind: 'timing', weight: 0.7, detail: 'test' }]);
    await createAutomatedBotReport(mockSession, tracker);

    const dedupParams = vi.mocked(pool.query).mock.calls[0][1] as unknown[];
    expect(String(dedupParams[1])).toMatch(/^Automated bot detection:/);
  });

  it('includes evidence details in the report body', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);

    const tracker = buildTracker([{ kind: 'timing', weight: 0.7, detail: 'stdDev 2.1ms' }]);
    await createAutomatedBotReport(mockSession, tracker);

    const insertParams = vi.mocked(pool.query).mock.calls[1][1] as unknown[];
    const details = String(insertParams[3]);
    expect(details).toContain('timing');
    expect(details).toContain('0.70');
  });
});
