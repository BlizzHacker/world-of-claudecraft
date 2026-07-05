import { afterEach, describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { castTownPortal } from '../src/sim/town_portal';
import { setRealmHostEnv } from '../src/sim/realms/registry';

afterEach(() => setRealmHostEnv(null));
function forceRealm(id: string) {
  setRealmHostEnv({
    queryParam: (n) => (n === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}
function makeSim() {
  return new Sim({ seed: 5, playerClass: 'warrior', autoEquip: true });
}

// D2 Town Portals are cast FROM the dungeon/field to return to town — the earlier
// gate had it backwards (blocked everywhere OUTSIDE the field, i.e. exactly the
// dungeons where you need it). These pin the corrected rule.
describe('town portal cast gate (D2 fidelity)', () => {
  it('CAN be cast from inside a delve (the main D2 use)', () => {
    forceRealm('infernal');
    const sim = makeSim();
    sim.player.level = 60;
    sim.enterDelve('hellmaw_well', 'normal');
    for (let i = 0; i < 5; i++) sim.tick();
    expect(sim.player.pos.x).toBeGreaterThan(600); // inside the instance band
    const ok = castTownPortal(sim.ctx, () => sim.nextId++, sim.player.id);
    expect(ok).toBe(true);
    // A linked town-portal pair now exists, owned by the caster.
    const portals = [...sim.entities.values()].filter(
      (e) => e.templateId === 'town_portal' && e.portalOwnerId === sim.player.id,
    );
    expect(portals.length).toBe(2);
  });

  it('CANNOT be cast while already standing in a town hub', () => {
    forceRealm('infernal');
    const sim = makeSim();
    const p = sim.player;
    // The player spawns in/near the starting town hub.
    const ok = castTownPortal(sim.ctx, () => sim.nextId++, p.id);
    expect(ok).toBe(false);
  });

  it('CAN be cast from the open field (away from any town)', () => {
    forceRealm('infernal');
    const sim = makeSim();
    const p = sim.player;
    p.pos.x = 200; // still overworld but far from the hub centre
    p.pos.z = 400;
    const ok = castTownPortal(sim.ctx, () => sim.nextId++, p.id);
    expect(ok).toBe(true);
  });
});
