import { afterEach, describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import {
  BUILTIN_WORLD,
  getActiveWorldContent,
  isBuiltinWorldContent,
  isInteriorPos,
  setActiveWorldContent,
  zoneAt,
} from '../src/sim/data';
import {
  buildingAtPoint,
  buildingDoorAt,
  buildingDoorForPoint,
  buildingDoorNear,
  buildingEnterableNear,
  computeBuildingDoors,
} from '../src/sim/interiors';
import { setRealmHostEnv } from '../src/sim/realms/registry';

function forceRealm(id: string) {
  setRealmHostEnv({
    queryParam: (n) => (n === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}
afterEach(() => setRealmHostEnv(null));

function makeSim() {
  return new Sim({ seed: 5, playerClass: 'warrior', autoEquip: true });
}
function objsOfType(sim: Sim, tid: string) {
  return [...sim.entities.values()].filter((e) => e.templateId === tid);
}
// Door areas are computed on demand from the active realm's buildings (pure), so the
// online client — which runs ClientWorld, never Sim — resolves them identically.
function doors() {
  return computeBuildingDoors(getActiveWorldContent().props.buildings);
}

describe('building interiors (enterable town buildings)', () => {
  it('themed realm computes building door areas + spawns interior exit doors', () => {
    forceRealm('infernal');
    const sim = makeSim();
    // Entering is by standing in a building's own door area (computed, NOT a spawned
    // object). shop/inn/house rooms each get one exit door inside.
    expect(doors().length).toBeGreaterThan(0);
    expect(objsOfType(sim, 'building_door').length).toBe(0); // no separate door object
    // One shared room (+ exit door) per interior type: shop, inn, house, chapel.
    expect(objsOfType(sim, 'building_exit').length).toBe(4);
    for (const d of doors()) expect(typeof d.interiorType).toBe('number');
  });

  it('vanilla realms get NO interiors (solid buildings, no enterable doors)', () => {
    forceRealm('claudecraft');
    const sim = makeSim();
    void sim;
    // No worldTheme → buildingDoorNear returns null even if the realm has buildings.
    expect(buildingDoorNear(0, 0)).toBeNull();
    expect(objsOfType(sim, 'building_exit').length).toBe(0);
  });

  it('door resolution is identical WITHOUT a Sim (the online ClientWorld case)', () => {
    // The bug that made buildings un-enterable online: door lookup depended on a
    // registry only Sim populated, but the online client never builds a Sim. Now it is
    // a pure function of the active world content — no Sim needed.
    forceRealm('infernal');
    // No makeSim() here on purpose.
    const ds = doors();
    expect(ds.length).toBeGreaterThan(0);
    expect(buildingDoorAt(ds[0].x, ds[0].z)).toBe(ds[0].interiorType);
  });

  it('standing in a door area + interact enters the interior; the exit returns you outside', () => {
    forceRealm('infernal');
    const sim = makeSim();
    const door = doors()[0];
    const p = sim.player;
    // Stand in the building's door area (return spot the interior remembers).
    p.pos.x = door.x;
    p.pos.z = door.z;
    expect(buildingDoorAt(p.pos.x, p.pos.z)).toBe(door.interiorType);
    const before = { x: p.pos.x, z: p.pos.z };
    sim.interact();
    expect(isInteriorPos(p.pos.x)).toBe(true); // inside the interior band
    expect(p.interiorReturn).toBeTruthy(); // return spot saved
    expect(p.interiorType).toBe(door.interiorType);
    // Exit via the room's exit door.
    const exit = [...sim.entities.values()].find(
      (e) => e.templateId === 'building_exit' && Math.abs(e.pos.x - p.pos.x) < 80,
    )!;
    p.pos.x = exit.pos.x;
    p.pos.z = exit.pos.z;
    sim.targetEntity(exit.id);
    sim.interact();
    expect(isInteriorPos(p.pos.x)).toBe(false); // back outside
    expect(p.interiorReturn).toBeNull();
    // Returned near where we came in (the building door area).
    expect(Math.abs(p.pos.x - before.x)).toBeLessThan(5);
    expect(Math.abs(p.pos.z - before.z)).toBeLessThan(5);
  });

  it('entering the door beats a nearby ambient prop (the real "cannot enter" bug)', () => {
    // Regression: buildingDoorNear was only checked as the LAST interact fallback, so
    // any town prop/object within range preempted it. Now the door competes on distance.
    forceRealm('infernal');
    const sim = makeSim();
    const door = doors()[0];
    const p = sim.player;
    p.pos.x = door.x;
    p.pos.z = door.z;
    const clutter = [...sim.entities.values()].find((e) => e.kind === 'object' && e.lootable);
    if (clutter) {
      clutter.pos.x = door.x + 2.5;
      clutter.pos.z = door.z + 2.5;
    }
    sim.interact();
    expect(isInteriorPos(p.pos.x)).toBe(true); // entered despite the nearby prop
    expect(p.interiorType).toBe(door.interiorType);
  });

  it('click-to-enter: clicking a building footprint is detected; interact near it enters', () => {
    // The requested UX: click a building (within range) → Enter menu → enter. buildingAtPoint
    // detects a click anywhere on the footprint; the server accepts interact within range of
    // the building centre even off the door face (buildingEnterableNear).
    forceRealm('infernal');
    const sim = new Sim({ seed: 5, playerClass: 'warrior', autoEquip: true });
    const b = getActiveWorldContent().props.buildings.find((x) => x.kind === 'house')!;
    // A click on the building centre resolves to its interior type.
    const hit = buildingAtPoint(b.x, b.z);
    expect(hit).toBeTruthy();
    expect(typeof hit!.interiorType).toBe('number');
    // The server accepts entry from near the centre (not on the door face).
    expect(buildingEnterableNear(b.x + 6, b.z + 6, 28)).toBe(hit!.interiorType);
    // Stand near the building (off the door face) and interact → enter.
    const p = sim.player;
    p.pos.x = b.x + 6;
    p.pos.z = b.z + 6;
    sim.interact();
    expect(isInteriorPos(p.pos.x)).toBe(true);
  });

  it('buildingDoorForPoint maps every enterable footprint to its OWN door (the click-to-enter walk target)', () => {
    // The Enter menu walks the player to this point before pressing the
    // interact: from the click spot a bare interact loses the sim's distance
    // arbitration to a doorstep NPC (the mill's tinker at 2.6yd beat the door
    // at 2.9yd), so the accepted menu entered nothing. Each footprint must
    // resolve to the door computeBuildingDoors placed on that same building.
    forceRealm('infernal');
    const buildings = getActiveWorldContent().props.buildings;
    const doors = computeBuildingDoors(buildings);
    for (const b of buildings) {
      if (!buildingAtPoint(b.x, b.z)) continue; // not enterable
      const door = buildingDoorForPoint(b.x, b.z);
      expect(door, `building kind ${b.kind} @${b.x},${b.z} has no door mapping`).not.toBeNull();
      const nearest = doors.reduce((a, c) =>
        Math.hypot(a.x - b.x, a.z - b.z) <= Math.hypot(c.x - b.x, c.z - b.z) ? a : c,
      );
      // Its OWN door: the nearest computed door to the building centre (door
      // rings are disjoint by the density clamp, so nearest = own).
      expect(door!.x).toBeCloseTo(nearest.x, 5);
      expect(door!.z).toBeCloseTo(nearest.z, 5);
      expect(door!.interiorType).toBe(nearest.interiorType);
    }
    // And a miss stays a miss: open ground maps to no door.
    expect(buildingDoorForPoint(0, 60)).toBeNull();
  });

  it('buildingAtPoint / buildingEnterableNear are null on vanilla realms', () => {
    forceRealm('claudecraft');
    expect(buildingAtPoint(0, 0)).toBeNull();
    expect(buildingEnterableNear(0, 0, 50)).toBeNull();
  });

  it('EVERY building kind is enterable — chapels included (no dead landmarks)', () => {
    forceRealm('infernal');
    const sim = makeSim();
    const kinds = new Set(getActiveWorldContent().props.buildings.map((b) => b.kind));
    // Whatever kinds this realm places, each maps to a door (none returns null now).
    for (const b of getActiveWorldContent().props.buildings) {
      const door = buildingAtPoint(b.x, b.z);
      expect(door, `building kind ${b.kind} should be enterable`).not.toBeNull();
    }
    // Sanity: the realm actually has a chapel to prove the fix matters.
    expect(kinds.has('chapel')).toBe(true);
    // And the v0.35 Veiled Hollow set is actually placed (the kinds whose missing
    // mapping made all 8 of its buildings solid scenery after the intake).
    expect(kinds.has('hollowInn')).toBe(true);
    void sim;
  });

  it('theme spread keeps every building in its own zone, ringed around its hub (v0.35.1 regression)', () => {
    // Origin-anchored spread (x * 2.6) hurled 64 of 78 buildings 500-3400yd out of
    // their towns once upstream v0.35 shipped hub towns far from the origin: doors,
    // colliders and meshes all moved together, leaving building-less NPC squares and
    // misplaced obstacles in other zones. Spread must displace a building around its
    // OWN zone hub, so towns keep their buildings and doors stay walkable from town.
    forceRealm('infernal');
    const themed = getActiveWorldContent().props.buildings;
    const base = BUILTIN_WORLD.props.buildings;
    expect(themed.length).toBe(base.length);
    for (let i = 0; i < base.length; i++) {
      const b = base[i];
      const t = themed[i];
      // Same zone before and after theming — a displaced building never leaves town.
      expect(zoneAt(t.x, t.z).id, `${t.kind} @${b.x},${b.z} left its zone`).toBe(
        zoneAt(b.x, b.z).id,
      );
      // And it stays within its hub's orbit: |themed - hub| = spread * |base - hub|,
      // which for the authored towns keeps every building under ~150yd of its hub.
      const hub = zoneAt(b.x, b.z).hub;
      const baseR = Math.hypot(b.x - hub.x, b.z - hub.z);
      const themedR = Math.hypot(t.x - hub.x, t.z - hub.z);
      expect(themedR, `${t.kind} @${b.x},${b.z} flew out of its hub orbit`).toBeLessThanOrEqual(
        baseR * 2.6 + 0.01,
      );
    }
    // Every door ring sits on a building's own front face: within the building's
    // half-diagonal + its enter radius of the building centre (starter-town pin for
    // the door-trigger/building overlap the v0.35.1 intake broke).
    const buildingsNow = getActiveWorldContent().props.buildings;
    for (const d of doors()) {
      const owner = buildingsNow.some(
        (b) => Math.hypot(d.x - b.x, d.z - b.z) <= Math.hypot(b.w, b.d) / 2 + d.r + 0.01,
      );
      expect(owner, `door at ${d.x},${d.z} overlaps no building`).toBe(true);
    }
  });

  it('the themed world copy still counts as builtin content (invisible-wall regression)', () => {
    // The authored town views (Eastbrook/Fenbridge) and the muster-board colliders
    // gate on "is this the shipped world". Gating on OBJECT IDENTITY made every
    // themed realm fail the check: the town kits (walls included) stopped rendering
    // while their PROPS.walls colliders stayed registered — 102 invisible colliders
    // on the infernal realm. The themed copy must classify as builtin content.
    forceRealm('infernal');
    const themed = getActiveWorldContent();
    expect(themed).not.toBe(BUILTIN_WORLD); // it IS a distinct themed copy...
    expect(isBuiltinWorldContent(themed)).toBe(true); // ...but builtin content
    expect(isBuiltinWorldContent(BUILTIN_WORLD)).toBe(true);
    // An editor/custom bundle stays non-builtin (it sheds the authored kits).
    const custom = { ...BUILTIN_WORLD, props: { ...BUILTIN_WORLD.props, walls: [] } };
    setActiveWorldContent(custom);
    try {
      expect(isBuiltinWorldContent(getActiveWorldContent())).toBe(false);
    } finally {
      setActiveWorldContent(null);
    }
  });
});
