#!/usr/bin/env node
// Does the RENDERED result match the arithmetic? The whole premise of this pass
// is that the on-screen size was never what the numbers implied, so the derived
// after-distribution (before x wield) is not evidence until the engine's own
// attach path agrees with it body by body.
import { readFileSync } from 'node:fs';

const before = JSON.parse(readFileSync('/tmp/armed_before.json', 'utf8')).filter((r) => !r.err);
const after = JSON.parse(readFileSync('/tmp/armed_after.json', 'utf8')).filter((r) => !r.err);
const src = readFileSync('/opt/cryptic-realm/src/render/characters/realm_wield.generated.ts', 'utf8');
const wield = {};
{
  const body = src.slice(src.indexOf('REALM_WIELD_SCALE'));
  const re = /^ {2}"([A-Za-z0-9_]+)": ([0-9.]+),/gm;
  let m;
  while ((m = re.exec(body))) wield[m[1]] = Number(m[2]);
}

const b = new Map(before.map((r) => [r.label, r]));
let rows = [];
for (const a of after) {
  const prev = b.get(a.label);
  const w = wield[a.label];
  if (!prev || w === undefined) continue;
  const derived = prev.ratio * w;
  rows.push({
    sameArm: prev.armBase === a.armBase,
    armBefore: prev.armBase,
    armAfter: a.armBase,
    label: a.label,
    derived,
    measured: a.ratio,
    err: a.ratio / derived - 1,
    bodyBefore: prev.bodyH,
    bodyAfter: a.bodyH,
  });
}
// The weapon each body carries is a deterministic pick INTO A POOL, and the pool
// shrank between the two runs (weapons quarantined out of the store), so a body
// can be holding a different class of weapon in the two probes. Those pairs say
// nothing about whether the wield term behaves; separate them out.
const swapped = rows.filter((r) => !r.sameArm);
console.log(`bodies whose WEAPON changed between the runs: ${swapped.length}/${rows.length}`);
if (swapped.length) {
  console.log('  e.g.');
  for (const r of swapped.slice(0, 4)) console.log(`    ${r.label}: ${r.armBefore} -> ${r.armAfter}`);
}
rows = rows.filter((r) => r.sameArm);
console.log('');
console.log(`--- comparing only the ${rows.length} bodies holding the SAME weapon ---`);
rows.sort((x, y) => Math.abs(y.err) - Math.abs(x.err));
const errs = rows.map((r) => Math.abs(r.err)).sort((x, y) => x - y);
const pct = (v) => `${(100 * v).toFixed(3)}%`;
console.log(`paired bodies: ${rows.length}`);
console.log(
  `|measured/derived - 1|:  median ${pct(errs[Math.floor(errs.length / 2)])}` +
    `  p95 ${pct(errs[Math.floor(0.95 * errs.length)])}  MAX ${pct(errs[errs.length - 1])}`,
);
console.log(`bodies off by more than 1%: ${errs.filter((e) => e > 0.01).length}`);
console.log('worst 8:');
for (const r of rows.slice(0, 8)) {
  console.log(
    `  derived ${r.derived.toFixed(4)}  measured ${r.measured.toFixed(4)}  ` +
      `err ${pct(r.err)}  bodyH ${r.bodyBefore} -> ${r.bodyAfter}  ${r.label}`,
  );
}
// The body height must be identical between runs; if it is not, the two probes
// were not measuring the same asset and nothing above compares.
const drift = rows.filter((r) => Math.abs(r.bodyAfter / r.bodyBefore - 1) > 1e-6);
console.log(`bodies whose measured height changed between runs: ${drift.length}`);
