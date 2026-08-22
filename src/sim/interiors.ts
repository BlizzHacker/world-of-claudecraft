// Building interiors: enterable town buildings. Clicking a building's door teleports
// the player into a small furnished room in the dedicated interior x-band (see
// data.ts INTERIOR_X_MIN + colliders.ts INTERIOR_ROOM_COLLIDERS); clicking the room's
// exit door teleports them back to where they came in. The rooms are SHARED public
// spaces (slot 0 per type) — like walking into a shop in an MMO town — so no private
// instancing / slot allocation is needed for v1.
//
// Interior TYPES (type-column index): 0 = shop, 1 = inn, 2 = house. A building's door
// carries its interiorType; the exit returns to the saved overworld spot.

import { INTERIOR_ROOM_ENTRY, INTERIOR_ROOM_EXIT_LOCAL } from './colliders';
import { INTERIOR_INNKEEPER, INTERIOR_MERCHANT, INTERIOR_VILLAGER } from './content/interior_npcs';
import { getActiveWorldContent, interiorOrigin, isInteriorPos } from './data';
import { createGroundObject, createNpc, createProp } from './entity';
import { HOME_LOTS } from './homes_layout';
import { getActiveRealm } from './realms/registry';
import type { SimContext } from './sim_context';
import { type Entity, INTERACT_RANGE, type NpcDef, type WorldContent } from './types';

export const INTERIOR_TYPE_SHOP = 0;
export const INTERIOR_TYPE_INN = 1;
export const INTERIOR_TYPE_HOUSE = 2;
export const INTERIOR_TYPE_CHAPEL = 3;
// Eastbrook Homes cottages (per-LOT slots, not the shared room; access is
// owner + the owner's party, enforced in social/homes.ts).
export const INTERIOR_TYPE_HOME = 4;
const INTERIOR_SHARED_SLOT = 0; // shared public room per type

const TYPE_ENTER_TEXT: Record<number, string> = {
  0: 'You step into the shop.',
  1: 'You duck into the inn.',
  2: 'You enter the house.',
  3: 'You enter the chapel.',
};

/** Map a building to its interior type. Inns → inn; the FIRST house in a town → the
 *  shop (so the merchant/shop room is reachable), remaining houses → house; chapels
 *  are landmarks, not enterable. `houseSeen` counts houses already assigned so exactly
 *  one becomes the shop per town.
 *
 *  The upstream v0.35 Veiled Hollow set (BuildingDef kinds `hollow*`) maps onto the
 *  same four rooms: its inn/house/chapel are those rooms in a different dress, and
 *  its smith and market ARE shops, so the town keeps a reachable merchant without
 *  leaning on the first-house rule. Leaving a kind out of this map silently makes
 *  every building of that kind solid scenery (the v0.35.1 intake regression: all 8
 *  Veiled Hollow buildings lost their doors because none of these kinds mapped). */
function interiorTypeForBuilding(kind: string, houseSeen: number): number | null {
  if (kind === 'inn' || kind === 'hollowInn') return INTERIOR_TYPE_INN;
  if (isHouseKind(kind)) return houseSeen === 0 ? INTERIOR_TYPE_SHOP : INTERIOR_TYPE_HOUSE;
  if (kind === 'chapel' || kind === 'hollowChapel') return INTERIOR_TYPE_CHAPEL;
  if (kind === 'hollowSmith' || kind === 'hollowMarket') return INTERIOR_TYPE_SHOP;
  return null; // unknown kind — not enterable
}

/** True when the ACTIVE realm has enterable town buildings: every realm except
 *  the one that opts out through RealmContent.vanillaWorld (claudecraft, which
 *  serves the upstream world untouched).
 *
 *  Every gate below used to read `getActiveRealm().worldTheme` instead. That is a
 *  cosmetic block (building scale/spread, lighting, sky) and infernal is the only
 *  realm that has ever declared one, so "themed realm" silently meant "infernal":
 *  on the other seven realms spawnBuildingInteriors returned before furnishing a
 *  single room and every door lookup returned null, which is why clicking a
 *  building did nothing anywhere but the Infernal Realm. The realm-agnostic work
 *  underneath (the hollow* kind map, the door/NPC distance arbitration, the
 *  enter_building intent command) was already correct — only this gate was not. */
export function realmHasBuildingInteriors(): boolean {
  return !getActiveRealm().vanillaWorld;
}

/** Kinds that participate in the first-house-becomes-the-shop count. Every caller
 *  iterating buildings MUST advance `houseSeen` through this predicate (not a raw
 *  `kind === 'house'` check) or the door walk and the click walk disagree on which
 *  building is the shop. */
function isHouseKind(kind: string): boolean {
  return kind === 'house' || kind === 'hollowHouse';
}

// Room-local furniture layout per interior type. Coords are room-instance-local
// (origin at room centre; room spans ±18 x, z −12..12; the south door is at −z, so
// furniture clusters north/sides and leaves the entry lane clear). {key} = a native
// prop asset (renders as prop:<key>); unknown keys fall back to a crate placeholder.
interface Furnishing {
  key: string;
  x: number;
  z: number;
  facing?: number;
  scale?: number;
}
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
  // Chapel: a solemn shrine — flanking columns, an altar-ish central prop, wall lanterns.
  [INTERIOR_TYPE_CHAPEL]: [
    { key: 'column', x: -8, z: 9 },
    { key: 'column', x: 8, z: 9 },
    { key: 'column', x: -8, z: 2 },
    { key: 'column', x: 8, z: 2 },
    { key: 'crateWooden', x: 0, z: 10, scale: 0.8 },
    { key: 'lanternWall', x: -14, z: 5, scale: 0.8 },
    { key: 'lanternWall', x: 14, z: 5, scale: 0.8 },
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
  // Interiors are a themed-realm feature; vanilla (claudecraft) has none. Door areas
  // are computed on demand (buildingDoorNear), so there is no registry to reset.
  // The gate above is now realmHasBuildingInteriors(): "vanilla" is the realm's own
  // vanillaWorld opt-out, not the absence of a cosmetic worldTheme (see that helper).
  if (!realmHasBuildingInteriors()) return;
  const add = (e: Entity): void => ctx.addEntity(e);
  // 1) Furnish each shared interior room (slot 0): an EXIT door at the south door,
  // furniture props, and the resident NPC.
  for (const t of [
    INTERIOR_TYPE_SHOP,
    INTERIOR_TYPE_INN,
    INTERIOR_TYPE_HOUSE,
    INTERIOR_TYPE_CHAPEL,
  ]) {
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
      add(
        createProp(
          nextId(),
          f.key,
          ctx.groundPos(o.x + f.x, o.z + f.z),
          f.facing ?? 0,
          f.scale ?? 1,
        ),
      );
    }
    // Resident NPC (merchant / innkeeper / villager). A vendorItems NPC opens its
    // shop through the normal talk-to-NPC path (createNpc copies vendorItems); no
    // auction-market registration (that's the separate World Market auctioneer).
    const npc = interiorNpcDef(t);
    const npcEnt = createNpc(nextId(), npc.def, ctx.groundPos(o.x + npc.x, o.z + npc.z));
    npcEnt.facing = Math.PI; // face the south door / incoming player
    add(npcEnt);
  }
  // 2) Every Eastbrook Homes cottage room (per-LOT slot, slot = lot index + 1;
  // social/homes.ts homeEnter uses the same mapping) gets a voluntary exit door
  // too, at the same room-local spot as the shared rooms. Without it the only
  // ways out of your own home were leaving the party or /unstuck. Deterministic,
  // zero rng.
  for (let i = 0; i < HOME_LOTS.length; i++) {
    const o = interiorOrigin(INTERIOR_TYPE_HOME, i + 1);
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
  // 3) Nothing to spawn for entry: the door is the building's own +z face. Both the
  // server sim (interaction.ts) and the online client's interact dispatcher (main.ts)
  // resolve doors ON DEMAND from getActiveWorldContent().props.buildings via
  // buildingDoorNear() — a PURE function, so it works identically on the client (which
  // runs ClientWorld, never Sim, so no registry would be populated) and the server.
}

export interface BuildingDoor {
  x: number;
  z: number;
  interiorType: number;
  r: number;
}

/** Compute the door AREAS for a set of town buildings: one per enterable building, a
 *  world point on its +z (front) face with an enter radius. PURE + deterministic so
 *  the client and server agree without any shared runtime registry. The first house in
 *  a town becomes the shop (interiorTypeForBuilding), chapels are not enterable. */
export function computeBuildingDoors(
  buildings: readonly { kind: string; x: number; z: number; w: number; d: number; rot: number }[],
): BuildingDoor[] {
  const doors: BuildingDoor[] = [];
  let houseSeen = 0;
  for (const b of buildings) {
    const interiorType = interiorTypeForBuilding(b.kind, houseSeen);
    if (isHouseKind(b.kind)) houseSeen++;
    if (interiorType == null) continue;
    const frontLocalZ = b.d / 2;
    const s = Math.sin(b.rot);
    const cc = Math.cos(b.rot);
    doors.push({
      x: b.x - frontLocalZ * s,
      z: b.z + frontLocalZ * cc,
      interiorType,
      // Enter radius spans the building's whole front + a comfortable street margin so
      // walking up to the door and pressing interact reliably enters (the solid OBB
      // keeps the player just outside the +z wall, ~INTERACT_RANGE from this point).
      // Clamped below so a wide building cannot swallow a close neighbour's doorstep.
      r: Math.max(8, b.w * 0.6 + INTERACT_RANGE),
    });
  }
  // Density clamp. buildingDoorNear returns the nearest door POINT, so two overlapping
  // rings let a big neighbour win the doorstep of the building you are actually
  // standing at -- the click target and the door under your feet then disagree and the
  // enter is refused. Eastbrook's authored civic blocks sit ~20 yards apart, well
  // inside the 8-12.8 yard radii above. Halving to the nearest other door guarantees
  // the rings are disjoint, so the lookup always agrees with the building you are at.
  // INTERACT_RANGE is the floor: every door stays reachable however tight the block.
  // Sparse towns are unaffected -- their doors already sit further apart than 2r.
  for (let i = 0; i < doors.length; i++) {
    let nearest = Infinity;
    for (let j = 0; j < doors.length; j++) {
      if (i === j) continue;
      const d = Math.hypot(doors[i].x - doors[j].x, doors[i].z - doors[j].z);
      if (d < nearest) nearest = d;
    }
    if (Number.isFinite(nearest)) {
      doors[i].r = Math.max(INTERACT_RANGE, Math.min(doors[i].r, nearest / 2));
    }
  }
  return doors;
}

/** The nearest building door within its enter radius of (x,z) plus the squared
 *  distance to it, or null. Reads the active realm's buildings on demand (works on
 *  client + server). Themed realms only — vanilla realms have no worldTheme, so their
 *  buildings never map to an interior type and this returns null. The distance lets a
 *  door the player is standing right at win over ambient town props in the arbitration,
 *  while a corpse/object literally at their feet still wins if closer. */
export function buildingDoorNear(
  x: number,
  z: number,
): { interiorType: number; d2: number } | null {
  // Reads on every realm now; only a vanillaWorld realm (claudecraft) returns null.
  if (!realmHasBuildingInteriors()) return null;
  let best: BuildingDoor | null = null;
  let bestD2 = Infinity;
  for (const door of computeBuildingDoors(getActiveWorldContent().props.buildings)) {
    const d2 = (x - door.x) ** 2 + (z - door.z) ** 2;
    if (d2 <= door.r * door.r && d2 < bestD2) {
      bestD2 = d2;
      best = door;
    }
  }
  return best ? { interiorType: best.interiorType, d2: bestD2 } : null;
}

/** The interior type of the nearest building door within its enter radius of (x,z),
 *  or null. Convenience wrapper around buildingDoorNear. */
export function buildingDoorAt(x: number, z: number): number | null {
  return buildingDoorNear(x, z)?.interiorType ?? null;
}

/** An enterable building whose FOOTPRINT (rotated w×d box, plus a small margin)
 *  contains the point (x,z) — the "clicked this building" test. Returns the interior
 *  type + the building centre (so the caller can range-check the player and place a
 *  menu). Null on vanilla realms or when the point hits no enterable building. Used by
 *  the click-to-enter flow: click a building → Enter/Cancel menu. */
export function buildingAtPoint(
  x: number,
  z: number,
): { interiorType: number; cx: number; cz: number } | null {
  if (!realmHasBuildingInteriors()) return null;
  const MARGIN = 1.5; // forgiving edge so clicking the wall/roofline still counts
  let houseSeen = 0;
  for (const b of getActiveWorldContent().props.buildings) {
    const interiorType = interiorTypeForBuilding(b.kind, houseSeen);
    if (isHouseKind(b.kind)) houseSeen++;
    if (interiorType == null) continue;
    // Transform the point into the building's local (un-rotated) frame and test the box.
    const s = Math.sin(-b.rot);
    const c = Math.cos(-b.rot);
    const lx = (x - b.x) * c - (z - b.z) * s;
    const lz = (x - b.x) * s + (z - b.z) * c;
    if (Math.abs(lx) <= b.w / 2 + MARGIN && Math.abs(lz) <= b.d / 2 + MARGIN) {
      return { interiorType, cx: b.x, cz: b.z };
    }
  }
  return null;
}

/** The interior type of an enterable building whose CENTRE is within `range` of (x,z),
 *  or null. A generous footprint-based proximity used server-side so an Enter chosen
 *  from the click-to-enter menu succeeds from anywhere the client offered it (the client
 *  offers the menu within the same generous range). Nearest building wins. */
export function buildingEnterableNear(x: number, z: number, range: number): number | null {
  if (!realmHasBuildingInteriors()) return null;
  const r2 = range * range;
  let best: number | null = null;
  let bestD2 = Infinity;
  let houseSeen = 0;
  for (const b of getActiveWorldContent().props.buildings) {
    const interiorType = interiorTypeForBuilding(b.kind, houseSeen);
    if (isHouseKind(b.kind)) houseSeen++;
    if (interiorType == null) continue;
    const d2 = (x - b.x) ** 2 + (z - b.z) ** 2;
    if (d2 <= r2 && d2 < bestD2) {
      bestD2 = d2;
      best = interiorType;
    }
  }
  return best;
}

/** Teleport the player into the interior room for `interiorType`, saving the spot to
 *  return to on exit. Called from the door-interaction path. `slot` picks a
 *  private room instance (Eastbrook Homes: one per lot); defaults to the
 *  shared public room every town building uses. */
export function enterInterior(
  ctx: SimContext,
  interiorType: number,
  pid?: number,
  slot: number = INTERIOR_SHARED_SLOT,
): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const p = r.e;
  if (p.dead && !p.ghost) return;
  // Save the overworld return point (just outside the door we came in).
  p.interiorReturn = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
  p.interiorType = interiorType;
  const o = interiorOrigin(interiorType, slot);
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
