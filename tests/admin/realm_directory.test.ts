// Pure realm-directory helpers behind the admin shell's realm badge and
// switcher (src/admin/realm_directory.ts): defensive /api/realms parsing, the
// per-realm admin URL, and the switcher rows that exclude the current realm.

import { describe, expect, it } from 'vitest';
import {
  parseRealmDirectory,
  realmAdminUrl,
  switchableRealms,
} from '../../src/admin/realm_directory';

describe('parseRealmDirectory', () => {
  it('parses the /api/realms body shape', () => {
    const dir = parseRealmDirectory({
      current: 'Claudemoon',
      realms: [
        { name: 'Claudemoon', url: 'https://crypticrealm.com', type: 'Normal' },
        { name: 'Arcane Nexus', url: 'https://arcane.crypticrealm.com', type: 'PvP' },
      ],
      characters: { Claudemoon: 3 },
    });
    expect(dir.current).toBe('Claudemoon');
    expect(dir.realms).toHaveLength(2);
    expect(dir.realms[1]).toEqual({
      name: 'Arcane Nexus',
      url: 'https://arcane.crypticrealm.com',
      type: 'PvP',
    });
  });

  it('collapses malformed bodies to an empty directory instead of throwing', () => {
    expect(parseRealmDirectory(null)).toEqual({ current: '', realms: [] });
    expect(parseRealmDirectory('nope')).toEqual({ current: '', realms: [] });
    expect(parseRealmDirectory({ current: 7, realms: [{ url: 1 }, null, { name: '' }] })).toEqual({
      current: '',
      realms: [],
    });
  });
});

describe('realmAdminUrl', () => {
  it('appends /admin/ to the realm origin, tolerating trailing slashes', () => {
    expect(realmAdminUrl({ name: 'A', url: 'https://a.crypticrealm.com', type: '' })).toBe(
      'https://a.crypticrealm.com/admin/',
    );
    expect(realmAdminUrl({ name: 'A', url: 'https://a.crypticrealm.com/', type: '' })).toBe(
      'https://a.crypticrealm.com/admin/',
    );
  });

  it('returns null for an entry with no public origin', () => {
    expect(realmAdminUrl({ name: 'Dev', url: '', type: '' })).toBeNull();
  });
});

describe('switchableRealms', () => {
  it('lists every other realm with a reachable admin URL', () => {
    const rows = switchableRealms({
      current: 'Claudemoon',
      realms: [
        { name: 'Claudemoon', url: 'https://crypticrealm.com', type: 'Normal' },
        { name: 'Arcane Nexus', url: 'https://arcane.crypticrealm.com', type: 'PvP' },
        { name: 'LocalOnly', url: '', type: 'Normal' },
      ],
    });
    expect(rows).toEqual([
      { name: 'Arcane Nexus', adminUrl: 'https://arcane.crypticrealm.com/admin/' },
    ]);
  });
});
