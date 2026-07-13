// Pure couch co-op camera math: one shared third-person camera that frames
// every local player at once. No DOM, no Three.js; deterministic transforms
// so the framing and the leash unit-test without a renderer (the same
// pure-core split as gamepad_map.ts / camera_follow.ts).
//
// The anchor is the centroid of the local players' render positions. The
// distance starts from Player 1's chosen zoom and grows just enough to fit
// the whole party in the view frustum (with padding), clamped to a max so
// the world never shrinks to a dot. Player 1 keeps yaw/pitch control.
//
// The leash keeps everyone frameable: a co-op player's move input is vetoed
// when it points outward past COOP_LEASH_YD from the party centroid. Online
// this doubles as the guarantee that every local player stays inside the
// primary session's interest scope (~120 yd), which is what lets one world
// mirror render the whole local party.

export interface CoopPoint {
  x: number;
  y: number;
  z: number;
}

// Zoom cap for the shared camera; beyond this the fit stops growing and the
// leash (60 yd diameter fits comfortably at 45) is what keeps players visible.
export const COOP_CAMERA_MAX_DIST = 45;
// Extra world-yards around the farthest player so bodies never touch the frame edge.
export const COOP_CAMERA_FIT_PAD_YD = 4;
// Max distance a co-op player may roam from the party centroid.
export const COOP_LEASH_YD = 60;
// Fit safety headroom: the frustum estimate below ignores pitch foreshortening,
// so overshoot slightly rather than clip a player standing at the spread edge.
const FIT_HEADROOM = 1.15;

export function coopCentroid(points: readonly CoopPoint[]): CoopPoint {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
    z += p.z;
  }
  const n = Math.max(1, points.length);
  return { x: x / n, y: y / n, z: z / n };
}

/** Largest horizontal (XZ) distance from the centroid to any player. */
export function coopSpreadRadius(points: readonly CoopPoint[], centroid: CoopPoint): number {
  let r = 0;
  for (const p of points) {
    r = Math.max(r, Math.hypot(p.x - centroid.x, p.z - centroid.z));
  }
  return r;
}

/**
 * Camera distance that fits a party spread inside the frustum. The binding
 * constraint is the narrower half-angle of the two frustum planes (vertical
 * fov, or horizontal on a portrait/narrow viewport); a sphere of radius
 * `spread + pad` around the anchor must fit inside it. Never dips below the
 * player's own chosen zoom, never exceeds COOP_CAMERA_MAX_DIST.
 */
export function coopFitDistance(opts: {
  spreadYd: number;
  baseDist: number;
  fovYDeg: number;
  aspect: number;
}): number {
  const fovY = (Math.max(1, opts.fovYDeg) * Math.PI) / 180;
  const halfY = fovY / 2;
  const halfX = Math.atan(Math.tan(halfY) * Math.max(0.1, opts.aspect));
  const half = Math.min(halfX, halfY);
  const radius = opts.spreadYd + COOP_CAMERA_FIT_PAD_YD;
  const need = (radius / Math.tan(half)) * FIT_HEADROOM;
  return Math.min(COOP_CAMERA_MAX_DIST, Math.max(opts.baseDist, need));
}

export interface CoopCameraFrame {
  anchor: CoopPoint;
  dist: number;
}

/**
 * The shared camera pose for this frame, or null when co-op framing should
 * not engage (fewer than two players — the normal chase camera is better).
 */
export function coopCameraFrame(opts: {
  players: readonly CoopPoint[];
  baseDist: number;
  fovYDeg: number;
  aspect: number;
}): CoopCameraFrame | null {
  if (opts.players.length < 2) return null;
  const anchor = coopCentroid(opts.players);
  const spread = coopSpreadRadius(opts.players, anchor);
  const dist = coopFitDistance({
    spreadYd: spread,
    baseDist: opts.baseDist,
    fovYDeg: opts.fovYDeg,
    aspect: opts.aspect,
  });
  return { anchor, dist };
}

/**
 * Frame-rate-independent exponential approach, for smoothing the anchor and
 * distance between frames (a new join or a leash sprint must glide, not snap).
 */
export function coopSmooth(current: number, target: number, rate: number, dt: number): number {
  const t = 1 - Math.exp(-Math.max(0, rate) * Math.max(0, dt));
  return current + (target - current) * t;
}

/**
 * Leash veto: false when a player past COOP_LEASH_YD from the centroid is
 * trying to move further out (dot of the move direction with the outward
 * radial is positive). Movement back toward the party is always allowed, so
 * the leash never traps anyone. `moveFacing` uses the sim convention: the
 * direction of travel is (sin f, cos f).
 */
export function coopMoveAllowed(
  pos: { x: number; z: number },
  centroid: { x: number; z: number },
  moveFacing: number,
): boolean {
  const ox = pos.x - centroid.x;
  const oz = pos.z - centroid.z;
  if (Math.hypot(ox, oz) <= COOP_LEASH_YD) return true;
  // Small tolerance so exactly-tangential travel (outward component that is
  // pure floating-point noise) never flickers the veto at the boundary.
  const outward = Math.sin(moveFacing) * ox + Math.cos(moveFacing) * oz;
  return outward <= 1e-6;
}
