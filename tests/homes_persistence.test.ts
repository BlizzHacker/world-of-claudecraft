// Eastbrook Homes deeds must survive a restart.
//
// HomesState.lots was always documented as "plain serializable data: the server
// round-trips this record verbatim", but nothing loaded or saved it -- sim.homes was
// rebuilt empty by createHomesState() on every boot, so a bought deed vanished at the
// next restart. These pin the round-trip the server now performs against the
// `homes:<realm>` world_state blob.
import { afterEach, describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { setRealmHostEnv } from '../src/sim/realms/registry';

function forceRealm(id: string) {
  setRealmHostEnv({
    queryParam: (n) => (n === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}
afterEach(() => setRealmHostEnv(null));

function makeSim() {
  return new Sim({ seed: 5, playerClass: 'warrior', noPlayer: true });
}

describe('Eastbrook Homes persistence', () => {
  it('round-trips a deed through serialize -> load', () => {
    forceRealm('infernal');
    const before = makeSim();
    before.homes.lots.lot_b = { owner: 'DuranceTester', characterId: 147, at: 1234 };

    const save = before.serializeHomes();
    // A snapshot, not a live alias: mutating the sim afterwards must not alter it.
    before.homes.lots.lot_c = { owner: 'Someone Else', characterId: 999, at: 5678 };
    expect(save.lots.lot_c).toBeUndefined();

    const after = makeSim();
    expect(after.homes.lots.lot_b, 'a fresh sim starts with no deeds').toBeUndefined();
    after.loadHomes(save);

    expect(after.homes.lots.lot_b).toEqual({
      owner: 'DuranceTester',
      characterId: 147,
      at: 1234,
    });
  });

  it('treats a missing or empty blob as no deeds, never a crash', () => {
    forceRealm('infernal');
    const sim = makeSim();
    sim.homes.lots.lot_a = { owner: 'Stale', characterId: 1, at: 1 };

    sim.loadHomes(null);
    expect(sim.homes.lots).toEqual({});

    sim.loadHomes(undefined);
    expect(sim.homes.lots).toEqual({});

    sim.loadHomes({ lots: {} });
    expect(sim.homes.lots).toEqual({});
  });

  it('does not alias the loaded save, so later buys do not mutate the blob', () => {
    forceRealm('infernal');
    const save = { lots: { lot_d: { owner: 'DuranceTester', characterId: 147, at: 7 } } };
    const sim = makeSim();
    sim.loadHomes(save);
    sim.homes.lots.lot_a = { owner: 'Later Buyer', characterId: 2, at: 9 };
    expect(save.lots).toEqual({ lot_d: { owner: 'DuranceTester', characterId: 147, at: 7 } });
  });
});
