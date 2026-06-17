import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { MOBS } from '../src/sim/data';
import { createMob } from '../src/sim/entity';

const SEED = 5150;
const makeSim = () => new Sim({ seed: SEED, playerClass: 'warrior' });

// Force a dread proc on the carrier mob by pinning its chance to 1 for the
// duration of a test, restoring it afterwards so other tests stay unaffected.
function withForcedDread<T>(fn: () => T): T {
  const tmpl = MOBS.gravecaller_summoner;
  const saved = tmpl.dread!.chance;
  tmpl.dread!.chance = 1;
  try {
    return fn();
  } finally {
    tmpl.dread!.chance = saved;
  }
}

describe('Dread fear-on-hit affix', () => {
  it('a landed gravecaller_summoner swing can fear the victim', () => {
    const sim = makeSim();
    const p = sim.entities.get(sim.playerId)!;
    p.maxHp = 100000; p.hp = 100000; // survive every swing so we observe the aura
    withForcedDread(() => {
      const mob = createMob(900600, MOBS.gravecaller_summoner, 12, { x: 0, y: 0, z: 0 });
      let applied = false;
      for (let i = 0; i < 60 && !applied; i++) {
        p.hp = p.maxHp; // a hit that connects must not kill before we read the aura
        (sim as any).mobSwing(mob, p);
        applied = p.auras.some((a) => a.id === 'fear_incap' && a.kind === 'incapacitate');
      }
      expect(applied).toBe(true);
      const a = p.auras.find((x) => x.id === 'fear_incap')!;
      expect(a.name).toBe('Wail of the Grave');
      expect(a.kind).toBe('incapacitate');
      expect(a.duration).toBe(4); // mob source gets the full authored duration (DR is PvP-only)
      // value is the panic heading, a finite angle in [-PI, PI]
      expect(Number.isFinite(a.value)).toBe(true);
      expect(Math.abs(a.value)).toBeLessThanOrEqual(Math.PI);
    });
  });

  it('the fear aura drives the panicked flee movement', () => {
    const sim = makeSim();
    const p = sim.entities.get(sim.playerId)!;
    p.maxHp = 100000; p.hp = 100000;
    withForcedDread(() => {
      const mob = createMob(900601, MOBS.gravecaller_summoner, 12, { x: 0, y: 0, z: 0 });
      for (let i = 0; i < 60 && !p.auras.some((a) => a.id === 'fear_incap'); i++) {
        p.hp = p.maxHp;
        (sim as any).mobSwing(mob, p);
      }
      expect(p.auras.some((a) => a.id === 'fear_incap')).toBe(true);
      // updateFearMovement returns true while the fear is active and no root holds.
      expect((sim as any).updateFearMovement(p)).toBe(true);
    });
  });

  it('a friendly pet swing (hostile=false) never fears the party', () => {
    const sim = makeSim();
    const p = sim.entities.get(sim.playerId)!;
    p.maxHp = 100000; p.hp = 100000;
    withForcedDread(() => {
      const pet = createMob(900602, MOBS.gravecaller_summoner, 12, { x: 0, y: 0, z: 0 });
      pet.hostile = false; // pets call mobSwing too
      for (let i = 0; i < 60; i++) { p.hp = p.maxHp; (sim as any).mobSwing(pet, p); }
      expect(p.auras.some((a) => a.id === 'fear_incap')).toBe(false);
    });
  });

  it('a mob without dread applies no fear', () => {
    const sim = makeSim();
    const p = sim.entities.get(sim.playerId)!;
    p.maxHp = 100000; p.hp = 100000;
    const mob = createMob(900603, MOBS.forest_wolf, 5, { x: 0, y: 0, z: 0 });
    for (let i = 0; i < 40; i++) { p.hp = p.maxHp; (sim as any).mobSwing(mob, p); }
    expect(p.auras.some((a) => a.id === 'fear_incap')).toBe(false);
  });
});
