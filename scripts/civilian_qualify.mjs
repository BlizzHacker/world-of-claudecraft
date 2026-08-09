#!/usr/bin/env node
// Find bodies that could join the civilian rotation.
//
// The bank is four because the rest were barred with specific rig defects, not
// because four is all that exists: the generated pool has ~1,600 entries. Apply
// the SAME criteria the roster audit used, in batch, so the shortlist is earned
// rather than guessed - then the survivors still get rendered and looked at,
// because "passes on numbers" is exactly how forge_worker and hermit got in
// before anyone noticed they have no hands.
//
//   node civilian_qualify.mjs <glob-dir> [limit]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const DIR = process.argv[2] ?? '/opt/cr-realms-store/infernal';
const LIMIT = Number(process.argv[3] ?? 400);

const ARM_CHAIN = new Set([
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
]);
const HANDS = ['LeftHand', 'RightHand'];

function analyse(doc) {
  const root = doc.getRoot();
  const skins = root.listSkins();
  if (!skins.length) return { skip: 'no skin' };
  const joints = skins[0].listJoints();
  const names = joints.map((j) => j.getName());
  const idxOf = new Map(names.map((n, i) => [n, i]));
  for (const h of HANDS) if (!idxOf.has(h)) return { skip: `no ${h}` };

  const armIdx = new Set();
  names.forEach((n, i) => { if (ARM_CHAIN.has(n)) armIdx.add(i); });
  const handIdx = new Set(HANDS.map((h) => idxOf.get(h)));

  // Per-hand: how much total weight does that hand joint actually carry?
  const handWeight = { LeftHand: 0, RightHand: 0 };
  let armWeightOnArmVerts = 0, totalWeightOnArmVerts = 0, verts = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const jo = prim.getAttribute('JOINTS_0');
      const we = prim.getAttribute('WEIGHTS_0');
      if (!pos) continue;
      const P = pos.getArray();
      for (let i = 0; i < P.length; i += 3) {
        minX = Math.min(minX, P[i]); maxX = Math.max(maxX, P[i]);
        minY = Math.min(minY, P[i + 1]); maxY = Math.max(maxY, P[i + 1]);
      }
      if (!jo || !we) continue;
      const J = jo.getArray(), W = we.getArray();
      const n = J.length / 4;
      verts += n;
      for (let v = 0; v < n; v++) {
        let armW = 0, allW = 0, touchesArm = false;
        for (let k = 0; k < 4; k++) {
          const j = J[v * 4 + k], w = W[v * 4 + k];
          if (!w) continue;
          allW += w;
          if (armIdx.has(j)) { armW += w; touchesArm = true; }
          if (handIdx.has(j)) {
            handWeight[names[j]] = (handWeight[names[j]] ?? 0) + w;
          }
        }
        if (touchesArm) { armWeightOnArmVerts += armW; totalWeightOnArmVerts += allW; }
      }
    }
  }

  const height = maxY - minY;
  const span = maxX - minX;
  return {
    verts,
    clips: root.listAnimations().length,
    spanRatio: height > 0 ? +(span / height).toFixed(3) : 0,
    leftHandW: +handWeight.LeftHand.toFixed(1),
    rightHandW: +handWeight.RightHand.toFixed(1),
    armPurity: totalWeightOnArmVerts > 0
      ? +(armWeightOnArmVerts / totalWeightOnArmVerts).toFixed(3) : 0,
  };
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.glb')).slice(0, LIMIT);
console.log(`scanning ${files.length} in ${DIR}\n`);
const rows = [];
for (const f of files) {
  let doc;
  try { doc = await io.read(join(DIR, f)); } catch { continue; }
  let r;
  try { r = analyse(doc); } catch (e) { continue; }
  if (r.skip) continue;
  // The barred bodies failed on exactly these: a dead hand (zero weight), arms
  // held in bind because the surface is weighted off the arm chain, and a span
  // ratio near/above 1 meaning arms locked straight out.
  const deadHand = r.leftHandW < 0.5 || r.rightHandW < 0.5;
  const pass = !deadHand && r.armPurity >= 0.6 && r.spanRatio < 0.95 && r.clips >= 4;
  rows.push({ name: basename(f), ...r, deadHand, pass });
}

const passed = rows.filter((r) => r.pass).sort((a, b) => b.armPurity - a.armPurity);
console.log(`scanned ${rows.length} rigged bodies -> ${passed.length} pass the bar\n`);
console.log('top candidates (arm purity, span, clips):');
for (const r of passed.slice(0, 25)) {
  console.log(`  purity ${r.armPurity}  span ${r.spanRatio}  clips ${String(r.clips).padStart(2)}  ${r.name}`);
}
const failed = rows.filter((r) => !r.pass);
console.log(`\nrejected ${failed.length}:`);
const why = {};
for (const r of failed) {
  const k = r.deadHand ? 'dead hand' : r.armPurity < 0.6 ? 'arms not driven'
    : r.spanRatio >= 0.95 ? 'T-pose span' : 'too few clips';
  why[k] = (why[k] ?? 0) + 1;
}
console.log(' ', JSON.stringify(why));
writeFileSync('/tmp/civ_candidates.json', JSON.stringify(passed, null, 1));
console.log('\nwrote /tmp/civ_candidates.json');
