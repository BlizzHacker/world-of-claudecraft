import { describe, expect, it } from 'vitest';
import {
  INFERNAL_CHARACTER_SELECTIONS,
  INFERNAL_HERO_CLASSES,
  infernalCharacterSelection,
  infernalHeroClassesForRealm,
  infernalHeroOverrideKeys,
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

describe('Infernal hero variants', () => {
  it('registers hidden variant selections the create path can validate', () => {
    const canonical = INFERNAL_CHARACTER_SELECTIONS.find(
      (selection) => selection.id === 'infernal-hero-sorcerer-sorceress',
    );
    expect(canonical?.variants?.map((variant) => variant.heroId)).toEqual([
      'infernal-hero-sorceress',
      'infernal-hero-sorcerer-m',
    ]);
    for (const variant of canonical?.variants ?? []) {
      const hidden = INFERNAL_CHARACTER_SELECTIONS.find(
        (selection) => selection.id === variant.heroId,
      );
      expect(hidden?.variantOf, variant.heroId).toBe(canonical?.id);
      expect(hidden?.engineClass, variant.heroId).toBe(canonical?.engineClass);
      expect(hidden?.factionSide, variant.heroId).toBe(canonical?.factionSide);
      expect(hidden?.visualKey, variant.heroId).toBe(canonical?.visualKey);
      // The exact lookup the server-side createCharacter validation performs.
      expect(infernalCharacterSelection('infernal', variant.heroId, 'mage')?.id).toBe(
        variant.heroId,
      );
    }
  });

  it('resolves a bodiless variant through the canonical override key', () => {
    const variant = INFERNAL_CHARACTER_SELECTIONS.find(
      (selection) => selection.id === 'infernal-hero-sorcerer-m',
    );
    expect(variant).toBeTruthy();
    const keys = infernalHeroOverrideKeys('infernal', variant!);
    // Only the canonical female body is published today.
    const overrides: Record<string, string> = {
      'hero:infernal-hero-sorcerer-sorceress': '/cr-realms/infernal/sorceress.glb',
    };
    const hit = keys.find((key) => overrides[key]);
    expect(hit).toBe('hero:infernal-hero-sorcerer-sorceress');
    // Once a male body is published under the variant's own key, it wins.
    overrides['hero:infernal-hero-sorcerer-m'] = '/cr-realms/infernal/sorcerer_m.glb';
    expect(keys.find((key) => overrides[key])).toBe('hero:infernal-hero-sorcerer-m');
  });
});
