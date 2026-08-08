// Quadruped offline rigger: bind a raw four-leg mesh onto the shipped
// Dog_Animation donor skeleton (public/models/creatures/wolf_basic.glb) so the
// output GLB carries the donor's 14 baked clips natively — the same "bake the
// clips in, no runtime retarget" contract every other creature in this repo
// uses.
//
// Why not lib/manual_rig.mjs: that solver is humanoid-specific in three ways
// that each break silently on a quadruped.
//   1. Scale comes from a T-pose ARM LINE (wrist height vs the widest 5% of
//      vertices). A quadruped's widest slice is its ribcage or its horns, so
//      the fit lands at an arbitrary scale.
//   2. Its laterality guard tests for '.l'/'.r' name suffixes. The donor rig
//      uses '_L'/'_R', so the guard silently disables itself and a left paw can
//      take weight from the right leg.
//   3. It has NO front/rear discrimination, which does not exist on a biped but
//      is the single most catastrophic quadruped failure: a front paw bound to a
//      hind hip inverts one leg's whole stride and no numeric metric reports it.
// Everything else (distance-to-bone-segment weighting, 1/d^POW falloff,
// bind-space authoring via the inverse bind matrices) is the same proven idea.
import { getBounds } from '@gltf-transform/core';
import { dedup, dequantize, prune, textureCompress } from '@gltf-transform/functions';
import { openGlb, saveGlb } from '../asset_pipeline/lib/glb.mjs';

// Both the donor and the decimated sources come out of `gltf-transform optimize`,
// which QUANTIZES positions to int16. getArray() then hands back raw integers
// while the dequantization lives in the node transform (and, for a skinned mesh,
// premultiplied into the inverse bind matrices). Reading POSITION without
// dequantizing first silently mixes the two spaces: measured on this donor it
// reported a bind box of +/-32767 and fitted the source at 36,288x, which put
// every vertex outside every anatomical guard and left 17 of 22 leg joints with
// no weight at all. The output still loaded, still animated, and still looked
// like a creature-shaped blob — no error anywhere.
const loadDequantized = async (p) => {
  const doc = await openGlb(p);
  await doc.transform(dequantize());
  return doc;
};

const ROT_Y = (p, t) => {
  const c = Math.cos(t), s = Math.sin(t);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};

function inverse4(m) {
  const inv = new Array(16);
  inv[0]=m[5]*m[10]*m[15]-m[5]*m[11]*m[14]-m[9]*m[6]*m[15]+m[9]*m[7]*m[14]+m[13]*m[6]*m[11]-m[13]*m[7]*m[10];
  inv[4]=-m[4]*m[10]*m[15]+m[4]*m[11]*m[14]+m[8]*m[6]*m[15]-m[8]*m[7]*m[14]-m[12]*m[6]*m[11]+m[12]*m[7]*m[10];
  inv[8]=m[4]*m[9]*m[15]-m[4]*m[11]*m[13]-m[8]*m[5]*m[15]+m[8]*m[7]*m[13]+m[12]*m[5]*m[11]-m[12]*m[7]*m[9];
  inv[12]=-m[4]*m[9]*m[14]+m[4]*m[10]*m[13]+m[8]*m[5]*m[14]-m[8]*m[6]*m[13]-m[12]*m[5]*m[10]+m[12]*m[6]*m[9];
  inv[1]=-m[1]*m[10]*m[15]+m[1]*m[11]*m[14]+m[9]*m[2]*m[15]-m[9]*m[3]*m[14]-m[13]*m[2]*m[11]+m[13]*m[3]*m[10];
  inv[5]=m[0]*m[10]*m[15]-m[0]*m[11]*m[14]-m[8]*m[2]*m[15]+m[8]*m[3]*m[14]+m[12]*m[2]*m[11]-m[12]*m[3]*m[10];
  inv[9]=-m[0]*m[9]*m[15]+m[0]*m[11]*m[13]+m[8]*m[1]*m[15]-m[8]*m[3]*m[13]-m[12]*m[1]*m[11]+m[12]*m[3]*m[9];
  inv[13]=m[0]*m[9]*m[14]-m[0]*m[10]*m[13]-m[8]*m[1]*m[14]+m[8]*m[2]*m[13]+m[12]*m[1]*m[10]-m[12]*m[2]*m[9];
  inv[2]=m[1]*m[6]*m[15]-m[1]*m[7]*m[14]-m[5]*m[2]*m[15]+m[5]*m[3]*m[14]+m[13]*m[2]*m[7]-m[13]*m[3]*m[6];
  inv[6]=-m[0]*m[6]*m[15]+m[0]*m[7]*m[14]+m[4]*m[2]*m[15]-m[4]*m[3]*m[14]-m[12]*m[2]*m[7]+m[12]*m[3]*m[6];
  inv[10]=m[0]*m[5]*m[15]-m[0]*m[7]*m[13]-m[4]*m[1]*m[15]+m[4]*m[3]*m[13]+m[12]*m[1]*m[7]-m[12]*m[3]*m[5];
  inv[14]=-m[0]*m[5]*m[14]+m[0]*m[6]*m[13]+m[4]*m[1]*m[14]-m[4]*m[2]*m[13]-m[12]*m[1]*m[6]+m[12]*m[2]*m[5];
  inv[3]=-m[1]*m[6]*m[11]+m[1]*m[7]*m[10]+m[5]*m[2]*m[11]-m[5]*m[3]*m[10]-m[9]*m[2]*m[7]+m[9]*m[3]*m[6];
  inv[7]=m[0]*m[6]*m[11]-m[0]*m[7]*m[10]-m[4]*m[2]*m[11]+m[4]*m[3]*m[10]+m[8]*m[2]*m[7]-m[8]*m[3]*m[6];
  inv[11]=-m[0]*m[5]*m[11]+m[0]*m[7]*m[9]+m[4]*m[1]*m[11]-m[4]*m[3]*m[9]-m[8]*m[1]*m[7]+m[8]*m[3]*m[5];
  inv[15]=m[0]*m[5]*m[10]-m[0]*m[6]*m[9]-m[4]*m[1]*m[10]+m[4]*m[2]*m[9]+m[8]*m[1]*m[6]-m[8]*m[2]*m[5];
  const det = m[0]*inv[0]+m[1]*inv[4]+m[2]*inv[8]+m[3]*inv[12];
  if (Math.abs(det) < 1e-12) throw new Error('singular IBM');
  return inv.map((v) => v / det);
}

function distToSegment(p, a, b) {
  const abx = b[0]-a[0], aby = b[1]-a[1], abz = b[2]-a[2];
  const apx = p[0]-a[0], apy = p[1]-a[1], apz = p[2]-a[2];
  const len2 = abx*abx + aby*aby + abz*abz;
  let t = len2 > 1e-12 ? (apx*abx + apy*aby + apz*abz) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = apx - abx*t, dy = apy - aby*t, dz = apz - abz*t;
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

/** Read a skinned document's raw POSITION bounds. Skinned vertices are authored
 *  in the skin's BIND space (the mesh node transform is ignored for skinned
 *  primitives), so this is the exact box the raw mesh must be fitted into —
 *  unlike getBounds(), which walks the REST-pose node transforms and on this
 *  donor disagrees (its bind ear tips sit 0.14 above the rest-pose crown). */
function positionBounds(root) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const a = prim.getAttribute('POSITION')?.getArray();
      if (!a) continue;
      for (let i = 0; i < a.length; i += 3) {
        for (let k = 0; k < 3; k++) {
          if (a[i + k] < min[k]) min[k] = a[i + k];
          if (a[i + k] > max[k]) max[k] = a[i + k];
        }
      }
    }
  }
  return { min, max };
}

/** Analyse the donor skeleton: joints, bind positions, weightable segments and
 *  the anatomical guard planes (front/rear split, tail start, ear floor). */
export function analyseDonor(root) {
  const skin = root.listSkins()[0];
  if (!skin) throw new Error('donor has no skin');
  const joints = skin.listJoints();
  const ibm = skin.getInverseBindMatrices().getArray();
  const pos = joints.map((_, i) => {
    const inv = inverse4(Array.from(ibm.slice(i * 16, (i + 1) * 16)));
    return [inv[12], inv[13], inv[14]];
  });
  const names = joints.map((j) => j.getName());
  const byName = new Map(names.map((n, i) => [n, i]));
  const P = (n) => pos[byName.get(n)];
  const parentOf = new Map();
  joints.forEach((j, i) => {
    for (const c of j.listChildren()) if (byName.has(c.getName())) parentOf.set(byName.get(c.getName()), i);
  });

  const isFront = (n) => /^Front_Leg/i.test(n);
  const isBack = (n) => /^Back_Leg/i.test(n);
  const isTail = (n) => /^Tail/i.test(n);
  const isEar = (n) => /^Ear/i.test(n);

  const frontZ = pos.filter((_, i) => isFront(names[i])).map((p) => p[2]);
  const backZ = pos.filter((_, i) => isBack(names[i])).map((p) => p[2]);
  // Front/rear split: midway between the two hip clusters' centroids.
  const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  const splitZ = (mean(frontZ) + mean(backZ)) / 2;
  const tailZ = P('Tail_Base')?.[2] ?? -Infinity;
  const headY = P('Head')?.[1] ?? 0;
  const earY = pos.filter((_, i) => isEar(names[i])).map((p) => p[1]);
  const earFloorY = earY.length ? (Math.min(...earY) + headY) / 2 : Infinity;

  const box = positionBounds(root);
  const bodyLen = box.max[2] - box.min[2];
  // Fail LOUDLY on the quantization trap rather than fitting at 36,000x: the
  // donor is a ~2-unit creature and the joint bind positions (which come from
  // the IBMs, already in real units) must live inside its mesh box.
  if (!(bodyLen > 0.2 && bodyLen < 50)) throw new Error(`donor bind box implausible (len ${bodyLen}) — not dequantized?`);
  const jz = pos.map((p) => p[2]);
  if (Math.min(...jz) < box.min[2] * 3 - 1 || Math.max(...jz) > box.max[2] * 3 + 1) {
    throw new Error('donor joints and mesh are in different spaces');
  }

  const donorPts = [];
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const a = prim.getAttribute('POSITION')?.getArray();
      if (!a) continue;
      for (let i = 0; i < a.length; i += 3) donorPts.push([a[i], a[i + 1], a[i + 2]]);
    }
  }

  // Bone segments, attributed to the PROXIMAL joint. Leaves get a stub that
  // CONTINUES the bone direction (snout forward, tail tip back, paw tip down,
  // ear tip up) rather than manual_rig's fixed +Z stub, which on this rig would
  // point the tail-tip and paw-tip stubs into the body.
  const segments = [];
  for (let i = 0; i < joints.length; i++) {
    const n = names[i];
    if (/^root$/i.test(n) || n.startsWith('handslot')) continue;
    const kids = joints[i].listChildren().filter((c) => byName.has(c.getName()));
    if (kids.length) {
      for (const c of kids) segments.push({ joint: i, a: pos[i], b: pos[byName.get(c.getName())] });
    } else {
      const par = parentOf.get(i);
      const p = pos[i];
      let d = par != null ? [p[0] - pos[par][0], p[1] - pos[par][1], p[2] - pos[par][2]] : [0, 0, 1];
      const L = Math.hypot(...d) || 1;
      const stub = 0.05 * bodyLen;
      segments.push({ joint: i, a: p, b: [p[0] + (d[0] / L) * stub, p[1] + (d[1] / L) * stub, p[2] + (d[2] / L) * stub] });
    }
  }

  // Donor anatomy the fit anchors on. The paw centre is the mean Z of each
  // limb's Foot/Tip joints (a single Tip joint sits at the toe, which biases the
  // wheelbase forward); leg length is measured with the SAME belly detector the
  // sources get, so the two numbers are commensurable.
  const meanOf = (re) => {
    const v = pos.filter((_, i) => re.test(names[i])).map((p) => p[2]);
    return v.reduce((s, x) => s + x, 0) / Math.max(1, v.length);
  };
  const frontPawZ = meanOf(/^Front_Leg_(Foot|Tip)/);
  const backPawZ = meanOf(/^Back_Leg_(Foot|Tip)/);
  const footPlaneY = box.min[1];
  const donorBelly = detectBellyY(donorPts, footPlaneY, box.max[1] - footPlaneY);

  return {
    skin, joints, names, pos, byName, box, bodyLen, splitZ, tailZ, earFloorY, segments,
    footPlaneY,
    wheelbase: frontPawZ - backPawZ,
    wheelCenterZ: (frontPawZ + backPawZ) / 2,
    legLen: (donorBelly ?? pos[byName.get('Hips')][1]) - footPlaneY,
    signature: signature(donorPts, box),
    footY: Math.min(...pos.filter((_, i) => /Tip_[LR]$/.test(names[i]) && /Leg/.test(names[i])).map((p) => p[1])),
    side: (i) => {
      const n = names[i];
      return /(_L|\.l)$/.test(n) ? 1 : /(_R|\.r)$/.test(n) ? -1 : 0;
    },
    zone: (i) => (isFront(names[i]) ? 'front' : isBack(names[i]) ? 'back' : isTail(names[i]) ? 'tail' : isEar(names[i]) ? 'ear' : 'core'),
  };
}

/** The belly line: walking the vertex histogram up from the feet, the first bin
 *  whose population is 3x the quiet leg zone is where the thin leg columns give
 *  way to the torso. Applied to BOTH the donor and the source, so "leg length"
 *  means the same measurement on each and the donor never needs a hand-tuned
 *  constant. Returns null when no such jump exists (a body with no free legs —
 *  a shelled turtle, a grub), which is exactly when the caller must not trust it. */
function detectBellyY(points, minY, H) {
  const NB = 24;
  const h = new Array(NB).fill(0);
  for (const p of points) {
    let b = Math.floor(((p[1] - minY) / H) * NB);
    h[b < 0 ? 0 : b >= NB ? NB - 1 : b]++;
  }
  const legZone = h.slice(0, Math.floor(NB * 0.28));
  const quiet = legZone.slice().sort((a, b) => a - b)[Math.floor(legZone.length / 2)] || 1;
  for (let i = 2; i < NB; i++) if (h[i] > 3 * quiet) return minY + (i / NB) * H;
  return null;
}

/** 1-D 2-means. Used to split the foot slab into a front and a hind cluster. */
function twoMeans(vals) {
  let a = Math.min(...vals), b = Math.max(...vals);
  for (let it = 0; it < 24; it++) {
    let sa = 0, na = 0, sb = 0, nb = 0;
    for (const v of vals) {
      if (Math.abs(v - a) <= Math.abs(v - b)) { sa += v; na++; } else { sb += v; nb++; }
    }
    const na2 = na ? sa / na : a, nb2 = nb ? sb / nb : b;
    if (Math.abs(na2 - a) < 1e-6 && Math.abs(nb2 - b) < 1e-6) { a = na2; b = nb2; break; }
    a = na2; b = nb2;
  }
  return a <= b ? [a, b] : [b, a];
}

/** ANATOMY-ANCHORED fit. The obvious fit — source bounding box into donor
 *  bounding box — is wrong for quadrupeds and was measured to be wrong: a horse
 *  fitted that way came out as a dachshund, because the donor's box is 1.81:1
 *  (its long tail and long snout inflate the Z span) while a horse is nearer
 *  1.3:1, so the length fit stretched it and the height fit squashed it.
 *
 *  What has to line up is not the boxes but the LIMBS:
 *    Z scale  <- wheelbase: the source's front-foot-to-hind-foot distance onto
 *                the donor's. This is what puts each paw on its own bone.
 *    Y scale  <- leg length: source ground-to-belly onto donor ground-to-hip.
 *    origin   <- feet on the donor's foot plane, wheelbase centres aligned.
 *  The source's own proportions are then preserved to within the anisotropy
 *  clamp, so a horse stays horse-shaped and geometry that overruns the donor's
 *  head/tail bones simply rides the end bone rigidly.
 *
 *  Both measurements come from the mesh itself: the bottom slab of a
 *  four-legged animal IS its four feet, and the belly is where the vertex
 *  histogram jumps as the thin leg columns give way to the torso. When either
 *  detection is not confident the bbox fit is used instead and `fitMode` says
 *  so, because a silently wrong anatomical fit is worse than an honest crude one. */
function fitParams(min, max, D, ANISO, samples) {
  const rawH = Math.max(1e-6, max[1] - min[1]);
  const rawL = Math.max(1e-6, max[2] - min[2]);
  const base = {
    midX: (min[0] + max[0]) / 2, minY: min[1],
    refMidX: (D.box.min[0] + D.box.max[0]) / 2,
  };
  const clampAniso = (sY, sXZ) => [
    Math.min(sXZ * ANISO, Math.max(sXZ / ANISO, sY)),
    sXZ,
  ];

  let fit = null;
  if (samples && samples.length > 60) {
    // Foot slab: the bottom 28% of the mesh. On any four-legged body this is
    // feet and lower legs only.
    const slab = samples.filter((p) => p[1] < min[1] + 0.28 * rawH).map((p) => p[2]);
    if (slab.length > 30) {
      const [zB, zF] = twoMeans(slab);
      const wheel = zF - zB;
      if (wheel > 0.18 * rawL) {
        const bellyY = detectBellyY(samples, min[1], rawH);
        const sXZ = D.wheelbase / wheel;
        let sY = bellyY ? D.legLen / Math.max(1e-6, bellyY - min[1]) : sXZ;
        [sY] = clampAniso(sY, sXZ);
        fit = {
          ...base, sY, sXZ, midZ: (zF + zB) / 2, refMidZ: D.wheelCenterZ,
          fitMode: bellyY ? 'anatomical' : 'wheelbase',
        };
      }
    }
  }
  if (!fit) {
    const sXZ = (D.box.max[2] - D.box.min[2]) / rawL;
    const [sY] = clampAniso((D.box.max[1] - D.box.min[1]) / rawH, sXZ);
    fit = {
      ...base, sY, sXZ, midZ: (min[2] + max[2]) / 2,
      refMidZ: (D.box.min[2] + D.box.max[2]) / 2, fitMode: 'bbox',
    };
  }
  return fit;
}
const place = (p, f, D) => [
  (p[0] - f.midX) * f.sXZ + f.refMidX,
  (p[1] - f.minY) * f.sY + D.footPlaneY,
  (p[2] - f.midZ) * f.sXZ + f.refMidZ,
];

const NBIN = 16;
/** Silhouette signature: per-slab-along-Z mass fraction, height and width.
 *  The sources have NO consistent export convention — measured across this
 *  census set some face +Z, some -Z, some ±X, uncorrelated with realm, source
 *  name or generation date — so facing has to be derived from the mesh itself.
 *  Nearest-bone-distance was tried first and is useless for it: it separates the
 *  long axis cleanly (0.27 vs 0.93) but head-vs-tail by 0.3%, because a fitted
 *  body fills the donor's box about equally well either way round. This
 *  signature instead compares the PROFILE to the donor's, where the two ends
 *  differ enormously: the donor's head end carries a tall skull and ears, its
 *  tail end tapers to a thin low point. */
function signature(points, box) {
  const bins = Array.from({ length: NBIN }, () => ({ n: 0, top: -Infinity, w: 0 }));
  const z0 = box.min[2], zs = NBIN / Math.max(1e-6, box.max[2] - z0);
  const H = Math.max(1e-6, box.max[1] - box.min[1]);
  const W = Math.max(1e-6, box.max[0] - box.min[0]);
  for (const p of points) {
    let b = Math.floor((p[2] - z0) * zs);
    b = b < 0 ? 0 : b >= NBIN ? NBIN - 1 : b;
    bins[b].n++;
    bins[b].w += Math.abs(p[0] - (box.min[0] + box.max[0]) / 2) / W;
    if (p[1] > bins[b].top) bins[b].top = p[1];
  }
  const total = points.length || 1;
  return bins.map((b) => [
    b.n / total,
    b.top === -Infinity ? 0 : (b.top - box.min[1]) / H,
    b.n ? b.w / b.n : 0,
  ]);
}

function sigDistance(a, b) {
  let d = 0;
  for (let i = 0; i < NBIN; i++) {
    d += 3 * Math.abs(a[i][0] - b[i][0]) + Math.abs(a[i][1] - b[i][1]) + Math.abs(a[i][2] - b[i][2]);
  }
  return d;
}

/** Fit the samples the way the rig will, then compare the silhouette signature
 *  to the donor's. Lower is better; the margin over the runner-up is reported so
 *  a near-tie goes to a human instead of being guessed. */
function agreementScore(samples, D, ANISO) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of samples) for (let k = 0; k < 3; k++) {
    if (p[k] < min[k]) min[k] = p[k];
    if (p[k] > max[k]) max[k] = p[k];
  }
  const f = fitParams(min, max, D, ANISO, samples);
  const placed = samples.map((s) => place(s, f, D));
  return sigDistance(signature(placed, D.box), D.signature);
}

/** Rig `rawGlbPath` onto `donorGlbPath`'s skeleton; write `outPath`.
 *  opts:
 *    yaw       radians about Y so the mesh faces +Z (donor convention: nose at
 *              +Z, tail at -Z). 'auto' scores all four quarter turns against the
 *              donor anatomy and picks the best.
 *    flipY     mirror about the XZ plane (Z-up sources)
 *    anisoCap  max allowed ratio between the Y and XZ scale factors (1 = uniform)
 *    influences/falloff  solver knobs (default 4 / 4)
 */
export async function quadRigOntoDonor(rawGlbPath, donorGlbPath, outPath, opts = {}) {
  const K = opts.influences ?? 4;
  const POW = opts.falloff ?? 4;
  const ANISO = opts.anisoCap ?? 1.3;

  const doc = await loadDequantized(donorGlbPath);
  const root = doc.getRoot();
  const D = analyseDonor(root);

  const rawDoc = await loadDequantized(rawGlbPath);
  const rawPrims = rawDoc.getRoot().listMeshes().flatMap((m) => m.listPrimitives());
  if (!rawPrims.length) throw new Error('raw model has no primitives');

  // The raw source may carry node transforms (Meshy exports often do). Bake the
  // world matrix of the owning node into the vertices, or a rotated/offset
  // source silently fits at the wrong scale.
  const nodeOfPrim = new Map();
  for (const node of rawDoc.getRoot().listNodes()) {
    const m = node.getMesh();
    if (!m) continue;
    const wm = node.getWorldMatrix();
    for (const p of m.listPrimitives()) nodeOfPrim.set(p, wm);
  }
  const applyM = (m, p) => {
    if (!m) return p;
    return [
      m[0]*p[0] + m[4]*p[1] + m[8]*p[2] + m[12],
      m[1]*p[0] + m[5]*p[1] + m[9]*p[2] + m[13],
      m[2]*p[0] + m[6]*p[1] + m[10]*p[2] + m[14],
    ];
  };
  const applyM3 = (m, p) => {
    if (!m) return p;
    return [
      m[0]*p[0] + m[4]*p[1] + m[8]*p[2],
      m[1]*p[0] + m[5]*p[1] + m[9]*p[2],
      m[2]*p[0] + m[6]*p[1] + m[10]*p[2],
    ];
  };

  // A decimated sample of the source in pre-yaw space: drives both the facing
  // vote and the anatomical fit, so neither pays for a full pass over the mesh.
  const samples0 = [];
  const STRIDE = Math.max(1, Math.floor(
    rawPrims.reduce((s, p) => s + p.getAttribute('POSITION').getArray().length / 3, 0) / 4000));
  for (const prim of rawPrims) {
    const a = prim.getAttribute('POSITION').getArray();
    const wm = nodeOfPrim.get(prim);
    for (let v = 0, i = 0; v < a.length; v += 3, i++) {
      if (i % STRIDE) continue;
      let p = applyM(wm, [a[v], a[v + 1], a[v + 2]]);
      if (opts.flipY) p = [p[0], p[2], -p[1]];
      samples0.push(p);
    }
  }

  // --- Facing: score all four quarter turns against the donor anatomy -------
  let yaw = opts.yaw;
  let yawScores = null;
  if (yaw === 'auto' || yaw == null) {
    const samples = samples0;
    // The body axis by PCA on the XZ cloud, NOT a quarter-turn search. Several
    // of these sources are exported at an arbitrary yaw — verified on the render
    // sheets, where a "side" view of an axis-snapped rig still came out as a
    // three-quarter and the tail swept off-diagonal. Quarter turns can never
    // correct that; the dominant eigenvector can, exactly, leaving only the
    // 180-degree head/tail ambiguity for the signature vote (and, in the end,
    // for eyes — see quad_yaws.json).
    let cxx = 0, cxz = 0, czz = 0, mx = 0, mz = 0;
    for (const p of samples) { mx += p[0]; mz += p[2]; }
    mx /= samples.length; mz /= samples.length;
    for (const p of samples) {
      const dx = p[0] - mx, dz = p[2] - mz;
      cxx += dx * dx; cxz += dx * dz; czz += dz * dz;
    }
    const phi = 0.5 * Math.atan2(2 * cxz, cxx - czz);
    const cands = [phi - Math.PI / 2, phi + Math.PI / 2];
    yawScores = cands.map((t) => ({
      yaw: t,
      score: +agreementScore(samples.map((p) => ROT_Y(p, t)), D, ANISO).toFixed(5),
    }));
    yawScores.sort((a, b) => a.score - b.score);
    yaw = yawScores[0].yaw;
  }

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const oriented = rawPrims.map((prim) => {
    const src = prim.getAttribute('POSITION').getArray();
    const wm = nodeOfPrim.get(prim);
    const out = new Float32Array(src.length);
    for (let v = 0; v < src.length; v += 3) {
      let p = applyM(wm, [src[v], src[v + 1], src[v + 2]]);
      if (opts.flipY) p = [p[0], p[2], -p[1]];
      if (yaw) p = ROT_Y(p, yaw);
      out[v] = p[0]; out[v + 1] = p[1]; out[v + 2] = p[2];
      for (let k = 0; k < 3; k++) {
        if (p[k] < min[k]) min[k] = p[k];
        if (p[k] > max[k]) max[k] = p[k];
      }
    }
    return out;
  });

  const F = fitParams(min, max, D, ANISO, samples0.map((p) => ROT_Y(p, yaw)));
  const { sY, sXZ } = F;
  const refMidX = F.refMidX;

  const guardM = 0.08 * D.bodyLen;
  const sideGuard = 0.015 * D.bodyLen;
  const report = {
    yaw: +yaw.toFixed(4),
    yawScores,
    yawMargin: yawScores ? +((yawScores[1].score - yawScores[0].score) / yawScores[0].score).toFixed(3) : null,
    fitMode: F.fitMode,
    sY: +sY.toFixed(3), sXZ: +sXZ.toFixed(3),
    aniso: +(sY / sXZ).toFixed(3),
    rawBox: [min.map((v) => +v.toFixed(3)), max.map((v) => +v.toFixed(3))],
    refBox: [D.box.min.map((v) => +v.toFixed(3)), D.box.max.map((v) => +v.toFixed(3))],
    fittedH: +((max[1] - min[1]) * sY).toFixed(3), fittedL: +((max[2] - min[2]) * sXZ).toFixed(3),
    joints: D.joints.length, clips: root.listAnimations().length,
    splitZ: +D.splitZ.toFixed(3), verts: 0,
    // diagnostics: how much of the mesh each zone claims
    zoneMass: { front: 0, back: 0, tail: 0, ear: 0, core: 0 },
    orphanJoints: [],
  };
  const jointMass = new Float64Array(D.joints.length);

  const built = rawPrims.map((prim, pi) => {
    const rot = oriented[pi];
    const n = rot.length / 3;
    report.verts += n;
    const pos = new Float32Array(rot.length);
    const jointsAttr = new Uint16Array(n * 4);
    const weightsAttr = new Float32Array(n * 4);
    for (let v = 0; v < n; v++) {
      const p = place([rot[v * 3], rot[v * 3 + 1], rot[v * 3 + 2]], F, D);
      pos[v * 3] = p[0]; pos[v * 3 + 1] = p[1]; pos[v * 3 + 2] = p[2];

      const lx = p[0] - refMidX;
      const best = [];
      for (const seg of D.segments) {
        const s = D.side(seg.joint);
        if (s === 1 && lx < -sideGuard) continue;
        if (s === -1 && lx > sideGuard) continue;
        const z = D.zone(seg.joint);
        // Anatomical guards — the failures no metric would report.
        if (z === 'front' && p[2] < D.splitZ - guardM) continue;
        if (z === 'back' && p[2] > D.splitZ + guardM) continue;
        if (z === 'tail' && p[2] > D.tailZ + guardM) continue;
        if (z === 'ear' && p[1] < D.earFloorY) continue;
        const d = distToSegment(p, seg.a, seg.b);
        best.push({ joint: seg.joint, w: 1 / (d ** POW + 1e-8) });
      }
      if (!best.length) best.push({ joint: D.byName.get('Hips') ?? 1, w: 1 });
      best.sort((a, b) => b.w - a.w);
      const merged = [];
      for (const c of best) {
        const hit = merged.find((m) => m.joint === c.joint);
        if (hit) hit.w += c.w;
        else merged.push({ ...c });
        if (merged.length >= K && merged.length > 8) break;
      }
      merged.sort((a, b) => b.w - a.w);
      const top = merged.slice(0, K);
      const sum = top.reduce((s2, c) => s2 + c.w, 0) || 1;
      for (let k = 0; k < 4; k++) {
        const j = top[k]?.joint ?? 0;
        const w = (top[k]?.w ?? 0) / sum;
        jointsAttr[v * 4 + k] = j;
        weightsAttr[v * 4 + k] = w;
        if (w > 0) { jointMass[j] += w; report.zoneMass[D.zone(j)] += w; }
      }
    }

    const nrmSrc = prim.getAttribute('NORMAL')?.getArray();
    let nrm = null;
    if (nrmSrc) {
      const wm = nodeOfPrim.get(prim);
      nrm = new Float32Array(nrmSrc.length);
      for (let v = 0; v < nrmSrc.length; v += 3) {
        let r = applyM3(wm, [nrmSrc[v], nrmSrc[v + 1], nrmSrc[v + 2]]);
        if (opts.flipY) r = [r[0], r[2], -r[1]];
        if (yaw) r = ROT_Y(r, yaw);
        const L = Math.hypot(...r) || 1;
        nrm[v] = r[0] / L; nrm[v + 1] = r[1] / L; nrm[v + 2] = r[2] / L;
      }
    }
    return {
      pos, nrm, jointsAttr, weightsAttr,
      uv: prim.getAttribute('TEXCOORD_0')?.getArray() ?? null,
      indices: prim.getIndices()?.getArray() ?? null,
      material: prim.getMaterial(),
    };
  });

  const totalMass = report.verts || 1;
  for (const k of Object.keys(report.zoneMass)) report.zoneMass[k] = +(report.zoneMass[k] / totalMass).toFixed(3);
  // A LEG joint with no weight means that limb's geometry went somewhere else —
  // the loudest cheap signal that a bind is wrong.
  report.orphanJoints = D.names.filter((n, i) => jointMass[i] < 1e-6 && /Leg/.test(n) && !/Tip/.test(n));
  report.legMass = {};
  for (const tag of ['Front_Leg_Upper_L', 'Front_Leg_Upper_R', 'Back_Leg_Upper_L', 'Back_Leg_Upper_R']) {
    report.legMass[tag] = +(jointMass[D.byName.get(tag)] / totalMass).toFixed(4);
  }

  for (const node of root.listNodes()) if (node.getMesh()) node.setMesh(null);
  for (const mesh of root.listMeshes()) mesh.dispose();

  const buffer = root.listBuffers()[0];
  const mkAcc = (arr, type) => doc.createAccessor().setArray(arr).setType(type).setBuffer(buffer);
  const mesh = doc.createMesh('body');
  for (const b of built) {
    const mat = doc.createMaterial(b.material?.getName() ?? 'body');
    const copyTex = (getter, setter) => {
      const t = b.material?.[getter]?.();
      if (!t) return;
      mat[setter](doc.createTexture(t.getName()).setImage(t.getImage()).setMimeType(t.getMimeType()));
    };
    copyTex('getBaseColorTexture', 'setBaseColorTexture');
    copyTex('getNormalTexture', 'setNormalTexture');
    copyTex('getMetallicRoughnessTexture', 'setMetallicRoughnessTexture');
    mat.setBaseColorFactor(b.material?.getBaseColorFactor() ?? [1, 1, 1, 1]);
    mat.setMetallicFactor(b.material?.getMetallicFactor() ?? 0);
    mat.setRoughnessFactor(b.material?.getRoughnessFactor() ?? 1);

    const prim = doc.createPrimitive().setMode(4).setMaterial(mat)
      .setAttribute('POSITION', mkAcc(b.pos, 'VEC3'))
      .setAttribute('JOINTS_0', mkAcc(b.jointsAttr, 'VEC4'))
      .setAttribute('WEIGHTS_0', mkAcc(b.weightsAttr, 'VEC4'));
    if (b.nrm) prim.setAttribute('NORMAL', mkAcc(b.nrm, 'VEC3'));
    if (b.uv) prim.setAttribute('TEXCOORD_0', mkAcc(new Float32Array(b.uv), 'VEC2'));
    if (b.indices) prim.setIndices(mkAcc(b.indices, 'SCALAR'));
    mesh.addPrimitive(prim);
  }
  const bodyNode = doc.createNode('body').setMesh(mesh).setSkin(D.skin);
  root.listScenes()[0].addChild(bodyNode);

  await doc.transform(
    prune(),
    dedup(),
    textureCompress({ targetFormat: 'webp', resize: opts.textureSize ?? [512, 512] }),
  );
  await saveGlb(doc, outPath);
  const bb = getBounds(root.listScenes()[0]);
  report.outBounds = [bb.min.map((v) => +v.toFixed(3)), bb.max.map((v) => +v.toFixed(3))];
  return report;
}
