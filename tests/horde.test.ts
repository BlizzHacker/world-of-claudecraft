// The Dead Road behavior spec: the alarm hires a real defense line, waves of
// REAL undead mobs rise on the north road and march on the square, breaches
// burn wards, fortifying between waves costs copper and restores the line,
// and the event settles win/loss. Everything runs on live entities in the
// actual town — no board, no window sim.

import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import {
  HORDE_FORTIFY_COST,
  HORDE_PLAZA,
  HORDE_PREP,
  HORDE_START_WARDS,
  hordeWavePlan,
} from '../src/sim/social/horde';
import { groundHeight } from '../src/sim/world';

function makeWorld() {
  return new Sim({ seed: 42, playerClass: 'warrior', noPlayer: true });
}

function addAtPlaza(sim: Sim, name: string) {
  const pid = sim.addPlayer('warrior', name);
  const e = sim.entities.get(pid)!;
  e.pos.x = HORDE_PLAZA.x;
  e.pos.z = HORDE_PLAZA.z;
  e.pos.y = groundHeight(e.pos.x, e.pos.z, sim.cfg.seed);
  e.prevPos = { ...e.pos };
  (sim as any).rebucket(e);
  return pid;
}

function tickUntil(sim: Sim, pred: () => boolean, maxTicks: number) {
  for (let i = 0; i < maxTicks && !pred(); i++) sim.tick();
}

describe('the Dead Road', () => {
  it('sounds the alarm, hires the line, and raises a real wave', () => {
    const sim = makeWorld();
    const a = addAtPlaza(sim, 'Alta');
    sim.hordeStart(a);
    expect(sim.horde.phase).toBe('prep');
    expect(sim.horde.guardIds.length).toBeGreaterThanOrEqual(4);
    // the hired blades are real grinder NPCs standing at the posts
    for (const gid of sim.horde.guardIds) {
      const g = sim.entities.get(gid)!;
      expect(g.kind).toBe('npc');
      expect(g.grinds).toBe(true);
    }
    tickUntil(sim, () => sim.horde.phase === 'wave', 20 * (HORDE_PREP + 2));
    expect(sim.horde.phase).toBe('wave');
    const plan = hordeWavePlan(1);
    expect(sim.horde.zombieIds.length).toBe(plan.count);
    // the wave is REAL mobs in the world
    for (const zid of sim.horde.zombieIds) {
      const z = sim.entities.get(zid)!;
      expect(z.kind).toBe('mob');
      expect(z.templateId).toBe('restless_bones');
    }
  });

  it('clears a wave into the fortify window; fortifying costs copper and adds a ward', () => {
    const sim = makeWorld();
    const a = addAtPlaza(sim, 'Alta');
    sim.hordeStart(a);
    tickUntil(sim, () => sim.horde.phase === 'wave', 20 * (HORDE_PREP + 2));
    const ea = sim.entities.get(a)!;
    for (const zid of [...sim.horde.zombieIds]) {
      const z = sim.entities.get(zid)!;
      (sim as any).ctx.dealDamage(ea, z, z.hp + 1000, false, 'physical', null, 'hit');
    }
    tickUntil(sim, () => sim.horde.phase === 'intermission', 20 * 3);
    expect(sim.horde.phase).toBe('intermission');
    const meta = (sim as any).players.get(a);
    meta.copper = HORDE_FORTIFY_COST + 500;
    sim.hordeFortify(a);
    expect(sim.horde.wards).toBe(HORDE_START_WARDS + 1);
    expect(meta.copper).toBe(500);
  });

  it('burns a ward when the dead breach the square, and falls at zero wards', () => {
    const sim = makeWorld();
    const a = addAtPlaza(sim, 'Alta');
    sim.hordeStart(a);
    tickUntil(sim, () => sim.horde.phase === 'wave', 20 * (HORDE_PREP + 2));
    // march every zombie straight into the square (position is the breach test)
    while (sim.horde.wards > 0 && (sim.horde.phase as string) === 'wave') {
      for (const zid of [...sim.horde.zombieIds]) {
        const z = sim.entities.get(zid);
        if (!z) continue;
        z.pos.x = HORDE_PLAZA.x;
        z.pos.z = HORDE_PLAZA.z;
        (sim as any).rebucket(z);
      }
      sim.tick();
      // a fresh wave may need to spawn before more breaches can burn wards
      if ((sim.horde.phase as string) === 'intermission') {
        tickUntil(sim, () => sim.horde.phase !== 'intermission', 20 * 20);
      }
    }
    expect(sim.horde.phase).toBe('over');
    expect(sim.horde.won).toBe(false);
    // aftermath releases the hired blades and the event goes quiet
    tickUntil(sim, () => sim.horde.phase === 'idle', 20 * 12);
    expect(sim.horde.phase).toBe('idle');
    expect(sim.horde.guardIds.length).toBe(0);
  });

  it('answers a nearby readout and stays null far away while idle', () => {
    const sim = makeWorld();
    const a = addAtPlaza(sim, 'Alta');
    expect(sim.hordeInfoFor(a)).not.toBeNull();
    const far = sim.addPlayer('warrior', 'FarAway');
    const e = sim.entities.get(far)!;
    e.pos.x = 120;
    e.pos.z = -120;
    (sim as any).rebucket(e);
    expect(sim.hordeInfoFor(far)).toBeNull();
  });
});
