// Auto-decoration figure gate: the ruling that keeps a CHARACTER out of the
// building slot.
//
// THE BUG THIS CLOSES. The auto-decoration catalogue
// (realm_decor.generated.ts) files each store GLB under a role, and
// realm_decor.ts scales a placement to that role's world height: `structure`
// is the BUILDING band at 11 yards, several times a player and taller than the
// town it stands over. The catalogue's role comes from the store's own review
// bucket, so everything the store filed under `building_structure` becomes a
// building. Four rows of the infernal store are a gaunt revenant, a HUMANOID
// whose own slug says so ("gaunt_revenant_the_object_features_a_hum", the
// store truncates slugs at 48 characters), and being filed under buildings
// they took the building band: an enormous coated figure in a wide-brimmed hat
// standing on the Martyrspike ridge, reported from the live world as "the
// giant random dude with a hat".
//
// THE RULING. A slug that names a PERSON or a humanoid creature may never take
// a building role. Characters belong to spawn logic, not to scenery, which is
// the same verdict the generator's own vision table already records as the
// never-place class `humanoid_misgated`; this leaf applies it to the rows no
// human ever rendered and reviewed. It is deliberately narrow: it gates only
// the BUILDING roles, so the statue rows that a figure word also reaches (the
// orc and goblin warrior statues, the humanoid sculpture, the gold rotunda a
// reviewer corrected to `monument`) keep the monument band they were admitted
// under. A statue of a warrior is decoration; a warrior scaled to a house is a
// bug.
//
// MIRRORED, NOT SHARED. scripts/realm_assets/emit_decor.mjs carries the same
// word list so a catalogue REGEN never re-emits one of these rows as a
// building. The generator is plain Node ESM and cannot import this TypeScript
// leaf, so the two lists are pinned equal by tests/decor_figure_gate.test.ts,
// the same mirroring contract fence_clearance.ts keeps with pathfind.ts.
//
// Pure, deterministic, import-free (one type-only import): no rng, no clock,
// no world state.

import type { RealmDecorRole } from './realm_decor_types';

/** Roles whose world height is the BUILDING band (src/sim/realm_decor.ts
 *  ROLE_HEIGHT). A row this gate refuses is refused only for these. */
export const DECOR_BUILDING_ROLES: ReadonlySet<RealmDecorRole> = new Set<RealmDecorRole>([
  'structure',
]);

/**
 * Slug words that name a PERSON or a humanoid creature.
 *
 * Word match, never substring, so "manor" and "mansion" are not "man" and
 * "monkshood" is not "monk". Truncated prefixes of "humanoid" are listed
 * explicitly because the store cuts a slug at 48 characters mid-word, which is
 * exactly how the offending rows arrive ("..._features_a_hum").
 */
export const DECOR_FIGURE_WORDS: ReadonlySet<string> = new Set([
  'angel',
  'apparition',
  'assassin',
  'banshee',
  'barbarian',
  'berserker',
  'cadaver',
  'centaur',
  'colossus',
  'corpse',
  'corpses',
  'deity',
  'demon',
  'devil',
  'druid',
  'effigy',
  'elder',
  'emperor',
  'executioner',
  'ghost',
  'ghoul',
  'ghouls',
  'gladiator',
  'goblin',
  'goblins',
  'goddess',
  'golem',
  'hum',
  'huma',
  'human',
  'humano',
  'humanoi',
  'humanoid',
  'humanoids',
  'humans',
  'imp',
  'king',
  'knight',
  'knights',
  'lich',
  'liches',
  'maiden',
  'minotaur',
  'monk',
  'necromancer',
  'ninja',
  'nomad',
  'ogre',
  'orc',
  'orcs',
  'paladin',
  'pharaoh',
  'phantom',
  'pilgrim',
  'prince',
  'princess',
  'priest',
  'priestess',
  'queen',
  'revenant',
  'revenants',
  'sage',
  'samurai',
  'seraph',
  'shaman',
  'skeleton',
  'skeletons',
  'soldier',
  'soldiers',
  'sorceress',
  'sorcerer',
  'specter',
  'spectre',
  'troll',
  'valkyrie',
  'vampire',
  'wanderer',
  'warlord',
  'warrior',
  'warriors',
  'witch',
  'wizard',
  'wraith',
  'wraiths',
  'zombie',
  'zombies',
]);

const HEX_TAIL = /_[0-9a-f]{6,}$/i;

/** The slug words of a catalogue key (`realm:<realm>/<bucket>/<file>`): the
 *  file name with its hex id stripped, split on every non-alphanumeric run.
 *  Mirrors the generator's slugWords so both halves classify the same text. */
export function decorKeySlugWords(key: string): string[] {
  const file = key.slice(key.lastIndexOf('/') + 1);
  return file
    .replace(HEX_TAIL, '')
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

/** True when this catalogue key's slug names a person or humanoid creature. */
export function decorKeyNamesFigure(key: string): boolean {
  for (const word of decorKeySlugWords(key)) {
    if (DECOR_FIGURE_WORDS.has(word)) return true;
  }
  return false;
}

/** May this catalogue row stand in a world under this role? False only for a
 *  figure-named row holding a BUILDING role, which is the case that put a
 *  house-sized humanoid on a ridge. Every other row is admitted unchanged. */
export function decorRoleAdmitted(key: string, role: RealmDecorRole): boolean {
  if (!DECOR_BUILDING_ROLES.has(role)) return true;
  return !decorKeyNamesFigure(key);
}
