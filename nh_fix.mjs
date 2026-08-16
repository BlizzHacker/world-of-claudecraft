// Fixup pass: assets whose error-bounded simplify hit the e=0.25 ceiling while
// still over the 20k triangle budget. meshoptimizer is limited by split vertices,
// so weld hard first, then drive simplify by ratio with the error cap released.
import { execFileSync } from 'node:child_process';
import { readFileSync, appendFileSync, existsSync, copyFileSync, chmodSync, statSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const ROOT = '/opt/cryptic-realm';
const CLI = join(ROOT, 'node_modules/@gltf-transform/cli/bin/cli.js');
const TMP = join(ROOT, 'tmp/nonhum_ship');
const STORE = '/opt/cr-realms-store';
const STAGE = '/mnt/usb4/moveweight-assets/cr-realms-staging';
const FIXLOG = join(ROOT, 'tmp/nonhum_fix_results.ndjson');
const BUDGET = 20000;

const shard = Number(process.argv[2] ?? 0);
const nshard = Number(process.argv[3] ?? 1);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

async function tris(path) {
  const doc = await io.read(path);
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives())
      if (prim.getMode() === 4) {
        const idx = prim.getIndices(), pos = prim.getAttribute('POSITION');
        n += Math.floor((idx ? idx.getCount() : pos ? pos.getCount() : 0) / 3);
      }
  return n;
}
const run = (args) => execFileSync('node', ['--max-old-space-size=6144', CLI, ...args],
  { stdio: ['ignore', 'pipe', 'pipe'], timeout: 20 * 60 * 1000, maxBuffer: 1 << 26 });

const all = readFileSync(join(ROOT, 'tmp/nonhum_ship_results.ndjson'), 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));
const targets = all.filter((r) => r.ok && r.tris > BUDGET);
const done = new Set();
if (existsSync(FIXLOG))
  for (const l of readFileSync(FIXLOG, 'utf8').split('\n').filter(Boolean))
    { try { done.add(JSON.parse(l).id8); } catch {} }

mkdirSync(TMP, { recursive: true });

for (let i = 0; i < targets.length; i++) {
  if (i % nshard !== shard) continue;
  const r = targets[i];
  if (done.has(r.id8)) continue;
  const fname = `${r.slug}_${r.id8}.glb`;
  const dest = join(STORE, r.realm, 'props', fname);
  const rec = { id8: r.id8, slug: r.slug, realm: r.realm, before: r.tris };
  const w = join(TMP, `${r.id8}_w.glb`);
  const tmps = [w];
  try {
    run(['weld', dest, w, '--tolerance', '0.0001']);
    let cur = await tris(w), best = w, ratio = Math.min(0.9, (BUDGET / cur) * 0.9);
    for (let attempt = 0; attempt < 4 && cur > BUDGET; attempt++) {
      const o = join(TMP, `${r.id8}_r${attempt}.glb`);
      tmps.push(o);
      run(['simplify', w, o, '--ratio', String(ratio), '--error', '1']);
      const t = await tris(o);
      best = o; cur = t;
      if (t > BUDGET) ratio = Math.max(0.005, ratio * (BUDGET / t) * 0.85);
    }
    copyFileSync(best, dest);
    chmodSync(dest, 0o644);
    copyFileSync(dest, join(STAGE, r.realm, 'props', fname));
    rec.after = cur; rec.bytes = statSync(dest).size; rec.ok = cur <= BUDGET;
  } catch (err) {
    rec.ok = false; rec.error = String(err.stderr ?? err.message ?? err).slice(0, 300);
  }
  appendFileSync(FIXLOG, JSON.stringify(rec) + '\n');
  for (const f of tmps) { try { rmSync(f, { force: true }); } catch {} }
  console.log(`[${shard}] ${rec.ok ? 'OK ' : 'ERR'} ${r.id8} ${r.slug} ${rec.before} -> ${rec.after ?? rec.error}`);
}
console.log(`fix shard ${shard} complete`);
