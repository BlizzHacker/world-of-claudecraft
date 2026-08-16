#!/usr/bin/env node
// Resolve every roster visualKey against the generated manifest + the on-disk
// store. A roster entry whose key is absent from the manifest renders nothing,
// so it has to be found before any IP triage - a body that never loads cannot
// be "re-cast onto a clean body", it is already broken.
import { readFileSync, existsSync } from 'node:fs';

const ROOT = '/opt/cryptic-realm';
const STORE = '/opt/cr-realms-store';

const rosterSrc = readFileSync(`${ROOT}/src/sim/realms/rosters.generated.ts`, 'utf8');
const manifestSrc = readFileSync(`${ROOT}/src/render/characters/manifest.generated.ts`, 'utf8');

// Manifest keys look like:  realm_infernal_foo_0193abcd: {
const manifestKeys = new Set();
for (const m of manifestSrc.matchAll(/^\s{2}(realm_[a-z0-9_]+):\s*\{/gm)) manifestKeys.add(m[1]);

// and each has a body url somewhere under it
const keyToUrl = new Map();
{
  const re = /^\s{2}(realm_[a-z0-9_]+):\s*\{/gm;
  let m;
  const idxs = [];
  while ((m = re.exec(manifestSrc))) idxs.push([m[1], m.index]);
  for (let i = 0; i < idxs.length; i++) {
    const [key, start] = idxs[i];
    const end = i + 1 < idxs.length ? idxs[i + 1][1] : manifestSrc.length;
    const block = manifestSrc.slice(start, end);
    // Body urls are template literals: url: `${REALM_MODELS}/classic/x.glb`
    const u = block.match(/url:\s*[`'"]\$\{REALM_MODELS\}([^`'"]*\.glb)[`'"]/);
    if (u) keyToUrl.set(key, u[1]);
  }
}

const entries = [];
let realm = null;
for (const line of rosterSrc.split('\n')) {
  const r = line.match(/^\s{2}([a-z_]+):\s*\[/);
  if (r) realm = r[1];
  const e = line.match(/id:\s*'([^']+)'.*?name:\s*"([^"]+)".*?engineClass:\s*'([^']+)'.*?faction:\s*"([^"]+)".*?visualKey:\s*'([^']+)'/);
  if (e) entries.push({ realm, id: e[1], name: e[2], cls: e[3], faction: e[4], key: e[5] });
}

let bad = 0;
const rows = [];
for (const en of entries) {
  const inManifest = manifestKeys.has(en.key);
  const url = keyToUrl.get(en.key);
  const disk = url ? existsSync(STORE + url.replace(/^\/cr-realms/, '')) : false;
  const ok = inManifest && url && disk;
  if (!ok) bad++;
  rows.push({ ...en, inManifest, url: url ?? null, disk, ok });
}

console.log(`entries=${entries.length}  manifestKeys=${manifestKeys.size}  BROKEN=${bad}`);
for (const r of rows.filter((x) => !x.ok)) {
  console.log(`BROKEN ${r.realm}/${r.id} "${r.name}" ${r.cls}/${r.faction}`);
  console.log(`       key=${r.key} inManifest=${r.inManifest} url=${r.url} disk=${r.disk}`);
}
console.log('---OKLIST---');
for (const r of rows.filter((x) => x.ok)) console.log(`${r.realm}\t${r.id}\t${r.cls}\t${r.faction}\t${r.key}\t${STORE}${r.url.replace(/^\/cr-realms/, '')}`);
