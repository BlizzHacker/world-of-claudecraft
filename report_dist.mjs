#!/usr/bin/env node
// Distribution report for armed-body proportion, before vs after.
//   node report_dist.mjs --a /tmp/armed_before.json --b /tmp/armed_after.json
import { readFileSync } from 'node:fs';

const argv = process.argv;
const arg = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const REF = 2.54;

function load(p) {
  return JSON.parse(readFileSync(p, 'utf8')).filter((r) => !r.err && r.ratio > 0);
}

function q(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function report(name, rows) {
  const rs = rows.map((r) => r.ratio).sort((a, b) => a - b);
  const n = rs.length;
  // The class fraction this weapon was authored for: its reference length over
  // the reference wielder's height.
  const off = rows
    .map((r) => {
      const intended = (r.localLongest * (r.gripScale / (r.wield ?? 1))) / REF;
      return r.ratio / intended;
    })
    .sort((a, b) => a - b);
  const within = (t) => off.filter((v) => v >= 1 / t && v <= t).length;
  console.log(`--- ${name}  (n=${n}) ---`);
  console.log(
    `  weapon length / wielder height:  min ${rs[0].toFixed(3)}  p05 ${q(rs, 0.05).toFixed(3)}` +
      `  p25 ${q(rs, 0.25).toFixed(3)}  MEDIAN ${q(rs, 0.5).toFixed(3)}` +
      `  p75 ${q(rs, 0.75).toFixed(3)}  p95 ${q(rs, 0.95).toFixed(3)}  max ${rs[n - 1].toFixed(3)}`,
  );
  console.log(
    `  spread:  p95/p05 ${(q(rs, 0.95) / q(rs, 0.05)).toFixed(2)}x` +
      `   WORST max/min ${(rs[n - 1] / rs[0]).toFixed(2)}x`,
  );
  console.log(
    `  vs the size its CLASS asks for:  within +/-15% ${((100 * within(1.15)) / n).toFixed(1)}%` +
      `   within +/-25% ${((100 * within(1.25)) / n).toFixed(1)}%` +
      `   worst error ${Math.max(off[n - 1], 1 / off[0]).toFixed(2)}x`,
  );
  const band = rs.filter((v) => v >= 0.25 && v <= 1.0).length;
  console.log(`  inside the plain 0.25-1.00 band:  ${((100 * band) / n).toFixed(1)}%`);
  const fam = {};
  for (const r of rows) (fam[r.family] ??= []).push(r.ratio);
  for (const [f, v] of Object.entries(fam).sort()) {
    v.sort((a, b) => a - b);
    console.log(
      `    ${f.padEnd(17)} n=${String(v.length).padEnd(5)} median ${v[Math.floor(v.length / 2)].toFixed(3)}` +
        `  min ${v[0].toFixed(3)}  max ${v[v.length - 1].toFixed(3)}`,
    );
  }
  return rows;
}

function applyWield(rows, path) {
  const src = readFileSync(path, 'utf8');
  const w = {};
  const body = src.slice(src.indexOf('REALM_WIELD_SCALE'));
  const re = /^ {2}"([A-Za-z0-9_]+)": ([0-9.]+),/gm;
  let m;
  while ((m = re.exec(body))) w[m[1]] = Number(m[2]);
  // A body with no row is one the store no longer holds (quarantined between the
  // measurement and now); it is not in the shipped bank, so counting it would
  // report a body nobody can spawn. Named, then dropped.
  const gone = rows.filter((r) => w[r.label] === undefined);
  console.error(`[predict] ${gone.length}/${rows.length} measured bodies are no longer in the store; excluded:`);
  for (const r of gone) console.error(`    ${r.label}`);
  return rows
    .filter((r) => w[r.label] !== undefined)
    .map((r) => {
      const f = w[r.label];
      return { ...r, wield: f, gripScale: r.gripScale * f, ratio: r.ratio * f };
    });
}

const A = load(arg('a', '/tmp/armed_before.json'));
report('BEFORE', A);
const bPath = arg('b', null);
const predictPath = arg('predict', null);
if (predictPath) {
  console.log('');
  const P = applyWield(A, predictPath);
  report('AFTER (predicted: before x wield; the term is a linear factor on the grip)', P);
  const byLabel = new Map(A.map((r) => [r.label, r]));
  const moved = P.map((r) => ({
    label: r.label,
    from: byLabel.get(r.label).ratio,
    to: r.ratio,
    arm: r.armBase,
  }));
  moved.sort((x, y) => Math.abs(Math.log(y.to / y.from)) - Math.abs(Math.log(x.to / x.from)));
  console.log('');
  console.log('--- biggest corrections ---');
  for (const m of moved.slice(0, 12)) {
    console.log(`  ${m.from.toFixed(3)} -> ${m.to.toFixed(3)}   ${m.label}`);
  }
  const bad = P.filter((r) => r.ratio < 0.2 || r.ratio > 1.0).sort((a, b) => b.ratio - a.ratio);
  console.log('');
  console.log(`still outside 0.20-1.00: ${bad.length}/${P.length}`);
  for (const r of bad.slice(0, 20)) {
    console.log(`  ${r.ratio.toFixed(3)}  ${String(r.armBase).slice(0, 40)}  ${r.label}`);
  }
}
if (bPath) {
  const B = load(bPath);
  console.log('');
  report('AFTER', B);
  const byA = new Map(A.map((r) => [r.label, r]));
  const moved = B.filter((r) => byA.has(r.label)).map((r) => ({
    label: r.label,
    from: byA.get(r.label).ratio,
    to: r.ratio,
  }));
  moved.sort((x, y) => Math.abs(y.to - y.from) - Math.abs(x.to - x.from));
  console.log('\n--- biggest corrections ---');
  for (const m of moved.slice(0, 12)) {
    console.log(`  ${m.from.toFixed(3)} -> ${m.to.toFixed(3)}   ${m.label}`);
  }
  const stillOff = B.filter((r) => r.ratio < 0.2 || r.ratio > 1.0);
  console.log(`\nstill outside 0.20-1.00 after: ${stillOff.length}/${B.length}`);
  for (const r of stillOff.slice(0, 15)) {
    console.log(`  ${r.ratio.toFixed(3)}  ${r.armBase?.slice(0, 34)}  ${r.label}`);
  }
}
