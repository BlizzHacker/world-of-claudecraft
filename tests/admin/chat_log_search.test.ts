// Pure request shaping for the admin Chat Logs page
// (src/admin/chat_log_search.ts): filters and the keyset cursor to the
// /admin/api/chat-logs query string the server's chatLogQuery parses.

import { describe, expect, it } from 'vitest';
import { CHAT_LOG_PAGE_LIMIT, chatLogsQueryString } from '../../src/admin/chat_log_search';

const noFilters = { characterId: '', channel: '', search: '' };

describe('chatLogsQueryString', () => {
  it('sends only the page limit when every filter is blank', () => {
    expect(chatLogsQueryString(noFilters, null)).toBe(`limit=${CHAT_LOG_PAGE_LIMIT}`);
  });

  it('includes trimmed filters and drops a malformed character id', () => {
    const qs = chatLogsQueryString(
      { characterId: ' 42 ', channel: ' general ', search: ' gold seller ' },
      null,
    );
    const params = new URLSearchParams(qs);
    expect(params.get('characterId')).toBe('42');
    expect(params.get('channel')).toBe('general');
    expect(params.get('search')).toBe('gold seller');

    const bad = new URLSearchParams(
      chatLogsQueryString({ ...noFilters, characterId: 'abc' }, null),
    );
    expect(bad.get('characterId')).toBeNull();
    const negative = new URLSearchParams(
      chatLogsQueryString({ ...noFilters, characterId: '-3' }, null),
    );
    expect(negative.get('characterId')).toBeNull();
  });

  it('carries the keyset cursor as beforeCreatedAt + beforeId', () => {
    const params = new URLSearchParams(
      chatLogsQueryString(noFilters, { createdAt: '2026-08-22T01:02:03.000Z', id: 977 }),
    );
    expect(params.get('beforeCreatedAt')).toBe('2026-08-22T01:02:03.000Z');
    expect(params.get('beforeId')).toBe('977');
  });
});
