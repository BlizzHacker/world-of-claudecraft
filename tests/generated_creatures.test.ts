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
import { isPermanentlyRejectedRealmBodyKey } from '../scripts/realm_assets/catalog_policy.mjs';
import {
  GENERATED_CREATURE_BODIES,
  GENERATED_CREATURE_VISUALS,
} from '../src/render/characters/creatures.generated';
import {
  characterPreloadUrls,
  isVisualLazy,
  VISUALS,
  visualKeyFor,
} from '../src/render/characters/manifest';
import { MOBS } from '../src/sim/data';
import { REALMS, setRealmHostEnv } from '../src/sim/realms/registry';

// Same store resolution as generated_visuals.test.ts: the LIVE store is what the
// server serves; the usb4 path is the out-of-band archive and lags it.
const STORE =
  process.env.CR_REALMS_DIR ??
  (existsSync('/opt/cr-realms-store')
    ? '/opt/cr-realms-store'
    : '/mnt/usb4/moveweight-assets/cr-realms');
const storePresent = existsSync(STORE);

// The emitted roster is UNFILTERED input: manifest.ts drops the permanently
// rejected keys on the way into VISUALS and into the draw pool, so a body the
// catalog has banned is legitimately absent from the runtime registry while
// still sitting in this generated file. Every assertion about the RUNTIME side
// therefore runs over the surviving keys only. The 2026-08-21 audit rejected
// seven creature bodies here (all shredded meshes) on exactly this route.
const entries = Object.entries(GENERATED_CREATURE_VISUALS).filter(
  ([key]) => !isPermanentlyRejectedRealmBodyKey(key),
);
const activeBodies = Object.fromEntries(
  Object.entries(GENERATED_CREATURE_BODIES).map(([realm, keys]) => [
    realm,
    keys.filter((key) => !isPermanentlyRejectedRealmBodyKey(key)),
  ]),
);

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
    for (const [realm, keys] of Object.entries(activeBodies)) {
      expect(keys.length, realm).toBeGreaterThan(0);
      for (const k of keys) expect(VISUALS[k], `${realm} -> ${k}`).toBeDefined();
    }
    const pooled = Object.values(activeBodies).flat();
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

// ---------------------------------------------------------------------------
// Spawn selection. Registering a visual is not the same as SPAWNING one: until
// visualKeyFor returns these keys, no player ever sees a quadruped. Everything
// below pins that wiring, and every failure mode it guards is silent in game.
// ---------------------------------------------------------------------------
describe('creature spawn selection', () => {
  const CREATURE_KEYS = new Set(Object.keys(GENERATED_CREATURE_VISUALS));
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

  const keyFor = (templateId: string) => visualKeyFor({ kind: 'mob', templateId } as never);

  /** Every mob template resolved under one realm. */
  function resolveAll(realm: string): Map<string, string> {
    return withRealm(realm, () => {
      const out = new Map<string, string>();
      for (const id of Object.keys(MOBS)) out.set(id, keyFor(id));
      return out;
    });
  }

  const selectedIn = (realm: string) =>
    [...resolveAll(realm)].filter(([, key]) => CREATURE_KEYS.has(key));

  it('actually spawns creatures - the roster is reachable, not just registered', () => {
    const reached = new Set<string>();
    for (const realm of REALM_IDS) for (const [, key] of selectedIn(realm)) reached.add(key);
    expect(reached.size).toBeGreaterThan(0);
  });

  // REALM PURITY. A creature may only appear in the realm it was STAGED into.
  // An earlier regression let advisory affinities lend classic bodies to
  // Infernal and only a test caught it, so this is checked two independent
  // ways: against the roster, and against the GLB path, which carries the realm
  // the asset physically ships under. A roster typo that agrees with itself
  // still fails the second check.
  it('never selects a creature in a realm it was not staged into', () => {
    for (const realm of REALM_IDS) {
      const staged = new Set(activeBodies[realm] ?? []);
      for (const [id, key] of selectedIn(realm)) {
        expect(staged.has(key), `${realm}/${id} -> ${key} is not staged in ${realm}`).toBe(true);
        expect(VISUALS[key].url, `${realm}/${id} -> ${key}`).toContain(
          `/cr-realms/${realm}/creatures/`,
        );
      }
    }
  });

  it('leaves realms with no staged creatures entirely alone', () => {
    const bare = REALM_IDS.filter((r) => !activeBodies[r]?.length);
    expect(bare.length).toBeGreaterThan(0);
    for (const realm of bare) {
      expect(selectedIn(realm).map(([id, key]) => `${id} -> ${key}`)).toEqual([]);
    }
  });

  // DETERMINISM part 1: nothing per-call. A Math.random() pick would give every
  // client its own bestiary and reshuffle on every view rebuild.
  it('resolves a template to the same body on every call', () => {
    for (const realm of REALM_IDS) {
      const first = resolveAll(realm);
      for (let pass = 0; pass < 3; pass++) {
        for (const [id, key] of resolveAll(realm)) {
          expect(key, `${realm}/${id} pass ${pass}`).toBe(first.get(id));
        }
      }
    }
  });

  // DETERMINISM part 2: the picks are pinned, which is the part repeated calls
  // in one process cannot prove. The seed is `${realm}:${family}:${templateId}`
  // through FNV-1a, so a pick only moves if the hash, the seed shape, or the
  // ORDER of that realm's roster changes - and any of those desyncs clients
  // against each other mid-session. Re-baseline these deliberately, never as a
  // side effect of regenerating the roster.
  it('pins the pick for every generic beast in every staged realm', () => {
    expect(withRealm('crypticrealm', () => keyFor('mire_prowler'))).toBe(
      'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    );
    expect(withRealm('claudecraft', () => keyFor('ridge_stalker'))).toBe(
      'realm_claudecraft_resembles_robust_armored_bear_01981e51',
    );
    expect(withRealm('crypticrealm', () => keyFor('ridge_stalker'))).toBe(
      'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    );
    // These two moved on 2026-08-21: the audit rejected seven shredded creature
    // bodies, and this pool is drawn with a MODULO, so removing any body shifts
    // the divisor for every unpinned template in the realm.
    expect(withRealm('infernal', () => keyFor('mire_prowler'))).toBe(
      'realm_infernal_albino_direwolf_01961261',
    );
    expect(withRealm('infernal', () => keyFor('ridge_stalker'))).toBe(
      'realm_infernal_fox_01942ed0',
    );
    expect(withRealm('arcane', () => keyFor('mire_prowler'))).toBe(
      'realm_arcane_creature_has_quadruped_but_0193df71',
    );
    expect(withRealm('arcane', () => keyFor('ridge_stalker'))).toBe(
      'realm_arcane_creature_has_quadruped_but_0193df71',
    );
    expect(withRealm('claudecraft', () => keyFor('mire_prowler'))).toBe(
      'realm_claudecraft_resembles_robust_armored_bear_01981e51',
    );
    expect(withRealm('fps', () => keyFor('mire_prowler'))).toBe('realm_fps_armored_boar_019cb448');
    // ridge_stalker used to land on realm_fps_ironbound_war_elephant_019ef095,
    // one of the shredded bodies the audit rejected.
    expect(withRealm('fps', () => keyFor('ridge_stalker'))).toBe(
      'realm_fps_extremely_frilled_dragon_lizard_0193e6b8',
    );
  });

  // The pool is the GENERIC family fallback. Anything a designer named by
  // template keeps its identity in every realm, or re-running the asset pipeline
  // silently repaints the authored bestiary.
  it('never displaces a beast the designers named', () => {
    const AUTHORED: Record<string, string> = {
      forest_wolf: 'mob_wolf',
      wild_boar: 'mob_boar',
      old_greyjaw: 'greyjaw',
      old_cragmaw: 'mob_bear',
      bog_bloat: 'mob_murloc',
      mirefen_widowling: 'mob_spider',
      spider_egg_sac: 'mob_spider_egg_sac',
      sump_troll_devourer: 'mob_troll',
      yumi_cat: 'mob_yumi_cat',
      hellmaw_primal_beast: 'hellmaw_primal_beast_body',
    };
    for (const realm of REALM_IDS) {
      withRealm(realm, () => {
        for (const [id, expected] of Object.entries(AUTHORED)) {
          expect(keyFor(id), `${realm}/${id}`).toBe(expected);
        }
      });
    }
  });

  // GENERATED_CREATURE_FAMILIES is beast-only, and the crypticrealm/infernal
  // branches of visualKeyFor dispatch on explicit family lists - so widening the
  // set is not enough to wire a new family, and doing it by halves would be
  // invisible. This fails the moment anything but a beast draws a quadruped.
  //
  // vale_cup_ball is in this list: the boarball carries family 'beast' purely so
  // it replicates over the normal entity wire. It never renders as one, because
  // renderer.ts builds buildValeCupBall() for it in a branch ABOVE the
  // visualKeyFor call - the key is computed and thrown away.
  it('serves the beast family and nothing else', () => {
    for (const realm of REALM_IDS) {
      for (const [id, key] of selectedIn(realm)) {
        expect(MOBS[id]?.family, `${realm}/${id} -> ${key}`).toBe('beast');
      }
    }
    expect(MOBS.vale_cup_ball?.family).toBe('beast');
  });

  // Lazy is a release blocker, not a preference: the boot sweep is eager and
  // blocking, and prewarm then builds views against a half-filled cache and
  // throws "character asset not preloaded" for every one. The roster-wide check
  // above covers registration; this one covers the bodies selection actually
  // reaches, which is what a spawn would fetch.
  it('keeps every SELECTED creature out of the boot preload sweep', () => {
    const preload = new Set(characterPreloadUrls(true));
    const selected = new Set<string>();
    for (const realm of REALM_IDS) for (const [, key] of selectedIn(realm)) selected.add(key);
    expect(selected.size).toBeGreaterThan(0);
    for (const key of selected) {
      expect(isVisualLazy(key), key).toBe(true);
      expect(preload.has(VISUALS[key].url), `${key} joined the boot sweep`).toBe(false);
    }
  });

  it.skipIf(!storePresent)('every SELECTED creature has a GLB in the store', () => {
    // A selected body whose GLB is missing renders nothing at all - the mob is
    // invisible and no error is raised anywhere.
    const missing: string[] = [];
    for (const realm of REALM_IDS) {
      for (const [id, key] of selectedIn(realm)) {
        const rel = VISUALS[key].url.replace(/^\/cr-realms\//, '');
        if (!existsSync(join(STORE, rel))) missing.push(`${realm}/${id} -> ${key}`);
      }
    }
    expect(missing, `missing selected GLBs: ${missing.slice(0, 5).join(', ')}`).toHaveLength(0);
  });
});
