<script lang="ts">
  import { onMount } from 'svelte';
  import { apiGet } from '../api';
  import {
    type ChatLogCursor,
    type ChatLogFilters,
    chatLogsQueryString,
  } from '../chat_log_search';
  import { fmtDate } from '../format';
  import { t } from '../i18n';
  import { auth } from '../state/auth.svelte';
  import type { ChatLogRow, ChatLogsResponse } from '../types';
  import AccountLink from '../components/AccountLink.svelte';
  import Panel from '../components/Panel.svelte';

  let rows = $state<ChatLogRow[] | null>(null);
  let nextBefore = $state<ChatLogCursor | null>(null);
  let failed = $state(false);
  let loading = $state(false);
  let filters = $state<ChatLogFilters>({ characterId: '', channel: '', search: '' });

  async function fetchPage(before: ChatLogCursor | null): Promise<void> {
    loading = true;
    try {
      const data = await apiGet<ChatLogsResponse>(
        `/admin/api/chat-logs?${chatLogsQueryString(filters, before)}`,
      );
      rows = before ? [...(rows ?? []), ...data.rows] : data.rows;
      nextBefore = data.nextBefore;
      failed = false;
    } catch (err) {
      if (!auth.handleAuthFailure(err)) failed = true;
    } finally {
      loading = false;
    }
  }

  function submitSearch(event: SubmitEvent): void {
    event.preventDefault();
    void fetchPage(null);
  }

  onMount(() => {
    void fetchPage(null);
  });
</script>

<Panel title={t('chatLogs.title')} hint={t('chatLogs.hint')}>
  <form class="chatlog-toolbar" onsubmit={submitSearch}>
    <input
      type="search"
      bind:value={filters.search}
      placeholder={t('chatLogs.searchPlaceholder')}
      aria-label={t('chatLogs.searchPlaceholder')}
      maxlength="128"
    />
    <input
      type="text"
      bind:value={filters.channel}
      placeholder={t('chatLogs.channelPlaceholder')}
      aria-label={t('chatLogs.channelPlaceholder')}
      maxlength="32"
    />
    <input
      type="text"
      inputmode="numeric"
      bind:value={filters.characterId}
      placeholder={t('chatLogs.characterIdPlaceholder')}
      aria-label={t('chatLogs.characterIdPlaceholder')}
      maxlength="12"
    />
    <button type="submit" disabled={loading}>{t('chatLogs.search')}</button>
  </form>

  {#if failed}
    <div class="empty">{t('chatLogs.loadFailed')}</div>
  {:else if rows && rows.length === 0}
    <div class="empty">{t('chatLogs.empty')}</div>
  {:else if rows}
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{t('chatLogs.colWhen')}</th>
            <th>{t('chatLogs.colCharacter')}</th>
            <th>{t('chatLogs.colChannel')}</th>
            <th>{t('chatLogs.colMessage')}</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr>
              <td class="when">{fmtDate(row.createdAt)}</td>
              <td>
                {#if row.accountId !== null}
                  <AccountLink accountId={row.accountId} label={row.characterName} />
                {:else}
                  {row.characterName}
                {/if}
              </td>
              <td class="channel">{row.channel}</td>
              <td class="message">{row.message}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if nextBefore}
      <div class="more">
        <button type="button" disabled={loading} onclick={() => void fetchPage(nextBefore)}>
          {t('chatLogs.loadMore')}
        </button>
      </div>
    {/if}
  {/if}
</Panel>

<style>
  /* Controls take the shared admin look from styles/base.css; only layout here. */
  .chatlog-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .chatlog-toolbar input[type='search'] {
    flex: 1;
    min-width: 180px;
  }

  .when,
  .channel {
    white-space: nowrap;
  }

  .message {
    overflow-wrap: anywhere;
  }

  .more {
    margin-top: 10px;
    text-align: center;
  }
</style>
