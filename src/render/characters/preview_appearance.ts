import type { PlayerClass } from '../../sim/types';
import type { WeaponLayoutOverride } from './manifest';
import { mechHeldWeaponOverride } from './manifest';

/** A character's real, in-world appearance for the char-select / char-sheet
 *  turntable: body class, appearance skin, whether it is the class rig or the
 *  class-agnostic Combat Mech cosmetic, and the equipped mainhand (null when
 *  unarmed, so the preview shows no weapon rather than a class default). */
export interface PreviewAppearance {
  visualKey?: string | null;
  cls: PlayerClass;
  skin: number;
  skinCatalog: 'class' | 'mech';
  mainhandItemId: string | null;
  /** The active Armory weapon-skin cosmetic, or null/absent for none. */
  weaponSkinId?: string | null;
  /** Optional for older character-summary callers; absent renders no offhand. */
  offhandItemId?: string | null;
}

/** The model key + held-weapon layout the appearance resolves to. */
export interface PreviewVisual {
  visualKey: string;
  weaponItemId: string | null;
  offhandItemId: string | null;
  weaponOverride: WeaponLayoutOverride | null;
}

/** Resolve an appearance to its concrete visual, mirroring createCharacterVisual
 *  (index.ts): the Mech is a separate body (`player_mech`) that adopts the wearer
 *  class's hand layout (a rogue mech dual-wields), while the class rig uses
 *  `player_<class>` with no override. Kept DOM/Three-free so it is unit-tested. */
export function previewAppearanceVisual(a: PreviewAppearance): PreviewVisual {
  const mech = a.skinCatalog === 'mech';
  return {
    visualKey: mech ? 'player_mech' : (a.visualKey ?? `player_${a.cls}`),
    weaponItemId: a.mainhandItemId ?? null,
    offhandItemId: a.offhandItemId ?? null,
    weaponOverride: mech ? mechHeldWeaponOverride(a.cls) : null,
  };
}

/** The rig to remount when a lazy body fetch FAILS while nothing is on the
 *  turntable. Requesting a themed body first discards a mounted stock rig
 *  (discardStockVisual), so a failed fetch used to leave the preview EMPTY for
 *  the session. The class rig is always boot-resident (charactersReady), so it
 *  is the safe floor; the one body that must never fall back is the class rig
 *  itself, or a resident-asset failure would re-request itself forever. Kept
 *  DOM/Three-free so it is unit-tested (tests/preview_appearance.test.ts). */
export function previewFallbackVisualKey(
  failedVisualKey: string,
  cls: PlayerClass | null,
): string | null {
  if (!cls) return null;
  const fallback = `player_${cls}`;
  return failedVisualKey === fallback ? null : fallback;
}

/** Stable identity of an appearance, so an async mech re-apply can bail out if a
 *  newer selection superseded it. */
export function appearanceSignature(a: PreviewAppearance): string {
  // weaponSkinId is part of the identity: without it, applying or removing an
  // Armory skin while a preview is mounted elides as "same appearance" and the
  // stale weapon model survives the repaint.
  // visualKey likewise: two roster characters can share class, skin and gear and
  // still be different BODIES (a realm hero vs the class rig), so leaving it out
  // makes them one appearance to every staleness guard keyed on this string.
  // tests/preview_appearance.test.ts has pinned this since the field was added.
  return `${a.cls}|${a.skin}|${a.skinCatalog}|${a.mainhandItemId ?? ''}|${a.offhandItemId ?? ''}|${a.weaponSkinId ?? ''}|${a.visualKey ?? ''}`;
}
