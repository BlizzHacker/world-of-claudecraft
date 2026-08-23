import { afterAll, describe, expect, it } from 'vitest';
import {
  BUILDING_FIT_FIXTURE_CLEARANCE,
  BUILDING_FIT_MAX_GRADE,
  BUILDING_FIT_REACH_LADDER,
  BUILDING_FIT_ROAD_CLEARANCE,
  BUILDING_FIT_SAMPLE_PITCH,
  type BuildingFitProbes,
  type FitFootprint,
  footprintDoorPoint,
  footprintGrade,
  footprintPointDistance,
  footprintRoadClearance,
  footprintsOverlapWithin,
  resolveThemedBuildings,
  type ThemedBuildingInput,
  themedFootprintAt,
} from '../src/sim/building_theme_fit';
import { BUILTIN_WORLD, getActiveWorldContent } from '../src/sim/data';
import { footprintCrossesAnyFenceRun } from '../src/sim/fence_clearance';
import { setActiveRealmForOffline } from '../src/sim/realms/registry';
import type { RealmId } from '../src/sim/realms/types';
import type { BuildingDef, WorldContent } from '../src/sim/types';
import { roadDistance, terrainHeight } from '../src/sim/world';
import { WORLD_SEED } from '../src/sim/world_seed';

// The live-world defect: a realm worldTheme grew every procedural building and
// pushed the settlement ones outward from their zone hub with nothing re-solved
// after the move. Infernal (scale 1.9, spread 2.6) therefore shoved buildings
// off the flat hub plateau onto natural relief (one Icemantle inn spanning
// twelve yards of terrain drop), parked five of them across the carriageway,
// and closed scaled walls over crates and a mailbox that never moved. The
// operator's report: the buildings are resized but not placed.

const FLAT: BuildingFitProbes = {
  groundAt: () => 0,
  roadDistanceAt: () => Number.POSITIVE_INFINITY,
};

/** Ground that is dead flat west of x = 0 and falls away hard east of it. */
const CLIFF: BuildingFitProbes = {
  groundAt: (x) => (x <= 0 ? 0 : -x),
  roadDistanceAt: () => Number.POSITIVE_INFINITY,
};

/** A road running along x = 40. */
const LANE: BuildingFitProbes = {
  groundAt: () => 0,
  roadDistanceAt: (x) => Math.abs(x - 40),
};

const box = (x: number, z: number, w = 8, d = 6, rot = 0): FitFootprint => ({ x, z, w, d, rot });

const themedInput = (base: FitFootprint, hub: { x: number; z: number } | null = { x: 0, z: 0 }) =>
  ({ base, hub, themed: true }) satisfies ThemedBuildingInput;

describe('the reach ladder', () => {
  it('runs from the full theme down to the authored record', () => {
    expect(BUILDING_FIT_REACH_LADDER[0]).toBe(1);
    expect(BUILDING_FIT_REACH_LADDER[BUILDING_FIT_REACH_LADDER.length - 1]).toBe(0);
    for (let i = 1; i < BUILDING_FIT_REACH_LADDER.length; i++) {
      expect(BUILDING_FIT_REACH_LADDER[i]).toBeLessThan(BUILDING_FIT_REACH_LADDER[i - 1]);
    }
  });

  it('spreads a settlement record about its hub and scales an outlier in place', () => {
    const base = box(10, 0, 8, 6);
    const settled = themedFootprintAt(base, { x: 0, z: 0 }, 2.6, 1.9, 1);
    expect(settled.x).toBeCloseTo(26);
    expect(settled.w).toBeCloseTo(15.2);
    const outlier = themedFootprintAt(base, null, 2.6, 1.9, 1);
    expect(outlier.x).toBe(10);
    expect(outlier.w).toBeCloseTo(15.2);
    // reach 0 is the authored record, exactly
    expect(themedFootprintAt(base, { x: 0, z: 0 }, 2.6, 1.9, 0)).toEqual(base);
  });
});

describe('a rung is refused when it is worse than the authored record', () => {
  const world = { fences: [], fixtures: [] };

  it('takes the whole theme on open flat ground', () => {
    const [fit] = resolveThemedBuildings([themedInput(box(10, 0))], 2.6, 1.9, world, FLAT);
    expect(fit.reach).toBe(1);
    expect(fit.footprint.x).toBeCloseTo(26);
  });

  it('backs off rather than spanning more ground than it can sit on', () => {
    const [fit] = resolveThemedBuildings([themedInput(box(4, 0))], 2.6, 1.9, world, CLIFF);
    expect(fit.reach).toBeLessThan(1);
    expect(footprintGrade(fit.footprint, CLIFF)).toBeLessThanOrEqual(
      Math.max(BUILDING_FIT_MAX_GRADE, footprintGrade(box(4, 0), CLIFF)),
    );
  });

  it('backs off rather than closing over the carriageway', () => {
    const base = box(15, 0);
    expect(footprintRoadClearance(base, LANE)).toBeGreaterThanOrEqual(BUILDING_FIT_ROAD_CLEARANCE);
    const [fit] = resolveThemedBuildings([themedInput(base)], 2.6, 1.9, world, LANE);
    expect(fit.reach).toBeLessThan(1);
    expect(footprintRoadClearance(fit.footprint, LANE)).toBeGreaterThanOrEqual(
      BUILDING_FIT_ROAD_CLEARANCE,
    );
  });

  it('sweeps on a pitch, so a lane cannot hide between two samples', () => {
    // A fixed 3x3 lattice over a scaled inn leaves seven yards between samples,
    // which is a whole carriageway wide. The sweep is pitched instead.
    const wide = box(0, 0, 24, 24);
    const throughTheMiddle: BuildingFitProbes = {
      groundAt: () => 0,
      roadDistanceAt: (x) => Math.abs(x - 6),
    };
    expect(footprintRoadClearance(wide, throughTheMiddle)).toBeLessThanOrEqual(
      BUILDING_FIT_SAMPLE_PITCH / 2,
    );
  });

  it('backs off rather than swallowing an unmoved town fixture', () => {
    const base = box(10, 0);
    const stall = { x: 24, z: 0 };
    expect(footprintPointDistance(base, stall.x, stall.z)).toBeGreaterThan(
      BUILDING_FIT_FIXTURE_CLEARANCE,
    );
    const [fit] = resolveThemedBuildings(
      [themedInput(base)],
      2.6,
      1.9,
      { fences: [], fixtures: [stall] },
      FLAT,
    );
    expect(footprintPointDistance(fit.footprint, stall.x, stall.z)).toBeGreaterThanOrEqual(
      BUILDING_FIT_FIXTURE_CLEARANCE,
    );
  });

  it('backs off rather than crossing an authored fence run', () => {
    const base = box(10, 0);
    const fence = { x1: 20, z1: -30, x2: 20, z2: 30 };
    const [fit] = resolveThemedBuildings(
      [themedInput(base)],
      2.6,
      1.9,
      { fences: [fence], fixtures: [] },
      FLAT,
    );
    expect(fit.reach).toBeLessThan(1);
    // and it keeps SOME of the theme, where the old all-or-nothing revert
    // dropped the record back to its authored size for a single rail
    expect(fit.footprint.w).toBeGreaterThan(base.w);
  });

  it('settles two buildings without letting their walls intersect', () => {
    const inputs = [themedInput(box(10, 0)), themedInput(box(10, 14))];
    const fits = resolveThemedBuildings(inputs, 2.6, 1.9, world, FLAT);
    expect(footprintsOverlapWithin(fits[0].footprint, fits[1].footprint, 0)).toBe(false);
  });

  it('keeps a doorstep out of a neighbour that already settled', () => {
    // The later record's front face (+z local) would otherwise open straight
    // into the wall of the record ahead of it.
    const first = box(0, 30, 30, 30);
    const second = box(0, 6, 6, 6);
    const fits = resolveThemedBuildings(
      [{ base: first, hub: null, themed: false }, themedInput(second, null)],
      2.6,
      1.9,
      world,
      FLAT,
    );
    const door = footprintDoorPoint(fits[1].footprint);
    expect(footprintPointDistance(fits[0].footprint, door.x, door.z)).toBeGreaterThanOrEqual(0);
  });

  it('never themes a record the theme does not apply to', () => {
    const base = box(10, 0);
    const [fit] = resolveThemedBuildings(
      [{ base, hub: { x: 0, z: 0 }, themed: false }],
      2.6,
      1.9,
      world,
      FLAT,
    );
    expect(fit).toEqual({ reach: 0, footprint: base });
  });
});

// ── the shipped world ───────────────────────────────────────────────────────

const PROBES: BuildingFitProbes = {
  groundAt: (x, z) => terrainHeight(x, z, WORLD_SEED),
  roadDistanceAt: (x, z) => roadDistance(x, z),
};

function themedWorldFor(realm: RealmId): WorldContent {
  setActiveRealmForOffline(realm);
  return getActiveWorldContent();
}

const asFootprint = (b: BuildingDef): FitFootprint => ({
  x: b.x,
  z: b.z,
  w: b.w,
  d: b.d,
  rot: b.rot,
});

/** Every realm that ships a worldTheme (src/sim/realms/content/*). */
const THEMED_REALMS: RealmId[] = [
  'infernal',
  'classic',
  'arcane',
  'dominion',
  'arcadevoid',
  'crypticrealm',
  'exchange',
];

/** The arithmetic the theme shipped before the fit: hub-anchored multiply,
 *  scale everywhere, and drop the WHOLE record back to authored if the result
 *  reaches an authored fence run. Kept here so the assertions below cannot go
 *  vacuous: this is the layout they have to reject. */
function unfitThemed(spread: number, scale: number): FitFootprint[] {
  return BUILTIN_WORLD.props.buildings.map((b) => {
    const authored = asFootprint(b);
    if (b.assetId) return authored;
    const hub = hubFor(b.x, b.z);
    const inSettlement = Math.hypot(b.x - hub.x, b.z - hub.z) <= hub.radius;
    const themed = themedFootprintAt(authored, inSettlement ? hub : null, spread, scale, 1);
    return footprintCrossesAnyFenceRun(themed, BUILTIN_WORLD.props.fences) ? authored : themed;
  });
}

function hubFor(x: number, z: number): { x: number; z: number; radius: number } {
  let fallback: (typeof BUILTIN_WORLD.zones)[number] | null = null;
  for (const zone of BUILTIN_WORLD.zones) {
    if (z >= zone.zMax) continue;
    if (fallback === null || zone.zMax < fallback.zMax) fallback = zone;
    const x0 = zone.xMin ?? Number.NEGATIVE_INFINITY;
    const x1 = zone.xMax ?? Number.POSITIVE_INFINITY;
    if (z >= zone.zMin && x >= x0 && x < x1) return zone.hub;
  }
  return (fallback ?? BUILTIN_WORLD.zones[0]).hub;
}

describe('the shipped themed towns are coherent', () => {
  afterAll(() => setActiveRealmForOffline(null));

  it('rejects the unfit layout the theme used to ship', () => {
    // Infernal: buildingScale 1.9, buildingSpread 2.6.
    const unfit = unfitThemed(2.6, 1.9);
    const fixtures = townFixtures(BUILTIN_WORLD);
    let worstGrade = 0;
    let onRoad = 0;
    let swallowed = 0;
    unfit.forEach((f, i) => {
      const authored = asFootprint(BUILTIN_WORLD.props.buildings[i]);
      worstGrade = Math.max(worstGrade, footprintGrade(f, PROBES));
      if (
        footprintRoadClearance(f, PROBES) < BUILDING_FIT_ROAD_CLEARANCE &&
        footprintRoadClearance(authored, PROBES) >= BUILDING_FIT_ROAD_CLEARANCE
      ) {
        onRoad++;
      }
      for (const [, x, z] of fixtures) {
        if (footprintPointDistance(f, x, z) >= 0) continue;
        if (footprintPointDistance(authored, x, z) < 0) continue;
        swallowed++;
      }
    });
    // the Icemantle inn the operator's screenshots caught floating
    expect(worstGrade).toBeGreaterThan(10);
    expect(onRoad).toBeGreaterThan(0);
    expect(swallowed).toBeGreaterThan(0);
  });

  it('leaves the vanilla realm byte-identical to the built-in world', () => {
    expect(themedWorldFor('claudecraft')).toBe(BUILTIN_WORLD);
  });

  it('never spans a building over more ground than it can sit on', () => {
    for (const realm of THEMED_REALMS) {
      const themed = themedWorldFor(realm);
      themed.props.buildings.forEach((b, i) => {
        const authored = BUILTIN_WORLD.props.buildings[i];
        const grade = footprintGrade(asFootprint(b), PROBES);
        const authoredGrade = footprintGrade(asFootprint(authored), PROBES);
        expect(
          grade,
          `${realm} ${b.kind} at ${b.x.toFixed(0)},${b.z.toFixed(0)} spans ${grade.toFixed(1)} yards of ground`,
        ).toBeLessThanOrEqual(Math.max(BUILDING_FIT_MAX_GRADE, authoredGrade) + 1e-6);
      });
    }
  });

  it('never closes a building over a carriageway that was clear', () => {
    for (const realm of THEMED_REALMS) {
      const themed = themedWorldFor(realm);
      themed.props.buildings.forEach((b, i) => {
        const authored = BUILTIN_WORLD.props.buildings[i];
        const clear = footprintRoadClearance(asFootprint(b), PROBES);
        const authoredClear = footprintRoadClearance(asFootprint(authored), PROBES);
        expect(
          clear,
          `${realm} ${b.kind} at ${b.x.toFixed(0)},${b.z.toFixed(0)} sits on the road`,
        ).toBeGreaterThanOrEqual(Math.min(BUILDING_FIT_ROAD_CLEARANCE, authoredClear) - 1e-6);
      });
    }
  });

  it('never closes a building over a town fixture that was clear of it', () => {
    for (const realm of THEMED_REALMS) {
      const themed = themedWorldFor(realm);
      const fixtures = townFixtures(BUILTIN_WORLD);
      themed.props.buildings.forEach((b, i) => {
        const authored = asFootprint(BUILTIN_WORLD.props.buildings[i]);
        const now = asFootprint(b);
        for (const [label, x, z] of fixtures) {
          const near = footprintPointDistance(now, x, z);
          if (near >= BUILDING_FIT_FIXTURE_CLEARANCE) continue;
          const was = footprintPointDistance(authored, x, z);
          expect(
            near,
            `${realm} ${b.kind} at ${b.x.toFixed(0)},${b.z.toFixed(0)} closed over ${label}`,
          ).toBeGreaterThanOrEqual(Math.min(BUILDING_FIT_FIXTURE_CLEARANCE, was) - 1e-6);
        }
      });
    }
  });

  it('never intersects two buildings that the authored world kept apart', () => {
    for (const realm of THEMED_REALMS) {
      const themed = themedWorldFor(realm);
      const bs = themed.props.buildings;
      for (let i = 0; i < bs.length; i++) {
        for (let j = i + 1; j < bs.length; j++) {
          if (!footprintsOverlapWithin(asFootprint(bs[i]), asFootprint(bs[j]), 0)) continue;
          const wasOverlapping = footprintsOverlapWithin(
            asFootprint(BUILTIN_WORLD.props.buildings[i]),
            asFootprint(BUILTIN_WORLD.props.buildings[j]),
            0,
          );
          expect(
            wasOverlapping,
            `${realm} ${bs[i].kind}@${bs[i].x.toFixed(0)},${bs[i].z.toFixed(0)} now intersects ${bs[j].kind}@${bs[j].x.toFixed(0)},${bs[j].z.toFixed(0)}`,
          ).toBe(true);
        }
      }
    }
  });

  it('never opens a doorstep into a neighbour that was clear of it', () => {
    for (const realm of THEMED_REALMS) {
      const themed = themedWorldFor(realm);
      const bs = themed.props.buildings;
      bs.forEach((b, i) => {
        const door = footprintDoorPoint(asFootprint(b));
        const authoredDoor = footprintDoorPoint(asFootprint(BUILTIN_WORLD.props.buildings[i]));
        bs.forEach((other, j) => {
          if (i === j) return;
          if (footprintPointDistance(asFootprint(other), door.x, door.z) >= 0) return;
          const wasBlocked =
            footprintPointDistance(
              asFootprint(BUILTIN_WORLD.props.buildings[j]),
              authoredDoor.x,
              authoredDoor.z,
            ) < 0;
          expect(
            wasBlocked,
            `${realm} ${b.kind}@${b.x.toFixed(0)},${b.z.toFixed(0)} opens into ${other.kind}@${other.x.toFixed(0)},${other.z.toFixed(0)}`,
          ).toBe(true);
        });
      });
    }
  });

  it('still makes the infernal town grander than vanilla', () => {
    const themed = themedWorldFor('infernal');
    let grown = 0;
    let moved = 0;
    themed.props.buildings.forEach((b, i) => {
      const authored = BUILTIN_WORLD.props.buildings[i];
      if (b.w > authored.w + 1e-9) grown++;
      if (b.x !== authored.x || b.z !== authored.z) moved++;
    });
    // the fit is a back-off, never a veto: most procedural records still take
    // a real share of the theme
    expect(grown).toBeGreaterThan(30);
    expect(moved).toBeGreaterThan(30);
  });

  it('keeps the record order interiors are numbered by', () => {
    const themed = themedWorldFor('infernal');
    expect(themed.props.buildings.length).toBe(BUILTIN_WORLD.props.buildings.length);
    themed.props.buildings.forEach((b, i) => {
      const authored = BUILTIN_WORLD.props.buildings[i];
      expect(b.kind).toBe(authored.kind);
      expect(b.rot).toBe(authored.rot);
      expect(b.assetId).toBe(authored.assetId);
    });
  });
});

function townFixtures(world: WorldContent): [string, number, number][] {
  const props = world.props;
  const out: [string, number, number][] = [];
  for (const s of props.stalls) out.push(['a stall', s.x, s.z]);
  for (const w of props.wells) out.push(['a well', w.x, w.z]);
  for (const [x, z] of props.crates) out.push(['a crate', x, z]);
  for (const [x, z] of props.campfires) out.push(['a campfire', x, z]);
  for (const t of props.tents) out.push(['a tent', t.x, t.z]);
  for (const b of props.benches ?? []) out.push(['a bench', b.x, b.z]);
  for (const [id, npc] of Object.entries(world.npcs)) out.push([id, npc.pos.x, npc.pos.z]);
  for (const s of world.services?.stations ?? []) out.push([s.id, s.pos.x, s.pos.z]);
  for (const m of world.services?.mailboxes ?? []) out.push(['a mailbox', m.x, m.z]);
  for (const n of world.services?.noticeboards ?? []) out.push(['a noticeboard', n.x, n.z]);
  return out;
}
