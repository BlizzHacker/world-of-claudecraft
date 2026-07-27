// Retroactively remove staged/published bodies whose Meshy category marks them as
// sculpture, decor, scenery, vehicles or animals — content that should never have
// been given a humanoid rig.
//
// This gate arrived after several hundred bodies had already shipped. Geometry
// cannot find these: the alien "face relief" busts that flooded dominion measure
// the same as a slim humanoid. Only Meshy's own categories separate them.
//
//   node purge_categories.mjs [--apply] [--dirs a,b]

import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const arg = (n, d = null) => {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};
const APPLY = !!arg('apply');
const DIRS = String(arg('dirs',
  '/mnt/usb4/moveweight-assets/cr-realms-staging,/mnt/usb4/moveweight-assets/cr-realms')).split(',');

const REJECT = new Set(['ArtAbstract', 'Vehicles', 'Architecture', 'FurnitureHome',
  'NaturePlants', 'Music', 'PlacesTravel', 'Animals', 'FoodDrink', 'Electronics']);

const names = JSON.parse(readFileSync('/tmp/meshy_names.json', 'utf8'));
const ent = [];
for (const f of ['/tmp/entries.json', '/tmp/entries2.json', '/tmp/entries3.json']) {
  if (existsSync(f)) ent.push(...JSON.parse(readFileSync(f, 'utf8')));
}
const ridByKey = new Map(ent.map((e) => [e.key, e.rid ?? e.src.split('/').pop().split('__')[0]]));

let kept = 0;
const dropped = [];
for (const base of DIRS) {
  if (!existsSync(base)) continue;
  for (const realm of readdirSync(base)) {
    const rd = join(base, realm);
    let st;
    try { st = statSync(rd); } catch { continue; }
    if (!st.isDirectory()) continue;
    for (const f of readdirSync(rd).filter((x) => x.startsWith('realm_') && x.endsWith('.glb'))) {
      const key = f.replace(/\.glb$/, '');
      const rid = ridByKey.get(key);
      const cats = names[rid]?.categories ?? [];
      if (!cats.some((c) => REJECT.has(c))) { kept++; continue; }
      dropped.push({ base, realm, key, cats: cats.join(',') });
      if (APPLY) { try { unlinkSync(join(rd, f)); } catch {} }
    }
  }
}

const byRealm = {};
for (const d of dropped) byRealm[`${d.base.includes('staging') ? 'stage' : 'store'}:${d.realm}`] =
  (byRealm[`${d.base.includes('staging') ? 'stage' : 'store'}:${d.realm}`] ?? 0) + 1;
console.log(`${APPLY ? 'REMOVED' : 'WOULD REMOVE'} ${dropped.length}, keeping ${kept}`);
console.log(byRealm);
for (const d of dropped.slice(0, 8)) console.log(`  - ${d.realm}/${d.key.slice(0, 46)} [${d.cats}]`);
writeFileSync('/tmp/purged_categories.json', JSON.stringify(dropped, null, 1));
