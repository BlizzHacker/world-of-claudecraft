import { beforeEach, describe, expect, it, vi } from 'vitest';

// The IO surface is mocked so the suite exercises the pure class-to-body
// resolution and the driver's skip/settle behavior without touching the real
// asset cache (whose module import registers boot preloads).
const mocks = vi.hoisted(() => ({
  preloadVisualAssets: vi.fn((_key: string): Promise<void> => Promise.resolve()),
  visualAssetsReady: vi.fn((_key: string): boolean => false),
}));
vi.mock('../src/render/characters/assets', () => ({
  preloadVisualAssets: mocks.preloadVisualAssets,
  visualAssetsReady: mocks.visualAssetsReady,
}));

import { isVisualLazy, VISUALS } from '../src/render/characters/manifest';
import {
  lazyRealmClassVisualKeys,
  preloadRealmClassVisuals,
} from '../src/render/realm_class_preload';
import { ALL_CLASSES } from '../src/sim/types';

beforeEach(() => {
  mocks.preloadVisualAssets.mockClear();
  mocks.preloadVisualAssets.mockImplementation(() => Promise.resolve());
  mocks.visualAssetsReady.mockClear();
  mocks.visualAssetsReady.mockImplementation(() => false);
});

describe('lazyRealmClassVisualKeys', () => {
  it('resolves the crypticrealm pack to registered, deduped, lazy body keys', () => {
    const keys = lazyRealmClassVisualKeys('crypticrealm');
    expect(keys.length).toBeGreaterThan(0);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(VISUALS[key]).toBeDefined();
      expect(isVisualLazy(key)).toBe(true);
    }
    // The compiled pack's warrior body: a lazyPreload realm GLB the boot sweep
    // excludes, exactly the pop-in this preload exists to prevent.
    expect(keys).toContain('realm_crypticrealm_rune_warden');
    // Never wider than one body per class.
    expect(keys.length).toBeLessThanOrEqual(ALL_CLASSES.length);
  });

  it('returns no keys for a realm whose classes resolve to eager rigs', () => {
    // claudecraft has no compiled class pack, so every class falls back to its
    // eagerly loaded player_<cls> rig and there is nothing to fetch.
    expect(lazyRealmClassVisualKeys('claudecraft')).toEqual([]);
  });
});

describe('preloadRealmClassVisuals', () => {
  it('kicks exactly one preload per unresolved lazy key', async () => {
    await preloadRealmClassVisuals('crypticrealm');
    const expected = lazyRealmClassVisualKeys('crypticrealm');
    const requested = mocks.preloadVisualAssets.mock.calls.map(([key]) => key);
    expect([...requested].sort()).toEqual([...expected].sort());
  });

  it('skips keys whose assets are already resident', async () => {
    mocks.visualAssetsReady.mockImplementation(
      (key: string) => key === 'realm_crypticrealm_rune_warden',
    );
    await preloadRealmClassVisuals('crypticrealm');
    const requested = mocks.preloadVisualAssets.mock.calls.map(([key]) => key);
    expect(requested).not.toContain('realm_crypticrealm_rune_warden');
    expect(requested.length).toBe(lazyRealmClassVisualKeys('crypticrealm').length - 1);
  });

  it('resolves even when an individual preload rejects', async () => {
    mocks.preloadVisualAssets.mockImplementation(() => Promise.reject(new Error('offline')));
    await expect(preloadRealmClassVisuals('crypticrealm')).resolves.toBeUndefined();
  });
});
