import { afterEach, describe, expect, it } from 'vitest';
import { setRealmHostEnv } from '../src/sim/realms/registry';
import { Sim } from '../src/sim/sim';
import { castTownPortal, useTownPortal } from '../src/sim/town_portal';

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

  it('CANNOT be cast while jailed or during a competitive match', () => {
    forceRealm('infernal');
    const sim = makeSim();
    const p = sim.player;
    p.pos.x = 200;
    p.pos.z = 400;
    p.jailed = true;
    expect(castTownPortal(sim.ctx, () => sim.nextId++, p.id)).toBe(false);
    p.jailed = false;
    (sim as any).arenaMatches.set(p.id, {});
    expect(castTownPortal(sim.ctx, () => sim.nextId++, p.id)).toBe(false);
    (sim as any).arenaMatches.delete(p.id);
    expect(castTownPortal(sim.ctx, () => sim.nextId++, p.id)).toBe(true);
  });
});

function ownedPortals(sim: Sim, ownerId: number) {
  return [...sim.entities.values()].filter(
    (e) => e.templateId === 'town_portal' && e.portalOwnerId === ownerId,
  );
}

describe('town portal pair lifecycle', () => {
  it('steps through BOTH directions: field to town and town back to the exact field spot', () => {
    forceRealm('infernal');
    const sim = makeSim();
    const p = sim.player;
    p.pos.x = 200;
    p.pos.z = 400;
    const fieldSpot = { x: p.pos.x, z: p.pos.z };
    expect(castTownPortal(sim.ctx, () => sim.nextId++, p.id)).toBe(true);
    // The cast warps the caster to town beside the town-side portal.
    const portals = ownedPortals(sim, p.id);
    expect(portals.length).toBe(2);
    const townSide = portals.reduce((a, b) =>
      Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) <=
      Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z)
        ? a
        : b,
    );
    // Step through the town portal: back to the field spot.
    useTownPortal(sim.ctx, townSide, p.id);
    expect(Math.abs(p.pos.x - fieldSpot.x)).toBeLessThan(3);
    expect(Math.abs(p.pos.z - fieldSpot.z)).toBeLessThan(3);
    // Step through the field portal: back to town.
    const fieldSide = portals.find((portal) => portal !== townSide)!;
    useTownPortal(sim.ctx, fieldSide, p.id);
    expect(Math.abs(p.pos.x - townSide.pos.x)).toBeLessThan(4);
    expect(Math.abs(p.pos.z - townSide.pos.z)).toBeLessThan(4);
  });

  it('re-casting closes the previous pair (one portal per character)', () => {
    forceRealm('infernal');
    const sim = makeSim();
    const p = sim.player;
    p.pos.x = 200;
    p.pos.z = 400;
    expect(castTownPortal(sim.ctx, () => sim.nextId++, p.id)).toBe(true);
    const firstIds = ownedPortals(sim, p.id).map((e) => e.id);
    // Walk back out to the field and cast again.
    p.pos.x = 250;
    p.pos.z = 420;
    (sim as any).rebucket(p);
    expect(castTownPortal(sim.ctx, () => sim.nextId++, p.id)).toBe(true);
    const second = ownedPortals(sim, p.id);
    expect(second.length).toBe(2);
    for (const e of second) expect(firstIds).not.toContain(e.id);
  });

  it('removePlayer (the true leave) closes the pair; other players portals survive', () => {
    forceRealm('infernal');
    const sim = new Sim({ seed: 5, playerClass: 'warrior', noPlayer: true });
    const leaver = sim.addPlayer('warrior', 'Leaver');
    const stayer = sim.addPlayer('warrior', 'Stayer');
    for (const pid of [leaver, stayer]) {
      const e = sim.entities.get(pid)!;
      e.pos.x = 200 + pid;
      e.pos.z = 400;
      e.prevPos = { ...e.pos };
      (sim as any).rebucket(e);
      expect(castTownPortal(sim.ctx, () => sim.nextId++, pid)).toBe(true);
    }
    expect(ownedPortals(sim, leaver).length).toBe(2);
    expect(ownedPortals(sim, stayer).length).toBe(2);
    sim.removePlayer(leaver);
    expect(ownedPortals(sim, leaver).length).toBe(0);
    expect(ownedPortals(sim, stayer).length).toBe(2);
  });
});
