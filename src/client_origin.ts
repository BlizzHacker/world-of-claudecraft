// Shared browser/native URL policy for public assets and REST calls. This stays
// independent of the online world client so presentation modules can use the
// configured Capacitor production origin without importing net/.

import { isDesktopAppRuntime, normalizeOrigin, runtimeApiOrigin } from './runtime';

export const NATIVE_APP = String(import.meta.env.VITE_NATIVE_APP ?? '') === '1';
// Runtime safety net for the packaged console client (the Xbox WebView2 shell
// serves the client from https://app.local, which has no game server): when the
// build was made WITHOUT a VITE_API_ORIGIN, fall back to the production origin
// instead of location.host, so REST and the world socket still reach the game.
// A build that sets VITE_API_ORIGIN keeps full control.
const PACKAGED_APP_LOCAL =
  typeof location !== 'undefined' && location.hostname === 'app.local';
export const NATIVE_API_ORIGIN =
  normalizeOrigin(String(import.meta.env.VITE_API_ORIGIN ?? '')) ||
  (PACKAGED_APP_LOCAL ? 'https://crypticrealm.com' : '');
export const DESKTOP_APP = isDesktopAppRuntime();
export const DESKTOP_API_ORIGIN = DESKTOP_APP ? runtimeApiOrigin() : '';

// The Xbox/console shell serves the packaged client from https://app.local,
// which is only a file host: there is no server there. VITE_API_ORIGIN is the
// intended way to point the packaged build at the real site (build:native), but
// a dist built without it ships NATIVE_API_ORIGIN empty, the base falls back to
// location.host (app.local), and every REST/WebSocket call fails with
// "Connection to the server was lost." Detecting the packaged host at runtime
// makes the online path work regardless of how the dist was built. Offline play
// never opens a socket, so it is unaffected; on the website location.hostname is
// the real site and this stays empty.
const PACKAGED_APP_HOST = 'app.local';
export const PACKAGED_API_ORIGIN =
  typeof location !== 'undefined' && location.hostname === PACKAGED_APP_HOST
    ? 'https://crypticrealm.com'
    : '';

export function apiUrl(path: string, base = ''): string {
  if (/^https?:\/\//.test(path)) return path;
  const origin =
    normalizeOrigin(base) || NATIVE_API_ORIGIN || DESKTOP_API_ORIGIN || PACKAGED_API_ORIGIN;
  return origin ? `${origin}${path}` : path;
}
