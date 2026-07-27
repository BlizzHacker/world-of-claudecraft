// Profile SOURCE meshes, not rigged outputs.
//
// manual_rig authors vertices in inverse(IBM) space — the rig's bind space, not
// the model's visual layout — so every rigged GLB profiles identically (~1-2%
// lower mass, all mass in one band) and tells you nothing. The unrigged PICKTURA
// source is in ordinary object space, which is where the bust signature lives.
import { bodyProfile } from './bust_gate.mjs';
import { readFileSync, existsSync } from 'node:fs';

const ent = [];
for (const f of ['/tmp/entries4.json', '/tmp/entries3.json', '/tmp/entries.json']) {
  if (existsSync(f)) ent.push(...JSON.parse(readFileSync(f, 'utf8')));
}
const srcByKey = new Map(ent.map((e) => [e.key, e.src]));

const keys = process.argv.slice(2);
console.log('lowerMass lowerW  bands(bottom->top)   key');
for (const k of keys) {
  const src = srcByKey.get(k);
  if (!src) { console.log(`  (no source) ${k}`); continue; }
  try {
    const p = bodyProfile(src, 10);
    const lower = p.frac[0] + p.frac[1] + p.frac[2];
    const midW = Math.max(p.width[4], p.width[5], p.width[6]) || 1;
    const lowW = Math.max(p.width[0], p.width[1], p.width[2]) / midW;
    const bars = p.frac.map((x) => '.:-=+*#%@'[Math.min(8, Math.floor(x * 30))] ?? '@').join('');
    console.log(`  ${(lower * 100).toFixed(1).padStart(5)}%  ${(lowW * 100).toFixed(0).padStart(4)}%  ${bars}   ${k.slice(0, 46)}`);
  } catch (e) {
    console.log(`  ERR ${String(e.message).slice(0, 26)}  ${k.slice(0, 46)}`);
  }
}
