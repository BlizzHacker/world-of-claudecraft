import { describe, expect, it } from 'vitest';
import {
  assertFilamentRepairBudget,
  planFilamentRepair,
} from '../scripts/asset_pipeline/lib/mesh_filaments.mjs';

describe('generated mesh filament repair', () => {
  it('removes a sparse hand-to-hip bridge while preserving ordinary faces', () => {
    const positions = new Float32Array([0, 0, 0, 0.01, 0, 0, 0, 0.01, 0, 0.01, 0.01, 0, 1, 1, 0]);
    const indices = new Uint16Array([0, 1, 2, 1, 3, 2, 0, 1, 4]);

    const result = planFilamentRepair(positions, indices);

    expect(result.report.removedTriangles).toBe(1);
    expect(Array.from(result.keptIndices)).toEqual([0, 1, 2, 1, 3, 2]);
    expect(result.report.maxEdgeMedianRatio).toBeGreaterThan(50);
  });

  it('does not flag a uniformly coarse low-poly mesh', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]);
    const indices = new Uint16Array([0, 1, 2, 1, 3, 2]);

    const result = planFilamentRepair(positions, indices);

    expect(result.report.removedTriangles).toBe(0);
    expect(Array.from(result.keptIndices)).toEqual(Array.from(indices));
  });

  it('holds a badly damaged mesh instead of deleting a material part', () => {
    expect(() => assertFilamentRepairBudget([{ removedFraction: 0.02 }], 0.005)).toThrow(
      /safety limit/,
    );
  });
});
