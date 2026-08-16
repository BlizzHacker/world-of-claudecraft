#!/usr/bin/env node
// Browser-free clip lister: read the GLB JSON chunk and print animation names.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

function clipsOf(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb');
  let off = 12;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    if (type === 0x4e4f534a) {
      const json = JSON.parse(buf.slice(off + 8, off + 8 + len).toString('utf8'));
      return {
        clips: (json.animations ?? []).map((a) => a.name),
        nodes: (json.nodes ?? []).length,
        meshes: (json.meshes ?? []).length,
      };
    }
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  throw new Error('no json chunk');
}

for (const f of process.argv.slice(2)) {
  try {
    const r = clipsOf(f);
    console.log(`\n=== ${basename(f)}  (nodes ${r.nodes}, meshes ${r.meshes}, ${r.clips.length} clips)`);
    console.log(r.clips.join(', '));
  } catch (e) {
    console.log(`\n=== ${basename(f)}  ERROR ${e.message}`);
  }
}
