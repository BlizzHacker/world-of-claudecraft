// The Facebook Instant Games container can only reach our backend over
// connect-src (fetch / XHR / WebSocket). Every redirect-based sign-in needs a
// full-page navigation off the fbsbx.com origin to an identity provider, which
// Facebook's own container CSP and the provider's framing refusal both block, so
// offering one there is a dead button. This pins the decision (the module) and
// that src/main.ts actually asks it per button (the wiring), because the defect
// is silent: the button renders, the player taps it, and nothing happens.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  hasWorkingSignInMethod,
  isSignInMethodAvailable,
  REDIRECT_SIGN_IN_METHODS,
  type SignInMethod,
} from '../src/game/facebook_login_gates';

const ALL_METHODS: readonly SignInMethod[] = ['password', 'discord', 'authentikSso', 'apple'];
const read = (rel: string): string =>
  readFileSync(resolve(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

describe('sign-in methods inside the Facebook Instant Games container', () => {
  it('offers every method on the ordinary web, native, and desktop clients', () => {
    for (const method of ALL_METHODS) {
      expect(isSignInMethodAvailable(method, { facebookApp: false })).toBe(true);
    }
  });

  it('hides every redirect-based method in the container', () => {
    for (const method of REDIRECT_SIGN_IN_METHODS) {
      expect(isSignInMethodAvailable(method, { facebookApp: true })).toBe(false);
    }
  });

  it('names Discord, Authentik SSO, and Apple as the redirect methods', () => {
    // A new redirect provider that skips this list ships a dead button, so the
    // membership is pinned rather than left to the call site.
    expect([...REDIRECT_SIGN_IN_METHODS].sort()).toEqual(['apple', 'authentikSso', 'discord']);
  });

  it('keeps the email and password form, which rides connect-src like every other call', () => {
    expect(isSignInMethodAvailable('password', { facebookApp: true })).toBe(true);
  });

  it('never leaves the container with no way in at all', () => {
    expect(hasWorkingSignInMethod({ facebookApp: true })).toBe(true);
    expect(hasWorkingSignInMethod({ facebookApp: false })).toBe(true);
  });
});

describe('login panel wiring consults the container gate', () => {
  const main = read('src/main.ts');

  it('gates the Discord login button and its divider', () => {
    expect(main).toContain("isSignInMethodAvailable('discord', { facebookApp: FACEBOOK_APP })");
    const discordWiring = main.slice(
      main.indexOf("const discordLoginBtn = $('#btn-login-discord')"),
      main.indexOf("const ssoLoginBtn = $('#btn-login-sso')"),
    );
    // The "or use email" divider only makes sense above an alternative; with
    // every alternative hidden it would caption an empty band.
    expect(discordWiring).toContain('discordLoginAvailable');
    expect(discordWiring).not.toContain('if (discordLoginBtn && DISCORD_BUILD_ENABLED) {');
  });

  it('gates the Authentik SSO button', () => {
    expect(main).toContain(
      "isSignInMethodAvailable('authentikSso', { facebookApp: FACEBOOK_APP })",
    );
  });

  it('gates the native Apple button', () => {
    expect(main).toContain("isSignInMethodAvailable('apple', { facebookApp: FACEBOOK_APP })");
  });

  it('imports the gate rather than re-spelling the FACEBOOK_APP condition per button', () => {
    expect(main).toContain("from './game/facebook_login_gates'");
  });
});

describe('the entry the Facebook bundle is built from', () => {
  // scripts/build_facebook_bundle.mjs packages the play entry, so this markup IS
  // the container's login screen.
  const play = read('play.html');

  it('ships the Discord CTA hidden, so an ungated frame never flashes it', () => {
    // The gate leaves the button alone when it is unavailable rather than
    // writing hidden=true, which is only safe while the markup default holds.
    const cta = play.slice(play.indexOf('id="btn-login-discord"'));
    expect(play).toContain('id="btn-login-discord"');
    expect(cta.slice(0, cta.indexOf('>'))).toContain('hidden');
    expect(play).toContain('id="auth-or-divider" class="auth-or" hidden');
  });

  it('keeps the email and password path the container actually uses', () => {
    expect(play).toContain('id="login-user"');
    expect(play).toContain('id="login-pass"');
    expect(play).toContain('id="btn-login"');
  });
});
