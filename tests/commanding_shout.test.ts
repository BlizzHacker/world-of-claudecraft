import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { ABILITIES, abilitiesKnownAt } from '../src/sim/content/classes';

describe('Commanding Shout', () => {
  it('is a warrior physical stamina self-buff learned at level 14', () => {
    const def = ABILITIES['commanding_shout'];
    expect(def).toBeTruthy();
    expect(def.class).toBe('warrior');
    expect(def.learnLevel).toBe(14);
    expect(def.school).toBe('physical');
    expect(def.requiresTarget).toBe(false);
    expect(def.castTime).toBe(0);
    expect(def.effects).toEqual([
      { type: 'selfBuff', kind: 'buff_sta', value: 6, duration: 120 },
    ]);
  });

  it('is unknown at level 13 and known from level 14 in the warrior kit', () => {
    const before = abilitiesKnownAt('warrior', 13).map((k) => k.def.id);
    const after = abilitiesKnownAt('warrior', 14).map((k) => k.def.id);
    expect(before).not.toContain('commanding_shout');
    expect(after).toContain('commanding_shout');
  });

  it('upgrades to rank 2 (stronger stamina) at level 24', () => {
    const r1 = abilitiesKnownAt('warrior', 14).find((k) => k.def.id === 'commanding_shout')!;
    const r2 = abilitiesKnownAt('warrior', 24).find((k) => k.def.id === 'commanding_shout')!;
    const sta1 = (r1.effects[0] as { value: number }).value;
    const sta2 = (r2.effects[0] as { value: number }).value;
    expect(sta2).toBeGreaterThan(sta1);
  });

  it('applies the buff aura and raises maximum health when cast', () => {
    const sim = new Sim({ seed: 42, playerClass: 'warrior', autoEquip: true });
    sim.setPlayerLevel(14);
    const p = sim.player;
    p.resource = 100; // ensure enough rage to pay the cost
    const maxHpBefore = p.maxHp;
    sim.castAbility('commanding_shout');
    sim.tick();
    const buff = p.auras.find((a) => a.id === 'commanding_shout');
    expect(buff).toBeTruthy();
    expect(buff!.kind).toBe('buff_sta');
    expect(p.maxHp).toBeGreaterThan(maxHpBefore);
  });
});
