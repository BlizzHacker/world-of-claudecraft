// Apply the calibrated humanoid gate retroactively to already-staged bodies.
// The gate was added after several hundred assets had already been rigged, so the
// staging area holds skull piles and spiders that must not reach a realm.
//
//   node purge_nonhumanoid.mjs --staging /staging [--apply]
// Dry-run by default: prints what it would remove and why.

import { humanoidVerdict } from './humanoid_gate.mjs';
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const STAGING = arg('staging', '/mnt/usb4/moveweight-assets/cr-realms-staging');
const APPLY = !!arg('apply');
const entries = JSON.parse(readFileSync('/tmp/entries.json', 'utf8'));
const srcByKey = new Map(entries.map((e) => [e.key, e.src]));

const realms = readdirSync(STAGING).filter((d) => {
  try { return statSync(join(STAGING, d)).isDirectory(); } catch { return false; }
});

let kept = 0;
const dropped = [];
for (const realm of realms) {
  for (const f of readdirSync(join(STAGING, realm)).filter((x) => x.endsWith('.glb'))) {
    const key = f.replace(/\.glb$/, '');
    const src = srcByKey.get(key);
    if (!src) { kept++; continue; }
    let v;
    try { v = humanoidVerdict(src); } catch (e) { v = { ok: false, reason: 'unreadable' }; }
    if (v.ok) { kept++; continue; }
    dropped.push({ realm, key, reason: v.reason });
    if (APPLY) unlinkSync(join(STAGING, realm, f));
  }
}

const byRealm = {};
for (const d of dropped) byRealm[d.realm] = (byRealm[d.realm] ?? 0) + 1;
console.log(`${APPLY ? 'REMOVED' : 'WOULD REMOVE'} ${dropped.length}, keeping ${kept}`);
console.log('per realm:', byRealm);
for (const d of dropped.slice(0, 15)) console.log(`  - ${d.realm}/${d.key} :: ${d.reason}`);
writeFileSync('/tmp/purged.json', JSON.stringify(dropped, null, 1));
