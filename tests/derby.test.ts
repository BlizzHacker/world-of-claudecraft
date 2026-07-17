// The Thornwheel Derby behavior spec: the physical circuit (flatten, marshal,
// colliders from ONE layout module), queue guards, the grid call, the kart
// swap, real-position checkpoint progression, laps, finish order and purses,
// desertion, and the teardown round trip. The race runs on REAL entities on
// the real east-bluff site: every progression assertion below moves the actual
// player entity along the actual world-coordinate checkpoint rings.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MOUNTS } from '../src/sim/content/mounts';
import {
  DERBY_CHECKPOINTS,
  DERBY_GRID,
  DERBY_LAPS,
  isOnCircuit,
  MARSHAL_POS,
  THORNWHEEL_FLAT,
} from '../src/sim/derby_layout';
import { Sim } from '../src/sim/sim';
import {
  DERBY_GRID_COUNTDOWN,
  DERBY_MARSHAL_ID,
  DERBY_PURSES,
  DERBY_QUEUE_WAIT,
} from '../src/sim/social/derby';
import type { SimEvent } from '../src/sim/types';
import { groundHeight, terrainHeight } from '../src/sim/world';

function makeWorld() {
  return new Sim({ seed: 42, playerClass: 'warrior', noPlayer: true });
}

function teleport(sim: Sim, pid: number, x: number, z: number) {
  const e = sim.entities.get(pid)!;
  e.pos.x = x;
  e.pos.z = z;
  e.pos.y = groundHeight(x, z, sim.cfg.seed);
  e.prevPos = { ...e.pos };
  (sim as any).rebucket(e);
}

function addAtGate(sim: Sim, name: string) {
  const pid = sim.addPlayer('warrior', name);
  teleport(sim, pid, MARSHAL_POS.x + 1, MARSHAL_POS.z);
  return pid;
}

function tickUntil(sim: Sim, pred: () => boolean, maxTicks: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < maxTicks && !pred(); i++) out.push(...sim.tick());
  return out;
}

/** Drive a seated racer around the course: hop the entity onto each next ring
 *  center every few ticks (real positions, real rings). */
function driveLaps(sim: Sim, pid: number, rings: number) {
  for (let r = 0; r < rings; r++) {
    const seat = sim.derby.race?.seats.find((s) => s.pid === pid);
    if (!seat || seat.finishedAtTick !== null) return;
    const next = DERBY_CHECKPOINTS[(seat.cpTotal + 1) % DERBY_CHECKPOINTS.length];
    teleport(sim, pid, next.x, next.z);
    sim.tick();
  }
}

describe('the Thornwheel Circuit site', () => {
  it('levels the racing ground to the pad height', () => {
    const seed = 42;
    // pad center and all four straights sit on the flattened plateau
    for (const [x, z] of [
      [124, 32],
      [111, 32],
      [137, 32],
      [124, 11],
      [124, 53],
    ] as const) {
      expect(Math.abs(terrainHeight(x, z, seed) - THORNWHEEL_FLAT.height)).toBeLessThan(0.01);
    }
  });

  it('spawns Race Marshal Pip at the paddock gate under her reserved id', () => {
    const sim = makeWorld();
    const pip = sim.entities.get(DERBY_MARSHAL_ID);
    expect(pip).toBeTruthy();
    expect(pip!.name).toBe('Race Marshal Pip');
    expect(Math.hypot(pip!.pos.x - MARSHAL_POS.x, pip!.pos.z - MARSHAL_POS.z)).toBeLessThan(2);
  });

  it('keeps every checkpoint ring and grid slot on the fenced circuit', () => {
    for (const cp of DERBY_CHECKPOINTS) expect(isOnCircuit(cp.x, cp.z)).toBe(true);
    for (const slot of DERBY_GRID) expect(isOnCircuit(slot.x, slot.z)).toBe(true);
  });
});

describe('the Derby queue', () => {
  it('requires standing at the Marshal', () => {
    const sim = makeWorld();
    const pid = sim.addPlayer('warrior', 'FarAway');
    teleport(sim, pid, 0, 0);
    sim.derbyQueueJoin(pid);
    expect(sim.derby.queue).toHaveLength(0);
  });

  it('signs riders up and scratches them again', () => {
    const sim = makeWorld();
    const pid = addAtGate(sim, 'Rider');
    sim.derbyQueueJoin(pid);
    expect(sim.derby.queue).toEqual([pid]);
    expect(sim.derbyInfoFor(pid)?.myQueued).toBe(true);
    sim.derbyQueueLeave(pid);
    expect(sim.derby.queue).toHaveLength(0);
  });
});

describe('a Derby race', () => {
  it('runs grid -> green -> laps -> checkered flag on real entities', () => {
    const sim = makeWorld();
    const a = addAtGate(sim, 'Alta');
    const b = addAtGate(sim, 'Berrin');
    sim.derbyQueueJoin(a);
    sim.derbyQueueJoin(b);
    // the grid call comes when the queue deadline lapses
    tickUntil(sim, () => sim.derby.race !== null, 20 * (DERBY_QUEUE_WAIT + 2));
    const race = sim.derby.race!;
    expect(race.phase).toBe('grid');
    // riders were seated on the grid, karts on
    const ea = sim.entities.get(a)!;
    expect(Math.hypot(ea.pos.x - DERBY_GRID[0].x, ea.pos.z - DERBY_GRID[0].z)).toBeLessThan(1);
    expect(ea.auras.some((au) => au.id === 'mount_derby_kart')).toBe(true);
    expect(ea.auras.find((au) => au.id === 'mount_derby_kart')?.value).toBe(
      MOUNTS.derby_kart.speedMult,
    );
    // green flag
    tickUntil(sim, () => sim.derby.race?.phase === 'racing', 20 * (DERBY_GRID_COUNTDOWN + 2));
    expect(sim.derby.race?.phase).toBe('racing');
    // Alta drives all laps; Berrin only manages one ring
    driveLaps(sim, b, 1);
    driveLaps(sim, a, DERBY_CHECKPOINTS.length * DERBY_LAPS);
    const seatA = sim.derby.race!.seats.find((s) => s.pid === a)!;
    expect(seatA.finishPlace).toBe(1);
    // the winner's purse landed
    const metaA = (sim as any).players.get(a);
    expect(metaA.copper).toBeGreaterThanOrEqual(DERBY_PURSES[0]);
    // Berrin finishes second once he completes the distance
    driveLaps(sim, b, DERBY_CHECKPOINTS.length * DERBY_LAPS);
    const seatB = sim.derby.race!.seats.find((s) => s.pid === b)!;
    expect(seatB.finishPlace).toBe(2);
    // everyone finished: aftermath, then teardown returns riders to the gate
    tickUntil(sim, () => sim.derby.race === null, 20 * 12);
    expect(sim.derby.race).toBeNull();
    const eaAfter = sim.entities.get(a)!;
    expect(
      Math.hypot(eaAfter.pos.x - (MARSHAL_POS.x + 1), eaAfter.pos.z - MARSHAL_POS.z),
    ).toBeLessThan(2);
    expect(eaAfter.auras.some((au) => au.id === 'mount_derby_kart')).toBe(false);
  });

  it('deserts a rider who leaves the venue and hands the kart back', () => {
    const sim = makeWorld();
    const a = addAtGate(sim, 'Alta');
    const b = addAtGate(sim, 'Berrin');
    sim.derbyQueueJoin(a);
    sim.derbyQueueJoin(b);
    tickUntil(
      sim,
      () => sim.derby.race?.phase === 'racing',
      20 * (DERBY_QUEUE_WAIT + DERBY_GRID_COUNTDOWN + 4),
    );
    // Berrin walks far off the bluffs mid-race
    teleport(sim, b, 0, 0);
    sim.tick();
    const seatB = sim.derby.race!.seats.find((s) => s.pid === b)!;
    expect(seatB.deserted).toBe(true);
    const eb = sim.entities.get(b)!;
    expect(eb.auras.some((au) => au.id === 'mount_derby_kart')).toBe(false);
    // the race continues for Alta
    driveLaps(sim, a, DERBY_CHECKPOINTS.length * DERBY_LAPS);
    expect(sim.derby.race!.seats.find((s) => s.pid === a)!.finishPlace).toBe(1);
  });

  it('never touches the shared rng stream (source guarantee)', () => {
    // The module contract is ZERO rng anywhere (header comment): progression,
    // standings, and timers are pure functions of sim state. A with/without
    // twin comparison cannot isolate this cleanly here because the race
    // necessarily MOVES the rider (teleports shift position-dependent ambient
    // draw timing, which is world behavior, not derby rng), so the guarantee
    // is pinned at the source level, the architecture-test style.
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../src/sim/social/derby.ts'),
      'utf8',
    );
    // Strip comments first: the header PROSE documents the zero-rng rule, the
    // assertion is about executable code.
    const code = src.replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/\brng\b/i);
    expect(code).not.toContain('Math.random');
  });

  it('is deterministic: twin runs produce identical results and draw streams', () => {
    const run = () => {
      const sim = makeWorld();
      const a = addAtGate(sim, 'Alta');
      const values: number[] = [];
      (sim as any).rng.setObserver((v: number) => values.push(v));
      sim.derbyQueueJoin(a);
      for (let i = 0; i < 20 * (DERBY_QUEUE_WAIT + DERBY_GRID_COUNTDOWN + 2); i++) sim.tick();
      driveLaps(sim, a, DERBY_CHECKPOINTS.length * DERBY_LAPS);
      for (let i = 0; i < 20 * 12; i++) sim.tick();
      (sim as any).rng.setObserver(null);
      const meta = (sim as any).players.get(a);
      return { values, copper: meta.copper, raceGone: sim.derby.race === null };
    };
    const first = run();
    const second = run();
    expect(first.raceGone).toBe(true);
    expect(first.copper).toBe(second.copper);
    expect(first.values).toEqual(second.values);
  });
});
