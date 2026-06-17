#!/usr/bin/env node
// Copy realm-tagged GLB assets from `<realm> realm assets/` folders into
// `public/cr-realms/<realm>/` and emit a manifest JSON the runtime loader
// reads at boot. Picks the smallest files first up to MAX_PER_REALM so
// the first deploy stays lean — drop in more files and rerun this script
// (npm run assets:realms) to widen the manifest later.
//
// Mapping: folder name → realm id
//   'cryptic realm assets'   → infernal  (Cryptic Realm's flagship pack)
//   'infernal realm assets'  → infernal
//   'classic realm assets'   → classic
//   'claudcraft realm assets'→ claudecraft
//
// 'dominion' and 'arcane' get empty manifests until source assets land.

import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(ROOT, '..');
const OUT  = path.join(REPO, 'public', 'cr-realms');

const MAX_BYTES_PER_FILE = 12 * 1024 * 1024;   // 12 MB per asset cap
const MAX_PER_REALM      = 12;                  // start small; widen later

const FOLDER_TO_REALM = {
  'cryptic realm assets':   'infernal',
  'infernal realm assets':  'infernal',
  'classic realm assets':   'classic',
  'claudcraft realm assets':'claudecraft',
};

const REALMS = ['infernal', 'classic', 'dominion', 'arcane', 'claudecraft'];

function looksAnimated(filename) {
  return /\bmerged_animations\b|_animated\b|_anim\b/i.test(filename);
}

function safeAssetName(raw) {
  return raw
    .replace(/\.glb$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

async function gatherCandidates(folderName) {
  const dir = path.join(REPO, folderName);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const out = [];
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!/\.glb$/i.test(e.name)) continue;
      if (/\.crdownload$/i.test(e.name)) continue;
      const full = path.join(dir, e.name);
      const stat = await fs.stat(full);
      if (stat.size > MAX_BYTES_PER_FILE) continue;
      out.push({
        sourcePath: full,
        sourceName: e.name,
        size: stat.size,
        animated: looksAnimated(e.name),
      });
    }
    return out;
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function buildRealm(realmId, candidates) {
  // Sort: animated first, then by size ascending (smallest first).
  candidates.sort((a, b) => {
    if (a.animated !== b.animated) return a.animated ? -1 : 1;
    return a.size - b.size;
  });
  const chosen = candidates.slice(0, MAX_PER_REALM);
  const realmDir = path.join(OUT, realmId);
  await fs.mkdir(realmDir, { recursive: true });

  const manifest = {
    realmId,
    generatedAt: new Date().toISOString(),
    assets: [],
  };

  for (const c of chosen) {
    const dest = safeAssetName(c.sourceName) + '.glb';
    const destPath = path.join(realmDir, dest);
    await fs.copyFile(c.sourcePath, destPath);
    manifest.assets.push({
      name: dest.replace(/\.glb$/, ''),
      url: `/cr-realms/${realmId}/${dest}`,
      size: c.size,
      animated: c.animated,
      sourceName: c.sourceName,
    });
  }

  const manifestPath = path.join(realmDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const byRealm = Object.fromEntries(REALMS.map((r) => [r, []]));
  for (const [folder, realm] of Object.entries(FOLDER_TO_REALM)) {
    const list = await gatherCandidates(folder);
    byRealm[realm].push(...list);
  }
  const summary = [];
  for (const realm of REALMS) {
    const manifest = await buildRealm(realm, byRealm[realm] ?? []);
    summary.push({
      realm,
      count: manifest.assets.length,
      bytes: manifest.assets.reduce((a, b) => a + b.size, 0),
    });
  }
  console.log('realm asset manifests:');
  for (const row of summary) {
    console.log(`  ${row.realm.padEnd(12)} ${row.count.toString().padStart(2)} assets · ${(row.bytes / 1024 / 1024).toFixed(2)} MB`);
  }
  // Top-level index so the loader can discover all realm manifests.
  const indexPath = path.join(OUT, 'index.json');
  await fs.writeFile(indexPath, JSON.stringify({
    realms: REALMS.map((r) => ({ realmId: r, manifestUrl: `/cr-realms/${r}/manifest.json` })),
  }, null, 2) + '\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
