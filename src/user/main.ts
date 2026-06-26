// User dashboard SPA — own-account view at /me/. Anyone who can log in to
// the game can sign in here and see their character list, realm, role flags,
// and any active chat-mute / suspension status.

import {
  userLogin, getMe, getToken, getUserName, clearSession,
  getSecurity, setupTotp, enableTotp, disableTotp,
  ApiError, type MeData, type SecurityData, type TotpSetupData,
} from './api';
import { getActiveRealm } from '../sim/realms';
import '../ui/cryptic/theme.css';
import { mountDashboardChrome } from '../ui/cryptic/dashboard_chrome';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T =>
  document.querySelector(sel) as T;

let pendingTotpSetup: TotpSetupData | null = null;

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
              <input class="cr-input" id="login-totp" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="2FA code (optional unless enabled)" />
              <div id="login-error" class="cr-text-error" hidden></div>
              <button type="submit" class="cr-button">Sign in</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  mountDashboardChrome();
  const form = $('#login-form') as HTMLFormElement;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const err = $('#login-error');
    err.hidden = true;
    try {
      await userLogin(
        ($('#login-username') as HTMLInputElement).value.trim(),
        ($('#login-password') as HTMLInputElement).value,
        ($('#login-totp') as HTMLInputElement).value.trim(),
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

function securityHtml(security: SecurityData): string {
  if (security.totp.enabled) {
    return `
      <div class="cr-text-success">Authenticator 2FA is enabled for this local password account.</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
        <input class="cr-input" id="totp-disable-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="Current 2FA code" style="max-width:220px;" />
        <button class="cr-button-ghost" id="totp-disable" type="button">Disable 2FA</button>
      </div>
      <div id="totp-status" class="cr-text-dim" style="margin-top:10px;"></div>
    `;
  }
  const setup = pendingTotpSetup ? `
    <div style="margin-top:12px;display:grid;gap:10px;">
      <div class="cr-text-dim">Add this secret to an authenticator app, then enter the six-digit code it shows.</div>
      <code style="overflow-wrap:anywhere;">${escapeHtml(pendingTotpSetup.secret)}</code>
      <a class="cr-button-ghost" href="${escapeHtml(pendingTotpSetup.otpauthUrl)}">Open Authenticator Link</a>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <input class="cr-input" id="totp-enable-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="Six-digit code" style="max-width:220px;" />
        <button class="cr-button" id="totp-enable" type="button">Enable 2FA</button>
      </div>
    </div>
  ` : '';
  return `
    <div class="cr-text-dim">Optional authenticator-app 2FA protects local username/password logins. Authentik/OIDC accounts can use Authentik's own MFA policy.</div>
    <button class="cr-button" id="totp-setup" type="button" style="margin-top:12px;">Set Up Authenticator 2FA</button>
    ${setup}
    <div id="totp-status" class="cr-text-dim" style="margin-top:10px;"></div>
  `;
}

function renderDashboard(me: MeData, security: SecurityData): void {
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
          <h2 class="cr-section-title">Security</h2>
          ${securityHtml(security)}
        </section>
        <section class="cr-panel">
          <h2 class="cr-section-title">Characters on ${escapeHtml(me.realm)}</h2>
          ${charsHtml}
        </section>
      </div>
    </div>
  `;
  mountDashboardChrome();
  $('#signout').addEventListener('click', () => {
    clearSession();
    pendingTotpSetup = null;
    renderLoginShell();
  });
  document.getElementById('totp-setup')?.addEventListener('click', async () => {
    const status = $('#totp-status');
    status.textContent = 'Generating setup secret...';
    try {
      pendingTotpSetup = await setupTotp();
      renderDashboard(me, { totp: { enabled: false, configured: true } });
    } catch (err) {
      status.textContent = err instanceof ApiError ? err.message : 'could not start 2FA setup';
    }
  });
  document.getElementById('totp-enable')?.addEventListener('click', async () => {
    const status = $('#totp-status');
    const code = ($('#totp-enable-code') as HTMLInputElement | null)?.value.trim() ?? '';
    status.textContent = 'Verifying code...';
    try {
      await enableTotp(code);
      pendingTotpSetup = null;
      void boot();
    } catch (err) {
      status.textContent = err instanceof ApiError ? err.message : 'could not enable 2FA';
    }
  });
  document.getElementById('totp-disable')?.addEventListener('click', async () => {
    const status = $('#totp-status');
    const code = ($('#totp-disable-code') as HTMLInputElement | null)?.value.trim() ?? '';
    status.textContent = 'Verifying code...';
    try {
      await disableTotp(code);
      pendingTotpSetup = null;
      void boot();
    } catch (err) {
      status.textContent = err instanceof ApiError ? err.message : 'could not disable 2FA';
    }
  });
}

async function boot(): Promise<void> {
  if (!getToken()) { renderLoginShell(); return; }
  try {
    const [me, security] = await Promise.all([getMe(), getSecurity()]);
    renderDashboard(me, security);
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
