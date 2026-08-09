// List top-level body GLBs per realm dir into data_<realm>_bodies.json.
import fs from 'node:fs';
import path from 'node:path';
const STORE = '/opt/cr-realms-store';
const realms = ['infernal','classic','cryptic','crypticrealm','dominion','arcane','fps','arcadevoid','claudecraft','exchange'];
for (const r of realms) {
  const dir = path.join(STORE, r);
  if (!fs.existsSync(dir)) continue;
  const rows = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.glb')) continue;
    const full = path.join(dir, f);
    if (!fs.statSync(full).isFile()) continue;
    const png = f.replace(/\.glb$/, '.png');
    const hasPng = fs.existsSync(path.join(dir, png));
    const name = f.replace(/\.glb$/, '').replace(/^realm_[a-z]+_/, '').replace(/_[0-9a-f]{8}$/, '').replace(/_/g, ' ');
    rows.push({ name, bucket: 'body', url: `/cr-realms/${r}/${f}`, thumb: hasPng ? `/cr-realms/${r}/${png}` : null, flags: [] });
  }
  fs.writeFileSync(path.join(STORE, 'review', `data_${r}_bodies.json`), JSON.stringify(rows));
  console.log(r, rows.length, 'bodies');
}
