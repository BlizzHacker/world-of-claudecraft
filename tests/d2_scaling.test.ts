import { afterEach, describe, expect, it } from 'vitest';
import {
  setRealmHostEnv,
  d2PlayerHpMult,
  d2PlayerDmgMult,
  d2MobHpMult,
  d2MobDmgMult,
} from '../src/sim/realms/registry';

function forceRealm(id: string) {
  setRealmHostEnv({
    queryParam: (n) => (n === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}
afterEach(() => setRealmHostEnv(null));

describe('F5c D2 stat scaling', () => {
  it('no scaling at or below the vanilla cap (level <= 20)', () => {
    forceRealm('infernal');
    for (const lvl of [1, 10, 20]) {
      expect(d2PlayerHpMult(lvl)).toBe(1);
      expect(d2PlayerDmgMult(lvl)).toBe(1);
      expect(d2MobHpMult(lvl)).toBe(1);
      expect(d2MobDmgMult(lvl)).toBe(1);
    }
  });

  it('ramps HP + damage geometrically past level 20 on a D2 realm', () => {
    forceRealm('infernal');
    // +5%/level HP: level 21 = 1.05, and it compounds.
    expect(d2PlayerHpMult(21)).toBeCloseTo(1.05, 5);
    expect(d2PlayerHpMult(30)).toBeCloseTo(1.05 ** 10, 4);
    // By level 99 a hero has a D2-scale pool: tens of times a level-20 char.
    expect(d2PlayerHpMult(99)).toBeGreaterThan(20);
    // Damage ramps a touch faster than HP so kills stay snappy (D2 feel).
    expect(d2PlayerDmgMult(99)).toBeGreaterThan(d2PlayerHpMult(99));
  });

  it('monsters ramp with the hero so the fight stays hard', () => {
    forceRealm('infernal');
    expect(d2MobHpMult(60)).toBeGreaterThan(1);
    expect(d2MobDmgMult(60)).toBeGreaterThan(1);
    // Mob HP defaults to the player HP ramp (ratio preserved).
    expect(d2MobHpMult(50)).toBeCloseTo(d2PlayerHpMult(50), 4);
  });

  it('vanilla realms never scale (classic, claudecraft)', () => {
    for (const id of ['classic', 'claudecraft']) {
      forceRealm(id);
      for (const lvl of [21, 50, 80, 99]) {
        expect(d2PlayerHpMult(lvl)).toBe(1);
        expect(d2PlayerDmgMult(lvl)).toBe(1);
        expect(d2MobHpMult(lvl)).toBe(1);
      }
    }
  });
});
