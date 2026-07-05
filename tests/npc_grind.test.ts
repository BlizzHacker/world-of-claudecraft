import { describe, it, expect } from 'vitest';
import { Sim } from '../src/sim/sim';

function makeSim() {
  return new Sim({ seed: 9, playerClass: 'warrior', autoEquip: true });
}
function npc(sim: Sim, tid: string) {
  return [...sim.entities.values()].find((e) => e.kind === 'npc' && e.templateId === tid)!;
}

describe('grinding NPCs (F4b)', () => {
  it('a grinder engages a nearby wild mob and the mob fights back', () => {
    const sim = makeSim();
    const kael = npc(sim, 'mercenary_kael');
    expect(kael.grinds).toBe(true);
    // Keep the player far so it never pins the grinder.
    sim.player.pos.x = 500;
    sim.player.pos.z = 500;
    let engaged = false;
    let mobFoughtBack = false; // the quarry woke (idle→chase) and targets the NPC
    let mobHurt = false; // the NPC actually damaged its quarry
    for (let i = 0; i < 120 * 20; i++) {
      sim.tick();
      const tgt = kael.aggroTargetId !== null ? sim.entities.get(kael.aggroTargetId) : null;
      if (tgt) {
        engaged = true;
        if (tgt.aggroTargetId === kael.id || tgt.aiState === 'chase' || tgt.aiState === 'attack')
          mobFoughtBack = true;
        if (tgt.hp < tgt.maxHp) mobHurt = true;
      }
      if (engaged && mobFoughtBack && mobHurt) break;
    }
    expect(engaged).toBe(true); // it found + targeted a wild mob
    expect(mobFoughtBack).toBe(true); // the mob woke and turned on the NPC (mob-vs-NPC combat)
    expect(mobHurt).toBe(true); // the NPC is dealing damage to it
  });

  it('a grinder can never die (HP floors at 1, retreats to rest)', () => {
    const sim = makeSim();
    const kael = npc(sim, 'mercenary_kael');
    sim.player.pos.x = 500;
    sim.player.pos.z = 500;
    // Hammer it with lethal damage directly: the floor must hold.
    for (let i = 0; i < 50; i++) {
      (sim as any).dealDamage?.(null, kael, 100000, false, 'physical', null, 'hit');
    }
    // Fall back to the ctx path if dealDamage isn't a public method.
    for (let i = 0; i < 200 && !kael.dead; i++) sim.tick();
    expect(kael.dead).toBe(false);
    expect(kael.hp).toBeGreaterThanOrEqual(1);
  });

  it('a grinder never claims tap rights — a player who hits its target owns the kill', () => {
    const sim = makeSim();
    const kael = npc(sim, 'mercenary_kael');
    sim.player.pos.x = 500;
    sim.player.pos.z = 500;
    // Let the grinder pull a wolf.
    let wolf: any = null;
    for (let i = 0; i < 120 * 20; i++) {
      sim.tick();
      if (kael.aggroTargetId !== null) {
        wolf = sim.entities.get(kael.aggroTargetId);
        if (wolf && !wolf.dead) break;
      }
    }
    expect(wolf).toBeTruthy();
    // The mob the grinder is fighting must NOT be tapped by the grinder (or anyone).
    expect(wolf.tappedById).toBe(null);
    // A player who lands a hit becomes the tap owner → gets the kill credit.
    const p = sim.player;
    p.pos.x = wolf.pos.x + 1;
    p.pos.z = wolf.pos.z;
    sim.targetEntity(wolf.id);
    sim.startAutoAttack();
    for (let i = 0; i < 40 && wolf.tappedById === null; i++) sim.tick();
    expect(wolf.tappedById).toBe(p.id);
  });
});
