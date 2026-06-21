// Demoralizing Shout is the warrior's area attack-power debuff — the shout twin
// of the druid's Demoralizing Roar. It reuses the existing `aoeAttackPower`
// effect (which lands a `debuff_ap` aura on every nearby hostile), so it is a
// pure-data ability with zero sim-engine change.
import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { ABILITIES, CLASSES, abilitiesKnownAt } from '../src/sim/content/classes';
import { MOBS } from '../src/sim/data';
import { createMob } from '../src/sim/entity';
import type { Entity } from '../src/sim/types';

function spawnDummy(sim: Sim, target: Entity): Entity {
  const mob = createMob((sim as any).nextId++, MOBS['gravecaller_summoner'], 14, {
    x: target.pos.x, y: target.pos.y, z: target.pos.z,
  });
  mob.hostile = true;
  (sim as any).addEntity(mob);
  return mob;
}

describe('warrior Demoralizing Shout', () => {
  it('is defined as a level-14 area attack-power debuff', () => {
    const def = ABILITIES['demoralizing_shout'];
    expect(def).toBeTruthy();
    expect(def.class).toBe('warrior');
    expect(def.learnLevel).toBe(14);
    expect(def.requiresTarget).toBe(false);
    expect(def.effects[0]).toMatchObject({ type: 'aoeAttackPower', amount: 30, duration: 30, radius: 10 });
    expect(def.ranks?.[0]).toMatchObject({ level: 20 });
  });

  it('sits in the warrior learn order and gates on level', () => {
    expect(CLASSES.warrior.abilities).toContain('demoralizing_shout');
    expect(abilitiesKnownAt('warrior', 13).some((k) => k.def.id === 'demoralizing_shout')).toBe(false);
    const at14 = abilitiesKnownAt('warrior', 14).find((k) => k.def.id === 'demoralizing_shout');
    expect(at14?.rank).toBe(1);
    expect(abilitiesKnownAt('warrior', 20).find((k) => k.def.id === 'demoralizing_shout')?.rank).toBe(2);
  });

  it('debuffs the attack power of nearby enemies on cast', () => {
    const sim = new Sim({ seed: 42, playerClass: 'warrior', autoEquip: true });
    const p = sim.player;
    sim.setPlayerLevel(14, p.id);
    p.gm = true;
    p.resource = 100; // rage for the shout
    const mob = spawnDummy(sim, p);

    sim.castAbility('demoralizing_shout', p.id);
    sim.tick();

    const aura = mob.auras.find((a) => a.kind === 'debuff_ap' && a.id === 'demoralizing_shout_ap');
    expect(aura).toBeTruthy();
    expect(aura!.value).toBe(30);
    expect(aura!.remaining).toBeGreaterThan(0);
  });

  it('does not touch a far-away enemy', () => {
    const sim = new Sim({ seed: 42, playerClass: 'warrior', autoEquip: true });
    const p = sim.player;
    sim.setPlayerLevel(14, p.id);
    p.gm = true;
    p.resource = 100; // rage for the shout
    const far = spawnDummy(sim, p);
    far.pos = { x: p.pos.x + 60, y: p.pos.y, z: p.pos.z };

    sim.castAbility('demoralizing_shout', p.id);
    sim.tick();

    expect(far.auras.find((a) => a.kind === 'debuff_ap')).toBeUndefined();
  });
});
