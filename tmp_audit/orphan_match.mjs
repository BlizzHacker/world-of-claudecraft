#!/usr/bin/env node
// For each roster visualKey that is absent from the manifest, look for a
// same-asset counterpart by trailing hash. A previous sanitization pass renamed
// files (warhammer -> warhost) WITHOUT touching the roster, so the orphan may
// still exist under an innocent-looking name - same model, same textures, only
// the filename laundered. Match on hash, never on words.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/opt/cryptic-realm';
const STORE = '/opt/cr-realms-store';

const manifestSrc = readFileSync(`${ROOT}/src/render/characters/manifest.generated.ts`, 'utf8');
const manifestKeys = [...manifestSrc.matchAll(/^\s{2}(realm_[a-z0-9_]+):\s*\{/gm)].map((m) => m[1]);

const storeFiles = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.glb')) storeFiles.push(p);
  }
})(STORE);

const BROKEN = process.argv.slice(2);
for (const key of BROKEN) {
  const hash = key.match(/([0-9a-f]{8})_*$/)?.[1] ?? key.slice(-8);
  console.log(`\n=== ${key}   hash=${hash}`);
  const mk = manifestKeys.filter((k) => k.includes(hash));
  console.log(`  manifest keys with hash: ${mk.length ? mk.join(', ') : '(none)'}`);
  const sf = storeFiles.filter((f) => f.includes(hash));
  console.log(`  store files with hash:   ${sf.length ? sf.join(', ') : '(none)'}`);
}
