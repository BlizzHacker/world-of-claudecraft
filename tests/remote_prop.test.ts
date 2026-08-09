import { describe, expect, it } from 'vitest';
import { remotePropRef } from '../src/render/remote_prop';

describe('remote ArcForge prop references', () => {
  it('resolves forged and unified library keys to traversal-safe public URLs', () => {
    expect(remotePropRef('forged:infernal/dark_paladin')).toEqual({
      cacheKey: 'forged:infernal/dark_paladin',
      url: '/forged/infernal/dark_paladin.glb',
    });
    expect(remotePropRef('library:piktura/0123456789abcdef01234567')).toEqual({
      cacheKey: 'library:piktura/0123456789abcdef01234567',
      url: '/asset-library/piktura/0123456789abcdef01234567.glb',
    });
    expect(remotePropRef('library:../0123456789abcdef01234567')).toBeNull();
    expect(remotePropRef('forged:../../escape')).toBeNull();
    expect(remotePropRef('well')).toBeNull();
  });

  it('resolves realm-store props to the same /cr-realms path the store serves', () => {
    expect(remotePropRef('realm:classic/buildings/abandoned_manor_019a5964')).toEqual({
      cacheKey: 'realm:classic/buildings/abandoned_manor_019a5964',
      url: '/cr-realms/classic/buildings/abandoned_manor_019a5964.glb',
    });
    expect(remotePropRef('realm:arcadevoid/ships/alien_voyager_019ab785')).toEqual({
      cacheKey: 'realm:arcadevoid/ships/alien_voyager_019ab785',
      url: '/cr-realms/arcadevoid/ships/alien_voyager_019ab785.glb',
    });
  });

  it('refuses a realm key that could escape the store or name a stray directory', () => {
    expect(remotePropRef('realm:classic/../secret/x')).toBeNull();
    expect(remotePropRef('realm:classic/buildings/../../secret')).toBeNull();
    expect(remotePropRef('realm:classic/review/data_classic')).toBeNull();
    expect(remotePropRef('realm:CLASSIC/props/x')).toBeNull();
    expect(remotePropRef('realm:classic/props/a/b')).toBeNull();
  });
});
