// Fence-clearance geometry: the fence rail's collision half-depth plus the
// predicate deciding whether a building footprint (an OBB in world space)
// reaches into an authored fence run. A pure, import-free leaf so both
// src/sim/colliders.ts (which builds the fence OBBs from this half-depth) and
// src/sim/data.ts (themeWorldForRealm) share one ruling; the paired test
// (tests/fence_clearance.test.ts) pins the mirrored constants.
//
// Why themeWorldForRealm needs it: a realm worldTheme scales the procedural
// buildings (and spreads the settlement ones), but authored yard fences never
// move, so a scaled farmstead can poke its collider through the fence it was
// authored inside. That is worse than cosmetic: a mover stepping into the
// enlarged footprint is depenetrated to the NEAREST face, which can sit on the
// far side of the fence line, popping the mover across a rail that must block
// (tests/pathfind.test.ts "blocks crossing every authored fence run"). A
// themed footprint that reaches a fence run keeps its authored one instead.

/** Fence/blocker wall half-thickness (yards): the OBB hd in colliders.ts
 *  (which re-exports it; the editor's blocker overlay reuses it so the drawn
 *  wall matches the collider exactly). */
export const FENCE_HALF_DEPTH = 0.35;

/** Body clearance kept between a themed footprint and a fence's collision
 *  band: the widest mover the fence gates resolve with (PLAYER_BODY_RADIUS,
 *  src/sim/pathfind.ts; mirrored so this leaf stays import-free, equality
 *  pinned by the paired test). Without it a themed wall face flush against
 *  the rail leaves a sliver no body fits through but a swept slide can catch. */
export const FENCE_FOOTPRINT_BODY_CLEARANCE = 0.5;

export interface FootprintObb {
  x: number;
  z: number;
  /** Full width/depth (the building record's w/d), not half extents. */
  w: number;
  d: number;
  rot: number;
}

export interface FenceRunDef {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width?: number;
}

/** Does the footprint, inflated by the fence's collision half-depth plus the
 *  body clearance, cross this fence run? Segment-vs-AABB in the footprint's
 *  local frame (the rotY convention of colliders.ts). */
export function footprintCrossesFenceRun(footprint: FootprintObb, fence: FenceRunDef): boolean {
  const pad =
    (fence.width === undefined ? FENCE_HALF_DEPTH : fence.width / 2) +
    FENCE_FOOTPRINT_BODY_CLEARANCE;
  const hx = footprint.w / 2 + pad;
  const hz = footprint.d / 2 + pad;
  // Fence endpoints in the footprint's local frame.
  const cos = Math.cos(-footprint.rot);
  const sin = Math.sin(-footprint.rot);
  const toLocal = (x: number, z: number) => {
    const dx = x - footprint.x;
    const dz = z - footprint.z;
    return { x: dx * cos + dz * sin, z: -dx * sin + dz * cos };
  };
  const a = toLocal(fence.x1, fence.z1);
  const b = toLocal(fence.x2, fence.z2);
  // Slab-clip the segment against the inflated AABB.
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  for (const [p, d, half] of [
    [a.x, dx, hx],
    [a.z, dz, hz],
  ] as const) {
    if (Math.abs(d) < 1e-9) {
      if (p < -half || p > half) return false;
      continue;
    }
    let near = (-half - p) / d;
    let far = (half - p) / d;
    if (near > far) [near, far] = [far, near];
    t0 = Math.max(t0, near);
    t1 = Math.min(t1, far);
    if (t0 > t1) return false;
  }
  return true;
}

export function footprintCrossesAnyFenceRun(
  footprint: FootprintObb,
  fences: readonly FenceRunDef[],
): boolean {
  for (const fence of fences) {
    if (footprintCrossesFenceRun(footprint, fence)) return true;
  }
  return false;
}
