// The level a character must reach before a gear piece can be equipped.
//
// Classic-era MMOs gate higher-tier gear behind a required level so a low-level
// character cannot equip a lucky drop (or a twink hand-up) far above their own
// level. The requirement is DERIVED, never hand-authored per item: for rare and
// above, from `itemSourceLevel` (item_level.ts), the level of the content the
// piece actually drops or is quested from. That keeps a level-6 rare gating at
// level 6 (it is at-level loot, not a twink item) instead of a flat quality band
// that both strands at-level drops above their source and under-gates higher-
// level rares below where they actually drop. Items with no derivable source
// (vendor stock, starter gear, synthetic/test items) fall back to a per-quality
// band.
//
// An item may still pin an explicit `requiredLevel` to override the derived
// value. The result is always clamped to [1, MAX_LEVEL] so the highest-quality
// gear stays reachable at the level cap (a bare source level, or a fallback
// band, above the cap would be unequippable forever).
//
// Pure leaf: no DOM/Three/render-ui-game-net imports, no rng/clock. Imported by
// the sim equip path (src/sim/items.ts) AND the HUD item tooltip, so it stays
// host-agnostic and is unit-tested directly.

import { itemSourceLevel } from './item_level';
import { LEVEL_CEILING } from './progression/scale99';
import { activeMaxLevel } from './realms/registry';
import type { ItemDef } from './types';
import { MAX_LEVEL } from './types';

type Quality = NonNullable<ItemDef['quality']>;

// Per-quality fallback required level, used only when an item has no derivable
// `itemSourceLevel` (no drop/quest source). The leveling tiers (poor/common/
// uncommon) are the greens that quests and vendors hand you AS you level, so
// they stay ungated: a flat band there would strand an early quest reward you
// just earned but are a level or two short of. The gate begins at `rare` and
// up: dungeon/raid-grade loot a low-level character could otherwise be twinked
// into. Tune the feature HERE, not at the equip site.
// Sentinel for "gate this at whatever the realm's cap is". clampLevel folds it
// down to the active cap, so a sourceless legendary gates at 20 on claudecraft
// and at 99 on a D2 realm — which is what writing MAX_LEVEL here always meant
// ("the highest-quality gear stays reachable at the level cap"), back when the
// cap could only ever be 20.
const AT_THE_CAP = Number.POSITIVE_INFINITY;

// The rare/epic bands stay ABSOLUTE, not a fraction of the cap: they are tuned
// against the 1-20 content that actually exists, and a sourceless vendor rare
// must not leap to level 59 just because the realm cap moved to 99. Retuning
// these is designer work that belongs with the 21-99 content authoring.
const QUALITY_REQUIRED_LEVEL: Record<Quality, number> = {
  poor: 1,
  common: 1,
  uncommon: 1,
  rare: 12,
  epic: 18,
  legendary: AT_THE_CAP,
};

// Qualities below `rare` stay ungated regardless of source level: they are the
// leveling greens a quest or vendor hands you as you go.
const GATED_QUALITIES = new Set<Quality>(['rare', 'epic', 'legendary']);

// The minimum character level required to equip `item`. An explicit, finite
// `requiredLevel` always wins. Otherwise: qualities below `rare` are ungated
// (level 1); `rare` and above derive from where the item actually drops
// (`itemSourceLevel`), falling back to the per-quality band when the item has
// no derivable source.
//
// The two paths clamp DIFFERENTLY, and the difference is load-bearing — see
// clampDerived below.
export function requiredLevelFor(item: ItemDef): number {
  if (Number.isFinite(item.requiredLevel)) {
    return clampExplicit(item.requiredLevel as number);
  }
  const quality = item.quality ?? 'common';
  if (!GATED_QUALITIES.has(quality)) return 1;
  const source = itemSourceLevel(item.id);
  return clampDerived(source ?? QUALITY_REQUIRED_LEVEL[quality]);
}

// An EXPLICIT requiredLevel is a deliberate authoring statement, so it may reach
// the active realm's cap: this is how 21-99 content declares its gates. On
// claudecraft (no per-realm cap) this is the vanilla 20 and nothing changes.
function clampExplicit(raw: number): number {
  const cap = Math.min(LEVEL_CEILING, activeMaxLevel(MAX_LEVEL));
  return Math.max(1, Math.min(cap, Math.floor(raw)));
}

// A DERIVED requirement stays clamped to the vanilla MAX_LEVEL, deliberately,
// even on a 99-cap realm.
//
// itemSourceLevel() returns an ITEM level, and for the shipped endgame content
// that number is authored ABOVE the character cap on purpose: heroic variants
// are 22, heroic dungeon loot 25, Nythraxis raid loot 27, all in a world whose
// characters stopped at 20. That is the classic "item level exceeds character
// level" convention, not a claim that you must be level 27 to wear the item.
// The old clamp to MAX_LEVEL is what folded those markers back down to something
// wearable, and every existing character depends on it: letting the raid's 27
// through as a real gate instantly un-equips the entire Nythraxis set from every
// level-20 character on the default realm (which caps at 99, so the clamp would
// no longer catch it). tests/item_sets.ts pins exactly that mixing case.
//
// So: legacy 1-20-era content keeps its historical behavior byte-for-byte. When
// 21-99 content is authored with genuinely higher-level SOURCES, this is the
// function to revisit — the honest fix then is to separate "item level" from
// "required level" at the source (item_level.ts) rather than to widen this clamp,
// because widening it re-breaks every legacy piece above.
function clampDerived(raw: number): number {
  return Math.max(1, Math.min(MAX_LEVEL, Math.floor(raw)));
}

// Whether a character of `level` meets `item`'s level requirement.
export function meetsLevelRequirement(level: number, item: ItemDef): boolean {
  return level >= requiredLevelFor(item);
}
