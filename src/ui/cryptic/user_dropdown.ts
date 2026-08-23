// Logged-in user dropdown for the homepage header. Sits in the same row as
// the realm picker. Shows the username + a popover menu with:
//   - My Account → /me/
//   - Moderator Tools → /mod/  (only when is_moderator OR is_admin)
//   - Admin → /admin/          (only when is_admin)
//   - Sign out (clears the local Bearer token + reloads)
//
// Detects login by reading the same Bearer token the user dashboard writes
// to localStorage. If no token is stored, the dropdown stays hidden. If a
// token exists, render the saved username immediately. /me/api/me enriches the
// menu with roles/realm when available, but a transient 401 on a realm host must
// not erase an otherwise valid game session.

import { clearCrypticSession, readCrypticSession } from './session';

interface MeRoles { isAdmin: boolean; isModerator: boolean; }
interface MeResponse {
  accountId: number;
  realm: string;
  roles: MeRoles;
  characters: { id: number; name: string; class: string; level: number; realm: string; lifetimeXp: number; }[];
}

function readToken(): string | null {
  return readCrypticSession()?.token ?? null;
}

function readName(): string {
  return readCrypticSession()?.username ?? '';
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
  // Admin link lives in the homepage nav bar already (see ensureNavAdminLink),
  // so omit it from the dropdown to avoid the redundant double-Admin chip.
  const modItem = roles.isModerator && !roles.isAdmin
    ? `<a class="cr-user-menu-item" href="/mod/">
         <span class="cr-menu-icon">⛨</span>
         <span>Moderator Tools</span>
       </a>`
    : '';
  const adminItem = '';
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
      clearCrypticSession();
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
// Mount lock — prevents the race where boot() and the SSO callback pickup
// both call mountUserDropdown() concurrently and each insert a chip. The
// async fetchMe() gap is wide enough that both passed the !host check.
let mountInFlight: Promise<void> | null = null;

export async function mountUserDropdown(): Promise<void> {
  if (typeof document === 'undefined') return;
  if (mountInFlight) return mountInFlight;

  mountInFlight = (async () => {
    const container = findHostContainer();
    if (!container) return;

    const token = readToken();
    if (!token) {
      // Logged out: tear down any chip left over from a previous session.
      document.getElementById('cr-user-dropdown')?.remove();
      removeNavAdminLink();
      delete (window as unknown as { __crMeRoles?: MeRoles }).__crMeRoles;
      return;
    }

    const me = await fetchMe(token);
    const fallbackName = readName();
    if (!me && !fallbackName) return;

    // Replace any prior instance — happens after sign-out reload or after
    // a second call. Doing the remove AFTER the await so concurrent calls
    // collapse to one chip.
    document.getElementById('cr-user-dropdown')?.remove();

    const host = document.createElement('div');
    host.id = 'cr-user-dropdown';
    container.insertBefore(host, container.firstChild);

    const username = fallbackName || `acct-${me?.accountId ?? ''}`.replace(/-$/, '');
    (window as unknown as { __crMeRoles?: MeRoles }).__crMeRoles = me?.roles ?? {
      isAdmin: false,
      isModerator: false,
    };
    mountAt(
      host,
      username,
      me?.roles ?? { isAdmin: false, isModerator: false },
      me?.realm ?? 'Cryptic Realm',
    );

    // Add an "Admin" nav link in the homepage nav bar when the user is an
    // admin: a quick jump to /admin/ without going through the dropdown menu.
    if (me?.roles.isAdmin) ensureNavAdminLink();
    else removeNavAdminLink();
  })();

  try { await mountInFlight; }
  finally { mountInFlight = null; }
}

// Inject / remove a stand-alone "Admin" link in the homepage nav bar (the
// <ul> that holds High Scores / Wiki / News / Download / Login). Only
// rendered when roles.isAdmin.
const NAV_ADMIN_ID = 'nav-btn-admin';

function ensureNavAdminLink(): void {
  if (document.getElementById(NAV_ADMIN_ID)) return;
  // Sit just before the Login/Register tab if present, else at end.
  const loginBtn = document.getElementById('nav-btn-login');
  const navList = loginBtn?.closest('ul') ?? document.querySelector('nav ul');
  if (!navList) return;
  // The shared nav (public/nav.js) may already ship its own Admin entry;
  // injecting a second one duplicated the tab. Bail when ANY /admin link is
  // already in the nav list.
  if (navList.querySelector('a[href="/admin"], a[href^="/admin/"]')) return;
  const li = document.createElement('li');
  li.className = 'nav-item';
  li.id = `${NAV_ADMIN_ID}-li`;
  // Use a <button> so it shares the exact .nav-link box model / baseline as its
  // siblings (an <a> sat a couple px lower than the button tabs). Navigates on click.
  const a = document.createElement('button');
  a.type = 'button';
  a.className = 'nav-link';
  a.id = NAV_ADMIN_ID;
  a.textContent = 'Admin';
  a.title = 'Open Admin dashboard';
  a.addEventListener('click', () => { window.location.href = '/admin/'; });
  li.appendChild(a);
  if (loginBtn?.parentElement) {
    navList.insertBefore(li, loginBtn.parentElement);
  } else {
    navList.appendChild(li);
  }
}

function removeNavAdminLink(): void {
  document.getElementById(`${NAV_ADMIN_ID}-li`)?.remove();
}
