/**
 * Reads the gender a roster NAME asserts, so the civilian body hash cannot
 * contradict it.
 *
 * The town bank used to be four women and one man, and the hash could ignore
 * gender because almost every body was female. The 2026-08-21 sweep replaced
 * the failed craftsman and guard with three male bodies and a man-at-arms, and
 * a single mixed rotation drawn by rendezvous hash then puts a man on Widow
 * Tansy and leaves Huntsman Deral in a gown. Rendezvous hashing distributes
 * blind; that is the whole point of it, and it is why the fix belongs here and
 * not in twenty more hand pins that the next roster addition silently breaks.
 *
 * WHAT THIS READS. The NPC's authored display name (`NPCS[id].name`), which is
 * English written by a person. It deliberately does NOT read the asset
 * filename: those were laundered by the ip_rename pass and are known to lie
 * (see body_shape_gate.ts), and it does not read the template id, which is a
 * persistence key that outlives any rename.
 *
 * WHAT IT RETURNS. 'male' or 'female' only when the name actually says so, and
 * null otherwise. Null is the common case and is not a failure: most of the
 * roster is "Bellkeeper Tam" or "Riftwatch Ollun", where nothing in the name
 * carries gender. An unreadable name draws from the WHOLE bank, which is the
 * behavior that shipped before this module and cannot be wrong in a way the
 * data supports.
 */

/** Split on anything that is not a letter, so "Pearl-Mother Isha" yields the
 *  "mother" token and "Salvage-Boss Ryna" yields "ryna". */
function words(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
}

/**
 * Gendered ROLE words. A title is authored to be read, so it is the strongest
 * signal in the name and is checked first.
 */
const FEMALE_TITLE_WORDS: ReadonlySet<string> = new Set([
  'widow',
  'mother',
  'sister',
  'lady',
  'dame',
  'madam',
  'matron',
  'mistress',
  'goodwife',
  'queen',
  'princess',
  'duchess',
  'abbess',
  'huntress',
  'seamstress',
]);

const MALE_TITLE_WORDS: ReadonlySet<string> = new Set([
  'brother',
  'father',
  'sir',
  'lord',
  'goodman',
  'abbot',
  'friar',
  'monk',
  'king',
  'prince',
  'duke',
  'huntsman',
  'fisherman',
  'lampman',
  'footman',
  'watchman',
  'craftsman',
  'tradesman',
  'herdsman',
  'ferryman',
  'oarsman',
  'swordsman',
  'spearman',
  'guardsman',
  'marksman',
  'bowman',
]);

/**
 * Compound titles the roster writes as ONE word: Wickmother, Loremother,
 * Forgemistress. Suffix matching catches those without a combinatorial list.
 *
 * There is deliberately no male suffix list. The male equivalent would be
 * "-man", and applying it as a suffix would gender any future given name that
 * happens to end in those three letters. Every male compound the roster uses is
 * spelled out in MALE_TITLE_WORDS instead, which cannot misfire.
 */
const FEMALE_TITLE_SUFFIXES: readonly string[] = ['mother', 'mistress', 'woman', 'wife', 'ress'];

/**
 * Given names, for the rows whose title carries no gender at all: "Saul the
 * Chronicler", "Trader Wilkes", "Keeper Bram".
 *
 * This is authored data and it grows with the roster, exactly like NPCS itself.
 * A name that is not here is not an error, it just falls through to null and
 * draws from the whole bank. Only add a name a person would read as clearly
 * one gender; an ambiguous name belongs in neither list.
 */
const MALE_GIVEN_NAMES: ReadonlySet<string> = new Set([
  'aldous',
  'aldric',
  'bram',
  'brandt',
  'caddis',
  'cainhurst',
  'cobb',
  'deral',
  'fernando',
  'grott',
  'haldren',
  'halven',
  'hesk',
  'hode',
  'kael',
  'marlow',
  'odell',
  'osric',
  'pip',
  'saul',
  'wilkes',
]);

const FEMALE_GIVEN_NAMES: ReadonlySet<string> = new Set([
  'amaranth',
  'amelle',
  'bree',
  'bryn',
  'darva',
  'edda',
  'einna',
  'fenna',
  'isha',
  'kaldra',
  'lira',
  'maeve',
  'maren',
  'maribel',
  'marla',
  'nell',
  'odile',
  'ottilie',
  'ottoline',
  'petra',
  'pomeline',
  'ryna',
  'sela',
  'sorrel',
  'tansy',
  'verane',
  'verr',
  'veyla',
  'yara',
]);

export type CivilianGender = 'male' | 'female';

/**
 * The gender `name` asserts, or null when it asserts none.
 *
 * Tokens are read left to right and the FIRST gendered hit wins, so the title
 * that opens the name outranks the given name behind it. That ordering is what
 * keeps "Huntsman Deral" male and "Widow Tansy" female without either list
 * needing to know about the other.
 */
export function civilianGenderForName(name: string | null | undefined): CivilianGender | null {
  if (!name) return null;
  for (const word of words(name)) {
    if (FEMALE_TITLE_WORDS.has(word)) return 'female';
    if (MALE_TITLE_WORDS.has(word)) return 'male';
    if (
      FEMALE_TITLE_SUFFIXES.some((suffix) => word.length > suffix.length && word.endsWith(suffix))
    )
      return 'female';
    if (FEMALE_GIVEN_NAMES.has(word)) return 'female';
    if (MALE_GIVEN_NAMES.has(word)) return 'male';
  }
  return null;
}
