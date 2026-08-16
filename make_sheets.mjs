#!/usr/bin/env node
// Pick the contact-sheet sample and write the BEFORE / AFTER case files for
// audit_arms_render.mjs. The sample is stratified by the wielder's measured
// height so the sheet spans the whole size range instead of clustering on the
// median body, and the four worst ratios in each direction are forced in.
import { readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv;
const arg = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const BEFORE = arg('before', '/tmp/armed_before.json');
const WIELD = arg('wield', '/opt/cryptic-realm/src/render/characters/realm_wield.generated.ts');
const N = Number(arg('n', 48));
const OUT_B = arg('outBefore', '/tmp/sheet_before_cases.json');
const OUT_A = arg('outAfter', '/tmp/sheet_after_cases.json');

const rowsAll = JSON.parse(readFileSync(BEFORE, 'utf8')).filter((r) => !r.err);

const wield = {};
{
  const src = readFileSync(WIELD, 'utf8');
  const body = src.slice(src.indexOf('REALM_WIELD_SCALE'));
  const re = /^ {2}"([A-Za-z0-9_]+)": ([0-9.]+),/gm;
  let m;
  while ((m = re.exec(body))) wield[m[1]] = Number(m[2]);
}

// Bodies quarantined between the measurement and now have no wield row and no
// GLB; rendering them would 404. Drop them before sampling.
const rows = rowsAll.filter((r) => wield[r.label] !== undefined);
console.log(`${rowsAll.length - rows.length} measured bodies are no longer in the store, excluded`);

// Stratify by wielder height: N buckets across the sorted range, middle of each.
const byH = rows.slice().sort((a, b) => a.bodyH - b.bodyH);
const picked = new Map();
for (let i = 0; i < N; i++) {
  const lo = Math.floor((i * byH.length) / N);
  const hi = Math.floor(((i + 1) * byH.length) / N);
  const r = byH[Math.min(byH.length - 1, Math.floor((lo + hi) / 2))];
  if (r) picked.set(r.label, r);
}
// Force the extremes of the CURRENT distribution in: the sheet has to contain
// the cases the fix is supposed to rescue, not just a tidy middle.
const byRatio = rows.slice().sort((a, b) => a.ratio - b.ratio);
for (const r of [...byRatio.slice(0, 4), ...byRatio.slice(-4)]) picked.set(r.label, r);

const sel = [...picked.values()].sort((a, b) => a.bodyH - b.bodyH);

const STORE = '/opt/cr-realms-store';
const abs = (p) => p.replace(/^\/store/, STORE);
const short = (k) => k.replace(/^realm_[a-z]+_/, '').replace(/_[0-9a-f]{6,}$/, '').slice(0, 20);

const before = [];
const after = [];
sel.forEach((r, i) => {
  const rank = String(i + 1).padStart(2, '0');
  const w = wield[r.label] ?? 1;
  const common = {
    body: abs(r.body),
    arm: abs(r.arm),
    bone: 'handslot.r',
    grip: r.grip,
    poses: [['idle', 'Idle', 0.3]],
    yaws: [['', -Math.PI / 5]],
  };
  before.push({ ...common, label: `${rank}_f${r.ratio.toFixed(2)}_${short(r.label)}`, wield: 1 });
  after.push({
    ...common,
    label: `${rank}_f${(r.ratio * w).toFixed(2)}_${short(r.label)}`,
    wield: w,
  });
});

writeFileSync(OUT_B, JSON.stringify(before, null, 1));
writeFileSync(OUT_A, JSON.stringify(after, null, 1));
console.log(`sheet sample ${sel.length} bodies`);
console.log(
  `  wielder height ${sel[0].bodyH} .. ${sel[sel.length - 1].bodyH}`,
);
const rb = sel.map((r) => r.ratio).sort((a, b) => a - b);
const ra = sel.map((r) => r.ratio * (wield[r.label] ?? 1)).sort((a, b) => a - b);
const f = (v) => `${v[0].toFixed(3)} .. ${v[v.length - 1].toFixed(3)} (median ${v[Math.floor(v.length / 2)].toFixed(3)})`;
console.log(`  sample ratio BEFORE ${f(rb)}`);
console.log(`  sample ratio AFTER  ${f(ra)}`);
