// Which sign-in methods a client context can actually complete.
//
// The Facebook Instant Games bundle (docs/facebook-release.md) runs the real
// client in an IFRAME on an fbsbx.com origin inside Facebook's own page. The one
// channel the platform blesses is connect-src: fetch, XHR, and WebSockets to our
// own backend. Every REDIRECT-based sign-in needs the opposite of that, a
// full-page navigation off the container to an identity provider and back:
//
//   - Discord   startDiscordOAuth('login') sets window.location.href to
//               discord.com (src/main.ts). Navigating the frame lands on
//               Discord's own X-Frame-Options refusal, and Facebook's container
//               CSP (frame-src 'self' <app>.apps.fbsbx.com blob:) refuses it
//               even before that. This is the SAME wall that killed the earlier
//               thin-shell bundle which tried to frame crypticrealm.com.
//   - Authentik the #btn-login-sso navigation to /api/oauth/authentik, which
//               302s off-origin to Authentik and then to Google/Facebook/Plex.
//   - Apple     the native Sign in with Apple sheet, which needs the iOS shell.
//
// None of them can return a token to the bundle page, so offering them there is
// a dead button, not a degraded one. They are hidden in the container and the
// email/password form (plain REST over connect-src, which the fbsbx origin is
// admitted for: server/fb_origins.ts) is the path that is left, which is exactly
// the login path docs/facebook-release.md names for the first review pass.
//
// Pure and DOM-free on purpose: src/main.ts is a thin consumer that asks this
// module per button instead of spelling a FACEBOOK_APP condition three times.

/** A sign-in surface the login panel can offer. */
export type SignInMethod = 'password' | 'discord' | 'authentikSso' | 'apple';

/** The sign-in methods that complete through a full-page redirect off the page
 *  origin, so none of them can run inside the Facebook container. */
export const REDIRECT_SIGN_IN_METHODS: readonly SignInMethod[] = [
  'discord',
  'authentikSso',
  'apple',
];

export interface SignInContext {
  /** Inside the Facebook Instant Games container (src/game/facebook_context.ts). */
  facebookApp: boolean;
}

/** True when `method` can actually complete in this client context. */
export function isSignInMethodAvailable(method: SignInMethod, ctx: SignInContext): boolean {
  if (!ctx.facebookApp) return true;
  return !REDIRECT_SIGN_IN_METHODS.includes(method);
}

/** True when at least one sign-in method still works, so hiding the redirect
 *  buttons can never leave the player facing a login panel with no way in. */
export function hasWorkingSignInMethod(ctx: SignInContext): boolean {
  return isSignInMethodAvailable('password', ctx);
}
