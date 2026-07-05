import { afterEach, describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { setRealmHostEnv } from '../src/sim/realms/registry';
import { MAX_LEVEL, xpForLevel } from '../src/sim/types';

function forceRealm(id: string) {
  setRealmHostEnv({
    queryParam: (n) => (n === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}
afterEach(() => setRealmHostEnv(null));

function makeSim() {
  return new Sim({ seed: 11, playerClass: 'warrior', autoEquip: true });
}

describe('F5b per-realm level cap', () => {
  it('a D2 realm (infernal) lets a player level past the vanilla cap of 20', () => {
    forceRealm('infernal');
    const sim = makeSim();
    sim.setPlayerLevel(25);
    expect(sim.player.level).toBe(25); // clamp allows > MAX_LEVEL on a 99-cap realm
    // Grant a big chunk of XP at level 25: the bar must keep advancing real levels.
    const before = sim.player.level;
    sim.grantXp(xpForLevel(25) * 3);
    expect(sim.player.level).toBeGreaterThan(before);
    expect(sim.player.level).toBeLessThanOrEqual(99);
  });

  it('claudecraft stays vanilla — clamps at 20', () => {
    forceRealm('claudecraft');
    const sim = makeSim();
    sim.setPlayerLevel(50);
    expect(sim.player.level).toBe(MAX_LEVEL); // 20
  });

  it('classic caps at 80', () => {
    forceRealm('classic');
    const sim = makeSim();
    sim.setPlayerLevel(200);
    expect(sim.player.level).toBe(80);
  });

  it('a D2 realm never levels past 99', () => {
    forceRealm('dominion');
    const sim = makeSim();
    sim.setPlayerLevel(99);
    expect(sim.player.level).toBe(99);
    sim.grantXp(xpForLevel(98) * 10);
    expect(sim.player.level).toBe(99); // frozen at the realm cap
  });
});
