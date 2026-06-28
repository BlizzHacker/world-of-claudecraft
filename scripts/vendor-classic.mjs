import { existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

const SRC = '//192.168.0.5/lvm_shared/moveweight-ui/src';
const DST = resolve('src/classic/engine');
mkdirSync(DST, { recursive: true });

const seen = new Set();
const queue = ['CrypticRealmGame.js'];
const unresolved = [];

function importsOf(code) {
  const re = /(?:from|import)\s+['"](\.\.?\/[^'"]+)['"]/g;
  const out = []; let m;
  while ((m = re.exec(code))) out.push(m[1]);
  return out;
}

while (queue.length) {
  const rel = queue.shift();
  if (seen.has(rel)) continue;
  seen.add(rel);
  const from = join(SRC, rel);
  if (!existsSync(from)) { unresolved.push(rel); continue; }
  const to = join(DST, rel);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  for (const imp of importsOf(readFileSync(from, 'utf8'))) {
    // only follow .js/.jsx engine siblings here; .jsx overlays handled in Task 3
    let target = imp.replace(/^\.\//, '');
    if (!/\.[jt]sx?$/.test(target)) target += '.js';
    if (target.endsWith('.jsx')) continue; // overlays are vendored separately
    queue.push(target.replace(/^\.\.\//, ''));
  }
}
console.log('Copied', seen.size - unresolved.length, 'files');
if (unresolved.length) { console.error('UNRESOLVED:', unresolved); process.exit(1); }

// --- Task 3: Vendor overlay .jsx files ---
const OVERLAYS = [
  'CrypticInventoryOverlay.jsx','CrypticSkillTreeOverlay.jsx','CrypticStashOverlay.jsx',
  'CrypticQuestLog.jsx','CrypticPauseOverlay.jsx','CrypticFishingMinigame.jsx',
  'ArcForgePalette.jsx','ArcForgeTransformPopup.jsx','ArcForgeInGameQueue.jsx',
  'OverlayControls.jsx',
];
// Engine modules an overlay may reference via './X' — repointed to '../engine/X'.
// Covers both static `from './X'` and dynamic `import('./X')` forms.
const ENGINE_REFS = 'crypticD2CoreData|crypticAssets|CrypticRealmGame|crypticD2Engine|crypticD2Systems|FishingGame|crypticDatabase|crypticD2Formats|MpqPacker|d2MpqPaths';
const OVDST = resolve('src/classic/overlays');
mkdirSync(OVDST, { recursive: true });
for (const f of OVERLAYS) {
  let code = readFileSync(join(SRC, f), 'utf8');
  // static: `from './X'`
  code = code.replace(new RegExp(`from\\s+(['"])\\./(${ENGINE_REFS})(\\.js)?\\1`, 'g'),
    (_m, q, name) => `from ${q}../engine/${name}.js${q}`);
  // dynamic: `import('./X')`
  code = code.replace(new RegExp(`import\\((['"])\\./(${ENGINE_REFS})(\\.js)?\\1\\)`, 'g'),
    (_m, q, name) => `import(${q}../engine/${name}.js${q})`);
  writeFileSync(join(OVDST, f), code);
}
console.log('Copied overlays:', OVERLAYS.length);

// --- Task 7: Rewrite asset base URLs so they resolve under /classic/ ---
// The engine uses root-relative paths like /cryptic-assets/ and /crypticrealm-logo.png
// which must be served from public/classic/ in the cryptic-realm repo.
const ASSET_REWRITES = [
  { file: 'crypticAssets.js', rewrites: [
    [/(['"])\/cryptic-assets\b/g, '$1/classic/cryptic-assets'],
    [/(['"])\/crypticrealm-logo\.png/g, '$1/classic/crypticrealm-logo.png'],
  ]},
  { file: 'crypticKayKitMap.js', rewrites: [
    [/(['"])\/cryptic-assets\b/g, '$1/classic/cryptic-assets'],
  ]},
  { file: 'CrypticRealmGame.js', rewrites: [
    [/(['"])\/cryptic-assets\b/g, '$1/classic/cryptic-assets'],
    [/(['"])\/crypticrealm-logo\.png/g, '$1/classic/crypticrealm-logo.png'],
  ]},
];
for (const { file, rewrites } of ASSET_REWRITES) {
  const p = join(DST, file);
  if (!existsSync(p)) { console.warn('SKIP rewrite (missing):', file); continue; }
  let code = readFileSync(p, 'utf8');
  for (const [pat, rep] of rewrites) code = code.replace(pat, rep);
  writeFileSync(p, code);
  console.log('Rewrote asset paths in', file);
}

// --- Task 2: De-bloat assetManifest.js — extract the 20MB data object to a
// gitignored runtime JSON (public/classic/asset-manifest.json) and replace the
// vendored module with a small fetch+cache shim. Idempotent: if the copied file
// is already the small shim (no MOVEWEIGHT_ASSET_MANIFEST literal), skip.
{
  const p = join(DST, 'assetManifest.js');
  const raw = readFileSync(p, 'utf8');
  if (raw.includes('MOVEWEIGHT_ASSET_MANIFEST = {')) {
    const start = raw.indexOf('{', raw.indexOf('MOVEWEIGHT_ASSET_MANIFEST'));
    const fnIdx = raw.indexOf('export function findAssetSlot');
    const end = raw.lastIndexOf('};', fnIdx);
    const objText = raw.slice(start, end + 1);
    const obj = eval('(' + objText + ')'); // trusted generated manifest from our own repo
    const pubDir = resolve('public/classic');
    mkdirSync(pubDir, { recursive: true });
    writeFileSync(join(pubDir, 'asset-manifest.json'), JSON.stringify(obj));
    const shim = `// assetManifest.js — runtime-loaded asset manifest.\n`
      + `// Data lives in /classic/asset-manifest.json (fetched once, cached) so it\n`
      + `// never enters the JS bundle or git. findAssetSlot stays synchronous and\n`
      + `// returns null (→ procedural fallback) until preloadAssetManifest resolves.\n\n`
      + `let MANIFEST = { bySlot: {} };\nlet _loading = null;\n\n`
      + `export function preloadAssetManifest(base = '/classic/asset-manifest.json') {\n`
      + `  if (_loading) return _loading;\n`
      + `  _loading = (typeof fetch === 'function'\n`
      + `    ? fetch(base).then(r => (r.ok ? r.json() : null)).catch(() => null)\n`
      + `    : Promise.resolve(null)\n`
      + `  ).then((data) => { if (data) MANIFEST = data; return MANIFEST; });\n`
      + `  return _loading;\n}\n\n`
      + `export function findAssetSlot(slot, tier, kind) {\n`
      + `  const bucket = MANIFEST.bySlot?.[slot] || {};\n`
      + `  const exact = tier && bucket[tier]?.find(asset => !kind || asset.kind === kind);\n`
      + `  if (exact) return exact;\n`
      + `  const ordered = [tier, "128bit", "64bit", "32bit", "16bit", "model", "image", "archive"].filter(Boolean);\n`
      + `  for (const key of ordered) {\n`
      + `    const hit = bucket[key]?.find(asset => !kind || asset.kind === kind);\n`
      + `    if (hit) return hit;\n`
      + `  }\n  return null;\n}\n`;
    writeFileSync(p, shim);
    console.log('Extracted asset manifest → public/classic/asset-manifest.json; assetManifest.js shimmed');
  } else {
    console.log('assetManifest.js already shimmed (skip extract)');
  }
}

// --- Task 2: Inject runtime asset-manifest preload into the game constructor ---
// The manifest data lives in /classic/asset-manifest.json (fetched at runtime, not
// bundled). Wire a fire-and-forget preload as the first constructor statement.
// Idempotent: skips if already injected (guarded by the import marker).
{
  const p = join(DST, 'CrypticRealmGame.js');
  let code = readFileSync(p, 'utf8');
  if (!code.includes('preloadAssetManifest')) {
    code = code.replace(
      'import { findAssetSlot } from "./assetManifest.js";',
      'import { findAssetSlot, preloadAssetManifest } from "./assetManifest.js";',
    );
    code = code.replace(
      /(constructor\(canvas, chosenClass, difficulty, actIdx, quality, saveData, options = \{\}\) \{\n)/,
      '$1    try { preloadAssetManifest(); } catch {}\n',
    );
    writeFileSync(p, code);
    console.log('Injected preloadAssetManifest into CrypticRealmGame.js');
  } else {
    console.log('preloadAssetManifest already present (skip inject)');
  }
}
