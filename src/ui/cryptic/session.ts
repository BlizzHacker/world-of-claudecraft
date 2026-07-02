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
const WOC_SESSION_KEY = 'woc_session';

export interface CrypticSession {
  token: string;
  username: string;
}

export function readCrypticSession(): CrypticSession | null {
  if (typeof localStorage === 'undefined') return null;
  let token = '';
  try {
    for (const key of USER_TOKEN_KEYS) {
      token = localStorage.getItem(key) ?? '';
      if (token) break;
    }
  } catch {
    return null;
  }
  if (!/^[a-f0-9]{64}$/.test(token)) return null;

  let username = '';
  try {
    for (const key of USER_NAME_KEYS) {
      username = localStorage.getItem(key) ?? '';
      if (username) break;
    }
  } catch {
    username = '';
  }
  return { token, username };
}

export function writeCrypticSession(session: CrypticSession): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(USER_TOKEN_KEYS[0], session.token);
    localStorage.setItem(USER_NAME_KEYS[0], session.username);
    localStorage.setItem(WOC_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage can fail in strict/private contexts; auth still works in memory.
  }
  try {
    window.dispatchEvent(new CustomEvent('cr-session-change'));
  } catch {
    // Non-browser tests / locked-down webviews.
  }
}

export function clearCrypticSession(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    for (const key of USER_TOKEN_KEYS) localStorage.removeItem(key);
    for (const key of USER_NAME_KEYS) localStorage.removeItem(key);
    localStorage.removeItem(WOC_SESSION_KEY);
  } catch {
    // Best effort.
  }
  try {
    window.dispatchEvent(new CustomEvent('cr-session-change'));
  } catch {
    // Non-browser tests / locked-down webviews.
  }
}
