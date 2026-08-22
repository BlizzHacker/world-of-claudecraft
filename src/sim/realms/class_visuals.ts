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
  | 'realm_infernal_durance_humanoid';

function authoredClassPack(realmId: 'classic' | 'dominion' | 'arcane' | 'arcadevoid' | 'fps') {
  return {
    warrior: `realm_${realmId}_class_warrior`,
    paladin: `realm_${realmId}_class_paladin`,
    hunter: `realm_${realmId}_class_hunter`,
    rogue: `realm_${realmId}_class_rogue`,
    priest: `realm_${realmId}_class_priest`,
    shaman: `realm_${realmId}_class_shaman`,
    mage: `realm_${realmId}_class_mage`,
    warlock: `realm_${realmId}_class_warlock`,
    druid: `realm_${realmId}_class_druid`,
  } satisfies Record<PlayerClass, RealmRuntimeVisualKey>;
}

const REALM_CLASS_VISUALS: Partial<
  Record<RealmId, Partial<Record<PlayerClass, RealmRuntimeVisualKey>>>
> = {
  // Cryptic Realm deliberately mixes the authored realm packs. Every class has
  // a distinct full-size body and the creator/runtime resolve the same key.
  crypticrealm: {
    warrior: 'realm_crypticrealm_rune_warden',
    paladin: 'realm_classic_class_paladin',
    hunter: 'realm_infernal_hero_demon_hunter',
    rogue: 'realm_fps_class_rogue',
    priest: 'realm_dominion_class_priest',
    shaman: 'realm_dominion_class_shaman',
    mage: 'realm_arcane_class_mage',
    warlock: 'realm_arcane_class_warlock',
    druid: 'realm_classic_class_druid',
  },
  // The base-class fallback is human and distinct. Infernal's expanded creator
  // still persists a realmHeroId, which resolves to its specific 18-class or
  // Ashen Court body ahead of these nine compatibility entries.
  infernal: {
    // 2026-08-18: every entry repointed off the `infernal_class_*` chibi bank onto the
    // body the live infernal document publishes for the same class. Nine distinct bodies,
    // no sharing; the female halves live in the published class:<cls>:f rows.
    warrior: 'realm_crypticrealm_rune_warden',
    paladin: 'realm_infernal_hero_blood_knight_f',
    hunter: 'realm_infernal_hero_demon_hunter',
    // 2026-08-21: repointed off realm_crypticrealm_realistic_humanoid_assassin_wearing_01938289,
    // the white hooded assassin the audit flagged as a third-party likeness.
    // This is the realm's own reviewed rogue body and is present in the store.
    rogue: 'realm_infernal_class_rogue_f',
    priest: 'realm_infernal_violet_necromancer_necromancer_m_019cb976',
    shaman: 'realm_infernal_hero_monk',
    mage: 'realm_infernal_hero_wizard',
    warlock: 'realm_infernal_hero_warlock',
    druid: 'realm_infernal_hero_druid',
  },
  // The compact Classic pack is the only Classic roster in the published
  // catalog with all ten gameplay clips. The older hand-written keys still
  // point at pre-recovery filenames and silently fall back to KayKit.
  classic: authoredClassPack('classic'),
  dominion: authoredClassPack('dominion'),
  arcane: authoredClassPack('arcane'),
  arcadevoid: authoredClassPack('arcadevoid'),
  fps: authoredClassPack('fps'),
  // The Exchange is a visitor hub rather than a creator, but an old character
  // row without its persisted home-realm key still must not become KayKit.
  exchange: {
    warrior: 'realm_classic_class_warrior',
    paladin: 'realm_classic_class_paladin',
    hunter: 'realm_arcadevoid_class_hunter',
    rogue: 'realm_fps_class_rogue',
    priest: 'realm_dominion_class_priest',
    shaman: 'realm_dominion_class_shaman',
    mage: 'realm_arcane_class_mage',
    warlock: 'realm_arcane_class_warlock',
    druid: 'realm_classic_class_druid',
  },
};

export function normalizeRealmVisualId(name: string | null | undefined): RealmId | null {
  const key = (name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!key) return null;
  if (key.includes('infernal')) return 'infernal';
  // Franchise-name aliases (starcraft/terran/protoss/zerg) were dropped here:
  // no visual key, roster row, store filename or published realm_visuals
  // override has ever carried one, so they matched nothing and only kept the
  // names alive in source. The realm's own aliases below still resolve it.
  if (key.includes('arcanevoid') || key.includes('arcadevoid') || key.includes('arcade'))
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
  // Generated non-Infernal hero ids are still accepted for backward
  // compatibility, but their old generated GLBs were removed from the
  // published catalog. Preserve the chosen identity while routing its body to
  // the realm's working class pack. Infernal owns a curated, published hero
  // roster and keeps its per-archetype visual.
  if (selected) {
    const realm = normalizeRealmVisualId(realmNameOrId);
    return {
      realmHeroId: selected.id,
      visualKey:
        realm === 'infernal'
          ? selected.visualKey
          : (realmClassVisualKey(realmNameOrId, cls) ?? selected.visualKey),
    };
  }
  return { realmHeroId: null, visualKey: realmClassVisualKey(realmNameOrId, cls) };
}
