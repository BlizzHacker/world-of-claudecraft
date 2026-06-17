// Moderator dashboard SPA — /mod/. Requires is_moderator or is_admin. Shows
// the moderation queue (reports by account) and the current mod's own info.

import {
  modLogin, getModMe, getModQueue, getToken, getModName, clearSession,
  ApiError, type ModMeData, type ModQueueRow,
} from './api';
import { getActiveRealm } from '../sim/realms';
import '../ui/cryptic/theme.css';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T =>
  document.querySelector(sel) as T;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

function renderLoginShell(): void {
  document.body.innerHTML = `
    <div class="cr-shell">
      <div class="cr-dashboard">
        <div class="cr-dashboard-card cr-panel">
          <h1 class="cr-title">${escapeHtml(getActiveRealm().name)} — Moderator</h1>
          <p class="cr-text-dim">Sign in. Moderator or admin access required.</p>
          <form id="login-form">
            <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
              <input class="cr-input" id="login-username" type="text" placeholder="Username" autocomplete="username" required />
              <input class="cr-input" id="login-password" type="password" placeholder="Password" autocomplete="current-password" required />
              <div id="login-error" class="cr-text-error" hidden></div>
              <button type="submit" class="cr-button">Sign in</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  ($('#login-form') as HTMLFormElement).addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const err = $('#login-error');
    err.hidden = true;
    try {
      await modLogin(
        ($('#login-username') as HTMLInputElement).value.trim(),
        ($('#login-password') as HTMLInputElement).value,
      );
      void boot();
    } catch (e) {
      err.hidden = false;
      err.textContent = e instanceof ApiError ? e.message : 'sign-in failed';
    }
  });
}

function renderQueueTable(rows: ModQueueRow[]): string {
  if (rows.length === 0) {
    return '<p class="cr-text-success">No open reports. Queue is clear.</p>';
  }
  return `<table class="cr-table">
    <thead><tr>
      <th>Account</th><th>Character</th><th>Reports</th><th>Status</th><th>Last report</th>
    </tr></thead>
    <tbody>
      ${rows.map((r) => {
        const status: string[] = [];
        if (r.banned) status.push('<span class="cr-role-chip cr-role-banned">Banned</span>');
        if (r.suspendedUntil) status.push(`<span class="cr-role-chip cr-role-suspended">Suspended → ${escapeHtml(r.suspendedUntil)}</span>`);
        if (r.chatMutedUntil) status.push(`<span class="cr-role-chip cr-role-muted">Chat muted → ${escapeHtml(r.chatMutedUntil)}</span>`);
        if (r.online) status.push('<span class="cr-role-chip cr-role-online">Online</span>');
        if (status.length === 0) status.push('<span class="cr-text-dim">—</span>');
        return `<tr>
          <td>${escapeHtml(r.username ?? '(deleted)')}</td>
          <td>${escapeHtml(r.characterName ?? '(none)')} ${r.characterClass ? `<span class="cr-text-dim">${escapeHtml(r.characterClass)} ${r.characterLevel ?? ''}</span>` : ''}</td>
          <td>${r.openReports}</td>
          <td>${status.join(' ')}</td>
          <td>${escapeHtml(r.lastReportAt ?? '—')}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

async function renderDashboard(): Promise<void> {
  let me: ModMeData;
  try { me = await getModMe(); }
  catch (e) {
    clearSession();
    renderLoginShell();
    if (e instanceof ApiError && e.status !== 401) {
      const el = document.getElementById('login-error');
      if (el) { el.hidden = false; el.textContent = e.message; }
    }
    return;
  }

  const roleChips: string[] = [];
  if (me.roles.isAdmin) roleChips.push('<span class="cr-role-chip cr-role-admin">Admin</span>');
  if (me.roles.isModerator) roleChips.push('<span class="cr-role-chip cr-role-mod">Moderator</span>');

  document.body.innerHTML = `
    <div class="cr-shell">
      <div class="cr-dashboard">
        <header class="cr-dashboard-header">
          <h1 class="cr-title">${escapeHtml(getActiveRealm().name)} — Moderator Tools</h1>
          <div class="cr-dashboard-meta">
            <span>${escapeHtml(getModName())}</span>
            ${roleChips.join(' ')}
            <span class="cr-text-dim">Realm: <strong>${escapeHtml(me.realm)}</strong></span>
            <a class="cr-button-ghost" href="/me/">My Account</a>
            ${me.roles.isAdmin ? '<a class="cr-button-ghost" href="/admin/">Admin</a>' : ''}
            <button id="signout" class="cr-button-ghost" type="button">Sign out</button>
          </div>
        </header>
        <section class="cr-panel">
          <h2 class="cr-section-title">Moderation queue</h2>
          <div id="queue">Loading…</div>
        </section>
      </div>
    </div>
  `;
  $('#signout').addEventListener('click', () => { clearSession(); renderLoginShell(); });

  try {
    const queue = await getModQueue();
    $('#queue').innerHTML = renderQueueTable(queue);
  } catch (e) {
    $('#queue').innerHTML = `<div class="cr-text-error">Queue load failed: ${escapeHtml(e instanceof Error ? e.message : 'unknown')}</div>`;
  }
}

async function boot(): Promise<void> {
  if (!getToken()) { renderLoginShell(); return; }
  await renderDashboard();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void boot());
  } else {
    void boot();
  }
}
