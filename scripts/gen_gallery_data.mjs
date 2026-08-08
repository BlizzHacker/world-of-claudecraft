// Build the gallery's per-realm data: bodies, creatures, and the visual verdicts.
// The gallery must answer "does this belong in the game?" at a glance, so every
// row carries what a human actually needs: a picture, size, and any flag that
// should stop it (IP risk, quarantine) rather than burying that in a CSV.
import { readdirSync, existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const STORE = '/opt/cr-realms-store';
const REVIEW = join(STORE, 'review');
const REALMS = ['infernal','classic','cryptic','crypticrealm','dominion','arcane','fps','arcadevoid','claudecraft','exchange'];

// Visual verdicts keyed by the id8 tail (class + action + note).
const verdict = new Map();
const dpath = '/opt/cryptic-realm/tmp/nonhum_decisions.csv';
if (existsSync(dpath)) {
  for (const line of readFileSync(dpath, 'utf8').split('\n').slice(1)) {
    if (!line.trim()) continue;
    const c = line.split(',');
    const id = (c[0] || '').trim();
    if (!id) continue;
    verdict.set(id.slice(0, 8).toLowerCase(), { cls: (c[2] || '').trim(), action: (c[3] || '').trim() });
  }
}
const tailOf = (f) => (f.match(/([0-9a-f]{8})(?:\.glb)?$/i) || [])[1]?.toLowerCase();
const pretty = (f) => f.replace(/\.glb$/, '')
  .replace(/^realm_[a-z]+_/, '').replace(/_[0-9a-f]{8}$/, '').replace(/_/g, ' ').trim();

let totals = { body: 0, creature: 0 };
for (const realm of REALMS) {
  const dir = join(STORE, realm);
  if (!existsSync(dir)) continue;

  const rows = [];
  // top-level GLBs are character bodies
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.glb')) continue;
    if (!statSync(join(dir, f)).isFile()) continue;
    const png = f.replace(/\.glb$/, '.png');
    const v = verdict.get(tailOf(f));
    rows.push({
      name: pretty(f), bucket: 'body', kind: 'body',
      url: `/cr-realms/${realm}/${f}`,
      thumb: existsSync(join(dir, png)) ? `/cr-realms/${realm}/${png}` : null,
      kb: Math.round(statSync(join(dir, f)).size / 1024),
      cls: v?.cls ?? null, flags: [],
    });
    totals.body++;
  }
  // creatures live in their own bucket and carry the quadruped rig family
  const cdir = join(dir, 'creatures');
  if (existsSync(cdir)) {
    for (const f of readdirSync(cdir)) {
      if (!f.endsWith('.glb')) continue;
      const png = f.replace(/\.glb$/, '.png');
      const v = verdict.get(tailOf(f));
      rows.push({
        name: pretty(f), bucket: 'creature', kind: 'creature', rig: 'quadruped',
        url: `/cr-realms/${realm}/creatures/${f}`,
        thumb: existsSync(join(cdir, png)) ? `/cr-realms/${realm}/creatures/${png}` : null,
        kb: Math.round(statSync(join(cdir, f)).size / 1024),
        cls: v?.cls ?? null, flags: [],
      });
      totals.creature++;
    }
  }
  writeFileSync(join(REVIEW, `data_${realm}_bodies.json`), JSON.stringify(rows));
  if (rows.length) console.log(realm.padEnd(14), rows.length, 'rows');
}
console.log('totals', JSON.stringify(totals), '| verdicts loaded', verdict.size);
