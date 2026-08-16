#!/usr/bin/env node
// reweight_cloak.mjs — repair Meshy auto-rig skin-weight bleed on CR hero bodies.
//
// Two failure directions, both fixed here:
//   A) cloak/robe/skirt vertices carrying ARM-chain weights far from the arm
//      segment -> weight moves to the nearest of Spine02/Spine01/Spine/Hips by
//      vertex height. ("wings" when arms swing)
//   B) arm-geometry vertices hugging an arm segment but carrying torso/leg
//      weights (Hips/Spine*/UpLeg/Leg) -> weight moves to the owning joint of
//      the nearest distal arm segment. ("arms glued to hips/legs")
//   H) Hand-bone weights on vertices below the hips (and NOT hugging the hand
//      stub) -> Hips. (hands-glued-to-hips geometry)
//
// Order per vertex: B, then A, then H, then one renormalize.
// Never writes in place. Never touches animation or texture accessors — and
// proves it by hashing them before/after.
//
//   node scripts/reweight_cloak.mjs --input <glb> [--out <glb>] \
//     [--radius-a 0.14] [--radius-b 0.10] [--dry-run] [--no-core-guard]
//
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';

function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const INPUT = arg('input');
if (!INPUT) { console.error('need --input <glb>'); process.exit(2); }
const RADIUS_A = Number(arg('radius-a', 0.14)); // dir A: arm influence farther than this from its own segment -> spine
const RADIUS_B = Number(arg('radius-b', 0.10)); // dir B: vertex closer than this to a distal arm segment -> claim torso/leg weight
// Shoulder weights spread wide on GOOD bodies too (warlock/paladin have identical
// shoulder profiles) and shoulders barely rotate in the clips; 0 = never strip them.
const RADIUS_SH = Number(arg('radius-shoulder', 0));
// Rule A radius for HAND influences: fingers/claws extend well past the hand
// stub on many bodies; stripping them pins fingertips to the spine (needle
// artifacts when hands move). Default is looser than radius-a.
const RADIUS_HAND = Number(arg('radius-hand', 0.20));
// Droop exemption: cloth/weapons hanging BELOW an arm bone (sleeves, robes,
// swords) are legitimately arm-weighted. Exempt influence when the offset from
// the segment points down more than sideways: -vy >= ratio * vh.
const DROOP_RATIO = Number(arg('droop-ratio', 0.5));
// Below the hips MINUS this margin, moderate arm weights are flowing
// skirt/robe cloth (good look on reference bodies); only strip dominant ones
// there. The band just under the hips head is hip-gear territory and is NOT
// exempted.
const BELOW_W = Number(arg('below-hips-min-w', 0.6));
const SKIRT_BELOW = Number(arg('skirt-below', 0.12));
// Rule H: hand weights within this radius of the hand stub are real hand
// geometry (fingers/gauntlet) and always kept, independent of radius-b.
const HAND_KEEP = Number(arg('hand-keep', 0.10));
// Rule X: a vertex influenced by BOTH left and right arm chains (Arm/ForeArm/
// Hand) is always rig bleed — no real geometry straddles both arms. The pair
// partially cancels in the bind pose (props parked between resting hands), and
// stripping only one side un-cancels it; strip both sides to the spine.
const CROSS_STRIP = !arg('no-cross-strip', false);
// Rule B only fires when the vertex's torso/leg mass is DOMINANT (truly stuck
// arm geometry ~1.0, healthy blend partials stay).
const B_MIN_MASS = Number(arg('b-min-mass', 0.5));
const DRY = !!arg('dry-run', false);
const CORE_GUARD = !arg('no-core-guard', false); // B only fires when vertex is closer to arm than to any core segment
const OUT = arg('out', join('/tmp/rw_out', basename(INPUT, '.glb') + '.reweighted.glb'));

const ARM_CHAIN = {
  LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand',
  RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand',
};
const HAND = new Set(['LeftHand', 'RightHand']);
const ARM_SET = new Set([...Object.keys(ARM_CHAIN), ...HAND]);
const SPINE_TARGETS = ['Spine02', 'Spine01', 'Spine', 'Hips'];
const B_SOURCES = new Set(['Hips', 'Spine', 'Spine01', 'Spine02', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg']);
// core segments used for the competition guard on rule B
const CORE_EDGES = [
  ['Hips', 'Spine02'], ['Spine02', 'Spine01'], ['Spine01', 'Spine'], ['Spine', 'neck'], ['neck', 'Head'],
  ['Hips', 'LeftUpLeg'], ['Hips', 'RightUpLeg'],
  ['LeftUpLeg', 'LeftLeg'], ['LeftLeg', 'LeftFoot'],
  ['RightUpLeg', 'RightLeg'], ['RightLeg', 'RightFoot'],
];

// ---------- math ----------
function invert4(m) {
  const inv = new Array(16);
  inv[0] = m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
  inv[4] = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
  inv[8] = m[4]*m[9]*m[15] - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
  inv[12] = -m[4]*m[9]*m[14] + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];
  inv[1] = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
  inv[5] = m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
  inv[9] = -m[0]*m[9]*m[15] + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
  inv[13] = m[0]*m[9]*m[14] - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];
  inv[2] = m[1]*m[6]*m[15] - m[1]*m[7]*m[14] - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7] - m[13]*m[3]*m[6];
  inv[6] = -m[0]*m[6]*m[15] + m[0]*m[7]*m[14] + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7] + m[12]*m[3]*m[6];
  inv[10] = m[0]*m[5]*m[15] - m[0]*m[7]*m[13] - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7] - m[12]*m[3]*m[5];
  inv[14] = -m[0]*m[5]*m[14] + m[0]*m[6]*m[13] + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6] + m[12]*m[2]*m[5];
  inv[3] = -m[1]*m[6]*m[11] + m[1]*m[7]*m[10] + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7] + m[9]*m[3]*m[6];
  inv[7] = m[0]*m[6]*m[11] - m[0]*m[7]*m[10] - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7] - m[8]*m[3]*m[6];
  inv[11] = -m[0]*m[5]*m[11] + m[0]*m[7]*m[9] + m[4]*m[1]*m[11] - m[4]*m[3]*m[9] - m[8]*m[1]*m[7] + m[8]*m[3]*m[5];
  inv[15] = m[0]*m[5]*m[10] - m[0]*m[6]*m[9] - m[4]*m[1]*m[10] + m[4]*m[2]*m[9] + m[8]*m[1]*m[6] - m[8]*m[2]*m[5];
  let det = m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12];
  if (det === 0) return null;
  det = 1.0 / det;
  return inv.map((v) => v * det);
}

function distToSeg(p, a, b) {
  const abx = b[0]-a[0], aby = b[1]-a[1], abz = b[2]-a[2];
  const apx = p[0]-a[0], apy = p[1]-a[1], apz = p[2]-a[2];
  const len2 = abx*abx + aby*aby + abz*abz;
  let t = len2 > 0 ? (apx*abx + apy*aby + apz*abz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const dx = apx - t*abx, dy = apy - t*aby, dz = apz - t*abz;
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

// offset from closest segment point, decomposed: { d3, vy, vh }
function segOffset(p, a, b) {
  const abx = b[0]-a[0], aby = b[1]-a[1], abz = b[2]-a[2];
  const apx = p[0]-a[0], apy = p[1]-a[1], apz = p[2]-a[2];
  const len2 = abx*abx + aby*aby + abz*abz;
  let t = len2 > 0 ? (apx*abx + apy*aby + apz*abz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const dx = apx - t*abx, dy = apy - t*aby, dz = apz - t*abz;
  return { d3: Math.sqrt(dx*dx + dy*dy + dz*dz), vy: dy, vh: Math.sqrt(dx*dx + dz*dz) };
}

function sha(buf) { return createHash('sha256').update(buf).digest('hex').slice(0, 16); }
function accBytes(acc) {
  const arr = acc.getArray();
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
}

// ---------- doc fingerprint (animations + images must survive untouched) ----------
function fingerprint(root) {
  const anims = root.listAnimations().map((a) => ({
    name: a.getName(),
    channels: a.listChannels().length,
    samplerHashes: a.listSamplers().map((s) => sha(accBytes(s.getInput())) + ':' + sha(accBytes(s.getOutput()))).sort(),
  }));
  const images = root.listTextures().map((t) => sha(Buffer.from(t.getImage()))).sort();
  const nodeNames = root.listNodes().map((n) => n.getName()).sort();
  const primCounts = root.listMeshes().map((m) => `${m.getName()}:${m.listPrimitives().length}`).sort();
  return { anims, images, nodeNames, primCounts };
}

// ---------- main ----------
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(INPUT);
const root = doc.getRoot();
const fpBefore = fingerprint(root);

const skins = root.listSkins();
if (skins.length !== 1) console.warn(`warning: ${skins.length} skins, using each per node`);

// Process each skinned node's mesh with its own skin joint table.
// Shared accessors are processed once.
const seenAccessors = new Set();
const stats = {
  radiusA: RADIUS_A, radiusB: RADIUS_B, coreGuard: CORE_GUARD,
  verts: 0, touched: 0, ruleA: 0, ruleB: 0, ruleH: 0, ruleX: 0,
  movedFrom: {}, movedTo: {}, massA: 0, massB: 0, massH: 0, massX: 0, droppedMass: 0,
};
const addMass = (m, k, v) => { m[k] = (m[k] || 0) + v; };

for (const node of root.listNodes()) {
  const skin = node.getSkin();
  const mesh = node.getMesh();
  if (!skin || !mesh) continue;

  const joints = skin.listJoints();
  const jointName = joints.map((j) => j.getName());
  const jointIdxByName = new Map(jointName.map((n, i) => [n, i]));
  const ibm = skin.getInverseBindMatrices().getArray();
  const head = joints.map((_, i) => {
    const inv = invert4(Array.from(ibm.slice(i * 16, i * 16 + 16)));
    return inv ? [inv[12], inv[13], inv[14]] : null;
  });
  const headOf = (name) => { const i = jointIdxByName.get(name); return i === undefined ? null : head[i]; };

  // arm segments: joint -> [a, b] for its own bone segment (rule A distance test)
  const armSeg = new Map();
  for (const [j, child] of Object.entries(ARM_CHAIN)) {
    const a = headOf(j), b = headOf(child);
    if (a && b) armSeg.set(j, [a, b]);
  }
  for (const h of HAND) {
    const hh = headOf(h);
    const fa = headOf(h === 'LeftHand' ? 'LeftForeArm' : 'RightForeArm');
    if (hh && fa) {
      const stub = [hh[0] + (hh[0]-fa[0])/2, hh[1] + (hh[1]-fa[1])/2, hh[2] + (hh[2]-fa[2])/2];
      armSeg.set(h, [hh, stub]);
    }
  }
  // rule B trigger segments: upper arm + elbow + upper HALF of the forearm only.
  // Not Shoulder->Arm (crosses the clavicle/upper chest) and not the wrist/hand
  // zone: in A-pose the hands rest on hip gear, so "near the hand bone" is not
  // evidence of arm geometry (belt tassets live there on every body).
  const bSegs = [];
  for (const j of ['LeftArm', 'RightArm']) {
    if (armSeg.has(j)) bSegs.push({ owner: j, seg: armSeg.get(j) });
  }
  for (const j of ['LeftForeArm', 'RightForeArm']) {
    if (!armSeg.has(j)) continue;
    const [a, b] = armSeg.get(j);
    bSegs.push({ owner: j, seg: [a, [(a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2]] });
  }
  const coreSegs = [];
  for (const [a, b] of CORE_EDGES) {
    const pa = headOf(a), pb = headOf(b);
    if (pa && pb) coreSegs.push([pa, pb]);
  }
  const spineTargets = SPINE_TARGETS.map((n) => ({ name: n, idx: jointIdxByName.get(n), y: headOf(n)?.[1] }))
    .filter((t) => t.idx !== undefined && t.y !== undefined);
  const hipsY = headOf('Hips')?.[1] ?? 0;

  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    const jAcc = prim.getAttribute('JOINTS_0');
    const wAcc = prim.getAttribute('WEIGHTS_0');
    if (!pos || !jAcc || !wAcc) continue;
    if (seenAccessors.has(jAcc)) continue;
    seenAccessors.add(jAcc);
    if (prim.getAttribute('JOINTS_1')) console.warn('warning: JOINTS_1 present, only set 0 is repaired');

    // probe weight scale (raw normalized ints vs floats)
    let wScale = 1;
    {
      const probe = [];
      const n = Math.min(wAcc.getCount(), 200);
      const el = [];
      for (let i = 0; i < n; i++) { wAcc.getElement(i, el); probe.push(el.reduce((s, v) => s + v, 0)); }
      probe.sort((a, b) => a - b);
      const med = probe[probe.length >> 1];
      if (med > 100 && med < 400) wScale = 255;
      else if (med > 30000) wScale = 65535;
    }
    if (wScale !== 1) console.log(`weights are normalized ints (scale ${wScale}); converting to float32`);

    const count = pos.getCount();
    const p = [], je = [], we = [];
    const newJ = new (jAcc.getArray().constructor)(count * 4);
    const newW = new Float32Array(count * 4);

    for (let vi = 0; vi < count; vi++) {
      stats.verts++;
      pos.getElement(vi, p);
      jAcc.getElement(vi, je);
      wAcc.getElement(vi, we);
      // joint -> weight map (merge duplicate joint slots)
      const wmap = new Map();
      for (let s = 0; s < 4; s++) {
        const w = (we[s] || 0) / wScale;
        if (w > 0) wmap.set(je[s], (wmap.get(je[s]) || 0) + w);
      }
      if (wmap.size === 0) { // unweighted; keep as-is
        for (let s = 0; s < 4; s++) { newJ[vi*4+s] = je[s] || 0; newW[vi*4+s] = (we[s] || 0) / wScale; }
        continue;
      }
      let touched = false, hitA = false, hitB = false, hitH = false, hitX = false;
      let dCore = Infinity;
      for (const [a, b] of coreSegs) dCore = Math.min(dCore, distToSeg(p, a, b));

      // ---- rule B: vertex hugs a distal arm segment; torso/leg weights -> that arm joint
      let bTarget = null, bDist = Infinity;
      for (const { owner, seg } of bSegs) {
        const d = distToSeg(p, seg[0], seg[1]);
        if (d < bDist) { bDist = d; bTarget = owner; }
      }
      if (bTarget !== null && bDist <= RADIUS_B) {
        let coreOk = CORE_GUARD ? bDist < dCore : true;
        // dominance gate: healthy blend partials stay; only truly stuck geometry moves
        let bMass = 0;
        for (const [ji, w] of wmap.entries()) if (B_SOURCES.has(jointName[ji])) bMass += w;
        if (bMass < B_MIN_MASS) coreOk = false;
        if (coreOk) {
          const targetIdx = jointIdxByName.get(bTarget);
          for (const [ji, w] of [...wmap.entries()]) {
            const name = jointName[ji];
            if (B_SOURCES.has(name) && w > 0) {
              wmap.set(ji, 0);
              wmap.set(targetIdx, (wmap.get(targetIdx) || 0) + w);
              stats.massB += w; addMass(stats.movedFrom, name, w); addMass(stats.movedTo, bTarget, w);
              touched = true; hitB = true;
            }
          }
        }
      }

      // ---- rule X: cross-body arm pairing (both Left* and Right* arm-chain
      // influence on one vertex) is always bleed; strip both sides to spine
      if (CROSS_STRIP) {
        const DISTAL = (n) => ARM_SET.has(n) && !n.endsWith('Shoulder');
        let hasL = false, hasR = false;
        for (const [ji, w] of wmap.entries()) {
          if (w <= 0.05) continue;
          const n = jointName[ji];
          if (!DISTAL(n)) continue;
          if (n.startsWith('Left')) hasL = true; else if (n.startsWith('Right')) hasR = true;
        }
        if (hasL && hasR) {
          for (const [ji, w] of [...wmap.entries()]) {
            const n = jointName[ji];
            if (w <= 0 || !DISTAL(n)) continue;
            let best = spineTargets[0], bd = Infinity;
            for (const t of spineTargets) { const dd = Math.abs(p[1] - t.y); if (dd < bd) { bd = dd; best = t; } }
            wmap.set(ji, 0);
            wmap.set(best.idx, (wmap.get(best.idx) || 0) + w);
            stats.massX += w; addMass(stats.movedFrom, n, w); addMass(stats.movedTo, best.name, w);
            touched = true; hitX = true;
          }
        }
      }

      // ---- rule A: arm influence far from its own bone segment -> spine target by height
      for (const [ji, w] of [...wmap.entries()]) {
        if (w <= 0) continue;
        const name = jointName[ji];
        if (!ARM_SET.has(name)) continue;
        const seg = armSeg.get(name);
        if (!seg) continue;
        const isShoulder = name === 'LeftShoulder' || name === 'RightShoulder';
        const radius = isShoulder ? RADIUS_SH : (HAND.has(name) ? Math.max(RADIUS_HAND, RADIUS_A) : RADIUS_A);
        if (isShoulder && RADIUS_SH <= 0) continue; // shoulders untouched by default
        const off = segOffset(p, seg[0], seg[1]);
        // droop exemption: hanging below the bone (sleeve/robe/weapon) is legit
        if (off.vy < 0 && -off.vy >= DROOP_RATIO * off.vh) continue;
        const d = off.d3;
        // far from the bone (wing cloth), respecting the below-hips skirt
        // exemption for non-dominant weights...
        const farStrip = d > radius && (p[1] > hipsY - SKIRT_BELOW || w > BELOW_W);
        // ...or hugging the body core harder than the arm (waist panels,
        // hip-glued hand cloth) at any distance
        const coreStrip = !isShoulder && CORE_GUARD && dCore < d;
        if (farStrip || coreStrip) {
          let best = spineTargets[0], bd = Infinity;
          for (const t of spineTargets) { const dd = Math.abs(p[1] - t.y); if (dd < bd) { bd = dd; best = t; } }
          wmap.set(ji, 0);
          wmap.set(best.idx, (wmap.get(best.idx) || 0) + w);
          stats.massA += w; addMass(stats.movedFrom, name, w); addMass(stats.movedTo, best.name, w);
          touched = true; hitA = true;
        }
      }

      // ---- rule H: hand weights below the hips (and not hugging the hand stub) -> Hips
      if (p[1] < hipsY - 0.05) {
        for (const [ji, w] of [...wmap.entries()]) {
          if (w <= 0) continue;
          const name = jointName[ji];
          if (!HAND.has(name)) continue;
          const seg = armSeg.get(name);
          const off = seg ? segOffset(p, seg[0], seg[1]) : { d3: Infinity, vy: 0, vh: 1 };
          // droop exemption: a weapon hanging from the hand is legit hand weight
          if (off.vy < 0 && -off.vy >= DROOP_RATIO * off.vh) continue;
          if (off.d3 > HAND_KEEP) {
            const hipsIdx = jointIdxByName.get('Hips');
            wmap.set(ji, 0);
            wmap.set(hipsIdx, (wmap.get(hipsIdx) || 0) + w);
            stats.massH += w; addMass(stats.movedFrom, name, w); addMass(stats.movedTo, 'Hips', w);
            touched = true; hitH = true;
          }
        }
      }

      // ---- compact to 4 slots, renormalize once
      const entries = [...wmap.entries()].filter(([, w]) => w > 1e-7).sort((a, b) => b[1] - a[1]);
      if (entries.length > 4) {
        for (let k = 4; k < entries.length; k++) stats.droppedMass += entries[k][1];
        entries.length = 4;
      }
      let sum = entries.reduce((s, [, w]) => s + w, 0);
      if (sum <= 0) { entries.length = 0; entries.push([jointIdxByName.get('Hips') ?? 0, 1]); sum = 1; }
      for (let s = 0; s < 4; s++) {
        newJ[vi*4+s] = s < entries.length ? entries[s][0] : 0;
        newW[vi*4+s] = s < entries.length ? entries[s][1] / sum : 0;
      }
      if (touched) {
        stats.touched++;
        if (hitA) stats.ruleA++;
        if (hitB) stats.ruleB++;
        if (hitH) stats.ruleH++;
        if (hitX) stats.ruleX++;
      }
    }

    if (!DRY) {
      jAcc.setArray(newJ);
      wAcc.setArray(newW);
      wAcc.setNormalized(false);
    }
  }
}

// ---------- report ----------
const r3 = (v) => Math.round(v * 1000) / 1000;
console.log(`\n=== reweight ${basename(INPUT)} ===`);
console.log(`radius-a=${RADIUS_A} radius-b=${RADIUS_B} radius-shoulder=${RADIUS_SH} droop-ratio=${DROOP_RATIO} b-min-mass=${B_MIN_MASS} below-hips-min-w=${BELOW_W} coreGuard=${CORE_GUARD} dryRun=${DRY}`);
console.log(`vertices: ${stats.verts} total, ${stats.touched} touched (${(100*stats.touched/Math.max(1,stats.verts)).toFixed(1)}%)`);
console.log(`  rule A (arm->spine, far cloth): ${stats.ruleA} verts, mass ${r3(stats.massA)}`);
console.log(`  rule B (torso/leg->arm, hugging): ${stats.ruleB} verts, mass ${r3(stats.massB)}`);
console.log(`  rule H (hand->hips, below hips): ${stats.ruleH} verts, mass ${r3(stats.massH)}`);
console.log(`  rule X (cross-body arm pair): ${stats.ruleX} verts, mass ${r3(stats.massX)}`);
console.log(`  dropped mass (slot overflow): ${r3(stats.droppedMass)}`);
console.log('moved FROM:', Object.fromEntries(Object.entries(stats.movedFrom).map(([k, v]) => [k, r3(v)])));
console.log('moved TO:  ', Object.fromEntries(Object.entries(stats.movedTo).map(([k, v]) => [k, r3(v)])));

if (DRY) { console.log('dry run: no file written'); process.exit(0); }

mkdirSync(dirname(OUT), { recursive: true });
await io.write(OUT, doc);
console.log(`wrote ${OUT}`);

// ---------- validate output ----------
const doc2 = await io.read(OUT);
const fpAfter = fingerprint(doc2.getRoot());
let ok = true;
const check = (label, a, b) => {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa === sb) console.log(`  PASS ${label}`);
  else { console.log(`  FAIL ${label}\n    before=${sa}\n    after =${sb}`); ok = false; }
};
console.log('validation:');
check('animation names', fpBefore.anims.map((a) => a.name), fpAfter.anims.map((a) => a.name));
check('animation channel counts', fpBefore.anims.map((a) => a.channels), fpAfter.anims.map((a) => a.channels));
check('animation sampler data hashes', fpBefore.anims.map((a) => a.samplerHashes), fpAfter.anims.map((a) => a.samplerHashes));
check('image hashes', fpBefore.images, fpAfter.images);
check('node names', fpBefore.nodeNames, fpAfter.nodeNames);
check('primitive counts', fpBefore.primCounts, fpAfter.primCounts);
// weight sanity on the output
{
  let bad = 0;
  for (const mesh of doc2.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const w = prim.getAttribute('WEIGHTS_0');
      if (!w) continue;
      const el = [];
      for (let i = 0; i < w.getCount(); i++) {
        w.getElement(i, el);
        const s = el.reduce((x, y) => x + y, 0);
        if (Math.abs(s - 1) > 1e-3) bad++;
      }
    }
  }
  if (bad === 0) console.log('  PASS weight sums normalized');
  else { console.log(`  FAIL ${bad} vertices with weight sum != 1`); ok = false; }
}
console.log(ok ? 'VALIDATION PASS' : 'VALIDATION FAIL');
process.exit(ok ? 0 : 1);
