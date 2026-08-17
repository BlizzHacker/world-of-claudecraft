import { afterEach, describe, expect, it } from 'vitest';
import {
  setBodyOverrides,
  VISUALS,
  visualKeyForCharacter,
} from '../src/render/characters/manifest';
import { classSexToggleAvailable } from '../src/ui/cryptic/realm_class_presentation';
import {
  clearRealmVisualOverrides,
  setRealmVisualOverrides,
} from '../src/ui/cryptic/realm_visual_overrides';

// The charcreate grid's class-card Female/Male toggle:
//  - a card offers it only when the realm publishes a sex-suffixed body
//    override (class:<cls>:f / class:<cls>:m) for its base class;
//  - the picked sex threads from the toggle into visualKeyForCharacter's
//    gender arg, hero-neutrally, so the preview mounts the suffixed body;
//  - a published hero: override still wins whenever a realmHeroId is passed,
//    which is exactly WHY the preview resolves an explicit pick with
//    realmHeroId: null (see showClassPreview / charCreateSexPick in
//    src/main.ts).

const REALM = 'infernal';
const FEMALE_URL = '/cr-realms/infernal/test_sex_toggle_warrior_female.glb';
const HERO_URL = '/cr-realms/infernal/test_sex_toggle_hero_warrior.glb';
const CLASS_URL = '/cr-realms/infernal/test_sex_toggle_class_warrior.glb';

afterEach(() => {
  clearRealmVisualOverrides();
  setBodyOverrides(REALM, {});
});

describe('charcreate class-card sex toggle', () => {
  it('offers the toggle only for classes with a published sex-suffixed body', () => {
    setRealmVisualOverrides(REALM, {
      'class:warrior': { assetUrl: CLASS_URL },
      'class:warrior:f': { assetUrl: FEMALE_URL },
      'class:mage:m': { assetUrl: CLASS_URL },
      'class:priest': { assetUrl: CLASS_URL },
    });
    expect(classSexToggleAvailable(REALM, 'warrior')).toBe(true); // :f published
    expect(classSexToggleAvailable(REALM, 'mage')).toBe(true); // :m alone is enough
    expect(classSexToggleAvailable(REALM, 'druid')).toBe(false); // nothing published
    expect(classSexToggleAvailable(REALM, 'priest')).toBe(false); // unsuffixed only
  });

  it('threads the toggled gender into visualKeyForCharacter (hero-neutral pick)', () => {
    setBodyOverrides(REALM, {
      'class:warrior': { assetUrl: CLASS_URL },
      'class:warrior:f': { assetUrl: FEMALE_URL },
      'hero:infernal-hero-warrior': { assetUrl: HERO_URL },
    });
    // Explicit Female pick, resolved the way showClassPreview does.
    const femaleKey = visualKeyForCharacter({
      realm: REALM,
      realmHeroId: null,
      cls: 'warrior',
      gender: 'female',
    });
    expect(VISUALS[femaleKey]?.url).toBe(FEMALE_URL);
    // Male has no published :m body: the un-suffixed class body serves it.
    const maleKey = visualKeyForCharacter({
      realm: REALM,
      realmHeroId: null,
      cls: 'warrior',
      gender: 'male',
    });
    expect(VISUALS[maleKey]?.url).toBe(CLASS_URL);
    // An explicit Female pick outranks the hero body even WITH a realmHeroId:
    // the creator previews class:<cls>:f, and the world must render the same
    // or the toggle lies. (This flipped from hero-first when the world path
    // started threading gender.)
    const heroFemaleKey = visualKeyForCharacter({
      realm: REALM,
      realmHeroId: 'infernal-hero-warrior',
      cls: 'warrior',
      gender: 'female',
    });
    expect(VISUALS[heroFemaleKey]?.url).toBe(FEMALE_URL);
    // Without a gender the hero body still wins - existing characters with no
    // appearance choice keep their hero look byte-identical.
    const heroKey = visualKeyForCharacter({
      realm: REALM,
      realmHeroId: 'infernal-hero-warrior',
      cls: 'warrior',
      gender: null,
    });
    expect(VISUALS[heroKey]?.url).toBe(HERO_URL);
  });
});
