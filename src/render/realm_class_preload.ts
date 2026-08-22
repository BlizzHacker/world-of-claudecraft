// Stage-1 (bytes-only) preload of the active realm's nine class bodies.
//
// The boot sweep deliberately skips lazyPreload realm bodies: fetching every
// authored full-size humanoid at import would add hundreds of megabytes to
// every client's load. The cost of that laziness lands at world entry: the
// player's own class body (and every same-realm class nearby) resolves to a
// lazy key, so its GLB decode races the scene build and the body pops in a
// beat late through the fail-soft view-create path. This module resolves the
// class-to-body chain up front, the same overrideEntryForCharacter and
// realmClassVisualKey precedence visualKeyForCharacter runs for every other
// surface, and fetches the lazy results behind the loading curtain. It is
// stage 1 of the preloadDelveAssets pattern (renderer.ts): bytes into cache
// only; shader linking stays with the live compile gates.
//
// main.ts calls preloadRealmClassVisuals before prewarmInitialScene, gated on
// !GFX.constrainedMemory: the phone-class memory ceiling profile keeps its
// deliberately minimal entry set and streams bodies on demand instead.

import { ALL_CLASSES } from '../sim/types';
import { preloadVisualAssets, visualAssetsReady } from './characters/assets';
import { isVisualLazy, visualKeyForCharacter } from './characters/manifest';

/**
 * The distinct lazy visual keys the realm's nine class bodies resolve to.
 * Pure over the manifest dispatch: resolves each class through
 * visualKeyForCharacter (operator override, then the compiled realm pack,
 * then the class rig) and keeps only the keys the boot sweep excluded.
 * A realm whose classes all resolve to eagerly loaded rigs returns [].
 */
export function lazyRealmClassVisualKeys(realm?: string | null): string[] {
  const keys = new Set<string>();
  for (const cls of ALL_CLASSES) {
    const key = visualKeyForCharacter({ cls, realm });
    if (isVisualLazy(key)) keys.add(key);
  }
  return [...keys];
}

/**
 * Fetch the active realm's lazy class bodies into the asset cache. Memoized
 * per key by preloadVisualAssets, so a body another path already requested
 * costs nothing. Best-effort: a failed fetch is swallowed here because the
 * live view path re-kicks the preload on demand and falls back gracefully
 * while it is in flight; entry must never wedge on a cosmetic body.
 */
export async function preloadRealmClassVisuals(realm?: string | null): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  for (const key of lazyRealmClassVisualKeys(realm)) {
    if (!visualAssetsReady(key)) jobs.push(preloadVisualAssets(key).catch(() => undefined));
  }
  await Promise.all(jobs);
}
