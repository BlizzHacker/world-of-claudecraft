// THE 1-99 BALANCE TABLE — the one place a designer retunes level progression.
//
// The game was authored as a 20-level game (types.ts MAX_LEVEL = 20). A prior
// wave extended the XP curve to 99 and gave each realm its own cap
// (realms/registry.ts activeMaxLevel: D2 realms 99, classic 80, claudecraft 20),
// but the *content* is still authored 1-20 and the item vocabulary never scaled.
// This module holds the arithmetic that stretches that authored content across
// 1-99 and makes the Pickit loot filter meaningful the whole way.
//
// DESIGN RULE — "all things should be based on the Pickit".
// The Pickit filter (realms/pickit.ts) can express exactly four axes:
//     rarity=<tier>   slot=<slot>   level>=<n>   stat:<name>>=<n>   name*=<text>
// Every number in this file exists so that a filter written against those axes
// keeps its meaning from level 1 to level 99:
//   - ITEM_TIERS put tier boundaries on ROUND item levels, so `level>=40` is a
//     line a player can actually reason about instead of an arbitrary cut.
//   - affixScaleAt() makes item level the MASTER SCALAR for affix magnitude, so
//     `level>=` and `stat:>=` agree with each other instead of drifting apart.
//   - AFFIX_SCALING splits stats into magnitude vs flat so that percentage-ish
//     stats (resistances, leech, move speed) stay in a bounded, human range and
//     a rule like `stat:fireRes>=20` means the same thing at 99 as at 9.
//
// PURE LEAF: no imports, no rng, no host env, no Sim state — just tables and
// arithmetic, so it is trivially unit-testable and safe to import from the sim
// hot path, the HUD, and the offline tools alike. Consumers combine it with
// activeMaxLevel() themselves; this module never reads the active realm.

/** The hard ceiling the XP table and every band in this file are built against. */
export const LEVEL_CEILING = 99;

// ---------------------------------------------------------------------------
// 1. LEVEL BANDS — the named route from 1 to 99.
//
// Round decade boundaries on purpose: a player writing a Pickit rule thinks in
// tens ("show me anything level 60 and up"), so the band edges are the same
// numbers the filter language encourages. Retune by moving `from`.
// ---------------------------------------------------------------------------

export interface LevelBand {
  id: string;
  /** First character level in the band (inclusive). Bands are contiguous. */
  from: number;
  /** Display name. Localized at the display sink, never in the sim. */
  name: string;
}

export const LEVEL_BANDS: readonly LevelBand[] = [
  { id: 'initiate', from: 1, name: 'Initiate' },
  { id: 'adept', from: 10, name: 'Adept' },
  { id: 'veteran', from: 20, name: 'Veteran' },
  { id: 'champion', from: 30, name: 'Champion' },
  { id: 'master', from: 40, name: 'Master' },
  { id: 'ascendant', from: 50, name: 'Ascendant' },
  { id: 'mythic', from: 60, name: 'Mythic' },
  { id: 'eternal', from: 70, name: 'Eternal' },
  { id: 'transcendent', from: 80, name: 'Transcendent' },
  { id: 'apex', from: 90, name: 'Apex' },
];

/** The band a character level falls in. Clamped, so out-of-range is never null. */
export function levelBandFor(level: number): LevelBand {
  const lvl = Math.max(1, Math.min(LEVEL_CEILING, Math.floor(level)));
  let found = LEVEL_BANDS[0];
  for (const band of LEVEL_BANDS) {
    if (lvl >= band.from) found = band;
    else break;
  }
  return found;
}

// ---------------------------------------------------------------------------
// 2. ASCENSION — how 1-20 authored content becomes a 1-99 route.
//
// The world's mob templates, camps, and zones are authored with minLevel/maxLevel
// in roughly 1..20. Re-authoring all ~440 of those entries into 1-99 bands is
// content work, not arithmetic. Instead we do what Diablo II did with Normal /
// Nightmare / Hell: replay the SAME authored world at a higher level band. One
// authored world, four passes, a continuous route from 1 to 99.
//
// `ascendMobLevel` is a PURE POST-DRAW TRANSFORM. The spawn path already rolls
// `campRng.int(template.minLevel, template.maxLevel)`; we scale that result
// afterwards. It draws no rng of its own, so the shared rng stream position is
// bit-identical and every later seeded gameplay roll is unchanged. That property
// is load-bearing — do not "improve" this into something that rolls.
// ---------------------------------------------------------------------------

export type AscensionId = 'normal' | 'nightmare' | 'hell' | 'torment';

export interface AscensionTier {
  id: AscensionId;
  name: string;
  /** Character level at which this tier becomes the sensible next stop. */
  unlockLevel: number;
  /** Authored level `from` maps linearly onto [bandLo, bandHi]. */
  bandLo: number;
  bandHi: number;
  /** Multiplier on XP granted by kills in this tier. */
  xpMult: number;
  /** Multiplier on the rolled rarity weight of non-common drops (magic find). */
  magicFind: number;
}

/** The authored source range every tier maps FROM (the shipped content's span). */
export const AUTHORED_LEVEL_LO = 1;
export const AUTHORED_LEVEL_HI = 20;

export const ASCENSION_TIERS: readonly AscensionTier[] = [
  { id: 'normal', name: 'Normal', unlockLevel: 1, bandLo: 1, bandHi: 20, xpMult: 1, magicFind: 0 },
  { id: 'nightmare', name: 'Nightmare', unlockLevel: 20, bandLo: 21, bandHi: 48, xpMult: 2.5, magicFind: 15 },
  { id: 'hell', name: 'Hell', unlockLevel: 48, bandLo: 49, bandHi: 76, xpMult: 6, magicFind: 40 },
  { id: 'torment', name: 'Torment', unlockLevel: 76, bandLo: 77, bandHi: 99, xpMult: 14, magicFind: 80 },
];

export function ascensionTier(id: AscensionId): AscensionTier {
  return ASCENSION_TIERS.find((t) => t.id === id) ?? ASCENSION_TIERS[0];
}

/**
 * Map an authored mob level (1..20) onto the band of an ascension tier.
 * Linear across the authored span, so the relative difficulty the designer
 * authored inside a zone survives the stretch: the level-3 boars are still the
 * easy end of Hell, the level-19 elites still the hard end.
 */
export function ascendMobLevel(authoredLevel: number, tier: AscensionId): number {
  const t = ascensionTier(tier);
  const span = AUTHORED_LEVEL_HI - AUTHORED_LEVEL_LO;
  const clamped = Math.max(AUTHORED_LEVEL_LO, Math.min(AUTHORED_LEVEL_HI, authoredLevel));
  if (span <= 0) return t.bandLo;
  const frac = (clamped - AUTHORED_LEVEL_LO) / span;
  const scaled = t.bandLo + frac * (t.bandHi - t.bandLo);
  return Math.max(1, Math.min(LEVEL_CEILING, Math.round(scaled)));
}

/** The highest ascension tier a character of `level` has earned access to. */
export function ascensionForLevel(level: number): AscensionTier {
  let found = ASCENSION_TIERS[0];
  for (const t of ASCENSION_TIERS) {
    if (level >= t.unlockLevel) found = t;
    else break;
  }
  return found;
}

// ---------------------------------------------------------------------------
// 3. ITEM TIERS — the rarity/level ladder the Pickit can name.
//
// Boundaries sit on round item levels so `level>=50` lands exactly on a tier
// edge. A player can write one rule per tier and cover the whole game.
// ---------------------------------------------------------------------------

export interface ItemTier {
  id: string;
  /** Lowest item level in the tier (inclusive). Contiguous, ascending. */
  from: number;
  name: string;
}

export const ITEM_TIERS: readonly ItemTier[] = [
  { id: 'crude', from: 1, name: 'Crude' },
  { id: 'sturdy', from: 10, name: 'Sturdy' },
  { id: 'fine', from: 20, name: 'Fine' },
  { id: 'exceptional', from: 30, name: 'Exceptional' },
  { id: 'elite', from: 40, name: 'Elite' },
  { id: 'sacred', from: 50, name: 'Sacred' },
  { id: 'primal', from: 60, name: 'Primal' },
  { id: 'ancient', from: 70, name: 'Ancient' },
  { id: 'eternal', from: 80, name: 'Eternal' },
  { id: 'godly', from: 90, name: 'Godly' },
];

export function itemTierFor(itemLevel: number): ItemTier {
  const ilvl = Math.max(1, Math.min(LEVEL_CEILING, Math.floor(itemLevel)));
  let found = ITEM_TIERS[0];
  for (const tier of ITEM_TIERS) {
    if (ilvl >= tier.from) found = tier;
    else break;
  }
  return found;
}

// ---------------------------------------------------------------------------
// 4. ITEM LEVEL FROM SOURCE.
//
// D2's rule: item level = monster level, plus a bump for rarity, because a rare
// off a level-40 pull outclasses a white off the same pull. Mirrors the upstream
// convention in item_budget.ts QUALITY_ILVL_BONUS so the two itemization systems
// agree about what "item level" means.
// ---------------------------------------------------------------------------

export const RARITY_ILVL_BONUS: Record<string, number> = {
  common: 0,
  magic: 1,
  rare: 3,
  legendary: 6,
  mythic: 8,
  unique: 10,
};

export function itemLevelForMobLevel(mobLevel: number, rarity = 'common'): number {
  const bonus = RARITY_ILVL_BONUS[rarity] ?? 0;
  return Math.max(1, Math.min(LEVEL_CEILING, Math.floor(mobLevel) + bonus));
}

// ---------------------------------------------------------------------------
// 5. AFFIX SCALING — the heart of "based on the Pickit".
//
// Before this, generateRealmItem() accepted an itemLevel and threw it away: an
// ilvl-99 drop rolled the exact same 3-12 damage as an ilvl-1 drop. That made
// BOTH Pickit axes useless at once — `level>=` partitioned items that were
// statistically identical, and `stat:dmg>=20` was either always true or always
// false forever, at every level, for the whole game.
//
// Item level now drives magnitude. Two scaling classes, because they need
// different treatment to keep filters writable:
//
//   'magnitude' — flat additive power (damage, hp, mana, primary stats, elemental
//     damage). Scales LINEARLY with item level. Linear, not geometric, on purpose:
//     a 1.05^level curve reaches ~46x by 99 and pushes affix values into the tens
//     of thousands, at which point no human can pick a `stat:>=` threshold. Linear
//     keeps the numbers in a range a player can hold in their head and makes the
//     mapping "about ten times stronger at 99 than at 1" easy to reason about.
//
//   'flat' — percentage-ish and rate stats (resistances, leech, move speed, damage
//     reduction). These do NOT scale. A resistance is a percentage of a whole; a
//     move-speed bonus is a rate. Scaling them 10x would produce 245% fire resist
//     and nonsensical speeds, and would break every `stat:fireRes>=20` rule ever
//     written. Holding them in their authored band is what makes those thresholds
//     permanently meaningful — which is exactly the Pickit contract.
//
// Retune the slope here; do not sprinkle multipliers at the roll site.
// ---------------------------------------------------------------------------

export type AffixScaling = 'magnitude' | 'flat';

/** Added magnitude multiplier per item level above 1. 0.09 => ~9.8x at ilvl 99. */
export const AFFIX_SCALE_PER_LEVEL = 0.09;

/**
 * Magnitude multiplier for an affix roll at a given item level.
 * affixScaleAt(1) === 1 exactly, so ilvl-1 items roll their authored band and
 * the shipped affix table keeps its original meaning as the level-1 baseline.
 */
export function affixScaleAt(itemLevel: number): number {
  const ilvl = Math.max(1, Math.min(LEVEL_CEILING, Math.floor(itemLevel)));
  return 1 + (ilvl - 1) * AFFIX_SCALE_PER_LEVEL;
}

/**
 * Which scaling class a stat uses. Anything not listed defaults to 'magnitude',
 * so a newly authored damage/stat affix scales correctly without extra wiring;
 * a new PERCENTAGE stat must be added here, or it will scale into nonsense.
 */
export const AFFIX_SCALING: Record<string, AffixScaling> = {
  // Percentage / rate stats — deliberately unscaled (see the note above).
  spd: 'flat',
  lifeLeech: 'flat',
  manaLeech: 'flat',
  dmgReduce: 'flat',
  fireRes: 'flat',
  coldRes: 'flat',
  ltngRes: 'flat',
};

export function affixScalingFor(stat: string): AffixScaling {
  return AFFIX_SCALING[stat] ?? 'magnitude';
}

/** The multiplier to apply to a rolled affix of `stat` at `itemLevel`. */
export function affixMultiplier(stat: string, itemLevel: number): number {
  return affixScalingFor(stat) === 'flat' ? 1 : affixScaleAt(itemLevel);
}
