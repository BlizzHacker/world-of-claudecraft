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
    setRealmVisualOverrides(realm, data.overrides ?? {});
    return true;
  } catch {
    return false;
  }
}
