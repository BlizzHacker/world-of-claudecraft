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
});
