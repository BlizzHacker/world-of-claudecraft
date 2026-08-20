import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { manifestUrls, VISUALS, visualKeyFor } from '../src/render/characters/manifest';
import { getRealm } from '../src/sim/realms';
import { normalizeRealmVisualId, realmClassVisualKey } from '../src/sim/realms/class_visuals';
import { setRealmHostEnv } from '../src/sim/realms/registry';
import type { PlayerClass } from '../src/sim/types';
import { classPresentationForRealm } from '../src/ui/cryptic/realm_class_presentation';

const rendererSource = readFileSync(new URL('../src/render/renderer.ts', import.meta.url), 'utf8');

const THEMED_REALMS = [
  'crypticrealm',
  'infernal',
  'classic',
  'dominion',
  'arcane',
  'arcadevoid',
  'fps',
] as const;

const NON_KAYKIT_RUNTIME_REALMS = [...THEMED_REALMS, 'exchange'] as const;

const CLASSES: readonly PlayerClass[] = [
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
  afterEach(() => setRealmHostEnv(null));

  it('normalizes Arcane Void separately from Arcane Nexus', () => {
    expect(normalizeRealmVisualId('Arcane Void')).toBe('arcadevoid');
    expect(normalizeRealmVisualId('Arcane Nexus')).toBe('arcane');
    expect(realmClassVisualKey('Arcane Void', 'warrior')).toMatch(/^realm_/);
  });

  it('maps every class in every themed home realm to a non-KayKit GLB', () => {
    for (const realm of NON_KAYKIT_RUNTIME_REALMS) {
      for (const cls of CLASSES) {
        const key = realmClassVisualKey(realm, cls);
        expect(key, `${realm}:${cls}`).toBeTruthy();
        expect(key, `${realm}:${cls}`).not.toMatch(/^player_/);
        const visual = VISUALS[key ?? ''];
        expect(visual, `${realm}:${cls}:${key}`).toBeTruthy();
        expect(visual.url, `${realm}:${cls}:${key}`).toMatch(/^\/cr-realms\/.*\.glb$/);
      }
    }
    for (const cls of CLASSES) {
      expect(realmClassVisualKey('claudecraft', cls), cls).toBeNull();
    }
  });

  it('uses one exact authored body in creation, roster, and world for every home realm class', () => {
    for (const realm of THEMED_REALMS) {
      setRealmHostEnv({
        queryParam: (name) => (name === 'realm' ? realm : null),
        storageGet: () => null,
        storageSet: () => undefined,
      });
      for (const cls of CLASSES) {
        const key = realmClassVisualKey(realm, cls);
        const visual = VISUALS[key ?? ''];
        const presentation = classPresentationForRealm(getRealm(realm), cls);
        expect(presentation?.visualKey, `${realm}:${cls}:roster key`).toBe(key);
        expect(presentation?.assetUrl, `${realm}:${cls}:creator url`).toBe(visual?.url);
        expect(
          visualKeyFor({ kind: 'player', templateId: cls, skinCatalog: 'class' } as never),
          `${realm}:${cls}:world key`,
        ).toBe(key);
        expect(visual?.url, `${realm}:${cls}:url`).toMatch(/^\/cr-realms\/.+\.glb$/);
        expect(
          existsSync(fileURLToPath(new URL(`../public${visual?.url}`, import.meta.url))),
          `${realm}:${cls}:${visual?.url}`,
        ).toBe(true);
      }
    }
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
    for (const realm of THEMED_REALMS) {
      for (const cls of CLASSES) {
        const key = realmClassVisualKey(realm, cls);
        expect(key, `${realm}:${cls}`).toBeTruthy();
        expect(VISUALS[key ?? ''], `${realm}:${cls}`).toBeTruthy();
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

    expect(new Set(keys).size).toBe(classes.length);
    for (const key of keys) {
      expect(key).toMatch(/^realm_/);
      expect(key).not.toMatch(/bone_herald|dark_paladin|behemoth|skullbeast/i);
      expect(key).not.toMatch(/^realm_infernal_human_/);
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

    expect(new Set(keys).size).toBe(classes.length);
    for (const key of keys) {
      expect(key).toMatch(/^realm_/);
      // The exclusion list is a NAME check standing in for "no monster body".
      // "Demon Hunter" is a hunter OF demons - a canonical human archetype in
      // INFERNAL_HERO_CLASSES - and one of only three class bodies that
      // survived the audit, so it is named rather than cast out.
      if (key !== 'realm_infernal_hero_demon_hunter') {
        expect(key).not.toMatch(/dark_paladin|bone_herald|demon|behemoth|skullbeast/i);
      }
      expect(key).not.toMatch(/infernal_class_(?:barbarian|druid|witch_doctor)$/i);
    }
  });
});
