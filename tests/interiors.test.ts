import { afterEach, describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { getActiveWorldContent, isInteriorPos } from '../src/sim/data';
import {
  buildingAtPoint,
  buildingDoorAt,
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
    void sim;
  });
});
