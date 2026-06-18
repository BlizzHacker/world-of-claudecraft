// User dashboard SPA — own-account view at /me/. Anyone who can log in to
// the game can sign in here and see their character list, realm, role flags,
// and any active chat-mute / suspension status.

import {
  userLogin, getMe, getToken, getUserName, clearSession,
  ApiError, type MeData,
} from './api';
import { getActiveRealm } from '../sim/realms';
import '../ui/cryptic/theme.css';
import '../ui/cryptic/dashboard_chrome';

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
          <h1 class="cr-title">${escapeHtml(getActiveRealm().name)} — My Account</h1>
          <p class="cr-text-dim">Sign in with your game username and password.</p>
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
  const form = $('#login-form') as HTMLFormElement;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const err = $('#login-error');
    err.hidden = true;
    try {
      await userLogin(
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

function classBadge(cls: string): string {
  return `<span class="cr-class-badge" data-class="${escapeHtml(cls)}">${escapeHtml(cls)}</span>`;
}

function renderDashboard(me: MeData): void {
  const roleChips: string[] = [];
  if (me.roles.isAdmin) roleChips.push('<span class="cr-role-chip cr-role-admin">Admin</span>');
  if (me.roles.isModerator && !me.roles.isAdmin) roleChips.push('<span class="cr-role-chip cr-role-mod">Moderator</span>');
  if (roleChips.length === 0) roleChips.push('<span class="cr-role-chip">Player</span>');

  const charsHtml = me.characters.length === 0
    ? '<p class="cr-text-dim">No characters on this realm yet.</p>'
    : `<table class="cr-table"><thead><tr><th>Name</th><th>Class</th><th>Level</th><th>Lifetime XP</th></tr></thead><tbody>
        ${me.characters.map((c) => `<tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${classBadge(c.class)}</td>
          <td>${c.level}</td>
          <td>${c.lifetimeXp.toLocaleString()}</td>
        </tr>`).join('')}
       </tbody></table>`;

  const moderationHtml = me.moderation.locked
    ? `<div class="cr-text-error">Account locked: ${escapeHtml(me.moderation.message)}</div>`
    : me.moderation.chatMutedUntil
    ? `<div class="cr-text-error">Chat muted until ${escapeHtml(me.moderation.chatMutedUntil)}.</div>`
    : '<div class="cr-text-success">Account in good standing.</div>';

  document.body.innerHTML = `
    <div class="cr-shell">
      <div class="cr-dashboard">
        <header class="cr-dashboard-header">
          <h1 class="cr-title">My Account — ${escapeHtml(getUserName())}</h1>
          <div class="cr-dashboard-meta">
            ${roleChips.join(' ')}
            <span class="cr-text-dim">Realm: <strong>${escapeHtml(me.realm)}</strong></span>
            ${me.roles.isModerator ? '<a class="cr-button-ghost" href="/mod/">Moderator Tools</a>' : ''}
            ${me.roles.isAdmin ? '<a class="cr-button-ghost" href="/admin/">Admin</a>' : ''}
            <button id="signout" class="cr-button-ghost" type="button">Sign out</button>
          </div>
        </header>
        <section class="cr-panel">
          <h2 class="cr-section-title">Standing</h2>
          ${moderationHtml}
        </section>
        <section class="cr-panel">
          <h2 class="cr-section-title">Characters on ${escapeHtml(me.realm)}</h2>
          ${charsHtml}
        </section>
      </div>
    </div>
  `;
  $('#signout').addEventListener('click', () => {
    clearSession();
    renderLoginShell();
  });
}

async function boot(): Promise<void> {
  if (!getToken()) { renderLoginShell(); return; }
  try {
    const me = await getMe();
    renderDashboard(me);
  } catch (err) {
    clearSession();
    renderLoginShell();
    if (err instanceof ApiError && err.status !== 401) {
      const e = document.getElementById('login-error');
      if (e) { e.hidden = false; e.textContent = err.message; }
    }
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void boot());
  } else {
    void boot();
  }
}
