// The realm (world/shard) this server process serves. In the process-per-realm
// model each instance hosts exactly one realm — set REALM_NAME per deployment
// (e.g. a Caddy vhost or compose service per realm), all pointing at the same
// database. Characters, friends, guilds, and presence are all scoped to this
// value, so two processes with different REALM_NAME share a DB yet form fully
// isolated worlds. Defaults to a single realm for local dev / single-shard prod.

export const DEFAULT_REALM_NAME = 'Claudemoon';

export function resolveRealm(rawName: string | undefined): string {
  const raw = (rawName ?? '').trim();
  // realm names are short, human display strings (letters, digits, spaces, a
  // couple of punctuation marks à la "Area 52" / "Mal'Ganis"); fall back rather
  // than boot a process with a nonsense realm
  if (raw && raw.length <= 24 && /^[A-Za-z0-9][A-Za-z0-9 '_-]*$/.test(raw)) return raw;
  return DEFAULT_REALM_NAME;
}

export const REALM = resolveRealm(process.env.REALM_NAME);

// CR overlay: cross-realm marker. The Exchange realm sets CR_CROSS_REALM=1
// in its env file; the server uses this to (a) accept characters whose
// home realm column doesn't match REALM, (b) disable combat / quest credit,
// and (c) expose auction routes. Standard realm processes leave this unset
// and stay strictly isolated.
export const IS_CROSS_REALM: boolean =
  (process.env.CR_CROSS_REALM ?? '').trim() === '1';

// Classic-MMO realm types. Normal == PvE.
export type RealmType = 'Normal' | 'PvP' | 'RP' | 'RP-PvP';
const REALM_TYPES: readonly RealmType[] = ['Normal', 'PvP', 'RP', 'RP-PvP'];

function resolveRealmType(raw: string | undefined): RealmType {
  const t = (raw ?? '').trim();
  return (REALM_TYPES as readonly string[]).includes(t) ? (t as RealmType) : 'Normal';
}

// This process's own realm type (used for the single-realm default directory).
export const REALM_TYPE: RealmType = resolveRealmType(process.env.REALM_TYPE);

export interface RealmEntry {
  name: string;
  // origin a client should connect to for this realm (e.g.
  // "https://ironforge.example.com"); '' means "same origin as this page",
  // used for the single-realm default
  url: string;
  type: RealmType;
}

// The realm directory drives the client's classic-MMO-style realm-list screen.
// Configure it with REALMS as a comma-separated list of `Name=https://host=Type`
// entries (Type optional, defaults Normal), e.g.
//   REALMS="Claudemoon=https://claudemoon.example.com=Normal,Ironforge=https://ironforge.example.com=PvP"
// Every realm process shares the same DATABASE_URL and serves the same
// directory, so a client on any of them can discover and switch to the others.
// Unset → a single same-origin realm (this process), i.e. no cross-realm UI.
function parseRealms(raw: string | undefined): RealmEntry[] {
  const out: RealmEntry[] = [];
  for (const part of (raw ?? '').split(',')) {
    const seg = part.trim();
    if (!seg) continue;
    const fields = seg.split('=').map((s) => s.trim());
    if (fields.length < 2) continue;
    // The directory DISPLAY name is free-form (it can contain spaces and stage
    // brackets like "Cryptic Realm [BETA]"). It is NOT the server's own realm
    // identity, so it must NOT go through resolveRealm() — that rejects brackets
    // and >24 chars, which collapsed every staged entry to "Claudemoon" and then
    // dedup dropped all but one. Just sanity-check it's non-empty.
    const name = fields[0];
    if (!name) continue;
    let url = fields[1];
    if (url && !/^https?:\/\/[^/]+$/.test(url.replace(/\/+$/, ''))) continue; // must be a bare origin
    url = url.replace(/\/+$/, '');
    if (out.some((e) => e.name === name)) continue;
    out.push({ name, url, type: resolveRealmType(fields[2]) });
  }
  return out;
}

function normalizeBareOrigin(raw: string): string | null {
  const origin = raw.trim().replace(/\/+$/, '');
  return /^https?:\/\/[^/]+$/.test(origin) ? origin : null;
}

export function parseWebOrigins(raw: string | undefined): string[] {
  const out: string[] = [];
  for (const part of (raw ?? '').split(',')) {
    const origin = normalizeBareOrigin(part);
    if (origin && !out.includes(origin)) out.push(origin);
  }
  return out;
}

export const REALM_DIRECTORY: RealmEntry[] = (() => {
  const parsed = parseRealms(process.env.REALMS);
  return parsed.length > 0 ? parsed : [{ name: REALM, url: '', type: REALM_TYPE }];
})();

// Cross-origin requests from these realm origins are allowed (CORS), so a
// client served by one realm can call another realm's API after switching. The
// explicit web origins cover apex launchers that list subrealm hosts without
// being one of those subrealms themselves.
export const REALM_ORIGINS: ReadonlySet<string> = new Set([
  ...REALM_DIRECTORY.map((r) => r.url).filter(Boolean),
  ...parseWebOrigins(process.env.WEB_ORIGINS),
]);
