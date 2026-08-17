// GENERATED FILE - DO NOT EDIT BY HAND.
// Produced by scripts/realm_assets/emit_arachnids.mjs from the shipped arachnid
// manifest. Re-run the pipeline to regenerate; hand edits will be lost.
//
// The engine's SECOND non-humanoid rig family. Every body here was bound onto
// the arachnid donor skeleton by scripts/realm_assets/nonhumanoid_rig.mjs, so
// each one carries that donor's 9 clips baked in. Nothing retargets at runtime —
// SkeletonUtils is only ever used as `clone` — which is why the clips have to
// travel inside the GLB.
//
// SEPARATE FROM creatures.generated.ts ON PURPOSE. That file is the wolf-donor
// quadruped roster and its contract test asserts `run === 'Gallop'` on every row
// it holds. This donor never baked a Gallop, a Sit, or the wolf's split
// left/right hit reacts. Merging the two records would either break that
// assertion or force it loose enough to stop catching a typo — and a clip name
// the GLB does not contain never throws, it just stands in the rest pose for
// ever. One record per donor vocabulary is the only shape that stays honest.
//
// These are creature bodies: no handslot bones, no weapon sockets, no tint. The
// donor rig has no hands to hold anything with, so weaponSlots would accept
// setWeapon() and silently attach nothing.

import type { ClipMap, VisualDef } from './manifest';

const REALM_MODELS = '/cr-realms';

/** The arachnid donor's own baked vocabulary — all 9 clips it ships, no more.
 *
 *  `run` aliases Walk because the donor baked no run cycle; the renderer plays
 *  it faster rather than reaching for a clip that is not there. `attack` rotates
 *  the two distinct swings (a claw/limb strike and a Bite) so a pack does not
 *  hit in unison. 'Death 2' and 'Eating' are baked in the GLBs and deliberately
 *  unmapped: ClipMap has no second-death or feeding-idle slot, and inventing an
 *  alias for them would only mean a clip plays where the engine expects another.
 */
const ARACHNID_BAKED: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Walk',
  attack: ['Attack', 'Bite'],
  hit: ['Hit'],
  death: 'Death',
  jump: 'Jump',
};

export const GENERATED_ARACHNID_VISUALS: Record<string, VisualDef> = {
  // brain in a jar carried on a skittering six-strut walker; dome reads as the head, no weapon
  realm_arcadevoid_brainjar_walker_01977e14: {
    url: `${REALM_MODELS}/arcadevoid/creatures/realm_arcadevoid_brainjar_walker_01977e14.glb`,
    height: 1.3,
    clips: ARACHNID_BAKED,
    lazyPreload: true,
  },
  // hulking eight-legged robotic scorpion, segmented tail held over the back
  realm_arcadevoid_scorpion_mech_01938038: {
    url: `${REALM_MODELS}/arcadevoid/creatures/realm_arcadevoid_scorpion_mech_01938038.glb`,
    height: 1.6,
    clips: ARACHNID_BAKED,
    lazyPreload: true,
  },
  // armoured siege spider, the largest of the three; broad plated abdomen over eight heavy legs
  realm_arcadevoid_siege_weaver_019d87d3: {
    url: `${REALM_MODELS}/arcadevoid/creatures/realm_arcadevoid_siege_weaver_019d87d3.glb`,
    height: 2,
    clips: ARACHNID_BAKED,
    lazyPreload: true,
  },
};

/** Per-realm rosters, keyed by the realm the body physically ships under.
 *
 *  NOTHING READS THIS YET, exactly as with GENERATED_CREATURE_BODIES: registering
 *  a visual is deliberately separate from changing which mob picks which body, so
 *  art can land without moving a single spawn. Wiring these in is a call-site
 *  change in manifest.ts (visualKeyFor) plus a family added to the creature
 *  family set — note that set currently excludes 'spider' on purpose, because the
 *  wolf-donor quadrupeds it gates cannot walk on eight legs. These bodies can. */
export const GENERATED_ARACHNID_BODIES: Record<string, string[]> = {
  arcadevoid: [
    'realm_arcadevoid_brainjar_walker_01977e14',
    'realm_arcadevoid_scorpion_mech_01938038',
    'realm_arcadevoid_siege_weaver_019d87d3',
  ],
};
