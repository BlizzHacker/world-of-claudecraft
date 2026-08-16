// Why did the 146 vision-classified props not enter the decor catalogue?
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { classifyDecor, slugWords } from '/opt/cryptic-realm/scripts/realm_assets/emit_decor.mjs';

const STORE = '/opt/cr-realms-store';
const dec = new Map();
for (const line of readFileSync('/opt/cryptic-realm/tmp/nonhum_decisions.csv', 'utf8').split('\n').slice(1)) {
  if (!line.trim()) continue;
  const c = line.split(',');
  const id = (c[0] || '').trim();
  if (id) dec.set(id.slice(0, 8).toLowerCase(), { cls: (c[2] || '').trim(), action: (c[3] || '').trim() });
}
console.log('decisions loaded:', dec.size);

let checked = 0, roled = 0;
const nullReasons = new Map();
for (const realm of readdirSync(STORE)) {
  const pd = `${STORE}/${realm}/props`;
  if (!existsSync(pd)) continue;
  for (const f of readdirSync(pd)) {
    if (!f.endsWith('.glb')) continue;
    const tail = (f.match(/([0-9a-f]{8})\.glb$/i) || [])[1]?.toLowerCase();
    const d = tail ? dec.get(tail) : null;
    if (!d) continue;                    // only the vision-classified ones
    checked++;
    const role = classifyDecor(f, 'props');
    if (role) { roled++; continue; }
    const words = slugWords(f);
    nullReasons.set(d.cls, (nullReasons.get(d.cls) || 0) + 1);
    if (nullReasons.get(d.cls) <= 2) console.log(`  NULL [${d.cls}] ${f.slice(0, 62)} words=${words.slice(0, 6).join(',')}`);
  }
}
console.log('vision-classified props on disk:', checked, '| got a role:', roled);
console.log('null by class:', [...nullReasons.entries()].map(([k, v]) => `${k}=${v}`).join(' '));
