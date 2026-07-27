#!/usr/bin/env node
// Prove every generated visual resolves to a GLB that actually exists in the store.
//
// This is the highest-value check in the whole pipeline: public/cr-realms/ is
// gitignored and GLBs ship out-of-band, so code and assets can drift silently.
// A missing body does not crash the client - createCharacterVisual returns null
// and the entity is skipped - so the failure mode is invisible bodies, not an
// error anyone would notice.
//
//   node verify_store.mjs [--store /mnt/.../cr-realms] [--serve http://127.0.0.1:8788]

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const STORE = arg('store', '/mnt/usb4/moveweight-assets/cr-realms');
const GEN = arg('gen', '/opt/cryptic-realm/src/render/characters/manifest.generated.ts');
const SERVE = arg('serve', null);

const src = readFileSync(GEN, 'utf8');
// url: `${REALM_MODELS}/<realm>/<key>.glb`
const re = /url:\s*`\$\{REALM_MODELS\}\/([a-z0-9]+)\/([A-Za-z0-9_]+)\.glb`/g;
const refs = [];
let m;
while ((m = re.exec(src))) refs.push({ realm: m[1], key: m[2] });

const missing = [];
const empty = [];
for (const r of refs) {
  const p = join(STORE, r.realm, `${r.key}.glb`);
  if (!existsSync(p)) { missing.push(r); continue; }
  if (statSync(p).size < 1024) empty.push(r);
}

console.log(`[verify] ${refs.length} generated urls`);
console.log(`[verify] missing on disk: ${missing.length}`);
console.log(`[verify] suspiciously small: ${empty.length}`);
for (const r of missing.slice(0, 10)) console.log(`   MISSING ${r.realm}/${r.key}.glb`);
for (const r of empty.slice(0, 5)) console.log(`   TINY    ${r.realm}/${r.key}.glb`);

let served = 0;
let failed = 0;
if (SERVE) {
  // Sample the HTTP path too: existing on disk is necessary but not sufficient,
  // the static handler must actually serve it from CR_REALMS_DIR.
  const sample = refs.filter((_, i) => i % Math.ceil(refs.length / 25) === 0).slice(0, 25);
  for (const r of sample) {
    const url = `${SERVE}/cr-realms/${r.realm}/${r.key}.glb`;
    try {
      const res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-64' } });
      if (res.ok || res.status === 206) served++;
      else { failed++; console.log(`   HTTP ${res.status} ${r.realm}/${r.key}`); }
    } catch (e) {
      failed++;
      console.log(`   ERR  ${r.realm}/${r.key}: ${String(e.message).slice(0, 60)}`);
    }
  }
  console.log(`[verify] http sample: ${served} ok, ${failed} failed`);
}

const bad = missing.length + empty.length + failed;
console.log(bad === 0 ? '[verify] PASS' : `[verify] FAIL (${bad})`);
process.exit(bad === 0 ? 0 : 1);
