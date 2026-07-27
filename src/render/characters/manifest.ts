// Visual manifest: maps every sim identity (player class, mob template/family,
// NPC id, druid/polymorph form) onto a rigged glTF asset + clip names + kit.
// Pure data + dispatch — no three.js imports, no loading.

import { MECH_CHROMAS, type MechChroma } from '../../sim/content/skins';
import { offhandMirrorsWeaponSkin } from '../../sim/content/weapon_skin_rules';
import { WEAPON_SKINS } from '../../sim/content/weapon_skins';
import { ITEMS, MOBS } from '../../sim/data';
import { infernalCharacterSelection } from '../../sim/realms/infernal_classes';
import { resolveActiveRealmId } from '../../sim/realms/registry';
import type { Entity, PlayerClass } from '../../sim/types';
import { ITEM_WEAPON_VARIANTS } from '../../ui/weapon_variants';
import type { OverheadEmoteId } from '../../world_api';
import { GENERATED_VISUALS } from './manifest.generated';
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
  /** swim base (prone pitch is procedural on top) */
  swim?: string;
  /** airborne base pose while jumping/falling */
  jump?: string;
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
}

/** The slice of a VisualDef that decides how held weapons attach (which bones, and
 *  which slots swap to the equipped item). Lets a cosmetic body adopt a different
 *  class's hand layout without cloning the whole def. */
export type WeaponLayoutOverride = Pick<VisualDef, 'attach' | 'weaponSlots' | 'offhandSlot'>;

// ---------------------------------------------------------------------------
// Clip sets per source rig family
// ---------------------------------------------------------------------------

const KAYKIT_EMOTES: Partial<Record<OverheadEmoteId, EmoteClipSpec>> = {
  wave: { clips: ['Spellcast_Raise', 'Cheer'], timeScale: 0.9 },
  laugh: { clips: ['Hit_A', 'Cheer'], timeScale: 1.45, repeats: 2 },
  question: { clips: ['Block', 'Spellcast_Raise'], timeScale: 1.15 },
  cheer: { clips: ['Cheer'], timeScale: 1.05, repeats: 2 },
  dance: {
    clips: ['Running_Strafe_Left', 'Running_Strafe_Right', 'Cheer'],
    timeScale: 1.05,
    repeats: 2,
  },
  point: { clips: ['Spellcast_Shoot', '2H_Ranged_Shoot'], timeScale: 0.95 },
  flex: { clips: ['Block', 'Cheer'], timeScale: 0.8 },
  salute: { clips: ['Spellcast_Raise', 'Block'], timeScale: 1.18 },
  cry: { clips: ['Hit_A', 'Sit_Floor_Down'], timeScale: 0.65 },
  bow: { clips: ['Sit_Floor_Down', 'Spellcast_Raise'], timeScale: 1.35 },
  clap: { clips: ['1H_Melee_Attack_Slice_Diagonal', 'Cheer'], timeScale: 1.55, repeats: 2 },
  roar: { clips: ['2H_Melee_Attack_Chop', '1H_Melee_Attack_Chop', 'Cheer'], timeScale: 0.9 },
  kneel: { clips: ['Sit_Floor_Down'], timeScale: 0.85 },
};

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

// 2023 enemy rig (goblin/giant)
const ENEMY7: ClipMap = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  attack: ['Attack'],
  hit: ['HitRecieve'],
  death: 'Death',
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
// actions are used where available and donor actions are transferred as rest-pose
// deltas, so each distinct body stays upright through every gameplay state.
const INFERNAL_HUMAN_CLIPS: ClipMap = {
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
};
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
const ENEMIES = 'models/chars/enemies';
const CREATURES = 'models/creatures';
const DUNGEON_MODELS = 'models/dungeon';
const WEAPONS = 'models/weapons';
const REALM_MODELS = '/cr-realms';

function infernalHuman(fileName: string, height = 2.15): VisualDef {
  return {
    url: `${REALM_MODELS}/infernal/${fileName}`,
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
  const baseId = ITEMS[itemId]?.heroicOf;
  return (
    ITEM_WEAPON_VARIANTS[itemId] ??
    extra[itemId] ??
    (baseId ? (ITEM_WEAPON_VARIANTS[baseId] ?? extra[baseId]) : undefined) ??
    null
  );
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
  ],
  player_paladin: [null, `${SKINS_DIR}/paladin/alt_a.png`],
  player_hunter: [
    null,
    `${SKINS_DIR}/ranger/alt_a.png`,
    `${SKINS_DIR}/ranger/alt_b.png`,
    `${SKINS_DIR}/ranger/alt_c.png`,
  ],
  player_rogue: [
    null,
    `${SKINS_DIR}/rogue/alt_a.png`,
    `${SKINS_DIR}/rogue/alt_b.png`,
    `${SKINS_DIR}/rogue/alt_c.png`,
  ],
  player_priest: [
    null,
    `${SKINS_DIR}/mage/alt_a.png`,
    `${SKINS_DIR}/mage/alt_b.png`,
    `${SKINS_DIR}/mage/alt_c.png`,
  ],
  player_mage: [
    null,
    `${SKINS_DIR}/mage/alt_a.png`,
    `${SKINS_DIR}/mage/alt_b.png`,
    `${SKINS_DIR}/mage/alt_c.png`,
  ],
  player_warlock: [
    null,
    `${SKINS_DIR}/mage/alt_a.png`,
    `${SKINS_DIR}/mage/alt_b.png`,
    `${SKINS_DIR}/mage/alt_c.png`,
  ],
  player_shaman: [
    null,
    `${SKINS_DIR}/barbarian/alt_a.png`,
    `${SKINS_DIR}/barbarian/alt_b.png`,
    `${SKINS_DIR}/barbarian/alt_c.png`,
  ],
  player_druid: [
    null,
    `${SKINS_DIR}/druid/alt_a.png`,
    `${SKINS_DIR}/druid/alt_b.png`,
    `${SKINS_DIR}/druid/alt_c.png`,
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
  player_warrior: {
    url: `${PLAYERS}/knight.glb`,
    height: HUMANOID_H,
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
        shield_slam: '2H_Melee_Attack_Chop',
        raging_gale: 'Dualwield_Melee_Attack_Chop',
        bloodthirst: 'Dualwield_Melee_Attack_Chop',
        cleave: '1H_Melee_Attack_Chop',
        thunder_clap: '1H_Melee_Attack_Chop',
        faultline: '1H_Melee_Attack_Chop',
        revenge: '1H_Melee_Attack_Chop',
        heroic_strike: '1H_Melee_Attack_Slice_Diagonal',
        overpower: '1H_Melee_Attack_Slice_Diagonal',
        hamstring: '1H_Melee_Attack_Slice_Diagonal',
        sanguine_aura: 'Spellcast_Raise',
        raised_guard: 'Block',
      },
    },
    show: ['Knight_Helmet', 'Knight_Cape'], // v2 knight dropped the built-in Badge_Shield mesh
    attach: [
      { url: `${WEAPONS}/sword_1handed.glb`, bone: 'handslot.r' },
      { url: `${WEAPONS}/shield_round.glb`, bone: 'handslot.l' },
    ],
    weaponSlots: [0],
    offhandSlot: 1,
  },
  player_paladin: {
    url: `${PLAYERS}/paladin.glb`,
    height: HUMANOID_H,
    clips: {
      ...kaykit(['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal']),
      attackByHand: { twohand: '2H_Melee_Attack_Chop' },
    },
    // dedicated paladin model (helmeted variant) — ships its own Cape + Helmet
    // meshes and texture, so no show-list/tint. Shield + paladin hammer arrive
    // in the weapons pass; the gripped axe holds the slot until then.
    attach: [
      { url: `${WEAPONS}/axe_1handed.glb`, bone: 'handslot.r' },
      { url: `${WEAPONS}/shield_square.glb`, bone: 'handslot.l' },
    ],
    weaponSlots: [0],
    offhandSlot: 1,
  },
  player_hunter: {
    url: `${PLAYERS}/ranger.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Ranged_Shoot']),
    // Bow-draw clips for the Season 1 bow skins (scripts/build_bow_anims.mjs):
    // with a bow displayed the shot plays a draw instead of the crossbow
    // shoulder-aim (visual.ts weaponSkinAttackClips).
    animUrls: [`${PLAYERS}/bow_anims.glb`],
    // dedicated ranger model — the quiver is a built-in mesh, so it's no longer
    // a separate chest attachment
    attach: [{ url: `${WEAPONS}/crossbow_1handed.glb`, bone: 'handslot.r' }],
  },
  player_rogue: {
    url: `${PLAYERS}/rogue.glb`,
    height: HUMANOID_H,
    clips: kaykit(['Dualwield_Melee_Attack_Chop']),
    show: ['Rogue_Cape'],
    attach: [
      { url: `${WEAPONS}/dagger.glb`, bone: 'handslot.r' },
      { url: `${WEAPONS}/dagger.glb`, bone: 'handslot.l' },
    ],
    weaponSlots: [0],
    offhandSlot: 1,
  },
  player_priest: {
    url: `${PLAYERS}/mage.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Melee_Attack_Chop']),
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
    tint: 0xf0e9d6,
    tintStrength: 0.5,
  },
  player_shaman: {
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
    tint: 0x6f8fc9,
    tintStrength: 0.4,
  },
  player_mage: {
    url: `${PLAYERS}/mage.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Melee_Attack_Chop']),
    // The hat and cape render regardless of this list: the current mage.glb
    // rigs every accessory as a SkinnedMesh, and the show allowlist
    // (assets.ts) only hides non-skinned nodes. The hatted silhouette is the
    // sanctioned mage look; listing Mage_Cape is inert but kept as intent.
    show: ['Mage_Cape'],
    attach: [{ url: `${WEAPONS}/staff.glb`, bone: 'handslot.r' }],
    weaponSlots: [0],
  },
  player_warlock: {
    url: `${PLAYERS}/mage.glb`,
    height: HUMANOID_H,
    clips: kaykit(['Spellcast_Shoot']), // wand zap reads better than a staff bonk
    show: [],
    attach: [
      { url: `${WEAPONS}/wand.glb`, bone: 'handslot.r' },
      { url: `${WEAPONS}/spellbook_open.glb`, bone: 'handslot.l', gripRef: 'Spellbook_open' },
    ],
    weaponSlots: [0], // mainhand (wand) swaps; spellbook offhand stays
    tint: 0x8d5fd3,
    tintStrength: 0.45,
  },
  player_druid: {
    url: `${PLAYERS}/druid.glb`,
    height: HUMANOID_H,
    clips: kaykit(['2H_Melee_Attack_Chop']),
    // dedicated druid model (own texture, ships a Backpack mesh)
    attach: [{ url: `${WEAPONS}/staff.glb`, bone: 'handslot.r' }],
    weaponSlots: [0],
  },

  // -- cosmetic body skin (class-agnostic; both the skin preview and a live
  //    player whose skinCatalog === 'mech', see visualKeyFor) ----------------
  player_mech: {
    url: `${PLAYERS}/Mech/characters/CombatMech.glb`,
    height: HUMANOID_H,
    // The mech is rigged to the same KayKit Rig_Medium skeleton as every other
    // player class; its GLB shipped with no clips, so the full KayKit set is
    // baked in from knight.glb (scripts/bake_mech_anims.mjs) — these names now
    // resolve like any other class. Lazy-loaded; see preloadMechAssets().
    clips: kaykit(['1H_Melee_Attack_Chop']),
    // Class-agnostic cosmetic body, but it still holds the wearer's equipped
    // mainhand: the shared handslot.r bone carries the grip (the mech reuses the
    // exact KayKit rig), so weaponSlots swaps attach[0] to the equipped weapon's
    // model just like every other class. The sword is only the no-weapon default.
    attach: [{ url: `${WEAPONS}/sword_1handed.glb`, bone: 'handslot.r' }],
    weaponSlots: [0],
    lazyPreload: true,
  },

  // -- ArcForge / Meshy realm player bodies --------------------------------
  // These override only the rendered body. templateId remains the upstream
  // class, so combat, equipment, spells, talents, and persistence stay stable.
  realm_cryptic_bone_herald: {
    url: `${REALM_MODELS}/crypticrealm/bone-herald-black-meshy_ai_meshy_merged_animations_5fb3b8bb.glb`,
    height: HUMANOID_H,
    clips: meshyBiped(),
    lazyPreload: true,
  },
  realm_infernal_crimson_behemoth: {
    url: `${REALM_MODELS}/infernal/meshy_ai_crimson_infernal_behe_biped_meshy_ai_meshy_merged_animations_27bab94d.glb`,
    height: 2.9,
    clips: meshyBiped([], { run: 'RunFast' }),
    lazyPreload: true,
  },
  realm_infernal_horned_demon: {
    url: `${REALM_MODELS}/infernal/demon-horned_1a19d7ca.glb`,
    height: HUMANOID_H,
    clips: meshyBiped(),
    lazyPreload: true,
  },
  realm_infernal_skullbeast: {
    url: `${REALM_MODELS}/infernal/skullbeast_5d2ecebf.glb`,
    height: 2.4,
    clips: meshyBiped(['Left_Slash'], { walk: 'Monster_Walk', run: 'Running' }),
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
    animUrls: [
      `${REALM_MODELS}/infernal/dark_paladin_running.glb`,
      `${REALM_MODELS}/infernal/dark_paladin_reaping_swing.glb`,
    ],
    height: 2.35,
    clips: {
      idle: 'Walking',
      walk: 'Walking',
      run: 'Running',
      attack: ['Reaping_Swing'],
      death: 'Walking',
      hit: ['Walking'],
    },
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
    clips: meshyBiped(),
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
    clips: meshyBiped(),
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
    clips: meshyBiped(['Attack']),
    lazyPreload: true,
  },
  realm_classic_big_orc: {
    url: `${REALM_MODELS}/classic/bigass-orc-meshy_ai_meshy_merged_animations_86937638.glb`,
    height: 2.8,
    clips: meshyBiped(),
    lazyPreload: true,
  },
  realm_classic_fighting_elf: {
    url: `${REALM_MODELS}/classic/fighting-elf-meshy_ai_meshy_merged_animations_943c5367.glb`,
    height: HUMANOID_H,
    clips: meshyBiped(['Reaping_Swing', 'Dodge_and_Counter', 'Counter_Attack'], {
      run: 'RunFast',
      jump: 'Backflip_Sweep_Kick',
    }),
    lazyPreload: true,
  },
  realm_classic_dwarf: {
    url: `${REALM_MODELS}/classic/gray-dwarf-meshy_ai_meshy_merged_animations_a33ff315.glb`,
    height: 2.25,
    clips: meshyBiped(),
    lazyPreload: true,
  },
  realm_classic_female_elf: {
    url: `${REALM_MODELS}/classic/female-elf-meshy_ai_meshy_merged_animations_2dde3113.glb`,
    height: HUMANOID_H,
    clips: meshyBiped(),
    lazyPreload: true,
  },
  realm_classic_female_orc: {
    url: `${REALM_MODELS}/classic/female-orc-meshy_ai_meshy_merged_animations_a5a08a67.glb`,
    height: HUMANOID_H,
    clips: meshyBiped(),
    lazyPreload: true,
  },
  realm_classic_treasure_dwarf: {
    url: `${REALM_MODELS}/classic/treasure-dwarf-meshy_ai_meshy_merged_animations_91488daf.glb`,
    height: 2.25,
    clips: meshyBiped(),
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
  form_bear: {
    url: `${CREATURES}/yetialt.glb`,
    height: 2.4,
    clips: BIPED14,
    tint: 0x5a4030,
    tintStrength: 0.55,
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
  // Druid Travel Form: a daft chicken-cow hybrid (custom GLB). No tint — its
  // authored cow-spots/comb/beak colours carry the look.
  form_travel: {
    url: `${CREATURES}/chicken_cow.glb`,
    height: 2.3,
    clips: CHICKEN_COW,
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
    clips: animal(['Attack_Headbutt', 'Attack']),
    tint: 'entity',
    tintStrength: 0.35,
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
    clips: ENEMY7,
    tint: 'entity',
    tintStrength: 0.2, // keep the green readable
  },
  mob_troll: {
    url: `${CREATURES}/orc.glb`,
    height: 2.4,
    // faint wash only — 0.35 flooded every material with the template green
    clips: BIPED14,
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
  mob_elemental: {
    url: `${CREATURES}/golelingevolved.glb`,
    height: 2.2,
    hover: 0.3,
    clips: FLOATING,
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
    clips: skeletonClips(['2H_Melee_Attack_Chop'], 'Taunt'),
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
  skel_golem: {
    url: `${ENEMIES}/skeleton_golem.glb`,
    height: 3.4,
    clips: skeletonLargeClips(['2H_Melee_Attack_Chop', '1H_Melee_Attack_Chop']),
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
export const VISUALS: Record<string, VisualDef> = {
  ...GENERATED_VISUALS,
  ...HAND_VISUALS,
};

// ---------------------------------------------------------------------------
// Dispatch: entity -> visual key (mirrors the old buildRigFor selection:
// e.kind + e.templateId + MOBS[id].family)
// ---------------------------------------------------------------------------

const MOB_KEYS: Record<string, string> = {
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
  crypticrealm: 'realm_infernal_human_tainted_hood',
  infernal: 'realm_infernal_horned_demon',
  classic: 'realm_classic_orc',
  claudecraft: 'realm_claudecraft_dark_wanderer',
};

const REALM_MOB_FAMILY_KEYS: Partial<Record<string, Partial<Record<string, string>>>> = {
  crypticrealm: {
    beast: 'mob_wolf',
    humanoid: 'realm_infernal_human_tainted_hood',
    undead: 'realm_cryptic_bone_herald',
    demon: 'realm_infernal_horned_demon',
    elemental: 'mob_elemental',
    dragonkin: 'mob_dragonkin',
  },
  infernal: {
    // Generic beasts remain animals; Infernal demon bodies are reserved for
    // demon-family mobs and named Hellmaw encounters.
    beast: 'mob_wolf',
    humanoid: 'realm_infernal_human_tainted_hood',
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
const OVERRIDE_AUTO_CLIPS: ClipMap = {
  idle: '__auto__',
  walk: '__auto__',
  run: '__auto__',
  attack: ['__auto__'],
  death: '__auto__',
};

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

function registerOverrideVisual(entry: BodyOverrideEntry): string {
  const key = `override_${overrideVisualHash(entry.assetUrl)}`;
  if (!VISUALS[key]) {
    VISUALS[key] = {
      url: entry.assetUrl,
      height: 2.0,
      autoClip: true,
      lazyPreload: true,
      clips: OVERRIDE_AUTO_CLIPS,
    };
  }
  return key;
}

/** The override visual key for an entity, or null. A realm hero assignment is
 *  most specific, followed by class, NPC, and mob template assignments. */
function overrideVisualKeyForEntity(e: Entity): string | null {
  const realm = resolveActiveRealmId();
  const map = BODY_OVERRIDES[realm];
  if (!map) return null;
  let entry: BodyOverrideEntry | undefined;
  if (e.kind === 'player') {
    const selection = infernalCharacterSelection(realm, e.realmHeroId, e.templateId as PlayerClass);
    entry = selection ? (map[`hero:${selection.id}`] ?? map[`hero:${selection.name}`]) : undefined;
    entry ??= map[`class:${e.templateId}`];
  } else if (e.kind === 'npc') {
    entry = map[`npc:${e.templateId}`];
  } else if (e.kind === 'mob') {
    entry = map[`mob:${e.templateId}`];
  } else {
    return null;
  }
  return entry ? registerOverrideVisual(entry) : null;
}

export function visualKeyFor(e: Entity): string {
  const bodyOverride = overrideVisualKeyForEntity(e);
  if (bodyOverride) return bodyOverride;
  if (e.kind === 'player') {
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
        return override ?? realmFamily ?? FAMILY_KEYS[family] ?? 'mob_wolf';
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
        return override ?? realmFamily ?? FAMILY_KEYS[family] ?? 'mob_wolf';
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
