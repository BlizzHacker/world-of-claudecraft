// The offline creator paints the SAME realm roster the online creator does.
//
// It used to paint nothing at all: `paintRealmClassChoices` was hardwired to
// '#charcreate-panel', so on the Infernal Realm the online creator showed the
// thirty-card hero roster (Heavenly Host / Ashen Court) while the offline
// creator kept the nine static engine-class buttons the entry document ships.
// The second half of the same bug was identity: an offline start carried only a
// PlayerClass, so picking "Blood Knight" spawned a generic paladin on the class
// body.
//
// These pin the contract that keeps ONE painter serving TWO hosts:
//   1. the host table covers both panels and never collides,
//   2. the roster/faction decision is a function of the REALM, never the panel,
//   3. a picked card's hero id is what reaches the world, and the world's own
//      body resolver honours it (including a hero-specific sex variant without
//      collapsing every female hero onto one generic class body).
import { afterEach, describe, expect, it } from 'vitest';
import {
  setBodyOverrides,
  VISUALS,
  visualKeyForCharacter,
} from '../src/render/characters/manifest';
import { getRealm } from '../src/sim/realms';
import {
  CHAR_GRID_HOSTS,
  charGridHost,
  pickedRealmHeroId,
  usesRealmHeroRoster,
} from '../src/ui/cryptic/char_grid_host';
import {
  infernalHeroChoicesForRealm,
  presentationFactionsForRealm,
} from '../src/ui/cryptic/realm_class_presentation';

const REALM = 'infernal';
const HERO_URL = '/cr-realms/infernal/test_roster_hero_blood_knight.glb';
const HERO_FEMALE_URL = '/cr-realms/infernal/test_roster_hero_blood_knight_female.glb';
const CLASS_URL = '/cr-realms/infernal/test_roster_class_paladin.glb';
const FEMALE_URL = '/cr-realms/infernal/test_roster_class_paladin_female.glb';

afterEach(() => {
  setBodyOverrides(REALM, {});
});

describe('creator class grid: one painter, two hosts', () => {
  it('covers both creator panels with distinct, non-colliding element ids', () => {
    expect([...CHAR_GRID_HOSTS]).toEqual(['#charcreate-panel', '#offline-select']);
    const online = charGridHost('#charcreate-panel');
    const offline = charGridHost('#offline-select');
    // Each host owns its own row, details panel, faction strip and turntable.
    for (const key of [
      'row',
      'cards',
      'selectedCard',
      'detailsId',
      'factionFilterId',
      'previewContainer',
    ] as const) {
      expect(online[key]).not.toBe(offline[key]);
    }
    // The card selectors must actually be scoped to their panel, or one host's
    // paint would reach into the other's DOM (which is how the offline grid
    // ended up resolving through the online grid's selection).
    expect(online.cards.startsWith('#charcreate-panel ')).toBe(true);
    expect(offline.cards.startsWith('#offline-select ')).toBe(true);
    expect(online.selectedCard).toBe(`${online.cards}.sel`);
    expect(offline.selectedCard).toBe(`${offline.cards}.sel`);
    // The ids the entry documents actually ship.
    expect(offline.detailsId).toBe('offline-class-details');
    expect(offline.previewContainer).toBe('#offline-preview-container');
    expect(online.detailsId).toBe('charcreate-class-details');
    expect(online.previewContainer).toBe('#charcreate-preview-container');
  });

  it('decides "hero roster" from the REALM, never from the host', () => {
    expect(usesRealmHeroRoster('infernal')).toBe(true);
    // Non-roster realms keep their skinned nine-class grid; ClaudeCraft stays
    // stock. Both hosts get the same answer because there is only one answer.
    for (const realmId of ['crypticrealm', 'classic', 'dominion', 'arcane', 'claudecraft']) {
      expect(usesRealmHeroRoster(realmId)).toBe(false);
    }
  });

  it('gives both hosts the same roster and the same faction tabs', () => {
    const realm = getRealm(REALM);
    const factions = presentationFactionsForRealm(realm);
    // Infernal publishes exactly the two sides the faction tabs filter by; with
    // 2+ factions the strip is mandatory or a 30-card roster is unusable.
    expect(factions).toEqual(['Heavenly Host', 'Ashen Court']);
    expect(factions.length).toBeGreaterThan(1);

    // What a host paints: the visible (non-variant) cards of the active faction.
    const visibleCards = (faction: string) =>
      infernalHeroChoicesForRealm(realm)
        .filter((choice) => !choice.variantOf)
        .filter((choice) => choice.faction === faction)
        .map((choice) => choice.name);

    for (const faction of factions) {
      expect(visibleCards(faction).length).toBeGreaterThan(0);
    }
    // The roster the operator reported missing offline.
    const host = visibleCards('Heavenly Host');
    expect(host).toEqual(expect.arrayContaining(['Amazon', 'Barbarian', 'Necromancer']));
    // Every card carries the two things the offline lane needs: a hero id to
    // thread into the Sim and an engine class the Sim can actually run.
    for (const choice of infernalHeroChoicesForRealm(realm)) {
      expect(choice.heroId).toBeTruthy();
      expect(choice.baseClass).toBeTruthy();
    }
  });
});

describe('offline pick carries the hero identity into the world', () => {
  it('reads a hero id off a roster card and nothing off a plain class card', () => {
    expect(pickedRealmHeroId({ heroId: 'infernal-hero-blood-knight' })).toBe(
      'infernal-hero-blood-knight',
    );
    // The nine static engine buttons have no data-hero-id: offline must pass
    // null there so a resumed save's own stored hero id survives.
    expect(pickedRealmHeroId({})).toBeNull();
    expect(pickedRealmHeroId(undefined)).toBeNull();
    expect(pickedRealmHeroId(null)).toBeNull();
    expect(pickedRealmHeroId({ heroId: '' })).toBeNull();
  });

  it('resolves the HERO body once the id reaches the entity, not the class body', () => {
    setBodyOverrides(REALM, {
      'class:paladin': { assetUrl: CLASS_URL },
      'hero:infernal-hero-blood-knight': { assetUrl: HERO_URL },
    });
    // What the offline world does with entity.realmHeroId (SimConfig.realmHeroId
    // -> addPlayer -> overrideEntryForCharacter), and what the preview shows.
    const withHero = visualKeyForCharacter({
      realm: REALM,
      realmHeroId: 'infernal-hero-blood-knight',
      cls: 'paladin',
      gender: 'male',
    });
    expect(VISUALS[withHero]?.url).toBe(HERO_URL);
    // Without the id threaded through, the same pick is a generic paladin -
    // the exact silent downgrade this feature exists to prevent.
    const withoutHero = visualKeyForCharacter({
      realm: REALM,
      realmHeroId: null,
      cls: 'paladin',
      gender: 'male',
    });
    expect(VISUALS[withoutHero]?.url).toBe(CLASS_URL);
  });

  it('keeps a selected hero ahead of generic class sex while honoring its own sex variant', () => {
    setBodyOverrides(REALM, {
      'class:paladin': { assetUrl: CLASS_URL },
      'class:paladin:f': { assetUrl: FEMALE_URL },
      'hero:infernal-hero-blood-knight': { assetUrl: HERO_URL },
      'hero:infernal-hero-blood-knight:f': { assetUrl: HERO_FEMALE_URL },
    });
    // A hero-specific female body wins for this hero. The generic paladin
    // female row must not replace every female hero with the same model.
    expect(
      VISUALS[
        visualKeyForCharacter({
          realm: REALM,
          realmHeroId: 'infernal-hero-blood-knight',
          cls: 'paladin',
          gender: 'female',
        })
      ]?.url,
    ).toBe(HERO_FEMALE_URL);
    expect(
      VISUALS[
        visualKeyForCharacter({
          realm: REALM,
          realmHeroId: 'infernal-hero-blood-knight',
          cls: 'paladin',
          gender: null,
        })
      ]?.url,
    ).toBe(HERO_URL);
  });

  it('falls back within the selected hero before consulting generic class sex', () => {
    setBodyOverrides(REALM, {
      'class:paladin': { assetUrl: CLASS_URL },
      'class:paladin:f': { assetUrl: FEMALE_URL },
      'hero:infernal-hero-blood-knight': { assetUrl: HERO_URL },
    });

    const femaleHero = visualKeyForCharacter({
      realm: REALM,
      realmHeroId: 'infernal-hero-blood-knight',
      cls: 'paladin',
      gender: 'female',
    });
    expect(VISUALS[femaleHero]?.url).toBe(HERO_URL);

    const genericFemale = visualKeyForCharacter({
      realm: REALM,
      realmHeroId: null,
      cls: 'paladin',
      gender: 'female',
    });
    expect(VISUALS[genericFemale]?.url).toBe(FEMALE_URL);
  });
});
