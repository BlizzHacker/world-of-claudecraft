import { describe, expect, it } from 'vitest';
import { INFERNAL_HERO_CLASSES } from '../src/sim/realms/infernal_classes';
import { INFERNAL_SKILLSETS, infernalSkillsetFor } from '../src/sim/realms/infernal_skills';

const ELEMENTS = new Set(['fire', 'cold', 'lightning', 'poison', 'magic', 'physical', 'holy']);
const KINDS = new Set(['attack', 'passive', 'aura', 'summon', 'curse', 'buff', 'trap', 'shift']);

describe('infernal skill trees', () => {
  it('ships the seven founding classes, each with three trees', () => {
    expect(INFERNAL_SKILLSETS).toHaveLength(7);
    for (const set of INFERNAL_SKILLSETS) {
      expect(set.trees).toHaveLength(3);
      for (const tree of set.trees) {
        expect(tree.skills.length).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('every skill has a valid element/kind, a name, and a level requirement', () => {
    for (const set of INFERNAL_SKILLSETS) {
      for (const tree of set.trees) {
        for (const skill of tree.skills) {
          expect(skill.name.length).toBeGreaterThan(0);
          expect(skill.desc.length).toBeGreaterThan(0);
          expect(KINDS.has(skill.kind)).toBe(true);
          if (skill.element) expect(ELEMENTS.has(skill.element)).toBe(true);
          expect(skill.req).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('skill ids are unique within a class', () => {
    for (const set of INFERNAL_SKILLSETS) {
      const ids = set.trees.flatMap((t) => t.skills.map((s) => s.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('lookup resolves by canonical class name and returns null otherwise', () => {
    expect(infernalSkillsetFor('Paladin')?.trees[2].name).toBe('Combat Skills');
    expect(infernalSkillsetFor('Nonexistent')).toBeNull();
  });

  it('every skillset name maps to a real hero in the roster', () => {
    const rosterNames = new Set(
      INFERNAL_HERO_CLASSES.map((c) =>
        c.name === 'Sorcerer' || c.name === 'Sorceress' ? 'Sorcerer / Sorceress' : c.name,
      ),
    );
    for (const set of INFERNAL_SKILLSETS) {
      expect(rosterNames.has(set.className)).toBe(true);
    }
  });
});
