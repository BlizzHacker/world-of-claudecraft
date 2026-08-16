#!/usr/bin/env node
// probe_hand.mjs — where does <joint>-dominant geometry live, and what did the
// reweight do to it? Prints cluster boxes of dominant verts in --input, and if
// --after is given, the joint distribution those same vert indices ended with.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const arg = (n, d = null) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const JOINT = arg('joint', 'LeftHand');
const MIN_W = Number(arg('min-w', 0.5));

async function loadVerts(path) {
  const doc = await io.read(path);
  const root = doc.getRoot();
  const out = [];
  for (const node of root.listNodes()) {
    const skin = node.getSkin(), mesh = node.getMesh();
    if (!skin || !mesh) continue;
    const names = skin.listJoints().map((j) => j.getName());
    const seen = new Set();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'), jA = prim.getAttribute('JOINTS_0'), wA = prim.getAttribute('WEIGHTS_0');
      if (!pos || !jA || !wA || seen.has(jA)) continue;
      seen.add(jA);
      const p = [], je = [], we = [];
      // weight scale probe
      let scale = 1; const el = [];
      const n0 = Math.min(wA.getCount(), 200); const probe = [];
      for (let i = 0; i < n0; i++) { wA.getElement(i, el); probe.push(el.reduce((s, v) => s + v, 0)); }
      probe.sort((a, b) => a - b); const med = probe[probe.length >> 1];
      if (med > 100 && med < 400) scale = 255; else if (med > 30000) scale = 65535;
      for (let vi = 0; vi < pos.getCount(); vi++) {
        pos.getElement(vi, p); jA.getElement(vi, je); wA.getElement(vi, we);
        const m = {};
        for (let s = 0; s < 4; s++) { const w = (we[s] || 0) / scale; if (w > 0) m[names[je[s]]] = (m[names[je[s]]] || 0) + w; }
        out.push({ i: out.length, x: p[0], y: p[1], z: p[2], m });
      }
    }
  }
  return out;
}

const before = await loadVerts(arg('input'));
const sel = before.filter((v) => (v.m[JOINT] || 0) >= MIN_W);
console.log(`${sel.length} verts with ${JOINT} >= ${MIN_W} (of ${before.length})`);
// greedy spatial clustering, r=0.08
const clusters = [];
for (const v of sel) {
  let best = null;
  for (const c of clusters) {
    const d = Math.hypot(v.x - c.cx / c.n, v.y - c.cy / c.n, v.z - c.cz / c.n);
    if (d < 0.12) { best = c; break; }
  }
  if (!best) { best = { n: 0, cx: 0, cy: 0, cz: 0, minY: 1e9, maxY: -1e9, minX: 1e9, maxX: -1e9, minZ: 1e9, maxZ: -1e9, ids: [] }; clusters.push(best); }
  best.n++; best.cx += v.x; best.cy += v.y; best.cz += v.z;
  best.minY = Math.min(best.minY, v.y); best.maxY = Math.max(best.maxY, v.y);
  best.minX = Math.min(best.minX, v.x); best.maxX = Math.max(best.maxX, v.x);
  best.minZ = Math.min(best.minZ, v.z); best.maxZ = Math.max(best.maxZ, v.z);
  best.ids.push(v.i);
}
clusters.sort((a, b) => b.n - a.n);
const after = arg('after') ? await loadVerts(arg('after')) : null;
for (const c of clusters.slice(0, 8)) {
  console.log(`cluster n=${c.n} center=(${(c.cx / c.n).toFixed(2)},${(c.cy / c.n).toFixed(2)},${(c.cz / c.n).toFixed(2)}) x[${c.minX.toFixed(2)},${c.maxX.toFixed(2)}] y[${c.minY.toFixed(2)},${c.maxY.toFixed(2)}] z[${c.minZ.toFixed(2)},${c.maxZ.toFixed(2)}]`);
  if (after) {
    const dist = {};
    for (const id of c.ids) for (const [j, w] of Object.entries(after[id].m)) dist[j] = (dist[j] || 0) + w;
    const top = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([j, w]) => `${j}:${(w / c.n).toFixed(2)}`).join(' ');
    console.log(`  after-> ${top}`);
  }
}
// where are the hand joints? print inverse-bind translation of hand+forearm
const doc2 = await io.read(arg('input'));
for (const skin of doc2.getRoot().listSkins()) {
  const joints = skin.listJoints(); const ibm = skin.getInverseBindMatrices().getArray();
  joints.forEach((j, i) => {
    const n = j.getName();
    if (!/Hand|ForeArm|^Left(Arm)$|^Right(Arm)$|Hips/.test(n)) return;
    // invert translation part approximately: head = -R^T * t, but for near-identity R use -t
    const m = Array.from(ibm.slice(i * 16, i * 16 + 16));
    // proper inverse translation:
    const r = [[m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]]];
    const t = [m[12], m[13], m[14]];
    const hx = -(r[0][0] * t[0] + r[0][1] * t[1] + r[0][2] * t[2]);
    const hy = -(r[1][0] * t[0] + r[1][1] * t[1] + r[1][2] * t[2]);
    const hz = -(r[2][0] * t[0] + r[2][1] * t[1] + r[2][2] * t[2]);
    console.log(`joint ${n} head=(${hx.toFixed(2)},${hy.toFixed(2)},${hz.toFixed(2)})`);
  });
}
