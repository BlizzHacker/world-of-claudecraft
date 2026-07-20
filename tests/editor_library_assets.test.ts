import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearLibraryAssets,
  libraryAssetLabel,
  libraryAssetPath,
  listLibraryAssets,
  registerLibraryAssets,
} from '../src/editor/library_assets';

describe('editor ArcForge library assets', () => {
  beforeEach(() => clearLibraryAssets());

  it('derives a stable public GLB URL from a valid library id', () => {
    expect(libraryAssetPath('library/piktura/0123456789abcdef01234567')).toBe(
      '/asset-library/piktura/0123456789abcdef01234567.glb',
    );
    expect(libraryAssetPath('library/../0123456789abcdef01234567')).toBeNull();
    expect(libraryAssetPath('props/well')).toBeNull();
  });

  it('keeps fetched labels and metadata in a replaceable session registry', () => {
    registerLibraryAssets([
      {
        assetId: 'library/piktura/0123456789abcdef01234567',
        name: 'Human Paladin',
        group: 'PICKTURA',
        realmId: 'unassigned',
        source: 'library',
        kind: 'character',
        byteSize: 42,
        animated: true,
        skinned: true,
        url: '/ignored-server-url.glb',
      },
    ]);

    expect(listLibraryAssets()).toHaveLength(1);
    expect(libraryAssetLabel('library/piktura/0123456789abcdef01234567')).toBe('Human Paladin');
    expect(libraryAssetLabel('library/piktura/aaaaaaaaaaaaaaaaaaaaaaaa')).toBe('aaaaaaaa');
    clearLibraryAssets();
    expect(listLibraryAssets()).toEqual([]);
  });
});
