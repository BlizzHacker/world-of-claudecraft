/**
 * Authored Infernal civilian and opponent roster.
 *
 * Keep this mapping independent from NPC behavior: template ids still drive
 * quests, vendors, housing, and persistence. Only their rendered bodies vary.
 */

import { civilianGenderForName } from './civilian_gender';

/**
 * The civilian bank.
 *
 * These replace the condemned bank, all 18 of which were rejected outright; the
 * audit record is docs/condemned-body-bank.md.
 *
 * Every one was verified from the GLB rather than its name (an ip_rename pass
 * laundered the names): correct joint counts, real clip inventories, zero scale
 * channels, and hands checked empty so nobody carries a welded prop.
 *
 * ONE ART FAMILY, and that is the whole selection rule. The 2026-08-21 sweep
 * rendered 71 candidates out of 3,784 store and 3,631 staging GLBs at head zoom
 * and found the store's rigged humanoids split cleanly in two with nothing in
 * between: a 23-joint mass_rig tier at 4,500 to 11,000 triangles, and a
 * 24-joint meshy24 tier at roughly 51,000. Every body the operator has failed
 * came from the first tier and every body he passed came from the second, four
 * for four in each direction. All eight below are 24-joint meshy24 bodies
 * between 50,514 and 52,014 triangles, so they stand next to each other with no
 * visible quality step.
 *
 * The four men are Infernal-realm keys on purpose. They are the male siblings
 * of the same generation wave the four townswomen came from, they are already
 * registered in manifest.generated.ts, already in the store, and already
 * matched by MESHY_RIGGED_GENERATED, so the shared Meshy clip bank wires itself
 * and this file is the only thing that changes.
 */
const WOMAN_WORKER = 'realm_crypticrealm_townswoman_practical_monk_f';
const WOMAN_GOWN = 'realm_crypticrealm_townswoman_robed_priest_f';
const WOMAN_HOODED = 'realm_crypticrealm_townswoman_hooded_mage_f';
const WOMAN_SCOUT = 'realm_crypticrealm_townswoman_hooded_rogue_f';
/** Ascetic in an olive work robe, sandals, hands empty. */
const MAN_MONK = 'realm_infernal_hero_monk';
/** Grey-bearded official in a mantle and tabard; the best face in the store. */
const MAN_ELDER = 'realm_infernal_male_sorcerer';
/** Working man in a hooded leather coat. The belt knives are costume, not held:
 *  the bank's rule is no weapon IN HANDS, and both of his are empty. */
const MAN_COAT = 'realm_infernal_hero_demon_hunter';
/** Man-at-arms in plate and cross livery, closed bascinet, gauntlets empty. */
const TOWN_GUARD = 'realm_infernal_hero_crusader';

/**
 * The rotations the hash draws from for any NPC without an explicit pin.
 *
 * Split by gender, and NOT because the hash is unfair. Rendezvous hashing
 * distributes blind, which is exactly what it is for, so dropping three male
 * bodies into one mixed rotation raises the male share of hash-driven NPCs from
 * 22% to 53% and then puts a man on Widow Tansy and leaves Huntsman Deral in a
 * gown. Two rotations plus a router on the authored name (civilian_gender.ts)
 * is the shape that survives the next roster addition; twenty more hand pins is
 * the shape that silently breaks on it.
 *
 * The armored guard is role-specific and would read wrong on a shopkeeper, so
 * she stays out of both rotations and is pinned by role below.
 *
 * Two bodies that used to sit here are gone, both on the operator's own verdict
 * and neither for taste. The craftsman cannot be saved: it is already
 * smooth-shaded (2,176 coincident-vertex groups, mean maximum normal angle
 * 0.00 degrees, so normals were never the fault) and at 5,020 triangles for the
 * whole body the crown is a chamfered polygon in silhouette, which no normal
 * edit can add resolution to. The armored woman is 7,496 triangles in the same
 * low tier, and her skull pauldrons and spikes read as a boss rather than as
 * municipal militia.
 */
export const CIVILIAN_MALE_VISUAL_KEYS = [MAN_MONK, MAN_ELDER, MAN_COAT] as const;
export const CIVILIAN_FEMALE_VISUAL_KEYS = [
  WOMAN_WORKER,
  WOMAN_GOWN,
  WOMAN_HOODED,
  WOMAN_SCOUT,
] as const;
/** Both rotations, for a name that asserts no gender at all. */
export const CIVILIAN_VISUAL_KEYS = [
  ...CIVILIAN_FEMALE_VISUAL_KEYS,
  ...CIVILIAN_MALE_VISUAL_KEYS,
] as const;

export type CivilianVisualKey = (typeof CIVILIAN_VISUAL_KEYS)[number];
/** Any body a townsperson may wear: the rotations plus the one role-only body. */
type TownBodyKey = CivilianVisualKey | typeof TOWN_GUARD;

/**
 * Explicit body per role, so intent survives the next time the bank changes.
 *
 * Assigned by what the character DOES, not by hash, and neighbours in the same
 * hub are deliberately given different bodies - the Eastbrook block below is the
 * clearest case, where a smith, a weaver, a cook and a tanner all stand within
 * sight of each other.
 *
 *   WOMAN_WORKER               physical trades
 *   WOMAN_GOWN                 hosts, front-of-house
 *   WOMAN_HOODED               scholarly women, records and rites
 *   WOMAN_SCOUT                anyone on the road or watching a boundary
 *   MAN_MONK                   the chapel and the cloister
 *   MAN_ELDER                  counters, ledgers, records and sages
 *   MAN_COAT                   forge, workshop, waterside and the road
 *   TOWN_GUARD                 militia and named authority
 *
 * KNOWN GAPS, deliberately not faked (generation queued): there is still no
 * blacksmith with an apron, no dockhand and no municipal militia body of the
 * town's own. The reason is NOT that none exist. dockhand_belted_tunic_male and
 * town_guard_leather_veteran_male are both sitting in the Cryptic Realm store,
 * staged 17 August and never registered; they are 5,224 and 9,991 triangles, in
 * the 23-joint tier every failed body came from, so the right note is "too
 * low-poly to stand next to the bank", not "does not exist". MAN_COAT stands in
 * at the forge and on the docks and TOWN_GUARD carries every militia role, so
 * both repeat. That repetition is visible and intended; substituting a
 * necromancer, a bare-chested warlord, or a chibi-headed elder to avoid it is
 * the exact fault this purge exists to end.
 */
const NPC_ROLE_VISUALS: Record<string, TownBodyKey> = {
  // --- authority and militia ---------------------------------------------------
  marshal_redbrook: TOWN_GUARD,
  captain_thessaly: TOWN_GUARD,
  warden_fenwick: TOWN_GUARD,
  skirmish_footman: TOWN_GUARD,
  // Pip runs a race, he does not hold a wall: plainclothes, not plate.
  race_marshal_pip: MAN_COAT,
  skirmish_builder: MAN_COAT,
  mercenary_kael: MAN_COAT,
  pit_master_grott: MAN_COAT,

  // --- forge and workshop ------------------------------------------------------
  smith_haldren: MAN_COAT,
  armorer_hode: MAN_COAT,
  toolmaster_gethin: MAN_COAT,
  forgemistress_darva: WOMAN_WORKER,
  foreman_odell: MAN_COAT,
  wren_saddleworth: WOMAN_SCOUT,
  stable_master_wren: WOMAN_SCOUT,

  // --- counters and trade ------------------------------------------------------
  the_merchant: MAN_ELDER,
  trader_wilkes: MAN_ELDER,
  interior_merchant: WOMAN_GOWN,
  provisioner_hale: WOMAN_WORKER,
  quartermaster_bree: WOMAN_WORKER,
  realtor_maribel: WOMAN_GOWN,
  bursar_fernando: MAN_ELDER,
  interior_innkeeper: WOMAN_GOWN,
  interior_villager: WOMAN_WORKER,
  card_master: WOMAN_GOWN,

  // --- remedies and rites ------------------------------------------------------
  apothecary_lin: WOMAN_HOODED,
  herbalist_yara: WOMAN_WORKER,
  alchemist_sable: WOMAN_HOODED,
  spirit_healer: WOMAN_GOWN,
  brother_halven: MAN_MONK,
  brother_halven_marsh: MAN_MONK,
  cainhurst_sage: MAN_ELDER,
  loremaster_caddis: MAN_ELDER,

  // --- records -----------------------------------------------------------------
  chronicler_saul: MAN_ELDER,
  chronicler_osric_fenn: MAN_ELDER,
  chronicler_edda_hartwell: WOMAN_HOODED,

  // --- road, water and boundary ------------------------------------------------
  huntress_verr: WOMAN_SCOUT,
  scout_maren: WOMAN_SCOUT,
  scout_maren_highwatch: WOMAN_SCOUT,
  tidewatcher_ondrel: WOMAN_SCOUT,
  fisherman_brandt: MAN_COAT,
  groundskeeper_bram: MAN_COAT,

  // --- Eastbrook townsfolk -----------------------------------------------------
  weaver_ottilie: WOMAN_HOODED,
  cook_marlow: MAN_COAT,
  tanner_briggs: MAN_COAT,
};

/**
 * hellmaw_cursed_knight_body was removed from both rotations on 2026-08-17.
 *
 * It is not a body. body_shape_gate.ts records what the render shows: a heraldic
 * wall shield - dragon face, glowing eyes, no torso, no limbs - and the owner's
 * own words for it were "the asset currently being used for the Deeprock Digger
 * is a wall ornament". The gate correctly refuses to let visualKeyFor return it.
 *
 * Leaving it named here was not harmless. Every opponent whose hash landed on it
 * was silently substituted for `mob_bandit`, a generic KayKit adventurer - so
 * roughly half of Infernal's opponents were quietly generic, in the one realm
 * whose npc branch exists specifically to keep KayKit minis out. Naming a body
 * the gate rejects buys a generic fallback, not the body.
 *
 * The armoured warlord replacing it is from the approved catalog and is already
 * the realm's humanoid mob default, so the two-body variety is kept.
 */
const OPPONENT_KEYS = [
  'realm_infernal_evil_warlord_armor_made_0196a11d',
  'hellmaw_sigilbound_body',
] as const;

const HOSTILE_HUMANOID_KEYS = [
  'realm_infernal_dark_paladin',
  'realm_infernal_evil_warlord_armor_made_0196a11d',
  'hellmaw_sigilbound_body',
] as const;

/**
 * hellmaw_spectre_body was dropped from this rotation on 2026-08-21.
 *
 * The reachable-asset audit rendered it: it is a FOUR-LEGGED flaming unicorn,
 * and this rotation bodies BIPEDAL undead in all nine realms, so it was the
 * single widest-reaching wrong-shape body in the game (17 template rows). The
 * five that remain are all upright skeletons. Rendezvous hashing means dropping
 * it re-rolls only the templates that were wearing it.
 */
export const INFERNAL_UNDEAD_VISUAL_KEYS = [
  'realm_cryptic_bone_herald',
  'skel_warrior',
  'skel_rogue',
  'skel_mage',
  'skel_golem',
] as const;

function fnv1a(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Pick one key for `value` from `keys`, stably ACROSS EDITS to `keys`.
 *
 * The old `hash % keys.length` re-rolled the entire town whenever the bank
 * changed size: add one body and every NPC becomes someone else, because the
 * modulus moved. That made growing the rotation - the whole point of repairing
 * the bank - a townwide visual reshuffle, and it is why this is still four.
 *
 * Rendezvous (highest-random-weight) hashing instead scores each candidate for
 * this id and takes the winner. Adding a key only steals the ids whose score for
 * the NEW key beats their current best - about 1/n of them - and every other
 * NPC keeps the body it already had. Removing a key only re-rolls the ids that
 * were using it. Ties break on the key name so the result never depends on
 * array order.
 */
function stablePick<T extends string>(value: string, keys: readonly T[]): T {
  let best = keys[0];
  let bestScore = -1;
  for (const key of keys) {
    const score = fnv1a(`${value}\u0000${key}`);
    if (score > bestScore || (score === bestScore && key < best)) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}

/**
 * The body a Cryptic Realm or Infernal townsperson wears.
 *
 * `displayName` is the NPC's authored English name (`NPCS[id].name`), and it is
 * used for ONE thing: choosing which rotation the hash draws from when there is
 * no explicit pin. Pass it wherever it is available. Omitting it is safe and
 * degrades to the mixed bank, which is what shipped before the split, so a
 * caller with only a template id (a synthetic test entity, a preview) still
 * gets a real townsperson.
 */
export function infernalNpcVisualKey(templateId: string, displayName?: string | null): TownBodyKey {
  // Brother Aldric recurs in every hub under suffixed ids and must stay one
  // recognisable man rather than re-rolling per hub. He is a brother, so he
  // wears the cloister body.
  if (templateId.startsWith('brother_aldric')) return MAN_MONK;
  const pinned = NPC_ROLE_VISUALS[templateId];
  if (pinned) return pinned;
  const gender = civilianGenderForName(displayName);
  if (gender === 'male') return stablePick(templateId, CIVILIAN_MALE_VISUAL_KEYS);
  if (gender === 'female') return stablePick(templateId, CIVILIAN_FEMALE_VISUAL_KEYS);
  return stablePick(templateId, CIVILIAN_VISUAL_KEYS);
}

export function infernalOpponentVisualKey(
  templateId: string,
): 'realm_infernal_dark_paladin' | (typeof OPPONENT_KEYS)[number] {
  if (/(?:captain|commander|foreman|warlord|mogger|gorrak|drogmar|brutok)/.test(templateId)) {
    return 'realm_infernal_dark_paladin';
  }
  return stablePick(templateId, OPPONENT_KEYS);
}

/** Infernal and Cryptic undead rotate through the approved skeleton, spectre,
 * and Bone Herald bank instead of cloning one model across every graveyard. */
export function infernalUndeadVisualKey(
  templateId: string,
): (typeof INFERNAL_UNDEAD_VISUAL_KEYS)[number] {
  if (/(?:restless_bones|bone_herald|bonewalker|gravecaller|necromancer)/.test(templateId)) {
    return 'realm_cryptic_bone_herald';
  }
  return stablePick(templateId, INFERNAL_UNDEAD_VISUAL_KEYS);
}

/** Full-size living/corrupted humanoids only. Shared by crossroads realms that
 * must never turn an ordinary bandit or soldier into an undead Bone Herald. */
export function hostileHumanoidVisualKey(
  templateId: string,
): (typeof HOSTILE_HUMANOID_KEYS)[number] {
  return stablePick(templateId, HOSTILE_HUMANOID_KEYS);
}

// The repair recipe and the 2026-08-15 repair batch that Wade recorded here
// moved VERBATIM to docs/condemned-body-bank.md when the condemned bank was
// purged. His audit is the record of why these bodies were judged the way
// they were; it was moved rather than deleted, and not one word was changed.
