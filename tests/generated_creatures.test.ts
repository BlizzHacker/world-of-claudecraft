// Contract for the generated quadruped bodies — the engine's first non-humanoid
// rig family.
//
// Mirrors tests/generated_visuals.test.ts, and for the same reason: these are
// emitted by scripts/realm_assets/emit_creatures.mjs, so a regression here is a
// regression in the GENERATOR. Every failure mode is silent at runtime — a
// missing GLB renders nothing rather than erroring, a clip name that is not in
// the donor rig plays the rest pose forever, and a body that joins the boot
// preload sweep blocks world entry for every client.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GENERATED_CREATURE_BODIES,
  GENERATED_CREATURE_VISUALS,
} from '../src/render/characters/creatures.generated';
import { isVisualLazy, VISUALS } from '../src/render/characters/manifest';

// Same store resolution as generated_visuals.test.ts: the LIVE store is what the
// server serves; the usb4 path is the out-of-band archive and lags it.
const STORE =
  process.env.CR_REALMS_DIR ??
  (existsSync('/opt/cr-realms-store')
    ? '/opt/cr-realms-store'
    : '/mnt/usb4/moveweight-assets/cr-realms');
const storePresent = existsSync(STORE);

const entries = Object.entries(GENERATED_CREATURE_VISUALS);

describe('generated quadruped creatures', () => {
  it('emits a non-trivial roster', () => {
    expect(entries.length).toBeGreaterThan(30);
  });

  it('every creature carries the donor rig clip vocabulary', () => {
    // These names are the wolf donor's OWN baked clips (public/models/creatures/
    // wolf_basic.glb). A typo here does not throw — three.js simply finds no
    // clip and the body stands in its rest pose forever.
    for (const [key, def] of entries) {
      expect(def.clips.idle, key).toBe('Idle');
      expect(def.clips.walk, key).toBe('Walk');
      expect(def.clips.run, key).toBe('Gallop');
      expect(def.clips.death, key).toBe('Death');
      expect(def.clips.attack.length, key).toBeGreaterThan(0);
      expect(def.clips.hit?.length, key).toBeGreaterThan(0);
    }
  });

  it('gives every creature a real world height', () => {
    // assets.ts normalises with `normScale = def.height / rawHeight`, and every
    // body was fitted to the SAME donor bind box — so a missing or shared height
    // would render an elephant at fox size with no error anywhere.
    for (const [key, def] of entries) {
      expect(def.height, key).toBeGreaterThan(0.5);
      expect(def.height, key).toBeLessThan(6);
    }
    expect(new Set(entries.map(([, d]) => d.height)).size).toBeGreaterThan(1);
  });

  it('ships creature bodies, never weapon-bearing ones', () => {
    // The donor is a quadruped rig: it has no handslot bones, so weaponSlots or
    // an offhandSlot would accept setWeapon() and silently attach nothing.
    for (const [key, def] of entries) {
      expect(def.attach, key).toBeUndefined();
      expect(def.weaponSlots, key).toBeUndefined();
      expect(def.offhandSlot, key).toBeUndefined();
    }
  });

  it('hand-authored keys always win over generated ones', () => {
    // manifest.ts spreads GENERATED_CREATURE_VISUALS before HAND_VISUALS. If a
    // generated key ever shadowed a curated body, a pipeline re-run would
    // silently replace art.
    for (const [key, def] of entries) {
      expect(VISUALS[key], key).toBeDefined();
      expect(VISUALS[key].url, key).toBe(def.url);
    }
  });

  it('every realm roster references a registered visual', () => {
    for (const [realm, keys] of Object.entries(GENERATED_CREATURE_BODIES)) {
      expect(keys.length, realm).toBeGreaterThan(0);
      for (const k of keys) expect(VISUALS[k], `${realm} -> ${k}`).toBeDefined();
    }
    const pooled = Object.values(GENERATED_CREATURE_BODIES).flat();
    expect(new Set(pooled).size).toBe(entries.length);
  });

  // A generated body that joins the boot sweep is a release-blocking regression:
  // the sweep is eager and blocking, and prewarm then builds views against a
  // half-filled cache and throws "character asset not preloaded" for every one.
  it('no generated creature joins the boot preload sweep', () => {
    const eager = entries.filter(([, def]) => !def.lazyPreload);
    expect(eager.map(([k]) => k)).toEqual([]);
  });

  it('every generated creature is reachable through the lazy path', () => {
    for (const [key, def] of entries) {
      expect(isVisualLazy(key), key).toBe(true);
      expect(def.url.startsWith('/cr-realms/'), key).toBe(true);
      expect(def.url.includes('/creatures/'), key).toBe(true);
    }
  });

  it.skipIf(!storePresent)('every creature url resolves to a file in the store', () => {
    // The highest-value check: cr-realms GLBs are gitignored and ship
    // out-of-band, so code and assets drift silently and a missing body renders
    // nothing rather than erroring.
    const missing: string[] = [];
    for (const [key, def] of entries) {
      const rel = def.url.replace(/^\/cr-realms\//, '');
      if (!existsSync(join(STORE, rel))) missing.push(key);
    }
    expect(missing, `missing creature GLBs: ${missing.slice(0, 5).join(', ')}`).toHaveLength(0);
  });
});
