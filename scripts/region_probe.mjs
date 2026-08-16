#!/usr/bin/env node
// Weight composition of vertices inside a bind-space box region.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const [INPUT, x0, x1, y0, y1, z0, z1] = process.argv.slice(2);
const B = [x0, x1, y0, y1, z0, z1].map(Number);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(INPUT);
const root = doc.getRoot();
const skin = root.listSkins()[0];
const jointName = skin.listJoints().map(j => j.getName());
const prim = root.listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION'), jA = prim.getAttribute('JOINTS_0'), wA = prim.getAttribute('WEIGHTS_0');
const p = [], je = [], we = [];
const mass = {}; let count = 0;
for (let i = 0; i < pos.getCount(); i++) {
  pos.getElement(i, p);
  if (p[0] < B[0] || p[0] > B[1] || p[1] < B[2] || p[1] > B[3] || p[2] < B[4] || p[2] > B[5]) continue;
  count++;
  jA.getElement(i, je); wA.getElement(i, we);
  for (let s = 0; s < 4; s++) { if (we[s] > 0) mass[jointName[je[s]]] = (mass[jointName[je[s]]] || 0) + we[s]; }
}
console.log(`box x[${B[0]},${B[1]}] y[${B[2]},${B[3]}] z[${B[4]},${B[5]}]: ${count} verts`);
console.log(Object.fromEntries(Object.entries(mass).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[k, Math.round(v)])));
