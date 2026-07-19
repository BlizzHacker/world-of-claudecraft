import { describe, expect, it } from 'vitest';
import { getRealm, type RealmId } from '../src/sim/realms';
import type { PlayerClass } from '../src/sim/types';
import {
  classChoicesForRealm,
  classPresentationForRealm,
  infernalDiabloClassChoicesForRealm,
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

  it('exposes the complete Infernal Diablo roster on real GLBs', () => {
    const choices = infernalDiabloClassChoicesForRealm(getRealm('infernal'));
    expect(choices).toHaveLength(19);
    expect(new Set(choices.map((choice) => choice.name)).size).toBe(choices.length);
    expect(choices.map((choice) => choice.lineage)).toEqual(
      expect.arrayContaining(['Diablo I', 'Diablo II', 'Diablo III', 'Diablo IV', 'Diablo Immortal']),
    );
    expect(choices.every((choice) => choice.assetStatus === 'ready')).toBe(true);
    expect(choices.every((choice) => choice.assetUrl?.endsWith('.glb'))).toBe(true);
    expect(choices.find((choice) => choice.name === 'Warrior')?.assetUrl).toContain(
      'durance_tester_humanoid.glb',
    );
    expect(new Set(choices.map((choice) => choice.faction))).toEqual(
      new Set(['Heavenly Host', 'Burning Hells', 'Ashen Court']),
    );
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
