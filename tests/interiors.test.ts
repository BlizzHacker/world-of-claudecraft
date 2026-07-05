import { afterEach, describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { isInteriorPos } from '../src/sim/data';
import { BUILDING_DOORS, buildingDoorAt } from '../src/sim/interiors';
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

describe('building interiors (enterable town buildings)', () => {
  it('themed realm registers building door areas + interior exit doors', () => {
    forceRealm('infernal');
    const sim = makeSim();
    void sim;
    // Entering is by standing in a building's own door area — registered in
    // BUILDING_DOORS, NOT a separate door object. shop/inn/house rooms each get one
    // exit door inside.
    expect(BUILDING_DOORS.length).toBeGreaterThan(0);
    expect(objsOfType(sim, 'building_door').length).toBe(0); // no separate door object
    expect(objsOfType(sim, 'building_exit').length).toBe(3);
    for (const d of BUILDING_DOORS) {
      expect(typeof d.interiorType).toBe('number');
    }
  });

  it('vanilla realms get NO interiors (solid buildings, no door areas)', () => {
    forceRealm('claudecraft');
    const sim = makeSim();
    expect(BUILDING_DOORS.length).toBe(0);
    expect(objsOfType(sim, 'building_exit').length).toBe(0);
  });

  it('standing in a door area + interact enters the interior; the exit returns you outside', () => {
    forceRealm('infernal');
    const sim = makeSim();
    const door = BUILDING_DOORS[0];
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
    // Regression: buildingDoorAt was only checked as the LAST interact fallback, so any
    // town prop/object within range preempted it and the building never opened. Now the
    // door competes on distance — standing right at it wins over a prop a few units off.
    forceRealm('infernal');
    const sim = makeSim();
    const door = BUILDING_DOORS[0];
    const p = sim.player;
    p.pos.x = door.x;
    p.pos.z = door.z;
    // Drop a lootable ground object a few units away — closer than nothing but farther
    // than the door the player is standing on.
    const clutter = [...sim.entities.values()].find((e) => e.kind === 'object' && e.lootable);
    if (clutter) {
      clutter.pos.x = door.x + 2.5;
      clutter.pos.z = door.z + 2.5;
    }
    sim.interact();
    expect(isInteriorPos(p.pos.x)).toBe(true); // entered despite the nearby prop
    expect(p.interiorType).toBe(door.interiorType);
  });

  it('the interior room stays at a finite interior position', () => {
    forceRealm('infernal');
    const sim = makeSim();
    const door = BUILDING_DOORS[0];
    const p = sim.player;
    p.pos.x = door.x;
    p.pos.z = door.z;
    sim.interact();
    expect(Number.isFinite(p.pos.x) && Number.isFinite(p.pos.z)).toBe(true);
    expect(isInteriorPos(p.pos.x)).toBe(true);
  });
});
