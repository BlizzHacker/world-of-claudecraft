// The per-realm CLASS LORE worklist: one empty, structured table per realm, so
// re-voicing a realm's classes and skills is data entry rather than engineering.
//
// The mechanism is already shipped and generic (RealmEntityText.classes /
// .abilities / .talentSpecs / .systems, resolved in tEntity / tTalent before the
// locale table). infernal is filled in - see infernal_lore_classes.ts, the
// worked example every other realm copies. Everything else below is deliberately
// EMPTY: nothing here is invented for a realm whose content module has not been
// read and whose voice has not been decided by its owner.
//
// TO FILL ONE IN
//   1. Read that realm's content module (this directory) for its voice.
//   2. Author a `<realm>_lore_classes.ts` next to it, modelled on
//      infernal_lore_classes.ts.
//   3. Spread it into that realm's `entityText` the way infernal.ts does.
//   4. tests/realm_class_lore.test.ts checks that every id you used is a real
//      canonical id, so a typo fails the suite instead of shipping a dead key.
//
// WHAT MAY GO IN
//   classes      canonical PlayerClass id -> { name, description }
//   abilities    canonical ability id     -> { name, description }
//   talentSpecs  `<class>.<specId>`       -> display name
//   talentMasteries `<class>.<specId>`    -> the spec card's mastery label
//   systems      RealmSystemId            -> fork tool window title
//   (built-in window titles are ordinary catalog keys and ride `catalog`)
//
// WHAT MAY NOT: ids of any kind. Ability ids sit in saved hotbars, spec ids in
// saved talent allocations, class ids in every character row. Display only.

import type { RealmClassText, RealmEntityText, RealmId } from '../types';

/** The slice of a realm's overlay this worklist covers. */
export type RealmClassLore = Pick<
  RealmEntityText,
  'classes' | 'abilities' | 'talentSpecs' | 'talentMasteries' | 'systems'
>;

/** The nine canonical engine class ids every realm's `classes` map is keyed by.
 *  A realm re-voices as few or as many as it wants; an omitted class keeps the
 *  shared-world name. */
export const CANONICAL_CLASS_IDS = [
  'warrior',
  'paladin',
  'hunter',
  'rogue',
  'priest',
  'shaman',
  'mage',
  'warlock',
  'druid',
] as const;

/** An empty `classes` map with every canonical id present, for copy-paste. */
export const BLANK_CLASS_TEXT: Readonly<Record<string, RealmClassText>> = Object.freeze(
  Object.fromEntries(CANONICAL_CLASS_IDS.map((id) => [id, {}])),
);

/**
 * The worklist. A realm's entry is what still has to be written for it, with
 * the voice its own content module already establishes. Realms are listed with
 * their tagline so the author does not have to guess the register.
 *
 * This table is documentation-as-data: nothing reads it at runtime. It exists so
 * the next pass has a single place that says what is done and what is not.
 */
export const REALM_CLASS_LORE_WORKLIST: Readonly<
  Record<RealmId, { readonly voice: string; readonly lore: RealmClassLore }>
> = {
  // DONE. The worked example: 9 classes, 17 talent specs, 4 tool titles, and
  // the ability names the shared world was still speaking for.
  infernal: {
    voice: 'The Cinderveil. Dark, gothic, brutal: candle, ash, grave, foundry, oath.',
    // Still open here, and the shape of what every other realm will meet: the
    // ~30 talent-granted abilities behind each spec's choice rows, and the
    // choice-row talent names themselves. Both resolve through tTalent, so they
    // need no new mechanism, only text.
    lore: {}, // lives in infernal_lore_classes.ts, spread into infernal.ts
  },
  // The flagship. "Arcane mysteries, riddle-locked ruins, forgotten power":
  // buried cathedrals, ciphered runes, the Gravecaller Saga.
  crypticrealm: {
    voice: 'Cryptic, arcane, mysterious: ciphers, riddles, buried cathedrals, gravecalling.',
    lore: {},
  },
  // "Colorful low-poly fantasy - heroes, quests, and open skies." Bright and
  // heroic; the shared-world names already sit closest to this realm, so it may
  // legitimately end up the smallest overlay of all.
  classic: {
    voice: 'Bright, heroic, adventurous: meadows, towns, open skies.',
    lore: {},
  },
  // "Sci-fi alien war - squads, tech, and galactic conquest." Classes read as
  // military roles; abilities as ordnance, systems and requisitions.
  dominion: {
    voice: 'Tactical sci-fi: squads, alien tech, frontier fleets, requisition.',
    lore: {},
  },
  // "Cosmic crystal realms - portals, relics, and void mysteries."
  arcane: {
    voice: 'Mysterious, cosmic, ethereal: portals, crystal relics, void energy.',
    lore: {},
  },
  // "Neon squad combat, shipyards, turrets, and void tech" - a bright sci-fi
  // war cabinet, louder and more arcade than Dominion.
  arcadevoid: {
    voice: 'Neon arcade sci-fi: marines, shipyards, turrets, void tech.',
    lore: {},
  },
  // First-person only. Classes are precision-combat archetypes, not ARPG roles;
  // abilities read as marksmanship and movement, never as spells.
  fps: {
    voice: 'First-person, precise, relentless: sights, draw, movement, the reticle.',
    lore: {},
  },
  // A neutral bazaar with combat disabled. Little of the class layer is even
  // visible here; the systems titles are the part worth doing.
  exchange: {
    voice: 'Neutral, mercantile, crowded: consignment, bids, the long auction floor.',
    lore: {},
  },
  // NEVER FILL THIS ONE. claudecraft is the pristine upstream look and ships no
  // entityText at all, which is what keeps it byte-identical to the base game.
  // tests/realm_class_lore.test.ts pins it empty.
  claudecraft: {
    voice: 'Upstream vanilla. Must stay unbranded: no overlay of any kind.',
    lore: {},
  },
};
