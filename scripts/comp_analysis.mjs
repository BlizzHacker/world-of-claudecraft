#!/usr/bin/env node
// Connected components of the arm-dominant weight subgraph.
// Which components touch the upper arm bone (t 0.05-0.95 of Arm->ForeArm)?
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const INPUT = process.argv[2];
const THRESH = Number(process.argv[3] || 0.5);
function invert4(m){const i=new Array(16);i[0]=m[5]*m[10]*m[15]-m[5]*m[11]*m[14]-m[9]*m[6]*m[15]+m[9]*m[7]*m[14]+m[13]*m[6]*m[11]-m[13]*m[7]*m[10];i[4]=-m[4]*m[10]*m[15]+m[4]*m[11]*m[14]+m[8]*m[6]*m[15]-m[8]*m[7]*m[14]-m[12]*m[6]*m[11]+m[12]*m[7]*m[10];i[8]=m[4]*m[9]*m[15]-m[4]*m[11]*m[13]-m[8]*m[5]*m[15]+m[8]*m[7]*m[13]+m[12]*m[5]*m[11]-m[12]*m[7]*m[9];i[12]=-m[4]*m[9]*m[14]+m[4]*m[10]*m[13]+m[8]*m[5]*m[14]-m[8]*m[6]*m[13]-m[12]*m[5]*m[10]+m[12]*m[6]*m[9];i[1]=-m[1]*m[10]*m[15]+m[1]*m[11]*m[14]+m[9]*m[2]*m[15]-m[9]*m[3]*m[14]-m[13]*m[2]*m[11]+m[13]*m[3]*m[10];i[5]=m[0]*m[10]*m[15]-m[0]*m[11]*m[14]-m[8]*m[2]*m[15]+m[8]*m[3]*m[14]+m[12]*m[2]*m[11]-m[12]*m[3]*m[10];i[9]=-m[0]*m[9]*m[15]+m[0]*m[11]*m[13]+m[8]*m[1]*m[15]-m[8]*m[3]*m[13]-m[12]*m[1]*m[11]+m[12]*m[3]*m[9];i[13]=m[0]*m[9]*m[14]-m[0]*m[10]*m[13]-m[8]*m[1]*m[14]+m[8]*m[2]*m[13]+m[12]*m[1]*m[10]-m[12]*m[2]*m[9];i[2]=m[1]*m[6]*m[15]-m[1]*m[7]*m[14]-m[5]*m[2]*m[15]+m[5]*m[3]*m[14]+m[13]*m[2]*m[7]-m[13]*m[3]*m[6];i[6]=-m[0]*m[6]*m[15]+m[0]*m[7]*m[14]+m[4]*m[2]*m[15]-m[4]*m[3]*m[14]-m[12]*m[2]*m[7]+m[12]*m[3]*m[6];i[10]=m[0]*m[5]*m[15]-m[0]*m[7]*m[13]-m[4]*m[1]*m[15]+m[4]*m[3]*m[13]+m[12]*m[1]*m[7]-m[12]*m[3]*m[5];i[14]=-m[0]*m[5]*m[14]+m[0]*m[6]*m[13]+m[4]*m[1]*m[14]-m[4]*m[2]*m[13]-m[12]*m[1]*m[6]+m[12]*m[2]*m[5];i[3]=-m[1]*m[6]*m[11]+m[1]*m[7]*m[10]+m[5]*m[2]*m[11]-m[5]*m[3]*m[10]-m[9]*m[2]*m[7]+m[9]*m[3]*m[6];i[7]=m[0]*m[6]*m[11]-m[0]*m[7]*m[10]-m[4]*m[2]*m[11]+m[4]*m[3]*m[10]+m[8]*m[2]*m[7]-m[8]*m[3]*m[6];i[11]=-m[0]*m[5]*m[11]+m[0]*m[7]*m[9]+m[4]*m[1]*m[11]-m[4]*m[3]*m[9]-m[8]*m[1]*m[7]+m[8]*m[3]*m[5];i[15]=m[0]*m[5]*m[10]-m[0]*m[6]*m[9]-m[4]*m[1]*m[10]+m[4]*m[2]*m[9]+m[8]*m[1]*m[6]-m[8]*m[2]*m[5];let d=m[0]*i[0]+m[1]*i[4]+m[2]*i[8]+m[3]*i[12];if(d===0)return null;d=1/d;return i.map(v=>v*d);}
function distToSeg(p,a,b){const abx=b[0]-a[0],aby=b[1]-a[1],abz=b[2]-a[2];const apx=p[0]-a[0],apy=p[1]-a[1],apz=p[2]-a[2];const l2=abx*abx+aby*aby+abz*abz;let t=l2>0?(apx*abx+apy*aby+apz*abz)/l2:0;t=Math.max(0,Math.min(1,t));const dx=apx-t*abx,dy=apy-t*aby,dz=apz-t*abz;return Math.sqrt(dx*dx+dy*dy+dz*dz);}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(INPUT);
const root = doc.getRoot();
const skin = root.listSkins()[0];
const joints = skin.listJoints();
const jointName = joints.map(j => j.getName());
const idx = new Map(jointName.map((n, i) => [n, i]));
const ibm = skin.getInverseBindMatrices().getArray();
const head = joints.map((_, i) => { const inv = invert4(Array.from(ibm.slice(i*16, i*16+16))); return [inv[12], inv[13], inv[14]]; });
const H = n => head[idx.get(n)];
const ARM = new Set(['LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand'].map(n=>idx.get(n)));
const upperSegs = [['LeftArm','LeftForeArm'],['RightArm','RightForeArm']].map(([a,b])=>[H(a),H(b)]);

const prim = root.listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION'), jA = prim.getAttribute('JOINTS_0'), wA = prim.getAttribute('WEIGHTS_0');
const ind = prim.getIndices().getArray();
const n = pos.getCount();
// weld by position
const weld = new Map(); const rep = new Int32Array(n);
const p = [], je = [], we = [];
for (let i = 0; i < n; i++) {
  pos.getElement(i, p);
  const k = `${Math.round(p[0]*5000)},${Math.round(p[1]*5000)},${Math.round(p[2]*5000)}`;
  if (weld.has(k)) rep[i] = weld.get(k); else { weld.set(k, i); rep[i] = i; }
}
// arm-dominant mask
const armW = new Float32Array(n);
for (let i = 0; i < n; i++) {
  jA.getElement(i, je); wA.getElement(i, we);
  let s = 0; for (let k = 0; k < 4; k++) if (ARM.has(je[k])) s += we[k];
  armW[rep[i]] = Math.max(armW[rep[i]], s);
}
// union-find over edges within mask
const parent = new Int32Array(n); for (let i = 0; i < n; i++) parent[i] = i;
const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
for (let t = 0; t < ind.length; t += 3) {
  const a = rep[ind[t]], b = rep[ind[t+1]], c = rep[ind[t+2]];
  if (armW[a] >= THRESH && armW[b] >= THRESH) uni(a, b);
  if (armW[b] >= THRESH && armW[c] >= THRESH) uni(b, c);
  if (armW[a] >= THRESH && armW[c] >= THRESH) uni(a, c);
}
const comps = new Map();
for (let i = 0; i < n; i++) {
  if (rep[i] !== i || armW[i] < THRESH) continue;
  const r = find(i);
  const c = comps.get(r) || { size: 0, touchesUpper: false, min: [9,9,9], max: [-9,-9,-9] };
  c.size++;
  pos.getElement(i, p);
  for (let k = 0; k < 3; k++) { c.min[k] = Math.min(c.min[k], p[k]); c.max[k] = Math.max(c.max[k], p[k]); }
  for (const s of upperSegs) if (distToSeg(p, s[0], s[1]) < 0.08) c.touchesUpper = true;
  comps.set(r, c);
}
const list = [...comps.values()].sort((a, b) => b.size - a.size);
console.log(`=== ${INPUT.split('/').pop()} arm-dominant(>=${THRESH}) components: ${list.length} ===`);
for (const c of list.slice(0, 25)) {
  console.log(`size=${String(c.size).padStart(6)} upperArm=${c.touchesUpper ? 'YES' : 'no '} bbox x[${c.min[0].toFixed(2)},${c.max[0].toFixed(2)}] y[${c.min[1].toFixed(2)},${c.max[1].toFixed(2)}] z[${c.min[2].toFixed(2)},${c.max[2].toFixed(2)}]`);
}
