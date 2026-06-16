// Asset pipeline: optimize raw downloaded packs (tmp/asset_src) into shipping
// files under public/. Usage: node scripts/assets/build_assets.mjs <spec.json> [...more specs]
//
// Spec format: { "items": [ {
//   "src":  "tmp/asset_src/.../Model.glb",        // .glb or .gltf (+external .bin/png)
//   "out":  "models/chars/knight.glb",            // relative to public/
//   "type": "character" | "static" | "copy",
//   "keepClips": ["Idle", ...],                   // optional: drop all other animations
//   "renameClips": { "from": "to" },              // optional: applied after prefix strip
//   "maxTex": 512                                  // optional: clamp texture dimension
// } ] }
//
// - Clip names like "AnimalArmature|Idle" (or triple-prefixed) are stripped to
//   the segment after the last '|', then deduped.
// - "character": resample + prune + dedup + meshopt(high). Never joins/flattens/
//   simplifies (would corrupt rigs/hard edges on low-poly).
// - "static": same pipeline (no clips expected) — geometry-safe, no simplify.
// - "copy": byte-for-byte copy (HDRIs, plain textures).
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, mergeDocuments, meshopt, prune, resample, textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

function stripClipName(name) {
  const i = name.lastIndexOf('|');
  return i >= 0 ? name.slice(i + 1) : name;
}

// src may be absolute (e.g. pointing at the main checkout's tmp/asset_src from
// a git worktree) or relative to the repo root.
function resolveSrc(src) {
  return path.isAbsolute(src) ? src : path.join(ROOT, src);
}

async function processModel(io, item) {
  const srcPath = resolveSrc(item.src);
  const outPath = path.join(PUBLIC_DIR, item.out);
  const doc = await io.read(srcPath);
  const root = doc.getRoot();

  // Merge animation clips from separate library glbs. KayKit's v2 packs ship
  // animations in standalone Rig_Medium_*.glb files, each carrying a mannequin
  // mesh + its own copy of the skeleton. Merge a lib in, repoint every newly
  // added animation channel onto the character's own bone of the same name,
  // then drop the lib's scenes + nodes so only its clips survive (the mannequin
  // meshes / duplicate bones fall out, and prune() sweeps the orphaned data).
  if (item.addClipsFrom) {
    const origNodeByName = new Map();
    for (const n of root.listNodes()) origNodeByName.set(n.getName(), n);
    const origNodes = new Set(origNodeByName.values());
    const origScenes = new Set(root.listScenes());
    const origAnims = new Set(root.listAnimations());
    for (const libRel of item.addClipsFrom) {
      mergeDocuments(doc, await io.read(resolveSrc(libRel)));
    }
    let orphan = 0;
    for (const anim of root.listAnimations()) {
      if (origAnims.has(anim)) continue;
      for (const ch of anim.listChannels()) {
        const tgt = ch.getTargetNode();
        if (!tgt) continue;
        const orig = origNodeByName.get(tgt.getName());
        if (orig) ch.setTargetNode(orig);
        else orphan++;
      }
    }
    for (const scene of root.listScenes()) if (!origScenes.has(scene)) scene.dispose();
    for (const node of root.listNodes()) if (!origNodes.has(node)) node.dispose();
    // mergeDocuments imports each lib's own buffer; a GLB must have a single one
    const mainBuffer = root.listBuffers()[0];
    for (const acc of root.listAccessors()) acc.setBuffer(mainBuffer);
    for (const buf of root.listBuffers()) if (buf !== mainBuffer) buf.dispose();
    if (orphan) console.warn(`  WARN ${item.out}: ${orphan} merged channel(s) had no matching bone`);
  }

  // normalize + filter animation clips
  const seen = new Set();
  for (const anim of root.listAnimations()) {
    let name = stripClipName(anim.getName());
    if (item.renameClips && item.renameClips[name]) name = item.renameClips[name];
    const drop = (item.keepClips && !item.keepClips.includes(name)) || seen.has(name);
    if (drop) { anim.dispose(); continue; }
    seen.add(name);
    anim.setName(name);
  }
  if (item.keepClips) {
    const missing = item.keepClips.filter((c) => !seen.has(c));
    if (missing.length) console.warn(`  WARN ${item.out}: missing clips ${missing.join(', ')}`);
  }

  const transforms = [resample(), prune(), dedup()];
  if (item.maxTex) {
    transforms.push(textureCompress({
      encoder: sharp, targetFormat: 'webp', resize: [item.maxTex, item.maxTex],
    }));
  }
  transforms.push(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  await doc.transform(...transforms);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await io.write(outPath, doc);
  const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
  const clips = root.listAnimations().length;
  console.log(`  ${item.out}  ${kb}KB${clips ? ` (${clips} clips)` : ''}`);
}

function processCopy(item) {
  const srcPath = resolveSrc(item.src);
  const outPath = path.join(PUBLIC_DIR, item.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.copyFileSync(srcPath, outPath);
  console.log(`  ${item.out}  ${(fs.statSync(outPath).size / 1024).toFixed(0)}KB (copy)`);
}

async function main() {
  const specs = process.argv.slice(2);
  if (!specs.length) {
    console.error('usage: node scripts/assets/build_assets.mjs <spec.json> [...]');
    process.exit(1);
  }
  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  let failures = 0;
  for (const specFile of specs) {
    const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
    // optional top-level `defaults` merged into every item (item keys win) —
    // lets a spec share addClipsFrom/renameClips/keepClips across many chars
    const defaults = spec.defaults ?? {};
    console.log(`spec: ${specFile} (${spec.items.length} items)`);
    for (const raw of spec.items) {
      const item = { ...defaults, ...raw };
      try {
        if (item.type === 'copy') processCopy(item);
        else await processModel(io, item);
      } catch (err) {
        failures++;
        console.error(`  FAIL ${item.src}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  if (failures) {
    console.error(`${failures} item(s) failed`);
    process.exit(1);
  }
}

main();
