// Per-realm cosmetic season copy for the store banner.
//
// Season identity lives in the realm registry (RealmContent.season) rather than the
// translation catalog, because it is realm CONTENT like name/tagline/mood -- each
// realm names its season after its own game instead of every realm advertising the
// same "Armory". Realms that declare no season (claudecraft, which is deliberately
// pristine upstream) fall through to the shared hudChrome.wocStore.armory* strings,
// so the caller passes the localized string it would otherwise have used and nothing
// about the i18n catalog changes.
//
// Display copy only: the weapon-skin catalog, pricing and grants are untouched.
import { getActiveRealm } from '../sim/realms/registry';

/** 'Season 1' label above the title. */
export function realmSeasonEyebrow(fallback: string): string {
  return getActiveRealm().season?.eyebrow ?? fallback;
}

/** The season's name, e.g. 'The Ember Reliquary'. */
export function realmSeasonTitle(fallback: string): string {
  return getActiveRealm().season?.title ?? fallback;
}

/** One-paragraph blurb under the title. */
export function realmSeasonBody(fallback: string): string {
  return getActiveRealm().season?.body ?? fallback;
}
