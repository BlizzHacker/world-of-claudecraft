// Building interiors: enterable town buildings. Clicking a building's door teleports
// the player into a small furnished room in the dedicated interior x-band (see
// data.ts INTERIOR_X_MIN + colliders.ts INTERIOR_ROOM_COLLIDERS); clicking the room's
// exit door teleports them back to where they came in. The rooms are SHARED public
// spaces (slot 0 per type) — like walking into a shop in an MMO town — so no private
// instancing / slot allocation is needed for v1.
//
// Interior TYPES (type-column index): 0 = shop, 1 = inn, 2 = house. A building's door
// carries its interiorType; the exit returns to the saved overworld spot.

import { INTERIOR_ROOM_EXIT_LOCAL } from './colliders';
import { interiorOrigin, isInteriorPos } from './data';
import { INTERIOR_ROOM_ENTRY } from './colliders';
import {
  INTERIOR_INNKEEPER,
  INTERIOR_MERCHANT,
  INTERIOR_VILLAGER,
} from './content/interior_npcs';
import { createGroundObject, createNpc, createProp } from './entity';
import { getActiveRealm } from './realms/registry';
import type { SimContext } from './sim_context';
import type { Entity, NpcDef, WorldContent } from './types';

export const INTERIOR_TYPE_SHOP = 0;
export const INTERIOR_TYPE_INN = 1;
export const INTERIOR_TYPE_HOUSE = 2;
const INTERIOR_SHARED_SLOT = 0; // shared public room per type

const TYPE_ENTER_TEXT: Record<number, string> = {
  0: 'You step into the shop.',
  1: 'You duck into the inn.',
  2: 'You enter the house.',
};

/** Map a building to its interior type. Inns → inn; the FIRST house in a town → the
 *  shop (so the merchant/shop room is reachable), remaining houses → house; chapels
 *  are landmarks, not enterable. `houseSeen` counts houses already assigned so exactly
 *  one becomes the shop per town. */
function interiorTypeForBuilding(kind: string, houseSeen: number): number | null {
  if (kind === 'inn') return INTERIOR_TYPE_INN;
  if (kind === 'house') return houseSeen === 0 ? INTERIOR_TYPE_SHOP : INTERIOR_TYPE_HOUSE;
  return null; // chapel etc — not enterable
}

// Room-local furniture layout per interior type. Coords are room-instance-local
// (origin at room centre; room spans ±18 x, z −12..12; the south door is at −z, so
// furniture clusters north/sides and leaves the entry lane clear). {key} = a native
// prop asset (renders as prop:<key>); unknown keys fall back to a crate placeholder.
interface Furnishing { key: string; x: number; z: number; facing?: number; scale?: number }
const ROOM_FURNITURE: Record<number, Furnishing[]> = {
  // Shop: a counter of crates + weapon stands + an anvil, wares along the walls.
  [INTERIOR_TYPE_SHOP]: [
    { key: 'crateWooden', x: -6, z: 6 },
    { key: 'crateWooden', x: -4, z: 8, scale: 0.9 },
    { key: 'weaponStand', x: 6, z: 7, facing: Math.PI },
    { key: 'weaponStand', x: 9, z: 5, facing: Math.PI },
    { key: 'anvil', x: -12, z: 2, facing: Math.PI / 2 },
    { key: 'barrel', x: 13, z: 9 },
    { key: 'barrel', x: -13, z: 9, scale: 0.9 },
    { key: 'lanternWall', x: 0, z: 11.4, scale: 0.8 },
  ],
  // Inn: barrels + crates (the cellar stock) and lanterns; the keeper stands north.
  [INTERIOR_TYPE_INN]: [
    { key: 'barrel', x: -8, z: 8 },
    { key: 'barrel', x: -6, z: 9, scale: 0.9 },
    { key: 'barrel', x: 8, z: 8 },
    { key: 'crateWooden', x: 10, z: 6 },
    { key: 'farmCrate', x: -11, z: 5 },
    { key: 'lanternWall', x: -14, z: 0, scale: 0.8 },
    { key: 'lanternWall', x: 14, z: 0, scale: 0.8 },
  ],
  // House: a homely hearth-ish column + a couple of crates + a lantern.
  [INTERIOR_TYPE_HOUSE]: [
    { key: 'column', x: 0, z: 9, scale: 0.7 },
    { key: 'crateWooden', x: -10, z: 7 },
    { key: 'barrel', x: 11, z: 6 },
    { key: 'farmCrate', x: -8, z: 4, scale: 0.9 },
    { key: 'lanternWall', x: 12, z: 10, scale: 0.8 },
  ],
};

// The resident NPC per interior type: merchant (shop), innkeeper (inn), villager
// (house). Defs live in content/interior_npcs.ts (a leaf, registered in NPCS so the
// online client resolves their vendorItems); here we just pick + position them.
function interiorNpcDef(interiorType: number): { def: NpcDef; x: number; z: number } {
  if (interiorType === INTERIOR_TYPE_SHOP) return { def: INTERIOR_MERCHANT, x: 0, z: 7 };
  if (interiorType === INTERIOR_TYPE_INN) return { def: INTERIOR_INNKEEPER, x: 0, z: 8 };
  return { def: INTERIOR_VILLAGER, x: 0, z: 6 };
}

/** Spawn the shared interior rooms' exit doors + a clickable entrance door on every
 *  enterable town building. Deterministic (no rng). Called at world init on themed
 *  realms only. `nextId` yields fresh entity ids; `world` supplies the buildings. */
export function spawnBuildingInteriors(
  ctx: SimContext,
  nextId: () => number,
  world: WorldContent,
): void {
  // Reset the door-area registry every world init so a prior realm's doors never
  // leak into this world (the registry is module-global).
  BUILDING_DOORS.length = 0;
  // Interiors are a themed-realm feature; vanilla (claudecraft) has none. On a
  // non-themed realm we've cleared the registry and there is nothing more to spawn.
  if (!getActiveRealm().worldTheme) return;
  const add = (e: Entity): void => ctx.addEntity(e);
  // 1) Furnish each shared interior room (slot 0): an EXIT door at the south door,
  // furniture props, and the resident NPC.
  for (const t of [INTERIOR_TYPE_SHOP, INTERIOR_TYPE_INN, INTERIOR_TYPE_HOUSE]) {
    const o = interiorOrigin(t, 0);
    // Exit door.
    const exit = createGroundObject(
      nextId(),
      '',
      'Exit',
      ctx.groundPos(o.x + INTERIOR_ROOM_EXIT_LOCAL.x, o.z + INTERIOR_ROOM_EXIT_LOCAL.z),
    );
    exit.templateId = 'building_exit';
    exit.objectItemId = null;
    exit.lootable = true; // interactable
    add(exit);
    // Furniture.
    for (const f of ROOM_FURNITURE[t] ?? []) {
      add(createProp(nextId(), f.key, ctx.groundPos(o.x + f.x, o.z + f.z), f.facing ?? 0, f.scale ?? 1));
    }
    // Resident NPC (merchant / innkeeper / villager). A vendorItems NPC opens its
    // shop through the normal talk-to-NPC path (createNpc copies vendorItems); no
    // auction-market registration (that's the separate World Market auctioneer).
    const npc = interiorNpcDef(t);
    const npcEnt = createNpc(nextId(), npc.def, ctx.groundPos(o.x + npc.x, o.z + npc.z));
    npcEnt.facing = Math.PI; // face the south door / incoming player
    add(npcEnt);
  }
  // 2) Register each enterable building's DOOR AREA (a world point on its +z front
  // face) + its interior type. No separate door object is spawned — clicking the
  // building's own door area (checked in interaction.ts via nearestBuildingDoor)
  // loads the room. The first house in each town becomes the shop.
  let houseSeen = 0;
  for (const b of world.props.buildings) {
    const interiorType = interiorTypeForBuilding(b.kind, houseSeen);
    if (b.kind === 'house') houseSeen++;
    if (interiorType == null) continue;
    // Front-door world point: the +z face centre, rotated by the building yaw.
    const frontLocalZ = b.d / 2;
    const s = Math.sin(b.rot);
    const cc = Math.cos(b.rot);
    BUILDING_DOORS.push({
      x: b.x - frontLocalZ * s,
      z: b.z + frontLocalZ * cc,
      interiorType,
      // Click radius scales a bit with the building so bigger fronts are easy to hit.
      r: Math.max(4, b.w * 0.4),
    });
  }
}

// Registered enterable-building door areas (rebuilt each world init). interaction.ts
// checks a click against these to enter without a separate door object.
export interface BuildingDoor { x: number; z: number; interiorType: number; r: number }
export const BUILDING_DOORS: BuildingDoor[] = [];

/** The interior type of the nearest building door within its click radius of (x,z),
 *  or null. Used by the interact handler to enter a building by clicking its door. */
export function buildingDoorAt(x: number, z: number): number | null {
  let best: BuildingDoor | null = null;
  let bestD = Infinity;
  for (const d of BUILDING_DOORS) {
    const dd = Math.hypot(x - d.x, z - d.z);
    if (dd <= d.r && dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best?.interiorType ?? null;
}

/** Teleport the player into the interior room for `interiorType`, saving the spot to
 *  return to on exit. Called from the door-interaction path. */
export function enterInterior(ctx: SimContext, interiorType: number, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const p = r.e;
  if (p.dead && !p.ghost) return;
  // Save the overworld return point (just outside the door we came in).
  p.interiorReturn = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
  p.interiorType = interiorType;
  const o = interiorOrigin(interiorType, INTERIOR_SHARED_SLOT);
  p.pos = ctx.groundPos(o.x + INTERIOR_ROOM_ENTRY.x, o.z + INTERIOR_ROOM_ENTRY.z);
  p.prevPos = { ...p.pos };
  ctx.rebucket(p);
  p.facing = 0; // face into the room (north)
  p.targetId = null;
  p.autoAttack = false;
  ctx.emit({
    type: 'log',
    text: TYPE_ENTER_TEXT[interiorType] ?? 'You step inside.',
    color: '#b9f',
    pid: r.meta.entityId,
  });
}

/** Teleport the player back out of an interior room to their saved overworld spot. */
export function leaveInterior(ctx: SimContext, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r || r.e.dead) return;
  const p = r.e;
  if (!isInteriorPos(p.pos.x)) return; // not inside a room
  const back = p.interiorReturn;
  if (back) {
    p.pos = ctx.groundPos(back.x, back.z);
  } else {
    // Fallback: no saved spot (shouldn't happen) — drop at world origin.
    p.pos = ctx.groundPos(0, 0);
  }
  p.prevPos = { ...p.pos };
  p.interiorReturn = null;
  p.interiorType = null;
  ctx.rebucket(p);
  p.targetId = null;
  p.autoAttack = false;
  ctx.emit({ type: 'log', text: 'You step back outside.', color: '#b9f', pid: r.meta.entityId });
}
