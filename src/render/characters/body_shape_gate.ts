/**
 * THE gate that decides whether a GLB is allowed to stand in for a person.
 *
 * 2026-08-17: the operator found a wall ornament and a monster head walking the
 * Infernal streets as NPCs. Neither was a rigging accident — both were legally
 * reachable, because nothing between the asset store and {@link visualKeyFor}
 * ever asserted "this file is a character body":
 *
 *   1. scripts/realm_assets/emit_manifest.mjs builds the per-realm body pools by
 *      SCANNING THE STAGING DIRECTORY (`readdirSync(join(STAGING, realm))`) and
 *      keeping every `realm_*.glb` that is not in rejects.json. Its only other
 *      filter is a REGEX ON THE FILENAME (`ARMED`), and filenames here are known
 *      to lie — the ip_rename pass laundered them, which is why
 *      body_catalog/catalog.json carries a `namesAreNotTruth` field.
 *   2. scripts/realm_assets/humanoid_gate.mjs, the one component that CAN judge
 *      shape, is imported only by rig_batch.mjs and the one-off purge scripts.
 *      It never ran at emit time and never ran at runtime, so any asset that
 *      reached the store by another route (a repair pass, a re-stage, a hand
 *      copy) was never measured at all.
 *   3. manifest.ts then asserted the opposite — "Every generated body passed a
 *      humanoid shape gate" — on the comment above GENERATED_POOL_FAMILIES.
 *      That claim was never true.
 *   4. Hand-authored rotations (OPPONENT_KEYS, the family fallbacks) can name a
 *      prop directly, and one does: `hellmaw_cursed_knight_body` is a heraldic
 *      dragon-face SHIELD with no body on it, and it bodied 18 mob templates
 *      across Infernal and Cryptic Realm.
 *
 * So the gate lives HERE, at the one place every path converges, and it is
 * deny-by-default for the assets we have proven are not people. A numeric rig
 * check cannot do this job on its own — mass_rig binds any mesh to the 23-joint
 * reference skeleton and the result reports 23 joints, 22 clips and sane weights
 * whether it is a man or a plaque (humanoid_gate.mjs says as much in its own
 * header). Shape and eyes decide; this module is where that decision is recorded
 * so the renderer can enforce it.
 */

import { isPermanentlyRejectedRealmBodyKey } from '../../../scripts/realm_assets/catalog_policy.mjs';

/**
 * Assets proven NOT to be character bodies, by rendering them and looking.
 *
 * Every key here was rendered through the game's own preview harness
 * (scripts/rigshot/rigshot.html via body_catalog/bin/bodysheet.mjs) and read
 * cell by cell. The note on each one is what the render shows, not what the
 * filename claims.
 *
 * A key in this set can never be returned by {@link visualKeyFor}, from ANY
 * path — pool draw, family fallback, hand-authored rotation, or an operator
 * override that predates this gate.
 */
export const NON_BODY_ASSET_KEYS: ReadonlySet<string> = new Set([
  // A heraldic wall shield: dragon face, glowing eyes, flaming mouth, no torso,
  // no limbs, no head above it. The operator's words for it were "the asset
  // currently being used for the Deeprock Digger is a wall ornament".
  'hellmaw_cursed_knight_body',
  // A yellow-green blobby maw with purple eye-pits and no limbs. Reached
  // mob:fisher_bram through the generated pool. "fisher bram is a random
  // monster?" — yes, and not even a whole one.
  'realm_infernal_colossal_guardians_abyss_charact_019bc2d0',
  // Sibling of the above from the same generation batch, same silhouette.
  'realm_infernal_colossal_guardians_abyss_charact_019bc320',
  // A giant floating face with vestigial limbs, live as mob Gravecaller Mender.
  'realm_infernal_muscular_demon_battle_worn_01946207',

  // --- 2026-08-21 reachable-asset audit --------------------------------------
  // 610 reachable bodies were rendered through the deployed resolver and read.
  // Everything below is pool-reachable and is not a person, so it is denied
  // HERE rather than in the catalog: the files are intact and may still serve
  // as props or creatures, they simply may never stand in for someone.
  //
  // Busts: head and shoulders only, no torso, arms or legs.
  'realm_arcane_ethereal_guardian_01946212',
  'realm_arcane_ethereal_guardian_01946222',
  'realm_arcane_ethereal_guardian_01946224',
  'realm_arcane_ethereal_guardian_01946226',
  'realm_arcane_ethereal_guardian_0194622a',
  'realm_arcane_ethereal_guardian_0194666a',
  'realm_arcane_ethereal_sentinel_characters_0195fc6b',
  'realm_arcane_ethereal_sentinel_characters_0195fc71',
  'realm_classic_dwarven_warbeard_019d4441',
  'realm_classic_excited_elf_christmas2025_elf_019b31ee',
  'realm_classic_orc_sentinel_characters_01968737',
  'realm_classic_orc_sentinel_characters_0196873a',
  'realm_dominion_eternal_automaton_robot_automato_019bb8d9',
  'realm_infernal_ethereal_demon_portrait_0194e62d',
  // Disembodied heads and skulls, no body under them.
  'realm_classic_alien_predatory_wrath_alien_01942788',
  'realm_infernal_demon_head_open_mouth_019580ea',
  'realm_infernal_infernal_majesty_characters_01966daa',
  // Wall ornaments and mounted plaques: the same object class as the gated
  // hellmaw_cursed_knight_body above.
  'realm_classic_goblin_boss_head_warhost_01956cfa',
  'realm_infernal_sentinel_abyss_armor_characters_01974158',
  'realm_infernal_skull_sovereign_fantasy_skull_019be2ad',
  // Skull statues standing on their own stone pedestals.
  'realm_infernal_infernal_majesty_characters_01964448',
  // Disembodied clawed hands: weapon gloves with nothing attached to them.
  'realm_arcane_weapon_glove_claws_similar_0194ad34',
  'realm_arcane_weapon_glove_claws_similar_0194ad37',
  // Inanimate props: a crystal shard and a biomechanical column.
  'realm_classic_sorcerer_prison_019aa462',
  'realm_dominion_empress_circuits_empress_circuit_019eacec',
  // Sculptures and machines mounted on a base, with no usable limbs.
  'realm_classic_alien_empress_01945791',
  'realm_dominion_buzz_boxer_bot_characters_01976edf',
  // Multi-object scenes (a mounted rider, two detached figures) served as ONE
  // character body, so the extra objects trail the entity through the world.
  'realm_dominion_unexpected_encounter_scifi_fanta_019b99c3',
  'realm_infernal_dreadful_knight_abyss_characters_0197a322',
  // Animals sitting in the HUMANOID pool, where the draw can hand one to a
  // hostile humanoid mob. Perfectly good creatures, not people.
  'realm_classic_pirate_seagull_0198f45d',
  'realm_infernal_chicken_01940e27',
  'realm_infernal_fat_angry_cat_mafia_0194af78',
  'realm_infernal_frog_dress_car_mechanic_01947aff5615',
  'realm_infernal_stars_stripes_pigeon_019f18a1',
]);

/** True when `key` may stand in for a person. */
export function isSelectableBody(key: string | null | undefined): boolean {
  return !!key && !NON_BODY_ASSET_KEYS.has(key) && !isPermanentlyRejectedRealmBodyKey(key);
}

/** FNV-1a, duplicated from manifest.ts so pool selection stays deterministic. */
function fnv1a(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Pick one body from `pool` for `seed`, skipping anything the gate rejects.
 *
 * Rendezvous (highest-random-weight) hashing, NOT `hash % pool.length`. The
 * modulo form re-rolled EVERY template in a realm whenever the pool changed
 * size, because the modulus moved — and the pool's size is decided by how many
 * files happen to be sitting in a staging directory. Adding or quarantining one
 * asset re-bodied the whole town. infernal_roster.ts already switched its own
 * rotation to rendezvous for exactly this reason and documents the arithmetic;
 * this is the same fix applied to the generated pool, which is far larger and
 * changes far more often.
 *
 * Under rendezvous, removing a key only re-rolls the templates that were using
 * it. So gating a prop out of the pool moves the templates that were wearing
 * the prop and nobody else.
 */
export function selectBodyFromPool(
  pool: readonly string[] | undefined,
  seed: string,
): string | null {
  if (!pool || pool.length === 0) return null;
  let best: string | null = null;
  let bestScore = -1;
  for (const key of pool) {
    if (!isSelectableBody(key)) continue;
    const score = fnv1a(`${seed}\u0000${key}`);
    if (score > bestScore || (score === bestScore && best !== null && key < best)) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}
