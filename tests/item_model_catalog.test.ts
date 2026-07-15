import { describe, expect, it } from 'vitest';
import { itemModelUrl } from '../src/ui/item_model_catalog';

describe('item_model_catalog', () => {
  it('prefers an authored model URL without loading the asset', () => {
    expect(
      itemModelUrl({ id: 'chronicle_blade', kind: 'armor', modelUrl: 'models/items/chronicle_blade.glb' }),
    ).toBe('models/items/chronicle_blade.glb');
  });

  it('routes mapped weapons through the canonical held-weapon catalog', () => {
    expect(itemModelUrl({ id: 'worn_sword', kind: 'weapon' })).toBe('models/weapons/sword_a.glb');
  });

  it('returns null for items without an authored or canonical model', () => {
    expect(itemModelUrl({ id: 'mystery_trinket', kind: 'junk' })).toBeNull();
  });
});
