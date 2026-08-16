import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { propPreloadInternalsForTest } from '../src/render/props';
import { colliderInternalsForTest } from '../src/sim/colliders';
import { BUILTIN_WORLD } from '../src/sim/data';
import { isAbandonedCryptMine, MINE_CART } from '../src/sim/prop_layout';
import { terrainHeight, WATER_LEVEL } from '../src/sim/world';

const PIN_SEED = 42;
const STATIC_COLLIDERS = colliderInternalsForTest.staticWorldColliders(PIN_SEED);

// A collider requires a renderable source (movement audit 2, docs/movement-audit-2.md).
//
// colliders.ts registers a circle collider for every PROPS.decorProps entry
// with r > 0, unconditionally: collision is server-shared sim state and MUST
// NOT depend on any client's load outcome, or two players desync the moment
// one GLB fetch fails. The renderer, on the other hand, silently SKIPS any
// decorProps key it does not know ("unknown prop key ... skipped",
// render/props.ts) - so a key absent from PROP_ASSET_DEFS, or a key whose GLB
// is not shipped, is a permanent invisible wall for every player. The only
// place this class of phantom can be stopped is here, at the data seam.
describe('every collider-carrying decorProp is renderable', () => {
  const urls = propPreloadInternalsForTest.propAssetUrl;
  const rows = BUILTIN_WORLD.props.decorProps ?? [];

  it('has decor rows to pin against', () => {
    expect(rows.length).toBeGreaterThan(0);
  });

  it('EVERY decorProps key names a PROP_ASSET_DEFS entry (unknown keys render as nothing)', () => {
    const unknown = rows.filter((d) => !(d.key in urls)).map((d) => `${d.key}@(${d.x},${d.z})`);
    expect(unknown).toEqual([]);
  });

  it('EVERY collider-carrying (r > 0) decorProps key ships its GLB in public/', () => {
    const missing = rows
      .filter((d) => (d.r ?? 0) > 0 && d.key in urls)
      .filter((d) => !existsSync(join(__dirname, '..', 'public', urls[d.key])))
      .map((d) => `${d.key} -> ${urls[d.key]}`);
    expect(missing).toEqual([]);
  });
});

// The mine's ore cart follows the same rule from the other side: the renderer
// deliberately draws NO cart at the Abandoned Crypt's mine (its portal is
// swallowed by rubble), so the cart's collider must not register there either
// — while every ordinary mine keeps its solid, standable cart.
describe('mine cart collider matches the drawn cart', () => {
  const cartSpot = (m: { x: number; z: number; rot: number }) => {
    const cos = Math.cos(m.rot);
    const sin = Math.sin(m.rot);
    return {
      x: m.x + MINE_CART.x * cos + MINE_CART.z * sin,
      z: m.z - MINE_CART.x * sin + MINE_CART.z * cos,
    };
  };
  const hasCartCollider = (m: { x: number; z: number; rot: number }): boolean => {
    const spot = cartSpot(m);
    return STATIC_COLLIDERS.some(
      (c) =>
        c.type === 'circle' &&
        Math.abs(c.r - MINE_CART.r) < 1e-6 &&
        Math.hypot(c.x - spot.x, c.z - spot.z) < 0.05,
    );
  };

  it('the Abandoned Crypt mine exists and registers NO cart collider', () => {
    const crypt = BUILTIN_WORLD.props.mines.filter(isAbandonedCryptMine);
    expect(crypt).toHaveLength(1);
    expect(hasCartCollider(crypt[0])).toBe(false);
  });

  it('every other mine still registers its cart collider', () => {
    const others = BUILTIN_WORLD.props.mines.filter((m) => !isAbandonedCryptMine(m));
    expect(others.length).toBeGreaterThan(0);
    for (const m of others) {
      expect(hasCartCollider(m), `mine at (${m.x}, ${m.z})`).toBe(true);
    }
  });
});

// Every great-tree renderer (realm_flora, haunt/garden/jungle features)
// refuses a spot whose terrain sits below the waterline, so the trunk
// collider must mirror the same gate: a submerged record must not become an
// invisible mid-lake blocker (three wraithwood records were exactly that).
describe('great-tree trunk colliders require an above-water tree', () => {
  it('registers a trunk exactly where the renderers draw one', () => {
    const trees = BUILTIN_WORLD.props.greatTrees ?? [];
    expect(trees.length).toBeGreaterThan(0);
    let above = 0;
    for (const t of trees) {
      const drawable = terrainHeight(t.x, t.z, PIN_SEED) >= WATER_LEVEL;
      const has = STATIC_COLLIDERS.some(
        (c) =>
          c.type === 'circle' &&
          Math.abs(c.x - t.x) < 1e-6 &&
          Math.abs(c.z - t.z) < 1e-6 &&
          Math.abs(c.r - t.r * 1.45) < 1e-6,
      );
      expect(has, `tree (${t.x}, ${t.z}) drawable=${drawable}`).toBe(drawable);
      if (drawable) above++;
    }
    // the pin is only meaningful while both arms exist in the data
    expect(above).toBeGreaterThan(0);
  });
});
