// Stage 2 of the tri-budget fixup. The CLI simplifier is bounded by attribute
// seams inside a single primitive, so these assets stall far above 20k however
// wide the error budget goes. meshoptimizer's simplifySloppy ignores those seams
// (it still only emits indices into existing vertices, so UVs stay valid).
// Usage: node nh_sloppy.mjs <in.glb> <out.glb> <budget>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';

const [, , inPath, outPath, budgetArg] = process.argv;
const BUDGET = Number(budgetArg ?? 20000);

await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read(inPath);
const root = doc.getRoot();

const prims = [];
for (const mesh of root.listMeshes())
  for (const prim of mesh.listPrimitives())
    if (prim.getMode() === 4) {
      const idx = prim.getIndices();
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const count = idx ? idx.getCount() : pos.getCount();
      prims.push({ prim, tris: Math.floor(count / 3) });
    }

const total = prims.reduce((a, p) => a + p.tris, 0);
if (total <= BUDGET) {
  await io.write(outPath, doc);
  console.log(JSON.stringify({ before: total, after: total, changed: false }));
  process.exit(0);
}

for (const { prim, tris } of prims) {
  const share = Math.max(24, Math.floor(BUDGET * (tris / total)));
  if (tris <= share) continue;
  const pos = prim.getAttribute('POSITION');
  const idxAcc = prim.getIndices();
  const vertCount = pos.getCount();
  // POSITION may be normalized/quantized; getArray() is raw, so rebuild floats.
  const positions = new Float32Array(vertCount * 3);
  const el = [0, 0, 0];
  for (let i = 0; i < vertCount; i++) {
    pos.getElement(i, el);
    positions[i * 3] = el[0]; positions[i * 3 + 1] = el[1]; positions[i * 3 + 2] = el[2];
  }
  let indices;
  if (idxAcc) {
    indices = new Uint32Array(idxAcc.getCount());
    for (let i = 0; i < indices.length; i++) indices[i] = idxAcc.getScalar(i);
  } else {
    indices = new Uint32Array(vertCount);
    for (let i = 0; i < vertCount; i++) indices[i] = i;
  }
  const target = share * 3;
  const [dst] = MeshoptSimplifier.simplifySloppy(indices, positions, 3, null, target, 1);
  const out = new Uint32Array(dst);
  const acc = doc.createAccessor()
    .setArray(out.length && out.every((v) => v < 65536) ? new Uint16Array(out) : out)
    .setType('SCALAR')
    .setBuffer(idxAcc ? idxAcc.getBuffer() : root.listBuffers()[0]);
  prim.setIndices(acc);
}

await io.write(outPath, doc);
const after = prims.reduce((a, p) => {
  const i = p.prim.getIndices();
  return a + Math.floor((i ? i.getCount() : p.prim.getAttribute('POSITION').getCount()) / 3);
}, 0);
console.log(JSON.stringify({ before: total, after, changed: true }));
