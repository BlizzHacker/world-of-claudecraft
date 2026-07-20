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
export async function fetchRealmVisualOverrides(realm: string): Promise<boolean> {
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
