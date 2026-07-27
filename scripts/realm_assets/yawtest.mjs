#!/usr/bin/env node
// Compare rig variants on ONE asset so the orientation/pose failure can be
// diagnosed instead of guessed at. Renders front+idle for each variant.
import { manualRigOntoReference } from '../asset_pipeline/lib/manual_rig.mjs';
import { renderPreviews, closePreview } from '../asset_pipeline/lib/preview.mjs';
import { mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const exec = promisify(execFile);
const REPO = '/opt/cryptic-realm';
const REF = join(REPO, 'public/models/chars/players/knight.glb');
const CLI = join(REPO, 'node_modules/@gltf-transform/cli/bin/cli.js');
const SRC = process.argv[2];
const OUT = '/tmp/yawtest';

const VARIANTS = [
  ['default', {}],
  ['prerotated', { preRotated: true }],
];

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const raw = join(OUT, 'raw.glb');
  copyFileSync(SRC, raw);
  const lo = join(OUT, 'lo.glb');
  await exec('node', [CLI, 'optimize', raw, lo, '--compress', 'false',
    '--texture-compress', 'webp', '--texture-size', '512', '--simplify-error', '0.02'],
    { cwd: REPO, maxBuffer: 64 << 20 });
  const lo2 = join(OUT, 'lo2.glb');
  await exec('node', [CLI, 'simplify', lo, lo2, '--ratio', '0.2', '--error', '0.1'],
    { cwd: REPO, maxBuffer: 64 << 20 });

  for (const [name, opts] of VARIANTS) {
    const out = join(OUT, `${name}.glb`);
    try {
      const fit = await manualRigOntoReference(lo2, REF, out, opts);
      console.log(name, 'scale=', fit?.scale, 'armY=', fit?.rawArmY, 'wrist=', fit?.wristAbove);
      const dir = join(OUT, `r_${name}`);
      mkdirSync(dir, { recursive: true });
      await renderPreviews(out, dir, { size: 384, clips: ['Idle', 'Walking_A'] });
      console.log('  rendered', name);
    } catch (e) {
      console.log(name, 'FAIL', String(e.message).slice(0, 120));
    }
  }
  await closePreview();
}
main().catch((e) => { console.error(e); process.exit(1); });
