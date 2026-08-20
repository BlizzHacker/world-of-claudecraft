// Client-side cache of the operator's runtime body-asset overrides for the
// current realm, fetched from GET /api/realm-visuals/<realm> (see
// server/realm_visuals.ts). An admin reassigns a class/hero/NPC body in the
// editor; it persists server-side and every client applies it on the next load
// with no code deploy. Purely presentation data: it only names which GLB a
// class/hero/NPC should use, layered over the compiled defaults.

export interface RealmVisualOverrideEntry {
  assetUrl: string;
  assetName?: string;
}

let overridesByRealm: Record<string, Record<string, RealmVisualOverrideEntry>> = {};
const publishedAssetUrlsPromises = new Map<string, Promise<Set<string> | null>>();
const CATALOG_FETCH_TIMEOUT_MS = 2500;
const RUNTIME_ASSET_PATH = /^\/(?:asset-library|forged|models|api\/assets)\/.+\.glb$/;

function localAssetPath(url: string): string | null {
  try {
    const parsed = new URL(url, 'https://crypticrealm.invalid');
    if (parsed.origin !== 'https://crypticrealm.invalid') return null;
    return parsed.pathname;
  } catch {
    return null;
  }
}

/** Drop stale editor rows whose GLB is not part of the build's published asset
 * catalog. A v0.35 merge preserved database overrides for old `realm_*` files
 * while removing those files from `/cr-realms`; the creator then held its
 * KayKit loading stand-in forever. Cross-realm assignments remain valid because
 * this checks the complete catalog, not only the active realm's manifest. */
export function publishedRealmVisualOverrides(
  overrides: Record<string, RealmVisualOverrideEntry>,
  publishedUrls: ReadonlySet<string>,
): Record<string, RealmVisualOverrideEntry> {
  return Object.fromEntries(
    Object.entries(overrides).filter(([, entry]) => {
      const path = localAssetPath(entry.assetUrl);
      if (path === null) return false;
      if (RUNTIME_ASSET_PATH.test(path)) return true;
      return path.startsWith('/cr-realms/') && publishedUrls.has(path);
    }),
  );
}

async function fetchCatalogJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CATALOG_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`asset manifest unavailable: ${url}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function catalogRealmsForOverrides(overrides: Record<string, RealmVisualOverrideEntry>): string[] {
  const realms = new Set<string>();
  for (const entry of Object.values(overrides)) {
    const path = localAssetPath(entry.assetUrl);
    const match = path?.match(/^\/cr-realms\/([a-z0-9][a-z0-9_-]{0,31})\//);
    if (match) realms.add(match[1]);
  }
  return [...realms].sort();
}

async function loadPublishedAssetUrls(
  overrides: Record<string, RealmVisualOverrideEntry>,
): Promise<Set<string> | null> {
  const realms = catalogRealmsForOverrides(overrides);
  if (realms.length === 0) return new Set();
  const cacheKey = realms.join(',');
  const cached = publishedAssetUrlsPromises.get(cacheKey);
  if (cached) return cached;
  const promise = (async () => {
    try {
      const manifests = await Promise.all(
        realms.map(
          async (realm) =>
            (await fetchCatalogJson(`/cr-realms/${realm}/manifest.json`)) as {
              assets?: readonly { url?: string; forgedUrl?: string }[];
            },
        ),
      );
      const published = new Set<string>();
      for (const manifest of manifests) {
        for (const asset of manifest.assets ?? []) {
          for (const url of [asset.url, asset.forgedUrl]) {
            if (typeof url !== 'string') continue;
            const path = localAssetPath(url);
            if (path) published.add(path);
          }
        }
      }
      return published;
    } catch {
      // Catalog validation is a safety net, not a new availability dependency.
      // If a relevant catalog cannot be read, fail closed for /cr-realms rows;
      // compiled bodies remain usable and dynamic editor URLs stay valid.
      return null;
    }
  })();
  publishedAssetUrlsPromises.set(cacheKey, promise);
  const result = await promise;
  if (result === null) publishedAssetUrlsPromises.delete(cacheKey);
  return result;
}

/** Replace the override set for one realm (called after a fetch). */
export function setRealmVisualOverrides(
  realm: string,
  overrides: Record<string, RealmVisualOverrideEntry> | null | undefined,
): void {
  overridesByRealm[realm] = overrides ?? {};
}

/** The override for one key (e.g. `hero:Amazon`, `class:warrior`, `npc:the_merchant`), or null. */
export function realmVisualOverride(realm: string, key: string): RealmVisualOverrideEntry | null {
  return overridesByRealm[realm]?.[key] ?? null;
}

/** The first override that matches any of the given keys, in order, or null. */
export function firstRealmVisualOverride(
  realm: string,
  keys: readonly string[],
): RealmVisualOverrideEntry | null {
  for (const key of keys) {
    const hit = overridesByRealm[realm]?.[key];
    if (hit) return hit;
  }
  return null;
}

export function clearRealmVisualOverrides(): void {
  overridesByRealm = {};
  publishedAssetUrlsPromises.clear();
}

/** The full override map for a realm (for pushing into the in-world renderer). */
export function getRealmVisualOverrides(realm: string): Record<string, RealmVisualOverrideEntry> {
  return overridesByRealm[realm] ?? {};
}

/**
 * Fetch the override set for a realm and cache it. Best-effort: any failure
 * leaves the compiled defaults in place. Returns true if it loaded a document.
 */
const CACHE_PREFIX = 'cr_realm_visuals:';

function readCachedOverrides(realm: string): Record<string, RealmVisualOverrideEntry> | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + realm);
    return raw ? (JSON.parse(raw) as Record<string, RealmVisualOverrideEntry>) : null;
  } catch {
    return null;
  }
}

function writeCachedOverrides(realm: string, overrides: Record<string, RealmVisualOverrideEntry>): void {
  try {
    localStorage.setItem(CACHE_PREFIX + realm, JSON.stringify(overrides));
  } catch {
    /* quota/private mode: cache is best-effort */
  }
}

async function fetchOnce(realm: string): Promise<Record<string, RealmVisualOverrideEntry> | null> {
  try {
    const res = await fetch(`/api/realm-visuals/${realm}`, { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as { overrides?: Record<string, RealmVisualOverrideEntry> };
    return data.overrides && typeof data.overrides === 'object' ? data.overrides : {};
  } catch {
    return null;
  }
}

export async function fetchRealmVisualOverrides(realm: string): Promise<boolean> {
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(realm)) return false;
  // A transient 500 (DB blip during a deploy) must not strip the session of
  // every published body: retry once, then fall back to the last good document.
  let overrides = await fetchOnce(realm);
  if (!overrides) {
    await new Promise((r) => setTimeout(r, 5000));
    overrides = await fetchOnce(realm);
  }
  if (overrides) {
    writeCachedOverrides(realm, overrides);
    setRealmVisualOverrides(realm, overrides);
    return true;
  }
  const cached = readCachedOverrides(realm);
  if (cached) {
    setRealmVisualOverrides(realm, cached);
    return true;
  }
  return false;
}

async function fetchRealmVisualOverridesLegacy(realm: string): Promise<boolean> {
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(realm)) return false;
  try {
    const res = await fetch(`/api/realm-visuals/${realm}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { overrides?: Record<string, RealmVisualOverrideEntry> };
    const overrides = data.overrides ?? {};
    const published = await loadPublishedAssetUrls(overrides);
    setRealmVisualOverrides(
      realm,
      publishedRealmVisualOverrides(overrides, published ?? new Set()),
    );
    return true;
  } catch {
    return false;
  }
}
