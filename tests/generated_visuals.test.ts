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
import { isVisualLazy, VISUALS } from '../src/render/characters/manifest';
import {
  GENERATED_REALM_BODIES,
  GENERATED_VISUALS,
} from '../src/render/characters/manifest.generated';
import {
  REALM_ARM_FAMILIES,
  REALM_ARM_GRIPS,
  REALM_GUN_POOL,
  REALM_MELEE_POOL,
} from '../src/render/characters/realm_arms.generated';

// The LIVE store is what the server serves (CR_REALMS_DIR in .env); the usb4 path
// is the out-of-band archive and lags it. Defaulting to the archive made these
// existence checks silently validate the wrong tree - it reports hundreds of
// missing GLBs for assets that are live, which reads as a release blocker.
const STORE =
  process.env.CR_REALMS_DIR ??
  (existsSync('/opt/cr-realms-store')
    ? '/opt/cr-realms-store'
    : '/mnt/usb4/moveweight-assets/cr-realms');
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
it('no generated realm body joins the boot preload sweep', () => {
  const eager = Object.entries(GENERATED_VISUALS).filter(([, def]) => !def.lazyPreload);
  expect(eager.map(([k]) => k)).toEqual([]);
});

it('every generated body is reachable through the lazy path', () => {
  for (const [key, def] of Object.entries(GENERATED_VISUALS)) {
    expect(isVisualLazy(key)).toBe(true);
    expect(def.url.startsWith('/cr-realms/')).toBe(true);
  }
});

// The realm weapon libraries: 255 guns and a confidently-gripped melee subset that
// generated bodies now actually hold. Every failure here is silent in game - a
// weapon whose family is missing attaches at native size (a 2-unit gun on a
// 2.6-unit body), and one whose GLB is missing attaches nothing at all.
describe('realm arm libraries', () => {
  const armBasename = (url: string) => url.slice(url.lastIndexOf('/') + 1).replace(/\.glb$/, '');
  const realmArmUrls = () => {
    const urls = new Set<string>();
    for (const def of Object.values(GENERATED_VISUALS)) {
      for (const att of def.attach ?? []) {
        if (att.url.startsWith('/cr-realms/')) urls.add(att.url);
      }
    }
    return [...urls];
  };

  it('ships a real library, not the four hardcoded models', () => {
    expect(Object.values(REALM_GUN_POOL).flat().length).toBeGreaterThan(100);
    expect(Object.keys(REALM_ARM_GRIPS).length).toBe(Object.keys(REALM_ARM_FAMILIES).length);
  });

  it('every held realm weapon has BOTH a grip family and a grip transform', () => {
    // Family without transform = attached at native scale; transform without
    // family = variantGripFor returns null and the transform is never applied.
    for (const url of realmArmUrls()) {
      const base = armBasename(url);
      expect(REALM_ARM_FAMILIES[base], url).toBeDefined();
      expect(REALM_ARM_GRIPS[base], url).toBeDefined();
      expect(REALM_ARM_GRIPS[base].scale, url).toBeGreaterThan(0);
      expect(REALM_ARM_GRIPS[base].rot, url).toHaveLength(3);
    }
  });

  it('scales every held weapon to a size a character can carry', () => {
    // Native length is 2.0 local units on a 2.6-unit body. Anything near 1.0
    // scale means the clamp did not fire and the body is holding a lamppost.
    for (const [base, grip] of Object.entries(REALM_ARM_GRIPS)) {
      const len = 2 * (grip.scale ?? 1);
      expect(len, base).toBeGreaterThan(0.4);
      expect(len, base).toBeLessThanOrEqual(2.1);
    }
  });

  it('gun realms carry guns and fantasy realms do not', () => {
    const guns = new Set(Object.values(REALM_GUN_POOL).flat());
    const melee = new Set(Object.values(REALM_MELEE_POOL).flat());
    for (const [key, def] of Object.entries(GENERATED_VISUALS)) {
      const held = (def.attach ?? []).find((a) => a.url.startsWith('/cr-realms/'));
      if (!held) continue;
      const realmOfBody = def.url.replace(/^\/cr-realms\//, '').split('/')[0];
      const gunRealm =
        realmOfBody === 'fps' || realmOfBody === 'dominion' || realmOfBody === 'arcadevoid';
      expect(gunRealm ? guns.has(held.url) : melee.has(held.url), `${key} -> ${held.url}`).toBe(
        true,
      );
    }
  });

  it('a body always spawns holding the SAME weapon', () => {
    // The pick is baked at generation time, so this is really a guard against a
    // future generator picking at random and desyncing clients.
    const seen = new Map<string, string>();
    for (const [key, def] of Object.entries(GENERATED_VISUALS)) {
      const held = (def.attach ?? []).find((a) => a.url.startsWith('/cr-realms/'));
      if (!held) continue;
      expect(seen.has(key)).toBe(false);
      seen.set(key, held.url);
    }
    expect(seen.size).toBeGreaterThan(100);
  });

  it.skipIf(!storePresent)('every held weapon GLB exists in the store', () => {
    const missing = realmArmUrls().filter(
      (u) => !existsSync(join(STORE, u.replace(/^\/cr-realms\//, ''))),
    );
    expect(missing, `missing arm GLBs: ${missing.slice(0, 5).join(', ')}`).toHaveLength(0);
  });
});
