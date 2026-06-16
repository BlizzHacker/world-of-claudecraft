import { escapeHtml, fmtCopper, fmtDate, fmtDuration, fmtRelative } from './format';
import { classLabel, zoneLabel, t } from './i18n';
import type {
  AccountDetail, AccountRow, CharacterRow, ChatFilterData, ChatModerationDetail, FilterWord,
  LivePlayer, ModerationAccountDetail, ModerationQueueRow,
} from './types';

// Pure HTML-string renderers for the dashboard tables. All dynamic values go
// through escapeHtml — usernames and character names are player-controlled.

export function renderOnlineTable(players: LivePlayer[]): string {
  if (players.length === 0) return `<div class="empty">${t('online.empty')}</div>`;
  const rows = players.map((p) => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(classLabel(p.class))}</td>
      <td class="num">${p.level}</td>
      <td>${escapeHtml(zoneLabel(p.zone))}</td>
      <td class="num">${Math.round(p.x)}, ${Math.round(p.z)}</td>
      <td class="num">${p.hp}/${p.maxHp}</td>
      <td class="num">${fmtDuration(p.sessionSeconds)}</td>
      <td class="num">${fmtDuration(p.lastSaveSecondsAgo)} ${t('common.ago')}</td>
      <td class="num">${p.accountId}</td>
    </tr>`);
  return `<table>
    <thead><tr>
      <th>${t('online.colCharacter')}</th><th>${t('online.colClass')}</th><th class="num">${t('online.colLevel')}</th><th>${t('online.colZone')}</th>
      <th class="num">${t('online.colPos')}</th><th class="num">${t('online.colHp')}</th><th class="num">${t('online.colSession')}</th>
      <th class="num">${t('online.colLastSave')}</th><th class="num">${t('online.colAcct')}</th>
    </tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

export function renderAccountsTable(rows: AccountRow[]): string {
  if (rows.length === 0) return `<div class="empty">${t('accounts.empty')}</div>`;
  const body = rows.map((a) => `
    <tr class="clickable" data-account-id="${a.id}">
      <td class="num">${a.id}</td>
      <td>${escapeHtml(a.username)}${a.isAdmin ? ` <span class="badge">${t('accounts.badgeAdmin')}</span>` : ''} ${accountStatusBadge(a)}</td>
      <td class="num">${a.characterCount}</td>
      <td class="num">${a.maxLevel}</td>
      <td class="num">${fmtDuration(a.playtimeSeconds)}</td>
      <td>${fmtDate(a.createdAt)}</td>
      <td>${fmtRelative(a.lastLogin)}</td>
    </tr>`);
  return `<table>
    <thead><tr>
      <th class="num">${t('accounts.colId')}</th><th>${t('accounts.colUsername')}</th><th class="num">${t('accounts.colChars')}</th><th class="num">${t('accounts.colMaxLvl')}</th>
      <th class="num">${t('accounts.colPlaytime')}</th><th>${t('accounts.colRegistered')}</th><th>${t('accounts.colLastLogin')}</th>
    </tr></thead>
    <tbody>${body.join('')}</tbody>
  </table>`;
}

function accountStatusBadge(a: { bannedAt: string | null; suspendedUntil: string | null }): string {
  if (a.bannedAt) return `<span class="badge bad">${t('accounts.badgeBanned')}</span>`;
  const suspendedUntil = a.suspendedUntil ? new Date(a.suspendedUntil) : null;
  if (suspendedUntil && suspendedUntil.getTime() > Date.now()) return `<span class="badge warn">${t('accounts.badgeSuspended')}</span>`;
  return '';
}

function accountStatusDetail(d: AccountDetail): string {
  const activeSuspension = d.suspendedUntil !== null && new Date(d.suspendedUntil).getTime() > Date.now();
  const activeChatMute = d.chatMutedUntil !== null && new Date(d.chatMutedUntil).getTime() > Date.now();
  if (d.bannedAt) return `<span class="badge bad">${t('accounts.badgeBanned')}</span> <span class="hint">${t('detail.since', { value: fmtDate(d.bannedAt) })}</span>`;
  if (activeSuspension) return `<span class="badge warn">${t('detail.suspendedUntil', { value: fmtDate(d.suspendedUntil) })}</span>`;
  return `<span class="badge">${t('detail.statusActive')}</span>${activeChatMute ? ` <span class="badge warn">chat muted until ${fmtDate(d.chatMutedUntil)}</span>` : ''}`;
}

export function renderAccountDetail(d: AccountDetail, includeAdminControls = false): string {
  const canModerateAccount = includeAdminControls && !d.isAdmin;
  const chars = d.characters.length === 0
    ? `<div class="empty">${t('detail.noCharacters')}</div>`
    : `<table><thead><tr><th>${t('detail.colName')}</th><th>${t('characters.colClass')}</th><th class="num">${t('characters.colLevel')}</th><th class="num">${t('detail.colXp')}</th><th class="num">${t('detail.colMoney')}</th><th class="num">${t('online.colPos')}</th><th>${t('characters.colLastPlayed')}</th>${canModerateAccount ? `<th>${t('detail.colActions')}</th>` : ''}</tr></thead><tbody>${
        d.characters.map((c) => `
          <tr>
            <td>${escapeHtml(c.name)}</td>
            <td>${escapeHtml(classLabel(c.class))}</td>
            <td class="num">${c.level}</td>
            <td class="num">${c.xp}</td>
            <td class="num">${fmtCopper(c.copper)}</td>
            <td class="num">${c.pos ? `${Math.round(c.pos.x)}, ${Math.round(c.pos.z)}` : '—'}</td>
            <td>${fmtRelative(c.updatedAt)}</td>
            ${canModerateAccount ? `<td><button data-force-rename-character="${c.id}" data-character-name="${escapeHtml(c.name)}">${t('detail.forceNameChange')}</button></td>` : ''}
          </tr>`).join('')
      }</tbody></table>`;
  const sessions = d.recentSessions.length === 0
    ? `<div class="empty">${t('detail.noSessions')}</div>`
    : `<table><thead><tr><th>${t('online.colCharacter')}</th><th>${t('detail.started')}</th><th class="num">${t('dialog.length')}</th></tr></thead><tbody>${
        d.recentSessions.map((s) => `
          <tr>
            <td>${escapeHtml(s.characterName)}</td>
            <td>${fmtDate(s.startedAt)}</td>
            <td class="num">${s.endedAt ? fmtDuration(s.seconds) : t('detail.onlineNow')}</td>
          </tr>`).join('')
      }</tbody></table>`;
  const accountStatus = accountStatusDetail(d);
  const accountActionButtons = d.bannedAt ? `
      <button data-unban-account="1">${t('detail.unban')}</button>` : `
      <button data-suspend-hours="1">${t('detail.suspend1h')}</button>
      <button data-suspend-hours="24">${t('detail.suspend24h')}</button>
      <button data-suspend-hours="72">${t('detail.suspend3d')}</button>
      <button data-suspend-hours="168">${t('detail.suspend7d')}</button>
      <button data-suspend-hours="720">${t('detail.suspend30d')}</button>
      <input class="account-custom-expiry" type="datetime-local" />
      <button data-suspend-custom="1">${t('detail.suspendCustom')}</button>
      <button data-chat-mute-hours="1">Mute Chat 1h</button>
      <button data-chat-mute-custom="1">Mute Chat Custom</button>
      <button data-ban-account="1" class="danger">${t('detail.ban')}</button>`;
  const adminControls = canModerateAccount ? `
    <div class="account-admin-controls mod-account-actions" data-action-account-id="${d.id}">
      <div class="account-status"><b>${t('detail.status')}</b> ${accountStatus}${d.moderationReason ? ` <span class="hint">${t('detail.reason', { value: escapeHtml(d.moderationReason) })}</span>` : ''}</div>
      ${d.chatMutedUntil && new Date(d.chatMutedUntil).getTime() > Date.now() && d.chatMuteReason ? `<div class="account-status"><b>Chat mute:</b> <span class="hint">reason: ${escapeHtml(d.chatMuteReason)}</span></div>` : ''}
      <input class="account-mod-reason" placeholder="${t('detail.notePlaceholder')}" maxlength="500" />
      ${accountActionButtons}
    </div>
    <div class="mod-confirm account-mod-confirm"></div>` : includeAdminControls ? `
    <div class="account-admin-controls">
      <div class="account-status"><b>${t('detail.status')}</b> <span class="badge">${t('accounts.badgeAdmin')}</span> ${accountStatus}</div>
    </div>` : '';
  return `<div class="account-detail" data-action-account-id="${d.id}">${adminControls}<div class="detail-grid">
    <div><h4>${t('detail.charactersHeader')}</h4>${chars}</div>
    <div><h4>${t('detail.sessionsHeader', { value: fmtDuration(d.playtimeSeconds) })}</h4>${sessions}</div>
  </div></div>`;
}

export function renderCharactersTable(rows: CharacterRow[], sort: string, dir: string): string {
  if (rows.length === 0) return `<div class="empty">${t('characters.empty')}</div>`;
  const arrow = (col: string) => (sort === col ? (dir === 'asc' ? ' ▲' : ' ▼') : '');
  const sortableHeader = (col: string, label: string, numeric = false) =>
    `<th class="sortable${numeric ? ' num' : ''}" data-sort="${col}">${label}${arrow(col)}</th>`;
  const body = rows.map((c) => `
    <tr>
      <td class="num">${c.id}</td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(classLabel(c.class))}</td>
      <td class="num">${c.level}</td>
      <td class="num">${c.xp}</td>
      <td class="num">${fmtCopper(c.copper)}</td>
      <td>${escapeHtml(c.username)}</td>
      <td>${fmtDate(c.createdAt)}</td>
      <td>${fmtRelative(c.updatedAt)}</td>
    </tr>`);
  return `<table>
    <thead><tr>
      ${sortableHeader('id', t('characters.colId'), true)}
      ${sortableHeader('name', t('characters.colName'))}
      ${sortableHeader('class', t('characters.colClass'))}
      ${sortableHeader('level', t('characters.colLevel'), true)}
      <th class="num">${t('characters.colXp')}</th><th class="num">${t('characters.colMoney')}</th><th>${t('characters.colAccount')}</th>
      ${sortableHeader('created_at', t('characters.colCreated'))}
      ${sortableHeader('updated_at', t('characters.colLastPlayed'))}
    </tr></thead>
    <tbody>${body.join('')}</tbody>
  </table>`;
}

export function renderPager(total: number, page: number, limit: number): string {
  const pages = Math.max(1, Math.ceil(total / limit));
  return `
    <button data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>${t('accounts.prev')}</button>
    <span>${t('accounts.pager', { page, pages, total })}</span>
    <button data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>${t('accounts.next')}</button>`;
}

export function renderModerationQueue(rows: ModerationQueueRow[]): string {
  if (rows.length === 0) return `<div class="empty">${t('moderation.empty')}</div>`;
  const body = rows.map((r) => `
    <tr class="clickable" data-moderation-account-id="${r.accountId}">
      <td>${escapeHtml(r.username)}${r.online ? ` <span class="badge">${t('moderation.badgeOnline')}</span>` : ''}</td>
      <td>${r.characterNames.map(escapeHtml).join(', ') || '—'}</td>
      <td class="num">${r.openReports}</td>
      <td>${escapeHtml(reasonLabel(r.latestReason))}</td>
      <td>${fmtRelative(r.latestReportAt)}</td>
      <td>${statusBadge(r.status, r.suspendedUntil)}</td>
    </tr>`);
  return `<table>
    <thead><tr>
      <th>${t('moderation.colAccount')}</th><th>${t('moderation.colCharacters')}</th><th class="num">${t('moderation.colOpenReports')}</th><th>${t('moderation.colLatestReason')}</th><th>${t('moderation.colLatest')}</th><th>${t('moderation.colStatus')}</th>
    </tr></thead>
    <tbody>${body.join('')}</tbody>
  </table>`;
}

export function renderModerationDetail(d: ModerationAccountDetail): string {
  const reports = d.reports.map((r) => {
    const chat = r.chatContext.length === 0
      ? `<div class="empty">${t('report.noChat')}</div>`
      : `<table><thead><tr><th>${t('report.colTime')}</th><th>${t('report.colChannel')}</th><th>${t('report.colMessage')}</th></tr></thead><tbody>${
          r.chatContext.map((c) => `
            <tr>
              <td>${fmtDate(c.createdAt)}</td>
              <td>${escapeHtml(c.channel)}</td>
              <td><b>${escapeHtml(c.characterName)}:</b> ${escapeHtml(c.message)}</td>
            </tr>`).join('')
        }</tbody></table>`;
    return `<div class="mod-report panel" data-report-id="${r.id}">
      <div class="panel-title">${t('report.title', { id: r.id })} <span class="hint">${fmtDate(r.createdAt)}</span></div>
      <div class="mod-report-meta">
        <div><b>${t('report.reporter')}</b> ${escapeHtml(r.reporterUsername ?? t('common.unknown'))} / ${escapeHtml(r.reporterCharacterName || t('common.unknown'))}</div>
        <div><b>${t('report.reported')}</b> ${escapeHtml(r.reportedUsername)} / ${escapeHtml(r.reportedCharacterName || t('common.unknown'))}</div>
        <div><b>${t('report.reason')}</b> ${escapeHtml(reasonLabel(r.reason))}</div>
      </div>
      <div class="mod-details">${escapeHtml(r.details || t('report.noDetails'))}</div>
      <div class="mod-actions">
        <button data-ignore-report="${r.id}">${t('report.ignore')}</button>
        ${r.reportedCharacterId ? `<button data-force-rename-character="${r.reportedCharacterId}" data-character-name="${escapeHtml(r.reportedCharacterName)}">${t('report.forceNameChange')}</button>` : ''}
      </div>
      <h4>${t('report.recentChat')}</h4>
      ${chat}
    </div>`;
  }).join('');
  const moderationAccountButtons = d.account.bannedAt ? `
      <button data-unban-account="1">${t('detail.unban')}</button>` : `
      <button data-suspend-hours="1">${t('detail.suspend1h')}</button>
      <button data-suspend-hours="24">${t('detail.suspend24h')}</button>
      <button data-suspend-hours="72">${t('detail.suspend3d')}</button>
      <button data-suspend-hours="168">${t('detail.suspend7d')}</button>
      <button data-suspend-hours="720">${t('detail.suspend30d')}</button>
      <input id="mod-custom-expiry" type="datetime-local" />
      <button data-suspend-custom="1">${t('detail.suspendCustom')}</button>
      <button data-chat-mute-hours="1">Mute Chat 1h</button>
      <button data-chat-mute-custom="1">Mute Chat Custom</button>
      <button data-ban-account="1">${t('detail.ban')}</button>`;
  return `<div class="mod-detail">
    <div class="panel-title">
      <span>${escapeHtml(d.account.username)}</span>
      <span class="hint">${t('detail.accountNum', { id: d.account.id })}</span>
    </div>
    ${renderAccountDetail(d.account)}
    ${renderChatModeration(d.chat)}
    <div class="mod-account-actions" data-action-account-id="${d.account.id}">
      <input id="mod-reason" placeholder="${t('detail.notePlaceholder')}" maxlength="500" />
      ${moderationAccountButtons}
    </div>
    <div id="mod-confirm" class="mod-confirm"></div>
    <h4>${t('report.openReports')}</h4>
    ${reports || `<div class="empty">${t('report.noOpenReports')}</div>`}
  </div>`;
}

// Chat-filter state for an account: live mute status, strike count, the
// warn/mute incident log, and manual lift/reset actions (slurs the player typed).
function renderChatModeration(chat: ChatModerationDetail): string {
  const muteStatus = chat.chatMutedUntil
    ? `<span class="badge bad">muted until ${fmtDate(chat.chatMutedUntil)}</span>`
    : '<span class="badge">not muted</span>';
  const incidents = chat.violations.length === 0
    ? '<div class="empty">no chat filter incidents</div>'
    : `<table><thead><tr><th>Time</th><th>Channel</th><th>Word</th><th>Action</th><th>Message</th></tr></thead><tbody>${
        chat.violations.map((v) => `
          <tr>
            <td>${fmtDate(v.createdAt)}</td>
            <td>${escapeHtml(v.channel)}</td>
            <td>${escapeHtml(v.term)}</td>
            <td>${escapeHtml(v.action)}${v.muteSeconds > 0 ? ` (${escapeHtml(fmtDuration(v.muteSeconds))})` : ''}</td>
            <td>${escapeHtml(v.message)}</td>
          </tr>`).join('')
      }</tbody></table>`;
  return `<div class="panel chat-mod">
    <div class="panel-title">Chat moderation</div>
    <div class="chat-mod-status">Status: ${muteStatus} &middot; Strikes: <b>${chat.chatStrikes}</b></div>
    <div class="mod-actions">
      ${chat.chatMutedUntil ? '<button data-lift-mute="1">Lift mute</button>' : ''}
      ${chat.chatStrikes > 0 ? '<button data-reset-strikes="1">Reset strikes</button>' : ''}
    </div>
    <h4>Recent chat filter incidents</h4>
    ${incidents}
  </div>`;
}

function renderWordChips(words: FilterWord[]): string {
  if (words.length === 0) return '<div class="empty">no words yet</div>';
  return `<div class="word-chips">${
    words.map((w) => `<span class="word-chip">${escapeHtml(w.word)}<button class="word-del" data-del-word="${w.id}" title="Remove">&times;</button></span>`).join('')
  }</div>`;
}

export function renderChatFilter(data: ChatFilterData): string {
  const ladderHuman = data.config.muteLadderSeconds.map((s) => fmtDuration(s)).join(' → ');
  return `
    <div class="panel">
      <div class="panel-title">Escalation</div>
      <p class="hint">Typing a hard word blocks the message and warns the player, then applies escalating account-wide mutes (survives relog / character swap).</p>
      <div class="cf-config">
        <label>Warnings before first mute
          <input id="cf-warnings" type="number" min="0" max="50" value="${data.config.warningsBeforeMute}" />
        </label>
        <label>Mute ladder (seconds, comma-separated)
          <input id="cf-ladder" type="text" value="${escapeHtml(data.config.muteLadderSeconds.join(', '))}" />
        </label>
        <div class="hint">Current ladder: ${escapeHtml(ladderHuman || '—')}</div>
        <button data-save-config="1">Save escalation settings</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">Soft words <span class="hint">masked with **** in players' chat; players can toggle the filter off</span></div>
      <form class="word-add" data-add-tier="soft"><input placeholder="add a soft word" maxlength="64" /><button>Add</button></form>
      ${renderWordChips(data.soft)}
    </div>
    <div class="panel">
      <div class="panel-title">Hard words <span class="hint">slurs — message blocked + escalating mutes; never shown to anyone, not toggleable</span></div>
      <form class="word-add" data-add-tier="hard"><input placeholder="add a hard word" maxlength="64" /><button>Add</button></form>
      ${renderWordChips(data.hard)}
    </div>`;
}

function reasonLabel(reason: string): string {
  return ({
    harassment: t('reason.harassment'),
    spam: t('reason.spam'),
    cheating: t('reason.cheating'),
    offensive_name_or_chat: t('reason.offensiveName'),
    other: t('reason.other'),
  } as Record<string, string>)[reason] ?? reason;
}

function statusBadge(status: string, suspendedUntil: string | null): string {
  if (status === 'banned') return `<span class="badge bad">${t('accounts.badgeBanned')}</span>`;
  if (status === 'suspended') return `<span class="badge warn">${t('detail.suspendedUntil', { value: fmtDate(suspendedUntil) })}</span>`;
  return `<span class="badge">${t('detail.statusActive')}</span>`;
}
