// Logged-in user dropdown for the homepage header. Sits in the same row as
// the realm picker. Shows the username + a popover menu with:
//   - My Account → /me/
//   - Moderator Tools → /mod/  (only when is_moderator OR is_admin)
//   - Admin → /admin/          (only when is_admin)
//   - Sign out (clears the local Bearer token + reloads)
//
// Detects login by reading the same Bearer token the user dashboard writes
// to localStorage. If no token is stored, the dropdown stays hidden. If a
// token exists but /me/api/me 401s, we clear the session and hide it.

const USER_TOKEN_KEYS = [
  'cryptic-realm_user_token',
  'cryptic-realm_mod_token',
  'cryptic-realm_admin_token',
];
const USER_NAME_KEYS = [
  'cryptic-realm_user_name',
  'cryptic-realm_mod_name',
  'cryptic-realm_admin_name',
];

interface MeRoles { isAdmin: boolean; isModerator: boolean; }
interface MeResponse {
  accountId: number;
  realm: string;
  roles: MeRoles;
  characters: { id: number; name: string; class: string; level: number; realm: string; lifetimeXp: number; }[];
}

function readToken(): string | null {
  for (const key of USER_TOKEN_KEYS) {
    const v = localStorage.getItem(key);
    if (v) return v;
  }
  return null;
}

function readName(): string {
  for (const key of USER_NAME_KEYS) {
    const v = localStorage.getItem(key);
    if (v) return v;
  }
  return '';
}

function clearSession(): void {
  for (const k of USER_TOKEN_KEYS) localStorage.removeItem(k);
  for (const k of USER_NAME_KEYS) localStorage.removeItem(k);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

function buildTriggerHtml(username: string): string {
  const initial = (username[0] ?? '?').toUpperCase();
  return `<button type="button" class="cr-user-trigger" aria-haspopup="menu" aria-expanded="false">
    <span class="cr-user-trigger-avatar" aria-hidden="true">${escapeHtml(initial)}</span>
    <span class="cr-user-name">${escapeHtml(username)}</span>
    <span class="cr-user-caret" aria-hidden="true">▾</span>
  </button>`;
}

function buildMenuHtml(roles: MeRoles, realm: string): string {
  const adminItem = roles.isAdmin
    ? `<a class="cr-user-menu-item" href="/admin/">
         <span class="cr-menu-icon">⚙</span>
         <span>Admin Console</span>
       </a>`
    : '';
  const modItem = roles.isModerator
    ? `<a class="cr-user-menu-item" href="/mod/">
         <span class="cr-menu-icon">⛨</span>
         <span>Moderator Tools</span>
       </a>`
    : '';
  return `<div class="cr-user-menu" role="menu" hidden>
    <div class="cr-user-menu-role">Signed in · ${escapeHtml(realm)}</div>
    <a class="cr-user-menu-item" href="/me/">
      <span class="cr-menu-icon">👤</span>
      <span>My Account</span>
    </a>
    ${modItem}
    ${adminItem}
    <div class="cr-user-menu-divider"></div>
    <button type="button" class="cr-user-menu-item" data-cr-signout>
      <span class="cr-menu-icon">↩</span>
      <span>Sign out</span>
    </button>
  </div>`;
}

async function fetchMe(token: string): Promise<MeResponse | null> {
  try {
    const r = await fetch('/me/api/me', { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const body = await r.json();
    if (!body?.data) return null;
    return body.data as MeResponse;
  } catch {
    return null;
  }
}

function mountAt(host: HTMLElement, username: string, roles: MeRoles, realm: string): void {
  host.id = host.id || 'cr-user-dropdown';
  host.innerHTML = `${buildTriggerHtml(username)}${buildMenuHtml(roles, realm)}`;

  const trigger = host.querySelector('.cr-user-trigger') as HTMLButtonElement | null;
  const menu = host.querySelector('.cr-user-menu') as HTMLElement | null;

  const close = () => { menu?.setAttribute('hidden', ''); trigger?.setAttribute('aria-expanded', 'false'); };
  const open = () => { menu?.removeAttribute('hidden'); trigger?.setAttribute('aria-expanded', 'true'); };

  host.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('[data-cr-signout]')) {
      clearSession();
      // Force a re-mount so the dropdown disappears.
      window.location.reload();
      return;
    }
    if (target.closest('.cr-user-trigger')) {
      ev.preventDefault();
      ev.stopPropagation();
      if (menu?.hasAttribute('hidden')) open(); else close();
    }
  });

  document.addEventListener('click', (ev) => {
    if (!host.contains(ev.target as Node)) close();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') close();
  });
}

function findHostContainer(): HTMLElement | null {
  // Same .header-actions row that holds the realm picker.
  return document.querySelector('.header-actions');
}

/** Mount the dropdown when (a) a local token exists, (b) it validates against
 *  /me/api/me. Re-runs on storage events so picking up the SSO callback also
 *  triggers a refresh. */
export async function mountUserDropdown(): Promise<void> {
  if (typeof document === 'undefined') return;
  const container = findHostContainer();
  if (!container) return;

  // Remove any prior instance — happens after sign-out reload.
  document.getElementById('cr-user-dropdown')?.remove();

  const token = readToken();
  if (!token) return;

  // Validate the token. If it's stale/wrong, drop it silently.
  const me = await fetchMe(token);
  if (!me) { clearSession(); return; }

  // Build host, insert at the start of the header actions row so it sits
  // before the donate / theme picker buttons.
  const host = document.createElement('div');
  host.id = 'cr-user-dropdown';
  container.insertBefore(host, container.firstChild);

  const username = readName() || `acct-${me.accountId}`;
  mountAt(host, username, me.roles, me.realm);
}
