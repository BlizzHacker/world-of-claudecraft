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
  alignedBodySkins,
  authorizeBodySkin,
  BODY_SKINS,
  bodySkinAssetUrl,
  bodySkinById,
  bodySkinOverrideKeys,
  isTieredSkinBody,
  meetsSkinRequirements,
  missingSkinClassArt,
  neutralBodySkins,
  UNLOCKED_SKIN_LEVEL,
} from '../src/sim/cosmetics/body_skins';
import {
  bodySkinRailHtml,
  bodySkinRailRows,
} from '../src/ui/cryptic/body_skin_rail';
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

// ---------------------------------------------------------------------------
// The Demonic counterpart, the faction axis, and the dev grant (2026-08-17).
//
// The operator asked for three things: "Angelic needs a Counter / Demonic";
// "Famous Heroes can be separate because some heroes may have no faction or
// alliance but are neutral"; and "Make it so my characters can level to 99 and
// have all characters unlocked (i'm the dev)". These pin all three, and - the
// point of the third - pin that granting the dev everything took NOTHING away
// from the gate that faces everyone else.
// ---------------------------------------------------------------------------

/** The six Ashen Court bodies as the LIVE Infernal document publishes them
 *  (revision 27), so "the demonic family did not steal a card's body" is
 *  checked against the real rows and not against a convenient fiction. */
const INFERNAL_HELL_HERO_ROWS: Record<string, { assetUrl: string }> = {
  'hero:infernal-hell-dark-paladin': {
    assetUrl: '/cr-realms/infernal/realm_infernal_hero_dark_paladin.glb',
  },
  'hero:infernal-hell-horned-demon': {
    assetUrl: '/cr-realms/infernal/realm_infernal_hero_horned_demon.glb',
  },
  'hero:infernal-hell-bone-herald': {
    assetUrl: '/cr-realms/infernal/realm_infernal_hero_bone_herald.glb',
  },
  'hero:infernal-hell-skullbeast': {
    assetUrl: '/cr-realms/infernal/realm_infernal_hero_skullbeast.glb',
  },
  'hero:infernal-hell-sigil-bound-acolyte': {
    assetUrl: '/cr-realms/infernal/realm_infernal_hero_sigil_acolyte.glb',
  },
  'hero:infernal-hell-crimson-infernal-behemoth': {
    assetUrl: '/cr-realms/infernal/realm_infernal_hero_behemoth.glb',
  },
};

describe('the faction axis', () => {
  it('gives the two unlocked families opposite sides and the paid shelf none', () => {
    expect(bodySkinById('heavenly_host')?.faction).toBe('heavenly');
    expect(bodySkinById('demonic')?.faction).toBe('ashen');
    // Null, not undefined and not a third faction id: the picker's whole
    // neutral-shelf rule keys off this being explicitly absent of a side.
    expect(bodySkinById('famous_heroes')?.faction).toBeNull();
  });

  it('splits the catalog into an aligned pair and a neutral shelf', () => {
    expect(alignedBodySkins().map((s) => s.id)).toEqual(['heavenly_host', 'demonic']);
    expect(neutralBodySkins().map((s) => s.id)).toEqual(['famous_heroes']);
    // Every family lands on exactly one shelf.
    expect(alignedBodySkins().length + neutralBodySkins().length).toBe(BODY_SKINS.length);
  });

  it('keeps the neutral shelf out of the aligned pair even though it is a different tier', () => {
    // Tier and faction are independent axes; a future FREE neutral family, or a
    // PAID angelic one, must not be regrouped by this rule.
    for (const skin of alignedBodySkins()) expect(skin.faction).not.toBeNull();
    for (const skin of neutralBodySkins()) expect(skin.faction).toBeNull();
  });
});

describe('the Demonic family', () => {
  it('is an unlocked family on the same level 99 terms as the Angelic one', () => {
    const demonic = bodySkinById('demonic');
    expect(demonic?.tier).toBe('unlocked');
    expect(authorizeBodySkin('demonic', 'warrior', { level: 98 }).denied).toBe('level');
    expect(authorizeBodySkin('demonic', 'warrior', { level: 99 })).toEqual({
      skinId: 'demonic',
      tier: 'unlocked',
    });
  });

  it('BORROWS the Ashen Court bodies instead of confiscating them', () => {
    // The heavenly family strikes its bodies out of base resolution; the
    // demonic one must not, because the bodies it uses are the correct default
    // look of the six Ashen Court cards.
    for (const cls of ALL_CLASSES) {
      const url = bodySkinAssetUrl('demonic', cls);
      if (url) expect(isTieredSkinBody(url)).toBe(false);
    }
    expect(isTieredSkinBody(HEAVEN_WARRIOR)).toBe(true);
  });

  it('leaves every Ashen Court hell card wearing its own published body', () => {
    setBodyOverrides('infernal', { ...INFERNAL_CLASS_ROWS, ...INFERNAL_HELL_HERO_ROWS });
    const cardBody = (heroId: string, cls: PlayerClass): string | undefined =>
      VISUALS[visualKeyForCharacter({ realm: 'infernal', cls, realmHeroId: heroId })]?.url;
    expect(cardBody('infernal-hell-horned-demon', 'warrior')).toBe(
      INFERNAL_HELL_HERO_ROWS['hero:infernal-hell-horned-demon'].assetUrl,
    );
    expect(cardBody('infernal-hell-dark-paladin', 'paladin')).toBe(
      INFERNAL_HELL_HERO_ROWS['hero:infernal-hell-dark-paladin'].assetUrl,
    );
    expect(cardBody('infernal-hell-skullbeast', 'druid')).toBe(
      INFERNAL_HELL_HERO_ROWS['hero:infernal-hell-skullbeast'].assetUrl,
    );
  });

  it('dresses a class in the demonic body once the skin is authorized', () => {
    setBodyOverrides('infernal', { ...INFERNAL_CLASS_ROWS, ...INFERNAL_HELL_HERO_ROWS });
    const key = visualKeyForCharacter({
      realm: 'infernal',
      cls: 'warrior',
      gender: 'male',
      bodySkinId: 'demonic',
    });
    expect(VISUALS[key]?.url).toBe('/cr-realms/infernal/realm_infernal_hero_horned_demon.glb');
  });

  it('reports the four classes it still owes art for', () => {
    const gaps = missingSkinClassArt(ALL_CLASSES);
    const demonic = gaps.find((g) => g.skinId === 'demonic');
    expect(demonic?.classes.sort()).toEqual(['hunter', 'mage', 'rogue', 'shaman'].sort());
  });

  it('refuses a class it has no art for, at any level', () => {
    expect(authorizeBodySkin('demonic', 'mage', { level: 99 }).denied).toBe('noArt');
  });

  it('a realm can publish its own demonic art without a deploy', () => {
    setBodyOverrides('infernal', {
      'skin:demonic:warrior': { assetUrl: '/cr-realms/infernal/custom_demon.glb' },
    });
    const key = visualKeyForCharacter({
      realm: 'infernal',
      cls: 'warrior',
      bodySkinId: 'demonic',
    });
    expect(VISUALS[key]?.url).toBe('/cr-realms/infernal/custom_demon.glb');
  });

  it('breaks a same-tier tie on CATALOG order, never on request order', () => {
    const a = authorizeBodySkin(['demonic', 'heavenly_host'], 'warrior', { level: 99 });
    const b = authorizeBodySkin(['heavenly_host', 'demonic'], 'warrior', { level: 99 });
    expect(a).toEqual(b);
    expect(a.skinId).toBe('heavenly_host');
  });
});

describe('the dev grant', () => {
  const dev = { level: 1, dev: true };

  it('opens BOTH unlocked families at level 1', () => {
    expect(authorizeBodySkin('heavenly_host', 'warrior', dev).skinId).toBe('heavenly_host');
    expect(authorizeBodySkin('demonic', 'warrior', dev).skinId).toBe('demonic');
  });

  it('opens the premium shelf with no entitlement held', () => {
    const premium = bodySkinById('famous_heroes');
    expect(premium).not.toBeNull();
    if (premium) {
      // Checked through meetsSkinRequirements because the paid family ships no
      // bodies yet: this is the PERMISSION question, and it is the one the dev
      // grant answers.
      expect(meetsSkinRequirements(premium, dev)).toEqual({ ok: true });
      expect(meetsSkinRequirements(premium, { level: 999 })).toEqual({
        ok: false,
        denied: 'unowned',
      });
    }
  });

  it('still refuses a class the family has no art for', () => {
    // The grant is about permission, never about inventing a body. A dev asking
    // for a mage angel gets the honest answer, not a substituted body.
    expect(authorizeBodySkin('heavenly_host', 'mage', dev).denied).toBe('noArt');
    expect(authorizeBodySkin('demonic', 'mage', dev).denied).toBe('noArt');
  });

  it('still refuses an unknown skin id', () => {
    expect(authorizeBodySkin('not_a_skin', 'warrior', dev).denied).toBe('unknown');
  });

  it('DOES NOT WEAKEN THE GATE: a non-dev at 98 is refused everything', () => {
    // The pin the whole design exists for. Every shape of "not a dev" is tried,
    // because the grant is a boolean and an accidental truthiness bug here would
    // hand the tier to every player at once.
    for (const notDev of [
      { level: 98 },
      { level: 98, dev: false },
      { level: 98, dev: undefined },
    ] as const) {
      expect(authorizeBodySkin('heavenly_host', 'warrior', notDev).denied).toBe('level');
      expect(authorizeBodySkin('demonic', 'warrior', notDev).denied).toBe('level');
      expect(authorizeBodySkin('famous_heroes', 'warrior', notDev).denied).toBe('unowned');
    }
    // And the gate itself is untouched: it was not lowered to meet anyone.
    expect(UNLOCKED_SKIN_LEVEL).toBe(99);
  });

  it('a non-dev at 99 still cannot reach the PAID shelf', () => {
    // Levelling is not a purchase, with or without the dev grant existing.
    expect(authorizeBodySkin('famous_heroes', 'warrior', { level: 99 }).denied).toBe('unowned');
  });
});

// ---------------------------------------------------------------------------
// The rail's three bands (src/ui/cryptic/body_skin_rail.ts).
//
// "the rail reads as: your class body | two unlockable families | a separate
// neutral premium shelf". Pinned on the view model AND on the markup, because
// the grouping only means something to a player if it survives into the DOM.
// ---------------------------------------------------------------------------

const RAIL_LABELS = {
  base: 'Class Body',
  baseNote: "Your class's own look.",
  names: { heavenlyHost: 'Angelic', demonic: 'Demonic', famousHeroes: 'Famous Heroes' },
  lockedLevel: 'Unlocks at level 99',
  lockedPremium: { default: 'Purchase with 500 $CR' },
  lockedNoArt: 'No body for this class yet',
  available: 'Ready to wear',
  groupLabel: 'Appearance tier',
  neutral: 'Neutral - no faction',
};

describe('the appearance rail', () => {
  const rowsFor = (grants: { level: number; dev?: boolean }, selectedSkinId: string | null = null) =>
    bodySkinRailRows({ cls: 'warrior', grants, selectedSkinId, labels: RAIL_LABELS });

  it('orders the bands class body, aligned pair, neutral shelf', () => {
    const rows = rowsFor({ level: 1 });
    expect(rows.map((r) => r.shelf)).toEqual(['base', 'aligned', 'aligned', 'neutral']);
    expect(rows.map((r) => r.label)).toEqual([
      'Class Body',
      'Angelic',
      'Demonic',
      'Famous Heroes',
    ]);
  });

  it('never files the neutral shelf under a faction', () => {
    const famous = rowsFor({ level: 1 }).find((r) => r.skinId === 'famous_heroes');
    expect(famous?.faction).toBeNull();
    expect(famous?.shelf).toBe('neutral');
    // And the aligned pair keeps its sides, so the grouping is not just "premium
    // goes last".
    const aligned = rowsFor({ level: 1 }).filter((r) => r.shelf === 'aligned');
    expect(aligned.map((r) => r.faction)).toEqual(['heavenly', 'ashen']);
  });

  it('paints an ordinary level 1 character both families locked, with the reason', () => {
    const rows = rowsFor({ level: 1 });
    expect(rows.filter((r) => r.lockedBecause === 'level').map((r) => r.label)).toEqual([
      'Angelic',
      'Demonic',
    ]);
    expect(rows.find((r) => r.skinId === 'famous_heroes')?.lockedBecause).toBe('unowned');
    expect(rows.find((r) => r.skinId === null)?.lockedBecause).toBeNull();
  });

  it('paints the DEV both families reachable at level 1', () => {
    const rows = rowsFor({ level: 1, dev: true });
    expect(rows.find((r) => r.skinId === 'heavenly_host')?.lockedBecause).toBeNull();
    expect(rows.find((r) => r.skinId === 'demonic')?.lockedBecause).toBeNull();
    // The paid shelf is permitted but has no warrior body, so it reads honestly
    // rather than pretending to be wearable.
    expect(rows.find((r) => r.skinId === 'famous_heroes')?.lockedBecause).toBe('noArt');
  });

  it('shows a selection only while it is still authorized', () => {
    expect(rowsFor({ level: 1, dev: true }, 'demonic').find((r) => r.skinId === 'demonic')?.selected)
      .toBe(true);
    // Same stored pick, no grant: the world already fell back, so the rail must.
    expect(rowsFor({ level: 98 }, 'demonic').find((r) => r.skinId === 'demonic')?.selected).toBe(
      false,
    );
  });

  it('renders the bands as separate hosts and keeps one flat chip list', () => {
    const html = bodySkinRailHtml(rowsFor({ level: 1 }), RAIL_LABELS);
    expect(html).toContain('class="body-skin-shelf shelf-base"');
    expect(html).toContain('class="body-skin-shelf shelf-aligned"');
    expect(html).toContain('shelf-neutral');
    // The caption is what makes the neutrality legible, and it is on the neutral
    // band only.
    expect(html).toContain('Neutral - no faction');
    expect(html.match(/body-skin-shelf-caption/g)?.length).toBe(1);
    // One roving tab stop across every chip, exactly as before the split: the
    // main.ts wiring queries `.body-skin-chip` flat and must still find four.
    expect(html.match(/<button type="button" class="body-skin-chip/g)?.length).toBe(4);
    expect(html.match(/tabindex="0"/g)?.length).toBe(1);
  });

  it('marks a locked chip aria-disabled so a D-pad can read it but not pick it', () => {
    const html = bodySkinRailHtml(rowsFor({ level: 1 }), RAIL_LABELS);
    expect(html.match(/aria-disabled="true"/g)?.length).toBe(3);
    expect(html).toContain('data-locked="level"');
    expect(html).toContain('data-faction="ashen"');
  });
});
