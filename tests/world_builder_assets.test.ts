import { describe, expect, it } from 'vitest';
import {
  canonicalBuilderAssetGroup,
  groupWorldBuilderAssets,
  mergeWorldBuilderAssets,
} from '../src/ui/cryptic/world_builder_assets';

describe('in-game ArcForge asset paging', () => {
  it('canonicalizes legacy realm folders without mixing ClaudeCraft into other realms', () => {
    expect(canonicalBuilderAssetGroup('cryptic')).toBe('crypticrealm');
    expect(canonicalBuilderAssetGroup('claudcraft')).toBe('claudecraft');
    expect(canonicalBuilderAssetGroup('Classic Realm')).toBe('classic');
    expect(canonicalBuilderAssetGroup('PICKTURA')).toBe('piktura');
  });

  it('merges additional pages without duplicate placement keys', () => {
    const first = mergeWorldBuilderAssets(
      [],
      [
        {
          placeKey: 'library:piktura/aaaaaaaaaaaaaaaaaaaaaaaa',
          name: 'Warrior',
          group: 'PICKTURA',
        },
      ],
    );
    const second = mergeWorldBuilderAssets(first, [
      {
        placeKey: 'library:piktura/aaaaaaaaaaaaaaaaaaaaaaaa',
        name: 'Warrior Updated',
        group: 'PICKTURA',
      },
      {
        placeKey: 'library:heroforge/bbbbbbbbbbbbbbbbbbbbbbbb',
        name: 'Human Face',
        group: 'HeroForge',
      },
    ]);

    expect(second).toHaveLength(2);
    expect(second[0].name).toBe('Warrior Updated');
    expect(second.map((item) => item.group)).toEqual(['piktura', 'heroforge']);
  });

  it('groups the complete accumulated result in realm-first order', () => {
    const groups = groupWorldBuilderAssets([
      { placeKey: 'library:piktura/aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Zeta', group: 'PICKTURA' },
      { placeKey: 'forged:infernal/gate', name: 'Gate', group: 'infernal' },
      { placeKey: 'library:piktura/bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Alpha', group: 'PICKTURA' },
      { placeKey: 'forged:cryptic/bone', name: 'Bone', group: 'cryptic' },
    ]);

    expect(groups.map((group) => group.id)).toEqual(['crypticrealm', 'infernal', 'piktura']);
    expect(groups[2].items.map((item) => item.name)).toEqual(['Alpha', 'Zeta']);
  });
});
