#!/usr/bin/env node
// Rebuild the shortlisting index the brief called tmp/entries.json (now missing):
// every body GLB in the realm store, with its key, display name and realm.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/opt/cr-realms-store';
const realms = readdirSync(ROOT).filter((d) => {
  try { return statSync(join(ROOT, d)).isDirectory(); } catch { return false; }
});

const rows = [];
for (const realm of realms) {
  const mf = join(ROOT, realm, 'manifest.json');
  if (!existsSync(mf)) continue;
  let doc;
  try { doc = JSON.parse(readFileSync(mf, 'utf8')); } catch { continue; }
  for (const a of doc.assets ?? []) {
    rows.push({
      realm,
      key: a.key ?? a.id ?? '',
      name: a.name ?? a.displayName ?? '',
      category: a.category ?? a.kind ?? '',
      url: a.url ?? a.assetUrl ?? a.path ?? '',
      tags: (a.tags ?? []).join('|'),
    });
  }
}
console.log(`# ${rows.length} assets across ${realms.length} realms`);
if (process.argv[2] === '--dump') {
  process.stdout.write(JSON.stringify(rows, null, 0));
} else {
  // category histogram, so I can find the humanoid-body category name
  const hist = {};
  for (const r of rows) hist[r.category] = (hist[r.category] ?? 0) + 1;
  for (const [k, v] of Object.entries(hist).sort((a, b) => b[1] - a[1])) {
    console.log(String(v).padStart(6), k || '(none)');
  }
  console.log('\n# sample rows');
  for (const r of rows.slice(0, 5)) console.log(JSON.stringify(r));
}
