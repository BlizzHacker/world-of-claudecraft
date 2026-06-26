// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { clearCrypticSession, readCrypticSession, writeCrypticSession } from '../src/ui/cryptic/session';

describe('Cryptic Realm saved session', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips the game bearer token used after Authentik callback', () => {
    const token = 'a'.repeat(64);

    writeCrypticSession({ token, username: 'moveweight' });

    expect(readCrypticSession()).toEqual({ token, username: 'moveweight' });
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
  });
});
