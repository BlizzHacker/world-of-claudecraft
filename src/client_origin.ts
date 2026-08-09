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

export function apiUrl(path: string, base = ''): string {
  if (/^https?:\/\//.test(path)) return path;
  const origin = normalizeOrigin(base) || NATIVE_API_ORIGIN || DESKTOP_API_ORIGIN;
  return origin ? `${origin}${path}` : path;
}
