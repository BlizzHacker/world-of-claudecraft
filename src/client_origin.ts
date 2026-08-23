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
const PACKAGED_APP_LOCAL = typeof location !== 'undefined' && location.hostname === 'app.local';
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

// Remote public-asset origin for builds whose page is NOT served by the game
// site and ships no public/ tree of its own (the Facebook Instant Games bundle:
// Facebook hosts only the built JS/CSS/HTML, and every model/texture/audio
// file streams from the live site at runtime). Empty everywhere else, so the
// default web, native, and desktop builds keep their page-relative asset URLs.
export const ASSET_ORIGIN = normalizeOrigin(String(import.meta.env.VITE_ASSET_ORIGIN ?? ''));

// The few public assets such a build ships INSIDE its own bundle, as
// { '/url/path.ext': 'bundle-name.ext' }. The Facebook bundle carries the brand
// marks and loading backdrops locally because the container's img-src CSP does
// not allow the game origin, so a remote <img> paints a broken-image glyph and
// a remote CSS background silently fails to paint. Those paths must resolve
// page-relative, never against ASSET_ORIGIN. Empty (and inert) on every other
// build; a malformed value degrades to empty rather than breaking boot.
const LOCAL_ASSET_MAP: Record<string, string> = (() => {
  const raw = String(import.meta.env.VITE_LOCAL_ASSET_MAP ?? '').trim();
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
})();

/** Pure core (tests/client_origin.test.ts): the asset-URL decision, with the
 *  build-time inputs passed in. Order matters: an already-absolute or inline
 *  URL is never touched, a locally-bundled path wins over the remote origin,
 *  and with neither configured this is the identity function. */
export function resolveAssetPath(
  path: string,
  origin: string,
  localMap: Record<string, string>,
): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const local = localMap[path.split('?')[0]];
  if (local) return `./${local}`;
  if (!origin) return path;
  return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`;
}

/** Resolve a public-asset path ('/models/x.glb', '/audio/y.mp3') against the
 *  configured remote asset origin. Absolute and data/blob URLs pass through; a
 *  path the bundle ships locally resolves page-relative; with no
 *  VITE_ASSET_ORIGIN configured this is the identity function. */
export function assetHostUrl(path: string): string {
  return resolveAssetPath(path, ASSET_ORIGIN, LOCAL_ASSET_MAP);
}
