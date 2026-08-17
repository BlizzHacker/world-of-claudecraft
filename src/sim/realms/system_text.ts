// Per-realm display titles for NAMED UI SYSTEMS that live outside the i18n
// catalog: the fork's own in-game reference tools (Skill Trees, Loot Vault,
// Pickit Filter, Monster Chronicle).
//
// The built-in windows (Talents, Spell Book, Items, Dungeon Finder, ...) are
// catalog keys, so a realm re-skins their titles through
// RealmEntityText.catalog, which t() already resolves before the locale table.
// The fork tools have no catalog keys at all - they are English-only fork
// surfaces - so this is their equivalent seam: same sparse, id-keyed,
// display-only contract, resolved from the active realm.
//
// DISPLAY ONLY. The system ids below are identifiers: element ids, localStorage
// keys and save data never move here.

import { getActiveRealm } from './registry';
import type { RealmSystemId } from './types';

/**
 * The active realm's display title for one named system, or `fallback` when the
 * realm does not re-skin it. Never throws: a host without a resolvable realm
 * (the landing document before a realm is chosen) falls back too.
 */
export function realmSystemTitle(id: RealmSystemId, fallback: string): string {
  try {
    const systems = getActiveRealm().entityText?.systems;
    if (!systems || !Object.hasOwn(systems, id)) return fallback;
    const value = systems[id];
    return typeof value === 'string' && value.length > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}
