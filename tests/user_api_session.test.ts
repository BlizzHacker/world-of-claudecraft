// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, getToken, getUserName, userLogin } from '../src/user/api';

describe('user API session bridge', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('uses the shared Cryptic session aliases for logged-in dashboard/admin users', () => {
    window.localStorage.setItem('cryptic-realm_admin_token', 'c'.repeat(64));
    window.localStorage.setItem('cryptic-realm_admin_name', 'moveweight');

    expect(getToken()).toBe('c'.repeat(64));
    expect(getUserName()).toBe('moveweight');
  });

  it('writes and clears through the shared session helper', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      success: true,
      data: {
        token: 'a'.repeat(64),
        username: 'moveweight',
        roles: { isAdmin: true, isModerator: false },
      },
      error: null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));

    await userLogin('moveweight', 'secret');

    expect(getToken()).toBe('a'.repeat(64));
    expect(window.localStorage.getItem('cryptic-realm_user_name')).toBe('moveweight');

    window.localStorage.setItem('cryptic-realm_mod_token', 'b'.repeat(64));
    clearSession();

    expect(getToken()).toBeNull();
    expect(window.localStorage.getItem('cryptic-realm_mod_token')).toBeNull();
  });
});
