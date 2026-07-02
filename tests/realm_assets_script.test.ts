import { describe, expect, it } from 'vitest';
import {
  classifyAssetKind,
  classifyRealmFromText,
  looksAnimatedName,
  realmIdForFolder,
  safeAssetName,
} from '../scripts/build_realm_assets.mjs';

describe('realm asset build helpers', () => {
  it('maps legacy source folders to registry realm ids', () => {
    expect(realmIdForFolder('cryptic realm assets')).toBe('crypticrealm');
    expect(realmIdForFolder('infernal realm assets')).toBe('infernal');
    expect(realmIdForFolder('classic realm assets')).toBe('classic');
    expect(realmIdForFolder('claudcraft realm assets')).toBe('claudecraft');
    expect(realmIdForFolder('arcade void realm assets')).toBe('arcadevoid');
  });

  it('classifies Meshy prompts into the intended realm buckets', () => {
    expect(classifyRealmFromText('Baal butcher demon lord')).toBe('infernal');
    expect(classifyRealmFromText('Protoss starcraft void cruiser')).toBe('arcadevoid');
    expect(classifyRealmFromText('ClaudeCraft voxel knight')).toBe('claudecraft');
    expect(classifyRealmFromText('mystic rune mage crystal')).toBe('arcane');
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
  });
});
