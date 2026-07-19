import type { PlayerClass } from '../types';
import type { RealmId } from './types';

export type RealmRuntimeVisualKey =
  | 'realm_cryptic_bone_herald'
  | 'realm_infernal_crimson_behemoth'
  | 'realm_infernal_horned_demon'
  | 'realm_infernal_skullbeast'
  | 'realm_classic_orc'
  | 'realm_classic_big_orc'
  | 'realm_classic_fighting_elf'
  | 'realm_classic_dwarf'
  | 'realm_classic_female_elf'
  | 'realm_classic_female_orc'
  | 'realm_classic_treasure_dwarf'
  | 'realm_classic_kitty'
  | 'realm_infernal_durance_humanoid';

const REALM_CLASS_VISUALS: Partial<
  Record<RealmId, Partial<Record<PlayerClass, RealmRuntimeVisualKey>>>
> = {
  crypticrealm: {
    warlock: 'realm_cryptic_bone_herald',
  },
  infernal: {
    warrior: 'realm_infernal_durance_humanoid',
    paladin: 'realm_infernal_durance_humanoid',
    hunter: 'realm_infernal_durance_humanoid',
    rogue: 'realm_infernal_durance_humanoid',
    priest: 'realm_infernal_durance_humanoid',
    shaman: 'realm_infernal_durance_humanoid',
    mage: 'realm_infernal_durance_humanoid',
    warlock: 'realm_infernal_durance_humanoid',
    druid: 'realm_infernal_durance_humanoid',
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
