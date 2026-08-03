// Rebuild /tmp/entries.json (wiped by the container reboot) for EVERY staged body.
// emit_manifest.mjs joins staging filenames against this for {name, realms}; a
// missing entry silently drops the body from the client registry.
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const STAGING = '/mnt/usb4/moveweight-assets/cr-realms-staging';
const TRIAGE = ['/opt/cryptic-realm/tmp/triage_xscorn.csv',
                '/opt/cryptic-realm/tmp/triage_pastor.csv',
                '/opt/cryptic-realm/tmp/triage_picktura.csv'];

// id8 -> {name, realms[]} from the triage CSVs (id, name, bucket, realms, ...)
const byId = new Map();
for (const f of TRIAGE) {
  if (!existsSync(f)) continue;
  const lines = readFileSync(f, 'utf8').split('\n').slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = '', q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    const [id, name, , realms] = cells;
    if (!id) continue;
    const id8 = id.replace(/-/g, '').slice(0, 8);
    byId.set(id8, {
      name: (name || '').trim(),
      realms: (realms || '').split(/[;|]/).map((r) => r.trim()).filter(Boolean),
    });
  }
}

const VALID = new Set(['infernal','classic','cryptic','crypticrealm','dominion','arcane','fps','arcadevoid','claudecraft','exchange']);
const entries = [];
for (const realm of readdirSync(STAGING)) {
  const dir = join(STAGING, realm);
  try { if (!statSync(dir).isDirectory()) continue; } catch { continue; }
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.glb')) continue;
    const key = f.replace(/\.glb$/, '');
    if (!key.startsWith('realm_')) continue;
    const id8 = key.slice(-8);
    const meta = byId.get(id8);
    // Name drives attack-clip flavour + the armed/NPC-only rule, so a missing
    // triage row falls back to the de-slugged filename rather than dropping.
    const name = meta?.name || key.replace(/^realm_[a-z]+_/, '').replace(/_[0-9a-f]{8}$/, '').replace(/_/g, ' ');
    const realms = [realm, ...(meta?.realms ?? [])]
      .map((r) => (r === 'cryptic' ? 'crypticrealm' : r))
      .filter((r) => VALID.has(r));
    entries.push({ key, name, realms: [...new Set(realms)] });
  }
}
writeFileSync('/tmp/entries.json', JSON.stringify(entries));
const withMeta = entries.filter((e) => byId.has(e.key.slice(-8))).length;
console.log('entries rebuilt:', entries.length, '| triage-matched names:', withMeta);
