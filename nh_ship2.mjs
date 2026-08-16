// Optimise + error-bounded simplify the static-prop wins, then place them in the
// realm store and mirror to usb4 staging. Resumable: results are appended to an
// ndjson after every asset, and jobs already present there are skipped.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, copyFileSync, chmodSync, statSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const ROOT = '/opt/cryptic-realm';
const CLI = join(ROOT, 'node_modules/@gltf-transform/cli/bin/cli.js');
const TMP = join(ROOT, 'tmp/nonhum_ship');
const STORE = '/opt/cr-realms-store';
const STAGE = '/mnt/usb4/moveweight-assets/cr-realms-staging';
const RESULTS = join(ROOT, 'tmp/nonhum_ship_results2.ndjson');
const BUDGET = 20000;
const ERRORS = [0.02, 0.05, 0.12, 0.25];

const shard = Number(process.argv[2] ?? 0);
const nshard = Number(process.argv[3] ?? 1);

const jobs = JSON.parse(readFileSync(join(ROOT, 'tmp/nonhum_ship_jobs2.json'), 'utf8'));
const done = new Set();
if (existsSync(RESULTS)) {
  for (const line of readFileSync(RESULTS, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { done.add(JSON.parse(line).id8); } catch {}
  }
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

async function tris(path) {
  const doc = await io.read(path);
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      const pos = prim.getAttribute('POSITION');
      const count = idx ? idx.getCount() : (pos ? pos.getCount() : 0);
      const mode = prim.getMode();
      if (mode === 4) n += Math.floor(count / 3);
    }
  }
  return n;
}

function run(args) {
  execFileSync('node', ['--max-old-space-size=6144', CLI, ...args],
    { stdio: ['ignore', 'pipe', 'pipe'], timeout: 20 * 60 * 1000, maxBuffer: 1 << 26 });
}

mkdirSync(TMP, { recursive: true });

for (let i = 0; i < jobs.length; i++) {
  if (i % nshard !== shard) continue;
  const j = jobs[i];
  if (done.has(j.id8)) continue;
  const t0 = Date.now();
  const a = join(TMP, `${j.id8}_opt.glb`);
  const rec = { id8: j.id8, id: j.id, realm: j.realm, slug: j.slug, name: j.name, cls: j.cls };
  try {
    run(['optimize', j.src, a, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '1024']);
    let final = a, t = await tris(a), used = 'optimize-only';
    if (t > BUDGET) {
      for (const e of ERRORS) {
        const b = join(TMP, `${j.id8}_s${String(e).replace('.', '')}.glb`);
        run(['simplify', a, b, '--ratio', '0.0', '--error', String(e)]);
        const tb = await tris(b);
        if (tb <= BUDGET) { final = b; t = tb; used = `simplify e=${e}`; break; }
        final = b; t = tb; used = `simplify e=${e} (floor)`;
      }
    }
    const bucket = j.bucket ?? 'props';
    const destDir = join(STORE, j.realm, bucket);
    mkdirSync(destDir, { recursive: true });
    const fname = `${j.slug}_${j.id8}.glb`;
    const dest = join(destDir, fname);
    copyFileSync(final, dest);
    chmodSync(dest, 0o644);
    const stageDir = join(STAGE, j.realm, bucket);
    mkdirSync(stageDir, { recursive: true });
    copyFileSync(dest, join(stageDir, fname));
    rec.ok = true; rec.tris = t; rec.method = used;
    rec.bytes = statSync(dest).size; rec.url = `/cr-realms/${j.realm}/${bucket}/${fname}`;
    rec.bucket = bucket; rec.rbucket = j.rbucket ?? 'props';
    rec.flags = [];
    if (t > BUDGET) rec.flags.push('over_budget');
    if (rec.bytes > 12e6) rec.flags.push('large_file');
  } catch (err) {
    rec.ok = false;
    rec.error = String(err.stderr ?? err.message ?? err).slice(0, 400);
  }
  rec.secs = Math.round((Date.now() - t0) / 1000);
  appendFileSync(RESULTS, JSON.stringify(rec) + '\n');
  for (const f of [a, ...ERRORS.map((e) => join(TMP, `${j.id8}_s${String(e).replace('.', '')}.glb`))]) {
    try { rmSync(f, { force: true }); } catch {}
  }
  console.log(`[${shard}] ${rec.ok ? 'OK ' : 'ERR'} ${j.id8} ${j.slug} tris=${rec.tris ?? '-'} ${rec.method ?? rec.error ?? ''}`);
}
console.log(`shard ${shard} complete`);
