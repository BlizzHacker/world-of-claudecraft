// The Boarpit: Eastbrook Vale's bare-knuckle brawling ring on the knoll
// north-east of town, as plain numbers. Like vale_cup_layout.ts and
// derby_layout.ts this module is the single source of truth for its
// consumers: the terrain flatten arm (src/sim/world.ts), the movement
// colliders (src/sim/colliders.ts), the bout logic (src/sim/social/boarpit.ts
// spawn slots + venue predicates), and the render dressing
// (src/render/boarpit.ts).
//
// Site survey: the knoll at (30, 110) on the Brightwood road holds the ONE
// genuinely quiet pocket in mid-vale: the nearest camp is the second wolf run
// (20,70 r20), whose northern edge stops at z 90 — a full 20yd south of the
// pad's apron — and the Brightwood Glade grounds start past z 130. Every
// other camp (boars 55,12 / 80,-15, chapel dead 80,78, Sableweb, bandits) is
// 40yd+ away, so nobody bleeding out at the signup table. (The first cut at
// (56,52) put the gate INSIDE the boar meadow's aggro reach; a venue whose
// queue gets eaten is not a venue.)
// Sim layer: no three.js imports.
import type { Collider } from './colliders';

// ---------------------------------------------------------------------------
// Site footprint
// ---------------------------------------------------------------------------
export const BOARPIT_CENTER = { x: 30, z: 110 };

// Flattened pad (terrain arm): the same rectangle + smoothstep apron shape the
// Sowfield and the Thornwheel use.
export const BOARPIT_FLAT = {
  xMin: 18,
  xMax: 42,
  zMin: 98,
  zMax: 122,
  height: 1.2,
  falloff: 8, // yards of smoothstep ring outside the rectangle
};

// Decoration exclusion (world.ts + render foliage/critters/motes).
export const BOARPIT_EXCLUDE = { xMin: 8, xMax: 52, zMin: 88, zMax: 132 };

// The fighting ring: a stake-fenced circle with one gate on the NORTH side,
// facing the Brightwood road: the south approach is the wolf side (camp 20,70
// wanders to z 90 and Old Greyjaw prowls at 0,95), so the signup table keeps
// the ring between itself and the teeth. Fighters spar INSIDE; spectators
// watch over the stakes.
export const PIT_R = 9; // ring radius (stake line)
export const PIT_GATE_ANGLE = 0; // gate faces north (+z from center)
export const PIT_GATE_HALF_ANGLE = 0.28; // radians of stake line left open

// The Pit Master's post, just outside the gate.
export const PIT_MASTER_POS = { x: 30, z: 122.5, facing: Math.PI };

// Four fighter slots around the ring interior, facing the center — bouts are
// 1v1 up to a 4-way free-for-all (the smash-bros card size).
export interface PitSlot {
  x: number;
  z: number;
  facing: number;
}
export const PIT_SLOTS: readonly PitSlot[] = Array.from({ length: 4 }, (_, i) => {
  const ang = (i / 4) * Math.PI * 2;
  const x = BOARPIT_CENTER.x + Math.sin(ang) * (PIT_R - 3);
  const z = BOARPIT_CENTER.z + Math.cos(ang) * (PIT_R - 3);
  return { x, z, facing: Math.atan2(BOARPIT_CENTER.x - x, BOARPIT_CENTER.z - z) };
});
export const PIT_MAX_FIGHTERS = PIT_SLOTS.length;

// Where a knocked-out fighter is set down to catch their breath: the rail by
// the gate, outside the stake line.
export const PIT_KO_SPOT = { x: 27, z: 121, facing: Math.PI };

// Torch posts around the stake line (render flame/light budget).
export const PIT_TORCHES: readonly { x: number; z: number }[] = Array.from(
  { length: 4 },
  (_, i) => {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    return {
      x: BOARPIT_CENTER.x + Math.sin(ang) * (PIT_R + 1.2),
      z: BOARPIT_CENTER.z + Math.cos(ang) * (PIT_R + 1.2),
    };
  },
);

/** Inside the venue shell (ambience/presence predicate). */
export function isAtBoarpit(x: number, z: number): boolean {
  return (
    x >= BOARPIT_FLAT.xMin - 6 &&
    x <= BOARPIT_FLAT.xMax + 6 &&
    z >= BOARPIT_FLAT.zMin - 6 &&
    z <= BOARPIT_FLAT.zMax + 6
  );
}

/** Inside the full footprint incl. the falloff apron (decoration exclusion). */
export function isInBoarpitShell(x: number, z: number): boolean {
  return (
    x >= BOARPIT_EXCLUDE.xMin &&
    x <= BOARPIT_EXCLUDE.xMax &&
    z >= BOARPIT_EXCLUDE.zMin &&
    z <= BOARPIT_EXCLUDE.zMax
  );
}

/** Inside the stake ring (bout rules apply). */
export function isInPit(x: number, z: number): boolean {
  const dx = x - BOARPIT_CENTER.x;
  const dz = z - BOARPIT_CENTER.z;
  return dx * dx + dz * dz <= PIT_R * PIT_R;
}

// ---------------------------------------------------------------------------
// Collision set, appended to the overworld static grid (colliders.ts): the
// stake ring approximated by short OBB segments with the south gate left
// open (solid stakes, never isFence: a hopped fence mid-bout is an exploit).
// ---------------------------------------------------------------------------
const STAKE_SEGMENTS = 18;
const STAKE_T = 0.35;
const STAKE_H = 1.4;

export function boarpitColliders(): Collider[] {
  const out: Collider[] = [];
  const stakeTop = BOARPIT_FLAT.height + STAKE_H;
  const segArc = (Math.PI * 2) / STAKE_SEGMENTS;
  for (let i = 0; i < STAKE_SEGMENTS; i++) {
    const mid = i * segArc + segArc / 2;
    // leave the gate arc open
    let delta = mid - PIT_GATE_ANGLE;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    if (Math.abs(delta) <= PIT_GATE_HALF_ANGLE) continue;
    const x = BOARPIT_CENTER.x + Math.sin(mid) * PIT_R;
    const z = BOARPIT_CENTER.z + Math.cos(mid) * PIT_R;
    const segLen = PIT_R * segArc;
    out.push({
      type: 'obb',
      x,
      z,
      hw: segLen / 2 + 0.1,
      hd: STAKE_T,
      // the segment lies tangent to the ring: rotate to face the center
      rot: mid,
      cameraTopY: stakeTop,
      camGhost: true,
    });
  }
  return out;
}
