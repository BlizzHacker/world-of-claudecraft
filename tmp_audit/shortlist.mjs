#!/usr/bin/env node
// Shortlist library bodies without rendering: read each GLB's JSON chunk and
// report clip bank + skeleton size, so a candidate can be filtered to the rich
// 22-clip humanoid rig (the one with emotes) before spending a render on it.
//
//   shortlist.mjs <dir> [--grep re] [--minclips N] [--json out.json]
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const DIR = process.argv[2];
const GREP = arg('grep') ? new RegExp(arg('grep'), 'i') : null;
const MINCLIPS = Number(arg('minclips', 0));
const JSONOUT = arg('json');

function meta(path) {
  const buf = readFileSync(path);
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) return null;
  let off = 12;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    if (type === 0x4e4f534a) {
      const json = JSON.parse(buf.slice(off + 8, off + 8 + len).toString('utf8'));
      const clips = (json.animations ?? []).map((a) => a.name);
      const skins = json.skins ?? [];
      return {
        clips,
        nClips: clips.length,
        joints: skins.length ? (skins[0].joints ?? []).length : 0,
        nodes: (json.nodes ?? []).length,
        meshes: (json.meshes ?? []).length,
        hasEmote: clips.some((c) => /cheer|wave|taunt|dance|sit|clap/i.test(c)),
        hasCast: clips.some((c) => /spell|cast/i.test(c)),
      };
    }
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  return null;
}

const rows = [];
for (const f of readdirSync(DIR)) {
  if (!f.endsWith('.glb')) continue;
  if (GREP && !GREP.test(f)) continue;
  const p = join(DIR, f);
  let m = null;
  try { m = meta(p); } catch { m = null; }
  if (!m) continue;
  if (m.nClips < MINCLIPS) continue;
  rows.push({ file: f, sizeMB: +(statSync(p).size / 1048576).toFixed(1), ...m });
}

rows.sort((a, b) => b.nClips - a.nClips || a.file.localeCompare(b.file));
for (const r of rows) {
  console.log(
    `${String(r.nClips).padStart(3)}c ${String(r.joints).padStart(3)}j ` +
    `${String(r.sizeMB).padStart(6)}MB ${r.hasEmote ? 'E' : '-'}${r.hasCast ? 'C' : '-'}  ${r.file}`,
  );
}
console.log(`\n# ${rows.length} matches`);
if (JSONOUT) writeFileSync(JSONOUT, JSON.stringify(rows, null, 1));
