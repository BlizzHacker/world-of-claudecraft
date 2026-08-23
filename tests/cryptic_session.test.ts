// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearCrypticSession,
  readCrypticSession,
  writeCrypticSession,
} from '../src/ui/cryptic/session';

describe('Cryptic Realm saved session', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearCrypticSession();
  });

  it('round-trips the game bearer token used after Authentik callback', () => {
    const token = 'a'.repeat(64);

    writeCrypticSession({ token, username: 'moveweight' });

    expect(readCrypticSession()).toEqual({ token, username: 'moveweight' });
    expect(JSON.parse(window.localStorage.getItem('woc_session') ?? '{}')).toEqual({
      token,
      username: 'moveweight',
    });
  });

  it('resumes from moderator/admin token aliases used by dashboard flows', () => {
    window.localStorage.setItem('cryptic-realm_admin_token', 'c'.repeat(64));
    window.localStorage.setItem('cryptic-realm_admin_name', 'moveweight');

    expect(readCrypticSession()).toEqual({ token: 'c'.repeat(64), username: 'moveweight' });
  });

  it('broadcasts session changes so loaded menus refresh their auth state', () => {
    const changes: string[] = [];
    window.addEventListener('cr-session-change', () => changes.push('changed'));

    writeCrypticSession({ token: 'a'.repeat(64), username: 'moveweight' });
    clearCrypticSession();

    expect(changes).toEqual(['changed', 'changed']);
  });

  it('rejects malformed saved tokens instead of resuming a broken login state', () => {
    window.localStorage.setItem('cryptic-realm_user_token', 'not-a-token');
    window.localStorage.setItem('cryptic-realm_user_name', 'moveweight');

    expect(readCrypticSession()).toBeNull();
  });

  it('clears all user, moderator, and admin token aliases on sign out or stale auth', () => {
    window.localStorage.setItem('cryptic-realm_user_token', 'a'.repeat(64));
    window.localStorage.setItem('cryptic-realm_mod_token', 'b'.repeat(64));
    window.localStorage.setItem('cryptic-realm_admin_token', 'c'.repeat(64));
    window.localStorage.setItem('cryptic-realm_user_name', 'player');
    window.localStorage.setItem('cryptic-realm_mod_name', 'mod');
    window.localStorage.setItem('cryptic-realm_admin_name', 'admin');

    clearCrypticSession();

    expect(window.localStorage.getItem('cryptic-realm_user_token')).toBeNull();
    expect(window.localStorage.getItem('cryptic-realm_mod_token')).toBeNull();
    expect(window.localStorage.getItem('cryptic-realm_admin_token')).toBeNull();
    expect(window.localStorage.getItem('cryptic-realm_user_name')).toBeNull();
    expect(window.localStorage.getItem('cryptic-realm_mod_name')).toBeNull();
    expect(window.localStorage.getItem('cryptic-realm_admin_name')).toBeNull();
    expect(window.localStorage.getItem('woc_session')).toBeNull();
  });
});

// The Facebook Instant Games bundle runs the client in an IFRAME on an
// fbsbx.com origin, so every storage access there is third-party. A browser
// that blocks (rather than partitions) third-party storage does not merely
// return null: `window.localStorage` becomes an accessor that THROWS on the
// reference itself, and `typeof localStorage` does not protect a throwing
// accessor. readCrypticSession() is on the start-screen wiring path
// (src/main.ts applyServerMode reads it to label the Play button), so a throw
// here took the whole world selector down with it and the container never
// reached an interactive screen.
describe('saved session under blocked third-party storage (Facebook container)', () => {
  const blockStorage = (): void => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('access denied');
      },
    });
  };

  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    clearCrypticSession();
  });

  it('reads without throwing when the localStorage global itself throws', () => {
    blockStorage();
    expect(() => readCrypticSession()).not.toThrow();
    expect(readCrypticSession()).toBeNull();
  });

  it('writes and clears without throwing when the global itself throws', () => {
    blockStorage();
    expect(() => writeCrypticSession({ token: 'a'.repeat(64), username: 'player' })).not.toThrow();
    expect(() => clearCrypticSession()).not.toThrow();
  });

  it('keeps the signed-in session readable for the rest of the page life', () => {
    // Nothing can be persisted, so the token would be lost the moment any
    // consumer re-read it (the header dropdown, the bug reporter, the resume
    // path) and the player would look signed out one frame after signing in.
    blockStorage();
    writeCrypticSession({ token: 'b'.repeat(64), username: 'player' });
    expect(readCrypticSession()).toEqual({ token: 'b'.repeat(64), username: 'player' });
  });

  it('forgets the in-memory session on sign out', () => {
    blockStorage();
    writeCrypticSession({ token: 'b'.repeat(64), username: 'player' });
    clearCrypticSession();
    expect(readCrypticSession()).toBeNull();
  });
});
