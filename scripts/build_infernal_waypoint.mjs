// Bake the authored Infernal Dungeon Entrance into a web-safe waypoint GLB.
// The raw Meshy export is a static 1.56M-triangle presentation model with a 4K
// texture. This pass is intentionally prop-only: weld/simplify would be unsafe
// for a rigged character, but makes the town landmark practical to stream.
import fs from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const source = path.resolve(
  process.env.INFERNAL_WAYPOINT_GLB?.trim() ||
    (process.platform === 'win32'
      ? 'C:\\Users\\wadei\\Downloads\\karts\\Infernal Dungeon Entrance.glb'
      : '/mnt/usb4/meshy/Infernal Dungeon Entrance.glb'),
);
const forgedRoot = path.resolve(
  process.env.ARCFORGE_FORGED_DIR?.trim() ||
    (process.platform === 'win32'
      ? 'T:\\moveweight-assets\\forged-glbs'
      : '/mnt/usb4/moveweight-assets/forged-glbs'),
);
const output = path.join(forgedRoot, 'infernal', 'infernal_dungeon_entrance.glb');

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});
const document = await io.read(source);
await document.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.08, error: 0.03 }),
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048] }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);

let triangles = 0;
for (const mesh of document.getRoot().listMeshes()) {
  for (const primitive of mesh.listPrimitives()) {
    const indices = primitive.getIndices();
    const positions = primitive.getAttribute('POSITION');
    triangles += (indices?.getCount() ?? positions?.getCount() ?? 0) / 3;
  }
}

await fs.mkdir(path.dirname(output), { recursive: true });
await io.write(output, document);
const info = await fs.stat(output);
console.log(
  JSON.stringify({ source, output, bytes: info.size, triangles: Math.round(triangles) }, null, 2),
);
