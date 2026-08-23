import { describe, expect, it } from 'vitest';
import { DELVE_X_MIN, INSTANCE_X_BASE, RIFT_X_MIN } from '../src/sim/data';
import { Sim } from '../src/sim/sim';
import type { Entity, SimEvent } from '../src/sim/types';
import { pylonOffset, waypointDefs } from '../src/sim/waypoints';
import { groundHeight } from '../src/sim/world';

function makeSim() {
  return new Sim({ seed: 42, playerClass: 'warrior', autoEquip: true });
}

function pylonEntity(sim: Sim, waypointId: string): Entity {
  const pylon = [...sim.entities.values()].find(
    (e) => e.templateId === 'waypoint' && e.waypointId === waypointId,
  );
  expect(pylon, `no pylon spawned for ${waypointId}`).toBeTruthy();
  return pylon!;
}

function teleport(sim: Sim, x: number, z: number) {
  const p = sim.player;
  p.pos.x = x;
  p.pos.z = z;
  p.pos.y = groundHeight(x, z, sim.cfg.seed);
  p.prevPos = { ...p.pos };
  (sim as any).rebucket(p);
}

function standAtPylon(sim: Sim, waypointId: string) {
  const pylon = pylonEntity(sim, waypointId);
  teleport(sim, pylon.pos.x, pylon.pos.z);
}

function meta(sim: Sim) {
  return (sim as any).players.get(sim.player.id);
}

function errorText(events: SimEvent[]): string | null {
  const err = events.find((e) => e.type === 'error') as { text: string } | undefined;
  return err?.text ?? null;
}

describe('realm waypoints', () => {
  it('keeps the authored Infernal entrance as a scoped travel landmark', () => {
    const infernal = waypointDefs().find((waypoint) => waypoint.id === 'wp_infernal_dungeon');
    expect(infernal).toMatchObject({
      name: 'Hellmaw Dungeon',
      realmId: 'infernal',
      assetKey: 'infernal_dungeon_entrance',
      x: 18,
      z: -52,
    });
    expect(pylonOffset('wp_infernal_dungeon')).toEqual({ x: 0, z: 0 });
  });
});

describe('waypoint activation', () => {
  it('interacting with a pylon activates it and emits the travel menu with known flags', () => {
    const sim = makeSim();
    const first = waypointDefs()[0];
    standAtPylon(sim, first.id);
    sim.interact();
    const events = sim.tick();
    const menu = events.find((e) => e.type === 'waypointMenu') as
      | { waypoints: { id: string; name: string; known: boolean }[] }
      | undefined;
    expect(menu, 'no waypointMenu event').toBeTruthy();
    const rows = new Map(menu!.waypoints.map((w) => [w.id, w.known]));
    expect(rows.get(first.id)).toBe(true);
    const other = waypointDefs().find((w) => w.id !== first.id)!;
    expect(rows.get(other.id)).toBe(false);
    expect(meta(sim).waypointsActivated.has(first.id)).toBe(true);
  });
});

describe('waypoint travel validation (server-side)', () => {
  const defs = waypointDefs();
  const src = defs[0];
  const dest = defs[2];

  function primedSim() {
    const sim = makeSim();
    meta(sim).waypointsActivated.add(src.id);
    meta(sim).waypointsActivated.add(dest.id);
    standAtPylon(sim, src.id);
    return sim;
  }

  it('refuses an undiscovered destination', () => {
    const sim = makeSim();
    standAtPylon(sim, src.id);
    sim.waypointTravel(dest.id);
    expect(errorText(sim.tick())).toBe("You haven't discovered that waypoint yet.");
  });

  it('refuses travel away from any pylon', () => {
    const sim = primedSim();
    teleport(sim, 120, 300); // open field, no pylon in reach
    sim.waypointTravel(dest.id);
    expect(errorText(sim.tick())).toBe('You must be standing at a waypoint to travel.');
  });

  it('refuses travel in combat', () => {
    const sim = primedSim();
    sim.player.combatTimer = 0;
    sim.waypointTravel(dest.id);
    expect(errorText(sim.tick())).toBe('You cannot use a waypoint while in combat.');
  });

  it('refuses travel while jailed', () => {
    const sim = primedSim();
    sim.player.jailed = true;
    sim.waypointTravel(dest.id);
    expect(errorText(sim.tick())).toBe('You cannot use a waypoint while jailed.');
  });

  it('refuses travel during a competitive match (arena)', () => {
    const sim = primedSim();
    // Presence in the arena-match map is all the competitive predicate reads;
    // clear the stub before tick so updateArena never sees the fake match.
    (sim as any).arenaMatches.set(sim.player.id, {});
    sim.waypointTravel(dest.id);
    (sim as any).arenaMatches.delete(sim.player.id);
    expect(errorText(sim.tick())).toBe('You cannot use a waypoint during a competitive match.');
  });

  it('refuses travel from the rift, delve, and instance bands', () => {
    for (const x of [RIFT_X_MIN + 5, DELVE_X_MIN + 5, INSTANCE_X_BASE + 100]) {
      const sim = primedSim();
      sim.player.pos.x = x;
      sim.player.prevPos = { ...sim.player.pos };
      (sim as any).rebucket(sim.player);
      sim.waypointTravel(dest.id);
      expect(errorText(sim.tick()), `origin x=${x}`).toBe('You cannot use a waypoint from here.');
    }
  });

  it('travels between activated pylons and the unlock survives a save round trip', () => {
    const sim = primedSim();
    sim.waypointTravel(dest.id);
    const events = sim.tick();
    expect(events.some((e) => e.type === 'error')).toBe(false);
    const off = pylonOffset(dest.id);
    expect(Math.abs(sim.player.pos.x - (dest.x + off.x))).toBeLessThan(1);
    expect(Math.abs(sim.player.pos.z - (dest.z + off.z - 3))).toBeLessThan(1);

    const state = sim.serializeCharacter(sim.player.id)!;
    expect(state.waypointsActivated).toEqual(expect.arrayContaining([src.id, dest.id]));
    const sim2 = new Sim({ seed: 42, playerClass: 'warrior', noPlayer: true });
    const pid = sim2.addPlayer('warrior', 'Restored', { state });
    const restored = (sim2 as any).players.get(pid);
    expect(restored.waypointsActivated.has(src.id)).toBe(true);
    expect(restored.waypointsActivated.has(dest.id)).toBe(true);
  });
});
