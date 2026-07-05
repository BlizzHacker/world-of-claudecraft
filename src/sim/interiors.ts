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
import { createGroundObject } from './entity';
import type { SimContext } from './sim_context';
import type { Entity, Vec3, WorldContent } from './types';

export const INTERIOR_TYPE_SHOP = 0;
export const INTERIOR_TYPE_INN = 1;
export const INTERIOR_TYPE_HOUSE = 2;
const INTERIOR_SHARED_SLOT = 0; // shared public room per type

const TYPE_ENTER_TEXT: Record<number, string> = {
  0: 'You step into the shop.',
  1: 'You duck into the inn.',
  2: 'You enter the house.',
};

/** Map a building kind to its interior type. Chapels are landmarks, not enterable. */
function interiorTypeForBuilding(kind: string): number | null {
  if (kind === 'inn') return INTERIOR_TYPE_INN;
  if (kind === 'house') return INTERIOR_TYPE_HOUSE;
  return null; // chapel etc — not enterable
}

/** Spawn the shared interior rooms' exit doors + a clickable entrance door on every
 *  enterable town building. Deterministic (no rng). Called at world init on themed
 *  realms only. `nextId` yields fresh entity ids; `world` supplies the buildings. */
export function spawnBuildingInteriors(
  ctx: SimContext,
  nextId: () => number,
  world: WorldContent,
): void {
  const add = (e: Entity): void => ctx.addEntity(e);
  // 1) An EXIT door inside each interior room (shared slot 0), at the south door.
  for (const t of [INTERIOR_TYPE_SHOP, INTERIOR_TYPE_INN, INTERIOR_TYPE_HOUSE]) {
    const o = interiorOrigin(t, 0);
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
  }
  // 2) A clickable ENTRANCE door on each enterable building, at its +z (front) face.
  for (const b of world.props.buildings) {
    const interiorType = interiorTypeForBuilding(b.kind);
    if (interiorType == null) continue;
    // Front-door world position: the +z face centre, rotated by the building yaw,
    // nudged just outside so the player clicks it from the street.
    const frontLocalZ = b.d / 2 + 0.6;
    const c = Math.cos(b.rot);
    const s = Math.sin(b.rot);
    const dx = -0 * c - frontLocalZ * s;
    const dz = -0 * s + frontLocalZ * c;
    const doorPos: Vec3 = ctx.groundPos(b.x + dx, b.z + dz);
    const door = createGroundObject(nextId(), '', 'Door', doorPos);
    door.templateId = 'building_door';
    door.objectItemId = null;
    door.interiorType = interiorType;
    door.lootable = true; // interactable
    add(door);
  }
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
