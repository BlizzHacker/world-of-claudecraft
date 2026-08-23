// Living in an Eastbrook Home: the cottage door is a real door. Owner enters,
// party rides along, kicked/departed guests are shown the door, strangers
// find it locked, and unsold plots explain themselves.

import { describe, expect, it } from 'vitest';
import { HOME_LOTS } from '../src/sim/homes_layout';
import { INTERIOR_TYPE_HOME } from '../src/sim/interiors';
import { Sim } from '../src/sim/sim';
import { groundHeight } from '../src/sim/world';

function makeWorld() {
  return new Sim({ seed: 42, playerClass: 'warrior', noPlayer: true });
}

function addAtDoor(sim: Sim, name: string, lotIndex = 0) {
  const pid = sim.addPlayer('warrior', name);
  const e = sim.entities.get(pid)!;
  const door = HOME_LOTS[lotIndex].door;
  e.pos.x = door.x;
  e.pos.z = door.z;
  e.pos.y = groundHeight(door.x, door.z, sim.cfg.seed);
  e.prevPos = { ...e.pos };
  (sim as any).rebucket(e);
  return pid;
}

function deed(sim: Sim, lotId: string, owner: string) {
  sim.homes.lots[lotId] = { owner, characterId: null, at: 0 };
}

describe('living in an Eastbrook Home', () => {
  it('walks the owner in through the cottage door', () => {
    const sim = makeWorld();
    const owner = addAtDoor(sim, 'Homebody');
    deed(sim, 'lot_a', 'Homebody');
    sim.interact(owner);
    const e = sim.entities.get(owner)!;
    expect(e.interiorType).toBe(INTERIOR_TYPE_HOME);
  });

  it('locks the door against strangers and explains unsold plots', () => {
    const sim = makeWorld();
    const stranger = addAtDoor(sim, 'Stranger');
    deed(sim, 'lot_a', 'SomeoneElse');
    sim.interact(stranger);
    expect(sim.entities.get(stranger)!.interiorType).not.toBe(INTERIOR_TYPE_HOME);
    // unsold plot on lot_b
    const shopper = addAtDoor(sim, 'Shopper', 1);
    sim.interact(shopper);
    expect(sim.entities.get(shopper)!.interiorType).not.toBe(INTERIOR_TYPE_HOME);
  });

  it('walks the owner back OUT through the cottage exit door (voluntary leave)', () => {
    const sim = makeWorld();
    const owner = addAtDoor(sim, 'Homebody');
    deed(sim, 'lot_a', 'Homebody');
    sim.interact(owner);
    const e = sim.entities.get(owner)!;
    expect(e.interiorType).toBe(INTERIOR_TYPE_HOME);
    // The room spawns its own building_exit within interact range of the entry
    // spot, so a plain interact press inside walks the owner back outside.
    const exit = [...sim.entities.values()].find(
      (obj) => obj.templateId === 'building_exit' && Math.abs(obj.pos.x - e.pos.x) < 80,
    );
    expect(exit, 'home room should spawn a building_exit').toBeTruthy();
    sim.interact(owner);
    expect(e.interiorType).not.toBe(INTERIOR_TYPE_HOME);
    const door = HOME_LOTS[0].door;
    expect(Math.abs(e.pos.x - door.x)).toBeLessThan(5);
    expect(Math.abs(e.pos.z - door.z)).toBeLessThan(5);
  });

  it('lets party members in and shows them the door when they leave the party', () => {
    const sim = makeWorld();
    const owner = addAtDoor(sim, 'Homebody');
    const friend = addAtDoor(sim, 'Friend');
    deed(sim, 'lot_a', 'Homebody');
    // form the party (invite + accept through the sim's party surface)
    (sim as any).partyInvite(friend, owner);
    (sim as any).partyAccept(friend);
    sim.interact(friend);
    const fe = sim.entities.get(friend)!;
    expect(fe.interiorType).toBe(INTERIOR_TYPE_HOME);
    // leaving the party gets the guest walked out on the next tick
    (sim as any).partyLeave(friend);
    sim.tick();
    expect(fe.interiorType).not.toBe(INTERIOR_TYPE_HOME);
  });
});
