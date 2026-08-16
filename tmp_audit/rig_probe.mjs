#!/usr/bin/env node
// rig_probe.mjs - browser-free structural probe of a rigged CR body.
//
// WHY: the two defects the owner named have exact numeric signatures, and both
// are invisible to the edge-stretch metric because neither one stretches
// anything - the geometry is rigid, it is attached to the WRONG BONE.
//
//   "arms spread like a kite"   the arm surface is weighted to Hips/Spine, so
//                               the arms never leave the bind pose. If the bind
//                               is a T-pose the character walks as a scarecrow.
//                               Signature: handArm ~ 0 AND spanRatio ~ 1.
//   "one arm frozen"            same, one side only. Signature: handArm.L and
//                               handArm.R far apart, or travel.L << travel.R.
//   "hands fused to the waist"  hand verts dominated by a spine/hips joint, so
//                               they ride the belt. Signature: handArm low with
//                               spanRatio normal.
//
// THE DECIDING NUMBER is `travel`: skin the mesh through the real clip, strip
// root motion by working in the Hips frame, and measure how far each region
// actually moves. A frozen arm reports travel ~ 0 no matter how the weights
// are spread. Reported as a fraction of body height so bodies compare.
//
//   node rig_probe.mjs --input <glb> [--json] [--clips Idle,Walk] [--samples 12]
//   node rig_probe.mjs --list <file> --tsv
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const CLIPS = String(arg('clips', 'Idle,Walk,Attack')).split(',');
const SAMPLES = Number(arg('samples', 12));
const MAX_VERTS = Number(arg('max-verts', 60000)); // stride-sample huge meshes
const r3 = (v) => Math.round(v * 1000) / 1000;

// ---------- mat4 / quat ----------
const I4 = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
    o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
  return o;
}
function composeTRS(t, q, s) {
  const [x, y, z, w] = q;
  const x2=x+x, y2=y+y, z2=z+z;
  const xx=x*x2, xy=x*y2, xz=x*z2, yy=y*y2, yz=y*z2, zz=z*z2;
  const wx=w*x2, wy=w*y2, wz=w*z2;
  return [
    (1-(yy+zz))*s[0], (xy+wz)*s[0], (xz-wy)*s[0], 0,
    (xy-wz)*s[1], (1-(xx+zz))*s[1], (yz+wx)*s[1], 0,
    (xz+wy)*s[2], (yz-wx)*s[2], (1-(xx+yy))*s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}
// Bind-pose joint location = translation of inverse(inverseBindMatrix). Taking
// it from the node hierarchy instead only works when rest == bind, which is not
// guaranteed; the IBM is the authority and costs one 4x4 inverse.
function inv(m) {
  const o = new Array(16);
  const a00=m[0],a01=m[1],a02=m[2],a03=m[3], a10=m[4],a11=m[5],a12=m[6],a13=m[7];
  const a20=m[8],a21=m[9],a22=m[10],a23=m[11], a30=m[12],a31=m[13],a32=m[14],a33=m[15];
  const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10;
  const b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12;
  const b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30;
  const b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;
  let det = b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
  if (!det) return I4();
  det = 1.0/det;
  o[0]=(a11*b11-a12*b10+a13*b09)*det; o[1]=(a02*b10-a01*b11-a03*b09)*det;
  o[2]=(a31*b05-a32*b04+a33*b03)*det; o[3]=(a22*b04-a21*b05-a23*b03)*det;
  o[4]=(a12*b08-a10*b11-a13*b07)*det; o[5]=(a00*b11-a02*b08+a03*b07)*det;
  o[6]=(a32*b02-a30*b05-a33*b01)*det; o[7]=(a20*b05-a22*b02+a23*b01)*det;
  o[8]=(a10*b10-a11*b08+a13*b06)*det; o[9]=(a01*b08-a00*b10-a03*b06)*det;
  o[10]=(a30*b04-a31*b02+a33*b00)*det; o[11]=(a21*b02-a20*b04-a23*b00)*det;
  o[12]=(a11*b07-a10*b09-a12*b06)*det; o[13]=(a00*b09-a01*b07+a02*b06)*det;
  o[14]=(a31*b01-a30*b03-a32*b00)*det; o[15]=(a20*b03-a21*b01+a22*b00)*det;
  return o;
}
function slerp(a, b, t) {
  let cos = a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
  let bb = b;
  if (cos < 0) { bb = [-b[0],-b[1],-b[2],-b[3]]; cos = -cos; }
  if (cos > 0.9995) {
    const o = [a[0]+(bb[0]-a[0])*t, a[1]+(bb[1]-a[1])*t, a[2]+(bb[2]-a[2])*t, a[3]+(bb[3]-a[3])*t];
    const l = Math.hypot(o[0],o[1],o[2],o[3]) || 1;
    return [o[0]/l,o[1]/l,o[2]/l,o[3]/l];
  }
  const th = Math.acos(cos), s = Math.sin(th);
  const wa = Math.sin((1-t)*th)/s, wb = Math.sin(t*th)/s;
  return [a[0]*wa+bb[0]*wb, a[1]*wa+bb[1]*wb, a[2]*wa+bb[2]*wb, a[3]*wa+bb[3]*wb];
}

const ARM_RE = /(shoulder|arm|forearm|hand|clavicle)/i;
const HAND_RE = /hand/i;
const FOOT_RE = /(foot|toe)/i;
const HEAD_RE = /(head|neck)/i;
const CORE_RE = /(hips|pelvis|spine|root|torso)/i;

async function probe(path) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(path);
  const root = doc.getRoot();

  const allNodes = root.listNodes();
  const nodeIdx = new Map(allNodes.map((n, i) => [n, i]));
  const parent = new Int32Array(allNodes.length).fill(-1);
  allNodes.forEach((n, i) => { for (const c of n.listChildren()) parent[nodeIdx.get(c)] = i; });
  const order = [];
  { const seen = new Uint8Array(allNodes.length);
    const visit = (i) => { if (seen[i]) return; seen[i] = 1; if (parent[i] >= 0) visit(parent[i]); order.push(i); };
    for (let i = 0; i < allNodes.length; i++) visit(i); }
  const baseT = allNodes.map((n) => n.getTranslation());
  const baseR = allNodes.map((n) => n.getRotation());
  const baseS = allNodes.map((n) => n.getScale());

  const worldAt = (T, R, S) => {
    const w = new Array(allNodes.length);
    for (const i of order) {
      const loc = composeTRS(T[i], R[i], S[i]);
      w[i] = parent[i] >= 0 ? mul(w[parent[i]], loc) : loc;
    }
    return w;
  };
  const restWorld = worldAt(baseT, baseR, baseS);

  // --- gather the skinned geometry ---
  let skin = null, meshNode = null;
  for (const n of allNodes) { if (n.getSkin() && n.getMesh()) { skin = n.getSkin(); meshNode = n; break; } }
  if (!skin) return { error: 'no skinned mesh' };
  const joints = skin.listJoints();
  const jointName = joints.map((j) => j.getName());
  const jointNodeIdx = joints.map((j) => nodeIdx.get(j));
  const ibm = skin.getInverseBindMatrices().getArray();

  const prims = meshNode.getMesh().listPrimitives()
    .filter((p) => p.getAttribute('POSITION') && p.getAttribute('JOINTS_0') && p.getAttribute('WEIGHTS_0'));
  if (!prims.length) return { error: 'no skinned primitive' };

  // getElement, not getArray: these GLBs ship quantized (meshopt/normalized
  // int16) positions, and getArray hands back the raw integers - that silently
  // put the vertices ~32768x away from the joints and made every region probe
  // meaningless. getElement dequantizes.
  const total = prims.reduce((a, p) => a + p.getAttribute('POSITION').getCount(), 0);
  const stride = Math.max(1, Math.ceil(total / MAX_VERTS));
  const px = [], py = [], pz = [], wji = [], wjw = [];
  const tmp3 = [0,0,0], tmp4 = [0,0,0,0], tmpW = [0,0,0,0];
  for (const prim of prims) {
    const pos = prim.getAttribute('POSITION');
    const j0 = prim.getAttribute('JOINTS_0');
    const w0 = prim.getAttribute('WEIGHTS_0');
    const n = pos.getCount();
    for (let i = 0; i < n; i += stride) {
      pos.getElement(i, tmp3);
      j0.getElement(i, tmp4);
      w0.getElement(i, tmpW);
      px.push(tmp3[0]); py.push(tmp3[1]); pz.push(tmp3[2]);
      wji.push([Math.round(tmp4[0]), Math.round(tmp4[1]), Math.round(tmp4[2]), Math.round(tmp4[3])]);
      wjw.push([tmpW[0], tmpW[1], tmpW[2], tmpW[3]]);
    }
  }
  const N = px.length;

  // --- bind-pose bbox (the kite tell) ---
  let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
  for (let i = 0; i < N; i++) {
    if (px[i]<mnx) mnx=px[i]; if (px[i]>mxx) mxx=px[i];
    if (py[i]<mny) mny=py[i]; if (py[i]>mxy) mxy=py[i];
  }
  const height = mxy - mny || 1;
  const spanRatio = (mxx - mnx) / height;

  // --- per-joint weight mass ---
  const mass = new Float64Array(joints.length);
  for (let i = 0; i < N; i++) for (let k = 0; k < 4; k++) mass[wji[i][k]] += wjw[i][k];
  const totalMass = mass.reduce((a, b) => a + b, 0) || 1;
  const deadArm = [];
  joints.forEach((j, ji) => {
    if (ARM_RE.test(jointName[ji]) && mass[ji] / totalMass < 0.002) deadArm.push(jointName[ji]);
  });

  // --- region membership by nearest BIND joint head ---
  const head = joints.map((_, ji) => {
    const b = inv(Array.from(ibm.slice(ji*16, ji*16+16)));
    return [b[12], b[13], b[14]];
  });
  const region = new Array(N);
  const side = new Array(N);
  for (let i = 0; i < N; i++) {
    let best = -1, bd = Infinity;
    for (let ji = 0; ji < joints.length; ji++) {
      const d = (px[i]-head[ji][0])**2 + (py[i]-head[ji][1])**2 + (pz[i]-head[ji][2])**2;
      if (d < bd) { bd = d; best = ji; }
    }
    const n = jointName[best];
    region[i] = HAND_RE.test(n) ? 'hand' : FOOT_RE.test(n) ? 'foot'
      : HEAD_RE.test(n) ? 'head' : ARM_RE.test(n) ? 'arm' : 'core';
    side[i] = /left/i.test(n) ? 'L' : /right/i.test(n) ? 'R' : '-';
  }

  // --- does the ARM CHAIN actually own the hands? ---
  const armFrac = (pred) => {
    let sum = 0, n = 0;
    for (let i = 0; i < N; i++) {
      if (!pred(i)) continue;
      let a = 0, t = 0;
      for (let k = 0; k < 4; k++) {
        const w = wjw[i][k]; if (w <= 0) continue;
        t += w; if (ARM_RE.test(jointName[wji[i][k]])) a += w;
      }
      if (t > 1e-6) { sum += a / t; n++; }
    }
    return n ? { frac: sum / n, n } : { frac: null, n: 0 };
  };
  const handAll = armFrac((i) => region[i] === 'hand');
  const handL = armFrac((i) => region[i] === 'hand' && side[i] === 'L');
  const handR = armFrac((i) => region[i] === 'hand' && side[i] === 'R');

  // reverse bleed: core surface dominated by an arm joint
  let coreOnArm = 0, coreN = 0;
  for (let i = 0; i < N; i++) {
    if (region[i] !== 'core') continue;
    coreN++;
    let bw = 0, bj = -1;
    for (let k = 0; k < 4; k++) if (wjw[i][k] > bw) { bw = wjw[i][k]; bj = wji[i][k]; }
    if (bj >= 0 && ARM_RE.test(jointName[bj])) coreOnArm++;
  }

  // --- MOTION: skin through each clip, in the Hips frame ---
  const hipsJi = jointName.findIndex((n) => /hips|pelvis/i.test(n));
  const clips = {};
  for (const clipName of CLIPS) {
    const anim = root.listAnimations().find((a) => a.getName() === clipName);
    if (!anim) { clips[clipName] = null; continue; }
    const chans = anim.listChannels().map((ch) => {
      const s = ch.getSampler();
      return { ni: nodeIdx.get(ch.getTargetNode()), path: ch.getTargetPath(),
        t: s.getInput().getArray(), v: s.getOutput().getArray(),
        stride: ch.getTargetPath() === 'rotation' ? 4 : 3,
        step: s.getInterpolation() === 'STEP' };
    }).filter((c) => c.ni !== undefined && c.path !== 'weights');
    let dur = 0;
    for (const c of chans) dur = Math.max(dur, c.t[c.t.length - 1]);

    const frames = [];
    for (let si = 0; si < SAMPLES; si++) {
      const time = dur * (si / (SAMPLES - 1 || 1));
      const T = baseT.map((v) => v.slice()), R = baseR.map((v) => v.slice()), S = baseS.map((v) => v.slice());
      for (const c of chans) {
        const ts = c.t;
        let k = 0;
        while (k < ts.length - 1 && ts[k + 1] < time) k++;
        const k1 = Math.min(k + 1, ts.length - 1);
        const span = ts[k1] - ts[k];
        const f = c.step || span <= 0 ? 0 : Math.max(0, Math.min(1, (time - ts[k]) / span));
        if (c.path === 'rotation') {
          R[c.ni] = slerp([c.v[k*4],c.v[k*4+1],c.v[k*4+2],c.v[k*4+3]],
                          [c.v[k1*4],c.v[k1*4+1],c.v[k1*4+2],c.v[k1*4+3]], f);
        } else {
          const dst = c.path === 'translation' ? T : S;
          const o = c.stride;
          for (let d = 0; d < 3; d++) dst[c.ni][d] = c.v[k*o+d] + (c.v[k1*o+d] - c.v[k*o+d]) * f;
        }
      }
      const world = worldAt(T, R, S);
      const skinM = joints.map((_, ji) => mul(world[jointNodeIdx[ji]] || I4(), Array.from(ibm.slice(ji*16, ji*16+16))));
      // root motion is not deformation: measure everything relative to Hips
      const hipW = hipsJi >= 0 ? (world[jointNodeIdx[hipsJi]] || I4()) : I4();
      const ox = hipW[12], oy = hipW[13], oz = hipW[14];
      const fx = new Float32Array(N), fy = new Float32Array(N), fz = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        let ax=0, ay=0, az=0, tot=0;
        for (let k = 0; k < 4; k++) {
          const w = wjw[i][k]; if (w <= 0) continue;
          const m = skinM[wji[i][k]]; if (!m) continue;
          ax += w*(m[0]*px[i]+m[4]*py[i]+m[8]*pz[i]+m[12]);
          ay += w*(m[1]*px[i]+m[5]*py[i]+m[9]*pz[i]+m[13]);
          az += w*(m[2]*px[i]+m[6]*py[i]+m[10]*pz[i]+m[14]);
          tot += w;
        }
        if (tot > 1e-6) { fx[i]=ax/tot-ox; fy[i]=ay/tot-oy; fz[i]=az/tot-oz; }
        else { fx[i]=px[i]-ox; fy[i]=py[i]-oy; fz[i]=pz[i]-oz; }
      }
      frames.push([fx, fy, fz]);
    }
    // travel = mean over region verts of (max excursion from that vert's own mean)
    const travel = (pred) => {
      let sum = 0, n = 0;
      for (let i = 0; i < N; i++) {
        if (!pred(i)) continue;
        let mx=0,my=0,mz=0;
        for (const f of frames) { mx+=f[0][i]; my+=f[1][i]; mz+=f[2][i]; }
        mx/=frames.length; my/=frames.length; mz/=frames.length;
        let worst = 0;
        for (const f of frames) {
          const d = Math.hypot(f[0][i]-mx, f[1][i]-my, f[2][i]-mz);
          if (d > worst) worst = d;
        }
        sum += worst; n++;
      }
      return n ? sum / n / height : null;
    };
    clips[clipName] = {
      hand: travel((i) => region[i] === 'hand'),
      handL: travel((i) => region[i] === 'hand' && side[i] === 'L'),
      handR: travel((i) => region[i] === 'hand' && side[i] === 'R'),
      foot: travel((i) => region[i] === 'foot'),
      head: travel((i) => region[i] === 'head'),
    };
  }

  const counts = {};
  for (const r of region) counts[r] = (counts[r] || 0) + 1;
  return {
    body: basename(path, '.glb'),
    verts: total, sampled: N, joints: joints.length,
    height: r3(height), spanRatio: r3(spanRatio),
    deadArmJoints: deadArm,
    handArm: handAll.frac === null ? null : r3(handAll.frac),
    handArmL: handL.frac === null ? null : r3(handL.frac),
    handArmR: handR.frac === null ? null : r3(handR.frac),
    handVerts: handAll.n,
    coreDomByArm: coreN ? r3(coreOnArm / coreN) : null,
    regions: counts,
    clips,
  };
}

const list = arg('list');
const files = list
  ? readFileSync(list, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)
  : [arg('input')];

const rows = [];
for (const f of files) {
  try { rows.push(await probe(f)); }
  catch (e) { rows.push({ body: basename(f, '.glb'), error: String(e.message || e).slice(0, 100) }); }
}

if (arg('tsv', false)) {
  console.log(['body','verts','spanRatio','handArm','handArmL','handArmR','coreDomByArm','deadArm',
    'idleHand','idleFoot','walkHand','walkFoot','walkHandL','walkHandR','atkHand'].join('\t'));
  for (const r of rows) {
    if (r.error) { console.log(`${r.body}\tERROR ${r.error}`); continue; }
    const c = (n, k) => (r.clips[n] && r.clips[n][k] != null ? r.clips[n][k].toFixed(4) : '-');
    console.log([r.body, r.verts, r.spanRatio, r.handArm, r.handArmL, r.handArmR, r.coreDomByArm,
      r.deadArmJoints.length ? r.deadArmJoints.join(',') : '-',
      c('Idle','hand'), c('Idle','foot'), c('Walk','hand'), c('Walk','foot'),
      c('Walk','handL'), c('Walk','handR'), c('Attack','hand')].join('\t'));
  }
} else {
  console.log(JSON.stringify(rows, null, 2));
}
