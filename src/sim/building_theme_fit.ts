// Themed-building placement fit: how much of a realm's worldTheme one town
// building is actually allowed to take.
//
// THE BUG THIS CLOSES. A realm worldTheme grows every procedural building's
// footprint (buildingScale) and pushes the settlement ones outward from their
// zone hub (buildingSpread; infernal ships 1.9 and 2.6). The move was a plain
// radial multiply with nothing re-solved after it, and a town is not empty
// space: its ground is a plateau the terrain function flattens around the hub
// and lets fall away to natural relief past it, its roads are fixed polylines,
// and its stalls, crates, wells, mailboxes, noticeboards and NPC anchors do not
// move with the theme at all. So the live infernal towns pushed buildings off
// their own flat ground (one Icemantle inn ended up spanning TWELVE yards of
// terrain drop, floating over the downhill half of its own footprint), parked
// five of them across the carriageway, and swallowed crates and a mailbox
// inside walls that are solid to a player. The operator's report: the buildings
// are resized but not placed, and the town reads cramped and wrong.
//
// THE RULING. The theme is a REACH, not a fact. Each record walks a fixed
// descending ladder from the full theme (reach 1) down to the authored record
// (reach 0) and settles on the first rung that is no worse than the authored
// record on every count: ground it spans, carriageway it leaves open, authored
// fence runs it stays out of, town fixtures it keeps clear of, and walls it
// keeps off its neighbours (and their doorsteps). Reach 0 is the authored
// record, which satisfies every rule against itself by construction, so the
// walk always terminates and the worst case is exactly today's vanilla
// placement. That generalizes the all-or-nothing fence fallback this replaces:
// a building that used to lose the whole theme to one rail now keeps as much of
// it as clears.
//
// Why "no worse than authored" rather than a flat threshold: the shipped world
// already seats a few records on ground, doorsteps and neighbours that no
// threshold would admit (an inn whose NPC anchor stands inside its footprint,
// a farmstead on a 3-yard slope). A flat rule would drag those to reach 0 for
// something the theme did not cause. Every rule is therefore
// "value >= min(target, valueAuthored)" (or the grade's "<= max(...)"), which
// is a REGRESSION test per building rather than a quality bar.
//
// Because the spread ladder is anchored on the hub, a rung scales every
// pairwise distance inside a settlement by its spread factor while scaling
// sizes by the smaller scale factor (every shipped theme has spread > scale),
// so backing a record off can never make its town tighter than vanilla.
//
// Pure and deterministic: no rng, no clock, no world state, no imports beyond
// the fence-clearance leaf that already owns the rail ruling. The terrain and
// road answers arrive as caller-supplied probes because src/sim/data.ts, which
// drives this, must not import src/sim/world.ts (world.ts imports data.ts, and
// the reverse edge is a runtime cycle whose hoisted top-level const reads land
// in TDZ).

import { type FenceRunDef, footprintCrossesAnyFenceRun } from './fence_clearance';

/** A building footprint in world space: full width/depth, rotY convention of
 *  colliders.ts (local +z is the front face the door sits on). */
export interface FitFootprint {
  x: number;
  z: number;
  w: number;
  d: number;
  rot: number;
}

export interface FitPoint {
  x: number;
  z: number;
}

/** The two world answers the fit needs, injected (see the header note on why
 *  this leaf cannot reach src/sim/world.ts itself). */
export interface BuildingFitProbes {
  /** Ground height at a world point (world.ts terrainHeight at the world seed). */
  groundAt(x: number, z: number): number;
  /** Distance to the nearest road centreline (world.ts roadDistance). */
  roadDistanceAt(x: number, z: number): number;
}

/** Everything immovable a themed footprint has to live beside. */
export interface BuildingFitWorld {
  /** Authored fence runs, which never move with a theme. */
  fences: readonly FenceRunDef[];
  /** Town fixtures that do not move with a theme: stalls, wells, crates,
   *  campfires, tents, benches, mine mouths, graveyards, delve markers, NPC
   *  anchors and every service anchor. */
  fixtures: readonly FitPoint[];
}

export interface ThemedBuildingInput {
  /** The authored record's footprint: the reach-0 rung. */
  base: FitFootprint;
  /** The settlement hub this record spreads around, or null when it only takes
   *  the scale (an outlier farmstead has no town square to breathe into). */
  hub: FitPoint | null;
  /** False when the theme never applies at all (an authored assetId placement
   *  drawn by its own layout module at fixed coordinates). It still settles,
   *  at reach 0, so later records keep their walls off it. */
  themed: boolean;
}

export interface ThemedBuildingFit {
  /** How much of the theme the record took: 1 the full theme, 0 the authored
   *  record, a ladder rung in between. */
  reach: number;
  footprint: FitFootprint;
}

/** The rungs, richest first. Fixed and shared by every realm so a fit is a pure
 *  function of the content, and always ending at 0 so the walk terminates. */
export const BUILDING_FIT_REACH_LADDER: readonly number[] = [
  1, 0.875, 0.75, 0.625, 0.5, 0.375, 0.25, 0.125, 0,
];

/** Yards of ground height a single footprint may span. Past this the uphill
 *  corners bury or the downhill ones float, whichever way the renderer seats
 *  it (src/render/props.ts footBaseY seats on the highest corner, so the excess
 *  becomes daylight under the low side). */
export const BUILDING_FIT_MAX_GRADE = 2;

/** Yards of carriageway a footprint leaves open. Matches the standoff the
 *  scatter fields already keep off a road (src/render/foliage.ts). */
export const BUILDING_FIT_ROAD_CLEARANCE = 3;

/** Yards of ground kept between a wall and an unmoved town fixture, so the
 *  stall, crate or mailbox stays reachable instead of ending up inside. */
export const BUILDING_FIT_FIXTURE_CLEARANCE = 0.6;

/** Yards of ground kept between two buildings' walls. */
export const BUILDING_FIT_NEIGHBOUR_CLEARANCE = 1.5;

/** How far out from the front face the doorstep a player stands on sits.
 *  computeBuildingDoors (src/sim/interiors.ts) puts the door ON the +z face;
 *  this is the ground just outside it, which must not be inside a neighbour. */
export const BUILDING_FIT_DOOR_APPROACH = 2;

/** Sweep pitch, in yards, for the ground and road lattices. Fixed PITCH rather
 *  than a fixed COUNT because the footprint being swept is the one the theme
 *  just grew: a 3x3 lattice over a scaled inn puts seven yards between samples,
 *  which is wide enough for a whole carriageway to pass between two of them and
 *  read as clear. Clamped below at 3 per axis (corners, midpoints, centre). */
export const BUILDING_FIT_SAMPLE_PITCH = 2.5;
export const BUILDING_FIT_MAX_SAMPLES = 12;

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** The footprint at one rung: the settlement spread is anchored on the hub, and
 *  a record with no hub keeps its authored position and takes the scale only. */
export function themedFootprintAt(
  base: FitFootprint,
  hub: FitPoint | null,
  spread: number,
  scale: number,
  reach: number,
): FitFootprint {
  const s = lerp(1, scale, reach);
  const f = lerp(1, spread, reach);
  return {
    x: hub ? hub.x + (base.x - hub.x) * f : base.x,
    z: hub ? hub.z + (base.z - hub.z) * f : base.z,
    w: base.w * s,
    d: base.d * s,
    rot: base.rot,
  };
}

/** Half the footprint's diagonal: the farthest a corner reaches from centre. */
export function footprintReach(f: FitFootprint): number {
  return Math.hypot(f.w, f.d) / 2;
}

function localOf(f: FitFootprint, x: number, z: number): { x: number; z: number } {
  const c = Math.cos(-f.rot);
  const s = Math.sin(-f.rot);
  const dx = x - f.x;
  const dz = z - f.z;
  return { x: dx * c + dz * s, z: -dx * s + dz * c };
}

function worldOf(f: FitFootprint, lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(f.rot);
  const s = Math.sin(f.rot);
  return { x: f.x + lx * c - lz * s, z: f.z + lx * s + lz * c };
}

/** Distance from a world point to the footprint's edge: positive outside,
 *  negative (the depth past the nearest face) inside. */
export function footprintPointDistance(f: FitFootprint, x: number, z: number): number {
  const p = localOf(f, x, z);
  const ox = Math.abs(p.x) - f.w / 2;
  const oz = Math.abs(p.z) - f.d / 2;
  if (ox <= 0 && oz <= 0) return Math.max(ox, oz);
  return Math.hypot(Math.max(ox, 0), Math.max(oz, 0));
}

/** The doorstep: the ground just outside the front (+z local) face, which is
 *  where computeBuildingDoors puts the door a player walks up to. */
export function footprintDoorPoint(
  f: FitFootprint,
  approach = BUILDING_FIT_DOOR_APPROACH,
): FitPoint {
  return worldOf(f, 0, f.d / 2 + approach);
}

function cornersOf(f: FitFootprint): FitPoint[] {
  const out: FitPoint[] = [];
  for (const [lx, lz] of [
    [-f.w / 2, -f.d / 2],
    [f.w / 2, -f.d / 2],
    [f.w / 2, f.d / 2],
    [-f.w / 2, f.d / 2],
  ] as const) {
    out.push(worldOf(f, lx, lz));
  }
  return out;
}

/** Separating-axis test between two rotated boxes, with `a` inflated on every
 *  side by `margin`. margin 0 asks "do these walls intersect"; a positive
 *  margin asks "is there less than this much ground between them". */
export function footprintsOverlapWithin(a: FitFootprint, b: FitFootprint, margin: number): boolean {
  const inflated: FitFootprint = { ...a, w: a.w + margin * 2, d: a.d + margin * 2 };
  const pair = [inflated, b] as const;
  const cornerSets = pair.map(cornersOf);
  for (const box of pair) {
    for (const axis of [
      { x: Math.cos(box.rot), z: Math.sin(box.rot) },
      { x: -Math.sin(box.rot), z: Math.cos(box.rot) },
    ]) {
      let aMin = Number.POSITIVE_INFINITY;
      let aMax = Number.NEGATIVE_INFINITY;
      let bMin = Number.POSITIVE_INFINITY;
      let bMax = Number.NEGATIVE_INFINITY;
      for (const p of cornerSets[0]) {
        const t = p.x * axis.x + p.z * axis.z;
        aMin = Math.min(aMin, t);
        aMax = Math.max(aMax, t);
      }
      for (const p of cornerSets[1]) {
        const t = p.x * axis.x + p.z * axis.z;
        bMin = Math.min(bMin, t);
        bMax = Math.max(bMax, t);
      }
      if (aMax <= bMin || bMax <= aMin) return false;
    }
  }
  return true;
}

function axisSamples(extent: number): number {
  const wanted = Math.ceil(Math.abs(extent) / BUILDING_FIT_SAMPLE_PITCH) + 1;
  return Math.min(BUILDING_FIT_MAX_SAMPLES, Math.max(3, wanted));
}

/** Sweep the footprint on a pitch-sized lattice, calling `visit` per point. */
function sweepFootprint(f: FitFootprint, visit: (x: number, z: number) => void): void {
  const nx = axisSamples(f.w);
  const nz = axisSamples(f.d);
  for (let a = 0; a < nx; a++) {
    const lx = (a / (nx - 1) - 0.5) * f.w;
    for (let b = 0; b < nz; b++) {
      const p = worldOf(f, lx, (b / (nz - 1) - 0.5) * f.d);
      visit(p.x, p.z);
    }
  }
}

/** Yards of ground height the footprint spans (highest sample minus lowest). */
export function footprintGrade(f: FitFootprint, probes: BuildingFitProbes): number {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  sweepFootprint(f, (x, z) => {
    const y = probes.groundAt(x, z);
    if (y < lo) lo = y;
    if (y > hi) hi = y;
  });
  return hi - lo;
}

/** Yards from the footprint to the nearest road centreline. */
export function footprintRoadClearance(f: FitFootprint, probes: BuildingFitProbes): number {
  let best = Number.POSITIVE_INFINITY;
  sweepFootprint(f, (x, z) => {
    const d = probes.roadDistanceAt(x, z);
    if (d < best) best = d;
  });
  return best;
}

interface SettledBuilding {
  footprint: FitFootprint;
  door: FitPoint;
}

/** Is this rung no worse than the authored record on every count? */
function rungAcceptable(
  candidate: FitFootprint,
  authored: FitFootprint,
  world: BuildingFitWorld,
  probes: BuildingFitProbes,
  settled: readonly SettledBuilding[],
  authoredGrade: number,
  authoredRoad: number,
): boolean {
  // Cheap, allocation-free rules before the terrain and road sweeps.
  //
  // The fence rule is the one ABSOLUTE: a footprint the theme moved or grew may
  // never reach an authored rail, because a mover stepping into the enlarged box
  // is depenetrated to the NEAREST face, which can sit on the far side of the
  // line that must block (pinned by tests/pathfind.test.ts "blocks crossing
  // every authored fence run" and tests/fence_clearance.test.ts). The authored
  // record is exempt because its yard was authored around that exact footprint,
  // and the authored record is the ladder's floor, so refusing every other rung
  // still terminates.
  if (footprintCrossesAnyFenceRun(candidate, world.fences)) return false;
  const candidateSpan = footprintReach(candidate) + BUILDING_FIT_FIXTURE_CLEARANCE;
  for (const fixture of world.fixtures) {
    const dx = fixture.x - candidate.x;
    const dz = fixture.z - candidate.z;
    if (dx * dx + dz * dz > candidateSpan * candidateSpan) continue;
    const near = footprintPointDistance(candidate, fixture.x, fixture.z);
    if (near >= BUILDING_FIT_FIXTURE_CLEARANCE) continue;
    const was = footprintPointDistance(authored, fixture.x, fixture.z);
    if (near < Math.min(BUILDING_FIT_FIXTURE_CLEARANCE, was)) return false;
  }
  const candidateDoor = footprintDoorPoint(candidate);
  const authoredDoor = footprintDoorPoint(authored);
  for (const other of settled) {
    if (
      footprintsOverlapWithin(candidate, other.footprint, 0) &&
      !footprintsOverlapWithin(authored, other.footprint, 0)
    ) {
      return false;
    }
    if (
      footprintsOverlapWithin(candidate, other.footprint, BUILDING_FIT_NEIGHBOUR_CLEARANCE) &&
      !footprintsOverlapWithin(authored, other.footprint, BUILDING_FIT_NEIGHBOUR_CLEARANCE)
    ) {
      return false;
    }
    // A doorstep inside a wall is a building that swallowed an entrance: the
    // player can never stand where the door lookup (src/sim/interiors.ts
    // computeBuildingDoors) expects them to. Checked BOTH ways, because a
    // record that grows can close over a neighbour's doorstep as easily as it
    // can push its own into a wall.
    if (
      footprintPointDistance(other.footprint, candidateDoor.x, candidateDoor.z) < 0 &&
      footprintPointDistance(other.footprint, authoredDoor.x, authoredDoor.z) >= 0
    ) {
      return false;
    }
    if (
      footprintPointDistance(candidate, other.door.x, other.door.z) < 0 &&
      footprintPointDistance(authored, other.door.x, other.door.z) >= 0
    ) {
      return false;
    }
  }
  if (
    footprintRoadClearance(candidate, probes) < Math.min(BUILDING_FIT_ROAD_CLEARANCE, authoredRoad)
  ) {
    return false;
  }
  if (footprintGrade(candidate, probes) > Math.max(BUILDING_FIT_MAX_GRADE, authoredGrade)) {
    return false;
  }
  return true;
}

/**
 * Settle a whole world's themed buildings, in array order.
 *
 * Order is load-bearing and deterministic: a record checks its walls against
 * everything already settled ahead of it and nothing behind, so no two settled
 * footprints can intersect unless the AUTHORED pair already did. Array order is
 * also what src/sim/interiors.ts numbers interiors by, so the output preserves
 * it one for one.
 */
export function resolveThemedBuildings(
  inputs: readonly ThemedBuildingInput[],
  spread: number,
  scale: number,
  world: BuildingFitWorld,
  probes: BuildingFitProbes,
): ThemedBuildingFit[] {
  const out: ThemedBuildingFit[] = [];
  const settled: SettledBuilding[] = [];
  const settle = (fit: ThemedBuildingFit): void => {
    out.push(fit);
    settled.push({ footprint: fit.footprint, door: footprintDoorPoint(fit.footprint) });
  };
  for (const input of inputs) {
    if (!input.themed) {
      settle({ reach: 0, footprint: input.base });
      continue;
    }
    const authoredGrade = footprintGrade(input.base, probes);
    const authoredRoad = footprintRoadClearance(input.base, probes);
    let fit: ThemedBuildingFit = { reach: 0, footprint: input.base };
    for (const reach of BUILDING_FIT_REACH_LADDER) {
      if (reach === 0) break; // the authored record is the floor, already held
      const candidate = themedFootprintAt(input.base, input.hub, spread, scale, reach);
      if (
        rungAcceptable(candidate, input.base, world, probes, settled, authoredGrade, authoredRoad)
      ) {
        fit = { reach, footprint: candidate };
        break;
      }
    }
    settle(fit);
  }
  return out;
}
