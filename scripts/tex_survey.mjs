#!/usr/bin/env node
// What is the house texture standard, and how much of the library ignores it?
// The heavy hero bodies carry a raw 2048 PNG worth 7-8MB. If the rest of the
// library is already WebP at the same resolution, then those are simply files
// that missed the pass — a format change, not a quality decision, and no reason
// to downsample anything.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { readFileSync, statSync } from 'node:fs';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const orphans = new Set();
const src = readFileSync('/opt/cryptic-realm/src/render/characters/manifest.generated.ts', 'utf8');
const urls = [...new Set([...src.matchAll(/\$\{REALM_MODELS\}\/([^`'"]+\.glb)/g)].map((m) => m[1]))];
console.log('registered bodies:', urls.length);

const byMime = {};
const oversize = [];
let scanned = 0, totalTex = 0;
for (const rel of urls) {
  const path = `/opt/cr-realms-store/${rel}`;
  let doc;
  try { doc = await io.read(path); } catch { continue; }
  scanned++;
  const kb = Math.round(statSync(path).size / 1024);
  for (const t of doc.getRoot().listTextures()) {
    const mime = t.getMimeType() || 'unknown';
    const bytes = t.getImage()?.byteLength ?? 0;
    const [w, h] = t.getSize() ?? [0, 0];
    byMime[mime] = byMime[mime] || { n: 0, kb: 0 };
    byMime[mime].n++;
    byMime[mime].kb += bytes / 1024;
    totalTex += bytes / 1024;
    if (mime === 'image/png' && bytes / 1024 > 1500) {
      oversize.push({ rel, kb, texKb: Math.round(bytes / 1024), dim: `${w}x${h}` });
    }
  }
  if (scanned % 400 === 0) process.stderr.write(`  ...${scanned}\n`);
}
console.log('scanned:', scanned);
console.log('\ntexture bytes by format:');
for (const [m, v] of Object.entries(byMime).sort((a, b) => b[1].kb - a[1].kb)) {
  console.log(`  ${m.padEnd(12)} ${String(v.n).padStart(5)} textures  ${(v.kb / 1024).toFixed(1).padStart(8)} MB`);
}
console.log(`total texture payload: ${(totalTex / 1024).toFixed(1)} MB`);

oversize.sort((a, b) => b.texKb - a.texKb);
const save = oversize.reduce((s, o) => s + o.texKb, 0);
console.log(`\nbodies carrying a PNG texture over 1.5MB: ${oversize.length}  (${(save / 1024).toFixed(1)} MB of PNG)`);
for (const o of oversize.slice(0, 20)) {
  console.log(`  ${String(o.kb).padStart(6)}kb file / ${String(o.texKb).padStart(6)}kb png ${o.dim.padEnd(10)} ${o.rel}`);
}
