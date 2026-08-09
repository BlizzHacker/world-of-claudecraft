#!/usr/bin/env node
// Make the quarantine durable. emit_manifest reads STAGING, so a body that was
// pulled from the store but left in staging comes straight back on the next
// regeneration - which is measurably what happened here: 26 bodies the HEAD
// quarantine commit removed were re-registered in the tree that followed it.
//
// Deliberately surgical: this moves ONLY staging copies of files that are
// already sitting in a quarantine bucket. It does not touch clean staged bodies
// (that is quarantine_staging.mjs's much broader job) and it moves rather than
// deletes, so every step is reversible.
import { readdirSync, statSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const STAGING = '/mnt/usb4/moveweight-assets/cr-realms-staging';
const QUAR = '/mnt/usb4/moveweight-assets/cr-realms-quarantine';
const DRY = process.argv.includes('--dry');

const quarantined = new Map(); // basename -> bucket
for (const bucket of ['ip-likeness', 'ip-brand']) {
  const root = join(QUAR, bucket);
  if (!existsSync(root)) continue;
  // The buckets have subdirectories; a top-level readdir sees only 77 of 133.
  (function walkQ(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walkQ(p);
      else if (e.name.endsWith('.glb')) quarantined.set(e.name, bucket);
    }
  })(root);
}
console.log(`quarantined bodies: ${quarantined.size}`);

const staged = [];
(function walk(d) {
  let list;
  try { list = readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of list) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.glb') && quarantined.has(e.name)) staged.push(p);
  }
})(STAGING);

console.log(`staging copies of quarantined bodies: ${staged.length}`);
let moved = 0;
for (const p of staged) {
  const name = p.split('/').pop();
  const dest = join(QUAR, `${quarantined.get(name)}-staging`);
  if (!DRY) {
    mkdirSync(dest, { recursive: true });
    let target = join(dest, name);
    let n = 1;
    while (existsSync(target)) target = join(dest, name.replace(/\.glb$/, `.${n++}.glb`));
    renameSync(p, target);
  }
  moved++;
  console.log(`  ${DRY ? 'would move' : 'moved'} ${p}`);
}
console.log(DRY ? `DRY: ${moved} would move` : `moved ${moved} staged copies out of the emitter's input`);
