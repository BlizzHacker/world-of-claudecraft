// Contract for the generated machine bodies — turrets, catapults, rovers and a
// starfighter, the engine's THIRD non-humanoid rig family.
//
// Mirrors tests/generated_arachnids.test.ts. These are emitted by
// scripts/realm_assets/emit_machines.mjs, so a regression here is a regression
// in the GENERATOR, and every failure mode is silent at runtime: a missing GLB
// renders nothing, a clip name absent from the rig plays the rest pose for ever,
// and a body in the boot preload sweep blocks world entry for every client.
//
// The check specific to this family is the DECOR COLLISION one. emit_decor.mjs
// scans ['props','buildings','vehicles','ships','mechs','turrets'] and registers
// what it finds as geometry-only props. A turret filed under `turrets/` would be
// registered twice — once animated here, once motionless there — so the store
// bucket is pinned to `machines/`, which decor does not scan.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GENERATED_ARACHNID_VISUALS } from '../src/render/characters/arachnids.generated';
import { GENERATED_CREATURE_VISUALS } from '../src/render/characters/creatures.generated';
import {
  GENERATED_MACHINE_BODIES,
  GENERATED_MACHINE_VISUALS,
} from '../src/render/characters/machines.generated';
import { isVisualLazy, VISUALS, visualKeyFor } from '../src/render/characters/manifest';
import { MOBS } from '../src/sim/data';
import { REALMS, setRealmHostEnv } from '../src/sim/realms/registry';

const STORE =
  process.env.CR_REALMS_DIR ??
  (existsSync('/opt/cr-realms-store')
    ? '/opt/cr-realms-store'
    : '/mnt/usb4/moveweight-assets/cr-realms');
const storePresent = existsSync(STORE);

const entries = Object.entries(GENERATED_MACHINE_VISUALS);

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

const storePath = (url: string) => join(STORE, url.replace(/^\/cr-realms\//, ''));

describe('generated machine bodies', () => {
  it('emits the staged roster', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('every machine carries the synthesised clip vocabulary, and only it', () => {
    for (const [key, def] of entries) {
      expect(def.clips.idle, key).toBe('Idle');
      expect(def.clips.walk, key).toBe('Walk');
      expect(def.clips.run, key).toBe('Run');
      expect(def.clips.death, key).toBe('Death');
      expect(def.clips.attack, key).toEqual(['Attack']);
      expect(def.clips.hit, key).toEqual(['Hit']);
      // machine_rig synthesises from the mechanism; none of these exist.
      expect(def.clips.jump, key).toBeUndefined();
      expect(def.clips.sitIdle, key).toBeUndefined();
      expect(def.clips.cast, key).toBeUndefined();
    }
  });

  it('gives every machine a real world height', () => {
    for (const [key, def] of entries) {
      expect(def.height, key).toBeGreaterThan(0.5);
      expect(def.height, key).toBeLessThan(6);
    }
    expect(new Set(entries.map(([, d]) => d.height)).size).toBeGreaterThan(1);
  });

  it('ships no weapon-bearing machine', () => {
    // The generated skeleton is a yaw post and a pitch trunnion; there is no
    // handslot bone, so weaponSlots would accept setWeapon() and attach nothing.
    for (const [key, def] of entries) {
      expect(def.attach, key).toBeUndefined();
      expect(def.weaponSlots, key).toBeUndefined();
      expect(def.offhandSlot, key).toBeUndefined();
    }
  });

  it('never collides with the other non-humanoid families', () => {
    const others = new Set([
      ...Object.keys(GENERATED_CREATURE_VISUALS),
      ...Object.keys(GENERATED_ARACHNID_VISUALS),
    ]);
    for (const [key] of entries) expect(others.has(key), key).toBe(false);
  });

  it('reaches VISUALS with its own url intact', () => {
    for (const [key, def] of entries) {
      expect(VISUALS[key], key).toBeDefined();
      expect(VISUALS[key].url, key).toBe(def.url);
    }
  });

  it('every realm roster references a registered visual', () => {
    for (const [realm, keys] of Object.entries(GENERATED_MACHINE_BODIES)) {
      expect(keys.length, realm).toBeGreaterThan(0);
      for (const k of keys) expect(VISUALS[k], `${realm} -> ${k}`).toBeDefined();
    }
    const pooled = Object.values(GENERATED_MACHINE_BODIES).flat();
    expect(new Set(pooled).size).toBe(entries.length);
  });

  it('no generated machine joins the boot preload sweep', () => {
    expect(entries.filter(([, def]) => !def.lazyPreload).map(([k]) => k)).toEqual([]);
  });

  it('is served from the machines bucket, which decor does not scan', () => {
    // emit_decor.mjs BUCKETS = props, buildings, vehicles, ships, mechs, turrets.
    // A machine filed under any of those registers twice — animated here and
    // motionless as decor — and the prop copy wins wherever decor places it.
    const DECOR_BUCKETS = ['props', 'buildings', 'vehicles', 'ships', 'mechs', 'turrets'];
    for (const [key, def] of entries) {
      expect(isVisualLazy(key), key).toBe(true);
      expect(def.url.startsWith('/cr-realms/'), key).toBe(true);
      expect(def.url.includes('/machines/'), key).toBe(true);
      for (const b of DECOR_BUCKETS) {
        expect(def.url.includes(`/${b}/`), `${key} sits in the ${b} decor bucket`).toBe(false);
      }
    }
  });

  it.skipIf(!storePresent)('every machine url resolves to a file in the store', () => {
    const missing = entries.filter(([, def]) => !existsSync(storePath(def.url))).map(([k]) => k);
    expect(missing, `missing machine GLBs: ${missing.slice(0, 5).join(', ')}`).toHaveLength(0);
  });

  it.skipIf(!storePresent)('every mapped clip name is really baked into the GLB', () => {
    for (const [key, def] of entries) {
      const baked = new Set(clipNames(storePath(def.url)));
      expect(baked.size, key).toBeGreaterThan(0);
      for (const name of [
        def.clips.idle,
        def.clips.walk,
        def.clips.run,
        def.clips.death,
        ...def.clips.attack,
        ...(def.clips.hit ?? []),
      ]) {
        expect(baked.has(name), `${key} names clip "${name}" which is not in the GLB`).toBe(true);
      }
    }
  });

  it.skipIf(!storePresent)('no machine animates a scale channel', () => {
    // machine_rig authors its own clips and never emits one; a scale track that
    // is constant on the reference still forces scale on a body bound at any
    // other scale, and the body snaps size at the clip boundary.
    for (const [key, def] of entries) {
      const buf = readFileSync(storePath(def.url));
      let off = 12;
      let scale = 0;
      while (off + 8 <= buf.length) {
        const len = buf.readUInt32LE(off);
        const type = buf.readUInt32LE(off + 4);
        const start = off + 8;
        if (type === 0x4e4f534a) {
          const json = JSON.parse(buf.toString('utf8', start, start + len));
          for (const a of json.animations ?? [])
            for (const c of a.channels ?? []) if (c.target?.path === 'scale') scale++;
        }
        off = start + len;
        while (off % 4 !== 0) off++;
      }
      expect(scale, `${key} animates ${scale} scale channels`).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Registered, not wired — the same separation the other two families keep.
// ---------------------------------------------------------------------------
describe('machine spawn selection', () => {
  const KEYS = new Set(Object.keys(GENERATED_MACHINE_VISUALS));

  it('is registered but not yet wired: no mob template resolves to a machine', () => {
    const hits: string[] = [];
    for (const realm of Object.keys(REALMS as Record<string, unknown>)) {
      setRealmHostEnv({
        queryParam: (name) => (name === 'realm' ? realm : null),
        storageGet: () => null,
        storageSet: () => undefined,
      });
      try {
        for (const id of Object.keys(MOBS)) {
          const key = visualKeyFor({ kind: 'mob', templateId: id } as never);
          if (KEYS.has(key)) hits.push(`${realm}/${id} -> ${key}`);
        }
      } finally {
        setRealmHostEnv(null);
      }
    }
    expect(hits, `machines reached spawn selection: ${hits.slice(0, 5).join(', ')}`).toEqual([]);
  });
});
