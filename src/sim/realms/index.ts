// Realm overlay barrel. Import from here in UI code so the registry path
// is the only seam any consumer touches.
export type { RealmId, RealmContent, RealmClassSkin, RealmClassSkill, RealmClassStats, RealmRole } from './types';
export {
  REALMS,
  REALM_LIST,
  HOME_REALM_LIST,
  DEFAULT_REALM,
  getRealm,
  getActiveRealm,
  resolveActiveRealmId,
  persistActiveRealm,
  isRealmId,
  isCrossRealm,
} from './registry';
export {
  RARITY, RARITY_ORDER, ITEM_SLOTS, AFFIX_POOL,
  rarityRank, rollRarity, generateRealmItem,
} from './rarity';
export type {
  RarityId, RarityDef, RealmItemSlot, RealmItemSlotDef,
  AffixDef, AffixPool, RealmItem, RealmAffixRoll,
} from './rarity';
export { parsePickitFilter, evaluateItem } from './pickit';
export type { PickitOp, PickitCondition, PickitRule, PickitResult } from './pickit';
export { getRealmAssetManifest, realmHasAssets } from './assets';
export type { RealmAssetEntry, RealmAssetManifest } from './assets';
export type { RealmBranding } from './types';
