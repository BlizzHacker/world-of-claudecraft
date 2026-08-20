#!/usr/bin/env node
import { resolve } from 'node:path';
import { repairGlbFilaments } from '../asset_pipeline/lib/mesh_filaments.mjs';

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : true;
}

const src = arg('src');
const out = arg('out');
if (!src || !out) {
  console.error(
    'usage: node scripts/realm_assets/repair_filaments.mjs --src input.glb --out clean.glb ' +
      '[--max-removed-fraction 0.005]',
  );
  process.exit(2);
}

try {
  const report = await repairGlbFilaments(resolve(src), resolve(out), {
    maxRemovedFraction: Number(arg('max-removed-fraction', 0.005)),
    maxEdgeMedianRatio: Number(arg('max-edge-median-ratio', 32)),
    maxEdgeHeightRatio: Number(arg('max-edge-height-ratio', 0.18)),
  });
  for (const [index, primitive] of report.primitives.entries()) {
    console.log(
      `[filament] primitive=${index} tris=${primitive.triangles} removed=${primitive.removedTriangles} ` +
        `median=${primitive.medianEdge.toFixed(5)} max=${primitive.maxEdge.toFixed(5)} ` +
        `threshold=${primitive.threshold.toFixed(5)}`,
    );
  }
  console.log(`FILAMENT_REPAIR_OK removed=${report.removedTriangles} out=${report.outPath}`);
} catch (error) {
  console.error(`FILAMENT_REPAIR_HOLD ${error instanceof Error ? error.message : String(error)}`);
  process.exit(3);
}
