import { afterEach, describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { setRealmHostEnv } from '../src/sim/realms/registry';

afterEach(() => setRealmHostEnv(null));
function forceRealm(id: string) {
  setRealmHostEnv({
    queryParam: (n) => (n === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}

// Root cause of the Hellmaw "every step has a delay" lag: entering the delve pushes the
// live entity count to ~1310 (811 mobs, 808 idle), and EVERY mob ran full AI every tick
// — including the ~300 overworld mobs with no player anywhere near them. The dormancy
// gate skips AI for a mob when no player is within its activity radius, UNLESS it is in
// combat, has auras ticking, is a pet, or is dead (all must keep updating).

describe('mob dormancy gate (Hellmaw tick-cost fix)', () => {
  it('entering the delve makes the far-away overworld mobs dormant, cutting tick cost', () => {
    forceRealm('infernal');
    const sim = new Sim({ seed: 5, playerClass: 'warrior', autoEquip: true });
    sim.player.level = 60;
    sim.enterDelve('hellmaw_well', 'normal');
    for (let i = 0; i < 10; i++) sim.tick(); // settle

    // Overworld mobs (x < 600) are far from the player (now at x ~6000 in the delve),
    // so they should be dormant this tick.
    let overworldMobs = 0;
    let overworldDormant = 0;
    for (const e of sim.entities.values()) {
      if (e.kind !== 'mob' || e.pos.x >= 600) continue;
      overworldMobs++;
      if (sim.mobIsDormant(e)) overworldDormant++;
    }
    expect(overworldMobs).toBeGreaterThan(50);
    // The vast majority of distant idle overworld mobs are dormant.
    expect(overworldDormant / overworldMobs).toBeGreaterThan(0.9);
  });

  it('a mob in combat / with auras / a pet is NEVER dormant, even with no player near', () => {
    forceRealm('infernal');
    const sim = new Sim({ seed: 5, playerClass: 'warrior', autoEquip: true });
    sim.player.level = 60;
    sim.enterDelve('hellmaw_well', 'normal');
    for (let i = 0; i < 5; i++) sim.tick();

    const farMob = [...sim.entities.values()].find(
      (e) => e.kind === 'mob' && e.pos.x < 600 && e.aiState === 'idle',
    );
    expect(farMob).toBeTruthy();
    const m = farMob!;
    // Baseline: it's dormant.
    expect(sim.mobIsDormant(m)).toBe(true);
    // In combat → live.
    m.aggroTargetId = sim.player.id;
    expect(sim.mobIsDormant(m)).toBe(false);
    m.aggroTargetId = null;
    // Has an aura → live (DoTs must keep ticking down).
    m.auras = [{ kind: 'poison', remaining: 3, dps: 1 } as never];
    expect(sim.mobIsDormant(m)).toBe(false);
    m.auras = [];
    // A pet → live.
    m.ownerId = sim.player.id;
    expect(sim.mobIsDormant(m)).toBe(false);
    m.ownerId = null;
    // Dead → live (corpse despawn timer must tick).
    m.dead = true;
    expect(sim.mobIsDormant(m)).toBe(false);
  });

  it('a mob near the player is never dormant', () => {
    forceRealm('infernal');
    const sim = new Sim({ seed: 5, playerClass: 'warrior', autoEquip: true });
    for (let i = 0; i < 3; i++) sim.tick();
    // The nearest overworld mob to the (overworld) player should be live.
    const p = sim.player;
    let nearest: { m: import('../src/sim/types').Entity; d: number } | null = null;
    for (const e of sim.entities.values()) {
      if (e.kind !== 'mob') continue;
      const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      if (!nearest || d < nearest.d) nearest = { m: e, d };
    }
    expect(nearest).toBeTruthy();
    if (nearest && nearest.d < 100) expect(sim.mobIsDormant(nearest.m)).toBe(false);
  });
});
