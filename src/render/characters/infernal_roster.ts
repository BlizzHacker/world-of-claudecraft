/**
 * Authored Infernal civilian and opponent roster.
 *
 * Keep this mapping independent from NPC behavior: template ids still drive
 * quests, vendors, housing, and persistence. Only their rendered bodies vary.
 */

export const INFERNAL_HUMAN_VISUAL_KEYS = [
  'realm_infernal_human_iron_warden',
  'realm_infernal_human_vanguard',
  'realm_infernal_human_forge_worker',
  'realm_infernal_human_white_sage',
  'realm_infernal_human_tainted_hood',
  'realm_infernal_human_weathered_elder',
  'realm_infernal_human_road_mercenary',
  'realm_infernal_human_iron_ranger',
  'realm_infernal_human_hooded_wanderer',
  'realm_infernal_human_hermit',
] as const;

export type InfernalHumanVisualKey = (typeof INFERNAL_HUMAN_VISUAL_KEYS)[number];

const NPC_ROLE_VISUALS: Record<string, InfernalHumanVisualKey> = {
  the_merchant: 'realm_infernal_human_forge_worker',
  marshal_redbrook: 'realm_infernal_human_iron_warden',
  warden_fenwick: 'realm_infernal_human_iron_warden',
  captain_thessaly: 'realm_infernal_human_vanguard',
  trader_wilkes: 'realm_infernal_human_weathered_elder',
  apothecary_lin: 'realm_infernal_human_white_sage',
  herbalist_yara: 'realm_infernal_human_white_sage',
  smith_haldren: 'realm_infernal_human_forge_worker',
  armorer_hode: 'realm_infernal_human_forge_worker',
  foreman_odell: 'realm_infernal_human_forge_worker',
  fisherman_brandt: 'realm_infernal_human_hermit',
  stable_master_wren: 'realm_infernal_human_vanguard',
  mercenary_kael: 'realm_infernal_human_road_mercenary',
  huntress_verr: 'realm_infernal_human_iron_ranger',
  bursar_fernando: 'realm_infernal_human_hooded_wanderer',
  realtor_maribel: 'realm_infernal_human_weathered_elder',
  pit_master_grott: 'realm_infernal_human_vanguard',
  race_marshal_pip: 'realm_infernal_human_iron_ranger',
  groundskeeper_bram: 'realm_infernal_human_hermit',
  loremaster_caddis: 'realm_infernal_human_white_sage',
  cainhurst_sage: 'realm_infernal_human_white_sage',
  brother_halven: 'realm_infernal_human_white_sage',
  brother_halven_marsh: 'realm_infernal_human_white_sage',
  spirit_healer: 'realm_infernal_human_white_sage',
  scout_maren: 'realm_infernal_human_iron_ranger',
  scout_maren_highwatch: 'realm_infernal_human_iron_ranger',
  provisioner_hale: 'realm_infernal_human_weathered_elder',
  quartermaster_bree: 'realm_infernal_human_road_mercenary',
  interior_merchant: 'realm_infernal_human_forge_worker',
  interior_innkeeper: 'realm_infernal_human_weathered_elder',
  interior_villager: 'realm_infernal_human_hooded_wanderer',
  skirmish_builder: 'realm_infernal_human_forge_worker',
  skirmish_footman: 'realm_infernal_human_vanguard',
};

const OPPONENT_KEYS = [
  'realm_infernal_dark_paladin',
  'realm_infernal_human_tainted_hood',
  'realm_cryptic_bone_herald',
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
  if (templateId.startsWith('brother_aldric')) return 'realm_infernal_human_white_sage';
  return (
    NPC_ROLE_VISUALS[templateId] ??
    INFERNAL_HUMAN_VISUAL_KEYS[stableIndex(templateId, INFERNAL_HUMAN_VISUAL_KEYS.length)]
  );
}

export function infernalOpponentVisualKey(templateId: string): (typeof OPPONENT_KEYS)[number] {
  return OPPONENT_KEYS[stableIndex(templateId, OPPONENT_KEYS.length)];
}
