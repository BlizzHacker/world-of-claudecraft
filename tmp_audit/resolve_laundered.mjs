#!/usr/bin/env node
// Rebuild the real IP suspect list from the rename LOG rather than from names.
// he_man_toy_action was renamed to thewn_champion_toy_action and then AGAIN to
// action_figure_hero_toys, so no name-based scan can find it - but the 8-hex
// asset id survived every pass. Resolve each laundered id to whatever it is
// called today, and report whether it is still served and still registered.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/opt/cryptic-realm';
const STORE = '/opt/cr-realms-store';
const LOG = `${ROOT}/tmp/ip_rename_map.json.log`;

const original = new Map(); // hash -> original franchise name
for (const line of readFileSync(LOG, 'utf8').split('\n')) {
  const m = line.match(/^(\S+)\.glb -> (\S+)\.glb$/);
  if (!m) continue;
  const h = m[1].match(/([0-9a-f]{8,12})$/)?.[1];
  if (!h) continue;
  if (!original.has(h)) original.set(h, m[1]);
}

const manifestSrc = readFileSync(`${ROOT}/src/render/characters/manifest.generated.ts`, 'utf8');
const manifestKeys = [...manifestSrc.matchAll(/^ {2}(realm_[a-z0-9_]+): \{$/gm)].map((m) => m[1]);

const storeFiles = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.glb')) storeFiles.push(p);
  }
})(STORE);

const rosterSrc = readFileSync(`${ROOT}/src/sim/realms/rosters.generated.ts`, 'utf8');

const live = [];
console.log(`laundered ids in log: ${original.size}\n`);
for (const [hash, orig] of [...original].sort()) {
  const keys = manifestKeys.filter((k) => k.endsWith(hash));
  const files = storeFiles.filter((f) => f.endsWith(`${hash}.glb`));
  const registered = keys.length > 0;
  const served = files.length > 0;
  const inRoster = keys.some((k) => rosterSrc.includes(`'${k}'`));
  const status = registered && served ? 'LIVE' : served ? 'served-only' : registered ? 'registered-only' : 'gone';
  console.log(`${status.padEnd(15)} ${hash}  was: ${orig}`);
  if (keys.length) console.log(`                now: ${keys.join(', ')}${inRoster ? '   <-- IN ROSTER' : ''}`);
  if (served && registered) live.push(files[0]);
}
console.log(`\n--- ${live.length} still live; render list ---`);
for (const f of live) console.log(f);
