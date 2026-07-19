import type { PlayerClass } from '../types';

export type DiabloLineage = 'Diablo I' | 'Diablo II' | 'Diablo III' | 'Diablo IV' | 'Diablo Immortal';

export interface DiabloRealmClass {
  readonly id: string;
  readonly name: string;
  readonly lineage: DiabloLineage;
  /** Mechanical class used by the existing combat engine. */
  readonly engineClass: PlayerClass;
  readonly factionSide: 'sanctuary' | 'hell' | 'surprise';
}

const entry = (
  lineage: DiabloLineage,
  name: string,
  engineClass: PlayerClass,
  factionSide: DiabloRealmClass['factionSide'] = 'sanctuary',
): DiabloRealmClass => ({
  id: `${lineage.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name,
  lineage,
  engineClass,
  factionSide,
});

export const INFERNAL_DIABLO_CLASSES: readonly DiabloRealmClass[] = [
  entry('Diablo I', 'Warrior', 'warrior'), entry('Diablo I', 'Rogue', 'rogue'), entry('Diablo I', 'Sorcerer', 'mage'),
  entry('Diablo II', 'Amazon', 'hunter'), entry('Diablo II', 'Barbarian', 'warrior'), entry('Diablo II', 'Necromancer', 'warlock'),
  entry('Diablo II', 'Paladin', 'paladin'), entry('Diablo II', 'Sorceress', 'mage'), entry('Diablo II', 'Druid', 'druid'), entry('Diablo II', 'Assassin', 'rogue'),
  entry('Diablo III', 'Barbarian', 'warrior'), entry('Diablo III', 'Demon Hunter', 'hunter'), entry('Diablo III', 'Monk', 'shaman'),
  entry('Diablo III', 'Wizard', 'mage'), entry('Diablo III', 'Witch Doctor', 'warlock'), entry('Diablo III', 'Crusader', 'paladin'), entry('Diablo III', 'Necromancer', 'warlock'),
  entry('Diablo IV', 'Barbarian', 'warrior'), entry('Diablo IV', 'Druid', 'druid'), entry('Diablo IV', 'Necromancer', 'warlock'),
  entry('Diablo IV', 'Rogue', 'rogue'), entry('Diablo IV', 'Sorcerer', 'mage'), entry('Diablo IV', 'Spiritborn', 'shaman'),
  entry('Diablo IV', 'Paladin', 'paladin'), entry('Diablo IV', 'Warlock', 'warlock'),
  entry('Diablo Immortal', 'Barbarian', 'warrior'), entry('Diablo Immortal', 'Blood Knight', 'paladin'), entry('Diablo Immortal', 'Crusader', 'paladin'),
  entry('Diablo Immortal', 'Demon Hunter', 'hunter'), entry('Diablo Immortal', 'Druid', 'druid'), entry('Diablo Immortal', 'Monk', 'shaman'),
  entry('Diablo Immortal', 'Necromancer', 'warlock'), entry('Diablo Immortal', 'Tempest', 'shaman'), entry('Diablo Immortal', 'Warlock', 'warlock'), entry('Diablo Immortal', 'Wizard', 'mage'),
];

export function diabloClassesForRealm(realm: string): readonly DiabloRealmClass[] {
  return realm.toLowerCase().replace(/[^a-z0-9]+/g, '') === 'infernal'
    ? INFERNAL_DIABLO_CLASSES
    : [];
}
