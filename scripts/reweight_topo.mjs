#!/usr/bin/env node
// reweight_topo.mjs — TOPOLOGY-aware skin-weight repair for CR hero bodies.
//
// WHY THIS EXISTS
//   reweight_cloak.mjs decides with EUCLIDEAN distance to the arm bones. That
//   cannot fix a body whose problem surface is in BIND-POSE CONTACT with the
//   arm: fur fused to the forearm, a chain resting in the hand, hip cloth
//   touching the wrist. Those vertices are 0.01 from the arm bone, so every
//   distance rule either keeps the bleed or strips PART of a connected piece
//   and tears it into streaks/planks.
//
//   The separating quantity is distance ACROSS THE SURFACE (geodesic), not
//   through the air. A pelt touching the forearm is ~0.01 away in space but
//   ~0.9 away over the mesh (down the arm, across the shoulder, down the
//   torso, out onto the pelt). Real arm surface is near the arm both ways.
//
// THE FIELD
//   Three multi-source Dijkstra runs over the welded triangle graph
//   (edge cost = bind-pose edge length):
//     gL[v]    from seeds inside the LEFT arm bones
//     gR[v]    from seeds inside the RIGHT arm bones
//     gC[v]    from seeds inside the core bones (spine/hips/legs/head)
//   Per side s:  armness_s(v) = clamp01( (gC - g_s + bias + band) / (2*band) )
//   armness is ~1 on real arm surface, ~0 on anything the surface says belongs
//   to the body, and ramps smoothly across the shoulder. Because a hanging
//   piece reaches BOTH seed sets through the same attachment neck, armness is
//   near-CONSTANT over a whole piece — whole-piece behaviour falls out of the
//   field instead of being bolted on, which is what stops the tearing.
//
// THE RULES (all ramped by armness; the decision of WHERE to act depends only
// on geometry and topology, never on the current weights, so re-running is
// safe and CONVERGENT — but it is not a no-op: strip removes a FRACTION of
// what is present, and diffusion feeds a little weight back into the ramp that
// the next strip takes again. Measured on the shipped acolyte: pass 1 moved
// 449 mass, pass 2 moved 243, and the metrics improved slightly both times.
// Always repair from the preweight-backup original, not from a repaired file,
// so the recorded command reproduces the shipped bytes.)
//   S (strip)  arm-chain weight where the surface says "not this arm":
//              move (1-armness_s) of it off, side by side. Cross-body bleed
//              needs no special case: a left-arm vertex has armness_R ~ 0.
//   K (claim)  the REVERSE transfer, for bodies whose arms are genuinely stuck
//              to the torso: core weight on a vertex the surface says IS arm
//              (armness >= claim-min) moves to the arm joint the geodesic path
//              came from. Off by default (--claim-gain 0).
//   P (rigid)  a detached prop shell (chain, pelt, plank) that no seed can
//              reach gets ONE weight vector for the whole shell — its own
//              mass-dominant joint if that joint holds >= --rigid-snap of the
//              shell, else the shell's average vector. A rigid piece cannot
//              tear, by construction.
//   D (diffuse) optional Laplacian smoothing of the weight vectors over the
//              surface graph, restricted to touched vertices + N rings, so no
//              hard weight boundary survives anywhere a strip happened.
//
//   Stripped mass is redistributed to the vertex's own remaining non-arm
//   influences (height-compatible) and otherwise to the core bone the CORE
//   geodesic came from — the topologically owning bone, not the nearest by
//   height (a belt pelt gets Hips because it hangs off the belt, not because
//   it happens to sit at hip height).
//
// Never writes in place. Hash-proves animation samplers and images survive.
//
//   node scripts/reweight_topo.mjs --input <glb> --analyze
//   node scripts/reweight_topo.mjs --input <glb> --stretch Walk,Attack,Death
//   node scripts/reweight_topo.mjs --input <glb> --paint armness --out /tmp/x.glb
//   node scripts/reweight_topo.mjs --input <glb> --out <glb> [flags]
//
// Never writes in place, and hash-proves that every animation sampler, every
// image and every node name came through untouched.
//
// FIELD NOTES — 2026-08-03, the four infernal heroes distance rules could not fix.
//   Judge every change with --stretch on the SAME mesh before and after. The
//   absolute numbers are meaningless across bodies (the accepted assassin peaks
//   at 113x in Walk, the untouched skullbeast at 5.6x) because they are set by
//   edge density and limb throw; the same mesh against itself is exact.
//
//   SHIPPED (exact commands, reproducible):
//     barbarian      --band 0.26 --claim-gain 1.0 --claim-min 0.75
//                    --claim-max-dist 0.18 --smooth-iters 6 --smooth-lambda 0.6
//                    --smooth-rings 4
//                    fur skirt/pelts: Walk edges >2x 3610 -> 1981, >3x 1192 -> 551
//     bone_herald    --smooth-iters 5 --smooth-lambda 0.6 --smooth-rings 3
//                    hip wedge: Walk worst 15.6x -> 8.4x, >2x 1563 -> 399
//     sigil_acolyte  --band 0.28 --strip-gain 0.7 --smooth-iters 6
//                    --smooth-lambda 0.6 --smooth-rings 4
//                    chain planks: Attack worst 177x -> 53x
//     skullbeast     NOT SHIPPED. See below.
//
//   WHAT GENERALISES
//     1. The geodesic strip (rule S) is the workhorse and is safe: it only ever
//        removes arm weight the surface says does not belong, and because a
//        hanging piece has near-constant armness it moves as a piece.
//     2. Diffusion (rule D) is the cheapest large win and is close to free of
//        risk — it only averages a vertex with its own surface neighbours, so
//        it cannot invent a shape. On the bone herald it alone beat every
//        rule-based variant. Run it after any strip.
//     3. A WIDE band beats a narrow one. 0.12 was the first guess; 0.26-0.28
//        cut torn edges another 20-25% on every body, because a wide ramp is
//        a gentler weight gradient and the gradient is what tears.
//     4. The claim (rule K) is the DANGEROUS one. It helps only where the rig
//        already asserts an arm attachment that it under-committed, and it can
//        do real damage: on the skullbeast it dragged the clavicle fan onto the
//        arm bones and multiplied torn edges by eight. Leave it off by default;
//        turn it on only with --claim-max-dist AND after looking at
//        --paint claim.
//     5. --paint is worth reaching for before tuning anything. Two heat maps
//        answered in one render what four parameter sweeps had not.
//
//   WHY THE SKULLBEAST RESISTS (5 attempts, store left untouched)
//     Its deltoid cap reads neck:0.43 Hips:0.21 Spine01:0.21 LeftArm:0.14 while
//     the arm surface three centimetres away reads LeftArm:0.95. That cliff is
//     the strut. Moving the cap to the arm just relocates the cliff to the edge
//     of whatever region gets moved, and every region I could define with the
//     surface field also swept in the clavicle fan (the two are indistinguishable
//     to both geodesic and Euclidean distance on a skeletal chest, because a
//     ribcage reaches its sternum through the clavicle faster than through the
//     spine). Diffusion cannot flatten the cliff either: the mesh edges are
//     ~0.007 long and the arm throws ~0.5, so holding every edge under 1.5x
//     would need the 0.8 weight jump spread over ~0.8 units of surface — the
//     whole shoulder, which would make the arm follow the spine. This body needs
//     the deltoid re-bound at the rig, or the cap merged into the arm at the
//     mesh, not a weight edit.
//
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
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
const OUT = arg('out', join('/tmp/rw_topo', basename(INPUT, '.glb') + '.topo.glb'));
const ANALYZE = !!arg('analyze', false);
const DRY = !!arg('dry-run', false);

const WELD_EPS = Number(arg('weld-eps', 1e-5));
// seeds: "unambiguously inside the arm / the core"
const SEED_R = Number(arg('seed-radius', 0.05));
const SEED_K = Number(arg('seed-k', 6));
const SEED_SAMPLES = Number(arg('seed-samples', 9));
const SEED_MASS = Number(arg('seed-mass', 0)); // min distal-arm mass for an arm seed (0 = geometric only)
const CORE_SEED_R = Number(arg('core-seed-radius', 0.06));
const SEED_SHOULDER = !!arg('seed-shoulder', false); // seed from Shoulder->Arm too
// the ramp. 0.26 not 0.12: a wide ramp is a gentle weight gradient, and the
// gradient is what tears. Measured on all three shipped bodies.
const BAND = Number(arg('band', 0.26));
const BIAS = Number(arg('bias', 0));
const STRIP_GAIN = Number(arg('strip-gain', 1));
const CLAIM_GAIN = Number(arg('claim-gain', 0));
const CLAIM_MIN = Number(arg('claim-min', 0.7));
// Distance is useless ALONE, but as an extra CONJUNCT on the claim it is a
// cheap safety rail: only claim what the surface AND the air both call arm.
// Shoulder spikes and collars are surface-arm yet sit far off the bone axis;
// claiming them would ride the upper arm. Infinity = topology decides alone
// (right for props that legitimately hang far from the bone, e.g. chains).
const CLAIM_MAX_DIST = Number(arg('claim-max-dist', Infinity));
// Core-competition guard on the claim: never claim a vertex that sits CLOSER
// to a core bone than to its arm bone. Skeletal bodies break the geodesic
// assumption in one specific place — a ribcage reaches the sternum through the
// clavicle/scapula faster than through the spine, so the surface calls the
// chest plate "arm". Both metrics must agree before weight moves onto a bone
// that swings. Distance alone can't find the bleed; distance as a VETO is free.
const CLAIM_CORE_GUARD = !arg('no-claim-core-guard', false);
// Claim only where the RIG ITSELF already put some arm weight. On the skullbeast
// the deltoid cap reads neck:0.43 Hips:0.21 Spine01:0.21 LeftArm:0.14 — the
// binder knew it was arm and under-committed; two centimetres away the clavicle
// fan has NO arm weight at all and is pure torso. Both are surface-arm and both
// are close to the arm bone, so only this separates them. Claim then STRENGTHENS
// an attachment the rig already asserts instead of inventing one.
const CLAIM_MIN_ARMW = Number(arg('claim-min-armw', 0));
const STRIP_SHOULDER = !!arg('strip-shoulder', false);
// keep-floor: never take the LAST of an influence on real arm surface
const KEEP_ABOVE = Number(arg('keep-above', 0.98)); // armness >= this: never strip that side
// rigid prop shells
const RIGID = !!arg('rigid-props', false);
const RIGID_MAX_FRAC = Number(arg('rigid-max-frac', 0.15));
const RIGID_SNAP = Number(arg('rigid-snap', 0.4));
const RIGID_BLEND = Number(arg('rigid-blend', 1));
const RIGID_MIN_VERTS = Number(arg('rigid-min-verts', 8));
const RIGID_ATTACHED = !!arg('rigid-attached', false); // also rigidify small ATTACHED shells
// island snap (uniform armness per connected unanchored patch)
const ISLAND_MODE = String(arg('island-mode', 'none')); // none|median
const ISLAND_MIN = Number(arg('island-min', 20));
const ISLAND_ANCHOR = Number(arg('island-anchor', 0.9)); // armness >= this is anchored arm surface
// diffusion
// Diffusion defaults ON: it was the single largest measured win on every body
// and cannot introduce a shape of its own. --smooth-iters 0 disables it.
const SMOOTH_ITERS = Number(arg('smooth-iters', 5));
const SMOOTH_LAMBDA = Number(arg('smooth-lambda', 0.6));
const SMOOTH_RINGS = Number(arg('smooth-rings', 3));
// Which vertices diffusion is allowed to touch:
//   touched  the verts a rule edited, plus --smooth-rings of neighbours (default)
//   band     the geodesic transition zone, --smooth-lo < armness < --smooth-hi
//   armzone  everything within --smooth-dist of an arm bone, i.e. the whole arm
//            AND its junction with the body. This is the one that repairs an
//            arm bound to the torso WITHOUT moving any weight by rule: the
//            defect there is a weight CLIFF (arm 0.95 -> shoulder cap 0.14 in
//            5cm), and a cliff is what tears into a strut. Diffusion turns the
//            cliff into a shoulder, and it cannot invent an artifact because it
//            only ever averages a vertex with its own surface neighbours.
const SMOOTH_REGION = String(arg('smooth-region', 'touched'));
const SMOOTH_DIST = Number(arg('smooth-dist', 0.15));
const SMOOTH_LO = Number(arg('smooth-lo', 0.05));
const SMOOTH_HI = Number(arg('smooth-hi', 0.95));
// redistribution
const REDIST = String(arg('redist', 'proportional')); // proportional|geodesic
const REDIST_HEIGHT = Number(arg('redist-height', 0.2));
const REDIST_LEGS = String(arg('redist-legs', 'hips')); // hips|allow
const PROBE = (() => { const v = arg('probe'); return v ? v.split(',').map(Number) : null; })();
// --paint armness|claim|strip : write a DIAGNOSTIC glb whose COLOR_0 is a
// heat map of the decision field (blue 0 -> green 0.5 -> red 1) on a flat
// white material, so the repair can be LOOKED at instead of guessed at.
// Never ship a painted file.
const PAINT = arg('paint', null);
// --stretch Walk,Run,Attack : skin the mesh through the clips and measure how
// far every mesh EDGE is stretched away from its rest length. A tear, a strut,
// a web and a plank are all the same thing numerically — edges pulled to many
// times their rest length because their two ends followed different bones. One
// render frame at 40% of a clip can miss it; this cannot.
const STRETCH = (() => { const v = arg('stretch'); return v ? String(v).split(',') : null; })();
const STRETCH_SAMPLES = Number(arg('stretch-samples', 16));

const ARM_CHAIN = {
  LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand',
  RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand',
};
const HAND = new Set(['LeftHand', 'RightHand']);
const SHOULDER = new Set(['LeftShoulder', 'RightShoulder']);
const ARM_SET = new Set([...Object.keys(ARM_CHAIN), ...HAND]);
const CORE_EDGES = [
  ['Hips', 'Spine02'], ['Spine02', 'Spine01'], ['Spine01', 'Spine'], ['Spine', 'neck'], ['neck', 'Head'],
  ['Hips', 'LeftUpLeg'], ['Hips', 'RightUpLeg'],
  ['LeftUpLeg', 'LeftLeg'], ['LeftLeg', 'LeftFoot'],
  ['RightUpLeg', 'RightLeg'], ['RightLeg', 'RightFoot'],
];
const CLAIM_SOURCES = new Set(['Hips', 'Spine', 'Spine01', 'Spine02', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg']);
const LEG_BONES = new Set(['LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot']);

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
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
function sha(buf) { return createHash('sha256').update(buf).digest('hex').slice(0, 16); }
function accBytes(acc) { const a = acc.getArray(); return Buffer.from(a.buffer, a.byteOffset, a.byteLength); }

// ---------- mat4 / quat (for the stretch metric) ----------
function mat4Identity() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }
function mat4Mul(a, b) { // column-major, returns a*b
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
  }
  return o;
}
function composeTRS(t, q, s) {
  const [x, y, z, w] = q;
  const x2 = x+x, y2 = y+y, z2 = z+z;
  const xx = x*x2, xy = x*y2, xz = x*z2, yy = y*y2, yz = y*z2, zz = z*z2;
  const wx = w*x2, wy = w*y2, wz = w*z2;
  return [
    (1-(yy+zz))*s[0], (xy+wz)*s[0], (xz-wy)*s[0], 0,
    (xy-wz)*s[1], (1-(xx+zz))*s[1], (yz+wx)*s[1], 0,
    (xz+wy)*s[2], (yz-wx)*s[2], (1-(xx+yy))*s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}
function quatSlerp(a, b, t) {
  let cos = a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3];
  let bb = b;
  if (cos < 0) { bb = [-b[0], -b[1], -b[2], -b[3]]; cos = -cos; }
  if (cos > 0.9995) {
    const o = [a[0]+(bb[0]-a[0])*t, a[1]+(bb[1]-a[1])*t, a[2]+(bb[2]-a[2])*t, a[3]+(bb[3]-a[3])*t];
    const l = Math.hypot(o[0], o[1], o[2], o[3]) || 1;
    return [o[0]/l, o[1]/l, o[2]/l, o[3]/l];
  }
  const th = Math.acos(cos), s = Math.sin(th);
  const wa = Math.sin((1-t)*th)/s, wb = Math.sin(t*th)/s;
  return [a[0]*wa+bb[0]*wb, a[1]*wa+bb[1]*wb, a[2]*wa+bb[2]*wb, a[3]*wa+bb[3]*wb];
}

class UF {
  constructor(n) { this.p = new Int32Array(n); for (let i = 0; i < n; i++) this.p[i] = i; }
  find(x) { let r = x; while (this.p[r] !== r) r = this.p[r]; while (this.p[x] !== r) { const nx = this.p[x]; this.p[x] = r; x = nx; } return r; }
  union(a, b) { a = this.find(a); b = this.find(b); if (a !== b) this.p[b] = a; }
}

// binary min-heap over (dist, vertex)
class Heap {
  constructor(cap) { this.d = new Float64Array(cap); this.v = new Int32Array(cap); this.n = 0; }
  push(dist, vert) {
    if (this.n === this.d.length) { // grow
      const nd = new Float64Array(this.n * 2), nv = new Int32Array(this.n * 2);
      nd.set(this.d); nv.set(this.v); this.d = nd; this.v = nv;
    }
    let i = this.n++;
    this.d[i] = dist; this.v[i] = vert;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (this.d[par] <= this.d[i]) break;
      const td = this.d[par], tv = this.v[par];
      this.d[par] = this.d[i]; this.v[par] = this.v[i];
      this.d[i] = td; this.v[i] = tv;
      i = par;
    }
  }
  pop() {
    const top = this.v[0], td = this.d[0];
    this.n--;
    if (this.n > 0) {
      this.d[0] = this.d[this.n]; this.v[0] = this.v[this.n];
      let i = 0;
      for (;;) {
        const l = 2*i+1, r = l+1;
        let m = i;
        if (l < this.n && this.d[l] < this.d[m]) m = l;
        if (r < this.n && this.d[r] < this.d[m]) m = r;
        if (m === i) break;
        const dd = this.d[m], vv = this.v[m];
        this.d[m] = this.d[i]; this.v[m] = this.v[i];
        this.d[i] = dd; this.v[i] = vv;
        i = m;
      }
    }
    return [td, top];
  }
}

function dijkstra(n, csrStart, csrTo, csrW, seedIds, seedLabels) {
  const dist = new Float64Array(n).fill(Infinity);
  const label = new Int32Array(n).fill(-1);
  const heap = new Heap(Math.max(1024, seedIds.length * 2));
  for (let i = 0; i < seedIds.length; i++) {
    const s = seedIds[i];
    if (dist[s] === 0) continue;
    dist[s] = 0; label[s] = seedLabels[i];
    heap.push(0, s);
  }
  while (heap.n > 0) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;
    for (let e = csrStart[u]; e < csrStart[u + 1]; e++) {
      const v = csrTo[e];
      const nd = d + csrW[e];
      if (nd < dist[v]) { dist[v] = nd; label[v] = label[u]; heap.push(nd, v); }
    }
  }
  return { dist, label };
}

// ---------- fingerprint ----------
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
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(INPUT);
const root = doc.getRoot();
const fpBefore = fingerprint(root);

const stats = {
  verts: 0, welded: 0, touched: 0,
  stripVerts: 0, stripMass: 0, claimVerts: 0, claimMass: 0,
  rigidShells: 0, rigidVerts: 0, smoothVerts: 0, droppedMass: 0,
  movedFrom: {}, movedTo: {},
};
const addMass = (m, k, v) => { m[k] = (m[k] || 0) + v; };
const r3 = (v) => Math.round(v * 1000) / 1000;

for (const node of root.listNodes()) {
  const skin = node.getSkin();
  const mesh = node.getMesh();
  if (!skin || !mesh) continue;

  const joints = skin.listJoints();
  const jointName = joints.map((j) => j.getName());
  const jidx = new Map(jointName.map((n, i) => [n, i]));
  const ibm = skin.getInverseBindMatrices().getArray();
  const head = joints.map((_, i) => {
    const inv = invert4(Array.from(ibm.slice(i * 16, i * 16 + 16)));
    return inv ? [inv[12], inv[13], inv[14]] : null;
  });
  const headOf = (n) => { const i = jidx.get(n); return i === undefined ? null : head[i]; };

  // ---- bone segments
  const armSeg = new Map(); // owner joint name -> [a,b]
  for (const [j, child] of Object.entries(ARM_CHAIN)) {
    if (!SEED_SHOULDER && SHOULDER.has(j)) continue;
    const a = headOf(j), b = headOf(child);
    if (a && b) armSeg.set(j, [a, b]);
  }
  for (const h of HAND) {
    const hh = headOf(h);
    const fa = headOf(h === 'LeftHand' ? 'LeftForeArm' : 'RightForeArm');
    if (hh && fa) armSeg.set(h, [hh, [hh[0] + (hh[0]-fa[0])/2, hh[1] + (hh[1]-fa[1])/2, hh[2] + (hh[2]-fa[2])/2]]);
  }
  const coreSeg = new Map();
  for (const [a, b] of CORE_EDGES) {
    const pa = headOf(a), pb = headOf(b);
    if (pa && pb) coreSeg.set(a + '>' + b, { owner: a, seg: [pa, pb] });
  }

  const prims = mesh.listPrimitives().filter((pr) =>
    pr.getAttribute('POSITION') && pr.getAttribute('JOINTS_0') && pr.getAttribute('WEIGHTS_0'));
  if (!prims.length) continue;

  // ---- weld
  const weldId = new Map();
  let nW = 0;
  const primRep = [];
  const scaleE = 1 / WELD_EPS;
  const e3 = [];
  for (const pr of prims) {
    const pos = pr.getAttribute('POSITION');
    const n = pos.getCount();
    const rep = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      pos.getElement(i, e3);
      const k = `${Math.round(e3[0]*scaleE)},${Math.round(e3[1]*scaleE)},${Math.round(e3[2]*scaleE)}`;
      let id = weldId.get(k);
      if (id === undefined) { id = nW++; weldId.set(k, id); }
      rep[i] = id;
    }
    primRep.push(rep);
    stats.verts += n;
  }
  stats.welded += nW;

  // welded positions
  const wx = new Float64Array(nW), wy = new Float64Array(nW), wz = new Float64Array(nW);
  prims.forEach((pr, pi) => {
    const pos = pr.getAttribute('POSITION');
    const rep = primRep[pi];
    for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, e3); const id = rep[i]; wx[id] = e3[0]; wy[id] = e3[1]; wz[id] = e3[2]; }
  });

  // ---- weight scale
  const wScaleOf = new Map();
  const getScale = (wAcc) => {
    if (wScaleOf.has(wAcc)) return wScaleOf.get(wAcc);
    let s = 1;
    const probe = []; const el = [];
    const n = Math.min(wAcc.getCount(), 200);
    for (let i = 0; i < n; i++) { wAcc.getElement(i, el); probe.push(el.reduce((a, b) => a + b, 0)); }
    probe.sort((a, b) => a - b);
    const med = probe[probe.length >> 1];
    if (med > 100 && med < 400) s = 255; else if (med > 30000) s = 65535;
    if (s !== 1) console.log(`weights are normalized ints (scale ${s})`);
    wScaleOf.set(wAcc, s);
    return s;
  };

  // ---- per-welded base weights (averaged over instances) + conflict measure
  const baseW = new Array(nW); // Map<jointIdx, weight>
  const instCount = new Int32Array(nW);
  let maxConflict = 0, conflictVerts = 0;
  {
    const je = [], we = [];
    prims.forEach((pr, pi) => {
      const jAcc = pr.getAttribute('JOINTS_0'), wAcc = pr.getAttribute('WEIGHTS_0');
      const sc = getScale(wAcc);
      const rep = primRep[pi];
      const cnt = pr.getAttribute('POSITION').getCount();
      for (let vi = 0; vi < cnt; vi++) {
        const id = rep[vi];
        jAcc.getElement(vi, je); wAcc.getElement(vi, we);
        const m = new Map();
        for (let s = 0; s < 4; s++) { const w = (we[s] || 0) / sc; if (w > 0) m.set(je[s], (m.get(je[s]) || 0) + w); }
        if (!baseW[id]) { baseW[id] = m; instCount[id] = 1; }
        else {
          const prev = baseW[id];
          let diff = 0;
          const keys = new Set([...prev.keys(), ...m.keys()]);
          for (const k of keys) diff += Math.abs((prev.get(k) || 0) / instCount[id] - (m.get(k) || 0));
          if (diff > 0.02) { conflictVerts++; if (diff > maxConflict) maxConflict = diff; }
          for (const [k, v] of m) prev.set(k, (prev.get(k) || 0) + v);
          instCount[id]++;
        }
      }
    });
    for (let id = 0; id < nW; id++) {
      const m = baseW[id]; if (!m) continue;
      const c = instCount[id];
      if (c > 1) for (const [k, v] of m) m.set(k, v / c);
      let s = 0; for (const [, v] of m) s += v;
      if (s > 1e-9 && Math.abs(s - 1) > 1e-6) for (const [k, v] of m) m.set(k, v / s);
    }
  }

  // ---- adjacency (deduped, CSR). Edge keys pack (u,v) into one double, so the
  // welded vertex count must stay under the packing base.
  const edgeSet = new Set();
  const K = 1 << 20;
  if (nW >= K) { console.error(`too many welded vertices (${nW} >= ${K}) for edge packing`); process.exit(3); }
  prims.forEach((pr, pi) => {
    const rep = primRep[pi];
    const idx = pr.getIndices();
    const push = (a, b) => { if (a === b) return; const u = a < b ? a : b, v = a < b ? b : a; edgeSet.add(u * K + v); };
    if (idx) {
      const ia = idx.getArray();
      for (let t = 0; t + 2 < ia.length; t += 3) { const a = rep[ia[t]], b = rep[ia[t+1]], c = rep[ia[t+2]]; push(a, b); push(b, c); push(a, c); }
    } else {
      for (let t = 0; t + 2 < rep.length; t += 3) { const a = rep[t], b = rep[t+1], c = rep[t+2]; push(a, b); push(b, c); push(a, c); }
    }
  });
  const deg = new Int32Array(nW + 1);
  for (const key of edgeSet) { const u = Math.floor(key / K), v = key % K; deg[u]++; deg[v]++; }
  const csrStart = new Int32Array(nW + 1);
  for (let i = 0; i < nW; i++) csrStart[i + 1] = csrStart[i] + deg[i];
  const nE = csrStart[nW];
  const csrTo = new Int32Array(nE), csrW = new Float64Array(nE);
  const fill = csrStart.slice(0, nW);
  for (const key of edgeSet) {
    const u = Math.floor(key / K), v = key % K;
    const dx = wx[u]-wx[v], dy = wy[u]-wy[v], dz = wz[u]-wz[v];
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
    csrTo[fill[u]] = v; csrW[fill[u]++] = len;
    csrTo[fill[v]] = u; csrW[fill[v]++] = len;
  }

  // ---- shells
  const uf = new UF(nW);
  for (const key of edgeSet) uf.union(Math.floor(key / K), key % K);
  const shellStat = new Map();
  for (let id = 0; id < nW; id++) {
    const r = uf.find(id);
    let st = shellStat.get(r);
    if (!st) { st = { verts: 0, ids: [], min: [1e9,1e9,1e9], max: [-1e9,-1e9,-1e9] }; shellStat.set(r, st); }
    st.verts++; st.ids.push(id);
    if (wx[id] < st.min[0]) st.min[0] = wx[id]; if (wx[id] > st.max[0]) st.max[0] = wx[id];
    if (wy[id] < st.min[1]) st.min[1] = wy[id]; if (wy[id] > st.max[1]) st.max[1] = wy[id];
    if (wz[id] < st.min[2]) st.min[2] = wz[id]; if (wz[id] > st.max[2]) st.max[2] = wz[id];
  }

  // ---- seeds
  const armMassOf = (id) => {
    const m = baseW[id]; if (!m) return 0;
    let s = 0;
    for (const [ji, w] of m) { const n = jointName[ji]; if (ARM_SET.has(n) && !SHOULDER.has(n)) s += w; }
    return s;
  };
  function seedFor(segs, requireMass, ownerFn = (k) => k) {
    // segs: Map key -> [a,b]; returns { ids:[], labels:[] } with label = joint index of the owner
    const ids = [], labels = [];
    const chosen = new Set();
    for (const [key, seg] of segs) {
      const owner = ownerFn(key);
      const oi = jidx.get(owner) ?? -1;
      const radius = requireMass ? SEED_R : CORE_SEED_R;
      // radius pass
      const near = [];
      for (let id = 0; id < nW; id++) {
        const d = distToSeg([wx[id], wy[id], wz[id]], seg[0], seg[1]);
        if (d < radius) near.push([d, id]);
      }
      let added = 0;
      for (const [, id] of near) {
        if (requireMass && SEED_MASS > 0 && armMassOf(id) < SEED_MASS) continue;
        if (chosen.has(id)) continue;
        chosen.add(id); ids.push(id); labels.push(oi); added++;
      }
      // guarantee coverage: nearest SEED_K per sample point along the segment
      if (added < SEED_K * 2) {
        for (let s = 0; s <= SEED_SAMPLES; s++) {
          const t = s / SEED_SAMPLES;
          const px = seg[0][0] + t*(seg[1][0]-seg[0][0]);
          const py = seg[0][1] + t*(seg[1][1]-seg[0][1]);
          const pz = seg[0][2] + t*(seg[1][2]-seg[0][2]);
          const best = [];
          for (let id = 0; id < nW; id++) {
            const dx = wx[id]-px, dy = wy[id]-py, dz = wz[id]-pz;
            const d2 = dx*dx + dy*dy + dz*dz;
            if (best.length < SEED_K) { best.push([d2, id]); best.sort((a, b) => a[0]-b[0]); }
            else if (d2 < best[best.length-1][0]) { best[best.length-1] = [d2, id]; best.sort((a, b) => a[0]-b[0]); }
          }
          for (const [, id] of best) { if (chosen.has(id)) continue; chosen.add(id); ids.push(id); labels.push(oi); }
        }
      }
    }
    return { ids, labels };
  }
  const leftSegs = new Map([...armSeg].filter(([k]) => k.startsWith('Left')));
  const rightSegs = new Map([...armSeg].filter(([k]) => k.startsWith('Right')));
  // core segments keyed by a unique id, each carrying its owning joint name
  const coreSegsById = new Map();
  { let i = 0; for (const c of coreSeg.values()) coreSegsById.set(`${c.owner}#${i++}`, c.seg); }
  const ownerOfKey = (k) => k.split('#')[0];
  const sL = seedFor(leftSegs, true);
  const sR = seedFor(rightSegs, true);
  const sC = seedFor(coreSegsById, false, ownerOfKey);

  const gL = dijkstra(nW, csrStart, csrTo, csrW, sL.ids, sL.labels);
  const gR = dijkstra(nW, csrStart, csrTo, csrW, sR.ids, sR.labels);
  const gC = dijkstra(nW, csrStart, csrTo, csrW, sC.ids, sC.labels);

  const armnessL = new Float32Array(nW), armnessR = new Float32Array(nW);
  for (let id = 0; id < nW; id++) {
    const c = gC.dist[id];
    const l = gL.dist[id], r = gR.dist[id];
    armnessL[id] = (!isFinite(c) && !isFinite(l)) ? -1 : clamp01(((isFinite(c) ? c : 1e6) - (isFinite(l) ? l : 1e6) + BIAS + BAND) / (2 * BAND));
    armnessR[id] = (!isFinite(c) && !isFinite(r)) ? -1 : clamp01(((isFinite(c) ? c : 1e6) - (isFinite(r) ? r : 1e6) + BIAS + BAND) / (2 * BAND));
  }

  // ---------- analysis ----------
  if (ANALYZE) {
    const bb = { min: [1e9,1e9,1e9], max: [-1e9,-1e9,-1e9] };
    for (let id = 0; id < nW; id++) {
      bb.min[0] = Math.min(bb.min[0], wx[id]); bb.max[0] = Math.max(bb.max[0], wx[id]);
      bb.min[1] = Math.min(bb.min[1], wy[id]); bb.max[1] = Math.max(bb.max[1], wy[id]);
      bb.min[2] = Math.min(bb.min[2], wz[id]); bb.max[2] = Math.max(bb.max[2], wz[id]);
    }
    console.log(`\n=== ANALYZE ${basename(INPUT)} ===`);
    console.log(`node="${node.getName()}" nodeMatrix=${JSON.stringify(node.getMatrix().map((v) => Math.round(v*1000)/1000))}`);
    console.log(`instances=${stats.verts} welded=${nW} (dupes ${stats.verts - nW}) edges=${edgeSet.size} conflictVerts=${conflictVerts} maxConflict=${r3(maxConflict)}`);
    console.log(`bbox min=[${bb.min.map(r3)}] max=[${bb.max.map(r3)}]  height=${r3(bb.max[1]-bb.min[1])}`);
    for (const n of ['Hips','Spine02','Spine','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand']) {
      const h = headOf(n); if (h) console.log(`  bone ${n.padEnd(13)} [${h.map(r3)}]`);
    }
    console.log(`seeds: L=${sL.ids.length} R=${sR.ids.length} core=${sC.ids.length}`);
    let unreachA = 0, unreachC = 0, orphan = 0;
    for (let id = 0; id < nW; id++) {
      const la = isFinite(gL.dist[id]) || isFinite(gR.dist[id]);
      if (!la) unreachA++;
      if (!isFinite(gC.dist[id])) unreachC++;
      if (!la && !isFinite(gC.dist[id])) orphan++;
    }
    console.log(`geodesic: ${unreachA} verts unreachable from any arm, ${unreachC} from core, ${orphan} orphan (detached props)`);
    const shells = [...shellStat.entries()].sort((a, b) => b[1].verts - a[1].verts);
    console.log(`shells: ${shells.length}`);
    for (const [r, st] of shells.slice(0, 14)) {
      const agg = new Map();
      let armM = 0;
      for (const id of st.ids) {
        const m = baseW[id]; if (!m) continue;
        for (const [ji, w] of m) { agg.set(ji, (agg.get(ji) || 0) + w); if (ARM_SET.has(jointName[ji])) armM += w; }
      }
      const top = [...agg.entries()].sort((a, b) => b[1]-a[1]).slice(0, 4).map(([ji, w]) => `${jointName[ji]}:${(100*w/st.verts).toFixed(0)}%`).join(' ');
      const isOrphan = st.ids.every((id) => !isFinite(gL.dist[id]) && !isFinite(gR.dist[id]) && !isFinite(gC.dist[id]));
      console.log(`  shell verts=${String(st.verts).padStart(6)} ${isOrphan ? 'ORPHAN' : '      '} arm=${(100*armM/st.verts).toFixed(0)}% bbox y[${r3(st.min[1])},${r3(st.max[1])}] x[${r3(st.min[0])},${r3(st.max[0])}] top: ${top}`);
    }
    // the target populations
    let nearFar = 0, nearFarMass = 0, stuckArm = 0, stuckArmMass = 0, armW = 0;
    let claimAll = 0, claimAllMass = 0, armSurface = 0;
    const hist = new Array(10).fill(0);
    for (let id = 0; id < nW; id++) {
      const m = baseW[id]; if (!m) continue;
      const p = [wx[id], wy[id], wz[id]];
      let dArm = Infinity;
      for (const [, seg] of armSeg) dArm = Math.min(dArm, distToSeg(p, seg[0], seg[1]));
      let am = 0, coreM = 0;
      for (const [ji, w] of m) {
        const n = jointName[ji];
        if (ARM_SET.has(n) && !SHOULDER.has(n)) am += w;
        else if (CLAIM_SOURCES.has(n)) coreM += w;
      }
      if (am > 0.05) {
        armW++;
        const a = Math.max(armnessL[id], armnessR[id]);
        hist[Math.min(9, Math.floor(a * 10))]++;
        if (dArm < 0.14 && a < 0.3) { nearFar++; nearFarMass += am; }
      }
      if (dArm < 0.10 && coreM > 0.4 && Math.max(armnessL[id], armnessR[id]) > 0.8) { stuckArm++; stuckArmMass += coreM; }
      // every claim candidate, regardless of how far from the bone AXIS it sits
      // (a chain hanging from a hand is surface-arm but 0.2 off the bone)
      if (Math.max(armnessL[id], armnessR[id]) >= CLAIM_MIN) {
        armSurface++;
        if (coreM > 0.3) { claimAll++; claimAllMass += coreM; }
      }
    }
    console.log(`arm-weighted verts: ${armW}`);
    console.log(`  armness histogram (0.0->1.0): ${hist.join(' ')}`);
    console.log(`  EUCLID-NEAR but SURFACE-FAR (the untouchable population): ${nearFar} verts, arm mass ${r3(nearFarMass)}`);
    console.log(`  arm surface carrying CORE weight, within 0.10 of the bone: ${stuckArm} verts, core mass ${r3(stuckArmMass)}`);
    console.log(`  surface-arm verts (armness>=${CLAIM_MIN}): ${armSurface}; of those carrying core weight >0.3: ${claimAll} verts, core mass ${r3(claimAllMass)}`);
    // where the surface-arm region actually SITS: a claim that reaches the
    // ribcage or the legs would pin the torso to a swinging arm.
    for (const [side, af] of [['L', armnessL], ['R', armnessR]]) {
      let n = 0; const mn = [1e9,1e9,1e9], mx = [-1e9,-1e9,-1e9];
      let dSum = 0, dMax = 0;
      for (let id = 0; id < nW; id++) {
        if (af[id] < CLAIM_MIN) continue;
        n++;
        mn[0] = Math.min(mn[0], wx[id]); mx[0] = Math.max(mx[0], wx[id]);
        mn[1] = Math.min(mn[1], wy[id]); mx[1] = Math.max(mx[1], wy[id]);
        mn[2] = Math.min(mn[2], wz[id]); mx[2] = Math.max(mx[2], wz[id]);
        let d = Infinity;
        for (const [k, seg] of armSeg) { if (!k.startsWith(side === 'L' ? 'Left' : 'Right')) continue; d = Math.min(d, distToSeg([wx[id], wy[id], wz[id]], seg[0], seg[1])); }
        if (isFinite(d)) { dSum += d; dMax = Math.max(dMax, d); }
      }
      console.log(`  surface-arm ${side}: ${n} verts bbox x[${r3(mn[0])},${r3(mx[0])}] y[${r3(mn[1])},${r3(mx[1])}] z[${r3(mn[2])},${r3(mx[2])}] meanDistToOwnArmBone=${r3(dSum/Math.max(1,n))} max=${r3(dMax)}`);
    }
    if (PROBE) {
      const [x0,x1,y0,y1,z0,z1] = PROBE;
      let n = 0;
      for (let id = 0; id < nW && n < 25; id++) {
        if (wx[id]<x0||wx[id]>x1||wy[id]<y0||wy[id]>y1||wz[id]<z0||wz[id]>z1) continue;
        const m = baseW[id]; if (!m) continue;
        const w = [...m.entries()].filter(([,v])=>v>0.02).map(([ji,v])=>`${jointName[ji]}:${r3(v)}`).join(' ');
        console.log(`  PROBE (${r3(wx[id])},${r3(wy[id])},${r3(wz[id])}) gL=${r3(gL.dist[id])} gR=${r3(gR.dist[id])} gC=${r3(gC.dist[id])} aL=${r3(armnessL[id])} aR=${r3(armnessR[id])} | ${w}`);
        n++;
      }
    }
    continue;
  }

  // ---------- stretch metric ----------
  if (STRETCH) {
    // node hierarchy
    const allNodes = root.listNodes();
    const nodeIdx = new Map(allNodes.map((n, i) => [n, i]));
    const parent = new Int32Array(allNodes.length).fill(-1);
    allNodes.forEach((n, i) => { for (const c of n.listChildren()) parent[nodeIdx.get(c)] = i; });
    const order = []; // parents before children
    { const seen = new Uint8Array(allNodes.length);
      const visit = (i) => { if (seen[i]) return; seen[i] = 1; if (parent[i] >= 0) visit(parent[i]); order.push(i); };
      for (let i = 0; i < allNodes.length; i++) visit(i); }
    const baseT = allNodes.map((n) => n.getTranslation());
    const baseR = allNodes.map((n) => n.getRotation());
    const baseS = allNodes.map((n) => n.getScale());
    const jointNodeIdx = joints.map((j) => nodeIdx.get(j));

    // rest edge lengths
    const edges = [...edgeSet];
    const restLen = new Float64Array(edges.length);
    edges.forEach((key, i) => {
      const u = Math.floor(key / K), v = key % K;
      restLen[i] = Math.hypot(wx[u]-wx[v], wy[u]-wy[v], wz[u]-wz[v]);
    });

    console.log(`\n=== STRETCH ${basename(INPUT)} (${STRETCH_SAMPLES} samples/clip) ===`);
    for (const clipName of STRETCH) {
      const anim = root.listAnimations().find((a) => a.getName() === clipName);
      if (!anim) { console.log(`  ${clipName}: NOT FOUND`); continue; }
      const chans = anim.listChannels().map((ch) => {
        const s = ch.getSampler();
        return {
          ni: nodeIdx.get(ch.getTargetNode()), path: ch.getTargetPath(),
          t: s.getInput().getArray(), v: s.getOutput().getArray(),
          stride: ch.getTargetPath() === 'rotation' ? 4 : 3,
          step: s.getInterpolation() === 'STEP',
        };
      }).filter((c) => c.ni !== undefined && c.path !== 'weights');
      let dur = 0;
      for (const c of chans) dur = Math.max(dur, c.t[c.t.length - 1]);
      let worstAll = 0, worstAt = null, p99All = 0;
      let over15 = 0, over20 = 0, over30 = 0, samples = 0;
      for (let si = 0; si < STRETCH_SAMPLES; si++) {
        const time = dur * (si / (STRETCH_SAMPLES - 1 || 1));
        const T = baseT.map((v) => v.slice()), R = baseR.map((v) => v.slice()), S = baseS.map((v) => v.slice());
        for (const c of chans) {
          const ts = c.t;
          let k = 0;
          while (k < ts.length - 1 && ts[k + 1] < time) k++;
          const k1 = Math.min(k + 1, ts.length - 1);
          const span = ts[k1] - ts[k];
          const f = c.step || span <= 0 ? 0 : Math.max(0, Math.min(1, (time - ts[k]) / span));
          const o = c.stride;
          if (c.path === 'rotation') {
            const a = [c.v[k*4], c.v[k*4+1], c.v[k*4+2], c.v[k*4+3]];
            const b = [c.v[k1*4], c.v[k1*4+1], c.v[k1*4+2], c.v[k1*4+3]];
            R[c.ni] = quatSlerp(a, b, f);
          } else {
            const dst = c.path === 'translation' ? T : S;
            for (let d = 0; d < 3; d++) dst[c.ni][d] = c.v[k*o+d] + (c.v[k1*o+d] - c.v[k*o+d]) * f;
          }
        }
        const world = new Array(allNodes.length);
        for (const i of order) {
          const loc = composeTRS(T[i], R[i], S[i]);
          world[i] = parent[i] >= 0 ? mat4Mul(world[parent[i]], loc) : loc;
        }
        const skinM = joints.map((_, ji) => {
          const w = world[jointNodeIdx[ji]] || mat4Identity();
          const ib = Array.from(ibm.slice(ji*16, ji*16+16));
          return mat4Mul(w, ib);
        });
        // deform welded verts
        const dx = new Float64Array(nW), dy = new Float64Array(nW), dz = new Float64Array(nW);
        for (let id = 0; id < nW; id++) {
          const m = baseW[id];
          if (!m || m.size === 0) { dx[id] = wx[id]; dy[id] = wy[id]; dz[id] = wz[id]; continue; }
          let ox = 0, oy = 0, oz = 0, tot = 0;
          for (const [ji, w] of m) {
            if (w <= 0) continue;
            const sm = skinM[ji]; if (!sm) continue;
            const px = wx[id], py = wy[id], pz = wz[id];
            ox += w * (sm[0]*px + sm[4]*py + sm[8]*pz + sm[12]);
            oy += w * (sm[1]*px + sm[5]*py + sm[9]*pz + sm[13]);
            oz += w * (sm[2]*px + sm[6]*py + sm[10]*pz + sm[14]);
            tot += w;
          }
          if (tot > 1e-6) { dx[id] = ox/tot; dy[id] = oy/tot; dz[id] = oz/tot; }
          else { dx[id] = wx[id]; dy[id] = wy[id]; dz[id] = wz[id]; }
        }
        const ratios = new Float64Array(edges.length);
        for (let i = 0; i < edges.length; i++) {
          const key = edges[i], u = Math.floor(key / K), v = key % K;
          const L = Math.hypot(dx[u]-dx[v], dy[u]-dy[v], dz[u]-dz[v]);
          const r = restLen[i] > 1e-9 ? L / restLen[i] : 1;
          ratios[i] = r;
          if (r > 1.5) over15++;
          if (r > 2.0) over20++;
          if (r > 3.0) over30++;
          if (r > worstAll) { worstAll = r; worstAt = [wx[u], wy[u], wz[u]]; }
        }
        const sorted = Float64Array.from(ratios).sort();
        p99All = Math.max(p99All, sorted[Math.floor(sorted.length * 0.999)]);
        samples++;
      }
      const per = (n) => (n / samples).toFixed(1);
      console.log(`  ${clipName.padEnd(8)} worst=${worstAll.toFixed(2)}x  p99.9=${p99All.toFixed(2)}x  edges/frame >1.5x:${per(over15)} >2x:${per(over20)} >3x:${per(over30)}  worstAt=[${worstAt ? worstAt.map(r3) : ''}]`);
    }
    continue;
  }

  // ---------- island snap ----------
  let islandArm = null;
  if (ISLAND_MODE === 'median') {
    // connected patches of arm-weighted, NON-anchored verts get one armness
    const iuf = new UF(nW);
    const isle = (id) => {
      const m = baseW[id]; if (!m) return false;
      let am = 0; for (const [ji, w] of m) { const n = jointName[ji]; if (ARM_SET.has(n) && !SHOULDER.has(n)) am += w; }
      if (am <= 0.05) return false;
      return Math.max(armnessL[id], armnessR[id]) < ISLAND_ANCHOR;
    };
    const isl = new Uint8Array(nW);
    for (let id = 0; id < nW; id++) isl[id] = isle(id) ? 1 : 0;
    for (const key of edgeSet) { const u = Math.floor(key / K), v = key % K; if (isl[u] && isl[v]) iuf.union(u, v); }
    const groups = new Map();
    for (let id = 0; id < nW; id++) { if (!isl[id]) continue; const r = iuf.find(id); let g = groups.get(r); if (!g) { g = []; groups.set(r, g); } g.push(id); }
    islandArm = { L: new Float32Array(nW).fill(-1), R: new Float32Array(nW).fill(-1) };
    let snapped = 0;
    for (const [, g] of groups) {
      if (g.length < ISLAND_MIN) continue;
      const la = g.map((id) => armnessL[id]).sort((a, b) => a - b);
      const ra = g.map((id) => armnessR[id]).sort((a, b) => a - b);
      const ml = la[la.length >> 1], mr = ra[ra.length >> 1];
      for (const id of g) { islandArm.L[id] = ml; islandArm.R[id] = mr; }
      snapped++;
    }
    console.log(`island-snap: ${groups.size} patches, ${snapped} snapped to their median armness`);
  }
  const aL = (id) => (islandArm && islandArm.L[id] >= 0 ? islandArm.L[id] : armnessL[id]);
  const aR = (id) => (islandArm && islandArm.R[id] >= 0 ? islandArm.R[id] : armnessR[id]);

  // ---------- rigid prop shells ----------
  const rigidVec = new Map(); // shell root -> Map<jointIdx, w>
  if (RIGID) {
    for (const [r, st] of shellStat) {
      if (st.verts < RIGID_MIN_VERTS) continue;
      if (st.verts > RIGID_MAX_FRAC * nW) continue;
      const isOrphan = st.ids.every((id) => !isFinite(gL.dist[id]) && !isFinite(gR.dist[id]) && !isFinite(gC.dist[id]));
      if (!isOrphan && !RIGID_ATTACHED) continue;
      const agg = new Map();
      for (const id of st.ids) { const m = baseW[id]; if (!m) continue; for (const [ji, w] of m) agg.set(ji, (agg.get(ji) || 0) + w); }
      let tot = 0; for (const [, w] of agg) tot += w;
      if (tot <= 0) continue;
      const sorted = [...agg.entries()].sort((a, b) => b[1] - a[1]);
      let vec;
      if (sorted[0][1] / tot >= RIGID_SNAP) vec = new Map([[sorted[0][0], 1]]);
      else { vec = new Map(); for (const [ji, w] of sorted.slice(0, 4)) vec.set(ji, w / tot); }
      rigidVec.set(r, vec);
      stats.rigidShells++; stats.rigidVerts += st.verts;
      console.log(`rigid shell verts=${st.verts} y[${r3(st.min[1])},${r3(st.max[1])}] -> ${[...vec.entries()].map(([ji, w]) => `${jointName[ji]}:${r3(w)}`).join(' ')}`);
    }
  }

  // ---------- rules, per welded vertex ----------
  const outW = new Array(nW);
  const touchedFlag = new Uint8Array(nW);
  const paintVal = PAINT ? new Float32Array(nW) : null;
  for (let id = 0; id < nW; id++) {
    const src = baseW[id];
    if (!src) { outW[id] = new Map(); continue; }
    const rr = uf.find(id);
    if (rigidVec.has(rr)) {
      const rv = rigidVec.get(rr);
      if (RIGID_BLEND >= 1) { outW[id] = new Map(rv); touchedFlag[id] = 1; continue; }
      const m = new Map();
      for (const [ji, w] of src) m.set(ji, w * (1 - RIGID_BLEND));
      for (const [ji, w] of rv) m.set(ji, (m.get(ji) || 0) + w * RIGID_BLEND);
      outW[id] = m; touchedFlag[id] = 1; continue;
    }
    const m = new Map(src);
    const p = [wx[id], wy[id], wz[id]];
    const armnL = aL(id), armnR = aR(id);
    let stripSum = 0, touched = false;

    if (armnL >= 0 && armnR >= 0) {
      // ---- rule S: side-wise geodesic strip
      for (const [ji, w] of [...m.entries()]) {
        if (w <= 0) continue;
        const n = jointName[ji];
        if (!ARM_SET.has(n)) continue;
        if (SHOULDER.has(n) && !STRIP_SHOULDER) continue;
        const a = n.startsWith('Left') ? armnL : armnR;
        if (a >= KEEP_ABOVE) continue;
        const move = w * (1 - a) * STRIP_GAIN;
        if (move <= 1e-4) continue;
        m.set(ji, w - move); stripSum += move;
        stats.stripMass += move; addMass(stats.movedFrom, n, move);
        touched = true;
      }
      if (touched) stats.stripVerts++;

      // ---- rule K: reverse claim (core weight on real arm surface)
      if (CLAIM_GAIN > 0) {
        const a = Math.max(armnL, armnR);
        let vArmW = 0;
        if (CLAIM_MIN_ARMW > 0) {
          const pre = armnL >= armnR ? 'Left' : 'Right';
          for (const [ji, w] of m) { const n = jointName[ji]; if (w > 0 && ARM_SET.has(n) && !SHOULDER.has(n) && n.startsWith(pre)) vArmW += w; }
        }
        // the rig asserts no arm attachment here at all -> never claim
        const armAsserted = !(CLAIM_MIN_ARMW > 0 && vArmW < CLAIM_MIN_ARMW);
        let dOwnArm = 0, dCoreV = Infinity;
        if (isFinite(CLAIM_MAX_DIST) || CLAIM_CORE_GUARD) {
          dOwnArm = Infinity;
          const pre = armnL >= armnR ? 'Left' : 'Right';
          for (const [k, seg] of armSeg) { if (!k.startsWith(pre)) continue; dOwnArm = Math.min(dOwnArm, distToSeg(p, seg[0], seg[1])); }
          if (CLAIM_CORE_GUARD) for (const c of coreSeg.values()) dCoreV = Math.min(dCoreV, distToSeg(p, c.seg[0], c.seg[1]));
        }
        if (armAsserted && a >= CLAIM_MIN && dOwnArm <= CLAIM_MAX_DIST && (!CLAIM_CORE_GUARD || dOwnArm < dCoreV)) {
          const useL = armnL >= armnR;
          const lab = useL ? gL.label[id] : gR.label[id];
          if (lab >= 0) {
            const f = CLAIM_GAIN * clamp01((a - CLAIM_MIN) / Math.max(1e-6, 1 - CLAIM_MIN));
            let claimed = 0;
            for (const [ji, w] of [...m.entries()]) {
              if (w <= 0) continue;
              const n = jointName[ji];
              if (!CLAIM_SOURCES.has(n)) continue;
              const move = w * f;
              if (move <= 1e-4) continue;
              m.set(ji, w - move); claimed += move;
              stats.claimMass += move; addMass(stats.movedFrom, n, move);
              touched = true;
            }
            if (claimed > 0) {
              m.set(lab, (m.get(lab) || 0) + claimed);
              addMass(stats.movedTo, jointName[lab], claimed);
              stats.claimVerts++;
              if (paintVal && PAINT === 'claim') paintVal[id] = Math.min(1, claimed);
            }
          }
        }
      }
    }

    // ---- redistribute stripped mass
    if (stripSum > 0) {
      let receivers = [];
      if (REDIST === 'proportional') {
        receivers = [...m.entries()].filter(([ji, w]) => {
          const n = jointName[ji];
          if (w <= 1e-7 || ARM_SET.has(n) || n === 'neck' || n === 'Neck' || n === 'Head') return false;
          const h = head[ji];
          return h && Math.abs(h[1] - p[1]) <= REDIST_HEIGHT;
        });
      }
      const rsum = receivers.reduce((s, [, w]) => s + w, 0);
      if (rsum > 1e-6) {
        for (const [ji, w] of receivers) { m.set(ji, w + stripSum * w / rsum); addMass(stats.movedTo, jointName[ji], stripSum * w / rsum); }
      } else {
        // topological owner: the core bone the CORE geodesic came from
        let tgt = gC.label[id];
        if (tgt < 0 || !isFinite(gC.dist[id])) {
          // fall back to nearest spine bone by height
          let bd = Infinity, bi = jidx.get('Hips') ?? 0;
          for (const n of ['Spine02', 'Spine01', 'Spine', 'Hips']) {
            const i = jidx.get(n); if (i === undefined) continue;
            const d = Math.abs(head[i][1] - p[1]); if (d < bd) { bd = d; bi = i; }
          }
          tgt = bi;
        }
        if (REDIST_LEGS === 'hips' && LEG_BONES.has(jointName[tgt])) tgt = jidx.get('Hips') ?? tgt;
        m.set(tgt, (m.get(tgt) || 0) + stripSum);
        addMass(stats.movedTo, jointName[tgt], stripSum);
      }
    }
    if (touched) { touchedFlag[id] = 1; stats.touched++; }
    if (paintVal) {
      if (PAINT === 'armness') paintVal[id] = Math.max(0, Math.max(armnL, armnR));
      else if (PAINT === 'strip') paintVal[id] = Math.min(1, stripSum);
    }
    outW[id] = m;
  }

  // ---------- rule D: diffusion over the surface ----------
  if (SMOOTH_ITERS > 0) {
    let active = new Uint8Array(nW);
    if (SMOOTH_REGION === 'band') {
      for (let id = 0; id < nW; id++) {
        const a = Math.max(armnessL[id], armnessR[id]);
        active[id] = (a > SMOOTH_LO && a < SMOOTH_HI) ? 1 : 0;
      }
    } else if (SMOOTH_REGION === 'armzone') {
      for (let id = 0; id < nW; id++) {
        const p = [wx[id], wy[id], wz[id]];
        let d = Infinity;
        for (const [, seg] of armSeg) { d = Math.min(d, distToSeg(p, seg[0], seg[1])); if (d < SMOOTH_DIST) break; }
        active[id] = d < SMOOTH_DIST ? 1 : 0;
      }
    } else {
      for (let id = 0; id < nW; id++) active[id] = touchedFlag[id];
    }
    for (let ring = 0; ring < SMOOTH_RINGS; ring++) {
      const next = active.slice();
      for (let u = 0; u < nW; u++) {
        if (!active[u]) continue;
        for (let e = csrStart[u]; e < csrStart[u + 1]; e++) next[csrTo[e]] = 1;
      }
      active = next;
    }
    let cnt = 0; for (let id = 0; id < nW; id++) if (active[id]) cnt++;
    stats.smoothVerts = cnt;
    if (paintVal && PAINT === 'smooth') for (let id = 0; id < nW; id++) paintVal[id] = active[id] ? 1 : 0;
    for (let it = 0; it < SMOOTH_ITERS; it++) {
      const nextW = new Array(nW);
      for (let u = 0; u < nW; u++) {
        if (!active[u] || !outW[u] || outW[u].size === 0) { nextW[u] = outW[u]; continue; }
        const acc = new Map();
        let nb = 0;
        for (let e = csrStart[u]; e < csrStart[u + 1]; e++) {
          const v = csrTo[e];
          const mv = outW[v]; if (!mv || mv.size === 0) continue;
          nb++;
          for (const [ji, w] of mv) acc.set(ji, (acc.get(ji) || 0) + w);
        }
        if (nb === 0) { nextW[u] = outW[u]; continue; }
        const m = new Map();
        for (const [ji, w] of outW[u]) m.set(ji, w * (1 - SMOOTH_LAMBDA));
        for (const [ji, w] of acc) m.set(ji, (m.get(ji) || 0) + SMOOTH_LAMBDA * w / nb);
        nextW[u] = m;
      }
      for (let u = 0; u < nW; u++) outW[u] = nextW[u];
    }
  }

  // ---------- write back to every instance ----------
  if (!DRY) {
    const seen = new Set();
    prims.forEach((pr, pi) => {
      const jAcc = pr.getAttribute('JOINTS_0'), wAcc = pr.getAttribute('WEIGHTS_0');
      if (seen.has(jAcc)) return;
      seen.add(jAcc);
      if (pr.getAttribute('JOINTS_1')) console.warn('warning: JOINTS_1 present, only set 0 is repaired');
      const count = pr.getAttribute('POSITION').getCount();
      const rep = primRep[pi];
      const newJ = new (jAcc.getArray().constructor)(count * 4);
      const newW = new Float32Array(count * 4);
      for (let vi = 0; vi < count; vi++) {
        const m = outW[rep[vi]] || new Map();
        const entries = [...m.entries()].filter(([, w]) => w > 1e-7).sort((a, b) => b[1] - a[1]);
        if (entries.length > 4) { for (let k = 4; k < entries.length; k++) stats.droppedMass += entries[k][1]; entries.length = 4; }
        let sum = entries.reduce((s, [, w]) => s + w, 0);
        if (sum <= 0) { entries.length = 0; entries.push([jidx.get('Hips') ?? 0, 1]); sum = 1; }
        for (let s = 0; s < 4; s++) {
          newJ[vi*4+s] = s < entries.length ? entries[s][0] : 0;
          newW[vi*4+s] = s < entries.length ? entries[s][1] / sum : 0;
        }
      }
      jAcc.setArray(newJ);
      wAcc.setArray(newW);
      wAcc.setNormalized(false);
    });

    // diagnostic heat map: COLOR_0 + flat white material so the field is what
    // you see. Blue 0 -> green 0.5 -> red 1.
    if (paintVal) {
      const buf = root.listBuffers()[0];
      prims.forEach((pr, pi) => {
        const count = pr.getAttribute('POSITION').getCount();
        const rep = primRep[pi];
        const col = new Float32Array(count * 4);
        for (let vi = 0; vi < count; vi++) {
          const v = Math.max(0, Math.min(1, paintVal[rep[vi]]));
          const r = v < 0.5 ? 0 : (v - 0.5) * 2;
          const g = v < 0.5 ? v * 2 : 1 - (v - 0.5) * 2;
          const b = v < 0.5 ? 1 - v * 2 : 0;
          col[vi*4] = r; col[vi*4+1] = g; col[vi*4+2] = b; col[vi*4+3] = 1;
        }
        const acc = doc.createAccessor().setType('VEC4').setArray(col).setBuffer(buf);
        pr.setAttribute('COLOR_0', acc);
        const mat = pr.getMaterial();
        if (mat) {
          mat.setBaseColorTexture(null);
          mat.setBaseColorFactor([1, 1, 1, 1]);
          mat.setMetallicRoughnessTexture(null);
          mat.setMetallicFactor(0); mat.setRoughnessFactor(1);
          mat.setEmissiveTexture(null); mat.setEmissiveFactor([0, 0, 0]);
          mat.setNormalTexture(null); mat.setOcclusionTexture(null);
        }
      });
    }
  }
}

if (ANALYZE || STRETCH) process.exit(0);

// ---------- report ----------
console.log(`\n=== reweight_topo ${basename(INPUT)} ===`);
console.log(`band=${BAND} bias=${BIAS} strip-gain=${STRIP_GAIN} claim-gain=${CLAIM_GAIN} claim-min=${CLAIM_MIN} keep-above=${KEEP_ABOVE} seed-radius=${SEED_R} core-seed-radius=${CORE_SEED_R} seed-mass=${SEED_MASS} island=${ISLAND_MODE} rigid=${RIGID} smooth=${SMOOTH_ITERS}x${SMOOTH_LAMBDA}/${SMOOTH_RINGS} redist=${REDIST}`);
console.log(`vertices: ${stats.verts} instances / ${stats.welded} welded, ${stats.touched} welded touched (${(100*stats.touched/Math.max(1,stats.welded)).toFixed(1)}%)`);
console.log(`  rule S (geodesic strip): ${stats.stripVerts} verts, mass ${r3(stats.stripMass)}`);
console.log(`  rule K (geodesic claim): ${stats.claimVerts} verts, mass ${r3(stats.claimMass)}`);
console.log(`  rule P (rigid shells):   ${stats.rigidShells} shells, ${stats.rigidVerts} verts`);
console.log(`  rule D (diffusion):      ${stats.smoothVerts} verts in the active zone`);
console.log(`  dropped mass (slot overflow): ${r3(stats.droppedMass)}`);
console.log('moved FROM:', Object.fromEntries(Object.entries(stats.movedFrom).map(([k, v]) => [k, r3(v)])));
console.log('moved TO:  ', Object.fromEntries(Object.entries(stats.movedTo).map(([k, v]) => [k, r3(v)])));

if (DRY) { console.log('dry run: no file written'); process.exit(0); }

mkdirSync(dirname(OUT), { recursive: true });
await io.write(OUT, doc);
console.log(`wrote ${OUT}`);

// ---------- validate ----------
if (PAINT) { console.log('paint mode: DIAGNOSTIC output, materials/attributes deliberately altered — never ship this file'); process.exit(0); }
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
{
  let bad = 0;
  for (const mesh of doc2.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const w = prim.getAttribute('WEIGHTS_0');
      if (!w) continue;
      const el = [];
      for (let i = 0; i < w.getCount(); i++) { w.getElement(i, el); if (Math.abs(el.reduce((x, y) => x + y, 0) - 1) > 1e-3) bad++; }
    }
  }
  if (bad === 0) console.log('  PASS weight sums normalized');
  else { console.log(`  FAIL ${bad} vertices with weight sum != 1`); ok = false; }
}
console.log(ok ? 'VALIDATION PASS' : 'VALIDATION FAIL');
process.exit(ok ? 0 : 1);
