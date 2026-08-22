import { describe, expect, it } from 'vitest';
import { publishableRealmAssetCandidates } from '../scripts/realm_assets/catalog_policy.mjs';
import { VISUALS } from '../src/render/characters/manifest';

const RETIRED_CLASS_FILES = [
  'infernal_class_warrior.glb',
  'infernal_class_rogue.glb',
  'infernal_class_sorcerer.glb',
  'infernal_class_amazon.glb',
  'infernal_class_barbarian.glb',
  'infernal_class_necromancer.glb',
  'infernal_class_paladin.glb',
  'infernal_class_druid.glb',
  'infernal_class_assassin.glb',
  'infernal_class_demon_hunter.glb',
  'infernal_class_monk.glb',
  'infernal_class_wizard.glb',
  'infernal_class_witch_doctor.glb',
  'infernal_class_crusader.glb',
  'infernal_class_spiritborn.glb',
  'infernal_class_warlock.glb',
  'infernal_class_blood_knight.glb',
  'infernal_class_tempest.glb',
] as const;

describe('retired Infernal miniature class bank', () => {
  it('is not registered as a runtime body', () => {
    for (const file of RETIRED_CLASS_FILES) {
      const key = `realm_${file.replace(/\.glb$/, '')}`;
      expect(VISUALS[key], key).toBeUndefined();
    }
  });

  it('is removed from ArcForge catalogs even when it still exists in a source store', () => {
    const candidates: Array<{
      realmId: string;
      sourceName: string;
      outputName: string;
    }> = RETIRED_CLASS_FILES.map((sourceName) => ({
      realmId: 'infernal',
      sourceName,
      outputName: sourceName,
    }));
    candidates.push(
      {
        realmId: 'infernal',
        sourceName: 'realm_infernal_class_warrior_f.glb',
        outputName: 'realm_infernal_class_warrior_f.glb',
      },
      {
        realmId: 'infernal',
        sourceName: 'realm_infernal_hero_blood_knight_f.glb',
        outputName: 'realm_infernal_hero_blood_knight_f.glb',
      },
      {
        realmId: 'claudecraft',
        sourceName: 'infernal_class_warrior.glb',
        outputName: 'infernal_class_warrior.glb',
      },
    );

    expect(publishableRealmAssetCandidates(candidates)).toEqual(candidates.slice(-3));
  });
});
