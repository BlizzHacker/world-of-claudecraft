#!/usr/bin/env node
// Quarantine a confirmed-IP body: pull the GLB out of the served store and strip
// its key from every generated table. Renaming the file (what ip_rename*.mjs did)
// laundered the NAME and left the MODEL registered and servable, which is how a
// He-Man and a Space Marine survived the last purge - so this moves the asset and
// deletes the registration, never just relabels it.
//
//   ip_purge.mjs --bucket ip-likeness key [key...]
//   ip_purge.mjs --dry ...
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/opt/cryptic-realm';
const STORE = '/opt/cr-realms-store';
const QUAR = '/mnt/usb4/moveweight-assets/cr-realms-quarantine';

function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
const BUCKET = arg('bucket', 'ip-likeness');
const DRY = !!arg('dry');
const KEYS = process.argv.slice(2).filter((a) => a.startsWith('realm_'));
if (!KEYS.length) { console.error('no keys'); process.exit(1); }

// ---- 1. move the GLB out of the served store -------------------------------
for (const key of KEYS) {
  let found = null;
  for (const realm of readdirSync(STORE)) {
    const p = join(STORE, realm, `${key}.glb`);
    try { if (statSync(p).isFile()) { found = { p, realm }; break; } } catch { /* not here */ }
  }
  if (!found) { console.log(`  store: ${key} ALREADY ABSENT`); continue; }
  const qdir = join(QUAR, BUCKET);
  if (!DRY) {
    mkdirSync(qdir, { recursive: true });
    renameSync(found.p, join(qdir, `${key}.glb`));
  }
  console.log(`  store: ${key} -> ${BUCKET}/ (from ${found.realm})`);
}

// ---- 2. strip the key from the generated tables -----------------------------
function stripManifest(src, keys) {
  const out = [];
  const lines = src.split('\n');
  let i = 0;
  let removedBlocks = 0, removedRefs = 0;
  while (i < lines.length) {
    const line = lines[i];
    const blockStart = line.match(/^ {2}(realm_[a-z0-9_]+): \{$/);
    if (blockStart && keys.includes(blockStart[1])) {
      // consume through the matching two-space `},`
      while (i < lines.length && lines[i] !== '  },') i++;
      i++; // the `},` itself
      removedBlocks++;
      continue;
    }
    // pool / set membership lines: any indent, quoted key, optional comma
    const ref = line.match(/^\s*'(realm_[a-z0-9_]+)',?$/);
    if (ref && keys.includes(ref[1])) { i++; removedRefs++; continue; }
    out.push(line);
    i++;
  }
  return { text: out.join('\n'), removedBlocks, removedRefs };
}

const manifestPath = `${ROOT}/src/render/characters/manifest.generated.ts`;
const m = stripManifest(readFileSync(manifestPath, 'utf8'), KEYS);
console.log(`  manifest: -${m.removedBlocks} entries, -${m.removedRefs} pool refs`);
if (!DRY) writeFileSync(manifestPath, m.text);

// realm_wield.generated.ts:  "key": 0.7256,
const wieldPath = `${ROOT}/src/render/characters/realm_wield.generated.ts`;
{
  const before = readFileSync(wieldPath, 'utf8').split('\n');
  const after = before.filter((l) => !KEYS.some((k) => l.trim().startsWith(`"${k}":`)));
  console.log(`  realm_wield: -${before.length - after.length} rows`);
  if (!DRY) writeFileSync(wieldPath, after.join('\n'));
}

// bodies_geometry.generated.json: keyed by "<realm>/<key>.glb"
const geomPath = `${ROOT}/scripts/realm_assets/bodies_geometry.generated.json`;
{
  const j = JSON.parse(readFileSync(geomPath, 'utf8'));
  let n = 0;
  for (const gk of Object.keys(j)) {
    if (KEYS.some((k) => gk.endsWith(`/${k}.glb`))) { delete j[gk]; n++; }
  }
  console.log(`  bodies_geometry: -${n} rows`);
  if (!DRY) writeFileSync(geomPath, `${JSON.stringify(j, null, 1)}\n`);
}
console.log(DRY ? 'DRY RUN - nothing written' : 'purge written');
