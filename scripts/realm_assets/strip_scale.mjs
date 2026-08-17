#!/usr/bin/env node
// Remove every animation SCALE channel from a GLB, in place, safely.
//
//   node scripts/realm_assets/strip_scale.mjs <file.glb> [--dry-run]
//
// See ../asset_pipeline/lib/scale_channels.mjs for WHY this exists at the rig
// reference and not only at the outputs. This file is the operator front end:
// it refuses to delete tracks that are not provably inert, keeps a backup, and
// verifies the container it wrote.
//
// SAFETY
//   - refuses any path not ending .glb (a non-.glb name makes the writer emit
//     JSON glTF, which has silently corrupted live bodies before)
//   - refuses outright if any scale track is non-unit or varying: that is real
//     animation, and deleting it would change how the model looks
//   - keeps a .prescale backup of the original bytes
//   - writes .new.glb, checks the glTF magic bytes, then atomic-renames
//   - re-opens the result and asserts zero scale channels with every clip and
//     every non-scale channel still present
import { copyFileSync, existsSync, openSync, readSync, closeSync, renameSync, statSync } from 'node:fs';
import { auditScaleChannels, stripScaleChannels } from '../asset_pipeline/lib/scale_channels.mjs';
import { openGlb, saveGlb } from '../asset_pipeline/lib/glb.mjs';

function magicOf(p) {
  const fd = openSync(p, 'r');
  const b = Buffer.alloc(4);
  readSync(fd, b, 0, 4, 0);
  closeSync(fd);
  return b.toString('ascii');
}

const target = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
if (!target || !target.endsWith('.glb')) {
  console.error('usage: strip_scale.mjs <file.glb> [--dry-run]');
  process.exit(2);
}

const doc = await openGlb(target);
const root = doc.getRoot();
const beforeClips = root.listAnimations().map((a) => ({
  name: a.getName(),
  nonScale: a.listChannels().filter((c) => c.getTargetPath() !== 'scale').length,
}));
const audit = auditScaleChannels(root);
const summary = { target, clips: beforeClips.length, ...audit };

if (audit.varying || audit.nonUnit) {
  console.error(JSON.stringify({ ...summary, REFUSED: 'scale tracks are not inert — deleting them would change the animation' }, null, 2));
  process.exit(3);
}
if (dryRun || !audit.total) {
  console.log(JSON.stringify({ ...summary, action: dryRun ? 'dry-run' : 'nothing to do' }, null, 2));
  process.exit(0);
}

const backup = `${target}.prescale`;
if (!existsSync(backup)) copyFileSync(target, backup);

const removed = stripScaleChannels(root);
const tmp = `${target}.new.glb`;
await saveGlb(doc, tmp);
if (magicOf(tmp) !== 'glTF') throw new Error(`wrote non-GLB (magic ${JSON.stringify(magicOf(tmp))})`);
renameSync(tmp, target);

const after = (await openGlb(target)).getRoot();
const afterAudit = auditScaleChannels(after);
if (afterAudit.total) throw new Error(`scale channels survived: ${afterAudit.total}`);
if (after.listAnimations().length !== beforeClips.length) throw new Error('clip count changed');
for (const c of beforeClips) {
  const a = after.listAnimations().find((x) => x.getName() === c.name);
  if (!a) throw new Error(`clip lost: ${c.name}`);
  if (a.listChannels().length !== c.nonScale) {
    throw new Error(`clip ${c.name}: ${a.listChannels().length} channels, expected ${c.nonScale}`);
  }
}
console.log(JSON.stringify({
  ...summary, removed, backup,
  clipsAfter: after.listAnimations().length, scaleChannelsAfter: afterAudit.total,
  bytesBefore: statSync(backup).size, bytesAfter: statSync(target).size,
}, null, 2));
