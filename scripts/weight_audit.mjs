#!/usr/bin/env node
// What does the client actually have to download, and what does BOOT cost?
//
// assets.ts skips lazyPreload keys in the boot sweep and fetches them on demand,
// so the eager set is what every player pays before they can play. Everything
// else is streamed, but a single body large enough still stalls the frame it
// arrives on. Measure both rather than guessing from a handful of files.
import { readFileSync, existsSync, statSync } from 'node:fs';

const REPO = '/opt/cryptic-realm';
const STORE = '/opt/cr-realms-store';
const src = readFileSync(`${REPO}/src/render/characters/manifest.generated.ts`, 'utf8');

// Each generated entry looks like:  key: {\n url: `${REALM_MODELS}/<path>`,\n ... lazyPreload: true,
const entries = [];
const re = /^\s{2}([A-Za-z0-9_]+):\s*\{\n([\s\S]*?)\n\s{2}\},/gm;
let m;
while ((m = re.exec(src))) {
  const [, key, body] = m;
  const url = (body.match(/\$\{REALM_MODELS\}\/([^`'"]+\.glb)/) || [])[1];
  if (!url) continue;
  entries.push({ key, url, lazy: /lazyPreload:\s*true/.test(body) });
}

let missing = 0;
for (const e of entries) {
  const p = `${STORE}/${e.url}`;
  e.kb = existsSync(p) ? Math.round(statSync(p).size / 1024) : (missing++, 0);
}

const sum = (a) => a.reduce((x, y) => x + y, 0);
const eager = entries.filter((e) => !e.lazy);
const lazy = entries.filter((e) => e.lazy);
const mb = (kb) => (kb / 1024).toFixed(1);

console.log(`generated entries parsed: ${entries.length}  (missing on disk: ${missing})`);
console.log(`EAGER (boot sweep):  ${eager.length} bodies, ${mb(sum(eager.map((e) => e.kb)))} MB`);
console.log(`LAZY  (on demand):   ${lazy.length} bodies, ${mb(sum(lazy.map((e) => e.kb)))} MB`);

const sorted = [...entries].sort((a, b) => b.kb - a.kb);
const buckets = [[20480, '>20MB'], [10240, '10-20MB'], [5120, '5-10MB'], [2048, '2-5MB'], [0, '<2MB']];
console.log('\nsize distribution:');
let rest = [...sorted];
for (const [floor, label] of buckets) {
  const hit = rest.filter((e) => e.kb >= floor);
  rest = rest.filter((e) => e.kb < floor);
  console.log(`  ${label.padEnd(9)} ${String(hit.length).padStart(5)}  ${mb(sum(hit.map((e) => e.kb))).padStart(8)} MB`);
}

console.log('\nheaviest 20 bodies:');
for (const e of sorted.slice(0, 20)) {
  console.log(`  ${String(e.kb).padStart(6)} kb  ${e.lazy ? 'lazy ' : 'EAGER'}  ${e.key}`);
}
const eagerHeavy = eager.filter((e) => e.kb > 5120).sort((a, b) => b.kb - a.kb);
console.log(`\nEAGER bodies over 5MB (paid at boot by every player): ${eagerHeavy.length}`);
for (const e of eagerHeavy.slice(0, 15)) console.log(`  ${String(e.kb).padStart(6)} kb  ${e.key}`);
