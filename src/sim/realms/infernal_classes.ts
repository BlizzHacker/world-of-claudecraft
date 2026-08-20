import type { PlayerClass } from '../types';
import { REALM_FACTIONS, REALM_ROSTERS } from './rosters.generated';

export type InfernalLegend =
  | 'First Descent'
  | 'The Dark Exile'
  | 'The Reckoning'
  | 'The Hollow Age'
  | 'The Sundering';

export interface InfernalHeroClass {
  readonly id: string;
  readonly name: string;
  readonly lineage: InfernalLegend;
  /** Mechanical class used by the existing, fully castable combat engine. */
  readonly engineClass: PlayerClass;
  readonly factionSide: 'heaven' | 'hell' | 'surprise';
}

export type InfernalCharacterVisualKey =
  | 'realm_infernal_class_warrior'
  | 'realm_infernal_class_rogue'
  | 'realm_infernal_class_sorcerer'
  | 'realm_infernal_class_amazon'
  | 'realm_infernal_class_barbarian'
  | 'realm_infernal_class_necromancer'
  | 'realm_infernal_class_paladin'
  | 'realm_infernal_class_druid'
  | 'realm_infernal_class_assassin'
  | 'realm_infernal_class_demon_hunter'
  | 'realm_infernal_class_monk'
  | 'realm_infernal_class_wizard'
  | 'realm_infernal_class_witch_doctor'
  | 'realm_infernal_class_crusader'
  | 'realm_infernal_class_spiritborn'
  | 'realm_infernal_class_warlock'
  | 'realm_infernal_class_blood_knight'
  | 'realm_infernal_class_tempest'
  | 'realm_infernal_hero_blood_knight_f'
  // The condemned body bank's 18 keys were removed from this union on
  // 2026-08-17. HERO_VISUALS never named one of them, so they were dead union
  // members. See docs/condemned-body-bank.md.
  | 'realm_infernal_dark_paladin'
  | 'hellmaw_sigilbound_body'
  | 'realm_infernal_horned_demon'
  | 'realm_infernal_crimson_behemoth'
  | 'realm_cryptic_bone_herald'
  | 'realm_infernal_skullbeast'
  | 'realm_classic_fighting_elf';

export interface InfernalHeroVariant {
  /** Short user-facing label for the card's segmented toggle (e.g. 'Female'). */
  readonly label: string;
  /** A REAL selection id: the variant exists in the selections list as a hidden
   *  entry (flagged variantOf), so create validation and body resolution treat
   *  it exactly like any other selection. */
  readonly heroId: string;
}

export interface InfernalCharacterSelection {
  readonly id: string;
  readonly name: string;
  readonly engineClass: PlayerClass;
  readonly factionSide: 'heaven' | 'hell';
  /** Any registered visual key. Was narrowed to the infernal union while this
   *  roster was infernal-only; every realm now supplies its own bodies. */
  readonly visualKey: string;
  /** Presentation variants of this canonical card (canonical entries only).
   *  The card renders a compact segmented toggle; picking one submits the
   *  variant's own id as the character's realmHeroId. */
  readonly variants?: readonly InfernalHeroVariant[];
  /** Set on hidden variant selections: the canonical selection id this variant
   *  presents under. Hidden entries never render as their own creator card and
   *  resolve to the canonical body until an override for their own
   *  `hero:<id>` key is published. */
  readonly variantOf?: string;
}

const entry = (
  lineage: InfernalLegend,
  name: string,
  engineClass: PlayerClass,
  factionSide?: InfernalHeroClass['factionSide'],
): InfernalHeroClass => ({
  id: `${lineage.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name,
  lineage,
  engineClass,
  factionSide:
    factionSide ??
    (/necromancer|witch doctor|warlock/i.test(name)
      ? 'hell'
      : /blood knight|tempest|demon hunter/i.test(name)
        ? 'surprise'
        : 'heaven'),
});

/**
 * Requested dark-fantasy archetype history. Duplicate names remain in this
 * source inventory so coverage can be audited, while the creator deliberately
 * collapses them to one version-neutral card per archetype.
 */
export const INFERNAL_HERO_CLASSES: readonly InfernalHeroClass[] = [
  entry('First Descent', 'Warrior', 'warrior'),
  entry('First Descent', 'Rogue', 'rogue'),
  entry('First Descent', 'Sorcerer', 'mage'),
  entry('The Dark Exile', 'Amazon', 'hunter'),
  entry('The Dark Exile', 'Barbarian', 'warrior'),
  entry('The Dark Exile', 'Necromancer', 'warlock'),
  entry('The Dark Exile', 'Paladin', 'paladin'),
  entry('The Dark Exile', 'Sorceress', 'mage'),
  entry('The Dark Exile', 'Druid', 'druid'),
  entry('The Dark Exile', 'Assassin', 'rogue'),
  entry('The Reckoning', 'Barbarian', 'warrior'),
  entry('The Reckoning', 'Demon Hunter', 'hunter'),
  entry('The Reckoning', 'Monk', 'shaman'),
  entry('The Reckoning', 'Wizard', 'mage'),
  entry('The Reckoning', 'Witch Doctor', 'warlock'),
  entry('The Reckoning', 'Crusader', 'paladin'),
  entry('The Reckoning', 'Necromancer', 'warlock'),
  entry('The Hollow Age', 'Barbarian', 'warrior'),
  entry('The Hollow Age', 'Druid', 'druid'),
  entry('The Hollow Age', 'Necromancer', 'warlock'),
  entry('The Hollow Age', 'Rogue', 'rogue'),
  entry('The Hollow Age', 'Sorcerer', 'mage'),
  entry('The Hollow Age', 'Spiritborn', 'shaman'),
  entry('The Hollow Age', 'Paladin', 'paladin'),
  entry('The Hollow Age', 'Warlock', 'warlock'),
  entry('The Sundering', 'Barbarian', 'warrior'),
  entry('The Sundering', 'Blood Knight', 'paladin'),
  entry('The Sundering', 'Crusader', 'paladin'),
  entry('The Sundering', 'Demon Hunter', 'hunter'),
  entry('The Sundering', 'Druid', 'druid'),
  entry('The Sundering', 'Monk', 'shaman'),
  entry('The Sundering', 'Necromancer', 'warlock'),
  entry('The Sundering', 'Tempest', 'shaman'),
  entry('The Sundering', 'Warlock', 'warlock'),
  entry('The Sundering', 'Wizard', 'mage'),
];

/**
 * COMPILED FALLBACK ONLY - this is not what the creator screen usually shows.
 *
 * infernalClassChoice() resolves `hero:<id>` / `hero:<name>` through the live
 * override document FIRST and only falls back to this table (see
 * realm_class_presentation.ts). As of 2026-08-08 sixteen of the eighteen cards
 * carry a published override, so for those cards this map is dead code until
 * someone clears the override.
 *
 * That matters because the two are drawn from DIFFERENT banks. The overrides
 * point at `realm_infernal_hero_*.glb` - large Meshy rig+animate bodies with a
 * 6-clip pack (Idle/Walk/Run/Attack/Hit/Death and NO emote) - while this table
 * points at the 10-clip `infernal_class_*` bank. They are different files with
 * different faults, and a body judged in one bank says nothing about the other.
 * The 2026-08-08 render audit swept only the class bank, which is why the
 * Blood Knight shipped broken: its class body passes, and its hero body (the one
 * players actually saw) tears its forearms into tubes in Walk and shreds in
 * Attack. Render the asset the card RESOLVES to, not the key it names.
 *
 * OUTSTANDING DEBT: eleven entries below (Sorcerer, Amazon, Barbarian,
 * Necromancer, Druid, Assassin, Wizard, Crusader, Spiritborn, Warlock, Tempest)
 * still name a body in INFERNAL_DEFECTIVE_CLASS_BODY_KEYS. They are harmless
 * today only because an override shadows every one of them - clearing any of
 * those overrides puts a scarecrow back on that card. They are deliberately NOT
 * repointed here: the class bank has only about three intact bodies, so honest
 * fallbacks would collapse eleven archetypes onto three and destroy the variety
 * the cards exist for. Repairing the bank is the fix; Paladin was repointed
 * because it had no override to hide behind.
 */
const HERO_VISUALS: Readonly<Record<string, string>> = {
  Warrior: 'realm_crypticrealm_rune_warden',
  Rogue: 'realm_crypticrealm_realistic_humanoid_assassin_wearing_01938289',
  'Sorcerer / Sorceress': 'realm_infernal_hero_sorcerer',
  Amazon: 'realm_infernal_shadow_warrior_characters_fashio_01942cf0',
  Barbarian: 'realm_infernal_hero_barbarian',
  Necromancer: 'realm_infernal_violet_necromancer_necromancer_m_019cb976',
  Paladin: 'realm_infernal_ironthorn_dread_knight_character_019dd422',
  Druid: 'realm_infernal_hero_druid',
  Assassin: 'realm_infernal_hero_assassin',
  'Demon Hunter': 'realm_infernal_hero_demon_hunter',
  Monk: 'realm_infernal_hero_monk',
  Wizard: 'realm_infernal_hero_wizard',
  'Witch Doctor': 'realm_infernal_hero_witch_doctor',
  Crusader: 'realm_infernal_hero_crusader',
  Spiritborn: 'realm_infernal_hero_spiritborn',
  Warlock: 'realm_infernal_hero_warlock',
  'Blood Knight': 'realm_infernal_hero_blood_knight_f',
  Tempest: 'realm_infernal_hero_tempest',
};

/** Presentation variants per canonical selection name. Adding an entry here is
 *  the ONLY step needed to give any hero card a variant toggle: each heroId
 *  becomes a real hidden selection automatically (same class/faction/visual)
 *  and resolves to the canonical body until a body override for its own
 *  `hero:<id>` key is published. */
const HERO_VARIANTS: Readonly<Record<string, readonly InfernalHeroVariant[]>> = {
  'Sorcerer / Sorceress': [
    { label: 'Female', heroId: 'infernal-hero-sorceress' },
    { label: 'Male', heroId: 'infernal-hero-sorcerer-m' },
  ],
};

const HELL_SELECTIONS: readonly Omit<InfernalCharacterSelection, 'id'>[] = [
  {
    name: 'Dark Paladin',
    engineClass: 'paladin',
    factionSide: 'hell',
    visualKey: 'realm_infernal_dark_paladin',
  },
  {
    name: 'Sigil-Bound Acolyte',
    engineClass: 'warlock',
    factionSide: 'hell',
    visualKey: 'hellmaw_sigilbound_body',
  },
  {
    name: 'Horned Demon',
    engineClass: 'warrior',
    factionSide: 'hell',
    visualKey: 'realm_infernal_horned_demon',
  },
  {
    name: 'Crimson Infernal Behemoth',
    engineClass: 'warrior',
    factionSide: 'hell',
    visualKey: 'realm_infernal_crimson_behemoth',
  },
  {
    name: 'Bone Herald',
    engineClass: 'warlock',
    factionSide: 'hell',
    visualKey: 'realm_cryptic_bone_herald',
  },
  {
    name: 'Skullbeast',
    engineClass: 'druid',
    factionSide: 'hell',
    visualKey: 'realm_infernal_skullbeast',
  },
];

export function canonicalInfernalHeroName(name: string): string {
  return name === 'Sorcerer' || name === 'Sorceress' ? 'Sorcerer / Sorceress' : name;
}

export function infernalSelectionId(side: 'heaven' | 'hell', name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `infernal-${side === 'hell' ? 'hell' : 'hero'}-${slug}`;
}

/** Push a canonical selection plus, when HERO_VARIANTS names it, the hidden
 *  selection behind each of its variants. */
function pushWithVariants(
  selections: InfernalCharacterSelection[],
  selection: InfernalCharacterSelection,
): void {
  const variants = HERO_VARIANTS[selection.name];
  if (!variants || variants.length === 0) {
    selections.push(selection);
    return;
  }
  selections.push({ ...selection, variants });
  for (const variant of variants) {
    selections.push({
      ...selection,
      id: variant.heroId,
      name: `${selection.name} (${variant.label})`,
      variantOf: selection.id,
    });
  }
}

function buildSelections(): InfernalCharacterSelection[] {
  const selections: InfernalCharacterSelection[] = [];
  const seen = new Set<string>();
  for (const source of INFERNAL_HERO_CLASSES) {
    const name = canonicalInfernalHeroName(source.name);
    if (seen.has(name)) continue;
    const visualKey = HERO_VISUALS[name];
    if (!visualKey) continue;
    seen.add(name);
    pushWithVariants(selections, {
      id: infernalSelectionId('heaven', name),
      name,
      engineClass: source.engineClass,
      factionSide: 'heaven',
      visualKey,
    });
  }
  for (const enemy of HELL_SELECTIONS) {
    pushWithVariants(selections, {
      ...enemy,
      id: infernalSelectionId('hell', enemy.name),
    });
  }
  return selections;
}

export const INFERNAL_CHARACTER_SELECTIONS: readonly InfernalCharacterSelection[] =
  buildSelections();

export function infernalHeroClassesForRealm(realm: string): readonly InfernalHeroClass[] {
  return realm.toLowerCase().replace(/[^a-z0-9]+/g, '') === 'infernal' ? INFERNAL_HERO_CLASSES : [];
}

const ROSTER_CACHE = new Map<string, readonly InfernalCharacterSelection[]>();

/** Adapt a generated realm roster into the selection shape the picker consumes. */
function rosterSelectionsFor(realmKey: string): readonly InfernalCharacterSelection[] {
  const cached = ROSTER_CACHE.get(realmKey);
  if (cached) return cached;
  const rows = REALM_ROSTERS[realmKey] ?? [];
  const factions = REALM_FACTIONS[realmKey] ?? [];
  const out: InfernalCharacterSelection[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    engineClass: r.engineClass,
    // factionSide is a two-value union used for styling; keep the real faction on
    // the entry name and fold the roster's factions onto it by index.
    factionSide: factions.indexOf(r.faction) === 0 ? 'heaven' : 'hell',
    visualKey: r.visualKey,
  }));
  ROSTER_CACHE.set(realmKey, out);
  return out;
}

export function infernalCharacterSelectionsForRealm(
  realm: string,
): readonly InfernalCharacterSelection[] {
  const key = realm.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (key === 'infernal') return INFERNAL_CHARACTER_SELECTIONS;
  return rosterSelectionsFor(key);
}

/**
 * Resolve a client-selected Infernal identity against the authored roster and
 * its mechanical class. The class match prevents a forged request from pairing
 * one body's id with a different combat kit.
 */
export function infernalCharacterSelection(
  realm: string,
  selectionId: unknown,
  engineClass: PlayerClass,
): InfernalCharacterSelection | null {
  if (typeof selectionId !== 'string' || selectionId.length > 80) return null;
  return (
    infernalCharacterSelectionsForRealm(realm).find(
      (selection) => selection.id === selectionId && selection.engineClass === engineClass,
    ) ?? null
  );
}

/**
 * Ordered `hero:` override-lookup keys for a selection. A hidden variant that
 * has no published body of its own resolves through the canonical selection it
 * presents under (id, then display name), so a variant is selectable before
 * its body exists and simply shows the canonical body until then.
 */
export function infernalHeroOverrideKeys(
  realm: string,
  selection: Pick<InfernalCharacterSelection, 'id' | 'name' | 'variantOf'>,
): string[] {
  const keys = [`hero:${selection.id}`, `hero:${selection.name}`];
  if (selection.variantOf) {
    keys.push(`hero:${selection.variantOf}`);
    const canonical = infernalCharacterSelectionsForRealm(realm).find(
      (candidate) => candidate.id === selection.variantOf,
    );
    if (canonical && canonical.name !== selection.name) keys.push(`hero:${canonical.name}`);
  }
  return keys;
}
