// Geometric humanoid gate — reject meshes a biped rig cannot represent, BEFORE
// paying to rig them.
//
// The name lexicon matches plenty of non-characters: "7 skulls pile ups",
// "arachnida nightmare" (a spider), "arachnoskull specter" (a skull on a plinth).
// All of them rig "successfully" — 22 clips, sockets, sane tri counts — and all of
// them look ridiculous in motion. No numeric rig gate catches it.
//
// Shape does. A humanoid is TALL: height clearly exceeds its footprint. A skull
// pile, a spider, and a display base are all wide and squat. Bounding box comes
// free from accessor min/max in the GLB's JSON chunk (no binary parsing).

import { readFileSync } from 'node:fs';

/** World-ish bbox from POSITION accessor min/max across all primitives. */
export function glbBounds(path) {
  const fd = readFileSync(path);
  if (fd.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb');
  const jsonLen = fd.readUInt32LE(12);
  const j = JSON.parse(fd.subarray(20, 20 + jsonLen).toString('utf8'));
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const m of j.meshes ?? []) {
    for (const p of m.primitives ?? []) {
      const ai = p.attributes?.POSITION;
      if (ai == null) continue;
      const acc = j.accessors?.[ai];
      if (!acc?.min || !acc?.max) continue;
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], acc.min[k]);
        hi[k] = Math.max(hi[k], acc.max[k]);
      }
    }
  }
  if (!Number.isFinite(lo[0])) throw new Error('no POSITION bounds');
  return { size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]] };
}

/** Meshy exports are Y-up. Compare height against the larger ground footprint axis. */
// Thresholds derived from MEASURED ground truth, not guessed. Height-over-footprint
// was the wrong metric: it conflates "wide because the arms are spread" (a good sign,
// closer to the T-pose manual_rig needs) with "wide because it is a spider", and at a
// 1.6 floor it discarded 65% of staging including real mages, giants and enchantresses.
//
// DEPTH is the real discriminator. A humanoid stays thin front-to-back however far
// its arms reach; piles, arachnids and plinth props are bulky on both ground axes.
//
//   measured thin/y   GOOD 0.18-0.53   BAD 0.62-1.40
//   measured wide/y   GOOD 0.45-0.80   BAD 0.71-1.61
//
// Separates 13/13 of the eyeballed sample.
export function humanoidVerdict(path, { maxDepth = 0.58, maxWide = 1.0 } = {}) {
  const { size } = glbBounds(path);
  const [x, y, z] = size;
  if (y <= 0) return { ok: false, reason: 'degenerate height' };
  const thin = Math.min(x, z);
  const wide = Math.max(x, z);
  const depthR = thin / y;
  const wideR = wide / y;
  const ratio = y / (wide || 1);
  // Bulky on the narrow ground axis too: spiders, skull piles, quadrupeds, plinths.
  if (depthR > maxDepth) {
    return { ok: false, ratio, reason: `bulky depth thin/y=${depthR.toFixed(2)}` };
  }
  // Wider than it is tall: flat display pieces, sprawling props, severed parts.
  if (wideR > maxWide) {
    return { ok: false, ratio, reason: `wider than tall wide/y=${wideR.toFixed(2)}` };
  }
  return { ok: true, ratio, depthR, wideR };
}
