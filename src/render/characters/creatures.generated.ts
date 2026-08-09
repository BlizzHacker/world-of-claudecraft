// GENERATED FILE - DO NOT EDIT BY HAND.
// Produced by scripts/realm_assets/emit_creatures.mjs from the shipped
// quadruped manifest. Re-run the pipeline to regenerate; hand edits will be lost.
//
// The first non-humanoid rig family in this engine. Every body here was bound
// onto the SHIPPED wolf donor skeleton (public/models/creatures/wolf_basic.glb,
// the "Dog_Animation" quadruped rig) by scripts/realm_assets/quad_rig.mjs, so
// each one carries that rig's 14 clips baked in. Nothing retargets at runtime —
// SkeletonUtils is only ever used here as `clone` — which is exactly why the
// clips have to travel inside the GLB.
//
// These are creature bodies: no handslot bones, no weapon sockets, no tint.
// Unlike the humanoid pool (manifest.generated.ts) which tints per entity to
// stop a shared body reading as clones, every mesh here ships its own baked
// texture and is visually distinct already; tinting would only mute it, which is
// why greyjaw — the other custom-baked wolf — carries no tint either.

import type { ClipMap, VisualDef } from './manifest';

const REALM_MODELS = '/cr-realms';

/** The donor rig's own clip vocabulary. Mirrors manifest.ts's private
 *  WOLF_BAKED: the Quaternius animal() core plus the donor's Sit/Fall, with
 *  Walk doubling as the swim base (a paddling gait at the gentle clip pitch
 *  beats the steep procedural prone on a quadruped). */
const QUADRUPED_BAKED: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Gallop',
  attack: ['Attack'],
  hit: ['Idle_HitReact_Left', 'Idle_HitReact_Right'],
  death: 'Death',
  sitIdle: 'Sit',
  swim: 'Walk',
  jump: 'Fall',
};

export const GENERATED_CREATURE_VISUALS: Record<string, VisualDef> = {
  // white ram/antelope with big curved horns, clean quadruped
  realm_arcane_creature_has_quadruped_but_0193df4d: {
    url: `${REALM_MODELS}/arcane/creatures/creature_has_quadruped_but_0193df4d.glb`,
    height: 1.8,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // black ram, colour variant of 0193df4d
  realm_arcane_creature_has_quadruped_but_0193df71: {
    url: `${REALM_MODELS}/arcane/creatures/creature_has_quadruped_but_0193df71.glb`,
    height: 1.8,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // saddled war horse, clean quadruped, prime rig candidate
  realm_arcane_mystic_war_steed_0197b1c0: {
    url: `${REALM_MODELS}/arcane/creatures/mystic_war_steed_0197b1c0.glb`,
    height: 2.4,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // armored bear with saddle, clean quadruped
  realm_claudecraft_resembles_robust_armored_bear_01981e51: {
    url: `${REALM_MODELS}/claudecraft/creatures/resembles_robust_armored_bear_01981e51.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // albino direwolf, clean canine quadruped, fits existing mob_wolf family
  realm_crypticrealm_albino_direwolf_01961261: {
    url: `${REALM_MODELS}/crypticrealm/creatures/albino_direwolf_01961261.glb`,
    height: 1.8,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // polar bear with saddle and cargo panniers, clean quadruped
  realm_crypticrealm_dusk_fiend_019b3419: {
    url: `${REALM_MODELS}/crypticrealm/creatures/dusk_fiend_019b3419.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // realistic orange fox, excellent quadruped; matches existing mob_fox
  realm_crypticrealm_fox_01942ed4: {
    url: `${REALM_MODELS}/crypticrealm/creatures/fox_01942ed4.glb`,
    height: 1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // brown gorilla on all fours, clean ape quadruped
  realm_crypticrealm_gorilla_01947f6a: {
    url: `${REALM_MODELS}/crypticrealm/creatures/gorilla_01947f6a.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // white gorilla, family sibling
  realm_crypticrealm_gorilla_01947fab: {
    url: `${REALM_MODELS}/crypticrealm/creatures/gorilla_01947fab.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // ironbound armored warboar, heavy quadruped
  realm_crypticrealm_ironbound_warboar_019cb457: {
    url: `${REALM_MODELS}/crypticrealm/creatures/ironbound_warboar_019cb457.glb`,
    height: 2.4,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // crested drake, four limbs plus long tail, hunched quadruped
  realm_crypticrealm_shadow_drake_sentinel_019677a5: {
    url: `${REALM_MODELS}/crypticrealm/creatures/shadow_drake_sentinel_019677a5.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // shadow drake sibling of 019677a5
  realm_crypticrealm_shadow_drake_sentinel_019677ad: {
    url: `${REALM_MODELS}/crypticrealm/creatures/shadow_drake_sentinel_019677ad.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // white horse, clean equine quadruped
  realm_crypticrealm_sharkhorse_019644f7: {
    url: `${REALM_MODELS}/crypticrealm/creatures/sharkhorse_019644f7.glb`,
    height: 2.4,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // armored boar, clean quadruped, matches existing mob_boar family
  realm_fps_armored_boar_019cb448: {
    url: `${REALM_MODELS}/fps/creatures/armored_boar_019cb448.glb`,
    height: 1.8,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // armored rhino, clean heavy quadruped
  realm_fps_armored_majesty_019bc46b: {
    url: `${REALM_MODELS}/fps/creatures/armored_majesty_019bc46b.glb`,
    height: 2.4,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // armored frilled lizard, clean four-leg body plus tail
  realm_fps_extremely_frilled_dragon_lizard_0193e6b8: {
    url: `${REALM_MODELS}/fps/creatures/extremely_frilled_dragon_lizard_0193e6b8.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // ironbound war elephant, heavy armored quadruped
  realm_fps_ironbound_war_elephant_019ef095: {
    url: `${REALM_MODELS}/fps/creatures/ironbound_war_elephant_019ef095.glb`,
    height: 2.8,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // abyssal charger, armored horse, clean quadruped
  realm_infernal_abyssal_charger_0195ec8b: {
    url: `${REALM_MODELS}/infernal/creatures/abyssal_charger_0195ec8b.glb`,
    height: 2.4,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // blue armored charger horse, sibling of 0195ec8b
  realm_infernal_abyssal_charger_0195ec8d: {
    url: `${REALM_MODELS}/infernal/creatures/abyssal_charger_0195ec8d.glb`,
    height: 2.4,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // albino direwolf, clean canine quadruped, fits existing mob_wolf family
  realm_infernal_albino_direwolf_01961261: {
    url: `${REALM_MODELS}/infernal/creatures/albino_direwolf_01961261.glb`,
    height: 1.8,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // skeletal armored behemoth, four-legged
  realm_infernal_behemoth_roar_019b8b3a: {
    url: `${REALM_MODELS}/infernal/creatures/behemoth_roar_019b8b3a.glb`,
    height: 2.8,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // dark cerberus hellhound, clean quadruped
  realm_infernal_cerberus_massive_muscular_dog_01949471: {
    url: `${REALM_MODELS}/infernal/creatures/cerberus_massive_muscular_dog_01949471.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // red cerberus hellhound, sibling of 01949471
  realm_infernal_cerberus_massive_muscular_dog_01949472: {
    url: `${REALM_MODELS}/infernal/creatures/cerberus_massive_muscular_dog_01949472.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // spiked cragjaw devourer, four-legged saurian
  realm_infernal_cragjaw_devourer_019d737f: {
    url: `${REALM_MODELS}/infernal/creatures/cragjaw_devourer_019d737f.glb`,
    height: 1.8,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // dark ape-beast on all fours with red roses blooming from its back, striking
  realm_infernal_crimson_bloom_behemoth_019ca160: {
    url: `${REALM_MODELS}/infernal/creatures/crimson_bloom_behemoth_019ca160.glb`,
    height: 2.8,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // red armored charger horse
  realm_infernal_crimson_charger_0195ec9b: {
    url: `${REALM_MODELS}/infernal/creatures/crimson_charger_0195ec9b.glb`,
    height: 2.4,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // orange armored charger horse, sibling of 0195ec9b
  realm_infernal_crimson_charger_0195ec9e: {
    url: `${REALM_MODELS}/infernal/creatures/crimson_charger_0195ec9e.glb`,
    height: 2.4,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // small pink spiky chomper quadruped
  realm_infernal_crimson_chomper_019649c3: {
    url: `${REALM_MODELS}/infernal/creatures/crimson_chomper_019649c3.glb`,
    height: 1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // polar bear with saddle and cargo panniers, clean quadruped
  realm_infernal_dusk_fiend_019b3419: {
    url: `${REALM_MODELS}/infernal/creatures/dusk_fiend_019b3419.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // green and red leviathan beast on four limbs
  realm_infernal_emerald_leviathan_019f24be: {
    url: `${REALM_MODELS}/infernal/creatures/emerald_leviathan_019f24be.glb`,
    height: 2.8,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // pale gaunt feral alien on all fours
  realm_infernal_feral_alien_creature_carnivore_01945133: {
    url: `${REALM_MODELS}/infernal/creatures/feral_alien_creature_carnivore_01945133.glb`,
    height: 1.6,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // red skeletal feral alien quadruped
  realm_infernal_feral_alien_creature_carnivore_01945134: {
    url: `${REALM_MODELS}/infernal/creatures/feral_alien_creature_carnivore_01945134.glb`,
    height: 1.6,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // stylised fox with fire texture, clean canine quadruped
  realm_infernal_fox_01942ed0: {
    url: `${REALM_MODELS}/infernal/creatures/fox_01942ed0.glb`,
    height: 1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // realistic orange fox, excellent quadruped; matches existing mob_fox
  realm_infernal_fox_01942ed4: {
    url: `${REALM_MODELS}/infernal/creatures/fox_01942ed4.glb`,
    height: 1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // red gradient fox, sibling of 01942ed4
  realm_infernal_fox_01942ed5: {
    url: `${REALM_MODELS}/infernal/creatures/fox_01942ed5.glb`,
    height: 1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // brown gorilla on all fours, clean ape quadruped
  realm_infernal_gorilla_01947f6a: {
    url: `${REALM_MODELS}/infernal/creatures/gorilla_01947f6a.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // green-tinted gorilla, family sibling
  realm_infernal_gorilla_01947f6d: {
    url: `${REALM_MODELS}/infernal/creatures/gorilla_01947f6d.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // dark grey gorilla, family sibling
  realm_infernal_gorilla_01947f76: {
    url: `${REALM_MODELS}/infernal/creatures/gorilla_01947f76.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // white gorilla, family sibling
  realm_infernal_gorilla_01947fab: {
    url: `${REALM_MODELS}/infernal/creatures/gorilla_01947fab.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // pale grey gorilla, family sibling
  realm_infernal_gorilla_01947fb2: {
    url: `${REALM_MODELS}/infernal/creatures/gorilla_01947fb2.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // red armored infernal steed horse
  realm_infernal_infernal_steed_0198b3ae: {
    url: `${REALM_MODELS}/infernal/creatures/infernal_steed_0198b3ae.glb`,
    height: 2.4,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // glassy orange inferno rhino
  realm_infernal_inferno_rhino_019bc344: {
    url: `${REALM_MODELS}/infernal/creatures/inferno_rhino_019bc344.glb`,
    height: 2.4,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // ironbound armored warboar, heavy quadruped
  realm_infernal_ironbound_warboar_019cb457: {
    url: `${REALM_MODELS}/infernal/creatures/ironbound_warboar_019cb457.glb`,
    height: 2.4,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // mechanical elephant walker, four articulated legs
  realm_infernal_mechanical_elephant_sentinel_01966355: {
    url: `${REALM_MODELS}/infernal/creatures/mechanical_elephant_sentinel_01966355.glb`,
    height: 2.8,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // three-headed hellhound, clean quadruped; name field is wrong, mesh is a cerberus
  realm_infernal_muscular_anthropomorphic_rat_bodie_01949463: {
    url: `${REALM_MODELS}/infernal/creatures/muscular_anthropomorphic_rat_bodie_01949463.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // chrome pink and teal rhino, clean heavy quadruped
  realm_infernal_rino_019bc334: {
    url: `${REALM_MODELS}/infernal/creatures/rino_019bc334.glb`,
    height: 2.4,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // white horse, clean equine quadruped
  realm_infernal_sharkhorse_019644f7: {
    url: `${REALM_MODELS}/infernal/creatures/sharkhorse_019644f7.glb`,
    height: 2.4,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
  // zombie bear, clean quadruped with gore texture
  realm_infernal_zombear_rampage_019c1c1c: {
    url: `${REALM_MODELS}/infernal/creatures/zombear_rampage_019c1c1c.glb`,
    height: 2.1,
    clips: QUADRUPED_BAKED,
    lazyPreload: true,
  },
};

/** Per-realm rosters, ready to wire into beast-family spawn selection. Nothing
 *  reads this yet: registering the visuals is deliberately separate from
 *  changing which mob picks which body, so art can land without moving spawns. */
export const GENERATED_CREATURE_BODIES: Record<string, string[]> = {
  arcane: [
    'realm_arcane_creature_has_quadruped_but_0193df4d',
    'realm_arcane_creature_has_quadruped_but_0193df71',
    'realm_arcane_mystic_war_steed_0197b1c0',
  ],
  claudecraft: [
    'realm_claudecraft_resembles_robust_armored_bear_01981e51',
  ],
  crypticrealm: [
    'realm_crypticrealm_albino_direwolf_01961261',
    'realm_crypticrealm_dusk_fiend_019b3419',
    'realm_crypticrealm_fox_01942ed4',
    'realm_crypticrealm_gorilla_01947f6a',
    'realm_crypticrealm_gorilla_01947fab',
    'realm_crypticrealm_ironbound_warboar_019cb457',
    'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    'realm_crypticrealm_sharkhorse_019644f7',
  ],
  fps: [
    'realm_fps_armored_boar_019cb448',
    'realm_fps_armored_majesty_019bc46b',
    'realm_fps_extremely_frilled_dragon_lizard_0193e6b8',
    'realm_fps_ironbound_war_elephant_019ef095',
  ],
  infernal: [
    'realm_infernal_abyssal_charger_0195ec8b',
    'realm_infernal_abyssal_charger_0195ec8d',
    'realm_infernal_albino_direwolf_01961261',
    'realm_infernal_behemoth_roar_019b8b3a',
    'realm_infernal_cerberus_massive_muscular_dog_01949471',
    'realm_infernal_cerberus_massive_muscular_dog_01949472',
    'realm_infernal_cragjaw_devourer_019d737f',
    'realm_infernal_crimson_bloom_behemoth_019ca160',
    'realm_infernal_crimson_charger_0195ec9b',
    'realm_infernal_crimson_charger_0195ec9e',
    'realm_infernal_crimson_chomper_019649c3',
    'realm_infernal_dusk_fiend_019b3419',
    'realm_infernal_emerald_leviathan_019f24be',
    'realm_infernal_feral_alien_creature_carnivore_01945133',
    'realm_infernal_feral_alien_creature_carnivore_01945134',
    'realm_infernal_fox_01942ed0',
    'realm_infernal_fox_01942ed4',
    'realm_infernal_fox_01942ed5',
    'realm_infernal_gorilla_01947f6a',
    'realm_infernal_gorilla_01947f6d',
    'realm_infernal_gorilla_01947f76',
    'realm_infernal_gorilla_01947fab',
    'realm_infernal_gorilla_01947fb2',
    'realm_infernal_infernal_steed_0198b3ae',
    'realm_infernal_inferno_rhino_019bc344',
    'realm_infernal_ironbound_warboar_019cb457',
    'realm_infernal_mechanical_elephant_sentinel_01966355',
    'realm_infernal_muscular_anthropomorphic_rat_bodie_01949463',
    'realm_infernal_rino_019bc334',
    'realm_infernal_sharkhorse_019644f7',
    'realm_infernal_zombear_rampage_019c1c1c',
  ],
};
