// Assets exposed by the shared ArcForge library. The id encodes the immutable
// byte route, so saved maps remain renderable before the browsing registry has
// loaded; the registry only supplies labels and filtering metadata.

export const LIBRARY_ASSET_PREFIX = 'library/';
const LIBRARY_ASSET_RE = /^library\/([a-z0-9][a-z0-9_-]{0,31})\/([a-f0-9]{24})$/;

export interface LibraryAssetEntry {
  assetId: string;
  name: string;
  url: string;
  group: string;
  realmId: string;
  source: 'library' | 'realm' | 'forged';
  kind: 'character' | 'prop' | 'vehicle';
  byteSize: number;
  animated: boolean;
  skinned: boolean;
}

const registry = new Map<string, LibraryAssetEntry>();

export function isLibraryAssetId(assetId: string): boolean {
  return LIBRARY_ASSET_RE.test(assetId);
}

export function libraryAssetPath(assetId: string): string | null {
  const match = LIBRARY_ASSET_RE.exec(assetId);
  return match ? `/asset-library/${match[1]}/${match[2]}.glb` : null;
}

export function registerLibraryAssets(entries: readonly LibraryAssetEntry[]): void {
  for (const entry of entries) {
    if (!isLibraryAssetId(entry.assetId)) continue;
    registry.set(entry.assetId, { ...entry, url: libraryAssetPath(entry.assetId)! });
  }
}

export function clearLibraryAssets(): void {
  registry.clear();
}

export function listLibraryAssets(): LibraryAssetEntry[] {
  return [...registry.values()];
}

export function libraryAssetLabel(assetId: string): string {
  return registry.get(assetId)?.name ?? assetId.split('/').at(-1)?.slice(0, 8) ?? assetId;
}
