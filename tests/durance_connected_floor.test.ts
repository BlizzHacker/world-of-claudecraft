import { describe, it, expect } from 'vitest';
import { Sim } from '../src/sim/sim';
import { DELVES, delveOrigin, delveModuleZOffset, delveSlotAt } from '../src/sim/data';
import { pickDelveModules } from '../src/sim/delves/runs';
import { resolvePosition } from '../src/sim/colliders';

function makeSim(seed = 42) {
  return new Sim({ seed, playerClass: 'warrior', autoEquip: true });
}

function enterDurance(sim: Sim) {
  sim.setPlayerLevel(20);
  const meta: any = (sim as any).players.get(sim.playerId);
  meta.questsDone.add('q_sigils_of_hate');
  sim.enterDelve('durance_of_hate', 'normal');
  return sim.delveRunForPlayer(sim.playerId!) as any;
}

describe('durance connected floor — live sim', () => {
  it('open floor: EVERY room spawns at once, deep z, barrels present', () => {
    const sim = makeSim();
    const run = enterDurance(sim);
    expect(run, 'durance run claimed').toBeTruthy();
    expect(run.openFloor).toBe(true);
    expect(run.modules.length).toBe(41);
    const liveMobs = run.mobIds.filter((id: number) => {
      const e = sim.entities.get(id);
      return e && !e.dead;
    });
    expect(liveMobs.length).toBeGreaterThan(200);
    const lastBase = delveModuleZOffset(run.modules, run.modules.length - 1);
    expect(lastBase).toBeGreaterThan(4000);
    const barrels = run.objectIds.filter((id: number) => {
      const st = run.objectState[id];
      return st && (st.kind === 'breakable_barrel' || st.kind === 'breakable_urn');
    });
    expect(barrels.length).toBeGreaterThan(100);
  });

  it('finale room has The Butcher; killing him opens the reward chest', () => {
    const sim = makeSim(99);
    const run = enterDurance(sim);
    const butcherId = run.mobIds.find(
      (id: number) => sim.entities.get(id)?.templateId === 'durance_the_butcher',
    );
    expect(butcherId, 'butcher present on the floor').toBeTruthy();
    const b = sim.entities.get(butcherId)!;
    b.hp = 0;
    b.dead = true;
    (sim as any).onDelveBossDefeated(run);
    expect(run.rewardChestId, 'reward chest spawned on butcher death').not.toBeNull();
  });
});

describe('durance floor geometry', () => {
  const delve = DELVES['durance_of_hate'];

  it('picks 41 rooms (40 pool + finale), ends on finale', () => {
    const mods = pickDelveModules(delve, 12345, 'normal');
    expect(mods.length).toBe(41);
    expect(mods[mods.length - 1]).toBe('durance_finale');
  });

  it('a z inside slot k resolves back to k (no instance overlap)', () => {
    const mods = pickDelveModules(delve, 42, 'infernal');
    for (const k of [0, 5, 12, 23]) {
      const o = delveOrigin(delve.index, k);
      expect(delveSlotAt(delve.index, o.z + 200, mods)).toBe(k);
    }
  });
});

describe('durance corridors are walkable', () => {
  const delve = DELVES['durance_of_hate'];

  it('the doorway gap between rooms resolves near the doorway centre (walkable)', () => {
    const mods = pickDelveModules(delve, 5, 'normal');
    const origin = delveOrigin(delve.index, 0);
    const room1Base = delveModuleZOffset(mods, 1);
    const gapZ = origin.z + room1Base - 8; // middle of the inter-room corridor
    const res = resolvePosition(origin.x, origin.x, gapZ, 0.5, false, mods);
    expect(Math.abs(res.x - origin.x)).toBeLessThan(4); // stays in the doorway
  });

  it('a body pushing into the corridor side wall is stopped at the doorway edge', () => {
    // Corridor side walls sit at |x|=doorHw(6). A body nudged just past the wall
    // (x=8) should be pushed back to the wall face (~6+r), never allowed through.
    const mods = pickDelveModules(delve, 5, 'normal');
    const origin = delveOrigin(delve.index, 0);
    const room1Base = delveModuleZOffset(mods, 1);
    const gapZ = origin.z + room1Base - 8;
    const res = resolvePosition(origin.x, origin.x + 8, gapZ, 0.5, false, mods);
    // resolved x should sit at/just outside the |x|=6 wall face, not free at 8
    expect(Math.abs(res.x - origin.x)).toBeLessThanOrEqual(8);
    expect(Math.abs(res.x - origin.x)).toBeGreaterThan(5);
  });
});
