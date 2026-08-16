#!/usr/bin/env node
// Where do arm-weighted vertices sit relative to their bone segments?
// Decompose vertex offset from closest segment point into:
//   vy   = vertical component (negative = hanging below)
//   vh   = horizontal magnitude sqrt(vx^2+vz^2)
// Sleeves that droop with the arm: vh small, vy negative.
// Capes/cloth flare: vh large.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const INPUT = process.argv[2];
const ARM_CHAIN = {
  LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand',
  RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand',
};
const HAND = new Set(['LeftHand', 'RightHand']);
const B_SOURCES = new Set(['Hips', 'Spine', 'Spine01', 'Spine02', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg']);

function invert4(m){const i=new Array(16);i[0]=m[5]*m[10]*m[15]-m[5]*m[11]*m[14]-m[9]*m[6]*m[15]+m[9]*m[7]*m[14]+m[13]*m[6]*m[11]-m[13]*m[7]*m[10];i[4]=-m[4]*m[10]*m[15]+m[4]*m[11]*m[14]+m[8]*m[6]*m[15]-m[8]*m[7]*m[14]-m[12]*m[6]*m[11]+m[12]*m[7]*m[10];i[8]=m[4]*m[9]*m[15]-m[4]*m[11]*m[13]-m[8]*m[5]*m[15]+m[8]*m[7]*m[13]+m[12]*m[5]*m[11]-m[12]*m[7]*m[9];i[12]=-m[4]*m[9]*m[14]+m[4]*m[10]*m[13]+m[8]*m[5]*m[14]-m[8]*m[6]*m[13]-m[12]*m[5]*m[10]+m[12]*m[6]*m[9];i[1]=-m[1]*m[10]*m[15]+m[1]*m[11]*m[14]+m[9]*m[2]*m[15]-m[9]*m[3]*m[14]-m[13]*m[2]*m[11]+m[13]*m[3]*m[10];i[5]=m[0]*m[10]*m[15]-m[0]*m[11]*m[14]-m[8]*m[2]*m[15]+m[8]*m[3]*m[14]+m[12]*m[2]*m[11]-m[12]*m[3]*m[10];i[9]=-m[0]*m[9]*m[15]+m[0]*m[11]*m[13]+m[8]*m[1]*m[15]-m[8]*m[3]*m[13]-m[12]*m[1]*m[11]+m[12]*m[3]*m[9];i[13]=m[0]*m[9]*m[14]-m[0]*m[10]*m[13]-m[8]*m[1]*m[14]+m[8]*m[2]*m[13]+m[12]*m[1]*m[10]-m[12]*m[2]*m[9];i[2]=m[1]*m[6]*m[15]-m[1]*m[7]*m[14]-m[5]*m[2]*m[15]+m[5]*m[3]*m[14]+m[13]*m[2]*m[7]-m[13]*m[3]*m[6];i[6]=-m[0]*m[6]*m[15]+m[0]*m[7]*m[14]+m[4]*m[2]*m[15]-m[4]*m[3]*m[14]-m[12]*m[2]*m[7]+m[12]*m[3]*m[6];i[10]=m[0]*m[5]*m[15]-m[0]*m[7]*m[13]-m[4]*m[1]*m[15]+m[4]*m[3]*m[13]+m[12]*m[1]*m[7]-m[12]*m[3]*m[5];i[14]=-m[0]*m[5]*m[14]+m[0]*m[6]*m[13]+m[4]*m[1]*m[14]-m[4]*m[2]*m[13]-m[12]*m[1]*m[6]+m[12]*m[2]*m[5];i[3]=-m[1]*m[6]*m[11]+m[1]*m[7]*m[10]+m[5]*m[2]*m[11]-m[5]*m[3]*m[10]-m[9]*m[2]*m[7]+m[9]*m[3]*m[6];i[7]=m[0]*m[6]*m[11]-m[0]*m[7]*m[10]-m[4]*m[2]*m[11]+m[4]*m[3]*m[10]+m[8]*m[2]*m[7]-m[8]*m[3]*m[6];i[11]=-m[0]*m[5]*m[11]+m[0]*m[7]*m[9]+m[4]*m[1]*m[11]-m[4]*m[3]*m[9]-m[8]*m[1]*m[7]+m[8]*m[3]*m[5];i[15]=m[0]*m[5]*m[10]-m[0]*m[6]*m[9]-m[4]*m[1]*m[10]+m[4]*m[2]*m[9]+m[8]*m[1]*m[6]-m[8]*m[2]*m[5];let d=m[0]*i[0]+m[1]*i[4]+m[2]*i[8]+m[3]*i[12];if(d===0)return null;d=1/d;return i.map(v=>v*d);}

function closest(p, a, b) {
  const ab = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
  const ap = [p[0]-a[0], p[1]-a[1], p[2]-a[2]];
  const l2 = ab[0]**2 + ab[1]**2 + ab[2]**2;
  let t = l2 > 0 ? (ap[0]*ab[0]+ap[1]*ab[1]+ap[2]*ab[2]) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return [a[0]+t*ab[0], a[1]+t*ab[1], a[2]+t*ab[2]];
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(INPUT);
const root = doc.getRoot();
const skin = root.listSkins()[0];
const joints = skin.listJoints();
const jointName = joints.map(j => j.getName());
const idx = new Map(jointName.map((n, i) => [n, i]));
const ibm = skin.getInverseBindMatrices().getArray();
const head = joints.map((_, i) => { const inv = invert4(Array.from(ibm.slice(i*16, i*16+16))); return [inv[12], inv[13], inv[14]]; });
const headOf = n => head[idx.get(n)];

const seg = new Map();
for (const [j, c] of Object.entries(ARM_CHAIN)) seg.set(j, [headOf(j), headOf(c)]);
for (const h of HAND) {
  const hh = headOf(h), fa = headOf(h === 'LeftHand' ? 'LeftForeArm' : 'RightForeArm');
  seg.set(h, [hh, [hh[0]+(hh[0]-fa[0])/2, hh[1]+(hh[1]-fa[1])/2, hh[2]+(hh[2]-fa[2])/2]]);
}

const mesh = root.listMeshes()[0];
const prim = mesh.listPrimitives()[0];
const pos = prim.getAttribute('POSITION'), jA = prim.getAttribute('JOINTS_0'), wA = prim.getAttribute('WEIGHTS_0');
const p = [], je = [], we = [];
// per-bone: histogram over d3d, and for d3d>0.14 breakdown of vh
const perBone = {};
const bins = [0.05, 0.1, 0.14, 0.2, 0.3, 0.5, 999];
for (let vi = 0; vi < pos.getCount(); vi++) {
  pos.getElement(vi, p); jA.getElement(vi, je); wA.getElement(vi, we);
  for (let s = 0; s < 4; s++) {
    const w = we[s]; if (w <= 0.01) continue;
    const name = jointName[je[s]];
    if (!seg.has(name)) continue;
    const [a, b] = seg.get(name);
    const c = closest(p, a, b);
    const vx = p[0]-c[0], vy = p[1]-c[1], vz = p[2]-c[2];
    const d3 = Math.sqrt(vx*vx+vy*vy+vz*vz);
    const vh = Math.sqrt(vx*vx+vz*vz);
    const st = perBone[name] ||= { mass: 0, hist: new Array(bins.length).fill(0), far: { mass: 0, vhSmall: 0, vhBig: 0, droop: 0, meanVy: 0, meanVh: 0, n: 0 } };
    st.mass += w;
    st.hist[bins.findIndex(t => d3 <= t)] += w;
    if (d3 > 0.14) {
      const f = st.far; f.mass += w; f.n++;
      f.meanVy += vy; f.meanVh += vh;
      if (vh < 0.10) f.vhSmall += w; else f.vhBig += w;
      if (vy < -0.05 && vh < 0.12) f.droop += w;
    }
  }
}
console.log(`=== ${INPUT.split('/').pop()} — arm-influence geometry ===`);
console.log('bins d3d:', bins.join(' '));
for (const [name, st] of Object.entries(perBone)) {
  const f = st.far;
  console.log(`${name.padEnd(14)} mass=${st.mass.toFixed(0).padStart(6)} hist=[${st.hist.map(v=>v.toFixed(0)).join(',')}]`);
  if (f.n) console.log(`   far(>0.14): mass=${f.mass.toFixed(0)} vh<0.10=${f.vhSmall.toFixed(0)} vh>=0.10=${f.vhBig.toFixed(0)} droopMass=${f.droop.toFixed(0)} meanVy=${(f.meanVy/f.n).toFixed(3)} meanVh=${(f.meanVh/f.n).toFixed(3)}`);
}
// torso-weight-near-arm (rule B candidates): distance to nearest distal arm seg
const distal = ['LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand'].map(n => ({ n, s: seg.get(n) }));
let bMass = 0, bMassVhSmall = 0;
for (let vi = 0; vi < pos.getCount(); vi++) {
  pos.getElement(vi, p); jA.getElement(vi, je); wA.getElement(vi, we);
  let bd = Infinity, bvh = Infinity;
  for (const { s } of distal) {
    const c = closest(p, s[0], s[1]);
    const vx=p[0]-c[0], vy=p[1]-c[1], vz=p[2]-c[2];
    const d3 = Math.sqrt(vx*vx+vy*vy+vz*vz);
    if (d3 < bd) { bd = d3; bvh = Math.sqrt(vx*vx+vz*vz); }
  }
  if (bd > 0.10) continue;
  for (let s = 0; s < 4; s++) {
    const w = we[s]; if (w <= 0.01) continue;
    if (B_SOURCES.has(jointName[je[s]])) { bMass += w; if (bvh < 0.06) bMassVhSmall += w; }
  }
}
console.log(`ruleB candidates (torso/leg mass within 0.10 of distal arm segs): ${bMass.toFixed(0)} (of which within 0.06 horiz: ${bMassVhSmall.toFixed(0)})`);

// weight-magnitude histogram of far, non-droop-exempt arm influences, split by height
const hipsY = headOf('Hips')[1];
const wbins = [0.25, 0.5, 0.75, 1.01];
const zones = { above: new Array(4).fill(0), below: new Array(4).fill(0) };
const zonesN = { above: 0, below: 0 };
for (let vi = 0; vi < pos.getCount(); vi++) {
  pos.getElement(vi, p); jA.getElement(vi, je); wA.getElement(vi, we);
  for (let s = 0; s < 4; s++) {
    const w = we[s]; if (w <= 0.01) continue;
    const name = jointName[je[s]];
    if (!seg.has(name) || name.includes('Shoulder')) continue;
    const [a, b] = seg.get(name);
    const c = closest(p, a, b);
    const vx = p[0]-c[0], vy = p[1]-c[1], vz = p[2]-c[2];
    const d3 = Math.sqrt(vx*vx+vy*vy+vz*vz);
    const vh = Math.sqrt(vx*vx+vz*vz);
    if (d3 <= 0.14) continue;
    if (vy < 0 && -vy >= 1.0 * vh) continue; // droop exempt
    const zone = p[1] > hipsY ? 'above' : 'below';
    zones[zone][wbins.findIndex(t => w <= t)] += w;
    zonesN[zone]++;
  }
}
console.log(`far non-droop arm influences by height vs hipsY=${hipsY.toFixed(2)} (mass in w-bins ${wbins.join('/')}):`);
console.log(`  above hips: n=${zonesN.above} mass=[${zones.above.map(v=>v.toFixed(0)).join(',')}]`);
console.log(`  below hips: n=${zonesN.below} mass=[${zones.below.map(v=>v.toFixed(0)).join(',')}]`);
