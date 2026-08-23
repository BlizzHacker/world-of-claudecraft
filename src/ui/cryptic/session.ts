// The signed-in bearer token the dashboards, the header dropdown, and the game
// client all resume from.
//
// STORAGE IS NOT GUARANTEED HERE. The Facebook Instant Games bundle runs this
// client in an IFRAME on an fbsbx.com origin, so every access is third-party: a
// browser that partitions third-party storage gives us a private, per-top-site
// box (fine, just empty across contexts), and a browser that BLOCKS it makes
// `window.localStorage` an accessor that throws on the reference itself. A
// `typeof localStorage` probe does not protect a throwing accessor, which is
// why every read goes through safeLocalStorage() (src/ui/safe_local_storage.ts),
// the one sanctioned wrapper for that probe. This module is on the start-screen
// wiring path (src/main.ts applyServerMode labels the Play button from
// readCrypticSession), so a throw here does not degrade one feature, it takes
// the whole world selector down and the container never reaches an interactive
// screen.
//
// When nothing can be persisted the session still has to work for the rest of
// the page life, so writes also land in a module-scope mirror the reads fall
// back to. Memory only: it dies with the page, it is never a second source of
// truth for anyone else, and it widens nothing (the server re-validates every
// token on use).
import { safeLocalStorage } from '../safe_local_storage';

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

/** The last session written this page life, kept so a storage-blocked context
 *  (see the header) still reports the player as signed in. */
let memorySession: CrypticSession | null = null;

function announceSessionChange(): void {
  try {
    window.dispatchEvent(new CustomEvent('cr-session-change'));
  } catch {
    // Non-browser tests / locked-down webviews.
  }
}

export function readCrypticSession(): CrypticSession | null {
  const store = safeLocalStorage();
  let token = '';
  try {
    for (const key of USER_TOKEN_KEYS) {
      token = store?.getItem(key) ?? '';
      if (token) break;
    }
  } catch {
    token = '';
  }
  if (!/^[a-f0-9]{64}$/.test(token)) return memorySession;

  let username = '';
  try {
    for (const key of USER_NAME_KEYS) {
      username = store?.getItem(key) ?? '';
      if (username) break;
    }
  } catch {
    username = '';
  }
  return { token, username };
}

export function writeCrypticSession(session: CrypticSession): void {
  memorySession = { token: session.token, username: session.username };
  const store = safeLocalStorage();
  try {
    store?.setItem(USER_TOKEN_KEYS[0], session.token);
    store?.setItem(USER_NAME_KEYS[0], session.username);
    store?.setItem(WOC_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage can fail in strict/private contexts; auth still works in memory.
  }
  announceSessionChange();
}

export function clearCrypticSession(): void {
  memorySession = null;
  const store = safeLocalStorage();
  try {
    for (const key of USER_TOKEN_KEYS) store?.removeItem(key);
    for (const key of USER_NAME_KEYS) store?.removeItem(key);
    store?.removeItem(WOC_SESSION_KEY);
  } catch {
    // Best effort.
  }
  announceSessionChange();
}
