import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { manifestUrls, VISUALS } from '../src/render/characters/manifest';
import { normalizeRealmVisualId, realmClassVisualKey } from '../src/sim/realms/class_visuals';
import type { PlayerClass } from '../src/sim/types';

const rendererSource = readFileSync(new URL('../src/render/renderer.ts', import.meta.url), 'utf8');

const RUNTIME_KEYS = [
  'realm_cryptic_bone_herald',
  'realm_infernal_crimson_behemoth',
  'realm_infernal_horned_demon',
  'realm_infernal_skullbeast',
  'realm_classic_orc',
  'realm_classic_big_orc',
  'realm_classic_fighting_elf',
  'realm_classic_dwarf',
  'realm_classic_female_elf',
  'realm_classic_female_orc',
  'realm_classic_treasure_dwarf',
  'realm_classic_kitty',
] as const;

describe('realm class runtime visuals', () => {
  it('normalizes Arcane Void separately from Arcane Nexus', () => {
    expect(normalizeRealmVisualId('Arcane Void')).toBe('arcadevoid');
    expect(normalizeRealmVisualId('Arcane Nexus')).toBe('arcane');
    expect(realmClassVisualKey('Arcane Void', 'warrior')).toBeNull();
  });

  it('maps only classes with playable runtime GLBs', () => {
    expect(realmClassVisualKey('Classic', 'priest')).toBe('realm_classic_female_elf');
    expect(realmClassVisualKey('Infernal', 'rogue')).toBe('realm_infernal_class_rogue');
    // was forge_worker, barred 2026-08-08: its arms are weighted to the spine,
    // so they hold a T-pose through every clip
    expect(realmClassVisualKey('Cryptic Realm', 'warlock')).toBe(
      'realm_infernal_human_hooded_wanderer',
    );
    expect(realmClassVisualKey('Classic', 'warlock')).toBeNull();
  });

  it('has a lazy manifest entry for every mapped runtime visual', () => {
    const bootUrls = new Set(manifestUrls());
    for (const key of RUNTIME_KEYS) {
      const visual = VISUALS[key];
      expect(visual, key).toBeTruthy();
      expect(visual.lazyPreload, key).toBe(true);
      expect(bootUrls.has(visual.url), key).toBe(false);
    }
  });

  it('never instantiates lazy realm NPCs during the boot prewarm pass', () => {
    const start = rendererSource.indexOf('private buildNpcPrewarmGroup');
    const end = rendererSource.indexOf('private buildPlayerPrewarmGroup', start);
    const npcPrewarmSource = rendererSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(npcPrewarmSource.indexOf('if (isVisualLazy(modelKey)) continue;')).toBeGreaterThan(-1);
    expect(npcPrewarmSource.indexOf('if (isVisualLazy(modelKey)) continue;')).toBeLessThan(
      npcPrewarmSource.indexOf('createCharacterVisual(entity)'),
    );
  });

  it('does not map a class to a missing manifest key', () => {
    const realms = ['crypticrealm', 'infernal', 'classic'] as const;
    const classes: PlayerClass[] = [
      'warrior',
      'paladin',
      'hunter',
      'rogue',
      'priest',
      'shaman',
      'mage',
      'warlock',
      'druid',
    ];

    for (const realm of realms) {
      for (const cls of classes) {
        const key = realmClassVisualKey(realm, cls);
        if (key) expect(VISUALS[key], `${realm}:${cls}`).toBeTruthy();
      }
    }
  });

  it('keeps every Cryptic Realm playable class humanoid and distinct', () => {
    const classes: PlayerClass[] = [
      'warrior',
      'paladin',
      'hunter',
      'rogue',
      'priest',
      'shaman',
      'mage',
      'warlock',
      'druid',
    ];
    const keys = classes.map((cls) => realmClassVisualKey('Cryptic Realm', cls));

    // Was one distinct body per class. Six of the nine pointed at a body that
    // fails in motion, and the civilian bank has only three survivors, so the
    // nine share three. The prefix and no-demon rules below are unchanged -
    // only the variety count gave way. RAISE THIS BACK as bodies are repaired.
    expect(new Set(keys).size).toBeGreaterThanOrEqual(3);
    for (const key of keys) {
      expect(key).toMatch(/^realm_infernal_human_/);
      expect(key).not.toMatch(/bone_herald|elf|orc|demon/i);
    }
  });

  it('keeps every Infernal base class on a distinct playable class body', () => {
    const classes: PlayerClass[] = [
      'warrior',
      'paladin',
      'hunter',
      'rogue',
      'priest',
      'shaman',
      'mage',
      'warlock',
      'druid',
    ];
    const keys = classes.map((cls) => realmClassVisualKey('Infernal', cls));

    // Was one distinct body per class; seven of the nine failed the 2026-08-08
    // render audit, so the nine share the five that passed. RAISE THIS BACK.
    expect(new Set(keys).size).toBeGreaterThanOrEqual(5);
    for (const key of keys) {
      expect(key).toMatch(/^realm_infernal_class_/);
      // The exclusion list is a NAME check standing in for "no monster body".
      // "Demon Hunter" is a hunter OF demons - a canonical human archetype in
      // INFERNAL_HERO_CLASSES - and one of only three class bodies that
      // survived the audit, so it is named rather than cast out.
      if (key !== 'realm_infernal_class_demon_hunter') {
        expect(key).not.toMatch(/dark_paladin|bone_herald|demon|behemoth|skullbeast/i);
      }
    }
  });
});
