// Lazy item-model routing for the character sheet and future item surfaces.
// This module only resolves an asset URL; it never fetches or parses a GLB.
// Keeping the resolver separate means a catalog with thousands of Monster
// Chronicle items can be indexed without paying the loading cost up front.

import type { ItemDef } from '../sim/types';
import { itemWeaponModelUrl } from '../render/characters/manifest';

/** Return the authored 3D model URL for an item, or null when the item is still
 * represented by its 2D icon. Weapon items inherit the same variant mapping as
 * the in-world character attachment so the preview and equipped model cannot
 * drift. */
export function itemModelUrl(item: Pick<ItemDef, 'id' | 'kind' | 'modelUrl'>): string | null {
  if (item.modelUrl) return item.modelUrl;
  return item.kind === 'weapon' ? itemWeaponModelUrl(item.id) : null;
}

