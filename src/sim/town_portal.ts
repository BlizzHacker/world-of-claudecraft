// D2 Town Portal: right-click a Tome of Town Portal to consume one scroll and open a
// TWO-WAY blue portal — a "field portal" at your feet and a "town portal" in the
// nearest town, linked to each other. Step through (interact) to warp to the other
// end. Faithful to Diablo 2's town-portal loop: portal out to sell/restock, portal
// back to your exact spot.
//
// The pair is owned by the caster (portalOwnerId). Opening a new one closes the old
// pair (D2 allows one town portal per character). The tome IS the stackable scroll
// item (its count = scrolls left), consumed one per cast in items.ts.

import { ZONES } from './data';
import { createGroundObject } from './entity';
import type { SimContext } from './sim_context';
import type { Entity, Vec3 } from './types';

/** Nearest town hub to a world position (by zone). Town Portal always exits to town. */
function nearestTownHub(z: number): { x: number; z: number; name: string } {
  let best = ZONES[0].hub;
  let bestD = Infinity;
  for (const zone of ZONES) {
    const d = Math.abs(z - zone.hub.z);
    if (d < bestD) {
      bestD = d;
      best = zone.hub;
    }
  }
  return { x: best.x, z: best.z, name: best.name };
}

/** Close (despawn) any existing town-portal pair owned by this player. */
export function closeTownPortal(ctx: SimContext, ownerId: number): void {
  const doomed: number[] = [];
  for (const e of ctx.entities.values()) {
    if (e.kind === 'object' && e.templateId === 'town_portal' && e.portalOwnerId === ownerId) {
      doomed.push(e.id);
    }
  }
  for (const id of doomed) ctx.dropEntity(id);
}

/** Cast a town portal: open a linked pair (field ↔ town) and warp the caster to town.
 *  Called from useItem when a Tome of Town Portal is used. Returns true on success. */
export function castTownPortal(ctx: SimContext, nextId: () => number, pid?: number): boolean {
  const r = ctx.resolve(pid);
  if (!r || r.e.dead) return false;
  const p = r.e;
  // Not usable inside instances (delves/dungeons/interiors) — D2 town portals only
  // work in the field. Keeps the return math simple and avoids cross-region teleports.
  if (p.pos.x > 600 || p.pos.x < -600) {
    ctx.error(r.meta.entityId, 'You cannot open a town portal here.');
    return false;
  }
  closeTownPortal(ctx, p.id); // one portal per character (D2 rule)

  const town = nearestTownHub(p.pos.z);
  const fieldPos: Vec3 = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
  // Place the town portal a few units off the hub centre so it doesn't bury an NPC.
  const townPos: Vec3 = ctx.groundPos(town.x + 6, town.z - 6);

  // Field portal → warps to town; town portal → warps back to the field spot.
  const field = createGroundObject(nextId(), '', 'Town Portal', ctx.groundPos(fieldPos.x, fieldPos.z));
  field.templateId = 'town_portal';
  field.objectItemId = null;
  field.lootable = true; // interactable
  field.portalTo = townPos;
  field.portalOwnerId = p.id;
  ctx.addEntity(field);

  const townPortal = createGroundObject(nextId(), '', 'Town Portal', townPos);
  townPortal.templateId = 'town_portal';
  townPortal.objectItemId = null;
  townPortal.lootable = true;
  townPortal.portalTo = ctx.groundPos(fieldPos.x, fieldPos.z);
  townPortal.portalOwnerId = p.id;
  ctx.addEntity(townPortal);

  // Warp the caster to town immediately (they cast it to get to town).
  p.pos = ctx.groundPos(townPos.x, townPos.z + 2);
  p.prevPos = { ...p.pos };
  ctx.rebucket(p);
  p.targetId = null;
  p.autoAttack = false;
  ctx.emit({
    type: 'log',
    text: `You open a town portal to ${town.name}.`,
    color: '#6cf',
    pid: r.meta.entityId,
  });
  return true;
}

/** Step through a town portal (interact): warp to the linked endpoint. */
export function useTownPortal(ctx: SimContext, portal: Entity, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r || r.e.dead) return;
  const to = portal.portalTo;
  if (!to) return;
  const p = r.e;
  p.pos = ctx.groundPos(to.x, to.z + 1);
  p.prevPos = { ...p.pos };
  ctx.rebucket(p);
  p.targetId = null;
  p.autoAttack = false;
  ctx.emit({ type: 'log', text: 'You step through the portal.', color: '#6cf', pid: r.meta.entityId });
}
