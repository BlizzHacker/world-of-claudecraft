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

async function main() {
  if (!previewBrowserAvailable()) {
    console.error('no browser; set BROWSER_PATH to the playwright chromium');
    process.exit(2);
  }
  mkdirSync(OUT, { recursive: true });
  const files = readdirSync(DIR).filter((f) => f.endsWith('.glb')).slice(0, LIMIT);
  console.log(`[audit] ${files.length} assets from ${DIR}, clips=${CLIPS.join(',')}`);
  for (const f of files) {
    const key = basename(f, '.glb');
    const outDir = join(OUT, key);
    mkdirSync(outDir, { recursive: true });
    try {
      await renderPreviews(join(DIR, f), outDir, { size: 320, clips: CLIPS });
      const got = readdirSync(outDir).filter((x) => x.endsWith('.png'));
      console.log(`  OK   ${key} -> ${got.length} frames: ${got.join(' ')}`);
    } catch (e) {
      console.log(`  FAIL ${key}: ${String(e.message || e).slice(0, 120)}`);
    }
  }
  await closePreview();
}

main().catch((e) => { console.error(e); process.exit(1); });
