// Realm directory helpers for the admin shell's realm badge and switcher. The
// public GET /api/realms body carries { current, realms: [{ name, url, type }] }
// (server/leaderboard.ts readRealms over REALM_DIRECTORY). Pure and defensive
// so the parse and the admin-URL derivation unit-test in plain Node and a
// malformed body can never break the shell.

export interface RealmDirectoryEntry {
  name: string;
  url: string;
  type: string;
}

export interface RealmDirectory {
  current: string;
  realms: RealmDirectoryEntry[];
}

/** Parse the /api/realms body defensively: unknown shapes collapse to an empty
 *  directory (badge hidden) rather than throwing inside the shell. */
export function parseRealmDirectory(body: unknown): RealmDirectory {
  const obj = (body ?? {}) as { current?: unknown; realms?: unknown };
  const current = typeof obj.current === 'string' ? obj.current : '';
  const realms = Array.isArray(obj.realms)
    ? obj.realms.flatMap((raw): RealmDirectoryEntry[] => {
        const e = (raw ?? {}) as { name?: unknown; url?: unknown; type?: unknown };
        if (typeof e.name !== 'string' || e.name === '') return [];
        return [
          {
            name: e.name,
            url: typeof e.url === 'string' ? e.url : '',
            type: typeof e.type === 'string' ? e.type : '',
          },
        ];
      })
    : [];
  return { current, realms };
}

/** The admin dashboard URL on a realm's public origin, or null when the entry
 *  has no origin to navigate to (single-realm dev setups). */
export function realmAdminUrl(entry: RealmDirectoryEntry): string | null {
  if (!entry.url) return null;
  return `${entry.url.replace(/\/+$/, '')}/admin/`;
}

/** Switcher rows: every OTHER realm that has a reachable admin URL. */
export function switchableRealms(dir: RealmDirectory): { name: string; adminUrl: string }[] {
  return dir.realms
    .filter((r) => r.name !== dir.current)
    .flatMap((r) => {
      const adminUrl = realmAdminUrl(r);
      return adminUrl ? [{ name: r.name, adminUrl }] : [];
    });
}
