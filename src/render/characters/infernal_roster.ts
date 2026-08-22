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
const WOMAN_WORKER = 'realm_crypticrealm_townswoman_practical_monk_f';
const WOMAN_GOWN = 'realm_crypticrealm_townswoman_robed_priest_f';
const WOMAN_HOODED = 'realm_crypticrealm_townswoman_hooded_mage_f';
const WOMAN_SCOUT = 'realm_crypticrealm_townswoman_hooded_rogue_f';
const TOWN_GUARD = 'realm_crypticrealm_town_guard_female_armored_019875c0';
const CRAFTSMAN = 'realm_crypticrealm_craftsman_warrior_monk_019ee5e1';

/**
 * The rotation the hash draws from for any NPC without an explicit pin.
 *
 * Five bodies, and deliberately only ones a random villager can wear: the
 * armored woman is role-specific and would read wrong on a shopkeeper, so she
 * is pinned below instead of left to the hash.
 *
 * Three bodies that used to sit here are gone, and none of them for taste. The
 * two trenchcoat townsmen 404 (the GLBs are in neither the store nor staging),
 * and the two village elders are the "NPC heads too wide" the operator was
 * looking at: their crown band measures 0.256 of figure height against 0.085 to
 * 0.130 for everyone else in this bank, and normalisation fits a body by TOTAL
 * height, so the oversized head ships at full size. CRAFTSMAN is promoted out
 * of the role-only pins to keep a male body in the rotation at all; it measures
 * 0.089 and is the one proven male civilian left.
 */
export const CIVILIAN_VISUAL_KEYS = [
  WOMAN_WORKER,
  WOMAN_GOWN,
  WOMAN_HOODED,
  WOMAN_SCOUT,
  CRAFTSMAN,
] as const;

export type CivilianVisualKey = (typeof CIVILIAN_VISUAL_KEYS)[number];
/** Any body a townsperson may wear: the rotation plus the one role-only body. */
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
 *   TOWN_GUARD                 militia and named authority
 *   CRAFTSMAN                  forge and workshop, and every other man in town
 *
 * KNOWN GAPS, deliberately not faked (generation queued): there is no blacksmith
 * with an apron, no dockhand, no municipal militia body, and since the elders
 * were rejected on 2026-08-21 no second male body of any kind. CRAFTSMAN stands
 * in at the forge, at the counter and in the chapel, and TOWN_GUARD - the only
 * guard body, and female - carries every militia role, so both repeat heavily.
 * That repetition is visible and intended; substituting a necromancer, a
 * bare-chested warlord, or a chibi-headed elder to avoid it is the exact fault
 * this purge exists to end.
 */
const NPC_ROLE_VISUALS: Record<string, TownBodyKey> = {
  // --- authority and militia ---------------------------------------------------
  marshal_redbrook: TOWN_GUARD,
  captain_thessaly: TOWN_GUARD,
  warden_fenwick: TOWN_GUARD,
  skirmish_footman: TOWN_GUARD,
  skirmish_builder: CRAFTSMAN,
  mercenary_kael: CRAFTSMAN,
  pit_master_grott: CRAFTSMAN,

  // --- forge and workshop ------------------------------------------------------
  smith_haldren: CRAFTSMAN,
  armorer_hode: CRAFTSMAN,
  toolmaster_gethin: CRAFTSMAN,
  forgemistress_darva: WOMAN_WORKER,
  foreman_odell: CRAFTSMAN,
  wren_saddleworth: WOMAN_SCOUT,
  stable_master_wren: WOMAN_SCOUT,

  // --- counters and trade ------------------------------------------------------
  the_merchant: CRAFTSMAN,
  trader_wilkes: WOMAN_GOWN,
  interior_merchant: WOMAN_GOWN,
  provisioner_hale: WOMAN_WORKER,
  quartermaster_bree: WOMAN_WORKER,
  realtor_maribel: WOMAN_GOWN,
  bursar_fernando: CRAFTSMAN,
  interior_innkeeper: WOMAN_GOWN,
  interior_villager: WOMAN_WORKER,
  card_master: WOMAN_GOWN,

  // --- remedies and rites ------------------------------------------------------
  apothecary_lin: WOMAN_HOODED,
  herbalist_yara: WOMAN_WORKER,
  alchemist_sable: WOMAN_HOODED,
  spirit_healer: WOMAN_GOWN,
  brother_halven: CRAFTSMAN,
  brother_halven_marsh: CRAFTSMAN,
  cainhurst_sage: WOMAN_HOODED,
  loremaster_caddis: WOMAN_HOODED,

  // --- records -----------------------------------------------------------------
  chronicler_saul: WOMAN_HOODED,
  chronicler_osric_fenn: CRAFTSMAN,
  chronicler_edda_hartwell: WOMAN_HOODED,

  // --- road, water and boundary ------------------------------------------------
  huntress_verr: WOMAN_SCOUT,
  scout_maren: WOMAN_SCOUT,
  scout_maren_highwatch: WOMAN_SCOUT,
  tidewatcher_ondrel: WOMAN_SCOUT,
  fisherman_brandt: CRAFTSMAN,
  race_marshal_pip: TOWN_GUARD,
  groundskeeper_bram: WOMAN_SCOUT,

  // --- Eastbrook townsfolk -----------------------------------------------------
  weaver_ottilie: WOMAN_HOODED,
  cook_marlow: WOMAN_WORKER,
  tanner_briggs: CRAFTSMAN,
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

export function infernalNpcVisualKey(templateId: string): TownBodyKey {
  // Brother Aldric recurs in every hub under suffixed ids and must stay one
  // recognisable man rather than re-rolling per hub. He wore ELDER_WHITE until
  // that body was rejected; CRAFTSMAN is the only male civilian left.
  if (templateId.startsWith('brother_aldric')) return CRAFTSMAN;
  return NPC_ROLE_VISUALS[templateId] ?? stablePick(templateId, CIVILIAN_VISUAL_KEYS);
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
