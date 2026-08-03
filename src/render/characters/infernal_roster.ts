/**
 * Authored Infernal civilian and opponent roster.
 *
 * Keep this mapping independent from NPC behavior: template ids still drive
 * quests, vendors, housing, and persistence. Only their rendered bodies vary.
 */

// FOUR of these bodies are defective and must never reach a townsperson:
// forge_worker and hermit shred their arms into spikes on every clip, white_sage
// has no face and no visible arms, and monk is an off-theme modern fighter whose
// arms stay splayed through Walk. They stayed in this list while being the hash
// fallback for every unmapped NPC, so roughly a fifth of the town rendered as
// scarecrows no matter how many individual NPCs were re-pointed by hand. They
// remain registered visuals (so an explicit assignment or an operator override
// can still name one) - they are only removed from the ROTATION.
export const INFERNAL_HUMAN_VISUAL_KEYS = [
  'realm_infernal_human_iron_warden',
  'realm_infernal_human_vanguard',
  'realm_infernal_human_tainted_hood',
  'realm_infernal_human_weathered_elder',
  'realm_infernal_human_road_mercenary',
  'realm_infernal_human_iron_ranger',
  'realm_infernal_human_hooded_wanderer',
  'realm_infernal_human_barbarian',
  'realm_infernal_human_veil_adept',
  'realm_infernal_human_assassin',
  'realm_infernal_human_crusader',
  'realm_infernal_human_spiritborn',
  'realm_infernal_human_blood_knight',
  'realm_infernal_human_tempest',
] as const;

/** Bodies kept registered but barred from the civilian rotation (see above). */
export const INFERNAL_DEFECTIVE_BODY_KEYS = [
  'realm_infernal_human_forge_worker',
  'realm_infernal_human_white_sage',
  'realm_infernal_human_hermit',
  'realm_infernal_human_monk',
] as const;

export type InfernalHumanVisualKey = (typeof INFERNAL_HUMAN_VISUAL_KEYS)[number];

const NPC_ROLE_VISUALS: Record<string, InfernalHumanVisualKey> = {
  // A trader, not a smith: the forge apron read as a blacksmith standing behind the
  // market stall.
  the_merchant: 'realm_infernal_human_hooded_wanderer',
  marshal_redbrook: 'realm_infernal_human_iron_warden',
  warden_fenwick: 'realm_infernal_human_iron_warden',
  captain_thessaly: 'realm_infernal_human_vanguard',
  trader_wilkes: 'realm_infernal_human_weathered_elder',
  // Moved off white_sage, which ships with no face and no arms; the veil adept is the
  // other robed caster body and matches the herbalist she works alongside.
  apothecary_lin: 'realm_infernal_human_veil_adept',
  herbalist_yara: 'realm_infernal_human_veil_adept',
  smith_haldren: 'realm_infernal_human_barbarian',
  armorer_hode: 'realm_infernal_human_barbarian',
  foreman_odell: 'realm_infernal_human_barbarian',
  fisherman_brandt: 'realm_infernal_human_weathered_elder',
  stable_master_wren: 'realm_infernal_human_vanguard',
  mercenary_kael: 'realm_infernal_human_blood_knight',
  // A huntress reads as a ranger, not a hooded assassin (which in-game looks like a
  // witch's outfit and is shared with the cardmaster below).
  huntress_verr: 'realm_infernal_human_iron_ranger',
  bursar_fernando: 'realm_infernal_human_hooded_wanderer',
  realtor_maribel: 'realm_infernal_human_weathered_elder',
  pit_master_grott: 'realm_infernal_human_barbarian',
  race_marshal_pip: 'realm_infernal_human_iron_ranger',
  groundskeeper_bram: 'realm_infernal_human_weathered_elder',
  loremaster_caddis: 'realm_infernal_human_veil_adept',
  cainhurst_sage: 'realm_infernal_human_veil_adept',
  brother_halven: 'realm_infernal_human_veil_adept',
  brother_halven_marsh: 'realm_infernal_human_veil_adept',
  spirit_healer: 'realm_infernal_human_tainted_hood',
  scout_maren: 'realm_infernal_human_iron_ranger',
  scout_maren_highwatch: 'realm_infernal_human_tempest',
  tidewatcher_ondrel: 'realm_infernal_human_tempest',
  provisioner_hale: 'realm_infernal_human_weathered_elder',
  quartermaster_bree: 'realm_infernal_human_road_mercenary',
  interior_merchant: 'realm_infernal_human_barbarian',
  interior_innkeeper: 'realm_infernal_human_weathered_elder',
  interior_villager: 'realm_infernal_human_hooded_wanderer',
  skirmish_builder: 'realm_infernal_human_barbarian',
  skirmish_footman: 'realm_infernal_human_vanguard',

  // --- Eastbrook townsfolk that were falling through to the hash ---------------
  // Station masters and shopkeepers whose job is named right there in the id. Before
  // this they drew whatever stableIndex landed on, which is why the weaver wore a
  // forge apron and the cook wore crusader plate.
  forgemistress_darva: 'realm_infernal_human_barbarian',
  weaver_ottilie: 'realm_infernal_human_veil_adept',
  toolmaster_gethin: 'realm_infernal_human_barbarian',
  cook_marlow: 'realm_infernal_human_weathered_elder',
  tanner_briggs: 'realm_infernal_human_road_mercenary',
  alchemist_sable: 'realm_infernal_human_veil_adept',
  // The card table is a gambler's corner, not an assassin's.
  card_master: 'realm_infernal_human_hooded_wanderer',
  // Chroniclers keep the ledgers: an elder scribe, not a robed caster.
  chronicler_saul: 'realm_infernal_human_weathered_elder',
  chronicler_osric_fenn: 'realm_infernal_human_weathered_elder',
  chronicler_edda_hartwell: 'realm_infernal_human_weathered_elder',
  wren_saddleworth: 'realm_infernal_human_vanguard',
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

function stableIndex(value: string, size: number): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % size;
}

export function infernalNpcVisualKey(templateId: string): InfernalHumanVisualKey {
  if (templateId.startsWith('brother_aldric')) return 'realm_infernal_human_veil_adept';
  return (
    NPC_ROLE_VISUALS[templateId] ??
    INFERNAL_HUMAN_VISUAL_KEYS[stableIndex(templateId, INFERNAL_HUMAN_VISUAL_KEYS.length)]
  );
}

export function infernalOpponentVisualKey(
  templateId: string,
): 'realm_infernal_dark_paladin' | (typeof OPPONENT_KEYS)[number] {
  if (/(?:captain|commander|foreman|warlord|mogger|gorrak|drogmar|brutok)/.test(templateId)) {
    return 'realm_infernal_dark_paladin';
  }
  return OPPONENT_KEYS[stableIndex(templateId, OPPONENT_KEYS.length)];
}

/** Infernal and Cryptic undead rotate through the approved skeleton, spectre,
 * and Bone Herald bank instead of cloning one model across every graveyard. */
export function infernalUndeadVisualKey(
  templateId: string,
): (typeof INFERNAL_UNDEAD_VISUAL_KEYS)[number] {
  if (/(?:restless_bones|bone_herald|bonewalker|gravecaller|necromancer)/.test(templateId)) {
    return 'realm_cryptic_bone_herald';
  }
  return INFERNAL_UNDEAD_VISUAL_KEYS[stableIndex(templateId, INFERNAL_UNDEAD_VISUAL_KEYS.length)];
}

/** Full-size living/corrupted humanoids only. Shared by crossroads realms that
 * must never turn an ordinary bandit or soldier into an undead Bone Herald. */
export function hostileHumanoidVisualKey(
  templateId: string,
): (typeof HOSTILE_HUMANOID_KEYS)[number] {
  return HOSTILE_HUMANOID_KEYS[stableIndex(templateId, HOSTILE_HUMANOID_KEYS.length)];
}
