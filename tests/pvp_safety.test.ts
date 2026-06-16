// #96 — players must not damage or hostile-CC each other outside an accepted
// duel/PvP. These lock the invariant so the "killed in the starter village /
// polymorphed into a baby llama" griefing path can never regress.
import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import type { Entity } from '../src/sim/types';

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
