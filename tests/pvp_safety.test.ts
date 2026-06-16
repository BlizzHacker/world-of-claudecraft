// #96 — players must not damage or hostile-CC each other outside an accepted
// duel/PvP. These lock the invariant so the "killed in the starter village /
// polymorphed into a baby llama" griefing path can never regress.
import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import type { Entity, Vec3 } from '../src/sim/types';
import { dist2d } from '../src/sim/types';

function twoPlayers(clsA = 'mage', clsB = 'warrior') {
  const sim = new Sim({ seed: 42, playerClass: clsA as any, playerName: 'Caster', autoEquip: true });
  const aPid = sim.primaryId;
  const bPid = sim.addPlayer(clsB as any, 'Victim', { autoEquip: true });
  const a = sim.entities.get(aPid)!;
  const b = sim.entities.get(bPid)!;
  // stand them next to each other and face A at B
  b.pos = { ...a.pos, x: a.pos.x + 3 };
  b.prevPos = { ...b.pos };
  a.facing = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z);
  sim.setPlayerLevel(12, aPid);
  sim.setPlayerLevel(12, bPid);
  return { sim, aPid, bPid, a, b };
}

function startDuel(clsA = 'mage', clsB = 'warrior', level = 20) {
  const setup = twoPlayers(clsA, clsB);
  const { sim, aPid, bPid, a, b } = setup;
  sim.setPlayerLevel(level, aPid);
  sim.setPlayerLevel(level, bPid);
  a.resource = a.maxResource;
  a.facing = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z);
  sim.duelRequest(bPid, aPid);
  sim.duelAccept(bPid);
  for (let i = 0; i < 20 * 5; i++) {
    sim.tick();
    if (sim.duelFor(aPid)?.state === 'active') break;
  }
  sim.targetEntity(bPid, aPid);
  return setup;
}

function finishCast(sim: Sim, pid: number) {
  for (let i = 0; i < 20 * 4; i++) {
    sim.tick();
    if (!sim.entities.get(pid)!.castingAbility) return;
  }
}

const pos = (e: Entity): Vec3 => ({ ...e.pos });

const hasCc = (e: Entity) =>
  e.auras.some((au) => au.kind === 'polymorph' || au.kind === 'stun' || au.kind === 'incapacitate' || au.kind === 'root');

describe('PvP safety outside duels (#96)', () => {
  it('a player cannot polymorph another player', () => {
    const { sim, aPid, bPid, b } = twoPlayers('mage', 'warrior');
    sim.targetEntity(bPid, aPid);
    sim.castAbility('polymorph', aPid);
    expect(b.auras.some((au) => au.kind === 'polymorph')).toBe(false);
    expect(hasCc(b)).toBe(false);
  });

  it('a player cannot auto-attack another player', () => {
    const { sim, aPid, bPid, b } = twoPlayers('warrior', 'mage');
    const startHp = b.hp;
    sim.targetEntity(bPid, aPid);
    sim.startAutoAttack(aPid);
    for (let i = 0; i < 20 * 4; i++) sim.tick();
    expect(b.hp).toBe(startHp); // never took a hit
  });

  it('a player AoE (Frost Nova) does not root or damage a nearby player', () => {
    const { sim, aPid, b } = twoPlayers('mage', 'warrior');
    const startHp = b.hp;
    sim.castAbility('frost_nova', aPid); // self-centred AoE root, B is 3yd away
    for (let i = 0; i < 5; i++) sim.tick();
    expect(b.hp).toBe(startHp);
    expect(hasCc(b)).toBe(false);
  });

  it('an accepted duel DOES allow combat between the two players (positive control)', () => {
    const { sim, aPid, bPid, a, b } = twoPlayers('warrior', 'mage');
    sim.duelRequest(bPid, aPid);
    sim.duelAccept(bPid);
    // run out the countdown so the duel goes active
    for (let i = 0; i < 20 * 5; i++) sim.tick();
    const duel = sim.duelFor(aPid);
    expect(duel?.state).toBe('active');
    const startHp = b.hp;
    a.facing = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z);
    sim.targetEntity(bPid, aPid);
    sim.startAutoAttack(aPid);
    for (let i = 0; i < 20 * 6; i++) sim.tick();
    expect(b.hp).toBeLessThan(startHp); // duel combat works
  });
});

describe('PvP control abilities in active duels', () => {
  it.each([
    { cls: 'mage', ability: 'polymorph', aura: 'polymorph' },
    { cls: 'warlock', ability: 'fear', aura: 'incapacitate' },
    { cls: 'paladin', ability: 'hammer_of_justice', aura: 'stun' },
    { cls: 'druid', ability: 'entangling_roots', aura: 'root' },
  ])('$ability works on hostile players', ({ cls, ability, aura }) => {
    const { sim, aPid, b } = startDuel(cls, 'warrior');
    if (ability === 'polymorph') b.hp = Math.max(1, b.maxHp - 120);

    sim.castAbility(ability, aPid);
    finishCast(sim, aPid);

    expect(b.auras.some((au) => au.kind === aura)).toBe(true);
    if (ability === 'polymorph') expect(b.hp).toBe(b.maxHp);
  });

  it('does not polymorph non-hostile NPCs', () => {
    const sim = new Sim({ seed: 42, playerClass: 'mage', playerName: 'Caster', autoEquip: true });
    const npc = [...sim.entities.values()].find((e) => e.kind === 'npc');
    expect(npc).toBeDefined();
    sim.setPlayerLevel(20);
    sim.player.resource = sim.player.maxResource;
    sim.targetEntity(npc!.id);

    sim.castAbility('polymorph');
    finishCast(sim, sim.primaryId);

    expect(npc!.auras.some((au) => au.kind === 'polymorph')).toBe(false);
  });

  it('diminishes repeated duel Polymorphs to 10s, 5s, 1s and resets after 60s', () => {
    const { sim, aPid, b } = startDuel('mage', 'warrior', 20);

    const castPolymorph = () => {
      b.auras = b.auras.filter((aura) => aura.kind !== 'polymorph');
      const mage = sim.entities.get(aPid)!;
      mage.gcdRemaining = 0;
      mage.resource = mage.maxResource;
      sim.castAbility('polymorph', aPid);
      finishCast(sim, aPid);
      return b.auras.find((aura) => aura.kind === 'polymorph')?.duration ?? 0;
    };

    expect(castPolymorph()).toBe(10);
    expect(castPolymorph()).toBe(5);
    expect(castPolymorph()).toBe(1);

    b.auras = b.auras.filter((aura) => aura.kind !== 'polymorph');
    for (let i = 0; i < 20 * 61; i++) sim.tick();

    expect(castPolymorph()).toBe(10);
  });

  it('makes feared hostile players run in a deterministic panic direction', () => {
    const { sim, aPid, b } = startDuel('warlock', 'warrior', 20);

    const start = pos(b);
    sim.castAbility('fear', aPid);
    finishCast(sim, aPid);

    const fear = b.auras.find((aura) => aura.id === 'fear_incap' && aura.kind === 'incapacitate');
    expect(fear?.duration).toBe(8);

    for (let i = 0; i < 20; i++) sim.tick();

    expect(dist2d(start, b.pos)).toBeGreaterThan(2);
    expect(b.auras.some((aura) => aura.id === 'fear_incap')).toBe(true);
  });

  it('diminishes repeated duel Fears to 8s, 4s, 2s, 1s and resets after 60s', () => {
    const { sim, aPid, b } = startDuel('warlock', 'warrior', 20);

    const castFear = () => {
      b.auras = b.auras.filter((aura) => aura.id !== 'fear_incap');
      const warlock = sim.entities.get(aPid)!;
      warlock.gcdRemaining = 0;
      warlock.resource = warlock.maxResource;
      sim.castAbility('fear', aPid);
      finishCast(sim, aPid);
      return b.auras.find((aura) => aura.id === 'fear_incap')?.duration ?? 0;
    };

    expect(castFear()).toBe(8);
    expect(castFear()).toBe(4);
    expect(castFear()).toBe(2);
    expect(castFear()).toBe(1);

    b.auras = b.auras.filter((aura) => aura.id !== 'fear_incap');
    for (let i = 0; i < 20 * 61; i++) sim.tick();

    expect(castFear()).toBe(8);
  });
});
