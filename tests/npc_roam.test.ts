import { describe, it, expect } from 'vitest';
import { Sim } from '../src/sim/sim';

function makeSim() {
  return new Sim({ seed: 5, playerClass: 'warrior', autoEquip: true });
}

function npcByTemplate(sim: Sim, tid: string) {
  return [...sim.entities.values()].find((e) => e.kind === 'npc' && e.templateId === tid);
}

describe('roaming town NPCs (F4)', () => {
  it('a roaming NPC leaves its exact spawn spot when no player is near', () => {
    const sim = makeSim();
    const npc = npcByTemplate(sim, 'marshal_redbrook')!;
    expect(npc).toBeTruthy();
    expect(npc.roams).toBe(true);
    const home = { x: npc.spawnPos.x, z: npc.spawnPos.z };
    // Move the player far away so nothing pins the NPC, then let time pass.
    const p = sim.player;
    p.pos.x = home.x + 200;
    p.pos.z = home.z + 200;
    let maxDrift = 0;
    for (let i = 0; i < 60 * 20; i++) {
      sim.tick();
      const d = Math.hypot(npc.pos.x - home.x, npc.pos.z - home.z);
      maxDrift = Math.max(maxDrift, d);
    }
    expect(maxDrift).toBeGreaterThan(1); // it actually wandered
  });

  it('never strays beyond its leash radius', () => {
    const sim = makeSim();
    const npc = npcByTemplate(sim, 'marshal_redbrook')!;
    const home = { x: npc.spawnPos.x, z: npc.spawnPos.z };
    const p = sim.player;
    p.pos.x = home.x + 200;
    p.pos.z = home.z + 200;
    for (let i = 0; i < 120 * 20; i++) {
      sim.tick();
      const d = Math.hypot(npc.pos.x - home.x, npc.pos.z - home.z);
      // leash 6 + step slack + a small collision-nudge margin.
      expect(d).toBeLessThan(9);
    }
  });

  it('returns home + holds still while a player is engaging it', () => {
    const sim = makeSim();
    const npc = npcByTemplate(sim, 'marshal_redbrook')!;
    const home = { x: npc.spawnPos.x, z: npc.spawnPos.z };
    // Let it wander off first (player far away).
    const p = sim.player;
    p.pos.x = home.x + 200;
    p.pos.z = home.z + 200;
    for (let i = 0; i < 40 * 20; i++) sim.tick();
    // Now the player stands at the NPC's home: the NPC should return toward home
    // and end up within talk range (INTERACT_RANGE=5) of the player, so a quest
    // turn-in always resolves. (It aims for home; collision near town props may
    // stop it a little short, which is why we assert talk range, not the exact spot.)
    p.pos.x = home.x;
    p.pos.z = home.z + 1;
    for (let i = 0; i < 30 * 20; i++) sim.tick();
    const dToPlayer = Math.hypot(npc.pos.x - p.pos.x, npc.pos.z - p.pos.z);
    expect(dToPlayer).toBeLessThan(5);
  });

  it('the market auctioneer never roams (auction house anchors to it)', () => {
    const sim = makeSim();
    const merchantIds = (sim as any).market.merchantIds as number[];
    expect(merchantIds.length).toBeGreaterThan(0);
    for (const id of merchantIds) {
      const m = sim.entities.get(id);
      expect(m).toBeTruthy();
      expect(!!m!.roams).toBe(false);
    }
  });
});
