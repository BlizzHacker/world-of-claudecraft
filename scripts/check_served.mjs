#!/usr/bin/env node
// check_dangling proves a registered asset exists in the STORE. It does not
// prove the ring SERVES it — each stage has its own public/cr-realms copy, and
// an asset can be present on disk and still 404 for every player. Sample the
// registry per realm over real HTTP against that realm's own ring.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const src = readFileSync('/opt/cryptic-realm/src/render/characters/manifest.generated.ts', 'utf8');
const urls = [...new Set([...src.matchAll(/\$\{REALM_MODELS\}\/([^`'"]+\.glb)/g)].map((m) => m[1]))];

const HOST = {
  infernal: 'infernal.crypticrealm.com',
  classic: 'classic.crypticrealm.com',
  crypticrealm: 'crypticrealm.com',
  claudecraft: 'claudecraft.crypticrealm.com',
  arcane: 'arcane.crypticrealm.com',
  fps: 'fps.crypticrealm.com',
  arcadevoid: 'arcadevoid.crypticrealm.com',
  dominion: 'dominion.crypticrealm.com',
  exchange: 'exchange.crypticrealm.com',
};

const byRealm = {};
for (const u of urls) {
  const realm = u.slice(0, u.indexOf('/'));
  (byRealm[realm] ??= []).push(u);
}

const LIMIT = Number(process.argv[2] ?? 12);
for (const [realm, list] of Object.entries(byRealm).sort()) {
  const host = HOST[realm];
  if (!host) { console.log(`${realm.padEnd(14)} ${list.length} refs  (no host mapping)`); continue; }
  // Even spread through the list rather than the first N, which are alphabetical.
  const step = Math.max(1, Math.floor(list.length / LIMIT));
  const sample = list.filter((_, i) => i % step === 0).slice(0, LIMIT);
  let ok = 0;
  const bad = [];
  for (const u of sample) {
    let code = '000';
    try {
      code = execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '20',
        `https://${host}/cr-realms/${u}`], { encoding: 'utf8' }).trim();
    } catch {}
    if (code === '200') ok++; else bad.push(`${code} ${u}`);
  }
  console.log(`${realm.padEnd(14)} ${String(list.length).padStart(5)} refs   sampled ${sample.length}   served ${ok}   FAILED ${bad.length}`);
  for (const b of bad.slice(0, 4)) console.log(`      ${b}`);
}
