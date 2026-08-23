// D2-style Waypoint system: an activatable teleport marker at each town hub. Walk up
// and interact to ACTIVATE a waypoint (unlocks it for you); once two or more are
// active you can travel between any of them instantly. Activation is per-player and
// persisted (waypointsActivated on PlayerMeta), like D2 where each waypoint you touch
// stays lit on your map forever.
//
// Travel is driven from the client via a command (waypointTravel) that names the
// destination waypoint id; the server validates it's activated and teleports you to
// its hub. Server-authoritative — the whole flow routes through the sim.

import { INSTANCE_X_BASE, isDelvePos, isRiftPos } from './data';
import { createGroundObject } from './entity';
import type { RealmId } from './realms/types';
import type { SimContext } from './sim_context';
import { type Entity, INTERACT_RANGE } from './types';
import { competitive } from './unstuck';
import { pylonOffset, waypointById, waypointDefs } from './waypoint_defs';

// The waypoint LIST itself lives in the pure leaf waypoint_defs.ts, so
// presentation consumers (src/ui/entity_i18n.ts, bundled by the /wiki guide
// entry) can read the defs without importing this system module and its
// unstuck/delve reach (tests/guide.test.ts chunk-color containment).
export { pylonOffset, type WaypointDef, waypointById, waypointDefs } from './waypoint_defs';

/** Spawn the activatable waypoint markers at each town hub. Deterministic (no rng).
 *  Called at world init on every realm (waypoints are a universal travel convenience,
 *  not a themed-realm feature). */
export function spawnWaypoints(ctx: SimContext, nextId: () => number, realmId?: RealmId): void {
  for (const wp of waypointDefs()) {
    if (wp.realmId && wp.realmId !== realmId) continue;
    // Place the waypoint pylon well off the hub centre (where quest givers/vendors
    // cluster) so it never overlaps an NPC's interaction spot — 14u to the NE edge
    // of the town, a clear landmark. EXCEPTION: Eastbrook's pylon stands right
    // beside the town well (the well is now the Hollow Crypt's mouth, so the
    // plaza is the town's arrival-and-departure heart).
    const off = pylonOffset(wp.id);
    const e = createGroundObject(nextId(), '', wp.name, ctx.groundPos(wp.x + off.x, wp.z + off.z));
    e.templateId = 'waypoint';
    e.waypointId = wp.id;
    e.objectItemId = wp.assetKey ?? null;
    e.lootable = true; // interactable
    (e as Entity).hostile = false;
    ctx.addEntity(e);
  }
}

/** Interact with a waypoint: ACTIVATE it for this player (persisted). If already
 *  active, this is the entry point the client uses to open the travel menu. */
export function activateWaypoint(ctx: SimContext, waypointId: string, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const wp = waypointById(waypointId);
  if (!wp) return;
  const set = r.meta.waypointsActivated;
  if (!set.has(waypointId)) {
    set.add(waypointId);
    ctx.emit({
      type: 'log',
      text: `Waypoint activated: ${wp.name}. Travel here from any other waypoint.`,
      color: '#6cf',
      pid: r.meta.entityId,
    });
  } else {
    ctx.emit({
      type: 'log',
      text: `${wp.name} waypoint. Choose a destination to travel.`,
      color: '#6cf',
      pid: r.meta.entityId,
    });
  }
  // Signal the client to open the travel menu, carrying every waypoint with a
  // `known` flag for the ones this player has discovered.
  ctx.emit({
    type: 'waypointMenu',
    pid: r.meta.entityId,
    waypoints: waypointDefs().map((w) => ({
      id: w.id,
      name: w.name,
      known: set.has(w.id),
    })),
  });
}

/** Travel to an activated waypoint. Validates the destination is unlocked; the
 *  player must also be standing at a waypoint (any activated one) to travel. */
export function waypointTravel(ctx: SimContext, destId: string, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r || r.e.dead) return;
  const p = r.e;
  const dest = waypointById(destId);
  if (!dest) return;
  if (!r.meta.waypointsActivated.has(destId)) {
    ctx.error(r.meta.entityId, "You haven't discovered that waypoint yet.");
    return;
  }
  // Server-side validation: the client menu is a convenience, never an
  // authority. Every gate below is rng-free and mirrors the /unstuck doctrine
  // (unstuck.ts): no combat escape, no jailbreak, no competitive exit, and no
  // teleporting out of an instance band a portal did not open.
  if (isRiftPos(p.pos.x) || isDelvePos(p.pos.x) || p.pos.x >= INSTANCE_X_BASE) {
    ctx.error(r.meta.entityId, 'You cannot use a waypoint from here.');
    return;
  }
  // Presence: the traveler must be standing at a live waypoint pylon (any one,
  // discovered or not; discovery gates the DESTINATION above). The grid holds
  // mobs and objects; players ride playerGrid, so a pylon is findable here.
  let atPylon = false;
  ctx.grid.forEachInRadius(p.pos.x, p.pos.z, INTERACT_RANGE + 2, (e) => {
    if (e.kind === 'object' && e.templateId === 'waypoint' && !e.dead) atPylon = true;
  });
  if (!atPylon) {
    ctx.error(r.meta.entityId, 'You must be standing at a waypoint to travel.');
    return;
  }
  if (p.jailed) {
    ctx.error(r.meta.entityId, 'You cannot use a waypoint while jailed.');
    return;
  }
  if (p.inCombat || p.combatTimer < 5) {
    ctx.error(r.meta.entityId, 'You cannot use a waypoint while in combat.');
    return;
  }
  if (competitive(ctx, p.id, p)) {
    ctx.error(r.meta.entityId, 'You cannot use a waypoint during a competitive match.');
    return;
  }
  // Arrive at the destination waypoint pylon (matches its spawn offset), just south
  // of it so you face the town, not standing inside the pylon.
  const off = pylonOffset(dest.id);
  p.pos = ctx.groundPos(dest.x + off.x, dest.z + off.z - 3);
  p.prevPos = { ...p.pos };
  ctx.rebucket(p);
  p.targetId = null;
  p.autoAttack = false;
  ctx.emit({
    type: 'log',
    text: `You travel to ${dest.name}.`,
    color: '#6cf',
    pid: r.meta.entityId,
  });
}
