import { describe, expect, it } from 'vitest';
import {
  INFERNAL_HERO_CLASSES,
  infernalHeroClassesForRealm,
} from '../src/sim/realms/infernal_classes';

describe('Infernal hero class roster', () => {
  it('exposes every requested class lineage', () => {
    expect(INFERNAL_HERO_CLASSES).toHaveLength(35);
    for (const name of [
      'Warrior',
      'Rogue',
      'Sorcerer',
      'Amazon',
      'Necromancer',
      'Spiritborn',
      'Blood Knight',
      'Tempest',
    ]) {
      expect(
        INFERNAL_HERO_CLASSES.some((entry) => entry.name === name),
        name,
      ).toBe(true);
    }
  });

  it('is scoped to Infernal and maps to real engine classes', () => {
    expect(infernalHeroClassesForRealm('infernal')).toBe(INFERNAL_HERO_CLASSES);
    expect(infernalHeroClassesForRealm('classic')).toEqual([]);
    expect(INFERNAL_HERO_CLASSES.every((entry) => entry.engineClass)).toBe(true);
  });
});
