#!/usr/bin/env node
// The re-encode dropped far more than the textures can account for, which means
// writing through a meshopt-registered IO also re-encoded GEOMETRY. Meshopt
// quantises positions, so "same mesh count" is not enough: compare the actual
// vertex data against the backup and report the worst deviation as a fraction of
// the model's own size. Anything visible here means reverting, not explaining.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const BACKUP = '/mnt/usb4/moveweight-assets/cr-realms-backup/png-shrink';
const STORE = '/opt/cr-realms-store';

function positions(doc) {
  const out = [];
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const a = prim.getAttribute('POSITION');
      if (a) out.push(a);
    }
  return out;
}

const files = readdirSync(BACKUP).filter((f) => f.endsWith('.glb'));
console.log('backups to verify:', files.length);
let worstAll = 0, checked = 0, shapeBad = 0;
const rows = [];

for (const f of files) {
  const realm = f.slice(0, f.indexOf('__'));
  const name = f.slice(f.indexOf('__') + 2);
  const live = join(STORE, realm, name);
  if (!existsSync(live)) { console.log('  live file gone:', realm + '/' + name); continue; }

  let a, b;
  try { a = await io.read(join(BACKUP, f)); b = await io.read(live); }
  catch (e) { console.log('  unreadable', f, String(e).slice(0, 60)); continue; }

  const pa = positions(a), pb = positions(b);
  if (pa.length !== pb.length) { shapeBad++; console.log('  PRIM COUNT DIFF', f); continue; }

  let worst = 0, span = 0;
  for (let i = 0; i < pa.length; i++) {
    const A = pa[i].getArray(), B = pb[i].getArray();
    if (!A || !B || A.length !== B.length) { shapeBad++; break; }
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let j = 0; j < A.length; j += 3)
      for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], A[j + k]); mx[k] = Math.max(mx[k], A[j + k]); }
    const diag = Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
    span = Math.max(span, diag);
    for (let j = 0; j < A.length; j++) worst = Math.max(worst, Math.abs(A[j] - B[j]));
  }
  const pct = span ? (worst / span) * 100 : 0;
  worstAll = Math.max(worstAll, pct);
  checked++;
  rows.push({ name, pct, ext: b.getRoot().listExtensionsUsed().map((e) => e.extensionName).join(',') });
}

rows.sort((x, y) => y.pct - x.pct);
console.log(`\nchecked ${checked}, prim-shape mismatches ${shapeBad}`);
console.log(`WORST vertex deviation: ${worstAll.toFixed(4)}% of the model's own diagonal\n`);
for (const r of rows.slice(0, 8)) console.log(`  ${r.pct.toFixed(4)}%  ${r.name}  [${r.ext}]`);
