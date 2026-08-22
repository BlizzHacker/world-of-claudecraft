import { describe, expect, it } from 'vitest';
import {
  isPermanentlyRejectedRealmBodyFile,
  PERMANENTLY_REJECTED_REALM_BODY_FILES,
  PERMANENTLY_REJECTED_REALM_BODY_SOURCE_IDS,
  publishableRealmAssetCandidates,
} from '../scripts/realm_assets/catalog_policy.mjs';
import { isSelectableBody } from '../src/render/characters/body_shape_gate';
import {
  overrideVisualKeyForEntity,
  setBodyOverrides,
  VISUALS,
  visualKeyForCharacter,
} from '../src/render/characters/manifest';
import {
  GENERATED_REALM_BODIES,
  GENERATED_VISUALS,
} from '../src/render/characters/manifest.generated';
import { setActiveRealmForOffline } from '../src/sim/realms/registry';
import type { Entity } from '../src/sim/types';

/**
 * The rejections whose removal would be a real product regression, not the
 * whole ban list.
 *
 * The full set is long and grows with each render audit, so pinning it by copy
 * would be a second source of truth that rots. These are the load-bearing ones:
 * the four original motion-sheet rejects with every byte-identical alias, the
 * two village elders behind the operator's "NPC heads too wide" report, and the
 * content and third-party-likeness bodies from the 2026-08-21 reachable-asset
 * audit. Deleting any row here puts that asset back in front of a player.
 */
const REJECTED_FILES = [
  'realm_crypticrealm_realistic_humanoid_assassin_cyberpunk_01942e6a.glb',
  'realm_crypticrealm_realistic_humanoid_assassin_wearing_01942e8f.glb',
  'realm_infernal_cipher_assassin_hooded_red_01942e8f.glb',
  'realm_crypticrealm_town_guard_leather_veteran_male_019880da.glb',
  'realm_classic_warrior_elder_019880da.glb',
  'realm_crypticrealm_town_guard_red_livery_male_019644f7.glb',
  'realm_classic_warrior_fury_characters_019644f7.glb',
  'realm_crypticrealm_village_elder_white_robe_019521ee.glb',
  'realm_crypticrealm_village_elder_brown_robe_01952165.glb',
  'realm_infernal_village_elder_brown_robe_01952165.glb',
  'realm_classic_soccer_savior_019b65fb.glb',
  'realm_classic_perfect_rig_symmetrical_01945b0c.glb',
  'realm_infernal_cybernetic_ghoul_cyberpunk_ghoul_0198816e.glb',
  'realm_infernal_small_twisted_demon_fetus_01956c18.glb',
  'realm_dominion_cyber_pirate_overlord_characters_0196e657.glb',
  'realm_infernal_fairy_demon_fairy_albino_0195e7b8.glb',
  'realm_infernal_most_beatifull_female_blond_019875df.glb',
  'realm_fps_scarred_pugilist_dress_as_0193d788.glb',
  'realm_fps_valentine_beautiful_girl_blowing_0195017e.glb',
  'realm_arcane_elder_arcane_council_characters_0196ee9b.glb',
  'realm_classic_game_figure_mortal_kombat_0195a9f8.glb',
  'realm_fps_obese_mortal_combat_019538cf.glb',
  'realm_fps_obese_mortal_combat_019538ff.glb',
  'realm_fps_ninja_gaiden_pose_characters_01946143.glb',
  'realm_fps_captain_spaulding_characters_01944c28.glb',
  'realm_fps_near_future_soldier_robust_01948be9.glb',
  'realm_infernal_eddie_somewhere_time_appears_0193ea76.glb',
  'realm_crypticrealm_realistic_humanoid_assassin_wearing_01938289.glb',
] as const;

const REJECTED_KEYS = REJECTED_FILES.map((file) => file.replace(/\.glb$/, ''));
const ENTITIES = [
  { kind: 'npc', templateId: 'the_merchant' },
  { kind: 'mob', templateId: 'vale_bandit' },
] as const;
const REJECTED_SOURCE_IDS = [
  '019880da-3110-7b71-80e0-e1b475581cdb',
  '019644f7-9478-78b6-a821-0a3fcf9cf092',
  '01942e6a-021f-77ed-bf87-e3ace4529d9b',
  '01942e8f-9f8d-77ee-aaeb-32e60a6ac826',
] as const;

describe('permanently rejected character assets', () => {
  it('records every load-bearing rejection and every known byte-identical alias', () => {
    const banned = new Set(PERMANENTLY_REJECTED_REALM_BODY_FILES);
    for (const file of REJECTED_FILES) {
      expect(banned.has(file), `${file} missing from the catalog ban`).toBe(true);
      expect(isPermanentlyRejectedRealmBodyFile(file), file).toBe(true);
      expect(isPermanentlyRejectedRealmBodyFile(`/mounted/source/${file}`), file).toBe(true);
    }
    expect([...PERMANENTLY_REJECTED_REALM_BODY_SOURCE_IDS].sort()).toEqual(
      [...REJECTED_SOURCE_IDS].sort(),
    );
    // A file that is not banned must not be swept up by a prefix or id match.
    // sharkhorse_019644f7 shares its timestamp prefix with a rejected guard and
    // is the reason the source ids above are full UUIDs.
    expect(isPermanentlyRejectedRealmBodyFile('sharkhorse_019644f7.glb')).toBe(false);
    expect(isPermanentlyRejectedRealmBodyFile('realm_crypticrealm_rune_warden.glb')).toBe(false);
  });

  it('keeps the rejected bodies out of both generated artifacts and runtime selection', () => {
    const pooled = new Set(Object.values(GENERATED_REALM_BODIES).flat());
    for (const key of REJECTED_KEYS) {
      expect(GENERATED_VISUALS[key], `${key} generated registry`).toBeUndefined();
      expect(pooled.has(key), `${key} generated pool`).toBe(false);
      expect(VISUALS[key], `${key} runtime registry`).toBeUndefined();
      expect(isSelectableBody(key), `${key} selectable`).toBe(false);
    }
  });

  // The override path is the one route a de-registration does NOT close.
  // registerOverrideVisual synthesizes an `override_<hash>` def for any URL the
  // manifest does not know, so dropping the entry alone would have RE-ENABLED
  // the file through a generic def. The audit found the white hooded assassin
  // reaching a player class card exactly that way.
  it('refuses a published override that names a rejected file, on every surface', () => {
    const REALM = 'infernal';
    const rejectedUrl =
      '/cr-realms/crypticrealm/realm_crypticrealm_realistic_humanoid_assassin_wearing_01938289.glb';
    const allowedUrl = '/cr-realms/infernal/test_override_control_body.glb';
    setActiveRealmForOffline(REALM);

    // POSITIVE CONTROL FIRST. overrideVisualKeyForEntity resolves against the
    // ACTIVE realm, so without this arm the assertions below would pass on a
    // null override and prove nothing at all.
    setBodyOverrides(REALM, {
      'class:rogue': { assetUrl: allowedUrl },
      'npc:the_merchant': { assetUrl: allowedUrl },
      'mob:vale_bandit': { assetUrl: allowedUrl },
    });
    expect(VISUALS[visualKeyForCharacter({ realm: REALM, cls: 'rogue' })]?.url).toBe(allowedUrl);
    for (const entity of ENTITIES) {
      const key = overrideVisualKeyForEntity(entity as unknown as Entity);
      expect(key, `${entity.kind} control`).not.toBeNull();
      expect(VISUALS[key as string]?.url, `${entity.kind} control`).toBe(allowedUrl);
    }

    setBodyOverrides(REALM, {
      'class:rogue': { assetUrl: rejectedUrl },
      'npc:the_merchant': { assetUrl: rejectedUrl },
      'mob:vale_bandit': { assetUrl: rejectedUrl },
    });
    expect(VISUALS[visualKeyForCharacter({ realm: REALM, cls: 'rogue' })]?.url, 'roster').not.toBe(
      rejectedUrl,
    );
    for (const entity of ENTITIES) {
      // Null is the right answer here: the entity falls through to its compiled
      // body instead of registering an `override_<hash>` def for the same file.
      expect(overrideVisualKeyForEntity(entity as unknown as Entity), entity.kind).toBeNull();
    }

    setBodyOverrides(REALM, {});
    setActiveRealmForOffline(null);
  });

  // The 2D surfaces used to run a weaker chain than the world, so a body
  // visualKeyFor already refused could still be painted on a roster row.
  it('runs the shape gate on the 2D character surfaces too', () => {
    const key = visualKeyForCharacter({
      realm: 'infernal',
      cls: 'rogue',
      visualKey: 'realm_crypticrealm_realistic_humanoid_assassin_wearing_01938289',
    });
    expect(isSelectableBody(key)).toBe(true);
    expect(key).not.toBe('realm_crypticrealm_realistic_humanoid_assassin_wearing_01938289');
  });

  it('blocks source, output, and alias names without rejecting unrelated shared ids', () => {
    const rejected = REJECTED_FILES.map((file) => ({
      realmId: file.includes('_infernal_')
        ? 'infernal'
        : file.includes('_classic_')
          ? 'classic'
          : 'crypticrealm',
      sourceName: file,
      outputName: file,
      sourcePath: `/library/${file}`,
    }));
    const safe = {
      realmId: 'crypticrealm',
      sourceName: 'sharkhorse_019644f7.glb',
      outputName: 'sharkhorse_019644f7.glb',
      sourcePath: '/library/sharkhorse_019644f7.glb',
    };
    const rawRejected = REJECTED_SOURCE_IDS.map((id) => ({
      realmId: 'crypticrealm',
      sourceName: `${id}__model.glb`,
      sourcePath: `/PICKTURA/glb/${id}__model.glb`,
    }));
    expect(publishableRealmAssetCandidates([...rejected, ...rawRejected, safe])).toEqual([safe]);
  });
});
