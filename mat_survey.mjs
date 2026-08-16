// Survey the shipped bodies' PBR setup. A material with metallicFactor near 1
// and no metallic-roughness texture has no diffuse response at all: with an
// environment map it looks like polished metal, without one it renders BLACK.
// That is the difference between the high tier and the low tier in this engine,
// so the count here decides whether the low-tier darkness is a content problem.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const STORE = '/opt/cr-realms-store';
const realms = process.argv[2] ? [process.argv[2]] : readdirSync(STORE).filter(r => {
  try { return statSync(join(STORE, r)).isDirectory() && r !== 'review'; } catch { return false; }
});

const bucket = { metalNoTex: 0, metalWithTex: 0, dielectric: 0, unlitOrEmissive: 0 };
let files = 0, mats = 0;
const worst = [];

for (const realm of realms) {
  const dir = join(STORE, realm);
  let names;
  try { names = readdirSync(dir).filter(f => f.endsWith('.glb')); } catch { continue; }
  for (const f of names) {
    let doc;
    try { doc = await io.read(join(dir, f)); } catch { continue; }
    files++;
    let bad = 0;
    for (const m of doc.getRoot().listMaterials()) {
      mats++;
      const mf = m.getMetallicFactor();
      const hasMR = !!m.getMetallicRoughnessTexture();
      const emis = m.getEmissiveFactor();
      const emissive = !!m.getEmissiveTexture() || (emis && emis.some(v => v > 0.05));
      if (emissive) { bucket.unlitOrEmissive++; continue; }
      if (mf >= 0.9 && !hasMR) { bucket.metalNoTex++; bad++; }
      else if (mf >= 0.9) bucket.metalWithTex++;
      else bucket.dielectric++;
    }
    if (bad) worst.push(`${realm}/${f} (${bad})`);
  }
}
console.log('files', files, 'materials', mats);
console.log(JSON.stringify(bucket, null, 0));
console.log('bodies with a full-metal untextured material:', worst.length);
for (const w of worst.slice(0, 15)) console.log('  ', w);
