import { describe, expect, it } from 'vitest';

import { Sim } from '../src/sim/sim';
import { DT } from '../src/sim/types';

/**
 * Empty-ring idle cost (measured with PERF_TICK_LOG=1 on a live ring, zero
 * players, 1,086 entities): mob.update burned 61-64ms per second - essentially
 * the whole idle tick - steering beasts around for nobody. The fix: with zero
 * connected players, unowned mobs skip AI entirely and only their auras tick.
 *
 * Pins the four properties that make the gate safe: frozen while empty,
 * timers still advance, AI resumes on first login, and the gate is inert when
 * the cfg switch is off (the offline world and the parity harness never set
 * idleMobTickRadius, so they must be byte-identical with and without it).
 */

type AnySim = Sim & { [k: string]: any };

function makeSim(idleMobTickRadius: number): AnySim {
  return new Sim({
    seed: 1234,
    playerClass: 'warrior',
    noPlayer: true,
    idleMobTickRadius,
  } as ConstructorParameters<typeof Sim>[0]) as AnySim;
}

function firstLiveMob(sim: AnySim) {
  for (const e of sim.entities.values()) {
    if (e.kind === 'mob' && !e.dead && e.ownerId === null) return e;
  }
  throw new Error('world seeded no mobs');
}

function tickN(sim: AnySim, n: number): void {
  for (let i = 0; i < n; i++) sim.tick();
}

describe('empty-world mob gate', () => {
  it('freezes unowned mob AI while no players are connected', () => {
    const sim = makeSim(40);
    tickN(sim, 5);
    const mob = firstLiveMob(sim);
    mob.aiState = 'chase'; // a state the per-mob dormancy could never skip
    const before = { x: mob.pos.x, z: mob.pos.z, state: mob.aiState };

    tickN(sim, 100); // 5 seconds of empty world

    expect(mob.pos.x).toBe(before.x);
    expect(mob.pos.z).toBe(before.z);
    expect(mob.aiState).toBe(before.state);
  });

  it('still advances world time while frozen (respawn/boss timers not paused)', () => {
    const sim = makeSim(40);
    const t0 = sim.time;
    tickN(sim, 20);
    expect(sim.time).toBeCloseTo(t0 + 20 * DT, 6);
  });

  it('resumes AI the moment a player connects', () => {
    const sim = makeSim(40);
    tickN(sim, 5);
    const mob = firstLiveMob(sim);
    mob.aiState = 'chase';
    tickN(sim, 20);
    expect(mob.aiState).toBe('chase'); // frozen while empty

    sim.addPlayer('warrior', 'Returning');
    tickN(sim, 40);
    // Real AI ran again: the impossible no-target chase resolves to something
    // else (idle/evade/attack - the specific state is AI's business).
    expect(mob.aiState).not.toBe('chase');
  });

  it('is inert when the cfg switch is off (offline/parity worlds)', () => {
    const sim = makeSim(0);
    tickN(sim, 5);
    const mob = firstLiveMob(sim);
    mob.aiState = 'chase';
    tickN(sim, 40);
    // With the switch off the gate must not fire even with zero players:
    // updateMob runs and resolves the no-target chase.
    expect(mob.aiState).not.toBe('chase');
  });
});
