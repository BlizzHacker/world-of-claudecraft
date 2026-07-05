// Roaming town-NPC AI (F4 sub-batch 1): makes flagged NPCs wander their home
// square so towns feel alive instead of statue-still.
//
// DETERMINISM — isolated from the shared combat stream. Every random choice here
// comes from a PURE hash (hash2 of the NPC id + a per-NPC hop counter), NOT
// ctx.rng. Drawing from the shared stream would reorder every downstream combat
// roll (a strolling vendor must never change a fireball's crit), so roaming is
// deliberately kept off it. hash2 is stable and identical on every host, so the
// offline browser, server, and RL env still agree frame-for-frame.
//
// Server-authoritative: it runs in the sim tick and NPC position already goes
// over the wire (dynamicFields x/y/z/f), so online clients see the walk via the
// normal entity interpolation with no protocol change.
//
// Interaction-safe: a roaming NPC HALTS whenever a player is close enough to talk
// to it (INTERACT_HOLD_R) or has it targeted, so quest turn-ins and vendor windows
// never chase a moving target. It never leaves a small leash of its spawn point.

import { hash2 } from '../rng';
import type { SimContext } from '../sim_context';
import { DT, dist2d, type Entity } from '../types';

const ROAM_SEED = 0x726f616d; // 'roam'
const ROAM_LEASH_R = 6; // never stray more than this from spawnPos (tight: quest givers stay near)
const ROAM_STEP_MIN = 2; // min hop distance
const ROAM_STEP_MAX = 5; // max hop distance
const ROAM_SPEED = 1.5; // stroll speed (units/s)
const ROAM_PAUSE_MIN = 3; // idle dwell between hops (s)
const ROAM_PAUSE_MAX = 8;
// A player within this range is engaging the NPC (about to talk / just did): the
// NPC freezes so the interaction target doesn't walk away. Comfortably larger than
// the leash so a player standing at the NPC's home spot always pins it.
const INTERACT_HOLD_R = 8;

/** True if any live player is close enough (or targeting) that the NPC holds still. */
function playerEngaging(ctx: SimContext, npc: Entity): boolean {
  for (const [pid] of ctx.players) {
    const p = ctx.entities.get(pid);
    if (!p || p.dead) continue;
    if (p.targetId === npc.id) return true;
    if (dist2d(p.pos, npc.pos) <= INTERACT_HOLD_R) return true;
  }
  return false;
}

/** Advance one roaming NPC. No-op unless the NPC is flagged `roams`. */
export function updateRoamingNpc(ctx: SimContext, npc: Entity): void {
  if (!npc.roams || npc.dead) return;
  // While a player is engaging, RETURN to the home spot (not merely freeze) so a
  // quest turn-in / vendor is always found at its data position — a player who
  // teleports/walks to the NPC's home always ends up in talk range. Only once the
  // NPC is home does it hold still.
  if (playerEngaging(ctx, npc)) {
    npc.wanderTarget = null;
    if (npc.wanderTimer < ROAM_PAUSE_MIN) npc.wanderTimer = ROAM_PAUSE_MIN;
    if (dist2d(npc.pos, npc.spawnPos) > 0.4) {
      ctx.moveToward(npc, npc.spawnPos, ROAM_SPEED * 1.6);
    }
    return;
  }

  const hop = npc.wanderTimer; // reused as a monotonically-advancing hop counter for the hash

  npc.wanderTimer -= DT;
  if (!npc.wanderTarget) {
    if (npc.wanderTimer > 0) return; // dwelling between hops
    // Pick a new spot from a PURE hash of (npc id, hop index) — off the shared
    // combat rng stream so roaming can't perturb any combat roll. Two independent
    // hashes give the angle and the radius.
    const hopIdx = Math.max(0, Math.round(npc.roamHop ?? 0));
    const ha = hash2(npc.id, hopIdx * 2 + 1, ROAM_SEED);
    const hr = hash2(npc.id, hopIdx * 2 + 2, ROAM_SEED);
    const ang = ha * Math.PI * 2;
    const r = ROAM_STEP_MIN + hr * (ROAM_STEP_MAX - ROAM_STEP_MIN);
    let tx = npc.spawnPos.x + Math.sin(ang) * r;
    let tz = npc.spawnPos.z + Math.cos(ang) * r;
    // Clamp back inside the leash so a chain of hops can't drift out of town.
    const dx = tx - npc.spawnPos.x;
    const dz = tz - npc.spawnPos.z;
    const d = Math.hypot(dx, dz);
    if (d > ROAM_LEASH_R) {
      tx = npc.spawnPos.x + (dx / d) * ROAM_LEASH_R;
      tz = npc.spawnPos.z + (dz / d) * ROAM_LEASH_R;
    }
    npc.wanderTarget = ctx.groundPos(tx, tz);
    npc.roamHop = hopIdx + 1;
    void hop;
    return;
  }

  // Walk toward the current spot; on arrival, dwell for a hashed beat.
  const arrived = ctx.moveToward(npc, npc.wanderTarget, ROAM_SPEED);
  if (arrived) {
    npc.wanderTarget = null;
    const hd = hash2(npc.id, (npc.roamHop ?? 0) * 2 + 7, ROAM_SEED);
    npc.wanderTimer = ROAM_PAUSE_MIN + hd * (ROAM_PAUSE_MAX - ROAM_PAUSE_MIN);
  }
}
