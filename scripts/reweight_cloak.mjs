#!/usr/bin/env node
// reweight_cloak.mjs — repair Meshy auto-rig skin-weight bleed on CR hero bodies.
// v2: per-segment arm radii + connected-component strip/keep decisions.
//
// Failure directions fixed here:
//   A) cloak/robe/skirt vertices carrying ARM-chain weights far from the arm
//      segment -> weight moves to the nearest of Spine02/Spine01/Spine/Hips by
//      vertex height. ("wings" when arms swing)
//   B) arm-geometry vertices hugging an arm segment but carrying torso/leg
//      weights (Hips/Spine*/UpLeg/Leg) -> weight moves to the owning joint of
//      the nearest distal arm segment. ("arms glued to hips/legs")
//   H) Hand-bone weights on vertices below the hips (and NOT hugging the hand
//      stub) -> Hips. (hands-glued-to-hips geometry)
//   C) NEW: whole-component strip. Round 1 stripped PART of connected cloth
//      pieces (the assassin's torn strip). Now vertex adjacency is built from
//      triangle indices (positions welded within 1e-5 so split-normal seams
//      don't break pieces) and every strip/keep decision is made for the WHOLE
//      component: a component whose arm-weighted vertices are mostly INSIDE
//      the segment radii (a sleeve, a held prop) keeps its arm weights; mostly
//      OUTSIDE (cloak panel, skirt piece, pouch) strips entirely to the
//      nearest torso bone. The LARGEST component (the body itself) legitimately
//      mixes real arm geometry and bled cloth, so it always uses the
//      per-vertex rules.
//      Meshy bodies are usually ONE watertight shell with a smooth weight
//      field, so the same decision is repeated one level down: the anchored
//      arm surface (verts within anchor-radius of the arm bones) always uses
//      per-vertex rules, and connected ISLANDS of the REMAINING arm-weighted
//      vertices (distal arm mass > 0.05, adjacency from triangle indices) are
//      each a bled cloth patch — cloth only reaches the arm THROUGH the arm
//      surface, so removing that surface separates the patches. Every island
//      keeps or strips AS A WHOLE by the same majority test — no more strip
//      boundaries through the middle of a hanging strip.
//
// Order per vertex: B, then X, then A/C, then H, then one renormalize.
// Never writes in place. Never touches animation or texture accessors — and
// proves it by hashing them before/after.
//
//   node scripts/reweight_cloak.mjs --input <glb> [--out <glb>] \
//     [--radius-upper 0.08] [--radius-fore 0.12] [--radius-b 0.03] [--dry-run]
//
// FLAGS
//   --radius-upper 0.08   rule-A strip radius for the UPPER arm (LeftArm/RightArm
//                         joints, segment Arm->ForeArm). Round 1's single radius
//                         left the upper arm attached because that segment hugs
//                         the torso; keep this tight.
//   --radius-fore 0.12    rule-A strip radius for the forearm (ForeArm joints).
//   --radius-a            LEGACY alias: sets --radius-fore default if given.
//   --radius-b 0.03       rule-B claim radius (reverse direction, mostly disabled).
//   --radius-shoulder 0   shoulder strip radius; 0 = shoulders never stripped.
//   --radius-hand 0.20    rule-A radius for hand influences (fingers/claws;
//                         raise to 0.25-0.30 for long claws).
//   --hand-keep 0.10      rule-H keep radius around the hand stub (raise to
//                         0.14-0.16 for weapon carriers or held props get pinned).
//   --droop-ratio 0.5     droop exemption: cloth/weapons hanging BELOW an arm
//                         bone are legitimately arm-weighted.
//   --skirt-below 0.12    below hips-minus-this, only dominant arm weights strip.
//   --below-hips-min-w 0.6  the dominance threshold for the skirt exemption.
//   --b-min-mass 0.5      rule B only fires on torso/leg-DOMINANT vertices.
//   --feather 0.10        strip ramp width: stripped fraction goes 0 -> 1 from
//                         the keep radius to radius+feather (and across the
//                         core-guard crossover). Binary strips tear smooth
//                         hand/thigh blend zones; the ramp leaves no seam.
//   --no-cross-strip      disable rule X (cross-body arm pair strip).
//   --no-core-guard       disable the core-competition guard.
//   --no-components       disable component logic (round-1 per-vertex everywhere).
//   --comp-keep-frac 0.6  component/island KEEPS arm weights when >= this
//                         fraction of its arm-weighted verts are inside the
//                         segment radii; below it the whole piece strips.
//                         (0.6 not 0.5: the wizard's waist patch sat at 51%
//                         inside and still pulled the skirt.)
//   --comp-x-frac 0.25    cross-pair veto: a piece with >= this fraction of
//                         cross-body-paired verts strips regardless of inside
//                         fraction (wizard/witch_doctor skirts are ~30-47%
//                         cross-paired; real sleeves are 0%).
//   --comp-major-frac 0.5 components holding >= this fraction of all skinned
//                         verts also use per-vertex rules (the largest always does).
//   --anchor-radius 0.07  a vertex this close to an arm bone is real arm
//                         surface: per-vertex rules, excluded from islands.
//   --anchor-mass 2       verts with >= this much distal arm mass ALSO anchor
//                         when inside any segment's keep radius. DEFAULT 2 =
//                         disabled: proportional redistribution already keeps
//                         stripped surfaces moving with their remaining blend,
//                         and mass-anchoring made the assassin's coat front
//                         follow the hand as a rigid slab. Enable per-body
//                         (0.7) only if real arm surface is being stripped.
//                         Cross-paired verts never anchor.
//
// Stripped mass is redistributed PROPORTIONALLY to the vertex's remaining
// non-arm influences (Hips:UpLeg ratio preserved on thigh flesh, etc.);
// the nearest spine bone by height is only the fallback for pure-arm verts.
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
const RADIUS_UPPER = Number(arg('radius-upper', 0.08)); // upper arm (Arm joints): tight, it hugs the torso
const RADIUS_FORE = Number(arg('radius-fore', arg('radius-a', 0.12))); // forearm (ForeArm joints)
const RADIUS_B = Number(arg('radius-b', 0.03)); // dir B: vertex closer than this to a distal arm segment -> claim torso/leg weight
// Shoulder weights spread wide on GOOD bodies too (warlock/paladin have identical
// shoulder profiles) and shoulders barely rotate in the clips; 0 = never strip them.
const RADIUS_SH = Number(arg('radius-shoulder', 0));
// Rule A radius for HAND influences: fingers/claws extend well past the hand
// stub on many bodies; stripping them pins fingertips to the spine (needle
// artifacts when hands move). Default is looser than the arm radii.
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
// component logic
const COMPONENTS = !arg('no-components', false);
const COMP_KEEP_FRAC = Number(arg('comp-keep-frac', 0.6));
const COMP_X_FRAC = Number(arg('comp-x-frac', 0.25));
const COMP_MAJOR_FRAC = Number(arg('comp-major-frac', 0.5));
const ANCHOR_R = Number(arg('anchor-radius', 0.07));
// Mass-based anchoring is OFF by default (2 is unreachable): with proportional
// redistribution the arm surface keeps its blend anyway, and mass-anchoring
// made the assassin's coat front follow the hand as a rigid slab. Enable
// per-body (e.g. 0.7) only if a render shows real arm surface being stripped.
const ANCHOR_MASS = Number(arg('anchor-mass', 2));
const ARM_VERT_MIN = 0.05; // a vertex counts as arm-weighted above this mass
// FEATHER: strips are RAMPED, not binary. The stripped fraction of an arm
// influence rises linearly from 0 at the keep radius to 1 at radius+feather
// (and similarly past the core-guard crossover). Binary strips tore every
// smooth hand->thigh blend zone SOMEWHERE no matter the threshold (druid's
// stretched hand); a ramp leaves no seam. Cross-paired verts always strip fully.
const FEATHER = Number(arg('feather', 0.10));
// --redist proportional : stripped mass joins the vertex's remaining non-arm
//                         influences in their existing ratio (skin blend zones:
//                         thigh flesh keeps Hips:UpLeg — the default).
// --redist height       : stripped mass goes to the nearest spine bone by
//                         height (cloth: a coat panel must NOT inherit the
//                         thigh's UpLeg partial and ride the walking leg).
const REDIST = String(arg('redist', 'proportional'));
// --debug-box x0,x1,y0,y1,z0,z1 : log rule attribution for touched verts inside
const DEBUG_BOX = (() => { const v = arg('debug-box'); return v ? v.split(',').map(Number) : null; })();
let debugPrints = 0;
const OUT = arg('out', join('/tmp/rw_out', basename(INPUT, '.glb') + '.reweighted.glb'));

const ARM_CHAIN = {
  LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand',
  RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand',
};
const HAND = new Set(['LeftHand', 'RightHand']);
const UPPER = new Set(['LeftArm', 'RightArm']);
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

// ---------- union-find ----------
class UF {
  constructor(n) { this.p = new Int32Array(n); for (let i = 0; i < n; i++) this.p[i] = i; }
  find(x) {
    let r = x;
    while (this.p[r] !== r) r = this.p[r];
    while (this.p[x] !== r) { const nx = this.p[x]; this.p[x] = r; x = nx; }
    return r;
  }
  union(a, b) { a = this.find(a); b = this.find(b); if (a !== b) this.p[b] = a; }
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
  verts: 0, touched: 0, ruleA: 0, ruleB: 0, ruleH: 0, ruleX: 0, ruleC: 0,
  movedFrom: {}, movedTo: {}, massA: 0, massB: 0, massH: 0, massX: 0, massC: 0, droppedMass: 0,
  comps: 0, compsKept: 0, compsStripped: 0, compsPerVertex: 0, compsNoArm: 0,
  islands: 0, islandsKept: 0, islandsStripped: 0,
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

  // per-segment radius for an arm influence
  const radiusFor = (name) => {
    if (name === 'LeftShoulder' || name === 'RightShoulder') return RADIUS_SH;
    if (HAND.has(name)) return Math.max(RADIUS_HAND, RADIUS_FORE);
    if (UPPER.has(name)) return RADIUS_UPPER;
    return RADIUS_FORE;
  };

  // would per-vertex rule A strip this influence? (shared by classification + application)
  const wouldStripA = (p, name, w, dCore) => {
    const isShoulder = name === 'LeftShoulder' || name === 'RightShoulder';
    if (isShoulder && RADIUS_SH <= 0) return false; // shoulders untouched by default
    const seg = armSeg.get(name);
    if (!seg) return false;
    const off = segOffset(p, seg[0], seg[1]);
    // droop exemption: hanging below the bone (sleeve/robe/weapon) is legit
    if (off.vy < 0 && -off.vy >= DROOP_RATIO * off.vh) return false;
    const d = off.d3;
    const radius = radiusFor(name);
    // far from the bone (wing cloth), respecting the below-hips skirt
    // exemption for non-dominant weights...
    const farStrip = d > radius && (p[1] > hipsY - SKIRT_BELOW || w > BELOW_W);
    // ...or hugging the body core harder than the arm (waist panels,
    // hip-glued hand cloth) at any distance
    const coreStrip = !isShoulder && CORE_GUARD && dCore < d;
    return farStrip || coreStrip;
  };

  const prims = mesh.listPrimitives().filter((pr) =>
    pr.getAttribute('POSITION') && pr.getAttribute('JOINTS_0') && pr.getAttribute('WEIGHTS_0'));

  // weight scale per accessor (raw normalized ints vs floats)
  const wScaleOf = new Map();
  const getScale = (wAcc) => {
    if (wScaleOf.has(wAcc)) return wScaleOf.get(wAcc);
    let wScale = 1;
    const probe = [];
    const n = Math.min(wAcc.getCount(), 200);
    const el = [];
    for (let i = 0; i < n; i++) { wAcc.getElement(i, el); probe.push(el.reduce((s, v) => s + v, 0)); }
    probe.sort((a, b) => a - b);
    const med = probe[probe.length >> 1];
    if (med > 100 && med < 400) wScale = 255;
    else if (med > 30000) wScale = 65535;
    if (wScale !== 1) console.log(`weights are normalized ints (scale ${wScale}); converting to float32`);
    wScaleOf.set(wAcc, wScale);
    return wScale;
  };

  // ---------- component build: weld positions, union triangle edges ----------
  let compDecision = null; // Map<rootId, 'keep'|'strip'|'pervertex'|'none'> keyed by shell-UF root
  let islDecision = null; // Map<rootId, 'keep'|'strip'|'pervertex'> keyed by island-UF root
  let primRep = null; // per prim: Int32Array vi -> welded vertex id
  let uf = null;
  let iuf = null;
  if (COMPONENTS && prims.length > 0) {
    const weldId = new Map();
    let nextId = 0;
    primRep = [];
    const e = [];
    for (const pr of prims) {
      const pos = pr.getAttribute('POSITION');
      const n = pos.getCount();
      const rep = new Int32Array(n);
      for (let i = 0; i < n; i++) {
        pos.getElement(i, e);
        const k = `${Math.round(e[0] * 1e5)},${Math.round(e[1] * 1e5)},${Math.round(e[2] * 1e5)}`;
        let id = weldId.get(k);
        if (id === undefined) { id = nextId++; weldId.set(k, id); }
        rep[i] = id;
      }
      primRep.push(rep);
    }
    uf = new UF(nextId);
    prims.forEach((pr, pi) => {
      const rep = primRep[pi];
      const idx = pr.getIndices();
      if (idx) {
        const ia = idx.getArray();
        for (let t = 0; t + 2 < ia.length; t += 3) {
          uf.union(rep[ia[t]], rep[ia[t + 1]]);
          uf.union(rep[ia[t + 1]], rep[ia[t + 2]]);
        }
      } else {
        for (let t = 0; t + 2 < rep.length; t += 3) {
          uf.union(rep[t], rep[t + 1]);
          uf.union(rep[t + 1], rep[t + 2]);
        }
      }
    });

    // classification pass: per WELDED vertex, flags for arm mass, would-strip,
    // cross-pairing and arm-surface anchoring. Duplicated instances (seam
    // splits) collapse onto one welded id.
    const F_SEEN = 1, F_ARM = 2, F_OUT = 4, F_X = 8, F_ANCHOR = 16;
    const vflags = new Uint8Array(nextId);
    const classified = new Set();
    const p = [], je = [], we = [];
    prims.forEach((pr, pi) => {
      const jAcc = pr.getAttribute('JOINTS_0');
      if (classified.has(jAcc)) return;
      classified.add(jAcc);
      const pos = pr.getAttribute('POSITION');
      const wAcc = pr.getAttribute('WEIGHTS_0');
      const wScale = getScale(wAcc);
      const rep = primRep[pi];
      const count = pos.getCount();
      for (let vi = 0; vi < count; vi++) {
        const id = rep[vi];
        if (vflags[id] & F_SEEN) continue;
        let f = F_SEEN;
        pos.getElement(vi, p);
        jAcc.getElement(vi, je);
        wAcc.getElement(vi, we);
        let dCore = Infinity;
        let armMass = 0, keepMass = 0, stripMass = 0;
        let computedCore = false;
        let hasL = false, hasR = false;
        for (let s = 0; s < 4; s++) {
          const w = (we[s] || 0) / wScale;
          if (w <= 0) continue;
          const name = jointName[je[s]];
          if (!ARM_SET.has(name) || name.endsWith('Shoulder')) continue; // shoulders never strip; islands track DISTAL arm mass
          armMass += w;
          if (w > 0.05) {
            if (name.startsWith('Left')) hasL = true; else if (name.startsWith('Right')) hasR = true;
          }
          if (!computedCore) {
            for (const [a, b] of coreSegs) dCore = Math.min(dCore, distToSeg(p, a, b));
            computedCore = true;
          }
          let strip = wouldStripA(p, name, w, dCore);
          // rule H also counts as stripworthy: hand weight below the hips, off
          // the hand stub, not drooping (a below-hips hand-bleed island must
          // not classify as "inside" via the skirt exemption)
          if (!strip && HAND.has(name) && p[1] < hipsY - 0.05) {
            const seg = armSeg.get(name);
            const off = seg ? segOffset(p, seg[0], seg[1]) : { d3: Infinity, vy: 0, vh: 1 };
            const droop = off.vy < 0 && -off.vy >= DROOP_RATIO * off.vh;
            if (!droop && off.d3 > HAND_KEEP) strip = true;
          }
          if (strip) stripMass += w; else keepMass += w;
        }
        if (armMass > ARM_VERT_MIN) {
          f |= F_ARM;
          if (stripMass > keepMass) f |= F_OUT;
          if (hasL && hasR) f |= F_X;
          // anchored = sits on the arm surface itself (not just bled cloth).
          // Geometric core (< anchor-radius of a bone) OR arm-DOMINANT mass
          // inside ANY segment's keep radius: thick forearms/vambraces sit
          // 0.07-0.12 off the bone axis, and att1 proved that leaving them
          // islandable lets a mostly-outside island strip REAL arm surface
          // (druid/amazon/blood_knight forearms pinned at the hips). ANY
          // segment, not the nearest: hand cloth often sits marginally closer
          // to the forearm bone than to the hand stub, and the nearest-only
          // test un-anchored it (druid att2 tore the left-hand cuff off).
          // Droop-exempt cloth far from every bone stays islandable — hanging
          // cloak panels must keep whole-piece decisions.
          // Cross-paired verts never anchor: no real surface serves two arms.
          if (!(hasL && hasR)) {
            for (const [owner, seg] of armSeg) {
              const d = distToSeg(p, seg[0], seg[1]);
              const rad = owner.endsWith('Shoulder') ? RADIUS_UPPER : radiusFor(owner);
              if (d < ANCHOR_R || (armMass >= ANCHOR_MASS && d < rad)) { f |= F_ANCHOR; break; }
            }
          }
        }
        vflags[id] = f;
      }
    });

    // ---- level 1: detached-shell decisions
    const compStat = new Map(); // shell root -> { verts, armVerts, inCnt, outCnt, xCnt }
    for (let id = 0; id < nextId; id++) {
      const rootId = uf.find(id);
      let st = compStat.get(rootId);
      if (!st) { st = { verts: 0, armVerts: 0, inCnt: 0, outCnt: 0, xCnt: 0 }; compStat.set(rootId, st); }
      st.verts++;
      if (vflags[id] & F_ARM) {
        st.armVerts++;
        if (vflags[id] & F_OUT) st.outCnt++; else st.inCnt++;
        if (vflags[id] & F_X) st.xCnt++;
      }
    }
    let totalVerts = 0, largestRoot = -1, largestVerts = -1;
    for (const [rootId, st] of compStat) {
      totalVerts += st.verts;
      if (st.verts > largestVerts) { largestVerts = st.verts; largestRoot = rootId; }
    }
    compDecision = new Map();
    const diag = [];
    for (const [rootId, st] of compStat) {
      let d;
      if (rootId === largestRoot || st.verts >= COMP_MAJOR_FRAC * totalVerts) d = 'pervertex';
      else if (st.armVerts === 0) d = 'none';
      else {
        const insideFrac = st.inCnt / st.armVerts;
        const xFrac = st.xCnt / st.armVerts;
        // cross-body-paired components are bleed no matter how "inside" they sit
        d = (insideFrac >= COMP_KEEP_FRAC && xFrac < COMP_X_FRAC) ? 'keep' : 'strip';
      }
      compDecision.set(rootId, d);
      stats.comps++;
      if (d === 'keep') stats.compsKept++;
      else if (d === 'strip') stats.compsStripped++;
      else if (d === 'pervertex') stats.compsPerVertex++;
      else stats.compsNoArm++;
      if (st.armVerts > 0) diag.push({ rootId, ...st, insideFrac: st.inCnt / st.armVerts, d });
    }
    diag.sort((a, b) => b.verts - a.verts);
    console.log(`components: ${stats.comps} total (largest ${largestVerts}/${totalVerts} welded verts) — ${stats.compsPerVertex} per-vertex, ${stats.compsKept} kept, ${stats.compsStripped} stripped, ${stats.compsNoArm} no-arm`);
    for (const c of diag.slice(0, 15)) {
      console.log(`  shell verts=${c.verts} armVerts=${c.armVerts} inside=${(100 * c.insideFrac).toFixed(0)}% cross=${(100 * c.xCnt / c.armVerts).toFixed(0)}% -> ${c.d}`);
    }
    if (diag.length > 15) console.log(`  ... ${diag.length - 15} more arm-weighted shells`);

    // ---- level 2: arm-weight ISLANDS inside per-vertex shells.
    // Meshy bodies are one watertight shell and their weight fields are smooth,
    // so "all arm-weighted verts" is one blob spanning arm+bleed. The cut that
    // isolates bled cloth: EXCLUDE the anchored arm surface from the island
    // graph. Bled cloth connects to the arm only THROUGH the arm surface, so
    // each bled patch (back cloak strip, skirt panel, waist cloth) becomes its
    // own island and keeps or strips AS A WHOLE. The anchored arm surface
    // itself always uses per-vertex rules.
    iuf = new UF(nextId);
    const islandable = (a) => (vflags[a] & F_ARM) && !(vflags[a] & F_ANCHOR);
    prims.forEach((pr, pi) => {
      const rep = primRep[pi];
      const idx = pr.getIndices();
      const link = (a, b) => { if (islandable(a) && islandable(b)) iuf.union(a, b); };
      if (idx) {
        const ia = idx.getArray();
        for (let t = 0; t + 2 < ia.length; t += 3) {
          const a = rep[ia[t]], b = rep[ia[t + 1]], c = rep[ia[t + 2]];
          link(a, b); link(b, c); link(a, c);
        }
      } else {
        for (let t = 0; t + 2 < rep.length; t += 3) {
          const a = rep[t], b = rep[t + 1], c = rep[t + 2];
          link(a, b); link(b, c); link(a, c);
        }
      }
    });
    const islStat = new Map(); // island root -> { verts, inCnt, outCnt, xCnt }
    for (let id = 0; id < nextId; id++) {
      if (!islandable(id)) continue;
      if (compDecision.get(uf.find(id)) !== 'pervertex') continue; // shell decision wins
      const r = iuf.find(id);
      let st = islStat.get(r);
      if (!st) { st = { verts: 0, inCnt: 0, outCnt: 0, xCnt: 0 }; islStat.set(r, st); }
      st.verts++;
      if (vflags[id] & F_OUT) st.outCnt++; else st.inCnt++;
      if (vflags[id] & F_X) st.xCnt++;
    }
    islDecision = new Map();
    const idiag = [];
    for (const [r, st] of islStat) {
      const insideFrac = st.inCnt / st.verts;
      const xFrac = st.xCnt / st.verts;
      const d = (insideFrac >= COMP_KEEP_FRAC && xFrac < COMP_X_FRAC) ? 'keep' : 'strip';
      islDecision.set(r, d);
      stats.islands++;
      if (d === 'keep') stats.islandsKept++; else stats.islandsStripped++;
      idiag.push({ r, ...st, d });
    }
    idiag.sort((a, b) => b.verts - a.verts);
    console.log(`islands (unanchored arm-weight patches in per-vertex shells): ${stats.islands} — ${stats.islandsKept} kept whole, ${stats.islandsStripped} stripped whole`);
    for (const c of idiag.filter((x) => x.verts >= 20).slice(0, 25)) {
      console.log(`  island verts=${c.verts} inside=${(100 * c.inCnt / c.verts).toFixed(0)}% cross=${(100 * c.xCnt / c.verts).toFixed(0)}% -> ${c.d}`);
    }
  }

  // ---------- application pass ----------
  prims.forEach((prim, pi) => {
    const pos = prim.getAttribute('POSITION');
    const jAcc = prim.getAttribute('JOINTS_0');
    const wAcc = prim.getAttribute('WEIGHTS_0');
    if (seenAccessors.has(jAcc)) return;
    seenAccessors.add(jAcc);
    if (prim.getAttribute('JOINTS_1')) console.warn('warning: JOINTS_1 present, only set 0 is repaired');

    const wScale = getScale(wAcc);
    const count = pos.getCount();
    const p = [], je = [], we = [];
    const newJ = new (jAcc.getArray().constructor)(count * 4);
    const newW = new Float32Array(count * 4);

    for (let vi = 0; vi < count; vi++) {
      stats.verts++;
      pos.getElement(vi, p);
      jAcc.getElement(vi, je);
      wAcc.getElement(vi, we);
      // effective decision: detached-shell verdict first; inside a per-vertex
      // shell, the arm-weight island verdict (if the vertex is in one)
      let comp = 'pervertex';
      if (compDecision) {
        const id = primRep[pi][vi];
        comp = compDecision.get(uf.find(id)) ?? 'pervertex';
        if (comp === 'pervertex' && islDecision) {
          const isl = islDecision.get(iuf.find(id));
          if (isl) comp = isl;
        }
      }
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
      let touched = false, hitA = false, hitB = false, hitH = false, hitX = false, hitC = false;
      let stripSum = 0; // arm mass collected by X/A/C/H, redistributed once below
      let dCore = Infinity;
      for (const [a, b] of coreSegs) dCore = Math.min(dCore, distToSeg(p, a, b));

      const nearestSpine = () => {
        let best = spineTargets[0], bd = Infinity;
        for (const t of spineTargets) { const dd = Math.abs(p[1] - t.y); if (dd < bd) { bd = dd; best = t; } }
        return best;
      };

      // feathered strip fraction for an arm influence: 0 inside the keep
      // radius, ramping to 1 at radius+feather; the core-guard crossover
      // (closer to the body core than to the arm) ramps the same way.
      const stripFraction = (name) => {
        const seg = armSeg.get(name);
        if (!seg) return 1;
        const d = distToSeg(p, seg[0], seg[1]);
        const R = radiusFor(name);
        const ff = Math.min(1, Math.max(0, (d - R) / FEATHER));
        const cf = CORE_GUARD ? Math.min(1, Math.max(0, (d - dCore) / FEATHER)) : 0;
        return Math.max(ff, cf);
      };
      // cross-pairing of this vertex (full strips regardless of feather)
      let vHasL = false, vHasR = false;
      for (const [ji, w] of wmap.entries()) {
        if (w <= 0.05) continue;
        const n = jointName[ji];
        if (!ARM_SET.has(n) || n.endsWith('Shoulder')) continue;
        if (n.startsWith('Left')) vHasL = true; else if (n.startsWith('Right')) vHasR = true;
      }
      const vCross = vHasL && vHasR;

      // ---- rule B: vertex hugs a distal arm segment; torso/leg weights -> that arm joint
      // (skipped in component-stripped cloth: never add arm weight to a panel
      // that is being detached from the arms)
      if (comp !== 'strip') {
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
      }

      // ---- rule X: cross-body arm pairing (both Left* and Right* arm-chain
      // influence on one vertex) is always bleed; strip both sides to spine.
      // Only inside per-vertex components: in a kept component a partial strip
      // would tear the piece, and in a stripped component rule C handles it.
      if (CROSS_STRIP && comp === 'pervertex' && vCross) {
        for (const [ji, w] of [...wmap.entries()]) {
          const n = jointName[ji];
          if (w <= 0 || !ARM_SET.has(n) || n.endsWith('Shoulder')) continue;
          wmap.set(ji, 0); stripSum += w;
          stats.massX += w; addMass(stats.movedFrom, n, w);
          touched = true; hitX = true;
        }
      }

      if (comp === 'strip') {
        // ---- rule C: whole-component strip — arm influence leaves the piece.
        // Protection inside a stripped island is by BODY MASS, not distance:
        // a vertex blending with the body (>= 0.3 non-arm mass) is a skin/
        // gear blend zone and keeps its arm share (binary strips tore the
        // druid's hand/thigh blend), while pure-arm cloth strips fully even
        // when it hugs a resting hand (distance-protection left the assassin's
        // coat panel riding the hand). The ramp is smooth in mass-space, so
        // no seams. Cross-paired verts always strip fully.
        let armMassV = 0;
        for (const [ji, w] of wmap.entries()) {
          const n = jointName[ji];
          if (w > 0 && ARM_SET.has(n) && !n.endsWith('Shoulder')) armMassV += w;
        }
        let total = 0;
        for (const [, w] of wmap.entries()) total += w;
        const bodyMass = Math.max(0, total - armMassV);
        const massFrac = Math.max(0, Math.min(1, 1 - bodyMass / 0.3));
        for (const [ji, w] of [...wmap.entries()]) {
          if (w <= 0) continue;
          const name = jointName[ji];
          if (!ARM_SET.has(name) || name.endsWith('Shoulder')) continue;
          const move = w * (vCross ? 1 : Math.max(stripFraction(name), massFrac));
          if (move <= 1e-4) continue;
          wmap.set(ji, w - move); stripSum += move;
          stats.massC += move; addMass(stats.movedFrom, name, move);
          touched = true; hitC = true;
        }
      } else if (comp === 'pervertex') {
        // ---- rule A: arm influence far from its own bone segment, feathered
        for (const [ji, w] of [...wmap.entries()]) {
          if (w <= 0) continue;
          const name = jointName[ji];
          if (!ARM_SET.has(name)) continue;
          if (!armSeg.get(name)) continue;
          if (wouldStripA(p, name, w, dCore)) {
            const move = w * stripFraction(name);
            if (move <= 1e-4) continue;
            wmap.set(ji, w - move); stripSum += move;
            stats.massA += move; addMass(stats.movedFrom, name, move);
            touched = true; hitA = true;
          }
        }
      }
      // comp === 'keep' / 'none': arm weights stay (whole-component keep)

      // ---- rule H: hand weights below the hips (and not hugging the hand stub) -> Hips
      // (per-vertex components only: kept components move as one piece)
      if (comp === 'pervertex' && p[1] < hipsY - 0.05) {
        for (const [ji, w] of [...wmap.entries()]) {
          if (w <= 0) continue;
          const name = jointName[ji];
          if (!HAND.has(name)) continue;
          const seg = armSeg.get(name);
          const off = seg ? segOffset(p, seg[0], seg[1]) : { d3: Infinity, vy: 0, vh: 1 };
          // droop exemption: a weapon hanging from the hand is legit hand weight
          if (off.vy < 0 && -off.vy >= DROOP_RATIO * off.vh) continue;
          const hf = Math.min(1, Math.max(0, (off.d3 - HAND_KEEP) / FEATHER));
          const move = w * hf;
          if (move > 1e-4) {
            wmap.set(ji, w - move); stripSum += move;
            stats.massH += move; addMass(stats.movedFrom, name, move);
            touched = true; hitH = true;
          }
        }
      }

      // ---- redistribute stripped mass proportionally to the vertex's existing
      // non-arm influences: thigh flesh keeps following Hips+UpLeg in its raw
      // ratio instead of being pinned 100% to one spine bone (pinning is what
      // made druid/amazon/blood_knight thighs trail the walk as a rigid "log").
      // neck/Head are NOT receivers — witch_doctor's chest tassels got 3.4k of
      // arm mass parked on the neck and kited with every head bob; head bones
      // keep only their original share. Receivers must also be HEIGHT-COMPATIBLE
      // (bone head within 0.2 of the vertex): a hip/waist-height skirt vert
      // with a stray Spine(chest) partial must NOT hand its arm mass to the
      // chest — that made the witch_doctor skirt sail with every torso twist
      // (at 0.35 the waist band still reached the chest bone). Nearest spine
      // bone by height when no eligible receiver exists.
      if (stripSum > 0) {
        const receivers = REDIST === 'height' ? [] : [...wmap.entries()].filter(([ji, w]) => {
          const n = jointName[ji];
          if (w <= 1e-7 || ARM_SET.has(n) || n === 'neck' || n === 'Neck' || n === 'Head') return false;
          const h = head[ji];
          return h && Math.abs(h[1] - p[1]) <= 0.2;
        });
        const rsum = receivers.reduce((s, [, w]) => s + w, 0);
        if (rsum > 1e-6) {
          for (const [ji, w] of receivers) {
            const share = stripSum * w / rsum;
            wmap.set(ji, w + share);
            addMass(stats.movedTo, jointName[ji], share);
          }
        } else {
          const best = nearestSpine();
          wmap.set(best.idx, (wmap.get(best.idx) || 0) + stripSum);
          addMass(stats.movedTo, best.name, stripSum);
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
        if (hitC) stats.ruleC++;
        if (DEBUG_BOX && debugPrints < 40 &&
            p[0] >= DEBUG_BOX[0] && p[0] <= DEBUG_BOX[1] &&
            p[1] >= DEBUG_BOX[2] && p[1] <= DEBUG_BOX[3] &&
            p[2] >= DEBUG_BOX[4] && p[2] <= DEBUG_BOX[5]) {
          debugPrints++;
          const raw = {};
          for (let s = 0; s < 4; s++) { const w = (we[s] || 0) / wScale; if (w > 0.01) raw[jointName[je[s]]] = (raw[jointName[je[s]]] || 0) + Math.round(w * 100) / 100; }
          const fin = {};
          for (const [ji, w] of wmap.entries()) if (w > 1e-3) fin[jointName[ji]] = Math.round(w * 100) / 100;
          console.log(`DBG (${p[0].toFixed(2)},${p[1].toFixed(2)},${p[2].toFixed(2)}) comp=${comp} rules=${hitA ? 'A' : ''}${hitB ? 'B' : ''}${hitH ? 'H' : ''}${hitX ? 'X' : ''}${hitC ? 'C' : ''} raw=${JSON.stringify(raw)} -> ${JSON.stringify(fin)}`);
        }
      }
    }

    if (!DRY) {
      jAcc.setArray(newJ);
      wAcc.setArray(newW);
      wAcc.setNormalized(false);
    }
  });
}

// ---------- report ----------
const r3 = (v) => Math.round(v * 1000) / 1000;
console.log(`\n=== reweight ${basename(INPUT)} ===`);
console.log(`radius-upper=${RADIUS_UPPER} radius-fore=${RADIUS_FORE} radius-b=${RADIUS_B} radius-shoulder=${RADIUS_SH} radius-hand=${RADIUS_HAND} hand-keep=${HAND_KEEP} droop-ratio=${DROOP_RATIO} b-min-mass=${B_MIN_MASS} below-hips-min-w=${BELOW_W} skirt-below=${SKIRT_BELOW} coreGuard=${CORE_GUARD} crossStrip=${CROSS_STRIP} components=${COMPONENTS} comp-keep-frac=${COMP_KEEP_FRAC} comp-x-frac=${COMP_X_FRAC} comp-major-frac=${COMP_MAJOR_FRAC} anchor-radius=${ANCHOR_R} dryRun=${DRY}`);
console.log(`vertices: ${stats.verts} total, ${stats.touched} touched (${(100*stats.touched/Math.max(1,stats.verts)).toFixed(1)}%)`);
console.log(`  rule A (arm->spine, far cloth): ${stats.ruleA} verts, mass ${r3(stats.massA)}`);
console.log(`  rule B (torso/leg->arm, hugging): ${stats.ruleB} verts, mass ${r3(stats.massB)}`);
console.log(`  rule H (hand->hips, below hips): ${stats.ruleH} verts, mass ${r3(stats.massH)}`);
console.log(`  rule X (cross-body arm pair): ${stats.ruleX} verts, mass ${r3(stats.massX)}`);
console.log(`  rule C (whole-component strip): ${stats.ruleC} verts, mass ${r3(stats.massC)}`);
console.log(`  components: ${stats.comps} shells (${stats.compsPerVertex} per-vertex, ${stats.compsKept} kept, ${stats.compsStripped} stripped, ${stats.compsNoArm} no-arm); ${stats.islands} islands (${stats.islandsKept} kept, ${stats.islandsStripped} stripped)`);
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
