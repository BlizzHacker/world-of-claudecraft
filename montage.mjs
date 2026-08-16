// Contact sheet of a directory of thumbnails so a whole roster can be judged in
// one look instead of one file at a time. Labels are drawn as an SVG overlay.
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const dir = process.argv[2];
const out = process.argv[3] ?? '/tmp/montage.png';
const cols = Number(process.argv[4] ?? 6);
const cell = Number(process.argv[5] ?? 210);
const pad = 20; // label strip under each tile

const files = readdirSync(dir).filter(f => /\.(png|webp|jpg)$/i.test(f)).sort();
if (!files.length) { console.log('no images in', dir); process.exit(1); }
const rows = Math.ceil(files.length / cols);
const W = cols * cell, H = rows * (cell + pad);

const tiles = [];
const labels = [];
for (let i = 0; i < files.length; i++) {
  const x = (i % cols) * cell, y = Math.floor(i / cols) * (cell + pad);
  const buf = await sharp(join(dir, files[i])).resize(cell, cell, { fit: 'contain', background: { r: 20, g: 22, b: 30 } }).png().toBuffer();
  tiles.push({ input: buf, left: x, top: y });
  const name = basename(files[i]).replace(/\.(png|webp|jpg)$/i, '');
  labels.push(`<text x="${x + cell / 2}" y="${y + cell + 14}" font-family="monospace" font-size="11" fill="#cfc9b8" text-anchor="middle">${name.slice(0, 30)}</text>`);
}
const svg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${labels.join('')}</svg>`);
await sharp({ create: { width: W, height: H, channels: 3, background: { r: 20, g: 22, b: 30 } } })
  .composite([...tiles, { input: svg, left: 0, top: 0 }]).png().toFile(out);
console.log('wrote', out, `${files.length} tiles ${W}x${H}`);
