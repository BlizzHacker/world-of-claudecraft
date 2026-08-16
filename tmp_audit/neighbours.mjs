#!/usr/bin/env node
// A confirmed-IP body is rarely alone. Meshy hands out sequential ids inside one
// generation batch, so the variants of the same prompt sit on neighbouring
// hashes - which is how realm_classic_armored_guardian_characters_weap_0193fba5
// (a Space Marine, in the live roster) escaped every name-based scan while its
// sibling _0193fba7 was caught. Enumerate the neighbourhood of each confirmed
// hash and render whatever has not been rendered yet.
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const STORE = '/opt/cr-realms-store';
const RENDERED = ['/opt/cryptic-realm/tmp_audit/sweepout',
                  '/opt/cryptic-realm/tmp_audit/lndout',
                  '/opt/cryptic-realm/tmp_audit/ipout',
                  '/opt/cryptic-realm/tmp_audit/aliasout'];

// hashes of bodies confirmed to copy a protected character
const CONFIRMED = [
  '0196ca26', '01963a09',              // 40K terminators (infernal)
  '0193fb93', '0193fb9a', '0193fba7', '0193fba5', // space marines
  '0194183a',                          // he-man
  '01944c40', '0195b9e7', '0195b9e3',  // bruce lee
  '0195675a', '0195675b',              // eddie
  '01961adebf9c',                      // toxic avenger
];

const seen = new Set();
for (const dir of RENDERED) {
  if (!existsSync(dir)) continue;
  for (const d of readdirSync(dir)) seen.add(d);
}

const files = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.glb')) files.push(p);
  }
})(STORE);

const prefixes = [...new Set(CONFIRMED.map((h) => h.slice(0, 7)))];
const hits = new Map();
for (const f of files) {
  const h = f.match(/([0-9a-f]{8,12})\.glb$/)?.[1];
  if (!h) continue;
  if (!prefixes.some((p) => h.startsWith(p))) continue;
  const key = f.split('/').pop().replace(/\.glb$/, '');
  hits.set(key, { f, h, rendered: seen.has(key) });
}

const todo = [...hits.values()].filter((x) => !x.rendered);
console.log(`neighbourhood size: ${hits.size}   already rendered: ${hits.size - todo.length}   to render: ${todo.length}`);
for (const [k, v] of [...hits].sort((a, b) => a[1].h.localeCompare(b[1].h))) {
  console.log(`  ${v.rendered ? 'seen' : 'NEW '} ${v.h}  ${k}`);
}
writeFileSync('/opt/cryptic-realm/tmp_audit/neighbours.txt', todo.map((x) => x.f).join('\n') + (todo.length ? '\n' : ''));
