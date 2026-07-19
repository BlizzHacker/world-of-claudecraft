import { describe, expect, it } from 'vitest';
import { factionForRealmClass, factionsForRealm, REALM_FACTIONS } from '../src/sim/realms/factions';
import { REALMS } from '../src/sim/realms/registry';
import type { PlayerClass } from '../src/sim/types';

const CLASSES: readonly PlayerClass[] = ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'shaman', 'mage', 'warlock', 'druid'];

describe('realm faction registry', () => {
  it('defines a non-empty faction roster for every realm', () => {
    for (const id of Object.keys(REALMS) as Array<keyof typeof REALMS>) {
      expect(factionsForRealm(id).length, id).toBeGreaterThan(0);
    }
  });

  it('keeps faction ids unique and classes assigned at most once per realm', () => {
    for (const [id, factions] of Object.entries(REALM_FACTIONS)) {
      expect(new Set(factions.map((entry) => entry.id)).size, id).toBe(factions.length);
      const assigned = new Set<PlayerClass>();
      for (const entry of factions) {
        for (const cls of entry.classes) {
          expect(assigned.has(cls), `${id}:${cls}`).toBe(false);
          assigned.add(cls);
        }
      }
    }
  });

  it('covers the nine combat classes in every playable home realm', () => {
    for (const id of ['crypticrealm', 'infernal', 'classic', 'dominion', 'arcane', 'arcadevoid', 'fps'] as const) {
      for (const cls of CLASSES) expect(factionForRealmClass(id, cls), `${id}:${cls}`).not.toBeNull();
    }
  });

  it('keeps Infernal surprise factions explicit', () => {
    const infernal = factionsForRealm('infernal');
    expect(infernal.filter((entry) => entry.surprise).map((entry) => entry.id)).toEqual(['ashen-court', 'redeemed']);
    expect(infernal.find((entry) => entry.id === 'ashen-court')?.alignment).toBe('mixed');
  });
});
