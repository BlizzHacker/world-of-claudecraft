import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GENERATED_CREATURE_BODIES,
  GENERATED_CREATURE_VISUALS,
} from '../src/render/characters/creatures.generated';
import { isVisualLazy, VISUALS, visualKeyFor } from '../src/render/characters/manifest';
import { ZONE1_WILDS_CAMPS } from '../src/sim/content/zone1';
import { ZONE2_WILDS_CAMPS } from '../src/sim/content/zone2';
import { ZONE3_WILDS_CAMPS } from '../src/sim/content/zone3';
import { CAMPS, ITEMS, MOBS, ZONES } from '../src/sim/data';
import { REALMS, setRealmHostEnv } from '../src/sim/realms/registry';
import { tEntity } from '../src/ui/entity_i18n';

// The pool-bodied backcountry beasts: templates deliberately shipped WITHOUT a
// curated body so manifest.ts generatedCreatureBodyFor() hands each one a staged
// quadruped from the active realm's creature roster. Everything these guard is
// silent at runtime - a template with a curated body quietly stops drawing from
// the roster, a body picked in an unstaged realm renders the old generic wolf,
// and a moved hash re-rolls every client's bestiary mid-session.

interface Expected {
  id: string;
  name: string;
  zone: string;
  minLevel: number;
  maxLevel: number;
  /** The body each staged realm's hash actually assigns. Pinned deliberately. */
  bodies: Record<string, string>;
}

// The `bodies` values moved wholesale on 2026-08-21. The reachable-asset audit
// rejected seven shredded creature bodies, seven of these templates were WEARING
// one, and the pool is drawn with a modulo, so removing any body re-rolls every
// unpinned template in that realm. The pins are still the point: they are what
// makes the next such move visible instead of silent.
const NEW_BEASTS: Expected[] = [
  {
    id: 'sowfield_marauder',
    name: 'Sowfield Marauder',
    zone: 'eastbrook_vale',
    minLevel: 3,
    maxLevel: 4,
    bodies: {
      crypticrealm: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
      infernal: 'realm_infernal_feral_alien_creature_carnivore_01945133',
      arcane: 'realm_arcane_mystic_war_steed_0197b1c0',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_armored_boar_019cb448',
    },
  },
  {
    id: 'brightwood_ravager',
    name: 'Brightwood Ravager',
    zone: 'eastbrook_vale',
    minLevel: 4,
    maxLevel: 5,
    bodies: {
      crypticrealm: 'realm_crypticrealm_gorilla_01947fab',
      infernal: 'realm_infernal_rino_019bc334',
      arcane: 'realm_arcane_mystic_war_steed_0197b1c0',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_extremely_frilled_dragon_lizard_0193e6b8',
    },
  },
  {
    id: 'coppervein_savage',
    name: 'Coppervein Savage',
    zone: 'eastbrook_vale',
    minLevel: 5,
    maxLevel: 6,
    bodies: {
      crypticrealm: 'realm_crypticrealm_albino_direwolf_01961261',
      infernal: 'realm_infernal_mechanical_elephant_sentinel_01966355',
      arcane: 'realm_arcane_mystic_war_steed_0197b1c0',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_armored_boar_019cb448',
    },
  },
  {
    id: 'reedbank_mauler',
    name: 'Reedbank Mauler',
    zone: 'mirefen_marsh',
    minLevel: 8,
    maxLevel: 9,
    bodies: {
      crypticrealm: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
      infernal: 'realm_infernal_fox_01942ed4',
      arcane: 'realm_arcane_mystic_war_steed_0197b1c0',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_armored_boar_019cb448',
    },
  },
  {
    id: 'blackwater_reaver',
    name: 'Blackwater Reaver',
    zone: 'mirefen_marsh',
    minLevel: 9,
    maxLevel: 10,
    bodies: {
      crypticrealm: 'realm_crypticrealm_sharkhorse_019644f7',
      infernal: 'realm_infernal_rino_019bc334',
      arcane: 'realm_arcane_creature_has_quadruped_but_0193df71',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_extremely_frilled_dragon_lizard_0193e6b8',
    },
  },
  {
    id: 'silthollow_charger',
    name: 'Silthollow Charger',
    zone: 'mirefen_marsh',
    minLevel: 10,
    maxLevel: 11,
    bodies: {
      crypticrealm: 'realm_crypticrealm_fox_01942ed4',
      infernal: 'realm_infernal_gorilla_01947f76',
      arcane: 'realm_arcane_mystic_war_steed_0197b1c0',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_extremely_frilled_dragon_lizard_0193e6b8',
    },
  },
  {
    id: 'fenmoor_hunter',
    name: 'Fenmoor Hunter',
    zone: 'mirefen_marsh',
    minLevel: 11,
    maxLevel: 12,
    bodies: {
      crypticrealm: 'realm_crypticrealm_ironbound_warboar_019cb457',
      infernal: 'realm_infernal_emerald_leviathan_019f24be',
      arcane: 'realm_arcane_creature_has_quadruped_but_0193df71',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_armored_boar_019cb448',
    },
  },
  {
    id: 'drownfen_terror',
    name: 'Drownfen Terror',
    zone: 'mirefen_marsh',
    minLevel: 12,
    maxLevel: 13,
    bodies: {
      crypticrealm: 'realm_crypticrealm_sharkhorse_019644f7',
      infernal: 'realm_infernal_mechanical_elephant_sentinel_01966355',
      arcane: 'realm_arcane_creature_has_quadruped_but_0193df4d',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_extremely_frilled_dragon_lizard_0193e6b8',
    },
  },
  {
    id: 'highwind_warbeast',
    name: 'Highwind Warbeast',
    zone: 'thornpeak_heights',
    minLevel: 14,
    maxLevel: 15,
    bodies: {
      crypticrealm: 'realm_crypticrealm_sharkhorse_019644f7',
      infernal: 'realm_infernal_emerald_leviathan_019f24be',
      arcane: 'realm_arcane_creature_has_quadruped_but_0193df71',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_extremely_frilled_dragon_lizard_0193e6b8',
    },
  },
  {
    id: 'cairnfell_render',
    name: 'Cairnfell Render',
    zone: 'thornpeak_heights',
    minLevel: 15,
    maxLevel: 16,
    bodies: {
      crypticrealm: 'realm_crypticrealm_albino_direwolf_01961261',
      infernal: 'realm_infernal_fox_01942ed5',
      arcane: 'realm_arcane_creature_has_quadruped_but_0193df71',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_armored_boar_019cb448',
    },
  },
  {
    id: 'scarpfall_fury',
    name: 'Scarpfall Fury',
    zone: 'thornpeak_heights',
    minLevel: 16,
    maxLevel: 17,
    bodies: {
      crypticrealm: 'realm_crypticrealm_ironbound_warboar_019cb457',
      infernal: 'realm_infernal_crimson_charger_0195ec9b',
      arcane: 'realm_arcane_creature_has_quadruped_but_0193df71',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_armored_boar_019cb448',
    },
  },
  {
    id: 'frostline_scourge',
    name: 'Frostline Scourge',
    zone: 'thornpeak_heights',
    minLevel: 17,
    maxLevel: 18,
    bodies: {
      crypticrealm: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
      infernal: 'realm_infernal_feral_alien_creature_carnivore_01945133',
      arcane: 'realm_arcane_creature_has_quadruped_but_0193df71',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_armored_boar_019cb448',
    },
  },
  {
    id: 'stormfell_ravener',
    name: 'Stormfell Ravener',
    zone: 'thornpeak_heights',
    minLevel: 18,
    maxLevel: 19,
    bodies: {
      crypticrealm: 'realm_crypticrealm_sharkhorse_019644f7',
      infernal: 'realm_infernal_cerberus_massive_muscular_dog_01949471',
      arcane: 'realm_arcane_creature_has_quadruped_but_0193df4d',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_extremely_frilled_dragon_lizard_0193e6b8',
    },
  },
  {
    id: 'talusrift_devourer',
    name: 'Talusrift Devourer',
    zone: 'thornpeak_heights',
    minLevel: 18,
    maxLevel: 19,
    bodies: {
      crypticrealm: 'realm_crypticrealm_albino_direwolf_01961261',
      infernal: 'realm_infernal_gorilla_01947f6a',
      arcane: 'realm_arcane_creature_has_quadruped_but_0193df4d',
      claudecraft: 'realm_claudecraft_resembles_robust_armored_bear_01981e51',
      fps: 'realm_fps_armored_boar_019cb448',
    },
  },
];

// The base realm shipped ONE creature silhouette (two recolours of the same
// drake), so every pooled beast here drew the same picture. It now stages nine
// bodies - plain wildlife carried over from the infernal roster, minus anything
// with a hell or sci-fi cue on the texture - which is why the crypticrealm
// expectations below name gorillas, a direwolf and a dusk fiend, and why reach
// is 6 instead of 2. Pre-existing templates did NOT move: they are frozen by
// GENERATED_CREATURE_BODY_PINS, because body choice is `hash(id) % pool.length`
// and would otherwise re-roll every mob in the realm whenever a body is added.
const NEW_IDS = NEW_BEASTS.map((b) => b.id);
const REALM_IDS = Object.keys(REALMS as Record<string, unknown>);
const STAGED = REALM_IDS.filter((r) => (GENERATED_CREATURE_BODIES[r] ?? []).length > 0);
const BARE = REALM_IDS.filter((r) => !(GENERATED_CREATURE_BODIES[r] ?? []).length);
const CREATURE_KEYS = new Set(Object.keys(GENERATED_CREATURE_VISUALS));

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
const keyIn = (realm: string, id: string) =>
  withRealm(realm, () => visualKeyFor({ kind: 'mob', templateId: id } as never));

const zoneById = (id: string) => {
  const z = ZONES.find((zone) => zone.id === id);
  if (!z) throw new Error(`unknown zone ${id}`);
  return z;
};

// ---------------------------------------------------------------------------
describe('pool-bodied beasts: template validity', () => {
  it('registers every new id exactly once, as a plain wild beast', () => {
    for (const spec of NEW_BEASTS) {
      const m = MOBS[spec.id];
      expect(m, spec.id).toBeDefined();
      expect(m.id, spec.id).toBe(spec.id);
      expect(m.name, spec.id).toBe(spec.name);
      expect(m.family, spec.id).toBe('beast');
      // Wild trash, not encounter content: a rare/elite/boss flag would double
      // its health and XP and put it on a rare respawn timer.
      expect(m.rare, spec.id).toBeUndefined();
      expect(m.elite, spec.id).toBeUndefined();
      expect(m.boss, spec.id).toBeUndefined();
      expect(m.worldBoss, spec.id).toBeUndefined();
      expect(m.dummy, spec.id).toBeUndefined();
      // No XP outliers: xpMult unset means the standard (45 + 5*level) kill payout.
      expect(m.xpMult, spec.id).toBeUndefined();
      expect(m.petRole, spec.id).toBeUndefined();
    }
    expect(new Set(NEW_IDS).size).toBe(NEW_IDS.length);
  });

  it('keeps every level band inside its zone band, and ordered', () => {
    for (const spec of NEW_BEASTS) {
      const m = MOBS[spec.id];
      const zone = zoneById(spec.zone);
      expect(m.minLevel, spec.id).toBe(spec.minLevel);
      expect(m.maxLevel, spec.id).toBe(spec.maxLevel);
      expect(m.minLevel, spec.id).toBeLessThanOrEqual(m.maxLevel);
      expect(m.minLevel, `${spec.id} below ${zone.id}`).toBeGreaterThanOrEqual(zone.levelRange[0]);
      expect(m.maxLevel, `${spec.id} above ${zone.id}`).toBeLessThanOrEqual(zone.levelRange[1]);
    }
  });

  it('sits between the authored beasts it is banded with, never above them', () => {
    // The shape check that matters for balance: a new beast at level L must not
    // out-stat the authored beast nearest it. Ridge Stalker (13-14) is the top
    // authored non-elite beast, and Old Cragmaw (rare elite, 14) is the ceiling
    // no wild trash may approach.
    const stalker = MOBS.ridge_stalker;
    const cragmaw = MOBS.old_cragmaw;
    for (const spec of NEW_BEASTS) {
      const m = MOBS[spec.id];
      // hp/dmg per level grow with the band but stay inside the authored curve's
      // slope, and nothing gets near the rare elite's health pool.
      expect(m.hpBase, spec.id).toBeLessThan(cragmaw.hpBase / 3);
      expect(m.hpPerLevel, spec.id).toBeLessThan(cragmaw.hpPerLevel / 2);
      expect(m.dmgPerLevel, spec.id).toBeLessThan(cragmaw.dmgPerLevel);
      if (m.minLevel <= stalker.minLevel) {
        expect(m.hpBase, `${spec.id} out-tanks Ridge Stalker`).toBeLessThanOrEqual(stalker.hpBase);
        expect(m.dmgBase, `${spec.id} out-hits Ridge Stalker`).toBeLessThanOrEqual(stalker.dmgBase);
      }
      expect(m.moveSpeed, spec.id).toBeGreaterThan(6);
      expect(m.moveSpeed, spec.id).toBeLessThanOrEqual(9);
      expect(m.aggroRadius, spec.id).toBeGreaterThan(0);
      expect(m.aggroRadius, spec.id).toBeLessThanOrEqual(12);
    }
  });

  it('rises monotonically with the level band (hp, damage, armor, purse)', () => {
    const ordered = [...NEW_BEASTS].sort((a, b) => a.minLevel - b.minLevel);
    let prev = MOBS[ordered[0].id];
    for (const spec of ordered.slice(1)) {
      const m = MOBS[spec.id];
      expect(m.hpBase, spec.id).toBeGreaterThanOrEqual(prev.hpBase);
      expect(m.armorPerLevel, spec.id).toBeGreaterThanOrEqual(prev.armorPerLevel);
      const purse = (id: string) => MOBS[id].loot.find((l) => l.copper)?.copper ?? 0;
      expect(purse(spec.id), spec.id).toBeGreaterThan(purse(prev.id) - 1);
      prev = m;
    }
  });

  it('drops only existing, non-quest, non-boss-tier loot', () => {
    for (const spec of NEW_BEASTS) {
      const m = MOBS[spec.id];
      expect(m.loot.length, spec.id).toBeGreaterThan(0);
      expect(m.loot[0].copper, `${spec.id} guaranteed purse`).toBeGreaterThan(0);
      for (const entry of m.loot) {
        // No new economy: every itemId must already exist, and none of these
        // wild beasts may gate a quest turn-in or drop epic/legendary gear.
        if (!entry.itemId) continue;
        const item = ITEMS[entry.itemId];
        expect(item, `${spec.id} loot ${entry.itemId}`).toBeDefined();
        expect(entry.questId, `${spec.id} loot ${entry.itemId}`).toBeUndefined();
        expect(entry.rollGroup, `${spec.id} loot ${entry.itemId}`).toBeUndefined();
        expect(
          ['epic', 'legendary', 'mythic'].includes(String(item.quality)),
          `${spec.id} drops boss-tier ${entry.itemId}`,
        ).toBe(false);
        expect(entry.chance, `${spec.id} loot ${entry.itemId}`).toBeLessThanOrEqual(0.3);
      }
    }
  });

  it('tags only body-agnostic harvest components', () => {
    // The rendered body is hash-picked, so a template can end up a horned ram or
    // a clawless charger. Only 'hide' and 'meat' are true of every staged
    // quadruped; 'fang', 'claw', 'horn' or 'tusk' would lie for most of them.
    for (const spec of NEW_BEASTS) {
      expect(MOBS[spec.id].componentTags, spec.id).toEqual(['hide', 'meat']);
    }
  });
});

// ---------------------------------------------------------------------------
describe('pool-bodied beasts: body selection', () => {
  it('draws a staged creature in every realm that has one', () => {
    for (const realm of STAGED) {
      for (const id of NEW_IDS) {
        const key = keyIn(realm, id);
        expect(CREATURE_KEYS.has(key), `${realm}/${id} -> ${key} is not a creature`).toBe(true);
      }
    }
  });

  // REALM PURITY, checked the same two independent ways generated_creatures does:
  // against the realm's roster, and against the GLB path, which carries the realm
  // the asset physically ships under.
  it('never draws a body from a realm it was not staged into', () => {
    for (const realm of STAGED) {
      const staged = new Set(GENERATED_CREATURE_BODIES[realm] ?? []);
      for (const id of NEW_IDS) {
        const key = keyIn(realm, id);
        expect(staged.has(key), `${realm}/${id} -> ${key} not staged in ${realm}`).toBe(true);
        expect(VISUALS[key].url, `${realm}/${id}`).toContain(`/cr-realms/${realm}/creatures/`);
      }
    }
  });

  it('leaves realms with no staged creatures on their existing family fallback', () => {
    expect(BARE.length).toBeGreaterThan(0);
    for (const realm of BARE) {
      for (const id of NEW_IDS) {
        const key = keyIn(realm, id);
        expect(CREATURE_KEYS.has(key), `${realm}/${id} leaked a creature`).toBe(false);
        expect(VISUALS[key], `${realm}/${id} -> ${key}`).toBeDefined();
      }
    }
  });

  it('resolves the same body on every call', () => {
    for (const realm of STAGED) {
      for (const id of NEW_IDS) {
        const first = keyIn(realm, id);
        for (let pass = 0; pass < 3; pass++) {
          expect(keyIn(realm, id), `${realm}/${id} pass ${pass}`).toBe(first);
        }
      }
    }
  });

  // The pinned table. The seed is `${realm}:${family}:${templateId}` through
  // FNV-1a over the realm's roster IN ORDER, so a pick only moves if the hash,
  // the seed shape, the template id, or the roster ORDER changes - and any of
  // those desyncs live clients against each other mid-session. Re-baseline these
  // deliberately, never as a side effect of regenerating the roster.
  it('pins the body every staged realm assigns to every new template', () => {
    for (const spec of NEW_BEASTS) {
      for (const [realm, expected] of Object.entries(spec.bodies)) {
        expect(keyIn(realm, spec.id), `${realm}/${spec.id}`).toBe(expected);
      }
      expect(Object.keys(spec.bodies).sort()).toEqual([...STAGED].sort());
    }
  });

  it('keeps every body it selects out of the boot preload sweep', () => {
    for (const realm of STAGED) {
      for (const id of NEW_IDS) expect(isVisualLazy(keyIn(realm, id)), `${realm}/${id}`).toBe(true);
    }
  });

  it('widens the reachable roster instead of piling onto two bodies', () => {
    // The whole point of the exercise: before these templates only mire_prowler
    // and ridge_stalker drew from the pools, so most staged quadrupeds could
    // never appear. Guard the coverage so a future id rename cannot silently
    // collapse the spread back down.
    const pooled = ['mire_prowler', 'ridge_stalker', ...NEW_IDS];
    // Distinct bodies a player can now meet, per realm. Everything but infernal
    // is its whole staged roster; infernal's roster is 27 deep, so 12 is what a
    // 16-template hash spread reaches.
    //
    // These moved on 2026-08-21. The reachable-asset audit rejected seven
    // shredded creature bodies, and this pool is drawn with a MODULO, so the
    // divisor changed for every unpinned template. fps drops hardest (4 to 2):
    // two of its four staged quadrupeds were shredded, so 2 is the honest depth
    // of that realm's intact creature roster, not a spread regression.
    const REACH: Record<string, number> = {
      crypticrealm: 7,
      infernal: 12,
      arcane: 3,
      claudecraft: 1,
      fps: 2,
    };
    for (const realm of STAGED) {
      const reached = new Set(pooled.map((id) => keyIn(realm, id)));
      expect(reached.size, `${realm} reach`).toBe(REACH[realm]);
      expect(reached.size, `${realm} reach`).toBeLessThanOrEqual(
        GENERATED_CREATURE_BODIES[realm].length,
      );
    }
    // The infernal roster is the only one deep enough (27 bodies for 14 ids) to
    // give every template its own body. It used to, exactly; after the 2026-08-21
    // rejections shifted the modulus four ids now share a body with a sibling.
    // Depth is not the problem and adding art will not fix it: this pool is drawn
    // with `pool[hash % pool.length]`, so ANY change to the pool re-rolls it. The
    // real repair is moving it onto the rendezvous draw the humanoid pool already
    // uses (selectBodyFromPool in body_shape_gate.ts), where removing a body only
    // moves the templates that were wearing it.
    expect(new Set(NEW_IDS.map((id) => keyIn('infernal', id))).size).toBeGreaterThanOrEqual(10);
  });
});

// ---------------------------------------------------------------------------
describe('pool-bodied beasts: authored content is untouched', () => {
  // A curated body always wins over the roster. If a pipeline re-run or a new
  // template ever displaced one of these, the authored bestiary would silently
  // repaint itself.
  const AUTHORED_BODIES: Record<string, string> = {
    forest_wolf: 'mob_wolf',
    wild_boar: 'mob_boar',
    old_greyjaw: 'greyjaw',
    old_cragmaw: 'mob_bear',
    bog_bloat: 'mob_murloc',
    yumi_cat: 'mob_yumi_cat',
    hellmaw_primal_beast: 'hellmaw_primal_beast_body',
  };

  it('never displaces a beast the designers named, in any realm', () => {
    for (const realm of REALM_IDS) {
      for (const [id, expected] of Object.entries(AUTHORED_BODIES)) {
        expect(keyIn(realm, id), `${realm}/${id}`).toBe(expected);
      }
    }
  });

  // Two of these six moved on 2026-08-21 and both moves are the gate working:
  // ridge_stalker was wearing realm_fps_ironbound_war_elephant_019ef095, a
  // shredded mesh, and mire_prowler's infernal pick shifted with the modulus
  // when the four rejected infernal creature bodies left the pool.
  it('leaves the pre-existing pool beasts on the bodies they already had', () => {
    expect(keyIn('crypticrealm', 'mire_prowler')).toBe(
      'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    );
    expect(keyIn('crypticrealm', 'ridge_stalker')).toBe(
      'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    );
    expect(keyIn('infernal', 'mire_prowler')).toBe('realm_infernal_albino_direwolf_01961261');
    expect(keyIn('infernal', 'ridge_stalker')).toBe('realm_infernal_fox_01942ed0');
    expect(keyIn('arcane', 'mire_prowler')).toBe(
      'realm_arcane_creature_has_quadruped_but_0193df71',
    );
    expect(keyIn('fps', 'ridge_stalker')).toBe(
      'realm_fps_extremely_frilled_dragon_lizard_0193e6b8',
    );
  });

  // Stat pins for every authored beast, so "added content" can never quietly
  // become "retuned content".
  const AUTHORED_STATS: Record<string, number[]> = {
    // [minLevel, maxLevel, hpBase, hpPerLevel, dmgBase, dmgPerLevel,
    //  attackSpeed, armorPerLevel, moveSpeed, aggroRadius, scale, color]
    forest_wolf: [1, 2, 40, 14, 3, 1.6, 2.0, 10, 8, 10, 0.9, 0x7f8c8d],
    wild_boar: [2, 3, 38, 16, 4, 1.8, 2.2, 14, 7.5, 9, 0.85, 0x935116],
    old_greyjaw: [4, 4, 110, 20, 5, 2.0, 1.8, 16, 8.5, 12, 1.25, 0x566061],
    mire_prowler: [7, 8, 46, 19, 7, 2.1, 2.0, 12, 8.5, 11, 0.95, 0x4d5656],
    bog_bloat: [9, 11, 44, 17, 7, 2.0, 2.6, 9, 6, 10, 1.1, 0x6b8e23],
    ridge_stalker: [13, 14, 58, 21, 10, 2.5, 1.9, 14, 8, 11, 0.95, 0x8c8270],
    old_cragmaw: [14, 14, 320, 56, 16, 4.0, 1.7, 24, 8.6, 13, 1.3, 0x6e6453],
  };

  it('leaves every authored beast stat block byte-identical', () => {
    for (const [id, pin] of Object.entries(AUTHORED_STATS)) {
      const m = MOBS[id];
      expect(m, id).toBeDefined();
      expect(
        [
          m.minLevel,
          m.maxLevel,
          m.hpBase,
          m.hpPerLevel,
          m.dmgBase,
          m.dmgPerLevel,
          m.attackSpeed,
          m.armorPerLevel,
          m.moveSpeed,
          m.aggroRadius,
          m.scale,
          m.color,
        ],
        id,
      ).toEqual(pin);
    }
  });

  it('leaves every authored beast loot table untouched', () => {
    const ids = (id: string) => MOBS[id].loot.map((l) => l.itemId ?? `copper:${l.copper}`);
    expect(ids('forest_wolf')).toEqual([
      'copper:8',
      'wolf_fang',
      'milepost_boots',
      'wolfhide_satchel',
    ]);
    expect(ids('wild_boar')).toEqual(['copper:12', 'boar_hide', 'tough_jerky', 'trail_leggings']);
    expect(ids('mire_prowler')).toEqual([
      'copper:30',
      'mire_prowler_pelt',
      'soggy_moccasin',
      'lesser_healing_potion',
    ]);
    expect(ids('ridge_stalker')).toEqual([
      'copper:60',
      'ridge_stalker_pelt',
      'ridge_stalker_pelt',
      'wildgrove_cinch',
    ]);
    expect(ids('bog_bloat')).toEqual(['copper:40', 'tangled_weed']);
  });

  it('does not steal an authored collect-quest item as its first drop source', () => {
    // progression.test.ts resolves a collect objective to the FIRST mob in MOBS
    // whose loot lists the item, so a new template that dropped an authored
    // quest item could silently re-price a quest's XP budget.
    const questItems = new Set<string>();
    for (const id of Object.keys(MOBS)) {
      for (const l of MOBS[id].loot) if (l.questId && l.itemId) questItems.add(l.itemId);
    }
    for (const id of NEW_IDS) {
      for (const l of MOBS[id].loot) {
        expect(questItems.has(l.itemId ?? ''), `${id} drops quest item ${l.itemId}`).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
describe('pool-bodied beasts: world placement', () => {
  const WILDS = [...ZONE1_WILDS_CAMPS, ...ZONE2_WILDS_CAMPS, ...ZONE3_WILDS_CAMPS];

  it('camps one pack per template, and nothing else', () => {
    expect(WILDS.map((c) => c.mobId).sort()).toEqual([...NEW_IDS].sort());
    for (const camp of WILDS) {
      expect(camp.count, camp.mobId).toBeGreaterThanOrEqual(4);
      expect(camp.count, camp.mobId).toBeLessThanOrEqual(6);
      expect(camp.radius, camp.mobId).toBeGreaterThanOrEqual(12);
      expect(camp.radius, camp.mobId).toBeLessThanOrEqual(22);
    }
  });

  // The determinism guard. The camp loop is the last RNG consumer at world
  // construction, so appended camps shift no existing camp's placement - but
  // only while they stay APPENDED. Sliding them earlier silently re-rolls every
  // other pack's spawn positions.
  it('appends the new packs at the tail of the merged CAMPS array', () => {
    expect(CAMPS.slice(-WILDS.length)).toEqual(WILDS);
    const head = CAMPS.slice(0, CAMPS.length - WILDS.length);
    for (const id of NEW_IDS) {
      expect(
        head.some((c) => c.mobId === id),
        `${id} camp is not at the tail`,
      ).toBe(false);
    }
  });

  it('places each pack in its own zone band, in the backcountry', () => {
    for (const spec of NEW_BEASTS) {
      const camp = WILDS.find((c) => c.mobId === spec.id);
      expect(camp, spec.id).toBeDefined();
      const zone = zoneById(spec.zone);
      expect(camp!.center.z, `${spec.id} z-band`).toBeGreaterThanOrEqual(zone.zMin);
      expect(camp!.center.z, `${spec.id} z-band`).toBeLessThan(zone.zMax);
      // Never in a town square: the pack's outer spawn ring must clear the hub.
      const toHub = Math.hypot(camp!.center.x - zone.hub.x, camp!.center.z - zone.hub.z);
      expect(toHub - camp!.radius, `${spec.id} spawns inside ${zone.hub.name}`).toBeGreaterThan(
        zone.hub.radius,
      );
      // And clear of the zone's graveyard release point.
      if (zone.graveyard) {
        const toGrave = Math.hypot(
          camp!.center.x - zone.graveyard.x,
          camp!.center.z - zone.graveyard.z,
        );
        expect(toGrave - camp!.radius, `${spec.id} camps on a graveyard`).toBeGreaterThan(20);
      }
    }
  });

  it('never overlaps another camp of a different mob', () => {
    for (const wild of WILDS) {
      for (const other of CAMPS) {
        if (other === wild || other.mobId === wild.mobId) continue;
        const d = Math.hypot(other.center.x - wild.center.x, other.center.z - wild.center.z);
        expect(
          d,
          `${wild.mobId} spawn ring overlaps ${other.mobId} at (${other.center.x},${other.center.z})`,
        ).toBeGreaterThan(wild.radius + other.radius);
      }
    }
  });

  it('stays inside the world strip', () => {
    for (const camp of WILDS) {
      expect(Math.abs(camp.center.x) + camp.radius, camp.mobId).toBeLessThan(180);
    }
  });
});

// ---------------------------------------------------------------------------
describe('pool-bodied beasts: presentation wiring', () => {
  it('resolves an English name through the world entity table', () => {
    for (const spec of NEW_BEASTS) {
      const rendered = tEntity({ kind: 'mob', id: spec.id, field: 'name' });
      expect(rendered, spec.id).toBe(spec.name);
      expect(rendered, spec.id).not.toContain('entities.mobs');
    }
  });

  it('ships a committed target portrait for every new template', () => {
    for (const spec of NEW_BEASTS) {
      const file = resolve(process.cwd(), `public/ui/mobs/${spec.id}.webp`);
      expect(existsSync(file), `missing portrait ${spec.id}.webp`).toBe(true);
    }
  });
});
