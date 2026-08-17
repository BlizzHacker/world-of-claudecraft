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
  // The condemned body bank's 18 keys were removed from this union on
  // 2026-08-17; see docs/condemned-body-bank.md.
  | 'realm_infernal_durance_humanoid';

const REALM_CLASS_VISUALS: Partial<
  Record<RealmId, Partial<Record<PlayerClass, RealmRuntimeVisualKey>>>
> = {
  // The whole condemned body bank came out of here on 2026-08-17. The nine
  // classes below no longer share four bodies between them: each names a
  // distinct body from the approved catalog (verdict ship / ship-with-caveat
  // AND examinedCellByCell), each looked at on its phase-1 contact sheet, none
  // with a weapon baked into its hands. The audit record for what was removed
  // and why is docs/condemned-body-bank.md.
  //
  // These are the RUNTIME keys and they are kept in step with the compiled card
  // bodies in ui/cryptic/realm_class_presentation.ts, so the create screen and
  // the world agree for a player who has no published override. Six of the nine
  // are additionally published as `class:*` overrides, which win over both.
  //
  // The three marked GAP are placeholders held until their real bodies land.
  crypticrealm: {
    warrior: 'realm_infernal_hero_dark_paladin',
    paladin: 'realm_infernal_evil_warlord_armor_made_0196a156', // GAP: Gargoyle Oathsworn
    hunter: 'realm_infernal_hero_demon_hunter',
    rogue: 'realm_crypticrealm_realistic_humanoid_assassin_wearing_01942e8f',
    priest: 'realm_arcane_all_seeing_sage_sage_019e1733',
    shaman: 'realm_infernal_class_shaman_f', // GAP: Grave Totemist
    mage: 'realm_arcane_mystic_sentinel_characters_01968757',
    warlock: 'realm_infernal_hero_warlock',
    druid: 'realm_infernal_class_druid_f', // GAP: Chimera Warden
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
