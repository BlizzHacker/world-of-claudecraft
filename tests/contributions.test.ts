import { describe, expect, it } from 'vitest';
import { isPublicContributionUrl, normalizeUpstreamPulls } from '../server/contributions';

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

  it('accepts only canonical public GitHub pull links', () => {
    expect(
      isPublicContributionUrl('https://github.com/levy-street/world-of-claudecraft/pull/8', 8),
    ).toBe(true);
    expect(
      isPublicContributionUrl(
        'https://github.com/levy-street/world-of-claudecraft/pull/8?redirect=https://evil.example',
        8,
      ),
    ).toBe(false);
    expect(
      isPublicContributionUrl('https://github.com.evil.example/levy-street/repo/pull/8', 8),
    ).toBe(false);
    expect(
      isPublicContributionUrl('http://github.com/levy-street/world-of-claudecraft/pull/8', 8),
    ).toBe(false);
    expect(
      isPublicContributionUrl('https://github.com/levy-street/world-of-claudecraft/issues/8', 8),
    ).toBe(false);
  });

  it('drops malformed or unsafe rows before the public feed is rendered', () => {
    const entries = normalizeUpstreamPulls([
      {
        number: 11,
        title: 'safe row',
        html_url: 'https://github.com/levy-street/world-of-claudecraft/pull/11',
        state: 'open',
      },
      {
        number: 12,
        title: 'private host',
        html_url: 'https://git.internal.example/levy-street/world-of-claudecraft/pull/12',
        state: 'open',
      },
      {
        number: 13,
        title: 'mismatched number',
        html_url: 'https://github.com/levy-street/world-of-claudecraft/pull/99',
        state: 'open',
      },
      null as never,
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe('https://github.com/levy-street/world-of-claudecraft/pull/11');
  });
});
