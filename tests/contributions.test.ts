import { describe, expect, it } from 'vitest';
import { normalizeUpstreamPulls } from '../server/contributions';

describe('upstream contribution feed', () => {
  it('keeps open and merged PRs while excluding closed unmerged work', () => {
    const entries = normalizeUpstreamPulls([
      {
        number: 8,
        title: 'merged',
        html_url: 'https://github.com/levy-street/world-of-claudecraft/pull/8',
        state: 'closed',
        merged_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-02T00:00:00Z',
        user: { login: 'alice' },
        labels: [{ name: 'safe' }],
      },
      {
        number: 9,
        title: 'open',
        html_url: 'https://github.com/levy-street/world-of-claudecraft/pull/9',
        state: 'open',
        merged_at: null,
        updated_at: '2026-07-03T00:00:00Z',
        user: { login: 'bob' },
        labels: [],
      },
      {
        number: 10,
        title: 'closed',
        html_url: 'https://github.com/levy-street/world-of-claudecraft/pull/10',
        state: 'closed',
        merged_at: null,
      },
    ]);
    expect(entries.map((entry) => [entry.number, entry.state])).toEqual([
      [9, 'open'],
      [8, 'merged'],
    ]);
    expect(entries[1].labels).toEqual(['safe']);
  });
});
