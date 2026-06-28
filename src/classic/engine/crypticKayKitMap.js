// crypticKayKitMap.js — Smart mapping of KayKit asset paths to Cryptic Realm roles.
// Generated/maintained by hand. Pairs each known KayKit GLB/GLTF with a slot the
// game already uses (player class, NPC, monster, summon, prop, weapon, etc.).
//
// Asset root convention: files are deployed to `/cryptic-assets/...` by update-app.
// KayKit folder lives under `CrypticRealmAssets/3d-assets/KayKit/<pack>/...` so
// the served URLs look like `/cryptic-assets/3d-assets/KayKit/Adventurers/.../Knight.glb`
// (no URL-encoding needed — no spaces).

export const CR_KAYKIT_BASE = "/cryptic-assets/3d-assets/KayKit";

function _encPath(s) {
  return s.split("/").map(encodeURIComponent).join("/");
}

export function crKayUrl(relPath) {
  if (!relPath) return null;
  return `${CR_KAYKIT_BASE}/${_encPath(relPath)}`;
}

// ─── Player class → KayKit body ──────────────────────────────────────────────
// Each entry: { glb, archetype, label, animationsRig }
// Animations rig points at the matching KayKit_Character_Animations_1.1 pack.
export const CR_KAYKIT_CLASS_BODIES = {
  kaykit_mage: {
    glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Mage.glb",
    texture: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/mage_texture.png",
    archetype: "robed caster",
    label: "Mage",
    rig: "medium",
  },
  kaykit_barbarian: {
    glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb",
    texture: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/barbarian_texture.png",
    archetype: "heavy barbarian",
    label: "Barbarian",
    rig: "medium",
  },
  kaykit_necromancer: {
    // Human necromancer — uses the Mage body with dark-robed necromancer look.
    // The Skeleton_Mage was wrong: Bone Herald is a living necromancer who RAISES skeletons.
    glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Mage.glb",
    texture: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/mage_texture.png",
    archetype: "human necromancer",
    label: "Necromancer",
    rig: "medium",
    tintHex: "#1a0a2a", // dark purple tint applied in spriter
  },
  kaykit_rogue_hooded: {
    glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue_Hooded.glb",
    texture: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/rogue_texture.png",
    archetype: "dual blade rogue",
    label: "Hooded Rogue",
    rig: "medium",
  },
  kaykit_rogue: {
    glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue.glb",
    texture: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/rogue_texture.png",
    archetype: "druid shaman",
    label: "Rogue (Forest)",
    rig: "medium",
  },
  kaykit_knight: {
    glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Knight.glb",
    texture: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/knight_texture.png",
    archetype: "armored paladin",
    label: "Knight",
    rig: "medium",
  },
  kaykit_ranger: {
    glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb",
    texture: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/ranger_texture.png",
    archetype: "hooded archer",
    label: "Ranger",
    rig: "medium",
  },
};

// ─── Monsters and summons ────────────────────────────────────────────────────
export const CR_KAYKIT_MONSTERS = {
  skeleton: {
    glb: "Skeletons/KayKit_Skeletons_1.1_FREE/characters/gltf/Skeleton_Warrior.glb",
    texture: "Skeletons/KayKit_Skeletons_1.1_FREE/characters/gltf/skeleton_texture.png",
    archetype: "skeleton warrior",
    label: "Skeleton Warrior",
  },
  skeleton_rogue: {
    glb: "Skeletons/KayKit_Skeletons_1.1_FREE/characters/gltf/Skeleton_Rogue.glb",
    texture: "Skeletons/KayKit_Skeletons_1.1_FREE/characters/gltf/skeleton_texture.png",
    archetype: "skeleton rogue",
    label: "Skeleton Rogue",
  },
  skeleton_minion: {
    glb: "Skeletons/KayKit_Skeletons_1.1_FREE/characters/gltf/Skeleton_Minion.glb",
    texture: "Skeletons/KayKit_Skeletons_1.1_FREE/characters/gltf/skeleton_texture.png",
    archetype: "skeleton minion",
    label: "Skeleton Minion",
  },
  skeleton_mage_enemy: {
    glb: "Skeletons/KayKit_Skeletons_1.1_FREE/characters/gltf/Skeleton_Mage.glb",
    archetype: "skeleton caster",
    label: "Skeleton Mage",
  },
};

// Maps in-game enemy type ids to KayKit monster slot ids. Not every enemy
// has a perfect KayKit equivalent yet — these fall back to the closest
// silhouette so the world isn't empty. Beasts and elementals stay
// procedural until we ship dedicated packs for them.
export const CR_KAYKIT_ENEMY_MAP = {
  // Act 1 – Undead
  zombie:        "skeleton_minion",
  skeleton:      "skeleton",
  mummy:         "skeleton_minion",
  // Act 2 – Desert
  sand_golem:    "skeleton_minion",   // golem-like low posture skeleton
  // Act 3 – Jungle
  shaman:        "skeleton_mage_enemy",
  jungle_demon:  "skeleton_rogue",
  // Act 4 – Hell
  blood_knight:  "skeleton",
  chaos_mage:    "skeleton_mage_enemy",
  fire_imp:      "skeleton_minion",
  // Act 5 – Frozen
  ice_wraith:    "skeleton_minion",
  snow_witch:    "skeleton_mage_enemy",
  // Act 6 – Void
  dim_horror:    "skeleton_minion",
  rift_spawn:    "skeleton_rogue",
  star_eater:    "skeleton_mage_enemy",
  // No KayKit equivalent yet → procedural canvas fallback:
  // werewolf, scorpion, plant_horror, frost_giant
};

export const CR_KAYKIT_SUMMONS = {
  summon_skeleton: {
    glb: "Skeletons/KayKit_Skeletons_1.1_FREE/characters/gltf/Skeleton_Minion.glb",
    archetype: "friendly skeleton minion",
    label: "Skeleton Minion (Ally)",
  },
  summon_mage: {
    glb: "Skeletons/KayKit_Skeletons_1.1_FREE/characters/gltf/Skeleton_Mage.glb",
    archetype: "friendly skeleton mage",
    label: "Skeletal Mage (Ally)",
  },
  summon_warrior: {
    glb: "Skeletons/KayKit_Skeletons_1.1_FREE/characters/gltf/Skeleton_Warrior.glb",
    archetype: "friendly skeleton warrior",
    label: "Skeletal Warrior (Ally)",
  },
};

// ─── Town NPCs ───────────────────────────────────────────────────────────────
// Full NPC roster — each vendor / NPC type gets a distinct adventurer body.
export const CR_KAYKIT_NPCS = {
  npc_blacksmith: { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb",   label: "Blacksmith (Barbarian)" },
  npc_merchant:   { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue_Hooded.glb",label: "Merchant (Hooded Rogue)" },
  npc_healer:     { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Mage.glb",        label: "Healer (Mage)" },
  npc_stash:      { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Knight.glb",      label: "Stash Keeper (Knight)" },
  npc_forge:      { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb",   label: "Forge (Barbarian)" },
  npc_identifier: { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Mage.glb",        label: "Identifier (Mage)" },
  npc_waypoint:   { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Knight.glb",      label: "Waypoint Guardian (Knight)" },
  npc_ranger:     { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb",      label: "Ranger NPC" },
  npc_rogue:      { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue.glb",       label: "Rogue NPC" },
  npc_wardrobe:   { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue.glb",       label: "Wardrobe (Rogue)" },
  npc_merc_captain: { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb", label: "Merc Captain (Barbarian)" },
  // Explicit fallbacks for the new Meshy town performers when quality is below
  // 128-bit or while Meshy strips are still baking.
  town_bard:      { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue.glb",       label: "Town Bard (Rogue fallback)" },
  town_monk:      { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Mage.glb",        label: "Town Monk (Mage fallback)" },
  bard_musician:  { glb: "Adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue.glb",       label: "Bard Musician (Rogue fallback)" },
};

// ─── Mannequin animation rigs (universal) ────────────────────────────────────
export const CR_KAYKIT_RIGS = {
  medium: {
    base:   "Char_Animations/KayKit_Character_Animations_1.1/Mannequin Character/characters/Mannequin_Medium.glb",
    general:"Char_Animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_General.glb",
    move:   "Char_Animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb",
  },
  large: {
    base:   "Char_Animations/KayKit_Character_Animations_1.1/Mannequin Character/characters/Mannequin_Large.glb",
    general:"Char_Animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Large/Rig_Large_General.glb",
    melee:  "Char_Animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Large/Rig_Large_CombatMelee.glb",
    move:   "Char_Animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Large/Rig_Large_MovementBasic.glb",
    moveAdv:"Char_Animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Large/Rig_Large_MovementAdvanced.glb",
    sim:    "Char_Animations/KayKit_Character_Animations_1.1/Animations/gltf/Rig_Large/Rig_Large_Simulation.glb",
  },
};

// ─── Props (chests, weapons, banners, lights) — Dungeon 1.0 ──────────────────
// Subset of Dungeon1.0 GLBs that map to game roles.
export const CR_KAYKIT_PROPS = {
  chest_common:   "Dungeon1.0/Models/gltf/chest_common.gltf.glb",
  chest_uncommon: "Dungeon1.0/Models/gltf/chest_rare.gltf.glb",
  chest_rare:     "Dungeon1.0/Models/gltf/chest_rare.gltf.glb",
  chest_mimic:    "Dungeon1.0/Models/gltf/chestTop_uncommon_mimic.gltf.glb",
  barrel:         "Dungeon1.0/Models/gltf/barrel.gltf.glb",
  barrel_dark:    "Dungeon1.0/Models/gltf/barrelDark.gltf.glb",
  bookcase:       "Dungeon1.0/Models/gltf/bookcase.gltf.glb",
  bookcase_full:  "Dungeon1.0/Models/gltf/bookcaseFilled.gltf.glb",
  bench:          "Dungeon1.0/Models/gltf/bench.gltf.glb",
  banner:         "Dungeon1.0/Models/gltf/banner.gltf.glb",
  bricks:         "Dungeon1.0/Models/gltf/bricks.gltf.glb",
  bucket:         "Dungeon1.0/Models/gltf/bucket.gltf.glb",
  artifact:       "Dungeon1.0/Models/gltf/artifact.gltf.glb",
  arrow:          "Dungeon1.0/Models/gltf/arrow.gltf.glb",
  // Weapons (loot drops)
  axe_common:     "Dungeon1.0/Models/gltf/axe_common.gltf.glb",
  axe_uncommon:   "Dungeon1.0/Models/gltf/axe_uncommon.gltf.glb",
  axe_rare:       "Dungeon1.0/Models/gltf/axe_rare.gltf.glb",
  axe2h_common:   "Dungeon1.0/Models/gltf/axeDouble_common.gltf.glb",
  axe2h_uncommon: "Dungeon1.0/Models/gltf/axeDouble_uncommon.gltf.glb",
  axe2h_rare:     "Dungeon1.0/Models/gltf/axeDouble_rare.gltf.glb",
};

// ─── Dungeon Remastered 1.1 props ────────────────────────────────────────────
// Better quality dungeon props — torches, tables, pillars, etc.
const _DR = "Dungeon-1.1/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf";
export const CR_KAYKIT_DUNGEON11 = {
  torch_lit:          `${_DR}/torch_lit.gltf`,
  torch_mounted:      `${_DR}/torch_mounted.gltf`,
  candle_lit:         `${_DR}/candle_lit.gltf`,
  candle_triple:      `${_DR}/candle_triple.gltf`,
  chest:              `${_DR}/chest.gltf`,
  chest_gold:         `${_DR}/chest_gold.gltf`,
  barrel_large:       `${_DR}/barrel_large.gltf`,
  barrel_small:       `${_DR}/barrel_small.gltf`,
  barrel_small_stack: `${_DR}/barrel_small_stack.gltf`,
  pillar:             `${_DR}/pillar.gltf`,
  pillar_decorated:   `${_DR}/pillar_decorated.gltf`,
  column:             `${_DR}/column.gltf`,
  table_long:         `${_DR}/table_long.gltf`,
  table_medium:       `${_DR}/table_medium.gltf`,
  table_small:        `${_DR}/table_small.gltf`,
  chair:              `${_DR}/chair.gltf`,
  stool:              `${_DR}/stool.gltf`,
  shelf_large:        `${_DR}/shelf_large.gltf`,
  shelves:            `${_DR}/shelves.gltf`,
  stairs:             `${_DR}/stairs.gltf`,
  rubble_large:       `${_DR}/rubble_large.gltf`,
  rubble_half:        `${_DR}/rubble_half.gltf`,
  banner_red:         `${_DR}/banner_red.gltf`,
  banner_blue:        `${_DR}/banner_blue.gltf`,
  banner_green:       `${_DR}/banner_green.gltf`,
  coin_stack_large:   `${_DR}/coin_stack_large.gltf`,
  key:                `${_DR}/key.gltf`,
  box_large:          `${_DR}/box_large.gltf`,
  box_stacked:        `${_DR}/box_stacked.gltf`,
  crates_stacked:     `${_DR}/crates_stacked.gltf`,
  sword_shield:       `${_DR}/sword_shield.gltf`,
  trunk_large_A:      `${_DR}/trunk_large_A.gltf`,
  bottle_A_green:     `${_DR}/bottle_A_green.gltf`,
  keg:                `${_DR}/keg.gltf`,
  keg_decorated:      `${_DR}/keg_decorated.gltf`,
};

// ─── Dungeon Remastered 1.1 — Structural walls ───────────────────────────────
// Use these to construct interior room walls tile-by-tile (isometric, 1-unit grid).
// All pieces live in the same _DR folder as CR_KAYKIT_DUNGEON11.
//
// Rotation guide (Y-axis, radians, for isometric iso view):
//   0          = faces South  (default KayKit orientation)
//   Math.PI/2  = faces East
//   Math.PI    = faces North
//   -Math.PI/2 = faces West
export const CR_KAYKIT_DUNGEON_WALLS = {
  // ── Straight walls ──────────────────────────────────────────────────────────
  wall:                     `${_DR}/wall.gltf`,
  wall_broken:              `${_DR}/wall_broken.gltf`,
  wall_cracked:             `${_DR}/wall_cracked.gltf`,
  wall_half:                `${_DR}/wall_half.gltf`,
  wall_sloped:              `${_DR}/wall_sloped.gltf`,
  wall_shelves:             `${_DR}/wall_shelves.gltf`,
  // ── Corners ─────────────────────────────────────────────────────────────────
  wall_corner:              `${_DR}/wall_corner.gltf`,
  wall_corner_small:        `${_DR}/wall_corner_small.gltf`,
  wall_corner_gated:        `${_DR}/wall_corner_gated.gltf`,
  // ── Doorways / openings ──────────────────────────────────────────────────────
  wall_doorway:             `${_DR}/wall_doorway.gltf`,
  wall_doorway_sides:       `${_DR}/wall_doorway_sides.gltf`,
  wall_doorway_Tsplit:      `${_DR}/wall_doorway_Tsplit.gltf`,
  wall_gated:               `${_DR}/wall_gated.gltf`,
  // ── Windows ─────────────────────────────────────────────────────────────────
  wall_arched:              `${_DR}/wall_arched.gltf`,
  wall_archedwindow_open:   `${_DR}/wall_archedwindow_open.gltf`,
  wall_archedwindow_gated:  `${_DR}/wall_archedwindow_gated.gltf`,
  wall_window_open:         `${_DR}/wall_window_open.gltf`,
  wall_window_closed:       `${_DR}/wall_window_closed.gltf`,
  // ── Junctions ───────────────────────────────────────────────────────────────
  wall_Tsplit:              `${_DR}/wall_Tsplit.gltf`,
  wall_Tsplit_sloped:       `${_DR}/wall_Tsplit_sloped.gltf`,
  wall_crossing:            `${_DR}/wall_crossing.gltf`,
  // ── Endcaps ─────────────────────────────────────────────────────────────────
  wall_endcap:              `${_DR}/wall_endcap.gltf`,
  wall_half_endcap:         `${_DR}/wall_half_endcap.gltf`,
  wall_half_endcap_sloped:  `${_DR}/wall_half_endcap_sloped.gltf`,
  // ── Pillar-mounted ──────────────────────────────────────────────────────────
  wall_pillar:              `${_DR}/wall_pillar.gltf`,
  // ── Stairs ──────────────────────────────────────────────────────────────────
  stairs:                   `${_DR}/stairs.gltf`,
  stairs_wide:              `${_DR}/stairs_wide.gltf`,
  stairs_narrow:            `${_DR}/stairs_narrow.gltf`,
  stairs_walled:            `${_DR}/stairs_walled.gltf`,
  stairs_long:              `${_DR}/stairs_long.gltf`,
  stairs_wood:              `${_DR}/stairs_wood.gltf`,
  stairs_wood_decorated:    `${_DR}/stairs_wood_decorated.gltf`,
  stairs_wall_left:         `${_DR}/stairs_wall_left.gltf`,
  stairs_wall_right:        `${_DR}/stairs_wall_right.gltf`,
  stairs_modular_left:      `${_DR}/stairs_modular_left.gltf`,
  stairs_modular_center:    `${_DR}/stairs_modular_center.gltf`,
  stairs_modular_right:     `${_DR}/stairs_modular_right.gltf`,
  stairs_long_modular_left:  `${_DR}/stairs_long_modular_left.gltf`,
  stairs_long_modular_center:`${_DR}/stairs_long_modular_center.gltf`,
  stairs_long_modular_right: `${_DR}/stairs_long_modular_right.gltf`,
  // ── Barriers (low cover) ────────────────────────────────────────────────────
  barrier:                  `${_DR}/barrier.gltf`,
  barrier_corner:           `${_DR}/barrier_corner.gltf`,
  barrier_half:             `${_DR}/barrier_half.gltf`,
  barrier_column:           `${_DR}/barrier_column.gltf`,
  barrier_column_half:      `${_DR}/barrier_colum_half.gltf`,
  // ── Ceiling ─────────────────────────────────────────────────────────────────
  ceiling_tile:             `${_DR}/ceiling_tile.gltf`,
};

// ─── Dungeon Remastered 1.1 — Floor tiles ────────────────────────────────────
// Mix-and-match floor tiles to fill walkable interior grid cells.
export const CR_KAYKIT_DUNGEON_FLOORS = {
  // Stone tiles (primary dungeon floor)
  floor_tile_large:              `${_DR}/floor_tile_large.gltf`,
  floor_tile_large_rocks:        `${_DR}/floor_tile_large_rocks.gltf`,
  floor_tile_small:              `${_DR}/floor_tile_small.gltf`,
  floor_tile_small_decorated:    `${_DR}/floor_tile_small_decorated.gltf`,
  floor_tile_small_corner:       `${_DR}/floor_tile_small_corner.gltf`,
  floor_tile_small_broken_A:     `${_DR}/floor_tile_small_broken_A.gltf`,
  floor_tile_small_broken_B:     `${_DR}/floor_tile_small_broken_B.gltf`,
  floor_tile_small_weeds_A:      `${_DR}/floor_tile_small_weeds_A.gltf`,
  floor_tile_small_weeds_B:      `${_DR}/floor_tile_small_weeds_B.gltf`,
  // Grates
  floor_tile_grate:              `${_DR}/floor_tile_grate.gltf`,
  floor_tile_grate_open:         `${_DR}/floor_tile_grate_open.gltf`,
  floor_tile_big_grate:          `${_DR}/floor_tile_big_grate.gltf`,
  floor_tile_big_grate_open:     `${_DR}/floor_tile_big_grate_open.gltf`,
  floor_tile_big_spikes:         `${_DR}/floor_tile_big_spikes.gltf`,   // trap tile
  floor_tile_extralarge_grates:  `${_DR}/floor_tile_extralarge_grates.gltf`,
  // Dirt / earth floors
  floor_dirt_large:              `${_DR}/floor_dirt_large.gltf`,
  floor_dirt_large_rocky:        `${_DR}/floor_dirt_large_rocky.gltf`,
  floor_dirt_small_A:            `${_DR}/floor_dirt_small_A.gltf`,
  floor_dirt_small_B:            `${_DR}/floor_dirt_small_B.gltf`,
  floor_dirt_small_C:            `${_DR}/floor_dirt_small_C.gltf`,
  floor_dirt_small_D:            `${_DR}/floor_dirt_small_D.gltf`,
  floor_dirt_small_corner:       `${_DR}/floor_dirt_small_corner.gltf`,
  floor_dirt_small_weeds:        `${_DR}/floor_dirt_small_weeds.gltf`,
  // Foundation edges (raised lip pieces — use around room perimeter)
  floor_foundation_allsides:     `${_DR}/floor_foundation_allsides.gltf`,
  floor_foundation_corner:       `${_DR}/floor_foundation_corner.gltf`,
  floor_foundation_diagonal:     `${_DR}/floor_foundation_diagonal_corner.gltf`,
  floor_foundation_front:        `${_DR}/floor_foundation_front.gltf`,
  floor_foundation_front_back:   `${_DR}/floor_foundation_front_and_back.gltf`,
  floor_foundation_front_sides:  `${_DR}/floor_foundation_front_and_sides.gltf`,
  // Wood floors (for buildings, taverns, homes)
  floor_wood_large:              `${_DR}/floor_wood_large.gltf`,
  floor_wood_large_dark:         `${_DR}/floor_wood_large_dark.gltf`,
  floor_wood_small:              `${_DR}/floor_wood_small.gltf`,
  floor_wood_small_dark:         `${_DR}/floor_wood_small_dark.gltf`,
};

// ─── Interior room templates ──────────────────────────────────────────────────
// Quick presets for building interiors. Each template describes which wall
// and floor tile ids to use so CrypticRealmGame can render the room procedurally.
export const CR_INTERIOR_TEMPLATES = {
  dungeon_room: {
    floor: "floor_tile_large",
    floor_worn: "floor_tile_small_broken_A",
    wall: "wall",
    wall_corner: "wall_corner",
    wall_doorway: "wall_doorway",
    desc: "Standard stone dungeon room",
  },
  blacksmith: {
    floor: "floor_wood_large_dark",
    wall: "wall",
    wall_corner: "wall_corner",
    wall_doorway: "wall_doorway",
    desc: "Dark-wood floored smithy",
  },
  tavern: {
    floor: "floor_wood_large",
    wall: "wall",
    wall_corner: "wall_corner",
    wall_doorway: "wall_doorway",
    desc: "Warm plank tavern floor",
  },
  church: {
    floor: "floor_tile_small_decorated",
    wall: "wall_arched",
    wall_corner: "wall_corner",
    wall_doorway: "wall_arched",
    desc: "Decorated church interior",
  },
  crypt: {
    floor: "floor_dirt_large_rocky",
    wall: "wall_cracked",
    wall_corner: "wall_corner",
    wall_doorway: "wall_gated",
    desc: "Ruined underground crypt",
  },
};

// ─── ForestNature trees, rocks, bushes ────────────────────────────────────────
const _FN = "ForestNature/Assets/gltf";
export const CR_KAYKIT_FOREST = {
  // Trees — 4 styles × 3 variants each
  tree_1_a: `${_FN}/Tree_1_A_Color1.gltf`,
  tree_1_b: `${_FN}/Tree_1_B_Color1.gltf`,
  tree_1_c: `${_FN}/Tree_1_C_Color1.gltf`,
  tree_2_a: `${_FN}/Tree_2_A_Color1.gltf`,
  tree_2_b: `${_FN}/Tree_2_B_Color1.gltf`,
  tree_2_c: `${_FN}/Tree_2_C_Color1.gltf`,
  tree_3_a: `${_FN}/Tree_3_A_Color1.gltf`,
  tree_3_b: `${_FN}/Tree_3_B_Color1.gltf`,
  tree_3_c: `${_FN}/Tree_3_C_Color1.gltf`,
  tree_4_a: `${_FN}/Tree_4_A_Color1.gltf`,
  tree_4_b: `${_FN}/Tree_4_B_Color1.gltf`,
  tree_4_c: `${_FN}/Tree_4_C_Color1.gltf`,
  // Bare trees (winter / dead)
  tree_bare_1_a: `${_FN}/Tree_Bare_1_A_Color1.gltf`,
  tree_bare_2_a: `${_FN}/Tree_Bare_2_A_Color1.gltf`,
  // Rocks — 3 styles × multiple variants
  rock_1_a: `${_FN}/Rock_1_A_Color1.gltf`,
  rock_1_b: `${_FN}/Rock_1_B_Color1.gltf`,
  rock_1_c: `${_FN}/Rock_1_C_Color1.gltf`,
  rock_2_a: `${_FN}/Rock_2_A_Color1.gltf`,
  rock_2_b: `${_FN}/Rock_2_B_Color1.gltf`,
  rock_3_a: `${_FN}/Rock_3_A_Color1.gltf`,
  rock_3_b: `${_FN}/Rock_3_B_Color1.gltf`,
  // Bushes
  bush_1_a: `${_FN}/Bush_1_A_Color1.gltf`,
  bush_1_b: `${_FN}/Bush_1_B_Color1.gltf`,
  bush_2_a: `${_FN}/Bush_2_A_Color1.gltf`,
  bush_3_a: `${_FN}/Bush_3_A_Color1.gltf`,
  bush_4_a: `${_FN}/Bush_4_A_Color1.gltf`,
};

// Pool of tree ids used in wilderness — seeded-random picks from this list
export const CR_FOREST_TREE_IDS = [
  "tree_1_a","tree_1_b","tree_1_c",
  "tree_2_a","tree_2_b","tree_2_c",
  "tree_3_a","tree_3_b","tree_3_c",
  "tree_4_a","tree_4_b","tree_4_c",
];
export const CR_FOREST_ROCK_IDS = [
  "rock_1_a","rock_1_b","rock_1_c",
  "rock_2_a","rock_2_b",
  "rock_3_a","rock_3_b",
];
export const CR_FOREST_BUSH_IDS = [
  "bush_1_a","bush_1_b","bush_2_a","bush_3_a","bush_4_a",
];

// ─── Medieval buildings (town) ────────────────────────────────────────────────
const _MB = "Medieval/KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/buildings";
export const CR_KAYKIT_BUILDINGS = {
  // Blue (default town color)
  blacksmith:      `${_MB}/blue/building_blacksmith_blue.gltf`,
  tavern:          `${_MB}/blue/building_tavern_blue.gltf`,
  market:          `${_MB}/blue/building_market_blue.gltf`,
  church:          `${_MB}/blue/building_church_blue.gltf`,
  castle:          `${_MB}/blue/building_castle_blue.gltf`,
  tower_a:         `${_MB}/blue/building_tower_A_blue.gltf`,
  tower_b:         `${_MB}/blue/building_tower_B_blue.gltf`,
  home_a:          `${_MB}/blue/building_home_A_blue.gltf`,
  home_b:          `${_MB}/blue/building_home_B_blue.gltf`,
  barracks:        `${_MB}/blue/building_barracks_blue.gltf`,
  well:            `${_MB}/blue/building_well_blue.gltf`,
  archeryrange:    `${_MB}/blue/building_archeryrange_blue.gltf`,
  windmill:        `${_MB}/blue/building_windmill_blue.gltf`,
  watermill:       `${_MB}/blue/building_watermill_blue.gltf`,
  mine:            `${_MB}/blue/building_mine_blue.gltf`,
  lumbermill:      `${_MB}/blue/building_lumbermill_blue.gltf`,
  // Neutral / stone
  wall:            `${_MB}/neutral/wall_straight.gltf`,
  wall_gate:       `${_MB}/neutral/wall_straight_gate.gltf`,
  fence_stone:     `${_MB}/neutral/fence_stone_straight.gltf`,
  fence_stone_gate:`${_MB}/neutral/fence_stone_straight_gate.gltf`,
  bridge_a:        `${_MB}/neutral/building_bridge_A.gltf`,
};

// Town NPC → preferred building slot
export const CR_TOWN_NPC_BUILDING = {
  npc_blacksmith: "blacksmith",
  npc_merchant:   "market",
  npc_healer:     "church",
  npc_stash:      "tower_a",
  npc_forge:      "blacksmith",
};

// ─── Furniture (inside buildings) ────────────────────────────────────────────
const _FUR = "Furniture/KayKit_Furniture_Bits_1.0_FREE/Assets/gltf";
export const CR_KAYKIT_FURNITURE = {
  chair_a:         `${_FUR}/chair_A.gltf`,
  chair_b:         `${_FUR}/chair_B.gltf`,
  stool:           `${_FUR}/chair_stool.gltf`,
  table_medium:    `${_FUR}/table_medium.gltf`,
  table_small:     `${_FUR}/table_small.gltf`,
  table_long:      `${_FUR}/table_medium_long.gltf`,
  bed_double:      `${_FUR}/bed_double_A.gltf`,
  bed_single:      `${_FUR}/bed_single_A.gltf`,
  armchair:        `${_FUR}/armchair.gltf`,
  couch:           `${_FUR}/couch.gltf`,
  shelf_big:       `${_FUR}/shelf_A_big.gltf`,
  shelf_small:     `${_FUR}/shelf_A_small.gltf`,
  cabinet_medium:  `${_FUR}/cabinet_medium.gltf`,
  lamp_standing:   `${_FUR}/lamp_standing.gltf`,
  rug_oval:        `${_FUR}/rug_oval_A.gltf`,
  rug_rectangle:   `${_FUR}/rug_rectangle_A.gltf`,
};

// ─── High-level lookup: returns full URL for a slot id, or null ──────────────
function _lookup(map, id) {
  const e = map[id];
  if (!e) return null;
  return { ...e, url: crKayUrl(e.glb), textureUrl: e.texture ? crKayUrl(e.texture) : null };
}

export function crKayClassBody(classId) { return _lookup(CR_KAYKIT_CLASS_BODIES, classId); }
export function crKayMonster(id) {
  // Direct hit on a KayKit monster slot
  if (CR_KAYKIT_MONSTERS[id]) return _lookup(CR_KAYKIT_MONSTERS, id);
  // Indirect: map from in-game enemy type to a KayKit slot
  const mapped = CR_KAYKIT_ENEMY_MAP[id];
  if (mapped && CR_KAYKIT_MONSTERS[mapped]) return _lookup(CR_KAYKIT_MONSTERS, mapped);
  return null;
}
export function crKaySummon(id)         { return _lookup(CR_KAYKIT_SUMMONS, id); }
export function crKayNpc(id)            { return _lookup(CR_KAYKIT_NPCS, id); }
export function crKayProp(id)           { return crKayUrl(CR_KAYKIT_PROPS[id] || null); }

// Dungeon 1.1 prop URL — returns the full URL directly (not a lookup object)
export function crKayDungeon11Prop(id) {
  const path = CR_KAYKIT_DUNGEON11[id];
  if (!path) return null;
  return `${CR_KAYKIT_BASE}/${_encPath(path)}`;
}

// Forest asset URL by slot id
export function crKayForest(id) {
  const path = CR_KAYKIT_FOREST[id];
  if (!path) return null;
  return `${CR_KAYKIT_BASE}/${_encPath(path)}`;
}

// Dungeon structural wall / stair / barrier tile URL
export function crKayDungeonWall(id) {
  const path = CR_KAYKIT_DUNGEON_WALLS[id];
  if (!path) return null;
  return `${CR_KAYKIT_BASE}/${_encPath(path)}`;
}

// Dungeon floor tile URL
export function crKayDungeonFloor(id) {
  const path = CR_KAYKIT_DUNGEON_FLOORS[id];
  if (!path) return null;
  return `${CR_KAYKIT_BASE}/${_encPath(path)}`;
}

// Interior template by room type id
export function crKayInteriorTemplate(type) {
  return CR_INTERIOR_TEMPLATES[type] || CR_INTERIOR_TEMPLATES.dungeon_room;
}

// Building URL by slot id
export function crKayBuilding(id) {
  const path = CR_KAYKIT_BUILDINGS[id];
  if (!path) return null;
  return `${CR_KAYKIT_BASE}/${_encPath(path)}`;
}

// Furniture URL by slot id
export function crKayFurniture(id) {
  const path = CR_KAYKIT_FURNITURE[id];
  if (!path) return null;
  return `${CR_KAYKIT_BASE}/${_encPath(path)}`;
}

export function crKayRig(rigName)       { return CR_KAYKIT_RIGS[rigName] || null; }

// Generic resolver — try class, then monster, then summon, then NPC, then prop
export function crKayLookup(id) {
  return crKayClassBody(id) || crKayMonster(id) || crKaySummon(id) || crKayNpc(id) || (CR_KAYKIT_PROPS[id] ? { url: crKayUrl(CR_KAYKIT_PROPS[id]) } : null);
}

// ─── Manifest-style summary (so other code can introspect what's wired up) ───
export const CR_KAYKIT_COVERAGE = {
  classes: Object.keys(CR_KAYKIT_CLASS_BODIES).length,
  monsters: Object.keys(CR_KAYKIT_MONSTERS).length,
  summons: Object.keys(CR_KAYKIT_SUMMONS).length,
  npcs: Object.keys(CR_KAYKIT_NPCS).length,
  rigs: Object.keys(CR_KAYKIT_RIGS).length,
  props: Object.keys(CR_KAYKIT_PROPS).length,
  dungeon11: Object.keys(CR_KAYKIT_DUNGEON11).length,
  dungeonWalls: Object.keys(CR_KAYKIT_DUNGEON_WALLS).length,
  dungeonFloors: Object.keys(CR_KAYKIT_DUNGEON_FLOORS).length,
  interiorTemplates: Object.keys(CR_INTERIOR_TEMPLATES).length,
  forest: Object.keys(CR_KAYKIT_FOREST).length,
  buildings: Object.keys(CR_KAYKIT_BUILDINGS).length,
  furniture: Object.keys(CR_KAYKIT_FURNITURE).length,
};
