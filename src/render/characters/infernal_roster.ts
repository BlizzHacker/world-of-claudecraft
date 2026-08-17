/**
 * Authored Infernal civilian and opponent roster.
 *
 * Keep this mapping independent from NPC behavior: template ids still drive
 * quests, vendors, housing, and persistence. Only their rendered bodies vary.
 */

// The bodies named below are the CONDEMNED bank: reviewed body by body on a
// render sheet and rejected in full by the owner on 2026-08-17, and marked
// 15 reject / 2 marginal / 0 ship by the phase-1 body catalog independently.
//
// They are still named here ONLY because the replacement civilian bodies do
// not exist yet: this rotation bodies ~105 townspeople, and the approved pool
// has no townspeople in it. Casting a shopkeeper as a necromancer is the
// fault this purge exists to end, so these wait for the craftsman, merchant,
// guard, townswoman and townsman bodies now in generation.
//
// Wade's 2026-08-08 audit, which is why the rotation is this short, moved
// VERBATIM to docs/condemned-body-bank.md when the bank was purged.
// tests/condemned_body_bank_guard.test.ts holds these counts on a ratchet
// that can only shrink.
export const INFERNAL_HUMAN_VISUAL_KEYS = [
  'realm_infernal_human_iron_warden',
  'realm_infernal_human_weathered_elder',
  'realm_infernal_human_hooded_wanderer',
  'realm_infernal_human_assassin',
] as const;
// 2026-08-17: the shirtless-monk body was REMOVED from this rotation, and its
// manifest registration deleted, so the renderer can no longer reach it at
// all. It is a modern MMA fighter in gym shorts, and the operator found one of
// them (Pit Master Grott) walking the Infernal town: "i don't like seeing
// someone walking around in their underwear". Every template that resolved to
// it is covered by a published override on both infernal and crypticrealm, but
// overrides only cover templates that EXIST - leaving the body in this array
// meant the next NPC added could hash straight back onto it. Taking it out of
// the rotation closes that. Rendezvous hashing only re-rolls the ids that were
// using the removed key, and every one of those is overridden, so no other
// townsperson changes body.

/**
 * Bodies kept registered (an explicit assignment or an operator override can
 * still name one) but barred from the civilian rotation.
 *
 * Wade's audit - what is wrong with each one, grouped by fault, and what the
 * repair attempts did and did not fix - moved VERBATIM to
 * docs/condemned-body-bank.md when the condemned bank was purged.
 */
export const INFERNAL_DEFECTIVE_BODY_KEYS = [
  'realm_infernal_human_forge_worker',
  'realm_infernal_human_white_sage',
  'realm_infernal_human_hermit',
  'realm_infernal_human_vanguard',
  'realm_infernal_human_road_mercenary',
  'realm_infernal_human_iron_ranger',
  'realm_infernal_human_barbarian',
  'realm_infernal_human_veil_adept',
  'realm_infernal_human_crusader',
  'realm_infernal_human_spiritborn',
  'realm_infernal_human_tempest',
  'realm_infernal_human_tainted_hood',
  'realm_infernal_human_blood_knight',
  // assassin was here until 2026-08-15; repaired and rendered, see the note on
  // INFERNAL_HUMAN_VISUAL_KEYS above.
] as const;

/**
 * The playable class bank has the same disease. These keys are still
 * registered and still selectable as hero cards, but no class table may point
 * at one.
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

export type InfernalHumanVisualKey = (typeof INFERNAL_HUMAN_VISUAL_KEYS)[number];

// Every role that used to name a barred body now names one of the three that
// work. The mapping is deliberately explicit rather than falling through to the
// hash so the intent per role survives the next time the bank changes:
//   iron_warden      -> anyone armed, armoured, or physically heavy
//   weathered_elder  -> anyone older, seated behind a counter, or keeping records
//   hooded_wanderer  -> anyone robed, hooded, scholarly, or on the road
//   monk             -> bare-chested fighters only. It reads as a pit fighter,
//                       so it is cast where that is the point rather than left
//                       to the hash, which would put a shirtless man behind a
//                       shop counter.
const NPC_ROLE_VISUALS: Record<string, InfernalHumanVisualKey> = {
  the_merchant: 'realm_infernal_human_hooded_wanderer',
  marshal_redbrook: 'realm_infernal_human_iron_warden',
  warden_fenwick: 'realm_infernal_human_iron_warden',
  // was vanguard: that body has no forearms and no hands
  captain_thessaly: 'realm_infernal_human_iron_warden',
  trader_wilkes: 'realm_infernal_human_weathered_elder',
  // was veil_adept: its right hand carries no weight, so that arm never moves
  apothecary_lin: 'realm_infernal_human_hooded_wanderer',
  herbalist_yara: 'realm_infernal_human_hooded_wanderer',
  // was barbarian: hands fused to the belt on every clip
  smith_haldren: 'realm_infernal_human_iron_warden',
  armorer_hode: 'realm_infernal_human_iron_warden',
  foreman_odell: 'realm_infernal_human_iron_warden',
  fisherman_brandt: 'realm_infernal_human_weathered_elder',
  stable_master_wren: 'realm_infernal_human_iron_warden',
  // was blood_knight: a blue horned demoness standing in as a human mercenary
  mercenary_kael: 'realm_infernal_human_iron_warden',
  // was iron_ranger: its lower body shears into a single flat plank
  huntress_verr: 'realm_infernal_human_hooded_wanderer',
  bursar_fernando: 'realm_infernal_human_hooded_wanderer',
  realtor_maribel: 'realm_infernal_human_weathered_elder',
  // was monk (the shirtless MMA body). Live he is on a published override
  // (realm_infernal_hero_demon_hunter); this keeps the compiled fallback legal.
  pit_master_grott: 'realm_infernal_human_iron_warden',
  race_marshal_pip: 'realm_infernal_human_hooded_wanderer',
  groundskeeper_bram: 'realm_infernal_human_weathered_elder',
  loremaster_caddis: 'realm_infernal_human_hooded_wanderer',
  cainhurst_sage: 'realm_infernal_human_hooded_wanderer',
  brother_halven: 'realm_infernal_human_hooded_wanderer',
  brother_halven_marsh: 'realm_infernal_human_hooded_wanderer',
  // was tainted_hood: its hem tears into a slab that lies on the ground
  spirit_healer: 'realm_infernal_human_hooded_wanderer',
  scout_maren: 'realm_infernal_human_hooded_wanderer',
  // was tempest: frozen arms, no hands
  scout_maren_highwatch: 'realm_infernal_human_hooded_wanderer',
  tidewatcher_ondrel: 'realm_infernal_human_hooded_wanderer',
  provisioner_hale: 'realm_infernal_human_weathered_elder',
  // was road_mercenary: forearms end in flat blades, no hands
  quartermaster_bree: 'realm_infernal_human_hooded_wanderer',
  interior_merchant: 'realm_infernal_human_iron_warden',
  interior_innkeeper: 'realm_infernal_human_weathered_elder',
  interior_villager: 'realm_infernal_human_hooded_wanderer',
  skirmish_builder: 'realm_infernal_human_iron_warden',
  skirmish_footman: 'realm_infernal_human_iron_warden',

  // --- Eastbrook townsfolk -----------------------------------------------------
  forgemistress_darva: 'realm_infernal_human_iron_warden',
  weaver_ottilie: 'realm_infernal_human_hooded_wanderer',
  toolmaster_gethin: 'realm_infernal_human_iron_warden',
  cook_marlow: 'realm_infernal_human_weathered_elder',
  tanner_briggs: 'realm_infernal_human_hooded_wanderer',
  alchemist_sable: 'realm_infernal_human_hooded_wanderer',
  card_master: 'realm_infernal_human_hooded_wanderer',
  chronicler_saul: 'realm_infernal_human_weathered_elder',
  chronicler_osric_fenn: 'realm_infernal_human_weathered_elder',
  chronicler_edda_hartwell: 'realm_infernal_human_weathered_elder',
  wren_saddleworth: 'realm_infernal_human_iron_warden',
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

export function infernalNpcVisualKey(templateId: string): InfernalHumanVisualKey {
  // was veil_adept, whose right arm never moves
  if (templateId.startsWith('brother_aldric')) return 'realm_infernal_human_hooded_wanderer';
  return (
    NPC_ROLE_VISUALS[templateId] ??
    stablePick(templateId, INFERNAL_HUMAN_VISUAL_KEYS)
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
