// Waypoint DATA: the authored waypoint list and its pylon offsets. A pure leaf
// split out of waypoints.ts so presentation consumers (src/ui/entity_i18n.ts,
// which the /wiki guide entry bundles) can read the defs without dragging in
// the travel SYSTEM half (waypoints.ts imports the competitive gate from
// unstuck.ts, whose delve imports reach the deed catalog; the guide graph must
// never reach src/sim/content/deeds.ts, pinned by tests/guide.test.ts
// "chunk-color containment").

import { ZONES } from './data';
import type { RealmId } from './realms/types';

export interface WaypointDef {
  id: string;
  name: string;
  x: number;
  z: number;
  zoneId: string;
  realmId?: RealmId;
  assetKey?: string;
}

// Waypoints: one at each town hub PLUS a wilderness waypoint deeper in each zone
// (between the towns), so travel covers the whole overworld like D2's per-act spread.
// Hellmaw-depth waypoints are added by the delve system (they live in the delve band).
// Ordered N to S so the travel menu reads top-to-bottom.
export function waypointDefs(): WaypointDef[] {
  const out: WaypointDef[] = [];
  for (const z of ZONES) {
    // Town-hub waypoint.
    out.push({ id: `wp_${z.id}`, name: z.hub.name, x: z.hub.x, z: z.hub.z, zoneId: z.id });
    // A wilderness waypoint about 2/3 into the zone (past the hub, toward the next
    // zone), offset west so it's out on the trail, not on the hub.
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
  out.push({
    // The player's Infernal Dungeon Entrance is a large landmark, not a town-plaza
    // pylon. Its old spot (0,-22) predates the authored Eastbrook rebuild: it was
    // chosen when the infernal 2.6x ORIGIN-anchored building spread left the south
    // road wide open, but the rebuild's compact plaza (playerStart 2,-2) put that
    // spot in the spawn scene: a giant hellgate towering over Candlebrook's
    // square, its waypoint node soaking up plaza clicks ("Waypoint activated:
    // Hellmaw Dungeon" while walking the square). The landmark belongs in the
    // zone's crypt neighbourhood instead: east of the southern graveyard (4,-56)
    // and the Collapsed Reliquary approach (-5,-52), outside the TOWN_RADIUS 26
    // ring, clear of the bandit road (nearest polyline point ~24yd) and of the
    // reliquary arch slab (~23yd). Travel arrival lands 3yd south (waypointTravel).
    id: 'wp_infernal_dungeon',
    name: 'Hellmaw Dungeon',
    x: 18,
    z: -52,
    zoneId: 'zone1',
    realmId: 'infernal',
    assetKey: 'infernal_dungeon_entrance',
  });
  return out;
}

/** Authored pylon offset from the waypoint's logical point. Eastbrook's town
 *  pylon stands at the well plaza (the crypt-mouth heart of town); everywhere
 *  else keeps the classic NE-edge landmark spot. */
export function pylonOffset(id: string): { x: number; z: number } {
  if (id === 'wp_eastbrook_vale') return { x: 6, z: 5 };
  if (id === 'wp_infernal_dungeon') return { x: 0, z: 0 };
  return { x: 14, z: 14 };
}

export function waypointById(id: string): WaypointDef | null {
  return waypointDefs().find((w) => w.id === id) ?? null;
}
