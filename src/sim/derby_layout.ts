// The Thornwheel Circuit, Eastbrook Vale's mine-kart racing ground, as plain
// numbers. Like vale_cup_layout.ts (the Sowfield) this module is the single
// source of truth for FOUR consumers that must never drift: the terrain
// flatten arm (src/sim/world.ts), the movement/camera colliders
// (src/sim/colliders.ts staticWorldColliders), the race progression logic
// (src/sim/social/derby.ts checkpoint rings), and the render dressing
// (src/render/derby_track.ts).
//
// All coordinates are WORLD coordinates on the east bluffs of Eastbrook Vale
// (zone 1). The site is the open shelf east of Boar Meadow (POI 65,0) and
// south of the Fallen Chapel grounds: the boar packs reach x <= 98 (camp
// 80,-15 r18 and 55,12 r22), the chapel dead reach z >= 60 only at x <= 98
// (camp 80,78 r18), Mogger's knoll sits at (118,-26) r5 south of the site,
// and the world-rim climb starts at |x| = 150 (world.ts rimX onset,
// WORLD_MAX_X - 30). The circuit keeps xMax 144, one flatten-falloff clear
// of the rim onset, the Sowfield's zMin precedent. Compass: +z is north, so
// the circuit's long axis runs north-south along the bluffs.
// Sim layer: no three.js imports.
import type { Collider } from './colliders';

// ---------------------------------------------------------------------------
// Site footprint
// ---------------------------------------------------------------------------
export const THORNWHEEL_CENTER = { x: 124, z: 32 };

// Flattened plateau (terrain arm): rectangle + smooth falloff ring, the
// SOWFIELD_FLAT pattern. The shelf out here rolls higher than the vale floor,
// so the pad sits at +0.8 and the falloff apron blends the approach from Boar
// Meadow into a gentle climb. xMax 144 + falloff 8 reaches 152: the rim rise
// only STARTS at 150, and the first two yards of onset are a sub-climb-limit
// toe (tests/terrain_walls.test.ts samples the wall further in), so the blend
// never fights the impassable band.
export const THORNWHEEL_FLAT = {
  xMin: 104,
  xMax: 144,
  zMin: 4,
  zMax: 60,
  height: 0.8,
  falloff: 8, // yards of smoothstep ring outside the rectangle
};

// Decoration exclusion (world.ts generateDecorations arm + render foliage /
// critters / motes): keep procedural trees, rocks, wildlife, and pollen off
// the whole shell INCLUDING the flatten's falloff apron, the Sowfield rule.
export const THORNWHEEL_EXCLUDE = { xMin: 94, xMax: 154, zMin: -6, zMax: 70 };

// ---------------------------------------------------------------------------
// The circuit. A rounded-rectangle dirt ribbon TRACK_HALF_W wide around a
// fenced infield island; karts bank off the low sleeper fences so there is no
// out-of-bounds. The centerline rectangle below is what the checkpoints, the
// fences, and the rendered ribbon are all derived from.
// ---------------------------------------------------------------------------
export const TRACK_HALF_W = 3.5; // ribbon half width: 7yd of racing surface
export const TRACK_CENTERLINE = { xMin: 111, xMax: 137, zMin: 11, zMax: 53 };
export const TRACK_CORNER_R = 6; // centerline corner radius (render arcs)

// Outer fence rectangle (outside edge of the ribbon) and infield island fence
// (inside edge). Movement colliders live ON these rectangles; the public gate
// gap in the west outer fence is the only way in on foot.
export const TRACK_OUTER = {
  xMin: TRACK_CENTERLINE.xMin - TRACK_HALF_W,
  xMax: TRACK_CENTERLINE.xMax + TRACK_HALF_W,
  zMin: TRACK_CENTERLINE.zMin - TRACK_HALF_W,
  zMax: TRACK_CENTERLINE.zMax + TRACK_HALF_W,
};
export const TRACK_INFIELD = {
  xMin: TRACK_CENTERLINE.xMin + TRACK_HALF_W,
  xMax: TRACK_CENTERLINE.xMax - TRACK_HALF_W,
  zMin: TRACK_CENTERLINE.zMin + TRACK_HALF_W,
  zMax: TRACK_CENTERLINE.zMax - TRACK_HALF_W,
};

// The public gate gap in the west outer fence (paddock side, facing the vale).
export const DERBY_GATE = { x: TRACK_OUTER.xMin, z: 32, halfW: 3 };

// ---------------------------------------------------------------------------
// Race course. Eight ordered checkpoint rings around the centerline, indexed
// clockwise looking down (+z north): racers leave the start line heading
// NORTH up the west straight. Checkpoint 0 is the start/finish line on the
// west straight; crossing it after checkpoint 7 completes a lap.
// ---------------------------------------------------------------------------
export const DERBY_CP_RADIUS = 6; // yd a racer must pass within to take a ring
export const DERBY_LAPS = 3;

export interface DerbyCheckpoint {
  x: number;
  z: number;
}

export const DERBY_CHECKPOINTS: readonly DerbyCheckpoint[] = [
  { x: TRACK_CENTERLINE.xMin, z: 32 }, // 0: start/finish, west straight
  { x: TRACK_CENTERLINE.xMin, z: TRACK_CENTERLINE.zMax - 4 }, // 1: NW corner entry
  { x: TRACK_CENTERLINE.xMin + 8, z: TRACK_CENTERLINE.zMax }, // 2: north straight W
  { x: TRACK_CENTERLINE.xMax - 8, z: TRACK_CENTERLINE.zMax }, // 3: north straight E
  { x: TRACK_CENTERLINE.xMax, z: TRACK_CENTERLINE.zMax - 8 }, // 4: NE corner exit
  { x: TRACK_CENTERLINE.xMax, z: TRACK_CENTERLINE.zMin + 8 }, // 5: SE corner entry
  { x: TRACK_CENTERLINE.xMax - 8, z: TRACK_CENTERLINE.zMin }, // 6: south straight
  { x: TRACK_CENTERLINE.xMin + 4, z: TRACK_CENTERLINE.zMin + 2 }, // 7: SW corner
];

// Starting grid: staggered two-abreast slots on the west straight just south
// of the start line, all facing north (the direction of travel).
const FACE_NORTH = 0; // facing 0 points +z (sin 0 = 0, cos 0 = 1)
export interface DerbyGridSlot {
  x: number;
  z: number;
  facing: number;
}
export const DERBY_GRID: readonly DerbyGridSlot[] = Array.from({ length: 6 }, (_, i) => ({
  x: TRACK_CENTERLINE.xMin + (i % 2 === 0 ? -1.4 : 1.4),
  z: 29 - Math.floor(i / 2) * 2.6,
  facing: FACE_NORTH,
}));
export const DERBY_MAX_RACERS = DERBY_GRID.length;

// Race Marshal Pip's stand and the winners' podium, outside the gate on the
// paddock apron (the BRAM_POS / PLINTH_POS pattern).
export const MARSHAL_POS = { x: TRACK_OUTER.xMin - 5, z: 35, facing: Math.PI / 2 };
export const PODIUM_POS = { x: TRACK_OUTER.xMin - 5, z: 27 };

// Checkpoint flag poles (render) stand on the OUTER fence line beside each
// ring so they never sit in the racing groove.
export const DERBY_FLAG_POLES: readonly { x: number; z: number }[] = DERBY_CHECKPOINTS.map((cp) => {
  const cx = THORNWHEEL_CENTER.x;
  const cz = THORNWHEEL_CENTER.z;
  const dx = cp.x - cx;
  const dz = cp.z - cz;
  const len = Math.hypot(dx, dz) || 1;
  return {
    x: cp.x + (dx / len) * (TRACK_HALF_W + 1),
    z: cp.z + (dz / len) * (TRACK_HALF_W + 1),
  };
});

// Brazier floodlights at the four outer corners (render: fireLights budget).
export const DERBY_BRAZIERS: readonly { x: number; z: number }[] = [
  { x: TRACK_OUTER.xMin - 2, z: TRACK_OUTER.zMin - 2 },
  { x: TRACK_OUTER.xMin - 2, z: TRACK_OUTER.zMax + 2 },
  { x: TRACK_OUTER.xMax + 2, z: TRACK_OUTER.zMin - 2 },
  { x: TRACK_OUTER.xMax + 2, z: TRACK_OUTER.zMax + 2 },
];

/** Inside the circuit shell (music/ambience/presence predicate). */
export function isAtThornwheel(x: number, z: number): boolean {
  return (
    x >= THORNWHEEL_FLAT.xMin - 6 &&
    x <= THORNWHEEL_FLAT.xMax + 6 &&
    z >= THORNWHEEL_FLAT.zMin - 6 &&
    z <= THORNWHEEL_FLAT.zMax + 6
  );
}

/**
 * Inside the full circuit footprint including the flatten's falloff apron.
 * Reused (the isInSowfieldShell rule) to keep procedural trees, rocks, grass
 * tufts, ambient critters, and drifting pollen off the racing ground.
 */
export function isInThornwheelShell(x: number, z: number): boolean {
  return (
    x >= THORNWHEEL_EXCLUDE.xMin &&
    x <= THORNWHEEL_EXCLUDE.xMax &&
    z >= THORNWHEEL_EXCLUDE.zMin &&
    z <= THORNWHEEL_EXCLUDE.zMax
  );
}

/** Inside the fenced racing ground (ribbon or infield). */
export function isOnCircuit(x: number, z: number): boolean {
  return (
    x >= TRACK_OUTER.xMin && x <= TRACK_OUTER.xMax && z >= TRACK_OUTER.zMin && z <= TRACK_OUTER.zMax
  );
}

// ---------------------------------------------------------------------------
// Collision set, appended to the overworld static grid (colliders.ts). Sleeper
// fences are building-style solid OBBs (NOT isFence: jump-through rails would
// let a kart hop the wall mid-race; the west gate gaps instead), the Sowfield
// board rule. The infield island is fenced on all four sides with no gap: the
// only thing in there is dressing, and a solid ring keeps spectators from
// wandering across the groove to reach it.
// ---------------------------------------------------------------------------
const FENCE_T = 0.4; // fence half thickness
const FENCE_H = 1.1; // visual sleeper-fence height above the pad

export function derbyColliders(): Collider[] {
  const out: Collider[] = [];
  const fenceTop = THORNWHEEL_FLAT.height + FENCE_H;
  const o = TRACK_OUTER;
  const i = TRACK_INFIELD;
  const midX = (o.xMin + o.xMax) / 2;
  const midZ = (o.zMin + o.zMax) / 2;

  // west outer fence, gapped at the gate
  const gateS = DERBY_GATE.z - DERBY_GATE.halfW;
  const gateN = DERBY_GATE.z + DERBY_GATE.halfW;
  out.push({
    type: 'obb',
    x: o.xMin,
    z: (o.zMin + gateS) / 2,
    hw: FENCE_T,
    hd: (gateS - o.zMin) / 2,
    rot: 0,
    cameraTopY: fenceTop,
    camGhost: true,
  });
  out.push({
    type: 'obb',
    x: o.xMin,
    z: (gateN + o.zMax) / 2,
    hw: FENCE_T,
    hd: (o.zMax - gateN) / 2,
    rot: 0,
    cameraTopY: fenceTop,
    camGhost: true,
  });
  // east outer fence, full length
  out.push({
    type: 'obb',
    x: o.xMax,
    z: midZ,
    hw: FENCE_T,
    hd: (o.zMax - o.zMin) / 2,
    rot: 0,
    cameraTopY: fenceTop,
    camGhost: true,
  });
  // north + south outer fences, full width
  for (const fz of [o.zMin, o.zMax]) {
    out.push({
      type: 'obb',
      x: midX,
      z: fz,
      hw: (o.xMax - o.xMin) / 2 + FENCE_T,
      hd: FENCE_T,
      rot: 0,
      cameraTopY: fenceTop,
      camGhost: true,
    });
  }
  // infield island fence, closed ring
  for (const fz of [i.zMin, i.zMax]) {
    out.push({
      type: 'obb',
      x: midX,
      z: fz,
      hw: (i.xMax - i.xMin) / 2 + FENCE_T,
      hd: FENCE_T,
      rot: 0,
      cameraTopY: fenceTop,
      camGhost: true,
    });
  }
  for (const fx of [i.xMin, i.xMax]) {
    out.push({
      type: 'obb',
      x: fx,
      z: midZ,
      hw: FENCE_T,
      hd: (i.zMax - i.zMin) / 2,
      rot: 0,
      cameraTopY: fenceTop,
      camGhost: true,
    });
  }
  // the winners' podium
  out.push({
    type: 'circle',
    x: PODIUM_POS.x,
    z: PODIUM_POS.z,
    r: 1.1,
    cameraTopY: THORNWHEEL_FLAT.height + 1.6,
    camGhost: true,
  });
  return out;
}
