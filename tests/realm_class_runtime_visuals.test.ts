import { describe, expect, it } from 'vitest';
import { manifestUrls, VISUALS } from '../src/render/characters/manifest';
import { normalizeRealmVisualId, realmClassVisualKey } from '../src/sim/realms/class_visuals';
import type { PlayerClass } from '../src/sim/types';

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
    expect(realmClassVisualKey('Infernal', 'rogue')).toBe('realm_infernal_human_road_mercenary');
    expect(realmClassVisualKey('Cryptic Realm', 'warlock')).toBe('realm_cryptic_bone_herald');
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
});
