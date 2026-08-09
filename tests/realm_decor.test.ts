import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classifyDecor, slugWords } from '../scripts/realm_assets/emit_decor.mjs';
import { getActiveWorldContent, WORLD_MAX_X, WORLD_MAX_Z, WORLD_MIN_Z } from '../src/sim/data';
import { isInBoarpitShell } from '../src/sim/boarpit_layout';
import { isInThornwheelShell } from '../src/sim/derby_layout';
import { isInHomesShell } from '../src/sim/homes_layout';
import {
  applyRealmDecorBudget,
  DECOR_NORMALIZED_HEIGHT,
  keepClearAnchors,
  REALM_DECOR_THEME,
  realmDecorCandidates,
  realmDecorSalt,
} from '../src/sim/realm_decor';
import { REALM_DECOR_CATALOG } from '../src/sim/realm_decor.generated';
import type { RealmDecorBudget, RealmDecorPlacement } from '../src/sim/realm_decor_types';
import { isInSowfieldShell } from '../src/sim/vale_cup_layout';
import { REALMS } from '../src/sim/realms/registry';
import {
  DECORATION_MAX_SLOPE,
  roadDistance,
  terrainHeight,
  terrainSteepness,
  waterLevel,
} from '../src/sim/world';
import { PLACED_ASSET_TARGET_HEIGHT } from '../src/render/placed_assets';
import { realmDecorBudget, realmDecorCastsShadows } from '../src/render/realm_decor';
import { remotePropRef } from '../src/render/remote_prop';

// Automatic realm decoration: the seam that finally puts the ~1,300 shipped
// realm-store GLBs into a world without a human placing each one.
//
// Everything here is a silent failure at runtime if it breaks. A non-deterministic
// layout means two players in the same world see different landscapes and neither
// gets an error; a placement that lands on a vendor or a road blocks nothing (the
// decor is walk-through) but reads as a bug; and a budget regression shows up as
// frame time on a phone, not as a stack trace.

const SEED = 1;
const REALMS_WITH_DECOR = Object.keys(REALM_DECOR_THEME).sort();

const TIER_BUDGETS: Record<string, RealmDecorBudget> = {
  bounded: realmDecorBudget({ ...gfxStub(), boundedResidency: true }),
  low: realmDecorBudget({ ...gfxStub(), tier: 'low' }),
  medium: realmDecorBudget({ ...gfxStub(), tier: 'medium' }),
  high: realmDecorBudget({ ...gfxStub(), tier: 'high' }),
  ultra: realmDecorBudget({ ...gfxStub(), tier: 'ultra' }),
};

function gfxStub(): {
  tier: 'low' | 'medium' | 'high' | 'ultra';
  boundedResidency: boolean;
  constrainedMemory: boolean;
  dynamicShadows: boolean;
} {
  return {
    tier: 'ultra',
    boundedResidency: false,
    constrainedMemory: false,
    dynamicShadows: true,
  };
}

function candidates(realm: string, seed = SEED): RealmDecorPlacement[] {
  return realmDecorCandidates(realm, seed, REALM_DECOR_CATALOG);
}

const STORE =
  process.env.CR_REALMS_DIR ??
  (existsSync('/opt/cr-realms-store')
    ? '/opt/cr-realms-store'
    : '/mnt/usb4/moveweight-assets/cr-realms');
const storePresent = existsSync(STORE);

// ── determinism ─────────────────────────────────────────────────────────────

describe('realm decoration is deterministic', () => {
  it('returns a byte-identical layout for the same realm and seed', () => {
    for (const realm of REALMS_WITH_DECOR) {
      expect(JSON.stringify(candidates(realm))).toBe(JSON.stringify(candidates(realm)));
    }
  });

  it('gives every realm its own layout, and every seed its own', () => {
    const bySeed = new Set(
      [1, 2, 7, 99].map((seed) => JSON.stringify(candidates('classic', seed))),
    );
    expect(bySeed.size).toBe(4);
    const byRealm = new Set(REALMS_WITH_DECOR.map((realm) => JSON.stringify(candidates(realm))));
    expect(byRealm.size).toBe(REALMS_WITH_DECOR.length);
  });

  it('salts the hash space per realm id (two realms never share a stream)', () => {
    const salts = new Set(REALMS_WITH_DECOR.map(realmDecorSalt));
    expect(salts.size).toBe(REALMS_WITH_DECOR.length);
    expect(realmDecorSalt('classic')).toBe(realmDecorSalt('classic'));
  });

  it('produces a non-trivial layout for every decorating realm', () => {
    for (const realm of REALMS_WITH_DECOR) {
      expect(candidates(realm).length, realm).toBeGreaterThanOrEqual(12);
    }
  });

  it('draws no randomness or clock (the source has no Math.random / Date.now)', () => {
    const source = readFileSync(new URL('../src/sim/realm_decor.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(source).toContain("import { hash2 } from './rng'");
  });
});

// ── world awareness ─────────────────────────────────────────────────────────

describe('decoration keeps out of everything the world already owns', () => {
  const anchors = keepClearAnchors();

  it('collects anchors from the ACTIVE world content, not fixed coordinates', () => {
    const world = getActiveWorldContent();
    // one per hub, graveyard, camp, npc ... - a sanity floor, not an exact count
    expect(anchors.length).toBeGreaterThan(
      world.zones.length + world.camps.length + Object.keys(world.npcs).length,
    );
  });

  it('never overlaps a settlement, camp, NPC, stall, doorway or spawn point', () => {
    for (const realm of REALMS_WITH_DECOR) {
      for (const p of candidates(realm)) {
        for (const a of anchors) {
          const gap = Math.hypot(p.x - a.x, p.z - a.z) - a.r - p.radius;
          expect(
            gap,
            `${realm} ${p.key} at ${p.x.toFixed(1)},${p.z.toFixed(1)} overlaps anchor ${a.x},${a.z} r=${a.r}`,
          ).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('stands clear of the roads, inside the world, off cliffs and out of water', () => {
    for (const realm of REALMS_WITH_DECOR) {
      for (const p of candidates(realm)) {
        expect(roadDistance(p.x, p.z) - p.radius, `${realm} ${p.key} on a road`).toBeGreaterThan(0);
        expect(Math.abs(p.x)).toBeLessThan(WORLD_MAX_X);
        expect(p.z).toBeGreaterThan(WORLD_MIN_Z);
        expect(p.z).toBeLessThan(WORLD_MAX_Z);
        expect(terrainHeight(p.x, p.z, SEED), `${realm} ${p.key} in water`).toBeGreaterThanOrEqual(
          waterLevel() + 1,
        );
        expect(
          terrainSteepness(p.x, p.z, SEED),
          `${realm} ${p.key} on a cliff face`,
        ).toBeLessThanOrEqual(DECORATION_MAX_SLOPE);
      }
    }
  });

  it('leaves the authored minigame grounds alone', () => {
    for (const realm of REALMS_WITH_DECOR) {
      for (const p of candidates(realm)) {
        expect(isInSowfieldShell(p.x, p.z)).toBe(false);
        expect(isInThornwheelShell(p.x, p.z)).toBe(false);
        expect(isInBoarpitShell(p.x, p.z)).toBe(false);
        expect(isInHomesShell(p.x, p.z)).toBe(false);
      }
    }
  });

  it('never lets two decorations intersect', () => {
    for (const realm of REALMS_WITH_DECOR) {
      const list = candidates(realm);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          expect(
            Math.hypot(a.x - b.x, a.z - b.z),
            `${realm}: ${a.key} and ${b.key} overlap`,
          ).toBeGreaterThan(a.radius + b.radius);
        }
      }
    }
  });

  it('spreads across every zone rather than piling into one band', () => {
    const zones = getActiveWorldContent().zones;
    for (const realm of REALMS_WITH_DECOR) {
      const hit = new Set<number>();
      for (const p of candidates(realm)) {
        hit.add(zones.findIndex((z) => p.z < z.zMax));
      }
      expect(hit.size, `${realm} only reaches zones ${[...hit]}`).toBe(zones.length);
    }
  });
});

// ── theme ───────────────────────────────────────────────────────────────────

describe('decoration is themed to its realm', () => {
  it('every realm in the theme table is a real realm, and claudecraft opts out', () => {
    for (const realm of REALMS_WITH_DECOR) expect(REALMS[realm as keyof typeof REALMS]).toBeDefined();
    // claudecraft is the pristine upstream base look (data.ts themeWorldForRealm
    // returns the base world untouched for it): no realm dressing either.
    expect(REALM_DECOR_THEME.claudecraft).toBeUndefined();
    expect(candidates('claudecraft')).toEqual([]);
    expect(candidates('not-a-realm')).toEqual([]);
  });

  it('only ever places assets from the declared sources and roles of that realm', () => {
    for (const realm of REALMS_WITH_DECOR) {
      const theme = REALM_DECOR_THEME[realm];
      const allowed = new Set<string>();
      for (const source of theme.sources) {
        for (const asset of REALM_DECOR_CATALOG[source] ?? []) allowed.add(asset.key);
      }
      for (const p of candidates(realm)) {
        expect(allowed.has(p.key), `${realm} placed a foreign asset: ${p.key}`).toBe(true);
        expect(theme.roles[p.role], `${realm} placed an undeclared role: ${p.role}`).toBeDefined();
      }
    }
  });

  it('parks no starship in a medieval village and no manor in a war zone', () => {
    for (const realm of ['classic', 'infernal', 'arcane', 'crypticrealm', 'exchange']) {
      for (const p of candidates(realm)) {
        expect(['ship', 'mech', 'vehicle', 'turret'], `${realm}: ${p.key}`).not.toContain(p.role);
      }
    }
    for (const realm of ['fps', 'dominion']) {
      for (const p of candidates(realm)) {
        expect(p.key.startsWith('realm:fps/'), `${realm}: ${p.key}`).toBe(true);
        expect(p.role, `${realm}: ${p.key}`).not.toBe('structure');
      }
    }
    for (const p of candidates('arcadevoid')) {
      expect(p.key.startsWith('realm:arcadevoid/')).toBe(true);
    }
  });
});

// ── budget ──────────────────────────────────────────────────────────────────

describe('decoration stays inside its graphics budget', () => {
  it('respects every cap at every tier', () => {
    for (const realm of REALMS_WITH_DECOR) {
      const all = candidates(realm);
      for (const [tier, budget] of Object.entries(TIER_BUDGETS)) {
        const taken = applyRealmDecorBudget(all, budget);
        const tris = taken.reduce((s, p) => s + p.tris, 0);
        const kb = taken.reduce((s, p) => s + p.kb, 0);
        expect(taken.length, `${realm}/${tier} instances`).toBeLessThanOrEqual(budget.maxInstances);
        expect(tris, `${realm}/${tier} triangles`).toBeLessThanOrEqual(budget.maxTriangles);
        expect(kb, `${realm}/${tier} download`).toBeLessThanOrEqual(budget.maxKilobytes);
        for (const p of taken) {
          expect(p.tris).toBeLessThanOrEqual(budget.maxAssetTriangles);
          expect(p.kb).toBeLessThanOrEqual(budget.maxAssetKilobytes);
        }
      }
    }
  });

  it('gives even the phone profile a real world, not one lonely object', () => {
    for (const realm of REALMS_WITH_DECOR) {
      const taken = applyRealmDecorBudget(candidates(realm), TIER_BUDGETS.bounded);
      expect(taken.length, `${realm} on the bounded-residency profile`).toBeGreaterThanOrEqual(4);
    }
  });

  it('is an order-preserving SUBSET: a tier never invents a placement', () => {
    for (const realm of REALMS_WITH_DECOR) {
      const all = candidates(realm);
      for (const budget of Object.values(TIER_BUDGETS)) {
        const taken = applyRealmDecorBudget(all, budget);
        let cursor = 0;
        for (const p of taken) {
          const at = all.indexOf(p, cursor);
          expect(at, `${realm}: ${p.key} is not in the candidate list in order`).toBeGreaterThanOrEqual(0);
          cursor = at + 1;
        }
      }
    }
  });

  it('renders the SAME object at a site on every tier (no per-client worlds)', () => {
    // Tiers may show different SUBSETS. What must never differ is what a given
    // site actually is: same key, same transform, for everyone.
    for (const realm of REALMS_WITH_DECOR) {
      const all = candidates(realm);
      const byPos = new Map<string, string>();
      for (const budget of Object.values(TIER_BUDGETS)) {
        for (const p of applyRealmDecorBudget(all, budget)) {
          const site = `${p.x.toFixed(4)}:${p.z.toFixed(4)}`;
          const shape = `${p.key}|${p.rotY.toFixed(6)}|${p.scale.toFixed(6)}`;
          const seen = byPos.get(site);
          if (seen === undefined) byPos.set(site, shape);
          else expect(seen, `${realm} site ${site} differs by tier`).toBe(shape);
        }
      }
    }
  });

  it('keeps the phone profile the smallest and ultra the largest per-asset ceiling', () => {
    const order = ['bounded', 'low', 'medium', 'high', 'ultra'];
    for (let i = 1; i < order.length; i++) {
      const lower = TIER_BUDGETS[order[i - 1]];
      const upper = TIER_BUDGETS[order[i]];
      expect(upper.maxInstances).toBeGreaterThanOrEqual(lower.maxInstances);
      expect(upper.maxTriangles).toBeGreaterThanOrEqual(lower.maxTriangles);
      expect(upper.maxAssetTriangles).toBeGreaterThanOrEqual(lower.maxAssetTriangles);
      expect(upper.maxAssetKilobytes).toBeGreaterThanOrEqual(lower.maxAssetKilobytes);
    }
  });

  it('only casts landmark shadows where the tier has headroom', () => {
    expect(realmDecorCastsShadows({ ...gfxStub(), tier: 'low', dynamicShadows: false })).toBe(false);
    expect(realmDecorCastsShadows({ ...gfxStub(), tier: 'medium' })).toBe(false);
    expect(realmDecorCastsShadows({ ...gfxStub(), tier: 'ultra' })).toBe(true);
  });
});

// ── the load path ───────────────────────────────────────────────────────────

describe('decoration never joins the boot preload sweep', () => {
  // Same rule (and same reason) as the generated character bank: the sweep is
  // eager and blocking, and the store's median row is 1.1 MB.
  const source = readFileSync(new URL('../src/render/realm_decor.ts', import.meta.url), 'utf8');

  it('registers no preload and streams over idle slots', () => {
    expect(source).not.toContain('registerPreload');
    expect(source).not.toContain("from './assets/preload'");
    expect(source).toContain("import { type IdleScheduler, runIdleQueue } from './idle_queue'");
    expect(source).toContain('preload: false');
  });

  it('loads the generated catalogue as its own chunk, not from the boot bundle', () => {
    expect(source).toContain("await import('../sim/realm_decor.generated')");
    expect(source).not.toMatch(/^import .*realm_decor\.generated/m);
  });

  it('is wired into the renderer for the built-in world only', () => {
    const renderer = readFileSync(new URL('../src/render/renderer.ts', import.meta.url), 'utf8');
    expect(renderer).toContain("import { RealmDecorView } from './realm_decor'");
    expect(renderer).toContain('if (!this.sim.cfg.world) {');
    expect(renderer).toContain('new RealmDecorView(this.sim.cfg.seed)');
    expect(renderer).toContain('this.realmDecorView?.update(');
  });

  it('mirrors the placed-asset normalization the scales were solved against', () => {
    // The sim cannot import the renderer, so DECOR_NORMALIZED_HEIGHT is a copy.
    // If the renderer ever renormalizes, every decoration silently resizes.
    expect(DECOR_NORMALIZED_HEIGHT).toBe(PLACED_ASSET_TARGET_HEIGHT);
  });
});

// ── the catalogue ───────────────────────────────────────────────────────────

describe('the generated catalogue', () => {
  const rows = Object.entries(REALM_DECOR_CATALOG).flatMap(([realm, list]) =>
    list.map((asset) => ({ realm, asset })),
  );

  it('is non-trivial and covers every realm a theme draws from', () => {
    expect(rows.length).toBeGreaterThan(400);
    for (const theme of Object.values(REALM_DECOR_THEME)) {
      for (const source of theme.sources) {
        expect(REALM_DECOR_CATALOG[source]?.length ?? 0, source).toBeGreaterThan(0);
      }
    }
  });

  it('emits keys the world builder and the server already accept', () => {
    // The same place-key grammar as server/builder_props.ts REALM_PROP_RE, so a
    // decoration is nameable by hand and servable by the existing route.
    const KEY_RE =
      /^realm:[a-z0-9][a-z0-9_-]{0,31}\/(?:props|buildings|vehicles|ships|mechs|turrets)\/[A-Za-z0-9_.-]+$/;
    for (const { asset } of rows) {
      expect(asset.key, asset.key).toMatch(KEY_RE);
      expect(remotePropRef(asset.key)?.url, asset.key).toContain('/cr-realms/');
    }
  });

  it('carries a usable measurement for every row', () => {
    for (const { asset } of rows) {
      expect(asset.tris, asset.key).toBeGreaterThan(0);
      expect(asset.kb, asset.key).toBeGreaterThan(0);
      expect(asset.aspect, asset.key).toBeGreaterThanOrEqual(1);
      expect(asset.aspect, asset.key).toBeLessThan(40);
      expect(asset.foot, asset.key).toBeGreaterThan(0);
      expect(asset.foot, asset.key).toBeLessThan(20);
    }
  });

  it('never admits a held weapon, a bust or a wearable', () => {
    for (const { asset } of rows) {
      expect(asset.key).not.toMatch(/\/(melee|weapons)\//);
      const words = new Set(slugWords(asset.key.slice(asset.key.lastIndexOf('/') + 1)));
      for (const banned of ['bust', 'mask', 'ring', 'crown', 'coin', 'emblem', 'helmet']) {
        expect(words.has(banned), `${asset.key} is a ${banned}`).toBe(false);
      }
    }
  });

  it.skipIf(!storePresent)('never admits an ip-flagged asset', () => {
    const flagged = new Set<string>();
    const dir = join(STORE, 'review');
    for (const file of readdirSync(dir)) {
      if (!file.startsWith('data_') || !file.endsWith('.json') || file.includes('_bodies')) continue;
      for (const row of JSON.parse(readFileSync(join(dir, file), 'utf8'))) {
        if (Array.isArray(row?.flags) && row.flags.includes('ip')) flagged.add(row.url);
      }
    }
    expect(flagged.size).toBeGreaterThan(0);
    for (const { asset } of rows) {
      const url = remotePropRef(asset.key)?.url ?? '';
      expect(flagged.has(decodeURIComponent(url)), `${asset.key} is ip-flagged`).toBe(false);
    }
  });

  it.skipIf(!storePresent)('resolves every key to a file that is actually in the store', () => {
    const missing: string[] = [];
    for (const { asset } of rows) {
      const url = decodeURIComponent(remotePropRef(asset.key)?.url ?? '');
      if (!existsSync(join(STORE, url.replace(/^\/cr-realms\//, '')))) missing.push(asset.key);
    }
    expect(missing, `missing GLBs: ${missing.slice(0, 5).join(', ')}`).toHaveLength(0);
  });
});

// ── the generator ───────────────────────────────────────────────────────────

describe('the decor classifier (a regression here is a regression in the world)', () => {
  it('admits world dressing', () => {
    expect(classifyDecor('abandoned_manor_019a5964', 'building_structure')).toBe('structure');
    expect(classifyDecor('laser_turret_0199d284', 'turret_or_emplacement')).toBe('turret');
    expect(classifyDecor('armored_racer_0199d57e', 'vehicle_ground')).toBe('vehicle');
    expect(classifyDecor('emerald_starship_019aac90', 'ship_or_aircraft')).toBe('ship');
    expect(classifyDecor('iron_sentinel_019aa43e', 'mech_robot')).toBe('mech');
    expect(classifyDecor('ancient_pixel_tree_0199a659', 'scenery_prop')).toBe('flora');
    expect(classifyDecor('a_monumental_stone_sculpture_of_dragon_x', 'scenery_prop')).toBe('monument');
    expect(classifyDecor('ancient_gateway_ruins_019f2fbf', 'scenery_prop')).toBe('monument');
  });

  it('refuses jewellery, busts and wearables in every bucket', () => {
    expect(classifyDecor('a_gothic_fantasy_ring_with_intricate_x', 'scenery_prop')).toBeNull();
    expect(classifyDecor('demon_queen_bust_a_019489d7', 'scenery_prop')).toBeNull();
    expect(classifyDecor('golden_inferno_mask_019659b6', 'scenery_prop')).toBeNull();
    expect(classifyDecor('a_penny_coin_019566fc', 'scenery_prop')).toBeNull();
    // ...including one filed under a bucket that is admitted wholesale.
    expect(classifyDecor('gothic_crown_helmet_x', 'building_structure')).toBeNull();
  });

  it('refuses scenery that names no decor noun at all', () => {
    expect(classifyDecor('cybernetic_elegance_0194577a', 'scenery_prop')).toBeNull();
    expect(classifyDecor('alien_contemplation_x', 'scenery_prop')).toBeNull();
  });

  it('matches WORDS, never substrings (a "towering" ruin is not a ring)', () => {
    expect(slugWords('a_towering_gateway_019f2fbf')).toEqual(['a', 'towering', 'gateway']);
    expect(classifyDecor('a_towering_gateway_019f2fbf', 'scenery_prop')).toBe('monument');
  });
});
