// GENERATED FILE - DO NOT EDIT BY HAND.
// Produced by scripts/realm_assets/emit_machines.mjs from the shipped machine
// manifest. Re-run the pipeline to regenerate; hand edits will be lost.
//
// The engine's THIRD non-humanoid family: turrets, catapults, rovers and a
// starfighter, rigged by scripts/realm_assets/machine_rig.mjs. That rigger has
// no donor — a machine's motion is derived from its mechanism rather than
// observed, so the skeleton is generated from the mesh and every clip is
// synthesised (yaw about the post, pitch about the trunnion, recoil along the
// barrel, spin about the axle). Nothing retargets at runtime; the clips travel
// inside the GLB, as with every other family here.
//
// SEPARATE FROM creatures.generated.ts AND arachnids.generated.ts for the reason
// each of those is separate from the other: a ClipMap must name only clips its
// own rig really baked, and a wrong name does not throw — the body stands in its
// rest pose for ever. These share ONE vocabulary of six, verified present in all
// 42 GLBs by the emitter before this file is written.
//
// These are not decor. src/sim/realm_decor.generated.ts models geometry-only
// props and has no concept of a prop with clips; these carry Idle/Attack/Hit/
// Death because they are meant to be fought. They therefore ship under
// `<realm>/machines/`, which emit_decor.mjs does NOT scan, so no GLB here can
// also be registered as a motionless prop.
//
// No handslot bones and no tint: a turret has nothing to hold, and every mesh
// ships its own baked texture.

import type { ClipMap, VisualDef } from './manifest';

const REALM_MODELS = '/cr-realms';

/** The synthesised vocabulary machine_rig.mjs emits, and all of it.
 *
 *  `walk`/`run` are the mechanism's own motion (a turret tracking, a rover's
 *  wheels turning) rather than a gait, which is why an emplacement that never
 *  leaves its post still has them. There is no jump, no sit and no cast: nothing
 *  in the mechanism produces one, so naming one would be naming a clip that is
 *  not in the file. */
const MACHINE_BAKED: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: ['Attack'],
  hit: ['Hit'],
  death: 'Death',
};

export const GENERATED_MACHINE_VISUALS: Record<string, VisualDef> = {
  // azure starfighter (2 joints)
  realm_arcadevoid_azure_starfighter_019caacb: {
    url: `${REALM_MODELS}/arcadevoid/machines/realm_arcadevoid_azure_starfighter_019caacb.glb`,
    height: 3.2,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // a medieval wooden catapult reinforced with prehi (6 joints)
  realm_fps_a_medieval_wooden_catapult_reinforced_with_prehi_019493e4: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_a_medieval_wooden_catapult_reinforced_with_prehi_019493e4.glb`,
    height: 2.6,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // a medieval wooden catapult reinforced with prehi (3 joints)
  realm_fps_a_medieval_wooden_catapult_reinforced_with_prehi_019493ec: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_a_medieval_wooden_catapult_reinforced_with_prehi_019493ec.glb`,
    height: 2.6,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // a medieval wooden catapult reinforced with prehi (6 joints)
  realm_fps_a_medieval_wooden_catapult_reinforced_with_prehi_019493ef: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_a_medieval_wooden_catapult_reinforced_with_prehi_019493ef.glb`,
    height: 2.6,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // a medieval wooden catapult reinforced with prehi (3 joints)
  realm_fps_a_medieval_wooden_catapult_reinforced_with_prehi_01949405: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_a_medieval_wooden_catapult_reinforced_with_prehi_01949405.glb`,
    height: 2.6,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // alien rover (2 joints)
  realm_fps_alien_rover_019f5155: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_alien_rover_019f5155.glb`,
    height: 2.2,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // cerulean gauss turret x (3 joints)
  realm_fps_cerulean_gauss_turret_x_019cde67: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_cerulean_gauss_turret_x_019cde67.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // gauss turret (3 joints)
  realm_fps_gauss_turret_019cde67: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_gauss_turret_019cde67.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_0199d284: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_0199d284.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_0199d289: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_0199d289.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_0199d28d: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_0199d28d.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_0199d292: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_0199d292.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_0199d333: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_0199d333.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_0199d347: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_0199d347.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_0199d352: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_0199d352.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_0199d354: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_0199d354.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_0199d3bf: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_0199d3bf.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_0199d3f8: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_0199d3f8.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_0199d401: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_0199d401.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_0199d41b: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_0199d41b.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_0199d436: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_0199d436.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_019a258f: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_019a258f.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret (3 joints)
  realm_fps_laser_turret_019a2590: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_019a2590.glb`,
    height: 1.4,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d401: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d401.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d42a: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d42a.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d42f: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d42f.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d432: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d432.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d449: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d449.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d616: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d616.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d617: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d617.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d61f: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d61f.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d750: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d750.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d831: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d831.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d843: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d843.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d844: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d844.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d86c: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d86c.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d89d: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d89d.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d9b8: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d9b8.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199d9be: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199d9be.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_0199ed0c: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_0199ed0c.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // laser turret cannon (3 joints)
  realm_fps_laser_turret_cannon_8164fd42: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_laser_turret_cannon_8164fd42.glb`,
    height: 1.7,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
  // rally car (6 joints)
  realm_fps_rally_car_019af2fa: {
    url: `${REALM_MODELS}/fps/machines/realm_fps_rally_car_019af2fa.glb`,
    height: 1.9,
    clips: MACHINE_BAKED,
    lazyPreload: true,
  },
};

/** Per-realm rosters, keyed by the realm the body physically ships under.
 *
 *  NOTHING READS THIS YET, exactly as with GENERATED_CREATURE_BODIES and
 *  GENERATED_ARACHNID_BODIES: registering a visual is deliberately separate from
 *  changing which mob picks which body, so art can land without moving a spawn. */
export const GENERATED_MACHINE_BODIES: Record<string, string[]> = {
  arcadevoid: [
    'realm_arcadevoid_azure_starfighter_019caacb',
  ],
  fps: [
    'realm_fps_a_medieval_wooden_catapult_reinforced_with_prehi_019493e4',
    'realm_fps_a_medieval_wooden_catapult_reinforced_with_prehi_019493ec',
    'realm_fps_a_medieval_wooden_catapult_reinforced_with_prehi_019493ef',
    'realm_fps_a_medieval_wooden_catapult_reinforced_with_prehi_01949405',
    'realm_fps_alien_rover_019f5155',
    'realm_fps_cerulean_gauss_turret_x_019cde67',
    'realm_fps_gauss_turret_019cde67',
    'realm_fps_laser_turret_0199d284',
    'realm_fps_laser_turret_0199d289',
    'realm_fps_laser_turret_0199d28d',
    'realm_fps_laser_turret_0199d292',
    'realm_fps_laser_turret_0199d333',
    'realm_fps_laser_turret_0199d347',
    'realm_fps_laser_turret_0199d352',
    'realm_fps_laser_turret_0199d354',
    'realm_fps_laser_turret_0199d3bf',
    'realm_fps_laser_turret_0199d3f8',
    'realm_fps_laser_turret_0199d401',
    'realm_fps_laser_turret_0199d41b',
    'realm_fps_laser_turret_0199d436',
    'realm_fps_laser_turret_019a258f',
    'realm_fps_laser_turret_019a2590',
    'realm_fps_laser_turret_cannon_0199d401',
    'realm_fps_laser_turret_cannon_0199d42a',
    'realm_fps_laser_turret_cannon_0199d42f',
    'realm_fps_laser_turret_cannon_0199d432',
    'realm_fps_laser_turret_cannon_0199d449',
    'realm_fps_laser_turret_cannon_0199d616',
    'realm_fps_laser_turret_cannon_0199d617',
    'realm_fps_laser_turret_cannon_0199d61f',
    'realm_fps_laser_turret_cannon_0199d750',
    'realm_fps_laser_turret_cannon_0199d831',
    'realm_fps_laser_turret_cannon_0199d843',
    'realm_fps_laser_turret_cannon_0199d844',
    'realm_fps_laser_turret_cannon_0199d86c',
    'realm_fps_laser_turret_cannon_0199d89d',
    'realm_fps_laser_turret_cannon_0199d9b8',
    'realm_fps_laser_turret_cannon_0199d9be',
    'realm_fps_laser_turret_cannon_0199ed0c',
    'realm_fps_laser_turret_cannon_8164fd42',
    'realm_fps_rally_car_019af2fa',
  ],
};
