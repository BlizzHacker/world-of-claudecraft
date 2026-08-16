// One row per body, one column per gameplay register, BEFORE beside AFTER.
// A missing frame is drawn as an explicit NO CLIP tile - a blank cell would be
// indistinguishable from a render that just failed.
import sharp from 'sharp';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BEFORE = process.argv[2];
const AFTER = process.argv[3];
const OUT = process.argv[4] ?? '/tmp/motion_sheet.png';
const CELL = Number(process.argv[5] ?? 200);
const COLS = ['0_idle', '1_walk', '2_run', '3_attack', '4_cast', '5_emote'];
const LABEL = 22;
const NAMEW = 300;

const bodies = [...new Set([
  ...(existsSync(BEFORE) ? readdirSync(BEFORE).filter((f) => !f.endsWith('.json')) : []),
  ...(AFTER && existsSync(AFTER) ? readdirSync(AFTER).filter((f) => !f.endsWith('.json')) : []),
])].sort();

const sides = AFTER ? [['BEFORE', BEFORE], ['AFTER', AFTER]] : [['', BEFORE]];
const W = NAMEW + sides.length * COLS.length * CELL;
const H = LABEL + bodies.length * (CELL + LABEL);
const tiles = [];
const svg = [];

svg.push(`<rect width="${W}" height="${H}" fill="#14161e"/>`);
for (let s = 0; s < sides.length; s++) {
  for (let c = 0; c < COLS.length; c++) {
    const x = NAMEW + (s * COLS.length + c) * CELL;
    svg.push(`<text x="${x + CELL / 2}" y="15" font-family="monospace" font-size="12" fill="#d7b56d" text-anchor="middle">${sides[s][0]} ${COLS[c].slice(2)}</text>`);
  }
}

for (let b = 0; b < bodies.length; b++) {
  const y = LABEL + b * (CELL + LABEL);
  svg.push(`<text x="6" y="${y + CELL / 2}" font-family="monospace" font-size="12" fill="#f7efe0">${bodies[b].slice(0, 44)}</text>`);
  for (let s = 0; s < sides.length; s++) {
    for (let c = 0; c < COLS.length; c++) {
      const x = NAMEW + (s * COLS.length + c) * CELL;
      const f = join(sides[s][1], bodies[b], `${COLS[c]}.png`);
      if (existsSync(f)) {
        tiles.push({
          input: await sharp(f).resize(CELL, CELL, { fit: 'contain', background: { r: 20, g: 22, b: 30 } }).png().toBuffer(),
          left: x, top: y,
        });
      } else {
        svg.push(`<rect x="${x + 2}" y="${y + 2}" width="${CELL - 4}" height="${CELL - 4}" fill="#2a1416" stroke="#7a2b2b"/>`);
        svg.push(`<text x="${x + CELL / 2}" y="${y + CELL / 2}" font-family="monospace" font-size="13" fill="#d4442a" text-anchor="middle">NO CLIP</text>`);
      }
    }
  }
}

await sharp({ create: { width: W, height: H, channels: 3, background: { r: 20, g: 22, b: 30 } } })
  .composite([{ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg.join('')}</svg>`), left: 0, top: 0 }, ...tiles])
  .png().toFile(OUT);
console.log('wrote', OUT, `${bodies.length} bodies ${W}x${H}`);
