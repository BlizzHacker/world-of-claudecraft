import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { ABILITIES, abilitiesKnownAt } from '../src/sim/content/classes';

describe('Aspect of the Monkey', () => {
  it('is a hunter nature self-buff learned at level 10', () => {
    const def = ABILITIES['aspect_of_the_monkey'];
    expect(def).toBeTruthy();
    expect(def.class).toBe('hunter');
    expect(def.learnLevel).toBe(10);
    expect(def.school).toBe('nature');
    expect(def.requiresTarget).toBe(false);
    expect(def.effects).toEqual([
      { type: 'selfBuff', kind: 'buff_dodge', value: 0.08, duration: 1800 },
    ]);
  });

  it('is unknown at level 9 and known from level 10 in the hunter kit', () => {
    const at9 = abilitiesKnownAt('hunter', 9).map((k) => k.def.id);
    const at10 = abilitiesKnownAt('hunter', 10).map((k) => k.def.id);
    expect(at9).not.toContain('aspect_of_the_monkey');
    expect(at10).toContain('aspect_of_the_monkey');
  });

  it('raises the hunter dodge chance by 8% when cast', () => {
    const sim = new Sim({ seed: 42, playerClass: 'hunter', autoEquip: true });
    sim.setPlayerLevel(10);
    const p = sim.player;
    const dodgeBefore = p.dodgeChance;
    sim.castAbility('aspect_of_the_monkey');
    sim.tick();
    const buff = p.auras.find((a) => a.id === 'aspect_of_the_monkey');
    expect(buff).toBeTruthy();
    expect(buff!.kind).toBe('buff_dodge');
    expect(p.dodgeChance).toBeCloseTo(dodgeBefore + 0.08, 5);
  });
});
