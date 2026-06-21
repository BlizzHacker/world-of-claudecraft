import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { AuraKind } from '../src/sim/types';
import { ABILITIES, CLASSES, abilitiesKnownAt } from '../src/sim/content/classes';

const NEW_DRUID = [
  'travel_form', 'enrage', 'bash', 'faerie_fire', 'hibernate',
  'dash', 'pounce', 'insect_swarm', 'tigers_fury', 'rip',
] as const;

function makeWorld() {
  return new Sim({ seed: 42, playerClass: 'warrior', noPlayer: true });
}

// Push a shapeshift toggle aura directly (forms use the 3600s sentinel).
function giveForm(sim: Sim, pid: number, kind: AuraKind, name: string) {
  const e = sim.entities.get(pid)!;
  e.auras.push({
    id: name.toLowerCase().replace(/\s+/g, '_'),
    name, kind, remaining: 3600, duration: 3600, value: 1, sourceId: pid, school: 'physical',
  });
}

describe('druid spell pack — definitions', () => {
  it('registers all 10 abilities as druid spells with effects', () => {
    for (const id of NEW_DRUID) {
      const def = ABILITIES[id];
      expect(def, `${id} missing from ABILITIES`).toBeTruthy();
      expect(def.class).toBe('druid');
      expect(def.effects.length).toBeGreaterThan(0);
      expect(CLASSES.druid.abilities, `${id} not in druid kit`).toContain(id);
    }
  });

  it('uses the documented form / combo gates', () => {
    expect(ABILITIES.enrage.requiresForm).toBe('bear');
    expect(ABILITIES.bash.requiresForm).toBe('bear');
    expect(ABILITIES.tigers_fury.requiresForm).toBe('cat');
    expect(ABILITIES.dash.requiresForm).toBe('cat');
    expect(ABILITIES.pounce.requiresStealth).toBe(true);
    expect(ABILITIES.pounce.awardsCombo).toBe(1);
    expect(ABILITIES.rip.spendsCombo).toBe(true);
    expect(ABILITIES.travel_form.requiresOutOfCombat).toBeFalsy();
    expect(ABILITIES.travel_form.castTime).toBe(0);
  });
});

describe('druid spell pack — level gating', () => {
  it('teaches nothing new before level 16 and everything by 20', () => {
    const known15 = abilitiesKnownAt('druid', 15).map((k) => k.def.id);
    for (const id of NEW_DRUID) expect(known15).not.toContain(id);

    const known20 = abilitiesKnownAt('druid', 20).map((k) => k.def.id);
    for (const id of NEW_DRUID) expect(known20).toContain(id);
  });

  it('teaches Enrage exactly at level 16', () => {
    expect(abilitiesKnownAt('druid', 15).map((k) => k.def.id)).not.toContain('enrage');
    expect(abilitiesKnownAt('druid', 16).map((k) => k.def.id)).toContain('enrage');
  });
});

describe('druid spell pack — casting applies effects', () => {
  it("Tiger's Fury grants attack power in cat form", () => {
    const sim = makeWorld();
    const a = sim.addPlayer('druid', 'Cat');
    const e = sim.entities.get(a)!;
    sim.setPlayerLevel(20, a);
    giveForm(sim, a, 'form_cat', 'Wolf Form');
    e.resource = 100;
    sim.castAbility('tigers_fury', a);
    sim.tick();
    const buff = e.auras.find((au) => au.kind === 'buff_ap' && au.value === 40);
    expect(buff, 'tigers_fury should apply a +40 buff_ap aura').toBeTruthy();
  });

  it('Enrage generates rage in bear form', () => {
    const sim = makeWorld();
    const a = sim.addPlayer('druid', 'Bear');
    const e = sim.entities.get(a)!;
    sim.setPlayerLevel(20, a);
    giveForm(sim, a, 'form_bear', 'Bear Form');
    e.resource = 0;
    sim.castAbility('enrage', a);
    sim.tick();
    expect(e.resource).toBeGreaterThan(0);
  });

  it('Travel Form shapeshifts and grants +40% movement speed out of combat', () => {
    const sim = makeWorld();
    const a = sim.addPlayer('druid', 'Walker');
    const e = sim.entities.get(a)!;
    sim.setPlayerLevel(20, a);
    e.resource = 100;
    sim.castAbility('travel_form', a);
    sim.tick();
    const form = e.auras.find((au) => au.kind === 'form_travel');
    expect(form, 'travel_form should apply a form_travel aura').toBeTruthy();
    expect(form!.value).toBeCloseTo(1.4);
    expect((sim as any).moveSpeedMult(e)).toBeCloseTo(1.4);
  });

  it('Travel Form toggles off cleanly, removing the form and the speed', () => {
    const sim = makeWorld();
    const a = sim.addPlayer('druid', 'Walker');
    const e = sim.entities.get(a)!;
    sim.setPlayerLevel(20, a);
    e.resource = 100;
    sim.castAbility('travel_form', a);
    sim.tick();
    expect(e.auras.some((au) => au.kind === 'form_travel')).toBe(true);
    for (let i = 0; i < 40; i++) sim.tick(); // wait out the GCD (forms are on-GCD)
    sim.castAbility('travel_form', a); // recast = shift out
    sim.tick();
    expect(e.auras.some((au) => au.kind === 'form_travel')).toBe(false);
    expect((sim as any).moveSpeedMult(e)).toBeCloseTo(1);
  });

  it('Travel Form can be cast in combat (escape tool)', () => {
    const sim = makeWorld();
    const a = sim.addPlayer('druid', 'Runner');
    const e = sim.entities.get(a)!;
    sim.setPlayerLevel(20, a);
    e.resource = 100;
    e.inCombat = true; // mid-fight
    sim.castAbility('travel_form', a);
    sim.tick();
    expect(e.auras.some((au) => au.kind === 'form_travel'), 'travel_form should shift even in combat').toBe(true);
  });

  it('Dash grants +50% movement speed in cat form', () => {
    const sim = makeWorld();
    const a = sim.addPlayer('druid', 'Dasher');
    const e = sim.entities.get(a)!;
    sim.setPlayerLevel(20, a);
    giveForm(sim, a, 'form_cat', 'Wolf Form');
    e.resource = 100;
    sim.castAbility('dash', a);
    sim.tick();
    const buff = e.auras.find((au) => au.kind === 'buff_speed');
    expect(buff, 'dash should apply a buff_speed aura').toBeTruthy();
    expect(buff!.value).toBeCloseTo(1.5);
    expect((sim as any).moveSpeedMult(e)).toBeCloseTo(1.5);
  });
});
