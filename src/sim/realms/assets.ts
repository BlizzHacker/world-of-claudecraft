// Per-realm asset manifest loader. Fetched lazily — the upstream renderer's
// own asset preload pipeline still owns the base content; this only loads
// the additional realm-themed GLBs the build script copied into
// `public/cr-realms/<realm>/manifest.json`.
//
// Consumers (a future renderer hook) call `getRealmAssetManifest('infernal')`
// to get a list of `{name, url, animated}` entries they can pass to the
// existing GLB loader. The manifest is cached per-realm so switching realms
// in the picker doesn't refetch.

import type { RealmId } from './types';

export interface RealmAssetEntry {
  name: string;
  url: string;
  size: number;
  animated: boolean;
  source?: 'local-folder' | 'meshy-api';
  sourceName: string;
  sourceRelative?: string;
  kind?: 'character' | 'vehicle' | 'prop';
  meshCount?: number;
  materialCount?: number;
  textureCount?: number;
  skinned?: boolean;
  animationNames?: string[];
  forgedKey?: string;
  forgedUrl?: string;
  license?: string;
  author?: string;
  action?: string;
}

export interface RealmAssetManifest {
  realmId: RealmId;
  name?: string;
  generatedAt: string;
  forgedGroup?: string;
  assets: RealmAssetEntry[];
}

const cache = new Map<RealmId, RealmAssetManifest>();

export async function getRealmAssetManifest(id: RealmId): Promise<RealmAssetManifest> {
  const cached = cache.get(id);
  if (cached) return cached;
  const res = await fetch(`/cr-realms/${id}/manifest.json`, { credentials: 'same-origin' });
  if (!res.ok) {
    const empty: RealmAssetManifest = { realmId: id, generatedAt: '', assets: [] };
    cache.set(id, empty);
    return empty;
  }
  const m = (await res.json()) as RealmAssetManifest;
  cache.set(id, m);
  return m;
}

/** True when the realm advertises at least one extra GLB beyond the upstream
 *  base pipeline — useful as a feature gate for the renderer's preload step. */
export async function realmHasAssets(id: RealmId): Promise<boolean> {
  const m = await getRealmAssetManifest(id);
  return m.assets.length > 0;
}
