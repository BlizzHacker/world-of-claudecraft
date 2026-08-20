import { describe, expect, it } from 'vitest';
import { publishedRealmVisualOverrides } from '../src/ui/cryptic/realm_visual_overrides';

describe('published realm visual overrides', () => {
  it('keeps published local and cross-realm bodies while dropping stale GLBs', () => {
    const overrides = {
      'hero:warrior': {
        assetUrl: '/cr-realms/infernal/infernal_class_warrior.glb',
        assetName: 'Iron Warden',
      },
      'hero:bone-herald': {
        assetUrl: '/cr-realms/crypticrealm/bone-herald.glb',
      },
      'npc:uploaded': {
        assetUrl: '/forged/infernal/dark_paladin.glb?revision=4',
      },
      'npc:library': {
        assetUrl: '/asset-library/piktura/abc123.glb',
      },
      'npc:model': {
        assetUrl: '/models/chars/custom_guard.glb',
      },
      'npc:api-asset': {
        assetUrl: '/api/assets/operators/custom_scout.glb',
      },
      'hero:removed': {
        assetUrl: '/cr-realms/infernal/realm_infernal_hero_removed.glb',
      },
      'hero:external': {
        assetUrl: 'https://untrusted.invalid/body.glb',
      },
    };

    expect(
      publishedRealmVisualOverrides(
        overrides,
        new Set([
          '/cr-realms/infernal/infernal_class_warrior.glb',
          '/cr-realms/crypticrealm/bone-herald.glb',
          '/forged/infernal/dark_paladin.glb',
        ]),
      ),
    ).toEqual({
      'hero:warrior': overrides['hero:warrior'],
      'hero:bone-herald': overrides['hero:bone-herald'],
      'npc:uploaded': overrides['npc:uploaded'],
      'npc:library': overrides['npc:library'],
      'npc:model': overrides['npc:model'],
      'npc:api-asset': overrides['npc:api-asset'],
    });
  });

  it('fails closed for catalog assets without discarding editor-served GLBs', () => {
    const overrides = {
      'class:warrior': { assetUrl: '/cr-realms/infernal/removed.glb' },
      'class:rogue': { assetUrl: '/asset-library/piktura/live.glb' },
    };

    expect(publishedRealmVisualOverrides(overrides, new Set())).toEqual({
      'class:rogue': overrides['class:rogue'],
    });
  });
});
