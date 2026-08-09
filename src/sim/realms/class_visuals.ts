import type { PlayerClass } from '../types';
import { infernalCharacterSelection } from './infernal_classes';
import type { RealmId } from './types';

// Widened to include pipeline-generated bodies: the per-realm rosters bind to keys
// from GENERATED_VISUALS, which are not enumerable in this union.
export type RealmRuntimeVisualKey = string;
export type RealmRuntimeVisualKeyLegacy =
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
  // Six of these nine pointed at a body whose arms do not move. Repointed
  // 2026-08-08 onto bodies rendered at four phases each of Idle, Walk and
  // Attack and looked at; see INFERNAL_DEFECTIVE_BODY_KEYS for what each one
  // was doing wrong. The bank cannot currently field nine distinct working
  // bodies, so classes share until it is repaired.
  crypticrealm: {
    warrior: 'realm_infernal_human_iron_warden',
    // was vanguard: no forearms and no hands, frozen stubs at the pauldrons
    paladin: 'realm_infernal_human_iron_warden',
    // was iron_ranger: LeftHand carries no weight and the lower body shears flat
    hunter: 'realm_infernal_human_hooded_wanderer',
    // was road_mercenary: forearms end in flat blades, no hands
    rogue: 'realm_infernal_human_hooded_wanderer',
    // was white_sage: no face under the hat, arm stubs, plank feet
    priest: 'realm_infernal_human_hooded_wanderer',
    shaman: 'realm_infernal_human_weathered_elder',
    mage: 'realm_infernal_human_hooded_wanderer',
    // was forge_worker: arms locked straight out in a T through every clip
    warlock: 'realm_infernal_human_hooded_wanderer',
    // was hermit: same kite failure, plus a LeftHand that carries no weight
    druid: 'realm_infernal_human_weathered_elder',
  },
  // Seven of these nine pointed at a body that fails in motion; see
  // INFERNAL_DEFECTIVE_CLASS_BODY_KEYS. The three survivors of the class bank
  // are warrior, blood_knight and demon_hunter, with rogue and witch_doctor
  // acceptable, so the nine classes share five bodies until the bank is fixed.
  infernal: {
    warrior: 'realm_infernal_class_warrior',
    // was paladin: both feet stretch into flat pale planks
    paladin: 'realm_infernal_class_blood_knight',
    // was amazon: feet tear off into planks in Attack, plus a finger spike
    hunter: 'realm_infernal_class_demon_hunter',
    rogue: 'realm_infernal_class_rogue',
    // was sorcerer: a full T-pose held through Idle and Walk, shredded sleeves
    priest: 'realm_infernal_class_witch_doctor',
    // was monk: bind span 0.94, arms stay splayed through Walk
    shaman: 'realm_infernal_class_witch_doctor',
    // was wizard: frozen arms, no hands, slab under the gown every Idle frame
    mage: 'realm_infernal_class_witch_doctor',
    // was warlock: the worst body in the bank - no arm weight on either hand
    warlock: 'realm_infernal_class_witch_doctor',
    // was druid: hands fused to the belt, feet torn into planks
    druid: 'realm_infernal_class_rogue',
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
