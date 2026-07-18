// D2-style Waypoint system: an activatable teleport marker at each town hub. Walk up
// and interact to ACTIVATE a waypoint (unlocks it for you); once two or more are
// active you can travel between any of them instantly. Activation is per-player and
// persisted (waypointsActivated on PlayerMeta), like D2 where each waypoint you touch
// stays lit on your map forever.
//
// Travel is driven from the client via a command (waypointTravel) that names the
// destination waypoint id; the server validates it's activated and teleports you to
// its hub. Server-authoritative — the whole flow routes through the sim.

import { ZONES } from './data';
import { createGroundObject } from './entity';
import type { SimContext } from './sim_context';
import type { Entity } from './types';

export interface WaypointDef {
  id: string;
  name: string;
  x: number;
  z: number;
  zoneId: string;
}

// Waypoints: one at each town hub PLUS a wilderness waypoint deeper in each zone
// (between the towns), so travel covers the whole overworld like D2's per-act spread.
// Hellmaw-depth waypoints are added by the delve system (they live in the delve band).
// Ordered N→S so the travel menu reads top-to-bottom.
export function waypointDefs(): WaypointDef[] {
  const out: WaypointDef[] = [];
  for (const z of ZONES) {
    // Town-hub waypoint.
    out.push({ id: `wp_${z.id}`, name: z.hub.name, x: z.hub.x, z: z.hub.z, zoneId: z.id });
    // A wilderness waypoint ~⅔ into the zone (past the hub, toward the next zone),
    // offset west so it's out on the trail, not on the hub.
    const wildZ = z.hub.z + (z.zMax - z.hub.z) * 0.55;
    // Authored per-zone west/east offset: the naive -40 dropped the Mirefen
    // trail pylon INSIDE the (-40,450) fen lake footprint (players traveling
    // there surfaced in open water and drowned home). Surveyed dry ground per
    // zone; keep any new zone OFF its lake footprints (world.ts LAKE blend
    // radius is authored radius x1.6).
    const wildX = z.id === 'mirefen_marsh' ? 25 : -40;
    out.push({
      id: `wp_${z.id}_wild`,
      name: `${z.hub.name} Trail`,
      x: wildX,
      z: Math.round(wildZ),
      zoneId: z.id,
    });
  }
  return out;
}

export function waypointById(id: string): WaypointDef | null {
  return waypointDefs().find((w) => w.id === id) ?? null;
}

/** Spawn the activatable waypoint markers at each town hub. Deterministic (no rng).
 *  Called at world init on every realm (waypoints are a universal travel convenience,
 *  not a themed-realm feature). */
export function spawnWaypoints(ctx: SimContext, nextId: () => number): void {
  for (const wp of waypointDefs()) {
    // Place the waypoint pylon well off the hub centre (where quest givers/vendors
    // cluster) so it never overlaps an NPC's interaction spot — 14u to the NE edge
    // of the town, a clear landmark.
    const e = createGroundObject(nextId(), '', wp.name, ctx.groundPos(wp.x + 14, wp.z + 14));
    e.templateId = 'waypoint';
    e.waypointId = wp.id;
    e.objectItemId = null;
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
  // Arrive at the destination waypoint pylon (matches its spawn offset), just south
  // of it so you face the town, not standing inside the pylon.
  p.pos = ctx.groundPos(dest.x + 14, dest.z + 11);
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
