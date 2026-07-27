// Reconcile staging + store against the CURRENT classifier output.
//
// Classification rules tightened several times while batches were already running
// (category veto, anatomy fragments, weapon-only assets), so bodies rigged under
// older rules are still sitting in staging and in the live store. Rather than
// chaining one purge per rule, this keeps exactly the set the current classifier
// approves and removes everything else.
//
//   node reconcile.mjs --entries /tmp/entries4.json [--apply]

import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const APPLY = !!arg('apply');
const ENTRIES = arg('entries', '/tmp/entries4.json');
const DIRS = String(arg('dirs',
  '/mnt/usb4/moveweight-assets/cr-realms-staging,/mnt/usb4/moveweight-assets/cr-realms')).split(',');

const approved = new Set(JSON.parse(readFileSync(ENTRIES, 'utf8')).map((e) => e.key));
console.log(`[reconcile] classifier approves ${approved.size} keys`);

let kept = 0;
const dropped = [];
for (const base of DIRS) {
  if (!existsSync(base)) continue;
  for (const realm of readdirSync(base)) {
    const rd = join(base, realm);
    try { if (!statSync(rd).isDirectory()) continue; } catch { continue; }
    for (const f of readdirSync(rd).filter((x) => x.startsWith('realm_') && x.endsWith('.glb'))) {
      const key = f.replace(/\.glb$/, '');
      if (approved.has(key)) { kept++; continue; }
      dropped.push({ base: base.includes('staging') ? 'stage' : 'store', realm, key });
      if (APPLY) { try { unlinkSync(join(rd, f)); } catch {} }
    }
  }
}

const by = {};
for (const d of dropped) {
  const k = `${d.base}:${d.realm}`;
  by[k] = (by[k] ?? 0) + 1;
}
console.log(`${APPLY ? 'REMOVED' : 'WOULD REMOVE'} ${dropped.length}, keeping ${kept}`);
console.log(by);
writeFileSync('/tmp/reconciled.json', JSON.stringify(dropped, null, 1));
