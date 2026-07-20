import { describe, expect, it } from 'vitest';
import { getRealm, type RealmId } from '../src/sim/realms';
import type { PlayerClass } from '../src/sim/types';
import {
  classChoicesForRealm,
  classPresentationForRealm,
  infernalHeroChoicesForRealm,
  PLAYER_CLASS_ORDER,
  presentationFactionsForRealm,
  realmHasClassOverlay,
} from '../src/ui/cryptic/realm_class_presentation';

const ALL_CLASSES: readonly PlayerClass[] = [
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

const INFERNAL_HERO_ARCHETYPES: ReadonlyArray<readonly [string, PlayerClass]> = [
  ['Warrior', 'warrior'],
  ['Rogue', 'rogue'],
  ['Sorcerer / Sorceress', 'mage'],
  ['Amazon', 'hunter'],
  ['Barbarian', 'warrior'],
  ['Necromancer', 'warlock'],
  ['Paladin', 'paladin'],
  ['Druid', 'druid'],
  ['Assassin', 'rogue'],
  ['Demon Hunter', 'hunter'],
  ['Monk', 'shaman'],
  ['Wizard', 'mage'],
  ['Witch Doctor', 'warlock'],
  ['Crusader', 'paladin'],
  ['Spiritborn', 'shaman'],
  ['Warlock', 'warlock'],
  ['Blood Knight', 'paladin'],
  ['Tempest', 'shaman'],
];

const HELL_ENEMY_CHOICES = [
  'Dark Paladin',
  'Tainted Hood',
  'Horned Demon',
  'Crimson Infernal Behemoth',
  'Bone Herald',
  'Skullbeast',
];

const INFERNAL_VERSION_LABEL = /Diablo (?:I|II|III|IV|Immortal)/i;
const HELL_ONLY_MODEL =
  /diablo|demon|dark[ _-]?paladin|bone[ _-]?herald|behemoth|skullbeast|cursed|corrupt|tainted/i;

describe('realm class presentation', () => {
  it('offers a realm-flavored choice for every playable base class', () => {
    const realms: RealmId[] = [
      'crypticrealm',
      'infernal',
      'classic',
      'dominion',
      'arcane',
      'arcadevoid',
      'fps',
    ];
    expect(PLAYER_CLASS_ORDER).toEqual(ALL_CLASSES);
    for (const id of realms) {
      const choices = classChoicesForRealm(getRealm(id));
      expect(choices.map((choice) => choice.baseClass)).toEqual(ALL_CLASSES);
      for (const choice of choices) {
        expect(choice.name).toBeTruthy();
        expect(choice.faction).toBeTruthy();
        expect(choice.lore.length).toBeGreaterThan(20);
      }
    }
  });

  it('keeps Classic and Arcane Void split by their expected factions', () => {
    expect(presentationFactionsForRealm(getRealm('classic')).sort()).toEqual(['Alliance', 'Horde']);
    expect(presentationFactionsForRealm(getRealm('arcadevoid')).sort()).toEqual([
      'Protoss Alliance',
      'Terran Dominion',
      'Zerg Swarm',
    ]);
  });

  it('marks asset readiness honestly and avoids duplicated GLBs inside each roster', () => {
    expect(getRealm('arcane').name).toBe('Arcane Nexus');
    expect(getRealm('arcadevoid').name).toBe('Arcane Void');
    const realms: RealmId[] = ['crypticrealm', 'infernal', 'classic', 'arcadevoid'];
    for (const id of realms) {
      const choices = classChoicesForRealm(getRealm(id));
      const urls = choices.map((choice) => choice.assetUrl).filter((url): url is string => !!url);
      expect(new Set(urls).size, `${id} duplicated asset URLs`).toBe(urls.length);
      for (const choice of choices) {
        expect(choice.assetStatus, `${id}:${choice.baseClass}`).toMatch(/ready|preview|comingSoon/);
        expect(choice.assetStatusLabel, `${id}:${choice.baseClass}`).toBeTruthy();
        if (choice.assetUrl) {
          expect(choice.assetUrl, `${id}:${choice.baseClass}`).toMatch(/\.glb$/);
          expect(choice.assetName, `${id}:${choice.baseClass}`).toBeTruthy();
          expect(choice.assetStatus, `${id}:${choice.baseClass}`).not.toBe('comingSoon');
        } else {
          expect(choice.assetStatus, `${id}:${choice.baseClass}`).toBe('comingSoon');
        }
      }
    }

    expect(classPresentationForRealm(getRealm('crypticrealm'), 'warlock')?.assetStatus).toBe(
      'preview',
    );
    expect(classPresentationForRealm(getRealm('crypticrealm'), 'warrior')?.assetStatus).toBe(
      'comingSoon',
    );
    expect(
      classChoicesForRealm(getRealm('arcadevoid')).every(
        (choice) => choice.assetStatus === 'comingSoon',
      ),
    ).toBe(true);
  });

  it('keeps realm class names distinct inside a realm roster', () => {
    for (const id of ['crypticrealm', 'infernal', 'arcane', 'arcadevoid'] as const) {
      const names = classChoicesForRealm(getRealm(id)).map((choice) => choice.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('exposes one version-neutral human hero card per Infernal archetype', () => {
    const choices = infernalHeroChoicesForRealm(getRealm('infernal'));
    const heroes = choices.filter((choice) => choice.factionSide === 'sanctuary');

    expect(heroes.map((choice) => [choice.name, choice.baseClass])).toEqual(
      INFERNAL_HERO_ARCHETYPES,
    );
    expect(new Set(heroes.map((choice) => choice.name)).size).toBe(heroes.length);
    expect(new Set(choices.map((choice) => choice.factionSide))).toEqual(
      new Set(['sanctuary', 'hell']),
    );

    for (const choice of heroes) {
      expect(choice.assetStatus, choice.name).toBe('ready');
      expect(choice.assetAnimated, choice.name).toBe(true);
      expect(choice.assetUrl, choice.name).toMatch(
        /^\/cr-realms\/infernal\/(?:characters\/)?infernal_human_[a-z_]+\.glb$/,
      );
      expect(`${choice.assetName} ${choice.assetUrl}`, choice.name).not.toMatch(HELL_ONLY_MODEL);
    }

    for (const choice of choices) {
      expect(choice.name, choice.heroId).not.toMatch(INFERNAL_VERSION_LABEL);
      expect(choice.lore, choice.heroId).not.toMatch(INFERNAL_VERSION_LABEL);
      expect(choice.heroId).not.toMatch(/diablo-(?:i|ii|iii|iv|immortal)/i);
      expect(choice).not.toHaveProperty('lineage');
    }

    const baseChoices = classChoicesForRealm(getRealm('infernal'));
    expect(baseChoices).toHaveLength(ALL_CLASSES.length);
    expect(
      baseChoices.every((choice) =>
        /^\/cr-realms\/infernal\/(?:characters\/)?infernal_human_[a-z_]+\.glb$/.test(
          choice.assetUrl ?? '',
        ),
      ),
    ).toBe(true);
  });

  it('keeps distinct demon and corrupted previews on the Hell side only', () => {
    const choices = infernalHeroChoicesForRealm(getRealm('infernal'));
    const enemies = choices.filter((choice) => choice.factionSide === 'hell');

    expect(enemies.map((choice) => choice.name)).toEqual(HELL_ENEMY_CHOICES);
    expect(new Set(enemies.map((choice) => choice.heroId)).size).toBe(enemies.length);
    expect(new Set(enemies.map((choice) => choice.assetUrl)).size).toBe(enemies.length);
    expect(enemies.every((choice) => choice.faction === 'Burning Hells')).toBe(true);
    expect(enemies.every((choice) => choice.assetUrl?.endsWith('.glb'))).toBe(true);

    for (const choice of choices) {
      if (HELL_ONLY_MODEL.test(`${choice.assetName} ${choice.assetUrl}`)) {
        expect(choice.factionSide, choice.name).toBe('hell');
      }
    }

    expect(presentationFactionsForRealm(getRealm('infernal'))).toEqual([
      'Heavenly Host',
      'Burning Hells',
    ]);
  });

  it('leaves pristine and exchange realms on vanilla class labels', () => {
    for (const id of ['claudecraft', 'exchange'] as const) {
      const realm = getRealm(id);
      expect(realmHasClassOverlay(realm)).toBe(false);
      expect(classChoicesForRealm(realm)).toEqual([]);
      expect(classPresentationForRealm(realm, 'warrior')).toBeNull();
    }
  });
});
