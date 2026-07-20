// Realm overlay barrel. Import from here in UI code so the registry path
// is the only seam any consumer touches.

export type { RealmAssetEntry, RealmAssetManifest } from './assets';
export { getRealmAssetManifest, realmHasAssets } from './assets';
export type { RealmRuntimeVisualKey } from './class_visuals';
export { normalizeRealmVisualId, realmClassVisualKey } from './class_visuals';
export type { RealmFactionRoster } from './factions';
export {
  factionForRealmCharacter,
  factionForRealmClass,
  factionIdsForRealm,
  factionsForRealm,
  REALM_FACTIONS,
} from './factions';
export type { InfernalHeroClass, InfernalLegend } from './infernal_classes';
export { INFERNAL_HERO_CLASSES, infernalHeroClassesForRealm } from './infernal_classes';
export type { PickitCondition, PickitOp, PickitResult, PickitRule } from './pickit';
export { evaluateItem, parsePickitFilter } from './pickit';
export type {
  AffixDef,
  AffixPool,
  RarityDef,
  RarityId,
  RealmAffixRoll,
  RealmItem,
  RealmItemSlot,
  RealmItemSlotDef,
} from './rarity';
export {
  AFFIX_POOL,
  generateRealmItem,
  ITEM_SLOTS,
  RARITY,
  RARITY_ORDER,
  rarityRank,
  rollRarity,
} from './rarity';
export {
  DEFAULT_REALM,
  getActiveRealm,
  getRealm,
  HOME_REALM_LIST,
  isCrossRealm,
  isRealmId,
  persistActiveRealm,
  REALM_LIST,
  REALMS,
  resolveActiveRealmId,
} from './registry';
export type { RealmStage, StageMeta } from './stages';
export {
  isRealmStage,
  persistRealmStage,
  REALM_PORT_BASE,
  resolveRealmStage,
  STAGE_GIT_REF,
  STAGE_META,
  STAGE_ORDER,
  stagedRealmIds,
  stageHost,
  stageInstance,
  stagePort,
  stageUrl,
} from './stages';
export type {
  RealmBranding,
  RealmClassSkill,
  RealmClassSkin,
  RealmClassStats,
  RealmContent,
  RealmFaction,
  RealmFactionAlignment,
  RealmId,
  RealmRole,
} from './types';
