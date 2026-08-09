// Renders the automatic per-realm decoration solved in src/sim/realm_decor.ts.
//
// LAZY BY CONSTRUCTION. Nothing here registers a boot preload. The generated
// catalogue is a dynamic import (its own bundle chunk), the solve runs after the
// scene is already up, and the GLBs are fetched a couple at a time through the
// idle queue, so world entry never waits on a single decoration. This is the
// same rule the generated character bank lives under (tests/generated_visuals:
// "no generated realm body joins the boot preload sweep") — the store's median
// row is 1.1 MB, so an eager sweep here would be the same P0 one layer over.
//
// The models themselves ride the existing placed-asset instancer
// (src/render/placed_assets.ts): it already normalizes an arbitrary catalogue
// GLB, seats its lowest point on terrainHeight, and caches one template per URL
// so repeats of the same asset share geometry and materials. Decoration only
// adds the tier budget, the staged load, and a fog-far cull.

import type * as THREE from 'three';
import { generateRealmDecor } from '../sim/realm_decor';
import type { RealmDecorBudget, RealmDecorPlacement } from '../sim/realm_decor_types';
import { GFX, type GfxTier } from './gfx';
import { type IdleScheduler, runIdleQueue } from './idle_queue';
import { PlacedAssetsView } from './placed_assets';
import { remotePropRef } from './remote_prop';

// Per-tier ceilings. Sized against the render budget governor's frame caps
// (render_budget.ts CAPS_BY_TIER): medium targets 1.8M triangles and 420 draw
// calls a frame, so 300k RESIDENT decoration triangles across the whole world —
// of which only what is in frustum and inside fog is ever submitted — and 12
// extra draw calls stay inside ~17% / ~3% of that. Every store GLB is a single
// primitive (verified across all 1,267: max primitives per file is 1), so
// instances and draw calls are the same number here.
//
// maxAssetTriangles / maxAssetKilobytes are the load-bearing knobs: the store
// ranges from 4.4k to 1.36M triangles and 0.2 to 22 MB per file, so without a
// per-asset ceiling one row could eat an entire tier's budget.
const DECOR_BUDGETS: Record<'bounded' | 'low' | 'medium' | 'high' | 'ultra', RealmDecorBudget> = {
  // iOS WKWebView / console sandbox: a hard resident-memory ceiling, so this is
  // the profile that must stay smallest.
  bounded: {
    maxInstances: 6,
    maxTriangles: 120_000,
    maxKilobytes: 5_000,
    maxAssetTriangles: 30_000,
    maxAssetKilobytes: 1_100,
  },
  low: {
    maxInstances: 8,
    maxTriangles: 180_000,
    maxKilobytes: 7_000,
    maxAssetTriangles: 40_000,
    maxAssetKilobytes: 1_300,
  },
  medium: {
    maxInstances: 12,
    maxTriangles: 300_000,
    maxKilobytes: 11_000,
    maxAssetTriangles: 60_000,
    maxAssetKilobytes: 1_600,
  },
  high: {
    maxInstances: 20,
    maxTriangles: 600_000,
    maxKilobytes: 18_000,
    maxAssetTriangles: 120_000,
    maxAssetKilobytes: 2_400,
  },
  ultra: {
    maxInstances: 28,
    maxTriangles: 900_000,
    maxKilobytes: 22_000,
    maxAssetTriangles: 200_000,
    maxAssetKilobytes: 3_000,
  },
};

/** Extra yards past a decoration's anchor before the fog-far cull drops it:
 *  the tallest placement is ~14 yards, so this covers its silhouette. */
const DECOR_CULL_MARGIN = 18;

/** GLBs fetched per idle slot. Two keeps the network warm without competing
 *  with the character bank's on-demand loads for the same connection pool. */
const DECOR_LOAD_BATCH = 2;
const DECOR_LOAD_TIMEOUT_MS = 500;

/** Just the graphics facts decoration keys off. Narrower than GfxSettings on
 *  purpose, so the budget is unit-testable without standing up a whole tier. */
export interface DecorGfxProfile {
  readonly tier: GfxTier;
  readonly boundedResidency: boolean;
  readonly constrainedMemory: boolean;
  readonly dynamicShadows: boolean;
}

/** The budget for a resolved graphics profile. Reads GFX live (initGfxTier
 *  reassigns it inside the Renderer constructor, after module import). */
export function realmDecorBudget(gfx: DecorGfxProfile = GFX): RealmDecorBudget {
  if (gfx.boundedResidency) return DECOR_BUDGETS.bounded;
  if (gfx.tier === 'low' || gfx.constrainedMemory) return DECOR_BUDGETS.low;
  if (gfx.tier === 'medium') return DECOR_BUDGETS.medium;
  if (gfx.tier === 'high') return DECOR_BUDGETS.high;
  return DECOR_BUDGETS.ultra;
}

/** Landmarks are big and distant; their shadows are the expensive half of the
 *  draw. Only the tiers with headroom cast them. */
export function realmDecorCastsShadows(gfx: DecorGfxProfile = GFX): boolean {
  return gfx.dynamicShadows && (gfx.tier === 'high' || gfx.tier === 'ultra');
}

export interface RealmDecorStats {
  placements: number;
  triangles: number;
  kilobytes: number;
}

export class RealmDecorView {
  readonly group: THREE.Group;
  private readonly view: PlacedAssetsView;
  private placements: readonly RealmDecorPlacement[] = [];
  private cancelled = false;

  constructor(seed: number, shadows = realmDecorCastsShadows()) {
    this.view = new PlacedAssetsView([], seed, { preload: false, shadows });
    this.group = this.view.group;
    this.group.name = 'realm-decor';
  }

  /** Solve this realm's decoration and stream it in across idle slots. Resolves
   *  once every placement has been handed to the instancer (its GLB may still
   *  be in flight; models pop in, exactly like editor placements). */
  async start(
    realmId: string,
    seed: number,
    budget: RealmDecorBudget = realmDecorBudget(),
    scheduler?: IdleScheduler,
  ): Promise<RealmDecorStats> {
    // Dynamic so the ~700-row catalogue is its own chunk and never lands in the
    // boot bundle: no client that stays out of the world should pay for it.
    const { REALM_DECOR_CATALOG } = await import('../sim/realm_decor.generated');
    if (this.cancelled) return { placements: 0, triangles: 0, kilobytes: 0 };
    const placements = generateRealmDecor(realmId, seed, REALM_DECOR_CATALOG, budget);
    this.placements = placements;
    const entries = placements.map((placement, index) => ({ placement, index }));
    await runIdleQueue(
      entries,
      ({ placement, index }) => {
        const ref = remotePropRef(placement.key);
        if (!ref) return;
        this.view.addPlacement(
          index,
          {
            path: ref.url,
            x: placement.x,
            z: placement.z,
            rotY: placement.rotY,
            scale: placement.scale,
          },
          false,
        );
      },
      {
        batchSize: DECOR_LOAD_BATCH,
        timeoutMs: DECOR_LOAD_TIMEOUT_MS,
        scheduler,
        cancelled: () => this.cancelled,
      },
    );
    return this.stats();
  }

  stats(): RealmDecorStats {
    return {
      placements: this.placements.length,
      triangles: this.placements.reduce((sum, p) => sum + p.tris, 0),
      kilobytes: this.placements.reduce((sum, p) => sum + p.kb, 0),
    };
  }

  /** Drop fully-fogged decorations, the same way props/terrain chunks do. */
  update(camX: number, camZ: number, fogFar: number): void {
    for (const child of this.group.children) {
      const dx = camX - child.position.x;
      const dz = camZ - child.position.z;
      child.visible = Math.sqrt(dx * dx + dz * dz) - DECOR_CULL_MARGIN < fogFar;
    }
  }

  /** Stop streaming (context loss / teardown). Loaded clones share the loader
   *  cache's geometry and materials, so there is nothing here to dispose. */
  dispose(): void {
    this.cancelled = true;
  }
}
