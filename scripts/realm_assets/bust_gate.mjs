// Detect busts / head-and-shoulders sculptures, which no bounding-box rule can
// separate from a slim full body (measured: full overlap on every bbox ratio).
//
// The difference is WHERE THE MASS SITS. A full body puts real geometry all the way
// to the feet, and its lower third is NARROW (two legs) relative to its middle
// (torso + arms). A bust puts nearly everything in the upper half and tapers to a
// point or a flat base, with little or nothing in the bottom third.
//
// So this reads actual POSITION vertices out of the GLB binary chunk and profiles
// mass and width per height band.

import { readFileSync } from 'node:fs';

const CT_FLOAT = 5126;
const NUM_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function parseGlb(path) {
  const fd = readFileSync(path);
  if (fd.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb');
  const jsonLen = fd.readUInt32LE(12);
  const json = JSON.parse(fd.subarray(20, 20 + jsonLen).toString('utf8'));
  // BIN chunk follows the JSON chunk (8-byte chunk header each).
  let off = 20 + jsonLen;
  let bin = null;
  while (off + 8 <= fd.length) {
    const len = fd.readUInt32LE(off);
    const type = fd.readUInt32LE(off + 4);
    if (type === 0x004e4942) { bin = fd.subarray(off + 8, off + 8 + len); break; }
    off += 8 + len;
  }
  return { json, bin };
}

/** Read a float VEC3 accessor into a flat array. Interleaved strides honoured. */
function readVec3(json, bin, idx) {
  const acc = json.accessors[idx];
  if (!acc || acc.componentType !== CT_FLOAT || NUM_COMPONENTS[acc.type] !== 3) return null;
  const bv = json.bufferViews[acc.bufferView];
  if (!bv) return null;
  const base = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const stride = bv.byteStride ?? 12;
  const out = new Float32Array(acc.count * 3);
  for (let i = 0; i < acc.count; i++) {
    const o = base + i * stride;
    if (o + 12 > bin.length) break;
    out[i * 3] = bin.readFloatLE(o);
    out[i * 3 + 1] = bin.readFloatLE(o + 4);
    out[i * 3 + 2] = bin.readFloatLE(o + 8);
  }
  return out;
}

/** Profile vertex mass and horizontal extent across height bands. */
export function bodyProfile(path, bands = 10) {
  const { json, bin } = parseGlb(path);
  if (!bin) throw new Error('no BIN chunk');
  const xs = [];
  for (const m of json.meshes ?? []) {
    for (const p of m.primitives ?? []) {
      const ai = p.attributes?.POSITION;
      if (ai == null) continue;
      const v = readVec3(json, bin, ai);
      if (v) xs.push(v);
    }
  }
  if (!xs.length) throw new Error('no POSITION data');
  let minY = Infinity;
  let maxY = -Infinity;
  for (const v of xs) {
    for (let i = 1; i < v.length; i += 3) {
      if (v[i] < minY) minY = v[i];
      if (v[i] > maxY) maxY = v[i];
    }
  }
  const h = maxY - minY;
  if (!(h > 0)) throw new Error('degenerate height');
  const count = new Array(bands).fill(0);
  const wMin = new Array(bands).fill(Infinity);
  const wMax = new Array(bands).fill(-Infinity);
  for (const v of xs) {
    for (let i = 0; i < v.length; i += 3) {
      const b = Math.min(bands - 1, Math.floor(((v[i + 1] - minY) / h) * bands));
      count[b]++;
      if (v[i] < wMin[b]) wMin[b] = v[i];
      if (v[i] > wMax[b]) wMax[b] = v[i];
    }
  }
  const total = count.reduce((a, b) => a + b, 0);
  const width = wMax.map((mx, i) => (wMin[i] === Infinity ? 0 : mx - wMin[i]));
  return {
    total,
    // fraction of vertices in each band, bottom (0) -> top (bands-1)
    frac: count.map((c) => c / total),
    width,
    height: h,
  };
}

/** A bust has almost no geometry in its lower bands. A full body always does. */
export function bustVerdict(path, { minLowerMass = 0.10, minLowerWidth = 0.18 } = {}) {
  const p = bodyProfile(path, 10);
  // bottom 30% of height
  const lowerMass = p.frac[0] + p.frac[1] + p.frac[2];
  const midWidth = Math.max(p.width[4], p.width[5], p.width[6]) || 1;
  const lowerWidth = Math.max(p.width[0], p.width[1], p.width[2]) / midWidth;
  if (lowerMass < minLowerMass) {
    return { ok: false, lowerMass, lowerWidth, reason: `bust: lower-third mass ${(lowerMass * 100).toFixed(1)}%` };
  }
  if (lowerWidth < minLowerWidth) {
    return { ok: false, lowerMass, lowerWidth, reason: `tapers to a point: lower width ${(lowerWidth * 100).toFixed(0)}% of mid` };
  }
  return { ok: true, lowerMass, lowerWidth };
}
