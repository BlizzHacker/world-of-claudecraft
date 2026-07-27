// Measure source dimensions for specific audit-grid cells, so a new gate rule is
// derived from the assets I actually judged by eye rather than guessed.
//
// Dominion p0 showed the blind spot: alien face RELIEFS and BUSTS pass the depth
// rule because a flat wall panel is genuinely thin front-to-back. Hypothesis: a
// real humanoid has arm span, a bust does not — so wide/y should separate them.
//
//   node measure_cells.mjs <realm> <goodCsv> <badCsv>
import { glbBounds } from './humanoid_gate.mjs';
import { readFileSync, readdirSync } from 'node:fs';

const [realm, goodCsv, badCsv] = process.argv.slice(2);
const entries = [
  ...JSON.parse(readFileSync('/tmp/entries.json', 'utf8')),
  ...JSON.parse(readFileSync('/tmp/entries2.json', 'utf8')),
];
const srcByKey = new Map(entries.map((e) => [e.key, e.src]));
const keys = readdirSync(`/tmp/audit_all/${realm}`).filter((f) => f.endsWith('.png'))
  .map((f) => f.slice(0, -4)).sort();

const rows = [];
for (const [label, csv] of [['GOOD', goodCsv], ['BAD', badCsv]]) {
  for (const n of csv.split(',').filter(Boolean).map(Number)) {
    const key = keys[n];
    const src = srcByKey.get(key);
    if (!src) { rows.push([label, n, key, null]); continue; }
    try { rows.push([label, n, key, glbBounds(src).size]); } catch { rows.push([label, n, key, null]); }
  }
}

console.log('label cell  x/y   z/y   thin/y wide/y  key');
for (const [label, n, key, size] of rows) {
  if (!size) { console.log(`${label.padEnd(5)} ${String(n).padStart(4)}  (unmeasurable) ${key ?? '?'}`); continue; }
  const [x, y, z] = size;
  const thin = Math.min(x, z);
  const wide = Math.max(x, z);
  console.log(
    `${label.padEnd(5)} ${String(n).padStart(4)}  ${(x / y).toFixed(2)}  ${(z / y).toFixed(2)}  ` +
    `${(thin / y).toFixed(2)}   ${(wide / y).toFixed(2)}    ${key.slice(0, 52)}`
  );
}
