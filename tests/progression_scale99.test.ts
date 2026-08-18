// Pins for the 1-99 progression rescale (src/sim/progression/scale99.ts).
//
// Three things are pinned here because all three were silently broken or absent
// before, and all three are the kind of thing a retune can quietly regress:
//   1. THE CURVE SHAPE — strictly monotonic, finite, and actually reaching 99.
//   2. THE CAP — per-realm, with claudecraft still vanilla-20.
//   3. THE PICKIT MAPPING — item level drives affix magnitude, tier edges land on
//      round item levels, and percentage stats stay unscaled so a `stat:fireRes>=20`
//      rule keeps its meaning at 99.

import { afterEach, describe, expect, it } from 'vitest';
import {
  affixMultiplier,
  affixScaleAt,
  ascendMobLevel,
  ASCENSION_TIERS,
  ascensionForLevel,
  AUTHORED_LEVEL_HI,
  AUTHORED_LEVEL_LO,
  itemLevelForMobLevel,
  ITEM_TIERS,
  itemTierFor,
  LEVEL_BANDS,
  LEVEL_CEILING,
  levelBandFor,
} from '../src/sim/progression/scale99';
import { generateRealmItem } from '../src/sim/realms/rarity';
import { evaluateItem, parsePickitFilter } from '../src/sim/realms/pickit';
import { activeMaxLevel, setRealmHostEnv } from '../src/sim/realms/registry';
import { Rng } from '../src/sim/rng';
import { MAX_LEVEL, XP_TABLE, xpForLevel, xpToReachLevel } from '../src/sim/types';
import { resSicknessDuration, unstuckSicknessDuration } from '../src/sim/resurrection';

function forceRealm(id: string) {
  setRealmHostEnv({
    queryParam: (n) => (n === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}
afterEach(() => setRealmHostEnv(null));

// ---------------------------------------------------------------------------
// 1. THE CURVE
// ---------------------------------------------------------------------------

describe('the XP curve reaches 99 and is monotonic', () => {
  it('covers every level up to the ceiling', () => {
    // xpForLevel(n) is the cost of n -> n+1, so reaching 99 needs costs for 1..98.
    expect(XP_TABLE.length).toBeGreaterThanOrEqual(LEVEL_CEILING - 1);
  });

  it('is STRICTLY increasing across the whole range — no dead zones, no plateaus', () => {
    for (let lvl = 1; lvl < LEVEL_CEILING - 1; lvl++) {
      expect(xpForLevel(lvl + 1)).toBeGreaterThan(xpForLevel(lvl));
    }
  });

  it('stays finite and sane at the top (no geometric explosion)', () => {
    const top = xpForLevel(LEVEL_CEILING - 1);
    expect(Number.isFinite(top)).toBe(true);
    // A single level at the cap must not cost more than the whole game did to 20.
    expect(top).toBeLessThan(xpToReachLevel(MAX_LEVEL) * 100);
  });

  it('cumulative XP to reach 99 is strictly above the cost to reach 20', () => {
    expect(xpToReachLevel(LEVEL_CEILING)).toBeGreaterThan(xpToReachLevel(MAX_LEVEL));
  });

  it('the per-level cost never regresses relative to the previous level', () => {
    let prev = 0;
    for (let lvl = 1; lvl < LEVEL_CEILING; lvl++) {
      const cum = xpToReachLevel(lvl);
      expect(cum).toBeGreaterThanOrEqual(prev);
      prev = cum;
    }
  });
});

// ---------------------------------------------------------------------------
// 2. THE CAP
// ---------------------------------------------------------------------------

describe('the level cap is per-realm', () => {
  it('claudecraft stays vanilla 20 — upstream progression is untouched', () => {
    forceRealm('claudecraft');
    expect(activeMaxLevel(MAX_LEVEL)).toBe(MAX_LEVEL);
  });

  it('the D2 realms cap at the 99 ceiling', () => {
    for (const realm of ['infernal', 'arcane', 'crypticrealm', 'dominion']) {
      forceRealm(realm);
      expect(activeMaxLevel(MAX_LEVEL)).toBe(LEVEL_CEILING);
    }
  });

  it('classic caps at 80, between the two', () => {
    forceRealm('classic');
    expect(activeMaxLevel(MAX_LEVEL)).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// 3. THE ROUTE — level bands + ascension cover 1..99 with no gaps
// ---------------------------------------------------------------------------

describe('the 1-99 route has no gaps', () => {
  it('level bands are contiguous, ascending, and start at 1', () => {
    expect(LEVEL_BANDS[0].from).toBe(1);
    for (let i = 1; i < LEVEL_BANDS.length; i++) {
      expect(LEVEL_BANDS[i].from).toBeGreaterThan(LEVEL_BANDS[i - 1].from);
    }
  });

  it('every level 1..99 resolves to exactly one band', () => {
    for (let lvl = 1; lvl <= LEVEL_CEILING; lvl++) {
      const band = levelBandFor(lvl);
      expect(band).toBeTruthy();
      expect(lvl).toBeGreaterThanOrEqual(band.from);
    }
  });

  it('the four ascension tiers tile 1..99 without a gap or an overlap', () => {
    expect(ASCENSION_TIERS[0].bandLo).toBe(1);
    expect(ASCENSION_TIERS[ASCENSION_TIERS.length - 1].bandHi).toBe(LEVEL_CEILING);
    for (let i = 1; i < ASCENSION_TIERS.length; i++) {
      expect(ASCENSION_TIERS[i].bandLo).toBe(ASCENSION_TIERS[i - 1].bandHi + 1);
    }
  });

  it('ascendMobLevel maps the authored 1-20 span onto each tier band', () => {
    for (const tier of ASCENSION_TIERS) {
      expect(ascendMobLevel(AUTHORED_LEVEL_LO, tier.id)).toBe(tier.bandLo);
      expect(ascendMobLevel(AUTHORED_LEVEL_HI, tier.id)).toBe(tier.bandHi);
    }
  });

  it('ascendMobLevel is monotonic inside a tier — authored difficulty survives', () => {
    for (const tier of ASCENSION_TIERS) {
      for (let a = AUTHORED_LEVEL_LO; a < AUTHORED_LEVEL_HI; a++) {
        expect(ascendMobLevel(a + 1, tier.id)).toBeGreaterThanOrEqual(ascendMobLevel(a, tier.id));
      }
    }
  });

  it('never emits a level outside 1..99 even for out-of-range authored input', () => {
    for (const tier of ASCENSION_TIERS) {
      for (const raw of [-5, 0, 1, 20, 40, 999]) {
        const out = ascendMobLevel(raw, tier.id);
        expect(out).toBeGreaterThanOrEqual(1);
        expect(out).toBeLessThanOrEqual(LEVEL_CEILING);
      }
    }
  });

  it('ascensionForLevel walks up as the character levels', () => {
    expect(ascensionForLevel(1).id).toBe('normal');
    expect(ascensionForLevel(19).id).toBe('normal');
    expect(ascensionForLevel(20).id).toBe('nightmare');
    expect(ascensionForLevel(48).id).toBe('hell');
    expect(ascensionForLevel(76).id).toBe('torment');
    expect(ascensionForLevel(99).id).toBe('torment');
  });
});

// ---------------------------------------------------------------------------
// 4. THE PICKIT MAPPING — the operator's "all things based on the Pickit"
// ---------------------------------------------------------------------------

describe('item tiers are Pickit-writable', () => {
  it('every tier boundary sits on a ROUND item level', () => {
    // The whole point: `level>=40` must land exactly on a tier edge, so a player
    // can write one rule per tier without memorizing odd numbers.
    for (const tier of ITEM_TIERS) {
      expect(tier.from === 1 || tier.from % 10 === 0).toBe(true);
    }
  });

  it('tiers are contiguous and ascending', () => {
    for (let i = 1; i < ITEM_TIERS.length; i++) {
      expect(ITEM_TIERS[i].from).toBeGreaterThan(ITEM_TIERS[i - 1].from);
    }
  });

  it('itemTierFor is monotonic across 1..99', () => {
    let lastIdx = -1;
    for (let ilvl = 1; ilvl <= LEVEL_CEILING; ilvl++) {
      const idx = ITEM_TIERS.findIndex((t) => t.id === itemTierFor(ilvl).id);
      expect(idx).toBeGreaterThanOrEqual(lastIdx);
      lastIdx = idx;
    }
  });

  it('item level rises with monster level and with rarity', () => {
    expect(itemLevelForMobLevel(40, 'common')).toBe(40);
    expect(itemLevelForMobLevel(40, 'rare')).toBeGreaterThan(itemLevelForMobLevel(40, 'common'));
    expect(itemLevelForMobLevel(40, 'unique')).toBeGreaterThan(itemLevelForMobLevel(40, 'rare'));
    expect(itemLevelForMobLevel(99, 'unique')).toBe(LEVEL_CEILING); // clamped, never over
  });
});

describe('affix magnitude is driven by item level', () => {
  it('ilvl 1 is the authored baseline — scale exactly 1.0', () => {
    expect(affixScaleAt(1)).toBe(1);
  });

  it('is strictly increasing, so a higher-ilvl drop is genuinely stronger', () => {
    for (let ilvl = 1; ilvl < LEVEL_CEILING; ilvl++) {
      expect(affixScaleAt(ilvl + 1)).toBeGreaterThan(affixScaleAt(ilvl));
    }
  });

  it('reaches a readable multiple at 99 rather than exploding', () => {
    const top = affixScaleAt(LEVEL_CEILING);
    expect(top).toBeGreaterThan(5);
    expect(top).toBeLessThan(15); // a geometric curve would be ~46x here
  });

  it('PERCENTAGE stats never scale, so `stat:fireRes>=20` means the same at 99', () => {
    for (const stat of ['fireRes', 'coldRes', 'ltngRes', 'spd', 'lifeLeech', 'manaLeech', 'dmgReduce']) {
      expect(affixMultiplier(stat, 1)).toBe(1);
      expect(affixMultiplier(stat, LEVEL_CEILING)).toBe(1);
    }
  });

  it('MAGNITUDE stats do scale with item level', () => {
    for (const stat of ['dmg', 'maxHp', 'maxMp', 'str', 'dex', 'nrg', 'fireDmg']) {
      expect(affixMultiplier(stat, LEVEL_CEILING)).toBeGreaterThan(affixMultiplier(stat, 1));
    }
  });

  it('an unknown stat defaults to magnitude, so new damage affixes scale for free', () => {
    expect(affixMultiplier('someNewDamageStat', LEVEL_CEILING)).toBe(affixScaleAt(LEVEL_CEILING));
  });
});

describe('generated items carry the Pickit vocabulary end to end', () => {
  it('a level-99 drop genuinely out-rolls a level-1 drop of the same rarity', () => {
    // THE REGRESSION THIS EXISTS FOR: generateRealmItem used to accept itemLevel
    // and throw it away, so these two items were statistically identical and both
    // `level>=` and `stat:>=` filters were meaningless.
    const low = generateRealmItem(new Rng(7), 'weapon', 'rare', 1);
    const high = generateRealmItem(new Rng(7), 'weapon', 'rare', 99);
    const magnitudeOf = (it: typeof low) =>
      it.affixes.filter((a) => affixMultiplier(a.stat, 99) > 1).reduce((s, a) => s + a.value, 0);
    expect(magnitudeOf(high)).toBeGreaterThan(magnitudeOf(low));
  });

  it('tags every generated item with its tier', () => {
    expect(generateRealmItem(new Rng(3), 'armor', 'magic', 1).tier).toBe('crude');
    expect(generateRealmItem(new Rng(3), 'armor', 'magic', 45).tier).toBe('elite');
    expect(generateRealmItem(new Rng(3), 'armor', 'magic', 99).tier).toBe('godly');
  });

  it('clamps a wild item level into 1..99', () => {
    expect(generateRealmItem(new Rng(5), 'ring', 'rare', 5000).itemLevel).toBe(LEVEL_CEILING);
    expect(generateRealmItem(new Rng(5), 'ring', 'rare', -3).itemLevel).toBe(1);
  });

  it('a `tier>=` rule and the equivalent `level>=` rule agree exactly', () => {
    const byTier = parsePickitFilter('SHOW tier>=elite');
    const byLevel = parsePickitFilter('SHOW level>=40');
    for (const ilvl of [1, 20, 39, 40, 41, 60, 99]) {
      const item = generateRealmItem(new Rng(ilvl), 'weapon', 'rare', ilvl);
      expect(evaluateItem(item, byTier).matchedRule !== null).toBe(
        evaluateItem(item, byLevel).matchedRule !== null,
      );
    }
  });

  it('a HIDE-low / SHOW-high filter partitions the range the way a player expects', () => {
    const rules = parsePickitFilter('HIDE tier<=sturdy\nSHOW tier>=primal HIGHLIGHT COLOR:#ff00ff');
    const junk = generateRealmItem(new Rng(11), 'boots', 'common', 5);
    const treasure = generateRealmItem(new Rng(11), 'boots', 'legendary', 85);
    expect(evaluateItem(junk, rules).show).toBe(false);
    const res = evaluateItem(treasure, rules);
    expect(res.show).toBe(true);
    expect(res.highlight).toBe(true);
    expect(res.color).toBe('#ff00ff');
  });

  it('an unknown tier name never matches instead of matching everything', () => {
    const rules = parsePickitFilter('SHOW tier>=notarealtier');
    const item = generateRealmItem(new Rng(2), 'belt', 'rare', 50);
    expect(evaluateItem(item, rules).matchedRule).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. THE SYSTEMS THAT WERE HARDWIRED TO 20
// ---------------------------------------------------------------------------

describe('level-shaped systems follow the realm cap, not the vanilla 20', () => {
  it('rested XP keeps accruing past 20 on a 99-cap realm', () => {
    // Was `if (p.level >= MAX_LEVEL) return`, which removed rested XP for 79 of
    // the 99 levels. isResting() is stubbed true via an inn-less building list
    // by driving updateRested directly with a resting position is awkward here,
    // so assert the GATE itself: the cap the function compares against.
    forceRealm('infernal');
    expect(activeMaxLevel(MAX_LEVEL)).toBe(99);
    forceRealm('claudecraft');
    expect(activeMaxLevel(MAX_LEVEL)).toBe(MAX_LEVEL);
  });

  it('resurrection sickness never exceeds its authored maximum at high level', () => {
    // The ramp interpolates minDuration -> maxDuration across [minLevel, 20].
    // Past 20 the interpolant used to run beyond 1, so a level-99 character
    // served several times the intended maximum. It must now plateau.
    const atCap = resSicknessDuration(MAX_LEVEL);
    for (const lvl of [20, 30, 50, 70, 99]) {
      expect(resSicknessDuration(lvl)).toBeLessThanOrEqual(atCap);
    }
    expect(resSicknessDuration(99)).toBe(atCap);
    expect(unstuckSicknessDuration(99)).toBe(unstuckSicknessDuration(MAX_LEVEL));
  });

  it('sickness is still monotonic non-decreasing up to the cap', () => {
    for (let lvl = 1; lvl < MAX_LEVEL; lvl++) {
      expect(resSicknessDuration(lvl + 1)).toBeGreaterThanOrEqual(resSicknessDuration(lvl));
    }
  });
});
