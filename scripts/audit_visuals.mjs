// Which character visuals will actually load in-world?
//
// Now that the lazy-preload path is restored, a realm body renders iff its GLB is
// reachable. This walks every VISUALS entry (plus each entry's attachments), resolves
// the URL the client would request, and checks it against a live ring -- so a broken
// class or NPC body shows up here instead of as a silently-skipped view mid-playtest.
//
//   node audit_visuals.mjs <port>        e.g. 8810 for infernal-live
import { VISUALS } from '/opt/cryptic-realm/src/render/characters/manifest.ts';

const PORT = process.argv[2] ?? '8810';
const BASE = `http://127.0.0.1:${PORT}`;

// Mirrors assetUrl(): manifest urls are either absolute (/cr-realms/..., /models/...)
// or bare paths under the media root.
function resolve(u) {
  if (!u) return null;
  return u.startsWith('/') ? u : `/${u}`;
}

function urlsFor(def) {
  const out = [];
  if (def.url) out.push(def.url);
  for (const a of def.attach ?? []) if (a.url) out.push(a.url);
  return out;
}

const rows = [];
const seen = new Map(); // url -> status, so a shared GLB is fetched once

async function check(url) {
  if (seen.has(url)) return seen.get(url);
  let status;
  try {
    const r = await fetch(BASE + url, { method: 'GET' });
    const len = Number(r.headers.get('content-length') ?? 0);
    status = r.ok ? (len > 0 ? `OK ${len}` : 'OK (no length)') : `HTTP ${r.status}`;
  } catch (e) {
    status = `ERR ${e.message}`;
  }
  seen.set(url, status);
  return status;
}

const keys = Object.keys(VISUALS).sort();
for (const key of keys) {
  const def = VISUALS[key];
  for (const raw of urlsFor(def)) {
    const url = resolve(raw);
    if (!url) continue;
    const status = await check(url);
    rows.push({ key, url, status, lazy: !!def.lazyPreload });
  }
}

const bad = rows.filter((r) => !r.status.startsWith('OK'));
const realmBad = bad.filter((r) => r.url.startsWith('/cr-realms/'));

console.log(`visual keys:      ${keys.length}`);
console.log(`distinct GLBs:    ${seen.size}`);
console.log(`failing fetches:  ${bad.length}  (of which realm bodies: ${realmBad.length})`);
console.log('');
if (bad.length) {
  console.log('=== BROKEN (these will silently fail to render) ===');
  const byKey = new Map();
  for (const r of bad) {
    if (!byKey.has(r.key)) byKey.set(r.key, []);
    byKey.get(r.key).push(r);
  }
  for (const [key, list] of [...byKey].sort()) {
    for (const r of list) {
      console.log(`  ${key.padEnd(42)} ${r.status.padEnd(12)} ${r.url}`);
    }
  }
} else {
  console.log('every character visual resolves.');
}
