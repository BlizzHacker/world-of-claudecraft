// Lazy item-model routing for the character sheet and future item surfaces.
// This module only resolves an asset URL; it never fetches or parses a GLB.
// Keeping the resolver separate means a catalog with thousands of Monster
// Chronicle items can be indexed without paying the loading cost up front.

import { itemWeaponModelUrl } from '../render/characters/manifest';
import type { ItemDef } from '../sim/types';

/** Return the authored 3D model URL for an item, or null when the item is still
 * represented by its 2D icon. Weapon items inherit the same variant mapping as
 * the in-world character attachment so the preview and equipped model cannot
 * drift. */
export function itemModelUrl(item: Pick<ItemDef, 'id' | 'kind' | 'modelUrl'>): string | null {
  const authored = authoredModelUrl(item.modelUrl);
  if (authored) return authored;
  return item.kind === 'weapon' ? itemWeaponModelUrl(item.id) : null;
}

/**
 * Item metadata is content-owned and can eventually be supplied by the
 * Monster Chronicle catalog. Keep the viewer on same-origin GLB paths so a
 * malformed or imported record cannot turn a character-sheet repaint into a
 * cross-origin fetch. The resolver is deliberately synchronous; loading stays
 * lazy in CharacterPreview.
 */
function authoredModelUrl(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!url || /^(?:blob:|data:|https?:|javascript:)/i.test(url)) return null;
  if (!/(?:^|\/)models\//.test(url) && !url.startsWith('/cr-realms/')) return null;
  return url;
}
