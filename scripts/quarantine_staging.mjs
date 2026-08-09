// A staged body that is NOT in the live store can never be served, so registering
// it only produces in-world asset misses. Move those staged files out of the
// emitter's input (reversible: they go to a sibling quarantine dir, never deleted).
// This is also what keeps IP-purged bodies from being re-registered by a later
// regeneration - the purge removed them from the store, not from staging.
import { readdirSync, statSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const STAGING = '/mnt/usb4/moveweight-assets/cr-realms-staging';
const STORE = '/opt/cr-realms-store';
const QUAR = '/mnt/usb4/moveweight-assets/cr-realms-quarantine';
let moved = 0, kept = 0;
for (const realm of readdirSync(STAGING)) {
  const dir = join(STAGING, realm);
  try { if (!statSync(dir).isDirectory()) continue; } catch { continue; }
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.glb')) continue;
    if (existsSync(join(STORE, realm, f))) { kept++; continue; }
    const qdir = join(QUAR, realm);
    mkdirSync(qdir, { recursive: true });
    renameSync(join(dir, f), join(qdir, f));
    moved++;
  }
}
console.log('staged bodies kept (in store):', kept, '| quarantined (not served):', moved);
