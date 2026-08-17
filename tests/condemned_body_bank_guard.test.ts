import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

/**
 * The `infernal_human_*` body bank is CONDEMNED. It may never come back.
 *
 * DECISION (owner, 2026-08-17): a render sheet of the whole bank was reviewed
 * body by body and the verdict was "100% all of these are failures" — get rid
 * of them, 100% removed. The phase-1 body catalog reached the same verdict
 * independently and on its own evidence: of the 18 GLBs behind these keys it
 * marks 15 `reject`, 2 `marginal` and 1 unclassified, and NONE `ship`. The
 * recorded reasons are chibi proportions against a realistic realm, arms
 * welded to the torso so they hold bind through every clip, forearms that end
 * in flat blades with no hands, feet sheared into planks, and — for the two
 * whose rig is actually sound — an archetype that cannot read in this realm at
 * all (a western gunslinger and a shirtless modern MMA fighter).
 *
 * This guard exists because the bank has three ways back in, and unreferencing
 * it is not enough to stop any of them:
 *   1. a merge re-adding a table entry,
 *   2. a regenerated table picking the GLBs back out of the asset store,
 *   3. a server-side default or override path naming a file directly.
 *
 * So the ban is enforced as a string ban on the *source*, not as a check that
 * something still resolves.
 *
 * NOTE ON THE PATTERN: the trailing underscore is load-bearing. It must match
 * `infernal_human_iron_warden` (condemned) and must NOT match
 * `infernal_humanoid_figure_creature_...` (a different, healthy body family
 * that is still in service). Do not "simplify" this to `infernal_human`.
 */
const CONDEMNED = 'infernal_human_';

const SOURCE_EXT = /\.(ts|tsx|js|mjs|cjs|json|svelte)$/;

function walk(relDir: string, keep: (rel: string) => boolean): string[] {
  const absDir = path.join(ROOT, relDir);
  const out: string[] = [];
  for (const name of readdirSync(absDir)) {
    const rel = path.join(relDir, name).replace(/\\/g, '/');
    const st = statSync(path.join(ROOT, rel));
    if (st.isDirectory()) out.push(...walk(rel, keep));
    else if (keep(rel)) out.push(rel);
  }
  return out;
}

function countOccurrences(rel: string): number {
  const text = readFileSync(path.join(ROOT, rel), 'utf8');
  let n = 0;
  let i = text.indexOf(CONDEMNED);
  while (i !== -1) {
    n += 1;
    i = text.indexOf(CONDEMNED, i + CONDEMNED.length);
  }
  return n;
}

/**
 * The hand-authored tables that still name the bank, with the EXACT number of
 * references each one currently carries.
 *
 * This is a ratchet, not an exemption. The test fails if a count goes UP (the
 * bank spreading) and it also fails if a count goes DOWN without this table
 * being edited (a stale allowance left open for something else to slip
 * through). Every entry must reach 0 and be deleted from this map; when the map
 * is empty the ban below becomes absolute for src/ as well.
 *
 * It is empty, and staying empty is the point. The civilians that unblocked
 * this were in the store all along under classic/ and arcane/; the earlier
 * "no townspeople exist" reading was a search failure. If a future change needs
 * a body here, take one from the civilian bank in infernal_roster.ts - do not
 * re-add a row to this map.
 */
const AWAITING_REPLACEMENT: Readonly<Record<string, number>> = {
  // EMPTY as of 2026-08-17. The civilian bodies landed, the roster and the
  // registrations were repointed onto them, and the ban below is now ABSOLUTE
  // for src/ as well as server/ and the generated tables. Nothing may be added
  // back to this map: an entry here would mean the bank had returned.
};

const WHY = [
  'The infernal_human_* body bank is CONDEMNED and must never be reintroduced.',
  'Owner decision 2026-08-17: the full render sheet was reviewed and rejected outright',
  '("100% all of these are failures"), and the phase-1 body catalog independently',
  'marks 15 of the 18 `reject`, 2 `marginal`, 0 `ship`.',
  'If you need a body here, take one from the approved catalog',
  '(/root/body_catalog/catalog.json, verdict ship | ship-with-caveat AND examinedCellByCell)',
  'and RENDER it before committing. Do not re-add this bank.',
].join('\n');

describe('condemned infernal_human_* body bank', () => {
  // server/ and every generated table are already clean, so these are absolute
  // bans with no allowance at all. This is the half of the rule that actually
  // stops a regenerated file or a server default from resurrecting the bank.
  it('never appears in server/', () => {
    const offenders = walk('server', (rel) => SOURCE_EXT.test(rel)).filter(
      (rel) => countOccurrences(rel) > 0,
    );
    expect(offenders, `${WHY}\n\nserver/ must stay free of it. Offending files:`).toEqual([]);
  });

  it('never appears in any generated table', () => {
    const generated = [
      ...walk('src', (rel) => SOURCE_EXT.test(rel) && /\.generated\./.test(rel)),
      ...walk('scripts/realm_assets', (rel) => /\.generated\./.test(rel)),
    ];
    // Guard the guard: if the glob stops matching, this test would pass vacuously.
    expect(generated.length, 'expected to find generated tables to scan').toBeGreaterThan(10);

    const offenders = generated.filter((rel) => countOccurrences(rel) > 0);
    expect(
      offenders,
      `${WHY}\n\nA generated table named the bank, which means a GENERATOR still selects it.\n` +
        'Fix the generator (scripts/realm_assets/*.mjs), do not hand-edit the generated file.\n' +
        'Offending files:',
    ).toEqual([]);
  });

  // src/ is on a shrinking ratchet until the replacement bodies land.
  it('never spreads to a new file in src/', () => {
    const known = new Set(Object.keys(AWAITING_REPLACEMENT));
    const offenders = walk('src', (rel) => SOURCE_EXT.test(rel))
      .filter((rel) => !known.has(rel))
      .filter((rel) => countOccurrences(rel) > 0);
    expect(
      offenders,
      `${WHY}\n\nThese src/ files are NOT on the shrinking list and must not name it at all:`,
    ).toEqual([]);
  });

  it('holds the known references at an exactly-shrinking count', () => {
    const actual: Record<string, number> = {};
    for (const rel of Object.keys(AWAITING_REPLACEMENT)) actual[rel] = countOccurrences(rel);
    expect(
      actual,
      `${WHY}\n\nThe per-file counts moved.\n` +
        '  Count went UP  -> the bank is spreading. Revert it.\n' +
        '  Count went DOWN -> good, you replaced some. Now lower the number in\n' +
        '                     AWAITING_REPLACEMENT in this file to match, and delete the\n' +
        '                     entry entirely once it reaches 0.',
    ).toEqual(AWAITING_REPLACEMENT);
  });

  // A rebuild recipe is a reintroduction route the string ban cannot see: the
  // source could be spotless while `npm run assets:infernal-rigs` regenerates
  // all 18 GLBs straight back into the store. Both the script and any task that
  // invokes it are banned outright.
  it('keeps the rebuild recipe deleted, and unreferenced by any npm script', () => {
    expect(
      existsSync(path.join(ROOT, 'scripts/build_infernal_human_rigs.mjs')),
      `${WHY}\n\nThe rebuild script is back. It regenerates the whole bank from source ` +
        'assets, so its presence undoes the purge no matter how clean src/ looks.',
    ).toBe(false);

    const pkg = readFileSync(path.join(ROOT, 'package.json'), 'utf8');
    expect(
      pkg.includes(CONDEMNED),
      `${WHY}\n\npackage.json names the bank — almost certainly a resurrected ` +
        '"assets:infernal-rigs" task. A build recipe is a way back in.',
    ).toBe(false);
  });

  it('has no allowance left once the bank is gone', () => {
    // Turns the ratchet into an absolute ban the moment the last file is cleaned,
    // so nobody has to remember to come back and tighten this.
    const stillListed = Object.entries(AWAITING_REPLACEMENT).filter(([, n]) => n > 0);
    if (stillListed.length === 0) {
      const offenders = walk('src', (rel) => SOURCE_EXT.test(rel)).filter(
        (rel) => countOccurrences(rel) > 0,
      );
      expect(offenders, `${WHY}\n\nsrc/ must now be completely free of it:`).toEqual([]);
    }
  });
});
