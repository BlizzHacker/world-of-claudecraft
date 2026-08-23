import {
  GUILD_TREND_LETTERS,
  HEROIC_MARK_LETTER,
  type LetterDef,
  MASTER_TIER_LETTERS,
  MASTERY_RESET_LETTER,
  QUEST_LETTERS,
  WELCOME_LETTER,
} from '../sim/content/letters';
import {
  ABILITIES,
  CLASSES,
  DELVES,
  DUNGEONS,
  ITEM_SETS,
  ITEMS,
  MOBS,
  NPCS,
  QUESTS,
  ZONES,
} from '../sim/data';
import { getActiveRealm, REALMS } from '../sim/realms/registry';
import type { ItemDef, PlayerClass } from '../sim/types';
import { waypointDefs } from '../sim/waypoint_defs';
import {
  en,
  getLanguage,
  hasTranslation,
  type InterpolationValues,
  type SupportedLanguage,
  supportedLanguages,
  t,
  tOptional,
} from './i18n';
import { knownItemDef, ownEntry } from './known_item';

export type EntityTranslationGroup = 'classAbility' | 'item' | 'itemSet' | 'world';
export type EntityTranslationKind =
  | 'class'
  | 'ability'
  | 'item'
  | 'mob'
  | 'npc'
  | 'quest'
  | 'questObjective'
  | 'zone'
  | 'zonePoi'
  | 'dungeon'
  | 'delve'
  | 'itemSet'
  | 'letter';
/** An item set's per-tier bonus field, keyed by the tier's PIECE COUNT rather
 *  than a fixed 2/3/4 triple. Every shipped set used 2, 3 and 4 pieces, and that
 *  assumption was hard coded here, in the i18n catalog builder, and in the
 *  tooltip's field selection, so a set authored with any other breakpoint (the
 *  WARFARE families' 2/4/7) rendered the WRONG tier's text instead of failing.
 *  Generalizing keeps every existing entities.itemSets.*.bonus2/bonus3/bonus4
 *  key byte-stable in the locale overlays and mints only the new counts. */
export type ItemSetBonusField = `bonus${number}`;

/** The piece count a bonus field names, or null when the field is not a bonus
 *  field at all. The ONE place the field-to-count mapping lives. */
export function itemSetBonusPieces(field: string): number | null {
  const matched = /^bonus([1-9][0-9]*)$/.exec(field);
  return matched ? Number(matched[1]) : null;
}

/** The bonus field naming a tier of `pieces` pieces. */
export function itemSetBonusField(pieces: number): ItemSetBonusField {
  return `bonus${pieces}`;
}

export type EntityTranslationField =
  | 'name'
  | 'description'
  | 'title'
  | 'text'
  | 'completion'
  | 'greeting'
  | 'label'
  | 'welcome'
  | 'enterText'
  | 'leaveText'
  | ItemSetBonusField
  | 'sender'
  | 'subject'
  | 'body';

export type EntityTranslationRequest =
  | { kind: 'class'; id: PlayerClass; field: 'name' | 'description'; values?: InterpolationValues }
  | { kind: 'ability'; id: string; field: 'name' | 'description'; values?: InterpolationValues }
  | { kind: 'item'; id: string; field: 'name'; values?: InterpolationValues }
  | {
      kind: 'itemSet';
      id: string;
      field: 'name' | ItemSetBonusField;
      values?: InterpolationValues;
    }
  | { kind: 'mob'; id: string; field: 'name'; values?: InterpolationValues }
  | { kind: 'npc'; id: string; field: 'name' | 'title' | 'greeting'; values?: InterpolationValues }
  | {
      kind: 'quest';
      id: string;
      field: 'title' | 'text' | 'completion';
      values?: InterpolationValues;
    }
  | {
      kind: 'questObjective';
      questId: string;
      objectiveIndex: number;
      field: 'label';
      values?: InterpolationValues;
    }
  | { kind: 'zone'; id: string; field: 'name' | 'welcome'; values?: InterpolationValues }
  | {
      kind: 'zonePoi';
      zoneId: string;
      poiIndex: number;
      field: 'label';
      values?: InterpolationValues;
    }
  | {
      kind: 'dungeon';
      id: string;
      field: 'name' | 'enterText' | 'leaveText';
      values?: InterpolationValues;
    }
  | {
      kind: 'delve';
      id: string;
      field: 'name' | 'enterText' | 'leaveText';
      values?: InterpolationValues;
    }
  | {
      kind: 'letter';
      id: string;
      field: 'sender' | 'subject' | 'body';
      values?: InterpolationValues;
    };

export interface EntityTranslationManifestEntry {
  kind: EntityTranslationKind;
  id: string;
  field: EntityTranslationField;
  key: string;
  source: string;
  group: EntityTranslationGroup;
}

export interface MissingEntityTranslation extends EntityTranslationManifestEntry {
  missingLocales: SupportedLanguage[];
}

export interface EntityTranslationFallback extends EntityTranslationManifestEntry {
  language: SupportedLanguage;
  value: string;
}

const CLASS_NAME_KEYS: Record<PlayerClass, string> = {
  warrior: 'classes.warrior',
  paladin: 'classes.paladin',
  hunter: 'classes.hunter',
  rogue: 'classes.rogue',
  priest: 'classes.priest',
  shaman: 'classes.shaman',
  mage: 'classes.mage',
  warlock: 'classes.warlock',
  druid: 'classes.druid',
};

const CLASS_DESCRIPTION_KEYS: Record<PlayerClass, string> = {
  warrior: 'classDetails.lore.warrior',
  paladin: 'classDetails.lore.paladin',
  hunter: 'classDetails.lore.hunter',
  rogue: 'classDetails.lore.rogue',
  priest: 'classDetails.lore.priest',
  shaman: 'classDetails.lore.shaman',
  mage: 'classDetails.lore.mage',
  warlock: 'classDetails.lore.warlock',
  druid: 'classDetails.lore.druid',
};

const fallbackLog = new Map<string, EntityTranslationFallback>();

// Ravenpost authored letters by letterId (the welcome letter, the Heroic Marks
// reward letter, the quest thank-you letters, and the Guild trend letters), the
// canonical English source the 'letter' kind reads.
const LETTERS_BY_ID: Record<string, LetterDef> = {
  [WELCOME_LETTER.letterId]: WELCOME_LETTER,
  [HEROIC_MARK_LETTER.letterId]: HEROIC_MARK_LETTER,
  [MASTERY_RESET_LETTER.letterId]: MASTERY_RESET_LETTER,
};
for (const letter of Object.values(QUEST_LETTERS)) LETTERS_BY_ID[letter.letterId] = letter;
for (const letter of Object.values(GUILD_TREND_LETTERS)) LETTERS_BY_ID[letter.letterId] = letter;
for (const byTier of Object.values(MASTER_TIER_LETTERS)) {
  for (const letter of Object.values(byTier)) LETTERS_BY_ID[letter.letterId] = letter;
}

/** Whether THIS bundle ships the authored letter (stale-client guard, R34):
 *  the mail window falls back to the WIRE-shipped sender/subject/body for an
 *  id this bundle predates, instead of rendering the raw letter id. */
export function knownLetterId(letterId: string): boolean {
  return Object.hasOwn(LETTERS_BY_ID, letterId);
}

function entityPathSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9_]/g, '_');
}

function entry(
  kind: EntityTranslationKind,
  id: string,
  field: EntityTranslationField,
  source: string,
  group: EntityTranslationGroup,
  key: string,
): EntityTranslationManifestEntry {
  return { kind, id, field, source, group, key };
}

function compareById<T extends { id: string }>(a: T, b: T): number {
  return a.id.localeCompare(b.id);
}

function interpolateSource(source: string, values?: InterpolationValues): string {
  if (!values) return source;
  const className = values.classNameLower ?? values.className ?? '$C';
  const legacy = source
    .replace(/\$N/g, String(values.playerName ?? values.name ?? '$N'))
    .replace(/\$C/g, String(className))
    .replace(/\$d/g, String(values.damage ?? values.d ?? '$d'))
    // Ability-description placeholders beyond the damage number: a hybrid's
    // over-time total ($o), the first buff's resolved value ($b), the first
    // timed effect's resolved duration ($t); hud.ts supplies all three.
    .replace(/\$o/g, String(values.overTime ?? '$o'))
    .replace(/\$b/g, String(values.buff ?? '$b'))
    .replace(/\$t/g, String(values.duration ?? '$t'))
    .replace(/\$h/g, String(values.healing ?? '$h'))
    .replace(/\$e/g, String(values.hostilePveDuration ?? '$e'))
    .replace(/\$p/g, String(values.hostilePvpDuration ?? '$p'))
    .replace(/\$g/g, String(values.groundDuration ?? '$g'))
    .replace(/\$s/g, String(values.selfCooldownRecovery ?? '$s'))
    .replace(/\$a/g, String(values.allyCooldownRecovery ?? '$a'));
  return legacy.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
}

function classDescriptionSource(id: PlayerClass): string {
  return en.classDetails.lore[id];
}

function canonicalEntityText(request: EntityTranslationRequest): string {
  switch (request.kind) {
    // These three arms read through known_item.ts for the same reason the R34
    // block below spells out: their ids ride the wire too (the class on a
    // character snapshot, an ability id on a cast packet, an item id in a chat
    // link), and the direct Record index they used to do sent 'constructor' down
    // the known arm, where the Function's .name renders the string "Object" and
    // its absent .description renders undefined.
    case 'class': {
      const cls = ownEntry(CLASSES, request.id);
      if (!cls) return request.id;
      return request.field === 'name' ? cls.name : classDescriptionSource(request.id);
    }
    case 'ability': {
      const ability = ownEntry(ABILITIES, request.id);
      if (!ability) return request.id;
      return request.field === 'name' ? ability.name : ability.description;
    }
    case 'item':
      // knownItemDef rather than bare ownEntry: this arm BRANCHES between its
      // known-item and unknown-item halves, which is the surface known_item.ts
      // asks to carry the item gate.
      return knownItemDef(ITEMS, request.id)?.name ?? request.id;
    // Every Record-indexed arm below reads through ownEntry (known_item.ts):
    // these ids can arrive from the wire (the quest log, chat links, snapshot
    // template ids), and on a prototype-bearing Record a bare truthiness test
    // sends 'constructor' down the known arm, where the Function's missing
    // fields render as "Object"/undefined or throw (set.bonuses.find). The
    // raw-id fallback is the R34 contract for every unknown id, prototype
    // keys included.
    case 'itemSet': {
      const set = ownEntry(ITEM_SETS, request.id);
      if (!set) return request.id;
      if (request.field === 'name') return set.name;
      // Piece-count agnostic (see ItemSetBonusField): the field NAMES its tier,
      // so a 7-piece breakpoint resolves without a fifth ternary arm, and an
      // unknown field falls back to the raw id like every other R34 miss.
      const pieces = itemSetBonusPieces(request.field);
      if (pieces === null) return request.id;
      return set.bonuses.find((b) => b.pieces === pieces)?.text ?? request.id;
    }
    case 'mob':
      return ownEntry(MOBS, request.id)?.name ?? request.id;
    case 'npc': {
      const npc = ownEntry(NPCS, request.id);
      if (!npc) return request.id;
      if (request.field === 'title') return npc.title;
      if (request.field === 'greeting') return npc.greeting;
      return npc.name;
    }
    case 'quest': {
      const quest = ownEntry(QUESTS, request.id);
      if (!quest) return request.id;
      if (request.field === 'text') return quest.text;
      if (request.field === 'completion') return quest.completionText;
      return quest.name;
    }
    case 'questObjective':
      return (
        ownEntry(QUESTS, request.questId)?.objectives[request.objectiveIndex]?.label ??
        `${request.questId}.${request.objectiveIndex}`
      );
    case 'zone': {
      const zone = ZONES.find((candidate) => candidate.id === request.id);
      if (!zone) return request.id;
      return request.field === 'welcome' ? zone.welcome : zone.name;
    }
    case 'zonePoi': {
      const zone = ZONES.find((candidate) => candidate.id === request.zoneId);
      return zone?.pois[request.poiIndex]?.label ?? `${request.zoneId}.pois.${request.poiIndex}`;
    }
    case 'dungeon': {
      const dungeon = DUNGEONS[request.id];
      if (!dungeon) return request.id;
      if (request.field === 'enterText') return dungeon.enterText;
      if (request.field === 'leaveText') return dungeon.leaveText;
      return dungeon.name;
    }
    case 'delve': {
      const delve = DELVES[request.id];
      if (!delve) return request.id;
      if (request.field === 'enterText') return delve.enterText;
      if (request.field === 'leaveText') return delve.leaveText;
      return delve.name;
    }
    case 'letter': {
      const letter = LETTERS_BY_ID[request.id];
      if (!letter) return request.id;
      if (request.field === 'sender') return letter.senderName;
      if (request.field === 'body') return letter.body;
      return letter.subject;
    }
  }
}

export function entityTranslationKey(request: EntityTranslationRequest): string {
  switch (request.kind) {
    case 'class':
      // The key tables are Records indexed by that same wire-supplied id, so the
      // R34 gate is needed HERE too, one step ahead of canonicalEntityText: an id
      // outside the nine reads undefined and a prototype key reads a FUNCTION,
      // and either one reaches the catalog walk's key.split('.') and throws -- a
      // crash exactly where the raw-id fallback was supposed to save the surface.
      // Synthesizing the authored shape keeps all nine shipped keys byte-stable
      // and leaves an unknown id to miss the catalog and fall through to the raw
      // id like every other kind.
      return request.field === 'name'
        ? (ownEntry(CLASS_NAME_KEYS, request.id) ?? `classes.${entityPathSegment(request.id)}`)
        : (ownEntry(CLASS_DESCRIPTION_KEYS, request.id) ??
            `classDetails.lore.${entityPathSegment(request.id)}`);
    case 'ability':
      return `entities.abilities.${entityPathSegment(request.id)}.${request.field}`;
    case 'item':
      return `entities.items.${entityPathSegment(request.id)}.name`;
    case 'itemSet':
      return `entities.itemSets.${entityPathSegment(request.id)}.${request.field}`;
    case 'mob':
      return `entities.mobs.${entityPathSegment(request.id)}.name`;
    case 'npc':
      return `entities.npcs.${entityPathSegment(request.id)}.${request.field}`;
    case 'quest':
      return `entities.quests.${entityPathSegment(request.id)}.${request.field}`;
    case 'questObjective':
      return `entities.quests.${entityPathSegment(request.questId)}.objectives.${request.objectiveIndex}.label`;
    case 'zone':
      return `entities.zones.${entityPathSegment(request.id)}.${request.field}`;
    case 'zonePoi':
      return `entities.zones.${entityPathSegment(request.zoneId)}.pois.${request.poiIndex}.label`;
    case 'dungeon':
      return `entities.dungeons.${entityPathSegment(request.id)}.${request.field}`;
    case 'delve':
      return `entities.delves.${entityPathSegment(request.id)}.${request.field}`;
    case 'letter':
      return `entities.letters.${entityPathSegment(request.id)}.${request.field}`;
  }
}

function requestManifestEntry(request: EntityTranslationRequest): EntityTranslationManifestEntry {
  const id =
    request.kind === 'questObjective'
      ? `${request.questId}.objectives.${request.objectiveIndex}`
      : request.kind === 'zonePoi'
        ? `${request.zoneId}.pois.${request.poiIndex}`
        : request.id;
  const group: EntityTranslationGroup =
    request.kind === 'class' || request.kind === 'ability'
      ? 'classAbility'
      : request.kind === 'itemSet'
        ? 'itemSet'
        : request.kind === 'item'
          ? 'item'
          : 'world';
  return entry(
    request.kind,
    id,
    request.field,
    canonicalEntityText(request),
    group,
    entityTranslationKey(request),
  );
}

function recordFallback(request: EntityTranslationRequest, value: string): void {
  const manifestEntry = requestManifestEntry(request);
  const language = getLanguage();
  fallbackLog.set(`${language}:${manifestEntry.key}`, { ...manifestEntry, language, value });
}

// --- Realm lore overlay (RealmContent.entityText) ---------------------------
//
// A realm pack may re-skin shared-world DISPLAY strings (the Cinderveil rebrand
// on infernal) without touching canonical sim text or the 21 locale overlays:
// tEntity resolves the active realm's sparse overlay FIRST, then falls through
// to the locale table and the canonical text for every id the realm does not
// override. Keys are canonical ids; nothing id-shaped changes, so the sim wire,
// the name->id reverse maps (sim_i18n.ts), music-zone keys and save data are
// untouched, and a realm without entityText behaves byte-identically.
//
// The gate set below is the applyRealmBrand cost discipline: realm packs are
// static, so the union of overlaid ids is computable once at module init, and a
// lookup no realm overlays never calls getActiveRealm() (which re-reads the URL
// query per call in the browser host env).
const REALM_ENTITY_TEXT_IDS: ReadonlySet<string> = (() => {
  const ids = new Set<string>();
  for (const realm of Object.values(REALMS)) {
    const overlay = realm.entityText;
    if (!overlay) continue;
    for (const id of Object.keys(overlay.zones ?? {})) {
      ids.add(`zone:${id}`);
      ids.add(`zonePoi:${id}`);
    }
    for (const id of Object.keys(overlay.npcs ?? {})) ids.add(`npc:${id}`);
    for (const id of Object.keys(overlay.quests ?? {})) {
      ids.add(`quest:${id}`);
      ids.add(`questObjective:${id}`);
    }
    for (const id of Object.keys(overlay.mobs ?? {})) ids.add(`mob:${id}`);
    for (const id of Object.keys(overlay.classes ?? {})) ids.add(`class:${id}`);
    for (const id of Object.keys(overlay.abilities ?? {})) ids.add(`ability:${id}`);
    for (const id of Object.keys(overlay.items ?? {})) ids.add(`item:${id}`);
    for (const id of Object.keys(overlay.dungeons ?? {})) ids.add(`dungeon:${id}`);
    for (const id of Object.keys(overlay.delves ?? {})) ids.add(`delve:${id}`);
    for (const id of Object.keys(overlay.letters ?? {})) ids.add(`letter:${id}`);
  }
  return ids;
})();

// Talent spec names any realm overlays, keyed `<class>.<specId>` (spec ids
// repeat across classes). Same one-time union as REALM_ENTITY_TEXT_IDS: a spec
// no realm renames never resolves the active realm.
const REALM_TALENT_SPEC_KEYS: ReadonlySet<string> = new Set(
  Object.values(REALMS).flatMap((realm) => Object.keys(realm.entityText?.talentSpecs ?? {})),
);

/**
 * The active realm's display name for one talent spec, or null to fall through
 * to the authored/localized title. Called from tTalent (talent_i18n.ts), which
 * owns every other spec-title path.
 */
export function realmTalentSpecName(cls: string, specId: string): string | null {
  const key = `${cls}.${specId}`;
  if (!REALM_TALENT_SPEC_KEYS.has(key)) return null;
  const specs = getActiveRealm().entityText?.talentSpecs;
  if (!specs || !Object.hasOwn(specs, key)) return null;
  return specs[key] ?? null;
}

// Talent MASTERY labels any realm overlays, same `<class>.<specId>` keying and
// same one-time union as the spec names above.
const REALM_TALENT_MASTERY_KEYS: ReadonlySet<string> = new Set(
  Object.values(REALMS).flatMap((realm) => Object.keys(realm.entityText?.talentMasteries ?? {})),
);

/**
 * The active realm's display name for one spec's mastery, or null to fall
 * through to the authored/localized label. Called from tTalent, which owns
 * every other mastery-title path.
 */
export function realmTalentMasteryName(cls: string, specId: string): string | null {
  const key = `${cls}.${specId}`;
  if (!REALM_TALENT_MASTERY_KEYS.has(key)) return null;
  const masteries = getActiveRealm().entityText?.talentMasteries;
  if (!masteries || !Object.hasOwn(masteries, key)) return null;
  return masteries[key] ?? null;
}

/** True when any realm ships rift-rank display words (riftFloorLabel gate). */
const REALM_RIFT_RANK_WORDS: boolean = Object.values(REALMS).some(
  (realm) => realm.entityText?.riftRanks !== undefined,
);

// Waypoint ids any realm overlays (same one-time union as REALM_ENTITY_TEXT_IDS:
// a waypoint no realm renames never resolves the active realm).
const REALM_WAYPOINT_IDS: ReadonlySet<string> = new Set(
  Object.values(REALMS).flatMap((realm) => Object.keys(realm.entityText?.waypoints ?? {})),
);

function requestGateKey(request: EntityTranslationRequest): string {
  switch (request.kind) {
    case 'questObjective':
      return `questObjective:${request.questId}`;
    case 'zonePoi':
      return `zonePoi:${request.zoneId}`;
    default:
      return `${request.kind}:${request.id}`;
  }
}

/** The active realm's display override for this request, or null to fall
 *  through to the normal locale-table -> canonical-text chain. Own-property
 *  reads throughout (the R34 prototype-key discipline): these ids arrive from
 *  the same wire-supplied surfaces the canonical arms guard. */
function realmEntityText(request: EntityTranslationRequest): string | null {
  if (!REALM_ENTITY_TEXT_IDS.has(requestGateKey(request))) return null;
  const overlay = getActiveRealm().entityText;
  if (!overlay) return null;
  switch (request.kind) {
    case 'zone': {
      const zone = overlay.zones ? ownEntry(overlay.zones, request.id) : undefined;
      if (!zone) return null;
      return (request.field === 'welcome' ? zone.welcome : zone.name) ?? null;
    }
    case 'zonePoi': {
      const zone = overlay.zones ? ownEntry(overlay.zones, request.zoneId) : undefined;
      return zone?.pois?.[request.poiIndex] ?? null;
    }
    case 'npc': {
      const npc = overlay.npcs ? ownEntry(overlay.npcs, request.id) : undefined;
      if (!npc) return null;
      if (request.field === 'title') return npc.title ?? null;
      if (request.field === 'greeting') return npc.greeting ?? null;
      return npc.name ?? null;
    }
    case 'quest': {
      const quest = overlay.quests ? ownEntry(overlay.quests, request.id) : undefined;
      if (!quest) return null;
      if (request.field === 'text') return quest.text ?? null;
      if (request.field === 'completion') return quest.completion ?? null;
      return quest.title ?? null;
    }
    case 'questObjective': {
      const quest = overlay.quests ? ownEntry(overlay.quests, request.questId) : undefined;
      return quest?.objectives?.[request.objectiveIndex] ?? null;
    }
    case 'mob': {
      const mob = overlay.mobs ? ownEntry(overlay.mobs, request.id) : undefined;
      return mob?.name ?? null;
    }
    // The two arms that answer "why is my Skullbeast casting Druid skills":
    // a themed realm re-voices the engine class and its kit without renaming a
    // single id, so talents, saved hotbars and the combat wire are untouched.
    case 'class': {
      const cls = overlay.classes ? ownEntry(overlay.classes, request.id) : undefined;
      if (!cls) return null;
      return (request.field === 'name' ? cls.name : cls.description) ?? null;
    }
    case 'ability': {
      const ability = overlay.abilities ? ownEntry(overlay.abilities, request.id) : undefined;
      if (!ability) return null;
      return (request.field === 'name' ? ability.name : ability.description) ?? null;
    }
    case 'item': {
      const item = overlay.items ? ownEntry(overlay.items, request.id) : undefined;
      return item?.name ?? null;
    }
    case 'dungeon':
    case 'delve': {
      const table = request.kind === 'dungeon' ? overlay.dungeons : overlay.delves;
      const instance = table ? ownEntry(table, request.id) : undefined;
      if (!instance) return null;
      if (request.field === 'enterText') return instance.enterText ?? null;
      if (request.field === 'leaveText') return instance.leaveText ?? null;
      return instance.name ?? null;
    }
    case 'letter': {
      const letter = overlay.letters ? ownEntry(overlay.letters, request.id) : undefined;
      if (!letter) return null;
      if (request.field === 'sender') return letter.sender ?? null;
      if (request.field === 'body') return letter.body ?? null;
      return letter.subject ?? null;
    }
    default:
      return null;
  }
}

export function tEntity(request: EntityTranslationRequest): string {
  // Realm lore overlay wins over the locale table (see realmEntityText above);
  // an id the active realm does not override falls through unchanged.
  const realmText = realmEntityText(request);
  if (realmText !== null) return interpolateSource(realmText, request.values);
  const key = entityTranslationKey(request);
  const translated = tOptional(key, request.values);
  if (translated !== null) return translated;
  const fallback = interpolateSource(canonicalEntityText(request), request.values);
  recordFallback(request, fallback);
  return fallback;
}

export function itemDisplayName(item: ItemDef): string {
  // Heroic upgraded variants share the base item's name (classic behavior: a heroic
  // drop reads the same as its normal counterpart). The heroic distinction shows as
  // an "[HEROIC]" tag on the tooltip's quality/kind line, not in the name, so a
  // variant never needs its own translated name key.
  if (item.heroicOf) {
    const base = ITEMS[item.heroicOf];
    return base ? itemDisplayName(base) : item.heroicOf;
  }
  return tEntity({ kind: 'item', id: item.id, field: 'name' });
}

// Thin tEntity wrappers for the display helpers that several windows + painters each
// re-declared (class/zone/poi/dungeon names). Mirroring itemDisplayName above, these are
// the single shared home so hud.ts, the cold windows, and map_window_painter import one
// definition instead of redefining it per module.
export function classDisplayName(cls: PlayerClass): string {
  return tEntity({ kind: 'class', id: cls, field: 'name' });
}

export function zoneDisplayName(zoneId: string): string {
  return tEntity({ kind: 'zone', id: zoneId, field: 'name' });
}

export function zonePoiLabel(zoneId: string, poiIndex: number): string {
  return tEntity({ kind: 'zonePoi', zoneId, poiIndex, field: 'label' });
}

export function dungeonDisplayName(dungeonId: string): string {
  return tEntity({ kind: 'dungeon', id: dungeonId, field: 'name' });
}

// --- Waypoint display names (realm overlay on a SERVER-FED surface) ----------
//
// Waypoint names ride the wire as display strings (waypointMenu payload, the
// pylon ground-object's entity name, and baked into sim log sentences), so the
// overlay applies at render, never to the payload: the sim keeps emitting the
// canonical English name and non-overlaid realms keep rendering it unchanged.
// Waypoint IDS (wp_<zoneId>[_wild]) are identifiers - save data
// (waypointsActivated) and the travel command token - and never rename.

/** The wire-supplied waypoint name for canonical-name -> id reverse mapping
 *  (the sim_i18n locZone pattern): built lazily from waypointDefs() only when
 *  some realm actually overlays a waypoint. */
let waypointNameToId: Map<string, string> | null = null;

function waypointIdForWireName(wireName: string): string | null {
  if (waypointNameToId === null) {
    waypointNameToId = new Map();
    for (const def of waypointDefs()) waypointNameToId.set(def.name, def.id);
  }
  return waypointNameToId.get(wireName) ?? null;
}

/** The active realm's display name for a waypoint, falling back to the
 *  wire-supplied name (which is also the canonical English). */
export function waypointDisplayName(waypointId: string, wireName: string): string {
  if (!REALM_WAYPOINT_IDS.has(waypointId)) return wireName;
  const overlay = getActiveRealm().entityText?.waypoints;
  const name = overlay ? ownEntry(overlay, waypointId) : undefined;
  return name ?? wireName;
}

/** Re-skin a canonical waypoint name spliced into a sim log sentence: the
 *  name maps back to its waypoint id, then through the realm overlay. Returns
 *  the input unchanged for a non-waypoint name or a realm without renames. */
export function realmWaypointName(wireName: string): string {
  if (REALM_WAYPOINT_IDS.size === 0) return wireName;
  const id = waypointIdForWireName(wireName);
  return id === null ? wireName : waypointDisplayName(id, wireName);
}

/** The label a live rift floor (IWorld.riftFloor) shows wherever a surface needs
 *  display text for it: the generated floor name, plus its C/B/A/S rank in
 *  parens (omitted for a dev-portal run, whose tier is null). Not a tEntity
 *  wrapper (the name/rank come from the generated RiftFloorView, not a content
 *  id lookup); the single shared home so the minimap, the world map, and the
 *  map-window summary format it identically instead of each re-declaring the
 *  same rank ? label ternary. */
export function riftFloorLabel(name: string, rank: string | null): string {
  if (rank) {
    // Realm tear-language (RealmContent.entityText.riftRanks): the letter stays
    // (sorting, muscle memory), the realm's word for how wide the veil is torn
    // rides with it -- "Rend (A)". Realms without rank words keep the bare letter.
    let rankDisplay = rank;
    if (REALM_RIFT_RANK_WORDS) {
      const words = getActiveRealm().entityText?.riftRanks;
      const word = words ? ownEntry(words, rank) : undefined;
      if (word) rankDisplay = `${word} (${rank})`;
    }
    return t('hud.core.riftLabelRanked', { name, rank: rankDisplay });
  }
  return t('hud.core.riftLabel', { name });
}

export function resetEntityTranslationFallbackLog(): void {
  fallbackLog.clear();
}

export function entityTranslationFallbackLog(): EntityTranslationFallback[] {
  return [...fallbackLog.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function entityTranslationManifest(): EntityTranslationManifestEntry[] {
  const entries: EntityTranslationManifestEntry[] = [];
  const classIds = Object.keys(CLASSES).sort() as PlayerClass[];
  for (const id of classIds) {
    entries.push(entry('class', id, 'name', CLASSES[id].name, 'classAbility', CLASS_NAME_KEYS[id]));
    entries.push(
      entry(
        'class',
        id,
        'description',
        classDescriptionSource(id),
        'classAbility',
        CLASS_DESCRIPTION_KEYS[id],
      ),
    );
  }
  for (const ability of Object.values(ABILITIES).sort(compareById)) {
    entries.push(
      entry(
        'ability',
        ability.id,
        'name',
        ability.name,
        'classAbility',
        entityTranslationKey({ kind: 'ability', id: ability.id, field: 'name' }),
      ),
    );
    entries.push(
      entry(
        'ability',
        ability.id,
        'description',
        ability.description,
        'classAbility',
        entityTranslationKey({ kind: 'ability', id: ability.id, field: 'description' }),
      ),
    );
  }
  for (const item of Object.values(ITEMS).sort(compareById)) {
    // Heroic upgraded variants carry no name key: they share the base item's name
    // (see itemDisplayName), so they never enter the manifest.
    if (item.heroicOf) continue;
    entries.push(
      entry(
        'item',
        item.id,
        'name',
        item.name,
        'item',
        entityTranslationKey({ kind: 'item', id: item.id, field: 'name' }),
      ),
    );
  }
  for (const set of Object.values(ITEM_SETS).sort(compareById)) {
    // Only tiers the set actually has, at WHATEVER piece counts it authored:
    // the leveling haste kits carry a single 3-piece tier (so registering a
    // bonus2 row would emit an id-fallback string) and the WARFARE families
    // carry 2/4/7. Ascending and de-duplicated so the manifest order is stable.
    const fields: ('name' | ItemSetBonusField)[] = ['name'];
    for (const pieces of [...new Set(set.bonuses.map((b) => b.pieces))].sort((a, b) => a - b)) {
      fields.push(itemSetBonusField(pieces));
    }
    for (const field of fields) {
      entries.push(
        entry(
          'itemSet',
          set.id,
          field,
          canonicalEntityText({ kind: 'itemSet', id: set.id, field }),
          'itemSet',
          entityTranslationKey({ kind: 'itemSet', id: set.id, field }),
        ),
      );
    }
  }
  for (const mob of Object.values(MOBS).sort(compareById)) {
    entries.push(
      entry(
        'mob',
        mob.id,
        'name',
        mob.name,
        'world',
        entityTranslationKey({ kind: 'mob', id: mob.id, field: 'name' }),
      ),
    );
  }
  for (const npc of Object.values(NPCS).sort(compareById)) {
    entries.push(
      entry(
        'npc',
        npc.id,
        'name',
        npc.name,
        'world',
        entityTranslationKey({ kind: 'npc', id: npc.id, field: 'name' }),
      ),
    );
    entries.push(
      entry(
        'npc',
        npc.id,
        'title',
        npc.title,
        'world',
        entityTranslationKey({ kind: 'npc', id: npc.id, field: 'title' }),
      ),
    );
    entries.push(
      entry(
        'npc',
        npc.id,
        'greeting',
        npc.greeting,
        'world',
        entityTranslationKey({ kind: 'npc', id: npc.id, field: 'greeting' }),
      ),
    );
  }
  for (const quest of Object.values(QUESTS).sort(compareById)) {
    entries.push(
      entry(
        'quest',
        quest.id,
        'title',
        quest.name,
        'world',
        entityTranslationKey({ kind: 'quest', id: quest.id, field: 'title' }),
      ),
    );
    entries.push(
      entry(
        'quest',
        quest.id,
        'text',
        quest.text,
        'world',
        entityTranslationKey({ kind: 'quest', id: quest.id, field: 'text' }),
      ),
    );
    entries.push(
      entry(
        'quest',
        quest.id,
        'completion',
        quest.completionText,
        'world',
        entityTranslationKey({ kind: 'quest', id: quest.id, field: 'completion' }),
      ),
    );
    quest.objectives.forEach((objective, objectiveIndex) => {
      entries.push(
        entry(
          'questObjective',
          `${quest.id}.objectives.${objectiveIndex}`,
          'label',
          objective.label,
          'world',
          entityTranslationKey({
            kind: 'questObjective',
            questId: quest.id,
            objectiveIndex,
            field: 'label',
          }),
        ),
      );
    });
  }
  for (const zone of [...ZONES].sort(compareById)) {
    entries.push(
      entry(
        'zone',
        zone.id,
        'name',
        zone.name,
        'world',
        entityTranslationKey({ kind: 'zone', id: zone.id, field: 'name' }),
      ),
    );
    entries.push(
      entry(
        'zone',
        zone.id,
        'welcome',
        zone.welcome,
        'world',
        entityTranslationKey({ kind: 'zone', id: zone.id, field: 'welcome' }),
      ),
    );
    zone.pois.forEach((poi, poiIndex) => {
      entries.push(
        entry(
          'zonePoi',
          `${zone.id}.pois.${poiIndex}`,
          'label',
          poi.label,
          'world',
          entityTranslationKey({ kind: 'zonePoi', zoneId: zone.id, poiIndex, field: 'label' }),
        ),
      );
    });
  }
  for (const dungeon of Object.values(DUNGEONS).sort(compareById)) {
    entries.push(
      entry(
        'dungeon',
        dungeon.id,
        'name',
        dungeon.name,
        'world',
        entityTranslationKey({ kind: 'dungeon', id: dungeon.id, field: 'name' }),
      ),
    );
    entries.push(
      entry(
        'dungeon',
        dungeon.id,
        'enterText',
        dungeon.enterText,
        'world',
        entityTranslationKey({ kind: 'dungeon', id: dungeon.id, field: 'enterText' }),
      ),
    );
    entries.push(
      entry(
        'dungeon',
        dungeon.id,
        'leaveText',
        dungeon.leaveText,
        'world',
        entityTranslationKey({ kind: 'dungeon', id: dungeon.id, field: 'leaveText' }),
      ),
    );
  }
  for (const delve of Object.values(DELVES).sort(compareById)) {
    entries.push(
      entry(
        'delve',
        delve.id,
        'name',
        delve.name,
        'world',
        entityTranslationKey({ kind: 'delve', id: delve.id, field: 'name' }),
      ),
    );
    entries.push(
      entry(
        'delve',
        delve.id,
        'enterText',
        delve.enterText,
        'world',
        entityTranslationKey({ kind: 'delve', id: delve.id, field: 'enterText' }),
      ),
    );
    entries.push(
      entry(
        'delve',
        delve.id,
        'leaveText',
        delve.leaveText,
        'world',
        entityTranslationKey({ kind: 'delve', id: delve.id, field: 'leaveText' }),
      ),
    );
  }
  for (const letter of Object.values(LETTERS_BY_ID).sort((a, b) =>
    a.letterId.localeCompare(b.letterId),
  )) {
    const fields: ('sender' | 'subject' | 'body')[] = ['sender', 'subject', 'body'];
    for (const field of fields) {
      entries.push(
        entry(
          'letter',
          letter.letterId,
          field,
          canonicalEntityText({ kind: 'letter', id: letter.letterId, field }),
          'world',
          entityTranslationKey({ kind: 'letter', id: letter.letterId, field }),
        ),
      );
    }
  }
  return entries;
}

export function missingEntityTranslationsForGroups(
  completedGroups: readonly EntityTranslationGroup[],
): MissingEntityTranslation[] {
  const groupSet = new Set(completedGroups);
  return entityTranslationManifest()
    .filter((manifestEntry) => groupSet.has(manifestEntry.group))
    .map((manifestEntry) => ({
      ...manifestEntry,
      missingLocales: supportedLanguages.filter((lang) => !hasTranslation(manifestEntry.key, lang)),
    }))
    .filter((manifestEntry) => manifestEntry.missingLocales.length > 0);
}

export function assertEntityTranslationsReady(
  completedGroups: readonly EntityTranslationGroup[],
): void {
  const missing = missingEntityTranslationsForGroups(completedGroups);
  if (missing.length === 0) return;
  const preview = missing
    .slice(0, 5)
    .map((entry) => entry.key)
    .join(', ');
  throw new Error(
    `Missing entity translations: ${missing.length} keys. First missing keys: ${preview}`,
  );
}
