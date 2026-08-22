// A wall ornament and a monster head walked the live Infernal streets as NPCs
// on 2026-08-17. These pin the gate that makes that unreachable, so the next
// pipeline run or hand-authored rotation cannot put a prop back on a person.

import { describe, expect, it } from 'vitest';
import {
  isSelectableBody,
  NON_BODY_ASSET_KEYS,
  selectBodyFromPool,
} from '../src/render/characters/body_shape_gate';
import { setBodyOverrides, VISUALS, visualKeyFor } from '../src/render/characters/manifest';
import { MOBS, NPCS } from '../src/sim/data';
import { setActiveRealmForOffline } from '../src/sim/realms/registry';
import type { RealmId } from '../src/sim/realms/types';
import type { Entity } from '../src/sim/types';

// The three assets that were reached and rendered as characters. Each was
// rendered through the game's own preview harness and read cell by cell before
// it was listed; the notes are in body_shape_gate.ts.
const PROVEN_PROPS = [
  'hellmaw_cursed_knight_body', // heraldic dragon-face shield, no body on it
  'realm_infernal_colossal_guardians_abyss_charact_019bc2d0', // limbless maw
  'realm_infernal_colossal_guardians_abyss_charact_019bc320',
  // The 2026-08-21 reachable-asset audit, one per shape it found.
  'realm_infernal_muscular_demon_battle_worn_01946207', // giant floating face
  'realm_arcane_ethereal_guardian_01946212', // bust, no torso or limbs
  'realm_arcane_weapon_glove_claws_similar_0194ad34', // disembodied clawed hand
  'realm_classic_alien_predatory_wrath_alien_01942788', // disembodied skull
  'realm_classic_goblin_boss_head_warhost_01956cfa', // mounted wall plaque
  'realm_infernal_infernal_majesty_characters_01964448', // skull statue on a pedestal
  'realm_classic_sorcerer_prison_019aa462', // crystal shard, an inanimate prop
  'realm_dominion_unexpected_encounter_scifi_fanta_019b99c3', // a whole multi-object scene
  'realm_infernal_chicken_01940e27', // an animal sitting in the HUMANOID pool
];

const GATED_REALMS = ['infernal', 'crypticrealm'] as const;

describe('non-body asset gate', () => {
  it('names every proven prop', () => {
    for (const key of PROVEN_PROPS) expect(NON_BODY_ASSET_KEYS.has(key)).toBe(true);
  });

  it('refuses the props and accepts an ordinary body', () => {
    for (const key of PROVEN_PROPS) expect(isSelectableBody(key)).toBe(false);
    expect(isSelectableBody('realm_classic_warrior_north_character_warrior_019be231')).toBe(true);
    expect(isSelectableBody(null)).toBe(false);
    expect(isSelectableBody(undefined)).toBe(false);
  });

  it('never draws a prop out of a pool, even a pool made only of props', () => {
    expect(selectBodyFromPool(PROVEN_PROPS, 'infernal:humanoid:anything')).toBeNull();
    const mixed = [...PROVEN_PROPS, 'realm_classic_warrior_north_character_warrior_019be231'];
    for (let i = 0; i < 200; i++) {
      expect(selectBodyFromPool(mixed, `seed-${i}`)).toBe(
        'realm_classic_warrior_north_character_warrior_019be231',
      );
    }
  });

  // The fault this replaced: `pool[stableHash(seed) % pool.length]` moved every
  // template in the realm the moment the pool changed size, and the pool's size
  // is decided by how many files are sitting in a staging directory. Under
  // rendezvous hashing, growing the pool may only move a template ONTO the new
  // key — it can never shuffle the templates that did not pick it.
  it('growing the pool only moves templates onto the added body', () => {
    const before = ['body_a', 'body_b', 'body_c', 'body_d'];
    const after = [...before, 'body_e'];
    let moved = 0;
    for (let i = 0; i < 500; i++) {
      const seed = `infernal:humanoid:t${i}`;
      const a = selectBodyFromPool(before, seed);
      const b = selectBodyFromPool(after, seed);
      if (a !== b) {
        moved++;
        expect(b).toBe('body_e');
      }
    }
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThan(500);
  });

  // The end-to-end pin: no template on either authored realm may render as one
  // of these files, by ANY route — pool draw, family fallback, hand-authored
  // rotation, or a published override made before the gate existed.
  it('no NPC or mob template on an authored realm resolves to a prop', () => {
    for (const realm of GATED_REALMS) {
      setActiveRealmForOffline(realm as RealmId);
      // An override naming a prop must not win either: the operator published
      // some of these before anyone knew what the files were.
      setBodyOverrides(realm, {
        'npc:the_merchant': {
          assetUrl:
            '/cr-realms/infernal/meshy_ai_cursed_knight_s_iro_0616234359_texture_abda8208.glb',
        },
      });
      for (const id of Object.keys(NPCS)) {
        const key = visualKeyFor({
          kind: 'npc',
          templateId: id,
        } as unknown as Entity);
        expect(NON_BODY_ASSET_KEYS.has(key), `npc:${id} on ${realm} -> ${key}`).toBe(false);
        expect(VISUALS[key], `npc:${id} on ${realm} -> ${key} is unregistered`).toBeDefined();
      }
      for (const id of Object.keys(MOBS)) {
        const key = visualKeyFor({
          kind: 'mob',
          templateId: id,
        } as unknown as Entity);
        expect(NON_BODY_ASSET_KEYS.has(key), `mob:${id} on ${realm} -> ${key}`).toBe(false);
        expect(VISUALS[key], `mob:${id} on ${realm} -> ${key} is unregistered`).toBeDefined();
      }
      setBodyOverrides(realm, {});
    }
    setActiveRealmForOffline(null);
  });
});
