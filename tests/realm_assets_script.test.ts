import { describe, expect, it } from 'vitest';
import {
  CURATED_INFERNAL_CLASSES,
  classifyAssetKind,
  classifyRealmFromText,
  INFERNAL_BIPED_ACTIONS,
  limitCandidatesByRealm,
  looksAnimatedName,
  parsePickturaManifestCsv,
  realmIdForFolder,
  realmIdForForgedFolder,
  safeAssetName,
} from '../scripts/build_realm_assets.mjs';

describe('realm asset build helpers', () => {
  it('maps legacy source folders to registry realm ids', () => {
    expect(realmIdForFolder('cryptic realm assets')).toBe('crypticrealm');
    expect(realmIdForFolder('infernal realm assets')).toBe('infernal');
    expect(realmIdForFolder('classic realm assets')).toBe('classic');
    expect(realmIdForFolder('claudcraft realm assets')).toBe('claudecraft');
    expect(realmIdForFolder('arcade void realm assets')).toBe('arcadevoid');
    expect(realmIdForFolder('arcane void realm assets')).toBe('arcadevoid');
  });

  it('maps shared forged-store aliases to canonical realm ids', () => {
    expect(realmIdForForgedFolder('cryptic')).toBe('crypticrealm');
    expect(realmIdForForgedFolder('crypticrealm')).toBe('crypticrealm');
    expect(realmIdForForgedFolder('claudcraft')).toBe('claudecraft');
    expect(realmIdForForgedFolder('claudecraft')).toBe('claudecraft');
    expect(realmIdForForgedFolder('infernal')).toBe('infernal');
  });

  it('classifies Meshy prompts into the intended realm buckets', () => {
    expect(classifyRealmFromText('Baal butcher demon lord')).toBe('infernal');
    expect(classifyRealmFromText('neon void cruiser')).toBe('arcadevoid');
    expect(classifyRealmFromText('ClaudeCraft voxel knight')).toBe('claudecraft');
    expect(classifyRealmFromText('mystic rune mage crystal')).toBe('arcane');
    expect(classifyRealmFromText('Serpentbound Archmage')).toBe('arcane');
    expect(classifyRealmFromText('Gearscale Gunslinger')).toBe('fps');
    expect(classifyRealmFromText('Hooded Goblin Outlaw')).toBe('classic');
  });

  it('detects common Meshy animation export names', () => {
    expect(looksAnimatedName('bone-herald-black-Meshy_AI_Meshy_Merged_Animations.glb')).toBe(true);
    expect(looksAnimatedName('orc_animated_idle.glb')).toBe(true);
    expect(looksAnimatedName('static_flame_base_texture.glb')).toBe(false);
  });

  it('sanitizes names and infers preview kind from metadata', () => {
    expect(safeAssetName('Meshy AI: Baal / Demon!.glb')).toBe('meshy_ai_baal_demon');
    expect(classifyAssetKind('flame altar platform')).toBe('prop');
    expect(classifyAssetKind('unknown export', { skinned: true })).toBe('character');
    expect(classifyAssetKind('battlecruiser')).toBe('vehicle');
    expect(classifyAssetKind('Infernal Dungeon Entrance.glb', { kind: 'prop' })).toBe('prop');
    expect(
      classifyAssetKind('Chest_Pound_Taunt_armature.glb', {
        kind: 'animation',
        skinned: true,
        animationNames: ['Armature|Chest_Pound_Taunt|baselayer'],
      }),
    ).toBe('character');
  });

  it('parses the PICKTURA animated manifest and excludes armature donors', () => {
    const rows = parsePickturaManifestCsv(
      'resultId,filename,kind,action,license,author,bytes\n' +
        'a,019f__Orc_Warlord__Running.glb,animated,Running,cc0,PICKTURA,100\n' +
        'a,019f__Orc_Warlord__Running_armature.glb,animated,Running,cc0,PICKTURA,10\n',
    );
    expect(rows).toEqual([
      {
        resultId: 'a',
        filename: '019f__Orc_Warlord__Running.glb',
        kind: 'animated',
        action: 'Running',
        license: 'cc0',
        author: 'PICKTURA',
        bytes: 100,
      },
    ]);
  });

  it('also parses the static GLB manifest shape', () => {
    const rows = parsePickturaManifestCsv(
      'id,filename,format,license,author,bytes,sha256,source_url\n' +
        'b,019f__Infernal_Gate.glb,glb,cc0,PICKTURA,200,hash,resolved\n',
    );
    expect(rows[0]).toMatchObject({
      resultId: 'b',
      filename: '019f__Infernal_Gate.glb',
      kind: 'glb',
      license: 'cc0',
    });
  });

  it('limits a mounted library before expensive GLB inspection', () => {
    const rows = [
      { realmId: 'infernal', sourceName: 'a.glb' },
      { realmId: 'infernal', sourceName: 'b.glb' },
      { realmId: 'classic', sourceName: 'c.glb' },
    ];
    expect(
      limitCandidatesByRealm(rows, 1).map((row: { sourceName: string }) => row.sourceName),
    ).toEqual(['a.glb', 'c.glb']);
  });

  it('promotes the compact shared action pack', () => {
    // The CURATED_INFERNAL_HUMANS half of this test pinned the table that
    // REGENERATED the condemned bank on every build. Both are gone; the class
    // pack below was never part of that bank and is still pinned.
    expect(CURATED_INFERNAL_CLASSES).toHaveLength(18);
    expect(new Set(CURATED_INFERNAL_CLASSES.map((asset) => asset.outputName)).size).toBe(18);
    expect(CURATED_INFERNAL_CLASSES.map((asset) => asset.outputName)).toEqual(
      expect.arrayContaining([
        'infernal_class_warrior.glb',
        'infernal_class_necromancer.glb',
        'infernal_class_blood_knight.glb',
      ]),
    );
    expect(INFERNAL_BIPED_ACTIONS.map((asset) => asset.outputName)).toEqual(
      expect.arrayContaining([
        'infernal_biped_run.glb',
        'infernal_biped_attack.glb',
        'infernal_biped_cast.glb',
        'infernal_biped_death.glb',
        'infernal_biped_taunt.glb',
      ]),
    );
  });
});
