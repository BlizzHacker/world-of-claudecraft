// Every /cr-realms/ URL the generated modules reference must exist on disk in the
// store. A dangling entry is a body that renders as nothing in the live world and
// logs no error anyone reads.
import { readFileSync, existsSync } from 'node:fs';
const STORE = '/opt/cr-realms-store';
const FILES = [
  'src/render/characters/manifest.generated.ts',
  'src/render/characters/creatures.generated.ts',
  'src/sim/realm_decor.generated.ts',
  'src/render/characters/realm_arms.generated.ts',
];
let total = 0, bad = 0;
for (const f of FILES) {
  const path = `/opt/cryptic-realm/${f}`;
  if (!existsSync(path)) { console.log('skip (absent)', f); continue; }
  const src = readFileSync(path, 'utf8');
  const urls = new Set();
  for (const m of src.matchAll(/\/cr-realms\/([A-Za-z0-9_\-./]+\.(?:glb|png|webp))/g)) urls.add(m[1]);
  // template literals use ${REALM_MODELS}/<realm>/... — catch those too
  for (const m of src.matchAll(/\$\{REALM_MODELS\}\/([A-Za-z0-9_\-./]+\.glb)/g)) urls.add(m[1]);
  for (const m of src.matchAll(/\$\{WEAPONS\}\/([A-Za-z0-9_\-./]+\.glb)/g)) urls.add(`__weapons__/${m[1]}`);
  // The decor catalogue does not carry URLs at all — it addresses assets by a
  // `realm:<realm>/<bucket>/<stem>` key and appends .glb at load. Matching only
  // on "/cr-realms/" silently reported 804 rows as zero URLs and therefore zero
  // dangling, which is the most dangerous kind of green.
  for (const m of src.matchAll(/key: 'realm:([A-Za-z0-9_\-./]+)'/g)) urls.add(`${m[1]}.glb`);

  let miss = 0;
  for (const u of urls) {
    if (u.startsWith('__weapons__/')) continue; // shipped with the client, not the store
    total++;
    if (!existsSync(`${STORE}/${u}`)) { miss++; bad++; if (miss <= 5) console.log('  DANGLING', f, u); }
  }
  console.log(f.padEnd(52), urls.size, 'refs,', miss, 'dangling');
}
console.log(`TOTAL store urls ${total}  dangling ${bad}`);
