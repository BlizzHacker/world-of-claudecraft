// Contract for the generated arachnid bodies — the engine's SECOND non-humanoid
// rig family.
//
// Mirrors tests/generated_creatures.test.ts, and for the same reason: these are
// emitted by scripts/realm_assets/emit_arachnids.mjs, so a regression here is a
// regression in the GENERATOR. Every failure mode is silent at runtime — a
// missing GLB renders nothing rather than erroring, a clip name that is not in
// the donor rig plays the rest pose forever, and a body that joins the boot
// preload sweep blocks world entry for every client.
//
// The one check this file has that the quadruped contract does not: it opens the
// GLBs and asserts every clip name the ClipMap reaches for is REALLY BAKED IN.
// The quadrupeds all came off one donor, so pinning the literal 'Gallop' was
// enough. These came off a donor with a different, shorter vocabulary, and the
// whole reason they live in their own record is that a name borrowed from the
// wrong family does not throw — it stands still.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GENERATED_ARACHNID_BODIES,
  GENERATED_ARACHNID_VISUALS,
} from '../src/render/characters/arachnids.generated';
import { GENERATED_CREATURE_VISUALS } from '../src/render/characters/creatures.generated';
import { isVisualLazy, VISUALS, visualKeyFor } from '../src/render/characters/manifest';
import { MOBS } from '../src/sim/data';
import { REALMS, setRealmHostEnv } from '../src/sim/realms/registry';

// Same store resolution as generated_creatures.test.ts: the LIVE store is what
// the server serves; the usb4 path is the out-of-band archive and lags it.
const STORE =
  process.env.CR_REALMS_DIR ??
  (existsSync('/opt/cr-realms-store')
    ? '/opt/cr-realms-store'
    : '/mnt/usb4/moveweight-assets/cr-realms');
const storePresent = existsSync(STORE);

const entries = Object.entries(GENERATED_ARACHNID_VISUALS);

/** Animation names baked into a GLB, read straight out of its JSON chunk. */
function clipNames(file: string): string[] {
  const buf = readFileSync(file);
  let off = 12;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const start = off + 8;
    if (type === 0x4e4f534a) {
      const json = JSON.parse(buf.toString('utf8', start, start + len));
      return (json.animations ?? []).map((a: { name?: string }) => a.name ?? '');
    }
    off = start + len;
    while (off % 4 !== 0) off++;
  }
  return [];
}

describe('generated arachnid creatures', () => {
  it('emits the staged roster', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('every arachnid carries the arachnid donor clip vocabulary', () => {
    // These names are the arachnid donor's OWN baked clips. Note what is NOT
    // here: no Gallop, no Sit, no split left/right hit reacts. Borrowing any of
    // those from the wolf donor renders a motionless body with no error.
    for (const [key, def] of entries) {
      expect(def.clips.idle, key).toBe('Idle');
      expect(def.clips.walk, key).toBe('Walk');
      expect(def.clips.run, key).toBe('Walk');
      expect(def.clips.death, key).toBe('Death');
      expect(def.clips.jump, key).toBe('Jump');
      expect(def.clips.attack, key).toEqual(['Attack', 'Bite']);
      expect(def.clips.hit, key).toEqual(['Hit']);
      // The wolf donor's vocabulary must never leak in here.
      expect(def.clips.run, key).not.toBe('Gallop');
      expect(def.clips.sitIdle, key).toBeUndefined();
    }
  });

  it('gives every arachnid a real, distinct world height', () => {
    // assets.ts normalises with `normScale = def.height / rawHeight`, and all
    // three were fitted to the SAME donor bind box — so a shared height would
    // render a brain-jar walker and a siege spider at identical size.
    for (const [key, def] of entries) {
      expect(def.height, key).toBeGreaterThan(0.5);
      expect(def.height, key).toBeLessThan(6);
    }
    expect(new Set(entries.map(([, d]) => d.height)).size).toBe(entries.length);
  });

  it('ships creature bodies, never weapon-bearing ones', () => {
    // The donor is an eight-legged rig: it has no handslot bones, so weaponSlots
    // or an offhandSlot would accept setWeapon() and silently attach nothing.
    for (const [key, def] of entries) {
      expect(def.attach, key).toBeUndefined();
      expect(def.weaponSlots, key).toBeUndefined();
      expect(def.offhandSlot, key).toBeUndefined();
    }
  });

  it('never collides with the quadruped roster', () => {
    // Both records are spread into VISUALS. A shared key would mean one family's
    // ClipMap silently bodying the other family's mesh.
    const quads = new Set(Object.keys(GENERATED_CREATURE_VISUALS));
    for (const [key] of entries) expect(quads.has(key), key).toBe(false);
  });

  it('reaches VISUALS with its own url intact', () => {
    for (const [key, def] of entries) {
      expect(VISUALS[key], key).toBeDefined();
      expect(VISUALS[key].url, key).toBe(def.url);
    }
  });

  it('every realm roster references a registered visual', () => {
    for (const [realm, keys] of Object.entries(GENERATED_ARACHNID_BODIES)) {
      expect(keys.length, realm).toBeGreaterThan(0);
      for (const k of keys) expect(VISUALS[k], `${realm} -> ${k}`).toBeDefined();
    }
    const pooled = Object.values(GENERATED_ARACHNID_BODIES).flat();
    expect(new Set(pooled).size).toBe(entries.length);
  });

  it('no generated arachnid joins the boot preload sweep', () => {
    // The sweep is eager and blocking; prewarm then builds views against a
    // half-filled cache and throws "character asset not preloaded" for every one.
    expect(entries.filter(([, def]) => !def.lazyPreload).map(([k]) => k)).toEqual([]);
  });

  it('every generated arachnid is reachable through the lazy path', () => {
    for (const [key, def] of entries) {
      expect(isVisualLazy(key), key).toBe(true);
      expect(def.url.startsWith('/cr-realms/'), key).toBe(true);
      expect(def.url.includes('/creatures/'), key).toBe(true);
    }
  });

  it.skipIf(!storePresent)('every arachnid url resolves to a file in the store', () => {
    // cr-realms GLBs are gitignored and ship out-of-band, so code and assets
    // drift silently and a missing body renders nothing rather than erroring.
    const missing: string[] = [];
    for (const [key, def] of entries) {
      if (!existsSync(join(STORE, def.url.replace(/^\/cr-realms\//, '')))) missing.push(key);
    }
    expect(missing, `missing arachnid GLBs: ${missing.join(', ')}`).toHaveLength(0);
  });

  it.skipIf(!storePresent)('every mapped clip name is really baked into the GLB', () => {
    // THE check this family exists to have. A ClipMap entry naming a clip the
    // donor never baked is invisible until someone watches the body stand still
    // through its own death.
    for (const [key, def] of entries) {
      const baked = new Set(clipNames(join(STORE, def.url.replace(/^\/cr-realms\//, ''))));
      expect(baked.size, key).toBeGreaterThan(0);
      const wanted = [
        def.clips.idle,
        def.clips.walk,
        def.clips.run,
        def.clips.death,
        ...(def.clips.jump ? [def.clips.jump] : []),
        ...def.clips.attack,
        ...(def.clips.hit ?? []),
      ];
      for (const name of wanted) {
        expect(baked.has(name), `${key} names clip "${name}" which is not in the GLB`).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Spawn selection. Registering a visual is NOT the same as spawning one, and for
// this family that separation is the point: the bodies are staged and bindable,
// but no mob resolves to one until someone makes a deliberate call-site change.
// This block pins that, so wiring them up can never happen by accident — and so
// the day it happens on purpose, it is a visible edit to this file.
// ---------------------------------------------------------------------------
describe('arachnid spawn selection', () => {
  const ARACHNID_KEYS = new Set(Object.keys(GENERATED_ARACHNID_VISUALS));
  const REALM_IDS = Object.keys(REALMS as Record<string, unknown>);

  function withRealm<T>(realm: string, fn: () => T): T {
    setRealmHostEnv({
      queryParam: (name) => (name === 'realm' ? realm : null),
      storageGet: () => null,
      storageSet: () => undefined,
    });
    try {
      return fn();
    } finally {
      setRealmHostEnv(null);
    }
  }

  it('is registered but not yet wired: no mob template resolves to an arachnid', () => {
    const hits: string[] = [];
    for (const realm of REALM_IDS) {
      withRealm(realm, () => {
        for (const id of Object.keys(MOBS)) {
          const key = visualKeyFor({ kind: 'mob', templateId: id } as never);
          if (ARACHNID_KEYS.has(key)) hits.push(`${realm}/${id} -> ${key}`);
        }
      });
    }
    expect(hits, `arachnids reached spawn selection: ${hits.slice(0, 5).join(', ')}`).toEqual([]);
  });
});
