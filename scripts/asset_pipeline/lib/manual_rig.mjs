// Manual (code-computed) rigging: bind a raw generated mesh onto the ACTUAL
// KayKit reference skeleton, with vertex skin weights computed here instead of
// by Tripo's rig service.
//
// The trick that makes this worth doing: rather than building a new skeleton
// and retargeting animations onto it (the Tripo path), the raw mesh is
// transformed INTO the reference rig's bind space (yaw to face +Z, uniform
// scale so the T-pose arm line lands on the reference wrist line, feet at
// y=0) and skinned against the reference joints directly. The output GLB then
// carries the reference model's ENTIRE clip library natively (all 22 KayKit
// clips for the knight), plus the real handslot.r/.l bones, with zero
// animation cost and perfect style coherence.
//
// Weight solver: classic distance-to-bone-segment. Each joint owns the
// segments from itself to its children (leaf joints get a short synthetic
// segment: head up, toes forward); a vertex takes the K nearest segments
// weighted 1/d^4, with a laterality guard so .l bones never grab -X vertices
// and vice versa. Chibi bodies are blobby and forgiving, which is exactly why
// this simple solver has a chance of looking decent.
//
// ---------------------------------------------------------------------------
// DATA OWNERSHIP: a rigging operation owns the SKIN and nothing else.
//
// It may write JOINTS_0, WEIGHTS_0, the skin, its joints and its inverse bind
// matrices. It must NEVER decide what the model LOOKS like: materials,
// textures, images, samplers, texCoord wiring, UV sets, vertex colours and
// tangents belong to the source art and must survive a rebind untouched.
//
// manualRigOntoReference() opens the REFERENCE document and mutates it in
// place, so by default everything downstream of "what does it look like"
// starts as the REFERENCE's, not the source's. The old material hand-copy
// carried only baseColor/normal/ORM + metallic/roughness, which silently
// dropped emissive maps, emissive/baseColor factors, alphaMode, doubleSided,
// sampler + texCoord wiring and every KHR material extension — enough to turn
// a pale emissive-lit body into a dark metal one — and then textureCompress()
// halved the atlas on top. `preserveSourceArt: true` fixes that at the root by
// MERGING the source document in and binding the new mesh to the source's own
// (fully cloned, extension-complete) materials, and skips the resampling step.
//
// rebindSkinInPlace() is the correct operation for a model that is ALREADY
// rigged and only has bad weights: it re-solves JOINTS_0/WEIGHTS_0 inside the
// source's own document against the source's own skeleton. It never opens a
// second document, so substituting the art is structurally impossible, and the
// clip vocabulary, joint set, bind matrices and model scale are all preserved
// by construction. Prefer it over a reference rebind whenever the source
// already carries a working skeleton — a reference rebind also swaps the clip
// library, the joint names and the bind scale, which is rarely what a
// "the shoulder is broken" repair actually wants.
// ---------------------------------------------------------------------------
import { getBounds } from '@gltf-transform/core';
import { dedup, mergeDocuments, prune, textureCompress } from '@gltf-transform/functions';
import { solveGeodesicWeights } from './geodesic_weights.mjs';
import { openGlb, saveGlb } from './glb.mjs';
import { stripScaleChannels } from './scale_channels.mjs';

const ROT = ([x, y, z]) => [-z, y, x]; // -90deg about Y: +X facing -> +Z facing

// General 4x4 inverse (column-major). Needed because the BIND pose lives in
// the inverse bind matrices: a rig's REST node pose is NOT necessarily its
// bind pose (true for the KayKit rigs, verified: jointWorld*IBM deviates by
// >1.0 on the legs), and skinned vertices must be authored in BIND space.
function inverse4(m) {
  const inv = new Array(16);
  inv[0] =
    m[5] * m[10] * m[15] -
    m[5] * m[11] * m[14] -
    m[9] * m[6] * m[15] +
    m[9] * m[7] * m[14] +
    m[13] * m[6] * m[11] -
    m[13] * m[7] * m[10];
  inv[4] =
    -m[4] * m[10] * m[15] +
    m[4] * m[11] * m[14] +
    m[8] * m[6] * m[15] -
    m[8] * m[7] * m[14] -
    m[12] * m[6] * m[11] +
    m[12] * m[7] * m[10];
  inv[8] =
    m[4] * m[9] * m[15] -
    m[4] * m[11] * m[13] -
    m[8] * m[5] * m[15] +
    m[8] * m[7] * m[13] +
    m[12] * m[5] * m[11] -
    m[12] * m[7] * m[9];
  inv[12] =
    -m[4] * m[9] * m[14] +
    m[4] * m[10] * m[13] +
    m[8] * m[5] * m[14] -
    m[8] * m[6] * m[13] -
    m[12] * m[5] * m[10] +
    m[12] * m[6] * m[9];
  inv[1] =
    -m[1] * m[10] * m[15] +
    m[1] * m[11] * m[14] +
    m[9] * m[2] * m[15] -
    m[9] * m[3] * m[14] -
    m[13] * m[2] * m[11] +
    m[13] * m[3] * m[10];
  inv[5] =
    m[0] * m[10] * m[15] -
    m[0] * m[11] * m[14] -
    m[8] * m[2] * m[15] +
    m[8] * m[3] * m[14] +
    m[12] * m[2] * m[11] -
    m[12] * m[3] * m[10];
  inv[9] =
    -m[0] * m[9] * m[15] +
    m[0] * m[11] * m[13] +
    m[8] * m[1] * m[15] -
    m[8] * m[3] * m[13] -
    m[12] * m[1] * m[11] +
    m[12] * m[3] * m[9];
  inv[13] =
    m[0] * m[9] * m[14] -
    m[0] * m[10] * m[13] -
    m[8] * m[1] * m[14] +
    m[8] * m[2] * m[13] +
    m[12] * m[1] * m[10] -
    m[12] * m[2] * m[9];
  inv[2] =
    m[1] * m[6] * m[15] -
    m[1] * m[7] * m[14] -
    m[5] * m[2] * m[15] +
    m[5] * m[3] * m[14] +
    m[13] * m[2] * m[7] -
    m[13] * m[3] * m[6];
  inv[6] =
    -m[0] * m[6] * m[15] +
    m[0] * m[7] * m[14] +
    m[4] * m[2] * m[15] -
    m[4] * m[3] * m[14] -
    m[12] * m[2] * m[7] +
    m[12] * m[3] * m[6];
  inv[10] =
    m[0] * m[5] * m[15] -
    m[0] * m[7] * m[13] -
    m[4] * m[1] * m[15] +
    m[4] * m[3] * m[13] +
    m[12] * m[1] * m[7] -
    m[12] * m[3] * m[5];
  inv[14] =
    -m[0] * m[5] * m[14] +
    m[0] * m[6] * m[13] +
    m[4] * m[1] * m[14] -
    m[4] * m[2] * m[13] -
    m[12] * m[1] * m[6] +
    m[12] * m[2] * m[5];
  inv[3] =
    -m[1] * m[6] * m[11] +
    m[1] * m[7] * m[10] +
    m[5] * m[2] * m[11] -
    m[5] * m[3] * m[10] -
    m[9] * m[2] * m[7] +
    m[9] * m[3] * m[6];
  inv[7] =
    m[0] * m[6] * m[11] -
    m[0] * m[7] * m[10] -
    m[4] * m[2] * m[11] +
    m[4] * m[3] * m[10] +
    m[8] * m[2] * m[7] -
    m[8] * m[3] * m[6];
  inv[11] =
    -m[0] * m[5] * m[11] +
    m[0] * m[7] * m[9] +
    m[4] * m[1] * m[11] -
    m[4] * m[3] * m[9] -
    m[8] * m[1] * m[7] +
    m[8] * m[3] * m[5];
  inv[15] =
    m[0] * m[5] * m[10] -
    m[0] * m[6] * m[9] -
    m[4] * m[1] * m[10] +
    m[4] * m[2] * m[9] +
    m[8] * m[1] * m[6] -
    m[8] * m[2] * m[5];
  const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  if (Math.abs(det) < 1e-12) throw new Error('singular IBM');
  return inv.map((v) => v / det);
}

function distToSegment(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const len2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  let t = len2 > 1e-12 ? (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const q = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

// --- Shared skeleton/solver core -------------------------------------------
// Used by BOTH rig modes so they cannot drift apart. Extracted verbatim from
// the original reference path; the only generalisations are name matching
// (case-insensitive `head`, Left*/Right* laterality) which are inert on the
// KayKit reference convention and only fire on other joint naming schemes.

/** Bind-pose joint world positions, from the inverse bind matrices. */
function bindSkeleton(skin) {
  const joints = skin.listJoints();
  const ibmArr = skin.getInverseBindMatrices().getArray();
  const jointPos = joints.map((_, i) => {
    const inv = inverse4(Array.from(ibmArr.slice(i * 16, (i + 1) * 16)));
    return [inv[12], inv[13], inv[14]];
  });
  const byName = new Map(joints.map((j, i) => [j.getName(), i]));
  return { joints, jointPos, byName };
}

/** Ground plane, body axis and T-pose arm line, in bind space.
 *  Exact anchors on the KayKit convention (root / hips / wrist.r); falls back
 *  to measured equivalents on any other skeleton (lowest joint / the joint
 *  with no parent inside the joint set / the mean wrist-or-hand height). */
function bindAnchors(joints, jointPos, byName) {
  const lower = new Map(joints.map((j, i) => [j.getName().toLowerCase(), i]));
  const at = (n) => (lower.has(n) ? jointPos[lower.get(n)] : null);
  const ys = jointPos.map((p) => p[1]);
  const groundY = at('root')?.[1] ?? Math.min(...ys);

  let axis = at('hips');
  if (!axis) {
    const childNames = new Set();
    for (const j of joints)
      for (const c of j.listChildren()) if (byName.has(c.getName())) childNames.add(c.getName());
    const i = joints.findIndex((j) => !childNames.has(j.getName()));
    axis = jointPos[i >= 0 ? i : 0];
  }

  let armY = at('wrist.r')?.[1];
  if (armY == null) {
    const hands = joints
      .map((j, i) => [j.getName(), i])
      .filter(([n]) => /wrist|hand/i.test(n) && !/^handslot/i.test(n))
      .map(([, i]) => jointPos[i][1]);
    armY = hands.length
      ? hands.reduce((a, b) => a + b, 0) / hands.length
      : groundY + 0.5 * (Math.max(...ys) - groundY);
  }
  return { groundY, centerX: axis[0], centerZ: axis[2], armLine: armY - groundY };
}

/** Bone segments attributed to the PROXIMAL joint. Skips the whole-body root
 *  (no direct weights) and handslots (attachment-only). Leaf joints get a
 *  synthetic stub sized off the arm line: head up, everything else forward. */
function buildSegments(joints, jointPos, byName, armLine) {
  const segments = [];
  for (let i = 0; i < joints.length; i++) {
    const name = joints[i].getName();
    if (/^root$/i.test(name) || name.startsWith('handslot')) continue;
    const kids = joints[i].listChildren().filter((c) => byName.has(c.getName()));
    let any = false;
    for (const c of kids) {
      segments.push({ joint: i, a: jointPos[i], b: jointPos[byName.get(c.getName())] });
      any = true;
    }
    if (!any) {
      const p = jointPos[i];
      const dir = /^head$/i.test(name) ? [0, 0.4 * armLine, 0] : [0, 0, 0.05 * armLine];
      segments.push({ joint: i, a: p, b: [p[0] + dir[0], p[1] + dir[1], p[2] + dir[2]] });
    }
  }
  return segments;
}

/** Laterality classifier: +1 for left-side joints, -1 for right, 0 for spine.
 *  Reads `.l`/`.r` (KayKit) and `Left*`/`Right*` (Mixamo-style) names, then
 *  confirms which tag actually sits at +X from the bind positions, so a rig
 *  authored mirrored can't invert the guard. */
function lateralityFn(joints, jointPos, centerX) {
  const tag = (n) =>
    n.endsWith('.l') ? 'l' : n.endsWith('.r') ? 'r' : /^left/i.test(n) ? 'l' : /^right/i.test(n) ? 'r' : null;
  let sum = 0;
  joints.forEach((j, i) => {
    const t = tag(j.getName());
    if (t) sum += (t === 'l' ? 1 : -1) * (jointPos[i][0] - centerX);
  });
  const lSign = sum >= 0 ? 1 : -1;
  return (i) => {
    const t = tag(joints[i].getName());
    return t ? (t === 'l' ? lSign : -lSign) : 0;
  };
}

/** Solve one vertex: nearest bone segments by 1/d^POW, laterality-guarded,
 *  duplicate joints merged, top-K normalised. Writes into jointsOut/weightsOut
 *  at slot v. */
function solveVertex(p, v, segments, side, centerX, sideGuard, K, POW, jointsOut, weightsOut) {
  const lx = p[0] - centerX;
  const best = []; // {joint, w}
  for (const seg of segments) {
    const s = side(seg.joint);
    if (s === 1 && lx < -sideGuard) continue;
    if (s === -1 && lx > sideGuard) continue;
    const d = distToSegment(p, seg.a, seg.b);
    const w = 1 / (d ** POW + 1e-8);
    best.push({ joint: seg.joint, w });
  }
  best.sort((a, b) => b.w - a.w);
  // Merge duplicate joints among the top hits, then take K.
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
    jointsOut[v * 4 + k] = top[k]?.joint ?? 0;
    weightsOut[v * 4 + k] = (top[k]?.w ?? 0) / sum;
  }
}

/** Plausible band for armLine/height on an upright humanoid, used as a guard
 *  rather than as the estimate. The known-good blacksmith sits at 0.771. */
const ARM_RATIO_LO = 0.72;
const ARM_RATIO_HI = 0.80;

/** Arm line as the MEDIAN height of the outermost tenth of each arm's reach,
 *  measured per side and averaged.
 *
 *  The legacy estimator takes the mean height of every vertex beyond 82% of the
 *  half-span, over both sides at once, and that fails three ways on real
 *  costume: a bell sleeve is as wide as the hand but hangs below it, a flared
 *  tabard reaches nearly as wide at hip height, and a sheet whose two arms sit
 *  at different heights averages to a line that matches neither. All three drag
 *  the estimate DOWN, and since scale = wristAbove / rawArmY, low reads
 *  OVERSIZE: measured on the two bodies that prompted this, necromancer_f fit at
 *  0.673 of height (1.15x too large) and dark_paladin_f at 0.623 (1.24x), whose
 *  two arms measured 0.567 and 0.672 separately.
 *
 *  A median over the outermost tenth is immune to hanging fabric (it is a
 *  minority of the samples out at the fingertips) and doing it per side exposes
 *  disagreement instead of averaging it away. The result is clamped into a
 *  plausible band; when the clamp fires, the mesh is not T-posed and `note`
 *  carries the numbers so the caller can say so out loud. Returns null when
 *  there is not enough geometry to measure, so the caller keeps the legacy value.
 */
function perSideArmLine(rotatedPerPrim, min, max, note = {}) {
  const midX = (min[0] + max[0]) / 2;
  const height = max[1] - min[1];
  if (!(height > 1e-6)) return null;
  const meds = [];
  for (const side of [1, -1]) {
    const reach = side > 0 ? max[0] - midX : midX - min[0];
    if (!(reach > 1e-6)) continue;
    const ys = [];
    for (const arr of rotatedPerPrim)
      for (let v = 0; v < arr.length; v += 3)
        if ((arr[v] - midX) * side > 0.90 * reach) ys.push(arr[v + 1]);
    if (ys.length < 24) continue;
    ys.sort((a, b) => a - b);
    meds.push((ys[ys.length >> 1] - min[1]) / height);
  }
  if (!meds.length) return null;
  note.perSide = meds.map((r) => +r.toFixed(3));
  note.skew = meds.length > 1 ? +Math.abs(meds[0] - meds[1]).toFixed(3) : null;
  const raw = meds.reduce((s, r) => s + r, 0) / meds.length;
  note.ratio = +raw.toFixed(3);
  const clamped = Math.min(ARM_RATIO_HI, Math.max(ARM_RATIO_LO, raw));
  note.clamped = clamped !== raw ? +clamped.toFixed(3) : null;
  return clamped * height;
}

/** Rig `rawGlbPath` onto `referenceGlbPath`'s skeleton; write to `outPath`.
 *  Options: yaw ('auto' -90deg default via preRotated=false), and fitHeight —
 *  a direct height fit (in reference BIND space) that overrides the arm-line
 *  scale heuristic. Use it whenever the heuristic misfires; see the note at the
 *  scale computation below.
 *
 *  armLineModel ('legacy' default, or 'perSide'): 'perSide' swaps the arm-line
 *  estimate for the per-side clamped median described at perSideArmLine. It is
 *  opt-in rather than default because the legacy mean is what all 1,672
 *  registered bodies were fitted with, and a 0.3% scale drift across the library
 *  is not worth taking as a side effect (the two agree to 0.3% on the one body
 *  whose fit is known good). New pipelines should pass 'perSide'.
 *
 *  preserveSourceArt (default false): bind the new body to the SOURCE's own
 *  materials instead of hand-copying a subset of PBR slots onto fresh ones, and
 *  skip the texture resample. Off, this function is byte-for-byte what it has
 *  always been (the humanoid path under 1,672 registered bodies); on, the
 *  output's appearance is the source's, complete with emissive maps, factors,
 *  alpha/doubleSided state, sampler + texCoord wiring and KHR material
 *  extensions. Any rebind of an ALREADY-ART-DIRECTED asset wants it on.
 *  Returns a fit report. */
export async function manualRigOntoReference(rawGlbPath, referenceGlbPath, outPath, opts = {}) {
  const K = opts.influences ?? 4;
  const POW = opts.falloff ?? 4;
  const preserveArt = opts.preserveSourceArt === true;

  // --- Reference rig: joints, bind-pose world positions, mesh bounds -------
  const doc = await openGlb(referenceGlbPath); // mutated in place, saved to outPath
  const root = doc.getRoot();
  const skin = root.listSkins()[0];
  if (!skin) throw new Error('reference model has no skin');
  // BIND-pose joint positions from the inverse bind matrices: this is the
  // space skinned vertices must live in, NOT the rest-pose world space.
  const { joints, jointPos, byName } = bindSkeleton(skin);
  const refBounds = getBounds(root.listScenes()[0]);
  // Bind-frame anchors (the bind space can be offset AND scaled relative to
  // the rest pose; the knight's is ~2.18x with the body axis at x=-1.11):
  // ground = the root joint's bind height, body axis = hips XZ, and the
  // T-pose arm line = wrist height above ground.
  const { groundY, centerX, centerZ, armLine: wristAbove } = bindAnchors(joints, jointPos, byName);

  const segments = buildSegments(joints, jointPos, byName, wristAbove);
  const sideGuard = 0.02 * wristAbove;
  const side = lateralityFn(joints, jointPos, centerX);

  // --- Raw mesh: read arrays, transform into reference bind space ----------
  // With preserveSourceArt the source document is MERGED into the output
  // document first, so every source Material has a complete, extension-carrying
  // clone owned by `doc` and the new body can simply point at it — there is
  // nothing left to hand-copy and therefore nothing left to silently drop.
  // Everything merged that ISN'T art (scenes, nodes, the source's own skin and
  // clips) is disposed once the geometry has been read; prune() clears the rest.
  const rawDoc = await openGlb(rawGlbPath);
  const srcMap = preserveArt ? mergeDocuments(doc, rawDoc) : null;
  const rawPrims = rawDoc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives());
  if (!rawPrims.length) throw new Error('raw model has no primitives');

  // Pass 1: rotated bounds + arm line (mean y of the widest 5% of vertices).
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const rotatedPerPrim = rawPrims.map((prim) => {
    const src = prim.getAttribute('POSITION').getArray();
    const out = new Float32Array(src.length);
    for (let v = 0; v < src.length; v += 3) {
      const p = opts.preRotated
        ? [src[v], src[v + 1], src[v + 2]]
        : ROT([src[v], src[v + 1], src[v + 2]]);
      out[v] = p[0];
      out[v + 1] = p[1];
      out[v + 2] = p[2];
      for (let k = 0; k < 3; k++) {
        if (p[k] < min[k]) min[k] = p[k];
        if (p[k] > max[k]) max[k] = p[k];
      }
    }
    return out;
  });
  const maxAbsX = Math.max(Math.abs(min[0]), Math.abs(max[0]));
  let armYSum = 0;
  let armN = 0;
  for (const arr of rotatedPerPrim) {
    for (let v = 0; v < arr.length; v += 3) {
      if (Math.abs(arr[v]) > 0.82 * maxAbsX) {
        armYSum += arr[v + 1];
        armN++;
      }
    }
  }
  let rawArmY = armYSum / Math.max(1, armN) - min[1]; // above feet
  const armLineNote = {};
  if (opts.armLineModel === 'perSide') {
    rawArmY = perSideArmLine(rotatedPerPrim, min, max, armLineNote) ?? rawArmY;
  }
  // The arm-line heuristic assumes a T-posed humanoid whose widest 5% of
  // vertices ARE the outstretched hands. On an A-posed, winged, caped, based or
  // simply non-humanoid mesh the widest slice sits somewhere else entirely and
  // the fit lands at the wrong scale. That is not a cosmetic miss: the reference
  // skeleton is a FIXED size on every body (handslot.r is bit-identical across
  // the whole library), so a mis-scaled mesh leaves every socket-attached prop
  // both mis-sized (by 1/k) and mis-placed (the mesh's fist moves to k x the
  // socket's offset while the socket stays put). Note the heuristic is
  // scale-INVARIANT — re-running it on already-fitted geometry reproduces the
  // same wrong answer — so a bad fit can only be corrected by overriding it.
  // fitHeight replaces it with a direct height fit against the reference.
  const scale = opts.fitHeight
    ? opts.fitHeight / Math.max(1e-6, max[1] - min[1])
    : wristAbove / rawArmY;
  const midX = (min[0] + max[0]) / 2;
  const midZ = (min[2] + max[2]) / 2;

  // Pass 2: final positions (feet at y=0, centered XZ) + weights.
  const report = {
    scale: +scale.toFixed(3),
    rawArmY: +rawArmY.toFixed(3),
    armLine: armLineNote,
    wristAbove: +wristAbove.toFixed(3),
    bindGroundY: +groundY.toFixed(3),
    bindCenter: [+centerX.toFixed(3), +centerZ.toFixed(3)],
    fitHeight: +((max[1] - min[1]) * scale).toFixed(2),
    refHeight: +(refBounds.max[1] - refBounds.min[1]).toFixed(2),
    verts: 0,
  };
  const built = rawPrims.map((prim, pi) => {
    const rot = rotatedPerPrim[pi];
    const n = rot.length / 3;
    report.verts += n;
    const pos = new Float32Array(rot.length);
    const jointsAttr = new Uint16Array(n * 4);
    const weightsAttr = new Float32Array(n * 4);
    for (let v = 0; v < n; v++) {
      const p = [
        (rot[v * 3] - midX) * scale + centerX,
        (rot[v * 3 + 1] - min[1]) * scale + groundY,
        (rot[v * 3 + 2] - midZ) * scale + centerZ,
      ];
      pos[v * 3] = p[0];
      pos[v * 3 + 1] = p[1];
      pos[v * 3 + 2] = p[2];
      // Nearest segments with laterality guard (relative to the body axis).
      solveVertex(p, v, segments, side, centerX, sideGuard, K, POW, jointsAttr, weightsAttr);
    }
    // Normals: rotate only (uniform scale + translation preserve direction).
    const nrmSrc = prim.getAttribute('NORMAL')?.getArray();
    let nrm = null;
    if (nrmSrc) {
      nrm = new Float32Array(nrmSrc.length);
      for (let v = 0; v < nrmSrc.length; v += 3) {
        const r = opts.preRotated
          ? [nrmSrc[v], nrmSrc[v + 1], nrmSrc[v + 2]]
          : ROT([nrmSrc[v], nrmSrc[v + 1], nrmSrc[v + 2]]);
        nrm[v] = r[0];
        nrm[v + 1] = r[1];
        nrm[v + 2] = r[2];
      }
    }
    return {
      pos,
      nrm,
      jointsAttr,
      weightsAttr,
      uv: prim.getAttribute('TEXCOORD_0')?.getArray() ?? null,
      indices: prim.getIndices()?.getArray() ?? null,
      // preserveSourceArt: the merged clone of the source material, already in
      // this document. Otherwise the source-document material, hand-copied below.
      material: (srcMap && srcMap.get(prim.getMaterial())) || prim.getMaterial(),
    };
  });

  // --- Rebuild the reference doc: drop its meshes, add the new skinned body -
  // Under preserveSourceArt the merged source scenes/nodes/skin/animations go
  // too: only its materials and textures are wanted, and prune() below cannot
  // reach them while a merged scene still roots them.
  if (srcMap) {
    const byType = (t) => [...srcMap.values()].filter((p) => p.propertyType === t);
    for (const t of ['Animation', 'Scene', 'Node', 'Skin']) for (const p of byType(t)) p.dispose();
  }
  for (const node of root.listNodes()) if (node.getMesh()) node.setMesh(null);
  for (const mesh of root.listMeshes()) mesh.dispose();

  const buffer = root.listBuffers()[0];
  const mkAcc = (arr, type) => doc.createAccessor().setArray(arr).setType(type).setBuffer(buffer);
  const mesh = doc.createMesh('body');
  for (const b of built) {
    // Material. preserveSourceArt: b.material is ALREADY a complete clone of
    // the source's, owned by this doc (via doc.merge) — use it as-is, because
    // any hand-copy is a list of slots someone has to remember to extend.
    // Legacy path: copy the raw PBR set (color + normal + ORM) into this doc.
    let mat = preserveArt ? b.material : null;
    if (!mat) {
      mat = doc.createMaterial(b.material?.getName() ?? 'body');
      const copyTex = (getter, setter) => {
        const t = b.material?.[getter]();
        if (!t) return;
        const nt = doc.createTexture(t.getName()).setImage(t.getImage()).setMimeType(t.getMimeType());
        mat[setter](nt);
      };
      copyTex('getBaseColorTexture', 'setBaseColorTexture');
      copyTex('getNormalTexture', 'setNormalTexture');
      copyTex('getMetallicRoughnessTexture', 'setMetallicRoughnessTexture');
      mat.setMetallicFactor(b.material?.getMetallicFactor() ?? 0);
      mat.setRoughnessFactor(b.material?.getRoughnessFactor() ?? 1);
    }

    const prim = doc
      .createPrimitive()
      .setMode(4)
      .setMaterial(mat)
      .setAttribute('POSITION', mkAcc(b.pos, 'VEC3'))
      .setAttribute('JOINTS_0', mkAcc(b.jointsAttr, 'VEC4'))
      .setAttribute('WEIGHTS_0', mkAcc(b.weightsAttr, 'VEC4'));
    if (b.nrm) prim.setAttribute('NORMAL', mkAcc(b.nrm, 'VEC3'));
    if (b.uv) prim.setAttribute('TEXCOORD_0', mkAcc(new Float32Array(b.uv), 'VEC2'));
    if (b.indices) prim.setIndices(mkAcc(b.indices, 'SCALAR'));
    mesh.addPrimitive(prim);
  }
  const bodyNode = doc.createNode('body').setMesh(mesh).setSkin(skin);
  root.listScenes()[0].addChild(bodyNode);

  // textureCompress re-encodes and DOWNSAMPLES to 1024: fine for a raw
  // generated body whose atlas is incidental, destructive for art someone
  // authored. Under preserveSourceArt it is off unless asked for explicitly —
  // compressing art is a separate, deliberate decision from rigging it.
  const steps = [prune(), dedup()];
  const compress = opts.textureCompress ?? !preserveArt;
  if (compress) {
    steps.push(
      textureCompress(
        compress === true ? { targetFormat: 'webp', resize: [1024, 1024] } : compress,
      ),
    );
  }
  await doc.transform(...steps);
  // A GLB may hold at most one buffer, and mergeDocuments brings the source's
  // along; after prune it is empty, but it still has to be removed. No-op on
  // the default path, which never gains a second buffer.
  const buffers = root.listBuffers();
  if (buffers.length > 1) {
    for (const acc of root.listAccessors())
      if (acc.getBuffer() !== buffers[0]) acc.setBuffer(buffers[0]);
    for (const extra of buffers.slice(1)) extra.dispose();
  }
  // The reference's clip library came across VERBATIM, and the reference has
  // historically carried a scale channel on every bone of every clip - 444 of
  // them on knight.glb, all constant (1,1,1), which is why no numeric check
  // ever saw them. Constant is the dangerous kind: inert on the reference,
  // whose bind scale IS 1, but on a body bound at any other scale that track
  // FORCES scale to 1 for its clip and releases it the moment a clip without
  // the track takes over - the body snaps size at the clip boundary. The
  // reference itself has been stripped (scripts/realm_assets/strip_scale.mjs);
  // this is the second lock, so a reference regression cannot reseed 716,000
  // of these across the library a second time.
  report.strippedScaleChannels = stripScaleChannels(root);
  await saveGlb(doc, outPath);
  report.clips = root.listAnimations().length;
  report.joints = joints.length;
  report.textureBytes = root
    .listTextures()
    .reduce((s, t) => s + (t.getImage()?.byteLength ?? 0), 0);
  report.materials = root.listMaterials().length;
  report.textures = root.listTextures().length;
  return report;
}

/** Re-solve the skin weights of an ALREADY-RIGGED model against its OWN
 *  skeleton, in its OWN document. Writes ONLY JOINTS_0 and WEIGHTS_0.
 *
 *  This is the repair operation for "the bind is wrong" — a shoulder that
 *  tears, a cap of vertices stranded on the wrong bone, weights that no amount
 *  of smoothing can rescue because the discontinuity is in the assignment, not
 *  in the falloff. Because it never opens a second document there is no
 *  reference whose materials, textures, UV wiring, clip library, joint names,
 *  inverse bind matrices or bind scale can leak in: geometry, art and animation
 *  are all bit-preserved, and the only thing that changes is which bones each
 *  vertex follows. No prune/dedup/textureCompress runs either — none of them
 *  are rigging, and every one of them can alter the art.
 *
 *  Returns a report incl. the before/after dominant-joint histogram, which is
 *  where a bad bind shows up numerically (e.g. 10k body vertices pinned to
 *  Hips and zero on a shoulder that the clips animate).
 *
 *  WEIGHT MODEL. Default: straight-line distance to the bone segments, as
 *  above. `weightModel: 'geodesic'` swaps in surface distance across the welded
 *  triangle graph instead (see ./geodesic_weights.mjs). Reach for it whenever
 *  the body is hollow, thin-limbed, plated or A-posed — i.e. whenever two
 *  surfaces that different bones own are CLOSE IN THE AIR: a ribcage's inner
 *  wall beside the upper arm, a pelvis plate hanging in front of the thighs,
 *  claws past the wrist. Euclidean distance cannot tell those apart and hands
 *  the surface to the wrong bone; surface distance can, because the mesh path
 *  between them is long even where the gap is not.
 *
 *  The default path is untouched by the flag and stays byte-for-byte what it
 *  has always been. Everything else about the operation — writing only
 *  JOINTS_0/WEIGHTS_0, reusing the source accessors' storage classes, no
 *  prune/dedup/textureCompress — is identical under either model. */
export async function rebindSkinInPlace(srcGlbPath, outPath, opts = {}) {
  const K = opts.influences ?? 4;
  const POW = opts.falloff ?? 4;
  const geodesic = opts.weightModel === 'geodesic';

  const doc = await openGlb(srcGlbPath);
  const root = doc.getRoot();
  const skin = root.listSkins()[opts.skinIndex ?? 0];
  if (!skin) throw new Error('model has no skin to rebind');
  if (!skin.getInverseBindMatrices()) throw new Error('skin has no inverse bind matrices');

  const { joints, jointPos, byName } = bindSkeleton(skin);
  const { groundY, centerX, centerZ, armLine } = bindAnchors(joints, jointPos, byName);
  const segments = buildSegments(joints, jointPos, byName, armLine);
  const sideGuard = 0.02 * armLine;
  const side = lateralityFn(joints, jointPos, centerX);

  // Only the primitives actually driven by THIS skin. A skinned mesh node's own
  // transform is ignored per spec, so POSITION already lives in the same bind
  // space as inverse(IBM) — no rotate, no scale, no recentre. That is the whole
  // reason this path cannot move or resize the body.
  const prims = [];
  for (const node of root.listNodes()) {
    if (node.getSkin() !== skin) continue;
    const mesh = node.getMesh();
    if (!mesh) continue;
    for (const prim of mesh.listPrimitives()) if (!prims.includes(prim)) prims.push(prim);
  }
  if (!prims.length) throw new Error('no primitives are bound to this skin');

  const histogram = (jArr, wArr, n) => {
    const counts = new Map();
    for (let v = 0; v < n; v++)
      for (let k = 0; k < 4; k++)
        if (wArr[v * 4 + k] > 0.5) counts.set(jArr[v * 4 + k], (counts.get(jArr[v * 4 + k]) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([j, c]) => [joints[j].getName(), c]);
  };

  const report = {
    joints: joints.length,
    clips: root.listAnimations().length,
    prims: prims.length,
    verts: 0,
    groundY: +groundY.toFixed(4),
    bindCenter: [+centerX.toFixed(4), +centerZ.toFixed(4)],
    armLine: +armLine.toFixed(4),
    before: null,
    after: null,
  };

  // Geodesic model: solved once for the WHOLE skin, because the surface graph
  // spans every primitive (a body split across prims is still one surface).
  // The write-back below is shared with the default path, so the accessor
  // storage classes and the integer-weight quantisation cannot drift apart.
  let geo = null;
  if (geodesic) {
    geo = solveGeodesicWeights({
      prims: prims.filter((prim) => prim.getAttribute('POSITION')),
      joints,
      jointPos,
      byName,
      side,
      centerX,
      sideGuard,
      armLine,
      influences: K,
      // A vertex no bone seed can reach across the surface is a detached shell.
      // Falling back to the proven Euclidean solver there means this model can
      // never leave a piece of the body unweighted.
      fallbackSolve: (p) => {
        const jTmp = new Uint32Array(4);
        const wTmp = new Float32Array(4);
        solveVertex(p, 0, segments, side, centerX, sideGuard, K, POW, jTmp, wTmp);
        const m = new Map();
        for (let k = 0; k < 4; k++) if (wTmp[k] > 0) m.set(jTmp[k], (m.get(jTmp[k]) ?? 0) + wTmp[k]);
        return m;
      },
      opts,
    });
    report.geodesic = geo.report;
  }

  for (const prim of prims) {
    const posAcc = prim.getAttribute('POSITION');
    const jAcc = prim.getAttribute('JOINTS_0');
    const wAcc = prim.getAttribute('WEIGHTS_0');
    if (!posAcc || !jAcc || !wAcc) continue;
    const pos = posAcc.getArray();
    const n = posAcc.getCount();
    report.verts += n;
    if (!report.before) report.before = histogram(jAcc.getArray(), wAcc.getArray(), n);

    // Reuse the existing accessors' storage classes so the file layout, the
    // component types and the byte cost stay exactly what the source shipped.
    const JCtor = joints.length > 255 && jAcc.getArray().BYTES_PER_ELEMENT === 1
      ? Uint16Array
      : jAcc.getArray().constructor;
    const jOut = new JCtor(n * 4);
    const wSolve = new Float32Array(n * 4);
    if (geo) {
      const solved = geo.perPrim.get(prim);
      jOut.set(solved.j);
      wSolve.set(solved.w);
    } else {
      const p = [0, 0, 0];
      for (let v = 0; v < n; v++) {
        p[0] = pos[v * 3];
        p[1] = pos[v * 3 + 1];
        p[2] = pos[v * 3 + 2];
        solveVertex(p, v, segments, side, centerX, sideGuard, K, POW, jOut, wSolve);
      }
    }
    jAcc.setArray(jOut);

    const WCtor = wAcc.getArray().constructor;
    if (WCtor === Float32Array) {
      wAcc.setArray(wSolve);
    } else {
      // Normalised integer weights: quantise, then fix rounding drift on the
      // largest influence so each vertex still sums to exactly full scale.
      const scale = WCtor === Uint8Array ? 255 : 65535;
      const wOut = new WCtor(n * 4);
      for (let v = 0; v < n; v++) {
        let acc = 0;
        let big = 0;
        for (let k = 0; k < 4; k++) {
          wOut[v * 4 + k] = Math.round(wSolve[v * 4 + k] * scale);
          acc += wOut[v * 4 + k];
          if (wSolve[v * 4 + k] > wSolve[v * 4 + big]) big = k;
        }
        wOut[v * 4 + big] += scale - acc;
      }
      wAcc.setArray(wOut);
    }
    report.after = histogram(jOut, wSolve, n);
  }

  await saveGlb(doc, outPath);
  return report;
}
