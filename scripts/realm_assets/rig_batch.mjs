#!/usr/bin/env node
// Batch rigger: raw static GLB -> decimated -> KayKit-rigged (22 clips + handslot
// weapon sockets) -> staged per realm.
//
// Calls lib/manual_rig.mjs DIRECTLY rather than shelling out to pipeline.mjs.
// pipeline.mjs runs preview/preview_held after the rig, which needs a Chromium
// binary this container does not have, so it died before printing its report and
// every asset looked like a rig failure. It also truncates job dir names, which
// made prose-derived keys collide. Neither problem exists on the library path.
//
// Usage:
//   node rig_batch.mjs --list entries.json --out /staging [--concurrency 4] [--limit N]

import { manualRigOntoReference } from '../asset_pipeline/lib/manual_rig.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const exec = promisify(execFile);
const REPO = '/opt/cryptic-realm';
const REFERENCE = join(REPO, 'public/models/chars/players/knight.glb');
const GLTF_CLI = join(REPO, 'node_modules/@gltf-transform/cli/bin/cli.js');
const TRI_CAP = 11000;
const TRI_TARGET = 9000;
const TMP = '/tmp/rigbatch';

function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const LIST = arg('list');
const OUT_DIR = arg('out', '/mnt/staging');
const CONCURRENCY = Number(arg('concurrency', 4));
const LIMIT = Number(arg('limit', 0));

function glbStats(path) {
  const fd = readFileSync(path);
  const jsonLen = fd.readUInt32LE(12);
  const j = JSON.parse(fd.subarray(20, 20 + jsonLen).toString('utf8'));
  let tris = 0;
  for (const m of j.meshes ?? []) {
    for (const p of m.primitives ?? []) {
      const acc = p.indices != null ? j.accessors[p.indices] : j.accessors[p.attributes?.POSITION];
      if (acc) tris += Math.floor(acc.count / 3);
    }
  }
  return {
    tris,
    skins: (j.skins ?? []).length,
    anims: (j.animations ?? []).length,
    clips: (j.animations ?? []).map((a) => a.name),
    joints: j.skins?.[0] ? j.skins[0].joints.map((i) => j.nodes[i]?.name) : [],
  };
}

async function gltf(args, timeout = 600000) {
  return exec('node', [GLTF_CLI, ...args], { cwd: REPO, timeout, maxBuffer: 64 * 1024 * 1024 });
}

/** Decimate under TRI_CAP. One optimize pass, then error-bounded simplify passes with
 *  a widening budget — a tight error budget makes simplify stop short of the ratio. */
async function decimate(src, work) {
  const step1 = join(work, 'lo.glb');
  await gltf(['optimize', src, step1, '--compress', 'false', '--texture-compress', 'webp',
    '--texture-size', '512', '--simplify-error', '0.005']);
  let cur = step1;
  let stats = glbStats(cur);
  const errors = [0.02, 0.05, 0.12, 0.25];
  for (let i = 0; i < errors.length && stats.tris > TRI_CAP; i++) {
    const ratio = Math.max(0.05, Math.min(0.9, TRI_TARGET / stats.tris));
    const next = join(work, `lo${i + 2}.glb`);
    await gltf(['simplify', cur, next, '--ratio', String(ratio), '--error', String(errors[i])]);
    cur = next;
    stats = glbStats(cur);
  }
  return cur;
}

async function processOne(entry) {
  const { src, key, realm } = entry;
  const work = join(TMP, key);
  const t0 = Date.now();
  // Resume: a staged output means this asset is already done. Long batches get
  // interrupted (pct exec tears down the session and kills the process group),
  // so a restart must not redo hours of work.
  const staged = join(OUT_DIR, realm, `${key}.glb`);
  if (existsSync(staged)) {
    return { key, realm, ok: true, skipped: true, bytes: statSync(staged).size, ms: 0 };
  }
  try {
    rmSync(work, { recursive: true, force: true });
    mkdirSync(work, { recursive: true });
    const local = join(work, 'raw.glb');
    copyFileSync(src, local);
    const dec = await decimate(local, work);
    const outGlb = join(work, 'rigged.glb');
    // preRotated: manual_rig defaults to a -90deg yaw, which leaves Meshy/PICKTURA
    // exports facing sideways — verified by rendering both variants side by side.
    // Every asset came out edge-on until this was set.
    const fit = await manualRigOntoReference(dec, REFERENCE, outGlb, { preRotated: true });
    const st = glbStats(outGlb);
    const sockets = st.joints.includes('handslot.r') && st.joints.includes('handslot.l');
    const ok = st.anims >= 20 && st.skins >= 1 && sockets && st.tris <= TRI_CAP * 1.6;
    let bytes = 0;
    if (ok) {
      const destDir = join(OUT_DIR, realm);
      mkdirSync(destDir, { recursive: true });
      const dest = join(destDir, `${key}.glb`);
      copyFileSync(outGlb, dest);
      bytes = statSync(dest).size;
    }
    rmSync(work, { recursive: true, force: true });
    return { key, realm, ok, tris: st.tris, anims: st.anims, sockets, bytes,
      scale: fit?.scale, ms: Date.now() - t0,
      reason: ok ? null : `anims=${st.anims} skins=${st.skins} sockets=${sockets} tris=${st.tris}` };
  } catch (e) {
    rmSync(work, { recursive: true, force: true });
    return { key, realm, ok: false, ms: Date.now() - t0,
      reason: String(e.message || e).replace(/\s+/g, ' ').slice(0, 130) };
  }
}

async function main() {
  let entries = JSON.parse(readFileSync(LIST, 'utf8'));
  // Guard against duplicate keys (identical prompts recur in this library).
  const seen = new Set();
  entries = entries.filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)));
  if (LIMIT) entries = entries.slice(0, LIMIT);
  mkdirSync(TMP, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[rig_batch] ${entries.length} unique assets, concurrency ${CONCURRENCY}, out ${OUT_DIR}`);

  const results = [];
  let idx = 0;
  let done = 0;
  async function worker() {
    while (idx < entries.length) {
      const r = await processOne(entries[idx++]);
      results.push(r);
      done++;
      if (!r.skipped) {
        console.log(`[${done}/${entries.length}] ${r.ok ? 'OK ' : 'FAIL'} ${r.realm}/${r.key} tris=${r.tris ?? '-'} ${(r.ms / 1000).toFixed(1)}s ${r.reason ?? ''}`);
      } else if (done % 200 === 0) {
        console.log(`[${done}/${entries.length}] (resumed past ${done} staged)`);
      }
      if (done % 25 === 0) writeFileSync(join(OUT_DIR, '_results.json'), JSON.stringify(results, null, 1));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  writeFileSync(join(OUT_DIR, '_results.json'), JSON.stringify(results, null, 1));
  const ok = results.filter((r) => r.ok);
  console.log(`\n[rig_batch] DONE ${ok.length}/${results.length} ok`);
  const byRealm = {};
  for (const r of ok) byRealm[r.realm] = (byRealm[r.realm] ?? 0) + 1;
  console.log('[rig_batch] per realm:', byRealm);
  const reasons = {};
  for (const f of results.filter((r) => !r.ok)) {
    const k = (f.reason || '').slice(0, 40);
    reasons[k] = (reasons[k] ?? 0) + 1;
  }
  if (Object.keys(reasons).length) console.log('[rig_batch] failures:', reasons);
}

main().catch((e) => { console.error(e); process.exit(1); });
