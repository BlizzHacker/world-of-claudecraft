import { openGlb, saveGlb } from './glb.mjs';

const DEFAULT_MAX_EDGE_MEDIAN_RATIO = 32;
const DEFAULT_MAX_EDGE_HEIGHT_RATIO = 0.18;
const DEFAULT_MAX_REMOVED_FRACTION = 0.005;

function edgeLength(positions, a, b) {
  const ax = positions[a * 3];
  const ay = positions[a * 3 + 1];
  const az = positions[a * 3 + 2];
  const bx = positions[b * 3];
  const by = positions[b * 3 + 1];
  const bz = positions[b * 3 + 2];
  return Math.hypot(ax - bx, ay - by, az - bz);
}

function median(values) {
  if (!values.length) return 0;
  values.sort((a, b) => a - b);
  const mid = values.length >> 1;
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

/**
 * Finds sparse, needle-like triangles in a dense generated humanoid mesh.
 *
 * A filament is required to be an outlier against BOTH the primitive's median
 * edge and body height. That keeps ordinary low-poly triangles untouched while
 * catching image-to-3D bridges such as a hand connected to the hip by a few
 * meter-long faces. The returned indices omit only the offending triangles;
 * vertex attributes and source materials remain byte-for-byte unmodified.
 */
export function planFilamentRepair(
  positions,
  indices,
  {
    maxEdgeMedianRatio = DEFAULT_MAX_EDGE_MEDIAN_RATIO,
    maxEdgeHeightRatio = DEFAULT_MAX_EDGE_HEIGHT_RATIO,
  } = {},
) {
  if (!positions || positions.length % 3 !== 0) {
    throw new Error('POSITION array must contain XYZ triplets');
  }
  if (!indices || indices.length % 3 !== 0) {
    throw new Error('index array must contain triangle triplets');
  }

  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 1; i < positions.length; i += 3) {
    minY = Math.min(minY, positions[i]);
    maxY = Math.max(maxY, positions[i]);
  }
  const height = Number.isFinite(minY) ? Math.max(0, maxY - minY) : 0;
  const edges = [];
  let maxEdge = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    for (const d of [
      edgeLength(positions, a, b),
      edgeLength(positions, b, c),
      edgeLength(positions, c, a),
    ]) {
      edges.push(d);
      maxEdge = Math.max(maxEdge, d);
    }
  }

  const medianEdge = median(edges);
  const threshold = Math.max(
    medianEdge * maxEdgeMedianRatio,
    height * maxEdgeHeightRatio,
    Number.EPSILON,
  );
  const kept = [];
  let removedTriangles = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    const longest = Math.max(
      edgeLength(positions, a, b),
      edgeLength(positions, b, c),
      edgeLength(positions, c, a),
    );
    if (longest > threshold) removedTriangles++;
    else kept.push(a, b, c);
  }

  const triangles = indices.length / 3;
  return {
    keptIndices: new indices.constructor(kept),
    report: {
      triangles,
      removedTriangles,
      removedFraction: triangles ? removedTriangles / triangles : 0,
      height,
      medianEdge,
      maxEdge,
      threshold,
      maxEdgeMedianRatio: medianEdge ? maxEdge / medianEdge : 0,
      maxEdgeHeightRatio: height ? maxEdge / height : 0,
    },
  };
}

export function assertFilamentRepairBudget(
  reports,
  maxRemovedFraction = DEFAULT_MAX_REMOVED_FRACTION,
) {
  for (const [index, report] of reports.entries()) {
    if (report.removedFraction > maxRemovedFraction) {
      throw new Error(
        `primitive ${index} needs ${(report.removedFraction * 100).toFixed(3)}% of triangles removed; ` +
          `safety limit is ${(maxRemovedFraction * 100).toFixed(3)}%`,
      );
    }
  }
}

/** Repair sparse long-edge triangles in an indexed GLB without touching art. */
export async function repairGlbFilaments(
  srcPath,
  outPath,
  {
    maxRemovedFraction = DEFAULT_MAX_REMOVED_FRACTION,
    maxEdgeMedianRatio = DEFAULT_MAX_EDGE_MEDIAN_RATIO,
    maxEdgeHeightRatio = DEFAULT_MAX_EDGE_HEIGHT_RATIO,
  } = {},
) {
  const doc = await openGlb(srcPath);
  const root = doc.getRoot();
  const pending = [];

  for (const mesh of root.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const position = primitive.getAttribute('POSITION');
      const indices = primitive.getIndices();
      if (!position || !indices) continue;
      const plan = planFilamentRepair(position.getArray(), indices.getArray(), {
        maxEdgeMedianRatio,
        maxEdgeHeightRatio,
      });
      pending.push({ primitive, indices, ...plan });
    }
  }

  if (!pending.length) throw new Error('GLB has no indexed POSITION primitives');
  assertFilamentRepairBudget(
    pending.map((entry) => entry.report),
    maxRemovedFraction,
  );

  for (const entry of pending) {
    if (!entry.report.removedTriangles) continue;
    const buffer = entry.indices.getBuffer() ?? root.listBuffers()[0] ?? doc.createBuffer();
    const replacement = doc
      .createAccessor(`${entry.indices.getName() || 'indices'}_defilamented`)
      .setType('SCALAR')
      .setArray(entry.keptIndices)
      .setBuffer(buffer);
    entry.primitive.setIndices(replacement);
  }

  await saveGlb(doc, outPath);
  return {
    srcPath,
    outPath,
    primitives: pending.map((entry) => entry.report),
    removedTriangles: pending.reduce((sum, entry) => sum + entry.report.removedTriangles, 0),
  };
}
