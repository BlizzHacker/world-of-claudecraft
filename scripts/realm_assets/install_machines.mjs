#!/usr/bin/env node
// Install the machine-rigged bodies (turrets + vehicles) into the store and emit
// the shipped manifest that emit_machines.mjs reads.
//
// BUCKET CHOICE IS LOAD-BEARING. scripts/realm_assets/emit_decor.mjs scans
//   ['props','buildings','vehicles','ships','mechs','turrets']
// and registers everything it finds as STATIC decor. These bodies carry
// synthesised clips, so filing them under `turrets/` or `vehicles/` would
// register the same GLB twice — once as an animated visual, once as a motionless
// prop — and the prop copy would win wherever decor is placed. `machines/` is
// deliberately NOT a decor bucket, so the two systems cannot collide.
import { copyFileSync, mkdirSync, openSync, readSync, closeSync, readdirSync,
         readFileSync, renameSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, basename } from 'node:path';

const STORE = '/opt/cr-realms-store';
const SOURCES = ['/opt/nonhumanoid/turrets', '/opt/nonhumanoid/mout'];
const OUT = '/opt/cryptic-realm/scripts/realm_assets/machines_shipped.json';
const APPLY = process.argv.includes('--apply');

// World height in units at entity scale 1. Every one of these was fitted to the
// same normalised source box, so without a tier table a catapult and a rover
// render identically sized. Keyed off the name, the only size signal the
// generated sources carry. FIRST PASS: a human should tune these against the
// world, exactly as the quadruped table says of its own.
const TIERS = [
  [3.2, /starfighter|gunship|dropship/i],
  [2.6, /catapult|ballista|siege/i],
  [2.2, /rover|tank|hauler/i],
  [1.9, /rally_car|car|buggy|bike/i],
  [1.7, /gauss|cannon|artillery/i],
  [1.4, /turret|emplacement|sentry/i],
];
const heightFor = (n) => TIERS.find(([, re]) => re.test(n))?.[0] ?? 1.6;

function glbJson(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) return null;
  let off = 12;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    if (type === 0x4e4f534a) return JSON.parse(buf.subarray(off + 8, off + 8 + len).toString('utf8'));
    off = off + 8 + len;
    while (off % 4) off++;
  }
  return null;
}

const rows = [];
let installed = 0;
for (const dir of SOURCES) {
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.glb'))) {
    const src = join(dir, f);
    const stem = basename(f, '.glb');
    const m = /^realm_([a-z]+)_/.exec(stem);
    if (!m) {
      console.log(`SKIP (no realm prefix): ${stem}`);
      continue;
    }
    const realm = m[1];
    const j = glbJson(src);
    const clips = (j?.animations ?? []).map((a) => a.name);
    const joints = (j?.skins ?? []).reduce((a, s) => a + (s.joints || []).length, 0);
    let scale = 0;
    for (const a of j?.animations ?? [])
      for (const c of a.channels ?? []) if (c.target?.path === 'scale') scale++;
    if (clips.length === 0 || scale !== 0) {
      console.log(`REJECT ${stem}: clips=${clips.length} scaleChannels=${scale}`);
      continue;
    }
    const destDir = join(STORE, realm, 'machines');
    const dest = join(destDir, `${stem}.glb`);
    if (APPLY) {
      mkdirSync(destDir, { recursive: true });
      const tmp = `${dest}.new.glb`;
      copyFileSync(src, tmp);
      const fd = openSync(tmp, 'r');
      const magic = Buffer.alloc(4);
      readSync(fd, magic, 0, 4, 0);
      closeSync(fd);
      if (magic.toString('ascii') !== 'glTF') {
        unlinkSync(tmp);
        throw new Error(`staged copy is not a GLB container: ${tmp}`);
      }
      if (statSync(tmp).size !== statSync(src).size) {
        unlinkSync(tmp);
        throw new Error(`staged copy size mismatch: ${tmp}`);
      }
      renameSync(tmp, dest);
    }
    installed++;
    rows.push({
      key: stem,
      realm,
      file: `${stem}.glb`,
      height: heightFor(stem),
      joints,
      clips,
      note: stem.replace(/^realm_[a-z]+_/, '').replace(/_[0-9a-f]{6,}$/, '').replace(/_/g, ' '),
    });
  }
}

rows.sort((a, b) => (a.key < b.key ? -1 : 1));
if (APPLY) writeFileSync(OUT, JSON.stringify(rows, null, 2) + '\n');

const vocab = new Set(rows.flatMap((r) => r.clips));
console.log(`installed=${installed} rows=${rows.length}`);
console.log(`realms: ${JSON.stringify(rows.reduce((a, r) => ((a[r.realm] = (a[r.realm] || 0) + 1), a), {}))}`);
console.log(`clip vocabulary across ALL rows: ${[...vocab].sort().join(',')}`);
const odd = rows.filter((r) => r.clips.length !== 6);
console.log(`rows whose clip count is not 6: ${odd.length}`);
if (!APPLY) console.log('\nDRY RUN — nothing written.');
