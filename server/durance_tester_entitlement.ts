/** Narrow server-only identity gate for the DuranceTester QA character. */
const DURANCE_TESTER_NAME = 'durancetester';
const DURANCE_TESTER_REALMS = new Set(['infernal', 'infernalrealm']);

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

/**
 * The character row must already have passed account authentication and the
 * global name-uniqueness check before this predicate is called.
 */
export function isDuranceTesterCharacter(name: string, realm: string): boolean {
  return normalize(name) === DURANCE_TESTER_NAME && DURANCE_TESTER_REALMS.has(normalize(realm));
}
