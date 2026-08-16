// Tri-budget fixup, stage 2: sloppy-simplify then re-optimize the assets that
// stalled above 20k. Resumable via the ndjson log.
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
const LOG = join(ROOT, 'tmp/nonhum_fix2_results2.ndjson');
const BUDGET = 20000;

const shard = Number(process.argv[2] ?? 0);
const nshard = Number(process.argv[3] ?? 1);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
async function tris(p) {
  const d = await io.read(p);
  let n = 0;
  for (const m of d.getRoot().listMeshes())
    for (const pr of m.listPrimitives())
      if (pr.getMode() === 4) {
        const i = pr.getIndices();
        n += Math.floor((i ? i.getCount() : pr.getAttribute('POSITION').getCount()) / 3);
      }
  return n;
}
const node = (args) => execFileSync('node', ['--max-old-space-size=6144', ...args],
  { stdio: ['ignore', 'pipe', 'pipe'], timeout: 25 * 60 * 1000, maxBuffer: 1 << 26 });

const all = readFileSync(join(ROOT, 'tmp/nonhum_ship_results2.ndjson'), 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));
const targets = all.filter((r) => r.ok && r.tris > BUDGET);
const done = new Set();
if (existsSync(LOG))
  for (const l of readFileSync(LOG, 'utf8').split('\n').filter(Boolean))
    { try { done.add(JSON.parse(l).id8); } catch {} }

mkdirSync(TMP, { recursive: true });

for (let i = 0; i < targets.length; i++) {
  if (i % nshard !== shard) continue;
  const r = targets[i];
  if (done.has(r.id8)) continue;
  const fname = `${r.slug}_${r.id8}.glb`;
  const dest = join(STORE, r.realm, r.bucket ?? 'props', fname);
  const rec = { id8: r.id8, slug: r.slug, realm: r.realm, before: r.tris };
  const A = join(TMP, `${r.id8}_sl.glb`), B = join(TMP, `${r.id8}_sl2.glb`);
  const tmps = [A, B];
  try {
    let target = 18000, cur = r.tris, out = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      node([join(ROOT, 'nh_sloppy.mjs'), attempt === 0 ? dest : B, A, String(target)]);
      node([CLI, 'optimize', A, B, '--compress', 'meshopt',
        '--texture-compress', 'webp', '--texture-size', '1024']);
      cur = await tris(B);
      out = B;
      if (cur <= BUDGET) break;
      target = Math.max(500, Math.floor(target * (BUDGET / cur) * 0.85));
    }
    copyFileSync(out, dest);
    chmodSync(dest, 0o644);
    copyFileSync(dest, join(STAGE, r.realm, r.bucket ?? 'props', fname));
    rec.after = cur; rec.bytes = statSync(dest).size; rec.ok = cur <= BUDGET;
  } catch (err) {
    rec.ok = false;
    rec.error = String(err.stderr || err.stdout || err.message || err).slice(0, 300);
  }
  appendFileSync(LOG, JSON.stringify(rec) + '\n');
  for (const f of tmps) { try { rmSync(f, { force: true }); } catch {} }
  console.log(`[${shard}] ${rec.ok ? 'OK ' : 'ERR'} ${r.id8} ${r.slug} ${rec.before} -> ${rec.after ?? rec.error}`);
}
console.log(`fix2 shard ${shard} complete`);
