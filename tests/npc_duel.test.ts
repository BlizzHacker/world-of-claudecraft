import { describe, it, expect } from 'vitest';
import { Sim } from '../src/sim/sim';

function makeSim() {
  return new Sim({ seed: 3, playerClass: 'warrior', autoEquip: true });
}
function npc(sim: Sim, tid: string) {
  return [...sim.entities.values()].find((e) => e.kind === 'npc' && e.templateId === tid)!;
}
function challenge(sim: Sim) {
  sim.chat('/challenge', sim.playerId ?? undefined);
}

describe('player-vs-NPC duels (F4c)', () => {
  it('cannot challenge without targeting a mercenary', () => {
    const sim = makeSim();
    sim.targetEntity(null);
    challenge(sim);
    expect((sim as any).npcDuels.size).toBe(0);
  });

  it('challenging a grinder starts a countdown duel, then goes active', () => {
    const sim = makeSim();
    const kael = npc(sim, 'mercenary_kael');
    const p = sim.player;
    p.pos.x = kael.pos.x + 2;
    p.pos.z = kael.pos.z;
    sim.targetEntity(kael.id);
    challenge(sim);
    const duel = (sim as any).npcDuels.get(sim.playerId);
    expect(duel).toBeTruthy();
    expect(duel.state).toBe('countdown');
    // Tick through the countdown → active.
    for (let i = 0; i < 4 * 20; i++) sim.tick();
    const d2 = (sim as any).npcDuels.get(sim.playerId);
    if (d2) expect(d2.state).toBe('active');
    // Once active, player and NPC are mutually hostile (combat is unlocked).
    expect(sim.isHostileTo(p, kael)).toBe(true);
    expect(sim.isHostileTo(kael, p)).toBe(true);
  });

  it('the NPC is mortal during the duel and the player can win', () => {
    const sim = makeSim();
    const kael = npc(sim, 'mercenary_kael');
    const p = sim.player;
    p.pos.x = kael.pos.x + 2;
    p.pos.z = kael.pos.z;
    sim.targetEntity(kael.id);
    challenge(sim);
    for (let i = 0; i < 4 * 20; i++) sim.tick(); // clear countdown
    expect(kael.npcDuelMortal).toBe(true);
    // Burst the NPC down: it has no HP floor now.
    (sim as any).dealDamage?.(p, kael, kael.maxHp + 1000, false, 'physical', null, 'hit');
    for (let i = 0; i < 5; i++) sim.tick();
    // Duel resolved: NPC was defeated and the duel cleared.
    expect((sim as any).npcDuels.get(sim.playerId)).toBeUndefined();
    expect(kael.npcDuelMortal).toBe(false); // reset for future field grinding
  });

  it('a defeated duel-NPC respawns to full at home', () => {
    const sim = makeSim();
    const kael = npc(sim, 'mercenary_kael');
    const home = { x: kael.spawnPos.x, z: kael.spawnPos.z };
    const p = sim.player;
    p.pos.x = kael.pos.x + 2;
    p.pos.z = kael.pos.z;
    sim.targetEntity(kael.id);
    challenge(sim);
    for (let i = 0; i < 4 * 20; i++) sim.tick();
    (sim as any).dealDamage?.(p, kael, kael.maxHp + 1000, false, 'physical', null, 'hit');
    // Move the player away so the revived NPC isn't pinned, and run the respawn
    // timer out (12s) plus a little more.
    p.pos.x = home.x + 300;
    p.pos.z = home.z + 300;
    for (let i = 0; i < 15 * 20; i++) sim.tick();
    expect(kael.dead).toBe(false);
    expect(kael.hp).toBe(kael.maxHp);
    // Respawned at home; it then resumes wandering/grinding, so allow the roam leash.
    const d = Math.hypot(kael.pos.x - home.x, kael.pos.z - home.z);
    expect(d).toBeLessThan(9);
  });
});
