// Three playable hero bodies are ~10x heavier than everything else in the
// library. Find out where the bytes are before touching anything: texture bytes
// and geometry are different problems with different fixes, and an earlier pass
// on this project destroyed a model's art by "compressing" it blind.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { statSync } from 'node:fs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const FILES = process.argv.slice(2);

for (const path of FILES) {
  let doc;
  try { doc = await io.read(path); } catch (e) { console.log('unreadable', path, String(e).slice(0, 80)); continue; }
  const root = doc.getRoot();
  const kb = Math.round(statSync(path).size / 1024);

  let texBytes = 0;
  const tex = [];
  for (const t of root.listTextures()) {
    const img = t.getImage();
    const size = img ? img.byteLength : 0;
    texBytes += size;
    const [w, h] = t.getSize() ?? [0, 0];
    tex.push(`${w}x${h} ${t.getMimeType()} ${Math.round(size / 1024)}kb`);
  }
  let verts = 0, prims = 0;
  for (const mesh of root.listMeshes())
    for (const p of mesh.listPrimitives()) {
      prims++;
      verts += p.getAttribute('POSITION')?.getCount() ?? 0;
    }
  const clips = root.listAnimations();
  let animCh = 0;
  for (const a of clips) animCh += a.listChannels().length;

  console.log(`\n${path.split('/').pop()}  ${kb}kb`);
  console.log(`  textures ${root.listTextures().length}  = ${Math.round(texBytes / 1024)}kb (${Math.round((texBytes / 1024 / kb) * 100)}% of file)`);
  for (const t of tex.slice(0, 8)) console.log(`     ${t}`);
  console.log(`  meshes ${root.listMeshes().length} prims ${prims} verts ${verts}`);
  console.log(`  animations ${clips.length}, channels ${animCh}`);
  console.log(`  extensions: ${root.listExtensionsUsed().map((e) => e.extensionName).join(', ') || 'none'}`);
}
