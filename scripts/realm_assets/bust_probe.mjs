// Profile published bodies so bust thresholds come from measurement, not taste.
// Prints the vertical mass distribution for a sample of each realm; the operator
// (me) matches rows against the rendered sheet to pick a cut.
import { bodyProfile } from './bust_gate.mjs';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const STORE = '/mnt/usb4/moveweight-assets/cr-realms';
const realm = process.argv[2] ?? 'classic';
const n = Number(process.argv[3] ?? 12);

const files = readdirSync(join(STORE, realm))
  .filter((f) => f.startsWith('realm_') && f.endsWith('.glb')).sort();
const step = Math.max(1, Math.floor(files.length / n));
const picks = files.filter((_, i) => i % step === 0).slice(0, n);

console.log('lowerMass lowerW  bands(bottom->top)                    key');
for (const f of picks) {
  try {
    const p = bodyProfile(join(STORE, realm, f), 10);
    const lower = p.frac[0] + p.frac[1] + p.frac[2];
    const midW = Math.max(p.width[4], p.width[5], p.width[6]) || 1;
    const lowW = Math.max(p.width[0], p.width[1], p.width[2]) / midW;
    const bars = p.frac.map((x) => '.:-=+*#%@'[Math.min(8, Math.floor(x * 30))] ?? '@').join('');
    console.log(
      `  ${(lower * 100).toFixed(1).padStart(5)}%  ${(lowW * 100).toFixed(0).padStart(4)}%  ${bars}   ${f.slice(0, 50)}`
    );
  } catch (e) {
    console.log(`  ERR ${String(e.message).slice(0, 30)}  ${f.slice(0, 50)}`);
  }
}
