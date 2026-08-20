import { afterEach, describe, expect, it } from 'vitest';
import {
  setBodyOverrides,
  visualKeyFor,
  visualKeyForCharacter,
} from '../src/render/characters/manifest';
import { setRealmHostEnv } from '../src/sim/realms/registry';

describe('realm hero body override precedence', () => {
  afterEach(() => {
    setBodyOverrides('infernal', {});
    setBodyOverrides('classic', {});
    setRealmHostEnv(null);
  });

  it('keeps a selected expanded hero distinct from its shared mechanical class', () => {
    setBodyOverrides('infernal', {
      'class:shaman': {
        assetUrl: '/cr-realms/infernal/infernal_class_witch_doctor.glb',
      },
    });

    expect(
      visualKeyForCharacter({
        realm: 'infernal',
        realmHeroId: 'infernal-hero-monk',
        cls: 'shaman',
      }),
    ).toBe('realm_infernal_hero_monk');

    expect(
      visualKeyForCharacter({
        realm: 'infernal',
        realmHeroId: null,
        cls: 'shaman',
      }),
    ).toBe('realm_infernal_class_witch_doctor');
  });

  it('still honors a hero-specific body override', () => {
    setBodyOverrides('infernal', {
      'hero:infernal-hero-monk': {
        assetUrl: '/cr-realms/infernal/infernal_class_crusader.glb',
      },
    });

    expect(
      visualKeyForCharacter({
        realm: 'infernal',
        realmHeroId: 'infernal-hero-monk',
        cls: 'shaman',
      }),
    ).toBe('realm_infernal_class_crusader');
  });

  it('resolves a hidden variant through the canonical hero display name', () => {
    setBodyOverrides('infernal', {
      'hero:Sorcerer / Sorceress': {
        assetUrl: '/cr-realms/infernal/infernal_class_wizard.glb',
      },
    });

    expect(
      visualKeyForCharacter({
        realm: 'infernal',
        realmHeroId: 'infernal-hero-sorcerer-m',
        cls: 'mage',
      }),
    ).toBe('realm_infernal_class_wizard');
  });

  it('keeps the explicit mech cosmetic ahead of an operator body override in world and roster', () => {
    setRealmHostEnv({
      queryParam: (name) => (name === 'realm' ? 'infernal' : null),
      storageGet: () => null,
      storageSet: () => undefined,
    });
    setBodyOverrides('infernal', {
      'class:warrior': {
        assetUrl: '/cr-realms/infernal/infernal_human_iron_warden.glb',
      },
    });

    expect(visualKeyForCharacter({ realm: 'infernal', cls: 'warrior', skinCatalog: 'mech' })).toBe(
      'player_mech',
    );
    expect(
      visualKeyFor({
        kind: 'player',
        templateId: 'warrior',
        skinCatalog: 'mech',
      } as never),
    ).toBe('player_mech');
  });

  it('applies an ordinary non-Infernal class override in the world', () => {
    setRealmHostEnv({
      queryParam: (name) => (name === 'realm' ? 'classic' : null),
      storageGet: () => null,
      storageSet: () => undefined,
    });
    setBodyOverrides('classic', {
      'class:mage': {
        assetUrl: '/cr-realms/classic/classic_class_paladin.glb',
      },
    });

    expect(
      visualKeyFor({ kind: 'player', templateId: 'mage', skinCatalog: 'class' } as never),
    ).toBe('realm_classic_class_paladin');
  });
});
