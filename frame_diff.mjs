// Does this body actually MOVE between clips, judged on pixels?
//
// The bone-based pose probe only sees SkinnedMesh skeletons, so a node-animated
// non-skinned model (the Travel Form, the Tolling Bell, the Water Elemental)
// reports "frozen" whether it is animating or not. Comparing the rendered frames
// answers the question the metric cannot: two columns that are byte-identical
// are the same pose, and a body whose every column is identical is not moving.
import sharp from 'sharp';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const DIR = process.argv[2];
const bodies = process.argv[3] ? process.argv.slice(3) : readdirSync(DIR).filter((f) => !f.endsWith('.json'));

for (const b of bodies) {
  const d = join(DIR, b);
  if (!existsSync(d)) { console.log(b.padEnd(42), 'NOT RENDERED'); continue; }
  const files = readdirSync(d).filter((f) => f.endsWith('.png')).sort();
  const rows = [];
  for (const f of files) {
    const raw = await sharp(join(d, f)).greyscale().resize(96, 96, { fit: 'fill' }).raw().toBuffer();
    rows.push({ f, hash: createHash('sha1').update(raw).digest('hex').slice(0, 12), raw });
  }
  const uniq = new Set(rows.map((r) => r.hash));
  // Mean absolute pixel difference against the first frame, so "nearly identical"
  // is visible too, not just byte equality.
  const base = rows[0]?.raw;
  const diffs = rows.slice(1).map((r) => {
    let s = 0;
    for (let i = 0; i < base.length; i++) s += Math.abs(base[i] - r.raw[i]);
    return (s / base.length).toFixed(2);
  });
  console.log(
    b.padEnd(42),
    `frames=${rows.length}`.padEnd(10),
    `distinct=${uniq.size}`.padEnd(12),
    uniq.size <= 1 ? 'IDENTICAL - NOT MOVING' : `mean-pixel-delta vs idle: ${diffs.join(' ')}`,
  );
}
