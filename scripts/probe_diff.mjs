#!/usr/bin/env node
// probe_diff.mjs — cluster the vertices whose weights changed between two GLBs;
// per cluster report raw dominant joints, position box, and after-target joints.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const arg = (n, d = null) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

async function loadVerts(path) {
  const doc = await io.read(path);
  const out = [];
  for (const node of doc.getRoot().listNodes()) {
    const skin = node.getSkin(), mesh = node.getMesh();
    if (!skin || !mesh) continue;
    const names = skin.listJoints().map((j) => j.getName());
    const seen = new Set();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'), jA = prim.getAttribute('JOINTS_0'), wA = prim.getAttribute('WEIGHTS_0');
      if (!pos || !jA || !wA || seen.has(jA)) continue;
      seen.add(jA);
      const p = [], je = [], we = [];
      let scale = 1; const el = [];
      const n0 = Math.min(wA.getCount(), 200); const probe = [];
      for (let i = 0; i < n0; i++) { wA.getElement(i, el); probe.push(el.reduce((s, v) => s + v, 0)); }
      probe.sort((a, b) => a - b); const med = probe[probe.length >> 1];
      if (med > 100 && med < 400) scale = 255; else if (med > 30000) scale = 65535;
      for (let vi = 0; vi < pos.getCount(); vi++) {
        pos.getElement(vi, p); jA.getElement(vi, je); wA.getElement(vi, we);
        const m = {};
        for (let s = 0; s < 4; s++) { const w = (we[s] || 0) / scale; if (w > 0.001) m[names[je[s]]] = (m[names[je[s]]] || 0) + w; }
        out.push({ x: p[0], y: p[1], z: p[2], m });
      }
    }
  }
  return out;
}

const A = await loadVerts(arg('a'));
const B = await loadVerts(arg('b'));
if (A.length !== B.length) { console.log(`count mismatch ${A.length} vs ${B.length}`); process.exit(1); }
const changed = [];
for (let i = 0; i < A.length; i++) {
  const keys = new Set([...Object.keys(A[i].m), ...Object.keys(B[i].m)]);
  let delta = 0;
  for (const k of keys) delta += Math.abs((A[i].m[k] || 0) - (B[i].m[k] || 0));
  if (delta > 0.3) changed.push({ ...A[i], after: B[i].m, delta });
}
console.log(`${changed.length} changed verts (delta>0.3) of ${A.length}`);
// grid cluster 0.15
const cl = new Map();
for (const v of changed) {
  const k = `${Math.round(v.x / 0.15)},${Math.round(v.y / 0.15)},${Math.round(v.z / 0.15)}`;
  let c = cl.get(k);
  if (!c) { c = { n: 0, sx: 0, sy: 0, sz: 0, raw: {}, aft: {} }; cl.set(k, c); }
  c.n++; c.sx += v.x; c.sy += v.y; c.sz += v.z;
  for (const [j, w] of Object.entries(v.m)) c.raw[j] = (c.raw[j] || 0) + w;
  for (const [j, w] of Object.entries(v.after)) c.aft[j] = (c.aft[j] || 0) + w;
}
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([j, w]) => `${j}:${w.toFixed(0)}`).join(' ');
const list = [...cl.values()].sort((a, b) => b.n - a.n).slice(0, 20);
for (const c of list) {
  console.log(`cell n=${c.n} at (${(c.sx / c.n).toFixed(2)},${(c.sy / c.n).toFixed(2)},${(c.sz / c.n).toFixed(2)}) raw[${top(c.raw, 3)}] -> after[${top(c.aft, 3)}]`);
}
