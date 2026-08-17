// Visual manifest: maps every sim identity (player class, mob template/family,
// NPC id, druid/polymorph form) onto a rigged glTF asset + clip names + kit.
// Pure data + dispatch — no three.js imports, no loading.

import { isBoundedResidency } from './residency';
import { MECH_CHROMAS, type MechChroma } from '../../sim/content/skins';
import { offhandMirrorsWeaponSkin } from '../../sim/content/weapon_skin_rules';
import { WEAPON_SKINS } from '../../sim/content/weapon_skins';
import { ITEMS, MOBS } from '../../sim/data';
import { ALL_CLASSES, type Entity, isMechWearer, type PlayerClass } from '../../sim/types';
import { resolveRealmCharacterVisual } from '../../sim/realms/class_visuals';
import { infernalCharacterSelection } from '../../sim/realms/infernal_classes';
import { resolveActiveRealmId } from '../../sim/realms/registry';
import { ITEM_WEAPON_VARIANTS } from '../../ui/weapon_variants';
import type { OverheadEmoteId } from '../../world_api';
import {
  KAYKIT_EMOTES,
  MESHY_CLIP_BANK_URL,
  MESHY_BANK_EMOTES,
  withMeshyBank,
} from './clip_vocab';
import { GENERATED_REALM_BODIES, GENERATED_VISUALS } from './manifest.generated';
import { GENERATED_CREATURE_BODIES, GENERATED_CREATURE_VISUALS } from './creatures.generated';
import { GENERATED_CREATURE_BODY_PINS } from './creature_pins.generated';
import {
  hostileHumanoidVisualKey,
  infernalNpcVisualKey,
  infernalOpponentVisualKey,
  infernalUndeadVisualKey,
} from './infernal_roster';

export interface EmoteClipSpec {
  clips: readonly string[];
  timeScale?: number;
  repeats?: number;
}

export interface ClipMap {
  idle: string;
  walk: string;
  run: string;
  /** one-shot swing clips, rotated per attack */
  attack: string[];
  /** Optional per-ability swing or cast-gesture override. */
  attackByAbility?: Record<string, string>;
  /** Optional weapon-style override for plain auto attacks. */
  attackByHand?: { twohand?: string; dualwield?: string };
  death: string;
  /** hit-react one-shots (optional — spider/raptor rigs have none) */
  hit?: string[];
  /** looping cast channel */
  cast?: string;
  sitDown?: string;
  sitIdle?: string;
  /** swim base. On the authored player lane this is the SUBMERGED stroke and
   *  carries the whole prone posture; on rigs without one it is a lie-down pose
   *  the renderer pitches procedurally (see visual.ts SWIM_PITCH_*). */
  swim?: string;
  /** surface swim stroke, played instead of `swim` whenever the body's head is
   *  above the waterline. Absent = the rig swims the same way at any depth. */
  swimSurface?: string;
  /** the swim IDLE: treading water, upright and sculling, played whenever a
   *  swimmer stops. Absent = the stroke keeps playing in place. */
  swimIdle?: string;
  /** walking through water too shallow to swim in. Absent = the dry walk. */
  wade?: string;
  /** airborne base pose while jumping/falling */
  jump?: string;
  /** long-fall flail (arms windmilling, legs kicking), played once the body
   *  is dropping faster than any hop can (anim_state.isFallingAtSpeed).
   *  Absent = the jump pose holds for the whole fall, as it always did. */
  fall?: string;
  /** Touchdown one-shot. Naming one opts the rig into the held-jump treatment:
   *  `jump` stops looping and CLAMPS on its last frame (its airborne pose) for
   *  however long the body stays off the ground, then this fires on the landing
   *  edge. A rig without it keeps looping `jump` exactly as before. */
  land?: string;
  walkBack?: string;
  /** one-shot played on respawn (skeleton awaken / boss taunt) */
  flourish?: string;
  /** arm gesture for the Z-key sheathe toggle; the held-prop swap lands at its
   *  midpoint (see visual.ts setWeaponStowed). Absent = snap with no gesture. */
  stow?: string;
  /** player-facing overhead emote one-shots; clips are sourced from the GLB. */
  emote?: Partial<Record<OverheadEmoteId, EmoteClipSpec>>;
}

export interface AttachDef {
  url: string;
  bone: string;
  position?: [number, number, number];
  rotationY?: number;
  /** Copy grip from a built-in accessory node on the character rig (e.g. Spellbook_open). */
  gripRef?: string;
}

export interface VisualDef {
  url: string;
  /** Optional extra GLBs that provide animation clips for static rig files. */
  animUrls?: string[];
  /** world-unit height (pivot->crown) at e.scale = 1 */
  height: number;
  clips: ClipMap;
  /** floating rigs hover: mesh bottom sits this far above the pivot */
  hover?: number;
  /** yaw applied so the model faces +Z (facing-0 convention) */
  yaw?: number;
  /** KayKit chars ship every accessory visible: non-skinned mesh nodes to KEEP.
   *  undefined = keep everything (creature GLBs have no accessories). */
  show?: string[];
  attach?: AttachDef[];
  /** Indices into `attach` whose model is replaced by the entity's equipped mainhand
   *  weapon (mapped via ITEM_WEAPON_VARIANTS). undefined/empty = the held weapon never
   *  changes with gear (hunter keeps its crossbow; mobs/NPCs are fixed). A fixed
   *  offhand left off this list stays authored (the warlock spellbook); a live
   *  equipped offhand uses `offhandSlot` below. */
  weaponSlots?: number[];
  /** Index into `attach` replaced by the entity's actual equipped offhand. Kept
   *  separate from `weaponSlots` so mainhand cosmetics cannot overwrite a live
   *  shield or second weapon. */
  offhandSlot?: number;
  /** material tint: explicit color, 'entity' (use e.color), or none */
  tint?: number | 'entity';
  /** lerp amount toward the tint (default 0.4) */
  tintStrength?: number;
  /** u/s at which the walk/run cycles look right (timeScale matching) */
  walkRef?: number;
  runRef?: number;
  attackTimeScale?: number;
  deathTimeScale?: number;
  /** Skip the boot preload sweep (manifestUrls); the asset is fetched on demand
   *  instead — e.g. the cosmetic-only Combat Mech, loaded via preloadMechAssets()
   *  when the skin-select preview opens, so it never bloats every client's boot. */
  lazyPreload?: boolean;
  /** Build the ClipMap from the GLB's OWN animations at prepare time. An admin
   *  body override points a class/NPC at an arbitrary library GLB whose clip
   *  names are unknown ahead of time; prepareVisual detects an idle/first clip
   *  and drives every state from it. Fail-safe: no animations means the rest
   *  pose, never a crash. */
  autoClip?: boolean;
  /** Post-load orientation fixups for weapon/prop nodes baked INTO a creature
   *  GLB at the wrong angle (some KayKit handslot weapons ship without the grip
   *  flip the standalone weapon files carry). Node name as authored in the GLB;
   *  applied as a local-space rotation (radians) after the bind transform. */
  weaponFix?: { node: string; rotX?: number; rotY?: number; rotZ?: number }[];
  /** Glowing ring parented behind the head bone (the priest's Light halo).
   *  Value is the glow color; geometry/placement live in halo.ts. */
  halo?: number;
  /** Halo placement overrides, head-bone space (defaults in halo.ts): lift
   *  above the bone and ring radius, for models whose headgear the default
   *  ring would clip. */
  haloUpOffset?: number;
  haloRadius?: number;
  /** This GLB is a modular PART LIBRARY, not a finished character: every body
   *  part, hair style and armour slot piece rides one shared rig and the
   *  visible set is picked per entity (see modular.ts). assembleModel composes
   *  it instead of cloning the whole scene. */
  modular?: boolean;
  /** Two-state prop mob (the dragonkin egg): the GLB ships BOTH state meshes
   *  seated at the origin; alive shows `hide` only, and death swaps to `show`
   *  (the cracked-open shell IS the corpse). assembleModel seeds the alive
   *  state; CharacterVisual's enterDeath/revive flip it. Node names as
   *  authored in the GLB. */
  corpseMeshSwap?: { hide: string; show: string };
}

/** The slice of a VisualDef that decides how held weapons attach (which bones, and
 *  which slots swap to the equipped item). Lets a cosmetic body adopt a different
 *  class's hand layout without cloning the whole def. */
export type WeaponLayoutOverride = Pick<VisualDef, 'attach' | 'weaponSlots' | 'offhandSlot'>;

// ---------------------------------------------------------------------------
// Clip sets per source rig family
// ---------------------------------------------------------------------------

// KAYKIT_EMOTES moved to clip_vocab.ts so the 1,600+ pipeline-rigged bodies in
// manifest.generated.ts can share the exact map the shipped player bodies use.
// They are the same rig family and were emitted with NO emote map at all, so
// every /wave, /dance and /cheer on a library body was a silent no-op:
// playEmote() finds no spec and returns before touching the mixer.

const kaykit = (attack: string[], idle = 'Idle'): ClipMap => ({
  idle,
  walk: 'Walking_A',
  run: 'Running_A',
  walkBack: 'Walking_Backwards',
  attack,
  hit: ['Hit_A'],
  death: 'Death_A',
  cast: 'Spellcasting',
  sitDown: 'Sit_Floor_Down',
  sitIdle: 'Sit_Floor_Idle',
  swim: 'Lie_Idle',
  jump: 'Jump_Idle',
  // The trimmed player GLBs ship no dedicated sheathe clip; the 1H chop WINDUP
  // (the clip's first ~40%, cut at the swap point by visual.ts) reaches over the
  // shoulder toward the back, which reads as grabbing/planting the hilt.
  stow: '1H_Melee_Attack_Chop',
  emote: KAYKIT_EMOTES,
});

const skeletonClips = (attack: string[], flourish = 'Skeletons_Awaken_Standing'): ClipMap => ({
  ...kaykit(attack, 'Idle_Combat'),
  flourish,
});

const skeletonLargeClips = (attack: string[]): ClipMap => ({
  idle: 'Idle',
  walk: 'Walking_A',
  run: 'Running_A',
  attack,
  hit: ['Hit_A'],
  death: 'Death_A',
});

// Quaternius 2021 animal rig (wolf/bull/alpaca/fox/stag)
const animal = (attack: string[]): ClipMap => ({
  idle: 'Idle',
  walk: 'Walk',
  run: 'Gallop',
  attack,
  hit: ['Idle_HitReact_Left', 'Idle_HitReact_Right'],
  death: 'Death',
});

// Rideable mounts. The Tripo-lane rigs (bear, toad, griffin) ship clips baked
// locally by scripts/bake_mount_gaits.mjs (the Tripo quadruped retarget was
// near-static, 4-5 animated joints), which authors Idle/Walk/Run/Death gait
// cycles directly against each rig's bind pose. The horse and the gobbler
// ship AUTHORED clips from their source models, renamed to these same four
// names at import time. The clipless prop-lane mounts resolve no actions from
// this map and rest in their generated standing pose (procedural bob in
// src/render/mount_visuals.ts). No attack one-shots: the RIDER swings, the
// mount does not.
const MOUNT_RIGGED: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: [],
  death: 'Death',
};

// The Drakelands dragonkin brood (tmp/dragonkin_build.mjs bakes): artist
// clips on the 25-bone mixamorig core. Run reuses the walk cycle (the rigs
// ship no separate sprint; visual timeScale matching covers the chase). The
// broodlord's specials resolve per mechanic: FireBreath rides the cast slot
// (breathCone shows a real bar), Cleave/Stun ride attackByAbility off the
// 'windup' spellfx ability ids, and Shout is the flourish one-shot the
// 'shout'/'flourish' spellfx cues play.
const DRAGONKIN_BROODLORD: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: ['Attack'],
  attackByAbility: { brood_cleave: 'Cleave', brood_stun: 'Stun' },
  death: 'Death',
  cast: 'FireBreath',
  flourish: 'Shout',
};
const DRAGONKIN_BROODGUARD: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: ['Attack'],
  death: 'Death',
  flourish: 'Shout',
};
const DRAGONKIN_WHELP: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: ['JumpAttack'],
  death: 'Death',
  flourish: 'JumpAttack',
};
// Grubjaw the Glutton (the Mirefen Marsh rare): his own Tripo sculpt on the
// 25-bone mixamorig core, auto-skinned by tmp/grubjaw_build.mjs. Two authored
// swings rotate per attack (a bare Punch and the bigger WeaponA haymaker);
// Death is a synthesized hips topple, since the drop ships no death clip.
const GRUBJAW: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: ['Punch', 'WeaponA'],
  death: 'Death',
};

// Clipless two-state prop mobs (the dragonkin egg): the GLB ships NO clips, so
// every action() lookup misses harmlessly (fadeTo null-guards) and the mesh
// just stands; state changes are mesh-visibility swaps
// (VisualDef.corpseMeshSwap), not clips. Names the nominal 'Idle' throughout
// and registers in CLIPLESS_RIGS (tests/character_clipmaps.test.ts), the same
// contract mob_spider_egg_sac holds: that registration is what exempts a
// clip-less prop from the per-clip and far-LOD bake guards.
const STATIC_PROP: ClipMap = {
  idle: 'Idle',
  walk: 'Idle',
  run: 'Idle',
  attack: ['Idle'],
  death: 'Idle',
};

// Custom baked wolf rig (wolf_basic/greyjaw, Dog_Animation donor skeleton): the
// animal() core plus the donor's Sit/Fall clips so player wolf forms sit and
// jump properly, and a Walk swim base (a paddling gait at the gentle clip
// pitch beats the steep no-clip procedural prone on a quadruped).
const WOLF_BAKED: ClipMap = {
  ...animal(['Attack']),
  sitIdle: 'Sit',
  swim: 'Walk',
  jump: 'Fall',
};

// Druid Bear Form: a purpose-built quadruped rig (29 deform bones; the gaits are
// authored as IK foot paths, so walkRef/runRef below are MEASURED off the clips
// rather than guessed). Jump/Land are a pair: `land` opts the rig into the held
// airborne treatment (see ClipMap.land).
//
// It deliberately names no `cast`, no `emote` and no `attackByAbility`. Bear-form
// abilities are instant, and the ability-VFX painter gates its ceremonial cast
// gesture on an authored per-ability clip (hasGestureClip) while the cast base
// state falls back to idle without a `cast` clip. Leaving all three out is what
// keeps an instant cast from firing a swipe; real attacks still resolve `attack`.
const BEAR_FORM: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: ['Attack'],
  hit: ['Hit'],
  death: 'Death',
  jump: 'Jump',
  land: 'Land',
  sitIdle: 'Sit',
  // a paddling walk beats the steep no-clip procedural prone on a quadruped,
  // the same call the wolf forms make
  swim: 'Walk',
};

// Custom wild boar rig (wild_boar.glb)
const WILD_BOAR: ClipMap = {
  idle: 'Idle1',
  walk: 'Move2 (shuffle)',
  run: 'Move1 (jump)',
  attack: ['Attack1 (marracca)', 'Attack2 (tusks)'],
  hit: ['Hurt'],
  death: 'Dying',
};

// 14-clip biped rig (orc/frog/demonalt/yetialt)
const BIPED14: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: ['Punch', 'Weapon'],
  hit: ['HitReact'],
  death: 'Death',
};

// mob_troll's own attack (scripts/build_troll_anims.mjs, issue #2889):
// BIPED14's Punch/Weapon is shared by reference across 6 unrelated families
// (a yeti, a frog-murloc, a demon and its alt among them). This clip is baked
// off orc.glb's own donor poses (a crouch coil, the existing overhand club
// swing, the existing punch's follow-through lean, and a head nod), so only
// mob_troll gets it; the other 5 BIPED14 families are untouched.
const TROLL_BIPED14: ClipMap = {
  ...BIPED14,
  attack: ['Troll_Smash'],
};

// Tripo biped rig. These creatures come through the current biped
// pipeline, which retargets and bakes the complete game vocabulary directly.
const TRIPO_BIPED_FULL_RIG: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: ['Attack'],
  hit: ['Hit'],
  death: 'Death',
  cast: 'Cast',
  jump: 'Jump',
};

// 2023 enemy rig (goblin/giant)
const ENEMY7: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: ['Attack'],
  hit: ['HitRecieve'],
  death: 'Death',
};

// The kobold family's own attack (scripts/build_kobold_anims.mjs, issue
// #2889): ENEMY7's Attack is shared by reference with mob_ogre (a giant
// twice its height, on giant.glb), so a kobold currently swings the exact
// same single double-claw chop. This clip is baked off goblin.glb's own
// donor poses (Attack's own beats re-timed into a two-part combo, plus
// Jump, a clip goblin.glb ships that ENEMY7 never wires), so only
// mob_kobold gets it; mob_ogre stays on the shared constant untouched.
const KOBOLD_ENEMY7: ClipMap = {
  ...ENEMY7,
  attack: ['Kobold_Pounce'],
};

// floating/flying rigs (goleling/dragon) — hover instead of walking
const FLOATING: ClipMap = {
  idle: 'Flying_Idle',
  walk: 'Fast_Flying',
  run: 'Fast_Flying',
  attack: ['Headbutt', 'Punch'],
  hit: ['HitReact'],
  death: 'Death',
};

// The elemental family's own attack (scripts/build_elemental_anims.mjs, issue
// #2889): FLOATING's Headbutt/Punch is shared by reference across 9 unrelated
// families (a fire elemental, a ghost, a dragon, a flying demon imp among
// them). This clip is baked off golelingevolved.glb's own donor poses (a
// forward lunge plus its two unused gesture clips), so only mob_elemental
// gets it; the other 8 FLOATING families are untouched.
const ELEMENTAL_FLOATING: ClipMap = {
  ...FLOATING,
  attack: ['Elemental_Attack'],
};

// The nightkin family's own attack (scripts/build_nightkin_anims.mjs, issue
// #2889): FLOATING's Headbutt/Punch is shared by reference across 8 other
// unrelated families (a ghost, a dragon, a flying demon imp, a glowing wisp
// among them). This clip is baked off tribal.glb's own donor poses (a
// forward lunge plus its two unused gesture clips), so only mob_nightkin
// gets it; the other FLOATING families are untouched.
const NIGHTKIN_FLOATING: ClipMap = {
  ...FLOATING,
  attack: ['Nightkin_Attack'],
};

// 2023 enemy rig variant with a bite attack and no run clip (yeti)
const ENEMY_BITE: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Walk',
  attack: ['Bite_Front'],
  hit: ['HitRecieve'],
  death: 'Death',
};

// Procedurally authored Water Elemental. Node transforms ripple its layered
// translucent body and drive the hands through the Waterbolt casting motion.
const WATER_ELEMENTAL: ClipMap = {
  idle: 'Idle',
  walk: 'Move',
  run: 'Move',
  // Waterbolt uses the short one-shot Cast attack; Water Jet holds this
  // dedicated forward-arms loop for its full server-authoritative channel.
  cast: 'Channel',
  attack: ['Cast'],
  hit: ['Hit'],
  death: 'Death',
};

const SPIDER: ClipMap = {
  idle: 'Spider_Idle',
  walk: 'Spider_Walk',
  run: 'Spider_Walk',
  attack: ['Spider_Attack'],
  death: 'Spider_Death', // no hit-react in asset
};

// Velociraptor rig (velociraptor.glb): like the spider, no hit-react clips
const RAPTOR: ClipMap = {
  idle: 'Velociraptor_Idle',
  walk: 'Velociraptor_Walk',
  run: 'Velociraptor_Run',
  attack: ['Velociraptor_Attack'],
  death: 'Velociraptor_Death',
};

// Chicken-cow rig (chicken_cow.glb, procedurally authored — see
// scripts/gen_chicken_cow.mjs). Node-transform animations, no hit-react.
const CHICKEN_COW: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: ['Attack'],
  death: 'Death',
  jump: 'Jump',
};

const meshyBiped = (
  attack: string[] = [],
  opts: Partial<Pick<ClipMap, 'walk' | 'run' | 'jump'>> = {},
): ClipMap => ({
  idle: 'Idle',
  walk: opts.walk ?? 'Walking',
  run: opts.run ?? 'Running',
  attack,
  hit: ['Hit'],
  death: 'Death',
  cast: 'Cast',
  jump: opts.jump ?? 'Basic_Jump',
});

// Curated Infernal humans are rebuilt by build_infernal_human_rigs.mjs. Exact-rig
// NOTE (purge, 2026-08-17): that rebuild script has been REMOVED from the repo.
// It regenerated the condemned body bank, so leaving it in place was a way back
// in that the source string-ban cannot see. The sentence above is Wade's and is
// left as written - it was true when written. See docs/condemned-body-bank.md.
// actions are used where available and donor actions are transferred as rest-pose
// deltas, so each distinct body stays upright through every gameplay state.
// meshy24, the clip bank's own rig family, so the bank fills everything the 10
// baked takes leave empty: walkBack, sit, swim, the extra swings, and 20 real
// emote gestures instead of aliasing four of them onto Wave and Taunt. Their own
// Wave/Taunt stay as the fallback behind each bank clip.
const INFERNAL_HUMAN_CLIPS: ClipMap = withMeshyBank({
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: ['Attack'],
  hit: ['Hit'],
  death: 'Death',
  cast: 'Cast',
  jump: 'Jump',
  emote: {
    wave: { clips: ['Wave'] },
    cheer: { clips: ['Taunt'] },
    flex: { clips: ['Taunt'] },
    salute: { clips: ['Wave'] },
  },
});
// Raid 02 asset-pipeline rig (stone_cantor.glb): Mixamo-rigged, ships
// Idle / Cast / Walk / Death plus a synthesized 'Hit' flinch authored by
// scripts/_add_cantor_hit_anim.mjs (the batch has no hit-react take). A
// caster, so attack aliases the cast clip; run aliases walk (no run clip).
const RAID_CASTER: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Walk',
  attack: ['Cast'],
  cast: 'Cast',
  hit: ['Hit'],
  death: 'Death',
};

// Tolling Bell rig (tolling_bell.glb, Meshy-generated + node-transform animated
// via scripts/_add_bell_anim.mjs, no skeleton). Non-combat, hostile:false, moved
// manually by the boss driver every tick, so walk/run/attack/death are never
// reached: they just alias the two real clips to satisfy ClipMap.
const TOLLING_BELL: ClipMap = {
  idle: 'Idle',
  walk: 'Roll',
  run: 'Roll',
  attack: [],
  death: 'Idle',
};

// ---------------------------------------------------------------------------
// Asset urls
// ---------------------------------------------------------------------------

const PLAYERS = 'models/chars/players';
/** Modular part library (one GLB, every part), see modular.ts. */
const MODULAR = 'models/chars/modular';
const ENEMIES = 'models/chars/enemies';
const CREATURES = 'models/creatures';
const DUNGEON_MODELS = 'models/dungeon';
const WEAPONS = 'models/weapons';
const MOUNTS_DIR = 'models/mounts';
const REALM_MODELS = '/cr-realms';

function infernalHuman(fileName: string, height = 2.15): VisualDef {
  return {
    url: `${REALM_MODELS}/infernal/${fileName}`,
    animUrls: [MESHY_CLIP_BANK_URL],
    height,
    clips: INFERNAL_HUMAN_CLIPS,
    lazyPreload: true,
  };
}

// Claudecraft realm bodies live in the shared realm store like the infernal and
// classic banks. A number of them expose only one baked take, so the single-take
// helper points every ClipMap slot at that clip instead of naming clips the GLB
// does not contain.
const CLAUDECRAFT_TAKE = 'Armature|Unreal Take|baselayer';

function claudecraftBody(fileName: string, height: number, clips: ClipMap): VisualDef {
  return {
    url: `${REALM_MODELS}/claudecraft/${fileName}`,
    height,
    clips,
    lazyPreload: true,
  };
}

function claudecraftSingleTake(fileName: string, height: number): VisualDef {
  return claudecraftBody(fileName, height, {
    idle: CLAUDECRAFT_TAKE,
    walk: CLAUDECRAFT_TAKE,
    run: CLAUDECRAFT_TAKE,
    attack: [],
    death: CLAUDECRAFT_TAKE,
    hit: [],
    jump: CLAUDECRAFT_TAKE,
  });
}

const ITEM_OFFHAND_MODELS: Readonly<Record<string, string>> = {
  eastbrook_buckler: 'shield_round',
  highwatch_wallshield: 'shield_square',
  bonewrought_bulwark: 'shield_square',
  pearlward_aegis: 'shield_round', // the first caster (int/spi) shield
};

function itemModelKey(
  itemId: string | null | undefined,
  extra: Readonly<Record<string, string>> = {},
): string | null {
  if (!itemId) return null;
  const direct = Object.hasOwn(ITEM_WEAPON_VARIANTS, itemId)
    ? ITEM_WEAPON_VARIANTS[itemId]
    : undefined;
  const directExtra = Object.hasOwn(extra, itemId) ? extra[itemId] : undefined;
  if (direct || directExtra) return direct ?? directExtra ?? null;

  const item = Object.hasOwn(ITEMS, itemId) ? ITEMS[itemId] : undefined;
  const baseId = item?.heroicOf;
  if (!baseId) return null;
  const inherited = Object.hasOwn(ITEM_WEAPON_VARIANTS, baseId)
    ? ITEM_WEAPON_VARIANTS[baseId]
    : undefined;
  const inheritedExtra = Object.hasOwn(extra, baseId) ? extra[baseId] : undefined;
  return inherited ?? inheritedExtra ?? null;
}

/** GLB url for an equipped mainhand item's held weapon model, or null if the item
 *  has no mapped model (then the class default attach is kept). Mirrors the bag
 *  icon via the shared ITEM_WEAPON_VARIANTS map, so held weapon == inventory icon. */
export function itemWeaponModelUrl(itemId: string | null | undefined): string | null {
  const key = itemModelKey(itemId);
  return key ? `${WEAPONS}/${key}.glb` : null;
}

/** GLB url for an actual equipped offhand. One-handed weapons reuse the shared
 *  inventory/held-model map; shields use the narrow render-only table above. */
export function itemOffhandModelUrl(itemId: string | null | undefined): string | null {
  const key = itemModelKey(itemId, ITEM_OFFHAND_MODELS);
  return key ? `${WEAPONS}/${key}.glb` : null;
}

/** GLB url the offhand slot should render: the active weapon skin's model when it
 *  mirrors onto a matching-type offhand weapon (a rogue's second dagger
 *  under a dagger skin), otherwise the equipped offhand item's own model. A shield,
 *  held offhand (orb/tome), or different-type offhand weapon never mirrors, so it
 *  keeps its item model; null when the offhand has no mapped model. The mirror
 *  decision is the pure sim rule, so server and clients agree on both hands. */
export function offhandModelUrl(
  offhandItemId: string | null | undefined,
  weaponSkinId: string | null | undefined,
): string | null {
  if (offhandMirrorsWeaponSkin(weaponSkinId, offhandItemId)) {
    return weaponSkinModelUrl(weaponSkinId);
  }
  return itemOffhandModelUrl(offhandItemId);
}

/** Distinct held-weapon GLB urls (one per variant), for the boot preload sweep so
 *  setWeapon can attach any equipped weapon synchronously (resolvedGltf throws on
 *  an un-preloaded url). */
export function itemWeaponModelUrls(): string[] {
  return [...new Set(Object.values(ITEM_WEAPON_VARIANTS).map((key) => `${WEAPONS}/${key}.glb`))];
}

function itemOffhandModelUrls(): string[] {
  return [...new Set(Object.values(ITEM_OFFHAND_MODELS).map((key) => `${WEAPONS}/${key}.glb`))];
}

/** GLB url for a Season 1 Armory weapon-skin cosmetic, or null for no/unknown
 *  skin. The skin model replaces the equipped item's held model (same bone, its
 *  own KAYKIT_WEAPON_ACCESSORY grip family + WEAPON_GRIP_OVERRIDES fine-tune). */
export function weaponSkinModelUrl(skinId: string | null | undefined): string | null {
  if (!skinId) return null;
  const def = WEAPON_SKINS[skinId];
  return def ? `${WEAPONS}/${def.model}.glb` : null;
}

/** Distinct weapon-skin GLB urls, preloaded like item weapon models: any nearby
 *  player can have a skin applied, and the attach path is synchronous. */
export function weaponSkinModelUrls(): string[] {
  return [...new Set(Object.values(WEAPON_SKINS).map((def) => `${WEAPONS}/${def.model}.glb`))];
}

const LOW_URL_ALIAS: Record<string, string> = {
  'models/chars/players/rogue_hooded.glb': 'models/chars/players/rogue.glb',
};

const HUMANOID_H = 2.6;

// ---------------------------------------------------------------------------
// The authored swim lane
//
// Every player body rides the same Rig_Medium, so both strokes ship in ONE
// clip-only GLB (no meshes, no skin — the bow_anims.glb precedent) that is
// layered onto each class file through `animUrls`. Authored in Blender
// (tmp/swim/build_swim.py) and retargeted onto the shipped rest pose by
// scripts/build_swim_anims.mjs.
//
// Both clips carry the FULL prone posture (body flat, head leading, face down),
// unlike the Lie_Idle pose the rest of the KayKit rigs still swim with — which
// stays in every GLB and is still what mobs and creatures use.
// ---------------------------------------------------------------------------
const SWIM_ANIMS_URL = `${PLAYERS}/swim_anims.glb`;
/** Submerged stroke: arms sweep out and back to centre, legs frog-kick. */
export const SWIM_CLIP_SUBMERGED = 'Swim_Breaststroke';
/** Surface stroke: alternating overarm crawl over a flutter kick. */
export const SWIM_CLIP_SURFACE = 'Swim_Freestyle';
/** The swim idle: upright, arms sculling, legs running an eggbeater. The only
 *  UPRIGHT clip in the pack, which is why the renderer sinks the body for it
 *  (visual.ts SWIM_RISE_TREAD) instead of floating it like the prone strokes. */
export const SWIM_CLIP_TREAD = 'Swim_Tread';
/** Walking through water too shallow to swim in: short, high-kneed, leaning. */
export const WATER_CLIP_WADE = 'Water_Wade';
/** Long-fall panic flail: upright, arched back, arms windmilling out of phase,
 *  legs treading air (tmp/fall/build_fall.py). Rides the same clip-only GLB. */
export const FALL_CLIP_FLAIL = 'Fall_Flail';

/** Layer the authored water + fall clips onto a player body's class GLB. */
function swims(def: VisualDef): VisualDef {
  return {
    ...def,
    animUrls: [...(def.animUrls ?? []), SWIM_ANIMS_URL],
    clips: {
      ...def.clips,
      swim: SWIM_CLIP_SUBMERGED,
      swimSurface: SWIM_CLIP_SURFACE,
      swimIdle: SWIM_CLIP_TREAD,
      wade: WATER_CLIP_WADE,
      fall: FALL_CLIP_FLAIL,
    },
  };
}

const SKINS_DIR = 'textures/skins';

// ---------------------------------------------------------------------------
// Combat Mech — a class-agnostic cosmetic body. Unlike the per-class skins
// below (which swap a body atlas onto an existing class rig), the mech is a
// SEPARATE model with its own visual key (`player_mech`) and a set of chroma
// textures grouped across the three skin-event rarity tiers. Epics additionally
// ship an emissive glow map. Cosmetic preview only for now — lazy-loaded via
// preloadMechAssets() so it never bloats every client's boot.
// ---------------------------------------------------------------------------
const MECH_DIR = `${PLAYERS}/Mech/textures`;

function mechChromaUrl(c: MechChroma): string {
  if (c.rank === 'uncommon') return `${MECH_DIR}/uncommon/combatmech_${c.id}.png`;
  if (c.rank === 'rare') return `${MECH_DIR}/rares/combatmech_rare_${c.id}.png`;
  return `${MECH_DIR}/epics/combatmech_epic_${c.id}.png`;
}
function mechEmissiveUrl(c: MechChroma): string | null {
  return c.rank === 'epic' ? `${MECH_DIR}/epics/combatmech_epic_${c.id}_emis.png` : null;
}

// Per-class alternate body textures ("skins"). Index 0 = null = the model's
// embedded default texture (no swap). Index >0 = a full-atlas alternate applied
// to the body material's .map (same UVs). Classes sharing a model share its skin
// set. Players only — mobs/npcs keep their default look. See public/textures/skins/.
export const SKINS: Record<string, (string | null)[]> = {
  player_warrior: [
    null,
    `${SKINS_DIR}/knight/alt_a.png`,
    `${SKINS_DIR}/knight/alt_b.png`,
    `${SKINS_DIR}/knight/alt_c.png`,
    `${SKINS_DIR}/knight/alt_suit_prismatic.png`,
    `${SKINS_DIR}/knight/alt_suit_chrome.png`,
  ],
  player_paladin: [
    null,
    `${SKINS_DIR}/paladin/alt_a.png`,
    `${SKINS_DIR}/paladin/alt_suit_prismatic.png`,
    `${SKINS_DIR}/paladin/alt_suit_chrome.png`,
  ],
  player_hunter: [
    null,
    `${SKINS_DIR}/ranger/alt_a.png`,
    `${SKINS_DIR}/ranger/alt_b.png`,
    `${SKINS_DIR}/ranger/alt_c.png`,
    `${SKINS_DIR}/ranger/alt_suit_prismatic.png`,
    `${SKINS_DIR}/ranger/alt_suit_chrome.png`,
  ],
  player_rogue: [
    null,
    `${SKINS_DIR}/rogue/alt_a.png`,
    `${SKINS_DIR}/rogue/alt_b.png`,
    `${SKINS_DIR}/rogue/alt_c.png`,
    `${SKINS_DIR}/rogue/alt_suit_prismatic.png`,
    `${SKINS_DIR}/rogue/alt_suit_chrome.png`,
  ],
  player_priest: [
    null,
    `${SKINS_DIR}/mage/alt_a.png`,
    `${SKINS_DIR}/mage/alt_b.png`,
    `${SKINS_DIR}/mage/alt_c.png`,
    `${SKINS_DIR}/mage/alt_suit_prismatic.png`,
    `${SKINS_DIR}/mage/alt_suit_chrome.png`,
  ],
  player_mage: [
    null,
    `${SKINS_DIR}/mage/alt_a.png`,
    `${SKINS_DIR}/mage/alt_b.png`,
    `${SKINS_DIR}/mage/alt_c.png`,
    `${SKINS_DIR}/mage/alt_suit_prismatic.png`,
    `${SKINS_DIR}/mage/alt_suit_chrome.png`,
  ],
  player_warlock: [
    null,
    `${SKINS_DIR}/mage/alt_a.png`,
    `${SKINS_DIR}/mage/alt_b.png`,
    `${SKINS_DIR}/mage/alt_c.png`,
    `${SKINS_DIR}/mage/alt_suit_prismatic.png`,
    `${SKINS_DIR}/mage/alt_suit_chrome.png`,
  ],
  player_shaman: [
    null,
    `${SKINS_DIR}/barbarian/alt_a.png`,
    `${SKINS_DIR}/barbarian/alt_b.png`,
    `${SKINS_DIR}/barbarian/alt_c.png`,
    `${SKINS_DIR}/barbarian/alt_suit_prismatic.png`,
    `${SKINS_DIR}/barbarian/alt_suit_chrome.png`,
  ],
  player_druid: [
    null,
    `${SKINS_DIR}/druid/alt_a.png`,
    `${SKINS_DIR}/druid/alt_b.png`,
    `${SKINS_DIR}/druid/alt_c.png`,
    `${SKINS_DIR}/druid/alt_suit_prismatic.png`,
    `${SKINS_DIR}/druid/alt_suit_chrome.png`,
  ],
  // Combat Mech chromas — every index is a real full-model texture (no null
  // default; the embedded base texture is not one of the rewards).
  player_mech: MECH_CHROMAS.map(mechChromaUrl),
  // Bursar Fernando (the Eastbrook banker easter egg): the rogue palette with
  // the skin swatch repainted light brown and the hair/brow swatch black, in
  // the real Fernando's likeness. Index 0 is the real texture (mech precedent):
  // NPCs always resolve skin 0, so the embedded default is deliberately unused.
  npc_fernando: [`${SKINS_DIR}/rogue/fernando.png`],
};

// Emissive (glow) maps keyed exactly like SKINS, applied to .emissiveMap when a
// skin index has one. Only the Combat Mech epics glow; null entries mean no glow.
export const SKIN_EMISSIVE: Record<string, (string | null)[]> = {
  player_mech: MECH_CHROMAS.map(mechEmissiveUrl),
};

/** Number of skins (including the default) available for a visual key — min 1. */
export function skinCount(key: string): number {
  return SKINS[key]?.length ?? 1;
}

/** Texture url to preview a skin option (default index 0 → the model's base.png). */
export function skinThumbUrl(key: string, index: number): string | null {
  const arr = SKINS[key];
  if (!arr || index < 0 || index >= arr.length) return null;
  if (arr[index]) return arr[index];
  const firstAlt = arr.find((u): u is string => !!u); // derive dir from an alt
  return firstAlt ? firstAlt.replace(/\/[^/]+$/, '/base.png') : null;
}

// Quaternius-style velociraptor rig (velociraptor.glb): no hit-react in the
// asset, same as the spider/raptor rigs noted in src/render/characters/CLAUDE.md.
const VELOCIRAPTOR: ClipMap = {
  idle: 'Velociraptor_Idle',
  walk: 'Velociraptor_Walk',
  run: 'Velociraptor_Run',
  attack: ['Velociraptor_Attack'],
  death: 'Velociraptor_Death',
  jump: 'Velociraptor_Jump',
};

// ---------------------------------------------------------------------------
// The manifest
// ---------------------------------------------------------------------------

const HAND_VISUALS: Record<string, VisualDef> = {
  // -- player classes ------------------------------------------------------
  player_warrior: swims({
    url: `${PLAYERS}/knight.glb`,
    height: HUMANOID_H,
    // Every clip knight.glb ships is already wired somewhere in this block
    // (idle/walk/attack/hit/emotes account for the full shipped library, no
    // spare donor pose), so Heroic Leap (issue #2889 batch, verified against
    // the warrior's real kit in src/sim/content/classes.ts, not assumed) is
    // authored by pose-sample-and-blend (scripts/build_warrior_ability_anims.mjs)
    // instead of pointed at an unused clip.
    animUrls: [`${PLAYERS}/warrior_ability_anims.glb`],
    clips: {
      ...kaykit(['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal']),
      attackByHand: {
        twohand: '2H_Melee_Attack_Chop',
        dualwield: 'Dualwield_Melee_Attack_Chop',
      },
      attackByAbility: {
        mortal_strike: '2H_Melee_Attack_Chop',
        execute: '2H_Melee_Attack_Chop',
        slam: '2H_Melee_Attack_Chop',
        red_harvest: '2H_Melee_Attack_Chop',
        breachmaker: '2H_Melee_Attack_Chop',
        // Shieldcrack slams the SHIELD (offhand arm), not the sword: the
        // synthesized bash (scripts/_add_shield_bash_anim.mjs) drives the
        // left arm carrying the handslot.l shield; the weapon hand stays back.
        shield_slam: 'Shield_Bash',
        raging_gale: 'Dualwield_Melee_Attack_Chop',
        bloodthirst: 'Dualwield_Melee_Attack_Chop',
        // Reaping Arc and Revenge hit everything in the frontal arc: the
        // synthesized flat reap (scripts/_add_sweep_slice_anim.mjs), not the
        // top-to-bottom chop (owner: "sideways sword sweep").
        cleave: '1H_Melee_Attack_Slice_Horizontal',
        revenge: '1H_Melee_Attack_Slice_Horizontal',
        thunder_clap: '1H_Melee_Attack_Chop',
        faultline: '1H_Melee_Attack_Chop',
        heroic_strike: '1H_Melee_Attack_Slice_Diagonal',
        overpower: '1H_Melee_Attack_Slice_Diagonal',
        hamstring: '1H_Melee_Attack_Slice_Diagonal',
        sanguine_aura: 'Spellcast_Raise',
        raised_guard: 'Block',
        // Jawcrack is a bare-fist interrupt: the synthesized punch
        // (scripts/_add_pummel_punch_anim.mjs), not a weapon swing.
        pummel: 'Punch_A',
        // Heroic Leap is a position-targeted jump, not a swing: the bespoke
        // pose-sample-and-blend clip (coil, airborne, driven two-hand slam on
        // landing). It carries no castFx and resolves no target entity, so it
        // completes through the renderer's generic 'selfCast' cue, which only
        // draws a body gesture via this exact attackByAbility entry
        // (CharacterVisual.hasAttackClipOverride, src/render/ability_vfx/
        // painter.ts's non-contact 'selfCast' branch); with no entry it plays
        // nothing at all on the body.
        heroic_leap: 'Warrior_Heroic_Leap',
        // Victory Rush is a real weapon strike (weaponStrike effect, not a
        // pure buff), so it lands through the ordinary damage-event attack
        // trigger like every entry above it: a confident decisive swing, the
        // same clip heroic_strike/overpower/hamstring already use.
        victory_rush: '1H_Melee_Attack_Slice_Diagonal',
        // Seething Fury and Recklessness are both a defiant roar of rage: no
        // castFx, no target, so (like Heroic Leap above) the existing Cheer
        // gesture only shows up once an attackByAbility entry exists for it.
        berserker_rage: 'Cheer',
        recklessness: 'Cheer',
        // Die by the Sword braces behind the blade: the existing raised_guard
        // donor (Block) reads the same defensive beat, reached the same way.
        die_by_sword: 'Block',
        // Avatar's colossus transformation gets the raised-arm flourish
        // (the longest clip on the rig, fits a dramatic moment), same path.
        avatar: 'Spellcast_Raise',
        // Piercing Howl's own description calls it "a piercing shout" even
        // though it carries no castFx (unlike the six castFx:'shout'
        // abilities below, which the painter's 'shout' case always plays as
        // the Cheer EMOTE and never reaches attackByAbility at all - adding
        // an entry for any of those would be dead code, so this batch leaves
        // them alone). Piercing Howl's own selfCast cue DOES reach the same
        // gesture path Heroic Leap/berserker_rage/etc use above, and the
        // painter's shout-emote call right after it is guarded on
        // isMidOneShot, so it does not stomp this gesture.
        piercing_howl: 'Spellcast_Raise',
      },
    },
    show: ['Knight_Helmet', 'Knight_Cape'], // v2 knight dropped the built-in Badge_Shield mesh
    attach: [
      { url: `${WEAPONS}/sword_1handed.glb`, bone: 'handslot.r' },
      { url: `${WEAPONS}/shield_round.glb`, bone: 'handslot.l' },
    ],
    weaponSlots: [0],
    offhandSlot: 1,
  }),
  player_paladin: swims({
    url: `${PLAYERS}/paladin.glb`,
    height: HUMANOID_H,
    clips: {
      ...kaykit(['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal']),
      attackByHand: { twohand: '2H_Melee_Attack_Chop' },
      // Ability-specific clips (scripts/build_paladin_ability_anims.mjs,
      // issue #2889 follow-up batch): the paladin had zero attackByAbility
      // overrides across its kit, so every ability played the same melee
      // chop. Almost the whole kit shares school: 'holy' (classes.ts), so
      // school cannot differentiate anything the way it did for the mage:
      // mapped instead by the ability's EFFECT TYPE (judgement, groundAoE,
      // stun, absorb/defensive selfBuff, buffTarget/aura selfBuff, heal).
      // Not every ability in the kit is listed: this is a representative
      // slice, not exhaustive coverage (seal_of_righteousness, exorcism,
      // holy_taunt, and rebuke keep the default chop until a later batch).
      attackByAbility: {
        judgement: 'Cast_Verdict',
        consecration: 'Cast_Consecrate',
        hammer_of_justice: 'Cast_HammerBash',
        divine_protection: 'Cast_Ward',
        sacred_bulwark: 'Cast_Ward',
        blessing_of_might: 'Cast_Blessing',
        devotion_aura: 'Cast_Blessing',
        retribution_aura: 'Cast_Blessing',
        righteous_fury: 'Cast_Blessing',
        holy_light: 'Cast_HolyMend',
        flash_of_light: 'Cast_HolyMend',
        lay_on_hands: 'Cast_HolyMend',
      },
    },
    // Ability-specific clips (scripts/build_paladin_ability_anims.mjs): a
    // mesh-free clip donor GLB baked off this rig's own poses.
    animUrls: [`${PLAYERS}/paladin_ability_anims.glb`],
    // dedicated paladin model (helmeted variant) — ships its own Cape + Helmet
    // meshes and texture, so no show-list/tint. Shield + paladin hammer arrive
    // in the weapons pass; the gripped axe holds the slot until then.
    attach: [
      { url: `${WEAPONS}/axe_1handed.glb`, bone: 'handslot.r' },
      { url: `${WEAPONS}/shield_square.glb`, bone: 'handslot.l' },
    ],
    weaponSlots: [0],
    offhandSlot: 1,
  }),
  player_hunter: swims({
    url: `${PLAYERS}/ranger.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Ranged_Shoot']),
    // Bow-draw clips for the Season 1 bow skins (scripts/build_bow_anims.mjs):
    // with a bow displayed the shot plays a draw instead of the crossbow
    // shoulder-aim (visual.ts weaponSkinAttackClips).
    animUrls: [`${PLAYERS}/bow_anims.glb`, `${PLAYERS}/bow_hold_anim.glb`],
    // dedicated ranger model — the quiver is a built-in mesh, so it's no longer
    // a separate chest attachment
    attach: [{ url: `${WEAPONS}/crossbow_1handed.glb`, bone: 'handslot.r' }],
  }),
  player_rogue: swims({
    url: `${PLAYERS}/rogue.glb`,
    height: HUMANOID_H,
    clips: {
      ...kaykit(['Dualwield_Melee_Attack_Chop']),
      attackByAbility: {
        // Throat Wire is a wire strangle, not a dagger swing: the synthesized
        // two-handed choke (scripts/_add_garrote_choke_anim.mjs) reaches to
        // neck height and yanks back to the chest with a brief hold.
        garrote: 'Garrote_Choke',
        // Boot is a kick, not a swing: the synthesized snap kick
        // (scripts/_add_boot_kick_anim.mjs) chambers the knee and fires the
        // leg forward at gut height.
        kick: 'Kick_A',
        // Dirt Toss throws dirt, not daggers: the synthesized crouch-scoop
        // and underhand fling (scripts/_add_dirt_throw_anim.mjs).
        blind: 'Dirt_Throw',
        // Rest of the kit (scripts/build_rogue_ability_anims.mjs, issue
        // #2889): pose-sample-and-blend clips off rogue.glb's own donor
        // poses. Wicked Slash is the combo-builder poke; Eye Jab and Sap
        // share its silhouette since both are instant single-target
        // debilitating strikes with no unique read of their own.
        sinister_strike: 'Rogue_Quick_Strike',
        gouge: 'Rogue_Quick_Strike',
        sap: 'Rogue_Quick_Strike',
        // Craven Thrust drives the dagger in from behind.
        backstab: 'Rogue_Backstab',
        // Lurker's Strike is the kit's biggest single hit (2.5x weapon,
        // stealth-gated): its own bigger, more telegraphed lunge.
        ambush: 'Rogue_Ambush',
        // Gut Punch and Low Blow both land at gut/kidney height.
        cheap_shot: 'Rogue_Low_Blow',
        kidney_shot: 'Rogue_Low_Blow',
        // Combo-spending finishers read as one decisive two-blade cut.
        eviscerate: 'Rogue_Finisher_Slash',
        rupture: 'Rogue_Finisher_Slash',
        expose_armor: 'Rogue_Finisher_Slash',
        // Ghostfoot is a defensive dodge buff: rogue.glb's own already-baked
        // 'Block' guard, no bake needed (the pattern player_warrior's
        // raised_guard already uses).
        evasion: 'Block',
        // Cutthroat Tempo, Smokestep, Quickened Blood, and Duskveil are all
        // self-buff/stealth toggles with no combat swing to author: rogue.
        // glb's own already-baked 'Spellcast_Raise', the pattern player_
        // warrior's sanguine_aura and the hunter batch's aspect toggles both
        // use. Adder's Bite and Festering Venom (the poison weapon imbues)
        // are excluded, the same call the mage batch made for its own
        // utility/summon abilities.
        slice_and_dice: 'Spellcast_Raise',
        vanish: 'Spellcast_Raise',
        adrenaline_rush: 'Spellcast_Raise',
        stealth: 'Spellcast_Raise',
      },
    },
    // Ability-specific attack clips (scripts/build_rogue_ability_anims.mjs).
    animUrls: [`${PLAYERS}/rogue_ability_anims.glb`],
    show: ['Rogue_Cape'],
    attach: [
      { url: `${WEAPONS}/dagger.glb`, bone: 'handslot.r' },
      { url: `${WEAPONS}/dagger.glb`, bone: 'handslot.l' },
    ],
    weaponSlots: [0],
    offhandSlot: 1,
  }),
  player_priest: swims({
    url: `${PLAYERS}/mage.glb`,
    height: HUMANOID_H,
    clips: {
      ...kaykit(['2H_Melee_Attack_Chop']),
      attackByAbility: {
        // Lingering Grace is a blessing, not a staff swing: the one-hand
        // raise (a stock mage.glb clip) reads as the priest offering the HoT.
        renew: 'Spellcast_Raise',
      },
    },
    // The priest's Light: a warm golden halo ring above the crown. The mage
    // model's pointed hat is canon here, and at the default lift the ring
    // plane crosses the hat cone where it is wide, clipping through it; +0.15
    // raises the plane to the cone tip, where the default-size ring clears it
    // on every side (tuned by screenshot against the current mage.glb; a hat
    // reshape in an asset update means re-tuning). Kept just below the hat's
    // bounding-box top so portrait/turntable framing is unchanged for priests.
    halo: 0xffd766,
    haloUpOffset: 1.45,
    // show is a no-op for the hat/cape: the current mage.glb rigs every
    // accessory as a SkinnedMesh, and the allowlist filter (assets.ts) only
    // hides non-skinned nodes, so the hat always renders. Sanctioned look.
    show: [],
    attach: [{ url: `${WEAPONS}/staff.glb`, bone: 'handslot.r' }],
    weaponSlots: [0],
    // Faint warm lift only, to tell this apart from the mage/warlock models it
    // shares mage.glb with. The whole rig is ONE merged material/atlas (skin,
    // hair, and robe together), so this lerp multiplies the entire body, not
    // just the cloth. Measured: 0xf0e9d6 is near white, so even at 0.5 the old
    // strength only shifted the body by roughly (0.983, 0.980, 0.956), a
    // near-no-op (issue #2678); dropped to 0.12 anyway for consistency with
    // shaman/warlock, where the saturated tints DID flatten the face and
    // hands at their old strengths. Kept at the same faint-wash strength the
    // manifest already uses elsewhere (mob_troll) to differentiate a shared
    // model without hiding its base texture.
    tint: 0xf0e9d6,
    tintStrength: 0.12,
  }),
  player_shaman: swims({
    url: `${PLAYERS}/barbarian.glb`,
    height: HUMANOID_H,
    clips: {
      ...kaykit(['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal']),
      attackByHand: { twohand: '2H_Melee_Attack_Chop' },
    },
    show: ['Barbarian_BearHat'], // v2 barbarian renamed Hat→BearHat and dropped the round shield mesh
    attach: [
      { url: `${WEAPONS}/axe_1handed.glb`, bone: 'handslot.r' },
      { url: `${WEAPONS}/shield_round.glb`, bone: 'handslot.l' },
    ],
    weaponSlots: [0],
    offhandSlot: 1,
    // Faint cool lift only: barbarian.glb is one merged material for the whole
    // body (skin, fur, and leather together), so this lerp hits the face and
    // hands as hard as the cloth. 0.4 (the class default strength) desaturated
    // the whole model into a blue-grey wash on character create (issue #2678);
    // dropped further to 0.12, the same faint-wash strength the manifest
    // already uses elsewhere (mob_troll) to differentiate a shared model
    // without hiding its base texture.
    tint: 0x6f8fc9,
    tintStrength: 0.12,
  }),
  player_mage: swims({
    url: `${PLAYERS}/mage.glb`,
    height: HUMANOID_H,
    clips: {
      ...kaykit(['2H_Melee_Attack_Chop']),
      // Ability-specific spellcasts (scripts/build_mage_ability_anims.mjs,
      // issue #2889): the mage had zero attackByAbility overrides across its
      // kit, so every spell played the same melee chop. Mapped by school
      // (src/sim/content/classes.ts) to the school's signature spells;
      // Polymorph names its own clip (the one ability the clip is written
      // for by name), and the point-blank AoE bursts (Frost Nova, Arcane
      // Explosion, Dragon's Breath) share Cast_Nova's "slam and radiate
      // outward" read regardless of school. Not every ability in the kit is
      // listed: this is the first batch's representative slice, not
      // exhaustive coverage (utility/buff/summon abilities keep the default
      // chop until a later batch).
      attackByAbility: {
        fireball: 'Cast_Fire',
        scorch: 'Cast_Fire',
        fire_blast: 'Cast_Fire',
        pyroblast: 'Cast_Fire',
        combustion: 'Cast_Fire',
        meteor: 'Cast_Fire',
        flamestrike: 'Cast_Fire',
        fireball_form: 'Cast_Fire',
        frostbolt: 'Cast_Frost',
        ice_lance: 'Cast_Frost',
        frozen_orb: 'Cast_Frost',
        blizzard: 'Cast_Frost',
        glacial_spike: 'Cast_Frost',
        ice_barrier: 'Cast_Frost',
        arcane_missiles: 'Cast_Arcane',
        arcane_surge: 'Cast_Arcane',
        arcane_intellect: 'Cast_Arcane',
        temporal_barrier: 'Cast_Arcane',
        temporal_echo: 'Cast_Arcane',
        temporal_cascade: 'Cast_Arcane',
        frost_nova: 'Cast_Nova',
        arcane_explosion: 'Cast_Nova',
        dragons_breath: 'Cast_Nova',
        polymorph: 'Cast_Polymorph',
      },
    },
    // Ability-specific spellcast clips (scripts/build_mage_ability_anims.mjs):
    // a mesh-free clip donor GLB baked off this rig's own spellcasting poses.
    animUrls: [`${PLAYERS}/mage_ability_anims.glb`],
    // The hat and cape render regardless of this list: the current mage.glb
    // rigs every accessory as a SkinnedMesh, and the show allowlist
    // (assets.ts) only hides non-skinned nodes. The hatted silhouette is the
    // sanctioned mage look; listing Mage_Cape is inert but kept as intent.
    show: ['Mage_Cape'],
    attach: [{ url: `${WEAPONS}/staff.glb`, bone: 'handslot.r' }],
    weaponSlots: [0],
  }),
  player_warlock: swims({
    url: `${PLAYERS}/mage.glb`,
    height: HUMANOID_H,
    clips: {
      ...kaykit(['Spellcast_Shoot']), // wand zap reads better than a staff bonk
      // Ability-specific spellcasts (scripts/build_warlock_ability_anims.mjs,
      // issue #2889): the warlock had zero attackByAbility overrides across
      // its kit, so every spell played the same wand zap. Mapped by school
      // (src/sim/content/classes.ts): shadow curses get the decisive clawed
      // point (Warlock_Cast_Shadow), fire gets the scrappier ignite flick
      // (Warlock_Cast_Fire), the life-drain channel gets its own sustained
      // pull (Warlock_Cast_Drain), and every instant-cast (castTime 0)
      // ability, regardless of mechanic, shares one fast decisive gesture
      // (Warlock_Cast_Burst), the same call the mage batch made folding
      // three different AoE mechanics into one Cast_Nova. This maps the
      // whole non-pet kit: the seven summon_* pet abilities are channels
      // with no combat swing to author, excluded the same way the hunter
      // batch excluded tame_beast/dismiss_pet/revive_pet.
      attackByAbility: {
        shadow_bolt: 'Warlock_Cast_Shadow',
        corruption: 'Warlock_Cast_Shadow',
        curse_of_agony: 'Warlock_Cast_Shadow',
        immolate: 'Warlock_Cast_Fire',
        searing_pain: 'Warlock_Cast_Fire',
        rain_of_fire: 'Warlock_Cast_Fire',
        drain_life: 'Warlock_Cast_Drain',
        shadowburn: 'Warlock_Cast_Burst',
        fear: 'Warlock_Cast_Burst',
        life_tap: 'Warlock_Cast_Burst',
        demon_skin: 'Warlock_Cast_Burst',
        spell_lock: 'Warlock_Cast_Burst',
      },
    },
    // Ability-specific spellcast clips (scripts/build_warlock_ability_anims.mjs):
    // a mesh-free clip donor GLB baked off this same mage.glb rig's own
    // poses, but its OWN clip names and timing, not a reuse of the mage's
    // mage_ability_anims.glb (the two GLBs are wired onto different
    // VisualDefs and never load together).
    animUrls: [`${PLAYERS}/warlock_ability_anims.glb`],
    show: [],
    attach: [
      { url: `${WEAPONS}/wand.glb`, bone: 'handslot.r' },
      { url: `${WEAPONS}/spellbook_open.glb`, bone: 'handslot.l', gripRef: 'Spellbook_open' },
    ],
    weaponSlots: [0], // mainhand (wand) swaps; spellbook offhand stays
    // Faint violet lift only, to tell this apart from the mage/priest models
    // it shares mage.glb with (same one-material-per-rig caveat as those two:
    // this multiplies skin and hair along with the robe). 0.45 read as a
    // saturated full-body purple wash on character create (issue #2678);
    // dropped further to 0.12, the same faint-wash strength the manifest
    // already uses elsewhere (mob_troll) to differentiate a shared model
    // without hiding its base texture.
    tint: 0x8d5fd3,
    tintStrength: 0.12,
  }),
  player_druid: swims({
    url: `${PLAYERS}/druid.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Melee_Attack_Chop']),
    // dedicated druid model (own texture, ships a Backpack mesh)
    attach: [{ url: `${WEAPONS}/staff.glb`, bone: 'handslot.r' }],
    weaponSlots: [0],
  }),

  // -- cosmetic body skin (class-agnostic; both the skin preview and a live
  //    player whose skinCatalog === 'mech', see visualKeyFor) ----------------
  player_mech: swims({
    url: `${PLAYERS}/Mech/characters/CombatMech.glb`,
    height: HUMANOID_H,
    // The mech is rigged to the same KayKit Rig_Medium skeleton as every other
    // player class; its GLB shipped with no clips, so the full KayKit set is
    // baked in from knight.glb (scripts/bake_mech_anims.mjs) — these names now
    // resolve like any other class. Lazy-loaded; see preloadMechAssets().
    clips: kaykit(['1H_Melee_Attack_Chop']),
    // Same bow-draw donor the hunter loads. The mech is the one body that shows
    // a HUNTER's equipped weapon, so it is also the one body besides the hunter
    // that can display a bow skin, and Bow_Draw_Shot targets the same KayKit
    // Rig_Medium bones this model uses. Without it a displayed bow falls back to
    // the melee chop (skin_attack.ts pickSkinAttackClips).
    animUrls: [`${PLAYERS}/bow_anims.glb`],
    // Class-agnostic cosmetic body, but it still holds the wearer's equipped
    // mainhand: the shared handslot.r bone carries the grip (the mech reuses the
    // exact KayKit rig), so weaponSlots swaps attach[0] to the equipped weapon's
    // model just like every other class. The sword is only the no-weapon default.
    attach: [{ url: `${WEAPONS}/sword_1handed.glb`, bone: 'handslot.r' }],
    weaponSlots: [0],
    lazyPreload: true,
  }),

  // -- ArcForge / Meshy realm player bodies --------------------------------
  // These override only the rendered body. templateId remains the upstream
  // class, so combat, equipment, spells, talents, and persistence stay stable.
  realm_cryptic_bone_herald: {
    url: `${REALM_MODELS}/crypticrealm/bone-herald-black-meshy_ai_meshy_merged_animations_5fb3b8bb.glb`,
    height: HUMANOID_H,
    // RE-RIGGED: this GLB was rebound onto the KayKit reference skeleton and now
    // carries the standard 22-clip vocabulary. The Meshy take names this map was
    // written for are gone from the file, so it bound at most 'Idle' and the body
    // had no walkBack, sit, swim, stow or emote at all.
    clips: kaykit(['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal']),
    lazyPreload: true,
  },
  realm_infernal_crimson_behemoth: {
    url: `${REALM_MODELS}/infernal/meshy_ai_crimson_infernal_behe_biped_meshy_ai_meshy_merged_animations_27bab94d.glb`,
    height: 2.9,
    // NOT bank-wired, and this is the rule the bank has to live by: the 48 clips
    // are authored on a HUMANOID body. A non-humanoid rig that happens to share
    // the meshy24 joint names binds all 48 cleanly, preserves every bone length
    // (they are rotations-only), reports every state as moving - and renders as a
    // shredded spike, because humanoid joint rotations are meaningless on a
    // digitigrade, winged or long-necked rest pose. Verified by rendering it.
    // The export carries only locomotion + jumps; there is no idle/hit/death/cast
    // take, so Walking stands in for rest and reactions and the spin-jump doubles as
    // the swing. Names verified against the shipped GLB (scripts/audit_clips.mjs).
    clips: {
      idle: 'Walking',
      walk: 'Walking',
      run: 'RunFast',
      attack: ['360_Power_Spin_Jump'],
      death: 'Walking',
      hit: ['Walking'],
    },
    lazyPreload: true,
  },
  realm_infernal_horned_demon: {
    url: `${REALM_MODELS}/infernal/demon-horned_1a19d7ca.glb`,
    height: HUMANOID_H,
    // RE-RIGGED onto the KayKit reference skeleton: the locomotion-only Meshy
    // export this map was written for no longer exists, and the file now carries
    // the full 22-clip vocabulary. Not one name matched, so it bound NOTHING and
    // stood in bind pose through every state.
    clips: kaykit(['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal']),
    lazyPreload: true,
  },
  realm_infernal_skullbeast: {
    url: `${REALM_MODELS}/infernal/skullbeast_5d2ecebf.glb`,
    height: 2.4,
    // NOT bank-wired, and this is the rule the bank has to live by: the 48 clips
    // are authored on a HUMANOID body. A non-humanoid rig that happens to share
    // the meshy24 joint names binds all 48 cleanly, preserves every bone length
    // (they are rotations-only), reports every state as moving - and renders as a
    // shredded spike, because humanoid joint rotations are meaningless on a
    // digitigrade, winged or long-necked rest pose. Verified by rendering it.
    // Unsteady_Walk is the closest thing to an idle this export has; the standard
    // Idle/Hit/Death/Cast/Basic_Jump takes are simply not in the file.
    clips: {
      idle: 'Unsteady_Walk',
      walk: 'Monster_Walk',
      run: 'Running',
      attack: ['Left_Slash'],
      death: 'Unsteady_Walk',
      hit: ['Unsteady_Walk'],
    },
    lazyPreload: true,
  },
  // Playable Infernal archetypes use one distinct, full-size body each. They
  // are deliberately separate from the civilian bank below: changing a class
  // can never turn every smith or merchant into that class body.
  realm_infernal_class_warrior: infernalHuman('infernal_class_warrior.glb', 2.3),
  realm_infernal_class_rogue: infernalHuman('infernal_class_rogue.glb', 2.2),
  realm_infernal_class_sorcerer: infernalHuman('infernal_class_sorcerer.glb', 2.2),
  realm_infernal_class_amazon: infernalHuman('infernal_class_amazon.glb', 2.25),
  realm_infernal_class_barbarian: infernalHuman('infernal_class_barbarian.glb', 2.3),
  realm_infernal_class_necromancer: infernalHuman('infernal_class_necromancer.glb', 2.2),
  realm_infernal_class_paladin: infernalHuman('infernal_class_paladin.glb', 2.3),
  realm_infernal_class_druid: infernalHuman('infernal_class_druid.glb', 2.2),
  realm_infernal_class_assassin: infernalHuman('infernal_class_assassin.glb', 2.2),
  realm_infernal_class_demon_hunter: infernalHuman('infernal_class_demon_hunter.glb', 2.2),
  realm_infernal_class_monk: infernalHuman('infernal_class_monk.glb', 2.2),
  realm_infernal_class_wizard: infernalHuman('infernal_class_wizard.glb', 2.2),
  realm_infernal_class_witch_doctor: infernalHuman('infernal_class_witch_doctor.glb', 2.2),
  realm_infernal_class_crusader: infernalHuman('infernal_class_crusader.glb', 2.3),
  realm_infernal_class_spiritborn: infernalHuman('infernal_class_spiritborn.glb', 2.25),
  realm_infernal_class_warlock: infernalHuman('infernal_class_warlock.glb', 2.2),
  realm_infernal_class_blood_knight: infernalHuman('infernal_class_blood_knight.glb', 2.25),
  realm_infernal_class_tempest: infernalHuman('infernal_class_tempest.glb', 2.2),
  // Visually reviewed PICKTURA civilians. These share a compatible Meshy biped
  // skeleton and a compact action pack, so every NPC can stop, run, attack,
  // cast, react, die, jump, wave, and taunt.
  realm_infernal_human_iron_warden: infernalHuman('infernal_human_iron_warden.glb', 2.3),
  realm_infernal_human_vanguard: infernalHuman('infernal_human_vanguard.glb', 2.25),
  realm_infernal_human_forge_worker: infernalHuman('infernal_human_forge_worker.glb', 2.2),
  realm_infernal_human_white_sage: infernalHuman('infernal_human_white_sage.glb', 2.2),
  realm_infernal_human_tainted_hood: infernalHuman('infernal_human_tainted_hood.glb', 2.2),
  realm_infernal_human_weathered_elder: infernalHuman('infernal_human_weathered_elder.glb', 2.15),
  realm_infernal_human_road_mercenary: infernalHuman('infernal_human_road_mercenary.glb', 2.25),
  realm_infernal_human_iron_ranger: infernalHuman('infernal_human_iron_ranger.glb', 2.2),
  realm_infernal_human_hooded_wanderer: infernalHuman('infernal_human_hooded_wanderer.glb', 2.15),
  realm_infernal_human_hermit: infernalHuman('infernal_human_hermit.glb', 2.15),
  realm_infernal_human_barbarian: infernalHuman('infernal_human_barbarian.glb', 2.3),
  realm_infernal_human_veil_adept: infernalHuman('infernal_human_veil_adept.glb', 2.2),
  realm_infernal_human_assassin: infernalHuman('infernal_human_assassin.glb', 2.2),
  realm_infernal_human_monk: infernalHuman('infernal_human_monk.glb', 2.2),
  realm_infernal_human_crusader: infernalHuman('infernal_human_crusader.glb', 2.3),
  realm_infernal_human_spiritborn: infernalHuman('infernal_human_spiritborn.glb', 2.25),
  realm_infernal_human_blood_knight: infernalHuman('infernal_human_blood_knight.glb', 2.25),
  realm_infernal_human_tempest: infernalHuman('infernal_human_tempest.glb', 2.25),
  // DuranceTester is always the armored human Warrior body, never a demon.
  // Character identity, house ownership, inventory, and persistence are not
  // changed by this presentation-only override.
  realm_infernal_durance_humanoid: infernalHuman('infernal_class_warrior.glb', 2.3),
  realm_infernal_dark_paladin: {
    url: `${REALM_MODELS}/infernal/dark_paladin_commander.glb`,
    height: 2.35,
    // RE-RIGGED onto the KayKit reference skeleton. The "Armature|<take>|baselayer"
    // names this map was fixed to are gone from the file, so it bound nothing and the
    // commander stood in bind pose. The two sidecar animUrls went with them: both now
    // carry the SAME 22 clips as the body itself, so they were two extra
    // multi-megabyte lazy fetches contributing no clip the body did not already have.
    clips: kaykit(['2H_Melee_Attack_Chop', '1H_Melee_Attack_Chop']),
    lazyPreload: true,
  },
  // --- Durance of Hate delve enemies: real infernal demon bodies (no KayKit) ---
  hellmaw_husk_body: {
    // Hateful Husk: lava demon with horns — the rushing trash of the descent.
    url: `${REALM_MODELS}/infernal/meshy_ai_lava_demon_with_horns_0616234329_texture_9a64c154.glb`,
    height: 2.4,
    clips: meshyBiped(),
    lazyPreload: true,
  },
  hellmaw_acolyte_body: {
    // Sigil-Bound Acolyte: a robed/cloaked demon caster (body-cover demon). The old
    // "black spectre" GLB mis-rendered (looked like a unicorn) — swapped to a proper
    // demonic caster body.
    url: `${REALM_MODELS}/infernal/meshy_ai_demon_with_body_cover_0616234415_texture_540be2b1.glb`,
    height: 2.6,
    clips: meshyBiped(),
    lazyPreload: true,
  },
  hellmaw_behemoth_body: {
    // Blood Behemoth (mini-anchor): the horned demon warrior. The Crimson Infernal
    // Behemoth model is now reserved for THE BUTCHER (the true endboss).
    url: `${REALM_MODELS}/infernal/meshy_ai_horned_demon_warrior_0616234420_texture_2233cac0.glb`,
    height: 3.2,
    // RE-RIGGED: this GLB was rebound onto the KayKit reference skeleton and now
    // carries the standard 22-clip vocabulary. The Meshy take names this map was
    // written for are gone from the file, so it bound at most 'Idle' and the body
    // had no walkBack, sit, swim, stow or emote at all.
    clips: kaykit(['2H_Melee_Attack_Chop']),
    lazyPreload: true,
  },
  // --- New infernal monster bodies (the big asset push) --------------------
  hellmaw_spectre_body: {
    // Wailing Spectre: a black evil wraith — fast, ghostly caster.
    url: `${REALM_MODELS}/infernal/meshy_ai_a_black_evil_spectr_0616234348_texture_abacb7f9.glb`,
    height: 2.6,
    clips: meshyBiped(),
    lazyPreload: true,
  },
  hellmaw_cursed_knight_body: {
    // Cursed Iron Knight: an armored revenant, heavy melee.
    url: `${REALM_MODELS}/infernal/meshy_ai_cursed_knight_s_iro_0616234359_texture_abda8208.glb`,
    height: 2.8,
    // RE-RIGGED: this GLB was rebound onto the KayKit reference skeleton and now
    // carries the standard 22-clip vocabulary. The Meshy take names this map was
    // written for are gone from the file, so it bound at most 'Idle' and the body
    // had no walkBack, sit, swim, stow or emote at all.
    clips: kaykit(['1H_Melee_Attack_Chop', '2H_Melee_Attack_Chop']),
    lazyPreload: true,
  },
  hellmaw_lava_fiend_body: {
    // Lava Fiend: a molten demon with visible lava — bursting elemental.
    url: `${REALM_MODELS}/infernal/meshy_ai_lava_demon_visible_l_0616234410_texture_a72a9ef6.glb`,
    height: 2.5,
    clips: meshyBiped(),
    lazyPreload: true,
  },
  hellmaw_sigilbound_body: {
    // Sigil-Bound Warlock: the second cloaked caster-demon variant.
    url: `${REALM_MODELS}/infernal/meshy_ai_demon_with_body_cover_0616234440_texture_fd4134d0.glb`,
    height: 2.7,
    clips: meshyBiped(),
    lazyPreload: true,
  },
  hellmaw_primal_beast_body: {
    // Primal Emberbeast: a huge quadruped brute (Groudon-esque).
    url: `${REALM_MODELS}/infernal/meshy_ai_a_primal_groudon_emer_0616234337_texture_194376eb.glb`,
    height: 3.6,
    clips: meshyBiped(),
    lazyPreload: true,
  },
  hellmaw_dragon_body: {
    // Inferno Dragon: a majestic winged terror — the infernal overworld apex mob.
    url: `${REALM_MODELS}/infernal/meshy_ai_inferno_dragon_majest_0616234236_texture_aefc89dc.glb`,
    height: 5.0,
    clips: meshyBiped(),
    lazyPreload: true,
  },
  hellmaw_render_body: {
    // THE RENDER — the Infernal Behemoth (biped, animated). The oversized final
    // horror of the descent. Ships its own clip set: Attack / Axe_Spin_Attack /
    // Running / Walking / Basic_Jump / combos — no Idle/Death/Cast/Hit, so those
    // alias the nearest clip (idle→Walking, cast→Axe_Spin_Attack, death/hit→Attack).
    url: `${REALM_MODELS}/infernal/meshy_ai_infernal_behemoth_biped_merged_animations.glb`,
    height: 4.6,
    clips: {
      idle: 'Walking',
      walk: 'Walking',
      run: 'Running',
      attack: ['Attack', 'Double_Combo_Attack', 'Triple_Combo_Attack'],
      hit: ['Attack'],
      death: 'Attack',
      cast: 'Axe_Spin_Attack',
      jump: 'Basic_Jump',
    },
    lazyPreload: true,
  },
  realm_classic_orc: {
    url: `${REALM_MODELS}/classic/another-orc-meshy_ai_meshy_merged_animations_743223cb.glb`,
    height: HUMANOID_H,
    // RE-RIGGED: this GLB was rebound onto the KayKit reference skeleton and now
    // carries the standard 22-clip vocabulary. The Meshy take names this map was
    // written for are gone from the file, so it bound at most 'Idle' and the body
    // had no walkBack, sit, swim, stow or emote at all.
    clips: kaykit(['1H_Melee_Attack_Chop', '2H_Melee_Attack_Chop']),
    lazyPreload: true,
  },
  realm_classic_big_orc: {
    url: `${REALM_MODELS}/classic/bigass-orc-meshy_ai_meshy_merged_animations_86937638.glb`,
    height: 2.8,
    // meshy24 rig, so the shared bank drives it: this export has no idle, no hit,
    // no death and no cast take of its own, which is why Walking used to stand in
    // for dying. Its own gait stays; the bank fills the rest.
    animUrls: [MESHY_CLIP_BANK_URL],
    clips: withMeshyBank({
      idle: 'Idle_Alt_A',
      walk: 'Walking',
      run: 'Running',
      attack: [],
      death: 'Death_A',
      jump: 'Basic_Jump',
    }),
    lazyPreload: true,
  },
  realm_classic_fighting_elf: {
    url: `${REALM_MODELS}/classic/fighting-elf-meshy_ai_meshy_merged_animations_943c5367.glb`,
    height: HUMANOID_H,
    // RE-RIGGED: this GLB was rebound onto the KayKit reference skeleton and now
    // carries the standard 22-clip vocabulary. The Meshy take names this map was
    // written for are gone from the file, so it bound at most 'Idle' and the body
    // had no walkBack, sit, swim, stow or emote at all.
    clips: kaykit(['1H_Melee_Attack_Slice_Diagonal', 'Dualwield_Melee_Attack_Chop']),
    lazyPreload: true,
  },
  realm_classic_dwarf: {
    url: `${REALM_MODELS}/classic/gray-dwarf-meshy_ai_meshy_merged_animations_a33ff315.glb`,
    height: 2.25,
    // RE-RIGGED: this GLB was rebound onto the KayKit reference skeleton and now
    // carries the standard 22-clip vocabulary. The Meshy take names this map was
    // written for are gone from the file, so it bound at most 'Idle' and the body
    // had no walkBack, sit, swim, stow or emote at all.
    clips: kaykit(['1H_Melee_Attack_Chop', '2H_Melee_Attack_Chop']),
    lazyPreload: true,
  },
  realm_classic_female_elf: {
    url: `${REALM_MODELS}/classic/female-elf-meshy_ai_meshy_merged_animations_2dde3113.glb`,
    height: HUMANOID_H,
    // RE-RIGGED: this GLB was rebound onto the KayKit reference skeleton and now
    // carries the standard 22-clip vocabulary. The Meshy take names this map was
    // written for are gone from the file, so it bound at most 'Idle' and the body
    // had no walkBack, sit, swim, stow or emote at all.
    clips: kaykit(['1H_Melee_Attack_Slice_Diagonal', '2H_Ranged_Shoot']),
    lazyPreload: true,
  },
  realm_classic_female_orc: {
    url: `${REALM_MODELS}/classic/female-orc-meshy_ai_meshy_merged_animations_a5a08a67.glb`,
    height: HUMANOID_H,
    // RE-RIGGED: this GLB was rebound onto the KayKit reference skeleton and now
    // carries the standard 22-clip vocabulary. The Meshy take names this map was
    // written for are gone from the file, so it bound at most 'Idle' and the body
    // had no walkBack, sit, swim, stow or emote at all.
    clips: kaykit(['1H_Melee_Attack_Chop', '2H_Melee_Attack_Chop']),
    lazyPreload: true,
  },
  realm_classic_treasure_dwarf: {
    url: `${REALM_MODELS}/classic/treasure-dwarf-meshy_ai_meshy_merged_animations_91488daf.glb`,
    height: 2.25,
    // meshy24 rig, so the shared bank drives it: this export has no idle, no hit,
    // no death and no cast take of its own, which is why Walking used to stand in
    // for dying. Its own gait stays; the bank fills the rest.
    animUrls: [MESHY_CLIP_BANK_URL],
    clips: withMeshyBank({
      idle: 'Idle_Alt_A',
      walk: 'Walking',
      run: 'Running',
      attack: [],
      death: 'Death_A',
    }),
    lazyPreload: true,
  },
  realm_classic_kitty: {
    url: `${REALM_MODELS}/classic/kitty_a4be04fa.glb`,
    height: 1.3,
    clips: {
      ...meshyBiped([], {
        walk: 'Armature|Unreal Take|baselayer',
        run: 'Armature|Unreal Take|baselayer',
      }),
      jump: 'Armature|Unreal Take|baselayer',
    },
    lazyPreload: true,
  },

  // -- Claudecraft realm creature bank -------------------------------------
  // Every GLB in the claudecraft realm store, previously unreferenced by any
  // visual key. Bodies only: template ids still own families, loot, and combat.
  // Several of these PICKTURA exports ship one baked take instead of named
  // locomotion, so those ClipMaps alias that single clip the way
  // realm_classic_kitty does rather than naming clips the GLB lacks.
  realm_claudecraft_arcane_dragon: claudecraftSingleTake('arcane-dragon_959f8113.glb', 3.4),
  realm_claudecraft_frost_dragon: claudecraftSingleTake('frostdragon_06cc2f9d.glb', 3.2),
  realm_claudecraft_polar_bear: claudecraftSingleTake('polar_bear_4d071124.glb', 2.2),
  realm_claudecraft_blue_beast: claudecraftSingleTake('bluebeast_b30343f9.glb', 2.0),
  realm_claudecraft_beaver: claudecraftSingleTake('beaver_f5a697cf.glb', 1.1),
  realm_claudecraft_boar: claudecraftSingleTake('classic-boar_26671af0.glb', 1.3),
  realm_claudecraft_spine_boar: claudecraftSingleTake('spine-boar_a9e4abad.glb', 1.4),
  realm_claudecraft_crab: claudecraftSingleTake('crab_e3b8fff8.glb', 1.0),
  realm_claudecraft_horse: claudecraftSingleTake('horse_493905c2.glb', 2.1),
  realm_claudecraft_water_dinosaur: claudecraftSingleTake('water-dinosaur-rawr_acffaf83.glb', 2.2),
  realm_claudecraft_mini_orc: claudecraftBody('mini-orc_895fa3da.glb', 1.5, {
    idle: 'Armature|walking_man|baselayer',
    walk: 'Armature|walking_man|baselayer',
    run: 'Armature|walking_man|baselayer',
    attack: [],
    death: 'Armature|walking_man|baselayer',
    hit: [],
    jump: 'Armature|walking_man|baselayer',
  }),
  realm_claudecraft_parrot: claudecraftBody('parot-blue_48ee9609.glb', 1.0, {
    idle: 'Thoughtful_Walk',
    walk: 'Walking',
    run: 'Running',
    attack: [],
    death: 'Formal_Bow',
    hit: [],
  }),
  realm_claudecraft_skeleton_archer: claudecraftBody('skeleton_d7adee4e.glb', HUMANOID_H, {
    idle: 'Walking',
    walk: 'Walking',
    run: 'Running',
    attack: ['Archery_Shot_1', 'Draw_and_Shoot_from_Back'],
    death: 'Dead',
    hit: [],
  }),
  realm_claudecraft_zombie: claudecraftBody('goofy_zombie_42cc51b9.glb', HUMANOID_H, {
    idle: 'Walking',
    walk: 'Walking',
    run: 'Running',
    attack: ['Zombie_Scream'],
    death: 'Dead',
    hit: ['BeHit_FlyUp'],
  }),
  realm_claudecraft_fighting_ghost: claudecraftBody('fighting-ghost_1f46604e.glb', HUMANOID_H, {
    idle: 'Walking',
    walk: 'Walking',
    run: 'Running',
    attack: [],
    death: 'Walking',
    hit: [],
  }),
  realm_claudecraft_demon: claudecraftBody(
    'demon-male-meshy_ai_meshy_merged_animations_f1e842c4.glb',
    2.4,
    {
      idle: 'Walking',
      walk: 'Walking',
      run: 'Running',
      attack: ['Skill_01'],
      death: 'Walking',
      hit: [],
    },
  ),
  realm_claudecraft_dark_knight: claudecraftBody('dark-knight_53d5a5c0.glb', 2.3, {
    idle: 'Combat_Stance',
    walk: 'Walking',
    run: 'Running',
    attack: ['Left_Slash', 'Double_Combo_Attack', 'Sword_Judgment'],
    death: 'Dead',
    hit: [],
    cast: 'Sword_Shout',
    jump: 'Basic_Jump',
  }),
  realm_claudecraft_dark_wanderer: claudecraftBody('dark-wanderer_01151979.glb', HUMANOID_H, {
    idle: 'Stand_and_Chat',
    walk: 'Walking',
    run: 'Running',
    attack: ['Attack'],
    death: 'Dead',
    hit: [],
    cast: 'Skill_01',
  }),
  realm_claudecraft_horned_knight: claudecraftBody(
    'horned-knight-meshy_ai_meshy_merged_animations_309fa4a3.glb',
    2.25,
    {
      idle: 'Walking',
      walk: 'Walking',
      run: 'Running',
      attack: [],
      death: 'Walking',
      hit: [],
    },
  ),
  realm_claudecraft_mini_orc_scout: claudecraftBody('mini-orc2_dd125cdc.glb', 1.5, {
    idle: 'Walking',
    walk: 'Walking',
    run: 'run_fast_2',
    attack: [],
    death: 'Walking',
    hit: [],
  }),
  realm_claudecraft_mini_elf: claudecraftBody('mini-elf-bearded_89f11a62.glb', 1.5, {
    idle: 'Walking',
    walk: 'Walking',
    run: 'Running',
    attack: [],
    death: 'Walking',
    hit: [],
  }),

  // -- forms ---------------------------------------------------------------
  form_sheep: {
    url: `${CREATURES}/alpaca.glb`,
    height: 1.2,
    clips: animal(['Attack_Headbutt']),
  },
  // Purpose-built quadruped (replaced a brown-tinted yeti, which was a biped
  // standing in for a bear). No tint: the sculpt ships its own texture.
  // walkRef/runRef are measured from the clips themselves (a planted foot slides
  // backwards relative to the hips at exactly body speed), scaled by
  // height/rawHeight = 2.35/0.588. They put full run (RUN_SPEED 7) at timeScale
  // 1.30, clear of the 1.6 clamp where feet start skating.
  form_bear: {
    url: `${CREATURES}/bear_form.glb`,
    height: 2.35,
    clips: BEAR_FORM,
    walkRef: 1.6,
    runRef: 5.4,
    attackTimeScale: 1,
  },
  // Druid Wolf Form AND shaman Shadewolf (ghost_wolf renders this visual with
  // the ghost material on top). Same custom baked wolf as the world wolves;
  // the tawny tint keeps the druid form readable against grey pack wolves.
  form_cat: {
    url: `${CREATURES}/wolf_basic.glb`,
    height: 1.6,
    clips: WOLF_BAKED,
    tint: 0xd08b45,
    tintStrength: 0.35,
  },
  // Druid Travel Form: a daft chicken-cow hybrid (custom GLB). No tint: its
  // authored cow-spots/comb/beak colours carry the look.
  form_travel: {
    url: `${CREATURES}/chicken_cow.glb`,
    height: 2.3,
    clips: CHICKEN_COW,
  },

  // -- rideable mounts (src/sim/content/mounts.ts catalog) -------------------
  // All lazyPreload: fetched on the first sight of a mounted player
  // (preloadMountAssets in assets.ts), never in the boot sweep. Baked
  // textures, no tint. Seat heights + procedural bob live in
  // src/render/mount_visuals.ts. Heights are deliberately imposing (a mount
  // should tower over the 2.6 humanoid the way a horse towers over a person);
  // walkRef/runRef foot-match each model's Walk/Run cycle cadence (baked or
  // authored) to mounted ground speed.
  // The horse ships AUTHORED gait clips (Idle/Walk/Run baked from the source
  // model's own animation set, Sleep repurposed as Death), not the procedural
  // bake_mount_gaits.mjs cycles the Tripo mounts carry; walkRef/runRef are
  // re-matched to its 1.03s walk / 0.40s gallop cadence.
  mount_valorsteed: {
    url: `${MOUNTS_DIR}/valorsteed.glb`,
    height: 3.8,
    clips: MOUNT_RIGGED,
    walkRef: 2.3,
    runRef: 12,
    lazyPreload: true,
  },
  mount_grag_bear: {
    url: `${MOUNTS_DIR}/grag_bear.glb`,
    height: 4.0,
    clips: MOUNT_RIGGED,
    walkRef: 2.6,
    runRef: 9,
    lazyPreload: true,
  },
  mount_stalkglider_snail: {
    url: `${MOUNTS_DIR}/stalkglider_snail.glb`,
    height: 3.1,
    clips: MOUNT_RIGGED,
    lazyPreload: true,
  },
  mount_aether_hover_cycle: {
    url: `${MOUNTS_DIR}/aether_hover_cycle.glb`,
    height: 2.3,
    clips: MOUNT_RIGGED,
    hover: 0.6,
    lazyPreload: true,
  },
  mount_shadowjump_toad: {
    url: `${MOUNTS_DIR}/shadowjump_toad.glb`,
    height: 3.2,
    clips: MOUNT_RIGGED,
    walkRef: 2.6,
    runRef: 9,
    lazyPreload: true,
  },
  mount_stormfeather_griffin: {
    url: `${MOUNTS_DIR}/stormfeather_griffin.glb`,
    height: 4.1,
    clips: MOUNT_RIGGED,
    walkRef: 2.6,
    runRef: 9,
    lazyPreload: true,
  },
  // Epic world-boss turkey: one authored strut cycle serves as BOTH Walk and
  // Run (plus a baked breathing Idle), so the run reference is deliberately
  // low; at full mounted speed the strut plays fast, which is the joke.
  mount_thunderstrut_gobbler: {
    url: `${MOUNTS_DIR}/thunderstrut_gobbler.glb`,
    height: 3.5,
    clips: MOUNT_RIGGED,
    walkRef: 1.8,
    runRef: 4.5,
    lazyPreload: true,
  },
  // Compact fantasy tank. One wheel revolution per locomotion clip matches
  // its authored tread cadence at the reference ground speeds below.
  mount_terrorspark_groundshaker: {
    url: `${MOUNTS_DIR}/terrorspark_groundshaker.glb`,
    height: 2.8,
    clips: MOUNT_RIGGED,
    walkRef: 3,
    runRef: 4.4,
    lazyPreload: true,
  },
  // The Drakemaw Raptor (broodlord legendary drop): saddle-broken Tripo biped,
  // gait-baked by scripts/bake_mount_gaits.mjs like the bear/toad/griffin. The
  // imported source clips drove Hip TRANSLATION half a model unit off the bind
  // pose (baked-in root motion), which at this height threw the body clear of
  // the saddle and lurched it every stride; the baker authors rotation-only
  // keys plus a root Y bob, so that cannot recur. walkRef is MEASURED off the
  // baked clip (tmp/dragonkin_gait_measure.mjs): walk 3.02 yd/s.
  mount_drakemaw_raptor: {
    url: `${MOUNTS_DIR}/drakemaw_raptor.glb`,
    height: 3.4,
    clips: MOUNT_RIGGED,
    walkRef: 3.0,
    // runRef is deliberately the RIDDEN speed (RUN_SPEED 7 x +80% = 12.6), not
    // the Run clip's measured 9.04 yd/s, so timeScale lands on exactly 1.0 and
    // the clip plays at its authored 2.0 strides/sec (6.3 yd per bound).
    // Foot-matching instead (runRef 9.04) gives timeScale 1.48 and a 2.96/sec
    // cadence, which read as badly sped up on a 3.4 yd mount. That is the real
    // tradeoff on this rig: under a perfect foot match, cadence is
    // bodySpeed / (2 x stride x normScale) and so depends only on stride
    // LENGTH, never on clip duration, which timeScale rescales away. Short legs
    // therefore can only buy a calm cadence with slide. This costs 28%, well
    // inside what the other baked mounts already ship (grag_bear's 3.58 yd/s
    // natural against the same 12.6 leaves it sliding over half its travel).
    runRef: 12.6,
    lazyPreload: true,
  },

  // Ambient Highwatch stable horse (sim mob 'stable_horse', MOB_KEYS below). Reuses
  // the Valorsteed GLB + its authored gait clips so it renders and ambles as a real
  // horse through the STANDARD mob-visual path, never a humanoid capsule. Unlike the
  // rider mounts this is NOT lazyPreload: a mob body is built synchronously by
  // createCharacterVisual (which throws on a not-yet-fetched asset), so it must be
  // in the boot sweep. Shorter than the imposing 3.8 ridden Valorsteed so loose
  // paddock horses read at a natural size; no tint (authored colours).
  mob_stable_horse: {
    url: `${MOUNTS_DIR}/valorsteed.glb`,
    height: 2.9,
    clips: MOUNT_RIGGED,
    walkRef: 2.3,
    runRef: 12,
  },

  // -- mob families --------------------------------------------------------
  mob_wolf: {
    // Custom Tripo wolf auto-rigged onto the Dog_Animation quadruped skeleton
    // (same pipeline as greyjaw), clips renamed to the animal() names at bake
    // time. Baked basecolor texture; keeps a light entity tint so this doubles
    // as the beast-family fallback and each beast keeps its own colour.
    url: `${CREATURES}/wolf_basic.glb`,
    height: 1.6,
    clips: WOLF_BAKED,
    tint: 'entity',
    tintStrength: 0.35,
  },
  // The Gleamfolk pixie villager (Veiled Hollow): Tripo biped from the user's
  // game-style concept, auto-rigged, clips renamed to the game vocabulary at
  // bake time. A light entity tint gives individual villagers variety.
  mob_mushroom_pixie: {
    url: `${CREATURES}/mushroom_pixie.glb`,
    height: HUMANOID_H, // villagers stand player-height, cap and all
    // The Tripo rig rests facing +x; yaw swings the model onto the game's
    // +z-forward convention so walking and combat face the right way.
    yaw: -Math.PI / 2,
    clips: {
      idle: 'Idle',
      walk: 'Walk',
      run: 'Run',
      attack: ['Attack'],
      hit: ['Hit'],
      death: 'Death',
      cast: 'Cast',
      jump: 'Jump',
    },
    tint: 'entity',
    tintStrength: 0.2,
  },
  greyjaw: {
    // Custom Tripo wolf auto-rigged onto the Dog_Animation quadruped skeleton;
    // clips renamed to the animal() names at bake time. Baked texture, no tint.
    // Old Greyjaw's model: 2.2 at scale 1 (his template scale 1.25 makes the
    // rare ~2.75 in-world vs the 1.6 pack wolf).
    url: `${CREATURES}/greyjaw.glb`,
    height: 2.2,
    clips: WOLF_BAKED,
  },
  mob_boar: {
    url: `${CREATURES}/wild_boar.glb`,
    height: 1.45,
    clips: WILD_BOAR,
    tint: 'entity',
    tintStrength: 0.4,
  },
  // Quaternius animal rig (shares clip names with wolf) — fox/deer/critters that
  // would otherwise fall back to mob_wolf via FAMILY_KEYS['beast'].
  mob_fox: {
    url: `${CREATURES}/fox.glb`,
    height: 1.0,
    clips: animal(['Attack']),
    tint: 'entity',
    tintStrength: 0.35,
  },
  // smaller silhouette of the same rig for ground critters (hares, badgers);
  // no dedicated rabbit/mustelid asset ships, so this is the closest small beast.
  mob_critter: {
    url: `${CREATURES}/fox.glb`,
    height: 0.7,
    clips: animal(['Attack']),
    tint: 'entity',
    tintStrength: 0.35,
  },
  // Yumi, the Protect Yumi objective cat familiar (Meshy rig, scale baked by
  // scripts/_bake_meshy_scale.mjs, meshopt + 1024 webp). The GLB ships ONE
  // clip, the block: mapped as the HIT reaction so she blocks when struck
  // (playHit rides every landed damage event). No idle/walk clips on
  // purpose: the objective never moves on its own, and baseAction falls back
  // to the authored rest pose when a slot's clip is absent. Painted texture,
  // so no entity tint.
  mob_yumi_cat: {
    url: `${CREATURES}/yumi_cat.glb`,
    height: HUMANOID_H * 1.2, // the objective reads over player heads
    clips: {
      idle: 'None',
      walk: 'None',
      run: 'None',
      attack: [],
      death: 'None',
      hit: ['Armature|Block5|baselayer'],
    },
  },
  // Rideable mount rigs (src/sim/content/mounts.ts): the player renders ON
  // these bodies while the mount_<id> aura is up (renderer form-swap).
  mount_stag: {
    url: `${CREATURES}/stag.glb`,
    height: 2.1,
    clips: animal(['Attack_Headbutt', 'Attack']),
    tint: 'entity',
    tintStrength: 0.2,
  },
  mount_raptor: {
    url: `${CREATURES}/velociraptor.glb`,
    height: 2.0,
    clips: VELOCIRAPTOR,
    tint: 'entity',
    tintStrength: 0.2,
  },
  mount_wyrm: {
    url: `${CREATURES}/dragonevolved.glb`,
    height: 2.6,
    hover: 0.45,
    clips: FLOATING,
    tint: 'entity',
    tintStrength: 0.25,
  },
  // The Thornwheel Derby loaner kart (src/sim/social/derby.ts): the racer
  // rides the mine-cart prop rig while the mount_derby_kart aura is up. A
  // static prop GLB: no authored clips, so every slot falls back to the rest
  // pose (the yumi precedent).
  mount_derby_kart: {
    url: 'models/vehicles/gokart_bluestar.glb',
    height: 1.15,
    clips: {
      idle: 'None',
      walk: 'None',
      run: 'None',
      attack: [],
      death: 'None',
      hit: [],
    },
  },
  mob_stag: {
    url: `${CREATURES}/stag.glb`,
    height: 1.9,
    // Attack_Kick, not 'Attack': the rig ships no clip by that name, so every
    // second swing in the rotation resolved to nothing and played no animation
    // at all (the repainted siblings below always had it right).
    // Own bespoke charge attack (scripts/build_stag_anims.mjs, issue #2889):
    // spread the animal() factory result and override only attack, so the
    // repainted siblings (veiled_stag/gleamstag/veiled_doe/aurelhorn, separate
    // GLB files on the same rig) keep the standing Headbutt/Kick pair.
    clips: { ...animal(['Attack_Headbutt', 'Attack_Kick']), attack: ['Stag_Attack_Charge'] },
    animUrls: [`${CREATURES}/stag_ability_anims.glb`],
    tint: 'entity',
    tintStrength: 0.35,
  },
  // the Veiled Hollow stags: the shipped stag rig repainted to the approved
  // concepts (tmp/make_hollow_stags.mjs): dusk coats baked into the materials
  // and the antlers split onto their own emissive amethyst material, so no
  // entity tint (a wash would muddy the baked palette and the antler glow)
  mob_veiled_stag: {
    url: `${CREATURES}/veiled_stag.glb`,
    height: 1.9,
    clips: animal(['Attack_Headbutt', 'Attack_Kick']),
  },
  mob_gleamstag: {
    url: `${CREATURES}/gleamstag.glb`,
    height: 1.9,
    clips: animal(['Attack_Headbutt', 'Attack_Kick']),
  },
  // the does: the same rig with the antler mesh removed and a softer coat
  mob_veiled_doe: {
    url: `${CREATURES}/veiled_doe.glb`,
    height: 1.6,
    clips: animal(['Attack_Headbutt', 'Attack_Kick']),
  },
  // Aurelhorn keeps the bull's bulk (height) but joins the herd's species:
  // the same repainted stag rig in the patriarch's gold
  mob_aurelhorn: {
    url: `${CREATURES}/aurelhorn.glb`,
    height: 2.1,
    clips: animal(['Attack_Headbutt', 'Attack_Kick']),
  },
  // Training dummy: the immortal practice target (zone3.ts training_dummy,
  // hpBase 999999, no drops). Custom Tripo humanoid auto-rigged onto the
  // biped skeleton, KAYKIT_CLIP_PLAN vocabulary. The dummy never casts or
  // jumps (sim's dummy handling holds it stationary and ability-less), so
  // those two clips are stripped from the shipped GLB rather than carried as
  // dead weight. It appears in exactly one hub (zone3.ts, count: 1, radius:
  // 0), so it is lazy-preloaded rather than joining every client's eager
  // boot set.
  mob_training_dummy: {
    url: `${CREATURES}/training_dummy.glb`,
    height: 2.3,
    clips: {
      idle: 'Idle',
      walk: 'Walk',
      run: 'Run',
      attack: ['Attack'],
      hit: ['Hit'],
      death: 'Death',
    },
    lazyPreload: true,
    tint: 'entity',
    tintStrength: 0.35,
  },
  // Deepfen Spearjaw (The Drowned Litany): unused Quaternius raptor rig, a
  // toothy quadruped that reads far more like a swamp predator than the
  // generic wolf fallback (docs/prd/drowned-litany-asset-generation-plan.md).
  mob_spearjaw: {
    url: `${CREATURES}/velociraptor.glb`,
    height: 1.8,
    clips: VELOCIRAPTOR,
    tint: 'entity',
    tintStrength: 0.3,
  },
  // brown-tinted yeti rig, same recipe as the druid Bear form.
  mob_bear: {
    url: `${CREATURES}/yetialt.glb`,
    height: 2.2,
    clips: BIPED14,
    tint: 0x5a4030,
    tintStrength: 0.5,
  },
  // the same rig worn honestly: an ice-white yeti for the Frostveil
  mob_yeti: {
    url: `${CREATURES}/yetialt.glb`,
    height: 2.5,
    clips: BIPED14,
    tint: 'entity',
    tintStrength: 0.55,
  },
  mob_spider: {
    url: `${CREATURES}/spider.glb`,
    height: 1.4,
    clips: SPIDER,
    tint: 'entity',
    tintStrength: 0.35,
  },
  mob_murloc: {
    url: `${CREATURES}/frog.glb`,
    height: 1.7,
    clips: BIPED14,
    tint: 'entity',
    tintStrength: 0.45,
  },
  mob_kobold: {
    url: `${CREATURES}/goblin.glb`,
    height: 2.1,
    animUrls: [`${CREATURES}/kobold_ability_anims.glb`],
    clips: KOBOLD_ENEMY7,
    tint: 'entity',
    tintStrength: 0.2, // keep the green readable
  },
  // The Mirefen Marsh rare, replacing his stand-in generic-troll body. Only
  // the `grubjaw` template maps here (MOB_KEYS below), so every other troll
  // keeps mob_troll. Gait refs measured (tmp/dragonkin_gait_measure.mjs) at
  // his template scale 2.275: walk 4.36 (wander 2.63 -> 0.60x, exactly at the
  // clamp floor, which is why the build slows his Walk clip) and run 10.94
  // (chase 7.5 -> 0.69x). Both inside the matcher's clamps, so the feet plant.
  mob_grubjaw: {
    url: `${CREATURES}/grubjaw.glb`,
    height: 2.9,
    clips: GRUBJAW,
    walkRef: 4.36,
    runRef: 10.94,
    // Barely-there wash. mob_troll tints 0.12 toward its template's BRIGHT
    // green, which is what makes a stock Mirefen Troll pop; Grubjaw's own
    // template colour is a dark 0x145a32, so the same strength only muddied
    // his authored olive hide and read as near-black beside them.
    tint: 'entity',
    tintStrength: 0.04,
  },
  mob_troll: {
    url: `${CREATURES}/orc.glb`,
    height: 2.4,
    // faint wash only — 0.35 flooded every material with the template green
    clips: TROLL_BIPED14,
    // Troll_Smash clip donor (scripts/build_troll_anims.mjs): mesh-free,
    // baked off this same rig's own poses.
    animUrls: [`${CREATURES}/troll_ability_anims.glb`],
    tint: 'entity',
    tintStrength: 0.12,
  },
  mob_ogre: {
    url: `${CREATURES}/giant.glb`,
    height: 2.8,
    clips: ENEMY7,
    tint: 'entity',
    tintStrength: 0.2, // skin washes pink fast
  },
  // Five Wildheart troll silhouettes use the same complete biped vocabulary,
  // but preserve their woven cloth, bone paint, feathers, and jungle palette.
  mob_wildheart_stalker: {
    url: `${CREATURES}/wildheart_stalker.glb`,
    height: 2.5,
    yaw: -Math.PI / 2,
    clips: TRIPO_BIPED_FULL_RIG,
    tint: 'entity',
    tintStrength: 0.04,
  },
  mob_wildheart_ravager: {
    url: `${CREATURES}/wildheart_ravager.glb`,
    height: 2.7,
    yaw: -Math.PI / 2,
    clips: TRIPO_BIPED_FULL_RIG,
    tint: 'entity',
    tintStrength: 0.04,
  },
  mob_wildheart_hexcaller: {
    url: `${CREATURES}/wildheart_hexcaller.glb`,
    height: 2.5,
    yaw: -Math.PI / 2,
    clips: TRIPO_BIPED_FULL_RIG,
    tint: 'entity',
    tintStrength: 0.04,
  },
  mob_wildheart_beastmaster: {
    url: `${CREATURES}/wildheart_beastmaster.glb`,
    height: 3,
    yaw: -Math.PI / 2,
    clips: TRIPO_BIPED_FULL_RIG,
    tint: 'entity',
    tintStrength: 0.03,
  },
  mob_wildheart_high_priest: {
    url: `${CREATURES}/wildheart_high_priest.glb`,
    height: 3.2,
    yaw: -Math.PI / 2,
    clips: TRIPO_BIPED_FULL_RIG,
    tint: 'entity',
    tintStrength: 0.03,
  },
  mob_elemental: {
    url: `${CREATURES}/golelingevolved.glb`,
    height: 2.2,
    hover: 0.3,
    clips: ELEMENTAL_FLOATING,
    // Elemental_Attack clip donor (scripts/build_elemental_anims.mjs):
    // mesh-free, baked off this same rig's own poses.
    animUrls: [`${CREATURES}/elemental_ability_anims.glb`],
    tint: 'entity',
    tintStrength: 0.4,
  },
  mob_water_elemental: {
    url: `${CREATURES}/water_elemental.glb`,
    height: 2.65,
    hover: 0.12,
    clips: WATER_ELEMENTAL,
    attackTimeScale: 1.1,
  },
  mob_dragonkin: {
    url: `${CREATURES}/dragonevolved.glb`,
    height: 2.4,
    hover: 0.25,
    // light tint only — heavy washes crush the wyrm to black under the green
    // sanctum torchlight
    clips: FLOATING,
    tint: 'entity',
    tintStrength: 0.2,
  },
  // --- The Drakelands dragonkin brood (v0.35 rework) ---------------------
  // Tripo sculpts on the 25-bone mixamorig core with artist-authored clips,
  // baked by tmp/dragonkin_build.mjs. The brood replaces the old floating
  // dragonevolved wyrm ONLY in the Drakelands (per-template MOB_KEYS
  // overrides below); the other dragonkin-family mobs keep the family
  // fallback above.
  // The gait references below are MEASURED, not guessed
  // (tmp/dragonkin_gait_measure.mjs): ref = the clip's own natural world
  // speed, 2 x stride x normScale x entityScale / duration, which is exactly
  // what locomotionTimeScale divides the body speed by. They are per-DEF and
  // scale-dependent, which is why the matriarch has her own def below rather
  // than sharing the broodlord's: at scale 2.85 her stride covers 33% more
  // ground per cycle, and reusing the lord's refs over-strode her by 25%.
  mob_dragonkin_broodlord: {
    url: `${CREATURES}/dragonkin_elite.glb`,
    height: 2.6,
    clips: DRAGONKIN_BROODLORD,
    // scale 2.25: walk 4.24 (wander 3.3 -> 0.78x), run 7.92 (chase 9.5 ->
    // 1.20x). Both land inside the matcher's clamps, so the feet plant.
    walkRef: 4.24,
    runRef: 7.92,
    // 'entity' tint: the broodlords wash dark scale-brown (template color).
    tint: 'entity',
    tintStrength: 0.12,
  },
  // Cindraleth: the same GLB and clips as her broodlords, own refs for her
  // scale 2.85 body (walk 5.37, run 10.04 -> her 9.0 chase plays at 0.90x).
  // Her template color (0xf0b040) tints this shared body gold, so she reads
  // as the gilded mother of the same brood.
  mob_dragonkin_matriarch: {
    url: `${CREATURES}/dragonkin_elite.glb`,
    height: 2.6,
    clips: DRAGONKIN_BROODLORD,
    walkRef: 5.37,
    runRef: 10.04,
    tint: 'entity',
    tintStrength: 0.12,
  },
  mob_dragonkin_broodguard: {
    url: `${CREATURES}/dragonkin_mob.glb`,
    height: 2.2,
    clips: DRAGONKIN_BROODGUARD,
    // scale 1.5: walk 2.15 (wander 2.98 -> 1.39x), run 5.59 (chase 8.5 ->
    // 1.52x, a 0.55s sprint cadence). Feet plant at both speeds.
    walkRef: 2.15,
    runRef: 5.59,
    tint: 'entity',
    tintStrength: 0.1,
  },
  mob_dragonkin_whelp: {
    url: `${CREATURES}/dragonkin_baby.glb`,
    height: 1.05,
    clips: DRAGONKIN_WHELP,
    // scale 0.85: walk 0.54, run 1.87. A hatchling 0.9yd tall CANNOT
    // foot-match a 10 yd/s chase (11 body-lengths/sec, gecko territory: the
    // clip would need a 0.1s cycle), so this one keeps a residual slide by
    // physics, not by oversight. The compressed 0.32s cycle reads as a
    // frantic scurry, which is what hides it; the refs stay honest so the
    // slow wander gait (and any future speed change) still matches.
    walkRef: 0.54,
    runRef: 1.87,
    tint: 'entity',
    tintStrength: 0.1,
  },
  // The egg is a clipless two-shell prop mob: alive shows Egg_Closed, death
  // swaps to Egg_Open (the cracked shell IS the corpse; see corpseMeshSwap).
  mob_dragon_egg: {
    url: `${CREATURES}/dragon_egg.glb`,
    height: 0.95,
    clips: STATIC_PROP,
    corpseMeshSwap: { hide: 'Egg_Closed', show: 'Egg_Open' },
    tint: 'entity',
    tintStrength: 0.08,
  },
  // Bog Thrall (The Drowned Litany): unused floating ghost rig, a stronger
  // fit for an undead swarm add than the generic skel_minion skeleton
  // (docs/prd/drowned-litany-asset-generation-plan.md).
  mob_choir_thrall: {
    url: `${CREATURES}/ghost.glb`,
    height: 1.6,
    hover: 0.3,
    clips: FLOATING,
    // Strong pull toward the template's pale sage: the ghost's own materials
    // are charcoal-grey and vanish against the black Litany pools; undead in
    // this delve read bone-pale per the marsh palette brief in the asset plan.
    tint: 'entity',
    tintStrength: 0.6,
  },
  // Tolling Bell (The Drowned Litany): Meshy-generated, not a KayKit/Quaternius
  // reuse: a rolling bell has no obvious existing-asset stand-in
  // (docs/prd/drowned-litany-asset-generation-plan.md).
  mob_tolling_bell: {
    url: `${CREATURES}/tolling_bell.glb`,
    // Reads ~2m in world after the template's 0.6 scale: the rolling bell is a
    // boss projectile the player dodges, so it must loom, not look like a prop.
    height: 3.4,
    clips: TOLLING_BELL,
    tint: 'entity',
    tintStrength: 0.15,
  },
  // warlock demon pets (emberkin/gloomshade) — one biped rig, the entity colour and
  // the mob template's scale tell the little orange emberkin from the bulky gloomshade
  mob_demon: {
    url: `${CREATURES}/demonalt.glb`,
    height: 1.8,
    clips: BIPED14,
    tint: 'entity',
    tintStrength: 0.5,
  },
  mob_demon_flying: {
    url: `${CREATURES}/demon.glb`,
    height: 1.7,
    hover: 0.35,
    clips: FLOATING,
    tint: 'entity',
    tintStrength: 0.25,
  },
  // the Nightbloom's realm-only rigs, all first appearances: the moonfleece
  // herds (alpaca), the gloam striders (velociraptor), and the hovering
  // masked nightkin (tribal, a flying rig: they drift rather than walk)
  mob_alpaca: {
    url: `${CREATURES}/alpaca.glb`,
    height: 1.7,
    clips: animal(['Attack_Headbutt', 'Attack_Kick']),
    tint: 'entity',
    tintStrength: 0.3,
  },
  mob_raptor: {
    url: `${CREATURES}/velociraptor.glb`,
    height: 1.6,
    clips: RAPTOR,
    tint: 'entity',
    tintStrength: 0.35,
  },
  mob_nightkin: {
    url: `${CREATURES}/tribal.glb`,
    height: 1.9,
    hover: 0.3,
    clips: NIGHTKIN_FLOATING,
    // Nightkin_Attack clip donor (scripts/build_nightkin_anims.mjs):
    // mesh-free, baked off this same rig's own poses.
    animUrls: [`${CREATURES}/nightkin_ability_anims.glb`],
    tint: 'entity',
    tintStrength: 0.3,
  },
  // the Veiled Hollow's spirits: the ghost rig, entity-tinted (teal hollow
  // remnants and the ice wisp still wear it)
  mob_ghost: {
    url: `${CREATURES}/ghost.glb`,
    height: 1.6,
    hover: 0.4,
    clips: FLOATING,
    tint: 'entity',
    tintStrength: 0.55,
  },
  // the Hollow wisps: bespoke static meshes from the approved concepts
  // (user-generated via Tripo). No rig on purpose: they drift and hover,
  // and every clip lookup null-guards, so FLOATING names simply no-op.
  // Baked palettes, so no entity tint. Front faces +x off the generator;
  // yaw turns it to the +z game convention.
  mob_glimmerwisp: {
    url: `${CREATURES}/glimmerwisp.glb`,
    height: 1.6,
    hover: 0.4,
    clips: FLOATING,
    yaw: -Math.PI / 2,
  },
  mob_duskwisp: {
    url: `${CREATURES}/duskwisp.glb`,
    height: 1.6,
    hover: 0.4,
    clips: FLOATING,
    yaw: -Math.PI / 2,
  },
  // spore-borne mushroom folk: the glub blob drifting just above the glade
  mob_glub: {
    url: `${CREATURES}/glubevolved.glb`,
    height: 1.4,
    hover: 0.15,
    clips: FLOATING,
    tint: 'entity',
    tintStrength: 0.45,
  },
  // the Hollow's wandering bosses: two more rigs no other zone uses
  mob_crab: {
    url: `${CREATURES}/crabenemy.glb`,
    height: 1.7,
    clips: ENEMY_BITE,
    tint: 'entity',
    tintStrength: 0.35,
  },
  mob_bull: {
    url: `${CREATURES}/bull.glb`,
    height: 2.1,
    // the bull rig has no plain Idle clip; grazing IS its idle
    clips: {
      idle: 'Eating',
      walk: 'Walk',
      run: 'Gallop',
      attack: ['Attack_Headbutt', 'Attack_Kick'],
      hit: ['Idle_HitReact_Left', 'Idle_HitReact_Right'],
      death: 'Death',
    },
    tint: 'entity',
    tintStrength: 0.3,
  },
  // mossy treant: the shaggy yeti under a bark-green entity wash
  mob_treant: {
    url: `${CREATURES}/yeti.glb`,
    height: 2.6,
    clips: ENEMY_BITE,
    tint: 'entity',
    tintStrength: 0.72, // the white pelt needs a heavy wash to read as moss
  },
  mob_demonalt: {
    url: `${CREATURES}/demonalt.glb`,
    height: 2.1,
    clips: BIPED14,
    tint: 'entity',
    tintStrength: 0.35,
  },

  // -- delve-specific variants (same rigs, colour-differentiated via mob.color) -
  delve_skel_wraith: {
    // Ledger Wraith: pale skeleton, no weapon, stronger wash reads as near-transparent
    url: `${ENEMIES}/skeleton_minion.glb`,
    height: 2.5,
    clips: skeletonClips(['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal']),
    tint: 'entity',
    tintStrength: 0.55,
  },
  delve_skel_ringer: {
    // Funeral Ringer: skeleton rogue rig, cloth-brown tint at mid strength
    url: `${ENEMIES}/skeleton_rogue.glb`,
    height: 2.5,
    clips: skeletonClips(['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal']),
    attach: [{ url: `${WEAPONS}/skeleton_axe.glb`, bone: 'handslot.r' }],
    tint: 'entity',
    tintStrength: 0.45,
  },
  delve_mob_acolyte: {
    // Gravecall Acolyte: hooded mage with hat + staff, deep dark-brown saturation
    url: `${PLAYERS}/mage.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Melee_Attack_Chop']),
    show: ['Mage_Hat'],
    attach: [{ url: `${WEAPONS}/staff.glb`, bone: 'handslot.r' }],
    tint: 'entity',
    tintStrength: 0.6,
  },
  delve_skel_effigy: {
    // Saintless Effigy: armoured skeleton, high stone-pale wash, reads as carved stone
    url: `${ENEMIES}/skeleton_warrior.glb`,
    height: 2.5,
    clips: skeletonClips(['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal']),
    attach: [
      { url: `${WEAPONS}/skeleton_blade.glb`, bone: 'handslot.r' },
      { url: `${WEAPONS}/skeleton_shield_large_a.glb`, bone: 'handslot.l' },
    ],
    tint: 'entity',
    tintStrength: 0.65,
  },
  delve_skel_varric: {
    // Deacon Varric: boss mage rig with Taunt flourish on pull
    url: `${ENEMIES}/skeleton_mage.glb`,
    height: 2.5,
    clips: skeletonClips(['2H_Melee_Attack_Chop'], 'Taunt'),
    attach: [{ url: `${WEAPONS}/skeleton_staff.glb`, bone: 'handslot.r' }],
    tint: 'entity',
    tintStrength: 0.35,
  },

  // -- undead (KayKit skeletons, shared 41-joint rig) ------------------------
  skel_minion: {
    url: `${ENEMIES}/skeleton_minion.glb`,
    height: 2.5,
    clips: skeletonClips(['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal']),
    tint: 'entity',
    tintStrength: 0.25,
  },
  skel_warrior: {
    url: `${ENEMIES}/skeleton_warrior.glb`,
    height: 2.5,
    clips: skeletonClips(['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal']),
    tint: 'entity',
    tintStrength: 0.25,
  },
  skel_rogue: {
    url: `${ENEMIES}/skeleton_rogue.glb`,
    height: 2.5,
    clips: skeletonClips(['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal']),
    tint: 'entity',
    tintStrength: 0.25,
  },
  skel_mage: {
    url: `${ENEMIES}/skeleton_mage.glb`,
    height: 2.5,
    clips: skeletonClips(['2H_Melee_Attack_Chop']),
    attach: [{ url: `${WEAPONS}/skeleton_staff.glb`, bone: 'handslot.r' }],
    tint: 'entity',
    tintStrength: 0.25,
  },
  skel_boss: {
    url: `${ENEMIES}/skeleton_mage.glb`,
    height: 2.5,
    // Morthen the Gravecaller's visual (a dungeon final boss, dungeons.ts): its
    // own attack instead of the plain 2H chop skel_mage and delve_skel_varric
    // still share off the same skeletonClips() vocabulary (scripts/
    // build_skelboss_anims.mjs, issue #2889). Spread the factory result and
    // override only attack, so skel_mage/delve_skel_varric/rift_ritualist stay
    // on the shared swing.
    clips: { ...skeletonClips(['2H_Melee_Attack_Chop'], 'Taunt'), attack: ['SkelBoss_Attack'] },
    animUrls: [`${ENEMIES}/skelboss_ability_anims.glb`],
    attach: [{ url: `${WEAPONS}/skeleton_staff.glb`, bone: 'handslot.r' }],
    tint: 'entity',
    tintStrength: 0.25,
  },
  skel_necromancer: {
    url: `${ENEMIES}/necromancer.glb`,
    height: 2.5,
    clips: skeletonClips(['2H_Melee_Attack_Chop']),
    tint: 'entity',
    tintStrength: 0.25,
  },
  // The Infernal Citadel's Magus Vel'Kor: the same necromancer rig, but drenched in
  // its entity colour (the shared skel_necromancer tints at 0.25 and stays
  // bone-white, which reads as a snowdrift under the citadel's blood-red grade).
  rift_ritualist: {
    url: `${ENEMIES}/necromancer.glb`,
    height: 2.5,
    clips: skeletonClips(['2H_Melee_Attack_Chop']),
    tint: 'entity',
    tintStrength: 0.8,
  },
  skel_golem: {
    url: `${ENEMIES}/skeleton_golem.glb`,
    height: 3.4,
    // Bespoke attack (scripts/build_skeleton_golem_anims.mjs, issue #2889
    // follow-up batch): this rig backs four named boss/rare VisualDef
    // assignments (nythraxis_scourge_of_thornpeak, a dungeon final boss; plus
    // ancient_guardian, waking_warden, idol_guardian below), but still played
    // the exact same generic swing every plain humanoid mob uses. Spreads the
    // original skeletonLargeClips result and overrides just the attack
    // field, the same pattern ELEMENTAL_FLOATING uses over the shared
    // FLOATING constant: idle/walk/run/hit/death stay the shared set.
    clips: {
      ...skeletonLargeClips(['2H_Melee_Attack_Chop', '1H_Melee_Attack_Chop']),
      attack: ['Golem_Slam'],
    },
    animUrls: [`${ENEMIES}/skeleton_golem_anims.glb`],
    // the baked golem axe ships without the 180° grip flip the rig expects, so
    // the blade faces backwards; spin it about its handle (local Y) to face out.
    weaponFix: [{ node: 'Skeleton_Golem_Axe', rotY: Math.PI }],
    tint: 'entity',
    tintStrength: 0.25,
  },

  // -- humanoid mobs (KayKit adventurers) ------------------------------------
  mob_bandit: {
    url: `${PLAYERS}/rogue_hooded.glb`,
    height: HUMANOID_H,
    clips: kaykit(['1H_Melee_Attack_Chop', 'Dualwield_Melee_Attack_Chop']),
    // v2 rogue_hooded ships the hood/mask/cape as its default look (no show
    // filter needed); the knives are attached dual-wield from the weapon files
    attach: [
      { url: `${WEAPONS}/dagger.glb`, bone: 'handslot.r' },
      { url: `${WEAPONS}/dagger.glb`, bone: 'handslot.l' },
    ],
    // fixed outlaw leather — entity tints (faction greens) read as friendly
    // villagers; the dark red-brown keeps the hooded silhouette hostile
    tint: 0x6b3a32,
    tintStrength: 0.3,
  },
  mob_dark_caster: {
    url: `${PLAYERS}/mage.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Melee_Attack_Chop']),
    show: ['Mage_Hat'],
    attach: [{ url: `${WEAPONS}/staff.glb`, bone: 'handslot.r' }],
    tint: 'entity',
    tintStrength: 0.5,
  },
  mob_bruiser: {
    url: `${PLAYERS}/barbarian.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Melee_Attack_Chop']),
    show: ['Barbarian_BearHat'], // v2 barbarian: Hat→BearHat, no Cape, weapon now attached
    attach: [{ url: `${WEAPONS}/axe_2handed.glb`, bone: 'handslot.r' }],
    tint: 'entity',
    tintStrength: 0.3,
  },

  // -- NPCs ------------------------------------------------------------------
  npc_knight: {
    url: `${PLAYERS}/knight.glb`,
    height: HUMANOID_H,
    clips: kaykit(['1H_Melee_Attack_Chop']),
    show: ['Knight_Helmet', 'Knight_Cape'],
    attach: [{ url: `${WEAPONS}/sword_1handed.glb`, bone: 'handslot.r' }],
  },
  npc_mage: {
    url: `${PLAYERS}/mage.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Melee_Attack_Chop']),
    show: [],
    attach: [{ url: `${WEAPONS}/staff.glb`, bone: 'handslot.r' }],
    tint: 0xc9b98a,
    tintStrength: 0.3, // brown-robed brothers of the chapel
  },
  // Brother Aldric keeps his pre-v0.7 model (the old chars/mage.glb, restored as
  // mage_classic.glb with the staff built into the mesh). Aldric-only — every
  // other npc_mage uses the new KayKit full-pack model from #396.
  npc_aldric: {
    url: `${PLAYERS}/mage_classic.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Melee_Attack_Chop']),
    show: ['2H_Staff'],
    tint: 0xc9b98a,
    tintStrength: 0.3,
  },
  npc_smith: {
    url: `${PLAYERS}/barbarian.glb`,
    height: HUMANOID_H,
    clips: kaykit(['1H_Melee_Attack_Chop']),
    show: [],
    attach: [{ url: `${WEAPONS}/axe_1handed.glb`, bone: 'handslot.r' }],
  },
  npc_scout: {
    url: `${PLAYERS}/rogue.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Ranged_Shoot']),
    show: ['Rogue_Cape'],
    attach: [{ url: `${WEAPONS}/crossbow_1handed.glb`, bone: 'handslot.r' }],
  },
  npc_villager: {
    url: `${PLAYERS}/rogue.glb`,
    height: HUMANOID_H,
    clips: kaykit(['1H_Melee_Attack_Chop']),
    show: [],
    tint: 'entity',
    tintStrength: 0.35,
  },
  npc_villager_robed: {
    url: `${PLAYERS}/mage.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Melee_Attack_Chop']),
    show: [],
    tint: 'entity',
    tintStrength: 0.35,
  },
  // Bursar Fernando: the villager body with the likeness atlas (SKINS above)
  // carrying black shoulder-length hair and light brown skin. No entity tint:
  // the gold NpcDef color would wash the repaint back toward the villager look.
  npc_fernando: {
    url: `${PLAYERS}/rogue.glb`,
    height: HUMANOID_H,
    clips: kaykit(['1H_Melee_Attack_Chop']),
    show: [],
  },
  // Brother Halven, the Reliquary Keeper: a devout male guardian tending the crypt
  // door. Uses the KayKit paladin, one of the newer full-pack adventurer models
  // (unused elsewhere), for a sturdier, holier silhouette than the old hooded
  // rogue. Ships its accessories (helm/cape/shield) by default (no show filter).
  npc_reliquary_keeper: {
    url: `${PLAYERS}/paladin.glb`,
    height: HUMANOID_H,
    clips: kaykit(['1H_Melee_Attack_Chop']),
  },
  // Edda Reedhand (The Drowned Litany companion NPC, healer): the druid player
  // rig, staff in hand, backpack authored on the model (a traveling marsh
  // herbalist). The earlier Meshy mesh clashed with the KayKit proportions; a
  // player rig also gives her the full clip set, so her heals play the real
  // Spellcasting channel. Fixed staff (no weaponSlots: NPC gear never changes).
  npc_edda_reedhand: {
    url: `${PLAYERS}/druid.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Melee_Attack_Chop']),
    attach: [{ url: `${WEAPONS}/staff.glb`, bone: 'handslot.r' }],
  },
  // The three zone Chroniclers (Saul, Osric Fenn, Zenzie): one shared
  // scholarly-mage silhouette (hat, staff, open ledger in the off hand,
  // the warlock spellbook grip) with the per-NPC entity tint carrying each
  // identity. When the bespoke chronicler .glb files arrive, split this into
  // one def per chronicler with its own url.
  npc_chronicler: {
    url: `${PLAYERS}/mage.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Melee_Attack_Chop']),
    show: ['Mage_Hat'],
    attach: [
      { url: `${WEAPONS}/staff.glb`, bone: 'handslot.r' },
      { url: `${WEAPONS}/spellbook_open.glb`, bone: 'handslot.l', gripRef: 'Spellbook_open' },
    ],
    tint: 'entity',
    tintStrength: 0.55,
  },
  // Reedbound Acolyte (The Drowned Litany trash mob): Stone Cantor model from
  // the Raid 02 asset batch. The earlier Meshy mesh (reedbound_acolyte.glb) was
  // realistically proportioned and clashed with the chunky KayKit-style rigs;
  // this one matches the game's proportions, so the standard humanoid height
  // applies (the old def ran at 3.4 only to compensate for the thin mesh).
  mob_reedbound_acolyte: {
    url: `${CREATURES}/stone_cantor.glb`,
    height: HUMANOID_H,
    clips: RAID_CASTER,
    // The 2.6s Cast clip doubles as the vial-throw one-shot; at the default
    // 1.3x it fills nearly the whole 2.6s attack cadence, which reads
    // sluggish AND leaves no gap for the Hit flinch (one-shots never
    // interrupt one-shots). 1.7x makes the throw snap and frees ~1.1s of
    // every cycle for reactions.
    attackTimeScale: 1.7,
    tint: 'entity',
    tintStrength: 0.2,
  },
  // Spider Egg-Sac (Sinkhole Baptistry finale trigger, The Drowned Litany):
  // Meshy-generated static prop, no rig/clips (it never moves; it dies to a
  // single hit). The visual/animation pipeline no-ops gracefully when a clip
  // name below has no match in the GLB, so it just renders static, which is
  // exactly right for a stationary egg-sac.
  mob_spider_egg_sac: {
    url: `${CREATURES}/spider_egg_sac.glb`,
    height: 1.8,
    clips: {
      idle: 'Idle',
      walk: 'Idle',
      run: 'Idle',
      attack: ['Idle'],
      death: 'Idle',
    },
  },
};

// Hand-authored entries above; pipeline-generated bodies below. Spread order is
// deliberate: GENERATED first, HAND second, so a curated key ALWAYS wins over a
// generated one of the same name and re-running the asset pipeline is safe.
// --- Corrections over the emitted pipeline manifest --------------------------
// Kept HERE rather than in manifest.generated.ts so re-running the asset pipeline
// cannot drop them and a regeneration diff stays a pure asset diff.
//
// 1. emit_manifest.mjs assumes every staged body was rigged onto the KayKit
//    reference skeleton and hands them all the KayKit clip map. These came from
//    the Meshy pipeline and are on the meshy24 skeleton carrying
//    Idle/Walk/Run/Attack/[Cast/]Hit/Death - so of the 14 KayKit names the
//    generated map asks for, exactly ONE ("Idle") exists. That is the Infernal
//    HERO roster, the bodies on the character-select screen. They are also the
//    one family the shared clip bank can drive, so they take it.
// 2. Every other generated body is a kaykit body carrying the same 22 baked
//    clips as the shipped player GLBs, but the emitted map has no `emote` entry,
//    so playEmote() returned immediately on all of them.
// 3. The 2026-08-16 wave (realm_infernal_class_*_f, hero_heaven_*,
//    male_sorcerer) is also meshy24, but those GLBs ship ONLY the rig's free
//    Walk/Run takes - no authored Idle/Attack/Hit/Death at all. A literal map
//    below would leave Idle (and the far-LOD idle bake) resolving to NOTHING,
//    and the last airborne clip (Jump_Idle, mounted as `jump`) kept playing
//    through fadeTo's null early-return: the "hero idles like a skydiver" bug.
//    `autoClip` re-resolves every name against the clips actually loaded
//    (clip_resolution.ts). The wave's GLBs were given a real standing Idle
//    out-of-band (hero_amazon's authored Idle, ROTATION channels only - the
//    clip bank has no base Idle at all; its Idle_Alt_* takes are lookaround
//    gestures that render hunched, and cross-rig translation/scale tracks are
//    the body-shrink trap), so Idle resolves exactly; the remaining gaps fill
//    from the bank (Death -> Death_A, Hit -> Hit_A, attack -> bank swings).
//    Fully-clipped bodies resolve every name exactly and are untouched.
const MESHY_RIGGED_GENERATED =
  /^realm_infernal_(hero_|meshy_necro_warlord|class_\w+_f$|male_sorcerer$)/;

function generatedVisualCorrections(): Record<string, VisualDef> {
  const out: Record<string, VisualDef> = {};
  for (const [key, def] of Object.entries(GENERATED_VISUALS)) {
    if (MESHY_RIGGED_GENERATED.test(key)) {
      out[key] = {
        ...def,
        animUrls: [...(def.animUrls ?? []), MESHY_CLIP_BANK_URL],
        // Resolve the names below against the body's REAL clip inventory at
        // load (see note 3 above): exact for bodies that carry them, bank
        // fills for the Walk/Run-only wave.
        autoClip: true,
        clips: withMeshyBank({
          idle: 'Idle',
          walk: 'Walk',
          run: 'Run',
          // The body's own 'Attack' take stays at the FRONT of the rotation; the
          // bank's extra swings follow it.
          attack: ['Attack'],
          hit: ['Hit'],
          death: 'Death',
          cast: 'Cast',
        }),
      };
    } else if (!def.clips.emote) {
      out[key] = { ...def, clips: { ...def.clips, emote: KAYKIT_EMOTES } };
    }
  }
  return out;
}

export const VISUALS: Record<string, VisualDef> = {
  ...GENERATED_VISUALS,
  ...generatedVisualCorrections(),
  // Quadrupeds bound onto the shipped wolf donor rig (creatures.generated.ts).
  // Same precedence rule as above: generated first, HAND last, so a curated key
  // always wins and re-running the asset pipeline stays safe.
  ...GENERATED_CREATURE_VISUALS,
  ...HAND_VISUALS,
};

// ---------------------------------------------------------------------------
// Modular player bodies, one `player_<class>_modular` def per class, derived
// from the class def above it. The body is COMPOSED from the shared part
// library (modular.ts) instead of cloned from the class GLB, but everything
// else, clips, the ability→clip mapping, held-weapon layout, the swim/fall
// lane, is the class's own, so a composed rogue garrotes and a composed
// hunter draws its bow exactly like the fixed rigs do.
//
// The class GLB rides along as a pure CLIP source (first animUrl): the
// synthesized per-class attacks (Shield_Bash, Garrote_Choke, Kick_A, ...)
// exist only there, and every player body shares KayKit's Rig_Medium, so its
// clips bind onto the modular skeleton by node name, the swim/bow clip packs
// are the precedent. No extra fetch: the class GLB is already preloaded as the
// fixed rig every OTHER entity still wears.
//
// Deliberately dropped from the class def:
//  - `show`: the composed body has no baked accessory meshes to allowlist;
//    hats/capes are armour-slot parts picked by the loadout instead.
//  - `tint`/`tintStrength`: the class tints (shaman blue, warlock violet) are
//    how classes SHARING a stock model stay tellable apart. A composed body's
//    colour belongs to the player's skin/hair wheels, and a tint over the
//    picked skin tone repaints exactly what the player chose.
// ---------------------------------------------------------------------------
// Driven by ALL_CLASSES rather than a local copy: a tenth class would otherwise
// get no modular def at all and fall back to the warrior's clips through
// modularKeyFor, silently, with no test able to see it.
for (const cls of ALL_CLASSES) {
  const {
    show: _show,
    tint: _tint,
    tintStrength: _tintStrength,
    ...base
  } = VISUALS[`player_${cls}`];
  VISUALS[`player_${cls}_modular`] = {
    ...base,
    url: `${MODULAR}/warrior_modular.glb`,
    modular: true,
    animUrls: [base.url, ...(base.animUrls ?? [])],
  };
}

/** The composed-body variant of a class visual (every class has one). */
export function modularVisualKey(cls: PlayerClass): string {
  return `player_${cls}_modular`;
}

// ---------------------------------------------------------------------------
// Dispatch: entity -> visual key (mirrors the old buildRigFor selection:
// e.kind + e.templateId + MOBS[id].family)
// ---------------------------------------------------------------------------

const MOB_KEYS: Record<string, string> = {
  wildheart_stalker: 'mob_wildheart_stalker',
  wildheart_ravager: 'mob_wildheart_ravager',
  wildheart_hexcaller: 'mob_wildheart_hexcaller',
  wildheart_beastmaster: 'mob_wildheart_beastmaster',
  wildheart_high_priest: 'mob_wildheart_high_priest',
  // The Drakelands dragonkin brood (v0.35): per-template overrides so the
  // rework replaces every dragon model IN THE DRAKELANDS (Cindraleth
  // included, re-tinted gold by her template color) while the dragonkin
  // family fallback (the floating dragonevolved wyrm) stays for the sanctum,
  // temple, rift, and Galecrest dragonkin.
  drakemaw_broodlord: 'mob_dragonkin_broodlord',
  cindraleth_maw_matriarch: 'mob_dragonkin_matriarch',
  dragonkin_broodguard: 'mob_dragonkin_broodguard',
  dragonkin_whelp: 'mob_dragonkin_whelp',
  dragonkin_egg: 'mob_dragon_egg',
  // Grubjaw the Glutton: his own body now, not the shared troll stand-in.
  grubjaw: 'mob_grubjaw',
  // Ambient Highwatch stable horse: the Valorsteed mount model (mob_stable_horse
  // above) so it renders as an animated horse, not a humanoid.
  stable_horse: 'mob_stable_horse',
  // Dawnhold's garrison: the armored knight body (helmet, cape, sword), not
  // the humanoid family's hooded outlaw fallback.
  hedge_knight: 'npc_knight',
  // Protect Yumi objective cat: the dedicated Meshy familiar
  // (docs/prd/protect-yumi-assets.md item 1, delivered).
  yumi_cat: 'mob_yumi_cat',
  training_dummy: 'mob_training_dummy',
  emberkin: 'mob_demon',
  water_elemental: 'mob_water_elemental',
  gloomshade: 'mob_demon',
  duskborn: 'mob_demon',
  warlock_imp: 'mob_demon_flying',
  warlock_voidwalker: 'mob_demonalt',
  wild_boar: 'mob_boar',
  forest_wolf: 'mob_wolf',
  // beasts that would otherwise fall back to the wolf model (FAMILY_KEYS.beast)
  old_cragmaw: 'mob_bear',
  bog_bloat: 'mob_murloc',
  // Old Greyjaw: the named rare wolf gets his own custom model (the pack
  // wolves keep the light mob_wolf)
  old_greyjaw: 'greyjaw',
  // The Drowned Litany (Mirefen Marsh): give marsh enemies the right silhouette
  // instead of the family fallback (beast -> wolf, undead -> skeleton minion).
  mirefen_widowling: 'mob_spider',
  spider_egg_sac: 'mob_spider_egg_sac',
  // Broodmother clutch (q_broodmother): the destructible eggs reuse the egg-sac
  // model (not a live spider), and the hatchling is a small spider.
  spider_egg: 'mob_spider_egg_sac',
  widow_hatchling: 'mob_spider',
  sump_troll_devourer: 'mob_troll',
  grave_silt_bulwark: 'mob_ogre',
  drowned_cantor: 'delve_mob_acolyte',
  deepfen_spearjaw: 'mob_spearjaw',
  choir_thrall: 'mob_choir_thrall',
  tolling_bell: 'mob_tolling_bell',
  reedbound_acolyte: 'mob_reedbound_acolyte',
  edda_reedhand: 'npc_edda_reedhand',
  // gravecaller cult + necromancers: dark-robed casters
  gravecaller_cultist: 'mob_dark_caster',
  gravecaller_summoner: 'mob_dark_caster',
  // BOTH Nhalias: the zone 2 overworld rare elite keeps her original template
  // id; the Drowned Litany boss is a separate renamed template.
  sister_nhalia: 'mob_dark_caster',
  sister_nhalia_drowned_canticle: 'mob_dark_caster',
  deacon_voss: 'mob_dark_caster',
  wyrmcult_necromancer: 'mob_dark_caster',
  vael_the_mistcaller: 'mob_dark_caster',
  grand_necromancer_velkhar: 'mob_dark_caster',
  gorrak: 'mob_bruiser',
  mogger: 'mob_bruiser',
  // undead variants by role
  boneclad_revenant: 'skel_warrior',
  marrowlord_varkas: 'skel_warrior',
  bastion_revenant: 'skel_warrior',
  knight_commander_olen: 'skel_warrior',
  sanctum_boneguard: 'skel_warrior',
  nythraxis_scourge_of_thornpeak: 'skel_golem',
  nythraxis_skeleton_warrior: 'skel_warrior',
  nythraxis_heroic_warrior_add: 'skel_warrior',
  nythraxis_heroic_priest_add: 'skel_necromancer',
  nythraxis_heroic_rogue_add: 'skel_rogue',
  brother_aldric_raid: 'npc_aldric',
  hollow_acolyte: 'skel_mage',
  sexton_marrow: 'skel_mage',
  morthen: 'skel_boss',
  crypt_shambler: 'skel_rogue',
  // delve enemies
  reliquary_ledger_wraith: 'delve_skel_wraith',
  reliquary_funeral_ringer: 'delve_skel_ringer',
  reliquary_gravecall_acolyte: 'delve_mob_acolyte',
  reliquary_saintless_effigy: 'delve_skel_effigy',
  deacon_varric: 'delve_skel_varric',
  // Durance of Hate: real infernal demon bodies (no KayKit fallback)
  hellmaw_charred_husk: 'hellmaw_husk_body',
  hellmaw_cinder_acolyte: 'hellmaw_acolyte_body',
  hellmaw_ember_behemoth: 'hellmaw_behemoth_body',
  hellmaw_wailing_spectre: 'hellmaw_spectre_body',
  // Road/hell patrol leader: the approved Dark Paladin body commands the
  // corrupted soldiers instead of inheriting a generic KayKit humanoid.
  hellmaw_cursed_knight: 'realm_infernal_dark_paladin',
  hellmaw_lava_fiend: 'hellmaw_lava_fiend_body',
  hellmaw_sigilbound_warlock: 'hellmaw_sigilbound_body',
  hellmaw_primal_beast: 'hellmaw_primal_beast_body',
  hellmaw_inferno_dragon: 'hellmaw_dragon_body',
  hellmaw_the_render: 'hellmaw_render_body',
  fallen_captain_aldren: 'skel_warrior',
  corrupted_priest_malric: 'skel_necromancer',
  deathstalker_voss: 'skel_rogue',
  // The Nythraxis phase-2 heroic court is Aldren / Malric / Voss risen again, so
  // the "Spirit of X" adds reuse each character's crypt visual above. Without these
  // the ids fall through to FAMILY_KEYS.undead (skel_minion) and the whole court
  // renders as identical generic skeletons. See spawnNythraxisHeroicAdds.
  vision_aldren_warrior: 'player_warrior',
  vision_malric_mage: 'player_mage',
  vision_deathstalker_voss: 'player_rogue',
  // the Veiled Hollow: stags use the real stag rig instead of the beast-family
  // wolf; the court guardians borrow the golem rig as stone constructs; the
  // spirits, mushroom folk, and treants get realm-only rigs (ghost, glub,
  // yeti) that appear nowhere in the outer three zones
  veiled_stag: 'mob_veiled_stag',
  veiled_doe: 'mob_veiled_doe',
  gleamstag: 'mob_gleamstag',
  gilded_stag: 'mob_stag',
  gloam_fox: 'mob_fox',
  orchard_treant: 'mob_treant',
  lily_wisp: 'mob_ghost',
  ancient_guardian: 'skel_golem',
  waking_warden: 'skel_golem',
  glimmerwisp: 'mob_glimmerwisp',
  duskwisp: 'mob_duskwisp',
  ice_wisp: 'mob_ghost',
  frostmane_yeti: 'mob_yeti',
  // Frostveil quest pass: Wren renders as a tinted villager (escort NPC, mob-kind
  // so the escort driver can walk her); the howlers ride the beast/wolf fallback.
  apprentice_wren: 'npc_villager',
  sporeling_gatherer: 'mob_glub',
  corrupted_sporeling: 'mob_glub',
  mushroom_pixie: 'mob_mushroom_pixie',
  treant_elder: 'mob_treant',
  old_marrowshell: 'mob_crab',
  aurelhorn: 'mob_aurelhorn',
  // the Nightbloom: silver herds, night-running raptors, hovering star folk;
  // the Barrow King borrows the armored skeleton the other revenants wear
  moonfleece_grazer: 'mob_alpaca',
  gloam_strider: 'mob_raptor',
  nightkin_stargazer: 'mob_nightkin',
  barrow_king: 'skel_warrior',
  // the Wraithwood: drifting wraiths on the ghost rig, walking haunted
  // trees on the treant's, and the hooded Huntsman on the crypt rogue's
  // (the widowsilk spinners take the spider family default)
  wood_wraith: 'mob_ghost',
  gravenbark_shambler: 'mob_treant',
  pale_huntsman: 'skel_rogue',
  // Mosley is an escortee (mob-kind so the escort driver can walk him), and
  // every escortee needs an explicit body: the humanoid family default is the
  // hooded outlaw, so the townsfolk you walk home would read as the bandits you
  // are protecting them from. Tinted villager, exactly like Wren above.
  gravedigger_mosley: 'npc_villager',
  // the Palmreach: coral crabs, jungle boars, and the carved-stone guardian
  // (the canopy weavers take the spider family default)
  tide_scuttler: 'mob_crab',
  thicket_boar: 'mob_boar',
  idol_guardian: 'skel_golem',
  topiary_stag: 'mob_stag',
  the_topiary_bull: 'mob_bull',
  moor_ram: 'mob_alpaca',
  shoal_scuttler: 'mob_crab',
  // Navigator Suli, the Palmreach escortee (see gravedigger_mosley above).
  castaway_navigator: 'npc_villager',
  // The Wreck Warden walks as Mogger's hulking bruiser body, not a skeleton.
  the_wreck_warden: 'mob_bruiser',
  // the Farshore: Bram is the isle's escortee (see gravedigger_mosley above);
  // its wretches, stalkers and horrors keep their family fallbacks.
  fisher_bram: 'npc_villager',
  // The Infernal Citadel: the pact cult reads as robed casters, not the `undead`
  // family's default skeleton minion. Its demons keep the family fallback
  // (mob_demonalt), re-tinted deep red by the templates.
  rift_pact_acolyte: 'mob_dark_caster',
  rift_boss_ritualist: 'rift_ritualist',
};

const FAMILY_KEYS: Record<string, string> = {
  beast: 'mob_wolf',
  humanoid: 'mob_bandit',
  mudfin: 'mob_murloc',
  spider: 'mob_spider',
  burrower: 'mob_kobold',
  undead: 'skel_minion',
  troll: 'mob_troll',
  ogre: 'mob_ogre',
  elemental: 'mob_elemental',
  dragonkin: 'mob_dragonkin',
  demon: 'mob_demonalt',
  // deepfen_spearjaw already has an explicit MOB_KEYS override to mob_spearjaw
  // (visualKeyFor checks MOB_KEYS first), so this default stays unreachable
  // for it even after its family retag. It only matters for a future reptile
  // mob with no override of its own; reuse the same model so that fallback
  // is sane too.
  reptile: 'mob_spearjaw',
};

const NPC_KEYS: Record<string, string> = {
  bursar_fernando: 'npc_fernando',
  card_master: 'npc_villager_robed',
  marshal_redbrook: 'npc_knight',
  warden_fenwick: 'npc_knight',
  captain_thessaly: 'npc_knight',
  // The two WARFARE quartermasters (one stock, two placements). Both sell the
  // game's most prestigious armor and both fell through to the tinted villager
  // body before this, which read as a townsperson selling epics; the armored
  // knight silhouette (helmet, cape, sword) is the same reuse captain_thessaly
  // makes and needs no new asset.
  warmarshal_draven_kole: 'npc_knight',
  fury: 'npc_knight',
  loremaster_caddis: 'npc_mage',
  smith_haldren: 'npc_smith',
  armorer_hode: 'npc_smith',
  foreman_odell: 'npc_smith',
  scout_maren: 'npc_scout',
  scout_maren_highwatch: 'npc_scout',
  apothecary_lin: 'npc_villager_robed',
  herbalist_yara: 'npc_villager_robed',
  trader_wilkes: 'npc_villager',
  fisherman_brandt: 'npc_villager',
  provisioner_hale: 'npc_villager',
  quartermaster_bree: 'npc_villager',
  brother_halven: 'npc_reliquary_keeper',
  brother_halven_marsh: 'npc_reliquary_keeper',
  chronicler_saul: 'npc_chronicler',
  chronicler_osric_fenn: 'npc_chronicler',
  chronicler_edda_hartwell: 'npc_chronicler',
  // The graveyard angel: a robed figure, rendered translucent (ethereal) with a
  // holy shimmer by the renderer (see the spirit_healer branches there).
  spirit_healer: 'npc_villager_robed',
  // Eldergleam, the Veiled Hollow
  keeper_saelwyn: 'npc_mage',
  loremother_bryn: 'npc_villager_robed',
  provisioner_fenna: 'npc_villager',
  wardsmith_orun: 'npc_smith',
  archivist_tullo: 'npc_villager_robed',
  // Professions 2.0 station masters: existing looks only (no new GLBs). The
  // forge and toolworks masters wear the smith's work apron; the weaver and
  // alchemist match the robed apothecary/herbalist look; the cook and tanner
  // read as working townsfolk.
  forgemistress_darva: 'npc_smith',
  tinker_gizzel: 'npc_smith',
  weaver_ottilie: 'npc_villager_robed',
  alchemist_verane: 'npc_villager_robed',
  cook_marlow: 'npc_villager',
  tanner_hesk: 'npc_villager',
  huntsman_deral: 'npc_scout',
};

// Realm-owned NPC bodies. Claudecraft intentionally stays on NPC_KEYS above;
// every other supported realm gets a deliberate silhouette instead of silently
// reusing the tiny KayKit villager roster. New realm asset drops extend this
// table without touching the sim identities or NPC behavior.
const REALM_NPC_KEYS: Partial<Record<string, Record<string, string>>> = {
  classic: {
    bursar_fernando: 'realm_classic_female_orc',
    marshal_redbrook: 'realm_classic_orc',
    warden_fenwick: 'realm_classic_big_orc',
    captain_thessaly: 'realm_classic_fighting_elf',
    loremaster_caddis: 'realm_classic_treasure_dwarf',
    smith_haldren: 'realm_classic_big_orc',
    armorer_hode: 'realm_classic_dwarf',
    foreman_odell: 'realm_classic_dwarf',
    scout_maren: 'realm_classic_female_orc',
    scout_maren_highwatch: 'realm_classic_female_orc',
    apothecary_lin: 'realm_classic_female_elf',
    herbalist_yara: 'realm_classic_female_elf',
    trader_wilkes: 'realm_classic_dwarf',
    fisherman_brandt: 'realm_classic_orc',
    provisioner_hale: 'realm_classic_dwarf',
    quartermaster_bree: 'realm_classic_big_orc',
    brother_halven: 'realm_classic_fighting_elf',
    brother_halven_marsh: 'realm_classic_fighting_elf',
    spirit_healer: 'realm_classic_female_elf',
  },
};

const REALM_MOB_DEFAULTS: Partial<Record<string, string>> = {
  crypticrealm: 'realm_infernal_evil_warlord_armor_made_0196a11d',
  infernal: 'realm_infernal_horned_demon',
  classic: 'realm_classic_orc',
  claudecraft: 'realm_claudecraft_dark_wanderer',
};

const REALM_MOB_FAMILY_KEYS: Partial<Record<string, Partial<Record<string, string>>>> = {
  crypticrealm: {
    beast: 'mob_wolf',
    humanoid: 'realm_infernal_evil_warlord_armor_made_0196a11d',
    undead: 'realm_cryptic_bone_herald',
    demon: 'realm_infernal_horned_demon',
    elemental: 'mob_elemental',
    dragonkin: 'mob_dragonkin',
  },
  infernal: {
    // Generic beasts remain animals; Infernal demon bodies are reserved for
    // demon-family mobs and named Hellmaw encounters.
    beast: 'mob_wolf',
    humanoid: 'realm_infernal_evil_warlord_armor_made_0196a11d',
    undead: 'skel_warrior',
    demon: 'hellmaw_husk_body',
    elemental: 'hellmaw_lava_fiend_body',
    dragonkin: 'hellmaw_dragon_body',
  },
  // Claudecraft draws on its own authored bank instead of the generic KayKit
  // fallbacks. Families with no convincing body in the store (elemental,
  // spider, burrower, troll, ogre) are deliberately left to FAMILY_KEYS.
  claudecraft: {
    beast: 'realm_claudecraft_blue_beast',
    humanoid: 'realm_claudecraft_dark_wanderer',
    undead: 'realm_claudecraft_skeleton_archer',
    demon: 'realm_claudecraft_demon',
    dragonkin: 'realm_claudecraft_arcane_dragon',
    mudfin: 'realm_claudecraft_water_dinosaur',
  },
};

/** True if a visual model is excluded from the boot preload sweep (lazyPreload).
 *  The boot prewarm must SKIP these — their GLB isn't loaded yet, so building one
 *  would throw "character asset not preloaded". They load on demand when first
 *  needed (e.g. entering the Hellmaw delve). */
export function isVisualLazy(visualKey: string): boolean {
  return !!VISUALS[visualKey]?.lazyPreload;
}

// --- Runtime admin body overrides (from /api/realm-visuals) ----------------
// A saved override reassigns a class or NPC body to an arbitrary library GLB.
// With no overrides installed this is a strict no-op, so normal rendering is
// untouched; the override path only runs for entities the operator reassigned.
interface BodyOverrideEntry {
  assetUrl: string;
  assetName?: string;
}
const BODY_OVERRIDES: Record<string, Record<string, BodyOverrideEntry>> = {};
// Override bodies mount the shared Meshy clip bank (armature-only GLB on the
// 24-joint Meshy skeleton) via animUrls, so their vocabulary is the bank's
// contract names below plus the body's own bespoke clips. '__auto__' entries
// still resolve against whatever is actually loaded (clip_resolution.ts), so a
// body works - degraded but animated - even if the bank fails to load.
const OVERRIDE_CLIP_BANK_URL = MESHY_CLIP_BANK_URL;
// '__auto__' idle/walk/run/death keep each body's own bespoke takes (resolved
// against the real inventory in clip_resolution.ts); everything else is the
// shared bank vocabulary, defined once in clip_vocab.ts and shared with the
// curated meshy24 bodies so the two can never drift apart. Emote_Cry and
// Emote_Bow ARE in the bank but were aliased onto Sit_Floor_Down and Emote_Point
// here, so crying looked like sitting down and bowing duplicated pointing.
const OVERRIDE_AUTO_CLIPS: ClipMap = withMeshyBank({
  idle: '__auto__',
  walk: '__auto__',
  run: '__auto__',
  attack: ['__auto__'],
  hit: ['__auto__'],
  death: '__auto__',
  emote: MESHY_BANK_EMOTES,
});

/** Install the operator's body overrides for a realm (the client calls this after
 *  it fetches /api/realm-visuals/<realm>). Empty/undefined clears them. */
export function setBodyOverrides(
  realm: string,
  overrides: Record<string, BodyOverrideEntry> | null | undefined,
): void {
  BODY_OVERRIDES[realm] = overrides ?? {};
}

function overrideVisualHash(url: string): string {
  let hash = 2166136261;
  for (let i = 0; i < url.length; i++) {
    hash ^= url.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

// url -> registered visual key, built lazily over VISUALS (which already holds
// the generated realm bodies) and kept in step as override visuals are added.
let visualKeyByUrl: Map<string, string> | null = null;
function knownVisualKeyForUrl(url: string): string | null {
  if (!visualKeyByUrl) {
    visualKeyByUrl = new Map();
    for (const [k, def] of Object.entries(VISUALS)) {
      if (def?.url && !visualKeyByUrl.has(def.url)) visualKeyByUrl.set(def.url, k);
    }
  }
  return visualKeyByUrl.get(url) ?? null;
}

function registerOverrideVisual(entry: BodyOverrideEntry): string {
  // An override almost always points at a GLB the manifest ALREADY registers -
  // every generated realm body, and every hand-authored one. Synthesizing a
  // second, generic def for that same file discards everything the real entry
  // knows: its fitted height (2.2-2.3 for the infernal humans, 2.6 for generated
  // bodies - not the 2.0 guess below), its authored clip map, weapon sockets and
  // tint. NPCs pointed at known bodies this way rendered short, bare and stiff.
  // Reuse the registered entry; only a genuinely unknown url needs the generic
  // auto-clip def, which leans on the shared clip bank to animate at all.
  const known = knownVisualKeyForUrl(entry.assetUrl);
  if (known) return known;
  const key = `override_${overrideVisualHash(entry.assetUrl)}`;
  if (!VISUALS[key]) {
    VISUALS[key] = {
      url: entry.assetUrl,
      height: 2.0,
      autoClip: true,
      lazyPreload: true,
      clips: OVERRIDE_AUTO_CLIPS,
      animUrls: [OVERRIDE_CLIP_BANK_URL],
    };
    visualKeyByUrl?.set(entry.assetUrl, key);
  }
  return key;
}

/** The operator's override row for a CHARACTER (no Entity required), in the same
 *  precedence the world uses: hero id, hero display name, the canonical selection
 *  a hidden variant presents under, then the base class. Split out of
 *  {@link overrideVisualKeyForEntity} so the 2D surfaces (unit-frame portraits,
 *  roster chips, the char-select turntable) resolve through the IDENTICAL chain
 *  instead of each re-deriving it. */
function overrideEntryForCharacter(
  realm: string,
  realmHeroId: string | null | undefined,
  cls: PlayerClass,
  gender?: 'male' | 'female' | null,
): BodyOverrideEntry | undefined {
  const map = BODY_OVERRIDES[realm];
  if (!map) return undefined;
  const selection = infernalCharacterSelection(realm, realmHeroId ?? null, cls);
  // An explicit Female pick outranks the hero body: the creator previews the
  // sex-suffixed class body hero-neutrally, so the world must render the same
  // or the toggle is a lie. A published female HERO variant is still the most
  // specific and wins first; realms without pairs fall through unchanged.
  if (gender === 'female') {
    const heroF = selection ? map[`hero:${selection.id}:f`] : undefined;
    if (heroF) return heroF;
    const clsF = map[`class:${cls}:f`];
    if (clsF) return clsF;
  }
  let entry = selection ? (map[`hero:${selection.id}`] ?? map[`hero:${selection.name}`]) : undefined;
  // A hidden hero variant with no published body of its own falls back to
  // the canonical selection it presents under (e.g. hero:infernal-hero-sorcerer-m
  // -> hero:infernal-hero-sorcerer-sorceress until a male body is published).
  if (!entry && selection?.variantOf) entry = map[`hero:${selection.variantOf}`];
  if (entry) return entry;
  // The appearance editor's Male/Female choice selects the realm body: a
  // sex-suffixed override (class:mage:f) wins over the unsuffixed one, which
  // stays the male/default body so realms without pairs keep working.
  if (gender === 'male') {
    const suffixed = map[`class:${cls}:m`];
    if (suffixed) return suffixed;
  }
  return map[`class:${cls}`];
}

/** The override visual key for an entity, or null. A realm hero assignment is
 *  most specific, followed by class, NPC, and mob template assignments. */
export function overrideVisualKeyForEntity(e: Entity): string | null {
  const realm = resolveActiveRealmId();
  const map = BODY_OVERRIDES[realm];
  if (!map) return null;
  let entry: BodyOverrideEntry | undefined;
  if (e.kind === 'player') {
    const gender =
      (e as unknown as { modularAppearance?: { gender?: 'male' | 'female' } | null })
        .modularAppearance?.gender ?? null;
    entry = overrideEntryForCharacter(realm, e.realmHeroId, e.templateId as PlayerClass, gender);
  } else if (e.kind === 'npc') {
    entry = map[`npc:${e.templateId}`];
  } else if (e.kind === 'mob') {
    entry = map[`mob:${e.templateId}`];
  } else {
    return null;
  }
  return entry ? registerOverrideVisual(entry) : null;
}

/**
 * The visual key that renders a body GLB named by URL.
 *
 * The create screen and the body editor speak in asset URLs, not manifest keys,
 * and their only way to show a face was a portrait png published beside the GLB.
 * Where none exists the card rendered blank. This hands those surfaces the same
 * key the renderer uses, so they can render the body itself: an already-known
 * file reuses its real manifest entry (fitted height, authored clips, sockets),
 * and only a genuinely unknown file gets the generic auto-clip def.
 */
export function visualKeyForBodyAsset(assetUrl: string): string {
  return registerOverrideVisual({ assetUrl });
}

/** A character as the non-world surfaces know it: a roster row, an inspect
 *  target, a HUD unit frame. No Entity, so no `templateId`/`kind`. */
export interface CharacterVisualQuery {
  cls: PlayerClass;
  /** Realm the overrides were installed under. Defaults to the active realm. */
  realm?: string | null;
  realmHeroId?: string | null;
  /** The server-published body for this character (CharacterSummary.visualKey /
   *  the wire's `vk`, (e.modularAppearance as { gender?: 'male' | 'female' } | null)?.gender ?? null). Used when no operator override claims the character. */
  visualKey?: string | null;
  skinCatalog?: 'class' | 'mech' | null;
  /** The authored look's body sex, when known: selects class:<cls>:f/:m. */
  gender?: 'male' | 'female' | null;
}

/**
 * THE resolver every character-face surface must use.
 *
 * Before this existed the 2D surfaces had their own, weaker chain: they consulted
 * only the /api/realm-visuals overrides and then guessed a portrait png sitting
 * beside the body GLB. Nothing published those pngs for the class-level bodies,
 * so every lookup 404'd and the surfaces fell back to `player_<class>` — the
 * stock KayKit mini — for characters the world was rendering on a real library
 * body. This runs the same order the world's {@link visualKeyFor} does:
 *
 *   1. the Combat Mech cosmetic (class-agnostic body),
 *   2. the operator's live body override (hero -> variant -> class),
 *   3. the compiled realm body the server assigned (`visualKey` / REALM_CLASS_VISUALS),
 *   4. the class rig.
 *
 * Note step 2 can name a lazily-loaded GLB: callers that render must preload it
 * (preloadVisualAssets) and re-render, not treat "not loaded yet" as "no body".
 */
export function visualKeyForCharacter(q: CharacterVisualQuery): string {
  if (q.skinCatalog === 'mech') return 'player_mech';
  const realm = q.realm ?? resolveActiveRealmId();
  const entry = overrideEntryForCharacter(realm, q.realmHeroId ?? null, q.cls, q.gender ?? null);
  if (entry) return registerOverrideVisual(entry);
  if (q.visualKey && VISUALS[q.visualKey]) return q.visualKey;
  // The server omits `vk` for older rows; the compiled per-realm table is the
  // same mapping it would have sent, so the roster never falls back to KayKit
  // just because a character predates the field.
  const compiled = resolveRealmCharacterVisual(realm, q.cls, q.realmHeroId ?? null).visualKey;
  if (compiled && VISUALS[compiled]) return compiled;
  return VISUALS[`player_${q.cls}`] ? `player_${q.cls}` : 'player_warrior';
}




// Families the generated bodies can legitimately stand in for. Every generated
// body passed a humanoid shape gate, so lending one to a spider, mudfin or
// dragonkin would look worse than the existing family fallback.
const GENERATED_POOL_FAMILIES = new Set([
  'humanoid', 'undead', 'demon', 'troll', 'ogre',
]);

/** FNV-1a. Small, stable, and dependency-free — the pick must be identical on
 *  every client and across restarts, so Math.random() is not an option. */
function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Deterministically pick a generated body for a realm+family, keyed on the mob
 *  template so one template always renders as the same character. Returns null
 *  when the realm has no generated bodies or the family is not humanoid-shaped. */
function generatedBodyFor(
  realm: string,
  family: string | undefined,
  templateId: string | undefined,
): string | null {
  // A console browser has a hard resident-memory ceiling and the pool exists to
  // spread a family across HUNDREDS of distinct bodies, each with its own
  // base/normal/metallic set. Twenty of them is a few hundred MB of texture
  // residency that nothing can reclaim, which is what trips
  // SBOX_FATAL_MEMORY_EXCEEDED. Falling through to the shared family bodies
  // costs visible variety and keeps the world on screen.
  if (isBoundedResidency()) return null;
  if (!family || !GENERATED_POOL_FAMILIES.has(family)) return null;
  const pool = GENERATED_REALM_BODIES[realm];
  if (!pool || pool.length === 0) return null;
  const seed = `${realm}:${family}:${templateId ?? 'anon'}`;
  return pool[stableHash(seed) % pool.length] ?? null;
}


/** Pool lookup used by every realm branch. Runs AFTER an explicit per-template
 *  override so curated art always wins, but BEFORE the family fallbacks that would
 *  otherwise collapse a whole family onto one shared body. */
function poolFirst(realm: string, family: string | undefined, templateId: string | undefined): string | null {
  return generatedBodyFor(realm, family, templateId);
}

// Families the generated QUADRUPED roster (creatures.generated.ts) can stand in
// for. Every body there is bound to the wolf donor rig and walks on four legs,
// so membership is decided by SILHOUETTE, not by theme:
//   beast - the roster IS this family: canines, felines, bears, boars, equines,
//           apes, rhinos, elephants. 13 templates, 10 of which already name a
//           curated body, so the pool only ever claims the generic remainder.
// Everything else is deliberately excluded. humanoid/undead/demon/troll/ogre are
// bipeds already served by GENERATED_POOL_FAMILIES; spider has eight legs;
// mudfin and burrower stand upright; elemental and dragonkin are fully claimed by
// authored bodies (mob_dragonkin, hellmaw_dragon_body,
// realm_claudecraft_arcane_dragon) that a four-legged wolf gait would downgrade.
//
// reptile was measured and rejected: its one template (deepfen_spearjaw) already
// has an authored mob_spearjaw body, and a hash pool cannot tell a saurian from
// an ape - it drew a gorilla in Infernal. That template renders as a humanoid in
// Cryptic Realm and Infernal today, but the fix is an authored mapping, not a
// random draw.
//
// Disjoint from GENERATED_POOL_FAMILIES on purpose: because no family is in both
// sets, the two pools can share the identical seed shape below without ever
// being asked the same question, so neither can move in lockstep with the other.
//
// Adding a family here is NOT enough to make it reach the pool: the crypticrealm
// and infernal branches of visualKeyFor dispatch on explicit family lists, so a
// new family needs a call site too. tests/generated_creatures.test.ts pins that
// only beasts resolve to a creature, which fails loudly if this set grows.
const GENERATED_CREATURE_FAMILIES = new Set(['beast']);

/** The quadruped twin of generatedBodyFor: same FNV-1a stableHash, same seed
 *  shape, same residency gate, over the realm's own creature roster.
 *
 *  REALM PURITY: GENERATED_CREATURE_BODIES[realm] is keyed by the realm the body
 *  was actually STAGED into (its GLB lives under /cr-realms/<realm>/creatures/),
 *  and that key is the only way a body is ever reached. There is deliberately no
 *  affinity, alias, or nearest-theme fallback here - those are what previously
 *  leaked classic bodies into Infernal. A realm with no staged creatures gets
 *  null and keeps its existing family fallback. */
function generatedCreatureBodyFor(
  realm: string,
  family: string | undefined,
  templateId: string | undefined,
): string | null {
  // Same ceiling as the humanoid pool: spreading a family over dozens of bodies,
  // each with its own baked texture set, is exactly the residency that trips
  // SBOX_FATAL_MEMORY_EXCEEDED on a console browser. Bounded devices keep the
  // single shared family body.
  if (isBoundedResidency()) return null;
  if (!family || !GENERATED_CREATURE_FAMILIES.has(family)) return null;
  const pool = GENERATED_CREATURE_BODIES[realm];
  if (!pool || pool.length === 0) return null;
  // The hash below is taken modulo the pool size, so adding ONE body to a realm
  // re-rolls every mob in it — that is how mire_prowler turned from a drake into
  // a gorilla when the base realm grew from 2 bodies to 9. Templates that already
  // had a body keep it by pin; only new templates draw from the grown pool, so a
  // realm can gain assets without re-skinning creatures players already know.
  const pinned = templateId ? GENERATED_CREATURE_BODY_PINS[realm]?.[templateId] : undefined;
  if (pinned && pool.includes(pinned)) return pinned;
  const seed = `${realm}:${family}:${templateId ?? 'anon'}`;
  return pool[stableHash(seed) % pool.length] ?? null;
}

export function visualKeyFor(e: Entity): string {
  const bodyOverride = overrideVisualKeyForEntity(e);
  if (bodyOverride) return bodyOverride;
  if (e.kind === 'player') {
    if (isMechWearer(e)) return 'player_mech';
    if (e.skinCatalog === 'mech') return 'player_mech';
    if (e.visualKey && VISUALS[e.visualKey]) return e.visualKey;
    return VISUALS[`player_${e.templateId}`] ? `player_${e.templateId}` : 'player_warrior';
  }
  if (e.kind === 'mob') {
    const realm = resolveActiveRealmId();
    const override = MOB_KEYS[e.templateId];
    const family = MOBS[e.templateId]?.family;
    const realmFamily = family && REALM_MOB_FAMILY_KEYS[realm]?.[family];
    if (realm === 'crypticrealm') {
      // Cryptic Realm is deliberately a crossroads rather than a single-body
      // reskin. Keep recognisable animals and authored creature silhouettes,
      // use the Bone Herald only for undead, and rotate hostile humanoids over
      // the full-size opponent roster. Generic KayKit adventurers never leak
      // into this realm through mob_bandit/mob_dark_caster fallbacks.
      if (override === 'mob_training_dummy') return override;
      if (family && ['beast', 'spider', 'mudfin', 'burrower', 'troll', 'ogre'].includes(family)) {
        // The realm's own quadrupeds sit between the curated override and
        // realmFamily: mob_wolf/mob_boar/mob_spider keep their identities, but a
        // generic beast no longer collapses onto the single realmFamily body.
        return (
          override ??
          generatedCreatureBodyFor(realm, family, e.templateId) ??
          realmFamily ??
          FAMILY_KEYS[family] ??
          'mob_wolf'
        );
      }
      if (family === 'undead') {
        // An authored skeleton body (e.g. the Nythraxis raid boss's skel_golem)
        // always wins over the rotating undead roster, same as the infernal arm.
        if (override?.startsWith('skel_') || override?.startsWith('delve_skel_')) return override;
        return infernalUndeadVisualKey(e.templateId);
      }
      if (family === 'demon') {
        const boundDemonBodies: Partial<Record<string, string>> = {
          emberkin: 'hellmaw_lava_fiend_body',
          gloomshade: 'hellmaw_acolyte_body',
          duskborn: 'hellmaw_sigilbound_body',
          spellhound: 'realm_infernal_skullbeast',
          warfiend: 'realm_infernal_horned_demon',
          pyre_colossus: 'realm_infernal_crimson_behemoth',
          wraithborn: 'hellmaw_spectre_body',
        };
        return boundDemonBodies[e.templateId] ?? realmFamily ?? 'realm_infernal_horned_demon';
      }
      if (family === 'elemental' || family === 'dragonkin') {
        return override ?? realmFamily ?? FAMILY_KEYS[family];
      }
      if (family === 'humanoid') return hostileHumanoidVisualKey(e.templateId);
      if (override && !/^((mob|npc|player)_|delve_mob_)/.test(override)) return override;
      return hostileHumanoidVisualKey(e.templateId);
    }
    if (realm === 'infernal') {
      if (override === 'mob_training_dummy') return override;
      if (override?.startsWith('hellmaw_') || override?.startsWith('realm_infernal_')) {
        return override;
      }
      if (family && ['beast', 'spider', 'mudfin'].includes(family)) {
        return (
          override ??
          generatedCreatureBodyFor(realm, family, e.templateId) ??
          realmFamily ??
          FAMILY_KEYS[family] ??
          'mob_wolf'
        );
      }
      // Spread humanoid-shaped families across the generated pool instead of the
      // single per-family body; curated overrides above already returned. Beasts
      // returned earlier, through the creature roster in the animal list above.
      {
        const pooled = poolFirst(realm, family, e.templateId);
        if (pooled) return pooled;
      }
      if (family === 'troll') return 'realm_infernal_horned_demon';
      if (family === 'ogre') return 'realm_infernal_crimson_behemoth';
      if (family === 'undead') {
        if (override?.startsWith('skel_') || override?.startsWith('delve_skel_')) return override;
        return infernalUndeadVisualKey(e.templateId);
      }
      if (family === 'demon') return realmFamily ?? 'hellmaw_husk_body';
      if (family === 'elemental' || family === 'dragonkin') {
        return realmFamily ?? override ?? FAMILY_KEYS[family];
      }
      return infernalOpponentVisualKey(e.templateId);
    }
    // An explicit creature mapping always wins. In particular, a wolf or boar
    // must never be replaced by the Infernal beast-family fallback just because
    // the active realm has a themed monster family.
    if (override) return override;
    // Pool ahead of realmFamily: REALM_MOB_FAMILY_KEYS resolves ONE body per family,
    // which shadowed the entire generated roster wherever it was defined. Same
    // reasoning for the quadrupeds, which is why they sit at the same point.
    const creature = generatedCreatureBodyFor(realm, family, e.templateId);
    if (creature) return creature;
    const generated = generatedBodyFor(realm, family, e.templateId);
    if (generated) return generated;
    if (realmFamily) return realmFamily;
    return (family && FAMILY_KEYS[family]) || REALM_MOB_DEFAULTS[realm] || 'mob_bandit';
  }
  // npcs — Brother Aldric recurs in every hub under suffixed ids
  const realm = resolveActiveRealmId();
  // Infernal NPCs are human civilians and officials. Enemy commanders are
  // mobs, not NPCs; never fall through to a KayKit elf, orc, or villager.
  if (realm === 'infernal' || realm === 'crypticrealm') {
    // The reviewed Meshy human bank is shared by both authored realms. The
    // template id still owns quests, vendors, housing, and persistence; this
    // branch changes only the rendered body. In particular Brother Aldric and
    // future NPC ids cannot fall through to a miniature KayKit villager.
    return infernalNpcVisualKey(e.templateId);
  }
  if (e.templateId.startsWith('brother_aldric')) return 'npc_aldric';
  const realmKeys = REALM_NPC_KEYS[realm];
  return realmKeys?.[e.templateId] ?? NPC_KEYS[e.templateId] ?? 'npc_villager';
}

/** Held-weapon layout override for the class-agnostic Combat Mech body. The mech
 *  keeps its own model and clips but adopts the WEARER class's hand layout, so a
 *  dual-wield class (the rogue) shows the equipped weapon in BOTH hands on the mech
 *  (it shares the KayKit handslot.r/.l bones). Non-dual classes return null and keep
 *  the mech's own single-mainhand default. Host-agnostic: the wearer's class arrives
 *  as a player entity's templateId, so this applies the same offline and online. */
export function mechHeldWeaponOverride(cls: PlayerClass): WeaponLayoutOverride | null {
  const classDef = VISUALS[`player_${cls}`];
  if (!classDef || ((classDef.weaponSlots?.length ?? 0) < 2 && classDef.offhandSlot === undefined))
    return null;
  return {
    attach: classDef.attach,
    weaponSlots: classDef.weaponSlots,
    offhandSlot: classDef.offhandSlot,
  };
}

/** Every glb the manifest can reference (for preloading). */
export function manifestUrls(): string[] {
  const urls = new Set<string>();
  for (const def of Object.values(VISUALS)) {
    if (def.lazyPreload) continue; // fetched on demand, not at boot
    urls.add(def.url);
    for (const url of def.animUrls ?? []) urls.add(url);
    for (const a of def.attach ?? []) urls.add(a.url);
  }
  // Equipped-weapon models a player may swap to at runtime (any nearby player's
  // gear), so they are resolved-and-ready when setWeapon attaches them.
  for (const url of itemWeaponModelUrls()) urls.add(url);
  for (const url of itemOffhandModelUrls()) urls.add(url);
  // Season 1 Armory weapon-skin models: also attachable on any nearby player at
  // any moment (account-wide cosmetics), so they preload with the same sweep.
  for (const url of weaponSkinModelUrls()) urls.add(url);
  return [...urls];
}

export function visualAssetUrlForGraphics(url: string, standardMaterials: boolean): string {
  return standardMaterials ? url : (LOW_URL_ALIAS[url] ?? url);
}

export function manifestUrlsForGraphics(standardMaterials: boolean): string[] {
  return [
    ...new Set(manifestUrls().map((url) => visualAssetUrlForGraphics(url, standardMaterials))),
  ];
}

/**
 * The character/weapon GLB URLs to PRELOAD, given the graphics tier guessed when
 * assets.ts was first imported. This MUST be tier-INDEPENDENT (a superset of every
 * tier's placement set).
 *
 * Character placement resolves asset URLs against the LIVE GFX tier through
 * assetUrl()/visualAssetUrlForGraphics, and resolvedGltf() throws "character asset not
 * preloaded" synchronously when the resolved URL was never loaded. The live tier is
 * set by initGfxTier() inside the Renderer constructor, AFTER assets.ts froze its
 * import-time GFX best-guess. On low gfx, LOW_URL_ALIAS swaps one body GLB
 * (rogue_hooded.glb -> rogue.glb), so manifestUrlsForGraphics(false) is a STRICT
 * subset of manifestUrlsForGraphics(true). If the import-time guess is low but the
 * renderer resolves medium+, the very common mob_bandit body (rogue_hooded.glb, the
 * humanoid-family default AND the global mob fallback) is placed yet was never
 * preloaded, crashing world entry: the character-side twin of the v0.16.0 props P0.
 * So preload the UNION across both tiers, exactly as foliage.ts is immune by sourcing
 * one frozen list for both preload and placement.
 *
 * The arg is retained to document the invariant and to let the guard test assert it at
 * the lowest (most dangerous) import tier; the result intentionally ignores it.
 */
export function characterPreloadUrls(_importTierStandardMaterials: boolean): string[] {
  return [...new Set([...manifestUrlsForGraphics(true), ...manifestUrlsForGraphics(false)])];
}

export function visibleAttachmentsForGraphics(
  def: Pick<VisualDef, 'attach'>,
): readonly AttachDef[] {
  return def.attach ?? [];
}
