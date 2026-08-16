// Mean/percentile luminance of each PNG in a dir, plus a world-only centre crop
// (the HUD is identical across tiers so it would flatten the difference).
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? '/tmp/darkab';
const files = readdirSync(dir).filter(f => /\.png$/i.test(f)).sort();
const rows = [];
for (const f of files) {
  const img = sharp(join(dir, f));
  const meta = await img.metadata();
  // centre band: skip the top 12% (buffs) and bottom 28% (action bar/chat)
  const top = Math.round(meta.height * 0.12);
  const h = Math.round(meta.height * 0.60);
  const crop = await sharp(join(dir, f))
    .extract({ left: 0, top, width: meta.width, height: h })
    .raw().toBuffer({ resolveWithObject: true });
  const { data, info } = crop;
  const px = info.width * info.height;
  let sum = 0; const hist = new Array(256).fill(0);
  for (let i = 0; i < px; i++) {
    const o = i * info.channels;
    const l = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
    sum += l; hist[Math.min(255, Math.round(l))]++;
  }
  const mean = sum / px;
  let acc = 0; const pct = (q) => { let a = 0; for (let v = 0; v < 256; v++) { a += hist[v]; if (a >= px * q) return v; } return 255; };
  const nearBlack = hist.slice(0, 16).reduce((a, b) => a + b, 0) / px;
  rows.push({ file: f, mean: +mean.toFixed(2), p05: pct(0.05), p50: pct(0.5), p95: pct(0.95), fracUnder16: +(nearBlack * 100).toFixed(1) });
}
console.table(rows);
