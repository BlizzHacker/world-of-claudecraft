#!/usr/bin/env node
// gen_appearance_masks.mjs — offline appearance-region mask generator for the
// realm override bodies (/opt/cr-realms-store/<realm>/*.glb).
//
// Every override body is ONE mesh / ONE material / ONE baked atlas, so the
// client cannot recolour hair by material swap the way the modular bodies do.
// This pass derives a per-body REGION MASK instead: classify vertices off the
// rig (strong skin weight to the Head joint chain = head; above a tilted
// plane through the brow line = scalp/hair; below = face skin; everything
// else = outfit), then rasterize each class's UV footprint into a sidecar
// PNG the client's material hook samples (src/render/characters/
// override_appearance.ts): R = hair, G = face skin, B unused.
//
// READ-ONLY over the GLBs. Nothing is ever written through gltf-transform
// (the .tmp-extension trap that once corrupted 64 live bodies cannot arise:
// masks are separate PNGs written with sharp).
//
// Hood/helmet handling: a hood is head-weighted and sits above the brow
// plane, exactly like hair. Two defences: (1) connected-component analysis —
// a scalp candidate living in a mesh component that also carries substantial
// torso-weighted geometry (a hood flowing into a cloak/collar) is stripped to
// outfit; (2) any body whose surviving hair area is under --min-hair-pct of
// its mapped texels ships an EMPTY hair channel, so the hair wheel no-ops
// gracefully instead of dyeing a hood. --no-hair <name.glb> forces (2) for
// bodies the render review rejects.
//
// Usage:
//   node scripts/realm_assets/gen_appearance_masks.mjs --out /opt/meshy-gen/masks \
//     /opt/cr-realms-store/infernal/realm_infernal_class_warrior_f.glb ...
//   node scripts/realm_assets/gen_appearance_masks.mjs --store /opt/cr-realms-store/infernal \
//     --out /opt/meshy-gen/masks --report /opt/meshy-gen/masks/report.json
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const opt = {
  out: '/opt/meshy-gen/masks',
  store: null,
  size: 1024,
  minHairPct: 2.0,
  eyeFrac: 0.42, // brow plane height, as a fraction of head span above the Head joint
  tilt: 0.55, // forward tilt of the brow plane normal (tan): nape passes lower than brow
  maxFrontFrac: 0.025, // above this share of hair dead-centre before the face = hood; empty the channel
  report: null,
  force: false,
  debug: false,
  noHair: new Set(),
  files: [],
};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--out') opt.out = args[++i];
  else if (a === '--store') opt.store = args[++i];
  else if (a === '--size') opt.size = Number(args[++i]);
  else if (a === '--min-hair-pct') opt.minHairPct = Number(args[++i]);
  else if (a === '--eye-frac') opt.eyeFrac = Number(args[++i]);
  else if (a === '--tilt') opt.tilt = Number(args[++i]);
  else if (a === '--max-front-frac') opt.maxFrontFrac = Number(args[++i]);
  else if (a === '--report') opt.report = args[++i];
  else if (a === '--force') opt.force = true;
  else if (a === '--debug') opt.debug = true;
  else if (a === '--no-hair') opt.noHair.add(basename(args[++i]));
  else opt.files.push(a);
}
if (opt.store) {
  for (const f of readdirSync(opt.store)) {
    if (!f.endsWith('.glb')) continue;
    const p = join(opt.store, f);
    if (statSync(p).isFile()) opt.files.push(p);
  }
}
if (!opt.files.length) {
  console.error('no GLBs given (positional paths or --store <dir>)');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Small linear algebra (no deps): proper 4x4 inverse for the IBMs — the rigs
// carry scale, so the orthonormal shortcut (-R^T t) lands in the wrong space.
// ---------------------------------------------------------------------------
function invertMat4(m) {
  const [
    a00, a01, a02, a03, a10, a11, a12, a13,
    a20, a21, a22, a23, a30, a31, a32, a33,
  ] = m;
  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  det = 1.0 / det;
  return [
    (a11 * b11 - a12 * b10 + a13 * b09) * det,
    (a02 * b10 - a01 * b11 - a03 * b09) * det,
    (a31 * b05 - a32 * b04 + a33 * b03) * det,
    (a22 * b04 - a21 * b05 - a23 * b03) * det,
    (a12 * b08 - a10 * b11 - a13 * b07) * det,
    (a00 * b11 - a02 * b08 + a03 * b07) * det,
    (a32 * b02 - a30 * b05 - a33 * b01) * det,
    (a20 * b05 - a22 * b02 + a23 * b01) * det,
    (a10 * b10 - a11 * b08 + a13 * b06) * det,
    (a01 * b08 - a00 * b10 - a03 * b06) * det,
    (a30 * b04 - a31 * b02 + a33 * b00) * det,
    (a21 * b02 - a20 * b04 - a23 * b00) * det,
    (a11 * b07 - a10 * b09 - a12 * b06) * det,
    (a00 * b09 - a01 * b07 + a02 * b06) * det,
    (a31 * b01 - a30 * b03 - a32 * b00) * det,
    (a20 * b03 - a21 * b01 + a22 * b00) * det,
  ];
}
const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
};

// ---------------------------------------------------------------------------
// Per-body pipeline
// ---------------------------------------------------------------------------
const HEAD_NAMES = new Set(['head', 'head_end', 'headfront']);
const CLS_NONE = 0;
const CLS_HAIR = 1;
const CLS_FACE = 2;
const CLS_OUTFIT = 3;

class UnionFind {
  constructor(n) {
    this.p = new Int32Array(n);
    for (let i = 0; i < n; i++) this.p[i] = i;
  }
  find(x) {
    let r = x;
    while (this.p[r] !== r) r = this.p[r];
    while (this.p[x] !== r) {
      const n = this.p[x];
      this.p[x] = r;
      x = n;
    }
    return r;
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.p[ra] = rb;
  }
}

function readAccessor(acc) {
  // getElement dequantizes normalized integer storage into floats for us.
  const n = acc.getCount();
  const el = [];
  const size = acc.getElementSize();
  const out = new Float32Array(n * size);
  for (let i = 0; i < n; i++) {
    acc.getElement(i, el);
    for (let k = 0; k < size; k++) out[i * size + k] = el[k];
  }
  return out;
}

async function processBody(io, sharp, path) {
  const name = basename(path);
  const bytes = readFileSync(path);
  // EXT_meshopt_compression needs a different decode path (the three
  // monster_warrior files); log and skip rather than half-reading them.
  if (bytes.includes('EXT_meshopt_compression')) {
    return { file: name, skipped: 'meshopt-compressed' };
  }
  let doc;
  try {
    doc = await io.readBinary(new Uint8Array(bytes));
  } catch (err) {
    return { file: name, skipped: `unreadable: ${err.message}` };
  }
  const root = doc.getRoot();
  const skin = root.listSkins()[0];
  if (!skin) return { file: name, skipped: 'no skin (not a rigged body)' };
  const joints = skin.listJoints();
  const lower = joints.map((j) => (j.getName() || '').toLowerCase());
  const headIdx = lower.indexOf('head');
  if (headIdx < 0) return { file: name, skipped: 'no Head joint' };
  const neckIdx = lower.indexOf('neck');

  // Head SET = Head + its descendant joints (head_end / headfront on meshy24,
  // whatever hair/jaw helpers other rigs carry).
  const headSet = new Set([headIdx]);
  const headNode = joints[headIdx];
  const stack = [...headNode.listChildren()];
  while (stack.length) {
    const n = stack.pop();
    const idx = joints.indexOf(n);
    if (idx >= 0) headSet.add(idx);
    stack.push(...n.listChildren());
  }
  for (let i = 0; i < lower.length; i++) if (HEAD_NAMES.has(lower[i])) headSet.add(i);

  // Bind-pose joint positions from the IBMs (proper inverse: rigs carry scale).
  const ibm = skin.getInverseBindMatrices();
  if (!ibm) return { file: name, skipped: 'no inverseBindMatrices' };
  const jointPos = [];
  const el = [];
  for (let i = 0; i < joints.length; i++) {
    ibm.getElement(i, el);
    const inv = invertMat4(el);
    if (!inv) return { file: name, skipped: 'singular IBM' };
    jointPos.push([inv[12], inv[13], inv[14]]);
  }
  const headPos = jointPos[headIdx];
  const neckPos = neckIdx >= 0 ? jointPos[neckIdx] : v3.sub(headPos, [0, 0.1, 0]);
  const up = v3.norm(v3.sub(headPos, neckPos));
  // Forward from the headfront helper when the rig has one, else +Z.
  const hfIdx = lower.indexOf('headfront');
  let fwd = hfIdx >= 0 ? v3.sub(jointPos[hfIdx], headPos) : [0, 0, 1];
  fwd = v3.sub(fwd, v3.scale(up, v3.dot(fwd, up)));
  fwd = v3.norm(fwd);

  // Gather every skinned primitive that carries UVs.
  const prims = [];
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (
        prim.getAttribute('POSITION') &&
        prim.getAttribute('TEXCOORD_0') &&
        prim.getAttribute('JOINTS_0') &&
        prim.getAttribute('WEIGHTS_0')
      ) {
        prims.push(prim);
      }
    }
  }
  if (!prims.length) return { file: name, skipped: 'no skinned textured primitive' };

  // Mask resolution: capped, and never larger than the atlas.
  let atlasDim = 0;
  const tex = prims[0].getMaterial()?.getBaseColorTexture();
  const img = tex?.getImage();
  if (img && img[0] === 0x89) {
    const dv = new DataView(img.buffer, img.byteOffset);
    atlasDim = Math.max(dv.getUint32(16), dv.getUint32(20));
  }
  const S = Math.min(opt.size, atlasDim || opt.size);

  // Decoded atlas at low resolution, for the colour gate on chained hair
  // shells: a braid tail is painted the same colour as the scalp hair, a
  // neckline cloth or pauldron is not.
  const ATLAS_S = 256;
  let atlasPx = null;
  if (img) {
    try {
      atlasPx = await sharp(Buffer.from(img))
        .resize(ATLAS_S, ATLAS_S, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer();
    } catch {
      atlasPx = null;
    }
  }
  const atlasColorAtUV = (u, v) => {
    if (!atlasPx) return null;
    const x = Math.min(ATLAS_S - 1, Math.max(0, Math.floor((u - Math.floor(u)) * ATLAS_S)));
    const y = Math.min(ATLAS_S - 1, Math.max(0, Math.floor((v - Math.floor(v)) * ATLAS_S)));
    const i = (y * ATLAS_S + x) * 3;
    return [atlasPx[i] / 255, atlasPx[i + 1] / 255, atlasPx[i + 2] / 255];
  };

  const cls = new Uint8Array(S * S); // texel classes, priority outfit>face>hair
  let totalVerts = 0;
  let hairVerts = 0;
  let headVerts = 0;
  let strippedComponents = 0;
  let components = 0;

  for (const prim of prims) {
    const pos = readAccessor(prim.getAttribute('POSITION'));
    const uv = readAccessor(prim.getAttribute('TEXCOORD_0'));
    const jnt = readAccessor(prim.getAttribute('JOINTS_0'));
    const wgt = readAccessor(prim.getAttribute('WEIGHTS_0'));
    const idxAcc = prim.getIndices();
    const nVerts = pos.length / 3;
    totalVerts += nVerts;
    const indices = idxAcc
      ? readAccessor(idxAcc)
      : Float32Array.from({ length: nVerts }, (_, i) => i);

    // Per-vertex head weight + torso-dominance.
    const headW = new Float32Array(nVerts);
    const torsoDom = new Uint8Array(nVerts);
    for (let i = 0; i < nVerts; i++) {
      let hw = 0;
      let maxW = 0;
      let maxJ = -1;
      for (let k = 0; k < 4; k++) {
        const j = jnt[i * 4 + k] | 0;
        const w = wgt[i * 4 + k];
        if (headSet.has(j)) hw += w;
        if (w > maxW) {
          maxW = w;
          maxJ = j;
        }
      }
      headW[i] = hw;
      // "Torso-dominant": strongest influence is neither the head chain nor
      // the neck — the signature of a hood/cloak flowing onto the shoulders.
      torsoDom[i] = maxW > 0.5 && !headSet.has(maxJ) && maxJ !== neckIdx ? 1 : 0;
    }

    // Head span along `up`, over solidly head-weighted vertices.
    const sBase = v3.dot(headPos, up);
    let sTop = sBase;
    for (let i = 0; i < nVerts; i++) {
      if (headW[i] >= 0.5) {
        headVerts++;
        const s = pos[i * 3] * up[0] + pos[i * 3 + 1] * up[1] + pos[i * 3 + 2] * up[2];
        if (s > sTop) sTop = s;
      }
    }
    const span = sTop - sBase;

    // Brow plane: through B = head + eyeFrac*span along up, normal tilted
    // forward so the nape passes below brow height but the face never does.
    const B = v3.add(headPos, v3.scale(up, opt.eyeFrac * span));
    const n = v3.norm(v3.sub(up, v3.scale(fwd, opt.tilt)));

    const vcls = new Uint8Array(nVerts); // vertex classes
    for (let i = 0; i < nVerts; i++) {
      const p = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
      const s = v3.dot(p, up);
      if (span > 1e-6 && headW[i] >= 0.6 && v3.dot(v3.sub(p, B), n) > 0) {
        vcls[i] = CLS_HAIR;
      } else if (headW[i] >= 0.35 && s >= sBase - 0.25 * span) {
        vcls[i] = CLS_FACE;
      } else {
        vcls[i] = CLS_OUTFIT;
      }
    }

    // Connected components over the index topology; strip "hair" that lives
    // in a garment component (hood/cloak: scalp candidates sharing a shell
    // with substantial torso-weighted geometry).
    const uf = new UnionFind(nVerts);
    for (let t = 0; t < indices.length; t += 3) {
      uf.union(indices[t] | 0, indices[t + 1] | 0);
      uf.union(indices[t] | 0, indices[t + 2] | 0);
    }
    const compStats = new Map(); // root -> {n, hair, face, torso}
    for (let i = 0; i < nVerts; i++) {
      const r = uf.find(i);
      let st = compStats.get(r);
      if (!st) {
        st = { n: 0, hair: 0, face: 0, torso: 0, headWSum: 0, sMin: 1e9, sMax: -1e9, axMax: 0 };
        compStats.set(r, st);
      }
      st.n++;
      if (vcls[i] === CLS_HAIR) st.hair++;
      if (vcls[i] === CLS_FACE) st.face++;
      if (torsoDom[i]) st.torso++;
      st.headWSum += headW[i];
      {
        const p = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
        const s = v3.dot(p, up) - sBase;
        if (s < st.sMin) st.sMin = s;
        if (s > st.sMax) st.sMax = s;
        const rel = v3.sub(p, headPos);
        const along = v3.dot(rel, up);
        const radial = v3.sub(rel, v3.scale(up, along));
        const ax = Math.hypot(radial[0], radial[1], radial[2]);
        if (ax > st.axMax) st.axMax = ax;
      }
    }
    components += compStats.size;
    // Component triage. Three shapes carry scalp candidates:
    //  - a PURE HAIR SHELL (braid, bun, bangs): mostly hair-classified, no
    //    face, little torso weight. PROMOTE the whole shell to hair so a
    //    braid's spine-weighted tail recolours with its head-weighted root
    //    (per-vertex classes would cut the braid mid-length).
    //  - the BODY component: carries the true scalp cap AND the face; keep
    //    per-vertex classes exactly as computed.
    //  - a GARMENT (hood flowing into a robe, pauldrons reaching the head
    //    plane): substantial torso weight, no face; strip its hair.
    const promote = new Set();
    const stripComp = new Set();
    const meshIsOneBlob = compStats.size === 1;
    for (const [r, st] of compStats) {
      if (!st.hair) {
        // Near-head hairless shells: the braid-tail candidates. Debug only.
        if (opt.debug && st.n >= 40 && st.sMax > -0.6 * span && st.axMax < 3 * span && !st.face) {
          console.log(
            `  nearhead n=${st.n} torso=${((100 * st.torso) / st.n).toFixed(1)}% meanHeadW=${(st.headWSum / st.n).toFixed(2)} s=[${(st.sMin / (span || 1)).toFixed(2)},${(st.sMax / (span || 1)).toFixed(2)}]span ax=${(st.axMax / (span || 1)).toFixed(2)}span`,
          );
        }
        continue;
      }
      if (opt.debug && st.hair > 20) {
        console.log(
          `  comp n=${st.n} hair=${((100 * st.hair) / st.n).toFixed(1)}% face=${((100 * st.face) / st.n).toFixed(1)}% torso=${((100 * st.torso) / st.n).toFixed(1)}%` +
            ` meanHeadW=${(st.headWSum / st.n).toFixed(2)} s=[${(st.sMin / (span || 1)).toFixed(2)},${(st.sMax / (span || 1)).toFixed(2)}]span ax=${(st.axMax / (span || 1)).toFixed(2)}span`,
        );
      }
      // A fully-welded single-shell body cannot be judged by components; keep
      // the geometric class and let the area gate / render review decide.
      if (meshIsOneBlob) break;
      const hairFrac = st.hair / st.n;
      const faceFrac = st.face / st.n;
      const torsoFrac = st.torso / st.n;
      if (st.hair < 40) {
        stripComp.add(r); // noise
        strippedComponents++;
      } else if (hairFrac >= 0.5 && torsoFrac <= 0.3 && faceFrac < 0.05) {
        promote.add(r);
      } else if (faceFrac >= 0.05) {
        // body/head component: per-vertex classes stand
      } else if (torsoFrac > hairFrac) {
        stripComp.add(r);
        strippedComponents++;
      }
      // remaining mixed shells keep their per-vertex classes
    }
    for (let i = 0; i < nVerts; i++) {
      const r = uf.find(i);
      if (promote.has(r) && vcls[i] !== CLS_FACE) vcls[i] = CLS_HAIR;
      else if (vcls[i] === CLS_HAIR && stripComp.has(r)) vcls[i] = CLS_OUTFIT;
    }

    // ---- Colour-seeded refinement --------------------------------------
    // Everything below leans on the atlas: geometry alone cannot tell a
    // braid tail from a collar scarf, or a hood's inner rim from a jaw. The
    // painter can — hair shells are painted the hair colour, skin is skin.
    {
      const meanColorOf = (verts) => {
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let sn = 0;
        for (const i of verts) {
          const c = atlasColorAtUV(uv[i * 2], uv[i * 2 + 1]);
          if (!c) continue;
          sr += c[0];
          sg += c[1];
          sb += c[2];
          sn++;
        }
        return sn ? [sr / sn, sg / sn, sb / sn] : null;
      };
      const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
      const satOf = (c) => {
        const mx = Math.max(c[0], c[1], c[2]);
        return mx === 0 ? 0 : (mx - Math.min(c[0], c[1], c[2])) / mx;
      };
      /** Same-paint test: luma within 2x, chroma direction aligned, and a
       *  matching saturation band (what rejects a grey scarf whose luma
       *  happens to sit inside dark-brown hair's band). */
      const samePaint = (m, seed) => {
        if (!m || !seed) return false;
        const ratio = Math.max(lum(m), 0.02) / Math.max(lum(seed), 0.02);
        if (ratio < 0.5 || ratio > 2.0) return false;
        if (Math.abs(satOf(m) - satOf(seed)) > 0.3) return false;
        const norm = (c) => {
          const l = Math.hypot(c[0], c[1], c[2]) || 1;
          return [c[0] / l, c[1] / l, c[2] / l];
        };
        const a = norm(seed);
        const b = norm(m);
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] > 0.95;
      };

      // Vertex lists per component (only for comps that might matter).
      const compVerts = new Map();
      for (let i = 0; i < nVerts; i++) {
        const r = uf.find(i);
        let arr = compVerts.get(r);
        if (!arr) {
          arr = [];
          compVerts.set(r, arr);
        }
        arr.push(i);
      }

      // HAIR seed: high-confidence hair texels (plane + pure-shell promote).
      const hairSeedVerts = [];
      for (let i = 0; i < nVerts; i++) if (vcls[i] === CLS_HAIR) hairSeedVerts.push(i);
      const hairSeed = hairSeedVerts.length > 20 ? meanColorOf(hairSeedVerts) : null;

      // FACE seed: the BRIGHT half of the face texels. The face class right
      // now still contains garment pollution (a hood's inner rim is
      // head-weighted below the brow plane exactly like a jaw); skin is the
      // bright cluster of the two on every atlas seen so far.
      const faceLum = [];
      for (let i = 0; i < nVerts; i++) {
        if (vcls[i] !== CLS_FACE) continue;
        const c = atlasColorAtUV(uv[i * 2], uv[i * 2 + 1]);
        if (c) faceLum.push([i, lum(c)]);
      }
      faceLum.sort((a, b) => b[1] - a[1]);
      const faceSeed = faceLum.length > 40
        ? meanColorOf(faceLum.slice(0, Math.floor(faceLum.length / 2)).map((e) => e[0]))
        : null;

      // FACE cleanup: a component keeps its face class only when its
      // face-classified texels are painted like skin. This is what takes the
      // skin tint OFF a hood (rogue_f) — and what frees a face-framing hair
      // strand's lower verts to join the hair promotion below.
      if (faceSeed) {
        for (const [r, verts] of compVerts) {
          const st = compStats.get(r);
          if (!st || !st.face) continue;
          const faceVerts = verts.filter((i) => vcls[i] === CLS_FACE);
          if (!faceVerts.length) continue;
          if (!samePaint(meanColorOf(faceVerts), faceSeed)) {
            for (const i of faceVerts) vcls[i] = CLS_OUTFIT;
          }
        }
      }

      // MIXED-STRAND promotion: a face-framing strand crosses the brow plane
      // (upper verts hair, lower verts previously face/none). After the face
      // cleanup its comp is face-free; if the whole shell is painted like the
      // hair seed and carries no torso weight, the whole shell is hair.
      if (hairSeed) {
        for (const [r, verts] of compVerts) {
          const st = compStats.get(r);
          if (!st || !st.hair || promote.has(r) || stripComp.has(r)) continue;
          if (st.torso / st.n > 0.3) continue;
          if (st.sMin < -3.5 * span || st.axMax > 1.5 * span) continue;
          if (verts.some((i) => vcls[i] === CLS_FACE)) continue; // still facial
          if (!samePaint(meanColorOf(verts), hairSeed)) continue;
          for (const i of verts) vcls[i] = CLS_HAIR;
        }
      }

      // CONTACT-CHAIN promotion: a braid/ponytail is shell soup — its tail
      // pieces carry neck weight (not head), sit below the brow plane, and
      // classify as nothing above. Measured on class_warrior_f: tail shells
      // are face-free with torso dominance <= ~20%, while armour shells near
      // the head run 55-100%. Chain hair outward: a face-free, low-torso,
      // hair-painted component that TOUCHES hair geometry joins it, iterated
      // so the braid walks down shell by shell. A hood that survives all of
      // this grows LARGE — which is what the area gate and the per-body
      // report are for.
      //
      // tol ~5cm on a 1.7m body: the ponytail's top shells start ~4-6cm
      // below where the plane-classified scalp hair ends, so a weld-tight
      // tolerance never makes first contact.
      const tol = 0.25 * (span || 0.1);
      const cell = tol;
      const keyOf = (x, y, z) =>
        `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
      const hash = new Map();
      const pushHair = (i) => {
        const k = keyOf(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        let arr = hash.get(k);
        if (!arr) {
          arr = [];
          hash.set(k, arr);
        }
        arr.push(i);
      };
      for (let i = 0; i < nVerts; i++) if (vcls[i] === CLS_HAIR) pushHair(i);
      const nearHair = (i) => {
        const x = pos[i * 3];
        const y = pos[i * 3 + 1];
        const z = pos[i * 3 + 2];
        for (let dx = -1; dx <= 1; dx++)
          for (let dy = -1; dy <= 1; dy++)
            for (let dz = -1; dz <= 1; dz++) {
              const arr = hash.get(keyOf(x + dx * cell, y + dy * cell, z + dz * cell));
              if (!arr) continue;
              for (const j of arr) {
                const ddx = pos[j * 3] - x;
                const ddy = pos[j * 3 + 1] - y;
                const ddz = pos[j * 3 + 2] - z;
                if (ddx * ddx + ddy * ddy + ddz * ddz <= tol * tol) return true;
              }
            }
        return false;
      };
      const chain = new Map();
      for (const [r, verts] of compVerts) {
        const st = compStats.get(r);
        if (!st || st.n < 12 || st.torso / st.n > 0.3) continue;
        if (promote.has(r) || stripComp.has(r)) continue;
        if (verts.some((i) => vcls[i] === CLS_FACE || vcls[i] === CLS_HAIR)) continue;
        // Spatial envelope: hair hangs from the HEAD. A shell that reaches
        // far below the shoulder blades or far off the head axis is robe or
        // cloak however it is painted (the sorcerer's navy robe is painted
        // exactly like her navy hair).
        if (st.sMin < -3.5 * span || st.axMax > 1.5 * span) continue;
        if (!samePaint(meanColorOf(verts), hairSeed)) continue;
        chain.set(r, verts);
      }
      let grew = true;
      let passes = 0;
      while (grew && passes < 8) {
        grew = false;
        passes++;
        for (const [r, verts] of chain) {
          let touches = false;
          for (const i of verts) {
            if (nearHair(i)) {
              touches = true;
              break;
            }
          }
          if (!touches) continue;
          for (const i of verts) {
            vcls[i] = CLS_HAIR;
            pushHair(i);
          }
          chain.delete(r);
          grew = true;
        }
      }
    }
    // HOOD DETECTOR: nothing that is truly hair hangs DEAD-CENTRE in front
    // of the face between the eyes and the chin — it would cover the eyes,
    // nose and mouth. A hood's cowl/scarf does exactly that (the wrap under
    // the chin, the fabric across the throat). Face-framing strands hang at
    // the temples, OUTSIDE the centre strip, so they pass. Firing empties
    // the hair channel exactly like the area gate.
    let frontFrac = 0;
    {
      const side = v3.norm([
        up[1] * fwd[2] - up[2] * fwd[1],
        up[2] * fwd[0] - up[0] * fwd[2],
        up[0] * fwd[1] - up[1] * fwd[0],
      ]);
      let strip = 0;
      let total = 0;
      const eyeS = opt.eyeFrac * span;
      for (let i = 0; i < nVerts; i++) {
        if (vcls[i] !== CLS_HAIR) continue;
        total++;
        const p = [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
        const rel = v3.sub(p, headPos);
        const s = v3.dot(rel, up);
        const f = v3.dot(rel, fwd);
        const x = Math.abs(v3.dot(rel, side));
        if (f > 0.15 * span && x < 0.18 * span && s > eyeS - 0.8 * span && s < eyeS) strip++;
      }
      frontFrac = total ? strip / total : 0;
      if (opt.debug) console.log(`  hair centerFrontFrac=${(100 * frontFrac).toFixed(2)}%`);
      if (frontFrac > opt.maxFrontFrac) {
        for (let i = 0; i < nVerts; i++) if (vcls[i] === CLS_HAIR) vcls[i] = CLS_OUTFIT;
      }
    }
    for (let i = 0; i < nVerts; i++) if (vcls[i] === CLS_HAIR) hairVerts++;

    // Rasterize triangle UV footprints. Conservative class vote: any outfit
    // vertex makes the triangle outfit; hair needs all three (the brow-line
    // ring lands in face, so the face never catches a hair tint).
    for (let t = 0; t < indices.length; t += 3) {
      const i0 = indices[t] | 0;
      const i1 = indices[t + 1] | 0;
      const i2 = indices[t + 2] | 0;
      const c0 = vcls[i0];
      const c1 = vcls[i1];
      const c2 = vcls[i2];
      let tri;
      const nOut = (c0 === CLS_OUTFIT) + (c1 === CLS_OUTFIT) + (c2 === CLS_OUTFIT);
      if (nOut > 0) tri = CLS_OUTFIT;
      else if (c0 === CLS_HAIR && c1 === CLS_HAIR && c2 === CLS_HAIR) tri = CLS_HAIR;
      else tri = CLS_FACE;
      rasterizeTri(cls, S, uv, i0, i1, i2, tri);
    }
  }

  // Gutter dilation: extend hair/face 2 texels into UNMAPPED texels only, so
  // bilinear filtering at chart borders cannot smear the tint across UV
  // seams (nor fade it to nothing right at the hairline chart edge).
  for (let pass = 0; pass < 2; pass++) dilateIntoBackground(cls, S);

  // Coverage metrics + the low-hair no-op rule.
  let hairTexels = 0;
  let faceTexels = 0;
  let mapped = 0;
  for (let i = 0; i < cls.length; i++) {
    if (cls[i] !== CLS_NONE) mapped++;
    if (cls[i] === CLS_HAIR) hairTexels++;
    else if (cls[i] === CLS_FACE) faceTexels++;
  }
  const hairAreaPct = mapped ? (100 * hairTexels) / mapped : 0;
  const faceAreaPct = mapped ? (100 * faceTexels) / mapped : 0;
  let emptyHair = false;
  if (hairAreaPct < opt.minHairPct || opt.noHair.has(name)) {
    emptyHair = true;
    for (let i = 0; i < cls.length; i++) if (cls[i] === CLS_HAIR) cls[i] = CLS_NONE;
  }

  // Write RGB PNG (R hair, G face).
  const px = Buffer.alloc(S * S * 3);
  for (let i = 0; i < cls.length; i++) {
    if (cls[i] === CLS_HAIR) px[i * 3] = 255;
    else if (cls[i] === CLS_FACE) px[i * 3 + 1] = 255;
  }
  mkdirSync(opt.out, { recursive: true });
  const outPath = join(opt.out, name.replace(/\.glb$/, '.mask.png'));
  await sharp(px, { raw: { width: S, height: S, channels: 3 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  return {
    file: name,
    out: outPath,
    size: S,
    verts: totalVerts,
    headVerts,
    hairVerts,
    components,
    strippedComponents,
    hairAreaPct: +hairAreaPct.toFixed(2),
    faceAreaPct: +faceAreaPct.toFixed(2),
    emptyHair,
  };
}

/** Scanline-free edge-function rasterizer with a small tolerance so hairline
 *  sliver triangles still land; priority write (outfit > face > hair) makes
 *  overlap bleed conservative. UVs wrap. */
function rasterizeTri(cls, S, uv, i0, i1, i2, code) {
  const wrap = (x) => x - Math.floor(x);
  const x0 = wrap(uv[i0 * 2]) * S;
  const y0 = wrap(uv[i0 * 2 + 1]) * S;
  const x1 = wrap(uv[i1 * 2]) * S;
  const y1 = wrap(uv[i1 * 2 + 1]) * S;
  const x2 = wrap(uv[i2 * 2]) * S;
  const y2 = wrap(uv[i2 * 2 + 1]) * S;
  const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)) - 1);
  const maxX = Math.min(S - 1, Math.ceil(Math.max(x0, x1, x2)) + 1);
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)) - 1);
  const maxY = Math.min(S - 1, Math.ceil(Math.max(y0, y1, y2)) + 1);
  // Degenerate charts that wrapped across the tile boundary produce absurd
  // spans; skip them rather than filling the whole tile.
  if (maxX - minX > S / 2 && Math.max(x0, x1, x2) - Math.min(x0, x1, x2) > S / 2) return;
  const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  if (Math.abs(area) < 1e-9) return;
  const tol = 0.75; // px: catches pixel centers a hair outside a thin triangle
  const sgn = area > 0 ? 1 : -1;
  for (let y = minY; y <= maxY; y++) {
    const py = y + 0.5;
    for (let x = minX; x <= maxX; x++) {
      const pxc = x + 0.5;
      const w0 = sgn * ((x1 - x0) * (py - y0) - (pxc - x0) * (y1 - y0));
      const w1 = sgn * ((x2 - x1) * (py - y1) - (pxc - x1) * (y2 - y1));
      const w2 = sgn * ((x0 - x2) * (py - y2) - (pxc - x2) * (y0 - y2));
      // normalize tolerance by the longest edge so `tol` stays in pixels
      const l0 = Math.hypot(x1 - x0, y1 - y0) || 1;
      const l1 = Math.hypot(x2 - x1, y2 - y1) || 1;
      const l2 = Math.hypot(x0 - x2, y0 - y2) || 1;
      if (w0 / l0 >= -tol && w1 / l1 >= -tol && w2 / l2 >= -tol) {
        const i = y * S + x;
        if (code > cls[i]) cls[i] = code;
      }
    }
  }
}

function dilateIntoBackground(cls, S) {
  const src = Uint8Array.from(cls);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      if (src[i] !== CLS_NONE) continue;
      let best = CLS_NONE;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
          const v = src[ny * S + nx];
          if (v > best) best = v;
        }
      }
      // Outfit gutters stay empty (outfit is "no tint" anyway); hair/face
      // gutters carry their class outward so bilinear never fades the tint
      // at a chart edge.
      if (best === CLS_HAIR || best === CLS_FACE) cls[i] = best;
    }
  }
}

// ---------------------------------------------------------------------------
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const sharp = (await import('sharp')).default;
const rows = [];
for (const f of opt.files) {
  try {
    const row = await processBody(io, sharp, f);
    rows.push(row);
    if (row.skipped) console.log(`SKIP  ${row.file}: ${row.skipped}`);
    else
      console.log(
        `OK    ${row.file}: ${row.size}px hair ${row.hairAreaPct}% face ${row.faceAreaPct}%` +
          `${row.emptyHair ? ' (hair EMPTIED)' : ''}${row.strippedComponents ? ` (stripped ${row.strippedComponents} garment comps)` : ''}`,
      );
  } catch (err) {
    rows.push({ file: basename(f), skipped: `error: ${err.message}` });
    console.log(`FAIL  ${basename(f)}: ${err.message}`);
  }
}
if (opt.report) {
  mkdirSync(join(opt.report, '..'), { recursive: true });
  writeFileSync(opt.report, JSON.stringify(rows, null, 2));
}
const done = rows.filter((r) => !r.skipped).length;
console.log(`\n${done}/${rows.length} masks written to ${opt.out}`);
