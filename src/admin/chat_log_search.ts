// Pure request shaping for the Chat Logs page (the moderation_actions.ts
// pattern): filters + keyset cursor to the /admin/api/chat-logs query string.
// The server (server/admin.ts chatLogQuery) re-validates everything; this only
// keeps the page's fetch and its "load more" cursor logic unit-testable.

export interface ChatLogFilters {
  characterId: string;
  channel: string;
  search: string;
}

export interface ChatLogCursor {
  createdAt: string;
  id: number;
}

export const CHAT_LOG_PAGE_LIMIT = 50;

/** Query string for one chat-logs page. Blank filters are omitted; a malformed
 *  character id is dropped rather than sent. */
export function chatLogsQueryString(filters: ChatLogFilters, before: ChatLogCursor | null): string {
  const params = new URLSearchParams({ limit: String(CHAT_LOG_PAGE_LIMIT) });
  const characterId = Number(filters.characterId.trim());
  if (Number.isSafeInteger(characterId) && characterId > 0) {
    params.set('characterId', String(characterId));
  }
  const channel = filters.channel.trim();
  if (channel) params.set('channel', channel);
  const search = filters.search.trim();
  if (search) params.set('search', search);
  if (before) {
    params.set('beforeCreatedAt', before.createdAt);
    params.set('beforeId', String(before.id));
  }
  return params.toString();
}
