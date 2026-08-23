// Facebook Instant Games container origins (the fbsbx.com sandbox).
//
// The Facebook bundle page runs on a per-app Facebook Web Hosting origin:
// https://shield-apps-<APP_ID>.apps.fbsbx.com for a staged build and
// https://apps-<APP_ID>.apps.fbsbx.com in production (see
// docs/facebook-release.md). Rather than hardcoding the two current hosts, the
// rule is a guarded suffix match: https only, no port, exactly ONE
// [a-z0-9-] label in front of .apps.fbsbx.com. That shape admits any hosting
// origin Facebook mints for the app (staged or production) while rejecting
// look-alikes: https://apps.fbsbx.com.evil.com fails the end anchor,
// https://foo.bar.apps.fbsbx.com fails the single-label rule, and http:// or
// an explicit port fails outright. Auth is a bearer token (no cookies), so
// treating these origins as first-party browser clients is safe, the same
// reasoning as the native and desktop shells in web_login_guard.ts.
//
// This module is the ONE definition of the predicate. Its consumers, so the
// allowance can never drift between lanes: maybeCors (main.ts) and
// allowedCorsOrigin (web_login_guard.ts) for CORS reflection,
// isWebClientRequest (web_login_guard.ts) for the auth-endpoint Origin guard,
// and passesTurnstile (turnstile.ts) for the bot-gate Origin lane. Add a new
// consumer by importing from here, never by re-spelling the regex.
import type { IncomingMessage } from 'node:http';

const FB_INSTANT_ORIGIN = /^https:\/\/[a-z0-9-]+\.apps\.fbsbx\.com$/;

// True when `origin` is a Facebook Instant Games hosting origin. Origin is
// spoofable, so like the desktop origins this is a client CLASS marker (which
// UX/verification path applies), never proof of identity.
export function isFacebookInstantOrigin(origin: unknown): boolean {
  return typeof origin === 'string' && FB_INSTANT_ORIGIN.test(origin);
}

// Request-level helper mirroring isNativeAppRequest / isDesktopAppRequest.
export function isFacebookInstantRequest(req: Pick<IncomingMessage, 'headers'>): boolean {
  return isFacebookInstantOrigin(req.headers.origin);
}
