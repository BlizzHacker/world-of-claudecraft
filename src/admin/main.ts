import { apiGet, apiLogin, apiPost, clearSession, getAdminName, getToken, ApiError } from './api';
import { barChart, chartPanel } from './charts';
import { escapeHtml, fmtBytes, fmtDuration } from './format';
import {
  renderAccountDetail, renderAccountsTable, renderCharactersTable, renderModerationDetail,
  renderModerationQueue, renderOnlineTable, renderPager,
} from './tables';
import type {
  AccountDetail, AccountRow, Activity, CharacterRow, LivePlayer, ModerationAccountDetail,
  ModerationQueueRow, Overview, Paginated,
} from './types';

const LIVE_REFRESH_MS = 5_000;
const ACTIVITY_REFRESH_MS = 60_000;
const SEARCH_DEBOUNCE_MS = 300;

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el;
};

interface TableState {
  page: number;
  search: string;
  sort: string;
  dir: 'asc' | 'desc';
}

const accountsState: TableState = { page: 1, search: '', sort: 'id', dir: 'desc' };
const charactersState: TableState = { page: 1, search: '', sort: 'level', dir: 'desc' };
let liveTimer: number | null = null;
let activityTimer: number | null = null;
let activePage: 'overview' | 'moderation' = 'overview';
let pendingModerationAction: { endpoint: string; body: unknown; accountId: number; source: 'account' | 'moderation' } | null = null;

// ---------------------------------------------------------------------------
// Auth flow
// ---------------------------------------------------------------------------

function showLogin(message = ''): void {
  if (liveTimer !== null) { clearInterval(liveTimer); liveTimer = null; }
  if (activityTimer !== null) { clearInterval(activityTimer); activityTimer = null; }
  clearSession();
  $('app').classList.remove('authed');
  $('login').style.display = 'flex';
  $('login-error').textContent = message;
}

function handleAuthFailure(err: unknown): boolean {
  if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
    showLogin('session expired — sign in again');
    return true;
  }
  return false;
}

async function showApp(): Promise<void> {
  $('login').style.display = 'none';
  $('app').classList.add('authed');
  $('who-name').textContent = getAdminName();
  await refreshLive();
  await Promise.all([refreshActivity(), refreshModeration(), refreshAccounts(), refreshCharacters()]);
  liveTimer = window.setInterval(() => void refreshLive(), LIVE_REFRESH_MS);
  activityTimer = window.setInterval(() => void refreshActivity(), ACTIVITY_REFRESH_MS);
}

async function refreshModeration(): Promise<void> {
  try {
    const data = await apiGet<{ rows: ModerationQueueRow[] }>('/admin/api/moderation/queue');
    $('moderation').innerHTML = renderModerationQueue(data.rows);
  } catch (err) {
    if (!handleAuthFailure(err)) $('moderation').innerHTML = '<div class="empty">failed to load moderation queue</div>';
  }
}

function showPage(page: 'overview' | 'moderation'): void {
  activePage = page;
  document.querySelectorAll<HTMLButtonElement>('.admin-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.adminPage === page);
  });
  document.querySelectorAll<HTMLElement>('.admin-page').forEach((el) => {
    el.classList.toggle('active', el.id === `page-${page}`);
  });
  if (page === 'moderation') void refreshModeration();
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function statCard(value: string, label: string): string {
  return `<div class="panel stat"><div class="v">${escapeHtml(value)}</div><div class="k">${escapeHtml(label)}</div></div>`;
}

async function refreshLive(): Promise<void> {
  try {
    const [overview, online] = await Promise.all([
      apiGet<Overview>('/admin/api/overview'),
      apiGet<{ players: LivePlayer[] }>('/admin/api/online'),
    ]);
    const s = overview.server;
    $('stats').innerHTML = [
      statCard(String(s.online), 'online now'),
      statCard(String(s.peakOnline), 'peak online'),
      statCard(String(overview.accounts), 'accounts'),
      statCard(String(overview.characters), 'characters'),
      statCard(String(overview.accountsToday), 'new accounts 24h'),
      statCard(String(overview.activeAccountsToday), 'active accounts 24h'),
      statCard(String(overview.sessionsToday), 'sessions 24h'),
      statCard(fmtDuration(s.uptimeSeconds), 'uptime'),
      statCard(`${s.tickMsAvg} ms`, 'avg tick'),
      statCard(fmtBytes(s.rssBytes), 'server rss'),
    ].join('');
    $('online').innerHTML = renderOnlineTable(online.players);
  } catch (err) {
    if (!handleAuthFailure(err)) console.error('live refresh failed:', err);
  }
}

async function refreshActivity(): Promise<void> {
  try {
    const a = await apiGet<Activity>('/admin/api/activity');
    const dayLabel = (day: string) => day.slice(5); // YYYY-MM-DD -> MM-DD
    $('charts').innerHTML = [
      chartPanel(`Registrations — last ${a.days} days`, barChart(
        a.registrations.map((p) => ({ label: dayLabel(p.day), value: p.count })),
      )),
      chartPanel(`Play sessions — last ${a.days} days`, barChart(
        a.sessions.map((p) => ({
          label: dayLabel(p.day),
          value: p.sessions,
          title: `${p.day}: ${p.sessions} sessions, ${p.uniqueAccounts} accounts, ${fmtDuration(p.playtimeSeconds)} played`,
        })),
      )),
      chartPanel('Class distribution', barChart(
        a.classes.map((p) => ({ label: p.key, value: p.count })),
      )),
      chartPanel('Level distribution', barChart(
        a.levels.map((p) => ({ label: p.key, value: p.count })),
      )),
    ].join('');
  } catch (err) {
    if (!handleAuthFailure(err)) console.error('activity refresh failed:', err);
  }
}

async function refreshAccounts(): Promise<void> {
  try {
    const params = new URLSearchParams({ page: String(accountsState.page), search: accountsState.search });
    const data = await apiGet<Paginated<AccountRow>>(`/admin/api/accounts?${params}`);
    $('accounts').innerHTML = renderAccountsTable(data.rows);
    $('accounts-pager').innerHTML = renderPager(data.total, data.page, data.limit);
  } catch (err) {
    if (!handleAuthFailure(err)) $('accounts').innerHTML = `<div class="empty">failed to load accounts</div>`;
  }
}

async function refreshCharacters(): Promise<void> {
  try {
    const params = new URLSearchParams({
      page: String(charactersState.page), sort: charactersState.sort, dir: charactersState.dir,
    });
    const data = await apiGet<Paginated<CharacterRow>>(`/admin/api/characters?${params}`);
    $('characters').innerHTML = renderCharactersTable(data.rows, charactersState.sort, charactersState.dir);
    $('characters-pager').innerHTML = renderPager(data.total, data.page, data.limit);
  } catch (err) {
    if (!handleAuthFailure(err)) $('characters').innerHTML = `<div class="empty">failed to load characters</div>`;
  }
}

async function toggleAccountDetail(row: HTMLTableRowElement, accountId: number): Promise<void> {
  const existing = row.nextElementSibling;
  if (existing?.classList.contains('detail-row')) {
    existing.remove();
    return;
  }
  row.parentElement?.querySelectorAll('.detail-row').forEach((el) => el.remove());
  try {
    const detail = await apiGet<AccountDetail>(`/admin/api/accounts/${accountId}`);
    const detailRow = document.createElement('tr');
    detailRow.className = 'detail-row';
    detailRow.innerHTML = `<td colspan="7">${renderAccountDetail(detail, true)}</td>`;
    row.after(detailRow);
  } catch (err) {
    if (!handleAuthFailure(err)) console.error('account detail failed:', err);
  }
}

async function refreshOpenAccountDetail(accountId: number): Promise<void> {
  const row = document.querySelector<HTMLTableRowElement>(`#accounts tr.clickable[data-account-id="${CSS.escape(String(accountId))}"]`);
  const detailRow = row?.nextElementSibling;
  if (!row || !detailRow?.classList.contains('detail-row')) return;
  try {
    const detail = await apiGet<AccountDetail>(`/admin/api/accounts/${accountId}`);
    detailRow.innerHTML = `<td colspan="7">${renderAccountDetail(detail, true)}</td>`;
  } catch (err) {
    if (!handleAuthFailure(err)) console.error('account detail refresh failed:', err);
  }
}

async function openModerationAccount(accountId: number): Promise<void> {
  $('moderation-detail').innerHTML = '<div class="empty">loading report context…</div>';
  try {
    const detail = await apiGet<ModerationAccountDetail>(`/admin/api/moderation/accounts/${accountId}`);
    $('moderation-detail').innerHTML = renderModerationDetail(detail);
  } catch (err) {
    if (!handleAuthFailure(err)) $('moderation-detail').innerHTML = '<div class="empty">failed to load report context</div>';
  }
}

function showModerationConfirm(opts: {
  title: string;
  rows: { label: string; value: string }[];
  endpoint: string;
  body: unknown;
  accountId: number;
  source: 'account' | 'moderation';
  confirmEl: HTMLElement;
  danger?: boolean;
}): void {
  pendingModerationAction = { endpoint: opts.endpoint, body: opts.body, accountId: opts.accountId, source: opts.source };
  const el = opts.confirmEl;
  el.className = `mod-confirm show${el.classList.contains('account-mod-confirm') ? ' account-mod-confirm' : ''}`;
  el.innerHTML = `
    <h4>${escapeHtml(opts.title)}</h4>
    <dl>${opts.rows.map((r) => `<dt>${escapeHtml(r.label)}</dt><dd>${escapeHtml(r.value)}</dd>`).join('')}</dl>
    <div class="confirm-actions">
      <button data-confirm-moderation ${opts.danger ? 'class="danger"' : ''}>Confirm</button>
      <button data-cancel-moderation>Cancel</button>
    </div>`;
  el.scrollIntoView({ block: 'nearest' });
}

function moderationReasonInput(target: HTMLElement): HTMLInputElement | null {
  const detailRow = target.closest('.detail-row');
  return (detailRow?.querySelector('.account-mod-reason') as HTMLInputElement | null) ??
    ($('mod-reason') as HTMLInputElement | null);
}

function moderationCustomExpiryInput(target: HTMLElement): HTMLInputElement | null {
  const detailRow = target.closest('.detail-row');
  return (detailRow?.querySelector('.account-custom-expiry') as HTMLInputElement | null) ??
    ($('mod-custom-expiry') as HTMLInputElement | null);
}

function moderationConfirmEl(target: HTMLElement): HTMLElement {
  const detailRow = target.closest('.detail-row');
  return (detailRow?.querySelector('.account-mod-confirm') as HTMLElement | null) ?? $('mod-confirm');
}

async function finishModerationAction(): Promise<void> {
  const pending = pendingModerationAction;
  if (!pending) return;
  await apiPost(pending.endpoint, pending.body);
  pendingModerationAction = null;
  void refreshAccounts();
  void refreshModeration();
  if (pending.source === 'account' && Number.isFinite(pending.accountId)) {
    await refreshOpenAccountDetail(pending.accountId);
  } else {
    await openModerationAccount(pending.accountId);
  }
}

function handleModerationActionClick(e: Event, source: 'account' | 'moderation'): boolean {
  const target = e.target as HTMLElement;
  const confirmEl = moderationConfirmEl(target);
  if (target.closest('[data-cancel-moderation]')) {
    pendingModerationAction = null;
    confirmEl.className = `mod-confirm${confirmEl.classList.contains('account-mod-confirm') ? ' account-mod-confirm' : ''}`;
    confirmEl.innerHTML = '';
    return true;
  }
  if (target.closest('[data-confirm-moderation]')) {
    void finishModerationAction()
      .catch((err: unknown) => { if (!handleAuthFailure(err)) window.alert(err instanceof Error ? err.message : 'moderation action failed'); });
    return true;
  }
  const actionWrap = target.closest('[data-action-account-id]') as HTMLElement | null;
  const detailWrap = target.closest('.mod-detail') as HTMLElement | null;
  const accountId = Number((actionWrap ?? detailWrap?.querySelector('[data-action-account-id]') as HTMLElement | null)?.dataset.actionAccountId);
  const note = (moderationReasonInput(target)?.value ?? '').trim();
  const requireNote = (): boolean => {
    if (note) return true;
    window.alert('Enter a moderator note / reason first.');
    return false;
  };
  const forceRenameBtn = target.closest('button[data-force-rename-character]') as HTMLButtonElement | null;
  if (forceRenameBtn) {
    if (!requireNote()) return true;
    const characterId = Number(forceRenameBtn.dataset.forceRenameCharacter);
    const characterName = forceRenameBtn.dataset.characterName ?? `#${characterId}`;
    showModerationConfirm({
      title: 'Confirm forced name change',
      rows: [
        { label: 'Character', value: characterName },
        { label: 'Action', value: 'Require player to choose a new character name before entering the world.' },
        { label: 'Reason', value: note },
      ],
      endpoint: `/admin/api/moderation/characters/${characterId}/force-rename`,
      body: { reason: note },
      accountId,
      source,
      confirmEl,
    });
    return true;
  }
  if (!actionWrap) return false;
  const suspendBtn = target.closest('button[data-suspend-hours]') as HTMLButtonElement | null;
  if (suspendBtn) {
    if (!requireNote()) return true;
    const hours = Number(suspendBtn.dataset.suspendHours);
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    showModerationConfirm({
      title: 'Confirm suspension',
      rows: [
        { label: 'Account', value: `#${accountId}` },
        { label: 'Action', value: 'Temporary account lockout' },
        { label: 'Length', value: `${hours} hour${hours === 1 ? '' : 's'}` },
        { label: 'Until', value: new Date(expiresAt).toLocaleString() },
        { label: 'Reason', value: note },
      ],
      endpoint: `/admin/api/moderation/accounts/${accountId}/suspend`,
      body: { reason: note, expiresAt },
      accountId,
      source,
      confirmEl,
    });
    return true;
  }
  const customSuspend = target.closest('button[data-suspend-custom]') as HTMLButtonElement | null;
  if (customSuspend) {
    if (!requireNote()) return true;
    const raw = moderationCustomExpiryInput(target)?.value ?? '';
    const expiry = raw ? new Date(raw) : null;
    if (!expiry || !Number.isFinite(expiry.getTime())) {
      window.alert('Choose a custom suspension expiry.');
      return true;
    }
    showModerationConfirm({
      title: 'Confirm custom suspension',
      rows: [
        { label: 'Account', value: `#${accountId}` },
        { label: 'Action', value: 'Temporary account lockout' },
        { label: 'Until', value: expiry.toLocaleString() },
        { label: 'Reason', value: note },
      ],
      endpoint: `/admin/api/moderation/accounts/${accountId}/suspend`,
      body: { reason: note, expiresAt: expiry.toISOString() },
      accountId,
      source,
      confirmEl,
    });
    return true;
  }
  const banBtn = target.closest('button[data-ban-account]') as HTMLButtonElement | null;
  if (banBtn) {
    if (!requireNote()) return true;
    showModerationConfirm({
      title: 'Confirm ban',
      rows: [
        { label: 'Account', value: `#${accountId}` },
        { label: 'Action', value: 'Permanent account lockout' },
        { label: 'Reason', value: note },
      ],
      endpoint: `/admin/api/moderation/accounts/${accountId}/ban`,
      body: { reason: note },
      accountId,
      source,
      confirmEl,
      danger: true,
    });
    return true;
  }
  const unbanBtn = target.closest('button[data-unban-account]') as HTMLButtonElement | null;
  if (unbanBtn) {
    if (!requireNote()) return true;
    showModerationConfirm({
      title: 'Confirm unban',
      rows: [
        { label: 'Account', value: `#${accountId}` },
        { label: 'Action', value: 'Restore account login access' },
        { label: 'Reason', value: note },
      ],
      endpoint: `/admin/api/moderation/accounts/${accountId}/unban`,
      body: { reason: note },
      accountId,
      source,
      confirmEl,
    });
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------

function wireEvents(): void {
  $('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = ($('login-username') as HTMLInputElement).value.trim();
    const password = ($('login-password') as HTMLInputElement).value;
    $('login-error').textContent = '';
    apiLogin(username, password)
      .then(() => showApp())
      .catch((err: unknown) => {
        $('login-error').textContent = err instanceof ApiError ? err.message : 'login failed — is the server up?';
      });
  });

  $('logout').addEventListener('click', () => showLogin());

  $('admin-tabs').addEventListener('click', (e) => {
    const tab = (e.target as HTMLElement).closest<HTMLButtonElement>('.admin-tab');
    const page = tab?.dataset.adminPage;
    if (page === 'overview' || page === 'moderation') showPage(page);
  });

  let searchTimer: number | null = null;
  $('account-search').addEventListener('input', (e) => {
    accountsState.search = (e.target as HTMLInputElement).value.trim();
    accountsState.page = 1;
    if (searchTimer !== null) clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => void refreshAccounts(), SEARCH_DEBOUNCE_MS);
  });

  $('accounts-pager').addEventListener('click', (e) => {
    const page = pagerTarget(e);
    if (page !== null) { accountsState.page = page; void refreshAccounts(); }
  });

  $('characters-pager').addEventListener('click', (e) => {
    const page = pagerTarget(e);
    if (page !== null) { charactersState.page = page; void refreshCharacters(); }
  });

  $('accounts').addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const isAccountModClick = target.closest('.account-admin-controls, .account-mod-confirm, button[data-force-rename-character]');
    if (isAccountModClick && handleModerationActionClick(e, 'account')) {
      e.stopPropagation();
      return;
    }
    const row = target.closest('tr.clickable') as HTMLTableRowElement | null;
    const accountId = Number(row?.dataset.accountId);
    if (row && Number.isFinite(accountId)) void toggleAccountDetail(row, accountId);
  });

  $('moderation').addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest('tr[data-moderation-account-id]') as HTMLTableRowElement | null;
    const accountId = Number(row?.dataset.moderationAccountId);
    if (row && Number.isFinite(accountId)) void openModerationAccount(accountId);
  });

  $('moderation-detail').addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const ignoreBtn = target.closest('button[data-ignore-report]') as HTMLButtonElement | null;
    if (ignoreBtn) {
      const reportId = Number(ignoreBtn.dataset.ignoreReport);
      const note = (($('mod-reason') as HTMLInputElement | null)?.value ?? '').trim();
      void apiPost(`/admin/api/moderation/reports/${reportId}/ignore`, { note })
        .then(() => {
          const accountId = Number((ignoreBtn.closest('.mod-detail')?.querySelector('[data-action-account-id]') as HTMLElement | null)?.dataset.actionAccountId);
          void refreshModeration();
          if (Number.isFinite(accountId)) void openModerationAccount(accountId);
        })
        .catch((err: unknown) => { if (!handleAuthFailure(err)) window.alert(err instanceof Error ? err.message : 'ignore failed'); });
      return;
    }
    handleModerationActionClick(e, 'moderation');
  });

  $('characters').addEventListener('click', (e) => {
    const th = (e.target as HTMLElement).closest('th.sortable') as HTMLElement | null;
    const sort = th?.dataset.sort;
    if (!sort) return;
    charactersState.dir = charactersState.sort === sort && charactersState.dir === 'desc' ? 'asc' : 'desc';
    charactersState.sort = sort;
    charactersState.page = 1;
    void refreshCharacters();
  });
}

function pagerTarget(e: Event): number | null {
  const btn = (e.target as HTMLElement).closest('button[data-page]') as HTMLButtonElement | null;
  if (!btn || btn.disabled) return null;
  const page = Number(btn.dataset.page);
  return Number.isFinite(page) && page >= 1 ? page : null;
}

wireEvents();
if (getToken()) {
  void showApp();
} else {
  showLogin();
}
