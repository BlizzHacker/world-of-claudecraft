// Automatic per-realm world decoration.
//
// THE GAP THIS CLOSES. The realm asset store ships ~1,300 world-placeable GLBs
// (buildings, scenery, vehicles, ships, mechs, turrets). Until now the only way
// any of them reached a world was a human placing one by hand in the world
// builder: ZonePropsDef takes native prop KEYS with hand-written geometry
// builders, and WorldContent.placements only exists for custom editor maps. The
// built-in world had no seam at all, so 1,300 shipped assets were live on disk
// and referenced by nothing.
//
// WHAT THIS IS. A pure, deterministic solver: given a realm id, a world seed and
// the generated catalogue, it returns the decorations that world should show.
// Same realm + same seed => byte-identical list on every client, forever, with
// no network round-trip and no per-client randomness. It draws no rng and reads
// no clock; every choice comes from hash2(x, z, seed) exactly the way the
// existing tree/rock field in world.ts generateDecorations() does.
//
// WHAT IT IS NOT. Decoration is COSMETIC. It produces no colliders, no
// entities, no spawns and no sim state; nothing here can change a fight, a
// path, or a golden trace. That is deliberate: colliders.ts derives blockers
// from generateDecorations(), and putting 1,300 arbitrary Meshy meshes into that
// set would rewrite the world's collision map. The placer instead keeps a
// generous clear radius around everything gameplay owns (see keepClearAnchors)
// so walk-through scenery reads as landscape, not as an obstacle you clipped.
//
// BUDGET. These are hero assets, not grass: the store's MEDIAN row is 19,600
// triangles and 1.1 MB, versus ~450 triangles for a foliage tree. A realm
// therefore gets a small number of LANDMARKS, capped by triangles AND download
// bytes per graphics tier (src/render/realm_decor.ts owns the tier numbers).
// The candidate LIST is tier-independent and budget-free; a budget only ever
// filters and truncates it, so a phone sees a subset of the same world a
// desktop sees, never a different one.

import { isInBoarpitShell } from './boarpit_layout';
import { getActiveWorldContent, WORLD_MAX_X, WORLD_MAX_Z, WORLD_MIN_Z } from './data';
import { decorRoleAdmitted } from './decor_figure_gate';
import { isInThornwheelShell } from './derby_layout';
import { isInHomesShell } from './homes_layout';
import type {
  RealmDecorAsset,
  RealmDecorBudget,
  RealmDecorPlacement,
  RealmDecorRole,
} from './realm_decor_types';
import { hash2 } from './rng';
import { isInSowfieldShell } from './vale_cup_layout';
import {
  DECORATION_MAX_SLOPE,
  roadDistance,
  terrainHeight,
  terrainSteepness,
  waterLevel,
} from './world';

/** Longest-axis normalization the placed-asset renderer applies before `scale`.
 *  Pinned against src/render/placed_assets.ts by tests/realm_decor.test.ts —
 *  the sim cannot import the renderer, so the constant is mirrored, not shared. */
export const DECOR_NORMALIZED_HEIGHT = 2.2;

/** Which realms decorate, where their assets come from, and what may stand there.
 *
 *  `sources` is an ordered list of store realms to draw from. Realms with no
 *  store content of their own borrow the realm that owns the right look — the
 *  store is one shared tree served at /cr-realms, so a cross-realm URL resolves
 *  on every realm host (the same reason generated bodies borrow fps weapons).
 *
 *  `roles` is the THEME contract and the reason a starship never parks in a
 *  medieval village: a role absent here can never be placed in that realm, no
 *  matter what the catalogue holds. Weights are relative.
 *
 *  claudecraft is deliberately absent. It is the pristine upstream base look —
 *  data.ts themeWorldForRealm returns the base world untouched for it — so it
 *  gets no realm dressing either. */
export const REALM_DECOR_THEME: Readonly<
  Record<
    string,
    {
      readonly sources: readonly string[];
      readonly roles: Readonly<Partial<Record<RealmDecorRole, number>>>;
    }
  >
> = {
  classic: { sources: ['classic'], roles: { structure: 3, monument: 3, flora: 2, camp: 1 } },
  infernal: {
    sources: ['infernal', 'classic'],
    roles: { structure: 3, monument: 3, camp: 1, flora: 1 },
  },
  arcane: {
    sources: ['arcane', 'classic'],
    roles: { structure: 3, monument: 3, flora: 2, camp: 1 },
  },
  crypticrealm: {
    sources: ['crypticrealm', 'infernal'],
    roles: { structure: 3, monument: 3, flora: 2, camp: 1 },
  },
  arcadevoid: {
    sources: ['arcadevoid'],
    roles: { structure: 3, ship: 2, mech: 1, monument: 1, camp: 1 },
  },
  fps: { sources: ['fps'], roles: { vehicle: 3, turret: 3, camp: 1, monument: 1 } },
  dominion: { sources: ['fps'], roles: { vehicle: 3, turret: 3, camp: 1 } },
  exchange: { sources: ['exchange', 'classic'], roles: { monument: 2, flora: 1, camp: 1 } },
};

/** World height in yards a role is scaled to, before per-placement jitter. */
const ROLE_HEIGHT: Record<RealmDecorRole, number> = {
  structure: 11,
  monument: 5.5,
  flora: 8,
  camp: 2.6,
  vehicle: 3.2,
  turret: 3.4,
  mech: 6.5,
  ship: 8,
};

/** Roles that may stand on a settlement's outskirts. A parked rover or a
 *  watchtower belongs on a town edge; a derelict mech in the market does not. */
const OUTSKIRT_ROLES: ReadonlySet<RealmDecorRole> = new Set<RealmDecorRole>([
  'structure',
  'monument',
  'camp',
  'vehicle',
  'turret',
]);

// Placement bands. `outskirt` rings each settlement, `wayside` lines the roads
// at a standoff, `wild` is deep backcountry. Every band is generated for every
// zone, and the final ordering round-robins across (band, zone) so that ANY
// truncation by the graphics budget still covers the whole world.
const BANDS = ['outskirt', 'wayside', 'wild'] as const;
type Band = (typeof BANDS)[number];

const OUTSKIRT_SLOTS = 10; // candidate angles tried per settlement
const OUTSKIRT_GAP_MIN = 12; // yards beyond the hub radius
const OUTSKIRT_GAP_MAX = 26;

const WAYSIDE_STEP = 34; // scatter-grid pitch, yards
const WAYSIDE_ROAD_MIN = 11; // never encroach on the road itself
const WAYSIDE_ROAD_MAX = 26;
const WAYSIDE_DENSITY = 0.34;

const WILD_STEP = 58;
const WILD_ROAD_MIN = 34;
const WILD_DENSITY = 0.26;

const WORLD_EDGE_MARGIN = 24;
/** Water standoff: the same +1 yard over the surface generateDecorations uses. */
const WATER_CLEARANCE = 1;
/** Gap left between two decorations, on top of both their radii. */
const DECOR_SEPARATION = 8;

/**
 * How hard asset choice leans toward the cheap end of a role's pool.
 *
 * The store is wildly uneven — one role can span 0.2 MB to 22 MB and 4k to 1.3M
 * triangles — so a UNIFORM pick makes almost every choice unaffordable on a
 * phone budget and the constrained tiers render one lonely decoration. Ranking
 * the pool by cost and indexing it with `roll ** ASSET_SIZE_BIAS` puts the
 * median pick near the pool's 30th cost percentile while still reaching the
 * expensive hero assets occasionally.
 *
 * Crucially this biases the PICK, not the budget: a site still resolves to ONE
 * asset for every client, so a low tier renders a SUBSET of the same world
 * rather than a different model in the same spot.
 */
const ASSET_SIZE_BIAS = 1.8;

/** Rank key for that bias. Download bytes dominate; triangles are folded in at
 *  a rate that makes a 200k-triangle mesh cost about as much as a 5 MB file. */
export function decorAssetCost(asset: { kb: number; tris: number }): number {
  return asset.kb + asset.tris / 40;
}

// Hash salts. Distinct per purpose so two decisions at the same cell never
// correlate; offset from the salts world.ts already spends on the tree field.
const SALT_BAND = 4101;
const SALT_JITTER_X = 4111;
const SALT_JITTER_Z = 4127;
const SALT_ROLE = 4133;
const SALT_ASSET = 4139;
const SALT_YAW = 4153;
const SALT_HEIGHT = 4157;
const SALT_RANK = 4159;
const SALT_ANGLE = 4177;
const SALT_RADIUS = 4201;

/** Fold a realm id into the hash space so two realms never share a layout. */
export function realmDecorSalt(realmId: string): number {
  let h = 2166136261;
  for (let i = 0; i < realmId.length; i++) {
    h ^= realmId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface ClearCircle {
  x: number;
  z: number;
  r: number;
}

/**
 * Everything a decoration must stay off: settlements, camps, NPCs (quest givers
 * and vendors), market stalls, doorways and service aprons, graveyards, mine and
 * delve mouths, docks, the player spawn, and the authored minigame grounds.
 * Read from the ACTIVE world content, so a custom map contributes its own
 * anchors and inherits none of the built-in coordinates.
 */
export function keepClearAnchors(): ClearCircle[] {
  const world = getActiveWorldContent();
  const out: ClearCircle[] = [];
  const push = (x: number, z: number, r: number): void => {
    out.push({ x, z, r });
  };
  for (const zone of world.zones) {
    push(zone.hub.x, zone.hub.z, zone.hub.radius + 8);
    push(zone.graveyard.x, zone.graveyard.z, 14);
    for (const poi of zone.pois) push(poi.x, poi.z, 8);
  }
  for (const camp of world.camps) push(camp.center.x, camp.center.z, camp.radius + 6);
  for (const npc of Object.values(world.npcs)) push(npc.pos.x, npc.pos.z, 10);
  for (const group of world.groundObjects) {
    for (const p of group.positions) push(p.x, p.z, 6);
  }
  const props = world.props;
  for (const b of props.buildings) push(b.x, b.z, Math.hypot(b.w, b.d) / 2 + 8);
  for (const s of props.stalls) push(s.x, s.z, s.r + 8);
  for (const w of props.wells) push(w.x, w.z, w.r + 6);
  for (const m of props.mines) push(m.x, m.z, 12);
  for (const d of props.docks) push(d.x, d.z, 16);
  for (const t of props.tents) push(t.x, t.z, 7);
  for (const [x, z] of props.crates) push(x, z, 5);
  for (const [x, z] of props.campfires) push(x, z, 6);
  for (const [x, z] of props.mudHuts) push(x, z, 8);
  for (const r of props.ruinRings) push(r.x, r.z, r.ringR + 6);
  for (const f of props.fences) {
    push(f.x1, f.z1, 5);
    push(f.x2, f.z2, 5);
    push((f.x1 + f.x2) / 2, (f.z1 + f.z2) / 2, Math.hypot(f.x2 - f.x1, f.z2 - f.z1) / 2 + 3);
  }
  for (const b of props.benches ?? []) push(b.x, b.z, Math.hypot(b.w, b.d) / 2 + 4);
  for (const w of props.walls ?? []) push(w.x, w.z, Math.hypot(w.w, w.d) / 2 + 4);
  for (const g of props.graveyards) push(g.x, g.z, 12);
  for (const m of props.delveMarkers ?? []) push(m.x, m.z, 12);
  const services = world.services;
  for (const s of services?.stations ?? []) push(s.pos.x, s.pos.z, 10);
  for (const m of services?.mailboxes ?? []) push(m.x, m.z, 8);
  for (const n of services?.noticeboards ?? []) push(n.x, n.z, 10);
  for (const g of services?.graveyards ?? []) push(g.x, g.z, 14);
  push(world.playerStart.x, world.playerStart.z, 25);
  return out;
}

/** True when a decoration of half-extent `radius` may stand at (x, z). */
export function decorSiteOk(
  x: number,
  z: number,
  radius: number,
  seed: number,
  anchors: readonly ClearCircle[],
  minRoad: number,
  maxRoad: number,
): boolean {
  if (Math.abs(x) > WORLD_MAX_X - WORLD_EDGE_MARGIN) return false;
  if (z < WORLD_MIN_Z + WORLD_EDGE_MARGIN || z > WORLD_MAX_Z - WORLD_EDGE_MARGIN) return false;
  // Authored minigame grounds keep their footprint clear, exactly as the tree
  // field does — a fortress on the pitch is the same bug as a pine on it.
  if (isInSowfieldShell(x, z)) return false;
  if (isInThornwheelShell(x, z)) return false;
  if (isInBoarpitShell(x, z)) return false;
  if (isInHomesShell(x, z)) return false;
  for (const a of anchors) {
    const dx = x - a.x;
    const dz = z - a.z;
    const r = a.r + radius;
    if (dx * dx + dz * dz < r * r) return false;
  }
  const road = roadDistance(x, z);
  if (road < minRoad + radius) return false;
  if (road > maxRoad) return false;
  // Never in water: nothing in the auto-placed set is authored as a water
  // asset, so a hull on a lake bed would read as a bug, not as a shipwreck.
  if (terrainHeight(x, z, seed) < waterLevel() + WATER_CLEARANCE) return false;
  // Cliff faces last: the four-sample steepness only runs for sites that
  // survived every cheaper gate (same ordering rationale as world.ts).
  if (terrainSteepness(x, z, seed) > DECORATION_MAX_SLOPE) return false;
  return true;
}

interface Candidate extends RealmDecorPlacement {
  band: Band;
  zone: number;
  rank: number;
}

function pickWeighted(
  roll: number,
  entries: readonly (readonly [RealmDecorRole, number])[],
): RealmDecorRole {
  let total = 0;
  for (const [, w] of entries) total += w;
  let t = roll * total;
  for (const [role, w] of entries) {
    t -= w;
    if (t < 0) return role;
  }
  return entries[entries.length - 1][0];
}

/**
 * Every decoration this realm's world can show, in a stable, tier-independent
 * order. Deterministic in (realmId, seed, active world content, catalogue).
 *
 * CALLER CONTRACT: pass the ACTIVE realm. The world content this reads is
 * already themed for whatever realm is active (data.ts getActiveWorldContent
 * scales and spreads town buildings per realm), so solving realm A's decoration
 * against realm B's active world would clear the wrong footprints. The renderer
 * passes getActiveRealm().id, which is the same value.
 */
export function realmDecorCandidates(
  realmId: string,
  seed: number,
  catalog: Readonly<Record<string, readonly RealmDecorAsset[]>>,
): RealmDecorPlacement[] {
  const theme = REALM_DECOR_THEME[realmId];
  if (!theme) return [];
  const byRole = new Map<RealmDecorRole, RealmDecorAsset[]>();
  for (const source of theme.sources) {
    for (const asset of catalog[source] ?? []) {
      if (theme.roles[asset.role] === undefined) continue;
      // A catalogue row whose slug names a PERSON may never take the building
      // band (decor_figure_gate.ts): the store filed four gaunt-revenant
      // humanoids under `buildings`, so they inherited `structure` and stood on
      // the Martyrspike ridge at 11 yards, taller than the town below them.
      if (!decorRoleAdmitted(asset.key, asset.role)) continue;
      const list = byRole.get(asset.role);
      if (list) list.push(asset);
      else byRole.set(asset.role, [asset]);
    }
  }
  if (byRole.size === 0) return [];
  // Cheapest first, so ASSET_SIZE_BIAS has something to lean on. Sorted by key
  // on a tie: the catalogue's own order must never decide anything, or a
  // re-emit that reorders two equal-cost rows would move a decoration.
  for (const list of byRole.values()) {
    list.sort((a, b) => decorAssetCost(a) - decorAssetCost(b) || (a.key < b.key ? -1 : 1));
  }
  const allRoles: (readonly [RealmDecorRole, number])[] = [];
  const outskirtRoles: (readonly [RealmDecorRole, number])[] = [];
  for (const [role, weight] of Object.entries(theme.roles) as [RealmDecorRole, number][]) {
    if (!byRole.has(role)) continue;
    allRoles.push([role, weight]);
    if (OUTSKIRT_ROLES.has(role)) outskirtRoles.push([role, weight]);
  }
  if (allRoles.length === 0) return [];

  const salt = realmDecorSalt(realmId);
  const world = getActiveWorldContent();
  const anchors = keepClearAnchors();
  const accepted: Candidate[] = [];

  // Nominal radius used for the first, cheap clearance pass. The real radius is
  // only known after the asset is picked, so the site is re-checked with it.
  const NOMINAL_RADIUS = 4;

  const tryPlace = (
    cellX: number,
    cellZ: number,
    x: number,
    z: number,
    band: Band,
    zone: number,
    minRoad: number,
    maxRoad: number,
  ): void => {
    if (!decorSiteOk(x, z, NOMINAL_RADIUS, seed, anchors, minRoad, maxRoad)) return;
    const roles = band === 'outskirt' && outskirtRoles.length > 0 ? outskirtRoles : allRoles;
    const role = pickWeighted(hash2(cellX, cellZ, seed + salt + SALT_ROLE), roles);
    const pool = byRole.get(role);
    if (!pool || pool.length === 0) return;
    const roll = hash2(cellX, cellZ, seed + salt + SALT_ASSET) ** ASSET_SIZE_BIAS;
    const asset = pool[Math.min(pool.length - 1, Math.floor(roll * pool.length))];
    const height =
      ROLE_HEIGHT[role] * (0.85 + hash2(cellX, cellZ, seed + salt + SALT_HEIGHT) * 0.4);
    const radius = Math.max(1, asset.foot * height);
    if (!decorSiteOk(x, z, radius, seed, anchors, minRoad, maxRoad)) return;
    for (const other of accepted) {
      const dx = x - other.x;
      const dz = z - other.z;
      const gap = radius + other.radius + DECOR_SEPARATION;
      if (dx * dx + dz * dz < gap * gap) return;
    }
    accepted.push({
      key: asset.key,
      role,
      x,
      z,
      rotY: hash2(cellX, cellZ, seed + salt + SALT_YAW) * Math.PI * 2,
      scale: (height * asset.aspect) / DECOR_NORMALIZED_HEIGHT,
      height,
      radius,
      tris: asset.tris,
      kb: asset.kb,
      band,
      zone,
      rank: hash2(cellX, cellZ, seed + salt + SALT_RANK),
    });
  };

  // 1. Settlement outskirts — a ring of themed silhouettes just outside each hub.
  world.zones.forEach((zoneDef, zoneIndex) => {
    for (let slot = 0; slot < OUTSKIRT_SLOTS; slot++) {
      const cellX = zoneIndex * 1000 + slot;
      const cellZ = -1;
      const angle =
        ((slot + hash2(cellX, cellZ, seed + salt + SALT_ANGLE)) / OUTSKIRT_SLOTS) * Math.PI * 2;
      const gap =
        OUTSKIRT_GAP_MIN +
        hash2(cellX, cellZ, seed + salt + SALT_RADIUS) * (OUTSKIRT_GAP_MAX - OUTSKIRT_GAP_MIN);
      const reach = zoneDef.hub.radius + gap;
      tryPlace(
        cellX,
        cellZ,
        zoneDef.hub.x + Math.cos(angle) * reach,
        zoneDef.hub.z + Math.sin(angle) * reach,
        'outskirt',
        zoneIndex,
        0,
        Number.POSITIVE_INFINITY,
      );
    }
  });

  // 2 + 3. Roadside and backcountry scatter, on the same hash grid the tree
  // field uses (integer cell coords hashed with the seed, jittered inside the
  // cell) so the two fields never correlate but behave identically.
  const scatter = (
    band: Band,
    step: number,
    density: number,
    minRoad: number,
    maxRoad: number,
  ): void => {
    const half = WORLD_MAX_X - WORLD_EDGE_MARGIN;
    for (let gx = -half; gx < half; gx += step) {
      for (
        let gz = WORLD_MIN_Z + WORLD_EDGE_MARGIN;
        gz < WORLD_MAX_Z - WORLD_EDGE_MARGIN;
        gz += step
      ) {
        const cellX = Math.round(gx);
        const cellZ = Math.round(gz);
        if (hash2(cellX, cellZ, seed + salt + SALT_BAND) > density) continue;
        const x = gx + (hash2(cellX, cellZ, seed + salt + SALT_JITTER_X) - 0.5) * step * 0.7;
        const z = gz + (hash2(cellX, cellZ, seed + salt + SALT_JITTER_Z) - 0.5) * step * 0.7;
        let zoneIndex = world.zones.length - 1;
        for (let i = 0; i < world.zones.length; i++) {
          if (z < world.zones[i].zMax) {
            zoneIndex = i;
            break;
          }
        }
        tryPlace(cellX, cellZ, x, z, band, zoneIndex, minRoad, maxRoad);
      }
    }
  };
  scatter('wayside', WAYSIDE_STEP, WAYSIDE_DENSITY, WAYSIDE_ROAD_MIN, WAYSIDE_ROAD_MAX);
  scatter('wild', WILD_STEP, WILD_DENSITY, WILD_ROAD_MIN, Number.POSITIVE_INFINITY);

  // Final order: round-robin across (band, zone) groups, each group internally
  // ordered by its hash rank. Any prefix of this list therefore still spans
  // every zone and every band, which is what makes a tier budget a SUBSET of the
  // same world rather than a differently-shaped one.
  const groups: Candidate[][] = [];
  for (const band of BANDS) {
    for (let zone = 0; zone < world.zones.length; zone++) {
      groups.push(
        accepted
          .filter((c) => c.band === band && c.zone === zone)
          .sort((a, b) => a.rank - b.rank || (a.key < b.key ? -1 : 1)),
      );
    }
  }
  const ordered: RealmDecorPlacement[] = [];
  const deepest = groups.reduce((m, g) => Math.max(m, g.length), 0);
  for (let i = 0; i < deepest; i++) {
    for (const group of groups) {
      const c = group[i];
      if (!c) continue;
      ordered.push({
        key: c.key,
        role: c.role,
        x: c.x,
        z: c.z,
        rotY: c.rotY,
        scale: c.scale,
        height: c.height,
        radius: c.radius,
        tris: c.tris,
        kb: c.kb,
      });
    }
  }
  return ordered;
}

/**
 * Take what this graphics tier can afford: drop assets that are individually too
 * heavy, then accumulate in order until an instance / triangle / download cap is
 * reached. Order-preserving, so the result is a subset of the same world.
 */
export function applyRealmDecorBudget(
  candidates: readonly RealmDecorPlacement[],
  budget: RealmDecorBudget,
): RealmDecorPlacement[] {
  const out: RealmDecorPlacement[] = [];
  let tris = 0;
  let kb = 0;
  for (const c of candidates) {
    if (out.length >= budget.maxInstances) break;
    if (c.tris > budget.maxAssetTriangles || c.kb > budget.maxAssetKilobytes) continue;
    if (tris + c.tris > budget.maxTriangles) continue;
    if (kb + c.kb > budget.maxKilobytes) continue;
    tris += c.tris;
    kb += c.kb;
    out.push(c);
  }
  return out;
}

/** Convenience: candidates for a realm, already trimmed to a budget. */
export function generateRealmDecor(
  realmId: string,
  seed: number,
  catalog: Readonly<Record<string, readonly RealmDecorAsset[]>>,
  budget: RealmDecorBudget,
): RealmDecorPlacement[] {
  return applyRealmDecorBudget(realmDecorCandidates(realmId, seed, catalog), budget);
}
