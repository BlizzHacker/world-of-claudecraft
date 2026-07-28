// Why is this body T-posing?
//
// A character renders in its BIND pose (the T) whenever the clip name the manifest
// declares does not exist in the GLB: nothing plays, so the skeleton never leaves
// rest. This fetches each visual's GLB from a live ring, reads the animation names
// straight out of the glTF JSON chunk, and diffs them against the ClipMap the
// manifest asks for -- turning "these NPCs look retarded" into an exact list of
// which clip names are missing and what the file actually contains.
//
//   npx tsx scripts/audit_clips.mjs 8810 [filterPrefix]
import { VISUALS } from '/opt/cryptic-realm/src/render/characters/manifest.ts';

const PORT = process.argv[2] ?? '8810';
const FILTER = process.argv[3] ?? '';
const BASE = `http://127.0.0.1:${PORT}`;

/** Animation names inside a .glb, read from its JSON chunk (no three.js needed). */
async function glbAnimationNames(url) {
  const res = await fetch(BASE + url);
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) return { error: 'not a GLB' };
  // header: magic, version, length (12 bytes) then chunks: length, type, data
  const chunkLen = buf.readUInt32LE(12);
  const chunkType = buf.readUInt32LE(16);
  if (chunkType !== 0x4e4f534a) return { error: 'first chunk is not JSON' };
  let json;
  try {
    json = JSON.parse(buf.subarray(20, 20 + chunkLen).toString('utf8'));
  } catch (e) {
    return { error: 'bad JSON chunk' };
  }
  return { names: (json.animations ?? []).map((a, i) => a.name ?? `(unnamed ${i})`) };
}

/** Every clip name a ClipMap asks for, flattened (values are string | string[]). */
function declaredClips(clips) {
  const out = new Set();
  for (const v of Object.values(clips ?? {})) {
    for (const name of Array.isArray(v) ? v : [v]) {
      if (typeof name === 'string' && name && name !== '__auto__') out.add(name);
    }
  }
  return out;
}

const cache = new Map();
const keys = Object.keys(VISUALS)
  .filter((k) => !FILTER || k.includes(FILTER))
  .sort();

const broken = [];
const noAnims = [];
let ok = 0;

for (const key of keys) {
  const def = VISUALS[key];
  if (!def.url) continue;
  // A def may pull clips from sidecar animation files as well as its base mesh
  // (animUrls) -- the union is what actually resolves at runtime, so audit the union.
  const urls = [def.url, ...(def.animUrls ?? [])].map((u) => (u.startsWith('/') ? u : `/${u}`));
  const url = urls[0];
  const have = new Set();
  const names = [];
  let err = null;
  for (const u of urls) {
    if (!cache.has(u)) cache.set(u, await glbAnimationNames(u));
    const r = cache.get(u);
    if (r.error) { if (u === url) err = r.error; continue; }
    for (const n of r.names) { have.add(n); names.push(n); }
  }
  if (err) {
    broken.push({ key, url, why: err, missing: [], have: [] });
    continue;
  }
  const got = { names };
  const want = declaredClips(def.clips);
  if (have.size === 0) {
    noAnims.push({ key, url, want: [...want] });
    continue;
  }
  const missing = [...want].filter((n) => !have.has(n));
  if (missing.length) broken.push({ key, url, why: 'clip not in GLB', missing, have: got.names });
  else ok++;
}

console.log(`visuals checked: ${keys.length}   distinct GLBs: ${cache.size}`);
console.log(`fully satisfied: ${ok}`);
console.log(`GLB has NO animations at all (will always T-pose): ${noAnims.length}`);
console.log(`declared clip missing from GLB: ${broken.length}`);
console.log('');

if (noAnims.length) {
  console.log('=== NO ANIMATIONS IN FILE (static / T-pose forever) ===');
  for (const r of noAnims.slice(0, 60)) console.log(`  ${r.key.padEnd(44)} ${r.url}`);
  if (noAnims.length > 60) console.log(`  ... +${noAnims.length - 60} more`);
  console.log('');
}

if (broken.length) {
  console.log('=== DECLARED CLIP MISSING (falls back to bind pose) ===');
  for (const r of broken.slice(0, 40)) {
    console.log(`  ${r.key}`);
    console.log(`      missing: ${r.missing.slice(0, 6).join(', ')}${r.missing.length > 6 ? ' …' : ''}`);
    console.log(`      file has: ${r.have.slice(0, 6).join(', ') || '(none)'}${r.have.length > 6 ? ' …' : ''}`);
  }
  if (broken.length > 40) console.log(`  ... +${broken.length - 40} more`);
}
