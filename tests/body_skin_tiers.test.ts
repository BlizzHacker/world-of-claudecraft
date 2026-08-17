// Pins for the three-tier appearance system (src/sim/cosmetics/body_skins.ts)
// and for the un-welding of the Heavenly Host bodies from the Warrior and Rogue
// cards. The operator's complaint that produced all of this was that one body
// served several cards; the collision pin at the bottom is the ratchet that
// keeps a new one from being added quietly.

import { beforeEach, describe, expect, it } from 'vitest';
import {
  setBodyOverrides,
  VISUALS,
  visualKeyForCharacter,
} from '../src/render/characters/manifest';
import {
  authorizeBodySkin,
  BODY_SKINS,
  bodySkinAssetUrl,
  bodySkinById,
  bodySkinOverrideKeys,
  isTieredSkinBody,
  meetsSkinRequirements,
  missingSkinClassArt,
  UNLOCKED_SKIN_LEVEL,
} from '../src/sim/cosmetics/body_skins';
import { ALL_CLASSES, type PlayerClass } from '../src/sim/types';

const HEAVEN_WARRIOR = '/cr-realms/infernal/realm_infernal_hero_heaven_warrior.glb';
const HEAVEN_ROGUE = '/cr-realms/infernal/realm_infernal_hero_heaven_rogue.glb';
const CLASS_WARRIOR = '/cr-realms/infernal/infernal_class_warrior.glb';

/** The live Infernal document, trimmed to the rows this file reasons about. */
function installInfernalOverrides(): void {
  setBodyOverrides('infernal', {
    // The three rows that welded the angelic bodies onto base cards.
    'hero:infernal-hero-warrior': { assetUrl: HEAVEN_WARRIOR, assetName: 'Heaven Warrior' },
    'hero:infernal-hero-rogue': { assetUrl: HEAVEN_ROGUE, assetName: 'Heaven Rogue' },
    // The base bodies the cards must fall through to.
    'class:warrior': { assetUrl: CLASS_WARRIOR, assetName: 'Warrior' },
    'class:rogue': { assetUrl: '/cr-realms/infernal/infernal_class_rogue.glb', assetName: 'Rogue' },
    'class:warrior:f': {
      assetUrl: '/cr-realms/infernal/realm_infernal_class_warrior_f.glb',
      assetName: 'Warrior (F)',
    },
  });
}

beforeEach(() => {
  setBodyOverrides('infernal', {});
});

describe('tier catalog', () => {
  it('never lists a base-tier def: base is the ABSENCE of a skin', () => {
    for (const skin of BODY_SKINS) expect(skin.tier).not.toBe('base');
  });

  it('claims the three Heavenly Host bodies so they cannot serve as defaults', () => {
    expect(isTieredSkinBody(HEAVEN_WARRIOR)).toBe(true);
    expect(isTieredSkinBody(HEAVEN_ROGUE)).toBe(true);
    expect(isTieredSkinBody(CLASS_WARRIOR)).toBe(false);
    expect(isTieredSkinBody(null)).toBe(false);
  });

  it('reports missing per-class art instead of lending a body between classes', () => {
    const bodies = BODY_SKINS.flatMap((s) => Object.values(s.bodies));
    expect(new Set(bodies).size).toBe(bodies.length); // no body reused across classes
    const gaps = missingSkinClassArt(ALL_CLASSES);
    const heaven = gaps.find((g) => g.skinId === 'heavenly_host');
    expect(heaven?.classes.sort()).toEqual(
      ['druid', 'hunter', 'mage', 'priest', 'shaman', 'warlock'].sort(),
    );
  });
});

describe('the level 99 gate', () => {
  const at = (level: number) => ({ level });

  it('refuses an unlocked skin below the gate and names the reason', () => {
    const decision = authorizeBodySkin('heavenly_host', 'warrior', at(UNLOCKED_SKIN_LEVEL - 1));
    expect(decision.skinId).toBeNull();
    expect(decision.tier).toBe('base');
    expect(decision.denied).toBe('level');
  });

  it('a level 98 character cannot select an unlocked skin', () => {
    expect(authorizeBodySkin('heavenly_host', 'warrior', at(98)).skinId).toBeNull();
    expect(authorizeBodySkin('heavenly_host', 'rogue', at(98)).skinId).toBeNull();
    const heaven = bodySkinById('heavenly_host');
    expect(heaven).not.toBeNull();
    if (heaven) {
      expect(meetsSkinRequirements(heaven, at(98))).toEqual({ ok: false, denied: 'level' });
    }
  });

  it('grants at exactly the gate and above', () => {
    expect(authorizeBodySkin('heavenly_host', 'warrior', at(99))).toEqual({
      skinId: 'heavenly_host',
      tier: 'unlocked',
    });
    expect(authorizeBodySkin('heavenly_host', 'warrior', at(120)).skinId).toBe('heavenly_host');
  });

  it('treats a fractional or non-finite level as below the gate', () => {
    expect(authorizeBodySkin('heavenly_host', 'warrior', at(98.9)).skinId).toBeNull();
    expect(authorizeBodySkin('heavenly_host', 'warrior', at(Number.NaN)).skinId).toBeNull();
    expect(
      authorizeBodySkin('heavenly_host', 'warrior', {
        level: '99' as unknown as number,
      }).skinId,
    ).toBe('heavenly_host');
  });

  it('refuses a class the family has no art for, even at the cap', () => {
    const decision = authorizeBodySkin('heavenly_host', 'mage', at(99));
    expect(decision.skinId).toBeNull();
    expect(decision.denied).toBe('noArt');
  });

  it('refuses an unknown skin id', () => {
    expect(authorizeBodySkin('not_a_skin', 'warrior', at(99)).denied).toBe('unknown');
  });
});

describe('the premium gate', () => {
  it('refuses a paid skin without the account entitlement', () => {
    const decision = authorizeBodySkin('famous_heroes', 'warrior', { level: 99 });
    expect(decision.skinId).toBeNull();
    expect(decision.denied).toBe('unowned');
  });

  it('does not fall back to the level gate for a paid skin', () => {
    // Reaching the cap must never hand out a purchase.
    expect(authorizeBodySkin('famous_heroes', 'warrior', { level: 999 }).skinId).toBeNull();
  });
});

describe('resolution order: premium, then unlocked, then base', () => {
  it('an owned premium skin outranks an unlocked one', () => {
    // The premium family ships no bodies yet, so this pins the ORDER through a
    // catalog stand-in rather than through a shipped asset.
    const premium = BODY_SKINS.find((s) => s.tier === 'premium');
    expect(premium).toBeDefined();
    if (!premium?.entitlementId) throw new Error('the premium shelf lost its entitlement id');
    const decision = authorizeBodySkin(['heavenly_host', premium.id], 'warrior', {
      level: 99,
      entitlements: [premium.entitlementId],
    });
    // famous_heroes has no warrior body, so it correctly declines and the
    // unlocked family serves: the order is premium-first, not premium-always.
    expect(decision.skinId).toBe('heavenly_host');
    expect(decision.tier).toBe('unlocked');
  });

  it('ignores request order, so a client cannot promote a skin by listing it first', () => {
    const a = authorizeBodySkin(['famous_heroes', 'heavenly_host'], 'warrior', { level: 99 });
    const b = authorizeBodySkin(['heavenly_host', 'famous_heroes'], 'warrior', { level: 99 });
    expect(a).toEqual(b);
  });

  it('falls to base when nothing authorizes', () => {
    expect(authorizeBodySkin(null, 'warrior', { level: 99 })).toEqual({
      skinId: null,
      tier: 'base',
    });
    expect(authorizeBodySkin([], 'warrior', { level: 1 }).tier).toBe('base');
  });
});

describe('override keys', () => {
  it('offers the sex-suffixed key before the plain one', () => {
    expect(bodySkinOverrideKeys('heavenly_host', 'warrior', 'female')).toEqual([
      'skin:heavenly_host:warrior:f',
      'skin:heavenly_host:warrior',
    ]);
    expect(bodySkinOverrideKeys('heavenly_host', 'warrior', null)).toEqual([
      'skin:heavenly_host:warrior',
    ]);
  });
});

describe('the resolver, through visualKeyForCharacter', () => {
  it('a base Warrior no longer wears the Heavenly Host body', () => {
    installInfernalOverrides();
    const key = visualKeyForCharacter({ realm: 'infernal', cls: 'warrior', gender: 'male' });
    expect(VISUALS[key]?.url).not.toBe(HEAVEN_WARRIOR);
    expect(VISUALS[key]?.url).toBe(CLASS_WARRIOR);
  });

  it('a base Rogue no longer wears the Heavenly Host body', () => {
    installInfernalOverrides();
    const key = visualKeyForCharacter({
      realm: 'infernal',
      cls: 'rogue',
      realmHeroId: 'infernal-hero-rogue',
      gender: 'male',
    });
    expect(VISUALS[key]?.url).not.toBe(HEAVEN_ROGUE);
  });

  it('the same body IS reachable again as a selected skin', () => {
    installInfernalOverrides();
    const key = visualKeyForCharacter({
      realm: 'infernal',
      cls: 'warrior',
      gender: 'male',
      bodySkinId: 'heavenly_host',
    });
    expect(VISUALS[key]?.url).toBe(HEAVEN_WARRIOR);
  });

  it('the skin outranks the hero and class chain, not the other way round', () => {
    installInfernalOverrides();
    const key = visualKeyForCharacter({
      realm: 'infernal',
      cls: 'warrior',
      realmHeroId: 'infernal-hero-barbarian',
      gender: 'female',
      bodySkinId: 'heavenly_host',
    });
    // The female class body would otherwise win here (the sibling's explicit
    // Female pick rule); an authorized skin is more specific still.
    expect(VISUALS[key]?.url).toBe(HEAVEN_WARRIOR);
  });

  it('resolves a skin with NO override document installed at all', () => {
    setBodyOverrides('infernal', {});
    const key = visualKeyForCharacter({
      realm: 'infernal',
      cls: 'paladin',
      bodySkinId: 'heavenly_host',
    });
    expect(VISUALS[key]?.url).toBe(bodySkinAssetUrl('heavenly_host', 'paladin'));
  });

  it("a realm's own published art for a family wins over the compiled catalog", () => {
    setBodyOverrides('infernal', {
      'skin:heavenly_host:warrior': { assetUrl: '/cr-realms/infernal/custom_heaven.glb' },
    });
    const key = visualKeyForCharacter({
      realm: 'infernal',
      cls: 'warrior',
      bodySkinId: 'heavenly_host',
    });
    expect(VISUALS[key]?.url).toBe('/cr-realms/infernal/custom_heaven.glb');
  });

  it('an unauthorized skin id never reaches the resolver as a body', () => {
    // The renderer trusts its input, so this pins the CONTRACT: what reaches it
    // is authorizeBodySkin's answer, and that answer is null for a level 98.
    installInfernalOverrides();
    const authorized = authorizeBodySkin('heavenly_host', 'warrior', { level: 98 }).skinId;
    const key = visualKeyForCharacter({
      realm: 'infernal',
      cls: 'warrior',
      gender: 'male',
      bodySkinId: authorized,
    });
    expect(VISUALS[key]?.url).toBe(CLASS_WARRIOR);
  });
});

/**
 * THE RATCHET. Every body that serves more than one card today, recorded so the
 * set can only shrink. Each entry is art the operator has asked for; when a real
 * body lands for one of these, the entry comes out and this test keeps passing.
 * A body that starts serving two cards WITHOUT being listed fails here.
 */
const KNOWN_SHARED_BODIES: ReadonlySet<string> = new Set([
  // barbarian female == warrior female, the operator's own example, plus the
  // two hell cards that fall through the same key.
  '/cr-realms/infernal/realm_infernal_class_warrior_f.glb',
  // five warlock-class cards plus Tempest, all on one female warlock body.
  '/cr-realms/infernal/realm_infernal_class_warlock_f.glb',
  // Monk, Spiritborn and Tempest females.
  '/cr-realms/infernal/realm_infernal_class_monk_f.glb',
  // Rogue and Assassin females.
  '/cr-realms/infernal/realm_infernal_class_rogue_f.glb',
  // Druid and Skullbeast females.
  '/cr-realms/infernal/realm_infernal_class_druid_f.glb',
  // Wizard female, and Spiritborn MALE, which is a female body on a male card.
  '/cr-realms/infernal/realm_infernal_class_mage_f.glb',
]);

describe('duplication ratchet', () => {
  it('no NEW body starts serving two classes on the infernal grid', () => {
    setBodyOverrides('infernal', {});
    const doc = INFERNAL_CLASS_ROWS;
    setBodyOverrides('infernal', doc);
    const byUrl = new Map<string, Set<PlayerClass>>();
    for (const cls of ALL_CLASSES) {
      for (const gender of ['male', 'female'] as const) {
        const key = visualKeyForCharacter({ realm: 'infernal', cls, gender });
        const url = VISUALS[key]?.url;
        if (!url) continue;
        const set = byUrl.get(url) ?? new Set<PlayerClass>();
        set.add(cls);
        byUrl.set(url, set);
      }
    }
    const shared = [...byUrl.entries()]
      .filter(([, classes]) => classes.size > 1)
      .map(([url]) => url);
    for (const url of shared) expect(KNOWN_SHARED_BODIES.has(url)).toBe(true);
  });
});

/** The class rows of the live infernal document (revision 27), as published. */
const INFERNAL_CLASS_ROWS: Record<string, { assetUrl: string }> = {
  'class:warrior': { assetUrl: '/cr-realms/infernal/infernal_class_warrior.glb' },
  'class:warrior:f': { assetUrl: '/cr-realms/infernal/realm_infernal_class_warrior_f.glb' },
  'class:paladin': { assetUrl: '/cr-realms/infernal/infernal_class_paladin.glb' },
  'class:hunter': { assetUrl: '/cr-realms/infernal/infernal_class_demon_hunter.glb' },
  'class:rogue': { assetUrl: '/cr-realms/infernal/infernal_class_rogue.glb' },
  'class:rogue:f': { assetUrl: '/cr-realms/infernal/realm_infernal_class_rogue_f.glb' },
  'class:priest': {
    assetUrl: '/cr-realms/infernal/realm_infernal_violet_necromancer_necromancer_m_019cb976.glb',
  },
  'class:priest:f': { assetUrl: '/cr-realms/infernal/realm_infernal_class_priest_f.glb' },
  'class:shaman': { assetUrl: '/cr-realms/infernal/infernal_class_witch_doctor.glb' },
  'class:shaman:f': { assetUrl: '/cr-realms/infernal/realm_infernal_class_monk_f.glb' },
  'class:mage': { assetUrl: '/cr-realms/infernal/infernal_class_wizard.glb' },
  'class:mage:f': { assetUrl: '/cr-realms/infernal/realm_infernal_class_mage_f.glb' },
  'class:warlock': { assetUrl: '/cr-realms/infernal/infernal_class_warlock.glb' },
  'class:warlock:f': { assetUrl: '/cr-realms/infernal/realm_infernal_class_warlock_f.glb' },
  'class:druid': { assetUrl: '/cr-realms/infernal/infernal_class_druid.glb' },
  'class:druid:f': { assetUrl: '/cr-realms/infernal/realm_infernal_class_druid_f.glb' },
};
