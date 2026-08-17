// Third-party IP guard for ASSET FILES — the sibling of realm_ip_guard.test.ts.
//
// That guard polices player-visible STRINGS. This one polices FILES, because
// the 2026-08-17 audit found the worse half of the problem was not naming at
// all: `public/cr-realms/arcadevoid/` served 30 files literally called
// `starcraft_png*.png` (verbatim Blizzard unit renders), and the realm's
// loading plate was a StarCraft II Protoss Carrier render.
//
// A ban that stops at source code is not a ban. Two loops were re-creating
// those files after any disk-only cleanup:
//
//   1. The scrape drop was GIT-TRACKED as `arcade void realm assets/`. Every
//      `git checkout -f <sha>` in wave_live.sh / deploy_live_rings.sh restored
//      it into all nine stage worktrees — observed happening live mid-purge.
//   2. build_realm_assets.mjs maps that folder name onto realm `arcadevoid`
//      (copyArcadeVoidImages) and regenerates public/cr-realms/arcadevoid plus
//      the manifest `images[]` from it on EVERY build.
//
// So layer 1 below is the load-bearing one: it fails if the drop is ever
// re-committed, which is what re-opens both loops. Layer 2 is defence in depth
// for the machines that actually hold a store.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '..');

/** Asset names are machine-generated from art prompts and are separated by
 *  underscores, hyphens, dots and slashes — all of which are WORD characters to
 *  `\b` (underscore) or otherwise awkward. Matching `/\bstarcraft\b/` against
 *  'starcraft_png5.png' returns FALSE, so a naive guard here is blind to
 *  precisely the files it exists to catch. Normalise every separator to a space
 *  first, then `\b` means what it looks like it means. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[_\-./\\]+/g, ' ');
}

const ASSET_DENY: readonly RegExp[] = [
  /\bstarcraft\b/,
  /\bprotoss\b/,
  /\bzerg\b/,
  /\bterran\b/,
  /\bbattlecruiser\b/,
  /\btrap ?jaw\b/,                    // He-Man / Masters of the Universe
  /\bgrinch\b/,                       // Dr. Seuss
  /\bwhite walker\b/,                 // Game of Thrones
  /\bsalamanders? intercessor/,       // Warhammer 40,000
  /\bastartes\b/,
  /\bdragoon is a four legged/,       // the Protoss Dragoon, described verbatim
  /\bncc ?1701\b/,                    // Star Trek
  /\bcybe(?:ar)?tron\b/,              // Transformers
  /\bgroudon\b/,                      // Pokemon
  /\brobocop\b/,                      // MGM / Orion
  /\biron ?spider\b/,                  // Marvel — the suit name, both spellings
  /arcade void realm assets/,         // the scrape drop itself
];

/** Assets found by an audit that are NOT safe to remove unilaterally, pinned by
 *  FULL UNIQUE STEM (including the id suffix), never by franchise token —
 *  exempting `/groudon/` wholesale would silently bless the next Groudon asset
 *  too. Same contract as KNOWN_UNCLEARED in realm_ip_guard: it cannot grow
 *  quietly, and it cannot go stale (see the pin test below).
 *
 *  EMPTY as of 2026-08-17. Both original pins were cleared by REPLACEMENT rather
 *  than deletion, which is what they were waiting for:
 *
 *  - primal groudon bodied a LIVE Infernal mob (`hellmaw_primal_beast_body`).
 *    The mob keeps its key and its already-original display name, 'Primal
 *    Emberbeast'; the url now points at an original brute
 *    (realm_infernal_primal_emberbeast_019df95e) and the Pokemon-prompted file
 *    is in the dated quarantine.
 *  - steampunk robocop was a member of the dominion body POOL. Swapping a pool
 *    member is only safe because selectBodyFromPool is rendezvous hashing and
 *    not `hash % pool.length` (body_shape_gate.ts) — under modulo this edit
 *    would have re-bodied every template in the realm. It was replaced by
 *    realm_dominion_ballistic_exo_vanguard_0194241b.
 *
 *  Leave this array empty rather than deleting it: an empty pin list is the
 *  statement that nothing is currently excused, and the test below keeps it
 *  honest the moment something is added. */
const KNOWN_UNCLEARED_ASSETS: readonly string[] = [];

const isPinned = (s: string): boolean =>
  KNOWN_UNCLEARED_ASSETS.some((stem) => normalize(s).includes(stem));

function offenders(names: readonly string[]): string[] {
  return names.filter((n) => !isPinned(n) && ASSET_DENY.some((re) => re.test(normalize(n))));
}

/** The pinned exceptions must still EXIST — if one is cleared, this fails until
 *  it is removed from KNOWN_UNCLEARED_ASSETS, so the list cannot rot. */
function pinnedHits(names: readonly string[]): string[] {
  return names.filter(isPinned);
}

/** Every path git tracks, or null when git is unavailable. */
function trackedPaths(): string[] | null {
  try {
    const out = execFileSync('git', ['ls-files', '-z'], {
      cwd: REPO,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    return out.split('\0').filter(Boolean);
  } catch {
    return null;
  }
}

function walk(dir: string, acc: string[] = [], depth = 0): string[] {
  if (depth > 6) return acc;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, acc, depth + 1);
    else acc.push(full);
  }
  return acc;
}

describe('no third-party art is tracked or served', () => {
  // ---- Layer 1: the repository. Always runs; this is the durable ban. ----
  it('git tracks no file whose path carries a franchise name', () => {
    const tracked = trackedPaths();
    if (tracked === null) {
      expect(true, 'git unavailable — layer 1 skipped').toBe(true);
      return;
    }
    expect(tracked.length, 'git ls-files returned nothing').toBeGreaterThan(0);
    expect(offenders(tracked)).toEqual([]);
  });

  it('the arcade-void scrape drop is gitignored, not merely deleted', () => {
    const ignore = readFileSync(path.join(REPO, '.gitignore'), 'utf8');
    expect(ignore).toContain('arcade void realm assets/');
  });

  // ---- Layer 2: served asset directories, where they exist. ----
  // CR_REALMS_DIR is what the stage servers actually serve /cr-realms/* from
  // (server/forged_assets.ts). On a dev box none of these exist and the test
  // is a no-op; on the host they are the live exposure.
  const STORES = [
    process.env.CR_REALMS_DIR,
    '/opt/cr-realms-store',
    path.join(REPO, 'public', 'cr-realms'),
  ].filter((d): d is string => !!d && existsSync(d));

  it('served asset stores contain no franchise-named file', () => {
    if (STORES.length === 0) {
      expect(true, 'no asset store on this machine — layer 2 skipped').toBe(true);
      return;
    }
    for (const store of STORES) {
      const rel = walk(store).map((f) => path.relative(store, f));
      expect(offenders(rel), `${store} serves franchise-named files`).toEqual([]);
    }
  });

  it('the guard is not blind to underscore-separated asset names', () => {
    // The defect this normalisation exists for: without it, every real
    // filename in this estate slips through.
    expect(offenders(['starcraft_png5.png'])).toEqual(['starcraft_png5.png']);
    expect(offenders(['realm_arcadevoid_trap_jaw_froim_he_01953d43.glb'])).toHaveLength(1);
    expect(offenders(['arcade void realm assets/characters/protoss/x.png'])).toHaveLength(1);
    // ...and it still does not fire on innocent names.
    expect(offenders(['realm_dominion_iron_sentinel.glb', 'wpn_rifle.glb'])).toEqual([]);
  });

  it('pins the assets that cannot be removed without breaking a live body', () => {
    if (STORES.length === 0) {
      expect(true, 'no asset store on this machine — skipped').toBe(true);
      return;
    }
    const all = STORES.flatMap((s) => walk(s).map((f) => path.relative(s, f)));
    // Every pinned exception must still be present; clearing one fails here
    // until it is deleted from KNOWN_UNCLEARED_ASSETS.
    for (const stem of KNOWN_UNCLEARED_ASSETS) {
      expect(
        all.some((f) => normalize(f).includes(stem)),
        `pinned asset "${stem}" is gone — delete it from KNOWN_UNCLEARED_ASSETS`,
      ).toBe(true);
    }
    expect(pinnedHits(all).length).toBeGreaterThanOrEqual(KNOWN_UNCLEARED_ASSETS.length);
  });

  it('served manifests neither name nor link a franchise asset', () => {
    if (STORES.length === 0) {
      expect(true, 'no asset store on this machine — layer 2 skipped').toBe(true);
      return;
    }
    for (const store of STORES) {
      for (const realm of readdirSync(store)) {
        const mf = path.join(store, realm, 'manifest.json');
        if (!existsSync(mf)) continue;
        const data = JSON.parse(readFileSync(mf, 'utf8')) as {
          images?: { name?: string; url?: string; sourceRelative?: string }[];
          assets?: { name?: string; url?: string; sourceRelative?: string }[];
        };
        const strings = [...(data.images ?? []), ...(data.assets ?? [])].flatMap((e) =>
          [e.name, e.url, e.sourceRelative].filter((s): s is string => !!s),
        );
        expect(offenders(strings), `${mf} references franchise assets`).toEqual([]);
      }
    }
  });
});
