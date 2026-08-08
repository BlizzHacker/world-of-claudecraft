#!/usr/bin/env node
// Render rigged GLBs through the GAME'S OWN preview renderer so animation quality
// can actually be judged. Poly counts and socket presence say nothing about whether
// a bind deformed correctly — manual_rig requires a T-pose source, and much of this
// library is A-pose, which shreds silently. Only looking catches that.
//
//   node audit_render.mjs --dir /staging/classic --out /tmp/audit --limit 12
//
// Emits one PNG per clip per asset into out/<key>/, for montaging into a sheet.

import { renderPreviews, previewBrowserAvailable, closePreview } from '../asset_pipeline/lib/preview.mjs';
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const DIR = arg('dir');
const OUT = arg('out', '/tmp/audit');
const LIMIT = Number(arg('limit', 12));
// The clips that actually matter for "does it look stupid": rest, locomotion, combat.
const CLIPS = (arg('clips', 'Idle,Walking_A,Running_A,1H_Melee_Attack_Chop')).split(',');
// 320px shows that a model rendered; it does not show whether a claw collapsed
// or a pelvis plate tore. Judging a BIND needs pixels — pass --size 640 (or
// more) whenever the question is "does the deformation look right".
const SIZE = Number(arg('size', 320));
// Which turntable yaws to emit; the clip frames are always rendered too.
const VIEWS = (arg('views', 'front,right,back,left,hero')).split(',');

async function main() {
  if (!previewBrowserAvailable()) {
    console.error('no browser; set BROWSER_PATH to the playwright chromium');
    process.exit(2);
  }
  mkdirSync(OUT, { recursive: true });
  // Only pipeline-generated bodies: curated GLBs carry single-take animations
  // (Armature|...|baselayer) aliased by hand in manifest.ts, so asking them for
  // KayKit clip names renders blank frames and tests nothing.
  const files = readdirSync(DIR).filter((f) => f.startsWith('realm_') && f.endsWith('.glb')).slice(0, LIMIT);
  console.log(`[audit] ${files.length} assets from ${DIR}, size=${SIZE}, views=${VIEWS.join(',')}, clips=${CLIPS.join(',')}`);
  for (const f of files) {
    const key = basename(f, '.glb');
    const outDir = join(OUT, key);
    mkdirSync(outDir, { recursive: true });
    try {
      await renderPreviews(join(DIR, f), outDir, { size: SIZE, views: VIEWS, clips: CLIPS });
      const got = readdirSync(outDir).filter((x) => x.endsWith('.png'));
      console.log(`  OK   ${key} -> ${got.length} frames: ${got.join(' ')}`);
    } catch (e) {
      console.log(`  FAIL ${key}: ${String(e.message || e).slice(0, 120)}`);
    }
  }
  await closePreview();
}

main().catch((e) => { console.error(e); process.exit(1); });
