/**
 * Runtime/ArcForge publication policy for realm asset candidates.
 *
 * These files remain in some operator source stores for forensic recovery, but
 * the full motion-sheet review rejected every one of them. Keeping the policy
 * at the catalog boundary prevents a normal assets:realms rebuild from making
 * them selectable again merely because a source drive is mounted.
 */
export const RETIRED_INFERNAL_CLASS_FILES = new Set([
  'infernal_class_warrior.glb',
  'infernal_class_rogue.glb',
  'infernal_class_sorcerer.glb',
  'infernal_class_amazon.glb',
  'infernal_class_barbarian.glb',
  'infernal_class_necromancer.glb',
  'infernal_class_paladin.glb',
  'infernal_class_druid.glb',
  'infernal_class_assassin.glb',
  'infernal_class_demon_hunter.glb',
  'infernal_class_monk.glb',
  'infernal_class_wizard.glb',
  'infernal_class_witch_doctor.glb',
  'infernal_class_crusader.glb',
  'infernal_class_spiritborn.glb',
  'infernal_class_warlock.glb',
  'infernal_class_blood_knight.glb',
  'infernal_class_tempest.glb',
]);

/**
 * Character models rejected after full motion-sheet review.
 *
 * This is filename-exact on purpose. Some generation ids were reused for
 * unrelated creatures, and those assets must not be collateral damage. The
 * Classic and Infernal names below are byte-identical aliases of the rejected
 * Cryptic Realm models, so every known alias is denied as well.
 */
export const PERMANENTLY_REJECTED_REALM_BODY_FILES = new Set([
  'realm_crypticrealm_realistic_humanoid_assassin_cyberpunk_01942e6a.glb',
  'realm_crypticrealm_realistic_humanoid_assassin_wearing_01942e8f.glb',
  'realm_infernal_cipher_assassin_hooded_red_01942e8f.glb',
  'realm_crypticrealm_town_guard_leather_veteran_male_019880da.glb',
  'realm_classic_warrior_elder_019880da.glb',
  'realm_crypticrealm_town_guard_red_livery_male_019644f7.glb',
  'realm_classic_warrior_fury_characters_019644f7.glb',

  // --- 2026-08-21 head diagnosis -------------------------------------------
  // The operator's "NPC heads too wide" is these two. Measured in the live
  // client: crown band 0.256 and 0.257 of figure height against 0.085 to 0.130
  // for every other body in the same civilian bank, so the head is 2x to 3x
  // oversized. Normalisation fits a body by TOTAL height, which ships the
  // oversized head at full size, and the Idle clip's head rotation smears that
  // mass another 28% wider. 26 of 104 NPC templates wore them, concentrated in
  // the login town. The infernal name is a byte-identical alias.
  'realm_crypticrealm_village_elder_white_robe_019521ee.glb',
  'realm_crypticrealm_village_elder_brown_robe_01952165.glb',
  'realm_infernal_village_elder_brown_robe_01952165.glb',

  // --- 2026-08-21 reachable-asset audit: content and third-party likeness ---
  // Highest priority of the audit. Every one was rendered and read.
  'realm_classic_soccer_savior_019b65fb.glb', // Jesus Christ on a soccer ball, serving as a hostile mob
  'realm_classic_perfect_rig_symmetrical_01945b0c.glb', // nude rig dummy with explicit anatomy
  'realm_infernal_cybernetic_ghoul_cyberpunk_ghoul_0198816e.glb', // nude figure with explicit anatomy
  'realm_infernal_small_twisted_demon_fetus_01956c18.glb', // fetus
  'realm_dominion_cyber_pirate_overlord_characters_0196e657.glb', // topless
  'realm_infernal_fairy_demon_fairy_albino_0195e7b8.glb', // topless
  'realm_infernal_most_beatifull_female_blond_019875df.glb', // topless
  'realm_fps_scarred_pugilist_dress_as_0193d788.glb', // child-coded figure in a hostile mob pool
  'realm_fps_valentine_beautiful_girl_blowing_0195017e.glb', // child-coded figure in a hostile mob pool
  'realm_infernal_monster_virus_evil_coronavirus_01989c27.glb', // coronavirus-themed monster
  'realm_arcane_elder_arcane_council_characters_0196ee9b.glb', // Yoda likeness
  'realm_classic_game_figure_mortal_kombat_0195a9f8.glb', // Mortal Kombat likeness
  'realm_fps_obese_mortal_combat_019538cf.glb', // Mortal Kombat likeness
  'realm_fps_obese_mortal_combat_019538ff.glb', // Mortal Kombat likeness
  'realm_fps_ninja_gaiden_pose_characters_01946143.glb', // Ryu Hayabusa likeness
  'realm_fps_captain_spaulding_characters_01944c28.glb', // Captain Spaulding likeness
  'realm_fps_near_future_soldier_robust_01948be9.glb', // Master Chief silhouette
  'realm_infernal_eddie_somewhere_time_appears_0193ea76.glb', // Iron Maiden 'Eddie'
  'realm_classic_cyclopean_warrior_giant_warrior_019ac6ac.glb', // Thanos-like giant
  'realm_classic_cyberbear_athlete_01974b12.glb', // three-stripe sportswear trademark
  // The white hooded assassin. Reachable as a PLAYER CLASS body through a
  // published ArcForge override, which is why the override read below denies
  // it by filename as well as dropping it from the registry.
  'realm_crypticrealm_realistic_humanoid_assassin_wearing_01938289.glb',

  // --- 2026-08-21 reachable-asset audit: broken art ------------------------
  'realm_fps_albino_caveman_incredible_muscle_0193bba3.glb', // no head on the body
  'realm_fps_albino_caveman_incredible_muscle_0193bbad.glb', // no head on the body
  'realm_infernal_jafaime_thin_monstrous_purple_0198f8f6.glb', // no head on the body
  'realm_fps_contemplative_hero_characters_0195f45f.glb', // half body, cut off at the waist
  'realm_classic_dwarf_t_pose_chain_01938385.glb', // head rotated 90 degrees off-axis in bind
  'realm_classic_dwarf_t_pose_chain_01938388.glb', // head rotated 90 degrees off-axis in bind
  'realm_fps_design_featuring_figure_black_0193fb82.glb', // head sliced flat and capped
  'realm_infernal_women_masterpiece_lowpoly_myster_01957697.glb', // head sliced flat and capped
  'realm_classic_hildegard_019c2dce.glb', // paper-flat body, stick arms, no hands, oversized head
  'realm_classic_crimson_skullbound_warrior_019f5cbd.glb', // ships with no texture at all
  'realm_classic_male_monster_warrior_made_0194566f.glb', // ships with no texture at all
  'realm_infernal_nosferatu_shadow_sketchto3d_mons_019834ac.glb', // ships with no texture at all
  'realm_infernal_highly_muscular_albino_devil_0193e9b2.glb', // Sister Nhalia's body: plinth baked into the mesh
  'realm_infernal_malevolent_majesty_fantasy_creat_019bb848.glb', // skull statue on a pedestal, reached by override
  // --- 2026-08-21 civilian bank review -------------------------------------
  // The operator failed both of these on sight, and the store sweep (3,784
  // store plus 3,631 staging GLBs, 71 rendered at head zoom) found the rigged
  // humanoids split into two tiers with nothing between them: 23-joint mass_rig
  // at 4,500 to 11,000 triangles, and 24-joint meshy24 at roughly 51,000. Every
  // body he has failed is in the first tier, every body he passed is in the
  // second, four for four in each direction. These two are 5,020 and 7,496.
  //
  // The craftsman is the one worth recording, because the obvious repair does
  // not work: the store copy is ALREADY smooth-shaded. Grouping its vertices by
  // exact stored position gives 2,176 multi-vertex groups whose mean maximum
  // internal normal angle is 0.00 degrees, so flat shading was never the fault.
  // Re-running smooth_normals.mjs rewrites the NORMAL accessor and changes the
  // render not at all. At 5,020 triangles for a whole body the crown is a
  // chamfered polygon in silhouette, and no normal edit adds silhouette
  // resolution.
  'realm_crypticrealm_craftsman_warrior_monk_019ee5e1.glb',
  'realm_crypticrealm_town_guard_female_armored_019875c0.glb',
  // A not-a-person the first audit missed: rigged, 9,715 triangles, and renders
  // as an empty red coat with no head inside it.
  'realm_classic_humanoid_upper_santa_claus_0193a19d.glb',

  // The shredded creature-pool bodies. Their store leaf name is not their
  // registry key (see REJECTED_REALM_BODY_KEYS below), so both forms are named.
  'dusk_fiend_019b3419.glb',
  'armored_majesty_019bc46b.glb',
  'ironbound_war_elephant_019ef095.glb',
  'behemoth_roar_019b8b3a.glb',
  'crimson_bloom_behemoth_019ca160.glb',
  'zombear_rampage_019c1c1c.glb',
]);

/**
 * Rejected bodies whose RUNTIME KEY is not their GLB leaf name.
 *
 * The generated creature pool nests its bodies under
 * `<realm>/creatures/<leaf>.glb` but registers them as `realm_<realm>_<leaf>`,
 * so the filename ban above reaches the pipeline and never reaches the
 * registry. Naming the key here closes that half. One leaf can also carry two
 * keys: dusk_fiend_019b3419.glb was staged into both Cryptic Realm and
 * Infernal and both copies are shredded.
 */
export const REJECTED_REALM_BODY_KEYS = new Set([
  'realm_crypticrealm_dusk_fiend_019b3419',
  'realm_infernal_dusk_fiend_019b3419',
  'realm_fps_armored_majesty_019bc46b',
  'realm_fps_ironbound_war_elephant_019ef095',
  'realm_infernal_behemoth_roar_019b8b3a',
  'realm_infernal_crimson_bloom_behemoth_019ca160',
  'realm_infernal_zombear_rampage_019c1c1c',
]);

export const PERMANENTLY_REJECTED_REALM_BODY_KEYS = new Set([
  ...[...PERMANENTLY_REJECTED_REALM_BODY_FILES].map((file) => file.replace(/\.glb$/i, '')),
  ...REJECTED_REALM_BODY_KEYS,
]);

/** Raw PICKTURA result ids for the same rejected models. Full UUIDs are used
 * because the short timestamp prefix is not unique (019644f7 also identifies
 * a valid Sharkhorse asset that must remain publishable). */
export const PERMANENTLY_REJECTED_REALM_BODY_SOURCE_IDS = new Set([
  '019880da-3110-7b71-80e0-e1b475581cdb', // Warrior Elder / leather guard
  '019644f7-9478-78b6-a821-0a3fcf9cf092', // Warrior Fury / red guard
  '01942e6a-021f-77ed-bf87-e3ace4529d9b', // cyberpunk assassin
  '01942e8f-9f8d-77ee-aaeb-32e60a6ac826', // occult assassin
]);

function leafName(value) {
  return String(value ?? '')
    .replaceAll('\\', '/')
    .split('/')
    .pop()
    .toLowerCase();
}

export function isPermanentlyRejectedRealmBodyFile(value) {
  return PERMANENTLY_REJECTED_REALM_BODY_FILES.has(leafName(value));
}

export function isPermanentlyRejectedRealmBodyKey(value) {
  return PERMANENTLY_REJECTED_REALM_BODY_KEYS.has(String(value ?? '').toLowerCase());
}

export function hasPermanentlyRejectedRealmBodySourceId(value) {
  const text = String(value ?? '').toLowerCase();
  return [...PERMANENTLY_REJECTED_REALM_BODY_SOURCE_IDS].some((id) => text.includes(id));
}

export function isPublishableRealmAssetCandidate(candidate) {
  if (
    isPermanentlyRejectedRealmBodyFile(candidate.outputName) ||
    isPermanentlyRejectedRealmBodyFile(candidate.sourceName) ||
    isPermanentlyRejectedRealmBodyFile(candidate.sourcePath) ||
    hasPermanentlyRejectedRealmBodySourceId(candidate.outputName) ||
    hasPermanentlyRejectedRealmBodySourceId(candidate.sourceName) ||
    hasPermanentlyRejectedRealmBodySourceId(candidate.sourcePath)
  ) {
    return false;
  }
  if (candidate.realmId !== 'infernal') return true;
  const file = leafName(candidate.outputName ?? candidate.sourceName);
  return !RETIRED_INFERNAL_CLASS_FILES.has(file);
}

export function publishableRealmAssetCandidates(candidates) {
  return candidates.filter(isPublishableRealmAssetCandidate);
}
