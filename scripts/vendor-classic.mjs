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
