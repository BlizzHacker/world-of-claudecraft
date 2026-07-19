import { describe, expect, it } from 'vitest';
import { INFERNAL_DIABLO_CLASSES, diabloClassesForRealm } from '../src/sim/realms/diablo_classes';

describe('Infernal Diablo class roster', () => {
  it('exposes every requested class lineage', () => {
    expect(INFERNAL_DIABLO_CLASSES).toHaveLength(35);
    for (const name of ['Warrior', 'Rogue', 'Sorcerer', 'Amazon', 'Necromancer', 'Spiritborn', 'Blood Knight', 'Tempest']) {
      expect(INFERNAL_DIABLO_CLASSES.some((entry) => entry.name === name), name).toBe(true);
    }
  });

  it('is scoped to Infernal and maps to real engine classes', () => {
    expect(diabloClassesForRealm('infernal')).toBe(INFERNAL_DIABLO_CLASSES);
    expect(diabloClassesForRealm('classic')).toEqual([]);
    expect(INFERNAL_DIABLO_CLASSES.every((entry) => entry.engineClass)).toBe(true);
  });
});
