#!/usr/bin/env node
// Prove the pool picker actually spreads bodies across a realm, and is stable.
//
// The whole point of the change is that 989 registered bodies stop rendering as a
// handful of repeats. A picker that is deterministic but clumps (or that returns a
// different body per call) would look fine in a diff and wrong in game.
//
// Reimplements the picker exactly as patched into manifest.ts so this can run
// without booting the client.

import { readFileSync } from 'node:fs';

const src = readFileSync('/opt/cryptic-realm/src/render/characters/manifest.generated.ts', 'utf8');
const pools = {};
const block = src.slice(src.indexOf('GENERATED_REALM_BODIES'));
for (const m of block.matchAll(/^\s{2}([a-z0-9]+):\s*\[([^\]]*)\]/gms)) {
  pools[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function stableHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
const pick = (realm, family, tid) => {
  const p = pools[realm];
  if (!p?.length) return null;
  return p[stableHash(`${realm}:${family}:${tid}`) % p.length];
};

const FAMILIES = ['humanoid', 'undead', 'demon', 'troll', 'ogre'];
console.log('realm       pool  templates  distinct  coverage  top-body-share');
for (const [realm, pool] of Object.entries(pools)) {
  if (!pool.length) continue;
  // Simulate a realistic spread of mob templates across humanoid families.
  const picks = [];
  for (const fam of FAMILIES) {
    for (let i = 0; i < 120; i++) picks.push(pick(realm, fam, `mob_${fam}_${i}`));
  }
  const counts = {};
  for (const p of picks) counts[p] = (counts[p] ?? 0) + 1;
  const distinct = Object.keys(counts).length;
  const top = Math.max(...Object.values(counts));
  console.log(
    `${realm.padEnd(11)} ${String(pool.length).padStart(4)}  ${String(picks.length).padStart(9)}  ` +
    `${String(distinct).padStart(8)}  ${(100 * distinct / Math.min(pool.length, picks.length)).toFixed(0).padStart(7)}%  ` +
    `${(100 * top / picks.length).toFixed(1)}%`
  );
}

// Stability: the same template must always resolve to the same body.
let stable = true;
for (let i = 0; i < 500; i++) {
  const a = pick('infernal', 'demon', `mob_${i}`);
  const b = pick('infernal', 'demon', `mob_${i}`);
  if (a !== b) { stable = false; break; }
}
console.log(`\ndeterministic across calls: ${stable ? 'YES' : 'NO'}`);
