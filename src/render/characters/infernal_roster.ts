/**
 * Authored Infernal civilian and opponent roster.
 *
 * Keep this mapping independent from NPC behavior: template ids still drive
 * quests, vendors, housing, and persistence. Only their rendered bodies vary.
 */

/**
 * The civilian bank.
 *
 * These replace the condemned bank, all 18 of which were rejected outright; the
 * audit record is docs/condemned-body-bank.md. The bodies here were already in
 * the store the whole time, filed under classic/ and arcane/ - the earlier
 * conclusion that "the approved pool contains no townspeople" was a search
 * failure, not a supply problem.
 *
 * Every one was verified from the GLB rather than its name (an ip_rename pass
 * laundered the names): correct joint counts, real clip inventories, zero scale
 * channels, and hands checked empty so nobody carries a welded prop.
 *
 * Registration and the two rig families are handled in manifest.ts - the four
 * townswomen are meshy24 and need the shared clip bank wired explicitly.
 */
const ELDER_WHITE = 'realm_crypticrealm_village_elder_white_robe_019521ee';
const ELDER_BROWN = 'realm_crypticrealm_village_elder_brown_robe_01952165';
const TOWNSMAN_TAN = 'realm_crypticrealm_townsman_tan_trenchcoat_01944c9a5744';
const TOWNSMAN_BROWN = 'realm_crypticrealm_townsman_brown_trenchcoat_01944c9abf1e';
const WOMAN_WORKER = 'realm_crypticrealm_townswoman_practical_monk_f';
const WOMAN_GOWN = 'realm_crypticrealm_townswoman_robed_priest_f';
const WOMAN_HOODED = 'realm_crypticrealm_townswoman_hooded_mage_f';
const WOMAN_SCOUT = 'realm_crypticrealm_townswoman_hooded_rogue_f';
const TOWN_GUARD = 'realm_crypticrealm_town_guard_female_armored_019875c0';
const CRAFTSMAN = 'realm_crypticrealm_craftsman_warrior_monk_019ee5e1';

/**
 * The rotation the hash draws from for any NPC without an explicit pin.
 *
 * Eight bodies, up from the condemned bank's four, and deliberately only the
 * GENERIC townsfolk: the guard and the craftsman are role-specific and would
 * read wrong on a random villager, so they are pinned below instead of left to
 * the hash. Four men and four women, two of them elders, so a crowd reads as a
 * town rather than as one man repeated.
 */
export const CIVILIAN_VISUAL_KEYS = [
  ELDER_WHITE,
  ELDER_BROWN,
  TOWNSMAN_TAN,
  TOWNSMAN_BROWN,
  WOMAN_WORKER,
  WOMAN_GOWN,
  WOMAN_HOODED,
  WOMAN_SCOUT,
] as const;

/**
 * The playable class bank is a separate problem from the civilian one. These
 * keys are still registered and still selectable as hero cards, but no class
 * table may point at one.
 *
 * Wade's body-by-body audit of this list moved VERBATIM to
 * docs/condemned-body-bank.md when the condemned bank was purged.
 */
export const INFERNAL_DEFECTIVE_CLASS_BODY_KEYS = [
  'realm_infernal_class_sorcerer',
  'realm_infernal_class_assassin',
  'realm_infernal_class_warlock',
  'realm_infernal_class_wizard',
  'realm_infernal_class_amazon',
  'realm_infernal_class_paladin',
  'realm_infernal_class_necromancer',
  'realm_infernal_class_crusader',
  'realm_infernal_class_tempest',
  'realm_infernal_class_barbarian',
  'realm_infernal_class_druid',
  'realm_infernal_class_spiritborn',
] as const;

export type CivilianVisualKey = (typeof CIVILIAN_VISUAL_KEYS)[number];
/** Any body a townsperson may wear: the rotation plus the two role-only bodies. */
type TownBodyKey = CivilianVisualKey | typeof TOWN_GUARD | typeof CRAFTSMAN;

/**
 * Explicit body per role, so intent survives the next time the bank changes.
 *
 * Assigned by what the character DOES, not by hash, and neighbours in the same
 * hub are deliberately given different bodies - the Eastbrook block below is the
 * clearest case, where a smith, a weaver, a cook and a tanner all stand within
 * sight of each other.
 *
 *   ELDER_WHITE / ELDER_BROWN  keepers of records, sages, long-settled trades
 *   TOWNSMAN_TAN / _BROWN      general men: counters, yards, road jobs
 *   WOMAN_WORKER               physical trades
 *   WOMAN_GOWN                 hosts, front-of-house
 *   WOMAN_HOODED               scholarly women
 *   WOMAN_SCOUT                anyone on the road or watching a boundary
 *   TOWN_GUARD                 militia and named authority
 *   CRAFTSMAN                  forge and workshop
 *
 * KNOWN GAPS, deliberately not faked (generation queued): there is no blacksmith
 * with an apron, no dockhand and no municipal militia body. CRAFTSMAN stands in
 * at the forge and TOWN_GUARD - the only guard body, and female - carries every
 * militia role, so the three authority figures repeat. That repetition is
 * visible and intended; substituting a necromancer or a bare-chested warlord to
 * avoid it is the exact fault this purge exists to end.
 */
const NPC_ROLE_VISUALS: Record<string, TownBodyKey> = {
  // --- authority and militia ---------------------------------------------------
  marshal_redbrook: TOWN_GUARD,
  captain_thessaly: TOWN_GUARD,
  warden_fenwick: TOWN_GUARD,
  skirmish_footman: TOWNSMAN_BROWN,
  skirmish_builder: CRAFTSMAN,
  mercenary_kael: TOWNSMAN_BROWN,
  pit_master_grott: TOWNSMAN_BROWN,

  // --- forge and workshop ------------------------------------------------------
  smith_haldren: CRAFTSMAN,
  armorer_hode: CRAFTSMAN,
  toolmaster_gethin: CRAFTSMAN,
  forgemistress_darva: WOMAN_WORKER,
  foreman_odell: TOWNSMAN_BROWN,
  wren_saddleworth: TOWNSMAN_TAN,
  stable_master_wren: TOWNSMAN_TAN,

  // --- counters and trade ------------------------------------------------------
  the_merchant: TOWNSMAN_TAN,
  trader_wilkes: ELDER_BROWN,
  interior_merchant: TOWNSMAN_TAN,
  provisioner_hale: ELDER_BROWN,
  quartermaster_bree: WOMAN_WORKER,
  realtor_maribel: WOMAN_GOWN,
  bursar_fernando: TOWNSMAN_TAN,
  interior_innkeeper: WOMAN_GOWN,
  interior_villager: TOWNSMAN_BROWN,
  card_master: TOWNSMAN_TAN,

  // --- remedies and rites ------------------------------------------------------
  apothecary_lin: WOMAN_HOODED,
  herbalist_yara: WOMAN_WORKER,
  alchemist_sable: WOMAN_HOODED,
  spirit_healer: WOMAN_GOWN,
  brother_halven: ELDER_WHITE,
  brother_halven_marsh: ELDER_WHITE,
  cainhurst_sage: ELDER_WHITE,
  loremaster_caddis: ELDER_WHITE,

  // --- records -----------------------------------------------------------------
  chronicler_saul: ELDER_BROWN,
  chronicler_osric_fenn: ELDER_WHITE,
  chronicler_edda_hartwell: WOMAN_HOODED,

  // --- road, water and boundary ------------------------------------------------
  huntress_verr: WOMAN_SCOUT,
  scout_maren: WOMAN_SCOUT,
  scout_maren_highwatch: WOMAN_SCOUT,
  tidewatcher_ondrel: TOWNSMAN_BROWN,
  fisherman_brandt: TOWNSMAN_BROWN,
  race_marshal_pip: TOWNSMAN_TAN,
  groundskeeper_bram: ELDER_BROWN,

  // --- Eastbrook townsfolk -----------------------------------------------------
  weaver_ottilie: WOMAN_HOODED,
  cook_marlow: WOMAN_WORKER,
  tanner_briggs: TOWNSMAN_BROWN,
};

const OPPONENT_KEYS = ['hellmaw_cursed_knight_body', 'hellmaw_sigilbound_body'] as const;

const HOSTILE_HUMANOID_KEYS = [
  'realm_infernal_dark_paladin',
  'hellmaw_cursed_knight_body',
  'hellmaw_sigilbound_body',
] as const;

export const INFERNAL_UNDEAD_VISUAL_KEYS = [
  'realm_cryptic_bone_herald',
  'skel_warrior',
  'skel_rogue',
  'skel_mage',
  'skel_golem',
  'hellmaw_spectre_body',
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

export function infernalNpcVisualKey(templateId: string): TownBodyKey {
  // Brother Aldric recurs in every hub under suffixed ids and must stay one
  // recognisable man rather than re-rolling per hub.
  if (templateId.startsWith('brother_aldric')) return ELDER_WHITE;
  return (
    NPC_ROLE_VISUALS[templateId] ??
    stablePick(templateId, CIVILIAN_VISUAL_KEYS)
  );
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
