// The Boarpit behavior spec: the physical stake ring (flatten, Pit Master,
// colliders from ONE layout module), signup guards, the bell, mutual
// hostility scoped to the live bout, the 1 hp KO clamp (nobody dies in the
// pit), winner settlement + purses, desertion, and the teardown round trip.
// Bouts run on REAL player entities at the real knoll site.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BOARPIT_CENTER,
  BOARPIT_FLAT,
  isInPit,
  PIT_MASTER_POS,
  PIT_SLOTS,
} from '../src/sim/boarpit_layout';
import { Sim } from '../src/sim/sim';
import {
  PIT_COUNTDOWN,
  PIT_MASTER_ID,
  PIT_PURSE_WIN,
  PIT_QUEUE_WAIT,
} from '../src/sim/social/boarpit';
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
  teleport(sim, pid, PIT_MASTER_POS.x + 1, PIT_MASTER_POS.z);
  return pid;
}

function tickUntil(sim: Sim, pred: () => boolean, maxTicks: number) {
  for (let i = 0; i < maxTicks && !pred(); i++) sim.tick();
}

function startBoutWith(sim: Sim, names: string[]): number[] {
  const pids = names.map((n) => addAtGate(sim, n));
  for (const pid of pids) sim.pitQueueJoin(pid);
  tickUntil(
    sim,
    () => sim.boarpit.bout?.phase === 'fighting',
    20 * (PIT_QUEUE_WAIT + PIT_COUNTDOWN + 4),
  );
  expect(sim.boarpit.bout?.phase).toBe('fighting');
  return pids;
}

describe('the Boarpit site', () => {
  it('levels the knoll to the pad height and spawns Pit Master Grott', () => {
    const seed = 42;
    expect(
      Math.abs(terrainHeight(BOARPIT_CENTER.x, BOARPIT_CENTER.z, seed) - BOARPIT_FLAT.height),
    ).toBeLessThan(0.01);
    const sim = makeWorld();
    const grott = sim.entities.get(PIT_MASTER_ID);
    expect(grott).toBeTruthy();
    expect(grott!.name).toBe('Pit Master Grott');
  });

  it('keeps every fighter slot inside the stake ring', () => {
    for (const slot of PIT_SLOTS) expect(isInPit(slot.x, slot.z)).toBe(true);
  });
});

describe('a Boarpit bout', () => {
  it('waits alone at the bell, then starts when a challenger signs', () => {
    const sim = makeWorld();
    const a = addAtGate(sim, 'Alta');
    sim.pitQueueJoin(a);
    // alone: the bell passes and re-arms, no bout
    for (let i = 0; i < 20 * (PIT_QUEUE_WAIT + 2); i++) sim.tick();
    expect(sim.boarpit.bout).toBeNull();
    expect(sim.boarpit.queue).toEqual([a]);
    const b = addAtGate(sim, 'Berrin');
    sim.pitQueueJoin(b);
    tickUntil(sim, () => sim.boarpit.bout !== null, 20 * (PIT_QUEUE_WAIT + 2));
    expect(sim.boarpit.bout?.phase).toBe('countdown');
    // both were set into the ring with a clean slate
    for (const pid of [a, b]) {
      const e = sim.entities.get(pid)!;
      expect(isInPit(e.pos.x, e.pos.z)).toBe(true);
      expect(e.hp).toBe(e.maxHp);
    }
  });

  it('makes fighters mutually hostile only while the bout is live', () => {
    const sim = makeWorld();
    const outsider = sim.addPlayer('warrior', 'Watcher');
    teleport(sim, outsider, PIT_MASTER_POS.x - 3, PIT_MASTER_POS.z);
    const [a, b] = startBoutWith(sim, ['Alta', 'Berrin']);
    const ea = sim.entities.get(a)!;
    const eb = sim.entities.get(b)!;
    const eo = sim.entities.get(outsider)!;
    expect(sim.isHostileTo(ea, eb)).toBe(true);
    expect(sim.isHostileTo(eb, ea)).toBe(true);
    expect(sim.isHostileTo(ea, eo)).toBe(false);
    expect(sim.isHostileTo(eo, ea)).toBe(false);
  });

  it('KOs at 1 hp instead of killing, settles the winner, and pays the purse', () => {
    const sim = makeWorld();
    const [a, b] = startBoutWith(sim, ['Alta', 'Berrin']);
    const ea = sim.entities.get(a)!;
    const eb = sim.entities.get(b)!;
    // an overkill hit: the clamp must KO Berrin at 1 hp, never kill him
    (sim as any).ctx.dealDamage(ea, eb, eb.hp + 5000, false, 'physical', null, 'hit');
    expect(eb.dead).toBe(false);
    expect(eb.hp).toBeGreaterThanOrEqual(1);
    const seatB = sim.boarpit.bout!.seats.find((s) => s.pid === b)!;
    expect(seatB.out).toBe(true);
    expect(isInPit(eb.pos.x, eb.pos.z)).toBe(false); // hauled to the rail
    // the winner settles on the next tick
    sim.tick();
    expect(sim.boarpit.bout!.phase).toBe('over');
    expect(sim.boarpit.bout!.winnerPid).toBe(a);
    const metaA = (sim as any).players.get(a);
    expect(metaA.copper).toBeGreaterThanOrEqual(PIT_PURSE_WIN);
    // aftermath, then everyone returns to where they signed up
    tickUntil(sim, () => sim.boarpit.bout === null, 20 * 10);
    expect(sim.boarpit.bout).toBeNull();
    expect(Math.hypot(ea.pos.x - (PIT_MASTER_POS.x + 1), ea.pos.z - PIT_MASTER_POS.z)).toBeLessThan(
      2,
    );
    // hostility ended with the bout
    expect(sim.isHostileTo(ea, eb)).toBe(false);
  });

  it('forfeits a fighter who leaves the ring grounds', () => {
    const sim = makeWorld();
    const [a, b] = startBoutWith(sim, ['Alta', 'Berrin']);
    teleport(sim, b, 0, 0);
    sim.tick();
    const seatB = sim.boarpit.bout!.seats.find((s) => s.pid === b)!;
    expect(seatB.deserted).toBe(true);
    expect(sim.boarpit.bout!.winnerPid).toBe(a);
  });

  it('never touches the shared rng stream (source guarantee)', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../src/sim/social/boarpit.ts'),
      'utf8',
    );
    const code = src.replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/\brng\b/i);
    expect(code).not.toContain('Math.random');
  });
});
