#!/usr/bin/env node
// A handful of bodies carry a raw 2048 PNG worth 7-8MB, half to two thirds of
// the whole file, while the other 2,106 textures in the library are already
// WebP. These are files that missed the pass, not a quality decision.
//
// Re-encode PNG -> WebP at the SAME dimensions. Do NOT downsample: an earlier
// pass on this project destroyed a model's art by quietly halving 2048 to 1024,
// and resolution is the one thing you cannot get back. Every conversion is
// checked afterwards - identical width and height, and a mean absolute pixel
// difference against the original - so "it got smaller" is never the only claim.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync, readdirSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const BACKUP = '/mnt/usb4/moveweight-assets/cr-realms-backup/png-shrink';
mkdirSync(BACKUP, { recursive: true });

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const STORE = '/opt/cr-realms-store';
const APPLY = process.argv.includes('--apply');
const MIN_KB = 1024;
const QUALITY = 92;

const files = [];
for (const realm of readdirSync(STORE)) {
  const dir = join(STORE, realm);
  let st;
  try { st = statSync(dir); } catch { continue; }
  if (!st.isDirectory() || realm === 'review') continue;
  for (const f of readdirSync(dir)) if (f.endsWith('.glb')) files.push(join(dir, f));
}
console.log('top-level store GLBs:', files.length);

let touched = 0, beforeTotal = 0, afterTotal = 0;
for (const path of files) {
  let doc;
  try { doc = await io.read(path); } catch { continue; }
  const big = doc.getRoot().listTextures().filter((t) =>
    t.getMimeType() === 'image/png' && (t.getImage()?.byteLength ?? 0) / 1024 > MIN_KB);
  if (!big.length) continue;

  const before = statSync(path).size;
  let ok = true;
  for (const tex of big) {
    const src = Buffer.from(tex.getImage());
    const meta = await sharp(src).metadata();
    const a = await sharp(src).raw().toBuffer();

    // Climb the quality ladder until the difference gate is satisfied rather
    // than dropping the file: a texture that needs q96 is not a texture that
    // should stay a 8MB PNG. Lossless is the last rung and always passes.
    let out = null, mad = null, usedQ = null;
    for (const q of [QUALITY, 96, 100]) {
      const cand = q === 100
        ? await sharp(src).webp({ lossless: true, effort: 5 }).toBuffer()
        : await sharp(src).webp({ quality: q, effort: 5 }).toBuffer();
      const candMeta = await sharp(cand).metadata();
      if (candMeta.width !== meta.width || candMeta.height !== meta.height) {
        console.log(`  REFUSED ${path}: ${meta.width}x${meta.height} -> ${candMeta.width}x${candMeta.height}`);
        ok = false;
        break;
      }
      const b = await sharp(cand).raw().toBuffer();
      let diff = 0;
      const n = Math.min(a.length, b.length);
      for (let i = 0; i < n; i += 7) diff += Math.abs(a[i] - b[i]);
      const m = diff / (n / 7);
      out = cand; mad = m; usedQ = q;
      if (m <= 3) break;
    }
    if (!ok) break;
    console.log(`  ${path.split('/').pop()}  ${meta.width}x${meta.height} png ${Math.round(src.length / 1024)}kb -> webp ${Math.round(out.length / 1024)}kb  q${usedQ}  meanAbsDiff ${mad.toFixed(2)}/255`);
    if (mad > 3) { console.log('  REFUSED: pixel difference too large even lossless'); ok = false; break; }
    if (out.length >= src.length) { console.log('  SKIPPED: webp is not smaller'); ok = false; break; }
    tex.setImage(out).setMimeType('image/webp');
  }
  if (!ok) continue;

  // These files are SERVED. Keep the original before overwriting one.
  if (APPLY) {
    const bak = join(BACKUP, path.split('/').slice(-2).join('__'));
    if (!existsSync(bak)) copyFileSync(path, bak);
  }

  if (APPLY) {
    await io.write(path, doc);
    const after = statSync(path).size;
    console.log(`  ${path.split('/').pop()}: ${Math.round(before / 1024)}kb -> ${Math.round(after / 1024)}kb`);
    beforeTotal += before; afterTotal += after;
  } else {
    beforeTotal += before;
  }
  touched++;
}
console.log(`\nbodies with an oversized PNG: ${touched}`);
if (APPLY) console.log(`total ${(beforeTotal / 1048576).toFixed(1)} MB -> ${(afterTotal / 1048576).toFixed(1)} MB`);
else console.log('(dry run — pass --apply to rewrite)');
