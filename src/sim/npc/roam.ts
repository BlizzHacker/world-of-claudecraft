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
import { angleTo, DT, dist2d, type Entity, MELEE_RANGE } from '../types';

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

// ── Grinder combat (aid-for-XP) ──────────────────────────────────────────────
const GRIND_SCAN_R = 22; // look this far from HOME for a wild mob to fight
const GRIND_LEASH_R = 30; // give up + return home past this from home
const GRIND_REST_HP = 0.55; // below this HP fraction, retreat home to recover
const GRIND_REGEN = 22; // hp/sec regained while resting at home

/** Nearest live, wild, hostile mob within GRIND_SCAN_R of the NPC's home. */
function nearestWildMob(ctx: SimContext, npc: Entity): Entity | null {
  let best: Entity | null = null;
  let bestD2 = GRIND_SCAN_R * GRIND_SCAN_R;
  ctx.grid.forEachInRadius(npc.spawnPos.x, npc.spawnPos.z, GRIND_SCAN_R, (m, d2) => {
    if (m.kind !== 'mob' || m.dead || m.ownerId !== null) return; // wild mobs only (no pets/adds)
    if (m.aiState === 'evade') return; // don't chase a leashing mob
    if (!ctx.isHostileTo(npc, m)) return;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = m;
    }
  });
  return best;
}

/** Drive a grinding NPC's hunt. Returns true if it handled the NPC this tick
 *  (engaged or resting); false if it's idle and should fall through to roaming. */
function updateGrinder(ctx: SimContext, npc: Entity): boolean {
  npc.swingTimer = Math.max(0, npc.swingTimer - DT);

  // Resting hysteresis: drop into rest below GRIND_REST_HP, and stay resting until
  // fully healed (npcResting flag), so it doesn't yo-yo back into a losing fight.
  if (npc.hp < npc.maxHp * GRIND_REST_HP) npc.npcResting = true;
  if (npc.hp >= npc.maxHp) npc.npcResting = false;
  if (npc.npcResting) {
    npc.aggroTargetId = null;
    const home = ctx.groundPos(npc.spawnPos.x, npc.spawnPos.z);
    const atHome = dist2d(npc.pos, home) <= 1.5;
    if (!atHome) ctx.moveToward(npc, home, npc.moveSpeed * ctx.moveSpeedMult(npc));
    else npc.hp = Math.min(npc.maxHp, npc.hp + GRIND_REGEN * DT);
    return true;
  }

  // Keep or acquire a target.
  let target = npc.aggroTargetId !== null ? ctx.entities.get(npc.aggroTargetId) ?? null : null;
  if (target && (target.dead || target.kind !== 'mob' || !ctx.isHostileTo(npc, target))) target = null;
  if (target && dist2d(npc.pos, npc.spawnPos) > GRIND_LEASH_R) target = null; // strayed too far → drop
  if (!target) target = nearestWildMob(ctx, npc);
  npc.aggroTargetId = target?.id ?? null;
  if (!target) return false; // nothing to fight → let it roam

  // Wake an idle quarry so it fights BACK. dealDamage only adds threat; a wild
  // mob transitions idle→chase via aggroMob, which the player-hit path calls but
  // the NPC-hit path does not. Without this the mob stands still and lets the NPC
  // farm it — we want a real mob-vs-NPC brawl the player can join.
  if (target.aiState === 'idle') ctx.aggroMob(target, npc, false);

  // Engage: close to melee, face, and swing on the weapon timer.
  const d = dist2d(npc.pos, target.pos);
  const reach = MELEE_RANGE * 0.8;
  if (d > reach) {
    if (!ctx.isRooted(npc)) ctx.moveToward(npc, target.pos, npc.moveSpeed * ctx.moveSpeedMult(npc));
  } else {
    npc.facing = angleTo(npc.pos, target.pos);
    if (npc.swingTimer <= 0) {
      ctx.mobSwing(npc, target); // adds threat → the mob fights back; no tap set (NPC isn't a player)
      npc.swingTimer = npc.weapon.speed * ctx.swingIntervalMult(npc);
    }
  }
  return true;
}

/** Advance one roaming/grinding NPC. No-op unless flagged `roams` or `grinds`. */
export function updateRoamingNpc(ctx: SimContext, npc: Entity): void {
  if (npc.dead) return;
  // Grinders hunt wild mobs; when idle (no mob nearby) they fall through to roam.
  // A player engaging still preempts everything (return home to talk / be dueled).
  if (npc.grinds && !playerEngaging(ctx, npc)) {
    if (updateGrinder(ctx, npc)) return;
  }
  if (!npc.roams) return;
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
