import type { PlayerClass } from '../types';
import { infernalCharacterSelection } from './infernal_classes';
import type { RealmId } from './types';

export type RealmRuntimeVisualKey =
  | 'realm_cryptic_bone_herald'
  | 'realm_infernal_crimson_behemoth'
  | 'realm_infernal_horned_demon'
  | 'realm_infernal_skullbeast'
  | 'realm_infernal_dark_paladin'
  | 'hellmaw_sigilbound_body'
  | 'realm_classic_orc'
  | 'realm_classic_big_orc'
  | 'realm_classic_fighting_elf'
  | 'realm_classic_dwarf'
  | 'realm_classic_female_elf'
  | 'realm_classic_female_orc'
  | 'realm_classic_treasure_dwarf'
  | 'realm_classic_kitty'
  | 'realm_infernal_class_warrior'
  | 'realm_infernal_class_rogue'
  | 'realm_infernal_class_sorcerer'
  | 'realm_infernal_class_amazon'
  | 'realm_infernal_class_barbarian'
  | 'realm_infernal_class_necromancer'
  | 'realm_infernal_class_paladin'
  | 'realm_infernal_class_druid'
  | 'realm_infernal_class_assassin'
  | 'realm_infernal_class_demon_hunter'
  | 'realm_infernal_class_monk'
  | 'realm_infernal_class_wizard'
  | 'realm_infernal_class_witch_doctor'
  | 'realm_infernal_class_crusader'
  | 'realm_infernal_class_spiritborn'
  | 'realm_infernal_class_warlock'
  | 'realm_infernal_class_blood_knight'
  | 'realm_infernal_class_tempest'
  | 'realm_infernal_human_iron_warden'
  | 'realm_infernal_human_vanguard'
  | 'realm_infernal_human_forge_worker'
  | 'realm_infernal_human_white_sage'
  | 'realm_infernal_human_tainted_hood'
  | 'realm_infernal_human_weathered_elder'
  | 'realm_infernal_human_road_mercenary'
  | 'realm_infernal_human_iron_ranger'
  | 'realm_infernal_human_hooded_wanderer'
  | 'realm_infernal_human_hermit'
  | 'realm_infernal_human_barbarian'
  | 'realm_infernal_human_veil_adept'
  | 'realm_infernal_human_assassin'
  | 'realm_infernal_human_monk'
  | 'realm_infernal_human_crusader'
  | 'realm_infernal_human_spiritborn'
  | 'realm_infernal_human_blood_knight'
  | 'realm_infernal_human_tempest'
  | 'realm_infernal_durance_humanoid';

const REALM_CLASS_VISUALS: Partial<
  Record<RealmId, Partial<Record<PlayerClass, RealmRuntimeVisualKey>>>
> = {
  crypticrealm: {
    warrior: 'realm_infernal_human_iron_warden',
    paladin: 'realm_infernal_human_vanguard',
    hunter: 'realm_infernal_human_iron_ranger',
    rogue: 'realm_infernal_human_road_mercenary',
    priest: 'realm_infernal_human_white_sage',
    shaman: 'realm_infernal_human_weathered_elder',
    mage: 'realm_infernal_human_hooded_wanderer',
    warlock: 'realm_infernal_human_forge_worker',
    druid: 'realm_infernal_human_hermit',
  },
  infernal: {
    warrior: 'realm_infernal_class_warrior',
    paladin: 'realm_infernal_class_paladin',
    hunter: 'realm_infernal_class_amazon',
    rogue: 'realm_infernal_class_rogue',
    priest: 'realm_infernal_class_sorcerer',
    shaman: 'realm_infernal_class_monk',
    mage: 'realm_infernal_class_wizard',
    warlock: 'realm_infernal_class_warlock',
    druid: 'realm_infernal_class_druid',
  },
  classic: {
    warrior: 'realm_classic_dwarf',
    paladin: 'realm_classic_fighting_elf',
    hunter: 'realm_classic_orc',
    rogue: 'realm_classic_female_orc',
    priest: 'realm_classic_female_elf',
    shaman: 'realm_classic_big_orc',
    mage: 'realm_classic_treasure_dwarf',
    druid: 'realm_classic_kitty',
  },
};

export function normalizeRealmVisualId(name: string | null | undefined): RealmId | null {
  const key = (name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!key) return null;
  if (key.includes('infernal')) return 'infernal';
  if (
    key.includes('arcanevoid') ||
    key.includes('arcadevoid') ||
    key.includes('starcraft') ||
    key.includes('terran') ||
    key.includes('protoss') ||
    key.includes('zerg') ||
    key.includes('arcade')
  )
    return 'arcadevoid';
  if (key === 'arcane' || key.includes('arcanenexus') || key.includes('arcanecrystal'))
    return 'arcane';
  if (key.includes('classic')) return 'classic';
  if (key.includes('claudecraft') || key.includes('claudcraft') || key.includes('claude'))
    return 'claudecraft';
  if (key.includes('dominion')) return 'dominion';
  if (key.includes('exchange')) return 'exchange';
  if (key.includes('fps')) return 'fps';
  if (key.includes('cryptic')) return 'crypticrealm';
  if (key.includes('void')) return 'arcadevoid';
  return null;
}

export function realmClassVisualKey(
  realmNameOrId: string | null | undefined,
  cls: PlayerClass,
): RealmRuntimeVisualKey | null {
  const realm = normalizeRealmVisualId(realmNameOrId);
  if (!realm) return null;
  return REALM_CLASS_VISUALS[realm]?.[cls] ?? null;
}

export function resolveRealmCharacterVisual(
  realmNameOrId: string | null | undefined,
  cls: PlayerClass,
  realmHeroId: unknown,
): { realmHeroId: string | null; visualKey: RealmRuntimeVisualKey | null } {
  const selected = infernalCharacterSelection(realmNameOrId ?? '', realmHeroId, cls);
  if (selected) return { realmHeroId: selected.id, visualKey: selected.visualKey };
  return { realmHeroId: null, visualKey: realmClassVisualKey(realmNameOrId, cls) };
}
