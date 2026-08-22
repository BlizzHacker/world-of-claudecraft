// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readCrypticSession, writeCrypticSession } from '../src/ui/cryptic/session';
import { mountUserDropdown } from '../src/ui/cryptic/user_dropdown';

describe('Cryptic Realm user dropdown', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="header-actions"></div><ul><li><button id="nav-btn-login">Login/Register</button></li></ul>';
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('keeps the saved game session visible when account metadata is temporarily unavailable', async () => {
    const token = 'a'.repeat(64);
    writeCrypticSession({ token, username: 'MoveWeight' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));

    await mountUserDropdown();

    expect(document.querySelector('#cr-user-dropdown')?.textContent).toContain('MoveWeight');
    expect(readCrypticSession()).toEqual({ token, username: 'MoveWeight' });
    expect(document.getElementById('nav-btn-admin')).toBeNull();
  });

  it('enriches the dropdown with account roles when /me/api/me responds', async () => {
    writeCrypticSession({ token: 'b'.repeat(64), username: 'MoveWeight' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({
        data: {
          accountId: 1,
          realm: 'Arcane Void',
          roles: { isAdmin: true, isModerator: true },
          characters: [],
        },
      }), { status: 200 })),
    );

    await mountUserDropdown();

    expect(document.querySelector('#cr-user-dropdown')?.textContent).toContain('Arcane Void');
    expect(document.getElementById('nav-btn-admin')).not.toBeNull();
  });

  it('does not inject a second Admin tab when the nav already links /admin/', async () => {
    // The shared nav (public/nav.js) can ship its own Admin entry; the
    // dropdown's injector must notice it and bail instead of duplicating.
    document.body.innerHTML =
      '<div class="header-actions"></div>' +
      '<ul><li><a class="nav-link" href="/admin/">Admin</a></li>' +
      '<li><button id="nav-btn-login">Login/Register</button></li></ul>';
    writeCrypticSession({ token: 'c'.repeat(64), username: 'MoveWeight' });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: {
                accountId: 1,
                realm: 'Arcane Void',
                roles: { isAdmin: true, isModerator: true },
                characters: [],
              },
            }),
            { status: 200 },
          ),
      ),
    );

    await mountUserDropdown();

    expect(document.getElementById('nav-btn-admin')).toBeNull();
    expect(document.querySelectorAll('a[href^="/admin"], #nav-btn-admin')).toHaveLength(1);
  });
});
