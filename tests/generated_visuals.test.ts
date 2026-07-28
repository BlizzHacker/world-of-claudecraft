// Contract for pipeline-generated realm bodies.
//
// These are emitted by scripts/realm_assets/emit_manifest.mjs, so a regression is
// a regression in the GENERATOR, not in a hand-edited file — which is exactly why
// it needs pinning. The failure modes here are all silent at runtime: a missing
// GLB skips the visual (invisible mob, no error), a missing socket means equipment
// never attaches, and a key collision would let a generated body shadow a curated
// one.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GENERATED_REALM_BODIES, GENERATED_VISUALS } from '../src/render/characters/manifest.generated';
import { VISUALS, isVisualLazy } from '../src/render/characters/manifest';

const STORE = process.env.CR_REALMS_DIR ?? '/mnt/usb4/moveweight-assets/cr-realms';
const storePresent = existsSync(STORE);

describe('generated realm visuals', () => {
  it('emits a non-trivial roster', () => {
    expect(Object.keys(GENERATED_VISUALS).length).toBeGreaterThan(200);
  });

  it('every generated visual carries the KayKit clip vocabulary', () => {
    for (const [key, def] of Object.entries(GENERATED_VISUALS)) {
      expect(def.clips.idle, key).toBe('Idle');
      expect(def.clips.walk, key).toBe('Walking_A');
      expect(def.clips.run, key).toBe('Running_A');
      expect(def.clips.death, key).toBe('Death_A');
      expect(def.clips.attack.length, key).toBeGreaterThan(0);
    }
  });

  it('player-eligible bodies bind equipment to the real handslot bones', () => {
    // A body with weaponSlots but no matching attach entry would accept
    // setWeapon() and silently attach nothing.
    for (const [key, def] of Object.entries(GENERATED_VISUALS)) {
      if (!def.weaponSlots?.length) continue;
      expect(def.attach, key).toBeDefined();
      for (const slot of def.weaponSlots) {
        expect(def.attach![slot], `${key} slot ${slot}`).toBeDefined();
        expect(def.attach![slot].bone, key).toBe('handslot.r');
      }
      if (def.offhandSlot !== undefined) {
        expect(def.attach![def.offhandSlot].bone, key).toBe('handslot.l');
      }
    }
  });

  it('bodies that ship holding a weapon get no live sockets', () => {
    // The directive: a mesh already holding a weapon is an NPC/enemy asset only.
    // Giving it weaponSlots would attach a second weapon through the baked one.
    for (const [key, def] of Object.entries(GENERATED_VISUALS)) {
      if (def.attach) continue;
      expect(def.weaponSlots, key).toBeUndefined();
      expect(def.offhandSlot, key).toBeUndefined();
    }
  });

  it('supports per-entity tint so a pool does not render as clones', () => {
    for (const [key, def] of Object.entries(GENERATED_VISUALS)) {
      expect(def.tint, key).toBe('entity');
    }
  });

  it('hand-authored keys always win over generated ones', () => {
    // manifest.ts spreads GENERATED first, HAND second. If a generated key ever
    // shadowed a curated body, a pipeline re-run would silently replace art.
    for (const key of Object.keys(GENERATED_VISUALS)) {
      if (key in VISUALS) {
        expect(VISUALS[key].url, key).toBe(GENERATED_VISUALS[key].url);
      }
    }
  });

  it('every realm pool references a registered visual', () => {
    for (const [realm, keys] of Object.entries(GENERATED_REALM_BODIES)) {
      expect(keys.length, realm).toBeGreaterThan(0);
      for (const k of keys) expect(VISUALS[k], `${realm} -> ${k}`).toBeDefined();
    }
  });

  it.skipIf(!storePresent)('every generated url resolves to a file in the store', () => {
    // The highest-value check: public/cr-realms is gitignored and GLBs ship
    // out-of-band, so code and assets drift silently and a missing body renders
    // nothing rather than erroring.
    const missing: string[] = [];
    for (const [key, def] of Object.entries(GENERATED_VISUALS)) {
      const rel = def.url.replace(/^\/cr-realms\//, '');
      if (!existsSync(join(STORE, rel))) missing.push(key);
    }
    expect(missing, `missing GLBs: ${missing.slice(0, 5).join(', ')}`).toHaveLength(0);
  });
});

// A generated body that joins the boot sweep is a release-blocking regression:
// the sweep is eager and blocking, so 970 bodies is ~750MB of parallel fetches
// before world entry, and prewarm then builds views against a half-filled cache
// and throws "character asset not preloaded" for every one of them. renderer.ts
// requires the whole realm bank to load on demand instead.
it("no generated realm body joins the boot preload sweep", () => {
  const eager = Object.entries(GENERATED_VISUALS).filter(([, def]) => !def.lazyPreload);
  expect(eager.map(([k]) => k)).toEqual([]);
});

it("every generated body is reachable through the lazy path", () => {
  for (const [key, def] of Object.entries(GENERATED_VISUALS)) {
    expect(isVisualLazy(key)).toBe(true);
    expect(def.url.startsWith('/cr-realms/')).toBe(true);
  }
});
