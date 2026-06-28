// CrypticRealmGame.js — CRYPTIC REALM 8.0: DIABLO ABYSS ENGINE
// Full absorption of: DevilutionX · OpenDiablo2 · AbyssEngine · d2gs109/113
// 20 Classes (CR 7 + D2 7 + D1 3 + HF 3) · 6 Acts · 3 Difficulties
// Iso/Top/Third/FPS cameras · Full loot · Theme system (D2/D1/HF/SC/WC)
// Pure Canvas 2D — no Three.js dependency

import {
  CR_LOGO_URL, getCrFrame, isCrSpriteAtlasEnabled, probeCrSpriteAtlas,
  enableCrSpriteAtlas, crVecToDir, preloadCrAtlas, getCrSkillIcon,
} from "./crypticAssets.js";
import {
  crKayClassBody, crKayMonster, crKaySummon, crKayNpc, crKayProp, crKayLookup,
  crKayDungeon11Prop, crKayForest, crKayBuilding, crKayFurniture,
  crKayDungeonWall, crKayDungeonFloor, crKayInteriorTemplate,
  CR_FOREST_TREE_IDS, CR_FOREST_ROCK_IDS, CR_FOREST_BUSH_IDS,
  CR_TOWN_NPC_BUILDING,
} from "./crypticKayKitMap.js";
import {
  getCachedGlbSprite, getGlbSpriteFrame,
  preloadGlbSpriteFireAndForget, preloadGlbStrips, preloadGlbStripsFireAndForget,
  clearGlbSpriteCache, GLB_TIER_DIMS, glbVecToDir8, glbVecToDir4,
} from "./crypticGlbSpriter.js";
import {
  crMeshyActor, crMeshyActorUrl,
  crMeshyStructure,
} from "./crypticMeshyAssets.js";
import { CR_DATABASE } from "./crypticDatabase.js";
import { crActorAsset, crModelTarget } from "./crypticModelAssets.js";
import { findAssetSlot } from "./assetManifest.js";
import {
  CRYPTIC_ACT_LORE,
  CRYPTIC_CLASSES_LORE,
  crypticDifficulty,
  crypticDifficultyLabel,
} from "./crypticLoreData.js";
import {
  D2_ALL_CLASSES, ENGINE_BADGE,
  injectD2Classes, getClassDisplayOrder,
} from "./crypticD2ClassPatch.js";
import { THEMES, getTheme, DEFAULT_THEME } from "./crypticD2CoreData.js";
import { AbyssEngine as AbyssD2 } from "./crypticD2Systems.js";
import { D2Engine, D2MultiplayerClient } from "./crypticD2Engine.js";
import {
  HF_DUNGEON_STYLES, HF_MONSTERS, HF_QUESTS,
  getWaveEnemyPool, getWaveBoss,
} from "./crypticHellfireData.js";
import {
  loadPickit, pickitMatch, pickitLabel, pickitRuleCount,
} from "./crypticPickit.js";
import { FishingGame } from "./FishingGame.js";
import { CardGame } from "./CardGame.js";
import { DiceGame } from "./DiceGame.js";
import { TargetGame } from "./TargetGame.js";
import { DrillGame } from "./DrillGame.js";
import { ParticleSystem, ScreenEffects, ParallaxBackground, UIRenderer } from './mwVisualEngine.js';
import { DepthRenderer, VolumetricParticles, PostProcessing } from './mw3DEnhancer.js';
import { WebGLBackground } from './mwWebGLBackground.js';
import { CRTEffect, GameJuice, RetroHUD, WaveSystem } from './mwRetroEngine.js';




// Auto-loaded logo image, used for in-game watermarks / loading splashes
const CR_LOGO_IMG = (() => {
  if (typeof Image === "undefined") return null;
  const img = new Image();
  img.src = CR_LOGO_URL;
  return img;
})();

const CR_RUNTIME_ASSET_IMAGES = {};
const CR_D2_ARMORY_BASE = "/cryptic-assets/d2-armory";
const CR_D2_ARMORY_UI = {
  inventory: "inventory.png",
  equipment: "equipment.png",
  equipmentAlt: "equipment2.png",
  stash: "stash.png",
  belt: "belt.png",
  cube: "cube.png",
  cubeAlt: "cube1.png",
};
const CR_D2_ARMORY_IMAGE_CACHE = {};
const CR_D2_ARMORY_ICON_BY_SLOT = {
  weapon: "ShortSword.webp",
  head: "Cap.webp",
  chest: "LeatherArmor.webp",
  feet: "Boots.webp",
  shield: "Buckler.webp",
  belt: "Belt.webp",
  gloves: "LeatherGloves.webp",
  ring: "Ring.webp",
  ring2: "Ring.webp",
  amulet: "Amulet.webp",
  use: "HealingPotion.webp",
  gold: "Gold.webp",
  gem: "Amethyst.webp",
  rune: "elrune.webp",
};
const CR_D2_ARMORY_ICON_BY_GEM = {
  ruby: "Ruby.webp",
  sapphire: "Sapphire.webp",
  emerald: "Emerald.webp",
  topaz: "Topaz.webp",
  amethyst: "Amethyst.webp",
  skull: "Skull.webp",
};
const CR_SPRITE_BOUNDS_CACHE = new WeakMap();
const CR_RUNTIME_SLOT_ALIASES = {
  treasure_chest: ["treasurechest", "treasure_chest", "treasurechestbit", "wip_fantasy_chest"],
  home_portal: ["homeportal", "home_portal", "homeportalbit", "home_portalbit"],
  statue_of_death: ["statueofdeath", "statue_of_death", "statueofdeathbit"],
};

function _crSpriteContentBounds(img) {
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;
  if (CR_SPRITE_BOUNDS_CACHE.has(img)) return CR_SPRITE_BOUNDS_CACHE.get(img);
  let box = null;
  try {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    const data = x.getImageData(0, 0, c.width, c.height).data;
    let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
    for (let y = 0; y < c.height; y++) {
      const row = y * c.width * 4;
      for (let x0 = 0; x0 < c.width; x0++) {
        if (data[row + x0 * 4 + 3] <= 8) continue;
        if (x0 < minX) minX = x0;
        if (x0 > maxX) maxX = x0;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX >= minX && maxY >= minY) box = { x:minX, y:minY, w:maxX - minX + 1, h:maxY - minY + 1 };
  } catch {
    box = null;
  }
  CR_SPRITE_BOUNDS_CACHE.set(img, box);
  return box;
}

function _crAssetTierForQuality(quality) {
  quality = _normalizeQualityTier(quality);
  if (quality === "ultra") return "128bit";
  if (quality === "high") return "64bit";
  if (quality === "medium") return "32bit";
  return "16bit";
}

function _normalizeQualityTier(quality) {
  const q = String(quality || "medium").toLowerCase().replace(/[\s_-]/g, "");
  if (q === "128bit" || q === "128" || q === "ultra") return "ultra";
  if (q === "64bit" || q === "64" || q === "high") return "high";
  if (q === "32bit" || q === "32" || q === "medium") return "medium";
  if (q === "16bit" || q === "16" || q === "low") return "low";
  return "medium";
}

function _crRuntimeAsset(slot, tier, kind = "image") {
  const aliases = CR_RUNTIME_SLOT_ALIASES[slot] || [slot];
  for (const alias of aliases) {
    const asset = findAssetSlot(alias, tier, kind);
    if (asset) return asset;
  }
  return null;
}

function _crRuntimeAssetImage(slot, tier) {
  const asset = _crRuntimeAsset(slot, tier, "image");
  if (!asset || typeof Image === "undefined") return null;
  const key = `${slot}:${tier}:${asset.publicUrl}`;
  if (CR_RUNTIME_ASSET_IMAGES[key] !== undefined) return CR_RUNTIME_ASSET_IMAGES[key];
  const img = new Image();
  img.src = asset.publicUrl;
  CR_RUNTIME_ASSET_IMAGES[key] = img;
  return img;
}

function _crImageReady(img) {
  return !!(img && img.complete && img.naturalWidth > 0);
}

function _crD2ArmoryImage(folder, fileName) {
  if (!fileName || typeof Image === "undefined") return null;
  const key = `${folder}/${fileName}`;
  if (CR_D2_ARMORY_IMAGE_CACHE[key] !== undefined) return CR_D2_ARMORY_IMAGE_CACHE[key];
  const img = new Image();
  img.src = `${CR_D2_ARMORY_BASE}/${folder}/${encodeURIComponent(fileName)}`;
  CR_D2_ARMORY_IMAGE_CACHE[key] = img;
  return img;
}

function _crD2ArmoryItemIconName(item) {
  if (!item) return null;
  if (item.rune || item.slot === "rune") {
    const id = String(item.rune || "el").toLowerCase();
    return `${id}rune.webp`;
  }
  if (item.gem || item.slot === "gem") {
    return CR_D2_ARMORY_ICON_BY_GEM[String(item.gem || "").toLowerCase()] || "Amethyst.webp";
  }
  if (item.healMp) return "ManaPotion.webp";
  if (item.healHp) return "HealingPotion.webp";
  const name = String(item.name || "").toLowerCase();
  if (name.includes("mana")) return "ManaPotion.webp";
  if (name.includes("potion") || name.includes("healing") || name.includes("hp")) return "HealingPotion.webp";
  if (name.includes("staff")) return "ShortStaff.webp";
  if (name.includes("bow")) return "ShortBow.webp";
  if (name.includes("dagger")) return "Dagger.webp";
  if (name.includes("wand")) return "Wand.webp";
  if (name.includes("sword")) return "ShortSword.webp";
  if (name.includes("helmet") || name.includes("helm")) return "Cap.webp";
  if (name.includes("armor")) return "LeatherArmor.webp";
  if (name.includes("shield")) return "Buckler.webp";
  if (name.includes("boots")) return "Boots.webp";
  if (name.includes("belt")) return "Belt.webp";
  if (name.includes("gloves")) return "LeatherGloves.webp";
  if (name.includes("amulet")) return "Amulet.webp";
  if (name.includes("ring") || name.includes("band")) return "Ring.webp";
  return CR_D2_ARMORY_ICON_BY_SLOT[item.slot] || null;
}

const CR_UI_THEME = {
  name: "cryptic_stone",
  panel: "#171717",
  panel2: "#242424",
  stone: "#505050",
  groove: "#0b0b0b",
  trim: "#b7aa82",
  trimDark: "#3a3225",
  text: "#e5dfc9",
  muted: "#8f8771",
  red: "#8e0710",
  blue: "#123a9f",
  gold: "#d6b65c",
};

// Placeables catalog — every entry must have a working renderer
// path keyed by `kind`:
//   d11        → crKayDungeon11Prop(id) — Dungeon Remastered 1.1 (211 GLTFs on disk)
//   dungeon1   → crypticAssetUrl("3d-assets/KayKit/Dungeon1.0/Models/gltf/" + id + ".gltf.glb")
//                (185 props on disk)
//   wall       → crKayDungeonWall(id)
//   floor      → crKayDungeonFloor(id)
//   building   → crKayBuilding(id) — may need pack deploy for hex pack assets
//   forest     → crKayForest(id)
//   furniture  → crKayFurniture(id)
//   character  → crKayClassBody(id) / crKayNpc(id) — for player-skin & NPC placement
//   monster    → crKayMonster(id) — skeleton enemies as set-dressing
//   imported   → game._importedAdminPlaceables[i].url (resolved at draw time)
//
// Category buckets feed the palette tabs; UI shows ALL by default with a tab
// strip for filtering. `tag` is a search hint.
export const CR_ADMIN_PLACEABLES = [
  // ── DUNGEON 1.1 PROPS (most polished, full PBR materials) ────────────────
  { id:"barrel_large",     label:"Barrel (large)",   kind:"d11", category:"props", scale:1.75, color:"#b3864d", tag:"storage" },
  { id:"barrel_small",     label:"Barrel (small)",   kind:"d11", category:"props", scale:1.45, color:"#b3864d", tag:"storage" },
  { id:"barrel_small_stack",label:"Barrel stack",    kind:"d11", category:"props", scale:1.85, color:"#a0784a", tag:"storage" },
  { id:"crates_stacked",   label:"Crates",           kind:"d11", category:"props", scale:1.85, color:"#a0784a", tag:"storage" },
  { id:"box_large",        label:"Box (large)",      kind:"d11", category:"props", scale:1.65, color:"#9d7340", tag:"storage" },
  { id:"box_stacked",      label:"Box stack",        kind:"d11", category:"props", scale:1.75, color:"#9d7340", tag:"storage" },
  { id:"trunk_large_A",    label:"Trunk",            kind:"d11", category:"props", scale:1.75, color:"#7a4a2a", tag:"storage" },
  { id:"keg",              label:"Keg",              kind:"d11", category:"props", scale:1.65, color:"#a76d3a", tag:"tavern" },
  { id:"keg_decorated",    label:"Keg (decorated)",  kind:"d11", category:"props", scale:1.65, color:"#a76d3a", tag:"tavern" },
  { id:"chest",            label:"Chest",            kind:"d11", category:"props", scale:1.45, color:"#a67a3d", tag:"loot" },
  { id:"chest_gold",       label:"Chest (gold)",     kind:"d11", category:"props", scale:1.45, color:"#ffcc44", tag:"loot" },
  { id:"coin_stack_large", label:"Coins (large)",    kind:"d11", category:"props", scale:1.2,  color:"#ffd700", tag:"loot" },
  { id:"key",              label:"Key",              kind:"d11", category:"props", scale:1.0,  color:"#ffd700", tag:"loot" },
  { id:"table_long",       label:"Table (long)",     kind:"d11", category:"props", scale:2.0,  color:"#9b6338", tag:"furniture" },
  { id:"shelf_large",      label:"Shelf (large)",    kind:"d11", category:"props", scale:2.0,  color:"#7e572f", tag:"furniture" },
  { id:"shelves",          label:"Shelves",          kind:"d11", category:"props", scale:1.9,  color:"#7e572f", tag:"furniture" },
  { id:"pillar",           label:"Pillar",           kind:"d11", category:"props", scale:2.35, color:"#85806f", tag:"structure" },
  { id:"pillar_decorated", label:"Pillar (decorated)",kind:"d11",category:"props", scale:2.35, color:"#a59880", tag:"structure" },
  { id:"stairs",           label:"Stairs",           kind:"d11", category:"props", scale:1.75, color:"#7e7165", tag:"structure" },
  { id:"rubble_large",     label:"Rubble",           kind:"d11", category:"props", scale:1.45, color:"#69625a", tag:"decoration" },
  { id:"rubble_half",      label:"Rubble (half)",    kind:"d11", category:"props", scale:1.25, color:"#69625a", tag:"decoration" },
  { id:"banner_red",       label:"Banner (red)",     kind:"d11", category:"props", scale:1.85, color:"#c0382b", tag:"decoration", wallOnly:true },
  { id:"banner_blue",      label:"Banner (blue)",    kind:"d11", category:"props", scale:1.85, color:"#3b82e8", tag:"decoration", wallOnly:true },
  { id:"banner_green",     label:"Banner (green)",   kind:"d11", category:"props", scale:1.85, color:"#3aa84a", tag:"decoration", wallOnly:true },
  { id:"sword_shield",     label:"Sword & shield",   kind:"d11", category:"props", scale:1.45, color:"#9aa8b8", tag:"decoration", wallOnly:true },
  { id:"bottle_A_green",   label:"Bottle",           kind:"d11", category:"props", scale:0.85, color:"#3eb04a", tag:"decoration" },

  // ── LIGHTING ─────────────────────────────────────────────────────────────
  { id:"torch_lit",        label:"Torch (floor)",    kind:"d11", category:"lighting", scale:1.85, color:"#ff9a34", tag:"light" },
  { id:"torch_mounted",    label:"Torch (wall)",     kind:"d11", category:"lighting", scale:1.95, color:"#ff9a34", tag:"light", wallOnly:true },
  { id:"candle_lit",       label:"Candle",           kind:"d11", category:"lighting", scale:0.95, color:"#ffe080", tag:"light" },
  { id:"candle_triple",    label:"Candle (triple)",  kind:"d11", category:"lighting", scale:1.05, color:"#ffe080", tag:"light" },

  // ── BUILDINGS ────────────────────────────────────────────────────────────
  { id:"blacksmith",       label:"Blacksmith",       kind:"building", category:"buildings", scale:0.74, color:"#7a5132", tag:"shop" },
  { id:"market",           label:"Market",           kind:"building", category:"buildings", scale:0.72, color:"#8a6a42", tag:"shop" },
  { id:"tavern",           label:"Tavern",           kind:"building", category:"buildings", scale:0.74, color:"#8a6a42", tag:"shop" },
  { id:"church",           label:"Church",           kind:"building", category:"buildings", scale:0.74, color:"#9babba", tag:"shop" },
  { id:"castle",           label:"Castle",           kind:"building", category:"buildings", scale:0.62, color:"#8a8d92", tag:"large" },
  { id:"tower_a",          label:"Tower A",          kind:"building", category:"buildings", scale:0.78, color:"#77706a", tag:"large" },
  { id:"tower_b",          label:"Tower B",          kind:"building", category:"buildings", scale:0.78, color:"#77706a", tag:"large" },
  { id:"home_a",           label:"Home A",           kind:"building", category:"buildings", scale:0.72, color:"#9d7340", tag:"residence" },
  { id:"home_b",           label:"Home B",           kind:"building", category:"buildings", scale:0.72, color:"#9d7340", tag:"residence" },
  { id:"barracks",         label:"Barracks",         kind:"building", category:"buildings", scale:0.72, color:"#8a7a5a", tag:"residence" },
  { id:"archeryrange",     label:"Archery range",    kind:"building", category:"buildings", scale:0.78, color:"#8a7a5a", tag:"military" },
  { id:"windmill",         label:"Windmill",         kind:"building", category:"buildings", scale:0.62, color:"#a89572", tag:"industry" },
  { id:"watermill",        label:"Watermill",        kind:"building", category:"buildings", scale:0.62, color:"#a89572", tag:"industry" },
  { id:"mine",             label:"Mine",             kind:"building", category:"buildings", scale:0.7,  color:"#69625a", tag:"industry" },
  { id:"lumbermill",       label:"Lumbermill",       kind:"building", category:"buildings", scale:0.7,  color:"#a89572", tag:"industry" },
  { id:"well",             label:"Well",             kind:"building", category:"buildings", scale:0.56, color:"#6d7f8a", tag:"utility" },
  { id:"fence_stone",      label:"Stone fence",      kind:"building", category:"buildings", scale:0.7,  color:"#85806f", tag:"perimeter" },
  { id:"bridge_a",         label:"Bridge",           kind:"building", category:"buildings", scale:0.7,  color:"#9d7340", tag:"perimeter" },

  // ── FOREST ───────────────────────────────────────────────────────────────
  { id:"tree_a",           label:"Tree",             kind:"forest", category:"forest", scale:1.45, color:"#2f6b34", tag:"vegetation" },
  { id:"tree_b",           label:"Tree (alt)",       kind:"forest", category:"forest", scale:1.45, color:"#2f6b34", tag:"vegetation" },
  { id:"tree_pine",        label:"Pine tree",        kind:"forest", category:"forest", scale:1.55, color:"#1f5829", tag:"vegetation" },
  { id:"tree_bare",        label:"Bare tree",        kind:"forest", category:"forest", scale:1.45, color:"#6e5942", tag:"vegetation" },
  { id:"bush_1_a",         label:"Bush",             kind:"forest", category:"forest", scale:0.9,  color:"#3a7842", tag:"vegetation" },
  { id:"bush_2_a",         label:"Bush (small)",     kind:"forest", category:"forest", scale:0.7,  color:"#3a7842", tag:"vegetation" },
  { id:"rock_a",           label:"Rock",             kind:"forest", category:"forest", scale:0.9,  color:"#686258", tag:"terrain" },
  { id:"rock_b",           label:"Rock (large)",     kind:"forest", category:"forest", scale:1.1,  color:"#686258", tag:"terrain" },
  { id:"rock_1_a",         label:"Boulder",          kind:"forest", category:"forest", scale:1.25, color:"#686258", tag:"terrain" },

  // ── FURNITURE ────────────────────────────────────────────────────────────
  { id:"chair_a",          label:"Chair",            kind:"furniture", category:"furniture", scale:1.25, color:"#7e572f", tag:"seating" },
  { id:"chair_b",          label:"Chair (alt)",      kind:"furniture", category:"furniture", scale:1.25, color:"#7e572f", tag:"seating" },
  { id:"stool",            label:"Stool",            kind:"furniture", category:"furniture", scale:1.0,  color:"#7e572f", tag:"seating" },
  { id:"armchair",         label:"Armchair",         kind:"furniture", category:"furniture", scale:1.35, color:"#7e572f", tag:"seating" },
  { id:"table_medium",     label:"Table (medium)",   kind:"furniture", category:"furniture", scale:1.5,  color:"#7e572f", tag:"surface" },
  { id:"shelf_big",        label:"Bookshelf",        kind:"furniture", category:"furniture", scale:2.05, color:"#7e572f", tag:"surface" },
  { id:"bed_single",       label:"Bed (single)",     kind:"furniture", category:"furniture", scale:1.65, color:"#7e572f", tag:"residence" },
  { id:"bed_double",       label:"Bed (double)",     kind:"furniture", category:"furniture", scale:1.95, color:"#7e572f", tag:"residence" },
  { id:"lamp_standing",    label:"Lamp",             kind:"furniture", category:"furniture", scale:1.55, color:"#ffe080", tag:"light" },
  { id:"rug_oval",         label:"Rug",              kind:"furniture", category:"furniture", scale:1.85, color:"#a23a3a", tag:"decoration" },

  // ── NPC SET-DRESSING (renders as a static class body) ────────────────────
  { id:"npc_blacksmith",   label:"NPC: Blacksmith",  kind:"npc", category:"characters", scale:1.0, color:"#cc8833", tag:"vendor" },
  { id:"npc_merchant",     label:"NPC: Merchant",    kind:"npc", category:"characters", scale:1.0, color:"#8844ff", tag:"vendor" },
  { id:"npc_healer",       label:"NPC: Healer",      kind:"npc", category:"characters", scale:1.0, color:"#44cc44", tag:"vendor" },
  { id:"npc_stash",        label:"NPC: Stash kpr",   kind:"npc", category:"characters", scale:1.0, color:"#4488ff", tag:"vendor" },
  { id:"npc_identifier",   label:"NPC: Identifier",  kind:"npc", category:"characters", scale:1.0, color:"#d6b65c", tag:"vendor" },
  { id:"npc_waypoint",     label:"NPC: Waypoint",    kind:"npc", category:"characters", scale:1.0, color:"#d6b65c", tag:"vendor" },
  { id:"npc_ranger",       label:"NPC: Ranger",      kind:"npc", category:"characters", scale:1.0, color:"#44cc88", tag:"guard" },
  { id:"npc_rogue",        label:"NPC: Rogue",       kind:"npc", category:"characters", scale:1.0, color:"#aa44ff", tag:"guard" },
  { id:"npc_merc_captain", label:"NPC: Mercenary",   kind:"npc", category:"characters", scale:1.0, color:"#cc8833", tag:"guard" },
  { id:"town_bard",        label:"NPC: Bard",        kind:"npc", category:"characters", scale:1.0, color:"#ffd06a", tag:"vendor" },
  { id:"town_monk",        label:"NPC: Monk",        kind:"npc", category:"characters", scale:1.0, color:"#d9b56c", tag:"vendor" },

  // ── MONSTER SET-DRESSING ─────────────────────────────────────────────────
  { id:"skeleton",         label:"Skeleton",         kind:"monster", category:"monsters", scale:1.0, color:"#dadada", tag:"undead" },
  { id:"skeleton_rogue",   label:"Skeleton rogue",   kind:"monster", category:"monsters", scale:1.0, color:"#dadada", tag:"undead" },
  { id:"skeleton_minion",  label:"Skeleton minion",  kind:"monster", category:"monsters", scale:0.85, color:"#dadada", tag:"undead" },
  { id:"skeleton_mage_enemy",label:"Skeleton mage",  kind:"monster", category:"monsters", scale:1.0, color:"#aaccff", tag:"undead" },
];

// Convenience: stable list of category ids in palette display order.
export const CR_ADMIN_PLACEABLE_CATEGORIES = [
  { id:"all",        label:"All",        accent:"#9d6bff" },
  { id:"props",      label:"Props",      accent:"#d6b65c" },
  { id:"lighting",   label:"Lighting",   accent:"#ff9a34" },
  { id:"buildings",  label:"Buildings",  accent:"#85806f" },
  { id:"forest",     label:"Forest",     accent:"#2f6b34" },
  { id:"furniture",  label:"Furniture",  accent:"#7e572f" },
  { id:"characters", label:"NPCs",       accent:"#44aaff" },
  { id:"monsters",   label:"Monsters",   accent:"#cc44cc" },
  { id:"imported",   label:"Imported",   accent:"#9d6bff" },
];

function _buildQ(quality) {
  quality = _normalizeQualityTier(quality);
  return {
    pixelArt:  quality === "low",
    scanlines: quality === "low",
    glow:      quality !== "low",
    particles: quality === "high" || quality === "ultra",
    shadows:   quality === "high" || quality === "ultra",
    bloom:     quality === "ultra",
    detail:    { low:0, medium:1, high:2, ultra:3 }[quality] ?? 1,
  };
}

function _rng(seed) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0x100000000; };
}

// ─── 7 Character Classes ───────────────────────────────────────────────────────
export const CR_CLASSES = {
  ember_witch: {
    id:"ember_witch", name:"EMBER WITCH", icon:"🔥", color:"#ff4422",
    desc:"Master of fire & frost. Devastating but fragile.",
    stats:{ maxHp:60, maxMp:110, str:5, dex:8, vit:5, nrg:15, dmg:14, def:3, spd:2.2 },
    skills:[
      { id:"fireball",    name:"FIREBALL",       icon:"🔥", mp:12, type:"projectile", dmg:38, range:320, color:"#ff6600", aoe:50, desc:"Explosive fireball. AOE on impact." },
      { id:"frost_nova",  name:"FROST NOVA",      icon:"❄",  mp:20, type:"aoe",        dmg:20, range:110, color:"#88ccff", aoe:110, freeze:120, desc:"Freeze all nearby enemies." },
      { id:"chain_light", name:"CHAIN LIGHTNING", icon:"⚡", mp:28, type:"chain",       dmg:50, range:200, color:"#ffff44", chains:4, desc:"Arcs between up to 4 enemies." },
    ]
  },
  iron_warden: {
    id:"iron_warden", name:"IRON WARDEN", icon:"⚔", color:"#cc8833",
    desc:"Unstoppable warrior. Raw strength, massive health.",
    stats:{ maxHp:130, maxMp:35, str:22, dex:10, vit:22, nrg:4, dmg:28, def:12, spd:1.8 },
    skills:[
      { id:"whirlwind",   name:"WHIRLWIND",    icon:"🌀", mp:10, type:"aoe",     dmg:60, range:75,  color:"#cc8833", aoe:75,  desc:"Spin attack hits all nearby." },
      { id:"battle_cry",  name:"BATTLE CRY",   icon:"📣", mp:8,  type:"buff",    dmg:0,  range:0,   color:"#ffaa44", buffDmg:1.5, buffDef:1.4, buffDur:300, desc:"+50% dmg/def for 5 seconds." },
      { id:"leap_attack", name:"LEAP ATTACK",  icon:"💥", mp:15, type:"leap",    dmg:90, range:250, color:"#ff8800", aoe:70,  desc:"Leap to cursor, crushing impact." },
    ]
  },
  bone_herald: {
    id:"bone_herald", name:"BONE HERALD", icon:"💀", color:"#aaaacc",
    desc:"Raises the dead. Bone spears. Corpse explosions.",
    stats:{ maxHp:70, maxMp:95, str:8, dex:7, vit:8, nrg:14, dmg:16, def:5, spd:2.0 },
    skills:[
      { id:"bone_spear",  name:"BONE SPEAR",        icon:"🦴", mp:11, type:"pierce",  dmg:45, range:280, color:"#ddddcc", desc:"Piercing lance hits all in a line." },
      { id:"raise_skel",  name:"RAISE SKELETON",     icon:"💀", mp:22, type:"summon",  dmg:18, range:80,  color:"#8888aa", maxSummons:5, desc:"Raise a skeleton from a corpse." },
      { id:"corpse_expl", name:"CORPSE EXPLOSION",   icon:"💣", mp:18, type:"corpse",  dmg:110,range:120, color:"#663344", aoe:90,  desc:"Explode a corpse for massive AOE." },
    ]
  },
  shadow_blade: {
    id:"shadow_blade", name:"SHADOW BLADE", icon:"🗡", color:"#aa44cc",
    desc:"Shadow step, traps, and poison. Never seen coming.",
    stats:{ maxHp:80, maxMp:72, str:12, dex:20, vit:10, nrg:10, dmg:22, def:7, spd:2.6 },
    skills:[
      { id:"shadow_strike",name:"SHADOW STRIKE", icon:"🗡", mp:8,  type:"teleport", dmg:65, range:220, color:"#aa44ff", desc:"Blink to enemy, backstab for 3× damage." },
      { id:"smoke_bomb",   name:"SMOKE BOMB",    icon:"💨", mp:14, type:"stealth",  dmg:0,  range:50,  color:"#8844aa", aoe:80, stealthDur:180, desc:"Vanish; enemies lose target." },
      { id:"death_trap",   name:"DEATH TRAP",    icon:"⚙",  mp:20, type:"trap",     dmg:80, range:0,   color:"#ff44aa", aoe:60, desc:"Place trap that triggers on contact." },
    ]
  },
  forest_sage: {
    id:"forest_sage", name:"FOREST SAGE", icon:"🌿", color:"#44cc44",
    desc:"Nature's champion. Bear form, root enemies, call storms.",
    stats:{ maxHp:90, maxMp:80, str:15, dex:14, vit:15, nrg:12, dmg:20, def:9, spd:2.1 },
    skills:[
      { id:"vine_snare",  name:"VINE SNARE",  icon:"🌿", mp:10, type:"snare",     dmg:22, range:200, color:"#44cc44", aoe:40, snareDur:180, desc:"Root enemy in place for 3s." },
      { id:"shapeshift",  name:"BEAR FORM",   icon:"🐻", mp:25, type:"transform", dmg:0,  range:0,   color:"#884422", bearDur:360, hpBonus:80, dmgBonus:1.8, desc:"Become a bear: +80 HP, +80% dmg." },
      { id:"storm_call",  name:"STORM CALL",  icon:"⛈",  mp:35, type:"storm",     dmg:60, range:999, color:"#aaddff", aoe:180, desc:"Lightning strikes all enemies on screen." },
    ]
  },
  steel_crusader: {
    id:"steel_crusader", name:"STEEL CRUSADER", icon:"🛡", color:"#ffdd44",
    desc:"Holy warrior. Auras, divine smite, invulnerability.",
    stats:{ maxHp:115, maxMp:60, str:20, dex:12, vit:20, nrg:8, dmg:26, def:15, spd:1.9 },
    skills:[
      { id:"holy_strike",  name:"HOLY STRIKE",  icon:"✝",  mp:6,  type:"melee",  dmg:70, range:70,  color:"#ffff88", desc:"Holy smite — bonus vs undead." },
      { id:"div_shield",   name:"DIVINE SHIELD", icon:"🛡", mp:20, type:"shield", dmg:0,  range:0,   color:"#ffffaa", shieldDur:180, desc:"Invulnerable for 3 seconds." },
      { id:"vengeance",    name:"VENGEANCE",     icon:"⚡", mp:18, type:"combo",  dmg:95, range:90,  color:"#ff8844", aoe:50, desc:"Tri-element burst: fire+cold+lightning." },
    ]
  },
  void_archer: {
    id:"void_archer", name:"VOID ARCHER", icon:"🏹", color:"#44ccff",
    desc:"Swift archer. Multi-shot, rain of arrows, blink.",
    stats:{ maxHp:75, maxMp:78, str:10, dex:25, vit:10, nrg:10, dmg:24, def:6, spd:2.5 },
    skills:[
      { id:"multi_shot",  name:"MULTI-SHOT",     icon:"🏹", mp:9,  type:"spread", dmg:30, range:280, color:"#44ccff", count:5, spread:0.5, desc:"Fire 5 arrows in spread." },
      { id:"rain_arrows", name:"RAIN OF ARROWS", icon:"☔", mp:22, type:"rain",   dmg:38, range:220, color:"#88aaff", aoe:110, delay:20, count:12, desc:"Arrow rain on target area." },
      { id:"shadow_step", name:"SHADOW STEP",    icon:"👣", mp:12, type:"blink",  dmg:0,  range:200, color:"#44aaff", desc:"Blink 200 units in move direction." },
    ]
  },
};

// ─── 6 Acts ────────────────────────────────────────────────────────────────────
const ARCFORGE_MOD_CLASSES = {
  crusader: {
    id:"crusader", name:"CRUSADER", icon:"SH", color:"#ffd05a",
    desc:"Armored zealot. Shield discipline, holy pressure, and burst melee.",
    stats:{ maxHp:118, maxMp:58, str:22, dex:12, vit:21, nrg:8, dmg:27, def:16, spd:1.9 },
    skills:[
      { id:"judgment", name:"JUDGMENT", icon:"X", mp:10, type:"melee", dmg:72, range:76, color:"#ffe27a", desc:"Crushing holy strike." },
      { id:"aegis", name:"AEGIS", icon:"[]", mp:18, type:"shield", dmg:0, range:0, color:"#fff0aa", shieldDur:150, desc:"Brief invulnerable guard." },
      { id:"consecrate", name:"CONSECRATE", icon:"*", mp:24, type:"aoe", dmg:44, range:96, color:"#ffd05a", aoe:110, desc:"Sanctify the ground around you." },
    ],
  },
  demon_hunter: {
    id:"demon_hunter", name:"DEMON HUNTER", icon:"DH", color:"#e04cff",
    desc:"Mobile ranged killer. Bolts, traps, vaults, and vengeance.",
    stats:{ maxHp:78, maxMp:76, str:11, dex:26, vit:11, nrg:12, dmg:26, def:6, spd:2.55 },
    skills:[
      { id:"impale", name:"IMPALE", icon:">", mp:8, type:"projectile", dmg:40, range:310, color:"#e04cff", desc:"Fast armor-piercing bolt." },
      { id:"vault", name:"VAULT", icon:"..", mp:13, type:"blink", dmg:0, range:210, color:"#a46cff", desc:"Reposition instantly." },
      { id:"spike_trap", name:"SPIKE TRAP", icon:"^", mp:18, type:"trap", dmg:82, range:0, color:"#ff5599", aoe:58, desc:"Triggered explosive trap." },
    ],
  },
  spirit_born: {
    id:"spirit_born", name:"SPIRIT BORN", icon:"SB", color:"#30e0a0",
    desc:"Jungle ascendant. Spirit strikes and guardian forms.",
    stats:{ maxHp:96, maxMp:84, str:17, dex:18, vit:16, nrg:14, dmg:23, def:9, spd:2.25 },
    skills:[
      { id:"spirit_claw", name:"SPIRIT CLAW", icon:"/", mp:9, type:"melee", dmg:48, range:78, color:"#30e0a0", desc:"Spirit-charged slash." },
      { id:"guardian_pounce", name:"GUARDIAN POUNCE", icon:"!", mp:16, type:"leap", dmg:76, range:240, color:"#44ffaa", aoe:66, desc:"Leap with guardian force." },
      { id:"ancestor_roar", name:"ANCESTOR ROAR", icon:"))", mp:20, type:"buff", dmg:0, range:0, color:"#aaffcc", buffDmg:1.35, buffDef:1.25, buffDur:300, desc:"Call ancestral power." },
    ],
  },
  warlock: {
    id:"warlock", name:"WARLOCK", icon:"WL", color:"#b45cff",
    desc:"Pact caster. Hexes, shadow bolts, and sacrificial burst.",
    stats:{ maxHp:68, maxMp:112, str:7, dex:9, vit:7, nrg:17, dmg:17, def:4, spd:2.05 },
    skills:[
      { id:"shadow_bolt", name:"SHADOW BOLT", icon:"o", mp:11, type:"projectile", dmg:42, range:310, color:"#b45cff", desc:"Dark homing bolt." },
      { id:"hex", name:"HEX", icon:"?", mp:16, type:"curse", dmg:10, range:220, color:"#dd88ff", freeze:90, desc:"Debilitate a target." },
      { id:"pact_nova", name:"PACT NOVA", icon:"*", mp:30, type:"aoe", dmg:62, range:125, color:"#ff66cc", aoe:135, desc:"Explosive pact energy." },
    ],
  },
  witch_doctor: {
    id:"witch_doctor", name:"WITCH DOCTOR", icon:"WD", color:"#68d040",
    desc:"Poison shaman. Pets, plagues, and battlefield control.",
    stats:{ maxHp:82, maxMp:98, str:9, dex:13, vit:11, nrg:15, dmg:18, def:5, spd:2.0 },
    skills:[
      { id:"poison_dart", name:"POISON DART", icon:">", mp:8, type:"projectile", dmg:30, range:290, color:"#68d040", desc:"Poison projectile." },
      { id:"fetish", name:"FETISH", icon:"sk", mp:22, type:"summon", dmg:20, range:80, color:"#a0ff60", maxSummons:4, desc:"Summon a small fighter." },
      { id:"plague_cloud", name:"PLAGUE CLOUD", icon:"~", mp:24, type:"aoe", dmg:54, range:160, color:"#55cc44", aoe:115, desc:"Lingering poison cloud." },
    ],
  },
  wizard: {
    id:"wizard", name:"WIZARD", icon:"WZ", color:"#66ccff",
    desc:"Arcane specialist. Precision magic, shields, and beam attacks.",
    stats:{ maxHp:58, maxMp:125, str:6, dex:9, vit:6, nrg:18, dmg:15, def:3, spd:2.15 },
    skills:[
      { id:"arcane_orb", name:"ARCANE ORB", icon:"o", mp:13, type:"projectile", dmg:46, range:320, color:"#66ccff", aoe:48, desc:"Exploding arcane orb." },
      { id:"mirror_skin", name:"MIRROR SKIN", icon:"[]", mp:20, type:"shield", dmg:0, range:0, color:"#bdefff", shieldDur:150, desc:"Arcane damage shell." },
      { id:"disintegrate", name:"DISINTEGRATE", icon:"=", mp:31, type:"beam", dmg:82, range:300, color:"#99e7ff", desc:"Focused arcane beam." },
    ],
  },
};
Object.assign(CR_CLASSES, ARCFORGE_MOD_CLASSES);

const CR_TREE_NAMES = {
  ember_witch: [
    ["FIRE", ["Ember Bolt","Fireball","Blaze Trail","Inferno","Meteor Shard","Flame Shield","Hydra Spark","Combustion","Phoenix Wake","Cataclysm"]],
    ["FROST", ["Ice Dart","Frost Nova","Frozen Armor","Glacier Spike","Shatter","Cold Mastery","Blizzard Veil","Winter Orb","Permafrost","Absolute Zero"]],
    ["STORM", ["Static Arc","Charged Bolt","Chain Lightning","Teleport Flash","Storm Field","Lightning Mastery","Thunder Spear","Nova Surge","Tempest Crown","World Storm"]],
  ],
  iron_warden: [
    ["WEAPONS", ["Bash","Double Swing","Cleave","Leap Attack","Whirlwind","Rend","Executioner","Berserk","War Mastery","Titan Breaker"]],
    ["WAR CRIES", ["Howl","Taunt","Battle Cry","Shout","Battle Orders","War Drum","Iron Skin","Commanding Roar","Ancient Call","Warden's Oath"]],
    ["FORTRESS", ["Guard Stance","Shield Rush","Ground Slam","Counterblow","Stone Skin","Juggernaut","Seismic Leap","Spiked Armor","Last Stand","Iron Avatar"]],
  ],
  bone_herald: [
    ["BONE", ["Teeth","Bone Spear","Bone Wall","Bone Armor","Spirit Lance","Marrow Burst","Bone Prison","Shard Storm","Ossuary Gate","White Death"]],
    ["SUMMONING", ["Raise Skeleton","Skeleton Guard","Bone Golem","Skeletal Mage","Command Dead","Grave Pact","Revive","Wraith Host","Army of Dust","Death Legion"]],
    ["CURSES", ["Weaken","Iron Maiden","Terror","Corpse Explosion","Amplify Pain","Rot Cloud","Life Tap","Doom Sigil","Lower Resist","Final Rite"]],
  ],
  shadow_blade: [
    ["MARTIAL", ["Quick Cut","Shadow Strike","Twin Fang","Poison Edge","Dragon Step","Venom Burst","Night Flurry","Assassin's Mark","Blade Dance","Final Silence"]],
    ["SHADOW", ["Cloak","Smoke Bomb","Mirror Shade","Fade","Shadow Step","Mind Break","Dark Pact","Void Walk","Umbral Form","Nocturne"]],
    ["TRAPS", ["Spike Trap","Flash Mine","Death Trap","Sentry Bolt","Poison Web","Blade Sentry","Inferno Mine","Shock Trap","Trap Mastery","Killing Field"]],
  ],
  forest_sage: [
    ["NATURE", ["Vine Lash","Vine Snare","Thorn Skin","Briar Patch","Poison Creeper","Root Prison","Wild Growth","Spirit Grove","World Tree","Verdant Wrath"]],
    ["SHAPESHIFT", ["Wolf Claw","Bear Form","Maul","Feral Rage","Thick Hide","Savage Roar","Dire Charge","Primal Heart","Ancient Beast","Apex Form"]],
    ["STORMS", ["Gust","Storm Call","Cyclone Armor","Lightning Root","Hail Strike","Hurricane","Thunder Oak","Tempest Pack","Sky Wrath","Elder Storm"]],
  ],
  steel_crusader: [
    ["COMBAT", ["Smite","Holy Strike","Zeal","Charge","Vengeance","Blessed Hammer","Sacred Fire","Consecration","Judgment","Heaven's Fall"]],
    ["AURAS", ["Prayer","Defiance","Might","Resist Fire","Holy Freeze","Thorns","Fanaticism","Conviction","Sanctuary","Divine Mandate"]],
    ["PROTECTION", ["Divine Shield","Cleanse","Lay Hands","Aegis","Guardian Light","Redemption","Holy Ward","Unbroken Vow","Martyr's Grace","Immortal Bastion"]],
  ],
  void_archer: [
    ["BOW", ["Magic Arrow","Multi-Shot","Piercing Shot","Exploding Arrow","Rain of Arrows","Guided Shot","Strafe","Void Quiver","Starfall","Black Sky"]],
    ["VOID", ["Blink","Shadow Step","Phase Veil","Null Field","Gravity Snare","Void Mark","Wormhole","Eclipse Shot","Event Horizon","Singularity"]],
    ["SURVIVAL", ["Dodge","Fleet Foot","Trap Sense","Smoke Roll","Evasion","Focus","Decoy","Hunter's Eye","Perfect Aim","Untouchable"]],
  ],
};

function _skillId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function _expandClassSkills(cls) {
  const iconNames = {
    ember_witch: ["Fireball", "Frost_Nova", "Chain_Lightning"],
    iron_warden: ["Whirlwind", "Battle_Cry", "Leap_Attack"],
    bone_herald: ["Bone_Spear", "Raise_Skeleton", "Corpse_Explosion"],
    shadow_blade: ["Shadow_Strike", "Smoke_Bomb", "Death_Trap"],
    forest_sage: ["Vine_Snare", "Bear_Form", "Storm_Call"],
    steel_crusader: ["Holy_Strike", "Divine_Shield", "Vengeance"],
    void_archer: ["Multi_Shot", "Rain_Of_Arrows", "Shadow_Step"],
  }[cls.id] || [];
  const base = cls.skills.slice(0, 3).map((sk, i) => ({ ...sk, iconName: iconNames[i] || null }));
  const trees = CR_TREE_NAMES[cls.id] || [["TREE A",[]],["TREE B",[]],["TREE C",[]]];
  const skills = [];
  trees.forEach(([tree, names], treeIdx) => {
    const proto = base[treeIdx % base.length];
    names.forEach((name, row) => {
      const power = 1 + row * 0.16 + treeIdx * 0.04;
      skills.push({
        ...proto,
        id: _skillId(name),
        name: name.toUpperCase(),
        tree,
        row,
        reqLevel: Math.max(1, 1 + row * 3),
        mp: Math.max(2, Math.round((proto.mp || 8) * (0.85 + row * 0.1))),
        dmg: Math.round((proto.dmg || 0) * power),
        desc: proto.desc,
        iconName: row === 1 ? proto.iconName : null,
        sourceSkill: proto.id,
      });
    });
  });
  cls.skillTrees = trees.map(([name]) => name);
  cls.quickSkillIndexes = [1, 11, 21];
  cls.skills = skills;
}

Object.values(CR_CLASSES).forEach(_expandClassSkills);
Object.entries(CRYPTIC_CLASSES_LORE).forEach(([id, lore]) => {
  if (!CR_CLASSES[id]) return;
  Object.assign(CR_CLASSES[id], {
    loreName: lore.loreName || CR_CLASSES[id].name,
    archetype: lore.archetype,
    desc: lore.short || CR_CLASSES[id].desc,
    backstory: lore.backstory,
    role: lore.role,
  });
});
// ─── v8.0: Inject all D2 / D1 / Hellfire classes into the registry ──────────
injectD2Classes(CR_CLASSES);

const ARCFORGE_PRODUCTION_CLASS_ORDER = [
  "amazon", "assassin", "barbarian", "bone_herald", "crusader", "demon_hunter",
  "druid", "ember_witch", "forest_sage", "iron_warden", "monk", "necromancer",
  "paladin", "rogue", "shadow_blade", "sorcerer", "spirit_born", "steel_crusader",
  "void_archer", "warlock", "warrior", "witch_doctor", "wizard",
];

const KAYKIT_CLASS_ORDER = [
  "kaykit_mage", "kaykit_necromancer", "kaykit_barbarian", "kaykit_knight",
  "kaykit_ranger", "kaykit_rogue", "kaykit_rogue_hooded",
];

const KAYKIT_CLASS_SOURCES = {
  kaykit_mage: ["ember_witch", "KAYKIT MAGE", "KM", "#66ccff", "KayKit robed caster. Separate 3D class, no longer a production-class placeholder."],
  kaykit_necromancer: ["bone_herald", "KAYKIT NECROMANCER", "KN", "#aaaacc", "KayKit dark caster. Separate legacy 3D class."],
  kaykit_barbarian: ["iron_warden", "KAYKIT BARBARIAN", "KB", "#cc8833", "KayKit heavy barbarian. Separate 3D class."],
  kaykit_knight: ["steel_crusader", "KAYKIT KNIGHT", "KK", "#ffdd44", "KayKit armored knight. Separate 3D class."],
  kaykit_ranger: ["void_archer", "KAYKIT RANGER", "KR", "#44ccff", "KayKit ranger. Separate 3D class."],
  kaykit_rogue: ["forest_sage", "KAYKIT ROGUE", "KG", "#44cc44", "KayKit rogue. Separate 3D class."],
  kaykit_rogue_hooded: ["shadow_blade", "KAYKIT HOODED ROGUE", "KH", "#aa44cc", "KayKit hooded rogue. Separate 3D class."],
};

Object.entries(KAYKIT_CLASS_SOURCES).forEach(([id, [sourceId, name, icon, color, desc]]) => {
  const source = CR_CLASSES[sourceId];
  if (!source || CR_CLASSES[id]) return;
  CR_CLASSES[id] = {
    ...source,
    id,
    name,
    icon,
    color,
    desc,
    sourceClass: sourceId,
    engine: "kaykit",
  };
});

// Mark original CR classes with engine badge
Object.values(CR_CLASSES).forEach(c => { if (!c.engine) c.engine = 'cr'; });
// Full display order (CR → D2 → D1 → HF)
export const CR_CLASS_ORDER = [
  ...ARCFORGE_PRODUCTION_CLASS_ORDER.filter(id => CR_CLASSES[id]),
  ...KAYKIT_CLASS_ORDER.filter(id => CR_CLASSES[id]),
  ...getClassDisplayOrder(CR_CLASSES).filter(id => !ARCFORGE_PRODUCTION_CLASS_ORDER.includes(id) && !KAYKIT_CLASS_ORDER.includes(id)),
];

export const CR_ACTS = [
  { id:1, name:"THE DYING LANDS",   icon:"🌑", color:"#8844aa", town:"HARROW'S REST",
    desc:"Undead infest a dying realm. Find the source.", available:true,
    bg:"#0a0612", wallC:"#2a1a3a", floorC:"#1a0a2a",
    enemies:["zombie","skeleton","werewolf"],
    boss:{ name:"VAMPIRE LORD MORTHIS", icon:"🧛", hp:900, dmg:55, color:"#cc4488", xp:500, gold:300 }
  },
  { id:2, name:"ASHES OF KETH",     icon:"🏜", color:"#cc8833", town:"MERIDIAN SANDS",
    desc:"Ancient desert tombs hide terrible power.", available:true,
    bg:"#120a02", wallC:"#3a2810", floorC:"#1e1408",
    enemies:["sand_golem","mummy","scorpion"],
    boss:{ name:"PHARAOH KETH-AMON", icon:"🏺", hp:1200, dmg:70, color:"#ffcc44", xp:750, gold:500 }
  },
  { id:3, name:"THORNSPIRE DEPTHS", icon:"🌴", color:"#44aa44", town:"VERDANT KEEP",
    desc:"Jungle temples overrun by demonic cults.", available:true,
    bg:"#061208", wallC:"#0f2a0f", floorC:"#0a1e0a",
    enemies:["jungle_demon","shaman","plant_horror"],
    boss:{ name:"TEMPLE GUARDIAN ZARETH", icon:"🗿", hp:1600, dmg:85, color:"#44ff44", xp:1000, gold:700 }
  },
  { id:4, name:"INFERNAL GATE",     icon:"🔥", color:"#ff4422", town:"PANDEMONIUM FORTRESS",
    desc:"Hell itself. The prime evils await.", available:true,
    bg:"#140402", wallC:"#3a1008", floorC:"#1e0804",
    enemies:["fire_imp","blood_knight","chaos_mage"],
    boss:{ name:"VOIDGATE KEEPER BAAL-ETH", icon:"👿", hp:2200, dmg:105, color:"#ff2200", xp:1500, gold:1000,
      phase3:true, phase3hp:0.25,
      phases:["Summons fire imps every 10s","ENRAGE: 3× speed, spread fire","NOVA STORM: ring of 12 bolts"] }
  },
  { id:5, name:"FROZEN WASTES",     icon:"❄", color:"#88ccff", town:"GLACIUS HOLD",
    desc:"Arctic hellscape where the dead walk frozen.", available:true,
    bg:"#040a14", wallC:"#1a2a3a", floorC:"#0a1a2a",
    enemies:["ice_wraith","frost_giant","snow_witch"],
    boss:{ name:"GLACIUS THE ETERNAL", icon:"🧊", hp:2800, dmg:125, color:"#88ccff", xp:2000, gold:1500,
      phase3:true, phase3hp:0.25,
      phases:["Freeze nova every 8s","Summons frost giants × 2","BLIZZARD: 20 ice shards ring"] }
  },
  { id:6, name:"THE ETERNAL RIFT",  icon:"🌌", color:"#cc44ff", town:"THE NEXUS VOID",
    desc:"Between worlds — the final battleground.", available:true,
    bg:"#080012", wallC:"#201040", floorC:"#120820",
    enemies:["rift_spawn","dim_horror","star_eater"],
    boss:{ name:"THE ETERNAL", icon:"🌌", hp:5500, dmg:155, color:"#cc44ff", xp:5000, gold:3000,
      phase3:true, phase3hp:0.2,
      phases:["Reality warp: teleports player","Phase 2 clones ×3","VOID COLLAPSE: screen-wide nova"] }
  },
];

const CR_ACT_EXPANSION = [
  {
    region:"western wilds",
    lore:"Rogue-camp inspired frontier: blood fields, a ruined monastery, and catacombs below the old order.",
    waypoints:["Harrow's Rest","Bloodfen Road","Cold Cairn","Monastery Gate","Catacombs"],
    vendors:{
      healer:"SISTER HEALER", merc:"ROGUE CAPTAIN", stash:"CAMP KEEPER",
      merchant:"TRAVELING MERCHANT", forge:"CAMP BLACKSMITH", skin:"WARDROBE", waypoint:"WAYPOINT SHRINE",
    },
  },
  {
    region:"desert coast",
    lore:"Caravan city and buried tomb route: sewers, dry hills, lost halls, and a sealed arcane chamber.",
    waypoints:["Meridian Sands","Sewer Mouth","Dry Hills","Lost Tombs","Arcane Vault"],
    vendors:{
      healer:"DESERT MENDER", merc:"IRON WOLF CAPTAIN", stash:"DOCK KEEPER",
      merchant:"BAZAAR MERCHANT", forge:"SUNFORGE SMITH", skin:"WARDROBE", waypoint:"WAYPOINT SHRINE",
    },
  },
  {
    region:"jungle temples",
    lore:"Kurast-inspired canopy campaign: riverside docks, jungle trails, temple districts, and corrupted rites.",
    waypoints:["Verdant Keep","Spider Marsh","Flayer Hollow","Temple Causeway","Durance Root"],
    vendors:{
      healer:"JUNGLE ORACLE", merc:"DOCKSIDE CAPTAIN", stash:"RELIC KEEPER",
      merchant:"RIVER TRADER", forge:"JADE SMITH", skin:"WARDROBE", waypoint:"WAYPOINT SHRINE",
    },
  },
  {
    region:"outer hell",
    lore:"Fortress on the edge of the inferno: burning plains, despair bridges, and a gate into chaos.",
    waypoints:["Pandemonium Fortress","Outer Steppes","Plain of Ash","River of Flame","Chaos Gate"],
    vendors:{
      healer:"FORTRESS HEALER", merc:"ANGELIC CAPTAIN", stash:"BASTION KEEPER",
      merchant:"HELLFORGE QUARTERMASTER", forge:"HELLFORGE SMITH", skin:"WARDROBE", waypoint:"WAYPOINT SHRINE",
    },
  },
  {
    region:"northern siege",
    lore:"Harrogath-inspired mountain war: siege camps, frozen passes, crystal prisons, and a summit keep.",
    waypoints:["Glacius Hold","Frigid Approach","Crystal Passage","Ancient Trail","Worldstone Echo"],
    vendors:{
      healer:"HIGHLAND HEALER", merc:"SIEGE CAPTAIN", stash:"CLAN KEEPER",
      merchant:"MOUNTAIN TRADER", forge:"RUNEFORGE SMITH", skin:"WARDROBE", waypoint:"WAYPOINT SHRINE",
    },
  },
  {
    region:"nexus between worlds",
    lore:"Original Act 6 endgame: broken constellations, rift towns, void bridges, and the final realm wound.",
    waypoints:["The Nexus Void","Rift Anchorage","Starless Bridge","Astral Crucible","Eternal Threshold"],
    vendors:{
      healer:"VOID HEALER", merc:"RIFT CAPTAIN", stash:"NEXUS KEEPER",
      merchant:"ASTRAL MERCHANT", forge:"VOIDFORGE SMITH", skin:"WARDROBE", waypoint:"WAYPOINT SHRINE",
    },
  },
];

CR_ACTS.forEach((act, i) => {
  const expansion = CR_ACT_EXPANSION[i] || {};
  const lore = CRYPTIC_ACT_LORE[i] || {};
  Object.assign(act, expansion, {
    name: lore.name || act.name,
    icon: lore.icon || act.icon,
    color: lore.color || act.color,
    town: lore.town || act.town,
    desc: lore.desc || act.desc,
    region: lore.region || expansion.region || act.region,
    lore: lore.lore || expansion.lore || act.lore,
    waypoints: lore.waypoints || expansion.waypoints || act.waypoints,
    chapter: lore.chapter || act.chapter,
    questNames: lore.quests || act.questNames,
    vendors: { ...(expansion.vendors || {}), ...(lore.vendors || {}) },
  });
  if (lore.enemies) act.enemies = lore.enemies;
  if (lore.bossPatch) act.boss = { ...act.boss, ...lore.bossPatch };
  if (lore.boss) act.bossName = lore.boss;
});

// ─── Enemy Templates ───────────────────────────────────────────────────────────
const CR_ENEMIES = {
  zombie:      { name:"Zombie",        color:"#668844", hp:65,  dmg:12, spd:0.55, xp:15,  size:20, ai:"wander", loot:0.3 },
  skeleton:    { name:"Skeleton",      color:"#ccccaa", hp:48,  dmg:18, spd:0.88, xp:18,  size:18, ai:"charge", loot:0.3 },
  werewolf:    { name:"Werewolf",      color:"#885533", hp:105, dmg:28, spd:1.55, xp:36,  size:24, ai:"charge", loot:0.4 },
  sand_golem:  { name:"Sand Golem",    color:"#ccaa44", hp:145, dmg:22, spd:0.48, xp:42,  size:28, ai:"wander", loot:0.4 },
  mummy:       { name:"Mummy",         color:"#aaaa77", hp:82,  dmg:16, spd:0.65, xp:26,  size:22, ai:"wander", loot:0.35},
  scorpion:    { name:"Scorpion",      color:"#886622", hp:92,  dmg:32, spd:1.38, xp:48,  size:20, ai:"charge", loot:0.4 },
  jungle_demon:{ name:"Jungle Demon",  color:"#44cc44", hp:125, dmg:38, spd:1.18, xp:58,  size:26, ai:"charge", loot:0.45},
  shaman:      { name:"Shaman",        color:"#cc4444", hp:72,  dmg:48, spd:0.78, xp:62,  size:22, ai:"ranged", loot:0.4 },
  plant_horror:{ name:"Plant Horror",  color:"#228822", hp:210, dmg:25, spd:0.38, xp:52,  size:32, ai:"wander", loot:0.5 },
  fire_imp:    { name:"Fire Imp",      color:"#ff4422", hp:82,  dmg:42, spd:1.75, xp:68,  size:18, ai:"charge", loot:0.45},
  blood_knight:{ name:"Blood Knight",  color:"#cc2222", hp:310, dmg:52, spd:0.88, xp:105, size:30, ai:"charge", loot:0.55},
  chaos_mage:  { name:"Chaos Mage",    color:"#8822cc", hp:102, dmg:68, spd:0.68, xp:95,  size:22, ai:"ranged", loot:0.5 },
  ice_wraith:  { name:"Ice Wraith",    color:"#88ccff", hp:92,  dmg:38, spd:1.28, xp:82,  size:20, ai:"charge", loot:0.5 },
  frost_giant: { name:"Frost Giant",   color:"#4488cc", hp:420, dmg:62, spd:0.38, xp:125, size:36, ai:"wander", loot:0.6 },
  snow_witch:  { name:"Snow Witch",    color:"#aaeeff", hp:82,  dmg:72, spd:0.98, xp:115, size:22, ai:"ranged", loot:0.55},
  rift_spawn:  { name:"Rift Spawn",    color:"#cc44ff", hp:102, dmg:52, spd:1.48, xp:105, size:22, ai:"charge", loot:0.55},
  dim_horror:  { name:"Dim. Horror",   color:"#8844cc", hp:255, dmg:78, spd:0.78, xp:155, size:30, ai:"charge", loot:0.6 },
  star_eater:  { name:"Star Eater",    color:"#ffaaff", hp:205, dmg:95, spd:1.08, xp:185, size:28, ai:"ranged", loot:0.65},
};

// ─── Character Sprite Definitions ─────────────────────────────────────────────
const CR_SPRITE_DEFS = {
  ember_witch:   { hat:"#440011",  robe:"#990022",  skin:"#ffd0aa", hair:"#220000", staffC:"#cc44ff", type:"mage"    },
  iron_warden:   { helm:"#556677", plate:"#8899aa", skin:"#cc8866", hair:"#443322", swordC:"#ccddee", type:"warrior"  },
  bone_herald:   { hood:"#111122", robe:"#1a1a33",  skin:"#ccccdd", hair:"#000011", staffC:"#ccccaa", type:"necro"   },
  shadow_blade:  { hood:"#110022", cloak:"#220044", skin:"#cc8855", hair:"#111122", bladC:"#bbccdd",  type:"rogue"   },
  forest_sage:   { antler:"#664411",robe:"#1a3311", skin:"#aaccaa", hair:"#226611", staffC:"#448822", type:"druid"   },
  steel_crusader:{ helm:"#ccaa44", plate:"#ddbb55", skin:"#ddcc99", hair:"#886633", maceC:"#ccaa44",  type:"paladin" },
  void_archer:   { hood:"#112233", cloak:"#223355", skin:"#cc9966", hair:"#001122", bowC:"#885533",   type:"archer"  },
};
Object.assign(CR_SPRITE_DEFS, {
  amazon:       { hood:"#17361e", cloak:"#246b30", skin:"#c99668", hair:"#2a160c", bowC:"#b8944d", type:"archer" },
  assassin:     { hood:"#102832", cloak:"#174a55", skin:"#c48b62", hair:"#05090e", bladC:"#b7f5ff", type:"rogue" },
  barbarian:    { helm:"#6a3622", plate:"#a95334", skin:"#d39a6d", hair:"#3a160c", swordC:"#d6d0bd", type:"warrior" },
  crusader:     { helm:"#caa346", plate:"#dbc16a", skin:"#d0aa80", hair:"#5c371f", maceC:"#e0bf55", type:"paladin" },
  demon_hunter: { hood:"#20142e", cloak:"#4a205f", skin:"#c88b63", hair:"#150c20", bowC:"#e04cff", type:"archer" },
  druid:        { antler:"#6a4a22", robe:"#2d5c25", skin:"#bd9068", hair:"#2c5a20", staffC:"#72d36c", type:"druid" },
  monk:         { robe:"#8a6822", skin:"#c9925f", hair:"#1e150c", staffC:"#d7b04a", type:"warrior" },
  necromancer:  { hood:"#151722", robe:"#293042", skin:"#c9c3ad", hair:"#06070a", staffC:"#cfd8c0", type:"necro" },
  paladin:      { helm:"#d0b15a", plate:"#d7c27a", skin:"#c99d73", hair:"#7a4b26", maceC:"#f1d568", type:"paladin" },
  rogue:        { hood:"#273014", cloak:"#516221", skin:"#c78a5c", hair:"#2a1b0e", bowC:"#b28a4b", type:"archer" },
  sorcerer:     { hat:"#1c2e6a", robe:"#2448a0", skin:"#d3a17c", hair:"#301414", staffC:"#7bc7ff", type:"mage" },
  spirit_born:  { hood:"#12382e", cloak:"#1f7258", skin:"#bd8b62", hair:"#0a2219", bladC:"#30e0a0", type:"rogue" },
  warlock:      { hood:"#221332", robe:"#3d1b63", skin:"#c08a6d", hair:"#09050f", staffC:"#b45cff", type:"mage" },
  warrior:      { helm:"#6f553a", plate:"#8c7551", skin:"#cc9468", hair:"#3d2616", swordC:"#ded6c8", type:"warrior" },
  witch_doctor: { hood:"#23330f", robe:"#395d1d", skin:"#a87952", hair:"#161d0a", staffC:"#68d040", type:"necro" },
  wizard:       { hat:"#183858", robe:"#246f9c", skin:"#d2a07b", hair:"#141b24", staffC:"#66ccff", type:"mage" },
  d2_amazon:    { hood:"#17361e", cloak:"#246b30", skin:"#c99668", hair:"#2a160c", bowC:"#b8944d", type:"archer" },
  d2_assassin:  { hood:"#102832", cloak:"#174a55", skin:"#c48b62", hair:"#05090e", bladC:"#b7f5ff", type:"rogue" },
  d2_barbarian: { helm:"#6a3622", plate:"#a95334", skin:"#d39a6d", hair:"#3a160c", swordC:"#d6d0bd", type:"warrior" },
  d2_druid:     { antler:"#6a4a22", robe:"#2d5c25", skin:"#bd9068", hair:"#2c5a20", staffC:"#72d36c", type:"druid" },
  d2_necromancer:{ hood:"#151722", robe:"#293042", skin:"#c9c3ad", hair:"#06070a", staffC:"#cfd8c0", type:"necro" },
  d2_paladin:   { helm:"#d0b15a", plate:"#d7c27a", skin:"#c99d73", hair:"#7a4b26", maceC:"#f1d568", type:"paladin" },
  d2_sorceress: { hat:"#1c2e6a", robe:"#2448a0", skin:"#d3a17c", hair:"#301414", staffC:"#7bc7ff", type:"mage" },
  d1_rogue:     { hood:"#273014", cloak:"#516221", skin:"#c78a5c", hair:"#2a1b0e", bowC:"#b28a4b", type:"archer" },
  d1_sorcerer:  { hat:"#1c2e6a", robe:"#2448a0", skin:"#d3a17c", hair:"#301414", staffC:"#7bc7ff", type:"mage" },
  d1_warrior:   { helm:"#6f553a", plate:"#8c7551", skin:"#cc9468", hair:"#3d2616", swordC:"#ded6c8", type:"warrior" },
  hf_barbarian: { helm:"#6a3622", plate:"#a95334", skin:"#d39a6d", hair:"#3a160c", swordC:"#d6d0bd", type:"warrior" },
  hf_bard:      { hood:"#273014", cloak:"#516221", skin:"#c78a5c", hair:"#2a1b0e", bowC:"#b28a4b", type:"archer" },
  hf_monk:      { robe:"#8a6822", skin:"#c9925f", hair:"#1e150c", staffC:"#d7b04a", type:"warrior" },
});

const CR_ENEMY_DEFS = {
  zombie:      { b:"#446633", s:"#558844", l:"#334422", t:"zombie"   },
  skeleton:    { b:"#ccccaa", s:"#eeeedd", l:"#aaaaaa", t:"skeleton" },
  werewolf:    { b:"#663322", s:"#884433", l:"#552211", t:"beast"    },
  sand_golem:  { b:"#ccaa44", s:"#ddbb55", l:"#aa8833", t:"golem"    },
  mummy:       { b:"#aaaa77", s:"#bbbbaa", l:"#888866", t:"zombie"   },
  scorpion:    { b:"#886622", s:"#997733", l:"#664411", t:"beast"    },
  jungle_demon:{ b:"#228822", s:"#33aa33", l:"#115511", t:"demon"    },
  shaman:      { b:"#cc4444", s:"#dd6666", l:"#aa2222", t:"caster"   },
  plant_horror:{ b:"#226622", s:"#338833", l:"#114411", t:"plant"    },
  fire_imp:    { b:"#ff4422", s:"#ff8844", l:"#cc2200", t:"imp"      },
  blood_knight:{ b:"#880000", s:"#aa2222", l:"#660000", t:"knight"   },
  chaos_mage:  { b:"#8822cc", s:"#aa44ee", l:"#661199", t:"caster"   },
  ice_wraith:  { b:"#88ccff", s:"#aaddff", l:"#6699cc", t:"ghost"    },
  frost_giant: { b:"#4488cc", s:"#66aaee", l:"#336699", t:"giant"    },
  snow_witch:  { b:"#aaeeff", s:"#ccffff", l:"#88ccdd", t:"caster"   },
  rift_spawn:  { b:"#cc44ff", s:"#dd66ff", l:"#aa22dd", t:"demon"    },
  dim_horror:  { b:"#8844cc", s:"#aa66ee", l:"#662299", t:"ghost"    },
  star_eater:  { b:"#ffaaff", s:"#ffccff", l:"#dd88dd", t:"beast"    },
};

// ─── Skin System (localStorage + Image cache) ──────────────────────────────────
const CR_SKIN_CACHE = {};
function _loadSkins() {
  Object.keys(CR_SPRITE_DEFS).concat(["mercenary"]).forEach(id => {
    const d = localStorage.getItem(`cr_skin_${id}`);
    if (d) { const img = new Image(); img.src = d; CR_SKIN_CACHE[id] = img; }
  });
}
function _saveSkin(id, dataURL) {
  localStorage.setItem(`cr_skin_${id}`, dataURL);
  const img = new Image(); img.src = dataURL; CR_SKIN_CACHE[id] = img;
}
function _clearSkin(id) { localStorage.removeItem(`cr_skin_${id}`); delete CR_SKIN_CACHE[id]; }
try { _loadSkins(); } catch(e) {}

// ─── Mercenary templates ───────────────────────────────────────────────────────
const MERC_TYPES = [
  { type:"archer",  name:"Kira",   icon:"🏹", color:"#44aaff", hp:80,  dmg:22, spd:1.6, range:200, cost:120, hireCost:120, rezCost:60,  ai:"ranged", desc:"Swift archer. Stays at range, fires rapidly." },
  { type:"warrior", name:"Garrod", icon:"⚔",  color:"#cc8833", hp:150, dmg:35, spd:1.2, range:40,  cost:160, hireCost:160, rezCost:80,  ai:"charge", desc:"Heavy melee fighter. Tanks damage for you." },
  { type:"mage",    name:"Lyss",   icon:"🔮", color:"#cc44ff", hp:60,  dmg:48, spd:1.4, range:180, cost:200, hireCost:200, rezCost:100, ai:"ranged", desc:"Arcane mage. High damage, fragile." },
];

// ─── Loot System ───────────────────────────────────────────────────────────────
const RARITY = [
  { id:"normal",  label:"Common",  color:"#aaaaaa", weight:60 },
  { id:"magic",   label:"Magic",   color:"#4466ff", weight:28 },
  { id:"rare",    label:"Rare",    color:"#ffff00", weight:9  },
  { id:"unique",  label:"Unique",  color:"#c8a050", weight:2.5},
  { id:"set",     label:"Set Item",color:"#00cc44", weight:0.5},
];
const ITEM_BASES = [
  { id:"sword",     name:"Sword",       slot:"weapon",icon:"⚔",  dmgAdd:12, defAdd:0  },
  { id:"staff",     name:"Staff",       slot:"weapon",icon:"🔮", dmgAdd:10, defAdd:0  },
  { id:"bow",       name:"Bow",         slot:"weapon",icon:"🏹", dmgAdd:14, defAdd:0  },
  { id:"dagger",    name:"Dagger",      slot:"weapon",icon:"🗡", dmgAdd:8,  defAdd:0  },
  { id:"wand",      name:"Wand",        slot:"weapon",icon:"🪄", dmgAdd:6,  defAdd:0, mpAdd:20 },
  { id:"helmet",    name:"Helmet",      slot:"head",  icon:"🪖", dmgAdd:0,  defAdd:6  },
  { id:"armor",     name:"Armor",       slot:"chest", icon:"🧥", dmgAdd:0,  defAdd:18 },
  { id:"boots",     name:"Boots",       slot:"feet",  icon:"👢", dmgAdd:0,  defAdd:5, spdAdd:0.3 },
  { id:"shield",    name:"Shield",      slot:"shield",icon:"🛡", dmgAdd:0,  defAdd:14 },
  { id:"belt",      name:"Belt",        slot:"belt",  icon:"🔶", dmgAdd:0,  defAdd:4,  hpAdd:15 },
  { id:"gloves",    name:"Gloves",      slot:"gloves",icon:"🥊", dmgAdd:3,  defAdd:3               },
  { id:"ring",      name:"Ring",        slot:"ring",  icon:"💍", dmgAdd:4,  defAdd:3  },
  { id:"ring2",     name:"Band",        slot:"ring2", icon:"💍", dmgAdd:3,  defAdd:3  },
  { id:"amulet",    name:"Amulet",      slot:"amulet",icon:"📿", dmgAdd:2,  defAdd:2, mpAdd:25 },
  { id:"hp_potion", name:"HP Potion",   slot:"use",   icon:"🧪", healHp:60             },
  { id:"mp_potion", name:"MP Potion",   slot:"use",   icon:"💧", healMp:50             },
  { id:"gold",      name:"Gold",        slot:"gold",  icon:"💰", goldVal:0             },
];

const MAGIC_AFFIXES = [
  { name:"of Power",    dmgAdd:8  }, { name:"of Warding",  defAdd:10 },
  { name:"of Life",     hpAdd:25  }, { name:"of Mana",     mpAdd:30  },
  { name:"of Speed",    spdAdd:0.4}, { name:"of Fortune",  goldFind:0.2 },
  { name:"Sharp",       dmgAdd:12 }, { name:"Sturdy",      defAdd:15 },
  { name:"Energized",   mpAdd:40  }, { name:"Vital",       hpAdd:40  },
];

// ─── Gem / Rune System ─────────────────────────────────────────────────────────
const GEMS = [
  { id:"ruby",      name:"Ruby",      icon:"💎", color:"#ff3322", wep:{dmgAdd:8},  arm:{hpAdd:20},  quality:["Chipped","Flawed","Normal","Flawless","Perfect"] },
  { id:"sapphire",  name:"Sapphire",  icon:"🔷", color:"#2244ff", wep:{mpAdd:15},  arm:{coldRes:10}, quality:["Chipped","Flawed","Normal","Flawless","Perfect"] },
  { id:"emerald",   name:"Emerald",   icon:"💚", color:"#22cc44", wep:{dmgAdd:5,spdAdd:0.2}, arm:{defAdd:8}, quality:["Chipped","Flawed","Normal","Flawless","Perfect"] },
  { id:"topaz",     name:"Topaz",     icon:"🟡", color:"#ffcc00", wep:{goldFind:0.2}, arm:{mpAdd:18}, quality:["Chipped","Flawed","Normal","Flawless","Perfect"] },
  { id:"amethyst",  name:"Amethyst",  icon:"🟣", color:"#aa44ff", wep:{dmgAdd:6},  arm:{defAdd:12}, quality:["Chipped","Flawed","Normal","Flawless","Perfect"] },
  { id:"skull",     name:"Skull",     icon:"💀", color:"#aaaacc", wep:{lifeSteal:0.05}, arm:{hpAdd:30}, quality:["Chipped","Flawed","Normal","Flawless","Perfect"] },
];

const RUNES = [
  { id:"el",  name:"El",  icon:"Ⅰ",  color:"#aaaaff", wep:{dmgAdd:2},       arm:{defAdd:3}    },
  { id:"eld", name:"Eld", icon:"Ⅱ",  color:"#aaaaff", wep:{spdAdd:0.1},     arm:{defAdd:4}    },
  { id:"tir", name:"Tir", icon:"Ⅲ",  color:"#88aaff", wep:{mpAdd:2},        arm:{mpAdd:5}     },
  { id:"nef", name:"Nef", icon:"Ⅳ",  color:"#88aaff", wep:{dmgAdd:3},       arm:{defAdd:5}    },
  { id:"eth", name:"Eth", icon:"Ⅴ",  color:"#66aaff", wep:{dmgAdd:4},       arm:{hpAdd:10}    },
  { id:"ith", name:"Ith", icon:"Ⅵ",  color:"#66aaff", wep:{dmgAdd:9},       arm:{mpAdd:10}    },
  { id:"tal", name:"Tal", icon:"Ⅶ",  color:"#44ffaa", wep:{poisonDmg:15},   arm:{poisonRes:15}},
  { id:"ral", name:"Ral", icon:"Ⅷ",  color:"#ff8844", wep:{fireDmg:12},     arm:{fireRes:15}  },
  { id:"ort", name:"Ort", icon:"Ⅸ",  color:"#44aaff", wep:{lightDmg:15},    arm:{lightRes:15} },
  { id:"thul",name:"Thul",icon:"Ⅹ",  color:"#88ccff", wep:{coldDmg:10},     arm:{coldRes:15}  },
  { id:"zod", name:"Zod", icon:"Ω",   color:"#ffdd00", wep:{dmgAdd:20,indestructible:true}, arm:{defAdd:25,indestructible:true} },
];

// Runeword recipes: ordered rune combos → named gear bonus
const RUNEWORDS = [
  { name:"STEELFIRE",  runes:["ral","el"], bonus:{ dmgAdd:18, fireDmg:20 }, icon:"🔥", color:"#ff6622" },
  { name:"ICEBRAND",   runes:["ort","eld"],bonus:{ coldDmg:22, spdAdd:0.2 }, icon:"❄",  color:"#88ccff" },
  { name:"LIFEGUARD",  runes:["eth","tir"],bonus:{ hpAdd:60, defAdd:15 },    icon:"❤",  color:"#ff4444" },
  { name:"VOIDSTRIKE", runes:["zod","ral","ort"],bonus:{dmgAdd:35, fireDmg:25, lightDmg:25}, icon:"🌌", color:"#cc44ff" },
];

const CR_DEFAULT_KEY_BINDINGS = {
  moveForward: "w",
  moveBack: "s",
  moveLeft: "a",
  moveRight: "d",
  skill1: "z",
  skill2: "x",
  skill3: "c",
  inventory: "i",
  character: "v",
  interact: "e",
  quests: "q",
  skills: "t",
  potionHp: "h",
  potionMp: "m",
  camera: "f6",
  map: "tab",
  mapCenter: "home",
  mapFade: "f10",
  mapParty: "f11",
  mapNames: "f12",
  characterPanel: "v",
  partyPanel: "p",
  mercPanel: "o",
  messageLog: "shift+m",
  help: "h",
  skillBar: "y",
  minimapToggle: "v",
  portraits: "z",
  belt: "`",
  autoRun: "r",
  forceStand: "shift",
  cameraLock: "l",
  cameraReset: "backspace",
  quickSave: "ctrl+s",
  menu: "escape",
};

function _defaultOnlineWsUrl() {
  try {
    if (typeof window !== "undefined" && window.location?.hostname) {
      const host = window.location.hostname;
      const isSecure = window.location.protocol === "https:";
      if (host === "localhost" || host === "127.0.0.1") return "ws://localhost:8087";
      return `${isSecure ? "wss" : "ws"}://${host}:8087`;
    }
  } catch (_) {}
  return "ws://localhost:8087";
}

function _normalizeOnlineWsUrl(url) {
  const fallback = _defaultOnlineWsUrl();
  if (!url) return fallback;
  try {
    if (typeof window !== "undefined") {
      const host = window.location?.hostname || "";
      const isLocalPage = host === "localhost" || host === "127.0.0.1";
      if (!isLocalPage && /^ws:\/\/(localhost|127\.0\.0\.1):8087\b/i.test(url)) return fallback;
      // Mixed Content guard: upgrade ws:// → wss:// on HTTPS pages
      if (!isLocalPage && window.location?.protocol === "https:" && /^ws:\/\//i.test(url)) {
        url = url.replace(/^ws:/i, "wss:");
      }
    }
  } catch (_) {}
  return url;
}

const CR_DEFAULT_GAME_SETTINGS = {
  sound: { master:80, music:55, effects:80, ambient:65, mute:false },
  video: { gamma:1, contrast:1, damageNumbers:true, screenShake:true },
  controller: { enabled:true, deadzone:0.18, sensitivity:1, invertY:false },
  keyBindings: CR_DEFAULT_KEY_BINDINGS,
  // Hidden flags — not shown in standard settings UI
  d2oMode: true,       // v8.0 DEFAULT ON — Diablo Abyss Engine: D2 gfx, names, palette
  devilutionX: false,  // Extended devilutionX mode: D1-style darker palette, shrines, item affixes
  diabl0WhiteLabel: false, // Hidden easter egg: Cryptic-owned Diabl0 naming layer
  glbMedium: true,     // Show GLB animated sprites at medium quality (not just high/ultra)
  theme: DEFAULT_THEME,
  secretCampaign: true,
  onlinePlay: false,
  onlineWsUrl: _defaultOnlineWsUrl(),
};

// ─── D2O / DevilutionX name mappings ─────────────────────────────────────────
// OpenDiablo2 (github.com/OpenDiablo2) + DevilutionX (github.com/diasurgical/devilutionX)
// spirit: faithful D2 + D1 recreation. We adopt their act/class/item naming as an
// OPTIONAL theme. Users toggle via hidden settings checkbox.
const D2O_CLASS_NAMES = {
  ember_witch:    "SORCERESS",
  iron_warden:    "BARBARIAN",
  bone_herald:    "NECROMANCER",
  shadow_blade:   "ASSASSIN",
  forest_sage:    "DRUID",
  steel_crusader: "PALADIN",
  void_archer:    "AMAZON",
};
const DIABLO_WHITE_LABEL_ARCHETYPES = {
  diablo1: {
    warrior:"iron_warden", rogue:"void_archer", sorcerer:"ember_witch",
    monk:"forest_sage", bard:"shadow_blade", barbarian:"iron_warden",
  },
  diablo2: {
    amazon:"void_archer", assassin:"shadow_blade", necromancer:"bone_herald",
    barbarian:"iron_warden", paladin:"steel_crusader", sorceress:"ember_witch", druid:"forest_sage",
  },
  diablo3: {
    barbarian:"iron_warden", crusader:"steel_crusader", demon_hunter:"void_archer",
    monk:"forest_sage", necromancer:"bone_herald", witch_doctor:"bone_herald", wizard:"ember_witch",
  },
  immortal: {
    barbarian:"iron_warden", blood_knight:"shadow_blade", crusader:"steel_crusader",
    demon_hunter:"void_archer", monk:"forest_sage", necromancer:"bone_herald",
    tempest:"forest_sage", wizard:"ember_witch",
  },
  diablo4: {
    barbarian:"iron_warden", druid:"forest_sage", necromancer:"bone_herald",
    rogue:"shadow_blade", sorcerer:"ember_witch", spiritborn:"forest_sage",
  },
};
const D2O_ACT_NAMES = [
  { name:"THE SIGHTLESS EYE",      town:"ROGUE ENCAMPMENT",   region:"Blood Moor",       icon:"🌑" },
  { name:"THE SECRET OF THE VIZJEREI", town:"LUT GHOLEIN",    region:"Rocky Waste",      icon:"🏜" },
  { name:"THE INFERNAL GATE",      town:"TRAVINCAL",          region:"Spider Forest",    icon:"🌴" },
  { name:"THE HARROWING",          town:"PANDEMONIUM FORTRESS",region:"Outer Steppes",   icon:"🔥" },
  { name:"LORD OF DESTRUCTION",    town:"HARROGATH",          region:"Bloody Foothills", icon:"❄" },
  { name:"TERROR'S END",           town:"THE NEXUS",          region:"The Void",         icon:"🌌" },
];
const CR_DIABL0_WHITE_LABEL_CLASSES = {
  ember_witch: "Cinder Arcanist",
  iron_warden: "Ruin Breaker",
  bone_herald: "Ossuary Prophet",
  shadow_blade: "Veil Executor",
  forest_sage: "Wildroot Avatar",
  steel_crusader: "Aegis Zealot",
  void_archer: "Rift Huntress",
};
const CR_DIABL0_WHITE_LABEL_ACTS = [
  {
    era: "DIABL0 I",
    name: "ASHEN CHAPEL",
    town: "OLD TRISTRAM WATCH",
    region: "Cinder Moor",
    waypoints: ["Old Tristram Watch","Cinder Moor","Chapel Descent","Ossuary Steps","Hellmouth Seal"],
    lore: "Cryptic Realm's old-cathedral nightmare: village ash, buried halls, and a sealed red gate.",
  },
  {
    era: "DIABL0 II",
    name: "EXILE CARAVAN",
    town: "ROGUE LANTERN CAMP",
    region: "Bloodfen March",
    waypoints: ["Rogue Lantern Camp","Bloodfen March","Cold Cairn","Monastery Breach","Catacomb Gate"],
    lore: "A caravan-war remix of the eastern road: camps, cairns, ruined orders, and tomb-light below.",
  },
  {
    era: "DIABL0 IMMORTAL",
    name: "SHARD-CITY SIEGE",
    town: "WESTVEIL KEEP",
    region: "Shardfall District",
    waypoints: ["Westveil Keep","Shardfall District","Market of Echoes","Pit of Embers","Crown Rift"],
    lore: "A mobile-age city siege: shattered relics, crowded alleys, rift cults, and public doom.",
  },
  {
    era: "DIABL0 III",
    name: "BASTION OF FALLEN LIGHT",
    town: "BASTION OF EMBERS",
    region: "Heavenbreak Fields",
    waypoints: ["Bastion of Embers","Heavenbreak Fields","Siegebreak Road","Silver Spire Wound","Chaos Engine"],
    lore: "A high-heaven war translated into Cryptic terms: radiant ruins, demon engines, and angelic wreckage.",
  },
  {
    era: "DIABL0 IV",
    name: "FRACTURED WILDS",
    town: "BLACK PINE HOLD",
    region: "Fractured Pass",
    waypoints: ["Black Pine Hold","Fractured Pass","Pilgrim Cairns","Blood Chapel","Worldroot Scar"],
    lore: "A grim northern pilgrimage: mud roads, frost shrines, blood chapels, and old gods under roots.",
  },
  {
    era: "DIABL0 PRIME",
    name: "THE ABYSSAL NEXUS",
    town: "NEXUS OF LAST LIGHT",
    region: "Starless Crucible",
    waypoints: ["Nexus of Last Light","Starless Bridge","Astral Crucible","Eternal Gate","Prime Wound"],
    lore: "Cryptic Realm's final white-label act: every era echoes into one broken endgame gate.",
  },
];
const CR_DIABL0_WHITE_LABEL_MONSTERS = {
  zombie: "Grave-Taken Drudge",
  skeleton: "Bonewake Soldier",
  werewolf: "Moon-Split Ravager",
  sand_golem: "Dunebound Colossus",
  mummy: "Saltwrapped Dead",
  scorpion: "Suncarved Stinger",
  jungle_demon: "Vinerot Fiend",
  shaman: "Bloodroot Hexer",
  plant_horror: "Thornmaw Horror",
  fire_imp: "Cinder Wretch",
  blood_knight: "Crimson Oathbreaker",
  chaos_mage: "Rift Choir Adept",
  ice_wraith: "Frostveil Shade",
  frost_giant: "Glacier-Bone Giant",
  snow_witch: "Whiteout Covenant",
  rift_spawn: "Voidborn Grub",
  dim_horror: "Dimensional Maw",
  star_eater: "Starless Devourer",
  the_butcher: "Hookmonger of the Deep",
  butcher_variant: "Cleaver-Saint Varr",
  skeleton_king: "Crown of Bones",
  archbishop_lazarus: "Ash-Bishop Lhazren",
  diablo: "Red Crown Prime",
  diablo_variant: "Ashlord Red Crown",
  horkdemon: "Gravewomb Brute",
  the_defiler: "Hive Saint Defiled",
  fallen_one: "Cinderfallen Knave",
  scavenger: "Carrion Scuttler",
  hidden: "Veil-Stalker",
  flesh_clan: "Fleshbound Raider",
  fire_clan: "Coalhorn Raider",
  goatman: "Horned Ravager",
  magma_demon: "Magma-Blood Impaler",
  gargoyle: "Roofstone Gargoyle",
  acid_beast: "Bileback Beast",
  wyrm: "Tunnel Wyrm",
  cave_slug: "Cavern Slug",
  toad_demon: "Bog-Tongue Fiend",
  overlord: "Pit Overlord",
  balrog: "Emberwing Tyrant",
  vortex_lord: "Vortex Baron",
  flame_lord: "Flame-Crown Lord",
  death_wing: "Gravewing",
  litch_demon: "Lichfiend",
};
const CR_DIABL0_WHITE_LABEL_BOSSES = {
  "VAMPIRE LORD MORTHIS": "Bloodstar Count Morthis",
  "PHARAOH KETH-AMON": "Sun-Tomb King Keth",
  "TEMPLE GUARDIAN ZARETH": "Thornspire Sentinel Zareth",
  "VOIDGATE KEEPER BAAL-ETH": "Voidgate Tyrant Baelith",
  "GLACIUS THE ETERNAL": "Glacius, Chain of Winter",
  "THE ETERNAL": "The Prime Wound",
};
// D1 / DevilutionX dungeon level names
const DVX_DUNGEON_NAMES = [
  "Cathedral","Catacombs","Caves","Hell","Crypt","Nest"
];
const CR_SECRET_CAMPAIGN_STAGES = [
  { id:"hf_cathedral", era:"hellfire", style:"cathedral", actName:"DIABLO I: CATHEDRAL", town:"TRISTRAM", area:"Cathedral", floor:4, boss:"the_butcher", quest:"grave_matters" },
  { id:"hf_catacombs", era:"hellfire", style:"catacombs", actName:"DIABLO I: CATACOMBS", town:"TRISTRAM", area:"Catacombs", floor:8, boss:"skeleton_king", quest:"cornerstone" },
  { id:"hf_caves", era:"hellfire", style:"caves", actName:"DIABLO I: CAVES", town:"TRISTRAM", area:"Caves", floor:12, boss:"archbishop_lazarus", quest:"wandering_trader" },
  { id:"hf_hell", era:"hellfire", style:"hell", actName:"DIABLO I: HELL", town:"TRISTRAM", area:"Hell", floor:16, boss:"diablo", quest:"nakrul_books" },
  { id:"hf_crypt", era:"hellfire", style:"crypt", actName:"HELLFIRE: CRYPT", town:"TRISTRAM", area:"Crypt", floor:20, boss:"horkdemon", quest:"grave_matters" },
  { id:"hf_nest", era:"hellfire", style:"nest", actName:"HELLFIRE: HIVE NEST", town:"TRISTRAM", area:"Hive Nest", floor:24, boss:"the_defiler", quest:"farmers_orchard" },
  { id:"d2_act1", era:"d2", style:"act1", actName:"DIABLO II: THE SIGHTLESS EYE", town:"ROGUE ENCAMPMENT", area:"Blood Moor", floor:1, boss:null, quest:"d2_act1" },
];
const D2O_SKILL_RENAMES = {
  fireball:      "FIREBALL",
  frost_nova:    "FROZEN ORB",
  chain_light:   "CHAIN LIGHTNING",
  whirlwind:     "WHIRLWIND",
  battle_cry:    "WAR CRY",
  leap_attack:   "LEAP ATTACK",
  bone_spear:    "BONE SPEAR",
  raise_skel:    "RAISE SKELETON",
  corpse_expl:   "CORPSE EXPLOSION",
  shadow_strike: "DEATH SENTRY",
  smoke_bomb:    "FADE",
  death_trap:    "WAKE OF FIRE",
  vine_snare:    "HURRICANE",
  shapeshift:    "WEREWOLF",
  storm_call:    "TORNADO",
  holy_strike:   "BLESSED HAMMER",
  div_shield:    "HOLY SHIELD",
  vengeance:     "VENGEANCE",
  multi_shot:    "STRAFE",
  rain_arrows:   "GUIDED ARROW",
  shadow_step:   "DODGE",
};

// ── Easter egg constants ──────────────────────────────────────────────────────
const CR_KONAMI_SEQ = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
const CR_CAIN_QUOTES = [
  "Stay a while and listen...",
  "Beware the armies of Hell. No mortal can withstand their fury.",
  "Without the Cube and the Runes, we are lost.",
  "The Dark Wanderer walks again. Pray he does not notice you.",
  "I have traveled across Sanctuary seeking you, hero.",
  "Tyrael himself warned me — a great darkness gathers.",
  "MoveWeight Universe... I have read of this place in ancient texts.",
];
const CR_WANDERER_DIALOGUES = [
  "Do not follow me. There is no hope for me now.",
  "Run. The terror I carry will consume you too.",
  "The darkness within me... cannot be stopped.",
  "Stay away from this creature. He is beyond your help.",
];
// Cow Level enemy names mapped onto normal enemy types
const CR_COW_ENEMY_NAMES = ["HELL BOVINE","WARPED BOVINE","INFERNO COW","PLAGUE COW","MOO MOO","ELDER MOO"];

const CR_BIND_CHOICES = {
  moveForward: ["w","arrowup"],
  moveBack: ["s","arrowdown"],
  moveLeft: ["a","arrowleft"],
  moveRight: ["d","arrowright"],
  skill1: ["z","j","1"],
  skill2: ["x","k","2"],
  skill3: ["c","l","3"],
  inventory: ["i","b"],
  interact: ["e","f"],
  quests: ["q"],
  skills: ["t"],
  potionHp: ["h","r"],
  potionMp: ["m"],
  camera: ["f6","`"],
  map: ["tab","v"],
  mapCenter: ["home","f9"],
  mapFade: ["f10"],
  mapParty: ["f11"],
  mapNames: ["f12"],
  characterPanel: ["v","c"],
  partyPanel: ["p"],
  mercPanel: ["o"],
  messageLog: ["shift+m"],
  help: ["h"],
  skillBar: ["y","s"],
  minimapToggle: ["v"],
  portraits: ["z"],
  belt: ["`"],
  autoRun: ["r"],
  forceStand: ["shift"],
  cameraLock: ["l"],
  cameraReset: ["backspace"],
  quickSave: ["ctrl+s"],
  menu: ["escape"],
};

function _mergeCrSettings(incoming = {}) {
  return {
    ...CR_DEFAULT_GAME_SETTINGS,
    ...incoming,
    sound: { ...CR_DEFAULT_GAME_SETTINGS.sound, ...(incoming.sound || {}) },
    video: { ...CR_DEFAULT_GAME_SETTINGS.video, ...(incoming.video || {}) },
    controller: { ...CR_DEFAULT_GAME_SETTINGS.controller, ...(incoming.controller || {}) },
    keyBindings: { ...CR_DEFAULT_KEY_BINDINGS, ...(incoming.keyBindings || {}) },
    // Preserve hidden flags from saved settings
    d2oMode:    incoming.d2oMode    ?? CR_DEFAULT_GAME_SETTINGS.d2oMode,
    devilutionX:incoming.devilutionX ?? CR_DEFAULT_GAME_SETTINGS.devilutionX,
    diabl0WhiteLabel: incoming.diabl0WhiteLabel ?? CR_DEFAULT_GAME_SETTINGS.diabl0WhiteLabel,
    glbMedium:  incoming.glbMedium  ?? CR_DEFAULT_GAME_SETTINGS.glbMedium,
    theme:      incoming.theme      ?? CR_DEFAULT_GAME_SETTINGS.theme,
    secretCampaign: incoming.secretCampaign ?? CR_DEFAULT_GAME_SETTINGS.secretCampaign,
    onlinePlay: incoming.onlinePlay ?? CR_DEFAULT_GAME_SETTINGS.onlinePlay,
    onlineWsUrl: _normalizeOnlineWsUrl(incoming.onlineWsUrl ?? CR_DEFAULT_GAME_SETTINGS.onlineWsUrl),
  };
}

function _makeChronicle(saved = {}) {
  return {
    runewordsMade: { ...(saved.runewordsMade || {}) },
    runesFound: { ...(saved.runesFound || {}) },
    itemsStashed: saved.itemsStashed || 0,
    itemsSold: saved.itemsSold || 0,
    purchases: saved.purchases || 0,
    mercHires: saved.mercHires || 0,
    stashWithdrawals: saved.stashWithdrawals || 0,
  };
}

function _applyGemToItem(item, gem, qualityIdx) {
  const q=Math.max(0,Math.min(4,qualityIdx));
  const mult=0.4+q*0.15; // Chipped=0.4x → Perfect=1.0x
  const bonus = item.slot==="weapon" ? gem.wep : gem.arm;
  if (bonus.dmgAdd) item.dmgAdd=Math.round((item.dmgAdd||0)+bonus.dmgAdd*mult);
  if (bonus.defAdd) item.defAdd=Math.round((item.defAdd||0)+bonus.defAdd*mult);
  if (bonus.hpAdd)  item.hpAdd=Math.round((item.hpAdd||0)+bonus.hpAdd*mult);
  if (bonus.mpAdd)  item.mpAdd=Math.round((item.mpAdd||0)+bonus.mpAdd*mult);
  if (bonus.spdAdd) item.spdAdd=parseFloat(((item.spdAdd||0)+bonus.spdAdd*mult).toFixed(2));
  item.gems = item.gems||[];
  item.gems.push({ gem:gem.id, quality:gem.quality[q], icon:gem.icon, color:gem.color });
  item.sockets = Math.max(0,(item.sockets||0)-1);
}

function _checkRuneword(item) {
  if (!item.runes||item.runes.length<2) return;
  for (const rw of RUNEWORDS) {
    if (rw.runes.length!==item.runes.length) continue;
    if (rw.runes.every((r,i)=>r===item.runes[i])) {
      item.runeword=rw.name; item.runewordBonus=rw.bonus; item.runewordColor=rw.color;
      if (rw.bonus.dmgAdd) item.dmgAdd=(item.dmgAdd||0)+rw.bonus.dmgAdd;
      if (rw.bonus.defAdd) item.defAdd=(item.defAdd||0)+rw.bonus.defAdd;
      if (rw.bonus.hpAdd)  item.hpAdd=(item.hpAdd||0)+rw.bonus.hpAdd;
      if (rw.bonus.mpAdd)  item.mpAdd=(item.mpAdd||0)+rw.bonus.mpAdd;
      if (rw.bonus.spdAdd) item.spdAdd=(item.spdAdd||0)+rw.bonus.spdAdd;
      return;
    }
  }
}

function _pickRarity() {
  const total = RARITY.reduce((s,r)=>s+r.weight,0);
  let roll = Math.random()*total;
  for (const r of RARITY) { roll -= r.weight; if (roll <= 0) return r; }
  return RARITY[0];
}

function _genItem(actLevel) {
  // Small chance to drop a rune instead
  if (Math.random() < 0.04 + actLevel*0.01) {
    const maxRune = Math.min(RUNES.length-1, Math.floor(actLevel*1.5));
    const rune = RUNES[Math.floor(Math.random()*(maxRune+1))];
    return { id:Date.now()+Math.random(), name:`${rune.name} Rune`, slot:"rune", icon:rune.icon, rune:rune.id,
      rarity:RARITY[2], level:actLevel, dmgAdd:0, defAdd:0, hpAdd:0, mpAdd:0, spdAdd:0, color:rune.color,
      goldVal:50+actLevel*20 };
  }
  // Small chance to drop a gem
  if (Math.random() < 0.06 + actLevel*0.01) {
    const gem = GEMS[Math.floor(Math.random()*GEMS.length)];
    const qi = Math.min(4, Math.floor(Math.random()*(actLevel*0.8)));
    return { id:Date.now()+Math.random(), name:`${gem.quality[qi]} ${gem.name}`, slot:"gem", icon:gem.icon, gem:gem.id, gemQuality:qi,
      rarity:RARITY[1], level:actLevel, dmgAdd:0, defAdd:0, hpAdd:0, mpAdd:0, spdAdd:0, color:gem.color,
      goldVal:20+actLevel*15+qi*20 };
  }
  const basePool = (CR_DATABASE?.baseItems?.length ? CR_DATABASE.baseItems : ITEM_BASES);
  const base = basePool[Math.floor(Math.random()*basePool.length)];
  if (base.slot === "gold") {
    return { ...base, goldVal:20 + Math.floor(Math.random()*actLevel*40), rarity: RARITY[0] };
  }
  const rarity = _pickRarity();
  const mult = { normal:1, magic:1.5, rare:2.2, unique:3.5, set:3 }[rarity.id] || 1;
  const item = {
    id:    Date.now() + Math.random(),
    name:  base.name,
    slot:  base.slot,
    icon:  base.icon,
    rarity,
    level: actLevel,
    dmgAdd:  Math.round((base.dmgAdd || 0) * mult),
    defAdd:  Math.round((base.defAdd || 0) * mult),
    hpAdd:   Math.round((base.hpAdd  || 0) * mult),
    mpAdd:   Math.round((base.mpAdd  || 0) * mult),
    spdAdd:  base.spdAdd ? parseFloat((base.spdAdd * mult).toFixed(2)) : 0,
    healHp:  base.healHp || 0,
    healMp:  base.healMp || 0,
    sockets: rarity.id === "rare" || rarity.id === "unique" ? Math.floor(Math.random()*3)+1 : 0,
    goldVal: Math.floor(10 * mult * actLevel),
  };
  if (rarity.id === "magic" || rarity.id === "rare") {
    const affix = MAGIC_AFFIXES[Math.floor(Math.random()*MAGIC_AFFIXES.length)];
    item.name = `${base.name} ${affix.name}`;
    if (affix.dmgAdd) item.dmgAdd += affix.dmgAdd;
    if (affix.defAdd) item.defAdd += affix.defAdd;
    if (affix.hpAdd)  item.hpAdd  += affix.hpAdd;
    if (affix.mpAdd)  item.mpAdd  += affix.mpAdd;
    if (affix.spdAdd) item.spdAdd = parseFloat((item.spdAdd + affix.spdAdd).toFixed(2));
  }
  if (rarity.id === "unique") {
    item.name = `${["Shadow","Void","Eternal","Ancient","Cursed"][Math.floor(Math.random()*5)]} ${base.name}`;
  }
  return item;
}

// ─── Dungeon Generator ─────────────────────────────────────────────────────────
// Tile values: 0=floor 1=wall 2=door 3=chest 4=stairs_down 9=boss_arena
function _genDungeon(w, h, rng) {
  // Alpha 5.4 — Diablo+WoW scale dungeon. Default 180×180 (vs old 60×60),
  // 80 target rooms, branching corridor system, multi-biome shrines,
  // per-biome floor tiles, mini-dungeon side chambers. Caller can override
  // size; old 60×60 callers still work but the new defaults are bigger.
  if (w < 100) w = 180;
  if (h < 100) h = 180;
  const map = Array.from({length:h}, ()=>Array(w).fill(1));
  const rooms = [];
  const carve = (r, tile=0) => { for (let dy=0;dy<r.h;dy++) for (let dx=0;dx<r.w;dx++) map[r.y+dy][r.x+dx]=tile; };
  const overlaps = (a,b) => !(a.x+a.w+2<b.x||b.x+b.w+2<a.x||a.y+a.h+2<b.y||b.y+b.h+2<a.y);

  // Target room count scales with map size; clamp so we don't infinite-loop.
  const targetRooms = Math.min(120, Math.max(40, Math.floor((w * h) / 360)));
  let tries = 0;
  while (rooms.length < targetRooms && tries++ < 1200) {
    // Mix small (6-10) and large (10-18) rooms for varied silhouette.
    const sizeBucket = rng();
    const rw = sizeBucket < 0.65 ? (5 + Math.floor(rng()*6)) : (10 + Math.floor(rng()*9));
    const rh = sizeBucket < 0.65 ? (5 + Math.floor(rng()*5)) : (9 + Math.floor(rng()*8));
    const rx = 2 + Math.floor(rng()*(w-rw-4)), ry = 2 + Math.floor(rng()*(h-rh-4));
    const nr = {x:rx,y:ry,w:rw,h:rh, biome: sizeBucket < 0.15 ? "lava" : sizeBucket < 0.30 ? "ice" : sizeBucket < 0.42 ? "blood" : "stone" };
    if (!rooms.some(r=>overlaps(r,nr))) { rooms.push(nr); carve(nr); }
  }

  // Corridor system — linear backbone + branch chambers. Each room connects
  // to a nearby neighbor (not always strictly i-1) for a more organic web.
  for (let i=1; i<rooms.length; i++) {
    const a=rooms[i-1], b=rooms[i];
    let cx=a.x+Math.floor(a.w/2), cy=a.y+Math.floor(a.h/2);
    const ex=b.x+Math.floor(b.w/2), ey=b.y+Math.floor(b.h/2);
    while (cx!==ex) { map[cy][cx]=0; cx+=cx<ex ? 1 : -1; }
    while (cy!==ey) { map[cy][cx]=0; cy+=cy<ey ? 1 : -1; }
  }
  // Extra cross-links — roughly 1 per 12 rooms — to break the chain.
  const crossLinks = Math.floor(rooms.length / 12);
  for (let i=0;i<crossLinks;i++) {
    const a=rooms[Math.floor(rng()*rooms.length)];
    const b=rooms[Math.floor(rng()*rooms.length)];
    if (a===b) continue;
    let cx=a.x+Math.floor(a.w/2), cy=a.y+Math.floor(a.h/2);
    const ex=b.x+Math.floor(b.w/2), ey=b.y+Math.floor(b.h/2);
    while (cx!==ex) { map[cy][cx]=0; cx+=cx<ex ? 1 : -1; }
    while (cy!==ey) { map[cy][cx]=0; cy+=cy<ey ? 1 : -1; }
  }

  // Biome tile painting — paint the room interior with its biome's special tile.
  // v=10 lava, v=11 ice, v=12 blood. _walkable treats these as walkable.
  for (const r of rooms) {
    const biomeTile = r.biome === "lava" ? 10 : r.biome === "ice" ? 11 : r.biome === "blood" ? 12 : 0;
    if (biomeTile !== 0) {
      // Only the inner area, leaving 1-tile floor border so corridors hook in.
      for (let dy=1; dy<r.h-1; dy++) for (let dx=1; dx<r.w-1; dx++) {
        if (rng() > 0.4) map[r.y+dy][r.x+dx] = biomeTile;
      }
    }
  }

  // Chests in random rooms — more chests for bigger dungeons.
  const chests = [];
  for (let i=1; i<rooms.length-1; i+=2) {
    if (rng() > 0.7) continue; // skip some rooms for variety
    const r=rooms[i], cx=r.x+Math.floor(r.w/2), cy=r.y+2;
    map[cy][cx]=3; chests.push({tx:cx,ty:cy,open:false});
  }

  // Shrines — v=13 — sprinkled in mid-size rooms (4-6 total).
  const shrines = [];
  for (let i=3; i<rooms.length-2; i+=Math.max(8, Math.floor(rooms.length / 6))) {
    const r=rooms[i];
    if (r.w < 7) continue;
    const cx=r.x+Math.floor(r.w/2)+1, cy=r.y+Math.floor(r.h/2);
    map[cy][cx]=13;
    shrines.push({tx:cx,ty:cy,used:false,kind:["heal","speed","damage","fortune"][shrines.length % 4]});
    if (shrines.length >= 6) break;
  }

  // Smashable props (barrels/crates) — scatter 1-3 per room for D2-style loot
  const smashableProps = [];
  for (let i=0; i<rooms.length-2; i++) {
    const r = rooms[i];
    if (r.w < 5 || r.h < 5) continue; // Skip tiny rooms
    const propCount = 1 + Math.floor(rng() * 3); // 1-3 props per room
    for (let p=0; p<propCount; p++) {
      const px = r.x + 1 + Math.floor(rng() * (r.w - 2));
      const py = r.y + 1 + Math.floor(rng() * (r.h - 2));
      if (map[py][px] === 0) { // Only place on walkable tiles
        const kind = rng() < 0.6 ? "barrel" : "crate";
        map[py][px] = 15; // New tile value for smashable props
        smashableProps.push({tx:px, ty:py, kind, smashed:false});
      }
    }
  }

  // Boss arena (last room) + waypoint shrine (third-to-last room)
  const boss=rooms[rooms.length-1];
  for (let dy=0;dy<boss.h;dy++) for (let dx=0;dx<boss.w;dx++) map[boss.y+dy][boss.x+dx]=9;
  const bx=boss.x+Math.floor(boss.w/2), by=boss.y+Math.floor(boss.h/2);

  // Stairs (second to last room)
  const sr=rooms[Math.max(rooms.length-2,1)];
  const sx=sr.x+Math.floor(sr.w/2), sy=sr.y+Math.floor(sr.h/2);
  map[sy][sx]=4;

  // Waypoint shrine (third-to-last room) — fast travel anchor.
  if (rooms.length >= 3) {
    const wp = rooms[rooms.length - 3];
    map[wp.y + Math.floor(wp.h/2)][wp.x + Math.floor(wp.w/2)] = 14;
  }

  const spawn=rooms[0];
  return {
    map, rooms, chests, shrines, smashableProps, bossX:bx, bossY:by,
    spawnX:spawn.x+Math.floor(spawn.w/2), spawnY:spawn.y+Math.floor(spawn.h/2),
  };
}

// ─── NPC Dialogue Lines ──────────────────────────────────────────────────────
// Per-NPC personality. greet = first line shown when activated. ambient =
// rotating one-liners that float above the NPC when the player draws near.
// Lines are intentionally short so they fit a single bubble; act-specific
// flavor is layered in via CR_NPC_ACT_FLAVOR below.
const CR_NPC_DIALOGUES = {
  healer:    { greet:"Be still. The wounds I close pay for the ones I cannot.",
               ambient:["Mend or unmake — the flesh decides.","Rest, traveler.","Some hurts pay for old debts.","Your pulse quickens. The dungeon hears."] },
  merc:      { greet:"Coin and steel — name your contract.",
               ambient:["Many were sworn. Few returned.","Camp pay dies first. Hire well.","I keep the ledger. I keep the names.","Take a sword that doesn't shake."] },
  bard:      { greet:"♪ A song for a coin? Or coin for a song?",
               ambient:["I sing what the wind drags into camp.","The Camp Song never ends.","Verse five is a lie. Pretend it's verse six.","Heroes pay. Listeners stay."] },
  stash:     { greet:"Your hoard is safe behind these chains.",
               ambient:["Every coffer locks. Every key is mine.","I do not judge what you stack here.","Bring me silver. Take it back as nightmares.","No, that one is not mine."] },
  merchant:  { greet:"Wares! Wares for the traveling dead.",
               ambient:["Half-priced for those who don't return.","Trade or browse — but politely.","I once owned an empire. Now: this stall.","If it kills, it costs."] },
  forge:     { greet:"Bring me iron and a story. I'll return a blade.",
               ambient:["Heat. Hammer. Patience. In that order.","Sockets cost coin. Failure costs more.","I forged a king's last sword. Not his next.","The fire knows your weapon better than you do."] },
  monk:      { greet:"Walk a circle with me. Trouble walks straight.",
               ambient:["Breathe in. Breathe out. Strike between.","The road is a line. A blessing is a curve.","I pray for you only when you forget to.","Discipline is the cheapest blessing."] },
  identifier:{ greet:"Show me what the dark gave you. I will name it.",
               ambient:["Names are doors. Open them carefully.","An unknown blade is just a long question.","I read scrolls so you don't have to.","Some items prefer to be unread."] },
  waypoint:  { greet:"The shrine remembers every step you've taken.",
               ambient:["Travel by stone. Return by stone.","Each waypoint is a promise.","I tend the lights so you can find the road back.","The road forgets — the shrine does not."] },
  skin:      { greet:"A new face for an old hero?",
               ambient:["Skin is the only armor I cannot mend.","Choose your colors carefully.","I dress kings and corpses with the same care.","Try the silk. It dies prettier."] },
};
// Optional act-tinted greeting suffix — keeps greet line evolving across acts
const CR_NPC_ACT_FLAVOR = [
  "  The bloody fields wait beyond the gate.",      // act 1
  "  The desert is hungry tonight.",                 // act 2
  "  The jungle has teeth where the trees are.",     // act 3
  "  Hellfire writes the rest of your story.",       // act 4
  "  The cold remembers every traveler's name.",     // act 5
  "  The Nexus is opening. Be brief.",               // act 6
];

// ─── Town Map Generator ──────────────────────────────────────────────────────
// Tile values used by town: 0=path 1=building/wall 2=plaza_stone 5=portal_to_dungeon
// 6=fountain 7=grass
function _genTownMap(actIdx) {
  const W = 30, H = 22, TS = 48;
  const act = CR_ACTS[actIdx] || CR_ACTS[0];
  const vendors = act.vendors || {};
  const map = Array.from({length:H}, ()=>Array(W).fill(7)); // grass everywhere

  // Stone plaza in the middle (where NPCs and player walk)
  for (let y=4; y<H-4; y++) for (let x=3; x<W-3; x++) map[y][x] = 2;

  // Outer building border
  for (let x=0; x<W; x++) { map[0][x]=1; map[H-1][x]=1; }
  for (let y=0; y<H; y++) { map[y][0]=1; map[y][W-1]=1; }

  // Building blocks (NPC houses)
  // Top row
  for (let y=2; y<5; y++) for (let x=2; x<5; x++) map[y][x]=1;
  for (let y=2; y<5; y++) for (let x=8; x<11; x++) map[y][x]=1;
  for (let y=2; y<5; y++) for (let x=15; x<18; x++) map[y][x]=1;
  for (let y=2; y<5; y++) for (let x=21; x<24; x++) map[y][x]=1;
  // Bottom row
  for (let y=H-5; y<H-2; y++) for (let x=2; x<5; x++) map[y][x]=1;
  for (let y=H-5; y<H-2; y++) for (let x=8; x<11; x++) map[y][x]=1;
  for (let y=H-5; y<H-2; y++) for (let x=15; x<18; x++) map[y][x]=1;
  for (let y=H-5; y<H-2; y++) for (let x=21; x<24; x++) map[y][x]=1;

  // Central fountain (4 tiles)
  const fx=Math.floor(W/2), fy=Math.floor(H/2);
  map[fy][fx]=6; map[fy][fx-1]=6; map[fy-1][fx]=6; map[fy-1][fx-1]=6;

  // Portal/waypoint stone — east side of plaza
  const portalTx=W-4, portalTy=Math.floor(H/2);
  map[portalTy][portalTx]=5;

  // Wilderness gate - west edge of camp. This is the proper overland exit.
  const exitTx=1, exitTy=Math.floor(H/2);
  map[exitTy-1][0]=8; map[exitTy][0]=8; map[exitTy+1][0]=8;
  map[exitTy-1][1]=0; map[exitTy][1]=0; map[exitTy+1][1]=0;
  map[exitTy][2]=0;

  // NPCs as world entities (in front of their buildings, on plaza tiles)
  // npc_* spriteIds route through crKayNpc() → dedicated adventurer body per vendor role
  const npcs = [
    { type:"healer",   tx:3,  ty:6,   spriteId:"npc_healer",      icon:"🧙", name:"HEALER",        color:"#44cc44", action:"heal" },
    { type:"merc",     tx:9,  ty:6,   spriteId:"npc_merc_captain", icon:"⚔",  name:"MERC CAPTAIN",  color:"#cc8833", action:"merc" },
    { type:"bard",     tx:13, ty:8,   spriteId:"town_bard",       icon:"♪",  name:"TOWN BARD",     color:"#ffcc88", action:"bard", musician:true },
    { type:"stash",    tx:16, ty:6,   spriteId:"npc_stash",        icon:"📦", name:"STASH KEEPER",  color:"#4488ff", action:"stash" },
    { type:"merchant", tx:22, ty:6,   spriteId:"npc_merchant",     icon:"🏪", name:"MERCHANT",      color:"#8844ff", action:"shop" },
    { type:"forge",    tx:6,  ty:H-6, spriteId:"npc_forge",        icon:"⚗",  name:"BLACKSMITH",    color:"#cc8822", action:"forge" },
    { type:"monk",     tx:18, ty:H-7, spriteId:"town_monk",        icon:"M",  name:"WANDERING MONK",color:"#ffe0a0", action:"bless", wander:true },
    { type:"skin",     tx:22, ty:H-6, spriteId:"npc_wardrobe",     icon:"🎨", name:"WARDROBE",      color:"#cc44ff", action:"skin" },
  ];
  // Identifier: Mage NPC (dark robes, identifies rare items)
  npcs.push({
    type:"identifier", tx:11, ty:H-6, spriteId:"npc_identifier", icon:"?",
    name:vendors.identifier || "IDENTIFIER", color:"#d6b65c", action:"identify",
  });
  const vendorNames = {
    healer: vendors.healer, merc: vendors.merc, stash: vendors.stash,
    merchant: vendors.merchant, forge: vendors.forge, skin: vendors.skin,
  };
  npcs.forEach(n => { if (vendorNames[n.type]) n.name = vendorNames[n.type]; });
  // Keep the new 128-bit Meshy performers on open plaza tiles so they are
  // obvious test targets instead of disappearing into the building clutter.
  npcs.forEach(n => {
    if (n.type === "bard") Object.assign(n, { tx:12, ty:13, name:"TOWN BARD", spotlight:true });
    if (n.type === "monk") Object.assign(n, { tx:18, ty:13, name:"WANDERING MONK", spotlight:true });
  });
  // Waypoint: Knight NPC (armored guardian of the waypoint stone)
  npcs.splice(5, 0, {
    type:"waypoint", tx:14, ty:H-6, spriteId:"npc_waypoint", icon:"*",
    name:vendors.waypoint || "WAYPOINT", color:act.color || "#d6b65c", action:"waypoint",
  });
  npcs.forEach(n => { n.wx = n.tx*TS + TS/2; n.wy = n.ty*TS + TS/2; });

  const spawnTx = Math.floor(W/2), spawnTy = H - 7;
  return {
    map, W, H,
    spawnTx, spawnTy,
    spawnWx: spawnTx*TS + TS/2,
    spawnWy: spawnTy*TS + TS/2,
    portalTx, portalTy,
    portalWx: portalTx*TS + TS/2,
    portalWy: portalTy*TS + TS/2,
    exitTx, exitTy,
    exitWx: exitTx*TS + TS/2,
    exitWy: exitTy*TS + TS/2,
    npcs,
    bg: act.bg || "#181020",
  };
}

// Tile values used by wilderness: 0=road 1=blocker 4=cave 7=wild ground 8=town gate
// Alpha 5.4: scaled 56×38 → 140×100 for Diablo+WoW exterior size. Clusters,
// landmarks, and side caves scale with map area.
function _genWildernessMap(actIdx, rng) {
  const W = 140, H = 100;
  const map = Array.from({length:H}, ()=>Array(W).fill(7));
  for (let x=0; x<W; x++) { map[0][x]=1; map[H-1][x]=1; }
  for (let y=0; y<H; y++) { map[y][0]=1; map[y][W-1]=1; }

  const spawnX=5, spawnY=Math.floor(H/2);
  const caveX=W-9, caveY=Math.floor(H/2)-6+Math.floor((rng()*12));
  // Side landmarks — 3 mini-points-of-interest scattered through the wilds.
  const landmarks = [];
  for (let i=0; i<3; i++) {
    landmarks.push({
      tx: 20 + Math.floor(rng() * (W - 40)),
      ty: 10 + Math.floor(rng() * (H - 20)),
      kind: ["ruin", "shrine", "campfire"][i],
      cleared: false,
    });
  }
  for (let x=1; x<W-1; x++) {
    const t=x/(W-1);
    const y=Math.round(spawnY*(1-t)+caveY*t + Math.sin(x*0.28+actIdx)*2);
    for (let yy=y-1; yy<=y+1; yy++) if (yy>0&&yy<H-1) map[yy][x]=0;
  }
  map[spawnY][1]=8; map[spawnY][2]=8; map[spawnY][spawnX]=0;
  for (let yy=caveY-1; yy<=caveY+1; yy++) for (let xx=caveX-1; xx<=caveX+1; xx++) {
    if (yy>0&&yy<H-1&&xx>0&&xx<W-1) map[yy][xx]=0;
  }
  map[caveY][caveX]=4;

  // Alpha 5.4 — landmark tiles painted onto the map. v=15=ruin, v=16=shrine, v=17=campfire
  for (const lm of landmarks) {
    map[lm.ty][lm.tx] = lm.kind === "ruin" ? 15 : lm.kind === "shrine" ? 16 : 17;
  }
  const clusters = 280 + actIdx*40;
  for (let i=0; i<clusters; i++) {
    const cx=2+Math.floor(rng()*(W-4)), cy=2+Math.floor(rng()*(H-4));
    if (Math.hypot(cx-spawnX,cy-spawnY)<5 || Math.hypot(cx-caveX,cy-caveY)<5) continue;
    const radius=1+Math.floor(rng()*2.5);
    for (let y=cy-radius; y<=cy+radius; y++) for (let x=cx-radius; x<=cx+radius; x++) {
      if (x<=0||y<=0||x>=W-1||y>=H-1) continue;
      if (map[y][x]===0 || map[y][x]===4 || map[y][x]===8) continue;
      if (Math.hypot(x-cx,y-cy)<=radius+0.2) map[y][x]=rng()<0.72 ? 1 : 7;
    }
  }

  return {
    map, W, H,
    spawnX, spawnY,
    caveX, caveY,
    spawnWx: spawnX*48 + 24,
    spawnWy: spawnY*48 + 24,
    caveWx: caveX*48 + 24,
    caveWy: caveY*48 + 24,
    chests: [],
    landmarks,
    bg: CR_ACTS[actIdx].bg || "#10181a",
  };
}

// ─── Main Game Class ───────────────────────────────────────────────────────────
export class CrypticRealmGame {
  constructor(canvas, chosenClass, difficulty, actIdx, quality, saveData, options = {}) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext("2d");
    this.quality   = _normalizeQualityTier(quality);
    this.Q         = _buildQ(this.quality);
    this.gameOver  = false;
    this.score     = 0;
    this.paused    = false;
    this._frame    = 0;
    this.options    = options || {};
    this.chromeTopInset = Number(options.chromeTopInset || 0);
    this.gameSettings = _mergeCrSettings(saveData?.settings || options.settings || {});
    this.keyBindings = { ...CR_DEFAULT_KEY_BINDINGS, ...(this.gameSettings.keyBindings || {}) };
    this.audio = { ctx:null, master:null, music:null, sfx:null, ambient:null, unlocked:false };
    this.accountKey = options.accountKey || "guest";
    this.apiSettings = options.apiSettings || null;
    this.characterId = options.characterId || saveData?.characterId || null;
    this.isSuperAdmin = !!options.isAdmin || this.accountKey === "moveweight";
    this.showAdminAssetQueue = false;
    this.adminSelectedArcForgeAsset = null;
    this.adminAssetQueueContext = null;
    this.adminEditorEnabled = false;
    this.adminEditorPaletteIndex = 0;
    this.adminMapEdits = this._adminReadMapEdits();
    this.gamepadMove = { x:0, y:0, lookX:0, lookY:0 };
    this._padPressed = {};
    this.chronicle = _makeChronicle(saveData?.chronicle);

    // Act config
    this.actIdx    = Math.max(0, Math.min(5, actIdx - 1));
    this.act       = CR_ACTS[this.actIdx];
    this.difficulty= difficulty; // "normal" | "nightmare" | "hell"
    this.diffMult  = { normal:1, nightmare:1.75, hell:3, inferno:4.5, torment:6, abyss:8 }[difficulty] || 1;
    this.playerCount = 1;
    this.playerCountMult = 1;

    // Camera
    const savedCam = saveData?.cameraState || {};
    this.camera    = saveData?.camera || "iso"; // "iso" | "top" | "third" | "fps"
    this.cameraZoom = Number.isFinite(savedCam.zoom) ? savedCam.zoom : 1;
    this.cameraYaw = Number.isFinite(savedCam.yaw) ? savedCam.yaw : 0;
    this.cameraPitch = Number.isFinite(savedCam.pitch) ? savedCam.pitch : 0;
    this.cameraLocked = !!savedCam.locked;
    this.cameraPreset = savedCam.preset || "d2";

    // Tile render sizes (iso)
    this.TW = 64; this.TH = 32; // larger isometric tiles to match D2-sized characters
    this.TS = 48; // world units per tile

    // Camera scroll
    this.camX = 0; this.camY = 0;
    this.fpsPitch = Number.isFinite(savedCam.fpsPitch) ? savedCam.fpsPitch : 0;
    this.headBob = 0;
    this._lastMoveMag = 0;
    this._cameraSnap = true;
    this.fpsCastFlash = 0;
    this.fpsCastColor = "#ff6622";
    this.fpsCastKind = "fire";
    this.fpsMeleeFlash = 0;

    // Build player
    const cls = CR_CLASSES[chosenClass] || CR_CLASSES.ember_witch;
    this.cls = cls;
    if (saveData) {
      this.player = saveData.player;
    } else {
      const s = cls.stats;
      this.player = {
        className: chosenClass,
        level: 1, xp: 0, xpNext: 100,
        maxHp: s.maxHp, hp: s.maxHp,
        maxMp: s.maxMp, mp: s.maxMp,
        str: s.str, dex: s.dex, vit: s.vit, nrg: s.nrg,
        dmg: s.dmg, def: s.def, spd: s.spd,
        // World position in pixels
        wx: 0, wy: 0,
        angle: 0, // facing angle (for FPS/top)
        // Inventory
        inventory: [],
        equipment: { weapon:null, shield:null, head:null, chest:null, belt:null, gloves:null, feet:null, ring:null, ring2:null, amulet:null },
        gold: 50,
        statPoints: 0,
        skillLevel: Array(30).fill(1),
        // Status
        frozen: 0, stealthed: 0, shielded: 0, buffDmg: 1, buffDef: 1, buffTimer: 0,
        bearForm: false, bearTimer: 0,
        // Summons
        summons: [],
        // Belt potions + scrolls
        beltHp: 3, beltMp: 2,
        beltTp: 2, beltId: 1, // Town Portal + Identify scrolls (D2-style)
        // Extended stats
        resist: { fire:0, cold:0, lightning:0, poison:0 },
        magicFind: 0, goldFind: 0, lifeSteal: 0, critChance: 0,
        skillPoints: 0, skillRanks: Array(30).fill(0),
        hardcore: false,
      };
    }
    this.player.skillRanks = Array.from({ length: 30 }, (_, i) => this.player.skillRanks?.[i] || 0);
    // Back-fill equipment slots added in later versions (old saves miss them)
    { const defEq={weapon:null,shield:null,head:null,chest:null,belt:null,gloves:null,feet:null,ring:null,ring2:null,amulet:null};
      this.player.equipment = Object.assign({}, defEq, this.player.equipment || {}); }
    this.playerCount = Math.max(1, Math.min(8, saveData?.playerCount || this.playerCount || 1));
    this.playerCountMult = 1 + (this.playerCount - 1) * 0.45;

    // Build dungeon — deterministic seed from character id + act + difficulty so
    // a save's recorded position lands on the same dungeon layout next launch.
    // Falls back to character class + saved seed when characterId is missing.
    const seedSrc = `${this.characterId || saveData?.characterId || chosenClass || "guest"}|${this.actIdx}|${difficulty}`;
    let seedHash = 0x9E3779B1;
    for (let i = 0; i < seedSrc.length; i++) {
      seedHash = Math.imul(seedHash ^ seedSrc.charCodeAt(i), 16777619);
    }
    this.dungeonSeed = saveData?.dungeonSeed || (seedHash >>> 0);
    this.dungeon = _genDungeon(60, 60, _rng(this.dungeonSeed));

    // Build town (always start in the act's camp)
    this.town = _genTownMap(this.actIdx);
    this.wilderness = _genWildernessMap(this.actIdx, _rng(this.dungeonSeed ^ 0x51a7));
    if (!saveData) {
      this.player.wx = this.town.spawnWx;
      this.player.wy = this.town.spawnWy;
      this.player.angle = -Math.PI/2; // facing north
    }

    // Click-to-move state
    this.moveTarget = null;
    this.mouseDown = false;
    this.attackTarget = null; // enemy id being attacked

    // Preload only the active atlas tier. Probing all four tiers here makes the
    // first game load compete with 128-bit GLB baking and creates long waits.
    preloadCrAtlas(chosenClass, this.quality);

    // GLB warmup is owned by the blood loading gate below so Play does not
    // unlock until the visible hero/town strips have actually been baked.
    this._preloadChosenClass = chosenClass;

    // Animation state tracking for the player (driven by movement/combat)
    this.player.animState  = "idle";
    this.player.attackTimer = 0;
    this.player.attackAnimState = null;
    this.player.hurtTimer   = 0;
    this.player.deathTimer  = 0;

    // Skill bar — 10 slots mapped to keys 1-9, 0. First 3 default to class skills.
    // Slots 3-9 unlock via skill tree (T key).
    const quick = this.cls.quickSkillIndexes || [0, 1, 2];
    this.skillBar = [quick[0], quick[1], quick[2], null, null, null, null, null, null, null];
    this.leftSkill = "basic";
    this.rightSkill = quick[0];
    this.skillTreeTab = 0;
    this.showSkillTree     = false;
    this.showRadiusGrid    = false; // G key toggles D2 radius rings
    // D2-style UI state
    this.showParty         = false;
    this.showMessageLog    = false;
    this.showHelp          = false;
    this.showPartyPortraits= true;
    this.showBeltExpanded  = false;
    this.showSkillBar      = true;
    this.chatOpen          = false;
    this.autoRun           = false;
    this.mapFaded          = false;
    this.mapShowParty      = true;
    this.mapShowNames      = false;

    // Enemies
    this.enemies    = [];
    this.projectiles= [];
    this.loot       = [];
    this.particles  = [];
    this.traps      = [];
    this.rainDrops  = [];
    this.floatingText=[];
    this.summons    = [];
    this.boss       = null;
    this.bossSpawned= false;
    this._nextId = 1;
    // ── D2-style autopickit filter (loaded once, reused across all sessions) ──
    // Reads /cryptic-assets/Pickit/*.nip and matches each dropped item.
    // Matched drops glow + show their pickit label; unmatched drops are unaffected.
    this._pickitReady = false;
    this._pickitHits  = 0;
    loadPickit().then(() => { this._pickitReady = true; }).catch(() => {});

    // Spawn initial enemies
    this._spawnEnemies(18 + this.actIdx * 4);

    // Mercenary
    this.merc = saveData?.merc || null;
    this.showMercPanel = false;

    // Stash (persistent across dungeon runs)
    this.stash = Array.isArray(saveData?.stash) ? saveData.stash : [];
    this.sharedStash = Array.isArray(saveData?.sharedStash) ? saveData.sharedStash : [];
    this.stashTab = "personal";
    this.showStash = false;

    // Relic Forge
    this.showForge  = false;
    this.forgeSlots = [null, null, null]; // up to 3 items in

    // Loot filter
    this.lootFilter = "all"; // "all" | "magic" | "rare" | "unique"

    // Skin panel
    this.showSkinPanel = false;
    this.skinUploadTarget = null;
    this.currentBuilding = null;
    this._interiorHoveredBtn = -1;
    this._interiorBtnRects = [];
    this.smashedTownProps = new Set(saveData?.smashedTownProps || []);

    // Waypoints unlocked per act and per discovered location.
    this.showWaypointPanel = false;
    this.waypoints = { 1:true, ...(saveData?.waypoints || {}) };
    this.waypoints[this.actIdx + 1] = true;
    this._unlockWaypoint(this.actIdx, 0);

    // UI state
    this.showInventory = false;
    this.showStats     = true;
    this.showShop      = false;
    this.shopItems     = Array.isArray(saveData?.shopItems) ? saveData.shopItems : this._genShopItems();
    this.activeSkill   = this.rightSkill;
    this.skillCooldowns= Array(30).fill(0);
    this.lastAttack    = 0;
    this.attackCd      = 20; // frames between basic attacks
    this.mouseX = canvas.width/2; this.mouseY = canvas.height/2;
    this.keys   = {};
    this.moveDir= {x:0,y:0};
    this.uiTheme = CR_UI_THEME;
    this._activeTheme = this.gameSettings.theme || DEFAULT_THEME;
    this._abyssCore = AbyssD2.core?.(this.dungeonSeed || 0xC0DEFACE);
    this._applyThemeSkin(this._activeTheme);
    this.secretCampaign = saveData?.secretCampaign || {
      enabled: !!this.gameSettings.secretCampaign,
      stageIdx: 0,
      completedHellfire: false,
      enteredD2: false,
      stageHistory: [],
    };
    if (this.secretCampaign.enabled) this._applySecretCampaignStage(false);
    this.online = {
      client: null,
      connected: false,
      peers: {},
      roomId: saveData?.online?.roomId || `cr8-${this.characterId || this.accountKey || "guest"}`,
      lastSync: 0,
    };
    this.onlineLobby = saveData?.onlineLobby || {
      games: [],
      status: "offline",
      lastRefresh: 0,
      lastError: "",
    };
    if (this.gameSettings.onlinePlay && this.gameSettings.onlineWsUrl) {
      this.connectOnline(this.gameSettings.onlineWsUrl);
    }
    this.minimap = this._loadMinimapState();
    this.mapMode = saveData?.mapMode || this.minimap.mode || "small";
    this.mapDiscovery = saveData?.mapDiscovery || this._loadMapDiscovery();
    this.dragMiniMap = null;
    this.pauseTab = "save";
    this.lastSaveAt = null;
    this.lastSaveMessage = "";
    this.identifierFreed = !!saveData?.identifierFreed;
    this.statues = Array.isArray(saveData?.statues) ? saveData.statues : this._initStatues();
    this.mercDiscount = !!saveData?.mercDiscount;
    this.imbueCharges = Number(saveData?.imbueCharges || 0);
    this.socketCharges = Number(saveData?.socketCharges || 0);
    this.nameItemCharges = Number(saveData?.nameItemCharges || 0);
    this.touchMode = typeof window !== "undefined" && (
      window.innerWidth < 980 || window.innerHeight < 620 || window.matchMedia?.("(pointer: coarse)")?.matches
    );
    this.touch = {
      joystickId:null, lookId:null, castId:null,
      stickX:0, stickY:0,
      stickBaseX:92, stickBaseY:canvas.height-92,
      stickKnobX:92, stickKnobY:canvas.height-92,
      lookX:0, lookY:0, holdAttack:false,
    };

    // Screen state: "town" | "wilderness" | "dungeon" | "boss" | "dead" | "act_complete"
    this.screen = "town";
    this.townTimer = 0;

    // Floating damage text queue / entity id counter
    this._nextId = this._nextId || 1;

    // Quest system
    this.quests = Array.isArray(saveData?.quests) ? this._mergeSavedQuests(saveData.quests) : this._initQuests();
    this.questLog = false;
    this._markDiscovery(7);

    this._setupInput();
    this._centerCamera();
    this._startLoadingGate("BLOOD WARMUP", "Baking 128-bit hero and town actors");
  }

  _secretStage() {
    if (!this.secretCampaign?.enabled) return null;
    return CR_SECRET_CAMPAIGN_STAGES[Math.max(0, Math.min(CR_SECRET_CAMPAIGN_STAGES.length - 1, this.secretCampaign.stageIdx || 0))];
  }

  _applySecretCampaignStage(rebuild = true) {
    const stage = this._secretStage();
    if (!stage) return;
    if (stage.era === "d2") {
      this.actIdx = 0;
      this.act = CR_ACTS[0];
      this.gameSettings.d2oMode = true;
      this.gameSettings.devilutionX = false;
      this._applyThemeSkin("diablonet");
      D2Engine.initTheme?.("diablo2", { actIdx:0 }).catch?.(()=>{});
      this._unlockWaypoint(0, 0);
      if (rebuild) this._travelToAct(0);
      return;
    }
    const style = HF_DUNGEON_STYLES[stage.style] || HF_DUNGEON_STYLES.cathedral;
    const boss = HF_MONSTERS[stage.boss] || getWaveBoss((this.secretCampaign.stageIdx || 0) + 1, stage.style);
    this.act = {
      ...(this.act || CR_ACTS[0]),
      id: 0,
      name: stage.actName,
      town: stage.town,
      color: boss?.color || "#cc3311",
      enemies: style.monsters || [],
      waypoints: [stage.town, stage.area, `${stage.area} Depths`, "Boss Seal", "Transition Gate"],
      boss: {
        name: boss?.name || style.boss || "HELLFIRE BOSS",
        icon: boss?.icon || "*",
        hp: boss?.hp || 900,
        dmg: boss?.dmg || 45,
        color: boss?.color || "#cc3311",
        xp: (boss?.reward || 500) * 2,
        gold: boss?.reward || 400,
      },
      secretStage: stage,
    };
    this.gameSettings.d2oMode = true;
    this.gameSettings.devilutionX = true;
    this._applyThemeSkin(stage.style === "crypt" || stage.style === "nest" ? "hellfire" : "diablonet");
    D2Engine.initTheme?.(stage.style === "crypt" || stage.style === "nest" ? "hellfire" : "diablo1", { actIdx:0 }).catch?.(()=>{});
    if (rebuild) {
      this.dungeonSeed = (this.dungeonSeed ^ ((this.secretCampaign.stageIdx + 1) * 0x9E3779B1)) >>> 0;
      this.dungeon = _genDungeon(60, 60, _rng(this.dungeonSeed));
      this.town = _genTownMap(0);
      this.wilderness = _genWildernessMap(0, _rng(this.dungeonSeed ^ 0x51a7));
      this.player.wx = this.town.spawnWx;
      this.player.wy = this.town.spawnWy;
      this.screen = "town";
      this.enemies = [];
      this.boss = null;
      this.bossSpawned = false;
    }
  }

  _advanceSecretCampaign() {
    if (!this.secretCampaign?.enabled) return false;
    const stage = this._secretStage();
    if (!stage || stage.era === "d2") return false;
    this.secretCampaign.stageHistory.push({ id:stage.id, completedAt:Date.now() });
    this.secretCampaign.stageIdx = Math.min(this.secretCampaign.stageIdx + 1, CR_SECRET_CAMPAIGN_STAGES.length - 1);
    const next = this._secretStage();
    if (next?.era === "d2") {
      this.secretCampaign.completedHellfire = true;
      this.secretCampaign.enteredD2 = true;
      this.actIdx = 0;
      this.act = CR_ACTS[0];
      this._applySecretCampaignStage(false);
      this.screen = "town";
      this.town = _genTownMap(0);
      this.wilderness = _genWildernessMap(0, _rng((this.dungeonSeed ^ 0x51a7) >>> 0));
      this.dungeon = _genDungeon(60, 60, _rng((this.dungeonSeed ^ 0xD2000001) >>> 0));
      this.player.wx = this.town.spawnWx;
      this.player.wy = this.town.spawnWy;
      this.boss = null; this.bossSpawned = false; this.enemies = [];
      this._spawnEnemies(22);
      this._addFloat("HELLFIRE COMPLETE - ENTERING DIABLO II ACT I", this.player.wx, this.player.wy - 64, "#ffd06a", 220);
      this._broadcastOnline("campaign_transition", { stage: next.id, actIdx:this.actIdx });
      return true;
    }
    this._applySecretCampaignStage(true);
    this._addFloat(`UNLOCKED: ${next.area.toUpperCase()}`, this.player.wx, this.player.wy - 64, "#ff8844", 180);
    this._broadcastOnline("campaign_transition", { stage: next.id, stageIdx:this.secretCampaign.stageIdx });
    return true;
  }

  _activateDiabl0WhiteLabelEasterEgg() {
    const p = this.player;
    if (!p) return;
    const firstUnlock = !this.gameSettings?.diabl0WhiteLabel;
    this.gameSettings.diabl0WhiteLabel = true;
    this.gameSettings.d2oMode = true;
    this.gameSettings.devilutionX = true;
    this.gameSettings.secretCampaign = true;
    this.secretCampaign = {
      ...(this.secretCampaign || {}),
      enabled: true,
      stageIdx: this.secretCampaign?.stageIdx || 0,
      completedHellfire: !!this.secretCampaign?.completedHellfire,
      enteredD2: !!this.secretCampaign?.enteredD2,
      stageHistory: this.secretCampaign?.stageHistory || [],
      whiteLabelDiscoveredAt: this.secretCampaign?.whiteLabelDiscoveredAt || Date.now(),
    };
    this._applyThemeSkin("diablonet");
    D2Engine.initTheme?.("diablonet", { actIdx:this.actIdx }).catch?.(()=>{});
    this._applySecretCampaignStage(false);
    this._addFloat(firstUnlock ? "DIABL0 WHITE-LABEL UNLOCKED" : "DIABL0 WHITE-LABEL ACTIVE", p.wx, p.wy - 92, "#ffdd66", 260);
    this._addFloat("Acts, waypoints, heroes, and monsters now wear Cryptic names", p.wx, p.wy - 68, "#d6b65c", 240);
  }

  // ── Konami Easter egg: Horadrim blessing + Diabl0 white-label unlock ──────
  _triggerHoradrimBless() {
    const p = this.player;
    if (!p) return;
    this._activateDiabl0WhiteLabelEasterEgg();
    p.buffDmg = Math.max(p.buffDmg || 1, 1.5);
    p.buffDef = Math.max(p.buffDef || 1, 1.25);
    p.buffTimer = Math.max(p.buffTimer || 0, 3600);
    this._addFloat("⭐ HORADRIM BLESSING — +50% POWER", p.wx, p.wy - 80, "#ffe080", 220);
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        wx: p.wx + (Math.random()-0.5)*80,
        wy: p.wy + (Math.random()-0.5)*50,
        vx: (Math.random()-0.5)*2.5,
        vy: -1.5 - Math.random()*2.5,
        r: 3 + Math.random()*5,
        color: ["#ffe080","#ffaa30","#ffffff"][Math.floor(Math.random()*3)],
        life: 70 + Math.random()*60,
        maxLife: 130,
      });
    }
  }

  // ── Dark Wanderer Easter egg ──────────────────────────────────────────────
  _spawnDarkWanderer() {
    const t = this.town;
    if (!t) return;
    const TS = 48;
    // Spawn on west edge, walk toward east
    this.darkWanderer = {
      wx: 2 * TS,
      wy: (Math.floor(t.H / 2) + (Math.random() > 0.5 ? 2 : -2)) * TS,
      targetWx: (t.W - 3) * TS,
      timer: 600, // ~10 seconds
      opacity: 0,
    };
  }

  _updateDarkWanderer() {
    const w = this.darkWanderer;
    if (!w) return;
    w.timer--;
    w.opacity = Math.min(1, w.opacity + 0.02);
    const spd = 0.6;
    const dx = w.targetWx - w.wx;
    const len = Math.abs(dx);
    if (len > 1) w.wx += (dx / len) * spd;
    if (w.timer <= 0 || len < 2) {
      w.opacity = Math.max(0, w.opacity - 0.04);
      if (w.opacity <= 0) this.darkWanderer = null;
    }
  }

  // ── Secret Cow Level Easter egg ───────────────────────────────────────────
  _enterCowLevel() {
    this._addFloat("🐄 NOT THE COW LEVEL", this.player.wx, this.player.wy - 70, "#44ff88", 200);
    // Regenerate dungeon with cow-themed override
    this.dungeonSeed = (this.dungeonSeed ^ 0xC0C0BEEF) >>> 0;
    this.dungeon = _genDungeon(60, 60, _rng(this.dungeonSeed));
    this.player.wx = this.dungeon.spawnWx;
    this.player.wy = this.dungeon.spawnWy;
    this.screen = "dungeon";
    this.enemies = [];
    this.boss = null; this.bossSpawned = false;
    this._spawnEnemies(30);
    // Rename enemies to bovine theme
    this.enemies.forEach((en, i) => {
      en.name = CR_COW_ENEMY_NAMES[i % CR_COW_ENEMY_NAMES.length];
      en.color = "#44bb44";
      en.hp = Math.round(en.hp * 1.2);
      en.maxHp = en.hp;
      en.xp = Math.round(en.xp * 1.5);
      en.gold = Math.round(en.gold * 1.8);
    });
    this._cowLevelActive = true;
    this._fountainClicks = 0;
    setTimeout(() => {
      this._addFloat("🐄 NOT THE COW LEVEL 🐄", this.player.wx, this.player.wy - 60, "#44ff88", 300);
    }, 800);
  }

  async connectOnline(wsUrl = this.gameSettings.onlineWsUrl) {
    if (!wsUrl || this.online?.connected) return false;
    const client = new D2MultiplayerClient();
    const ok = await client.connect(wsUrl);
    this.online.client = client;
    this.online.connected = !!ok;
    if (ok) {
      client.on("state", data => this._applyOnlineState(data));
      client.on("peer_state", data => this._applyOnlinePeer(data));
      client.on("game_list", data => {
        this.onlineLobby = {
          ...(this.onlineLobby || {}),
          games:Array.isArray(data?.games) ? data.games : [],
          status:"listed",
          lastRefresh:Date.now(),
          lastError:"",
        };
      });
      client.on("game_created", data => {
        const room = data?.room;
        if (room?.id) this.online.roomId = room.id;
        this.onlineLobby = {
          ...(this.onlineLobby || {}),
          games:Array.isArray(data?.games) ? data.games : (room ? [room] : this.onlineLobby?.games || []),
          status:"created",
          lastRefresh:Date.now(),
          lastError:"",
        };
        if (room?.id) client.send("join_room", {
          roomId:room.id,
          characterId:this.characterId,
          name:this.player?.className || "Hero",
          campaign:this.secretCampaign,
        });
      });
      client.on("campaign_transition", data => {
        const payload = data?.data || data;
        if (payload?.stageIdx != null && this.secretCampaign?.enabled) {
          this.secretCampaign.stageIdx = Math.max(this.secretCampaign.stageIdx || 0, Number(payload.stageIdx || 0));
          this._applySecretCampaignStage(true);
        }
      });
      client.on("boss_spawn", data => {
        const payload = data?.data || data;
        if (payload?.boss) this._addFloat(`ALLY FOUND ${String(payload.boss).toUpperCase()}`, this.player.wx, this.player.wy - 70, "#ffdd66", 120);
      });
      client.send("join_room", {
        roomId:this.online.roomId,
        characterId:this.characterId,
        name:this.player?.className || "Hero",
        campaign:this.secretCampaign,
      });
      this._addFloat("ONLINE ROOM CONNECTED", this.player.wx, this.player.wy - 58, "#44ff88", 110);
      client.send("list_games", {});
    }
    return ok;
  }

  async _ensureOnlineForLobby() {
    if (this.online?.client?.connected) return true;
    this.gameSettings.onlinePlay = true;
    this.onlineLobby = { ...(this.onlineLobby || {}), status:"connecting", lastError:"" };
    const ok = await this.connectOnline(this.gameSettings.onlineWsUrl);
    if (!ok) {
      this.onlineLobby = { ...(this.onlineLobby || {}), status:"offline", lastError:"Could not reach Diabl0.net bridge" };
      this._addFloat("ONLINE BRIDGE NOT REACHABLE", this.player.wx, this.player.wy - 64, "#ff5544", 150);
    }
    return ok;
  }

  async _requestOnlineGameList() {
    const ok = await this._ensureOnlineForLobby();
    if (!ok) return false;
    this.onlineLobby = { ...(this.onlineLobby || {}), status:"searching", lastRefresh:Date.now(), lastError:"" };
    this.online.client.send("list_games", {});
    return true;
  }

  async _createOnlineGame() {
    const ok = await this._ensureOnlineForLobby();
    if (!ok) return false;
    const roomId = `diabl0-${(this.characterId || this.accountKey || "hero").toString().replace(/[^a-z0-9_-]/gi,"").slice(0,18) || "hero"}-${Date.now().toString(36).slice(-4)}`;
    this.online.roomId = roomId;
    this.onlineLobby = { ...(this.onlineLobby || {}), status:"creating", lastError:"" };
    this.online.client.send("create_game", {
      roomId,
      name:`${this._displayClassName(this.cls.id)} ${this._secretStage()?.area || "Cryptic Realm"}`,
      difficulty:this.difficulty || "normal",
      maxPlayers:8,
      campaign:this.secretCampaign,
    });
    return true;
  }

  async _joinOnlineGame(roomId) {
    const ok = await this._ensureOnlineForLobby();
    if (!ok || !roomId) return false;
    this.online.roomId = String(roomId).slice(0,48);
    this.onlineLobby = { ...(this.onlineLobby || {}), status:"joining", lastError:"" };
    this.online.client.send("join_game", {
      roomId:this.online.roomId,
      characterId:this.characterId,
      name:this.player?.className || "Hero",
      campaign:this.secretCampaign,
    });
    this._addFloat(`JOINING ${this.online.roomId.toUpperCase()}`, this.player.wx, this.player.wy - 64, "#44ff88", 140);
    return true;
  }

  _broadcastOnline(type, data = {}) {
    const c = this.online?.client;
    if (!c?.connected) return;
    c.send(type, { roomId:this.online.roomId, data });
  }

  _syncOnlineState(force = false) {
    const now = Date.now();
    if (!force && now - (this.online?.lastSync || 0) < 120) return;
    if (!this.online?.client?.connected) return;
    this.online.lastSync = now;
    this.online.client.send("player_state", {
      roomId:this.online.roomId,
      characterId:this.characterId || this.accountKey || "guest",
      wx:this.player.wx, wy:this.player.wy, hp:this.player.hp, mp:this.player.mp,
      angle:this.player.angle || 0,
      className:this.player.className || this.cls?.id,
      name:this.characterId || this.player.className || "Hero",
      screen:this.screen, actIdx:this.actIdx, campaign:this.secretCampaign,
    });
  }

  _applyOnlinePeer(data) {
    if (!data?.characterId || data.characterId === (this.characterId || this.accountKey)) return;
    this.online.peers[data.characterId] = { ...data, seenAt:Date.now() };
  }

  _applyOnlineState(data) {
    if (data?.peers) {
      Object.values(data.peers).forEach(p => this._applyOnlinePeer(p));
    }
  }

  _initQuests() {
    const secretStage = this._secretStage?.();
    const act = this.act;
    const actNo = this.actIdx + 1;
    const firstEnemy = act.enemies[0];
    const townName = this._displayTownName(this.actIdx);
    const roadName = this._displayWaypointName(this.actIdx, 1) || this._displayActName(this.actIdx);
    const bossName = this._displayEnemyName(act.boss?.name, act.boss?.name);
    const quests = [
      { id:`a${actNo}_identifier`, name:`Free the Identifier of ${townName}`, type:"identifier", needed:1, done:this.identifierFreed?1:0, complete:!!this.identifierFreed, reward:{ xp:80+this.actIdx*30, identify:true }},
      { id:`a${actNo}_firstblood`, name:`Clear the ${roadName} road`, type:"kill", target:firstEnemy, needed:8+this.actIdx*2, done:0, complete:false, reward:{ gold:80+this.actIdx*40, xp:100+this.actIdx*50 }},
      { id:`a${actNo}_statue`, name:"Find a hidden Statue of Death", type:"statue", needed:1, done:0, complete:false, reward:{ statPoints:2, xp:90+this.actIdx*35 }},
      { id:`a${actNo}_skill`, name:"Complete the skill trial", type:"kill_any", needed:14+this.actIdx*3, done:0, complete:false, reward:{ skillPoints:1, xp:120+this.actIdx*55 }},
      { id:`a${actNo}_chests`, name:"Open 3 cursed chests", type:"chest", needed:3, done:0, complete:false, reward:{ gold:60+this.actIdx*25, xp:70+this.actIdx*30 }},
      { id:`a${actNo}_resist`, name:"Recover the resistance scroll", type:"chest", needed:5, done:0, complete:false, reward:{ resist:5+this.actIdx*2, xp:100+this.actIdx*45 }},
      { id:`a${actNo}_merc`, name:"Earn the mercenary captain's trust", type:"kill_any", needed:20+this.actIdx*3, done:0, complete:false, reward:{ mercDiscount:true, gold:100+this.actIdx*45 }},
      { id:`a${actNo}_imbue`, name:"Win the blacksmith's imbue rite", type:"elite", needed:1, done:0, complete:false, reward:{ imbue:true, item:true }},
      { id:`a${actNo}_socket`, name:"Recover the socket hammer", type:"boss", needed:1, done:0, complete:false, reward:{ sockets:true, xp:act.boss.xp/3 }},
      { id:`a${actNo}_nameitem`, name:"Bind a custom item name", type:"boss", needed:1, done:0, complete:false, reward:{ nameItem:true, gold:act.boss.gold/4 }},
      { id:`a${actNo}_boss`, name:`Defeat ${bossName}`, type:"boss", needed:1, done:0, complete:false, reward:{ gold:act.boss.gold/2, xp:act.boss.xp/2, item:true }},
      // Alpha 5.2 lore + side quest expansion
      { id:`a${actNo}_fishing`, name:`Land 3 fish at the ${townName} docks`, desc:"The harbormaster will pay a bounty for fresh catches. Use the docks fishing spot in town.", type:"fishing", needed:3, done:0, complete:false, reward:{ gold:120+this.actIdx*30, xp:60+this.actIdx*20 }},
      { id:`a${actNo}_lore_a`, name:`Recover a lost journal of ${townName}`, desc:"Hidden in a barrel near the town gates. Smash crates to find pages.", type:"chest", needed:1, done:0, complete:false, reward:{ xp:90+this.actIdx*40, lore:true }},
      { id:`a${actNo}_lore_b`, name:`Speak to the wandering monk`, desc:"He carries fragments of the act's prophecy.", type:"npc", needed:1, done:0, complete:false, reward:{ xp:50+this.actIdx*20 }},
      { id:`a${actNo}_explore`, name:`Discover 10 hidden tiles in the wilderness`, type:"discover", needed:10, done:0, complete:false, reward:{ xp:80+this.actIdx*30, gold:50+this.actIdx*20 }},
      { id:`a${actNo}_socket_runes`, name:`Socket 2 runes into your gear`, type:"socket", needed:2, done:0, complete:false, reward:{ xp:140+this.actIdx*40, sockets:true }},
    ];
    if (secretStage?.era === "hellfire") {
      HF_QUESTS
        .filter(q => q.act === "any" || q.act === secretStage.style)
        .slice(0, 4)
        .forEach((q, i) => quests.splice(Math.min(i, quests.length), 0, {
          id:`hf_${q.id}`,
          name:q.name,
          type:q.boss ? "boss" : q.item ? "chest" : "kill_any",
          needed:1,
          done:0,
          complete:false,
          reward:{ xp:120 + i*70, gold:80 + i*45, hellfire:q.reward },
          desc:q.desc,
        }));
    }
    return quests;
  }

  _mergeSavedQuests(saved = []) {
    const savedById = new Map(saved.filter(Boolean).map(q => [q.id, q]));
    const base = this._initQuests();
    const merged = base.map(q => {
      const old = savedById.get(q.id);
      if (!old) return q;
      return {
        ...q,
        done: Math.max(0, Math.min(q.needed || 1, Number(old.done || 0))),
        complete: !!old.complete,
        rewardClaimed: !!old.rewardClaimed,
      };
    });
    saved.forEach(q => {
      if (q?.id && !merged.some(m => m.id === q.id)) merged.push(q);
    });
    return merged;
  }

  _bindingParts(binding) {
    const parts = String(binding || "").toLowerCase().split("+").map(p=>p.trim()).filter(Boolean);
    const key = parts.pop() || "";
    return { key, ctrl:parts.includes("ctrl"), alt:parts.includes("alt"), shift:parts.includes("shift"), meta:parts.includes("meta") || parts.includes("cmd") };
  }

  _eventMatchesAction(e, action) {
    const binding = this.keyBindings?.[action] || CR_DEFAULT_KEY_BINDINGS[action];
    const parts = this._bindingParts(binding);
    if (!parts.key) return false;
    const k = e.key.toLowerCase();
    const keyOk = parts.key === k || (parts.key === "space" && k === " ") || (parts.key === "tab" && k === "tab");
    if (!keyOk) return false;
    return (!!e.ctrlKey === !!parts.ctrl) && (!!e.altKey === !!parts.alt) && (!!e.shiftKey === !!parts.shift) && (!!e.metaKey === !!parts.meta);
  }

  _actionPressed(action) {
    const binding = this.keyBindings?.[action] || CR_DEFAULT_KEY_BINDINGS[action];
    const parts = this._bindingParts(binding);
    if (!parts.key || parts.ctrl || parts.alt || parts.meta) return false;
    return !!this.keys[parts.key];
  }

  _activeAreaKey(screen=this.screen, actIdx=this.actIdx) {
    return `a${(actIdx|0)+1}:${screen || "town"}`;
  }

  _waypointKey(actIdx=this.actIdx, locIdx=0) {
    return `${(actIdx|0)+1}:${Math.max(0, locIdx|0)}`;
  }

  _unlockWaypoint(actIdx=this.actIdx, locIdx=0) {
    const actId = (actIdx|0) + 1;
    this.waypoints = this.waypoints || { 1:true };
    this.waypoints[actId] = true;
    this.waypoints[this._waypointKey(actIdx, locIdx)] = true;
  }

  _locationIndexForScreen(screen=this.screen) {
    if (screen === "town") return 0;
    if (screen === "wilderness") return 1;
    if (screen === "boss") return 4;
    if (screen === "dungeon") return 4;
    return 0;
  }

  _loadMapDiscovery() {
    const account = String(this.accountKey || "guest").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
    const char = this.characterId ? String(this.characterId).replace(/[^a-z0-9_]/gi, "_").toLowerCase() : "active";
    try { return JSON.parse(localStorage.getItem(`cryptic_realm_map_v7_${account}_${char}`) || "{}") || {}; }
    catch { return {}; }
  }

  _saveMapDiscovery() {
    const account = String(this.accountKey || "guest").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
    const char = this.characterId ? String(this.characterId).replace(/[^a-z0-9_]/gi, "_").toLowerCase() : "active";
    try { localStorage.setItem(`cryptic_realm_map_v7_${account}_${char}`, JSON.stringify(this.mapDiscovery || {})); } catch {}
  }

  _discoverySet(key=this._activeAreaKey()) {
    this.mapDiscovery = this.mapDiscovery || {};
    this.mapDiscovery[key] = this.mapDiscovery[key] || {};
    return this.mapDiscovery[key];
  }

  _markDiscovery(radius=6) {
    const m = this._activeMap;
    if (!m || !m[0]) return;
    const tx = Math.floor(this.player.wx / this.TS);
    const ty = Math.floor(this.player.wy / this.TS);
    const set = this._discoverySet();
    let changed = false;
    for (let y=Math.max(0,ty-radius); y<=Math.min(m.length-1,ty+radius); y++) {
      for (let x=Math.max(0,tx-radius); x<=Math.min(m[0].length-1,tx+radius); x++) {
        if (Math.hypot(x-tx,y-ty) > radius) continue;
        const id = `${x},${y}`;
        if (!set[id]) { set[id] = 1; changed = true; }
      }
    }
    if (changed && this._frame % 20 === 0) this._saveMapDiscovery();
  }

  _isDiscovered(tx, ty, key=this._activeAreaKey()) {
    const set = this.mapDiscovery?.[key];
    return !!set?.[`${tx},${ty}`];
  }

  _cycleMapMode() {
    const modes = ["small","overlay","full","off"];
    const labels = { small:"SMALL MAP", overlay:"D2 OVERLAY MAP", full:"WORLD MAP", off:"MAP OFF" };
    const i = modes.indexOf(this.mapMode || "small");
    this.mapMode = modes[(i + 1) % modes.length];
    this.minimap.mode = this.mapMode;
    this._saveMinimapState();
    this._addFloat(labels[this.mapMode], this.player.wx, this.player.wy-58, "#88ccff", 70);
  }

  // D2-style numpad chat quick-command
  _d2ChatSay(msg) {
    const W = this.canvas.width, H = this.canvas.height;
    this._addFloat(`"${msg}"`, this.player?.wx ?? W/2, (this.player?.wy ?? H/2) - 72, "#ffee88", 140);
    // If online, broadcast as a chat message
    if (this.onlineClient?.send) {
      try { this.onlineClient.send("chat", { text: msg, username: this.player?.name || "Pilot" }); } catch {}
    }
  }

  // D2-style weapon set swap (primary <-> alternate)
  _swapWeaponSet() {
    const p = this.player;
    if (!p) return;
    const mainWep  = p.equipment?.weapon  ?? null;
    const mainOff  = p.equipment?.offhand ?? null;
    const altWep   = p.altWeapon  ?? null;
    const altOff   = p.altOffhand ?? null;
    p.altWeapon  = mainWep;  p.altOffhand = mainOff;
    if (p.equipment) { p.equipment.weapon = altWep; p.equipment.offhand = altOff; }
    this._addFloat("⚔ WEAPON SWAPPED", p.wx, p.wy - 60, "#ffcc44", 90);
  }

  _initStatues() {
    return CR_ACTS.flatMap((act, idx) => ([
      { id:`a${idx+1}_town_death`, actIdx:idx, screen:"town", tx:24, ty:17, found:false, reward:"stat" },
      { id:`a${idx+1}_wild_death`, actIdx:idx, screen:"wilderness", tx:42, ty:9, found:false, reward:"resist" },
      { id:`a${idx+1}_dungeon_death`, actIdx:idx, screen:"dungeon", tx:48, ty:48, found:false, reward:"skill" },
    ]));
  }

  _activeStatues() {
    return (this.statues || [])
      .filter(s => s.actIdx === this.actIdx && s.screen === this.screen)
      .map(s => {
        s.wx = s.tx*this.TS+this.TS/2;
        s.wy = s.ty*this.TS+this.TS/2;
        s.color = "#b44cff";
        s.name = "STATUE OF DEATH";
        return s;
      });
  }

  _useStatue(statue) {
    if (!statue || statue.found) return false;
    const p = this.player;
    statue.found = true;
    if (statue.reward === "skill") p.skillPoints = (p.skillPoints || 0) + 1;
    else if (statue.reward === "resist") {
      p.resist = p.resist || { fire:0, cold:0, lightning:0, poison:0 };
      Object.keys(p.resist).forEach(k => { p.resist[k] = (p.resist[k] || 0) + 5; });
    } else p.statPoints = (p.statPoints || 0) + 2;
    this.quests.forEach(q=>{ if(!q.complete && q.type==="statue"){ q.done++; if(q.done>=q.needed) this._completeQuest(q); } });
    this._addFloat("STATUE OF DEATH CLAIMED", statue.wx, statue.wy-46, "#cc88ff", 110);
    return true;
  }

  _itemNeedsIdentify(item) {
    return !!item && !["gold","use","rune","gem"].includes(item.slot) && item.rarity?.id && item.rarity.id !== "normal";
  }

  _prepareDroppedItem(item) {
    if (!item) return item;
    if (item.identified == null) item.identified = !this._itemNeedsIdentify(item);
    // Pickit tag: any rule from set/unique/ubers/etc that matches this drop.
    // Stored on item.pickit so it survives pickup → inventory → stash.
    if (this._pickitReady && !item.pickit) {
      const rule = pickitMatch(item);
      if (rule) {
        item.pickit = { id: rule.id, file: rule.file, label: pickitLabel(rule) };
        this._pickitHits++;
      }
    }
    return item;
  }

  _itemDisplayName(item) {
    if (!item) return "Unknown Item";
    if (item.identified === false) return `Unidentified ${item.slot ? item.slot.toUpperCase() : "ITEM"}`;
    return item.runeword || item.name || "Unknown Item";
  }

  _identifyInventory(all=true) {
    let count = 0;
    (this.player.inventory || []).forEach(item => {
      if (item && item.identified === false && (all || this._itemNeedsIdentify(item))) { item.identified = true; count++; }
    });
    this._addFloat(count ? `IDENTIFIED ${count} ITEM${count===1?"":"S"}` : "NOTHING TO IDENTIFY", this.player.wx, this.player.wy-46, count ? "#d6b65c" : "#8899aa", 90);
    return count;
  }

  _pickupLoot(l) {
    if (!l || !l.item) return false;
    const p = this.player;
    const item = this._prepareDroppedItem(l.item);
    if (item.slot === "gold") {
      p.gold += item.goldVal || 0;
      this._addFloat(`+${item.goldVal || 0} GOLD`, l.wx, l.wy-20, "#ffdd00", 60);
      this._playSfx("gold");
    } else {
      p.inventory.push(item);
      if (item.slot === "rune" && item.rune) this.chronicle.runesFound[item.rune] = (this.chronicle.runesFound[item.rune]||0)+1;
      // Pickit-matched items: gold star + extra float showing the pickit label
      const star = item.pickit ? "★ " : (item.rarity?.id !== "normal" ? "* " : "");
      const col  = item.pickit ? "#ffd24a" : (item.rarity?.color || "#d8d1be");
      this._addFloat(`${star}${this._itemDisplayName(item)}`, l.wx, l.wy-20, col, 78);
      if (item.pickit) {
        this._addFloat(`[PICKIT] ${item.pickit.label}`, l.wx, l.wy-36, "#ffd24a", 100);
      }
      this._playSfx("loot");
    }
    this.score += item.goldVal || 10;
    return true;
  }

  _pickupLootById(id) {
    const idx = this.loot.findIndex(l => l.id === id);
    if (idx < 0) return false;
    const l = this.loot[idx];
    if (Math.hypot(l.wx-this.player.wx,l.wy-this.player.wy) > 58) return false;
    this._pickupLoot(l);
    this.loot.splice(idx, 1);
    return true;
  }

  _ensureAudio() {
    if (typeof window === "undefined") return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const s = this.gameSettings?.sound || {};
    if (!this.audio) this.audio = { ctx:null, master:null, music:null, sfx:null, ambient:null, unlocked:false };
    if (!this.audio.ctx) {
      const ctx = new Ctx();
      const master = ctx.createGain();
      const music = ctx.createGain();
      const sfx = ctx.createGain();
      music.connect(master);
      sfx.connect(master);
      master.connect(ctx.destination);
      this.audio.ctx = ctx;
      this.audio.master = master;
      this.audio.music = music;
      this.audio.sfx = sfx;
    }
    if (this.audio.ctx.state === "suspended") this.audio.ctx.resume?.();
    this.audio.unlocked = true;
    this._syncAudioLevels();
    return this.audio.ctx;
  }

  _syncAudioLevels() {
    const a = this.audio;
    if (!a?.ctx) return;
    const s = this.gameSettings?.sound || {};
    const mute = !!s.mute;
    const now = a.ctx.currentTime;
    a.master?.gain?.setTargetAtTime(mute ? 0 : (s.master ?? 80) / 100, now, 0.015);
    a.music?.gain?.setTargetAtTime((s.music ?? 55) / 100, now, 0.02);
    a.sfx?.gain?.setTargetAtTime((s.effects ?? 80) / 100, now, 0.01);
  }

  _applyVideoFilter() {
    const v = this.gameSettings?.video || {};
    const gamma = Math.max(0.65, Math.min(1.65, Number(v.gamma ?? 1) || 1));
    const contrast = Math.max(0.75, Math.min(1.45, Number(v.contrast ?? 1) || 1));
    if (this.canvas?.style) {
      this.canvas.style.filter = `brightness(${Math.round(gamma * 100)}%) contrast(${Math.round(contrast * 100)}%)`;
    }
    // Also store resolved values so the HUD can draw a live indicator confirming
    // the filter is active — QA was confused that gamma/contrast "didn't work".
    this._resolvedGamma = gamma;
    this._resolvedContrast = contrast;
  }

  _playSfx(kind = "ui") {
    if (this.gameSettings?.sound?.mute) return;
    const ctx = this._ensureAudio();
    if (!ctx || !this.audio?.sfx) return;
    const table = {
      ui:[520,0.045,"triangle",0.035],
      click:[680,0.04,"square",0.025],
      loot:[880,0.10,"sine",0.05],
      gold:[1160,0.08,"triangle",0.045],
      smash:[130,0.13,"sawtooth",0.08],
      door:[220,0.18,"triangle",0.06],
      spell:[420,0.16,"sine",0.055],
      chest:[740,0.12,"triangle",0.052],
      waypoint:[360,0.28,"sine",0.05],
      error:[110,0.11,"square",0.05],
    };
    const [freq,dur,type,gainAmt] = table[kind] || table.ui;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (kind === "smash") osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + dur);
    if (kind === "loot" || kind === "gold") osc.frequency.exponentialRampToValueAtTime(freq * 1.42, ctx.currentTime + dur);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainAmt, ctx.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.audio.sfx);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  _playBardTune() {
    if (this.gameSettings?.sound?.mute) return;
    const ctx = this._ensureAudio();
    if (!ctx || !this.audio?.sfx) return;
    const notes = [220, 293.66, 329.63, 392, 329.63, 293.66, 246.94, 293.66];
    const start = ctx.currentTime + 0.015;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 3 === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, start + i * 0.13);
      gain.gain.setValueAtTime(0.0001, start + i * 0.13);
      gain.gain.exponentialRampToValueAtTime(0.075, start + i * 0.13 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.13 + 0.16);
      osc.connect(gain);
      gain.connect(this.audio.sfx || this.audio.master);
      osc.start(start + i * 0.13);
      osc.stop(start + i * 0.13 + 0.18);
    });
  }

  _toggleAmbientAudio() {
    const ctx = this._ensureAudio();
    if (!ctx || !this.audio?.music) return false;
    if (this.audio.ambient) {
      this.audio.ambient.nodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch (_) {} });
      this.audio.ambient = null;
      this._addFloat("AMBIENT OFF", this.player.wx, this.player.wy-54, "#8899aa", 80);
      return false;
    }
    const drone = ctx.createOscillator();
    const fifth = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    drone.type = "sine";
    fifth.type = "triangle";
    lfo.type = "sine";
    drone.frequency.value = 55;
    fifth.frequency.value = 82.41;
    lfo.frequency.value = 0.085;
    lfoGain.gain.value = 10;
    gain.gain.value = 0.045;
    lfo.connect(lfoGain);
    lfoGain.connect(drone.frequency);
    drone.connect(gain);
    fifth.connect(gain);
    gain.connect(this.audio.music);
    [drone,fifth,lfo].forEach(n => n.start());
    this.audio.ambient = { nodes:[drone,fifth,lfo,gain,lfoGain] };
    this._addFloat("AMBIENT ON", this.player.wx, this.player.wy-54, "#44ff88", 80);
    return true;
  }

  _cycleBinding(action) {
    const choices = CR_BIND_CHOICES[action];
    if (!choices?.length) return;
    const current = this.keyBindings[action] || CR_DEFAULT_KEY_BINDINGS[action];
    const next = choices[(choices.indexOf(current) + 1) % choices.length] || choices[0];
    this.keyBindings[action] = next;
    this.gameSettings.keyBindings = { ...(this.gameSettings.keyBindings || {}), [action]: next };
    this._addFloat(`${action.toUpperCase()}: ${next.toUpperCase()}`, this.player.wx, this.player.wy-54, "#d6b65c", 90);
  }

  _closeTopPanel() {
    const closers = [
      "currentBuilding","showWaypointPanel","showShop","showMercPanel","showStash","showForge",
      "showSkinPanel","showInventory","showSkillTree","questLog","showParty","showMessageLog","showHelp","chatOpen",
    ];
    for (const key of closers) {
      if (this[key]) {
        this[key] = key === "currentBuilding" ? null : false;
        return true;
      }
    }
    return false;
  }

  _setupInput() {
    this._onKeyDown = e => {
      if (e.target.tagName === "INPUT") return;
      this._ensureAudio?.();
      this.keys[e.key.toLowerCase()] = true;

      // ── Mini-game overlay input forwarding ──────
      if (this._miniGameOverlay && this._miniGameOverlay.game) {
        const g = this._miniGameOverlay.game;
        const k = e.key.toLowerCase();
        // Arena combat: SPACE = attack, A/D = move
        if (g.player && g.enemy && !g.enemies) {
          if (k === " " && g.player.atkTimer === 0) { g.player.attacking = true; g.player.atkTimer = 30; const dist = Math.abs(g.player.x - g.enemy.x); if (dist < 80) { g.enemy.hp -= 10; g.score += 15; } }
          if (k === "a" || k === "arrowleft") g.player.x = Math.max(40, g.player.x - 20);
          if (k === "d" || k === "arrowright") g.player.x = Math.min(760, g.player.x + 20);
        }
        // Brawl: WASD = move, SPACE = attack
        if (g.player && g.enemies) {
          if (k === " " && g.player.atkTimer === 0) { g.player.attacking = true; g.player.atkTimer = 20; g.enemies.forEach(en => { const d2 = Math.sqrt((en.x-g.player.x)**2+(en.y-g.player.y)**2); if (d2 < 60) { en.hp--; g.score += 10; } }); g.enemies = g.enemies.filter(en => en.hp > 0); }
          if (k === "w" || k === "arrowup") g.player.y = Math.max(100, g.player.y - 15);
          if (k === "s" || k === "arrowdown") g.player.y = Math.min(560, g.player.y + 15);
          if (k === "a" || k === "arrowleft") g.player.x = Math.max(30, g.player.x - 15);
          if (k === "d" || k === "arrowright") g.player.x = Math.min(770, g.player.x + 15);
        }
        // Siege: click handled via canvas mousedown; ESC to close
        if (k === "escape") { this._closeMiniGame(this._miniGameOverlay.kind, g.score || 0); return; }
        e.preventDefault();
        return;
      }

      // ── Admin transform hotkeys (when a placed asset is selected) ──────
      // Mario-64 nose-pinch shortcut layer: arrows move, Q/E rotate, R/F
      // raise/lower, [/] or +/- scale, Delete removes, Esc deselects.
      const sel = this._adminSelectedInstance;
      if (this.isSuperAdmin && this.adminEditorEnabled && sel && !e.ctrlKey && !e.metaKey) {
        const k = e.key, step = (e.shiftKey ? this.TS * 0.5 : this.TS * 0.1);
        const t = this._adminGetTransform(sel.areaKey, sel.instanceId);
        let handled = true;
        if (k === "ArrowLeft")      this._adminSetTransform(sel.areaKey, sel.instanceId, { dx: t.dx - step });
        else if (k === "ArrowRight")this._adminSetTransform(sel.areaKey, sel.instanceId, { dx: t.dx + step });
        else if (k === "ArrowUp")   this._adminSetTransform(sel.areaKey, sel.instanceId, { dy: t.dy - step });
        else if (k === "ArrowDown") this._adminSetTransform(sel.areaKey, sel.instanceId, { dy: t.dy + step });
        else if (k === "q" || k === "Q") this._adminSetTransform(sel.areaKey, sel.instanceId, { rotation: t.rotation - Math.PI / 12 });
        else if (k === "e" || k === "E") this._adminSetTransform(sel.areaKey, sel.instanceId, { rotation: t.rotation + Math.PI / 12 });
        else if (k === "r" || k === "R") this._adminSetTransform(sel.areaKey, sel.instanceId, { yLift: t.yLift - 4 });
        else if (k === "f" || k === "F") this._adminSetTransform(sel.areaKey, sel.instanceId, { yLift: t.yLift + 4 });
        else if (k === "+" || k === "=") this._adminSetTransform(sel.areaKey, sel.instanceId, { scaleMul: t.scaleMul * 1.1 });
        else if (k === "-" || k === "_") this._adminSetTransform(sel.areaKey, sel.instanceId, { scaleMul: t.scaleMul / 1.1 });
        else if (k === "Delete" || k === "Backspace") this._adminDeletePlaced(sel.areaKey, sel.instanceId);
        else if (k === "Escape") this._adminSelectedInstance = null;
        else handled = false;
        if (handled) { e.preventDefault(); return; }
      }
      // ── Konami code Easter egg ───────────────────────────────────────────
      if (!this.loadingGate?.active) {
        this._konamiIdx = this._konamiIdx || 0;
        if (e.key === CR_KONAMI_SEQ[this._konamiIdx]) {
          this._konamiIdx++;
          if (this._konamiIdx === CR_KONAMI_SEQ.length) {
            this._konamiIdx = 0;
            this._triggerHoradrimBless();
          }
        } else {
          this._konamiIdx = e.key === CR_KONAMI_SEQ[0] ? 1 : 0;
        }
      }
      if (this.loadingGate?.active) {
        if (e.key === "Enter" || e.key === " " || e.code === "Space") {
          e.preventDefault();
          this._activateLoadingPlay();
        }
        return;
      }
      const act = name => this._eventMatchesAction(e, name);
      const CW = this.canvas.width, CH = this.canvas.height;

      if (this.isSuperAdmin) {
        // Ctrl+E or B (Minecraft-style) toggles the build/asset editor.
        // The B-hotkey only fires when no text input is focused and the
        // editor isn't already consuming the keystroke.
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
          e.preventDefault();
          this._adminToggleMapEditor();
          return;
        }
        const tag = (document.activeElement?.tagName || "").toLowerCase();
        const inField = tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable;
        if (!inField && !e.ctrlKey && !e.metaKey && !e.altKey && e.key && e.key.toLowerCase() === "b") {
          e.preventDefault();
          this._adminToggleMapEditor();
          return;
        }
        if (this.adminEditorEnabled && e.code === "Insert") {
          e.preventDefault();
          this._adminPlaceCurrentAtPlayer();
          return;
        }
        if (this.adminEditorEnabled && e.code === "Delete") {
          e.preventDefault();
          this._adminEraseNearestPlaced();
          return;
        }
        if (this.adminEditorEnabled && (e.key === ";" || e.key === "[")) {
          e.preventDefault();
          this._adminCyclePlaceable(-1);
          return;
        }
        if (this.adminEditorEnabled && (e.key === "'" || e.key === "]")) {
          e.preventDefault();
          this._adminCyclePlaceable(1);
          return;
        }
        // Quick-select palette slots 1–9 like Minecraft hotbar (only in build mode).
        if (this.adminEditorEnabled && /^[1-9]$/.test(e.key)) {
          const idx = Number(e.key) - 1;
          if (idx >= 0 && idx < (typeof CR_ADMIN_PLACEABLES !== "undefined" ? CR_ADMIN_PLACEABLES.length : 0)) {
            e.preventDefault();
            this.adminEditorPaletteIndex = idx;
            const def = this._adminCurrentPlaceable();
            this._addFloat(`PLACE: ${def.label}`, this.player.wx, this.player.wy-68, def.color || "#d6b65c", 70);
            return;
          }
        }
      }

      // ── TAB: Toggle Automap (D2) ────────────────────────────────────────
      if (act("map")) { e.preventDefault(); this._cycleMapMode(); return; }

      // ── CAMERA CONTROLS ─────────────────────────────────────────────────
      if (act("camera")) { e.preventDefault(); this._cycleCamera(); }
      if (e.key === "[" || e.key === "{") { e.preventDefault(); this._setCameraZoom(this.cameraZoom - 0.1); }
      if (e.key === "]" || e.key === "}") { e.preventDefault(); this._setCameraZoom(this.cameraZoom + 0.1); }
      if (e.key === "," || e.key === "<") { e.preventDefault(); this._rotateCamera(-Math.PI/18); }
      if (e.key === "." || e.key === ">") { e.preventDefault(); this._rotateCamera(Math.PI/18); }
      if (e.key === "PageUp")   { e.preventDefault(); this._setCameraPitch(this.cameraPitch - 0.08); }
      if (e.key === "PageDown") { e.preventDefault(); this._setCameraPitch(this.cameraPitch + 0.08); }
      if (act("cameraReset")) { e.preventDefault(); this._resetCameraRig(); return; }
      if (act("cameraLock")) { e.preventDefault(); this._toggleCameraLock(); return; }

      // ── F1–F8: Skills 1–8 (D2 style left/right skill assignment) ────────
      const _fk = { F1:0,F2:1,F3:2,F4:3,F5:4,F6:5,F7:6,F8:7 }[e.key];
      if (_fk !== undefined) { e.preventDefault(); this._useSkillBar(_fk); return; }

      // ── F9/Home: Center Automap | F10: Fade | F11: Party | F12: Names ───
      if (act("mapCenter")) {
        e.preventDefault();
        if (this.player) { this.minimap.cx = this.player.wx; this.minimap.cy = this.player.wy; }
        this._addFloat("AUTOMAP CENTERED", CW/2, 80, "#88ccff", 60);
        return;
      }
      if (act("mapFade")) { e.preventDefault(); this.mapFaded = !this.mapFaded; this._addFloat(this.mapFaded ? "MAP FADED" : "MAP VISIBLE", CW/2, 80, "#88ccff", 60); return; }
      if (act("mapParty")) { e.preventDefault(); this.mapShowParty = !this.mapShowParty; this._addFloat(this.mapShowParty ? "PARTY ON MAP" : "PARTY HIDDEN", CW/2, 80, "#88ccff", 60); return; }
      if (act("mapNames")) { e.preventDefault(); this.mapShowNames = !this.mapShowNames; this._addFloat(this.mapShowNames ? "NAMES ON MAP" : "NAMES HIDDEN", CW/2, 80, "#88ccff", 60); return; }

      // ── 1–4: Belt / Potion slots (D2 style) ─────────────────────────────
      // Slots 1-2 = HP (red potions), 3-4 = MP (blue potions)
      if (e.key === "1" || e.key === "2") { this._usePotion("hp"); return; }
      if (e.key === "3" || e.key === "4") { this._usePotion("mp"); return; }
      // 5–0: extra skill slots 5–10
      const _sk = { "5":4,"6":5,"7":6,"8":7,"9":8,"0":9 }[e.key];
      if (_sk !== undefined) { this._useSkillBar(_sk); return; }

      // ── NUMPAD: D2 Chat Quick-Commands ───────────────────────────────────
      const _chatCmds = {
        Numpad0:"Help!", Numpad1:"Follow me.", Numpad2:"For you.",
        Numpad3:"Thanks.", Numpad4:"Sorry.", Numpad5:"Bye.",
        Numpad6:"Die!", Numpad7:"Retreat."
      };
      if (_chatCmds[e.code]) { e.preventDefault(); this._d2ChatSay(_chatCmds[e.code]); return; }

      // ── SCREEN TOGGLES ───────────────────────────────────────────────────

      // A / C — Character Attributes (D2: A or C)
      if (act("characterPanel")) {
        this.showInventory = true; this.showStats = !this.showStats; return;
      }
      // I / B — Inventory (D2: I or B)
      if (act("inventory") || e.key === "i" || e.key === "I" || e.key === "b" || e.key === "B") {
        this.showInventory = !this.showInventory; return;
      }
      // P — Party Screen
      if (act("partyPanel")) {
        this.showParty = !this.showParty;
        if (this.showParty) this._addFloat("PARTY", CW/2, CH/2, "#88aaff", 50);
        return;
      }
      // O — Mercenary Screen (D2: O)
      if (act("mercPanel")) { this.showMercPanel = !this.showMercPanel; return; }
      // M — Message Log (D2: M)
      if (act("messageLog")) { this.showMessageLog = !this.showMessageLog; return; }
      // Q — Quest Log (D2: Q)
      if (act("quests") || e.key === "q" || e.key === "Q") { this.questLog = !this.questLog; return; }
      // H — Help Screen (D2: H)
      if (act("help")) { this.showHelp = !this.showHelp; return; }
      // T — Skill Tree (D2: T)
      if (act("skills") || e.key === "t" || e.key === "T") { this.showSkillTree = !this.showSkillTree; return; }
      // S — Toggle Skill Speed Bar overlay (D2: S)
      if (act("skillBar")) {
        this.showSkillBar = !(this.showSkillBar ?? true);
        this._addFloat(this.showSkillBar !== false ? "SKILL BAR ON" : "SKILL BAR OFF", CW/2, 80, "#aaccff", 50);
        return;
      }
      // V — MiniMap toggle small <-> off (D2: V)
      if (act("minimapToggle")) {
        this.mapMode = (this.mapMode === "off") ? "small" : "off";
        this.minimap.mode = this.mapMode;
        this._saveMinimapState();
        this._addFloat(this.mapMode === "off" ? "MINIMAP OFF" : "MINIMAP ON", CW/2, 80, "#88ccff", 50);
        return;
      }
      // Z — Party member portraits toggle (D2: Z)
      if (act("portraits")) {
        this.showPartyPortraits = !this.showPartyPortraits;
        this._addFloat(this.showPartyPortraits ? "PORTRAITS ON" : "PORTRAITS OFF", CW/2, 80, "#aaaaff", 50);
        return;
      }
      // ` / ~ — Toggle expanded belt display (D2: ~)
      if (act("belt")) {
        this.showBeltExpanded = !this.showBeltExpanded;
        this._addFloat(this.showBeltExpanded ? "BELT EXPANDED" : "BELT COMPACT", CW/2, 80, "#d6b65c", 50);
        return;
      }

      // ── GAME ACTIONS ─────────────────────────────────────────────────────

      // E — Interact
      if (act("interact") || e.key === "e" || e.key === "E") { this._interact(); return; }
      // R — Auto-run toggle (D2: R)
      if (act("autoRun")) {
        this.autoRun = !this.autoRun;
        this._addFloat(this.autoRun ? "AUTO-RUN ON" : "WALK MODE", CW/2, 80, "#ffdd88", 60);
        return;
      }
      // W — Swap weapon set (D2: W)
      if (e.key === "w" || e.key === "W") { this._swapWeaponSet(); return; }
      // F — Zoom in/out (D2: F)
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        const z = this.cameraZoom > 0.85 ? 0.55 : this.cameraZoom > 0.50 ? 0.85 : 1.1;
        this._setCameraZoom(z);
        return;
      }
      // G — Toggle legacy graphics / radius grid (D2: G)
      if (e.key === "g" || e.key === "G") {
        this.showRadiusGrid = !this.showRadiusGrid;
        this._addFloat(this.showRadiusGrid ? "GRID ON" : "GRID OFF", CW/2, 80, "#d6b65c", 60);
        return;
      }
      // N — Clear text messages (D2: N)
      if (e.key === "n" || e.key === "N") { this.floatingText = []; return; }
      // X — Identify scroll (was F before D2 remapping)
      if (e.key === "x" || e.key === "X") { this._useIdentifyScroll(); return; }
      // \ or | — Town Portal (no direct D2 hotkey, use backslash as substitute)
      if (e.key === "\\" || e.key === "|") { this._useTownPortal(); return; }

      // ── + / - player count debug ─────────────────────────────────────────
      if (e.key === "+" || e.key === "=") this._setPlayerCount((this.playerCount||1)+1);
      if (e.key === "-" || e.key === "_") this._setPlayerCount((this.playerCount||1)-1);

      // ── SPACE: Cancel all screens (D2: Space) ────────────────────────────
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        this.showInventory  = false; this.showStats     = false;
        this.showSkillTree  = false; this.questLog      = false;
        this.showMercPanel  = false; this.showParty     = false;
        this.showMessageLog = false; this.showHelp      = false;
        this.showShop       = false; this.showWaypointPanel = false;
        this.showStash      = false; this.showForge     = false;
        this.showSkinPanel  = false; this.currentBuilding = null;
        this.mouseDown = false; this.moveTarget = null; this.attackTarget = null;
        return;
      }

      // ── ENTER: Chat overlay (D2: Enter) ──────────────────────────────────
      if (e.key === "Enter") { e.preventDefault(); this.chatOpen = !this.chatOpen; return; }

      // ── CTRL+S: Quick Save ────────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        this.saveToStorage();
        return;
      }

      // ── ESCAPE: Menu / close top panel (D2: Esc) ─────────────────────────
      if (e.key === "Escape") {
        e.preventDefault();
        if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
        if (this._closeTopPanel()) {
          this.mouseDown = false;
          this.moveTarget = null;
          this.attackTarget = null;
          this.dragMiniMap = null;
          return;
        }
        this.paused = !this.paused;
        if (this.paused) {
          this.pauseTab = this.pauseTab || "save";
          this.mouseDown = false;
          this.moveTarget = null;
          this.attackTarget = null;
          this.dragMiniMap = null;
        }
        return;
      }
    };
    this._onKeyUp = e => { this.keys[e.key.toLowerCase()] = false; };
    this._onMouseMove = e => {
      const r = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
      // Update interior button hover state
      if (this.currentBuilding && this._interiorBtnRects) {
        const mx = this.mouseX, my = this.mouseY;
        const hit = this._interiorBtnRects.findIndex(r2 => mx>=r2.x && mx<=r2.x+r2.w && my>=r2.y && my<=r2.y+r2.h);
        this._interiorHoveredBtn = hit >= 0 ? hit : -1;
      }
      if (this.camera === "fps" && document.pointerLockElement === this.canvas) {
        this.player.angle += (e.movementX || 0) * 0.0024;
        this.fpsPitch = Math.max(-0.34, Math.min(0.34, this.fpsPitch + (e.movementY || 0) * 0.0018));
      } else if (this.camera === "fps" && (e.buttons & 2)) {
        this.player.angle += (e.movementX || 0) * 0.003;
        this.fpsPitch = Math.max(-0.34, Math.min(0.34, this.fpsPitch + (e.movementY || 0) * 0.002));
      } else if (e.altKey && (e.buttons & 1)) {
        this._rotateCamera((e.movementX || 0) * 0.004, false);
        this._setCameraPitch(this.cameraPitch + (e.movementY || 0) * 0.002, false);
      }
      if (this.dragMiniMap && !this.minimap.locked) {
        this.minimap.x = Math.max(6, Math.min(this.canvas.width - this.minimap.w - 6, this.mouseX - this.dragMiniMap.dx));
        this.minimap.y = Math.max(34, Math.min(this.canvas.height - this.minimap.h - 96, this.mouseY - this.dragMiniMap.dy));
        this._saveMinimapState();
      }
    };
    this._onMouseDown = e => {
      this._ensureAudio?.();
      const r = this.canvas.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      if (this.loadingGate?.active) {
        if (e.button === 0) this._activateLoadingPlay();
        return;
      }
      if (this.paused) {
        if (e.button === 0) this._handlePauseClick(cx, cy);
        return;
      }
      if (this.camera === "fps" && document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock?.();
      }
      if (e.button === 0 && this._handleMinimapMouseDown(e)) return;
      if (e.button === 0) { this.mouseDown = !e.shiftKey; this._handleLeftClick(e); }
      else if (e.button === 2) { e.preventDefault(); this._handleRightClick(e); }
    };
    this._onMouseUp = e => {
      this.dragMiniMap = null;
      if (e.button === 0) { this.mouseDown = false; }
    };
    this._onContextMenu = e => {
      e.preventDefault();
      // In admin editor mode, right-click on a placed asset selects it for
      // the transform popup (Mario-64 nose-pinch flow).
      if (this.isSuperAdmin && this.adminEditorEnabled) {
        const rect = this.canvas.getBoundingClientRect();
        const cx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const cy = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        const hit = this._adminHitTestPlacedAt?.(cx, cy, 48);
        if (!hit) this._adminSelectedInstance = null;
      }
    };
    this._onWheel = e => {
      e.preventDefault();
      // Build-mode wheel cycles the palette (Minecraft-style hotbar scroll).
      if (this.isSuperAdmin && this.adminEditorEnabled && !e.shiftKey && !e.ctrlKey) {
        this._adminCyclePlaceable(e.deltaY > 0 ? 1 : -1);
        return;
      }
      const amt = e.deltaY > 0 ? -0.08 : 0.08;
      if (e.shiftKey) this._setCameraPitch(this.cameraPitch - amt * 0.7);
      else this._setCameraZoom(this.cameraZoom + amt);
    };
    this._onTouchStart = e => {
      e.preventDefault();
      this._ensureAudio?.();
      const touches = Array.from(e.changedTouches || []);
      if (!touches.length) return;
      if (this.loadingGate?.active) {
        this._activateLoadingPlay();
        return;
      }
      if (this.paused) {
        const pt = this._touchPoint(touches[0]);
        this._handlePauseClick(pt.x, pt.y);
        return;
      }
      for (const t of touches) {
        const pt = this._touchPoint(t);
        const hit = this._hitMobileButton(pt.x, pt.y);
        if (hit) {
          this.touch.castId = t.identifier;
          this._handleMobileButton(hit.id);
          continue;
        }
        if (pt.x < this.canvas.width * 0.44) {
          this.touch.joystickId = t.identifier;
          this.touch.stickBaseX = pt.x;
          this.touch.stickBaseY = pt.y;
          this._updateTouchStick(pt.x, pt.y);
        } else if (this.camera === "fps" || pt.x > this.canvas.width * 0.56) {
          this.touch.lookId = t.identifier;
          this.touch.lookX = pt.x;
          this.touch.lookY = pt.y;
        } else {
          this._touchTapWorld(t);
        }
      }
    };
    this._onTouchMove = e => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches || [])) {
        const pt = this._touchPoint(t);
        if (t.identifier === this.touch.joystickId) {
          this._updateTouchStick(pt.x, pt.y);
        } else if (t.identifier === this.touch.lookId) {
          const dx = pt.x - this.touch.lookX, dy = pt.y - this.touch.lookY;
          this.touch.lookX = pt.x; this.touch.lookY = pt.y;
          if (this.camera === "fps") {
            this.player.angle += dx * 0.006;
            this.fpsPitch = this._clamp(this.fpsPitch + dy * 0.003, -0.34, 0.34);
          } else {
            this._rotateCamera(dx * 0.006, false);
            this._setCameraPitch(this.cameraPitch + dy * 0.003, false);
          }
        }
      }
    };
    this._onTouchEnd = e => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches || [])) {
        if (t.identifier === this.touch.joystickId) {
          this.touch.joystickId = null;
          this.touch.stickX = 0;
          this.touch.stickY = 0;
          this.touch.stickKnobX = this.touch.stickBaseX;
          this.touch.stickKnobY = this.touch.stickBaseY;
        }
        if (t.identifier === this.touch.lookId) this.touch.lookId = null;
        if (t.identifier === this.touch.castId) {
          this.touch.castId = null;
          this.touch.holdAttack = false;
        }
      }
    };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup",   this._onKeyUp);
    this.canvas.addEventListener("mousemove",  this._onMouseMove);
    this.canvas.addEventListener("mousedown",  this._onMouseDown);
    this.canvas.addEventListener("mouseup",    this._onMouseUp);
    this.canvas.addEventListener("contextmenu",this._onContextMenu);
    this.canvas.addEventListener("wheel",      this._onWheel, { passive:false });
    this.canvas.addEventListener("touchstart", this._onTouchStart, { passive:false });
    this.canvas.addEventListener("touchmove",  this._onTouchMove,  { passive:false });
    this.canvas.addEventListener("touchend",   this._onTouchEnd,   { passive:false });
    this.canvas.addEventListener("touchcancel",this._onTouchEnd,   { passive:false });
  }

  _touchPoint(t) {
    const r = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / Math.max(1, r.width);
    const sy = this.canvas.height / Math.max(1, r.height);
    return { x:(t.clientX - r.left) * sx, y:(t.clientY - r.top) * sy };
  }

  _touchTapWorld(t) {
    const pt = this._touchPoint(t);
    this._handleLeftClick({ clientX:t.clientX, clientY:t.clientY, shiftKey:false });
    this.mouseX = pt.x;
    this.mouseY = pt.y;
  }

  _updateTouchStick(x, y) {
    const radius = Math.max(42, Math.min(76, this.canvas.width * 0.065));
    const dx = x - this.touch.stickBaseX;
    const dy = y - this.touch.stickBaseY;
    const d = Math.hypot(dx, dy);
    const m = d > radius ? radius / d : 1;
    this.touch.stickKnobX = this.touch.stickBaseX + dx * m;
    this.touch.stickKnobY = this.touch.stickBaseY + dy * m;
    this.touch.stickX = this._clamp(dx / radius, -1, 1);
    this.touch.stickY = this._clamp(dy / radius, -1, 1);
  }

  _isMobileLayout(W=this.canvas.width,H=this.canvas.height) {
    return this._layoutProfile(W,H).mobile;
  }

  _layoutProfile(W=this.canvas.width,H=this.canvas.height) {
    const portrait = H > W * 1.08;
    const short = H < 620;
    const narrow = W < 720;
    const mobile = !!this.touchMode || narrow || short;
    const tablet = !mobile && W < 1180;
    const tv = W >= 1920 || H >= 1080;
    const vrWide = W / Math.max(1,H) > 2.05;
    const hudBottom = Math.max(
      mobile ? (portrait ? 124 : 112) : 112,
      Math.min(mobile ? 150 : 154, Math.floor(H*0.15))
    );
    const chromeTop = Math.max(0, Number(this.chromeTopInset || 0));
    const baseSafeTop = mobile ? (portrait ? 58 : 38) : 44;
    return {
      portrait, landscape:!portrait, short, narrow, mobile, tablet, tv, vrWide,
      compact: mobile || tablet,
      safeTop: Math.max(baseSafeTop, chromeTop),
      safeBottom: hudBottom,
      edge: mobile ? 10 : tv ? 22 : 14,
    };
  }

  _mobileButtons(W=this.canvas.width,H=this.canvas.height) {
    const prof = this._layoutProfile(W,H);
    const r = Math.max(prof.portrait ? 28 : 30, Math.min(prof.tv ? 66 : 54, Math.min(W,H) * (prof.portrait ? 0.062 : 0.07)));
    const ax = W - r - prof.edge - (prof.vrWide ? W*0.035 : 0);
    const ay = Math.max(prof.safeTop + r + 42, H - prof.safeBottom - r - (prof.portrait ? 12 : 10));
    const gap = r * 1.28;
    const stackX = W - Math.max(26, Math.min(38, W*0.055));
    const stackStart = prof.portrait ? Math.min(H*0.33, prof.safeTop + 168) : prof.safeTop + 58;
    return [
      { id:"attack", x:ax, y:ay, r:r, label:"ATK", color:"#1be6c5", fill:"#08251f" },
      { id:"skill0", x:ax-gap*1.28, y:ay-r*0.12, r:r*0.62, label:"1", color:"#ff8844", fill:"#2a0c04" },
      { id:"skill1", x:ax-gap*0.95, y:ay-gap*0.95, r:r*0.62, label:"2", color:"#44d0ff", fill:"#061a28" },
      { id:"skill2", x:ax-r*0.08, y:ay-gap*1.22, r:r*0.62, label:"3", color:"#cc77ff", fill:"#180824" },
      { id:"bag", x:stackX, y:stackStart, r:prof.portrait?19:22, label:"I", color:"#d6b65c", fill:"#20180a" },
      { id:"cam", x:stackX, y:stackStart + (prof.portrait?45:52), r:prof.portrait?19:22, label:"CAM", color:"#88ccff", fill:"#081622" },
      { id:"menu", x:stackX, y:stackStart + (prof.portrait?90:104), r:prof.portrait?19:22, label:"ESC", color:"#ffffff", fill:"#111111" },
      { id:"interact", x:prof.portrait ? W*0.5 : Math.max(W*0.42, ax-gap*2.35), y:H-prof.safeBottom-24, r:21, label:"E", color:"#ffdd66", fill:"#241a06" },
    ];
  }

  _hitMobileButton(x, y) {
    if (!this._isMobileLayout()) return null;
    return this._mobileButtons().find(b => Math.hypot(x-b.x, y-b.y) <= b.r + 7) || null;
  }

  _handleMobileButton(id) {
    if (id === "attack") { this.touch.holdAttack = true; this._mobileBasicAttack(); return; }
    if (id === "skill0") { this._useSkillBar(0); return; }
    if (id === "skill1") { this._useSkillBar(1); return; }
    if (id === "skill2") { this._useSkillBar(2); return; }
    if (id === "hp") { this._usePotion("hp"); return; }
    if (id === "mp") { this._usePotion("mp"); return; }
    if (id === "bag") { this.showInventory = !this.showInventory; return; }
    if (id === "cam") { this._cycleCamera(); return; }
    if (id === "interact") { this._interact(); return; }
    if (id === "menu") { this.paused = true; this.pauseTab = "save"; return; }
  }

  _mobileBasicAttack() {
    const p = this.player;
    let best = null, bestD = 320;
    const candidates = [...this.enemies.filter(e => !e.isDead && e.hp > 0)];
    if (this.boss && !this.boss.isDead && this.boss.hp > 0) candidates.push(this.boss);
    for (const e of candidates) {
      const d = Math.hypot(e.wx - p.wx, e.wy - p.wy);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) {
      p.angle = Math.atan2(best.wy - p.wy, best.wx - p.wx);
      this.attackTarget = best;
      const s = this._entityScreen(best.wx, best.wy, 0, 0);
      this._basicAttack(s.sx, s.sy);
      return;
    }
    const cx = this.canvas.width/2 + Math.cos(p.angle || 0) * 150;
    const cy = this.canvas.height/2 + Math.sin(p.angle || 0) * 90;
    this._basicAttack(cx, cy);
  }

  _cycleCamera() {
    // ISO (D2 classic) → TOP (overhead) → THIRD (Skyrim 3rd-person follow) → FPS (Skyrim 1st-person) → ISO
    const modes = ["iso","top","third","fps"];
    const labels = { iso:"ISO (D2 CLASSIC)", top:"TOP-DOWN", third:"3RD PERSON (SKYRIM)", fps:"1ST PERSON (VR-READY)" };
    const p = this.player;
    const keep = { wx:p.wx, wy:p.wy, angle:Number.isFinite(p.angle) ? p.angle : -Math.PI/2 };
    const i = modes.indexOf(this.camera);
    this.camera = modes[(i+1)%modes.length];
    p.wx = keep.wx;
    p.wy = keep.wy;
    p.angle = keep.angle;
    if (this.camera === "fps") {
      this.fpsPitch = Math.max(-0.28, Math.min(0.28, this.fpsPitch || this.cameraPitch || 0));
    } else if (!this.cameraLocked) {
      this.fpsPitch = 0;
    }
    this.moveTarget = null;
    this.attackTarget = null;
    this.mouseDown = false;
    this._cameraSnap = true;
    this._centerCamera();
    this._addFloat("📷 " + (labels[this.camera]||this.camera.toUpperCase()), this.canvas.width/2, 100, "#44ffaa", 110);
  }

  _clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  _gfxScale() {
    return ({ low:0.88, medium:1, high:1.16, ultra:1.34 })[this.quality] || 1;
  }

  _cameraZoomScale() {
    return this._clamp(Number.isFinite(this.cameraZoom) ? this.cameraZoom : 1, 0.56, 2.35);
  }

  _viewScale() {
    return this._gfxScale() * this._cameraZoomScale();
  }

  _setCameraZoom(zoom, announce=true) {
    this.cameraZoom = this._clamp(zoom, 0.56, 2.35);
    this._cameraSnap = true;
    this._centerCamera();
    if (announce) this._addFloat(`ZOOM ${Math.round(this.cameraZoom * 100)}%`, this.player.wx, this.player.wy-54, "#d6b65c", 55);
  }

  _rotateCamera(delta, announce=true) {
    this.cameraYaw = (this.cameraYaw || 0) + delta;
    while (this.cameraYaw > Math.PI) this.cameraYaw -= Math.PI * 2;
    while (this.cameraYaw < -Math.PI) this.cameraYaw += Math.PI * 2;
    this._cameraSnap = true;
    this._centerCamera();
    if (announce) this._addFloat(`ANGLE ${Math.round(this.cameraYaw * 180 / Math.PI)}deg`, this.player.wx, this.player.wy-54, "#88ccff", 55);
  }

  _setCameraPitch(pitch, announce=true) {
    this.cameraPitch = this._clamp(pitch, -0.55, 0.62);
    if (this.camera === "fps") this.fpsPitch = this._clamp(this.cameraPitch, -0.34, 0.34);
    this._cameraSnap = true;
    this._centerCamera();
    if (announce) this._addFloat(`PITCH ${Math.round(this.cameraPitch * 100)}`, this.player.wx, this.player.wy-54, "#aa88ff", 55);
  }

  _resetCameraRig() {
    this.cameraZoom = 1;
    this.cameraYaw = 0;
    this.cameraPitch = 0;
    this.fpsPitch = 0;
    this._cameraSnap = true;
    this._centerCamera();
    this._addFloat("CAMERA RESET", this.player.wx, this.player.wy-54, "#44ffaa", 65);
  }

  _toggleCameraLock() {
    this.cameraLocked = !this.cameraLocked;
    this._addFloat(this.cameraLocked ? "CAMERA LOCKED" : "CAMERA UNLOCKED", this.player.wx, this.player.wy-54, "#d6b65c", 70);
  }

  _loadMinimapState() {
    const fallback = { x:null, y:44, w:160, h:126, locked:false, alpha:0.78, mode:"small" };
    try {
      const saved = JSON.parse(localStorage.getItem("cryptic_realm_minimap_v1") || "null");
      return { ...fallback, ...(saved || {}) };
    } catch {
      return fallback;
    }
  }

  _saveMinimapState() {
    try { localStorage.setItem("cryptic_realm_minimap_v1", JSON.stringify(this.minimap)); } catch {}
  }

  _handleMinimapMouseDown(e) {
    const r = this.canvas.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    const mm = this.minimap || {};
    const w = mm.w || 160, h = mm.h || 126;
    const x = mm.x == null ? this.canvas.width - w - 10 : mm.x;
    const y = mm.y == null ? 44 : mm.y;
    if (cx < x || cx > x + w || cy < y || cy > y + 20) return false;
    if (cx > x + w - 42) {
      this.minimap.locked = !this.minimap.locked;
      this._saveMinimapState();
      this._addFloat(this.minimap.locked ? "MAP LOCKED" : "MAP UNLOCKED", cx, cy + 18, "#d6b65c", 70);
      return true;
    }
    if (!this.minimap.locked) this.dragMiniMap = { dx: cx - x, dy: cy - y };
    return true;
  }

  _isD2ArmoryActive() {
    return !!this.showDiabloGfxPanel;
  }

  _d2ArmoryUiImage(key) {
    return _crD2ArmoryImage("UI", CR_D2_ARMORY_UI[key]);
  }

  _d2ArmoryItemImage(item) {
    return _crD2ArmoryImage("items", _crD2ArmoryItemIconName(item));
  }

  _drawD2ArmoryPanelTexture(x,y,w,h,key,title="",accent=this.cls?.color || "#d6b65c") {
    const ctx = this.ctx;
    const img = this._d2ArmoryUiImage(key);
    ctx.save();
    const bg = ctx.createLinearGradient(x,y,x+w,y+h);
    bg.addColorStop(0,"rgba(22,13,7,0.98)");
    bg.addColorStop(0.5,"rgba(8,6,5,0.96)");
    bg.addColorStop(1,"rgba(0,0,0,0.98)");
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(x,y,w,h,10); ctx.fill();
    if (_crImageReady(img)) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(x+8,y+30,w-16,h-38,8); ctx.clip();
      ctx.globalAlpha = key === "stash" ? 0.54 : 0.62;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img,x+8,y+30,w-16,h-38);
      ctx.restore();
      ctx.fillStyle = "rgba(0,0,0,0.38)";
      ctx.fillRect(x+8,y+30,w-16,h-38);
    }
    ctx.strokeStyle = "#21140d"; ctx.lineWidth = 6; ctx.strokeRect(x+3,y+3,w-6,h-6);
    ctx.strokeStyle = "#8b5d2a"; ctx.lineWidth = 2; ctx.strokeRect(x+8,y+8,w-16,h-16);
    ctx.strokeStyle = accent; ctx.lineWidth = 1; ctx.strokeRect(x+12,y+12,w-24,h-24);
    if (title) {
      ctx.fillStyle = "#d6b65c";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(title, x+w/2, y+23);
      ctx.fillStyle = "#8b7d62";
      ctx.font = "8px monospace";
      ctx.fillText("KOOLO ARMORY SKIN", x+w/2, y+38);
    }
    ctx.restore();
    ctx.textAlign = "left";
  }

  _drawD2ArmoryPreview(x,y,w,h) {
    const ctx = this.ctx;
    if (w < 220 || h < 82) return;
    ctx.save();
    ctx.fillStyle = "rgba(5,3,2,0.78)";
    ctx.beginPath(); ctx.roundRect(x,y,w,h,10); ctx.fill();
    ctx.strokeStyle = "#8b5d2a"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#d6b65c"; ctx.font = "bold 11px monospace"; ctx.textAlign = "left";
    ctx.fillText("D2 ARMORY ASSET SKIN", x+12, y+18);
    ctx.fillStyle = "#a99c86"; ctx.font = "8px monospace";
    ctx.fillText("Inventory, stash, paperdoll and item icons from Koolo armory.", x+12, y+32);
    const cards = [
      ["equipment","PAPERDOLL"],
      ["inventory","BAG"],
      ["stash","STASH"],
      ["cube","CUBE"],
    ];
    const cardW = Math.max(44, Math.floor((w-28)/cards.length));
    cards.forEach(([key,label],i) => {
      const cx = x+12+i*cardW, cy = y+42, cw = cardW-8, ch = h-52;
      ctx.fillStyle = "rgba(0,0,0,0.58)";
      ctx.fillRect(cx,cy,cw,ch);
      const img = this._d2ArmoryUiImage(key);
      if (_crImageReady(img)) {
        ctx.save();
        ctx.globalAlpha = 0.82;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img,cx+3,cy+3,cw-6,ch-18);
        ctx.restore();
      }
      ctx.strokeStyle = "#4a3320"; ctx.strokeRect(cx,cy,cw,ch);
      ctx.fillStyle = "#d6b65c"; ctx.font = "7px monospace"; ctx.textAlign = "center";
      ctx.fillText(label,cx+cw/2,cy+ch-5);
    });
    ctx.restore();
    ctx.textAlign = "left";
  }

  _drawStonePanel(x,y,w,h,title="",accent=this.uiTheme.trim) {
    const ctx=this.ctx, t=this.uiTheme;
    const grd=ctx.createLinearGradient(x,y,x+w,y+h);
    grd.addColorStop(0,t.panel2); grd.addColorStop(0.5,t.panel); grd.addColorStop(1,"#080808");
    ctx.fillStyle=grd; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=t.trimDark; ctx.lineWidth=5; ctx.strokeRect(x+2,y+2,w-4,h-4);
    ctx.strokeStyle=accent; ctx.lineWidth=1; ctx.strokeRect(x+7,y+7,w-14,h-14);
    ctx.fillStyle="rgba(255,255,255,0.05)"; ctx.fillRect(x+10,y+10,w-20,18);
    if (title) {
      ctx.fillStyle=accent; ctx.font="bold 13px monospace"; ctx.textAlign="center";
      ctx.fillText(title, x+w/2, y+24);
    }
    ctx.textAlign="left";
  }

  _drawItemSlot(x,y,w,h,item=null,label="") {
    const ctx=this.ctx, t=this.uiTheme;
    if (this._isD2ArmoryActive()) {
      const accent = item?.runewordColor || item?.rarity?.color || "#6c6659";
      const img = item ? this._d2ArmoryItemImage(item) : null;
      ctx.save();
      const bg = ctx.createLinearGradient(x,y,x+w,y+h);
      bg.addColorStop(0,"rgba(24,17,12,0.98)");
      bg.addColorStop(0.45,"rgba(3,3,3,0.98)");
      bg.addColorStop(1,"rgba(18,11,7,0.98)");
      ctx.fillStyle = bg;
      ctx.fillRect(x,y,w,h);
      ctx.strokeStyle = accent;
      ctx.lineWidth = item ? 2 : 1;
      ctx.strokeRect(x,y,w,h);
      ctx.strokeStyle = "rgba(255,210,120,0.12)";
      ctx.strokeRect(x+2,y+2,Math.max(0,w-4),Math.max(0,h-4));
      if (label) {
        ctx.fillStyle = "#8b7d62";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(label,x+w/2,y+11);
      }
      if (item) {
        const iconPad = Math.max(4, Math.floor(Math.min(w,h) * 0.14));
        const topPad = label ? 13 : iconPad;
        const iconH = Math.max(10, h - topPad - 13);
        if (_crImageReady(img)) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img,x+iconPad,y+topPad,w-iconPad*2,iconH);
        } else {
          ctx.fillStyle = accent;
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.fillText(item.icon || "*", x+w/2, y+h/2+4);
        }
        ctx.fillStyle = "rgba(0,0,0,0.72)";
        ctx.fillRect(x+1,y+h-12,w-2,11);
        ctx.fillStyle = accent;
        ctx.font = "7px monospace";
        ctx.textAlign = "center";
        ctx.fillText(this._itemDisplayName(item).slice(0,10), x+w/2, y+h-4);
      }
      ctx.restore();
      ctx.textAlign = "left";
      return;
    }
    ctx.fillStyle=t.groove; ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=item ? item.rarity?.color || "#6c6659" : "#6c6659"; ctx.lineWidth=item ? 2 : 1; ctx.strokeRect(x,y,w,h);
    if (label) { ctx.fillStyle=t.muted; ctx.font="8px monospace"; ctx.textAlign="center"; ctx.fillText(label,x+w/2,y+11); }
    if (item) {
      ctx.fillStyle=item.rarity?.color || "#d8d1be"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
      ctx.fillText(item.icon || "*", x+w/2, y+h/2+3);
      ctx.font="7px monospace"; ctx.fillText(this._itemDisplayName(item).slice(0,10), x+w/2, y+h-5);
    }
    ctx.textAlign="left";
  }

  _drawGridSlots(x,y,cols,rows,cell,items=[]) {
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
      const i=r*cols+c;
      this._drawItemSlot(x+c*cell,y+r*cell,cell-2,cell-2,items[i]);
    }
  }

  _gridHoverItem(x,y,cols,rows,cell,items=[]) {
    const gx=Math.floor((this.mouseX-x)/cell), gy=Math.floor((this.mouseY-y)/cell);
    if(gx<0||gx>=cols||gy<0||gy>=rows)return null;
    return items[gy*cols+gx] || null;
  }

  _itemDetailLines(item) {
    if(!item) return [];
    if (item.identified === false) {
      return [
        this._itemDisplayName(item),
        "UNIDENTIFIED",
        "Free the Identifier, then talk to them",
        "or use an identify scroll later.",
      ];
    }
    const lines=[this._itemDisplayName(item)];
    if(item.rarity?.name) lines.push(item.rarity.name.toUpperCase());
    if(item.slot) lines.push(`Slot: ${item.slot.toUpperCase()}`);
    if(item.level) lines.push(`Required Lv ${item.level}`);
    if(item.dmgAdd) lines.push(`+${item.dmgAdd} Damage`);
    if(item.defAdd) lines.push(`+${item.defAdd} Defense`);
    if(item.hpAdd) lines.push(`+${item.hpAdd} Life`);
    if(item.mpAdd) lines.push(`+${item.mpAdd} Mana`);
    if(item.spdAdd) lines.push(`+${Math.round(item.spdAdd*100)}% Speed`);
    if(item.sockets) lines.push(`${item.sockets} open socket${item.sockets===1?"":"s"}`);
    if(item.runes?.length) lines.push(`Runes: ${item.runes.join(" + ").toUpperCase()}`);
    if(item.rune) lines.push(`Rune: ${item.rune.toUpperCase()}`);
    if(item.healHp) lines.push(`Restores ${item.healHp} HP`);
    if(item.healMp) lines.push(`Restores ${item.healMp} MP`);
    if(item.goldVal) lines.push(`Value: ${item.goldVal} gold`);
    return lines;
  }

  _drawItemTooltip(item,x,y,w=220) {
    const ctx=this.ctx;
    const lines=this._itemDetailLines(item);
    const h=22+lines.length*14;
    ctx.save();
    ctx.fillStyle="rgba(4,4,7,0.96)";
    ctx.strokeStyle=item.runewordColor || item.rarity?.color || "#d6b65c";
    ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(x,y,w,h,8); ctx.fill(); ctx.stroke();
    lines.forEach((line,i)=>{
      ctx.fillStyle=i===0 ? (item.runewordColor || item.rarity?.color || "#ffdd66") : i===1 ? "#9aaabd" : "#d8d1be";
      ctx.font=i===0 ? "bold 11px monospace" : "9px monospace";
      ctx.textAlign="left";
      ctx.fillText(String(line).slice(0,34),x+10,y+18+i*14);
    });
    ctx.restore();
  }

  _drawOrb(x,y,r,pct,fill,stroke,label,shadow) {
    const ctx=this.ctx;
    pct=Math.max(0,Math.min(1,pct||0));
    // shadow = deep-dark base color that matches the orb type
    const sh = shadow || "#150006";
    // Derive rim color from shadow (slightly lighter) and bg from shadow (very dark)
    const rimCol = stroke || sh;
    const emptyCol = sh.replace(/[0-9a-f]{2}(?=[0-9a-f]{2}[0-9a-f]{2}$)/i, "04") || "#060608";
    ctx.save();
    ctx.fillStyle=sh; ctx.beginPath(); ctx.arc(x,y,r+8,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#27201b"; ctx.lineWidth=7; ctx.stroke();
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.clip();
    const g=ctx.createRadialGradient(x-r*0.3,y-r*0.45,r*0.1,x,y,r);
    g.addColorStop(0,"#ffffff"); g.addColorStop(0.18,fill); g.addColorStop(1,sh);
    ctx.fillStyle="#060608"; ctx.fillRect(x-r,y-r,r*2,r*2);
    ctx.fillStyle=g; ctx.fillRect(x-r,y+r-(pct*r*2),r*2,pct*r*2);
    ctx.restore();
    ctx.strokeStyle=rimCol; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle="#f2ead3"; ctx.font="bold 10px monospace"; ctx.textAlign="center"; ctx.fillText(label,x,y+4);
    ctx.textAlign="left";
  }

  // Resolve skill-bar slot → class skill index (0/1/2). Returns -1 if slot is empty.
  _setPlayerCount(n) {
    this.playerCount = Math.max(1, Math.min(8, n|0));
    this.playerCountMult = 1 + (this.playerCount - 1) * 0.45;
    this._addFloat(`PLAYERS ${this.playerCount}`, this.player.wx, this.player.wy-46, "#ffdd00", 90);
  }

  _isCombatArea() {
    return this.screen === "wilderness" || this.screen === "dungeon" || this.screen === "boss";
  }

  _useSkillBar(slot) {
    const skIdx = this.skillBar[slot];
    if (skIdx == null) {
      this._addFloat(`Empty slot ${slot===9 ? 0 : slot+1}`, this.player.wx, this.player.wy-30, "#ff8800", 50);
      return;
    }
    this.rightSkill = skIdx;
    this.activeSkill = skIdx;
    this._useSkill(skIdx);
  }

  _centerCamera() {
    const W = this.canvas.width, H = this.canvas.height;
    const p = this.player;
    let tx=this.camX, ty=this.camY;
    if (this.camera === "iso" || this.camera === "third") {
      const raw = this._isoRaw(p.wx/this.TS, p.wy/this.TS);
      const pitch = this.cameraPitch || 0;
      const yOff = this.camera === "third" ? H*(0.18 + pitch*0.18) : H*pitch*0.08;
      tx = raw.x - W/2;
      ty = raw.y - H/2 + yOff;
    } else if (this.camera === "top") {
      tx = p.wx;
      ty = p.wy;
    }
    if (this._cameraSnap || this._frame < 3) {
      this.camX = tx; this.camY = ty; this._cameraSnap = false;
    } else {
      const follow = this.camera === "third" ? 0.16 : 0.24;
      this.camX += (tx - this.camX) * follow;
      this.camY += (ty - this.camY) * follow;
    }
  }

  _handleLeftClick(e) {
    const r = this.canvas.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    // Admin build mode — click places the selected palette item at the
    // tile under the cursor (Minecraft-style). Shift-click falls through
    // to combat so admins can still play with build mode on.
    if (this.isSuperAdmin && this.adminEditorEnabled && !e.shiftKey) {
      this._adminPlaceCurrentAtCursor(cx, cy);
      return;
    }
    if (this.showSkillTree)     { this._handleSkillTreeClick(cx, cy); return; }
    if (this.screen === "town") { this._handleTownClick(cx, cy); return; }
    if (!this._isCombatArea()) return;
    if (this.showInventory)     { this._handleInventoryClick(cx, cy); return; }
    if (this.questLog)          { this.questLog = false; return; }
    if (this.camera === "fps") {
      this.mouseX = cx; this.mouseY = cy; this.moveTarget = null; this.attackTarget = null;
      if (this.leftSkill !== "basic" && this.leftSkill != null) this._useSkill(this.leftSkill);
      else this._basicAttack(cx, cy);
      return;
    }
    if (e.shiftKey) {
      this.mouseX = cx; this.mouseY = cy; this.moveTarget = null; this.attackTarget = null;
      if (this.leftSkill !== "basic" && this.leftSkill != null) this._useSkill(this.leftSkill);
      else this._basicAttack(cx, cy);
      return;
    }
    // Convert click to world coords; attack if enemy under cursor, else move there
    const w = this._screenToWorld(cx, cy);
    const lootHit = this.loot.find(l => Math.hypot(l.wx - w.wx, l.wy - w.wy) < 34);
    if (lootHit) {
      if (Math.hypot(lootHit.wx - this.player.wx, lootHit.wy - this.player.wy) < 58) this._pickupLootById(lootHit.id);
      else this.moveTarget = { wx: lootHit.wx, wy: lootHit.wy, lootOnArrive: lootHit.id };
      this.attackTarget = null;
      return;
    }
    const statueHit = this._activeStatues().find(s => !s.found && Math.hypot(s.wx - w.wx, s.wy - w.wy) < 48);
    if (statueHit) {
      if (Math.hypot(statueHit.wx - this.player.wx, statueHit.wy - this.player.wy) < 76) this._useStatue(statueHit);
      else this.moveTarget = { wx: statueHit.wx, wy: statueHit.wy + 18, statueOnArrive: statueHit.id };
      this.attackTarget = null;
      return;
    }
    let tgt = null, tgtDist = 60;
    for (const en of this.enemies) {
      if (en.isDead) continue;
      const d = Math.hypot(en.wx - w.wx, en.wy - w.wy);
      if (d < tgtDist) { tgtDist = d; tgt = en; }
    }
    if (this.boss) {
      const d = Math.hypot(this.boss.wx - w.wx, this.boss.wy - w.wy);
      if (d < tgtDist+20) tgt = this.boss;
    }
    if (tgt) {
      this.attackTarget = tgt;
      this.moveTarget = null;
      this._basicAttack(cx, cy);
    } else {
      this.attackTarget = null;
      this.moveTarget = { wx: w.wx, wy: w.wy };
    }
  }

  _handleRightClick(e) {
    const r = this.canvas.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    // Admin build mode — right-click erases the placed asset under
    // the cursor (Minecraft-style remove).
    if (this.isSuperAdmin && this.adminEditorEnabled) {
      this._adminEraseAtCursor(cx, cy);
      return;
    }
    if (!this._isCombatArea()) return;
    // Use currently active skill aimed at click position
    this.mouseX = cx; this.mouseY = cy;
      this._useSkill(this.rightSkill ?? this.activeSkill);
  }

  _handleTownClick(cx, cy) {
    const W = this.canvas.width, H = this.canvas.height;
    // Panels intercept all clicks
    if (this.showShop)      { this._handleShopClick(cx,cy); return; }
    if (this.showMercPanel) { this._handleMercClick(cx,cy); return; }
    if (this.showStash)     { this._handleStashClick(cx,cy); return; }
    if (this.showForge)     { this._handleForgeClick(cx,cy); return; }
    if (this.showSkinPanel) { this._handleSkinClick(cx,cy); return; }
    if (this.showWaypointPanel) { this._handleWaypointClick(cx,cy); return; }
    if (this.showInventory) { this._handleInventoryClick(cx,cy); return; }
    if (this.currentBuilding) {
      // Check service button clicks
      const rects = this._interiorBtnRects || [];
      const hit = rects.find(r => cx>=r.x && cx<=r.x+r.w && cy>=r.y && cy<=r.y+r.h);
      if (hit) {
        this._playSfx("menuSelect");
        const label = hit.label.toLowerCase();
        if (label==="leave" || label==="exit") { this.currentBuilding = null; this.mouseDown=false; this.moveTarget=null; return; }
        if (label.startsWith("smash:")) {
          const smashId = hit.smashId || label.slice(6);
          if (!this.smashedTownProps) this.smashedTownProps = new Set();
          this.smashedTownProps.add(smashId);
          const goldDrop = 5 + Math.floor(Math.random()*22);
          this.player.gold = (this.player.gold||0) + goldDrop;
          this._addFloat(`+${goldDrop}💰`, this.player.wx, this.player.wy-50, "#ffd24a", 90);
          this._playSfx("hit");
          // 30% chance to drop a lore scroll that adds flavor to the world
          if (Math.random() < 0.30) {
            const loreDrops = [
              "Ancient scroll: 'The well whispers at midnight...'",
              "Torn note: 'They say the blacksmith forged a blade that cuts time itself.'",
              "Faded letter: 'Meet me where the cow level opens... if you dare.'",
              "Crumpled page: 'The church basement holds secrets older than the town.'",
              "Stained parchment: 'Gold flows to those who smash first, ask never.'",
            ];
            const lore = loreDrops[Math.floor(Math.random() * loreDrops.length)];
            this._addFloat("📜 LORE", this.player.wx, this.player.wy-70, "#aaddff", 120);
            if (!this._loreScrollsFound) this._loreScrollsFound = [];
            this._loreScrollsFound.push({ text: lore, foundAt: Date.now() });
            setTimeout(() => this._addFloat(lore.slice(0, 40) + "...", this.player.wx, this.player.wy-90, "#ddeeff", 180), 800);
          }
          return;
        }
        this._addFloat(hit.label.toUpperCase(), this.player.wx, this.player.wy-54, "#d6b65c", 80);
        // Open relevant panel
        const svcLower = hit.label.toLowerCase();
        if (svcLower.includes("trade")||svcLower.includes("supplies")||svcLower.includes("buy")) this.showShop=true;
        else if (svcLower.includes("repair")||svcLower.includes("forge")||svcLower.includes("socket")) this.showForge=true;
        else if (svcLower.includes("stash")) this.showStash=true;
        else if (svcLower.includes("heal")||svcLower.includes("bless")) { this.player.hp=this.player.maxHp; this.player.mp=this.player.maxMp; this._addFloat("RESTORED",this.player.wx,this.player.wy-40,"#44ff88",70); }
        else if (svcLower.includes("identify")||svcLower.includes("search")||svcLower.includes("bag")) this.showInventory=true;
        else if (svcLower.includes("recruit")||svcLower.includes("merc")||svcLower.includes("hire")||svcLower.includes("gossip")) this.showMercPanel=true;
        else if (svcLower.includes("cards")) this._playInteriorMiniGame("cards");
        else if (svcLower.includes("dice") || svcLower.includes("gamble")) this._playInteriorMiniGame("dice");
        else if (svcLower.includes("target") || svcLower.includes("bow") || svcLower.includes("dexterity")) this._playInteriorMiniGame("target");
        else if (svcLower.includes("drill") || svcLower.includes("practice") || svcLower.includes("train") || svcLower.includes("combat rhythm") || svcLower.includes("wave drill")) this._playInteriorMiniGame("drill");
        else if (svcLower.includes("fishing")) this._playInteriorMiniGame("fishing");
        else if (svcLower.includes("wall") || svcLower.includes("siege") || svcLower.includes("patrol") || svcLower.includes("guard post") || svcLower.includes("signal") || svcLower.includes("watch")) this._playInteriorMiniGame("siege");
        else if (svcLower.includes("arena") || svcLower.includes("champion") || svcLower.includes("pit") || svcLower.includes("fight")) this._playInteriorMiniGame("arena");
        else if (svcLower.includes("brawl") || svcLower.includes("tavern fight") || svcLower.includes("rumble")) this._playInteriorMiniGame("brawl");
      } else if (cy > this.canvas.height * 0.75) {
        // Bottom area click → exit (D2-style: click near door to leave)
        this.currentBuilding = null;
        this.mouseDown = false; this.moveTarget = null;
      } else {
        const cell = this._interiorCellFromScreen(cx, cy);
        if (cell) {
          this.currentBuilding.heroCol = cell.col;
          this.currentBuilding.heroRow = cell.row;
          this.currentBuilding.notice = "Walking interior floor";
          this._playSfx("step");
        }
      }
      return;
    }

    // World-space click: NPC proximity, portal, or click-to-move
    const w = this._screenToWorld(cx, cy);

    // Cow Level Easter egg: click fountain 5 times
    const TS = 48;
    const fountainWx = Math.floor(this.town.W / 2) * TS;
    const fountainWy = Math.floor(this.town.H / 2) * TS;
    if (Math.hypot(w.wx - fountainWx, w.wy - fountainWy) < 72) {
      this._fountainClicks = (this._fountainClicks || 0) + 1;
      if (this._fountainClicks >= 5 && !this._cowPortalActive) {
        this._cowPortalActive = true;
        this._cowPortalWx = fountainWx + 96;
        this._cowPortalWy = fountainWy + 16;
        this._addFloat("🐄 A STRANGE RIFT OPENS...", fountainWx, fountainWy - 60, "#44ff88", 180);
      } else if (this._fountainClicks < 5) {
        this._addFloat(`${5 - this._fountainClicks} more...`, fountainWx, fountainWy - 44, "#88ffcc", 80);
      }
      return;
    }

    // Dark Wanderer click
    if (this.darkWanderer) {
      const dw = this.darkWanderer;
      if (Math.hypot(dw.wx - w.wx, dw.wy - w.wy) < 56) {
        const line = CR_WANDERER_DIALOGUES[Math.floor(Math.random() * CR_WANDERER_DIALOGUES.length)];
        this._addFloat(line, dw.wx, dw.wy - 70, "#8866aa", 180);
        dw.timer = Math.min(dw.timer, 120);
        return;
      }
    }

    const statueHit = this._activeStatues().find(s => !s.found && Math.hypot(s.wx - w.wx, s.wy - w.wy) < 48);
    if (statueHit) {
      if (Math.hypot(statueHit.wx - this.player.wx, statueHit.wy - this.player.wy) < 76) this._useStatue(statueHit);
      else this.moveTarget = { wx: statueHit.wx, wy: statueHit.wy + 18, statueOnArrive: statueHit.id };
      return;
    }
    // Find nearest NPC at click point
    let npc = null, npcDist = 60;
    for (const n of this.town.npcs) {
      const d = Math.hypot(n.wx - w.wx, n.wy - w.wy);
      if (d < npcDist) { npcDist = d; npc = n; }
    }
    if (npc) {
      const playerDist = Math.hypot(npc.wx - this.player.wx, npc.wy - this.player.wy);
      if (playerDist < 80) {
        this._activateTownNpc(npc);
      } else {
        // Walk toward the NPC, then auto-activate when close
        this.moveTarget = { wx: npc.wx - 24, wy: npc.wy + 8, npcOnArrive: npc.type };
      }
      return;
    }
    const building = this._nearestTownBuildingTo(w.wx, w.wy, 54);
    if (building) {
      if (Math.hypot(building.wx - this.player.wx, building.wy - this.player.wy) < 96) this._enterTownBuilding(building);
      else this.moveTarget = { wx:building.wx, wy:building.wy + 18, buildingOnArrive:building.bid };
      return;
    }
    const smash = this._nearestTownBreakableTo(w.wx, w.wy, 44);
    if (smash) {
      if (Math.hypot(smash.wx - this.player.wx, smash.wy - this.player.wy) < 78) this._smashTownProp(smash);
      else this.moveTarget = { wx:smash.wx, wy:smash.wy + 10, smashOnArrive:smash.id };
      return;
    }
    // Portal click: walk to it
    const pwx=this.town.portalWx, pwy=this.town.portalWy;
    const dp = Math.hypot(pwx - w.wx, pwy - w.wy);
    if (dp < 50) { this.moveTarget = { wx: pwx, wy: pwy }; return; }
    const ewx=this.town.exitWx, ewy=this.town.exitWy;
    const de = Math.hypot(ewx - w.wx, ewy - w.wy);
    if (de < 70) { this.moveTarget = { wx: ewx, wy: ewy }; return; }
    // Otherwise: click-to-move to that ground position
    if (this.camera === "fps") return;
    this.moveTarget = { wx: w.wx, wy: w.wy };
  }

  // Pick the per-NPC greeting line, with optional act flavor appended on first
  // talk per session. Subsequent activations skip the flavor suffix so the
  // bubble stays terse for repeat customers.
  _npcGreeting(npc) {
    if (!npc) return "";
    const dlg = CR_NPC_DIALOGUES[npc.type];
    if (!dlg) return npc.name || "...";
    if (!this._npcTalkSeen) this._npcTalkSeen = new Set();
    const key = npc.type;
    const firstTalk = !this._npcTalkSeen.has(key);
    this._npcTalkSeen.add(key);
    const flavor = firstTalk ? (CR_NPC_ACT_FLAVOR[this.actIdx] || "") : "";
    return dlg.greet + flavor;
  }
  // Cycling ambient line — same NPC alternates through its pool every ~5s
  _npcAmbientLine(npc) {
    if (!npc) return "";
    const dlg = CR_NPC_DIALOGUES[npc.type];
    if (!dlg || !dlg.ambient || !dlg.ambient.length) return "";
    // Stagger cycle by NPC tx so adjacent NPCs aren't synchronized
    const period = 300; // ~5s at 60fps
    const idx = Math.floor((this._frame + (npc.tx||0)*47 + (npc.ty||0)*13) / period) % dlg.ambient.length;
    return dlg.ambient[idx];
  }

  _activateTownNpc(npc) {
    if (!npc) return;
    // Speak first — gives the NPC personality before the panel opens
    const greet = this._npcGreeting(npc);
    if (greet) this._addFloat(greet, npc.wx, npc.wy - 60, npc.color || "#e8dfc2", 130);
    if (npc.action === "heal") {
      this.player.hp = this.player.maxHp; this.player.mp = this.player.maxMp;
      this._addFloat("✨ FULLY HEALED", this.player.wx, this.player.wy-30, "#44ff88", 80);
      // Deckard Cain Easter egg: 10th visit unlocks classic quote; subsequent visits cycle lore
      this._healerTalkCount = (this._healerTalkCount || 0) + 1;
      if (this._healerTalkCount === 10) {
        setTimeout(() => this._addFloat("Stay a while and listen...", npc.wx, npc.wy - 90, "#d6b65c", 220), 400);
      } else if (this._healerTalkCount > 10) {
        const q = CR_CAIN_QUOTES[(this._healerTalkCount - 10) % CR_CAIN_QUOTES.length];
        setTimeout(() => this._addFloat(q, npc.wx, npc.wy - 90, "#d6b65c", 200), 400);
      }
    } else if (npc.action === "merc")  this.showMercPanel = true;
    else if (npc.action === "stash") this.showStash = true;
    else if (npc.action === "shop")  this.showShop  = true;
    else if (npc.action === "forge") this.showForge = true;
    else if (npc.action === "waypoint") this.showWaypointPanel = true;
    else if (npc.action === "bard") {
      this._playBardTune();
      this._addFloat("THE BARD PLAYS THE CAMP SONG", npc.wx, npc.wy-50, "#ffcc88", 120);
    }
    else if (npc.action === "bless") {
      this.player.buffDef = Math.max(this.player.buffDef || 1, 1.15);
      this.player.buffTimer = Math.max(this.player.buffTimer || 0, 240);
      this._addFloat("MONK BLESSING", npc.wx, npc.wy-50, "#ffe0a0", 120);
      this._playSfx("loot");
    }
    else if (npc.action === "identify") {
      if (!this.identifierFreed) {
        this.identifierFreed = true;
        this.quests.forEach(q=>{ if(!q.complete && q.type==="identifier"){ q.done=1; this._completeQuest(q); } });
        this._addFloat("IDENTIFIER FREED", this.player.wx, this.player.wy-44, "#d6b65c", 100);
      }
      this._identifyInventory(true);
    }
    else if (npc.action === "skin")  this.showSkinPanel = true;
  }

  _nearestTownBuildingTo(wx, wy, maxDist = 96) {
    const map = this.town?.map;
    if (!map?.[0]) return null;
    const COLS = map[0].length, ROWS = map.length;
    let best=null, bestD=maxDist;
    for (const cl of this._townBuildingClusters(COLS, ROWS)) {
      const bx=cl.tx*this.TS+this.TS/2, by=cl.ty*this.TS+this.TS/2;
      const d=Math.hypot(bx-wx, by-wy);
      if (d<bestD) { bestD=d; best={...cl,wx:bx,wy:by}; }
    }
    return best;
  }

  _townBreakables() {
    const spots = [
      {tx:5,ty:7,type:"barrel"},{tx:11,ty:7,type:"barrel"},{tx:18,ty:7,type:"barrel"},
      {tx:5,ty:this.town.map.length-7,type:"barrel"},{tx:18,ty:this.town.map.length-7,type:"barrel"},
      {tx:24,ty:this.town.map.length-7,type:"crate"},
    ];
    return spots.map((s,i)=>({
      ...s,
      id:`town_${this.actIdx}_${s.type}_${i}`,
      wx:s.tx*this.TS+this.TS/2,
      wy:s.ty*this.TS+this.TS/2,
    })).filter(s=>!this.smashedTownProps?.has?.(s.id));
  }

  _nearestTownBreakableTo(wx, wy, maxDist = 58) {
    let best=null, bestD=maxDist;
    for (const b of this._townBreakables()) {
      const d=Math.hypot(b.wx-wx,b.wy-wy);
      if (d<bestD) { bestD=d; best=b; }
    }
    return best;
  }

  _smashTownProp(prop) {
    if (!prop || this.smashedTownProps?.has?.(prop.id)) return false;
    this.smashedTownProps.add(prop.id);
    this._addFloat(prop.type === "crate" ? "CRATE SMASHED" : "BARREL SMASHED", prop.wx, prop.wy-34, "#d6b65c", 80);
    this._playSfx("smash");
    if (Math.random() < 0.72) this._dropLoot(prop.wx + Math.random()*24-12, prop.wy + Math.random()*24-12, Math.max(1,this.actIdx+1));
    for (let i=0;i<10;i++) this.particles.push({wx:prop.wx,wy:prop.wy,vx:(Math.random()-0.5)*3,vy:-Math.random()*2,life:24,size:2+Math.random()*2,color:"#8a5a30"});
    return true;
  }

  _interiorLayout(W = this.canvas?.width || 1280, H = this.canvas?.height || 720) {
    const mobile = this._isMobileLayout(W, H);
    const COLS = mobile ? 5 : 9;
    const ROWS = mobile ? 4 : 7;
    const titleH = mobile ? 44 : 56;
    const bottomRsv = mobile ? 180 : 230;
    const wallScale = mobile ? 2.6 : 3.0;
    const availH = H - titleH - bottomRsv;
    const isoSpanW = (COLS - 1 + ROWS - 1);
    let TW = Math.floor((W * 0.78) / isoSpanW * 2);
    let TH = Math.floor(TW * 0.52);
    const stackH = (wallScale * 0.72 + (COLS + ROWS - 2) * 0.5 + 0.6) * TH;
    if (stackH > availH) {
      const shrink = availH / stackH;
      TH = Math.max(28, Math.floor(TH * shrink));
      TW = Math.floor(TH / 0.52);
    }
    const isoH = (COLS + ROWS - 2) * TH * 0.5;
    const wallHpx = wallScale * 0.72 * TH;
    const originX = W * 0.5 - (COLS - ROWS) * TW * 0.25;
    const visMid = (titleH + 8 + (H - bottomRsv)) / 2;
    const originY = Math.max(titleH + 8 + wallHpx, visMid - isoH / 2);
    return {
      mobile, COLS, ROWS, TW, TH, wallScale, originX, originY,
      toIso: (col, row) => ({
        x: originX + (col - row) * TW * 0.5,
        y: originY + (col + row) * TH * 0.5,
      }),
    };
  }

  _interiorCellFromScreen(cx, cy) {
    if (!this.currentBuilding) return null;
    const { COLS, ROWS, TW, TH, originX, originY } = this._interiorLayout();
    const a = (cx - originX) / (TW * 0.5);
    const b = (cy - originY) / (TH * 0.5);
    const col = Math.round((a + b) / 2);
    const row = Math.round((b - a) / 2);
    if (col < 1 || row < 1 || col > COLS - 2 || row > ROWS - 2) return null;
    return { col, row };
  }

  _playInteriorMiniGame(kind) {
    const names = {
      cards:"CARD ARENA",
      dice:"DICE PARLOR",
      target:"TARGET RANGE",
      drill:"COMBAT DRILL",
      fishing:"DEEP WATERS",
      siege:"SIEGE DEFENSE",
      arena:"ARENA COMBAT",
      brawl:"BRAWL ALLEY",
    };
    
    // Create overlay canvas for mini-game
    if (this._miniGameOverlay) {
      this._miniGameOverlay.canvas.remove();
      this._miniGameOverlay.game = null;
    }
    
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;";
    
    const title = document.createElement("div");
    title.textContent = names[kind] || "MINI GAME";
    title.style.cssText = "color:#ffdd66;font-size:24px;font-weight:900;margin-bottom:12px;text-shadow:0 0 12px #ff8800;letter-spacing:2px;";
    overlay.appendChild(title);
    
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.cssText = "border:3px solid #ffdd66;box-shadow:0 0 24px #ff8800;";
    overlay.appendChild(canvas);
    
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ CLOSE & RETURN";
    closeBtn.style.cssText = "margin-top:16px;padding:12px 32px;background:#cc44ff;color:white;border:none;border-radius:8px;font-weight:900;cursor:pointer;font-size:14px;";
    closeBtn.onclick = () => this._closeMiniGame(kind);
    overlay.appendChild(closeBtn);
    
    document.body.appendChild(overlay);
    
    // Add siege defense click-to-place-tower handler
    if (kind === "siege") {
      canvas.addEventListener("click", (e) => {
        if (!this._miniGameOverlay || !this._miniGameOverlay.game) return;
        const g = this._miniGameOverlay.game;
        if (g.gold >= 50) {
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left, y = e.clientY - rect.top;
          g.towers.push({ x, y, cooldown: 0 });
          g.gold -= 50;
        }
      });
    }
    
    // Instantiate game class
    let game = null;
    try {
      if (kind === "fishing") game = new FishingGame(canvas, this.quality || "medium");
      else if (kind === "cards") game = new CardGame(canvas, this.quality || "medium");
      else if (kind === "dice") game = new DiceGame(canvas, this.quality || "medium");
      else if (kind === "target") game = new TargetGame(canvas, this.quality || "medium");
      else if (kind === "drill") game = new DrillGame(canvas, this.quality || "medium");
      else if (kind === "siege") game = this._createSiegeDefenseGame(canvas);
      else if (kind === "arena") game = this._createArenaCombatGame(canvas);
      else if (kind === "brawl") game = this._createBrawlAlleyGame(canvas);
    } catch (e) {
      console.error("[CrypticRealm] Mini-game init failed:", e);
    }
    
    this._miniGameOverlay = { overlay, canvas, game, kind };
    this.paused = true;
    
    // Start game loop
    if (game) {
      const loop = () => {
        if (!this._miniGameOverlay || this._miniGameOverlay.game !== game) return;
        game.update();
        game.draw();
        if (game.gameOver) {
          setTimeout(() => this._closeMiniGame(kind, game.score || 0), 1500);
          return;
        }
        this._miniGameRaf = requestAnimationFrame(loop);
      };
      this._miniGameRaf = requestAnimationFrame(loop);
    }
  }
  
  _createSiegeDefenseGame(canvas) {
    // White-label Starguard → Cryptic Realm tower defense
    // Demon hordes attack town walls, player places defensive towers
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    return {
      score: 0, wave: 1, enemies: [], towers: [], bullets: [], gameOver: false,
      gold: 200, lives: 20, spawnTimer: 0,
      update() {
        if (this.gameOver) return;
        // Spawn demon wave
        this.spawnTimer++;
        if (this.spawnTimer > 120 - this.wave * 5) {
          this.spawnTimer = 0;
          this.enemies.push({ x: -20, y: 100 + Math.random() * 400, hp: 3 + this.wave, speed: 0.5 + this.wave * 0.1, color: "#ff2200" });
        }
        // Move enemies
        this.enemies.forEach(e => { e.x += e.speed; if (e.x > W) { this.lives--; e.hp = 0; } });
        this.enemies = this.enemies.filter(e => e.hp > 0);
        // Tower shooting
        this.towers.forEach(t => {
          t.cooldown--;
          if (t.cooldown <= 0 && this.enemies.length > 0) {
            const target = this.enemies[0];
            this.bullets.push({ x: t.x, y: t.y, tx: target.x, ty: target.y, speed: 5 });
            t.cooldown = 60;
          }
        });
        // Move bullets
        this.bullets.forEach(b => {
          const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.sqrt(dx*dx + dy*dy);
          if (d < 10) { this.enemies.forEach(e => { if (Math.abs(e.x-b.x)<20 && Math.abs(e.y-b.y)<20) { e.hp--; this.score += 10; } }); b.hit = true; }
          else { b.x += (dx/d) * b.speed; b.y += (dy/d) * b.speed; }
        });
        this.bullets = this.bullets.filter(b => !b.hit);
        if (this.lives <= 0) this.gameOver = true;
        if (this.enemies.length === 0 && this.spawnTimer > 60) { this.wave++; this.gold += 50; this.spawnTimer = 0; }
      },
      draw() {
        ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, W, H);
        // Draw path
        ctx.strokeStyle = "#444"; ctx.lineWidth = 40; ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
        // Draw enemies
        this.enemies.forEach(e => { ctx.fillStyle = e.color; ctx.fillRect(e.x-10, e.y-10, 20, 20); });
        // Draw towers
        this.towers.forEach(t => { ctx.fillStyle = "#4488ff"; ctx.fillRect(t.x-8, t.y-8, 16, 16); });
        // Draw bullets
        this.bullets.forEach(b => { ctx.fillStyle = "#ffdd66"; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI*2); ctx.fill(); });
        // HUD
        ctx.fillStyle = "#ffdd66"; ctx.font = "bold 16px monospace";
        ctx.fillText(`WAVE ${this.wave}  GOLD ${this.gold}  LIVES ${this.lives}  SCORE ${this.score}`, 20, 30);
        ctx.fillText("Click to place tower (50g)", 20, H - 20);
        if (this.gameOver) { ctx.fillStyle = "#ff2200"; ctx.font = "bold 48px monospace"; ctx.fillText("WALLS BREACHED", W/2-120, H/2); }
      }
    };
  }
  
  _createArenaCombatGame(canvas) {
    // White-label Galaxy Kombat → Cryptic Realm arena fighter
    // 1v1 combat against demon champion
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    return {
      score: 0, player: { x: 200, y: 400, hp: 100, attacking: false, atkTimer: 0 },
      enemy: { x: 600, y: 400, hp: 100, attacking: false, atkTimer: 0, ai: 0 },
      gameOver: false, winner: null,
      update() {
        if (this.gameOver) return;
        // Player attack cooldown
        if (this.player.atkTimer > 0) this.player.atkTimer--;
        if (this.enemy.atkTimer > 0) this.enemy.atkTimer--;
        // Enemy AI
        this.enemy.ai++;
        if (this.enemy.ai > 90 && this.enemy.atkTimer === 0) {
          this.enemy.attacking = true;
          this.enemy.atkTimer = 30;
          const dist = Math.abs(this.player.x - this.enemy.x);
          if (dist < 80) { this.player.hp -= 8; this.score -= 5; }
          this.enemy.ai = 0;
        }
        if (this.enemy.atkTimer <= 20) this.enemy.attacking = false;
        // Check game over
        if (this.player.hp <= 0) { this.gameOver = true; this.winner = "enemy"; }
        if (this.enemy.hp <= 0) { this.gameOver = true; this.winner = "player"; this.score += 100; }
      },
      draw() {
        ctx.fillStyle = "#2a1a3e"; ctx.fillRect(0, 0, W, H);
        // Arena floor
        ctx.fillStyle = "#444"; ctx.fillRect(0, H-100, W, 100);
        // Draw fighters
        ctx.fillStyle = "#4488ff"; ctx.fillRect(this.player.x-20, this.player.y-40, 40, 80);
        ctx.fillStyle = "#ff2200"; ctx.fillRect(this.enemy.x-20, this.enemy.y-40, 40, 80);
        // Attack effects
        if (this.player.attacking) { ctx.fillStyle = "#ffdd66"; ctx.fillRect(this.player.x+20, this.player.y-20, 40, 20); }
        if (this.enemy.attacking) { ctx.fillStyle = "#ffdd66"; ctx.fillRect(this.enemy.x-60, this.enemy.y-20, 40, 20); }
        // HP bars
        ctx.fillStyle = "#44ff88"; ctx.fillRect(this.player.x-30, this.player.y-60, 60 * (this.player.hp/100), 8);
        ctx.fillStyle = "#ff4444"; ctx.fillRect(this.enemy.x-30, this.enemy.y-60, 60 * (this.enemy.hp/100), 8);
        // HUD
        ctx.fillStyle = "#ffdd66"; ctx.font = "bold 20px monospace";
        ctx.fillText("ARENA COMBAT - Defeat the Demon Champion", 150, 40);
        ctx.fillText("Press SPACE to attack (when close)", 200, H-40);
        if (this.gameOver) {
          ctx.fillStyle = this.winner === "player" ? "#44ff88" : "#ff2200";
          ctx.font = "bold 48px monospace";
          ctx.fillText(this.winner === "player" ? "VICTORY!" : "DEFEATED", W/2-80, H/2);
        }
      }
    };
  }
  
  _createBrawlAlleyGame(canvas) {
    // White-label Street Comix → Cryptic Realm tavern brawl
    // Wave-based brawler against drunk patrons
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    return {
      score: 0, wave: 1, player: { x: 400, y: 400, hp: 100, attacking: false, atkTimer: 0 },
      enemies: [], gameOver: false, spawnTimer: 0,
      update() {
        if (this.gameOver) return;
        if (this.player.atkTimer > 0) this.player.atkTimer--;
        // Spawn enemies
        this.spawnTimer++;
        if (this.spawnTimer > 180 - this.wave * 10 && this.enemies.length < 3 + this.wave) {
          this.spawnTimer = 0;
          this.enemies.push({ x: Math.random() * W, y: 200 + Math.random() * 200, hp: 2 + this.wave, attacking: false, atkTimer: 0 });
        }
        // Enemy AI
        this.enemies.forEach(e => {
          const dx = this.player.x - e.x, dy = this.player.y - e.y, d = Math.sqrt(dx*dx + dy*dy);
          if (d > 40) { e.x += (dx/d) * 1.2; e.y += (dy/d) * 1.2; }
          if (e.atkTimer > 0) e.atkTimer--;
          if (d < 50 && e.atkTimer === 0) { this.player.hp -= 3; e.attacking = true; e.atkTimer = 45; }
          if (e.atkTimer <= 35) e.attacking = false;
        });
        // Check game over
        if (this.player.hp <= 0) this.gameOver = true;
        // Wave clear
        if (this.enemies.length === 0 && this.spawnTimer > 60) { this.wave++; this.score += 50; this.player.hp = Math.min(100, this.player.hp + 20); }
      },
      draw() {
        ctx.fillStyle = "#3a2a1e"; ctx.fillRect(0, 0, W, H);
        // Tavern floor
        ctx.fillStyle = "#554433"; ctx.fillRect(0, H-150, W, 150);
        // Draw player
        ctx.fillStyle = "#4488ff"; ctx.fillRect(this.player.x-15, this.player.y-30, 30, 60);
        // Draw enemies
        this.enemies.forEach(e => {
          ctx.fillStyle = e.attacking ? "#ffaa22" : "#aa4422";
          ctx.fillRect(e.x-12, e.y-25, 24, 50);
        });
        // HUD
        ctx.fillStyle = "#ffdd66"; ctx.font = "bold 16px monospace";
        ctx.fillText(`WAVE ${this.wave}  HP ${this.player.hp}  SCORE ${this.score}`, 20, 30);
        ctx.fillText("WASD move - SPACE attack", 20, H-20);
        if (this.gameOver) { ctx.fillStyle = "#ff2200"; ctx.font = "bold 48px monospace"; ctx.fillText("KNOCKED OUT", W/2-100, H/2); }
      }
    };
  }
  
  _closeMiniGame(kind, score = 0) {
    if (this._miniGameRaf) cancelAnimationFrame(this._miniGameRaf);
    if (this._miniGameOverlay) {
      this._miniGameOverlay.overlay.remove();
      this._miniGameOverlay = null;
    }
    this.paused = false;
    
    // Award rewards based on score and game type
    const baseRewards = { cards:7, dice:12, target:5, drill:6, fishing:9, siege:15, arena:20, brawl:18 };
    const baseGold = baseRewards[kind] || 5;
    const scoreBonus = Math.floor((score || 0) / 10);
    const totalGold = baseGold + scoreBonus;
    const xpGain = (kind === "drill" || kind === "target" || kind === "arena" || kind === "brawl") ? totalGold * 2 : 0;
    
    this.player.gold = (this.player.gold || 0) + totalGold;
    if (xpGain > 0) this.player.xp = (this.player.xp || 0) + xpGain;
    
    const names = { cards:"Card Arena", dice:"Dice Parlor", target:"Target Range", drill:"Combat Drill", fishing:"Deep Waters", siege:"Siege Defense", arena:"Arena Combat", brawl:"Brawl Alley" };
    const msg = `${names[kind] || "Activity"}: +${totalGold} gold${xpGain > 0 ? `, +${xpGain} XP` : ""}${score > 0 ? ` (Score: ${score})` : ""}`;
    this.currentBuilding.notice = msg;
    this._addFloat(msg.toUpperCase(), this.player.wx, this.player.wy - 62, "#ffdd66", 110);
    this._playSfx("loot");
  }

  _enterTownBuilding(building) {
    const services = {
      blacksmith:["Repair gear","Forge sockets","Buy martial weapons","Smithing timing game"],
      market:["Trade supplies","Gamble curios","Dice table","Hear local rumors"],
      tavern:["Play monster cards","Dice table","Rest bonus","Mercenary gossip","Tavern brawl"],
      church:["Blessing","Identify relics","Cathedral lore"],
      barracks:["Train skill drills","Recruit guards","Practice combat","Wave drill","Arena combat"],
      archeryrange:["Bow drills","Target range","Dexterity trainer","Ranger contracts"],
      home_a:["Search shelves","Talk to townsfolk","Hidden stash"],
      home_b:["Search cellar","Talk to townsfolk","Hidden stash"],
      tower_a:["Waypoint charts","Scout reports","Watch duty","Wall patrol"],
      tower_b:["Guard post","Signal torch","Wall patrol","Siege defense"],
      windmill:["Food stores","Hidden barrel","Farmer's rumor"],
      well:["Drink","Fishing mini game","Listen below","Secret reflection"],
    };
    const rawSvc = services[building.bid] || ["Talk","Search"];
    this.currentBuilding = {
      ...building,
      title:building.bid.replace(/_/g," ").toUpperCase(),
      services:[...rawSvc, "Leave"],   // always have Leave as last option
      enteredAt:Date.now(),
      heroCol:4,
      heroRow:5,
      notice:"Click the room floor to walk around.",
    };
    this.mouseDown=false; this.moveTarget=null;
    this._playSfx("door");
    this._addFloat(`ENTERED ${this.currentBuilding.title}`, this.player.wx, this.player.wy-54, "#d6b65c", 100);
  }

  _handleWaypointClick(cx,cy) {
    const W=this.canvas.width,H=this.canvas.height;
    const mobile=W<760||H<620;
    const PW=Math.min(W-24,mobile?520:720), PH=Math.min(H-80,mobile?H-48:520);
    const PX=W/2-PW/2, PY=mobile?24:H*0.12;
    if(cx>PX+PW-88&&cx<PX+PW-10&&cy>PY+8&&cy<PY+34){this.showWaypointPanel=false;return;}
    const hit = (this.waypointRects || []).find(r => cx>=r.x && cx<=r.x+r.w && cy>=r.y && cy<=r.y+r.h);
    if (hit) {
      if (hit.unlocked) this._travelToWaypoint(hit.actIdx, hit.locIdx);
      else this._addFloat("Waypoint locked",this.player.wx,this.player.wy-40,"#ff8844",70);
      return;
    }
    const rowH=mobile?52:62, startY=PY+90;
    CR_ACTS.forEach((act,i)=>{
      const y=startY+i*rowH;
      const unlocked=!!this.waypoints[act.id] || i<=this.actIdx;
      if(cx>PX+18&&cx<PX+PW-18&&cy>y&&cy<y+rowH-8){
        if(unlocked) this._travelToAct(i);
        else this._addFloat("Waypoint locked",this.player.wx,this.player.wy-40,"#ff8844",70);
      }
    });
  }

  _travelToAct(actIdx) {
    const nextIdx=Math.max(0,Math.min(CR_ACTS.length-1,actIdx|0));
    this.actIdx=nextIdx;
    this.act=CR_ACTS[this.actIdx] || CR_ACTS[0];
    this.waypoints[this.actIdx+1]=true;
    const seed=Date.now()^(this.actIdx*7919);
    this.dungeon=_genDungeon(60,60,_rng(seed));
    this.town=_genTownMap(this.actIdx);
    this.wilderness=_genWildernessMap(this.actIdx,_rng(seed^0x51a7));
    this.player.wx=this.town.spawnWx;
    this.player.wy=this.town.spawnWy;
    this.player.angle=-Math.PI/2;
    this.enemies=[]; this.projectiles=[]; this.loot=[];
    this.particles=[]; this.floatingText=[]; this.traps=[];
    this.boss=null; this.bossSpawned=false;
    this.shopItems=this._genShopItems();
    this.quests=this._initQuests();
    this.moveTarget=null; this.attackTarget=null;
    this.showWaypointPanel=false;
    this.screen="town";
    this._cameraSnap=true;
    this._centerCamera();
    this._addFloat(`WAYPOINT: ${this.act.town}`,this.player.wx,this.player.wy-42,this.act.color,90);
  }

  _travelToWaypoint(actIdx, locIdx=0) {
    this._travelToAct(actIdx);
    const loc = Math.max(0, locIdx|0);
    this._unlockWaypoint(actIdx, loc);
    if (loc >= 1 && loc <= 3) {
      this._enterWilderness();
      const routeStops = [
        [this.wilderness.spawnX + 1, this.wilderness.spawnY],
        [Math.floor(this.wilderness.W * 0.46), Math.floor(this.wilderness.H * 0.48)],
        [Math.max(2, this.wilderness.caveX - 3), this.wilderness.caveY],
      ];
      const [tx, ty] = routeStops[Math.min(routeStops.length - 1, loc - 1)];
      this.player.wx = tx*this.TS + this.TS/2;
      this.player.wy = ty*this.TS + this.TS/2;
      this._unlockWaypoint(actIdx, loc);
      this._markDiscovery(7);
    } else if (loc >= 4) {
      this._enterDungeon();
    }
    this.showWaypointPanel = false;
    const act = CR_ACTS[this.actIdx] || CR_ACTS[0];
    const label = this._displayWaypointName(this.actIdx, loc) || act.waypoints?.[loc] || act.town;
    this._addFloat(`WAYPOINT: ${label}`, this.player.wx, this.player.wy-42, act.color, 90);
  }

  _handleShopClick(cx,cy) {
    const W=this.canvas.width, H=this.canvas.height;
    const mobile=W<760;
    const PW=mobile?Math.min(360,W-24):Math.min(720,W-36), PX=W/2-PW/2, buyW=320;
    const PY=H*0.22;
    // Close button
    if (cx>PX+PW-92&&cy>PY+4&&cy<PY+30){this.showShop=false;return;}
    if(!mobile){
      const sellX=PX+buyW+26, sellY=PY+58, cell=32, cols=10, rows=5;
      const gx=Math.floor((cx-sellX)/cell), gy=Math.floor((cy-sellY)/cell);
      if(gx>=0&&gx<cols&&gy>=0&&gy<rows){
        const idx=gy*cols+gx, item=this.player.inventory[idx];
        if(item){
          const gold=Math.max(1,Math.floor((item.goldVal||item.price||25)*0.45));
          this.player.gold+=gold;
          this.player.inventory.splice(idx,1);
          this.chronicle.itemsSold++;
          this._addFloat(`SOLD: ${item.name} +${gold} gold`,W/2,H/2,"#ffdd66",90);
        }
        return;
      }
    }
    // Buy items
    this.shopItems.forEach((item,i)=>{
      const iy=PY+48+i*52;
      if (cx>PX+4&&cx<PX+Math.min(buyW,PW)-4&&cy>iy&&cy<iy+48) {
        if (this.player.gold>=item.price) {
          this.player.gold-=item.price;
          this.player.inventory.push(item);
          this.chronicle.purchases++;
          this._addFloat(`Bought: ${item.name}`,W/2,H/2,"#ffdd00",90);
          this.shopItems.splice(i,1);
        } else {
          this._addFloat("Need more 💰",W/2,H/2,"#ff4444",60);
        }
      }
    });
    // Buy belt potions
    const py=PY+48+this.shopItems.length*52+20;
    if (cx>PX&&cx<PX+Math.min(buyW,PW)/2-4&&cy>py&&cy<py+36&&this.player.gold>=30) {
      this.player.gold-=30; this.player.beltHp++; this._addFloat("+HP Potion",W/2,py,"#ff4444",60);
    }
    if (cx>PX+Math.min(buyW,PW)/2+4&&cx<PX+Math.min(buyW,PW)&&cy>py&&cy<py+36&&this.player.gold>=25) {
      this.player.gold-=25; this.player.beltMp++; this._addFloat("+MP Potion",W/2,py,"#4488ff",60);
    }
  }

  _handleMercClick(cx,cy) {
    const W=this.canvas.width,H=this.canvas.height;
    // Matches _drawMercPanel: PX=W/2-175, PY=H*0.16, PW=350
    const PX=W/2-175, PY=H*0.16, PW=350;
    if(cx>PX+PW-110&&cx<PX+PW&&cy>PY&&cy<PY+26){this.showMercPanel=false;return;}
    const listY=this.merc ? PY+76 : PY+32;
    MERC_TYPES.forEach((mt,i)=>{
      const by=listY+i*80;
      // Action button: PX+PW-108 to PX+PW-12, by+10 to by+38
      if(cx>PX+PW-108&&cx<PX+PW-12&&cy>by+10&&cy<by+38){
        const isActiveHire=this.merc&&!this.merc.dead&&this.merc.name===mt.name;
        const isDeadHire=this.merc&&this.merc.dead&&this.merc.name===mt.name;
        if(isActiveHire){
          // Dismiss
          this.merc=null; this._addFloat(`${mt.name} dismissed`,W/2,H/2,"#ffaa44",90);
          this.showMercPanel=false; return;
        }
        if(isDeadHire){
          if(this.player.gold<mt.rezCost){this._addFloat(`Need 💰${mt.rezCost}`,W/2,H/2,"#ff4444",80);return;}
          this.player.gold-=mt.rezCost; this.merc.dead=false; this.merc.hp=this.merc.maxHp;
          this._addFloat(`${mt.name} resurrected!`,W/2,H/2,"#44ff88",100); this.showMercPanel=false; return;
        }
        if(this.merc&&!this.merc.dead){this._addFloat("Dismiss current merc first",W/2,H/2,"#ff8800",80);return;}
        if(this.player.gold<mt.hireCost){this._addFloat(`Need 💰${mt.hireCost}`,W/2,H/2,"#ff4444",80);return;}
        this.player.gold-=mt.hireCost;
        const lvl=Math.max(1,this.player.level-1);
        this.merc={name:mt.name,type:mt.type,icon:mt.icon,color:mt.color,
          level:lvl,hp:Math.round(mt.hp+lvl*12),maxHp:Math.round(mt.hp+lvl*12),
          dmg:Math.round(mt.dmg+lvl*3),spd:mt.spd,range:mt.range,ai:mt.ai,
          wx:this.player.wx+50,wy:this.player.wy,lastAtk:0,atkCd:60,
          equipment:{weapon:null},dead:false,rezCost:mt.rezCost,xp:0,xpNext:200};
        this.chronicle.mercHires++;
        this._addFloat(`${mt.name} hired!`,W/2,H/2,"#44ffaa",100);
        this.showMercPanel=false;
      }
    });
  }

  _handleStashClick(cx,cy) {
    const W=this.canvas.width,H=this.canvas.height;
    const L=this._stashLayout(W,H);
    const {PW,PY,leftX,rightX,cell,stashCols,stashRows,invCols,invRows,stashX,stashY,invX,invY}=L;
    if(cx>rightX+PW-95&&cx<rightX+PW-12&&cy>PY+8&&cy<PY+30){this.showStash=false;return;}

    // ── Stash tab clicks ─────────────────────────────────────────────────────
    if (this.stashTabRects) {
      for (const r of this.stashTabRects) {
        if (cx>=r.x&&cx<=r.x+r.w&&cy>=r.y&&cy<=r.y+r.h) {
          this.stashTab = r.tab;
          return;
        }
      }
    }

    const p=this.player;
    if (!this.sharedStash) this.sharedStash = [];
    const sTab = this.stashTab || "personal";
    const activeStash = sTab === "shared" ? this.sharedStash : this.stash;
    const moveFromGrid=(x,y,cols,rows,items,onMove)=>{
      const gx=Math.floor((cx-x)/cell), gy=Math.floor((cy-y)/cell);
      if(gx<0||gx>=cols||gy<0||gy>=rows)return false;
      const idx=gy*cols+gx; if(!items[idx])return true;
      onMove(idx); return true;
    };
    if(moveFromGrid(stashX,stashY,stashCols,stashRows,activeStash,(idx)=>{p.inventory.push(activeStash[idx]);activeStash.splice(idx,1);this.chronicle.stashWithdrawals++;this._addFloat("TO BAG",cx,cy,"#ffaa44",60);} )) return;
    moveFromGrid(invX,invY,invCols,invRows,p.inventory,(idx)=>{activeStash.push(p.inventory[idx]);p.inventory.splice(idx,1);this.chronicle.itemsStashed++;this._addFloat("TO STASH",cx,cy,"#44aaff",60);});
  }

  _handleForgeClick(cx,cy) {
    const W=this.canvas.width,H=this.canvas.height;
    // Matches _drawForge: PX=W/2-185, PY=H*0.13, PW=370
    const PX=W/2-185, PY=H*0.13, PW=370;
    if(cx>PX+PW-110&&cx<PX+PW&&cy>PY&&cy<PY+28){this.showForge=false;return;}
    const p=this.player;
    // Forge slot click → return to bag
    // Slots at: sx=PX+PW-186+i*58, sy=PY+38, size 52×52
    this.forgeSlots.forEach((item,i)=>{
      if(!item)return;
      const sx=PX+PW-186+i*58, sy=PY+38;
      if(cx>sx&&cx<sx+52&&cy>sy&&cy<sy+52){
        p.inventory.push(item); this.forgeSlots[i]=null;
      }
    });
    // Transmute button: PX+PW-188, PY+100, 178×30
    if(cx>PX+PW-188&&cx<PX+PW-10&&cy>PY+100&&cy<PY+130) this._forgeTransmute();
    // Bag item → add to forge slot; list at listY=PY+214, rows 24px, x: PX+4 to PX+PW*0.7
    const listY=PY+214;
    const maxRows=Math.floor((PY+(Math.min(510,H*0.76))-listY-22)/24);
    p.inventory.slice(0,maxRows).forEach((item,i)=>{
      const iy=listY+8+i*24;
      if(cx>PX+4&&cx<PX+PW*0.7&&cy>iy&&cy<iy+22){
        const emptySlot=this.forgeSlots.indexOf(null);
        if(emptySlot>=0){this.forgeSlots[emptySlot]=item; p.inventory.splice(i,1);}
      }
    });
  }

  _forgeTransmute() {
    const slots=this.forgeSlots.filter(Boolean);
    const p=this.player;
    const W=this.canvas.width;
    if(slots.length===0){this._addFloat("Add items to forge",W/2,200,"#ff8800",80);return;}
    // Recipe: 3 magic items → 1 rare
    if(slots.length===3&&slots.every(s=>s.rarity.id==="magic")){
      const rare=_genItem(this.actIdx+2); rare.rarity=RARITY[2];
      p.inventory.push(rare);this.forgeSlots=[null,null,null];
      this._addFloat("⚗ TRANSMUTED: "+rare.name,W/2,180,rare.rarity.color,120);return;
    }
    // Recipe: 2 runes → next rune
    const runes=slots.filter(s=>s.slot==="rune");
    if(runes.length===2&&slots.length===2){
      const i1=RUNES.findIndex(r=>r.id===runes[0].rune);
      const nextRune=RUNES[Math.min(RUNES.length-1,i1+1)];
      const newItem={id:Date.now(),name:`${nextRune.name} Rune`,slot:"rune",icon:nextRune.icon,rune:nextRune.id,
        rarity:RARITY[2],level:this.actIdx+1,dmgAdd:0,defAdd:0,hpAdd:0,mpAdd:0,spdAdd:0,color:nextRune.color,goldVal:80};
      p.inventory.push(newItem);this.forgeSlots=[null,null,null];
      this._addFloat(`⚗ RUNE UPGRADE: ${nextRune.name}!`,W/2,180,"#ffdd00",120);return;
    }
    // Recipe: 3 gems of same type → next quality gem
    const gems=slots.filter(s=>s.slot==="gem");
    if(gems.length===3&&gems.every(g=>g.gem===gems[0].gem)&&slots.length===3){
      const gemDef=GEMS.find(g=>g.id===gems[0].gem);
      const qi=Math.min(4,(gems[0].gemQuality||0)+1);
      const newItem={id:Date.now(),name:`${gemDef.quality[qi]} ${gemDef.name}`,slot:"gem",icon:gemDef.icon,gem:gemDef.id,gemQuality:qi,
        rarity:RARITY[1],level:this.actIdx+1,dmgAdd:0,defAdd:0,hpAdd:0,mpAdd:0,spdAdd:0,color:gemDef.color,goldVal:40+qi*25};
      p.inventory.push(newItem);this.forgeSlots=[null,null,null];
      this._addFloat(`⚗ GEM UPGRADE: ${newItem.name}!`,W/2,180,gemDef.color,120);return;
    }
    // Recipe: 1 item + gold → add socket
    if(slots.length===1&&p.gold>=100&&slots[0].slot!=="gold"&&slots[0].slot!=="use"){
      p.gold-=100;slots[0].sockets=(slots[0].sockets||0)+1;
      p.inventory.push(slots[0]);this.forgeSlots=[null,null,null];
      this._addFloat("⚗ SOCKET ADDED!",W/2,180,"#44aaff",120);return;
    }
    // Recipe: 1 rare item → reroll affixes
    if(slots.length===1&&slots[0].rarity.id==="rare"){
      const rerolled=_genItem(this.actIdx+1); rerolled.rarity=RARITY[2]; rerolled.slot=slots[0].slot;
      p.inventory.push(rerolled);this.forgeSlots=[null,null,null];
      this._addFloat("⚗ REROLLED: "+rerolled.name,W/2,180,"#ffdd00",120);return;
    }
    this._addFloat("No recipe matches — try different combo",W/2,180,"#ff8800",100);
  }

  _handleSkinClick(cx,cy) {
    const W=this.canvas.width,H=this.canvas.height;
    // Close button (matches draw: [X] at W/2+148 area, cy < H*0.2+30)
    if(cx>W/2+130&&cy<H*0.2+30){this.showSkinPanel=false;return;}
    const classes=Object.keys(CR_SPRITE_DEFS);
    const PY=H*0.2+40; // matches draw coords exactly
    const allIds=[...classes,"mercenary"];
    allIds.forEach((clsId,i)=>{
      let bx,by;
      if(i<classes.length){
        const row=Math.floor(i/2), col=i%2;
        bx=W/2-140+col*140; by=PY+row*70;
      } else {
        // Merc row centered
        bx=W/2-140; by=PY+Math.ceil(classes.length/2)*70;
        // Upload: bx-108 offset for merc row layout
        if(cy>by+44&&cy<by+62){
          if(cx>W/2-108&&cx<W/2-60){
            const input=document.createElement("input");
            input.type="file";input.accept="image/*";
            input.onchange=e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{_saveSkin("mercenary",ev.target.result);this._addFloat("Merc skin saved!",W/2,H/2,"#44ff88",90);};reader.readAsDataURL(file);};
            input.click();
          }
          if(cx>W/2-56&&cx<W/2-14&&CR_SKIN_CACHE.mercenary){
            _clearSkin("mercenary");this._addFloat("Merc skin cleared",W/2,H/2,"#ffaa44",80);
          }
        }
        return;
      }
      if(cy>by+44&&cy<by+62){
        // Upload button: bx+30 to bx+80 (non-overlapping with clear)
        if(cx>bx+30&&cx<bx+80){
          const input=document.createElement("input");
          input.type="file";input.accept="image/*";
          input.onchange=e=>{
            const file=e.target.files[0];if(!file)return;
            const reader=new FileReader();
            reader.onload=ev=>{_saveSkin(clsId,ev.target.result);this._addFloat("Skin saved!",W/2,H/2,"#44ff88",90);};
            reader.readAsDataURL(file);
          };input.click();
        }
        // Clear button: bx+82 to bx+125 (separate from upload)
        if(cx>bx+82&&cx<bx+125&&CR_SKIN_CACHE[clsId]){
          _clearSkin(clsId);this._addFloat("Skin cleared",W/2,H/2,"#ffaa44",80);
        }
      }
    });
  }

  _genShopItems() {
    const items=[];
    for (let i=0;i<6;i++) {
      const item=_genItem(this.actIdx+1);
      if (item.slot==="gold"||item.slot==="use"||item.slot==="rune"||item.slot==="gem") { i--; continue; }
      item.price = Math.max(50, (item.dmgAdd+item.defAdd+item.hpAdd/3+item.mpAdd/4)*8 + (this.actIdx+1)*40 + Math.floor(Math.random()*60));
      items.push(item);
    }
    return items;
  }

  _spendStatPoint(preferredStat=null) {
    const p=this.player; if (p.statPoints<=0) return;
    p.statPoints--;
    const stats=["str","dex","vit","nrg"];
    // Auto-allocate based on class
    const cls=this.cls.id;
    let stat = stats.includes(preferredStat) ? preferredStat : null;
    if (!stat) {
      if (cls==="ember_witch"||cls==="bone_herald") stat="nrg";
      else if (cls==="iron_warden"||cls==="steel_crusader") stat="str";
      else if (cls==="shadow_blade"||cls==="void_archer") stat="dex";
      else stat="vit";
    }
    const beforeHp = p.maxHp;
    const beforeMp = p.maxMp;
    p[stat]++;
    this._recalcStats();
    if (stat === "vit") p.hp = Math.min(p.maxHp, p.hp + Math.max(1, p.maxHp - beforeHp));
    if (stat === "nrg") p.mp = Math.min(p.maxMp, p.mp + Math.max(1, p.maxMp - beforeMp));
    this._addFloat(`+1 ${stat.toUpperCase()}!`,p.wx,p.wy-40,"#ffdd00",80);
  }

  _inventoryLayout(W,H) {
    const prof=this._layoutProfile(W,H);
    const margin=prof.mobile ? 8 : 18;
    const PY=prof.mobile ? prof.safeTop + 8 : 54;
    const bottom=prof.safeBottom + (prof.mobile ? 8 : 16);
    const sideStats=this.showStats && W >= (prof.mobile ? 720 : 690);
    const gap=prof.mobile ? 8 : 18;
    const PW=sideStats ? Math.min(390,Math.floor((W-margin*2-gap)/2)) : Math.min(460,W-margin*2);
    const PH=Math.max(188,Math.min(600,H-PY-bottom));
    const invX=sideStats ? W-PW-margin : Math.max(margin,(W-PW)/2);
    const statsX=margin;
    const bagCols=PW >= 390 ? 10 : 8;
    const bagCell=Math.max(27,Math.min(34,Math.floor((PW-52)/bagCols)));
    const bagRows=Math.max(4,Math.min(6,Math.floor((PH-304)/bagCell)));
    return {prof,margin,PY,bottom,sideStats,gap,PW,PH,invX,statsX,bagCols,bagRows,bagCell,bagX:invX+26,bagY:PY+304};
  }

  _inventorySlotRects(invX,PY,PW) {
    const cx=Math.floor(invX+PW/2);
    return [
      // Row 1: head center, amulet right
      {slot:"head",   x:cx-26,         y:PY+36, w:52, h:56},
      {slot:"amulet", x:cx+48,         y:PY+40, w:38, h:38},
      // Row 2: weapon left, chest center, shield right
      {slot:"weapon", x:invX+26,       y:PY+104, w:54, h:86},
      {slot:"chest",  x:cx-32,         y:PY+104, w:64, h:86},
      {slot:"shield", x:invX+PW-80,    y:PY+104, w:54, h:86},
      // Row 3: ring left, belt center, ring2 right
      {slot:"ring",   x:invX+26,       y:PY+200, w:36, h:36},
      {slot:"belt",   x:cx-28,         y:PY+200, w:56, h:30},
      {slot:"ring2",  x:invX+PW-62,    y:PY+200, w:36, h:36},
      // Row 4: gloves left, boots center
      {slot:"gloves", x:invX+26,       y:PY+246, w:40, h:42},
      {slot:"feet",   x:cx-22,         y:PY+244, w:44, h:48},
    ];
  }

  _statButtonRects(statsX,PY) {
    const stats = ["str","dex","vit","nrg"];
    return stats.map((stat,i)=>{
      const x=statsX+18+(i%2)*142;
      const y=PY+78+Math.floor(i/2)*42;
      return { stat, x:x+132, y:y+4, w:18, h:18 };
    });
  }

  _handleInventoryClick(cx, cy) {
    const W = this.canvas.width, H = this.canvas.height;
    const L=this._inventoryLayout(W,H);
    const {PW,PH,PY,invX,statsX,sideStats,bagX,bagY,bagCell,bagCols,bagRows}=L;
    if (sideStats) {
      for (const r of this._statButtonRects(statsX,PY)) {
        if (cx>=r.x && cx<=r.x+r.w && cy>=r.y && cy<=r.y+r.h) {
          this._spendStatPoint(r.stat);
          return;
        }
      }
      if (cx>=statsX && cx<=statsX+PW && cy>=PY && cy<=PY+PH) return;
    }
    if (cx < invX || cx > invX+PW || cy < PY || cy > PY+PH) return;
    for (const r of this._inventorySlotRects(invX,PY,PW)) {
      if (cx>=r.x && cx<=r.x+r.w && cy>=r.y && cy<=r.y+r.h) {
        const item=this.player.equipment?.[r.slot];
        if (item) {
          this.player.inventory.push(item);
          this.player.equipment[r.slot]=null;
          this._recalcStats();
          this._addFloat(`UNEQUIPPED: ${item.name}`,this.player.wx,this.player.wy-42,"#d6b65c",80);
        }
        return;
      }
    }
    const gx=Math.floor((cx-bagX)/bagCell), gy=Math.floor((cy-bagY)/bagCell);
    const cols=bagCols, rows=bagRows;
    if (gx<0||gx>=cols||gy<0||gy>=rows) return;
    const idx=gy*cols+gx;
    const inv = this.player.inventory;
    if (inv[idx]) this._equipOrUse(inv[idx], idx);
  }

  _equipOrUse(item, idx) {
    const p = this.player;
    if (item.slot === "use") {
      if (item.healHp) { p.hp = Math.min(p.maxHp, p.hp + item.healHp); this._addFloat(`+${item.healHp} HP`, p.wx, p.wy-30, "#ff4444", 70); }
      if (item.healMp) { p.mp = Math.min(p.maxMp, p.mp + item.healMp); this._addFloat(`+${item.healMp} MP`, p.wx, p.wy-30, "#4444ff", 70); }
      p.inventory.splice(idx, 1);
    } else if (item.slot === "gold") {
      p.gold += item.goldVal; p.inventory.splice(idx, 1);
      this._addFloat(`+${item.goldVal} 💰`, p.wx, p.wy-30, "#ffdd00", 70);
    } else if (item.slot === "gem") {
      // Socket into equipped weapon or armor with open socket
      const target = p.equipment.weapon || p.equipment.chest;
      if (target && (target.sockets||0) > 0) {
        const gem = GEMS.find(g=>g.id===item.gem);
        if (gem) { _applyGemToItem(target, gem, item.gemQuality||0); p.inventory.splice(idx,1); this._recalcStats(); this._addFloat(`💎 Socketed ${item.name}!`,p.wx,p.wy-40,gem.color,90); }
      } else { this._addFloat("No open sockets!",p.wx,p.wy-30,"#ff8800",60); }
    } else if (item.slot === "rune") {
      const target = p.equipment.weapon || p.equipment.chest;
      if (target && (target.sockets||0) > 0) {
        const rune = RUNES.find(r=>r.id===item.rune);
        if (rune) {
          const beforeRuneword = target.runeword;
          target.runes = target.runes||[];
          target.runes.push(item.rune);
          const slotBonus = target.slot==="weapon" ? rune.wep : rune.arm;
          if (slotBonus.dmgAdd) target.dmgAdd=(target.dmgAdd||0)+slotBonus.dmgAdd;
          if (slotBonus.defAdd) target.defAdd=(target.defAdd||0)+slotBonus.defAdd;
          if (slotBonus.hpAdd)  target.hpAdd=(target.hpAdd||0)+slotBonus.hpAdd;
          if (slotBonus.mpAdd)  target.mpAdd=(target.mpAdd||0)+slotBonus.mpAdd;
          target.sockets=Math.max(0,(target.sockets||0)-1);
          _checkRuneword(target);
          this.chronicle.runesFound[item.rune] = (this.chronicle.runesFound[item.rune]||0)+1;
          if (target.runeword && target.runeword !== beforeRuneword) {
            this.chronicle.runewordsMade[target.runeword] = (this.chronicle.runewordsMade[target.runeword]||0)+1;
            this._addFloat(`✨ RUNEWORD: ${target.runeword}!`,p.wx,p.wy-50,target.runewordColor||"#ffdd00",150);
          }
          p.inventory.splice(idx,1); this._recalcStats();
        }
      } else { this._addFloat("No open sockets!",p.wx,p.wy-30,"#ff8800",60); }
    } else {
      // Equip item
      const old = p.equipment[item.slot];
      if (old) p.inventory.push(old);
      p.equipment[item.slot] = item;
      p.inventory.splice(idx, 1);
      this._recalcStats();
    }
  }

  _recalcStats() {
    const p = this.player; const s = this.cls.stats;
    const lvlBonus = (p.level - 1) * 2;
    p.dmg = s.dmg + lvlBonus;
    p.def = s.def + Math.floor(lvlBonus * 0.5);
    p.spd = s.spd;
    p.maxHp = s.maxHp + p.vit * 4 + lvlBonus * 3;
    p.maxMp = s.maxMp + p.nrg * 3 + lvlBonus * 2;
    Object.values(p.equipment).forEach(item => {
      if (!item) return;
      if (item.dmgAdd) p.dmg += item.dmgAdd;
      if (item.defAdd) p.def += item.defAdd;
      if (item.hpAdd)  p.maxHp += item.hpAdd;
      if (item.mpAdd)  p.maxMp += item.mpAdd;
      if (item.spdAdd) p.spd += item.spdAdd;
    });
    p.hp = Math.min(p.hp, p.maxHp);
    p.mp = Math.min(p.mp, p.maxMp);
  }

  _usePotion(type) {
    const p = this.player;
    if (type === "hp" && p.beltHp > 0) {
      p.beltHp--; const h = 60 + p.level * 10;
      p.hp = Math.min(p.maxHp, p.hp + h);
      this._addFloat(`+${h} HP`, p.wx, p.wy-30, "#ff4444", 70);
    }
    if (type === "mp" && p.beltMp > 0) {
      p.beltMp--; const m = 50 + p.level * 8;
      p.mp = Math.min(p.maxMp, p.mp + m);
      this._addFloat(`+${m} MP`, p.wx, p.wy-30, "#4488ff", 70);
    }
  }

  // D2-style Town Portal scroll. In dungeon/wilderness it returns the player
  // to the act town and remembers a return point. In town, if a return point
  // is recorded, it sends the player back without consuming another scroll.
  // Resolve a KayKit GLB URL for any in-game actor id (class / monster /
  // summon / NPC). Returns null when the actor isn't mapped — caller falls
  // back to atlas / procedural drawing.
  _kaykitUrlForActor(id, animState = "idle") {
    if (!id) return null;
    const q = _normalizeQualityTier(this.quality);
    const useMeshy = q === "ultra" || q === "high";
    const qualityKey = `${q}:${id}:${useMeshy ? animState : "base"}`;
    if (this._kayUrlCache && qualityKey in this._kayUrlCache) return this._kayUrlCache[qualityKey];
    if (!this._kayUrlCache) this._kayUrlCache = {};
    if (useMeshy) {
      const meshyUrl = crMeshyActorUrl(id, animState);
      if (meshyUrl) {
        this._kayUrlCache[qualityKey] = meshyUrl;
        return meshyUrl;
      }
    }
    const cls = crKayClassBody(id);
    let url = cls?.url || null;
    if (!url) { const m = crKayMonster(id);    url = m?.url || null; }
    if (!url) { const s = crKaySummon(id);     url = s?.url || null; }
    if (!url) { const n = crKayNpc(id);        url = n?.url || null; }
    this._kayUrlCache[qualityKey] = url;
    return url;
  }

  // ── v8.0 GLB tier helpers ────────────────────────────────────────────────────

  /** Returns "128bit" for high/ultra quality (Meshy PBR), "64bit" for medium/low. */
  _glbTier() {
    const q = _normalizeQualityTier(this.quality);
    return (q === "ultra" || q === "high") ? "128bit" : "64bit";
  }

  /**
   * Derive the hero's current animation state from live movement/combat data.
   * Prefers explicit `opts.state` if provided, otherwise auto-detects.
   */
  _playerAnimState(opts = {}) {
    if (opts.state) return opts.state;
    const p = this.player;
    if (!p) return "idle";
    const now  = this._frame || 0;
    const vx   = p.vx || p.dx || 0;
    const vy   = p.vy || p.dy || 0;
    const spd  = Math.sqrt(vx * vx + vy * vy);
    const moving = spd > 0.5;
    const sprint = p.sprinting || this.autoRun || spd > 4;
    const recentAtk  = p.lastAtk  && (now - p.lastAtk)  < 20;
    const recentCast = p.lastCast && (now - p.lastCast) < 24;
    const recentHurt = p.lastHurt && (now - p.lastHurt) < 14;
    if (p.isDead)    return "death";
    if (recentAtk)   return "attack";
    if (recentCast)  return "cast";
    if (recentHurt)  return "hurt";
    if (moving)      return sprint ? "run" : "walk";
    return "idle";
  }

  /**
   * Pick an 8-directional name from a world-space velocity or angle.
   * Uses glbVecToDir8 from crypticGlbSpriter (diagonal iso directions).
   */
  _dir8FromAngle(angle) {
    return glbVecToDir8(Math.cos(angle || 0), Math.sin(angle || 0));
  }

  _kaykitFallbackUrlForActor(id) {
    if (!id) return null;
    const qualityKey = `kaykit:${id}`;
    if (this._kayUrlCache && qualityKey in this._kayUrlCache) return this._kayUrlCache[qualityKey];
    if (!this._kayUrlCache) this._kayUrlCache = {};
    const cls = crKayClassBody(id);
    let url = cls?.url || null;
    if (!url) { const m = crKayMonster(id);    url = m?.url || null; }
    if (!url) { const s = crKaySummon(id);     url = s?.url || null; }
    if (!url) { const n = crKayNpc(id);        url = n?.url || null; }
    this._kayUrlCache[qualityKey] = url;
    return url;
  }

  // Kick off background renders of every actor we expect to see in this act.
  _scheduleKaykitPreloads(chosenClass) {
    const q = _normalizeQualityTier(this.quality);

    // ── PRIORITY 1: Scene assets (buildings, props, trees, dungeon interior) ─────
    // These MUST be queued before the character loop below floods _pending.
    // The background-strip limit in preloadGlbStripsFireAndForget counts only
    // actively-pending jobs, so queuing scene assets first guarantees they render
    // before any character strips start blocking the queue.

    // Town buildings and outdoor props (single front strip each)
    [
      ...["blacksmith","tavern","market","church","home_a","home_b","well","diabl0_tower"].map(id => this._buildingUrl(id)),
      ...["torch_lit","torch_mounted","barrel_large","crates_stacked","banner_red","sign_post","box_large"].map(id => this._d11PropUrl(id)),
      ...CR_FOREST_TREE_IDS.slice(0, 8).map(id => this._forestUrl(id)),
      ...CR_FOREST_ROCK_IDS.slice(0, 4).map(id => this._forestUrl(id)),
      ...CR_FOREST_BUSH_IDS.slice(0, 4).map(id => this._forestUrl(id)),
    ].filter(Boolean).forEach(url => preloadGlbStripsFireAndForget(url, ["idle"], ["front"], "iso64"));

    // Building interior: dungeon walls need front+back+right (3 dirs) for the tiled room renderer
    // wall_broken + wall_cracked are also used in the main dungeon ISO tile overlay (front only).
    ["wall","wall_corner","wall_doorway","wall_cracked","wall_arched","wall_broken"].forEach(id => {
      const url = crKayDungeonWall(id);
      if (url) preloadGlbStripsFireAndForget(url, ["idle"], ["front","back","right"], "iso64");
    });
    // Floors and furniture — front direction only
    [
      ...["floor_tile_large","floor_wood_large","floor_wood_large_dark","floor_dirt_large","floor_tile_small"].map(id => crKayDungeonFloor(id)),
      ...["table_long","table_medium","stool","shelf_big","armchair","lamp_standing","rug_oval","bed_single"].map(id => crKayFurniture(id)),
      this._d11PropUrl("chest_gold") || this._d11PropUrl("chest"),
      this._kaykitPropUrl("chest_common"),
    ].filter(Boolean).forEach(url => preloadGlbStripsFireAndForget(url, ["idle"], ["front"], "iso64"));

    // ── PRIORITY 2: Characters (actors bypass the background limit) ───────────
    // Keep the actor set lean: hero gets full 8-dir coverage; NPCs get front+back
    // only (they face the player most of the time); monsters load on demand.
    // IMPORTANT: Do NOT add Object.keys(CR_ENEMIES) here — that's 18 × 24 = 432
    // strips and would starve buildings even with the new pending-only limit.
    const ids = new Set();
    ids.add(chosenClass);
    if (this.cls?.id) ids.add(this.cls.id);
    // Town NPCs
    (this.town?.npcs || []).forEach(n => { if (n?.spriteId) ids.add(n.spriteId); });
    ["npc_blacksmith","npc_merchant","npc_healer","npc_stash","npc_forge",
     "npc_identifier","npc_waypoint","npc_ranger","npc_rogue","npc_wardrobe","npc_merc_captain",
     "town_bard","town_monk","monk","bard_musician"]
      .forEach(id => ids.add(id));
    // In 128-bit mode, keep startup lean: enemies and summons bake on first
    // encounter so town/hero assets can become visible quickly.
    if (q !== "ultra" && Array.isArray(this.act?.enemies)) this.act.enemies.forEach(e => ids.add(e));
    if (q !== "ultra") {
      ids.add("summon_skeleton"); ids.add("summon_warrior"); ids.add("summon_mage");
    }
    ids.add("iron_warden");
    if (q === "ultra" && this.actIdx >= 5) ids.add("act6_final_boss");

    const heroDirs8    = ["front","front_right","right","back_right","back","back_left","left","front_left"];
    const monsterDirs  = ["front","right","back","left"]; // 4-dir for combat entities
    const npcDirs      = ["front", "back"]; // 2 dirs is enough for town-facing NPCs
    const heroAnims    = ["idle", "walk", "attack", "hurt", "death"];
    const monsterAnims = ["idle", "walk", "attack", "hurt", "death"]; // full set for enemies
    const npcAnims     = ["idle", "walk"];

    for (const id of ids) {
      const meshy = q === "ultra" ? crMeshyActor(id) : null;
      const isPlayerChar  = id === chosenClass || id === this.cls?.id;
      const isTownSpecial = id === "town_bard" || id === "town_monk" || id === "bard_musician";
      if (meshy) {
        // ── Trimmed Meshy preload set ──────────────────────────────────────
        // Hero used to bake 10 states × 8 dirs = 80 strips serially through the
        // shared WebGL renderer — the player would walk past them mid-bake and
        // never see the result. Now: the *common* states (idle/walk/attack)
        // are baked for the 4 primary dirs (8 strips); other dirs and rarer
        // states load lazily in _drawCharSprite when first requested.
        const states = isPlayerChar
          ? ["idle","walk","attack"]
          : (isTownSpecial ? ["idle","walk"] : ["idle"]);
        const bakeDir = isPlayerChar ? ["front","right","back","left"] : (isTownSpecial ? npcDirs : ["front"]);
        const byUrl = new Map();
        for (const st of states) {
          const url = this._kaykitUrlForActor(id, st);
          if (!url) continue;
          if (!byUrl.has(url)) byUrl.set(url, []);
          byUrl.get(url).push(st);
        }
        // Only preload the primary animated URL, NOT sourceUrl.
        // sourceUrl is the unanimated character-output GLB — if we preload it for
        // "idle" it gets used as a T-posed fallback and makes the actor look static.
        if (meshy.url && !byUrl.has(meshy.url)) byUrl.set(meshy.url, ["idle"]);
        byUrl.forEach((stateList, url) => {
          preloadGlbStripsFireAndForget(url, [...new Set(stateList)], bakeDir, "128bit");
        });
        // ── KayKit 64-bit proxy preload ────────────────────────────────────
        // Meshy strips can take many seconds to bake. Always queue the KayKit
        // adventurer proxy so a real animated body shows immediately while the
        // 128-bit version is rendering. Without this, town NPCs (bard, monk)
        // show only their silhouette card until Meshy completes.
        const proxyUrl = this._kaykitFallbackUrlForActor(id);
        if (proxyUrl) {
          const proxyStates = isPlayerChar ? ["idle","walk","attack"] : ["idle","walk"];
          const proxyDirs   = isPlayerChar ? ["front","right","back","left"] : npcDirs;
          preloadGlbStripsFireAndForget(proxyUrl, proxyStates, proxyDirs, "64bit");
        }
        continue;
      }
      const url = this._kaykitUrlForActor(id);
      const isCombatActor = this.act?.enemies?.includes(id)
        || id.startsWith("summon_") || id === "iron_warden";
      const bakeDirs = isPlayerChar   ? heroDirs8
                     : isCombatActor  ? monsterDirs
                     : isTownSpecial  ? heroDirs8
                     : npcDirs;
      const anims    = isPlayerChar  ? heroAnims
                     : isCombatActor ? monsterAnims
                     : npcAnims;
      if (url) preloadGlbStripsFireAndForget(url, anims, bakeDirs, "64bit");
    }

    return;

    // Dungeon 1.0 props
    const propIds = ["chest_common","barrel","barrel_dark","banner","artifact"];
    for (const pid of propIds) {
      const purl = this._kaykitPropUrl(pid);
      if (purl) preloadGlbStripsFireAndForget(purl, ["idle"], ["front"]);
    }
    // Dungeon 1.1 (Remastered) props
    const d11Ids = ["torch_lit","chest","chest_gold","barrel_large","barrel_small","pillar","pillar_decorated","candle_lit","table_long","shelf_large","shelves","rubble_large","crates_stacked","banner_red","keg"];
    for (const pid of d11Ids) {
      const purl = crKayDungeon11Prop(pid);
      if (purl) preloadGlbStripsFireAndForget(purl, ["idle"], ["front"]);
    }
    // Forest Nature — preload a sample of trees/rocks (front view only, static)
    const forestIds = [...CR_FOREST_TREE_IDS.slice(0,6), "rock_1_a","rock_2_a","bush_1_a","bush_2_a"];
    for (const fid of forestIds) {
      const furl = crKayForest(fid);
      if (furl) preloadGlbStripsFireAndForget(furl, ["idle"], ["front"]);
    }
    // ALL town buildings (static props, front direction only)
    const buildIds = [
      "blacksmith","tavern","market","church","castle","home_a","home_b",
      "well","tower_a","tower_b","barracks","archeryrange","windmill",
      "watermill","mine","lumbermill","wall","wall_gate","fence_stone",
      "fence_stone_gate","bridge_a","diabl0_tower",
    ];
    for (const bid of buildIds) {
      const burl = crKayBuilding(bid);
      if (burl) preloadGlbStripsFireAndForget(burl, ["idle"], ["front"]);
    }
    // Furniture props (for town interior decoration)
    const furnitureIds = [
      "chair_a","chair_b","stool","table_medium","table_long",
      "bed_double","armchair","shelf_big","lamp_standing",
    ];
    for (const fid of furnitureIds) {
      const furl = crKayFurniture ? crKayFurniture(fid) : null;
      if (furl) preloadGlbStripsFireAndForget(furl, ["idle"], ["front"]);
    }
    // Town atmospheric props
    const atmosIds = ["torch_lit","torch_mounted","candle_lit","banner_red","banner_blue",
                      "barrel_large","barrel_small","crates_stacked","keg","keg_decorated","coin_stack_large"];
    for (const aid of atmosIds) {
      const aurl = this._d11PropUrl(aid);
      if (aurl) preloadGlbStripsFireAndForget(aurl, ["idle"], ["front"]);
    }
    // Forest perimeter — all tree types
    [...CR_FOREST_TREE_IDS,...CR_FOREST_ROCK_IDS,...CR_FOREST_BUSH_IDS].forEach(fid => {
      const furl = crKayForest(fid);
      if (furl) preloadGlbStripsFireAndForget(furl, ["idle"], ["front"]);
    });

    // Dungeon structural tiles — preload walls/floors for building interiors.
    // front + back covers the two iso angles we render walls from.
    const wallIds = ["wall","wall_corner","wall_doorway","wall_arched","wall_window_open","wall_gated","wall_cracked","wall_broken","wall_endcap","wall_pillar","wall_shelves","ceiling_tile"];
    for (const wid of wallIds) {
      const wurl = crKayDungeonWall(wid);
      if (wurl) preloadGlbStripsFireAndForget(wurl, ["idle"], ["front","back","right","left"]);
    }
    const floorIds = ["floor_tile_large","floor_tile_small","floor_tile_small_decorated","floor_tile_small_broken_A","floor_wood_large","floor_wood_large_dark","floor_dirt_large","floor_foundation_allsides","floor_foundation_corner","floor_foundation_front","floor_tile_grate"];
    for (const fid of floorIds) {
      const furl = crKayDungeonFloor(fid);
      if (furl) preloadGlbStripsFireAndForget(furl, ["idle"], ["front"]);
    }
    // Interior furniture used in _drawBuildingInterior
    const interiorFurIds = ["table_long","table_medium","table_small","stool","shelf_big","shelf_small","armchair","chair_a","lamp_standing","rug_oval","bed_single"];
    for (const iid of interiorFurIds) {
      const iurl = crKayFurniture(iid);
      if (iurl) preloadGlbStripsFireAndForget(iurl, ["idle"], ["front"]);
    }
  }

  _scheduleCriticalGlbPreloads(chosenClass) {
    const q = _normalizeQualityTier(this.quality);
    if (q === "low") return { jobs: [], total: 0, promise: Promise.resolve([]) };

    const dirs = ["front", "right", "back", "left"];
    const ids = new Set([
      chosenClass,
      this.cls?.id,
      "iron_warden",
      "town_bard",
      "town_monk",
      "bard_musician",
    ].filter(Boolean));

    // Visible town actors first. This is the set the user sees immediately
    // after Play, so it is worth blocking the loading gate on these strips.
    (this.town?.npcs || []).forEach(n => {
      if (n?.spriteId) ids.add(n.spriteId);
    });
    ["npc_blacksmith","npc_merchant","npc_healer","npc_stash","npc_forge","npc_merc_captain"]
      .forEach(id => ids.add(id));

    const heroDirs8 = ["front","front_right","right","back_right","back","back_left","left","front_left"];
    const jobs = [];
    const enqueue = (url, states, useDirs = dirs, tier = "64bit") => {
      if (!url) return;
      const uniqStates = [...new Set(states.filter(Boolean))];
      const uniqDirs   = [...new Set(useDirs.filter(Boolean))];
      const p = preloadGlbStrips(url, uniqStates, uniqDirs, tier).catch(() => {});
      jobs.push(p);
    };

    // Phase 1: enqueue FRONT direction only for instant first-render — prevents the
    // 8-direction × multi-state hero preload from blocking all buildings & props.
    // Remaining directions are picked up by the lazy fire-and-forget in _scheduleKaykitPreloads.
    const frontOnly = ["front"];
    for (const id of ids) {
      const meshy = q === "ultra" ? crMeshyActor(id) : null;
      const isHero = id === chosenClass || id === this.cls?.id || id === "iron_warden" || id === "monk";
      const isTownWalker = id === "town_bard" || id === "town_monk" || id === "bard_musician";
      if (meshy) {
        // Critical path: just front-facing idle + walk for fastest first render.
        // The fire-and-forget preload queues the rest after town assets are done.
        const critStates = isHero ? ["idle","walk","attack"] : (isTownWalker ? ["idle","walk"] : ["idle"]);
        const critDirs   = isHero ? ["front","back"] : frontOnly;
        const byUrl = new Map();
        critStates.forEach(st => {
          const url = this._kaykitUrlForActor(id, st);
          if (!url) return;
          if (!byUrl.has(url)) byUrl.set(url, []);
          byUrl.get(url).push(st);
        });
        byUrl.forEach((statesForUrl, url) => enqueue(url, statesForUrl, critDirs, "128bit"));
        const fallbackUrl = this._kaykitFallbackUrlForActor(id);
        if (fallbackUrl) enqueue(fallbackUrl, isTownWalker ? ["idle","walk"] : ["idle","walk","attack"], isHero ? ["front","back"] : frontOnly, "64bit");
        continue;
      }
      const url = this._kaykitUrlForActor(id);
      if (url) enqueue(url, isTownWalker ? ["idle","walk"] : ["idle","walk","attack"], isHero ? ["front","back"] : frontOnly, "64bit");
    }

    return {
      jobs,
      total: jobs.length,
      promise: Promise.allSettled(jobs),
    };
  }

  _startLoadingGate(title="BLOOD WARMUP", label="Baking 128-bit actors", minFrames=96, requirePlay=true, clearCache=true) {
    // Drop any stale strips from previous HMR/quality passes. Bad transparent or
    // texture-slab frames used to be cached as valid actors; never let them
    // survive into a new warmup.
    if (clearCache) clearGlbSpriteCache?.();
    this.loadingGate = {
      active: true,
      title,
      label,
      tier: this.quality,
      minFrames,
      requirePlay,
      frame: 0,
      progress: 0,
      assetProgress: 0,
      assetDone: 0,
      assetTotal: 0,
      assetsReady: false,
      ready: false,
      started: (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(),
    };
    const gate = this.loadingGate;
    const chosen = this.cls?.id || this.player?.className || this._preloadChosenClass || "iron_warden";
    const warm = this._scheduleCriticalGlbPreloads(chosen);
    gate.assetTotal = warm.total;
    gate.assetsReady = warm.total === 0;
    gate.assetProgress = warm.total === 0 ? 1 : 0;
    warm.jobs.forEach(p => {
      p.finally(() => {
        if (this.loadingGate !== gate) return;
        gate.assetDone = Math.min(gate.assetTotal, (gate.assetDone || 0) + 1);
        gate.assetProgress = gate.assetTotal ? gate.assetDone / gate.assetTotal : 1;
      });
    });
    gate.preloadPromise = warm.promise.finally(() => {
      if (this.loadingGate !== gate) return;
      gate.assetProgress = 1;
      gate.assetsReady = true;
      // Queue the big noncritical cache only after the hero/town actors are ready.
      setTimeout(() => this._scheduleKaykitPreloads(chosen), 0);
    });
  }

  _updateLoadingGate() {
    const g = this.loadingGate;
    if (!g?.active) return;
    g.frame++;
    this._frame++;
    const timePct = Math.min(1, g.frame / Math.max(20, g.minFrames || 80));
    const assetPct = Number.isFinite(g.assetProgress) ? g.assetProgress : 1;
    const targetPct = Math.min(1, timePct * 0.25 + assetPct * 0.75);
    g.progress = Math.max(g.progress || 0, targetPct);
    if (g.progress >= 0.995 && (g.assetsReady || assetPct >= 0.99)) {
      g.ready = true;
      g.progress = 1;
      if (g.requirePlay && g.playPressed) this._activateLoadingPlay();
      if (!g.requirePlay) g.active = false;
    }
  }

  _activateLoadingPlay() {
    const g = this.loadingGate;
    if (!g?.active) return;
    if (!g.ready) {
      g.playPressed = true;
      return;
    }
    g.active = false;
    this._ensureAudio?.();
    this._playSfx?.("door");
  }

  _drawLoadingGate(W,H) {
    const ctx = this.ctx;
    const g = this.loadingGate || {};
    const pct = Math.max(0, Math.min(1, g.progress || 0));
    ctx.save();
    ctx.fillStyle = "#030004";
    ctx.fillRect(0,0,W,H);
    const grd = ctx.createRadialGradient(W*0.5,H*0.38,20,W*0.5,H*0.48,Math.max(W,H)*0.72);
    grd.addColorStop(0,"rgba(90,0,0,0.34)");
    grd.addColorStop(0.48,"rgba(14,0,22,0.94)");
    grd.addColorStop(1,"#020004");
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,W,H);
    for (let i=0;i<90;i++) {
      const x = (i*137 + this._frame*0.2) % W;
      const y = (i*83) % (H*0.55);
      ctx.fillStyle = i%7===0 ? "rgba(255,60,20,0.35)" : "rgba(210,180,130,0.28)";
      ctx.fillRect(x,y,1.5,1.5);
    }
    const cx=W/2, cy=H*0.42, s=Math.min(W,H)*0.2;
    ctx.shadowColor="#ff2200";
    ctx.shadowBlur=24;
    ctx.fillStyle="rgba(0,0,0,0.62)";
    ctx.beginPath();
    ctx.ellipse(cx,cy,s*0.78,s*0.92,0,0,Math.PI*2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx,cy,s*0.78,s*0.92,0,0,Math.PI*2);
    ctx.clip();
    ctx.fillStyle="#6e0000";
    const fillH=s*1.86*pct;
    ctx.fillRect(cx-s*0.86, cy+s*0.94-fillH, s*1.72, fillH);
    ctx.globalAlpha=0.24;
    ctx.fillStyle="#ff4422";
    for(let i=0;i<6;i++) {
      ctx.beginPath();
      ctx.arc(cx-s*0.45+i*s*0.18, cy+s*0.86-fillH+Math.sin(this._frame*0.08+i)*8, s*0.12, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
    ctx.shadowBlur=0;
    ctx.strokeStyle="#d6b65c";
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.ellipse(cx,cy,s*0.78,s*0.92,0,0,Math.PI*2);
    ctx.stroke();
    ctx.fillStyle="#050005";
    ctx.beginPath(); ctx.arc(cx-s*0.28,cy-s*0.12,s*0.16,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+s*0.28,cy-s*0.12,s*0.16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#160000";
    ctx.beginPath(); ctx.moveTo(cx,cy+s*0.02); ctx.lineTo(cx-s*0.09,cy+s*0.32); ctx.lineTo(cx+s*0.09,cy+s*0.32); ctx.closePath(); ctx.fill();
    ctx.strokeStyle="#1a0000";
    ctx.lineWidth=2;
    for(let i=-3;i<=3;i++) {
      ctx.beginPath();
      ctx.moveTo(cx+i*s*0.08, cy+s*0.48);
      ctx.lineTo(cx+i*s*0.06, cy+s*0.66);
      ctx.stroke();
    }
    ctx.textAlign="center";
    ctx.fillStyle="#ff8844";
    ctx.font="bold 22px monospace";
    ctx.fillText(g.title || "BLOOD WARMUP", cx, cy+s*1.22);
    ctx.fillStyle="#d6b65c";
    ctx.font="12px monospace";
    ctx.fillText(g.label || "Baking assets", cx, cy+s*1.42);
    if (g.tier === "ultra") {
      ctx.fillStyle="#ffcc88";
      ctx.font="10px monospace";
      ctx.fillText("128-bit Meshy mode bakes live GLB actors; cached 64-bit bodies stay active.", cx, cy+s*1.5);
    }
    ctx.fillStyle="#2a0505";
    ctx.fillRect(cx-170, cy+s*1.55, 340, 16);
    ctx.fillStyle="#a80000";
    ctx.fillRect(cx-168, cy+s*1.57, 336*pct, 12);
    ctx.strokeStyle="#d6b65c";
    ctx.strokeRect(cx-170, cy+s*1.55, 340, 16);
    ctx.fillStyle="#ffffff";
    ctx.font="bold 11px monospace";
    ctx.fillText(`${Math.round(pct*100)}%`, cx, cy+s*1.68);
    if (g.assetTotal) {
      ctx.fillStyle="#c8aa6e";
      ctx.font="10px monospace";
      ctx.fillText(`GLB strips ${Math.min(g.assetDone || 0, g.assetTotal)}/${g.assetTotal}`, cx, cy+s*1.76);
    }
    const ready = !!g.ready;
    ctx.fillStyle=ready ? "rgba(120,0,0,0.72)" : "rgba(0,0,0,0.35)";
    ctx.strokeStyle=ready ? "#ff5533" : "#4a2a20";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.roundRect(cx-110, cy+s*1.82, 220, 38, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle=ready ? "#ffd6aa" : "#776655";
    ctx.font="bold 13px monospace";
    ctx.fillText(ready ? "PRESS PLAY" : "SUMMONING...", cx, cy+s*1.82+24);
    ctx.restore();
  }

  _kaykitPropUrl(propId) {
    if (!propId) return null;
    if (!this._kayPropCache) this._kayPropCache = {};
    if (propId in this._kayPropCache) return this._kayPropCache[propId];
    const url = crKayProp(propId) || null;
    this._kayPropCache[propId] = url;
    return url;
  }

  _d11PropUrl(id) {
    if (!id) return null;
    if (!this._d11Cache) this._d11Cache = {};
    if (id in this._d11Cache) return this._d11Cache[id];
    const url = crKayDungeon11Prop(id) || null;
    this._d11Cache[id] = url;
    return url;
  }

  _forestUrl(id) {
    if (!id) return null;
    if (!this._forestCache) this._forestCache = {};
    if (id in this._forestCache) return this._forestCache[id];
    const url = crKayForest(id) || null;
    this._forestCache[id] = url;
    return url;
  }

  _buildingUrl(id) {
    if (!id) return null;
    if (!this._buildingCache) this._buildingCache = {};
    const q = _normalizeQualityTier(this.quality);
    const key = `${q}:${id}`;
    if (key in this._buildingCache) return this._buildingCache[key];
    const meshy = q !== "low" ? crMeshyStructure(id) : null;
    const url = meshy?.url || meshy?.sourceFbxUrl || crKayBuilding(id) || null;
    this._buildingCache[key] = url;
    return url;
  }

  _furnitureUrl(id) {
    if (!id) return null;
    if (!this._furnitureCache) this._furnitureCache = {};
    if (id in this._furnitureCache) return this._furnitureCache[id];
    const url = crKayFurniture(id) || null;
    this._furnitureCache[id] = url;
    return url;
  }

  _isoAssetFrame(url, dir = "front") {
    if (!url) return null;
    const frame = getGlbSpriteFrame(url, "idle", dir, "iso64")
        || getCachedGlbSprite(url, dir, "iso64")
        || getGlbSpriteFrame(url, "idle", dir, "64bit")
        || getCachedGlbSprite(url, dir, "64bit");
    if (!frame) preloadGlbStripsFireAndForget(url, ["idle"], [dir], "iso64");
    return frame;
  }

  // Pick a seeded-deterministic forest tree/rock/bush id for a tile
  _forestTileAsset(tx, ty, wallSeed) {
    // Use seeded RNG to pick variety
    const s = wallSeed || ((tx*7919)^(ty*6271)^(this.dungeonSeed||1)*31337);
    const r = (s >>> 0) % 100;
    if (r < 65) {
      // Tree (65%)
      return CR_FOREST_TREE_IDS[(s >>> 0) % CR_FOREST_TREE_IDS.length];
    } else if (r < 85) {
      // Rock (20%)
      return CR_FOREST_ROCK_IDS[(s >>> 0) % CR_FOREST_ROCK_IDS.length];
    } else {
      // Bush (15%)
      return CR_FOREST_BUSH_IDS[(s >>> 0) % CR_FOREST_BUSH_IDS.length];
    }
  }

  // Pick a seeded-deterministic dungeon 1.1 floor prop for a tile
  _dungeonFloorProp(tx, ty) {
    const s = ((tx*15485863)^(ty*32452867)^((this.dungeonSeed||1)*97))>>>0;
    const opts = ["barrel_small","barrel_large","crates_stacked","rubble_large","keg","shelf_large","table_small"];
    return opts[s % opts.length];
  }

  _drawD11Prop(ctx, sx, sy, id, TW, TH) {
    if (!ctx || !id) return;
    const url = this._d11PropUrl(id);
    const frame = this._isoAssetFrame(url, "front");
    const tall = id.includes("torch") || id.includes("pillar") || id.includes("banner") || id.includes("shelf");
    const wide = id.includes("table") || id.includes("crates");
    const glow = id.includes("torch") || id.includes("candle");
    const drawH = tall ? TH * 3.0 : wide ? TH * 2.0 : TH * 1.7;
    if (frame) {
      const drawW = drawH * (frame.width / frame.height);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      if (glow && this.Q.glow) {
        const pulse = 0.75 + 0.25 * Math.sin((this._frame || 0) * 0.22);
        ctx.shadowColor = "rgba(255,170,60,0.85)";
        ctx.shadowBlur = 10 + pulse * 8;
      }
      ctx.drawImage(frame, sx - drawW * 0.5, sy - drawH + TH * 0.55, drawW, drawH);
      ctx.restore();
      return;
    }

    // Lightweight fallback so missing GLB props never crash dungeon drawing.
    if (url && (this._frame || 0) % 20 === 0) preloadGlbStripsFireAndForget(url, ["idle"], ["front"]);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(0, TH * 0.42, TW * 0.18, TH * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    if (glow && this.Q.glow) {
      const pulse = 0.65 + 0.35 * Math.sin((this._frame || 0) * 0.22);
      ctx.shadowColor = "rgba(255,160,45,0.8)";
      ctx.shadowBlur = 6 + pulse * 7;
      // Bracket arm — horizontal bar at wall
      ctx.fillStyle = "#5a3a1a";
      ctx.fillRect(-TW * 0.07, -TH * 0.70, TW * 0.14, TH * 0.09);
      // Torch stick — thin vertical stub above bracket
      ctx.fillStyle = "#6b3e18";
      ctx.fillRect(-TW * 0.025, -TH * 0.95, TW * 0.05, TH * 0.26);
      // Flame outer glow
      ctx.fillStyle = `rgba(255,160,40,${0.65 + pulse * 0.25})`;
      ctx.beginPath(); ctx.arc(0, -TH * 1.00, TH * 0.10, 0, Math.PI * 2); ctx.fill();
      // Flame bright core
      ctx.fillStyle = `rgba(255,240,180,${0.75 + pulse * 0.2})`;
      ctx.beginPath(); ctx.arc(0, -TH * 1.02, TH * 0.048, 0, Math.PI * 2); ctx.fill();
    } else if (id.includes("barrel") || id.includes("keg")) {
      ctx.fillStyle = "#7b4b2d"; ctx.fillRect(-TW * 0.16, -TH * 0.7, TW * 0.32, TH * 0.72);
      ctx.fillStyle = "#b27a4a"; ctx.fillRect(-TW * 0.18, -TH * 0.62, TW * 0.36, TH * 0.08);
      ctx.fillRect(-TW * 0.18, -TH * 0.18, TW * 0.36, TH * 0.08);
    } else if (id.includes("pillar")) {
      ctx.fillStyle = "#67676b"; ctx.fillRect(-TW * 0.12, -TH * 1.9, TW * 0.24, TH * 1.9);
      ctx.fillStyle = "#8a8a90"; ctx.fillRect(-TW * 0.18, -TH * 2.0, TW * 0.36, TH * 0.16);
    } else if (id.includes("banner")) {
      ctx.fillStyle = "#8d221f"; ctx.fillRect(-TW * 0.11, -TH * 1.8, TW * 0.22, TH * 1.4);
      ctx.fillStyle = "#d8b060"; ctx.fillRect(-TW * 0.14, -TH * 1.9, TW * 0.28, TH * 0.06);
    } else {
      ctx.fillStyle = "#8a6b48"; ctx.fillRect(-TW * 0.2, -TH * 0.85, TW * 0.4, TH * 0.65);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _useTownPortal() {
    const p = this.player;
    if (this.screen === "dead" || this.screen === "act_complete") return;
    if (this.screen === "town") {
      if (this.tpReturnPoint) {
        const r = this.tpReturnPoint;
        this.screen = r.screen;
        this.player.wx = r.wx; this.player.wy = r.wy;
        this.tpReturnPoint = null;
        this._ensureSpawnSafe();
        this._centerCamera();
        this._addFloat("RETURN PORTAL", this.player.wx, this.player.wy - 50, "#aa66ff", 120);
      } else {
        this._addFloat("NO ACTIVE PORTAL", p.wx, p.wy - 30, "#ff8800", 60);
      }
      return;
    }
    if ((p.beltTp || 0) <= 0) {
      this._addFloat("NO TP SCROLLS", p.wx, p.wy - 30, "#ff4444", 70);
      return;
    }
    p.beltTp--;
    this.tpReturnPoint = { screen: this.screen, wx: p.wx, wy: p.wy };
    this.screen = "town";
    this.player.wx = this.town.spawnWx;
    this.player.wy = this.town.spawnWy;
    this._ensureSpawnSafe();
    this._centerCamera();
    this._addFloat("TOWN PORTAL", this.player.wx, this.player.wy - 50, "#aa66ff", 140);
  }

  // Identify scroll: removes the unidentified flag from the first eligible
  // inventory item. Items can be marked unidentified by their drop logic
  // (rare/unique gear) — if no items need ID, the scroll isn't consumed.
  _useIdentifyScroll() {
    const p = this.player;
    if ((p.beltId || 0) <= 0) {
      this._addFloat("NO ID SCROLLS", p.wx, p.wy - 30, "#ff4444", 70);
      return;
    }
    const target = (p.inventory || []).find(it => it && it.unidentified);
    if (!target) {
      this._addFloat("NOTHING TO IDENTIFY", p.wx, p.wy - 30, "#ffaa44", 70);
      return;
    }
    target.unidentified = false;
    p.beltId--;
    this._addFloat(`IDENTIFIED: ${target.name || "ITEM"}`, p.wx, p.wy - 30, "#44ff88", 110);
  }

  _interact() {
    const p = this.player;
    // Town: activate nearest NPC within range
    if (this.screen === "town") {
      let near = null, nd = 80;
      for (const n of this.town.npcs) {
        const d = Math.hypot(n.wx - p.wx, n.wy - p.wy);
        if (d < nd) { nd = d; near = n; }
      }
      const statue = this._activeStatues().find(s => !s.found && Math.hypot(s.wx - p.wx, s.wy - p.wy) < 76);
      if (statue) { this._useStatue(statue); return; }
      if (near) this._activateTownNpc(near);
      const smash = this._townBreakables().find(b => Math.hypot(b.wx - p.wx, b.wy - p.wy) < 74);
      if (smash) { this._smashTownProp(smash); return; }
      const building = this._nearestTownBuildingTo(p.wx, p.wy, 96);
      if (building) { this._enterTownBuilding(building); return; }
      return;
    }
    const statue = this._activeStatues().find(s => !s.found && Math.hypot(s.wx - p.wx, s.wy - p.wy) < 76);
    if (statue) { this._useStatue(statue); return; }
    const nearbyLoot = this.loot.filter(l => Math.hypot(l.wx - p.wx, l.wy - p.wy) < 52).slice(0, 4);
    if (nearbyLoot.length) {
      nearbyLoot.forEach(l => this._pickupLootById(l.id));
      return;
    }
    // Pick up nearby loot
    this.loot = this.loot.filter(l => {
      const dx = l.wx - p.wx, dy = l.wy - p.wy;
      if (Math.sqrt(dx*dx+dy*dy) < 40) {
        if (l.item.slot === "gold") { p.gold += l.item.goldVal; this._addFloat(`+${l.item.goldVal} 💰`, l.wx, l.wy-20, "#ffdd00", 60); }
        else {
          p.inventory.push(l.item);
          if (l.item.slot === "rune" && l.item.rune) this.chronicle.runesFound[l.item.rune] = (this.chronicle.runesFound[l.item.rune]||0)+1;
          this._addFloat(`${l.item.rarity.id !== "normal" ? "★ " : ""}${l.item.name}`, l.wx, l.wy-20, l.item.rarity.color, 70);
        }
        this.score += l.item.goldVal || 10;
        return false;
      }
      return true;
    });
    if (this.screen === "wilderness") {
      const dx=this.wilderness.caveWx-p.wx, dy=this.wilderness.caveWy-p.wy;
      if (Math.hypot(dx,dy) < 56) this._enterDungeon();
      return;
    }
    if (this.screen !== "dungeon") return;
    // Open nearby chests
    this.dungeon.chests.forEach(ch => {
      if (ch.open) return;
      const cx = ch.tx*this.TS + this.TS/2, cy = ch.ty*this.TS + this.TS/2;
      const dx = cx-p.wx, dy = cy-p.wy;
      if (Math.sqrt(dx*dx+dy*dy) < 45) {
        ch.open = true;
        for (let i=0; i<3; i++) this._dropLoot(cx+Math.random()*30-15, cy+Math.random()*30-15, this.actIdx+1);
        this._addFloat("📦 CHEST OPENED!", cx, cy-30, "#ffdd00", 80);
        this.quests.forEach(q=>{ if(!q.complete&&q.type==="chest"){q.done++;if(q.done>=q.needed)this._completeQuest(q);} });
      }
    });
    // Enter stairs to boss
    const bx=this.dungeon.bossX*this.TS+this.TS/2, by=this.dungeon.bossY*this.TS+this.TS/2;
    if (!this.bossSpawned) {
      const st = this.dungeon.rooms[Math.max(this.dungeon.rooms.length-2,0)];
      const sx=(st.x+Math.floor(st.w/2))*this.TS+this.TS/2, sy=(st.y+Math.floor(st.h/2))*this.TS+this.TS/2;
      const dx=sx-p.wx, dy=sy-p.wy;
      if (Math.sqrt(dx*dx+dy*dy) < 45) {
        this._spawnBoss();
        this._addFloat("⚠ BOSS INCOMING!", p.wx, p.wy-40, "#ff4444", 120);
      }
    }
  }

  _spawnBoss() {
    const stage = this._secretStage();
    const hfBoss = stage?.era === "hellfire" ? (HF_MONSTERS[stage.boss] || getWaveBoss((this.secretCampaign.stageIdx || 0) + 1, stage.style)) : null;
    const ab = hfBoss ? {
      name:this._displayEnemyName(stage?.boss || hfBoss.id || hfBoss.name, hfBoss.name), icon:hfBoss.icon || "*", color:hfBoss.color,
      hp:hfBoss.hp, dmg:hfBoss.dmg, xp:(hfBoss.reward || 500) * 2, gold:hfBoss.reward || 400,
    } : { ...this.act.boss, name:this._displayEnemyName(this.act.boss?.name, this.act.boss?.name) };
    const bx = this.dungeon.bossX*this.TS+this.TS/2;
    const by = this.dungeon.bossY*this.TS+this.TS/2;
    this.boss = {
      name: ab.name, icon: ab.icon, color: ab.color,
      maxHp: Math.round(ab.hp * this.diffMult * (this.playerCountMult||1)),
      hp:    Math.round(ab.hp * this.diffMult * (this.playerCountMult||1)),
      dmg:   Math.round(ab.dmg * this.diffMult * Math.sqrt(this.playerCountMult||1)),
      xp: ab.xp, gold: ab.gold,
      wx: bx, wy: by,
      size: 45, spd: 0.9,
      // Per-act boss → Meshy GLB mapping (Alpha 5: bosses were rendering as
      // giant circles because assetId was null for most acts). The mapped IDs
      // all resolve through crMeshyActor() to GLB urls on disk.
      assetId: this.actIdx >= 5
        ? "act6_final_boss"
        : (stage?.boss === "diablo" ? "diabl0_archfiend"
          : this.actIdx === 0 ? "treasure_maw"
          : this.actIdx === 1 ? "crimson_emberwyrm"
          : this.actIdx === 2 ? "abyssal_harbinger"
          : this.actIdx === 3 ? "infernal_behemoth"
          : this.actIdx === 4 ? "crimson_infernal_behemoth"
          : null),
      phase: 1, attackCd: 80, lastAtk: 0, summonTimer: 0,
      hasPhase3: !!ab.phase3, phase3hp: ab.phase3hp || 0.25,
      secretStage: stage?.id || null,
    };
    this.bossSpawned = true;
    this._broadcastOnline("boss_spawn", { boss:this.boss.name, wx:bx, wy:by, stage:stage?.id });
  }

  _applyChampionMods(e) {
    const MODS = ["Extra Fast","Fire Enchanted","Cold Enchanted","Stone Skin","Cursed","Fanaticism","Berserker"];
    const n = 1 + Math.floor(Math.random()*2);
    e.mods = [];
    for (let i=0;i<n;i++) {
      const m = MODS[Math.floor(Math.random()*MODS.length)];
      if (!e.mods.includes(m)) e.mods.push(m);
    }
    if (e.mods.includes("Extra Fast"))       e.spd *= 1.7;
    if (e.mods.includes("Fire Enchanted"))   { e.dmg = Math.round(e.dmg*1.5); e.fireAura=true; }
    if (e.mods.includes("Cold Enchanted"))   { e.dmg = Math.round(e.dmg*1.3); e.freezeOnHit=60; }
    if (e.mods.includes("Stone Skin"))       { e.def=(e.def||0)+12; e.maxHp=Math.round(e.maxHp*1.4); e.hp=e.maxHp; }
    if (e.mods.includes("Cursed"))           e.cursed=true;
    if (e.mods.includes("Fanaticism"))       { e.atkCd=Math.max(20,e.atkCd-20); e.dmg=Math.round(e.dmg*1.3); }
    if (e.mods.includes("Berserker"))        { e.spd*=1.3; e.dmg=Math.round(e.dmg*1.6); e.maxHp=Math.round(e.maxHp*0.7); e.hp=e.maxHp; }
    e.isChampion = true;
    e.size = Math.round(e.size * 1.35);
    e.color = "#ffaa22";
    e.xp = Math.round(e.xp * 3);
    e.loot = Math.min(0.95, e.loot + 0.4);
  }

  _spawnEnemies(count) {
    const stage = this._secretStage();
    if (stage?.era === "hellfire") {
      const rooms = this.dungeon.rooms;
      const pool = getWaveEnemyPool((this.secretCampaign.stageIdx || 0) + 1, stage.style);
      for (let i=0; i<count; i++) {
        const room = rooms[1 + Math.floor(Math.random()*(rooms.length-2))];
        const t = pool[Math.floor(Math.random()*pool.length)];
        if (!t) continue;
        const wx = (room.x + Math.random()*room.w) * this.TS;
        const wy = (room.y + Math.random()*room.h) * this.TS;
        this.enemies.push({
          id:this._nextId++, type:t.id || String(t.name||"hellfire").toLowerCase().replace(/\s+/g,"_"),
          name:this._displayEnemyName(t.id || t.name, t.name), color:t.color, maxHp:Math.round(t.hp*this.diffMult*(this.playerCountMult||1)),
          hp:Math.round(t.hp*this.diffMult*(this.playerCountMult||1)),
          dmg:Math.round(t.dmg*this.diffMult*Math.sqrt(this.playerCountMult||1)),
          spd:t.spd || 0.8, xp:t.reward || 20, size:t.size || 14,
          ai:t.ranged ? "ranged" : "melee", loot:0.42, def:0, wx, wy,
          angle:0, frozen:0, lastAtk:0, atkCd:t.atk ? Math.max(35, Math.round(t.atk/20)) : 60,
          isDead:false, corpse:false, hellfire:true,
        });
      }
      return;
    }
    const act = this.act;
    const rooms = this.dungeon.rooms;
    for (let i=0; i<count; i++) {
      const room = rooms[1 + Math.floor(Math.random()*(rooms.length-2))];
      const eid = act.enemies[Math.floor(Math.random()*act.enemies.length)];
      const t = CR_ENEMIES[eid];
      if (!t) continue;
      const wx = (room.x + Math.random()*room.w) * this.TS;
      const wy = (room.y + Math.random()*room.h) * this.TS;
      const e = {
        id: this._nextId++, type:eid, name:this._displayEnemyName(eid, t.name), color:t.color,
        maxHp: Math.round(t.hp * this.diffMult * (this.playerCountMult||1)),
        hp:    Math.round(t.hp * this.diffMult * (this.playerCountMult||1)),
        dmg:   Math.round(t.dmg * this.diffMult * Math.sqrt(this.playerCountMult||1)),
        spd: t.spd, xp: t.xp, size: t.size, ai: t.ai, loot: t.loot,
        def: 0, wx, wy, angle:0, frozen:0, lastAtk:0, atkCd:60,
        isDead: false, corpse: false,
      };
      // 12% chance of champion, 3% chance of elite
      const roll = Math.random();
      if (roll < 0.03) { this._applyChampionMods(e); e.color="#ff2200"; e.name="ELITE "+e.name.toUpperCase(); e.size=Math.round(e.size*1.2); }
      else if (roll < 0.15) { this._applyChampionMods(e); }
      this.enemies.push(e);
    }
  }

  _dropLoot(wx, wy, actLevel) {
    const item = this._prepareDroppedItem(_genItem(actLevel));
    this.loot.push({ id:this._nextId++, wx, wy, item, age:0 });
    // Pickit-matched drops: announce on the spot so the player notices in dense loot piles.
    if (item?.pickit) {
      this._addFloat(`★ ${item.pickit.label}`, wx, wy - 18, "#ffd24a", 90);
    }
  }

  _addFloat(text, wx, wy, color="#ffffff", life=60) {
    const nearby = this.floatingText.filter(f => Math.hypot((f.wx||0)-wx, (f.wy||0)-wy) < 72).length;
    // Spread overlapping damage numbers: vertical offset + horizontal jitter +
    // staggered start delay so they don't stack invisibly on top of each other.
    const jitterX = (Math.random() - 0.5) * 24 + nearby * ((Math.random() - 0.5) * 18);
    this.floatingText.push({
      text, wx: wx + jitterX, wy: wy - nearby * 16, color,
      life, maxLife: life,
      vy: -0.82 - nearby * 0.06 - Math.random() * 0.15,
      drift: (Math.random() - 0.5) * 0.34,
      stagger: nearby * 3,
    });
  }

  // ─── Skill Use ─────────────────────────────────────────────────────────────
  _skillAnimState(sk) {
    const id = String(sk?.id || "").toLowerCase();
    const type = String(sk?.type || "").toLowerCase();
    const name = String(sk?.name || "").toLowerCase();
    const token = `${id} ${name} ${type}`;
    if (type === "buff" || token.includes("taunt") || token.includes("cry") || token.includes("shout")) return "battle_cry";
    if (type === "leap" || type === "teleport" || type === "blink") return "leap";
    if (type === "shield" || token.includes("shield") || token.includes("block")) return "block";
    if (token.includes("whirl") || token.includes("spin")) return "whirlwind";
    if (type === "melee" || type === "combo" || token.includes("slam") || token.includes("quake")) return "attack_heavy";
    if (type === "projectile" || type === "aoe" || type === "storm" || type === "summon" || type === "corpse") return "cast";
    return "attack";
  }

  _useSkill(slot) {
    if (!this._isCombatArea()) return;
    if (this.skillCooldowns[slot] > 0) return;
    const p = this.player;
    const sk = this.cls.skills[slot];
    if (!sk) return;
    // Skill-tree rank scales damage and reduces MP cost (D2-style)
    const rank = (p.skillRanks && p.skillRanks[slot]) || 1;
    const rankDmg = 1 + (rank-1)*0.18;
    const mpCost = Math.max(2, sk.mp - (rank-1));
    if (p.mp < mpCost) { this._addFloat("LOW MANA", p.wx, p.wy-20, "#4444ff", 50); return; }
    p.mp -= mpCost;
    const animState = this._skillAnimState(sk);
    p.attackAnimState = animState;
    p.attackTimer = Math.max(p.attackTimer || 0, animState === "battle_cry" ? 36 : 28);
    this._primeFpsCast(sk);

    const dx = this.mouseX - this.canvas.width/2;
    const dy = this.mouseY - this.canvas.height/2;
    const angle = this.camera === "fps" ? p.angle : Math.atan2(dy, dx);

    const cd = 40 + mpCost * 2;
    this.skillCooldowns[slot] = cd;
    this.score += 5;
    // Apply rank-scaled damage globally (used by branches below via skill.dmg shadow)
    const baseDmg = sk.dmg;
    sk.dmg = Math.round(baseDmg * rankDmg);
    setTimeout(() => { sk.dmg = baseDmg; }, 0);

    if (sk.type === "projectile") {
      this.projectiles.push({
        id:this._nextId++, wx:p.wx, wy:p.wy, angle,
        spd:5, dmg:Math.round(sk.dmg * p.dmg/15 * this.cls.stats.nrg/10),
        range:sk.range, traveled:0, color:sk.color, size:8,
        aoe:sk.aoe||0, fromPlayer:true, skill:sk.id,
      });
    } else if (sk.type === "aoe" || sk.type === "storm") {
      this._doAoe(p.wx, p.wy, sk.aoe, Math.round(sk.dmg*(p.str||1)/10), sk.color, sk.freeze||0);
    } else if (sk.type === "buff") {
      p.buffDmg = sk.buffDmg || 1.5; p.buffDef = sk.buffDef || 1.4;
      p.buffTimer = sk.buffDur || 300;
      this._addFloat("⚡ BUFFED!", p.wx, p.wy-30, sk.color, 80);
    } else if (sk.type === "leap" || sk.type === "teleport" || sk.type === "blink") {
      const dist = Math.min(sk.range, 220);
      const tx = p.wx + Math.cos(angle)*dist, ty = p.wy + Math.sin(angle)*dist;
      if (this._walkable(Math.floor(tx/this.TS), Math.floor(ty/this.TS))) {
        p.wx = tx; p.wy = ty;
        if (sk.aoe) this._doAoe(tx, ty, sk.aoe, Math.round(sk.dmg*(p.str||1)/10), sk.color, 0);
        this._spawnParticles(tx, ty, sk.color, 12);
      }
    } else if (sk.type === "summon") {
      if (this.summons.length < (sk.maxSummons||5)) {
        this.summons.push({
          id:this._nextId++, type:"skeleton", assetId:"summon_skeleton", name:"Pet Skeleton",
          wx:p.wx+Math.cos(angle)*26+Math.random()*28-14, wy:p.wy+Math.sin(angle)*26+Math.random()*28-14,
          hp:90, maxHp:90, dmg:Math.round(sk.dmg*(p.level||1)/2), spd:2.8,
          color:"#d8d2b2", size:20, lastAtk:0, atkCd:54, angle, animState:"idle", owner:"player", isSummon:true,
        });
        this._addFloat("💀 SUMMONED!", p.wx, p.wy-30, "#aaaacc", 70);
      }
    } else if (sk.type === "spread") {
      const count = sk.count||5;
      for (let i=0; i<count; i++) {
        const a = angle - (sk.spread||0.4) + (sk.spread||0.4)*2*(i/(count-1));
        this.projectiles.push({
          id:this._nextId++, wx:p.wx, wy:p.wy, angle:a,
          spd:6, dmg:Math.round(sk.dmg*(p.dex||1)/10),
          range:sk.range, traveled:0, color:sk.color, size:5, fromPlayer:true,
        });
      }
    } else if (sk.type === "rain") {
      const tx = p.wx + Math.cos(angle)*(sk.range*0.6);
      const ty = p.wy + Math.sin(angle)*(sk.range*0.6);
      for (let i=0; i<(sk.count||10); i++) {
        const delay = i*(sk.delay||18);
        const rx=tx+Math.random()*sk.aoe-sk.aoe/2, ry=ty+Math.random()*sk.aoe-sk.aoe/2;
        setTimeout(()=>{ this._doAoe(rx,ry,20,Math.round(sk.dmg*(p.dex||1)/10),sk.color,0); }, delay*16);
      }
    } else if (sk.type === "shield") {
      p.shielded = sk.shieldDur||180;
      this._addFloat("🛡 INVINCIBLE!", p.wx, p.wy-30, sk.color, 80);
    } else if (sk.type === "transform") {
      p.bearForm = true; p.bearTimer = sk.bearDur||360;
      p.hp = Math.min(p.maxHp+sk.hpBonus, p.hp + sk.hpBonus);
      this._addFloat("🐻 BEAR FORM!", p.wx, p.wy-30, sk.color, 80);
    } else if (sk.type === "trap") {
      this.traps.push({ wx:p.wx, wy:p.wy, dmg:Math.round(sk.dmg*(p.dex||1)/10), aoe:sk.aoe||50, color:sk.color, armed:false, armTimer:45 });
    } else if (sk.type === "snare") {
      this._doAoe(p.wx+Math.cos(angle)*sk.range*0.7, p.wy+Math.sin(angle)*sk.range*0.7, sk.aoe, Math.round(sk.dmg/5), sk.color, sk.snareDur||180);
    } else if (sk.type === "melee" || sk.type === "combo") {
      this._doAoe(p.wx+Math.cos(angle)*40, p.wy+Math.sin(angle)*40, sk.range||70, Math.round(sk.dmg*(p.str||1)/12), sk.color, 0);
    } else if (sk.type === "pierce") {
      for (let s=0; s<8; s++) {
        const px=p.wx+Math.cos(angle)*s*40, py=p.wy+Math.sin(angle)*s*40;
        this._doAoe(px, py, 20, Math.round(sk.dmg*(p.nrg||1)/10), sk.color, 0);
      }
    } else if (sk.type === "corpse") {
      const corpse = this.enemies.find(e=>e.isDead && !e.exploded);
      if (corpse) {
        corpse.exploded = true;
        this._doAoe(corpse.wx, corpse.wy, sk.aoe, Math.round(sk.dmg*(p.nrg||1)/10), sk.color, 0);
        this._spawnParticles(corpse.wx, corpse.wy, "#663344", 20);
      }
    } else if (sk.type === "stealth") {
      p.stealthed = sk.stealthDur||180;
      this.enemies.forEach(e=>{ if (!e.isDead) { e.targetLost=true; e.targetLostTimer=sk.stealthDur||180; }});
      this._addFloat("🌫 VANISHED", p.wx, p.wy-30, sk.color, 70);
    }
    this._spawnParticles(p.wx, p.wy, sk.color, 6);
  }

  _primeFpsCast(sk) {
    if (this.camera !== "fps" || !sk) return;
    const name = `${sk.id || ""} ${sk.name || ""} ${sk.type || ""}`.toLowerCase();
    this.fpsCastFlash = name.includes("fire") || name.includes("ember") || name.includes("meteor") || name.includes("inferno") || name.includes("hydra") ? 30 : 22;
    this.fpsCastColor = sk.color || this.cls.color || "#ff6622";
    this.fpsCastKind = name.includes("frost") || name.includes("ice") || name.includes("cold") ? "frost" :
      name.includes("light") || name.includes("storm") || name.includes("chain") ? "storm" :
      name.includes("bone") || name.includes("corpse") ? "bone" : "fire";
  }

  _doAoe(wx, wy, radius, dmg, color, freezeDur) {
    this.enemies.forEach(e => {
      if (e.isDead) return;
      const dx=e.wx-wx, dy=e.wy-wy;
      if (Math.sqrt(dx*dx+dy*dy) < radius+e.size) {
        this._hitEnemy(e, dmg, color);
        if (freezeDur) e.frozen = freezeDur;
      }
    });
    if (this.boss) {
      const dx=this.boss.wx-wx, dy=this.boss.wy-wy;
      if (Math.sqrt(dx*dx+dy*dy) < radius+this.boss.size) this._hitBoss(dmg);
    }
    this._spawnParticles(wx, wy, color, 8);
  }

  _hitEnemy(e, dmg, color) {
    const actualDmg = Math.max(1, dmg - Math.floor((e.def||0)/2) - Math.floor(e.size/4));
    e.hp -= actualDmg;
    this._addFloat(`-${actualDmg}`, e.wx, e.wy-20, color||"#ff4444", 45);
    if (e.hp <= 0) this._killEnemy(e);
  }

  _hitBoss(dmg) {
    const b = this.boss;
    const actualDmg = Math.max(1, dmg - 5);
    b.hp -= actualDmg;
    this._addFloat(`-${actualDmg}`, b.wx, b.wy-50, "#ff8800", 50);
    if (!b.phase2 && b.hp < b.maxHp*0.5) {
      b.phase2 = true; b.spd *= 1.5; b.atkCd = 50;
      this._addFloat("⚠ PHASE 2!", b.wx, b.wy-70, "#ff2200", 120);
    }
    if (b.hp <= 0) this._killBoss();
  }

  _killEnemy(e) {
    e.isDead = true; e.corpse = true;
    const p = this.player;
    p.xp += e.xp;
    this.score += e.xp;
    if (p.xp >= p.xpNext) this._levelUp();
    if (Math.random() < e.loot) this._dropLoot(e.wx, e.wy, this.actIdx+1);
    this._spawnParticles(e.wx, e.wy, e.color, 8);
    // Quest progress
    this.quests.forEach(q=>{
      if (q.complete) return;
      if (q.type === "kill" && q.target === e.type) q.done++;
      else if (q.type === "kill_any") q.done++;
      else if (q.type === "elite" && (e.isChampion || String(e.name || "").startsWith("ELITE"))) q.done++;
      if (q.done >= q.needed) this._completeQuest(q);
    });
  }

  _completeQuest(q) {
    q.complete=true;
    const p=this.player;
    p.gold+=q.reward.gold||0; p.xp+=q.reward.xp||0;
    if (q.reward.statPoints) p.statPoints = (p.statPoints || 0) + q.reward.statPoints;
    if (q.reward.skillPoints) p.skillPoints = (p.skillPoints || 0) + q.reward.skillPoints;
    if (q.reward.resist) {
      p.resist = p.resist || {};
      ["fire","cold","lightning","poison"].forEach(k => { p.resist[k] = (p.resist[k] || 0) + q.reward.resist; });
    }
    if (q.reward.identify) this.identifierFreed = true;
    if (q.reward.mercDiscount) this.mercDiscount = true;
    if (q.reward.imbue) this.imbueCharges = (this.imbueCharges || 0) + 1;
    if (q.reward.sockets) this.socketCharges = (this.socketCharges || 0) + 1;
    if (q.reward.nameItem) this.nameItemCharges = (this.nameItemCharges || 0) + 1;
    if (q.reward.item) this._dropLoot(p.wx,p.wy-50,this.actIdx+2);
    this._addFloat(`✅ QUEST: ${q.name}`,p.wx,p.wy-60,"#44ff88",150);
    this.score+=q.reward.xp||0;
    if (p.xp>=p.xpNext) this._levelUp();
  }

  _killBoss() {
    const b = this.boss;
    const p = this.player;
    p.xp += b.xp; p.gold += b.gold; this.score += b.xp * 5;
    this.quests.forEach(q=>{ if(!q.complete&&q.type==="boss"){q.done++;if(q.done>=q.needed)this._completeQuest(q);} });
    for (let i=0; i<6; i++) this._dropLoot(b.wx+Math.random()*80-40, b.wy+Math.random()*80-40, this.actIdx+2);
    this._spawnParticles(b.wx, b.wy, b.color, 30);
    this._addFloat(`🏆 ${b.name} SLAIN!`, b.wx, b.wy-60, "#ffdd00", 180);
    this.boss = null;
    if (this._advanceSecretCampaign()) return;
    setTimeout(()=>{ this.screen = "act_complete"; }, 2500);
  }

  _levelUp() {
    const p = this.player;
    p.level++; p.xpNext = Math.floor(p.xpNext * 1.55);
    p.xp = 0; p.statPoints += 5;
    p.skillPoints = (p.skillPoints||0) + 1;
    p.maxHp += 8; p.hp = p.maxHp;
    p.maxMp += 5; p.mp = p.maxMp;
    p.dmg += 2; p.def += 1;
    this._addFloat(`⭐ LEVEL ${p.level}!`, p.wx, p.wy-50, "#ffdd00", 120);
    this.score += 200;
  }

  _basicAttack(mx, my) {
    if (this._frame - this.lastAttack < this.attackCd) return;
    if (!this._isCombatArea()) return;
    this.lastAttack = this._frame;
    const p = this.player;
    p.attackTimer = 34; // keep the 128-bit attack strip visible long enough to read
    p.attackAnimState = "attack";
    if (this.camera === "fps") this.fpsMeleeFlash = 16;
    // Direction from player to mouse in world space
    let angle;
    if (this.camera === "fps") {
      angle = p.angle;
    } else if (this.camera === "iso" || this.camera === "third") {
      const w = this._screenToWorld(mx, my);
      angle = Math.atan2(w.wy - p.wy, w.wx - p.wx);
    } else {
      const w = this._screenToWorld(mx, my);
      angle = Math.atan2(w.wy - p.wy, w.wx - p.wx);
    }
    p.angle = angle;
    const dmg = Math.round(p.dmg * (p.buffDmg||1) * (p.bearForm ? 1.8 : 1));
    this.projectiles.push({
      id:this._nextId++, wx:p.wx, wy:p.wy, angle,
      spd:7, dmg, range:160+p.dex*5, traveled:0,
      color: this.cls.color, size:5, fromPlayer:true,
    });
    this.score += 1;
  }

  get _activeMap() {
    if (this.screen === "town") return this.town.map;
    if (this.screen === "wilderness") return this.wilderness.map;
    return this.dungeon.map;
  }

  _walkable(tx, ty) {
    const m = this._activeMap;
    // Alpha 5.3 hardening: a NaN tx/ty (e.g. after a botched teleport that
    // left player.wx undefined) was crashing the main loop with "Cannot
    // read properties of undefined (reading 'NaN')". Reject non-finite
    // coords up front + verify the map exists.
    if (!m || !m.length || !Number.isFinite(tx) || !Number.isFinite(ty)) return false;
    if (ty<0||ty>=m.length||tx<0||tx>=m[0].length) return false;
    const v = m[ty][tx];
    if (this.screen === "town") {
      // In town: 1=building (blocked), 6=fountain (blocked), all else walkable
      return v !== 1 && v !== 6;
    }
    if (this.screen === "wilderness") {
      // Alpha 5.4 — landmarks (15/16/17) are walkable so the player can
      // touch them to trigger their effect.
      return v === 0 || v === 4 || v === 7 || v === 8 || v === 15 || v === 16 || v === 17;
    }
    // Dungeon: 0 floor, 3 chest, 4 stairs, 9 boss; Alpha 5.4 biome tiles
    // (10 lava, 11 ice, 12 blood) + shrines (13) + waypoint (14) + smashable props (15) all walkable.
    return v === 0 || v === 3 || v === 4 || v === 9 || v === 10 || v === 11 || v === 12 || v === 13 || v === 14 || v === 15;
  }

  _nearestWalkableTile(map, tx, ty, maxRadius=10) {
    if (!map?.length || !map[0]?.length) return { tx, ty };
    const cols = map[0].length, rows = map.length;
    const ok = (x,y) => y>=0 && y<rows && x>=0 && x<cols && (
      map[y][x]===0 || map[y][x]===3 || map[y][x]===4 || map[y][x]===9 ||
      map[y][x]===10 || map[y][x]===11 || map[y][x]===12 || map[y][x]===13 || map[y][x]===14
    );
    tx = Math.max(0, Math.min(cols-1, Math.floor(tx)));
    ty = Math.max(0, Math.min(rows-1, Math.floor(ty)));
    if (ok(tx,ty)) return { tx, ty };
    for (let r=1; r<=maxRadius; r++) {
      for (let y=ty-r; y<=ty+r; y++) for (let x=tx-r; x<=tx+r; x++) {
        if ((x===tx-r || x===tx+r || y===ty-r || y===ty+r) && ok(x,y)) return { tx:x, ty:y };
      }
    }
    return { tx:1, ty:1 };
  }

  _screenToWorld(sx, sy) {
    if (this.camera === "iso") {
      const z = this._viewScale();
      const W = this.canvas.width, H = this.canvas.height;
      const isoX = (sx - W/2) / z + this.camX + W/2;
      const isoY = (sy - H/2) / z + this.camY + H/2;
      let tx = (isoX/this.TW + isoY/this.TH) / 2;
      let ty = (isoY/this.TH - isoX/this.TW) / 2;
      const yaw = this.cameraYaw || 0;
      if (yaw) {
        const ptx = this.player.wx / this.TS;
        const pty = this.player.wy / this.TS;
        const dx = tx - ptx, dy = ty - pty;
        const c = Math.cos(yaw), s = Math.sin(yaw);
        tx = ptx + dx*c + dy*s;
        ty = pty - dx*s + dy*c;
      }
      return { wx: tx*this.TS, wy: ty*this.TS };
    } else if (this.camera === "third") {
      const p = this.player;
      const side = (sx - this.canvas.width/2) / Math.max(1, this.canvas.width/2);
      const zoom = this._cameraZoomScale();
      const depth = (150 + (1 - Math.max(-0.8, Math.min(0.8, side))**2) * 130) / Math.max(0.65, zoom);
      const angle = p.angle + (this.cameraYaw || 0) + side * 0.78;
      return { wx: p.wx + Math.cos(angle)*depth, wy: p.wy + Math.sin(angle)*depth };
    } else if (this.camera === "top") {
      return this._screenToTopWorld(sx, sy);
    }
    // FPS: just project a point in front of player
    const p = this.player;
    return { wx: p.wx + Math.cos(p.angle)*120, wy: p.wy + Math.sin(p.angle)*120 };
  }

  // Inverse of _screenToWorld — given world coordinates, where on the canvas
  // do they project? Used by the React transform popup to position itself
  // over the selected placed asset. Only iso/top are exact; third/fps use a
  // simple front-center estimate (good enough for selection UI).
  _worldToScreen(wx, wy) {
    if (!this.canvas) return null;
    const W = this.canvas.width, H = this.canvas.height;
    if (this.camera === "iso") {
      let tx = wx / this.TS, ty = wy / this.TS;
      const yaw = this.cameraYaw || 0;
      if (yaw && this.player) {
        const ptx = this.player.wx / this.TS, pty = this.player.wy / this.TS;
        const dx = tx - ptx, dy = ty - pty;
        const c = Math.cos(-yaw), s = Math.sin(-yaw);
        tx = ptx + dx*c + dy*s;
        ty = pty - dx*s + dy*c;
      }
      const isoX = (tx - ty) * this.TW;
      const isoY = (tx + ty) * this.TH;
      const z = this._viewScale();
      const sx = (isoX - this.camX - W/2) * z + W/2 + W/2;
      const sy = (isoY - this.camY - H/2) * z + H/2 + H/2;
      return { x: sx, y: sy };
    }
    if (this.camera === "top") {
      // Simple ortho — TS units, camera centered on player.
      if (!this.player) return null;
      const z = this._cameraZoomScale ? this._cameraZoomScale() : 1;
      return {
        x: W/2 + (wx - this.player.wx) * z,
        y: H/2 + (wy - this.player.wy) * z,
      };
    }
    // third / fps — project relative to player heading
    if (!this.player) return null;
    const p = this.player;
    const dx = wx - p.wx, dy = wy - p.wy;
    const ang = (this.cameraYaw || 0) + (p.angle || 0);
    const c = Math.cos(-ang), s = Math.sin(-ang);
    const fx = dx*c - dy*s;        // forward
    const fy = dx*s + dy*c;        // lateral
    if (fx < 30) return { x: W/2, y: H * 0.4 }; // behind player — anchor center-top
    const fov = 60;
    return {
      x: W/2 + (fy / fx) * (W/2) * 0.8,
      y: H/2 - fov,                 // approx feet
    };
  }

  _spawnParticles(wx, wy, color, count) {
    if (!this.Q.particles) return;
    for (let i=0; i<count; i++) {
      const a=Math.random()*Math.PI*2, spd=1+Math.random()*3;
      this.particles.push({ wx, wy, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd-1, color, life:25+Math.random()*20, size:2+Math.random()*3 });
    }
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  _updateGamepadInput() {
    if (!this.gameSettings?.controller?.enabled || typeof navigator === "undefined" || !navigator.getGamepads) {
      this.gamepadMove = { x:0, y:0, lookX:0, lookY:0 };
      return;
    }
    const pad = Array.from(navigator.getGamepads()).find(Boolean);
    if (!pad) { this.gamepadMove = { x:0, y:0, lookX:0, lookY:0 }; return; }
    const dz = Number(this.gameSettings.controller.deadzone ?? 0.18);
    const axis = i => Math.abs(pad.axes?.[i] || 0) > dz ? (pad.axes[i] || 0) : 0;
    let x = axis(0), y = axis(1);
    if (pad.buttons?.[14]?.pressed) x -= 1;
    if (pad.buttons?.[15]?.pressed) x += 1;
    if (pad.buttons?.[12]?.pressed) y -= 1;
    if (pad.buttons?.[13]?.pressed) y += 1;
    this.gamepadMove = { x:Math.max(-1,Math.min(1,x)), y:Math.max(-1,Math.min(1,y)), lookX:axis(2), lookY:axis(3) };
    const edge = (idx, fn) => {
      const pressed = !!pad.buttons?.[idx]?.pressed;
      if (pressed && !this._padPressed[idx]) fn();
      this._padPressed[idx] = pressed;
    };
    edge(9, ()=>{
      this.paused = !this.paused;
      if (this.paused) this.pauseTab = this.pauseTab || "save";
    });
    if (this.paused) {
      edge(1, ()=>{ this.paused = false; });
      return;
    }
    edge(8, ()=>this._cycleMapMode());
    edge(10, ()=>this._cycleCamera());
    edge(11, ()=>this._resetCameraRig());
    edge(0, ()=>{
      const p = this.player;
      const canInteract = this.screen === "town" ||
        this.loot.some(l => Math.hypot(l.wx - p.wx, l.wy - p.wy) < 58) ||
        this._activeStatues().some(s => !s.found && Math.hypot(s.wx - p.wx, s.wy - p.wy) < 76);
      if (canInteract) this._interact();
      else this._basicAttack(this.canvas.width/2, this.canvas.height/2);
    });
    edge(7, ()=>this._basicAttack(this.canvas.width/2, this.canvas.height/2));
    edge(6, ()=>this._interact());
    edge(2, ()=>this._useSkillBar(0));
    edge(3, ()=>this._useSkillBar(1));
    edge(1, ()=>this._useSkillBar(2));
    edge(4, ()=>this._usePotion("hp"));
    edge(5, ()=>this._usePotion("mp"));
    if (this.camera === "fps") {
      const sens = Number(this.gameSettings.controller.sensitivity || 1);
      this.player.angle += this.gamepadMove.lookX * 0.045 * sens;
      const inv = this.gameSettings.controller.invertY ? -1 : 1;
      this.fpsPitch = Math.max(-0.34, Math.min(0.34, this.fpsPitch + this.gamepadMove.lookY * 0.025 * sens * inv));
    }
  }

  update() {
    this._updateGamepadInput();
    if (this.loadingGate?.active) {
      this._updateLoadingGate();
      return;
    }
    if (this.paused || this.screen === "act_complete" || this.screen === "dead") return;
    this._frame++;
    if (this._frame % 12 === 0) this._markDiscovery(this.screen === "town" ? 7 : 5);

    // ── Auto-save every ~30 s (1800 frames at 60 fps) ───────────────────────
    // Protects against crashes losing loot — saves to localStorage silently.
    if (this._frame % 1800 === 0 && this.player) {
      try {
        this.saveToStorage();
        // Opportunistic DB persist (crypticDatabase.js) — swallows errors silently
        if (typeof CR_DATABASE?.cloudSave === "function") {
          CR_DATABASE.cloudSave(this.accountKey, this.characterId, this.save()).catch(() => {});
        }
      } catch (_) {}
    }

    // Skill cooldowns
    for (let i=0;i<this.skillCooldowns.length;i++) if (this.skillCooldowns[i]>0) this.skillCooldowns[i]--;
    if (this.fpsCastFlash > 0) this.fpsCastFlash--;
    if (this.fpsMeleeFlash > 0) this.fpsMeleeFlash--;

    if (this.screen === "town") {
      this.townTimer++;
      this._updatePlayer();
      this._updateSummons();   // keep summons following player in town
      this._updateMerc();
      this._updateFloatingText();
      this._centerCamera();
      this._syncOnlineState();

      // Dark Wanderer Easter egg: rare visitor (~1/600 frames = ~10s, guarded by 18000-frame cooldown)
      if (!this._wandererCooldown) this._wandererCooldown = 0;
      else this._wandererCooldown--;
      if (!this.darkWanderer && this._wandererCooldown <= 0 && Math.random() < 1/600) {
        this._spawnDarkWanderer();
        this._wandererCooldown = 18000;
      }
      if (this.darkWanderer) this._updateDarkWanderer();

      // Cow portal walk-on detection
      if (this._cowPortalActive && this._cowPortalWx != null) {
        const dp = Math.hypot(this._cowPortalWx - this.player.wx, this._cowPortalWy - this.player.wy);
        if (dp < 40) this._enterCowLevel();
      }

      return;
    }

    const p = this.player;

    // Status timers
    if (p.buffTimer > 0) { p.buffTimer--; if (p.buffTimer===0){p.buffDmg=1;p.buffDef=1;} }
    if (p.bearTimer > 0) { p.bearTimer--; if (p.bearTimer===0){p.bearForm=false;} }
    if (p.shielded > 0) p.shielded--;
    if (p.stealthed > 0) p.stealthed--;
    if (p.frozen > 0) p.frozen--;

    this._updatePlayer();
    this._updateEnemies();
    this._updateProjectiles();
    this._updateBoss();
    this._updateSummons();
    this._updateMerc();
    this._updateParticles();
    this._updateTraps();
    this._updateFloatingText();
    this._centerCamera();
    this._syncOnlineState();
  }

  _updatePlayer() {
    const p = this.player;
    if (p.frozen > 0) return;
    // Corpse-pickup proximity (Alpha 5 death+corpse-run flow). The corpse
    // lives in `this.deathCorpse` with the area key it dropped in; we only
    // claim it when the player is in the same area AND within ~35 units.
    // Alpha 5.3 hardening: skip when any coord isn't finite (avoids NaN
    // propagating into the proximity math).
    if (this.deathCorpse && Number.isFinite(p.wx) && Number.isFinite(p.wy)) {
      const c = this.deathCorpse;
      if (Number.isFinite(c.wx) && Number.isFinite(c.wy)) {
        const sameArea = c.actIdx === this.actIdx && c.areaScreen === this.screen;
        if (sameArea && Math.hypot(c.wx - p.wx, c.wy - p.wy) < 35) {
          this._claimDeathCorpse?.();
        }
      }
    }
    const spd = p.spd * (p.bearForm ? 0.8 : 1);
    let dx=0, dy=0;
    const touchActive = this.touch && Math.hypot(this.touch.stickX || 0, this.touch.stickY || 0) > 0.12;
    const padX = this.gamepadMove?.x || 0;
    const padY = this.gamepadMove?.y || 0;
    const padActive = Math.hypot(padX, padY) > 0.12;
    const forwardPressed = this._actionPressed("moveForward") || this.keys["w"] || this.keys["arrowup"];
    const backPressed = this._actionPressed("moveBack") || this.keys["s"] || this.keys["arrowdown"];
    const leftPressed = this._actionPressed("moveLeft") || this.keys["a"] || this.keys["arrowleft"];
    const rightPressed = this._actionPressed("moveRight") || this.keys["d"] || this.keys["arrowright"];
    const kbActive = forwardPressed||backPressed||leftPressed||rightPressed||
                     this.keys["arrowup"]||this.keys["arrowdown"]||this.keys["arrowleft"]||this.keys["arrowright"]||
                     touchActive||padActive;

    // Keyboard input takes priority and cancels click-to-move target
    if (kbActive) { this.moveTarget = null; this.attackTarget = null; }

    if (this.camera === "fps") {
      if (forwardPressed) { dx+=Math.cos(p.angle)*spd; dy+=Math.sin(p.angle)*spd; }
      if (backPressed)    { dx-=Math.cos(p.angle)*spd; dy-=Math.sin(p.angle)*spd; }
      if (leftPressed)    { dx+=Math.cos(p.angle-Math.PI/2)*spd; dy+=Math.sin(p.angle-Math.PI/2)*spd; }
      if (rightPressed)   { dx+=Math.cos(p.angle+Math.PI/2)*spd; dy+=Math.sin(p.angle+Math.PI/2)*spd; }
      if (this.keys["arrowleft"])  p.angle -= 0.04;
      if (this.keys["arrowright"]) p.angle += 0.04;
      if (touchActive) {
        const forward = -this.touch.stickY;
        const strafe = this.touch.stickX;
        dx += Math.cos(p.angle) * spd * forward + Math.cos(p.angle + Math.PI/2) * spd * strafe;
        dy += Math.sin(p.angle) * spd * forward + Math.sin(p.angle + Math.PI/2) * spd * strafe;
      }
      if (padActive) {
        dx += Math.cos(p.angle) * spd * -padY + Math.cos(p.angle + Math.PI/2) * spd * padX;
        dy += Math.sin(p.angle) * spd * -padY + Math.sin(p.angle + Math.PI/2) * spd * padX;
      }
    } else if (this.camera === "iso" || this.camera === "third") {
      if (forwardPressed) { dx+=spd; dy-=spd*0.5; }
      if (backPressed)    { dx-=spd; dy+=spd*0.5; }
      if (leftPressed)    { dx-=spd; dy-=spd*0.5; }
      if (rightPressed)   { dx+=spd; dy+=spd*0.5; }
      if (touchActive) { dx += this.touch.stickX * spd; dy += this.touch.stickY * spd; }
      if (padActive) { dx += padX * spd; dy += padY * spd; }
    } else {
      if (forwardPressed) dy -= spd;
      if (backPressed)    dy += spd;
      if (leftPressed)    dx -= spd;
      if (rightPressed)   dx += spd;
      if (touchActive) { dx += this.touch.stickX * spd; dy += this.touch.stickY * spd; }
      if (padActive) { dx += padX * spd; dy += padY * spd; }
    }

    if (this.camera !== "fps" && (this.cameraYaw || 0) && (dx || dy)) {
      const c=Math.cos(this.cameraYaw), s=Math.sin(this.cameraYaw);
      const rdx=dx*c + dy*s;
      const rdy=-dx*s + dy*c;
      dx=rdx; dy=rdy;
    }

    // Hold left-button continuous click-to-move (skip in town panels)
    const panelOpen = this.showShop||this.showMercPanel||this.showStash||this.showForge||
                      this.showSkinPanel||this.showWaypointPanel||this.showInventory||this.questLog;
    if (this.mouseDown && !kbActive && !panelOpen && this.camera !== "fps") {
      const w = this._screenToWorld(this.mouseX, this.mouseY);
      // If the player is hovering over an enemy, latch attack instead of moving
      let tgt = null, tgtDist = 60;
      for (const en of this.enemies) {
        if (en.isDead) continue;
        const d = Math.hypot(en.wx - w.wx, en.wy - w.wy);
        if (d < tgtDist) { tgtDist = d; tgt = en; }
      }
      if (tgt) { this.attackTarget = tgt; this.moveTarget = null; }
      else     { this.moveTarget = { wx: w.wx, wy: w.wy }; }
    }

    // Auto-pursue attackTarget: walk into melee range, then auto-fire basic attack
    if (!kbActive && this.attackTarget) {
      const t = this.attackTarget;
      if (t.isDead || t.hp<=0) { this.attackTarget = null; }
      else {
        const ddx=t.wx-p.wx, ddy=t.wy-p.wy, dist=Math.hypot(ddx,ddy);
        const range = 70;
        if (dist > range) {
          dx += (ddx/dist)*spd; dy += (ddy/dist)*spd;
        } else {
          // Fire toward target
          if (this._frame - this.lastAttack >= this.attackCd) {
            const sw = this._worldToIso(t.wx, t.wy);
            this._basicAttack(sw.sx, sw.sy);
          }
        }
      }
    }

    // Click-to-move toward moveTarget
    if (!kbActive && !this.attackTarget && this.moveTarget) {
      const ddx = this.moveTarget.wx - p.wx, ddy = this.moveTarget.wy - p.wy;
      const dist = Math.hypot(ddx, ddy);
      if (dist < 8) {
        const arrive = this.moveTarget.npcOnArrive;
        const lootOnArrive = this.moveTarget.lootOnArrive;
        const statueOnArrive = this.moveTarget.statueOnArrive;
        const buildingOnArrive = this.moveTarget.buildingOnArrive;
        const smashOnArrive = this.moveTarget.smashOnArrive;
        this.moveTarget = null;
        if (arrive && this.screen === "town") {
          const npc = this.town.npcs.find(n => n.type === arrive);
          if (npc) this._activateTownNpc(npc);
        }
        if (buildingOnArrive && this.screen === "town") {
          const building = this._nearestTownBuildingTo(p.wx, p.wy, 112);
          if (building) this._enterTownBuilding(building);
        }
        if (smashOnArrive && this.screen === "town") {
          const prop = this._townBreakables().find(b => b.id === smashOnArrive);
          if (prop) this._smashTownProp(prop);
        }
        if (lootOnArrive) this._pickupLootById(lootOnArrive);
        if (statueOnArrive) {
          const statue = this._activeStatues().find(s => s.id === statueOnArrive);
          if (statue) this._useStatue(statue);
        }
      } else { dx += (ddx/dist)*spd; dy += (ddy/dist)*spd; }
    }

    if (dx!==0||dy!==0) {
      const len=Math.sqrt(dx*dx+dy*dy); dx=dx/len*spd; dy=dy/len*spd;
      const nx=p.wx+dx, ny=p.wy+dy;
      const tx=Math.floor(nx/this.TS), ty=Math.floor(ny/this.TS);
      if (this._walkable(tx, Math.floor(p.wy/this.TS))) p.wx=nx;
      if (this._walkable(Math.floor(p.wx/this.TS), ty)) p.wy=ny;
      if (this.camera !== "fps") p.angle = Math.atan2(dy,dx);
      p.animState = (Math.abs(dx)+Math.abs(dy)) > spd*1.2 ? "run" : "walk";
      this._lastMoveMag = Math.min(1, (Math.abs(dx)+Math.abs(dy)) / Math.max(1, spd*1.6));
      if (this.camera === "fps") this.headBob += this._lastMoveMag * 0.22;
    } else {
      p.animState = "idle";
      this._lastMoveMag *= 0.82;
    }
    if (p.attackTimer>0) p.attackTimer--;
    if (p.attackTimer<=0) p.attackAnimState = null;
    if (p.hurtTimer>0)   p.hurtTimer--;
    if (this.touch?.holdAttack && this._isCombatArea() && this._frame - this.lastAttack >= Math.max(8, this.attackCd)) {
      this._mobileBasicAttack();
    }

    // Town: enter dungeon if walking onto portal tile
    if (this.screen === "town") {
      const tx=Math.floor(p.wx/this.TS), ty=Math.floor(p.wy/this.TS);
      if (tx===this.town.portalTx && ty===this.town.portalTy) {
        this._enterDungeon();
      } else if (tx<=this.town.exitTx && Math.abs(ty-this.town.exitTy)<=1) {
        this._enterWilderness();
      }
    }

    if (this.screen === "wilderness") {
      const tx=Math.floor(p.wx/this.TS), ty=Math.floor(p.wy/this.TS);
      if (tx===this.wilderness.caveX && ty===this.wilderness.caveY) {
        this._enterDungeon();
      } else if (tx<=1 && Math.abs(ty-this.wilderness.spawnY)<=1) {
        this.player.wx = this.town.exitWx + this.TS;
        this.player.wy = this.town.exitWy;
        this.enemies=[]; this.projectiles=[]; this.loot=[]; this.boss=null; this.bossSpawned=false;
        this.moveTarget=null; this.attackTarget=null;
        this.screen="town"; this._centerCamera();
        this._teleportSummonsToPlayer();
      }
    }

    // MP regeneration
    if (this._frame % 60 === 0 && p.mp < p.maxMp) p.mp = Math.min(p.maxMp, p.mp + 3 + p.nrg);
  }

  _enterDungeon() {
    this._unlockWaypoint(this.actIdx, 4);
    this.enemies=[]; this.projectiles=[]; this.loot=[];
    this.bossSpawned=false; this.boss=null;
    const sp = this.dungeon;
    const safe = this._nearestWalkableTile(sp.map, sp.spawnX, sp.spawnY, 12);
    this.player.wx = safe.tx * this.TS + this.TS/2;
    this.player.wy = safe.ty * this.TS + this.TS/2;
    this.moveTarget = null; this.attackTarget = null;
    this.screen = "dungeon";
    this._spawnEnemies(18 + this.actIdx * 4);
    this._markDiscovery(8);
    this._centerCamera();
    this._teleportSummonsToPlayer();
    this._startLoadingGate("DESCENDING", "Stabilizing dungeon actors and camera", 54, false);
  }

  _enterWilderness() {
    this._unlockWaypoint(this.actIdx, 1);
    const seed = Date.now() ^ (this.actIdx * 31337) ^ 0x7c44;
    this.wilderness = _genWildernessMap(this.actIdx, _rng(seed));
    this.enemies=[]; this.projectiles=[]; this.loot=[];
    this.bossSpawned=false; this.boss=null;
    this.player.wx = this.wilderness.spawnWx;
    this.player.wy = this.wilderness.spawnWy;
    this.player.angle = 0;
    this.moveTarget = null; this.attackTarget = null;
    this.screen = "wilderness";
    this._spawnWildernessEnemies(12 + this.actIdx * 3);
    this._markDiscovery(8);
    this._centerCamera();
    this._teleportSummonsToPlayer();
    this._addFloat("WILDERNESS", this.player.wx, this.player.wy-42, this.act.color, 100);
  }

  // Pets persistence (Alpha 5) — summons live in `this.summons` and are kept
  // across screen transitions, but their world coords are tied to the old
  // map and become invisible/off-screen on transition. This snaps every
  // surviving summon to a small ring around the player on the new screen so
  // they reappear and resume their pursue/attack logic immediately.
  _teleportSummonsToPlayer() {
    if (!this.player) return;
    if (!Array.isArray(this.summons) || !this.summons.length) return;
    const cx = this.player.wx, cy = this.player.wy;
    this.summons.forEach((s, i) => {
      if (!s || s.hp <= 0) return;
      const ang = (i / Math.max(1, this.summons.length)) * Math.PI * 2;
      const r = this.TS * (1 + (i % 2) * 0.5);
      s.wx = cx + Math.cos(ang) * r;
      s.wy = cy + Math.sin(ang) * r;
      // Wake them so they immediately seek the player rather than idling.
      s.lastAtk = 0;
      s.animState = "walk";
    });
  }

  _spawnWildernessEnemies(count) {
    const act = this.act;
    const m = this.wilderness.map;
    for (let i=0; i<count; i++) {
      let tx=4, ty=4;
      for (let tries=0; tries<80; tries++) {
        tx = 2 + Math.floor(Math.random()*(m[0].length-4));
        ty = 2 + Math.floor(Math.random()*(m.length-4));
        const v=m[ty][tx];
        if ((v===0 || v===7) && Math.hypot(tx-this.wilderness.spawnX,ty-this.wilderness.spawnY)>8 && Math.hypot(tx-this.wilderness.caveX,ty-this.wilderness.caveY)>4) break;
      }
      const eid = act.enemies[Math.floor(Math.random()*act.enemies.length)];
      const t = CR_ENEMIES[eid];
      if (!t) continue;
      const e = {
        id: this._nextId++, type:eid, name:t.name, color:t.color,
        maxHp: Math.round(t.hp * this.diffMult * 0.82 * (this.playerCountMult||1)),
        hp:    Math.round(t.hp * this.diffMult * 0.82 * (this.playerCountMult||1)),
        dmg:   Math.round(t.dmg * this.diffMult * 0.82 * Math.sqrt(this.playerCountMult||1)),
        spd: t.spd, xp: t.xp, size: t.size, ai: t.ai, loot: t.loot,
        def: 0, wx:tx*this.TS+this.TS/2, wy:ty*this.TS+this.TS/2, angle:0, frozen:0, lastAtk:0, atkCd:60,
        isDead: false, corpse: false,
      };
      if (Math.random() < 0.12) this._applyChampionMods(e);
      this.enemies.push(e);
    }
  }

  _updateEnemies() {
    const p = this.player;
    this.enemies.forEach(e => {
      if (e.isDead || e.frozen > 0) { if (e.frozen>0) e.frozen--; return; }
      if (e.targetLostTimer>0) { e.targetLostTimer--; if(e.targetLostTimer===0) e.targetLost=false; }
      if (e.targetLost) return;
      const dx=p.wx-e.wx, dy=p.wy-e.wy, dist=Math.sqrt(dx*dx+dy*dy);
      if (dist > 400) return; // too far, don't update

      let mx=0, my=0;
      if (e.ai === "charge" || e.ai === "wander") {
        if (dist > 20) { mx=(dx/dist)*e.spd; my=(dy/dist)*e.spd; }
      } else if (e.ai === "ranged") {
        // Keep distance 100-160
        if (dist < 100) { mx=(-dx/dist)*e.spd; my=(-dy/dist)*e.spd; }
        else if (dist > 200) { mx=(dx/dist)*e.spd*0.5; my=(dy/dist)*e.spd*0.5; }
        // Shoot projectile at player
        if (this._frame - (e.lastAtk||0) > e.atkCd && dist < 200) {
          e.lastAtk = this._frame;
          const angle = Math.atan2(dy,dx);
          this.projectiles.push({
            id:this._nextId++, wx:e.wx, wy:e.wy, angle,
            spd:4, dmg:e.dmg, range:220, traveled:0, color:e.color, size:5, fromPlayer:false,
          });
        }
      }
      const nx=e.wx+mx, ny=e.wy+my;
      if (this._walkable(Math.floor(nx/this.TS), Math.floor(e.wy/this.TS))) e.wx=nx;
      if (this._walkable(Math.floor(e.wx/this.TS), Math.floor(ny/this.TS))) e.wy=ny;
      if (mx !== 0 || my !== 0) e.angle = Math.atan2(my, mx); // face direction of travel

      // Melee attack player
      if (e.ai !== "ranged" && dist < e.size+20 && this._frame-(e.lastAtk||0) > e.atkCd) {
        e.lastAtk = this._frame;
        if (p.shielded > 0) return;
        const def = p.def * (p.buffDef||1);
        const dmg = Math.max(1, e.dmg - Math.floor(def/3));
        p.hp -= dmg; p.hurtTimer = 12;
        this._addFloat(`-${dmg}`, p.wx, p.wy-30, "#ff4444", 50);
        if (p.hp <= 0) { p.hp=0; this.screen="dead"; }
      }
    });
    // Remove non-corpse dead enemies after a while
    this.enemies = this.enemies.filter(e=>!e.isDead || e.corpse);
  }

  _updateProjectiles() {
    const p = this.player;
    this.projectiles = this.projectiles.filter(proj => {
      proj.wx += Math.cos(proj.angle)*proj.spd;
      proj.wy += Math.sin(proj.angle)*proj.spd;
      proj.traveled += proj.spd;
      if (proj.traveled >= proj.range) return false;
      // Wall collision
      if (!this._walkable(Math.floor(proj.wx/this.TS), Math.floor(proj.wy/this.TS))) {
        if (proj.aoe) this._doAoe(proj.wx, proj.wy, proj.aoe, proj.dmg, proj.color, 0);
        return false;
      }
      if (proj.fromPlayer) {
        // Hit enemies
        for (const e of this.enemies) {
          if (e.isDead) continue;
          const dx=e.wx-proj.wx, dy=e.wy-proj.wy;
          if (Math.sqrt(dx*dx+dy*dy) < e.size+proj.size) {
            this._hitEnemy(e, proj.dmg, proj.color);
            if (proj.aoe) this._doAoe(proj.wx, proj.wy, proj.aoe, proj.dmg, proj.color, 0);
            return false;
          }
        }
        if (this.boss) {
          const dx=this.boss.wx-proj.wx, dy=this.boss.wy-proj.wy;
          if (Math.sqrt(dx*dx+dy*dy) < this.boss.size+proj.size) {
            this._hitBoss(proj.dmg);
            return false;
          }
        }
      } else {
        // Hit player
        const dx=p.wx-proj.wx, dy=p.wy-proj.wy;
        if (Math.sqrt(dx*dx+dy*dy) < 20+proj.size) {
          if (p.shielded>0) return false;
          const dmg=Math.max(1,proj.dmg-Math.floor(p.def/3));
          p.hp-=dmg; p.hurtTimer=12; this._addFloat(`-${dmg}`,p.wx,p.wy-30,"#ff4444",45);
          if (p.hp<=0){p.hp=0;this.screen="dead";}
          return false;
        }
      }
      return true;
    });
  }

  _updateBoss() {
    const b = this.boss; if (!b) return;
    const p = this.player;
    const dx=p.wx-b.wx, dy=p.wy-b.wy, dist=Math.sqrt(dx*dx+dy*dy);

    // Phase transitions
    const hpPct = b.hp/b.maxHp;
    if (b.phase===1 && hpPct < 0.5) {
      b.phase=2; b.spd*=1.4; b.attackCd=Math.max(40,b.attackCd-20);
      this._addFloat(`⚠ ${b.name} — PHASE 2!`,b.wx,b.wy-80,"#ff2200",180);
      this._bossNova(b,8);
    }
    if (b.hasPhase3 && b.phase===2 && hpPct < b.phase3hp) {
      b.phase=3; b.spd*=1.3; b.attackCd=Math.max(25,b.attackCd-15);
      this._addFloat(`💀 FINAL PHASE!`,b.wx,b.wy-80,"#cc00ff",240);
      this._bossNova(b,16);
    }

    // Move toward player
    if (dist > 20) { b.wx+=(dx/dist)*b.spd; b.wy+=(dy/dist)*b.spd; }

    // Periodic summon (act 4+)
    if (this.actIdx >= 3) {
      b.summonTimer = (b.summonTimer||0) + 1;
      const summonInterval = b.phase===3 ? 240 : 480;
      if (b.summonTimer >= summonInterval) {
        b.summonTimer=0;
        const count = b.phase===3 ? 4 : 2;
        for (let i=0;i<count;i++) {
          const a = (Math.PI*2/count)*i;
          const eid = this.act.enemies[Math.floor(Math.random()*this.act.enemies.length)];
          const t = CR_ENEMIES[eid]; if (!t) continue;
          this.enemies.push({
            id:this._nextId++,type:eid,name:t.name,color:t.color,
            maxHp:Math.round(t.hp*this.diffMult*0.6),hp:Math.round(t.hp*this.diffMult*0.6),
            dmg:Math.round(t.dmg*this.diffMult*0.6),spd:t.spd,xp:0,size:t.size,ai:t.ai,loot:0,def:0,
            wx:b.wx+Math.cos(a)*80, wy:b.wy+Math.sin(a)*80,
            angle:0,frozen:0,lastAtk:0,atkCd:60,isDead:false,corpse:false,
          });
        }
        this._addFloat("⚡ REINFORCEMENTS!",b.wx,b.wy-60,"#ff8800",100);
      }
    }

    // Attack cycle
    if (this._frame-b.lastAtk > b.attackCd) {
      b.lastAtk = this._frame;
      const angle=Math.atan2(dy,dx);
      if (b.phase===3) {
        this._bossNova(b, 12);
      } else if (b.phase===2) {
        for (let i=0;i<5;i++) {
          const a=angle+(-0.6+i*0.3);
          this.projectiles.push({id:this._nextId++,wx:b.wx,wy:b.wy,angle:a,spd:3.5,dmg:b.dmg,range:300,traveled:0,color:b.color,size:7,fromPlayer:false});
        }
      } else {
        this.projectiles.push({id:this._nextId++,wx:b.wx,wy:b.wy,angle,spd:3,dmg:b.dmg,range:280,traveled:0,color:b.color,size:8,fromPlayer:false});
      }
      // Melee
      if (dist < b.size+25) {
        if (p.shielded>0) return;
        const dmg=Math.max(1,b.dmg-Math.floor(p.def/2));
        p.hp-=dmg; p.hurtTimer=12; this._addFloat(`-${dmg}`,p.wx,p.wy-30,"#ff4444",50);
        if (p.hp<=0){p.hp=0;this.screen="dead";}
      }
    }
  }

  _bossNova(b, count) {
    for (let i=0;i<count;i++) {
      const a=(Math.PI*2/count)*i;
      this.projectiles.push({id:this._nextId++,wx:b.wx,wy:b.wy,angle:a,spd:3,dmg:Math.round(b.dmg*0.7),range:320,traveled:0,color:b.color,size:6,fromPlayer:false});
    }
    this._spawnParticles(b.wx,b.wy,b.color,20);
  }

  _updateSummons() {
    const inTown = this.screen === "town";
    this.summons.forEach((s, idx) => {
      // ── Town: no enemies — orbit close to player's shoulder ────────────────
      const nearest = inTown ? null : [...this.enemies.filter(e=>!e.isDead), ...(this.boss ? [this.boss] : [])]
        .sort((a,b)=>{ const da=Math.hypot(a.wx-s.wx,a.wy-s.wy),db=Math.hypot(b.wx-s.wx,b.wy-s.wy); return da-db; })[0];

      if (!nearest) {
        // Spread multiple summons evenly around the player at ~1.5 tile radius
        const total  = Math.max(1, this.summons.length);
        const slotAngle = (Math.PI * 2 / total) * idx + Math.PI * 0.75;
        const orbitR = 44 + (idx % 3) * 14;  // stagger radii so they don't stack
        const px = this.player.wx + Math.cos(slotAngle) * orbitR;
        const py = this.player.wy + Math.sin(slotAngle) * orbitR * 0.55; // squish for iso
        const fdx = px - s.wx, fdy = py - s.wy, fd = Math.hypot(fdx, fdy);
        const followThresh = 18;                // tighter follow — move if > ~18px away
        if (fd > 380) {
          // Too far — snap to orbit position (D2-style minion teleport)
          s.wx = px + (Math.random() - 0.5) * 18;
          s.wy = py + (Math.random() - 0.5) * 18;
          s.animState = "idle";
        } else if (fd > followThresh) {
          const mv = Math.min(s.spd * 1.4, fd); // accelerate when far
          s.wx += (fdx / fd) * mv;
          s.wy += (fdy / fd) * mv;
          s.angle = Math.atan2(fdy, fdx);
          s.animState = fd > 60 ? "walk" : "idle";
        } else {
          s.animState = "idle";
          // Face toward the player
          const toDx = this.player.wx - s.wx, toDy = this.player.wy - s.wy;
          if (Math.hypot(toDx, toDy) > 4) s.angle = Math.atan2(toDy, toDx);
        }
        return;
      }

      // ── Combat: chase nearest enemy ─────────────────────────────────────────
      const dx=nearest.wx-s.wx, dy=nearest.wy-s.wy, dist=Math.hypot(dx,dy);
      s.angle=Math.atan2(dy,dx);
      if (dist>15){
        const nx=s.wx+(dx/dist)*s.spd, ny=s.wy+(dy/dist)*s.spd;
        if (this._walkable(Math.floor(nx/this.TS), Math.floor(s.wy/this.TS))) s.wx=nx;
        if (this._walkable(Math.floor(s.wx/this.TS), Math.floor(ny/this.TS))) s.wy=ny;
        s.animState="walk";
      } else s.animState="attack";
      if (dist<nearest.size+s.size && this._frame-s.lastAtk>s.atkCd) {
        s.lastAtk=this._frame;
        if (nearest === this.boss) this._hitBoss(s.dmg);
        else this._hitEnemy(nearest, s.dmg, s.color || "#aaaacc");
      }
    });
    if (!inTown) this.summons = this.summons.filter(s=>s.hp>0);
  }

  _updateMerc() {
    const m = this.merc; if (!m || m.dead) return;
    const p = this.player;
    // Follow player
    const distToPlayer = Math.hypot(m.wx-p.wx, m.wy-p.wy);
    if (distToPlayer > 80) {
      const dx=p.wx-m.wx, dy=p.wy-m.wy, d=Math.hypot(dx,dy);
      m.wx+=(dx/d)*m.spd*1.5; m.wy+=(dy/d)*m.spd*1.5;
    }
    // Find nearest enemy
    const nearest=this.enemies.filter(e=>!e.isDead)
      .sort((a,b)=>Math.hypot(a.wx-m.wx,a.wy-m.wy)-Math.hypot(b.wx-m.wx,b.wy-m.wy))[0];
    const bossTarget=this.boss;
    const target=nearest||bossTarget;
    if (!target) return;
    const dx=target.wx-m.wx, dy=target.wy-m.wy, dist=Math.hypot(dx,dy);
    // Move toward target if ranged or chase if melee
    if (m.ai==="charge" && dist>m.range) { m.wx+=(dx/dist)*m.spd; m.wy+=(dy/dist)*m.spd; }
    else if (m.ai==="ranged" && dist>m.range) { m.wx+=(dx/dist)*m.spd*0.5; m.wy+=(dy/dist)*m.spd*0.5; }
    // Attack
    if (this._frame - m.lastAtk > m.atkCd && dist < m.range+10) {
      m.lastAtk = this._frame;
      if (m.ai === "ranged") {
        const ang=Math.atan2(dy,dx);
        this.projectiles.push({id:this._nextId++,wx:m.wx,wy:m.wy,angle:ang,spd:5.5,dmg:m.dmg,range:m.range,traveled:0,color:m.color,size:5,fromPlayer:true});
      } else {
        if (nearest && dist<m.range+10) this._hitEnemy(nearest, m.dmg, m.color);
        else if (bossTarget && dist<m.range+10) this._hitBoss(m.dmg);
      }
    }
    // Take damage from enemies (enemies attack merc like player)
    this.enemies.forEach(e=>{
      if(e.isDead||e.ai==="ranged") return;
      const ed=Math.hypot(e.wx-m.wx,e.wy-m.wy);
      if(ed<e.size+20&&this._frame-(e.lastAtkM||0)>e.atkCd) {
        e.lastAtkM=this._frame;
        const dmg=Math.max(1,e.dmg-5);
        m.hp-=dmg;
        this._addFloat(`-${dmg}`,m.wx,m.wy-25,m.color,40);
        if(m.hp<=0){m.hp=0;m.dead=true;this._addFloat(`💀 ${m.name} FALLEN!`,m.wx,m.wy-50,"#ff4444",150);}
      }
    });
    // Merc leveling
    m.xp = (m.xp||0); // accumulated by kills (pass-through from enemy kills near merc)
  }

  _updateTraps() {
    this.traps.forEach(t=>{ if(t.armTimer>0){t.armTimer--;if(t.armTimer===0)t.armed=true;} });
    this.traps = this.traps.filter(t=>{
      if (!t.armed) return true;
      for (const e of this.enemies) {
        if (e.isDead) continue;
        if (Math.hypot(e.wx-t.wx,e.wy-t.wy)<t.aoe) {
          this._doAoe(t.wx,t.wy,t.aoe,t.dmg,t.color,0);
          this._spawnParticles(t.wx,t.wy,t.color,12);
          return false;
        }
      }
      return true;
    });
  }

  _updateParticles() {
    this.particles.forEach(p=>{p.wx+=p.vx;p.wy+=p.vy;p.vy+=0.1;p.life--;});
    this.particles=this.particles.filter(p=>p.life>0);
  }

  _updateFloatingText() {
    this.floatingText.forEach(f=>{
      // Stagger: text waits a few frames before starting to rise, preventing
      // same-frame spawns from overlapping at the exact same pixel.
      if (f.stagger > 0) { f.stagger--; return; }
      f.wx += f.drift || 0;
      f.wy += f.vy || -0.7;
      f.vy = (f.vy || -0.7) * 0.982;
      // Slow horizontal drift deceleration so numbers spread more over time
      f.drift = (f.drift || 0) * 0.97;
      f.life--;
    });
    this.floatingText=this.floatingText.filter(f=>f.life>0);
  }

  // ─── Rendering ──────────────────────────────────────────────────────────────
  draw() {
    if (!this.canvas || !this.ctx) return;
    const W = this.canvas.width, H = this.canvas.height;
    if (!W || !H) return;

    // CRT retro effects + game juice (only create if dimensions are valid)
    try {
      if (!this.crt) this.crt = new CRTEffect(W, H);
      if (!this.juice) this.juice = new GameJuice(W, H);
      if (!this.retroHUD) this.retroHUD = new RetroHUD(W, H);
    } catch (_) { /* visual effects optional */ }

    const ctx = this.ctx;
    this._applyVideoFilter();
    ctx.clearRect(0,0,W,H);
    if (this.loadingGate?.active) {
      this._drawLoadingGate(W,H);
      return;
    }

    if (this.screen==="town") {
      this._drawTown(W,H);
      if (this.showSkillTree && !this.useSkillTreeReactOverlay) this._drawSkillTree(W,H);
      if (this.paused && !this.usePauseReactOverlay) this._drawPause(W,H);
      return;
    }
    if (this.screen==="act_complete") {
      this._drawActComplete(W,H);
      if (this.paused && !this.usePauseReactOverlay) this._drawPause(W,H);
      return;
    }
    if (this.screen==="dead") {
      this._drawDead(W,H);
      if (this.paused && !this.usePauseReactOverlay) this._drawPause(W,H);
      return;
    }

    // Dungeon view
    if      (this.camera==="fps") this._drawFPS(W,H);
    else if (this.camera==="top") this._drawTop(W,H);
    else if (this.camera==="third") this._drawThird(W,H);
    else                          this._drawIso(W,H);

    if (this.camera !== "fps" && this.screen !== "town") {
      this._drawEntities(W,H);
      this._drawParticles();
      this._drawFloatingText();
    }
    // In FPS mode: still show floating text (damage numbers etc.) centered
    if (this.camera === "fps" && this.screen !== "town") {
      this._drawFloatingText();
      // Pointer-lock instruction if not locked
      if (typeof document !== "undefined" && document.pointerLockElement !== this.canvas) {
        ctx.save();
        ctx.fillStyle="rgba(0,0,0,0.62)";
        ctx.fillRect(W/2-160,H-74,320,36);
        ctx.fillStyle="#d6b65c"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("🖱 CLICK to lock mouse for FPS look  |  ESC to exit", W/2, H-52);
        ctx.restore();
      }
    }
    this._drawHUD(W,H);
    this._drawAdminEditorHud(W,H);
    if (this.showInventory && !this.useInventoryReactOverlay) this._drawInventory(W,H);
    if (this.showStash && !this.useStashReactOverlay) this._drawStash(W,H);
    if (this.showSkillTree && !this.useSkillTreeReactOverlay) this._drawSkillTree(W,H);
    if (this.questLog && !this.useQuestLogReactOverlay) this._drawQuestLog(W,H);
    if (this.showSkillTree && !this.useSkillTreeReactOverlay) this._drawSkillTree(W,H);
    if (this.paused && !this.usePauseReactOverlay) this._drawPause(W,H);
  }

  // ── Isometric renderer ─────────────────────────────────────────────────────
  _isoRaw(tx, ty) {
    const yaw = this.cameraYaw || 0;
    if (!yaw) return { x:(tx-ty)*this.TW, y:(tx+ty)*this.TH };
    const ptx = this.player.wx / this.TS;
    const pty = this.player.wy / this.TS;
    const dx = tx - ptx, dy = ty - pty;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const rx = ptx + dx*c - dy*s;
    const ry = pty + dx*s + dy*c;
    return { x:(rx-ry)*this.TW, y:(rx+ry)*this.TH };
  }

  _isoToScreen(tx,ty) {
    const raw = this._isoRaw(tx, ty);
    const z = this._viewScale();
    const W = this.canvas.width, H = this.canvas.height;
    return {
      sx: (raw.x - this.camX - W/2) * z + W/2,
      sy: (raw.y - this.camY - H/2) * z + H/2,
    };
  }

  _topToScreen(wx, wy, W=this.canvas.width, H=this.canvas.height) {
    const z = this._viewScale();
    const yaw = this.cameraYaw || 0;
    const dx = wx - this.camX, dy = wy - this.camY;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const rx = dx*c - dy*s;
    const ry = dx*s + dy*c;
    return { sx:W/2 + rx*z, sy:H/2 + ry*z };
  }

  _screenToTopWorld(sx, sy) {
    const z = this._viewScale();
    const W = this.canvas.width, H = this.canvas.height;
    const yaw = this.cameraYaw || 0;
    const rx = (sx - W/2) / z;
    const ry = (sy - H/2) / z;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return {
      wx:this.camX + rx*c + ry*s,
      wy:this.camY - rx*s + ry*c,
    };
  }
  _worldToIso(wx,wy) {
    const tx=wx/this.TS, ty=wy/this.TS;
    return this._isoToScreen(tx,ty);
  }

  _drawImageOnIsoDiamond(ctx, img, top, right, bottom, left, alpha=1) {
    if (!ctx || !img || !img.width || !img.height || !top || !right || !bottom || !left) return false;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();
    ctx.clip();
    ctx.transform(
      (right.x - top.x) / img.width,
      (right.y - top.y) / img.width,
      (left.x - top.x) / img.height,
      (left.y - top.y) / img.height,
      top.x,
      top.y
    );
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    return true;
  }

  _drawWildernessSky(W,H) {
    const ctx=this.ctx;
    // Sky gradient: only fill the upper half so tile diamonds underneath
    // remain visible against a brighter forest-floor base.
    const g=ctx.createLinearGradient(0,0,0,H*0.55);
    g.addColorStop(0,this._darken(this.act.bg,8));
    g.addColorStop(0.6,"#142a1d");
    g.addColorStop(1,"rgba(20,42,29,0)");
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H*0.55);
    ctx.save();
    ctx.globalAlpha=0.42;
    for (let i=0;i<110;i++) {
      const sx=(i*149.3 + this._frame*0.03)%W;
      const sy=(i*71.7)%(H*0.48);
      ctx.fillStyle=i%7===0 ? this.act.color : "#d8efe0";
      ctx.fillRect(sx,sy,1.2,1.2);
    }
    ctx.restore();
  }

  _drawIso(W,H) {
    const ctx=this.ctx;
    const isWild=this.screen==="wilderness";
    ctx.fillStyle=isWild ? "#13241a" : this.act.bg; ctx.fillRect(0,0,W,H);
    if (isWild && this.Q.detail>0) this._drawWildernessSky(W,H);
    const area=isWild ? this.wilderness : this.dungeon;
    const m=area.map;
    const ROWS=m.length, COLS=m[0].length;
    const fc=isWild ? "#3a6a45" : this.act.floorC;
    const wc=isWild ? "#1f3522" : this.act.wallC;
    const scale=this._viewScale();
    const TW=this.TW*scale, TH=this.TH*scale;
    const useGlb = true;
    const useWallTextureOverlays = false;
    const useFloorTextureOverlays = true;

    // ── Build depth-sorted tile list ─────────────────────────────────────────
    // Depth = ty+tx (isometric depth). Sort back-to-front so closer tiles/props
    // correctly overdraw farther ones (painter's algorithm).
    // We do ONE sorted pass: draw tile geometry then its prop in the same bucket.
    // This fixes the classic bug where Pass-2 trees appeared OVER closer walls.
    const tiles = [];
    for (let ty=0;ty<ROWS;ty++) for (let tx=0;tx<COLS;tx++) {
      const {sx,sy}=this._isoToScreen(tx,ty);
      if (sx<-TW*4||sx>W+TW*4||sy<-TH*6||sy>H+TH*6) continue;
      tiles.push({tx,ty,sx,sy,v:m[ty][tx]});
    }
    tiles.sort((a,b)=>(a.ty+a.tx)-(b.ty+b.tx));

    // ── Single depth-sorted pass ──────────────────────────────────────────────
    for (const t of tiles) {
      const {tx,ty,sx,sy,v}=t;

      // ── Tile geometry ───────────────────────────────────────────────────────
      if (v===1 && !isWild) {
        // Dungeon/town wall cube: top face + two visible side faces
        const openAt = (x,y) => (m[y]?.[x] ?? 0) !== 1;
        const exposed = openAt(tx-1,ty) || openAt(tx+1,ty) || openAt(tx,ty-1) || openAt(tx,ty+1);
        if (exposed) {
          const lift = TH * 0.62;
          const topC = this._lighten(wc, this.Q.glow ? 10 : 4);
          const leftC = this._darken(wc, 12);
          const rightC = this._darken(wc, 34);
          ctx.fillStyle=topC;
          ctx.beginPath(); ctx.moveTo(sx,sy-lift); ctx.lineTo(sx+TW,sy+TH-lift); ctx.lineTo(sx,sy+TH*2-lift); ctx.lineTo(sx-TW,sy+TH-lift); ctx.closePath(); ctx.fill();
          if (openAt(tx,ty+1) || openAt(tx-1,ty)) {
            ctx.fillStyle=leftC;
            ctx.beginPath(); ctx.moveTo(sx-TW,sy+TH-lift); ctx.lineTo(sx,sy+TH*2-lift); ctx.lineTo(sx,sy+TH*2); ctx.lineTo(sx-TW,sy+TH); ctx.closePath(); ctx.fill();
          }
          if (openAt(tx,ty+1) || openAt(tx+1,ty)) {
            ctx.fillStyle=rightC;
            ctx.beginPath(); ctx.moveTo(sx,sy+TH*2-lift); ctx.lineTo(sx+TW,sy+TH-lift); ctx.lineTo(sx+TW,sy+TH); ctx.lineTo(sx,sy+TH*2); ctx.closePath(); ctx.fill();
          }
          if (this.Q.detail>0) {
            ctx.strokeStyle="rgba(0,0,0,0.42)";
            ctx.lineWidth=0.7;
            ctx.beginPath(); ctx.moveTo(sx,sy-lift); ctx.lineTo(sx+TW,sy+TH-lift); ctx.lineTo(sx,sy+TH*2-lift); ctx.lineTo(sx-TW,sy+TH-lift); ctx.closePath(); ctx.stroke();
          }
        }
        // ── KayKit dungeon wall overlay (high/ultra, non-wilderness only) ───────
        // Drawn on top of the procedural cube to add stone texture/detail.
        // The baked GLB sprite (front direction, ISO-angle camera) shows the wall
        // face and top edge; alpha < 1 lets the cube depth cues bleed through.
        if (useGlb && useWallTextureOverlays) {
          const wSeed=((tx*7919)^(ty*6271))>>>0;
          const wTileId = (wSeed%10===9) ? "wall_broken"
            : (wSeed%5===0||wSeed%5===1) ? "wall_cracked"
            : "wall";
          const wUrl = crKayDungeonWall(wTileId);
          const wFrame = this._isoAssetFrame(wUrl, "front");
          if (wFrame) {
            // Keep wall art inside the actual iso prism. The old full-sprite
            // stamp made every diagonal wall read as a square billboard.
            this._drawImageOnIsoDiamond(ctx, wFrame,
              { x:sx,    y:sy-TH*1.5 },
              { x:sx+TW, y:sy-TH*0.5 },
              { x:sx,    y:sy+TH*0.5 },
              { x:sx-TW, y:sy-TH*0.5 },
              0.36
            );
            this._drawImageOnIsoDiamond(ctx, wFrame,
              { x:sx-TW, y:sy-TH*0.5 },
              { x:sx,    y:sy+TH*0.5 },
              { x:sx,    y:sy+TH*1.5 },
              { x:sx-TW, y:sy+TH*0.5 },
              0.18
            );
            this._drawImageOnIsoDiamond(ctx, wFrame,
              { x:sx,    y:sy+TH*0.5 },
              { x:sx+TW, y:sy-TH*0.5 },
              { x:sx+TW, y:sy+TH*0.5 },
              { x:sx,    y:sy+TH*1.5 },
              0.22
            );
          }
        }
      } else if (v===1 && isWild) {
        // Wilderness tree/rock tile — draw forest floor under the billboard.
        // The tree/rock billboard is drawn in the prop pass below.
        ctx.fillStyle="#244c2c";
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+TW,sy+TH); ctx.lineTo(sx,sy+TH*2); ctx.lineTo(sx-TW,sy+TH); ctx.closePath(); ctx.fill();
        if (this.Q.detail>0) { ctx.strokeStyle="#162d1a"; ctx.lineWidth=0.7; ctx.stroke(); }
      } else {
        // Floor diamond
        const c = isWild
          ? (v===0 ? "#7a6248" : v===4 ? "#3a221a" : v===8 ? "#9a8052" : fc)
          : (v===9 ? "#1a0a08" : v===3 ? "#2a1808" : v===4 ? "#0a1a0a" : fc);
        ctx.fillStyle=c;
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+TW,sy+TH); ctx.lineTo(sx,sy+TH*2); ctx.lineTo(sx-TW,sy+TH); ctx.closePath(); ctx.fill();
        if (this.Q.detail>0) { ctx.strokeStyle=this._darken(c,26); ctx.lineWidth=0.8; ctx.stroke(); }
        // ── KayKit dungeon floor tile overlay (high/ultra, non-wilderness only) ─
        if (useGlb && useFloorTextureOverlays && !isWild && (v===0||v===9||v===3)) {
          const tSeed=((tx*7919)^(ty*6271))>>>0;
          if (v===0 && tSeed%9!==0) {
            // Keep ordinary walkable floor clean; dense GLB stamps read like wallpaper.
          } else {
          const fTileId = v===9 ? "floor_tile_grate"
            : (tSeed%4===0) ? "floor_tile_small_decorated"
            : (tSeed%4===1) ? "floor_tile_small_broken_A"
            : (tSeed%2===0) ? "floor_tile_large"
            : "floor_tile_small";
          const fUrl = crKayDungeonFloor(fTileId);
          const fFrame = this._isoAssetFrame(fUrl, "front");
          if (fFrame) {
            this._drawImageOnIsoDiamond(ctx, fFrame,
              { x:sx,    y:sy },
              { x:sx+TW, y:sy+TH },
              { x:sx,    y:sy+TH*2 },
              { x:sx-TW, y:sy+TH },
              0.78
            );
          }
          }
        }
        if (v===5) {
          const pulse=0.5+0.5*Math.sin(this._frame*0.08);
          ctx.fillStyle=`rgba(170,68,255,${0.18+pulse*0.14})`;
          ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+TW,sy+TH); ctx.lineTo(sx,sy+TH*2); ctx.lineTo(sx-TW,sy+TH); ctx.closePath(); ctx.fill();
        }
        if (v===4) { ctx.font="bold 9px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillStyle="#aabbaa"; ctx.fillText(isWild?"▼CAVE":"▼DOWN",sx,sy+TH); }
        if (v===8) { ctx.font="bold 9px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillStyle="#aabbaa"; ctx.fillText("▲TOWN",sx,sy+TH); }
      }

      // ── Prop for this tile (drawn immediately after its tile geometry) ───────
      if (!useGlb && v!==3) continue; // low/medium: only draw chests
      if (v===1 && isWild) {
        // Wilderness wall → ForestNature tree / rock / bush
        const seed=((tx*73856093)^(ty*19349663)^((this.dungeonSeed||1)*997))>>>0;
        const forestId=this._forestTileAsset(tx,ty,seed);
        const furl=this._forestUrl(forestId);
        const fframe = this._isoAssetFrame(furl, "front");
        if (fframe) {
          const isRock=forestId.startsWith("rock"), isBush=forestId.startsWith("bush");
          const fH=isRock?TH*2.2:isBush?TH*2.8:TH*5.0;
          const fW=fH*(fframe.width/fframe.height);
          ctx.save(); ctx.imageSmoothingEnabled=true;
          // Drop-shadow ellipse on ground at tile centre
          ctx.fillStyle="rgba(0,0,0,0.32)";
          ctx.beginPath(); ctx.ellipse(sx,sy+TH*1.3,fW*0.32,TH*0.18,0,0,Math.PI*2); ctx.fill();
          // Clip bottom portion of baked sprite to remove any GLB ground-plane artefact.
          const clipFrac = isRock ? 1.0 : (isBush ? 0.92 : 0.86);
          const srcH = Math.floor(fframe.height * clipFrac);
          const drawH = fH * clipFrac;
          // Anchor tree at front-facing half of the floor diamond for natural depth.
          ctx.drawImage(fframe,
            0, 0, fframe.width, srcH,
            sx-fW*0.5, sy+TH*1.4-drawH, fW, drawH);
          ctx.restore();
        } else {
          if (furl) preloadGlbStripsFireAndForget(furl,["idle"],["front"]);
          // Bold procedural tree — anchored at front half of diamond (sy+TH*1.4), grows upward
          const h=TH*4.5, r=Math.max(TH*1.0,8);
          const gnd = sy+TH*1.4; // front-facing half of floor diamond
          const s2=(seed%7);
          const treeC=s2<3?"#1a6e24":s2<5?"#0d5a1a":"#245c14";
          const treeBright=this._lighten(treeC,28);
          ctx.save();
          // Shadow at ground
          ctx.fillStyle="rgba(0,0,0,0.35)";
          ctx.beginPath(); ctx.ellipse(sx,gnd+TH*0.12,r*0.85,TH*0.22,0,0,Math.PI*2); ctx.fill();
          // Trunk — from ground upward
          ctx.fillStyle="#5a3211"; ctx.fillRect(sx-r*0.14,gnd-h*0.32,r*0.28,h*0.32);
          // Canopy rings (layered for depth)
          ctx.fillStyle=treeC; ctx.beginPath(); ctx.arc(sx,gnd-h*0.38,r*1.25,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=treeBright; ctx.beginPath(); ctx.arc(sx,gnd-h*0.52,r*0.92,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=this._lighten(treeBright,16); ctx.beginPath(); ctx.arc(sx-r*0.28,sy+TH-h*0.64,r*0.52,0,Math.PI*2); ctx.fill();
          ctx.restore();
        }
      } else if (v===1 && !isWild) {
        // Dungeon wall → occasional Dungeon 1.1 decoration
        if (!useGlb) continue;
        const openAt = (x,y) => (m[y]?.[x] ?? 0) !== 1;
        if (!(openAt(tx-1,ty) || openAt(tx+1,ty) || openAt(tx,ty-1) || openAt(tx,ty+1))) continue;
        const seed=((tx*73856093)^(ty*19349663)^((this.dungeonSeed||1)*997))>>>0;
        const wallRoll=(seed%100)/100;
        if (wallRoll < 0.03) {
          // Rare structural pillar — only at wider wall sections
          this._drawD11Prop(ctx, sx, sy, (seed%2===0)?"pillar":"pillar_decorated", TW, TH);
        } else if (wallRoll < 0.08) {
          // Wall torch — the primary dungeon accent, kept sparse
          this._drawD11Prop(ctx, sx, sy, (seed%3===0)?"torch_mounted":"torch_lit", TW, TH);
        }
      } else if (v===3) {
        // Chest tile — always render even on medium quality
        const d11url=this._d11PropUrl("chest_gold")||this._d11PropUrl("chest");
        const d10url=this._kaykitPropUrl("chest_common");
        const chestUrl=d11url||d10url;
        const chestFrame = this._isoAssetFrame(chestUrl, "front");
        const chestState=(area.chests||[]).find(c=>c.tx===tx&&c.ty===ty);
        if (chestFrame&&!chestState?.open) {
          const cH=TH*2.8, cW=cH*(chestFrame.width/chestFrame.height);
          ctx.save(); ctx.imageSmoothingEnabled=true;
          if(this.Q.glow){ctx.shadowColor="#cc8822";ctx.shadowBlur=16;}
          ctx.drawImage(chestFrame,sx-cW*0.5,sy-cH*0.65,cW,cH);
          ctx.restore();
        } else if (!chestState?.open) {
          if (chestUrl) preloadGlbStripsFireAndForget(chestUrl,["idle"],["front"]);
          const chestImg=_crRuntimeAssetImage("treasure_chest",_crAssetTierForQuality(this.quality));
          if (_crImageReady(chestImg)) {
            ctx.imageSmoothingEnabled=true;
            ctx.drawImage(chestImg,sx-TW*0.3,sy+TH*0.2,TW*0.6,TH*0.7);
          } else {
            // Bold gold box fallback
            ctx.save();
            ctx.fillStyle="#7a4a1a"; ctx.fillRect(sx-TW*0.28,sy+TH*0.22,TW*0.56,TH*0.52);
            ctx.fillStyle="#d6b65c"; ctx.fillRect(sx-TW*0.3,sy+TH*0.18,TW*0.6,TH*0.14);
            ctx.strokeStyle="#aa8822"; ctx.lineWidth=1; ctx.strokeRect(sx-TW*0.28,sy+TH*0.22,TW*0.56,TH*0.52);
            if(this.Q.glow){ctx.shadowColor="#cc8822";ctx.shadowBlur=8;}
            ctx.fillStyle="#ffcc44"; ctx.font=`bold ${Math.max(8,TH*0.6)}px monospace`; ctx.textAlign="center"; ctx.textBaseline="middle";
            ctx.fillText("✦",sx,sy+TH*0.55);
            ctx.restore();
          }
        } else {
          ctx.font="bold 8px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillStyle="#6f6a58"; ctx.fillText("open",sx,sy+TH*0.55);
        }
      } else if ((v===0||v===9)&&!isWild&&useGlb) {
        // Dungeon floor: occasional Dungeon 1.1 prop
        const seed=((tx*15485863)^(ty*32452867)^((this.dungeonSeed||1)*97))>>>0;
        if ((seed%1000)/1000 < 0.015) {
          this._drawD11Prop(ctx, sx, sy, this._dungeonFloorProp(tx,ty), TW, TH);
        }
      }
    }
    this._drawAdminPlacedObjectsIso(W,H,TW,TH);

    // D2 radius rings (high/ultra when radius grid enabled)
    if (this.showRadiusGrid && (this.quality==="high"||this.quality==="ultra")) {
      this._drawD2RadiusGrid(W,H);
    }

    // Scanlines
    if (this.Q.scanlines) {
      ctx.fillStyle="rgba(0,0,0,0.12)";
      for (let y=0;y<H;y+=4) ctx.fillRect(0,y,W,2);
    }
  }

  // ── D2-style isometric radius rings ──────────────────────────────────────────
  _drawD2RadiusGrid(W,H) {
    const ctx=this.ctx;
    const p=this.player;
    const ptx=p.wx/this.TS, pty=p.wy/this.TS;
    const scale=this._viewScale();
    const TW=this.TW*scale, TH=this.TH*scale;
    const rings=[2,4,6,8,10,12,14,16];
    ctx.save();
    ctx.lineWidth=0.6;
    for (const r of rings) {
      const alpha=r<=6 ? 0.55 : r<=10 ? 0.38 : 0.22;
      ctx.strokeStyle=`rgba(200,200,180,${alpha})`;
      ctx.setLineDash([3,4]);
      ctx.beginPath();
      // Diamond in iso space: 4 vertices at (±r,0) and (0,±r) tile coords
      const pts=[
        this._isoToScreen(ptx+r, pty),
        this._isoToScreen(ptx,   pty-r),
        this._isoToScreen(ptx-r, pty),
        this._isoToScreen(ptx,   pty+r),
      ];
      ctx.moveTo(pts[0].sx, pts[0].sy);
      ctx.lineTo(pts[1].sx, pts[1].sy);
      ctx.lineTo(pts[2].sx, pts[2].sy);
      ctx.lineTo(pts[3].sx, pts[3].sy);
      ctx.closePath();
      ctx.stroke();
      // Tile number label at right corner
      ctx.fillStyle=`rgba(220,215,180,${alpha+0.1})`;
      ctx.font="bold 9px monospace";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(`${r}`, pts[0].sx+6, pts[0].sy);
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── Top-down renderer ──────────────────────────────────────────────────────
  _drawTop(W,H) {
    const ctx=this.ctx;
    const isWild=this.screen==="wilderness";
    ctx.fillStyle=isWild ? "#13241a" : this.act.bg; ctx.fillRect(0,0,W,H);
    if (isWild && this.Q.detail>0) this._drawWildernessSky(W,H);
    const area=isWild ? this.wilderness : this.dungeon;
    this._drawTopMap(W,H,area,isWild,false);
    this._drawAdminPlacedObjectsTop(W,H);
    if (this.showRadiusGrid && (this.quality==="high"||this.quality==="ultra")) {
      this._drawD2RadiusGrid(W,H);
    }
  }

  _drawTopMap(W,H,area,isWild=false,isTown=false) {
    const ctx=this.ctx, m=area.map, TS=this.TS;
    const scale=this._viewScale();
    const px=Math.floor(this.player.wx/TS), py=Math.floor(this.player.wy/TS);
    const rx=Math.ceil(W/(TS*scale))+4, ry=Math.ceil(H/(TS*scale))+4;
    const x0=Math.max(0,px-rx), x1=Math.min(m[0].length-1,px+rx);
    const y0=Math.max(0,py-ry), y1=Math.min(m.length-1,py+ry);
    for (let ty=y0;ty<=y1;ty++) for (let tx=x0;tx<=x1;tx++) {
      const v=m[ty][tx];
      const a=this._topToScreen(tx*TS,ty*TS,W,H);
      const b=this._topToScreen((tx+1)*TS,ty*TS,W,H);
      const c=this._topToScreen((tx+1)*TS,(ty+1)*TS,W,H);
      const d=this._topToScreen(tx*TS,(ty+1)*TS,W,H);
      const center=this._topToScreen(tx*TS+TS/2,ty*TS+TS/2,W,H);
      const c0=this._tileColor(v,isWild,isTown);
      ctx.fillStyle=c0;
      ctx.beginPath();
      ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.lineTo(c.sx,c.sy); ctx.lineTo(d.sx,d.sy);
      ctx.closePath(); ctx.fill();
      if (this.Q.detail>0 && v!==1) { ctx.strokeStyle=this._darken(c0,18); ctx.lineWidth=0.6; ctx.stroke(); }
      if (v===1 && this.Q.detail>1) {
        ctx.fillStyle="rgba(0,0,0,0.2)";
        ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.lineTo(center.sx,center.sy); ctx.closePath(); ctx.fill();
      }
      if (v===3 || v===4 || v===8 || v===5) {
        ctx.font=`bold ${Math.max(8,Math.round(9*scale))}px monospace`;
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillStyle=v===5 ? "#ffd6ff" : "#d8d0bd";
        if (v===3) {
          const ch=(area.chests||[]).find(ch=>ch.tx===tx&&ch.ty===ty);
          const chestImg = _crRuntimeAssetImage("treasure_chest", _crAssetTierForQuality(this.quality));
          if (!ch?.open && _crImageReady(chestImg)) {
            const iw = TS*scale*0.64;
            ctx.imageSmoothingEnabled = this.quality !== "low";
            ctx.drawImage(chestImg, center.sx-iw/2, center.sy-iw*0.62, iw, iw*0.72);
          } else {
            ctx.fillText(ch?.open ? "OPEN" : "CHEST",center.sx,center.sy);
          }
        }
        if (v===4) ctx.fillText(isWild ? "CAVE" : "DOWN",center.sx,center.sy);
        if (v===8) ctx.fillText("TOWN",center.sx,center.sy);
        if (v===5) {
          const portalImg = _crRuntimeAssetImage("home_portal", _crAssetTierForQuality(this.quality));
          if (_crImageReady(portalImg)) {
            const iw = TS*scale*0.82;
            ctx.imageSmoothingEnabled = this.quality !== "low";
            ctx.globalCompositeOperation = "screen";
            ctx.drawImage(portalImg, center.sx-iw/2, center.sy-iw*0.72, iw, iw*0.9);
            ctx.globalCompositeOperation = "source-over";
          } else {
            ctx.fillText("PORTAL",center.sx,center.sy);
          }
        }
      }
    }
  }

  // ── FPS raycaster ──────────────────────────────────────────────────────────
  _tileColor(v, isWild=false, isTown=false) {
    if (isTown) {
      if (v===1) return "#3a2a1a";
      if (v===0) return "#5a4a36";
      if (v===2) return "#7a6a52";
      if (v===5) return "#7f3f78";
      if (v===6) return "#3a5a88";
      if (v===8) return "#4e6f42";
      return "#1d3b22";
    }
    if (isWild) {
      if (v===1) return "#244c2c";
      if (v===0) return "#7a6248";
      if (v===4) return "#3a221a";
      if (v===8) return "#9a8052";
      return "#3a6a45";
    }
    return v===1 ? this.act.wallC : v===9 ? "#1a0a08" : v===3 ? "#2a1808" : v===4 ? "#0a1a0a" : this.act.floorC;
  }

  _thirdHorizon(H) {
    const pitch = Math.max(-0.45, Math.min(0.45, this.cameraPitch || 0));
    return Math.max(H*0.26, Math.min(H*0.46, H*(0.34 + pitch*0.12)));
  }

  _worldToThird(wx,wy,W,H,height=0) {
    const p=this.player;
    const viewAngle=p.angle + (this.cameraYaw || 0);
    const ca=Math.cos(viewAngle), sa=Math.sin(viewAngle);
    const zoom=this._cameraZoomScale();
    const camBack=180 / Math.max(0.72, zoom);
    const camWx=p.wx-ca*camBack;
    const camWy=p.wy-sa*camBack;
    const dx=wx-camWx, dy=wy-camWy;
    const depth=dx*ca+dy*sa;
    const side=dx*(-sa)+dy*ca;
    if (depth < 18) return null;
    const focal=Math.min(W,H)*(0.9 + zoom*0.18) * this._gfxScale();
    const scale=focal/(depth+210/Math.max(0.72, zoom));
    const horizon=this._thirdHorizon(H);
    const sx=W/2 + side*scale;
    const sy=horizon + 150*scale - height*scale + H*0.02;
    return { sx, sy, scale, depth };
  }

  _thirdGroundY(depth, W, H) {
    const horizon = this._thirdHorizon(H);
    const far = Math.max(420, Math.min(W, H) * 0.78);
    const t = this._clamp(1 - (Number.isFinite(depth) ? depth : far) / far, 0, 1);
    return horizon + Math.pow(t, 0.72) * (H - horizon) * 0.72;
  }

  _thirdTilePoly(tx, ty, W, H) {
    const TS = this.TS;
    const pts = [
      this._worldToThird(tx*TS,     ty*TS,     W, H, 0),
      this._worldToThird((tx+1)*TS, ty*TS,     W, H, 0),
      this._worldToThird((tx+1)*TS, (ty+1)*TS, W, H, 0),
      this._worldToThird(tx*TS,     (ty+1)*TS, W, H, 0),
    ];
    if (pts.some(p => !p)) return null;
    return pts;
  }

  _drawThird(W,H) {
    const ctx=this.ctx;
    const isTown=this.screen==="town", isWild=this.screen==="wilderness";
    const bg=isTown ? this.town.bg : isWild ? "#08130d" : this.act.bg;
    const horizon = this._thirdHorizon(H);
    const sky=ctx.createLinearGradient(0,0,0,horizon+40);
    sky.addColorStop(0,this._lighten(bg,16));
    sky.addColorStop(0.62,this._lighten(bg,5));
    sky.addColorStop(1,this._darken(bg,12));
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,horizon+42);
    if (this.Q.detail>0) {
      ctx.save();
      for (let i=0;i<120;i++) {
        const sx=(i*139.7+this._frame*0.02)%W, sy=(i*61.9)%(horizon*0.82);
        ctx.fillStyle=i%9===0 ? this.act.color : "rgba(230,240,255,0.34)";
        ctx.fillRect(sx,sy,1.2,1.2);
      }
      ctx.restore();
    }
    const floor=ctx.createLinearGradient(0,horizon,0,H);
    floor.addColorStop(0,isTown ? "#4d3d2f" : isWild ? "#142718" : this._darken(this.act.floorC,24));
    floor.addColorStop(1,isTown ? "#7a6a52" : isWild ? "#203f27" : this._lighten(this.act.floorC,8));
    ctx.fillStyle=floor; ctx.fillRect(0,horizon,W,H-horizon);

    const m=this._activeMap;
    const p=this.player;
    const tx0=Math.max(0,Math.floor(p.wx/this.TS)-12), tx1=Math.min(m[0].length-1,Math.floor(p.wx/this.TS)+18);
    const ty0=Math.max(0,Math.floor(p.wy/this.TS)-12), ty1=Math.min(m.length-1,Math.floor(p.wy/this.TS)+18);
    const tiles=[];
    for (let ty=ty0;ty<=ty1;ty++) for (let tx=tx0;tx<=tx1;tx++) {
      const proj=this._worldToThird(tx*this.TS+this.TS/2,ty*this.TS+this.TS/2,W,H,0);
      if (!proj || proj.sx<-180 || proj.sx>W+180 || proj.sy<-60 || proj.sy>H+180) continue;
      tiles.push({tx,ty,v:m[ty][tx],...proj});
    }
    tiles.sort((a,b)=>b.depth-a.depth);
    tiles.forEach(t=>{
      const poly = this._thirdTilePoly(t.tx, t.ty, W, H);
      const size=Math.max(6,this.TS*t.scale*0.9*this._gfxScale());
      const c=this._tileColor(t.v,isWild,isTown);
      ctx.fillStyle=c;
      ctx.beginPath();
      if (poly) {
        ctx.moveTo(poly[0].sx, poly[0].sy);
        ctx.lineTo(poly[1].sx, poly[1].sy);
        ctx.lineTo(poly[2].sx, poly[2].sy);
        ctx.lineTo(poly[3].sx, poly[3].sy);
      } else {
        ctx.moveTo(t.sx,t.sy-size*0.32);
        ctx.lineTo(t.sx+size*0.72,t.sy);
        ctx.lineTo(t.sx,t.sy+size*0.34);
        ctx.lineTo(t.sx-size*0.72,t.sy);
      }
      ctx.closePath();
      ctx.fill();
      if (this.Q.detail>0) { ctx.strokeStyle=this._darken(c,18); ctx.globalAlpha=0.55; ctx.stroke(); ctx.globalAlpha=1; }
      if (t.v===1) {
        ctx.fillStyle=this._darken(c,16);
        ctx.fillRect(t.sx-size*0.42,t.sy-size*1.05,size*0.84,size*0.82);
        ctx.strokeStyle=this._lighten(c,18); ctx.strokeRect(t.sx-size*0.42,t.sy-size*1.05,size*0.84,size*0.82);
      }
      if (t.v===4 || t.v===5 || t.v===8) {
        ctx.save();
        ctx.shadowColor=t.v===8 ? "#65e28a" : t.v===5 ? "#ff44ff" : "#d49a63";
        ctx.shadowBlur=18;
        ctx.fillStyle=ctx.shadowColor;
        ctx.beginPath(); ctx.ellipse(t.sx,t.sy-size*0.18,size*0.48,size*0.16,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
    });

    // Buildings + trees in third-person (after tiles, before vignette)
    if (isTown) this._drawThirdTownBuildings(W,H);

    // ── Player character (third-person: visible behind camera) ───────────────
    const playerProj = this._worldToThird(p.wx, p.wy, W, H, 0);
    if (playerProj && playerProj.sx > -60 && playerProj.sx < W+60) {
      const pSize = Math.max(28, Math.min(54, this.TS * playerProj.scale * 0.85 * this._gfxScale()));
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.36)";
      ctx.beginPath(); ctx.ellipse(playerProj.sx, playerProj.sy + pSize*0.18, pSize*0.38, pSize*0.14, 0, 0, Math.PI*2); ctx.fill();
      // Character sprite
      this._drawCharSprite(ctx, playerProj.sx, playerProj.sy, this.cls?.id || "iron_warden", p.angle, this._frame, pSize, 1, false, {state: this._lastMoveMag > 0.1 ? "walk" : "idle", dir: "back"});
      // HP bar above player
      if (p.hp < p.maxHp) {
        const barW = pSize * 0.8, barH = 4;
        const barX = playerProj.sx - barW/2, barY = playerProj.sy - pSize - 12;
        ctx.fillStyle = "#1a0a0a"; ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = p.hp > p.maxHp*0.5 ? "#44ff88" : p.hp > p.maxHp*0.25 ? "#ffaa44" : "#ff4444";
        ctx.fillRect(barX, barY, barW * (p.hp/p.maxHp), barH);
      }
    }

    // ── Enemies in combat areas (third-person view) ──────────────────────────
    if (!isTown && !isWild && this.enemies) {
      const enemyProjs = this.enemies.filter(e => !e.isDead).map(e => {
        const proj = this._worldToThird(e.wx, e.wy, W, H, 0);
        return proj ? {...e, ...proj} : null;
      }).filter(p => p && p.sx > -60 && p.sx < W+60).sort((a,b) => b.depth - a.depth);

      enemyProjs.forEach(e => {
        const eSize = Math.max(24, Math.min(48, this.TS * e.scale * 0.75 * this._gfxScale()));
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.32)";
        ctx.beginPath(); ctx.ellipse(e.sx, e.sy + eSize*0.16, eSize*0.34, eSize*0.12, 0, 0, Math.PI*2); ctx.fill();
        // Enemy sprite
        const eColor = e.color || "#ff4444";
        ctx.fillStyle = eColor;
        ctx.beginPath(); ctx.ellipse(e.sx, e.sy - eSize*0.3, eSize*0.38, eSize*0.52, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = this._darken(eColor, 30); ctx.lineWidth = 1.5; ctx.stroke();
        // Eyes
        ctx.fillStyle = "#ffff00";
        ctx.fillRect(e.sx - eSize*0.15, e.sy - eSize*0.52, eSize*0.08, eSize*0.08);
        ctx.fillRect(e.sx + eSize*0.07, e.sy - eSize*0.52, eSize*0.08, eSize*0.08);
        // HP bar
        if (e.hp < e.maxHp) {
          const barW = eSize * 0.7, barH = 3;
          const barX = e.sx - barW/2, barY = e.sy - eSize - 10;
          ctx.fillStyle = "#1a0a0a"; ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = "#ff4444";
          ctx.fillRect(barX, barY, barW * (e.hp/e.maxHp), barH);
        }
      });
    }

    // ── Boss (if present) ────────────────────────────────────────────────────
    if (!isTown && !isWild && this.boss && !this.boss.isDead) {
      const bProj = this._worldToThird(this.boss.wx, this.boss.wy, W, H, 0);
      if (bProj && bProj.sx > -80 && bProj.sx < W+80) {
        const bSize = Math.max(56, Math.min(96, this.TS * bProj.scale * 1.4 * this._gfxScale()));
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.44)";
        ctx.beginPath(); ctx.ellipse(bProj.sx, bProj.sy + bSize*0.22, bSize*0.48, bSize*0.18, 0, 0, Math.PI*2); ctx.fill();
        // Boss body
        const bColor = this.boss.color || "#aa2244";
        ctx.fillStyle = bColor;
        ctx.beginPath(); ctx.ellipse(bProj.sx, bProj.sy - bSize*0.35, bSize*0.46, bSize*0.62, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = this._lighten(bColor, 20); ctx.lineWidth = 2; ctx.stroke();
        // Glowing eyes
        ctx.save();
        ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 12;
        ctx.fillStyle = "#ff2200";
        ctx.fillRect(bProj.sx - bSize*0.18, bProj.sy - bSize*0.62, bSize*0.12, bSize*0.12);
        ctx.fillRect(bProj.sx + bSize*0.06, bProj.sy - bSize*0.62, bSize*0.12, bSize*0.12);
        ctx.restore();
        // Boss HP bar
        const barW = bSize * 0.9, barH = 6;
        const barX = bProj.sx - barW/2, barY = bProj.sy - bSize - 14;
        ctx.fillStyle = "#1a0a0a"; ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = "#ff2244";
        ctx.fillRect(barX, barY, barW * (this.boss.hp/this.boss.maxHp), barH);
        ctx.strokeStyle = "#ffaa44"; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH);
      }
    }

    ctx.save();
    const grad=ctx.createRadialGradient(W/2,H*0.55,20,W/2,H*0.55,W*0.62);
    grad.addColorStop(0,"rgba(0,0,0,0)");
    grad.addColorStop(1,"rgba(0,0,0,0.38)");
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    ctx.restore();
  }

  _drawFPS(W,H) {
    try { this._drawFPSInner(W,H); } catch(err) {
      // FPS render crashed — show fallback instead of white-screening the game
      const ctx=this.ctx;
      ctx.fillStyle="#030105"; ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#ff5544"; ctx.font="bold 13px monospace"; ctx.textAlign="center";
      ctx.fillText("FPS VIEW ERROR — switching to ISO", W/2, H/2-20);
      ctx.fillStyle="#a99c86"; ctx.font="10px monospace";
      ctx.fillText(String(err?.message||err).slice(0,80), W/2, H/2+4);
      ctx.fillStyle="#ffdd66"; ctx.font="bold 11px monospace";
      ctx.fillText("Press C to switch camera", W/2, H/2+26);
      ctx.textAlign="left";
      console.warn("[FPS] render error:", err);
      // Auto-demote to iso to avoid repeated crash
      if (!this._fpsErrorCooldown) { this._fpsErrorCooldown=180; this.camera="iso"; this._cameraSnap=true; }
    }
    if (this._fpsErrorCooldown > 0) this._fpsErrorCooldown--;
  }
  _drawFPSInner(W,H) {
    const ctx=this.ctx; const p=this.player;
    const activeMap=this._activeMap;
    const safeAct=this.act || CR_ACTS[this.actIdx] || CR_ACTS[0];
    if (!p || !activeMap || !activeMap[0]) {
      ctx.fillStyle="#050005";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#d6b65c";
      ctx.font="bold 12px monospace";
      ctx.textAlign="center";
      ctx.fillText("FPS VIEW IS WAITING FOR A VALID MAP", W/2, H/2);
      return;
    }
    if (!Number.isFinite(p.wx) || !Number.isFinite(p.wy)) {
      const fallback = this._nearestWalkableTile(
        activeMap,
        Number.isFinite(this.dungeon?.spawnX) ? this.dungeon.spawnX : 1,
        Number.isFinite(this.dungeon?.spawnY) ? this.dungeon.spawnY : 1,
        14
      );
      p.wx = (fallback.tx + 0.5) * this.TS;
      p.wy = (fallback.ty + 0.5) * this.TS;
      this._cameraSnap = true;
      console.warn("[FPS] repaired non-finite player position before render", fallback);
    }
    if (!Number.isFinite(p.angle)) p.angle = 0;
    const zoom=this._cameraZoomScale();
    const gfx=this._gfxScale();
    const inTown = this.screen === "town";
    const inWild = this.screen === "wilderness";
    const floorC = inTown ? "#5a4a36" : inWild ? "#3a6a45" : safeAct.floorC;
    const wallC = inTown ? "#3a2a1a" : inWild ? "#244c2c" : safeAct.wallC;
    const bgC = inTown ? this.town.bg : inWild ? "#08130d" : safeAct.bg;
    const horizonC = inTown ? "#2a1738" : inWild ? "#27422e" : this._lighten(safeAct.bg,8);
    const bob = Math.sin(this.headBob || 0) * 7 * (this._lastMoveMag || 0);
    const pitch = this.fpsPitch || this.cameraPitch || 0;
    const horizon = Math.max(H*0.24, Math.min(H*0.72, H*0.48 + pitch*H*0.42 + (this.cameraPitch||0)*H*0.14 + bob));

    const cg=ctx.createLinearGradient(0,0,0,horizon);
    cg.addColorStop(0,this._darken(bgC,12));
    cg.addColorStop(0.68,horizonC);
    cg.addColorStop(1,this._lighten(horizonC,10));
    ctx.fillStyle=cg; ctx.fillRect(0,0,W,horizon);

    if (this.Q.detail>0) {
      ctx.save();
      if (inWild) {
        // ── Wilderness sky: stars + moon glow ────────────────────────────────
        // Stars (fixed seed so they don't shimmer)
        for (let i=0;i<200;i++) {
          const sx=((i*2654435761)>>>0)%W;
          const sy=((i*1013904223)>>>0)%(horizon*0.88);
          const twinkle=0.35+0.65*((Math.sin(this._frame*0.04+i*0.8)+1)*0.5);
          const sz=((i*99991)&3)===0 ? 1.8 : 1.2;
          ctx.fillStyle=`rgba(230,245,235,${(0.12+((i*37)%100)/500)*twinkle})`;
          ctx.fillRect(sx,sy,sz,sz);
        }
        // Distant moon
        const moonX=W*0.78, moonY=horizon*0.26;
        const moonR=Math.max(12,Math.min(22,H*0.028));
        const moonPulse=0.82+0.18*Math.sin(this._frame*0.007);
        ctx.save();
        ctx.globalAlpha=0.62*moonPulse;
        const moonGlow=ctx.createRadialGradient(moonX,moonY,moonR*0.2,moonX,moonY,moonR*3.6);
        moonGlow.addColorStop(0,"rgba(200,240,210,0.72)");
        moonGlow.addColorStop(0.28,"rgba(160,210,175,0.22)");
        moonGlow.addColorStop(1,"rgba(0,20,8,0)");
        ctx.fillStyle=moonGlow; ctx.beginPath(); ctx.arc(moonX,moonY,moonR*3.6,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=0.88*moonPulse;
        ctx.fillStyle="#cdefd8"; ctx.beginPath(); ctx.arc(moonX,moonY,moonR,0,Math.PI*2); ctx.fill();
        ctx.restore();
        // Distant treeline silhouette at horizon — multi-layer with pine spires
        if (this.Q.detail>1) {
          // Seed from player world position for a stable, slowly-shifting treeline
          const tlSeed=(Math.round(p.wx/32)*1000003+Math.round(p.wy/32)*999983)|0;
          // Layer 0 — darkest, most distant trees (thin layer, low bumps)
          ctx.fillStyle="#0a1b12";
          const tl0h=horizon-2;
          for (let tx=0;tx<W;tx+=2) {
            const bump=Math.sin(tx*0.031+tlSeed*0.001)*5+Math.sin(tx*0.009)*8+Math.sin(tx*0.019)*3;
            ctx.fillRect(tx,tl0h-Math.max(0,bump+5),2,Math.max(0,bump+5)+2);
          }
          // Layer 1 — mid-distance, medium variation + occasional pine spire
          ctx.fillStyle="#0d2016";
          const tl1h=horizon;
          for (let tx=0;tx<W;tx+=2) {
            const spireHash=((tx*1013904223+tlSeed*2654435761)>>>0)%120;
            const isSpire=spireHash<4;
            const spireH=isSpire ? 18+spireHash*3 : 0;
            const bump=Math.sin(tx*0.044+tlSeed*0.0013)*8+Math.sin(tx*0.014)*13+Math.sin(tx*0.028+1.2)*5+spireH;
            ctx.fillRect(tx,tl1h-Math.max(0,bump+9),2,Math.max(0,bump+9)+2);
          }
          // Layer 2 — closest silhouette, richest color + more jagged tops
          ctx.fillStyle="#112a1a";
          const tl2h=horizon+2;
          for (let tx=0;tx<W;tx+=2) {
            const hash=((tx*2654435761+tlSeed*1013904223)>>>0);
            const jag=((hash%8)===0) ? 10+((hash>>4)%10) : 0; // sparse tall spires
            const bump=Math.sin(tx*0.058+tlSeed*0.0017)*7+Math.sin(tx*0.018)*11+Math.sin(tx*0.036+2.1)*5+jag;
            ctx.fillRect(tx,tl2h-Math.max(0,bump+11),2,Math.max(0,bump+11)+2);
          }
        }
        // Ground mist — two-pass for richer depth
        const mist=ctx.createLinearGradient(0,horizon-6,0,horizon+H*0.26);
        mist.addColorStop(0,"rgba(145,195,162,0.32)");
        mist.addColorStop(0.22,"rgba(90,145,112,0.16)");
        mist.addColorStop(0.62,"rgba(50,100,70,0.07)");
        mist.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=mist; ctx.fillRect(0,horizon-6,W,H*0.26);
        // Thin bright horizon glow above treeline
        const hGlow=ctx.createLinearGradient(0,horizon-22,0,horizon-4);
        hGlow.addColorStop(0,"rgba(0,0,0,0)");
        hGlow.addColorStop(1,"rgba(120,190,145,0.18)");
        ctx.fillStyle=hGlow; ctx.fillRect(0,horizon-22,W,18);
      } else if (inTown) {
        // Town: subtler atmosphere
        for (let i=0;i<80;i++) {
          const sx=(i*137.5 + this._frame*0.06)%W, sy=(i*53.3)%(horizon*0.82);
          ctx.fillStyle=`rgba(210,190,255,${0.08+((i*31)%55)/400})`;
          ctx.fillRect(sx,sy,1.2,1.2);
        }
      }
      ctx.restore();
    }

    const fg=ctx.createLinearGradient(0,horizon,0,H);
    fg.addColorStop(0,this._darken(floorC,22));
    fg.addColorStop(0.55,floorC);
    fg.addColorStop(1,this._lighten(floorC,12));
    ctx.fillStyle=fg; ctx.fillRect(0,horizon,W,H-horizon);
    if (this.Q.detail>0) {
      ctx.save();
      if (inWild) {
        // ── Wilderness ground: scanline pseudo-world-position texture ────────────
        // Each screen row maps to an approximate world depth → hash (wx,wz) → grass color.
        // Sampling in 3-row bands keeps it fast while giving clear color variation.
        const cosA=Math.cos(p.angle||0), sinA=Math.sin(p.angle||0);
        const wx0=Math.round(p.wx/8), wy0=Math.round(p.wy/8);
        const gH=H-horizon;
        for (let y=horizon+2; y<H; y+=3) {
          const t=(y-horizon)/Math.max(1,gH);        // 0=horizon, 1=bottom
          const d=1.4/Math.max(0.04,t);              // approx world depth
          const wz=Math.round(wy0+d*cosA);
          const wx=Math.round(wx0+d*sinA);
          const seed=((wx*73856093)^(wz*19349663))>>>0;
          const r=14+((seed>>4)&16);
          const g=46+((seed>>8)&26);
          const b=12+((seed>>12)&12);
          const al=Math.min(0.34, 0.14+t*0.22);    // more opaque near player
          ctx.fillStyle=`rgba(${r},${g},${b},${al})`;
          ctx.fillRect(0,y,W,3);
        }
        // Near-ground grass tufts (bottom 40% of ground area, high/ultra only)
        if (this.Q.detail>1) {
          const nearTop=horizon+(gH*0.60)|0;
          ctx.globalAlpha=1;
          for (let i=0;i<72;i++) {
            const ts=(((wx0+i*37)*73856093)^((wy0+i*17)*19349663))>>>0;
            const gx=(ts%W);
            const gy=nearTop+((ts>>8)%(((H-nearTop)|0)-2));
            const gh=3+((ts>>12)&5);
            const lean=((ts>>16)&3)-1;
            ctx.fillStyle=`rgba(${26+((ts>>4)&18)},${58+((ts>>6)&24)},${18+((ts>>8)&12)},${0.38+((ts>>20)&3)*0.1})`;
            ctx.fillRect(gx+lean,gy-gh,1,gh);
          }
        }
      } else {
        // Non-wilderness: subtle road glow + faint ground detail
        const roadGlow=ctx.createRadialGradient(W*0.52,H*0.84,20,W*0.52,H*0.9,W*0.46);
        roadGlow.addColorStop(0,"rgba(185,160,120,0.14)");
        roadGlow.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=roadGlow; ctx.fillRect(0,horizon,W,H-horizon);
      }
      ctx.restore();
    }

    const FOV=Math.PI/(2.1 + zoom*0.55), numRays=Math.max(1,Math.floor(W/2)), halfFOV=FOV/2;
    const rayMax=500 + this.Q.detail*120 + zoom*80;
    // Wall depth buffer for sprite clipping
    const depthBuf=new Float32Array(W);
    depthBuf.fill(rayMax);
    for (let i=0;i<numRays;i++) {
      const angle=p.angle-halfFOV+(i/numRays)*FOV;
      const {dist,hit}=this._castRay(angle, rayMax);
      const screenX=i*2;
      depthBuf[screenX]=depthBuf[screenX+1]=dist;
      if (!hit) continue;
      // In wilderness, v=1 tiles are trees/rocks — render them as sprites only.
      // Skip the flat wall slab so the billboard tree sprite shows against sky/ground.
      if (inWild && hit.tile===1) continue;
      const wallH=Math.min((H*0.8*this.TS*gfx*zoom)/dist,H*1.08);
      const shade=Math.max(0.06,1-dist/(420+this.Q.detail*120));
      const tileWall = inTown && hit.tile === 6 ? "#3a5a88" : wallC;
      const y=horizon-wallH/2;
      ctx.fillStyle=this._darken(tileWall,Math.floor((1-shade)*130));
      ctx.fillRect(screenX,y,2,wallH);
      if (this.Q.detail>0 && (i%5===0 || hit.tile===6)) {
        ctx.fillStyle=`rgba(255,235,190,${0.05+shade*0.08})`;
        ctx.fillRect(screenX,y,1,wallH);
      }
    }

    if (this.Q.detail>0) {
      ctx.save();
      // Horizontal perspective rows — brighter in wilderness for grass line visibility
      const hAlpha = inWild ? 0.30 : 0.22;
      const hColor = inWild ? this._lighten(floorC,32) : this._lighten(floorC,24);
      ctx.strokeStyle=hColor;
      for (let i=0;i<22;i++) {
        const y=horizon + Math.pow(i/22,1.7)*(H-horizon);
        ctx.globalAlpha = hAlpha * (0.5 + 0.5*(i/22)); // fade toward horizon
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
      }
      // Converging depth lines — more visible for wilderness
      ctx.globalAlpha = inWild ? 0.20 : 0.14;
      ctx.strokeStyle = inWild ? "rgba(80,120,60,0.7)" : "rgba(0,0,0,0.5)";
      for (let i=-14;i<=14;i++) {
        const x=W/2+i*W/16;
        ctx.beginPath(); ctx.moveTo(W/2,horizon); ctx.lineTo(x,H); ctx.stroke();
      }
      // Wilderness: soft fog band at ground-horizon seam
      if (inWild) {
        const fog=ctx.createLinearGradient(0,horizon-2,0,horizon+H*0.12);
        fog.addColorStop(0,"rgba(100,160,120,0.28)");
        fog.addColorStop(0.5,"rgba(60,110,80,0.10)");
        fog.addColorStop(1,"rgba(0,0,0,0)");
        ctx.globalAlpha=1;
        ctx.fillStyle=fog; ctx.fillRect(0,horizon-2,W,H*0.12);
      }
      ctx.restore();
    }

    const townSprites = inTown ? [
      ...this.town.npcs.map(n=>({ wx:n.wx, wy:n.wy, size:34, color:n.color, isTownNpc:true, isLoot:false, isBoss:false, icon:n.icon, name:n.name, spriteId:n.spriteId })),
      { wx:this.town.portalWx, wy:this.town.portalWy, size:42, color:"#ff44ff", isPortal:true, isLoot:false, isBoss:false, icon:"*", name:"DUNGEON" },
      { wx:this.town.exitWx, wy:this.town.exitWy, size:38, color:"#6dd987", isPortal:true, isLoot:false, isBoss:false, icon:"*", name:"WILDERNESS" },
      ...this._activeStatues().filter(s=>!s.found).map(s=>({ wx:s.wx, wy:s.wy, size:40, color:s.color, isStatue:true, isLoot:false, isBoss:false, icon:"*", name:s.name })),
      ...(this.merc && !this.merc.dead ? [{ wx:p.wx-40, wy:p.wy+10, size:32, color:this.merc.color, isTownNpc:true, isLoot:false, isBoss:false, icon:"+", name:this.merc.name, spriteId:"iron_warden" }] : []),
      ...this.summons.map(s => ({ wx:s.wx, wy:s.wy, size:26, color:s.color||"#ccccee", isSummon:true, isLoot:false, isBoss:false })),
      // Town buildings as FPS billboard sprites
      ...this._townBuildingClusters(this.town.map[0].length, this.town.map.length).map(cl=>({
        wx:cl.tx*this.TS+this.TS/2, wy:cl.ty*this.TS+this.TS/2,
        size:112, color:"#7a6a52", isTownBuilding:true, isTownNpc:false, isLoot:false, isBoss:false,
        icon:"", name:cl.bid.replace(/_/g," ").toUpperCase().slice(0,12),
        bid:cl.bid, bscale:cl.bscale||1,
      })),
    ] : [];
    const wildSprites = inWild ? [
      { wx:this.wilderness.caveWx, wy:this.wilderness.caveWy, size:34, color:"#c08954", isPortal:true, isLoot:false, isBoss:false, icon:"*", name:"CAVE" },
    ] : [];
    const scenicSprites = (() => { try { return this._fpsScenerySprites(inTown, inWild); } catch(_) { return []; } })();
    const dungeonSprites = inTown ? [] : [
      ...this.enemies.filter(e=>!e.isDead).map(e=>({...e,wx:e.wx,wy:e.wy,isBoss:false,isLoot:false})),
      ...(this.boss ? [{...this.boss,isBoss:true,isLoot:false}] : []),
      ...this.summons.map(s=>({...s,wx:s.wx,wy:s.wy,isSummon:true,isLoot:false,isBoss:false})),
      ...this.projectiles.map(pr=>({wx:pr.wx,wy:pr.wy,size:Math.max(12,pr.size*3),color:pr.color,isProjectile:true,isLoot:false,isBoss:false,fromPlayer:pr.fromPlayer})),
      ...this._activeStatues().filter(s=>!s.found).map(s=>({ wx:s.wx, wy:s.wy, size:40, color:s.color, isStatue:true, isLoot:false, isBoss:false, icon:"*", name:s.name })),
      ...this.loot.map(l=>({wx:l.wx,wy:l.wy,size:14,color:l.item.rarity?.color||"#ffdd00",isBoss:false,isLoot:true,icon:l.item.icon,item:l.item})),
    ];
    const maxFpsSprites = inTown ? 90 : inWild ? 110 : 64;
    const spriteCandidates=[...townSprites,...wildSprites,...scenicSprites,...dungeonSprites].map(sp=>{
      const dx=sp.wx-p.wx, dy=sp.wy-p.wy;
      const dist=Math.hypot(dx,dy);
      let a=Math.atan2(dy,dx)-p.angle;
      while(a>Math.PI)a-=Math.PI*2; while(a<-Math.PI)a+=Math.PI*2;
      return {...sp,dist,relA:a};
    }).filter(sp=>Math.abs(sp.relA)<halfFOV+0.4&&sp.dist>8&&sp.dist<520+this.Q.detail*100+zoom*80)
      .sort((a,b)=>b.dist-a.dist)
      .slice(0, maxFpsSprites);

    spriteCandidates.forEach(sp=>{ try {
      const screenX=Math.round(W/2+(sp.relA/halfFOV)*(W/2));
      const baseH=(H*0.92*this.TS*gfx*zoom)/Math.max(16, sp.dist);
      // Wilderness trees get a larger minH so they're clearly visible at range
      const minH=sp.isLoot ? 22 : sp.isProjectile ? 18 : sp.isSummon ? 54 : sp.isBoss ? 126 : sp.isStatue ? 72 : sp.isTownBuilding ? 110 : sp.isTownNpc || sp.isPortal || sp.isTownAsset ? 62 : (sp.isScenery && sp.scenery==="tree" ? 90 : sp.isScenery && sp.scenery==="rock" ? 38 : sp.isScenery && sp.scenery==="bush" ? 44 : 66);
      const maxH=sp.isBoss ? H*1.16 : sp.isLoot ? 74 : sp.isProjectile ? 68 : sp.isTownBuilding ? H*1.2*(sp.bscale||1) : H*0.98;
      const h=Math.max(minH, Math.min(baseH, maxH));
      const w=h*(sp.isBoss ? 0.9 : sp.isLoot ? 0.5 : 0.55);
      const footY = this._thirdGroundY(sp.dist, W, H);
      const top=footY-h;
      if (sp.isProjectile) {
        const depth = depthBuf[Math.min(W-1,Math.max(0,screenX))];
        if (depth < sp.dist) return;
        ctx.save();
        ctx.globalCompositeOperation="lighter";
        ctx.shadowColor=sp.color; ctx.shadowBlur=26;
        const r=Math.max(8,Math.min(42,h*0.08));
        const g=ctx.createRadialGradient(screenX,top+h*0.52,2,screenX,top+h*0.52,r*2.4);
        g.addColorStop(0,"#fff7c8");
        g.addColorStop(0.32,sp.color);
        g.addColorStop(1,"rgba(255,90,20,0)");
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(screenX,top+h*0.52,r*1.7,0,Math.PI*2); ctx.fill();
        for (let i=0;i<8;i++) {
          ctx.fillStyle=`rgba(255,92,20,${0.2-i*0.018})`;
          ctx.beginPath(); ctx.arc(screenX-r*0.7-i*r*0.55,top+h*0.55+i*2,r*(1-i*0.08),0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
      } else if (sp.isLoot) {
        if (depthBuf[Math.min(W-1,Math.max(0,screenX))]<sp.dist) return;
        const groundY = top+h*0.9;
        ctx.save();
        ctx.shadowColor=sp.color; ctx.shadowBlur=12;
        ctx.fillStyle="rgba(0,0,0,0.5)";
        ctx.beginPath(); ctx.ellipse(screenX,groundY+5,w*0.48,h*0.08,0,0,Math.PI*2); ctx.fill();
        ctx.font=`${Math.max(18,Math.round(h*0.34))}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(sp.icon,screenX,groundY-h*0.16);
        const label=this._itemDisplayName(sp.item);
        ctx.font=`bold ${Math.max(8,Math.round(h*0.09))}px monospace`;
        const tw=ctx.measureText(label).width+12;
        ctx.shadowBlur=0;
        ctx.fillStyle="rgba(0,0,0,0.72)"; ctx.fillRect(screenX-tw/2,groundY-h*0.44,tw,16);
        ctx.fillStyle=sp.color; ctx.fillText(label,screenX,groundY-h*0.32);
        ctx.restore();
      } else if (sp.isScenery) {
        // Trees/ruins live ON wall tiles — their dist equals the wall face dist.
        // Skip depth-buffer clipping for those; softer threshold for ground scenery.
        const depth = depthBuf[Math.min(W-1,Math.max(0,screenX))];
        const onWall = sp.scenery==="tree" || sp.scenery==="ruin" || sp.scenery==="rock";
        if (!onWall && depth < sp.dist*0.92) return;
        // Try to use the GLB tree sprite for richer visuals
        if (sp.scenery==="tree" && this.quality !== "low") {
          const seed2=((Math.floor(sp.wx/this.TS)*73856093)^(Math.floor(sp.wy/this.TS)*19349663))>>>0;
          const fid = this._forestTileAsset(Math.floor(sp.wx/this.TS), Math.floor(sp.wy/this.TS), seed2);
          const furl = this._forestUrl(fid);
          const ff = furl ? (getGlbSpriteFrame(furl,"idle","front")||getCachedGlbSprite(furl,"front")) : null;
          if (ff) {
            const isBush = fid.startsWith("bush"), isRock = fid.startsWith("rock");
            // GLB sprites are baked from iso angle (~20°). In FPS at eye level, use
            // a conservative height multiplier so they don't fill the entire screen.
            // Crops the bottom 14% (ground disk artifact) from the sprite source.
            const cf = isRock ? 1.0 : isBush ? 0.92 : 0.86;
            const srcH = Math.floor(ff.height * cf);
            const glbMult = isRock ? 1.1 : isBush ? 1.3 : 1.55;
            const glbH = Math.min(H * 0.88, h * glbMult);
            const glbW = glbH * (ff.width / ff.height);
            const distAlpha = Math.max(0.45, Math.min(1, 1 - sp.dist/580));
            ctx.save();
            ctx.globalAlpha = distAlpha;
            ctx.imageSmoothingEnabled = true;
            // Anchor sprite: tree/bush bottom at horizon; rock at slight offset
            const spriteAnchorY = isRock
              ? footY - glbH*0.38
              : footY - glbH * cf; // adjust for cropped bottom
            ctx.drawImage(ff, 0, 0, ff.width, srcH,
              screenX - glbW*0.5, spriteAnchorY, glbW, glbH);
            ctx.restore();
          } else {
            if (furl) preloadGlbStripsFireAndForget(furl,["idle"],["front"]);
            // Procedural fallback — designed specifically for FPS eye-level view
            this._drawFpsScenerySprite(ctx, sp, screenX, footY, w, h);
          }
        } else {
          // footY: trees/ruins/rocks anchored at horizon (stand on ground);
          // bush also anchored at horizon; other scenery offset from sprite top.
          const sceneryFootY = (sp.scenery==="tree" || sp.scenery==="ruin" || sp.scenery==="rock" || sp.scenery==="bush")
            ? footY
            : top + h*0.92;
          this._drawFpsScenerySprite(ctx, sp, screenX, sceneryFootY, w, h);
        }
      } else if (sp.isTownBuilding) {
        // ── Billboard building in FPS view ───────────────────────────────────
        const burl = this._buildingUrl(sp.bid);
        const bframe = this._isoAssetFrame(burl, "front");
        const bH = h * (sp.bscale||1);
        const bW = bframe ? bH*(bframe.width/bframe.height) : bH*0.65;
        ctx.save();
        if (this.Q.shadows) {
          ctx.fillStyle="rgba(0,0,0,0.34)";
          ctx.beginPath(); ctx.ellipse(screenX, footY+bH*0.045, bW*0.32, bH*0.042, 0, 0, Math.PI*2); ctx.fill();
        }
        if (bframe) {
          ctx.imageSmoothingEnabled = this.quality !== "low";
          if (this.Q.glow) { ctx.shadowColor="rgba(40,28,8,0.36)"; ctx.shadowBlur=22; }
          ctx.drawImage(bframe, screenX-bW*0.5, footY-bH, bW, bH);
          ctx.shadowBlur=0;
        } else if (burl) {
          preloadGlbStripsFireAndForget(burl,["idle"],["front"]);
          ctx.fillStyle="#2a2018";
          ctx.fillRect(screenX-bW*0.5, footY-bH*0.86, bW, bH*0.86);
          ctx.strokeStyle="#7a6a52"; ctx.lineWidth=2;
          ctx.strokeRect(screenX-bW*0.5, footY-bH*0.86, bW, bH*0.86);
          // Windows
          const wc=Math.min(3,Math.floor(bW/26)); const wr=Math.min(3,Math.floor(bH*0.86/32));
          for (let wi=0;wi<wc;wi++) for (let hi2=0;hi2<wr;hi2++) {
            const wx2=screenX-bW*0.4+wi*(bW*0.8/Math.max(1,wc-1));
            const wy2=footY-bH*0.72+hi2*(bH*0.52/Math.max(1,wr-1));
            ctx.fillStyle="rgba(255,220,100,0.38)";
            ctx.fillRect(wx2-7,wy2-10,14,18);
            ctx.strokeStyle="rgba(200,160,60,0.5)"; ctx.lineWidth=1;
            ctx.strokeRect(wx2-7,wy2-10,14,18);
          }
          ctx.fillStyle="#b7aa82"; ctx.font=`bold ${Math.max(9,Math.round(bH*0.06))}px monospace`;
          ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.shadowBlur=0;
          ctx.fillText(sp.name.slice(0,10), screenX, footY-bH*0.94);
        }
        ctx.restore();
      } else {
        const x0=screenX-w/2;
        if (sp.isTownNpc || sp.isPortal || sp.isTownAsset || sp.isStatue) {
          const depth = depthBuf[Math.min(W-1,Math.max(0,screenX))];
          if (depth < sp.dist) return;
          const glow = sp.isPortal ? 24 : sp.isTownAsset ? 16 : 10;
          ctx.save();
          ctx.shadowColor=sp.color; ctx.shadowBlur=glow;
          ctx.fillStyle=sp.isPortal ? "rgba(255,68,255,0.65)" : "rgba(0,0,0,0.38)";
          ctx.beginPath(); ctx.ellipse(screenX,top+h*0.9,w*0.48,h*0.1,0,0,Math.PI*2); ctx.fill();
          if (sp.isStatue) {
            const statueImg = _crRuntimeAssetImage("statue_of_death", _crAssetTierForQuality(this.quality));
            if (_crImageReady(statueImg)) {
              const imgW = w*1.1, imgH = h*0.9;
              ctx.imageSmoothingEnabled = this.quality !== "low";
              ctx.drawImage(statueImg, screenX-imgW/2, top+h*0.12, imgW, imgH);
            } else {
              ctx.fillStyle="#32243a";
              ctx.beginPath(); ctx.roundRect(screenX-w*0.24,top+h*0.22,w*0.48,h*0.56,6); ctx.fill();
              ctx.fillStyle="#b44cff";
              ctx.beginPath(); ctx.arc(screenX,top+h*0.22,w*0.22,0,Math.PI*2); ctx.fill();
            }
          } else if (sp.isPortal) {
            const portalImg = sp.name === "DUNGEON" ? _crRuntimeAssetImage("home_portal", _crAssetTierForQuality(this.quality)) : null;
            if (_crImageReady(portalImg)) {
              const imgW = w*1.5;
              const imgH = h*0.7;
              ctx.imageSmoothingEnabled = this.quality !== "low";
              ctx.globalCompositeOperation = "screen";
              ctx.drawImage(portalImg, screenX-imgW/2, top+h*0.2, imgW, imgH);
              ctx.globalCompositeOperation = "source-over";
            } else {
              ctx.fillStyle="rgba(255,68,255,0.42)";
              ctx.beginPath(); ctx.ellipse(screenX,top+h*0.48,w*0.34,h*0.34,0,0,Math.PI*2); ctx.fill();
              ctx.fillStyle="#ffd6ff"; ctx.font=`bold ${Math.max(16,Math.round(h*0.22))}px monospace`; ctx.textAlign="center";
              ctx.fillText((sp.name||"D")[0],screenX,top+h*0.53);
            }
          } else if (sp.isTownAsset) {
            const chestImg = _crRuntimeAssetImage("treasure_chest", _crAssetTierForQuality(this.quality));
            if (_crImageReady(chestImg)) {
              const imgW = w*1.45;
              const imgH = h*0.72;
              ctx.imageSmoothingEnabled = this.quality !== "low";
              ctx.drawImage(chestImg, screenX-imgW/2, top+h*0.28, imgW, imgH);
            } else {
              ctx.fillStyle="#7a4a20";
              ctx.fillRect(screenX-w*0.35,top+h*0.45,w*0.7,h*0.28);
              ctx.fillStyle="#d6b65c";
              ctx.fillRect(screenX-w*0.39,top+h*0.38,w*0.78,h*0.12);
            }
          } else {
            ctx.shadowBlur=0;
            this._drawCharSprite(ctx,screenX,top+h*0.88,sp.spriteId||"iron_warden",p.angle+Math.PI,this._frame,Math.max(26,h*0.18),1,false,{state:"idle"});
          }
          ctx.shadowBlur=0;
          ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.fillRect(screenX-w*0.45,top+h*0.03,w*0.9,14);
          ctx.fillStyle=sp.color; ctx.font=`bold ${Math.max(8,Math.round(h*0.08))}px monospace`;
          ctx.fillText(sp.name||"",screenX,top+h*0.03+11);
          ctx.restore();
        } else if (sp.isSummon) {
          const depth = depthBuf[Math.min(W-1,Math.max(0,screenX))];
          if (depth < sp.dist) return;
          ctx.save();
          const scale=Math.max(1.2,Math.min(5.8,h/54));
          ctx.translate(screenX,top+h*0.9);
          ctx.scale(scale,scale);
          this._drawSummonSprite(ctx,0,0,{...sp,size:Math.max(18,sp.size||20)},this._frame,Math.max(18,sp.size||20),{label:false});
          ctx.restore();
          ctx.fillStyle="rgba(0,0,0,0.64)";
          ctx.fillRect(screenX-w*0.45,top-10,w*0.9,5);
          ctx.fillStyle="#84beff";
          ctx.fillRect(screenX-w*0.45,top-10,w*0.9*(sp.hp/sp.maxHp),5);
          ctx.fillStyle="#d8d2b2";
          ctx.font=`bold ${Math.max(8,Math.round(h*0.075))}px monospace`;
          ctx.textAlign="center";
          ctx.fillText(sp.name||"PET SKELETON",screenX,top-16);
        } else {
          const depth = depthBuf[Math.min(W-1,Math.max(0,screenX))];
          if (depth < sp.dist) return;
          ctx.save();
          const scale=Math.max(1.2,Math.min(5.6,h/52));
          ctx.translate(screenX,top+h*0.88);
          ctx.scale(scale,scale);
          this._drawEnemySprite(ctx,0,0,{...sp,size:Math.max(18,sp.size||24)},this._frame);
          ctx.restore();
        }
        if (sp.isBoss||sp.isChampion) {
          ctx.font=`${Math.max(10,Math.round(h*0.22))}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText(sp.icon||sp.isBoss&&this.boss.icon||"",screenX,top+h*0.35);
        }
        if (!sp.isTownNpc && !sp.isPortal && !sp.isTownAsset && !sp.isStatue && !sp.isSummon) {
          // HP bar
          ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(screenX-w/2,top-8,w,5);
          ctx.fillStyle=sp.isBoss ? "#ff8800" : "#ff3333"; ctx.fillRect(screenX-w/2,top-8,w*(sp.hp/sp.maxHp),5);
        }
      }
    } catch(_fpsSpErr) { /* skip this sprite if it errors — never crash the whole frame */ } });
    this._drawFpsCastEffect(W,H,horizon);
    this._drawFPSWeapon(W,H,horizon);
    this._drawFpsVignette(W,H,horizon);
  }

  _fpsScenerySprites(inTown, inWild) {
    const m=this._activeMap;
    if (!m || !m[0]) return [];
    const p=this.player;
    const px=Math.floor(p.wx/this.TS), py=Math.floor(p.wy/this.TS);
    const items=[];
    // Scan in a centered radius so trees appear regardless of which direction the player faces
    const scanR = 18;
    for (let ty=Math.max(1,py-scanR); ty<=Math.min(m.length-2,py+scanR); ty++) {
      for (let tx=Math.max(1,px-scanR); tx<=Math.min(m[0].length-2,px+scanR); tx++) {
        const v=m[ty][tx];
        const seed=((tx*73856093) ^ (ty*19349663) ^ ((this.actIdx+1)*83492791)) >>> 0;
        const roll=(seed%1000)/1000;
        let scenery=null, color="#78806b", size=34;
        if (inWild) {
          if (v===1) {
            if (roll<0.52) { scenery="tree";  color="#182416"; size=72; }
            else if (roll<0.72) { scenery="ruin"; color="#66706e"; size=48; }
            else { scenery="rock"; color="#5a5248"; size=40; }
          }
          else if (v===7) {
            if (roll<0.08) { scenery="grass"; color="#5f7044"; size=26; }
            else if (roll<0.12) { scenery="bush"; color="#2d4a22"; size=36; }
            else if (roll<0.145) { scenery="rock"; color="#5a5248"; size=32; }
          }
          else if (v===0 && roll<0.04) { scenery="puddle"; color="#9fb8bd"; size=28; }
        } else if (inTown) {
          if (v===1 && roll<0.46) { scenery="building"; color="#4a3322"; size=58; }
          else if (v===7 && roll<0.12) { scenery="tree"; color="#21361f"; size=56; }
          else if (v===0 && roll<0.08) { scenery="barrel"; color="#7a5132"; size=24; }
          else if (v===6 && roll<0.65) { scenery="fountain"; color="#5f85aa"; size=38; }
        } else {
          if (v===0 && roll<0.045) { scenery="rubble"; color="#5a5260"; size=28; }
          else if (v===3) { scenery="chest"; color="#8a5a24"; size=32; }
          else if (v===4) { scenery="stairs"; color="#71614c"; size=40; }
          else if (v===9 && roll<0.06) { scenery="bone"; color="#c8c0aa"; size=24; }
        }
        if (scenery) items.push({ wx:tx*this.TS+this.TS/2, wy:ty*this.TS+this.TS/2, size, color, isScenery:true, scenery, isLoot:false, isBoss:false });
      }
    }
    for (const obj of this._adminPlacedForCurrentArea()) {
      const def = this._adminPlaceableDef(obj.id);
      if (!def) continue;
      items.push({
        wx:(obj.tx+0.5)*this.TS,
        wy:(obj.ty+0.5)*this.TS,
        size:def.kind==="building" ? 96 : def.kind==="forest" ? 70 : 34,
        color:def.color || "#d6b65c",
        isScenery:true,
        isAdminPlaced:true,
        scenery:def.kind==="building" ? "building" : def.kind==="forest" ? (def.id.startsWith("rock") ? "rock" : "tree") : def.id.includes("torch") ? "torch" : def.id.includes("barrel") || def.id.includes("keg") ? "barrel" : "rubble",
        propId:def.id,
        adminKind:def.kind,
        isLoot:false,
        isBoss:false,
      });
    }
    return items;
  }

  _drawFpsScenerySprite(ctx, sp, x, footY, w, h) {
    ctx.save();
    ctx.translate(x,footY);
    ctx.globalAlpha=Math.max(0.36,Math.min(0.96,1-sp.dist/760));
    ctx.shadowColor=sp.color; ctx.shadowBlur=this.Q.detail>1 ? 12 : 4;
    const s=Math.max(0.45,Math.min(2.2,h/150));
    // Per-scenery seed for visual variety
    const seedV=((Math.floor(sp.wx/4)*73856093)^(Math.floor(sp.wy/4)*19349663))>>>0;
    const seedF=(seedV%1000)/1000;
    if (sp.scenery==="tree") {
      // Shadow blob at feet
      ctx.fillStyle="rgba(0,0,0,0.38)";
      ctx.beginPath(); ctx.ellipse(0,-h*0.02,w*0.28,h*0.05,0,0,Math.PI*2); ctx.fill();
      // Trunk — dark brown, slight lean from seed
      const lean=(seedF-0.5)*w*0.06;
      const trunkW=Math.max(4,6*s+seedF*2*s), trunkH=h*(0.50+seedF*0.12);
      const trunkGrad=ctx.createLinearGradient(-trunkW,0,trunkW,0);
      const trunkMid=seedF>0.5 ? "#5c3418" : "#4a2c12";
      trunkGrad.addColorStop(0,"#2a1608"); trunkGrad.addColorStop(0.4,trunkMid); trunkGrad.addColorStop(0.75,"#4a2c12"); trunkGrad.addColorStop(1,"#1a0d04");
      ctx.fillStyle=trunkGrad;
      ctx.beginPath(); ctx.roundRect(-trunkW+lean,-trunkH,trunkW*2,trunkH,trunkW*0.6); ctx.fill();
      // Trunk bark lines
      ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.lineWidth=Math.max(0.8,s*0.8);
      for (let k=0;k<3;k++) {
        ctx.beginPath(); ctx.moveTo(-trunkW*0.4+lean,-trunkH*0.25+k*trunkH*0.22);
        ctx.bezierCurveTo(trunkW*0.5+lean,-trunkH*0.22+k*trunkH*0.22,trunkW*0.6+lean,-trunkH*0.18+k*trunkH*0.22,trunkW*0.5+lean,-trunkH*0.12+k*trunkH*0.22); ctx.stroke();
      }
      // Canopy — 5-7 layers, color shifted by seed (some autumn, some pine-dark)
      const hue=seedF<0.25 ? "autumn" : seedF<0.55 ? "pine" : "lush";
      const palettes={
        pine: ["#162c1a","#1a3d20","#1f4f28","#226030","#286e37","#308045"],
        lush: ["#1a4a26","#1f5c2e","#266b36","#2e7a40","#3a8e4a","#48a058"],
        autumn:["#3a2810","#5c3e14","#744824","#8a5c2a","#6a4820","#7e5430"],
      };
      const pal=palettes[hue];
      const canH=h*(0.42+seedF*0.18);
      const canX=lean*0.6;
      const layers=[
        {dx:canX-w*0.14,dy:-trunkH-canH*0.4,rx:w*(0.38+seedF*0.08),ry:canH*0.38,c:pal[0]},
        {dx:canX+w*0.10,dy:-trunkH-canH*0.44,rx:w*(0.32+seedF*0.06),ry:canH*0.34,c:pal[1]},
        {dx:canX-w*0.06,dy:-trunkH-canH*0.56,rx:w*(0.30+seedF*0.05),ry:canH*0.32,c:pal[2]},
        {dx:canX+w*0.06,dy:-trunkH-canH*0.50,rx:w*(0.24+seedF*0.04),ry:canH*0.27,c:pal[3]},
        {dx:canX,       dy:-trunkH-canH*0.66,rx:w*(0.26+seedF*0.04),ry:canH*0.30,c:pal[4]},
        {dx:canX-w*0.08,dy:-trunkH-canH*0.62,rx:w*(0.19+seedF*0.03),ry:canH*0.23,c:pal[5]},
      ];
      layers.forEach(({dx,dy,rx,ry,c})=>{
        ctx.fillStyle=c;
        ctx.beginPath(); ctx.ellipse(dx,dy,rx,ry,0,0,Math.PI*2); ctx.fill();
      });
      // Highlight shimmer
      const shimmerC=hue==="autumn" ? "rgba(255,220,120,0.10)" : "rgba(140,210,155,0.13)";
      ctx.fillStyle=shimmerC;
      ctx.beginPath(); ctx.ellipse(canX-w*0.04,-trunkH-canH*0.7,w*0.16,canH*0.12,-0.2,0,Math.PI*2); ctx.fill();
    } else if (sp.scenery==="bush") {
      // Low shrub — no trunk, 3-4 clustered canopy ellipses
      ctx.fillStyle="rgba(0,0,0,0.28)";
      ctx.beginPath(); ctx.ellipse(0,-h*0.02,w*0.32,h*0.04,0,0,Math.PI*2); ctx.fill();
      const bushPal=seedF<0.5 ? ["#1e3d18","#244f20","#2d6228","#3a7832"] : ["#1a3814","#22481c","#2c5c22","#38702c"];
      [{dx:-w*0.16,dy:-h*0.22,rx:w*0.28,ry:h*0.22},{dx:w*0.18,dy:-h*0.20,rx:w*0.26,ry:h*0.20},{dx:0,dy:-h*0.30,rx:w*0.24,ry:h*0.24},{dx:w*0.04,dy:-h*0.14,rx:w*0.20,ry:h*0.15}].forEach(({dx,dy,rx,ry},i)=>{
        ctx.fillStyle=bushPal[i];
        ctx.beginPath(); ctx.ellipse(dx,dy,rx,ry,0,0,Math.PI*2); ctx.fill();
      });
    } else if (sp.scenery==="rock") {
      // Mossy boulder — faceted shape with moss accent
      ctx.fillStyle="rgba(0,0,0,0.32)";
      ctx.beginPath(); ctx.ellipse(0,-h*0.03,w*0.38,h*0.07,0,0,Math.PI*2); ctx.fill();
      const rockH=h*0.44, rockW=w*(0.52+seedF*0.18);
      const tilt=(seedF-0.5)*0.18;
      ctx.save(); ctx.rotate(tilt);
      const rg=ctx.createLinearGradient(-rockW,-rockH*0.8,rockW*0.2,-rockH*0.05);
      rg.addColorStop(0,"#3a3630"); rg.addColorStop(0.45,seedF>0.5?"#524e48":"#4a4840"); rg.addColorStop(0.8,"#2a2824"); rg.addColorStop(1,"#1e1c1a");
      ctx.fillStyle=rg;
      ctx.beginPath();
      ctx.moveTo(-rockW*0.32,-rockH); ctx.lineTo(rockW*0.28,-rockH*0.85); ctx.lineTo(rockW*0.5,-rockH*0.4); ctx.lineTo(rockW*0.36,-rockH*0.05);
      ctx.lineTo(-rockW*0.28,-rockH*0.05); ctx.lineTo(-rockW*0.5,-rockH*0.38); ctx.closePath(); ctx.fill();
      // Highlight face
      ctx.fillStyle="rgba(200,196,188,0.18)";
      ctx.beginPath(); ctx.moveTo(-rockW*0.28,-rockH*0.9); ctx.lineTo(rockW*0.18,-rockH*0.78); ctx.lineTo(rockW*0.42,-rockH*0.42); ctx.lineTo(-rockW*0.4,-rockH*0.36); ctx.closePath(); ctx.fill();
      // Moss patches on upper face
      if (seedF > 0.3) {
        ctx.globalAlpha *= 0.55;
        ctx.fillStyle="#3a5c28";
        ctx.beginPath(); ctx.ellipse(-rockW*0.1,-rockH*0.62,rockW*0.18,rockH*0.12,0.3,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(rockW*0.16,-rockH*0.55,rockW*0.12,rockH*0.09,-0.2,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha /= 0.55;
      }
      ctx.restore();
    } else if (sp.scenery==="grass") {
      ctx.strokeStyle=sp.color; ctx.lineWidth=Math.max(1,1.6*s);
      for (let i=0;i<9;i++) {
        const bx=-w*0.4+i*w*0.1;
        ctx.beginPath(); ctx.moveTo(bx,0); ctx.quadraticCurveTo(bx+w*0.04,-h*0.18,bx+w*0.08,-h*(0.22+0.07*(i%3))); ctx.stroke();
      }
    } else if (sp.scenery==="puddle") {
      ctx.globalAlpha*=0.65; ctx.fillStyle="rgba(150,180,190,0.5)";
      ctx.beginPath(); ctx.ellipse(0,-h*0.04,w*0.42,h*0.08,0,0,Math.PI*2); ctx.fill();
    } else if (sp.scenery==="building" || sp.scenery==="ruin") {
      ctx.shadowBlur=0;
      const ruinH=h*(sp.scenery==="ruin" ? 0.52+seedF*0.18 : 0.68);
      const ruinW=w*(sp.scenery==="ruin" ? 0.58+seedF*0.16 : 0.68);
      ctx.fillStyle=this._darken(sp.color,18);
      ctx.fillRect(-ruinW*0.5,-ruinH,ruinW,ruinH*0.96);
      if (sp.scenery==="ruin") {
        // Crumbling top edge — jagged using clip path
        ctx.strokeStyle="#86837c"; ctx.lineWidth=Math.max(1,1.5*s);
        ctx.strokeRect(-ruinW*0.5,-ruinH,ruinW,ruinH*0.96);
        // Dark opening (doorway or window hole)
        ctx.fillStyle="rgba(0,0,0,0.82)";
        ctx.fillRect(-ruinW*0.12,-ruinH*0.7,ruinW*0.24,ruinH*0.38);
        // Cracks
        ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(-ruinW*0.28,-ruinH*0.82); ctx.lineTo(-ruinW*0.18,-ruinH*0.55); ctx.lineTo(-ruinW*0.22,-ruinH*0.32); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ruinW*0.22,-ruinH*0.78); ctx.lineTo(ruinW*0.16,-ruinH*0.52); ctx.stroke();
        // Rubble pile at base
        ctx.fillStyle=this._lighten(sp.color,8);
        for (let ri=0;ri<4;ri++) {
          ctx.beginPath(); ctx.ellipse(-ruinW*0.3+ri*ruinW*0.22,-ruinH*0.04,ruinW*0.1,ruinH*0.06,0,0,Math.PI*2); ctx.fill();
        }
      } else {
        ctx.fillStyle=this._lighten(sp.color,16);
        ctx.fillRect(-ruinW*0.5,-ruinH,ruinW,ruinH*0.08);
      }
    } else if (sp.scenery==="barrel") {
      ctx.fillStyle="#4b2f1e"; ctx.beginPath(); ctx.ellipse(0,-h*0.24,w*0.22,h*0.28,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#b3864d"; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(0,-h*0.38,w*0.2,h*0.08,0,0,Math.PI*2); ctx.stroke();
    } else if (sp.scenery==="fountain") {
      ctx.fillStyle="#354c6a"; ctx.beginPath(); ctx.ellipse(0,-h*0.18,w*0.34,h*0.13,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(145,190,230,0.75)"; ctx.beginPath(); ctx.ellipse(0,-h*0.24,w*0.26,h*0.08,0,0,Math.PI*2); ctx.fill();
    } else if (sp.scenery==="torch") {
      ctx.fillStyle="#3a2512"; ctx.fillRect(-2*s,-h*0.5,4*s,h*0.45);
      ctx.fillStyle="#ffbc58"; ctx.shadowColor="#ff6a20"; ctx.shadowBlur=20;
      ctx.beginPath(); ctx.ellipse(0,-h*0.58,w*0.12,h*0.17,0,0,Math.PI*2); ctx.fill();
    } else if (sp.scenery==="chest") {
      const chestImg = _crRuntimeAssetImage("treasure_chest", _crAssetTierForQuality(this.quality));
      if (_crImageReady(chestImg)) {
        ctx.shadowBlur = this.Q.detail > 1 ? 22 : 8;
        ctx.imageSmoothingEnabled = this.quality !== "low";
        ctx.drawImage(chestImg, -w*0.52, -h*0.62, w*1.04, h*0.62);
      } else {
        ctx.fillStyle="#4a2e18"; ctx.fillRect(-w*0.26,-h*0.28,w*0.52,h*0.24);
        ctx.strokeStyle="#d6b65c"; ctx.strokeRect(-w*0.26,-h*0.28,w*0.52,h*0.24);
      }
    } else if (sp.scenery==="stairs" || sp.scenery==="rubble" || sp.scenery==="bone") {
      ctx.fillStyle=sp.color;
      for (let i=0;i<5;i++) ctx.fillRect(-w*0.34+i*w*0.16,-h*(0.1+i*0.05),w*0.13,h*0.04);
    }
    ctx.restore();
  }

  _drawFpsCastEffect(W,H,horizon) {
    const flash=this.fpsCastFlash||0;
    if (flash<=0) return;
    const ctx=this.ctx;
    const t=flash/30;
    const color=this.fpsCastColor || this.cls.color;
    const fire=this.fpsCastKind==="fire";
    const orbX=W*(0.52+0.04*(1-t));
    const orbY=horizon+(H-horizon)*(0.28+0.09*(1-t));
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    ctx.shadowColor=color; ctx.shadowBlur=36+38*t;
    const grad=ctx.createRadialGradient(orbX,orbY,4,orbX,orbY,42+34*t);
    grad.addColorStop(0,"#fff8cc");
    grad.addColorStop(0.28,fire ? "#ff9b35" : color);
    grad.addColorStop(1,"rgba(255,80,20,0)");
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.arc(orbX,orbY,34+26*t,0,Math.PI*2); ctx.fill();
    for (let i=0;i<28;i++) {
      const k=i/28;
      const x=orbX-(k*W*0.24)+(Math.sin(i*9.1+this._frame*0.18)*12);
      const y=orbY+k*(H-orbY)*0.62+Math.cos(i*7.7)*16;
      const r=(1-k)*(9+14*t);
      ctx.fillStyle=fire ? `rgba(255,${90+Math.floor(120*k)},22,${0.32*(1-k)*t})` : `rgba(120,210,255,${0.28*(1-k)*t})`;
      ctx.beginPath(); ctx.arc(x,y,Math.max(1,r),0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  _drawFPSWeapon(W,H,horizon) {
    const ctx=this.ctx;
    const p=this.player;
    const sk=this.cls.skills[this.rightSkill ?? this.activeSkill] || this.cls.skills[0];
    const sway=Math.sin(this.headBob||0)*(this._lastMoveMag||0);
    const cast=(this.fpsCastFlash||0)/30;
    const swing=(this.fpsMeleeFlash||0)/16;
    const gfx=this._gfxScale(), zoom=this._cameraZoomScale();
    const weaponScale=Math.max(0.82,Math.min(1.38,gfx*(0.9+zoom*0.08)));
    const baseX=W*0.64+sway*18-swing*20, baseY=H-118*weaponScale+Math.abs(sway)*8+cast*10;
    ctx.save();
    ctx.translate(baseX,baseY);
    ctx.scale(weaponScale,weaponScale);
    ctx.globalAlpha=0.96;
    ctx.shadowColor=this.cls.color; ctx.shadowBlur=18;
    ctx.fillStyle="rgba(18,12,10,0.92)";
    ctx.beginPath(); ctx.ellipse(85,67,104,38,-0.16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#2e2018"; ctx.beginPath(); ctx.roundRect(22,34,138,31,12); ctx.fill();
    ctx.fillStyle="#6d4a2e"; ctx.beginPath(); ctx.roundRect(58,-2,26,104,10); ctx.fill();
    ctx.strokeStyle="#101010"; ctx.lineWidth=13; ctx.beginPath(); ctx.moveTo(70,6); ctx.lineTo(122+swing*34,-96-swing*24); ctx.stroke();
    ctx.strokeStyle="#b8b0a4"; ctx.lineWidth=7; ctx.beginPath(); ctx.moveTo(70,6); ctx.lineTo(122+swing*34,-96-swing*24); ctx.stroke();
    ctx.strokeStyle="#242424"; ctx.lineWidth=3; ctx.stroke();
    ctx.fillStyle=sk?.color || this.cls.color;
    ctx.beginPath(); ctx.arc(124+swing*34,-102-swing*24,17+Math.sin(this._frame*0.12)*2+cast*18,0,Math.PI*2); ctx.fill();
    if (cast>0) {
      ctx.globalCompositeOperation="lighter";
      ctx.fillStyle=this.fpsCastColor||sk?.color||this.cls.color;
      ctx.beginPath(); ctx.arc(70,10,28*cast,0,Math.PI*2); ctx.fill();
      ctx.globalCompositeOperation="source-over";
    }
    ctx.restore();
    ctx.save();
    ctx.shadowBlur=0;
    ctx.globalAlpha=0.78;
    ctx.strokeStyle="#e7d7b0"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(W/2-8,horizon+10); ctx.lineTo(W/2+8,horizon+10); ctx.moveTo(W/2,horizon+2); ctx.lineTo(W/2,horizon+18); ctx.stroke();
    ctx.restore();
  }

  _drawFpsVignette(W,H,horizon) {
    const ctx=this.ctx;
    ctx.save();
    const grad=ctx.createRadialGradient(W/2,horizon,Math.min(W,H)*0.18,W/2,H/2,Math.max(W,H)*0.72);
    grad.addColorStop(0,"rgba(0,0,0,0)");
    grad.addColorStop(0.68,"rgba(0,0,0,0.08)");
    grad.addColorStop(1,"rgba(0,0,0,0.48)");
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
    if (this.player.hurtTimer>0) {
      ctx.globalAlpha=Math.min(0.32,this.player.hurtTimer/36);
      ctx.fillStyle="#8c0000"; ctx.fillRect(0,0,W,H);
    }
    ctx.restore();
  }

  _fpsTarget() {
    if (this.screen === "town") return null;
    const p=this.player;
    const choices=[...this.enemies.filter(e=>!e.isDead), ...(this.boss ? [this.boss] : [])];
    let best=null, bestScore=9999;
    for (const e of choices) {
      const dx=e.wx-p.wx, dy=e.wy-p.wy;
      const dist=Math.hypot(dx,dy);
      if (dist<12 || dist>620) continue;
      let a=Math.atan2(dy,dx)-p.angle;
      while(a>Math.PI)a-=Math.PI*2; while(a<-Math.PI)a+=Math.PI*2;
      const score=Math.abs(a)*480+dist*0.32;
      if (Math.abs(a)<0.38 && score<bestScore) { best=e; bestScore=score; }
    }
    return best;
  }

  _drawFPSTargetBar(W,H) {
    const target=this._fpsTarget();
    if (!target) return;
    const ctx=this.ctx;
    const bw=Math.max(220,Math.min(360,W*0.32)), bh=28;
    const x=W/2-bw/2, y=46;
    const pct=Math.max(0,Math.min(1,target.hp/target.maxHp));
    ctx.save();
    ctx.fillStyle="rgba(0,0,0,0.82)"; ctx.fillRect(x,y,bw,bh);
    ctx.strokeStyle="#1b1212"; ctx.lineWidth=3; ctx.strokeRect(x,y,bw,bh);
    ctx.fillStyle="#6d0710"; ctx.fillRect(x+3,y+4,(bw-6)*pct,bh-8);
    const shine=ctx.createLinearGradient(x,y,x,y+bh);
    shine.addColorStop(0,"rgba(255,255,255,0.16)");
    shine.addColorStop(0.45,"rgba(255,255,255,0)");
    shine.addColorStop(1,"rgba(0,0,0,0.28)");
    ctx.fillStyle=shine; ctx.fillRect(x+3,y+4,bw-6,bh-8);
    ctx.fillStyle="#f3e7cf"; ctx.font=`bold ${Math.max(13,Math.min(18,W/90))}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.shadowColor="#000"; ctx.shadowBlur=5;
    ctx.fillText((target.name||"FALLEN").toUpperCase(),W/2,y+bh/2+1);
    ctx.restore();
  }

  _castRay(angle, maxDist=500) {
    const p=this.player; const m=this._activeMap; const TS=this.TS;
    const safeMaxDist = Number.isFinite(maxDist) && maxDist > 0 ? maxDist : 500;
    if (!p || !Array.isArray(m) || !Array.isArray(m[0]) || !m[0].length || !Number.isFinite(TS) || TS <= 0) return {dist:safeMaxDist,hit:false};
    if (!Number.isFinite(p.wx) || !Number.isFinite(p.wy) || !Number.isFinite(angle)) return {dist:safeMaxDist,hit:false};
    const cos=Math.cos(angle), sin=Math.sin(angle);
    if (!Number.isFinite(cos) || !Number.isFinite(sin)) return {dist:safeMaxDist,hit:false};
    let dist=1;
    while (dist<safeMaxDist) {
      dist+=3;
      const wx=p.wx+cos*dist, wy=p.wy+sin*dist;
      if (!Number.isFinite(wx) || !Number.isFinite(wy)) return {dist:safeMaxDist,hit:false};
      const tx=Math.floor(wx/TS), ty=Math.floor(wy/TS);
      if (!Number.isFinite(tx) || !Number.isFinite(ty)) return {dist:safeMaxDist,hit:false};
      if (tx<0||ty<0||ty>=m.length) return {dist,hit:false};
      const row=m[ty];
      if (!Array.isArray(row) || tx>=row.length) return {dist,hit:false};
      const tile=row[tx];
      const blocked = this.screen === "town" ? (tile===1 || tile===6) : tile===1;
      if (blocked) return {dist,hit:true,tile};
    }
    return {dist:safeMaxDist,hit:false};
  }

  // ── Entity rendering ───────────────────────────────────────────────────────
  _drawEntities(W,H) {
    const ctx=this.ctx;
    const spriteScale=this._gfxScale()*Math.sqrt(this._cameraZoomScale());
    // Corpse marker (Alpha 5 corpse run): if the player's body is in this
    // area, draw a glowing skull at the death location so they can find it.
    const showCorpse = this.deathCorpse
      && this.deathCorpse.actIdx === this.actIdx
      && this.deathCorpse.areaScreen === this.screen;
    if (showCorpse) {
      const c = this.deathCorpse;
      const {sx, sy} = this._entityScreen(c.wx, c.wy, W, H);
      const pulse = 0.5 + 0.5 * Math.sin((this._frame || 0) * 0.18);
      ctx.save();
      ctx.shadowColor = "#ff4444"; ctx.shadowBlur = 18 + pulse * 10;
      ctx.fillStyle = `rgba(255,68,68,${0.55 + pulse * 0.3})`;
      ctx.beginPath(); ctx.ellipse(sx, sy + 4, 18, 7, 0, 0, Math.PI*2); ctx.fill();
      ctx.font = "bold 28px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#ff4444";
      ctx.fillText("💀", sx, sy - 6);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffd700"; ctx.font = "bold 9px monospace";
      ctx.fillText("YOUR CORPSE", sx, sy - 26);
      ctx.restore();
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    }
    const items=[
      ...this.loot,
      ...this._activeStatues().filter(s => !s.found).map(s => ({ ...s, isStatue:true })),
      ...this.enemies,
      ...(this.boss ? [this.boss] : []),
      ...this.summons,
      this.player
    ];
    // Sort by world Y for depth (works for all camera modes)
    items.sort((a,b)=>a.wy-b.wy);

    // Loot drops
    this.loot.forEach(l=>{
      const {sx,sy}=this._entityScreen(l.wx,l.wy,W,H);
      ctx.font=`${Math.max(14,Math.round(16*spriteScale))}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.globalAlpha=0.85+Math.sin(this._frame*0.08)*0.15;
      ctx.fillText(l.item.icon,sx,sy);
      ctx.globalAlpha=1;
      if (this.Q.glow) { ctx.shadowColor=l.item.rarity.color; ctx.shadowBlur=8; ctx.fillText(l.item.icon,sx,sy); ctx.shadowBlur=0; }
      const label=this._itemDisplayName(l.item);
      ctx.font=`bold ${Math.max(8,Math.round(8*spriteScale))}px monospace`;
      const tw=ctx.measureText(label).width+10;
      ctx.fillStyle="rgba(0,0,0,0.68)";
      ctx.fillRect(sx-tw/2,sy+14,tw,15);
      ctx.fillStyle=l.item.rarity?.color || "#d8d1be";
      ctx.fillText(label,sx,sy+25);
    });

    this._activeStatues().filter(s=>!s.found).forEach(s=>{
      const {sx,sy}=this._entityScreen(s.wx,s.wy,W,H);
      const statueImg=_crRuntimeAssetImage("statue_of_death", _crAssetTierForQuality(this.quality));
      const statueSize=(this.camera==="third" ? 42*Math.max(0.85,Math.min(1.35,this._entityScreen(s.wx,s.wy,W,H).scale||1)) : 36)*spriteScale;
      ctx.save();
      ctx.shadowColor=s.color; ctx.shadowBlur=this.Q.glow ? 18 : 0;
      if (_crImageReady(statueImg)) {
        ctx.imageSmoothingEnabled=this.quality!=="low";
        ctx.drawImage(statueImg,sx-statueSize*0.72,sy-statueSize*1.65,statueSize*1.44,statueSize*1.8);
      } else {
        ctx.fillStyle="#33243c"; ctx.beginPath(); ctx.roundRect(sx-statueSize*0.32,sy-statueSize*1.25,statueSize*0.64,statueSize*1.16,6); ctx.fill();
        ctx.fillStyle=s.color; ctx.beginPath(); ctx.arc(sx,sy-statueSize*1.22,statueSize*0.24,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle="rgba(0,0,0,0.68)"; ctx.fillRect(sx-54,sy-statueSize*1.78,108,14);
      ctx.fillStyle=s.color; ctx.font="bold 9px monospace"; ctx.textAlign="center";
      ctx.fillText("STATUE OF DEATH",sx,sy-statueSize*1.67);
    });

    // Enemies
    this.enemies.forEach(e=>{
      if (this.camera==="fps") return; // enemies drawn in FPS via floor/ceiling (simplified)
      const pos=this._entityScreen(e.wx,e.wy,W,H);
      const {sx,sy}=pos;
      const baseEnemySize=Math.max(24,Math.min(46,e.size || 28));
      const eSize=this.camera==="third" ? Math.max(26,baseEnemySize*Math.max(0.7,Math.min(1.5,(pos.scale||1)*1.25))*this._gfxScale()) : baseEnemySize*spriteScale;
      this._drawEnemySprite(ctx,sx,sy,{...e,size:eSize},this._frame);
      if (!e.isDead) {
        if (e.isChampion&&!e.isDead) {
        ctx.strokeStyle=e.name.startsWith("ELITE") ? "#ff2200" : "#ffaa22";
          ctx.lineWidth=2; ctx.beginPath(); ctx.arc(sx,sy,eSize+4,0,Math.PI*2); ctx.stroke();
        }
        if (e.fireAura&&this.Q.glow) { ctx.shadowColor="#ff6600"; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(sx,sy,eSize+2,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0; }
        ctx.fillStyle="#330000"; ctx.fillRect(sx-eSize,sy-eSize-8,eSize*2,5);
        ctx.fillStyle=e.isChampion ? "#ffaa00" : "#ff4444"; ctx.fillRect(sx-eSize,sy-eSize-8,eSize*2*(e.hp/e.maxHp),5);
        if (this.Q.detail>1) {
          ctx.fillStyle=e.isChampion ? "#ffaa22" : "#aabbcc"; ctx.font=`${e.isChampion ? 9 : 8}px monospace`; ctx.textAlign="center";
          ctx.fillText(e.name,sx,sy-eSize-12);
          if (e.mods&&e.mods.length>0) { ctx.fillStyle="#ff8800"; ctx.font="7px monospace"; ctx.fillText(e.mods.slice(0,2).join("·"),sx,sy-eSize-22); }
        }
      }
    });

    // Boss — now routes through _drawCharSprite when a Meshy GLB is mapped
    // (the assetId is set on spawn at _spawnBoss; valid values include
    // act6_final_boss, diabl0_archfiend, abyssal_harbinger, crimson_infernal_behemoth,
    // crimson_emberwyrm, infernal_behemoth, treasure_maw — all defined in
    // crypticMeshyAssets.js). Falls back to the circle + icon if the Meshy
    // strip isn't baked yet, or if no mapping exists.
    if (this.boss) {
      const b=this.boss;
      const {sx,sy}=this._entityScreen(b.wx,b.wy,W,H);
      if (this.Q.glow) { ctx.shadowColor=b.color; ctx.shadowBlur=30; }
      const bossSize=Math.max(44,b.size*spriteScale);
      const bossSpriteId = b.assetId || b.spriteId || b.type;
      const meshyHit = bossSpriteId && typeof crMeshyActor === "function" ? crMeshyActor(bossSpriteId) : null;
      let rendered = false;
      if (meshyHit) {
        try {
          this._drawCharSprite(ctx, sx, sy, bossSpriteId, b.angle || 0, this._frame, bossSize * 1.4, 1, false, { state: "idle" });
          rendered = true;
        } catch (_) { /* fall through to circle */ }
      }
      if (!rendered) {
        // Original circle-glyph fallback (kept verbatim so bosses without a
        // Meshy mapping still look the way they did before).
        ctx.fillStyle=b.color; ctx.beginPath(); ctx.arc(sx,sy,bossSize,0,Math.PI*2); ctx.fill();
        ctx.font="22px serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(b.icon,sx,sy);
      }
      ctx.shadowBlur=0;
      // Boss HP bar (top of screen)
      ctx.fillStyle="#330000"; ctx.fillRect(W/2-150,12,300,14); ctx.fillStyle=b.color; ctx.fillRect(W/2-150,12,300*(b.hp/b.maxHp),14);
      // Phase markers
      ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.fillRect(W/2-150+300*0.5,12,1,14); ctx.fillRect(W/2-150+300*(b.phase3hp||0.25),12,1,14);
      ctx.fillStyle="#fff"; ctx.font="bold 10px monospace"; ctx.textAlign="center";
      ctx.fillText(`${b.name}  [PHASE ${b.phase}]`,W/2,20); ctx.textAlign="left";
    }

    // Summons
    this.summons.forEach(s=>{
      const pos=this._entityScreen(s.wx,s.wy,W,H);
      const {sx,sy}=pos;
      const summonBase=Math.max(24,Math.min(38,s.size || 24));
      const summonSize=this.camera==="third" ? Math.max(26,summonBase*Math.max(0.75,Math.min(1.45,(pos.scale||1)*1.25))*this._gfxScale()) : summonBase*spriteScale;
      this._drawSummonSprite(ctx,sx,sy,s,this._frame,summonSize);
      return;
      ctx.fillStyle="#8888cc"; ctx.beginPath(); ctx.arc(sx,sy,s.size*spriteScale,0,Math.PI*2); ctx.fill();
      ctx.font="12px serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("💀",sx,sy);
    });

    // Mercenary
    if (this.merc && !this.merc.dead && this.camera!=="fps") {
      const {sx,sy}=this._entityScreen(this.merc.wx,this.merc.wy,W,H);
      this._drawCharSprite(ctx,sx,sy,"iron_warden",0,this._frame,36*spriteScale,1,false);
      ctx.fillStyle="#330033"; ctx.fillRect(sx-16,sy-28,32,5);
      ctx.fillStyle=this.merc.color; ctx.fillRect(sx-16,sy-28,32*(this.merc.hp/this.merc.maxHp),5);
      ctx.fillStyle="#88aaff"; ctx.font="7px monospace"; ctx.textAlign="center"; ctx.fillText(this.merc.name,sx,sy-31);
    }

    // Online party ghosts from the D2GS-style room bridge.
    if (this.online?.peers && this.camera!=="fps") {
      Object.values(this.online.peers).forEach(peer => {
        if (!peer || peer.screen !== this.screen || peer.actIdx !== this.actIdx || Date.now() - (peer.seenAt || 0) > 5000) return;
        const {sx,sy}=this._entityScreen(peer.wx, peer.wy, W, H);
        const clsId=peer.className || "iron_warden";
        this._drawCharSprite(ctx,sx,sy,clsId,peer.angle || 0,this._frame,34*spriteScale,0.72,false,{state:"walk"});
        ctx.fillStyle="rgba(0,0,0,0.62)"; ctx.fillRect(sx-28,sy-42,56,13);
        ctx.fillStyle="#44ff88"; ctx.font="bold 8px monospace"; ctx.textAlign="center";
        ctx.fillText((peer.name || "ALLY").slice(0,10),sx,sy-32);
      });
    }

    // Player
    const p=this.player;
    if (this.camera!=="fps") {
      const pos=this._entityScreen(p.wx,p.wy,W,H);
      const {sx,sy}=pos;
      if (p.shielded>0) {
        if (this.Q.glow){ctx.shadowColor="#ffff88";ctx.shadowBlur=20;}
        ctx.strokeStyle="#ffff88"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(sx,sy,(p.bearForm ? 32 : 24)*spriteScale,0,Math.PI*2); ctx.stroke();
        ctx.shadowBlur=0;
      }
      if (this.Q.glow){ctx.shadowColor=this.cls.color;ctx.shadowBlur=18;}
      const playerSize = this.camera === "third"
        ? Math.max(42,(p.bearForm ? 72 : 46)*Math.max(0.8,Math.min(1.35,pos.scale||1))*this._gfxScale())
        : (p.bearForm ? 58 : 42)*spriteScale;
      this._drawCharSprite(ctx,sx,sy,this.cls.id,p.angle,this._frame,playerSize,p.stealthed>0 ? 0.45 : 1,p.bearForm,{state:this._playerAnimState()});
      ctx.shadowBlur=0;
    }

    // Traps
    this.traps.forEach(t=>{
      const {sx,sy}=this._entityScreen(t.wx,t.wy,W,H);
      ctx.fillStyle=t.armed ? "#ff44aa" : "#884466"; ctx.beginPath(); ctx.arc(sx,sy,8*spriteScale,0,Math.PI*2); ctx.fill();
      ctx.font="10px serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("⚙",sx,sy);
    });

    // Projectiles
    this.projectiles.forEach(pr=>{
      const {sx,sy}=this._entityScreen(pr.wx,pr.wy,W,H);
      if (this.Q.glow) { ctx.shadowColor=pr.color; ctx.shadowBlur=8; }
      ctx.fillStyle=pr.color; ctx.beginPath(); ctx.arc(sx,sy,pr.size*spriteScale,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    });
  }

  _entityScreen(wx,wy,W,H) {
    if (this.camera==="iso") {
      return this._worldToIso(wx,wy);
    } else if (this.camera==="third") {
      const proj=this._worldToThird(wx,wy,W||this.canvas.width,H||this.canvas.height,0);
      return proj || { sx:-9999, sy:-9999, scale:0, depth:99999 };
    } else {
      return this._topToScreen(wx, wy, W||this.canvas.width, H||this.canvas.height);
    }
  }

  _drawParticles() {
    const ctx=this.ctx;
    this.particles.forEach(p=>{
      const {sx,sy}=this._entityScreen(p.wx,p.wy,0,0);
      ctx.globalAlpha=p.life/40;
      ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(sx,sy,p.size,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1;
  }

  _drawFloatingText() {
    const ctx=this.ctx;
    this.floatingText.forEach(f=>{
      // Skip text still in its stagger delay window
      if (f.stagger > 0) return;
      const {sx,sy}=this._entityScreen(f.wx,f.wy,0,0);
      const t=Math.max(0,Math.min(1,f.life/f.maxLife));
      // Ease-out fade: text stays fully visible for the first 60% of life,
      // then fades quickly — prevents numbers from looking uniformly ghostly.
      const fadeAlpha = t > 0.4 ? 1.0 : (t / 0.4);
      ctx.globalAlpha = fadeAlpha;
      // Pop-in scale: text starts slightly larger and shrinks to normal size
      const popT = Math.min(1, (f.maxLife - f.life) / 6);
      const scale = 1.0 + (1 - popT) * 0.3;
      const fontSize = Math.round(13 * scale);
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign="center";
      ctx.lineWidth=3;
      ctx.strokeStyle="rgba(0,0,0,0.82)";
      ctx.strokeText(f.text,sx,sy);
      ctx.fillStyle=f.color;
      ctx.fillText(f.text,sx,sy);
    });
    ctx.globalAlpha=1; ctx.textAlign="left"; ctx.lineWidth=1;
  }

  // ── HUD ───────────────────────────────────────────────────────────────────
  _drawHUD(W,H) {
    const ctx=this.ctx; const p=this.player;
    const isFps=this.camera==="fps";
    const prof=this._layoutProfile(W,H);
    const compact=prof.compact;
    const hudH=Math.max(112,Math.min(154,Math.floor(H*0.15)));
    const hudY=H-hudH;
    const orbR=Math.max(52,Math.min(74,Math.floor(hudH*0.49)));
    const orbY=H-orbR-10;
    const leftOrbX=Math.max(orbR+18,W*0.29);
    const rightOrbX=Math.min(W-orbR-18,W*0.71);
    const rail=ctx.createLinearGradient(0,hudY,0,H);
    rail.addColorStop(0,"rgba(0,0,0,0.28)");
    rail.addColorStop(0.25,"rgba(12,12,12,0.92)");
    rail.addColorStop(1,"rgba(0,0,0,0.98)");
    ctx.fillStyle=rail; ctx.fillRect(0,hudY,W,hudH);
    ctx.strokeStyle="#6a6257"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,hudY+2); ctx.lineTo(W,hudY+2); ctx.stroke();
    {
      ctx.strokeStyle="#1a1713"; ctx.lineWidth=6;
      ctx.beginPath(); ctx.moveTo(W*0.23,hudY+hudH*0.42); ctx.lineTo(W*0.77,hudY+hudH*0.42); ctx.stroke();
      ctx.strokeStyle="#8a8172"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(W*0.24,hudY+hudH*0.39); ctx.lineTo(W*0.76,hudY+hudH*0.39); ctx.stroke();
    }
    this._drawOrb(leftOrbX,orbY,orbR,p.hp/p.maxHp,this.uiTheme.red,"#3b0b0b",`${p.hp}/${p.maxHp}`,"#160408");
    this._drawOrb(rightOrbX,orbY,orbR,p.mp/p.maxMp,"#2255ee","#0d1d52",`${p.mp}/${p.maxMp}`,"#020c28");

    // 10-slot D2-style action bar — strictly constrained to stay BETWEEN the two orbs
    const slotGap = 4;
    const innerL = leftOrbX + orbR + 8;   // just right of left orb
    const innerR = rightOrbX - orbR - 8;  // just left of right orb
    const availW = Math.max(60, innerR - innerL);
    const slotW = Math.max(24, Math.min(46, Math.floor((availW - slotGap * 9) / 10)));
    const totalW = slotW * 10 + slotGap * 9;
    // Center between the orbs but clamp so it never bleeds into the orbs
    const skXIdeal = Math.round((innerL + innerR) / 2 - totalW / 2);
    const skX = Math.max(innerL, Math.min(innerR - totalW, skXIdeal));
    // Place bar near the top of the HUD strip, above the orb vertical center
    const slotY = Math.max(hudY + 6, orbY - orbR + 4);
    const keyLabels = ["1","2","3","4","5","6","7","8","9","0"];
    for (let i=0; i<10; i++) {
      const x = skX + i*(slotW+slotGap), y = slotY;
      const skIdx = this.skillBar[i];
      const sk = (skIdx != null) ? this.cls.skills[skIdx] : null;
      const cd = sk ? this.skillCooldowns[skIdx] : 0;
      const onCd = cd > 0;
      ctx.fillStyle = sk ? (onCd ? "#221133" : "rgba(0,0,0,0.85)") : "rgba(0,0,0,0.55)";
      ctx.strokeStyle = sk ? sk.color : "#223344"; ctx.lineWidth = sk ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(x,y,slotW,slotW,3); ctx.fill(); ctx.stroke();
      // Skill icon (atlas first, emoji fallback)
      if (sk) {
        const iconImg = getCrSkillIcon(this.cls.id, this.quality, this._skillIconName(skIdx));
        if (iconImg) {
          ctx.save(); ctx.imageSmoothingEnabled = (this.quality !== "low");
          ctx.drawImage(iconImg, x+5, y+3, slotW-10, slotW-22);
          ctx.restore();
        } else {
          ctx.font = "22px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText(sk.icon, x+slotW/2, y+19);
        }
        ctx.font="bold 7px monospace"; ctx.textAlign="center"; ctx.textBaseline="alphabetic";
        ctx.fillStyle = sk.color; ctx.fillText(sk.name.slice(0,8), x+slotW/2, y+slotW-9);
        ctx.fillStyle="#334455"; ctx.font="7px monospace"; ctx.fillText(`${sk.mp}MP`, x+slotW/2, y+slotW-2);
      }
      // Key label (top-left)
      ctx.fillStyle = sk ? "#ffdd00" : "#445566";
      ctx.font="bold 9px monospace"; ctx.textAlign="left"; ctx.textBaseline="alphabetic";
      ctx.fillText(keyLabels[i], x+3, y+11);
      if (onCd) {
        ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(x,y,slotW,slotW,3); ctx.fill();
        ctx.fillStyle="#aaa"; ctx.font="bold 14px monospace"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(Math.ceil(cd/60)+"s", x+slotW/2, y+slotW/2);
      }
    }
    ctx.textBaseline="alphabetic"; ctx.textAlign="left";

    // Belt potions
    if (false) {
    ctx.fillStyle="#003300"; ctx.fillRect(W/2+100,H-60,44,44);
    ctx.strokeStyle="#44cc44"; ctx.lineWidth=1; ctx.strokeRect(W/2+100,H-60,44,44);
    ctx.font="18px serif"; ctx.textAlign="center"; ctx.fillText("🧪",W/2+122,H-36);
    ctx.fillStyle="#fff"; ctx.font="9px monospace"; ctx.fillText(`×${p.beltHp} H`,W/2+122,H-22);
    ctx.fillStyle="#000033"; ctx.fillRect(W/2+150,H-60,44,44);
    ctx.strokeStyle="#4488ff"; ctx.lineWidth=1; ctx.strokeRect(W/2+150,H-60,44,44);
    ctx.font="18px serif"; ctx.fillText("💧",W/2+172,H-36);
    ctx.fillStyle="#fff"; ctx.font="9px monospace"; ctx.fillText(`×${p.beltMp} M`,W/2+172,H-22);

    }
    // Belt row: 4 potion slots in a second row below the skill bar, centered between the orbs
    const potGap = 5;
    const potSize = Math.max(22, Math.min(34, Math.floor((availW - potGap * 3) / 4) - 4));
    const beltTotalW = potSize * 4 + potGap * 3;
    const potX = Math.max(innerL, Math.round((innerL + innerR) / 2 - beltTotalW / 2));
    const potY = slotY + slotW + 6;
    const beltSlots = [
      [potX,                          "#143414","#44cc44","HP", p.beltHp ?? 0],
      [potX+(potSize+potGap)*1,       "#101a44","#4488ff","MP", p.beltMp ?? 0],
      [potX+(potSize+potGap)*2,       "#3a163a","#aa66ff","TP", p.beltTp ?? 0],
      [potX+(potSize+potGap)*3,       "#3a3514","#ffd24a","ID", p.beltId ?? 0],
    ];
    beltSlots.forEach(([x,bg,border,label,count])=>{
      ctx.fillStyle=bg; ctx.fillRect(x,potY,potSize,potSize);
      ctx.strokeStyle=border; ctx.lineWidth=1; ctx.strokeRect(x,potY,potSize,potSize);
      ctx.fillStyle = count > 0 ? "#fff" : "#556677";
      ctx.font=`bold ${Math.max(8,Math.floor(potSize*0.3))}px monospace`; ctx.textAlign="center";
      ctx.fillText(label,x+potSize/2,potY+potSize*0.45);
      ctx.font="8px monospace"; ctx.fillText(`x${count}`,x+potSize/2,potY+potSize-5);
    });

    // XP bar
    ctx.fillStyle="#0a0a0a"; ctx.fillRect(0,H-8,W,8);
    ctx.fillStyle=this.cls.color; ctx.fillRect(0,H-8,W*(p.xp/p.xpNext),8);

    // Top bar
    if (true) {
      this._drawFPSTargetBar(W,H);
      ctx.fillStyle="rgba(0,0,0,0.48)"; ctx.fillRect(12,12,Math.min(310,W*0.36),26);
      ctx.fillStyle=this.cls.color; ctx.font="bold 12px monospace"; ctx.textAlign="left";
      ctx.fillText(`${this._displayClassName(this.cls.id)}  Lv.${p.level}`,24,30);
      ctx.fillStyle="#b9b2a4"; ctx.font="10px monospace"; ctx.textAlign="center";
      const place=this.screen==="town" ? this._displayTownName(this.actIdx) : this.screen==="wilderness" ? "WILDERNESS" : this._displayActName(this.actIdx);
      ctx.fillText(`${place} - ${this.difficulty.toUpperCase()} - TAB map`,W/2,28);
      const stage=this._secretStage?.();
      if (stage) {
        ctx.fillStyle=stage.era==="d2" ? "#ffdd66" : "#ff8844";
        ctx.font="bold 9px monospace";
        ctx.fillText(this._displaySecretStageLine(stage), W/2, 43);
      }
      ctx.textAlign="left";
    } else if (false) {
    ctx.fillStyle="rgba(0,0,0,0.65)"; ctx.fillRect(0,0,W,30);
    ctx.fillStyle="#fff"; ctx.font="bold 13px monospace"; ctx.textAlign="left";
    ctx.fillText(`${this.cls.icon} ${this.cls.name}  Lv.${p.level}`,8,19);
    ctx.fillStyle="#ffdd00"; ctx.textAlign="right";
    ctx.fillText(`💰${p.gold}  SCORE:${this.score}`,W-8,19);
    ctx.fillStyle="#888"; ctx.textAlign="center";
    const qDone=this.quests.filter(q=>q.complete).length;
    const sp = (p.skillPoints||0);
    ctx.fillText(`${this.act.icon} ${this.act.name}  [TAB:cam]  [I:bag]  [T:skills${sp>0 ? ` ⭐${sp}` : ""}]  [Q:quests(${qDone}/${this.quests.length})]  [E:interact]`,W/2,19);
    ctx.textAlign="left";

    }

    if (compact) {
      const topH = 34;
      ctx.fillStyle="rgba(0,0,0,0.82)"; ctx.fillRect(0,0,W,topH);
      ctx.fillStyle=this.cls.color; ctx.font="bold 10px monospace"; ctx.textAlign="left";
      ctx.fillText(`${this._displayClassName(this.cls.id).slice(0,14)} Lv.${p.level}`,8,16);
      ctx.fillStyle="#ffdd00"; ctx.textAlign="right"; ctx.fillText(`$${p.gold}`,W-8,16);
      ctx.fillStyle="#a9b2bd"; ctx.font="9px monospace"; ctx.textAlign="center";
      const place=this.screen==="town" ? this._displayTownName(this.actIdx) : this.screen==="wilderness" ? "WILDERNESS" : this._displayActName(this.actIdx);
      ctx.fillText(`${place.slice(0,18)}  ${this.difficulty.toUpperCase()}`,W/2,29);
      const stage=this._secretStage?.();
      if (stage) {
        ctx.fillStyle=stage.era==="d2" ? "#ffdd66" : "#ff8844";
        ctx.font="bold 8px monospace";
        ctx.fillText(this._displaySecretStageLine(stage).slice(0,22), W/2, 40);
      }
      ctx.textAlign="left";
    }

    const camHint = `${this.camera.toUpperCase()}  Z${Math.round(this.cameraZoom*100)}  A${Math.round((this.cameraYaw||0)*180/Math.PI)}  P${Math.round((this.cameraPitch||0)*100)}${this.cameraLocked ? "  LOCK" : ""}`;
    const hintW = Math.min(compact ? 230 : 376, W-16);
    const hintY = H-hudH-24;
    const hintText = compact ? `${camHint}  L lock` : `${camHint}  [ ] zoom  , . yaw  PgUp/PgDn pitch  L lock`;
    ctx.fillStyle="rgba(0,0,0,0.46)";
    ctx.fillRect(Math.max(8,W/2-hintW/2), hintY, hintW, 18);
    ctx.fillStyle="#9fb4c8"; ctx.font=`bold ${compact?8:9}px monospace`; ctx.textAlign="center";
    ctx.fillText(hintText, W/2, hintY+13);
    ctx.textAlign="left";

    // Quality HUD button (top-right, below minimap)
    const QL={low:"16-BIT",medium:"32-BIT",high:"64-BIT",ultra:"128-BIT"};
    const QC={low:"#88aa88",medium:"#44aaff",high:"#ff8800",ultra:"#cc44ff"};
    const qLabel=QL[this.quality]||"🎮"; const qColor=QC[this.quality]||"#fff";
    const profTop=this._layoutProfile(W,H).safeTop;
    const qW=compact ? 58 : 80, qH=18, qX=W-qW-4, qY=Math.max(compact ? 46 : 52, profTop + 8);
    ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.roundRect(qX,qY,qW,qH,4); ctx.fill();
    ctx.strokeStyle=qColor; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle=qColor; ctx.font=`bold ${compact?8:9}px monospace`; ctx.textAlign="center"; ctx.fillText(compact ? qLabel.replace("-BIT","") : qLabel,qX+qW/2,qY+13);

    // Mini-map / overlay map
    if ((this.mapMode || "small") !== "off") this._drawMapView(W,H);
    if (this._isMobileLayout(W,H)) this._drawMobileControls(W,H);
    // Active quest tracker (desktop only — top right, below minimap)
    if (!this.questLog) this._drawActiveQuestTracker(W,H);

    // Live gamma/contrast indicator — visible confirmation that Video/GFX
    // settings are actually changing the rendered output (QA feedback 2026-05-05).
    const g = this._resolvedGamma ?? 1;
    const c = this._resolvedContrast ?? 1;
    if (Math.abs(g - 1) > 0.02 || Math.abs(c - 1) > 0.02) {
      const profTop = this._layoutProfile(W,H).safeTop;
      const indY = Math.max(profTop + 8, 8);
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath(); ctx.roundRect(8, indY, compact ? 108 : 140, 18, 4); ctx.fill();
      ctx.font = `bold ${compact ? 8 : 9}px monospace`;
      ctx.textAlign = "left";
      ctx.fillStyle = "#88ccff";
      ctx.fillText(`G:${g.toFixed(2)}`, 14, indY + 13);
      ctx.fillStyle = "#d6b65c";
      ctx.fillText(`C:${c.toFixed(2)}`, compact ? 64 : 80, indY + 13);
      ctx.restore();
    }
  }

  _drawMobileControls(W,H) {
    const ctx=this.ctx, p=this.player;
    const prof=this._layoutProfile(W,H);
    const active = this.touch && Math.hypot(this.touch.stickX || 0, this.touch.stickY || 0) > 0.12;
    const joyR = Math.max(40, Math.min(prof.tv ? 86 : 76, Math.min(W,H)*(prof.portrait ? 0.072 : 0.08)));
    const idleBaseX = Math.max(joyR + prof.edge, W*(prof.portrait ? 0.18 : 0.12));
    const idleBaseY = H - prof.safeBottom - joyR - (prof.portrait ? 12 : 16);
    const baseX = active ? this.touch.stickBaseX : idleBaseX;
    const baseY = active ? this.touch.stickBaseY : idleBaseY;
    const knobX = active ? this.touch.stickKnobX : baseX;
    const knobY = active ? this.touch.stickKnobY : baseY;

    ctx.save();
    ctx.globalAlpha = 0.94;
    if (this.camera !== "fps" && this.screen !== "town") {
      const q = this.quests?.find(v => !v.complete) || this.quests?.[0];
      const portraitRoom = W - (prof.edge * 3 + 128);
      const panelW = Math.min(prof.portrait ? portraitRoom : 260, Math.max(150, W*(prof.portrait ? 0.46 : 0.30)));
      const panelH = prof.portrait ? 62 : 74;
      const px = prof.edge, py = prof.safeTop + (prof.portrait ? 12 : 6);
      ctx.fillStyle = "rgba(20,8,3,0.72)";
      ctx.beginPath(); ctx.roundRect(px,py,panelW,panelH,6); ctx.fill();
      ctx.strokeStyle = "#8a4a20"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#f0b06a"; ctx.font = `bold ${prof.portrait?9:11}px monospace`; ctx.textAlign = "left";
      ctx.fillText(q ? q.name.slice(0,prof.portrait?24:28) : "Cryptic Realm", px+14, py+21);
      ctx.fillStyle = "#d9c9ac"; ctx.font = `${prof.portrait?8:9}px monospace`;
      const progress = q ? `${q.done || 0}/${q.needed || 1}` : `${this.screen.toUpperCase()}`;
      ctx.fillText(q ? `Progress ${progress}` : "Explore and survive", px+14, py+40);
      ctx.fillStyle = "#060606"; ctx.fillRect(px+14, py+52, panelW-28, 7);
      ctx.fillStyle = this.cls.color;
      const pct = q ? Math.min(1,(q.done||0)/(q.needed||1)) : 0.35;
      ctx.fillRect(px+14, py+52, (panelW-28)*pct, 7);
    }

    ctx.globalAlpha = active ? 0.46 : 0.24;
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(baseX,baseY,joyR,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(210,190,150,0.55)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = active ? 0.82 : 0.42;
    ctx.fillStyle = "rgba(210,190,150,0.22)";
    ctx.beginPath(); ctx.arc(knobX,knobY,joyR*0.42,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(255,236,190,0.85)"; ctx.stroke();

    ctx.globalAlpha = 0.96;
    for (const b of this._mobileButtons(W,H)) {
      if (b.id === "interact" && this.screen !== "town") continue;
      const g = ctx.createRadialGradient(b.x-b.r*0.25,b.y-b.r*0.32,b.r*0.1,b.x,b.y,b.r);
      g.addColorStop(0,"rgba(255,255,255,0.22)");
      g.addColorStop(0.35,b.fill);
      g.addColorStop(1,"rgba(0,0,0,0.92)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = b.color; ctx.lineWidth = b.id === "attack" ? 3 : 2; ctx.stroke();
      ctx.fillStyle = b.color;
      ctx.font = `bold ${Math.max(9,Math.min(15,b.r*0.34))}px monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      let label = b.label;
      if (b.id === "skill0") label = this.cls.skills[this.skillBar[0]]?.icon || "1";
      if (b.id === "skill1") label = this.cls.skills[this.skillBar[1]]?.icon || "2";
      if (b.id === "skill2") label = this.cls.skills[this.skillBar[2]]?.icon || "3";
      ctx.fillText(String(label), b.x, b.y);
    }
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;

    if (this.camera === "fps") {
      const hint = prof.portrait ? "Move  |  Look  |  ATK" : "Left thumb move  |  Right drag look  |  ATK hold fire";
      const hintW = Math.min(prof.portrait ? 190 : 300, W-24);
      const hintY = prof.safeTop + (prof.portrait ? 72 : 30);
      ctx.fillStyle = "rgba(0,0,0,0.42)";
      ctx.fillRect(W/2-hintW/2, hintY, hintW, 22);
      ctx.fillStyle = "#d8d1be"; ctx.font = `bold ${prof.portrait?8:9}px monospace`; ctx.textAlign = "center";
      ctx.fillText(hint, W/2, hintY+14);
      ctx.textAlign = "left";
    }
    ctx.restore();
  }

  _drawMapView(W,H) {
    if (this.mapMode === "overlay") { this._drawLargeMapOverlay(W,H,false); return; }
    if (this.mapMode === "full") { this._drawLargeMapOverlay(W,H,true); return; }
    this._drawMinimap(W,H);
  }

  _mapTileSeen(tx, ty, key=this._activeAreaKey()) {
    for (let yy=ty; yy<ty+2; yy++) for (let xx=tx; xx<tx+2; xx++) {
      if (this._isDiscovered(xx, yy, key)) return true;
    }
    return false;
  }

  _drawMapTiles(ctx, x, y, w, h, alpha=1, labels=false) {
    const m=this._activeMap;
    const key=this._activeAreaKey();
    const stepX=w/m[0].length, stepY=h/m.length;
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.fillStyle="rgba(0,0,0,0.44)";
    ctx.fillRect(x,y,w,h);
    for (let ty=0;ty<m.length;ty+=2) for (let tx=0;tx<m[0].length;tx+=2) {
      if (!this._mapTileSeen(tx,ty,key)) continue;
      const v=m[ty][tx];
      ctx.fillStyle=v===1 ? (this.screen==="wilderness" ? "#1a2b18" : this.act.wallC) :
        v===4 ? "#d49a63" : v===5 ? "#ff44ff" : v===8 ? "#55cc77" : v===9 ? "#ff2200" :
        (this.screen==="wilderness" ? "#21412a" : this.act.floorC);
      ctx.fillRect(x+tx*stepX,y+ty*stepY,Math.max(1,stepX*2),Math.max(1,stepY*2));
    }
    const p=this.player;
    ctx.fillStyle=this.cls.color;
    ctx.beginPath(); ctx.arc(x+(p.wx/this.TS)*stepX,y+(p.wy/this.TS)*stepY,labels?6:3,0,Math.PI*2); ctx.fill();
    if (this.boss && this._isDiscovered(Math.floor(this.boss.wx/this.TS), Math.floor(this.boss.wy/this.TS), key)) {
      ctx.fillStyle=this.boss.color;
      ctx.beginPath(); ctx.arc(x+(this.boss.wx/this.TS)*stepX,y+(this.boss.wy/this.TS)*stepY,labels?5:3,0,Math.PI*2); ctx.fill();
    }
    if (labels) {
      const drawLabel = (wx, wy, text, color) => {
        const tx=Math.floor(wx/this.TS), ty=Math.floor(wy/this.TS);
        if (!this._isDiscovered(tx,ty,key)) return;
        const sx=x+(wx/this.TS)*stepX, sy=y+(wy/this.TS)*stepY;
        ctx.fillStyle=color; ctx.font="bold 9px monospace"; ctx.textAlign="center";
        ctx.fillText(text,sx,sy-8);
      };
      if (this.screen === "town") {
        drawLabel(this.town.portalWx,this.town.portalWy,"DUNGEON","#ff88ff");
        drawLabel(this.town.exitWx,this.town.exitWy,"WILD","#88ff99");
      } else if (this.screen === "wilderness") {
        drawLabel(this.wilderness.caveWx,this.wilderness.caveWy,"CAVE","#d49a63");
      }
      this._activeStatues().filter(s=>!s.found).forEach(s=>drawLabel(s.wx,s.wy,"STATUE",s.color));
    }
    ctx.restore();
  }

  _drawLargeMapOverlay(W,H,full=false) {
    const ctx=this.ctx;
    const prof=this._layoutProfile(W,H);
    const maxW=full ? W-prof.edge*2 : Math.min(W*0.78, 920);
    const maxH=full ? H-prof.safeTop-prof.safeBottom-28 : Math.min(H*0.68, 620);
    const m=this._activeMap;
    const aspect=m[0].length/m.length;
    let mw=maxW, mh=mw/aspect;
    if (mh>maxH) { mh=maxH; mw=mh*aspect; }
    const x=W/2-mw/2, y=full ? prof.safeTop+16 : H/2-mh/2;
    ctx.save();
    ctx.globalAlpha=full ? 0.92 : 0.68;
    ctx.fillStyle=full ? "rgba(0,0,0,0.88)" : "rgba(0,0,0,0.10)";
    if (full) ctx.fillRect(0,0,W,H);
    this._drawStonePanel(x-14,y-34,mw+28,mh+54,full ? "AREA MAP" : "OVERLAY MAP",this.cls.color);
    this._drawMapTiles(ctx,x,y,mw,mh,full ? 0.98 : 0.72,full);
    ctx.fillStyle="#d8d1be"; ctx.font="bold 10px monospace"; ctx.textAlign="center";
    ctx.fillText("TAB cycles map styles - explored tiles only",x+mw/2,y+mh+20);
    ctx.restore();
  }

  _drawMinimap(W,H) {
    const ctx=this.ctx, m=this._activeMap, mm=this.minimap || {};
    const prof=this._layoutProfile(W,H);
    const defaultW=prof.mobile ? (prof.portrait ? 112 : 132) : prof.tv ? 190 : 160;
    const defaultH=prof.mobile ? (prof.portrait ? 92 : 104) : prof.tv ? 148 : 126;
    const mw=Math.min(mm.w||defaultW, prof.mobile ? Math.max(104,W*0.34) : 220);
    const mh=Math.min(mm.h||defaultH, prof.mobile ? Math.max(86,H*0.24) : 170);
    const fallbackY=prof.mobile ? (prof.portrait ? prof.safeTop + 8 : prof.safeTop + 38) : 44;
    const MX=this._clamp(mm.x == null ? W-mw-prof.edge : mm.x, 6, Math.max(6,W-mw-6));
    const MY=this._clamp(mm.y == null ? fallbackY : mm.y, prof.safeTop, Math.max(prof.safeTop,H-prof.safeBottom-mh-8));
    this.minimap.x=MX; this.minimap.y=MY; this.minimap.w=mw; this.minimap.h=mh;
    ctx.save(); ctx.globalAlpha=mm.alpha || 0.78;
    this._drawStonePanel(MX,MY,mw,mh,"MAP",this.cls.color);
    ctx.fillStyle="rgba(0,0,0,0.45)"; ctx.fillRect(MX+8,MY+28,mw-16,mh-36);
    ctx.fillStyle=mm.locked ? "#d6b65c" : "#88aacc"; ctx.font="bold 8px monospace"; ctx.textAlign="right";
    ctx.fillText(mm.locked ? "LOCK" : "DRAG", MX+mw-10, MY+17);
    const gx=MX+12, gy=MY+32, gw=mw-24, gh=mh-44;
    this._drawMapTiles(ctx,gx,gy,gw,gh,1,false);
    ctx.restore(); ctx.globalAlpha=1; ctx.textAlign="left";
  }

  // ── Inventory Panel ────────────────────────────────────────────────────────
  _drawInventory(W,H) {
    const ctx=this.ctx; const p=this.player;
    const L=this._inventoryLayout(W,H);
    const {prof,PY,sideStats,PW,PH,invX,statsX,bagX,bagY,bagCell,bagCols,bagRows}=L;
    const d2Armory = this._isD2ArmoryActive();
    if (sideStats) {
      if (d2Armory) this._drawD2ArmoryPanelTexture(statsX,PY,PW,PH,"equipmentAlt","CHARACTER",this.cls.color);
      else this._drawStonePanel(statsX,PY,PW,PH,"CHARACTER",this.cls.color);
      ctx.fillStyle=this.cls.color; ctx.font="bold 12px monospace"; ctx.textAlign="left";
      ctx.fillText(`${this.cls.name}  LEVEL ${p.level}`,statsX+18,PY+50);
      const rows=[
        ["STRENGTH",p.str],["DEXTERITY",p.dex],["VITALITY",p.vit],["ENERGY",p.nrg],
        ["DAMAGE",p.dmg],["DEFENSE",p.def],["STAMINA",`${Math.round(p.hp)}/${p.maxHp}`],["MANA",`${Math.round(p.mp)}/${p.maxMp}`],
        ["FIRE RESIST",`${p.resist.fire||0}%`],["COLD RESIST",`${p.resist.cold||0}%`],["LIGHTNING RESIST",`${p.resist.lightning||0}%`],["POISON RESIST",`${p.resist.poison||0}%`],
      ];
      rows.forEach(([name,val],i)=>{
        const x=statsX+18+(i%2)*142, y=PY+78+Math.floor(i/2)*42;
        ctx.fillStyle="#0b0b0b"; ctx.fillRect(x,y,128,26);
        ctx.strokeStyle="#5d5545"; ctx.strokeRect(x,y,128,26);
        ctx.fillStyle=this.uiTheme.muted; ctx.font="8px monospace"; ctx.fillText(name,x+6,y+10);
        ctx.fillStyle=this.uiTheme.text; ctx.font="bold 11px monospace"; ctx.textAlign="right"; ctx.fillText(String(val),x+122,y+21); ctx.textAlign="left";
        if (i < 4) {
          const r = this._statButtonRects(statsX,PY)[i];
          const active = (p.statPoints||0) > 0;
          ctx.fillStyle = active ? "rgba(214,182,92,0.22)" : "rgba(0,0,0,0.32)";
          ctx.fillRect(r.x,r.y,r.w,r.h);
          ctx.strokeStyle = active ? "#d6b65c" : "#3d3a34";
          ctx.strokeRect(r.x,r.y,r.w,r.h);
          ctx.fillStyle = active ? "#ffdd66" : "#5d5545";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.fillText("+", r.x+r.w/2, r.y+14);
          ctx.textAlign = "left";
        }
      });
      ctx.fillStyle=this.uiTheme.gold; ctx.font="bold 10px monospace"; ctx.textAlign="center";
      ctx.fillText(`${p.statPoints||0} STAT POINTS REMAINING`,statsX+PW/2,PY+PH-20);
    }

    if (PH < 420) {
      if (d2Armory) this._drawD2ArmoryPanelTexture(invX,PY,PW,PH,"inventory","D2 ARMORY",this.cls.color);
      else this._drawStonePanel(invX,PY,PW,PH,"INVENTORY",this.cls.color);
      ctx.fillStyle=this.uiTheme.gold; ctx.font="bold 10px monospace"; ctx.textAlign="right"; ctx.fillText(`${p.gold} GOLD`,invX+PW-14,PY+40);
      const e=p.equipment||{};
      const slot=Math.max(22,Math.min(30,Math.floor((PW-50)/5)));
      const sg=4;
      const sx=invX+18, sy=PY+48;
      const eSlots=[
        [e.weapon,"WPN"],[e.head,"HEAD"],[e.chest,"ARM"],[e.shield,"SHLD"],[e.amulet,"NECK"],
        [e.gloves,"GLOVE"],[e.ring,"RING"],[e.ring2,"RING2"],[e.belt,"BELT"],[e.feet,"BOOT"]
      ];
      eSlots.forEach(([item,label],i)=>{
        const row=Math.floor(i/5), col=i%5;
        this._drawItemSlot(sx+col*(slot+sg), sy+row*(slot+sg+4), slot, slot, item, label);
      });
      ctx.fillStyle=this.uiTheme.muted; ctx.font="8px monospace"; ctx.textAlign="center";
      ctx.fillText("compact bag",invX+PW/2,PY+98);
      const rows=PH < 270 ? 2 : 3;
      const compactCell=Math.min(30,Math.floor((PW-36)/8));
      this._drawGridSlots(invX+18,PY+108,8,rows,compactCell,p.inventory.slice(0,8*rows));
      const hover=this._gridHoverItem(invX+18,PY+108,8,rows,compactCell,p.inventory);
      if(hover) this._drawItemTooltip(hover, Math.min(W-238,this.mouseX+16), Math.max(42,this.mouseY-16), 220);
      return;
    }

    if (d2Armory) this._drawD2ArmoryPanelTexture(invX,PY,PW,PH,"equipment","D2 ARMORY",this.cls.color);
    else this._drawStonePanel(invX,PY,PW,PH,"INVENTORY",this.cls.color);
    ctx.fillStyle=this.uiTheme.gold; ctx.font="bold 11px monospace"; ctx.textAlign="right";
    ctx.fillText(`${p.gold} GOLD`,invX+PW-18,PY+26);
    const e=p.equipment||{};
    const cx=Math.floor(invX+PW/2);

    // ── Paperdoll character silhouette ───────────────────────────────────────
    ctx.save();
    ctx.globalAlpha=d2Armory ? 0.035 : 0.09;
    ctx.fillStyle="#9999bb";
    // head
    ctx.beginPath(); ctx.ellipse(cx, PY+68, 18, 22, 0, 0, Math.PI*2); ctx.fill();
    // neck
    ctx.fillRect(cx-5, PY+90, 10, 10);
    // torso
    ctx.beginPath();
    ctx.moveTo(cx-24, PY+100); ctx.lineTo(cx+24, PY+100);
    ctx.lineTo(cx+28, PY+186); ctx.lineTo(cx-28, PY+186);
    ctx.closePath(); ctx.fill();
    // left arm
    ctx.beginPath();
    ctx.moveTo(cx-24, PY+100); ctx.lineTo(cx-44, PY+106);
    ctx.lineTo(cx-46, PY+182); ctx.lineTo(cx-26, PY+186);
    ctx.closePath(); ctx.fill();
    // right arm
    ctx.beginPath();
    ctx.moveTo(cx+24, PY+100); ctx.lineTo(cx+44, PY+106);
    ctx.lineTo(cx+46, PY+182); ctx.lineTo(cx+26, PY+186);
    ctx.closePath(); ctx.fill();
    // left leg
    ctx.fillRect(cx-26, PY+186, 22, 80);
    // right leg
    ctx.fillRect(cx+4,  PY+186, 22, 80);
    ctx.globalAlpha=1;
    ctx.restore();

    // ── D2-style equipment slots ─────────────────────────────────────────────
    // Row 1 — head (center), amulet (right of head)
    this._drawItemSlot(cx-26,        PY+36,  52, 56, e.head,   "HEAD");
    this._drawItemSlot(cx+48,        PY+40,  38, 38, e.amulet, "NECK");
    // Row 2 — weapon (left), chest/armor (center), shield/off-hand (right)
    this._drawItemSlot(invX+26,      PY+104, 54, 86, e.weapon, "WEAPON");
    this._drawItemSlot(cx-32,        PY+104, 64, 86, e.chest,  "ARMOR");
    this._drawItemSlot(invX+PW-80,   PY+104, 54, 86, e.shield, "SHIELD");
    // Row 3 — ring (left), belt (center), ring2 (right)
    this._drawItemSlot(invX+26,      PY+200, 36, 36, e.ring,   "RING");
    this._drawItemSlot(cx-28,        PY+200, 56, 30, e.belt,   "BELT");
    this._drawItemSlot(invX+PW-62,   PY+200, 36, 36, e.ring2,  "RING 2");
    // Row 4 — gloves (left), boots (center)
    this._drawItemSlot(invX+26,      PY+246, 40, 42, e.gloves, "GLOVES");
    this._drawItemSlot(cx-22,        PY+244, 44, 48, e.feet,   "BOOTS");

    // hint label between paperdoll and bag
    ctx.fillStyle=d2Armory ? "#d6b65c" : this.uiTheme.muted; ctx.font="8px monospace"; ctx.textAlign="center";
    ctx.fillText(d2Armory ? "KOOLO armory skin - click bag items to equip - click slot to unequip" : "▲ paperdoll · click bag items to equip · click slot to unequip ▲",cx,PY+300);

    // ── Bag grid ─────────────────────────────────────────────────────────────
    this._drawGridSlots(bagX,bagY,bagCols,bagRows,bagCell,p.inventory.slice(0,bagCols*bagRows));
    let hover=this._gridHoverItem(bagX,bagY,bagCols,bagRows,bagCell,p.inventory);
    for(const r of this._inventorySlotRects(invX,PY,PW)){
      if(this.mouseX>=r.x&&this.mouseX<=r.x+r.w&&this.mouseY>=r.y&&this.mouseY<=r.y+r.h) hover=p.equipment?.[r.slot] || hover;
    }
    if(hover) this._drawItemTooltip(hover, Math.min(W-238,this.mouseX+16), Math.max(42,this.mouseY-16), 220);
  }

  // ── Town screen (walkable) ──────────────────────────────────────────────────
  _drawTown(W,H) {
    // Building interior is a full-screen takeover — render it exclusively and return.
    if (this.currentBuilding) { this._drawBuildingInterior(W,H); return; }

    const ctx=this.ctx;
    // World render
    if      (this.camera==="fps") this._drawFPS(W,H);
    else if (this.camera==="top") this._drawTopTown(W,H);
    else if (this.camera==="third") this._drawThird(W,H);
    else                          this._drawIsoTown(W,H);
    // Entities (NPCs, portal, player)
    if (this.camera!=="fps") this._drawTownEntities(W,H);
    if (this.camera !== "fps") this._drawFloatingText();
    // HUD
    this._drawTownHUD(W,H);
    this._drawAdminEditorHud(W,H);
    // Panels (drawn on top)
    if (this.showInventory && !this.useInventoryReactOverlay) this._drawInventory(W,H);
    if (this.showStash && !this.useStashReactOverlay) this._drawStash(W,H);
    if (this.showSkillTree && !this.useSkillTreeReactOverlay) this._drawSkillTree(W,H);
    if (this.questLog && !this.useQuestLogReactOverlay) this._drawQuestLog(W,H);
    if (this.showShop)      this._drawShop(W,H);
    if (this.showMercPanel) this._drawMercPanel(W,H);
    if (this.showStash && !this.useStashReactOverlay) this._drawStash(W,H);
    if (this.showForge)     this._drawForge(W,H);
    if (this.showSkinPanel) this._drawSkinPanel(W,H);
    if (this.showWaypointPanel) this._drawWaypointPanel(W,H);
  }

  _drawIsoTown(W,H) {
    const ctx=this.ctx; const t=this.town;
    const d2o = this.gameSettings?.d2oMode || this.gameSettings?.devilutionX;

    // ── Sky & atmosphere ──────────────────────────────────────────────────────
    const grad=ctx.createLinearGradient(0,0,0,H);
    if (d2o) {
      // D2O: deep stone-purple sky like D2 Act 1 night
      grad.addColorStop(0,"#0a0410"); grad.addColorStop(0.5,"#140820"); grad.addColorStop(1,t.bg||"#0c1018");
    } else {
      grad.addColorStop(0,this._lighten(t.bg,10)); grad.addColorStop(1,t.bg);
    }
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

    // Stars
    const starCount = d2o ? 120 : 60;
    for (let i=0;i<starCount;i++) {
      const ssx=(i*137.5)%W, ssy=(i*91.3)%(H*0.58);
      const twinkle = d2o ? 0.3+0.5*(0.5+0.5*Math.sin(this._frame*0.04+i*0.8)) : 0.2+((i*37)%60)/200;
      ctx.fillStyle=`rgba(255,255,255,${twinkle})`;
      ctx.fillRect(ssx,ssy,d2o ? 2 : 1.5,d2o ? 2 : 1.5);
    }
    // D2O: faint moon
    if (d2o && this.Q.glow) {
      ctx.save(); ctx.fillStyle="rgba(220,220,255,0.15)";
      ctx.beginPath(); ctx.arc(W*0.82,H*0.12,42,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(180,180,220,0.08)";
      ctx.beginPath(); ctx.arc(W*0.82,H*0.12,70,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    const m=t.map;
    const ROWS=m.length, COLS=m[0].length;
    // Act-themed tile colors — D2O gets darker, more stone
    const actPalette = d2o ? {
      GRASS:"#121c12", PATH:"#3a3028", PLAZA:"#4a4035", BUILDING:"#1a1210",
      FOUNTAIN:"#1a3050", PORTAL:"#6a2466",
    } : {
      GRASS:"#1d3b22", PATH:"#5a4a36", PLAZA:"#7a6a52", BUILDING:"#3a2a1a",
      FOUNTAIN:"#3a5a88", PORTAL:"#aa4488",
    };
    const scale=this._viewScale();
    const TW=this.TW*scale, TH=this.TH*scale;

    // ── Pass 1: tile geometry (all quality levels) ──────────────────────────
    for (let ty=0;ty<ROWS;ty++) for (let tx=0;tx<COLS;tx++) {
      const {sx,sy}=this._isoToScreen(tx,ty);
      if (sx<-TW*2||sx>W+TW*2||sy<-TH*4||sy>H+TH*4) continue;
      const v=m[ty][tx];
      if (v===1) {
        // Building footprint. Keep this flat so GLB buildings do not sit on
        // a repeated raised square platform across the whole footprint.
        const wc = actPalette.BUILDING;
        const top = this._lighten(wc, d2o ? 12 : 18);
        ctx.fillStyle=top;
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+TW,sy+TH); ctx.lineTo(sx,sy+TH*2); ctx.lineTo(sx-TW,sy+TH); ctx.closePath(); ctx.fill();
        if (this.Q.detail>0) {
          ctx.strokeStyle=this._darken(wc,18);
          ctx.lineWidth=0.6;
          ctx.stroke();
        }
        if ((tx*7+ty*3)%5===0 && this.Q.glow) {
          ctx.save();
          ctx.globalAlpha=0.16;
          ctx.fillStyle=d2o ? "#cc8820" : "#ffcc44";
          ctx.beginPath(); ctx.ellipse(sx,sy+TH,TW*0.18,TH*0.1,0,0,Math.PI*2); ctx.fill();
          ctx.restore();
        }
      } else {
        let c = actPalette.GRASS;
        if (v===0) c=actPalette.PATH;
        else if (v===2) c=actPalette.PLAZA;
        else if (v===5) c=actPalette.PORTAL;
        else if (v===6) c=actPalette.FOUNTAIN;
        else if (v===7) c=actPalette.GRASS;
        // Slight grass color variation
        if ((v===7||v===2) && this.Q.detail>0) {
          const variation=(((tx*13+ty*7)^(tx*ty))%6-3)*2;
          c=this._lighten(c,variation);
        }
        ctx.fillStyle=c;
        ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+TW,sy+TH); ctx.lineTo(sx,sy+TH*2); ctx.lineTo(sx-TW,sy+TH); ctx.closePath(); ctx.fill();
        if (this.Q.detail>0) { ctx.strokeStyle=this._darken(c,14); ctx.lineWidth=0.5; ctx.stroke(); }
        // Plaza subtle glow
        if (v===2 && this.Q.glow) {
          ctx.fillStyle=d2o ? "rgba(160,120,60,0.04)" : "rgba(255,220,160,0.04)";
          ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+TW,sy+TH); ctx.lineTo(sx,sy+TH*2); ctx.lineTo(sx-TW,sy+TH); ctx.closePath(); ctx.fill();
        }
        // Fountain animated water
        if (v===6 && this.Q.glow) {
          const wt=0.3+0.4*Math.sin(this._frame*0.09+tx*0.5+ty*0.3);
          ctx.fillStyle=`rgba(80,160,220,${wt})`;
          ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+TW,sy+TH); ctx.lineTo(sx,sy+TH*2); ctx.lineTo(sx-TW,sy+TH); ctx.closePath(); ctx.fill();
        }
      }
    }

    // ── Pass 2: Buildings — available at medium+ (KayKit GLB) ────────────────
    if (this.quality !== "low") {
      // Shared cluster definition (DRY with Top/Third/FPS views)
      const clusters = this._townBuildingClusters(COLS, m.length);
      // Sort by iso depth (painter's algorithm: front tiles render last)
      clusters.sort((a,b)=>(a.ty+a.tx)-(b.ty+b.tx));
      for (const cl of clusters) {
        const {sx,sy}=this._isoToScreen(cl.tx,cl.ty);
        if (sx<-TW*8||sx>W+TW*8||sy<-TH*16||sy>H+TH*16) continue;
        const burl = this._buildingUrl(cl.bid);
        const bframe = burl ? (getGlbSpriteFrame(burl,"idle","front")||getCachedGlbSprite(burl,"front")) : null;
        const bscale = cl.bscale || 1.0;
        if (bframe) {
          const bH = TH * 5.4 * bscale;
          const bW = bH * (bframe.width / bframe.height);
          ctx.save();
          ctx.imageSmoothingEnabled = true;
          if (this.Q.shadows) {
            ctx.fillStyle="rgba(0,0,0,0.32)";
            ctx.beginPath(); ctx.ellipse(sx,sy+TH*0.5,bW*0.28,TH*0.28,0,0,Math.PI*2); ctx.fill();
          }
          if (d2o && this.Q.glow) {
            ctx.shadowColor="rgba(80,40,0,0.5)"; ctx.shadowBlur=22;
          }
          ctx.drawImage(bframe, sx-bW*0.5, sy-bH+TH*0.6, bW, bH);
          ctx.restore();
        } else {
          this._drawTownBuildingFallback(ctx, sx, sy, TW, TH, cl.bid, bscale, d2o);
          if (burl) {
          preloadGlbStripsFireAndForget(burl,["idle"],["front"]);
          }
        }
      }
    }

    // ── Pass 3: Environmental props — torches, barrels, banners, nature ──────
    this._drawTownPropLayer(W,H,m,ROWS,COLS,TW,TH,scale,d2o);
    this._drawAdminPlacedObjectsIso(W,H,TW,TH);
  }

  // Comprehensive prop layer for town: torches, barrels, trees on perimeter, etc.
  _drawTownPropLayer(W,H,m,ROWS,COLS,TW,TH,scale,d2o) {
    const ctx = this.ctx;

    // Seeded deterministic prop placements (stable per act)
    const seed = this.actIdx * 31337 + 42;
    const rng = _rng(seed);

    // ── Torch/light props alongside building walls ─────────────────────────
    // Place a torch every ~4 tiles on the top/bottom building rows
    const torchUrl   = this._d11PropUrl("torch_lit") || this._d11PropUrl("torch_mounted");
    const barrelUrl  = this._d11PropUrl("barrel_large") || this._kaykitPropUrl("barrel");
    const bannerUrl  = this._d11PropUrl("banner_red");
    const crateUrl   = this._d11PropUrl("crates_stacked");
    const signUrl    = this._d11PropUrl("box_large");

    const propSize = TH * 2.2;
    const TORCH_ANIM = Math.floor(this._frame * 0.18) % 3; // flicker frame 0-2

    // Collect props to draw (sorted by ty then tx for painter's order)
    const props = [];

    // Torches along north/south walls
    for (let tx = 2; tx < COLS-2; tx += 4) {
      props.push({ tx, ty:3,        propUrl:torchUrl,  kind:"torch"  });
      props.push({ tx, ty:ROWS-4,   propUrl:torchUrl,  kind:"torch"  });
    }
    // Barrels at building clusters
    this._townBreakables().forEach(b => props.push({ tx:b.tx, ty:b.ty, propUrl:b.type==="crate" ? crateUrl : barrelUrl, kind:b.type }));
    // Banners along main plaza
    for (let tx = 4; tx < COLS-4; tx += 6) {
      props.push({ tx, ty:5, propUrl:bannerUrl, kind:"banner" });
    }
    // Crates near market / blacksmith
    [{tx:24,ty:6},{tx:6,ty:ROWS-6},{tx:25,ty:ROWS-6}].forEach(
      p => props.push({ ...p, propUrl:crateUrl, kind:"crate" })
    );

    // ── Forest tree ring on the outer perimeter (grass tiles) ─────────────
    // 2026-05-23 town polish: reduced tree/prop density, kept lower-right
    // corner clear of nature clutter so it doesn't overlap the HUD orbs,
    // and ensured props never appear on building/wall tiles.
    const TREE_IDS = CR_FOREST_TREE_IDS; // array of tree slot ids
    const ROCK_IDS = CR_FOREST_ROCK_IDS;
    const BUSH_IDS = CR_FOREST_BUSH_IDS;
    for (let tx = 0; tx < COLS; tx++) {
      for (let ty = 0; ty < ROWS; ty++) {
        const v = m[ty]?.[tx];
        if (v !== 7) continue; // grass only; keep walls/building pads clean
        if (tx < 2 || tx > COLS-3 || ty < 2 || ty > ROWS-3) continue;
        const edgeBand = tx < 5 || ty < 5 || tx > COLS-6 || ty > ROWS-6;
        if (!edgeBand) continue;
        // Keep lower-right corner clear — it overlaps the HUD orbs/action bar
        const lowerRight = tx > COLS - 9 && ty > ROWS - 9;
        if (lowerRight) continue;
        // Also keep a buffer zone around the lower-right HUD area
        const hudBuffer = tx > COLS - 12 && ty > ROWS - 6;
        if (hudBuffer) continue;
        // Check that no adjacent tile is a building (prevents trees on pads)
        const adjBuilding = [
          m[ty-1]?.[tx], m[ty+1]?.[tx], m[ty]?.[tx-1], m[ty]?.[tx+1],
        ].some(av => av === 3 || av === 4);
        if (adjBuilding) continue;
        const r = rng();
        if (r < 0.045) {
          // Tree — reduced from 7% to 4.5% for less clutter
          const treeId = TREE_IDS[Math.floor(rng()*TREE_IDS.length)];
          props.push({ tx, ty, propUrl:this._forestUrl(treeId), kind:"tree" });
        } else if (r < 0.075) {
          // Rock — reduced from 4% to 3%
          const rockId = ROCK_IDS[Math.floor(rng()*ROCK_IDS.length)];
          props.push({ tx, ty, propUrl:this._forestUrl(rockId), kind:"rock" });
        } else if (r < 0.10) {
          // Bush — reduced from 4% to 2.5%
          const bushId = BUSH_IDS[Math.floor(rng()*BUSH_IDS.length)];
          props.push({ tx, ty, propUrl:this._forestUrl(bushId), kind:"bush" });
        }
      }
    }

    // Sort by painter's depth
    props.sort((a,b)=>(a.ty+a.tx)-(b.ty+b.tx));

    for (const p of props) {
      const {sx,sy}=this._isoToScreen(p.tx,p.ty);
      if (sx<-TW*4||sx>W+TW*4||sy<-TH*10||sy>H+TH*4) continue;
      const url = p.propUrl;
      if (!url) continue;
      const frame = this._isoAssetFrame(url, "front");
      if (frame) {
        let drawH, drawW;
        if (p.kind==="tree") {
          drawH = TH * 3.4; // 2026-05-23: reduced from 4.2 so trees don't dwarf buildings
        } else if (p.kind==="rock" || p.kind==="bush") {
          drawH = TH * 1.6;
        } else if (p.kind==="torch") {
          drawH = TH * 2.2;
        } else if (p.kind==="banner") {
          drawH = TH * 4.0;
        } else {
          drawH = TH * 2.0;
        }
        drawW = drawH * (frame.width / frame.height);
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        // Torch glow animation
        if (p.kind==="torch" && this.Q.glow) {
          const tFlicker = 0.5+0.5*Math.sin(this._frame*0.25+p.tx*1.3+p.ty*0.7);
          ctx.shadowColor=`rgba(255,160,40,${0.5+tFlicker*0.4})`;
          ctx.shadowBlur=18+tFlicker*12;
        }
        if (this.Q.shadows && (p.kind==="tree"||p.kind==="barrel"||p.kind==="crate")) {
          ctx.fillStyle="rgba(0,0,0,0.22)";
          ctx.beginPath(); ctx.ellipse(sx,sy+TH*0.3,drawW*0.25,TH*0.15,0,0,Math.PI*2); ctx.fill();
        }
        // Clip bottom of tree/bush sprite to remove GLB ground-plane disk (elevated platform fix)
        if (p.kind==="tree" || p.kind==="bush") {
          const cf = p.kind==="bush" ? 0.92 : 0.86;
          const srcH = Math.floor(frame.height * cf);
          const dH = drawH * cf;
          ctx.drawImage(frame, 0, 0, frame.width, srcH, sx-drawW*0.5, sy-dH+TH*0.38, drawW, dH);
        } else {
          ctx.drawImage(frame, sx-drawW*0.5, sy-drawH+TH*0.4, drawW, drawH);
        }
        ctx.restore();
      } else {
        this._drawTownPropFallback(ctx, sx, sy, TW, TH, p.kind, d2o);
        preloadGlbStripsFireAndForget(url,["idle"],["front"]);
      }
    }
  }

  _drawTownBuildingFallback(ctx, sx, sy, TW, TH, bid, bscale=1, d2o=false) {
    const h = TH * (2.6 + bscale * 1.2);
    const w = TW * (1.2 + bscale * 0.8);
    const roof = bid === "diabl0_tower" ? "#090707" : bid.includes("tower") ? "#304258" : "#2b5d83";
    const wall = d2o ? "#3b332b" : "#7d6c56";
    ctx.save();
    ctx.fillStyle="rgba(0,0,0,0.28)";
    ctx.beginPath(); ctx.ellipse(sx, sy+TH*0.55, w*0.34, TH*0.22, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=wall;
    ctx.beginPath(); ctx.roundRect(sx-w*0.36, sy-h*0.58, w*0.72, h*0.62, 5); ctx.fill();
    ctx.fillStyle=roof;
    ctx.beginPath(); ctx.moveTo(sx-w*0.48, sy-h*0.55); ctx.lineTo(sx, sy-h*0.92); ctx.lineTo(sx+w*0.48, sy-h*0.55); ctx.closePath(); ctx.fill();
    ctx.fillStyle=d2o ? "#d59b35" : "#ffd06a";
    for (let i=-1;i<=1;i+=2) ctx.fillRect(sx+i*w*0.18-3, sy-h*0.34, 6, 8);
    ctx.fillStyle="#3a2418"; ctx.fillRect(sx-w*0.08, sy-h*0.17, w*0.16, h*0.2);
    if (bid === "diabl0_tower") {
      ctx.shadowColor="#ff4a18"; ctx.shadowBlur=18;
      ctx.fillStyle="#090707"; ctx.beginPath(); ctx.roundRect(sx-w*0.28, sy-h*1.08, w*0.56, h*1.08, 6); ctx.fill();
      ctx.fillStyle="#ff4a18"; ctx.fillRect(sx-2, sy-h*0.78, 4, h*0.38);
    }
    ctx.restore();
  }

  _drawTownPropFallback(ctx, sx, sy, TW, TH, kind, d2o=false) {
    ctx.save();
    if (kind === "tree") {
      ctx.fillStyle="rgba(0,0,0,0.24)"; ctx.beginPath(); ctx.ellipse(sx, sy+TH*0.35, TW*0.28, TH*0.18, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle="#8a4828"; ctx.fillRect(sx-4, sy-TH*1.2, 8, TH*1.35);
      ctx.fillStyle=d2o ? "#2e6a2d" : "#3f8c35";
      ctx.beginPath(); ctx.ellipse(sx, sy-TH*1.35, TW*0.42, TH*0.72, 0, 0, Math.PI*2); ctx.fill();
    } else if (kind === "rock") {
      ctx.fillStyle="#626a68"; ctx.beginPath(); ctx.ellipse(sx, sy, TW*0.24, TH*0.32, -0.2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle="#828986"; ctx.beginPath(); ctx.ellipse(sx-4, sy-5, TW*0.12, TH*0.12, 0, 0, Math.PI*2); ctx.fill();
    } else if (kind === "bush") {
      ctx.fillStyle=d2o ? "#35672d" : "#4f9b37"; ctx.beginPath(); ctx.roundRect(sx-TW*0.18, sy-TH*0.3, TW*0.36, TH*0.46, 8); ctx.fill();
    } else if (kind === "torch") {
      const pulse=0.5+0.5*Math.sin(this._frame*0.22+sx*0.01);
      ctx.fillStyle="#6d4a2e"; ctx.fillRect(sx-3, sy-TH*1.25, 6, TH*1.2);
      ctx.shadowColor="#ff9b28"; ctx.shadowBlur=12+pulse*12;
      ctx.fillStyle=`rgba(255,150,36,${0.75+pulse*0.2})`;
      ctx.beginPath(); ctx.ellipse(sx, sy-TH*1.32, 7, 12, 0, 0, Math.PI*2); ctx.fill();
    } else if (kind === "banner") {
      ctx.fillStyle="#6d4a2e"; ctx.fillRect(sx-3, sy-TH*2.0, 6, TH*2.0);
      ctx.fillStyle="#a82323"; ctx.fillRect(sx+3, sy-TH*1.9, TW*0.26, TH*1.1);
    } else {
      ctx.fillStyle=kind==="crate" ? "#8a5a36" : "#7a3f2a";
      ctx.beginPath(); ctx.roundRect(sx-TW*0.18, sy-TH*0.65, TW*0.36, TH*0.72, 5); ctx.fill();
      ctx.strokeStyle="#3a2418"; ctx.stroke();
    }
    ctx.restore();
  }

  // ── Building interior — isometric tiled room renderer ───────────────────────
  // Full-screen isometric building interior — replaces the town view entirely.
  // Click a service button or press ESC to leave.
  _drawBuildingInterior(W,H) {
    const ctx = this.ctx;
    const b = this.currentBuilding;
    if (!b) return;
    const mobile = this._isMobileLayout(W,H);
    const gold = this.uiTheme?.gold || "#d6b65c";
    // Reset button rects each frame (populated below: services, exit, smashables)
    this._interiorBtnRects = [];

    // ── Atmosphere fill ───────────────────────────────────────────────────────
    const sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,"#150d07"); sky.addColorStop(1,"#0a0604");
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

    // Ambient vignette
    const vig = ctx.createRadialGradient(W*0.5,H*0.42,H*0.08,W*0.5,H*0.42,H*0.72);
    vig.addColorStop(0,"rgba(80,50,20,0.0)"); vig.addColorStop(1,"rgba(0,0,0,0.72)");
    ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

    // ── Iso room layout ───────────────────────────────────────────────────────
    const templateType = (b.bid === "blacksmith") ? "blacksmith"
      : (b.bid === "tavern")    ? "tavern"
      : (b.bid === "church")    ? "church"
      : (b.bid === "barracks" || b.bid === "tower_a" || b.bid === "tower_b") ? "dungeon_room"
      : (b.bid === "home_a" || b.bid === "home_b" || b.bid === "market") ? "tavern"
      : "dungeon_room";
    const tmpl = crKayInteriorTemplate(templateType);

    const COLS = mobile ? 5 : 9, ROWS = mobile ? 4 : 7;
    // Vertical band the room must fit inside: between the title bar (top)
    // and the Services panel reserved area (bottom). Walls add ~wallScale*0.72
    // of TH pixels ABOVE the row-0 iso line — that headroom must also fit.
    const titleH    = mobile ? 44 : 56;
    const bottomRsv = mobile ? 180 : 230;
    const wallScale = mobile ? 2.6 : 3.0;
    const availH    = H - titleH - bottomRsv;
    // Pick TW so the iso diamond width hits ~78% of screen, then derive TH;
    // shrink both proportionally if the wall+diamond stack overflows availH.
    const isoSpanW = (COLS - 1 + ROWS - 1);                       // diamond span in TW units
    let   TW       = Math.floor((W * 0.78) / isoSpanW * 2);
    let   TH       = Math.floor(TW * 0.52);
    const stackH   = (wallScale * 0.72 + (COLS + ROWS - 2) * 0.5 + 0.6) * TH;
    if (stackH > availH) {
      const shrink = availH / stackH;
      TH = Math.max(28, Math.floor(TH * shrink));
      TW = Math.floor(TH / 0.52);
    }
    const isoH    = (COLS + ROWS - 2) * TH * 0.5;
    const wallHpx = wallScale * 0.72 * TH;
    // Counter-shift originX so the diamond's CENTROID sits at screen mid X
    // (with COLS≠ROWS the diamond skews; uncorrected originX = W/2 leaves it off-centre).
    const originX = W * 0.5 - (COLS - ROWS) * TW * 0.25;
    // originY = top of iso (col=0,row=0). Place so back wall clears title bar
    // AND diamond centroid sits as close to the band's mid as possible.
    const visMid = (titleH + 8 + (H - bottomRsv)) / 2;
    const originY = Math.max(titleH + 8 + wallHpx, visMid - isoH / 2);

    const toIso = (col, row) => ({
      x: originX + (col - row) * TW * 0.5,
      y: originY + (col + row) * TH * 0.5,
    });
    const _isoStillFrame = (url, dir = "front") => {
      if (!url) return null;
      return this._isoAssetFrame(url, dir);
    };

    // ── Floor tiles (back-to-front) ───────────────────────────────────────────
    const floorUrl  = crKayDungeonFloor(tmpl.floor) || crKayDungeonFloor("floor_tile_large");
    const floorUrlB = crKayDungeonFloor(tmpl.floor_worn) || floorUrl;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const {x, y} = toIso(col, row);
        const isEdge = (row === 0 || row === ROWS-1 || col === 0 || col === COLS-1);
        const useUrl = (isEdge && floorUrlB) ? floorUrlB : floorUrl;
        const frame = _isoStillFrame(useUrl, "front");
        if (frame) {
          // Warp top-down GLB floor renders onto the iso diamond so square
          // tile art follows the room plane instead of standing upright.
          this._drawImageOnIsoDiamond(ctx, frame,
            { x,          y:y-TH*0.5 },
            { x:x+TW*0.5, y },
            { x,          y:y+TH*0.5 },
            { x:x-TW*0.5, y },
            1
          );
        } else {
          ctx.fillStyle = isEdge ? "#2a1f14" : "#33261a";
          ctx.beginPath();
          ctx.moveTo(x, y - TH*0.5); ctx.lineTo(x + TW*0.5, y);
          ctx.lineTo(x, y + TH*0.5); ctx.lineTo(x - TW*0.5, y);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "rgba(80,60,35,0.5)"; ctx.lineWidth = 0.8; ctx.stroke();
        }
      }
    }

    // ── Back walls ────────────────────────────────────────────────────────────
    const wallUrl   = crKayDungeonWall(tmpl.wall || "wall") || crKayDungeonWall("wall");
    const cornerUrl = crKayDungeonWall(tmpl.wall_corner || "wall_corner") || crKayDungeonWall("wall_corner");
    const doorUrl   = crKayDungeonWall(tmpl.wall_doorway || "wall_doorway") || crKayDungeonWall("wall_doorway");
    const doorCol   = Math.floor(COLS / 2);

    // Back-top wall run (row 0). wallScale (≈3.0 desktop / 2.6 mobile) keeps
    // the wall imposing without clipping above the title bar.
    for (let col = 0; col < COLS; col++) {
      const {x, y} = toIso(col, 0);
      const isDoor = (col === doorCol);
      const wUrl = isDoor ? doorUrl : (col === 0 ? cornerUrl : wallUrl);
      const wFrame = _isoStillFrame(wUrl, "back");
      if (wFrame) {
        const faceH = TH * (wallScale - 0.4);
        this._drawImageOnIsoDiamond(ctx, wFrame,
          { x:x-TW*0.5, y:y-faceH },
          { x:x+TW*0.5, y:y-faceH },
          { x:x+TW*0.5, y },
          { x:x-TW*0.5, y },
          0.96
        );
      } else {
        const fbH = TH * (wallScale - 0.4);
        ctx.fillStyle = "#24180e"; ctx.fillRect(x - TW*0.5, y - fbH, TW, fbH);
        ctx.strokeStyle = "rgba(90,65,35,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(x - TW*0.5, y - fbH, TW, fbH);
      }
    }
    // Back-right wall run (col 0, rows 1+)
    for (let row = 1; row < ROWS; row++) {
      const {x, y} = toIso(0, row);
      const wFrame = _isoStillFrame(wallUrl, "right");
      if (wFrame) {
        const faceH = TH * (wallScale - 0.4);
        this._drawImageOnIsoDiamond(ctx, wFrame,
          { x:x-TW*0.5, y:y-faceH },
          { x,          y:y+TH*0.5-faceH },
          { x,          y:y+TH*0.5 },
          { x:x-TW*0.5, y },
          0.94
        );
      } else {
        const fbH = TH * (wallScale - 0.4);
        ctx.fillStyle = "#1e140a"; ctx.fillRect(x - TW*0.5, y - fbH, TW, fbH);
      }
    }

    // ── Torch glows on back wall ──────────────────────────────────────────────
    const torchUrl = crKayDungeon11Prop("torch_lit");
    for (const col of [1, COLS-2]) {
      const {x, y} = toIso(col, 0);
      // Glow halo
      const pulse = 0.5 + 0.5 * Math.sin(this._frame * 0.22 + col);
      ctx.save(); ctx.globalAlpha = 0.18 + pulse * 0.16;
      ctx.fillStyle = "#ff9b28";
      ctx.beginPath(); ctx.ellipse(x, y - TH*2.0, TW*1.4, TH*2.2, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      if (torchUrl) {
        const tf = _isoStillFrame(torchUrl, "front");
        if (tf) {
          const tH = TH*2.4, tW = tH*(tf.width/tf.height);
          ctx.globalAlpha = 0.9 + Math.sin(this._frame*0.18+col)*0.06;
          ctx.drawImage(tf, x - tW*0.5, y - tH*0.9, tW, tH);
          ctx.globalAlpha = 1;
        }
      }
    }

    // ── Pillars in room corners ───────────────────────────────────────────────
    const pillarUrl = crKayDungeon11Prop("pillar_decorated") || crKayDungeon11Prop("pillar");
    for (const [pc,pr] of [[1,1],[COLS-2,1],[1,ROWS-3],[COLS-2,ROWS-3]]) {
      const {x:px,y:py} = toIso(pc,pr);
      const pf = _isoStillFrame(pillarUrl, "front");
      if (pf) {
        const pH = TH*2.8, pW = pH*(pf.width/pf.height);
        ctx.drawImage(pf, px-pW*0.5, py-pH*0.74, pW, pH);
      } else {
        ctx.fillStyle="#1e140a"; ctx.fillRect(px-5,py-TH*1.8,10,TH*1.8);
        ctx.strokeStyle="#5a3e26"; ctx.strokeRect(px-5,py-TH*1.8,10,TH*1.8);
      }
    }

    // ── Rich per-building furniture layout ────────────────────────────────────
    // D11 props take priority when available; fall back to Furniture kit items.
    // Default scale tuned so a single piece fits inside one tile footprint.
    const _furSlot = (col, row, d11id, furId, scale=2.4) => {
      const {x,y} = toIso(col, row);
      const url = crKayDungeon11Prop(d11id) || crKayFurniture(furId);
      const ff = _isoStillFrame(url, "front");
      if (ff) {
        const fH = TH*scale, fW = fH*(ff.width/ff.height);
        ctx.drawImage(ff, x-fW*0.5, y-fH*0.7, fW, fH);
      }
    };
    const C2=Math.floor(COLS/2), R2=Math.floor(ROWS/2);
    if (templateType==="blacksmith") {
      _furSlot(2,2,"table_long","table_long");
      _furSlot(COLS-3,2,"shelf_large","shelf_big");
      _furSlot(2,R2,"table_medium","table_medium");
      _furSlot(COLS-3,ROWS-3,"crates_stacked","shelf_small");
      _furSlot(C2-1,2,"sword_shield","shelf_big",2.0);
      _furSlot(C2+1,2,"banner_red",null,3.0);
    } else if (templateType==="tavern") {
      _furSlot(C2-1,R2-1,"table_long","table_long");
      _furSlot(C2+1,R2,"table_medium","table_medium");
      _furSlot(2,R2,"stool","stool",1.6);
      _furSlot(3,R2,"stool","stool",1.6);
      _furSlot(COLS-3,2,"shelves","shelf_big");
      _furSlot(2,2,"keg_decorated","shelf_small",1.8);
    } else if (templateType==="church") {
      _furSlot(2,2,"banner_blue",null,3.0);
      _furSlot(COLS-3,2,"banner_green",null,3.0);
      _furSlot(C2,R2-1,"table_small","table_medium",1.8);
      _furSlot(2,R2,"shelf_large","shelf_big");
      _furSlot(COLS-3,R2,"shelf_large","shelf_big");
    } else {
      // dungeon_room / default
      _furSlot(2,2,"shelves","shelf_big");
      _furSlot(COLS-3,R2,"trunk_large_A","shelf_small",2.0);
    }

    // ── Smashable props (barrel/chest) — D2-style ─────────────────────────────
    const smashableProps = [
      {id:`${b.bid}_barrel_L`,col:COLS-3,row:2,     kind:"barrel",d11id:"barrel_large"},
      {id:`${b.bid}_barrel_S`,col:COLS-4,row:2,     kind:"barrel",d11id:"barrel_small"},
      {id:`${b.bid}_chest`,   col:C2+2,  row:ROWS-3,kind:"chest", d11id:"chest"},
    ];
    if (!this.smashedTownProps) this.smashedTownProps = new Set();
    for (const sp of smashableProps) {
      const {x:sx,y:sy} = toIso(sp.col, sp.row);
      const smashed = this.smashedTownProps.has(sp.id);
      if (smashed) {
        // Rubble pile
        const rubUrl = crKayDungeon11Prop("rubble_half");
        const rf = _isoStillFrame(rubUrl, "front");
        if (rf) { const fH=TH*2.2,fW=fH*(rf.width/rf.height); ctx.globalAlpha=0.72; ctx.drawImage(rf,sx-fW*0.5,sy-fH*0.72,fW,fH); ctx.globalAlpha=1; }
        else { ctx.fillStyle="#3a2a12"; ctx.fillRect(sx-12,sy-8,24,8); }
        continue;
      }
      const propUrl = crKayDungeon11Prop(sp.d11id);
      const pf = _isoStillFrame(propUrl, "front");
      const scale = sp.kind==="chest" ? 2.0 : 1.7;
      if (pf) {
        const fH=TH*scale, fW=fH*(pf.width/pf.height);
        ctx.drawImage(pf, sx-fW*0.5, sy-fH*0.72, fW, fH);
      } else {
        // Procedural fallback
        ctx.fillStyle = sp.kind==="chest" ? "#4a2e18" : "#3a2010";
        ctx.beginPath(); ctx.roundRect(sx-12,sy-TH*1.2,24,TH*1.2,4); ctx.fill();
        ctx.strokeStyle = sp.kind==="chest" ? "#d6b65c" : "#7a4a22"; ctx.lineWidth=1.5; ctx.stroke();
      }
      // Hover glow when nearby cursor (smash hint)
      const hoverR2 = (this.mouseX-sx)*(this.mouseX-sx)+(this.mouseY-sy)*(this.mouseY-sy);
      if (hoverR2 < 1600) {
        ctx.save(); ctx.globalAlpha=0.32+(Math.sin(this._frame*0.22)*0.1);
        ctx.fillStyle="#ffdd66";
        ctx.beginPath(); ctx.ellipse(sx,sy,18,8,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#ffdd66"; ctx.font="bold 10px monospace"; ctx.textAlign="center";
        ctx.fillText("SMASH",sx,sy-TH*1.4);
        ctx.restore();
        // Register as clickable
        this._interiorBtnRects.push({x:sx-22,y:sy-TH*1.6,w:44,h:TH*1.8,label:`smash:${sp.id}`,idx:-1,smashId:sp.id});
      }
    }

    // ── NPC ───────────────────────────────────────────────────────────────────
    const npcSlotMap = {
      blacksmith:"npc_blacksmith", market:"npc_merchant", tavern:"npc_merchant",
      church:"npc_healer", barracks:"npc_stash", archeryrange:"npc_ranger",
      tower_a:"npc_stash", tower_b:"npc_waypoint", home_a:"npc_rogue",
      home_b:"npc_rogue", windmill:"npc_ranger", well:"npc_healer",
    };
    const npcLabelMap = {
      blacksmith:"Forge Smith", market:"Pack Merchant", tavern:"Rumor Keeper",
      church:"Acolyte", barracks:"Drill Captain", archeryrange:"Range Master",
      tower_a:"Watch Sergeant", tower_b:"Gate Guard", home_a:"Townsperson",
      home_b:"Townsperson", windmill:"Farmer", well:"Whisper Below",
    };
    const npcSlot = npcSlotMap[b.bid] || "npc_merchant";
    const npcLabel = npcLabelMap[b.bid] || "Local";
    const npcCol = Math.floor(COLS * 0.5), npcRow = Math.floor(ROWS * 0.38);
    const npc = toIso(npcCol, npcRow);

    const npcSize = Math.max(30, Math.min(mobile ? 42 : 52, TH * 0.78));
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.ellipse(npc.x, npc.y + TH*0.22, TW*0.32, TH*0.2, 0, 0, Math.PI*2); ctx.fill();
    // Soft highlight glow behind NPC
    if (this.Q.glow) {
      ctx.save(); ctx.globalAlpha = 0.18;
      ctx.fillStyle = gold;
      ctx.beginPath(); ctx.ellipse(npc.x, npc.y - npcSize*0.4, npcSize*0.7, npcSize*0.9, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    this._drawCharSprite(ctx, npc.x, npc.y, npcSlot, Math.PI / 2, this._frame, npcSize, 1, false, {state:"idle", dir:"front"});
    // NPC name above head
    const nameY = npc.y - npcSize - 8;
    ctx.font = `bold ${mobile?11:13}px monospace`; ctx.textAlign = "center";
    ctx.shadowColor="#000"; ctx.shadowBlur=6;
    ctx.fillStyle = "#44ff88"; ctx.fillText(npcLabel, npc.x, nameY);
    ctx.shadowBlur=0;

    // Speech bubble hint (cycles every 120 frames) — context-aware rumors
    const baseSpeechLines = b.services || ["Talk"];
    const contextRumors = this._generateNpcRumors(b.bid, npcLabel);
    const speechLines = [...baseSpeechLines, ...contextRumors];
    const speechLine = speechLines[Math.floor(this._frame / 120) % speechLines.length];
    ctx.font = `${mobile?9:11}px monospace`; ctx.fillStyle = "#e8dfc2";
    const maxTextW = mobile ? 180 : 240;
    const truncated = speechLine.length > 38 ? speechLine.slice(0, 35) + "..." : speechLine;
    ctx.fillText(`"${truncated}"`, npc.x, nameY - 16);

    // ── Hero sprite near entrance (front-centre of room) ───────────────────────
    const heroCol = Number.isFinite(b.heroCol) ? Math.max(1, Math.min(COLS - 2, b.heroCol)) : Math.floor(COLS/2);
    const heroRow = Number.isFinite(b.heroRow) ? Math.max(1, Math.min(ROWS - 2, b.heroRow)) : ROWS - 2;
    const heroPt = toIso(heroCol, heroRow);
    const heroSize = Math.max(30, Math.min(mobile ? 40 : 50, TH * 0.72));
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.beginPath(); ctx.ellipse(heroPt.x, heroPt.y + TH*0.2, TW*0.26, TH*0.16, 0, 0, Math.PI*2); ctx.fill();
    this._drawCharSprite(ctx, heroPt.x, heroPt.y, this.cls?.id || "iron_warden", Math.PI / 2, this._frame, heroSize, 1, false, {state:"idle", dir:"front"});

    // ── Door/exit marker at front of room ────────────────────────────────────
    const exitPt = toIso(Math.floor(COLS/2), ROWS-1);
    {
      const exitPulse = 0.6 + 0.4*Math.sin(this._frame*0.09);
      const dUrl = doorUrl || wallUrl;
      const df = _isoStillFrame(dUrl, "front");
      if (df) {
        const dH=TH*wallScale, dW=dH*(df.width/df.height);
        ctx.globalAlpha=exitPulse*0.88;
        ctx.drawImage(df, exitPt.x-dW*0.5, exitPt.y-dH*0.68, dW, dH);
        ctx.globalAlpha=1;
      }
      // Golden EXIT floor highlight
      ctx.save();
      ctx.globalAlpha=0.22+exitPulse*0.18;
      ctx.fillStyle="#d6b65c";
      ctx.beginPath(); ctx.ellipse(exitPt.x, exitPt.y+TH*0.2, TW*0.52, TH*0.28, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha=exitPulse*0.92;
      ctx.fillStyle="#d6b65c"; ctx.font=`bold ${mobile?12:16}px monospace`; ctx.textAlign="center";
      ctx.shadowColor="#000"; ctx.shadowBlur=8;
      ctx.fillText("▼ EXIT", exitPt.x, exitPt.y+TH*0.5+16);
      ctx.restore();
      // Wide exit hit zone registered
      this._interiorBtnRects.push({
        x:exitPt.x-TW*1.4, y:exitPt.y-TH*0.5,
        w:TW*2.8, h:TH*2.2, label:"leave", idx:999
      });
    }

    // ── Title bar (top HUD strip) ─────────────────────────────────────────────
    const hudTitleH = mobile ? 44 : 56;
    // D2-style gradient header
    const hdrGrad = ctx.createLinearGradient(0,0,0,hudTitleH);
    hdrGrad.addColorStop(0,"rgba(28,14,4,0.95)");
    hdrGrad.addColorStop(0.5,"rgba(20,10,2,0.88)");
    hdrGrad.addColorStop(1,"rgba(0,0,0,0.72)");
    ctx.fillStyle = hdrGrad; ctx.fillRect(0,0,W,hudTitleH);
    ctx.strokeStyle = "#8a6230"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0,hudTitleH); ctx.lineTo(W,hudTitleH); ctx.stroke();
    // Gold ornament lines
    ctx.strokeStyle = "#3a2010"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0,hudTitleH-2); ctx.lineTo(W,hudTitleH-2); ctx.stroke();
    ctx.fillStyle = gold; ctx.font = `bold ${mobile?16:20}px monospace`; ctx.textAlign = "left";
    ctx.shadowColor="#000"; ctx.shadowBlur=8;
    ctx.fillText(b.title || "BUILDING", 18, mobile ? 26 : 32);
    ctx.shadowBlur=0;
    ctx.fillStyle = "#8a7a62"; ctx.font = `${mobile?8:9}px monospace`;
    ctx.fillText(`ESC or click ▼ EXIT to leave  ·  Click barrels/chests to smash`, 18, mobile ? 40 : 50);

    // ── Services panel (bottom-left floating) ─────────────────────────────────
    if (b.notice) {
      ctx.fillStyle = "#d6b65c";
      ctx.font = `bold ${mobile?8:9}px monospace`;
      ctx.fillText(String(b.notice).slice(0, 72).toUpperCase(), Math.min(W * 0.48, 420), mobile ? 40 : 50);
    }
    const services = b.services || ["Talk","Search","Leave"];
    const btnW = mobile ? 96 : 130, btnH = mobile ? 30 : 36, btnGap = 6;
    const totalBtnH = services.length * (btnH + btnGap) - btnGap;
    const SX = 16, SY = H - totalBtnH - (mobile ? 56 : 68);

    // D2-style panel backdrop with stone border
    const panBg = ctx.createLinearGradient(SX-10,SY-36,SX+btnW+12,SY+totalBtnH+16);
    panBg.addColorStop(0,"rgba(20,12,4,0.94)"); panBg.addColorStop(1,"rgba(10,6,2,0.88)");
    ctx.fillStyle = panBg;
    ctx.beginPath(); ctx.roundRect(SX-10, SY-38, btnW+22, totalBtnH+54, 8); ctx.fill();
    ctx.strokeStyle = "#6a4a22"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(SX-10, SY-38, btnW+22, totalBtnH+54, 8); ctx.stroke();
    ctx.strokeStyle = "#2a1a08"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.roundRect(SX-8, SY-36, btnW+18, totalBtnH+50, 6); ctx.stroke();

    ctx.fillStyle = gold; ctx.font = `bold ${mobile?11:13}px monospace`; ctx.textAlign = "left";
    ctx.shadowColor="#000"; ctx.shadowBlur=4;
    ctx.fillText("SERVICES", SX, SY-18);
    ctx.shadowBlur=0;
    ctx.strokeStyle="#5a3a14"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(SX,SY-10); ctx.lineTo(SX+btnW,SY-10); ctx.stroke();

    if (!this._interiorBtnRects) this._interiorBtnRects = [];
    services.forEach((s, i) => {
      const bx = SX, by = SY + i*(btnH+btnGap);
      this._interiorBtnRects.push({x:bx,y:by,w:btnW,h:btnH,label:s,idx:i});
      const hot = this._interiorHoveredBtn === i;
      const isLeave = s.toLowerCase()==="leave";
      const btnGrad2 = ctx.createLinearGradient(bx,by,bx,by+btnH);
      if (hot) { btnGrad2.addColorStop(0,"rgba(160,118,52,0.85)"); btnGrad2.addColorStop(1,"rgba(110,76,28,0.85)"); }
      else if (isLeave) { btnGrad2.addColorStop(0,"rgba(60,14,8,0.82)"); btnGrad2.addColorStop(1,"rgba(40,8,4,0.82)"); }
      else { btnGrad2.addColorStop(0,"rgba(38,24,10,0.82)"); btnGrad2.addColorStop(1,"rgba(24,14,4,0.82)"); }
      ctx.fillStyle = btnGrad2;
      ctx.beginPath(); ctx.roundRect(bx,by,btnW,btnH,5); ctx.fill();
      ctx.strokeStyle = hot ? "#c8902c" : isLeave ? "#882211" : "#6a4a22"; ctx.lineWidth = hot ? 1.5 : 1; ctx.stroke();
      // Icon prefix
      const icons = {"Leave":"✖","Talk":"💬","Trade":"⚔","Buy":"⚔","Repair":"🔧","Forge":"🔥","Heal":"💚","Bless":"✨","Search":"🔍","Identify":"🔍","Stash":"📦","Recruit":"👥","Hire":"👥","Train":"⚡"};
      const svcIcon = Object.entries(icons).find(([k])=>s.toLowerCase().includes(k.toLowerCase()));
      ctx.fillStyle = isLeave ? "#ff5544" : hot ? "#fff8e2" : "#d8cdb8";
      ctx.font = `bold ${mobile?10:12}px monospace`; ctx.textAlign = "left";
      ctx.shadowColor="#000"; ctx.shadowBlur=3;
      ctx.fillText(s.toUpperCase(), bx+12, by + btnH*0.65);
      ctx.shadowBlur=0;
    });

    // ── Minimap: room silhouette (top-right) ──────────────────────────────────
    if (!mobile) {
      const mmX = W-100, mmY = 60, mmW = 84, mmH = 52;
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(mmX,mmY,mmW,mmH,6); ctx.fill();
      ctx.strokeStyle = "rgba(140,107,62,0.45)"; ctx.lineWidth=1; ctx.stroke();
      const mmTW = mmW/(COLS+1), mmTH = mmH/(ROWS+1);
      ctx.fillStyle = "#3a2a1a";
      for (let row=0;row<ROWS;row++) for (let col=0;col<COLS;col++) {
        const mx = mmX+mmW*0.5 + (col-row)*mmTW*0.5;
        const my = mmY+mmH*0.2 + (col+row)*mmTH*0.5;
        ctx.beginPath(); ctx.moveTo(mx,my-mmTH*0.5); ctx.lineTo(mx+mmTW*0.5,my); ctx.lineTo(mx,my+mmTH*0.5); ctx.lineTo(mx-mmTW*0.5,my); ctx.closePath(); ctx.fill();
      }
      // Hero dot
      const {x:hx,y:hy} = toIso(Math.floor(COLS/2), ROWS-2);
      const hmx = mmX+mmW*0.5 + (Math.floor(COLS/2)-(ROWS-2))*mmTW*0.5;
      const hmy = mmY+mmH*0.2 + (Math.floor(COLS/2)+(ROWS-2))*mmTH*0.5;
      ctx.fillStyle="#d6b65c"; ctx.beginPath(); ctx.arc(hmx,hmy,2.5,0,Math.PI*2); ctx.fill();
      // NPC dot
      const nmx = mmX+mmW*0.5 + (npcCol-npcRow)*mmTW*0.5;
      const nmy = mmY+mmH*0.2 + (npcCol+npcRow)*mmTH*0.5;
      ctx.fillStyle="#44ff88"; ctx.beginPath(); ctx.arc(nmx,nmy,2.5,0,Math.PI*2); ctx.fill();
    }
  }

  // Context-aware NPC rumors that reference player state, act, and building type
  _generateNpcRumors(buildingId, npcLabel) {
    const rumors = [];
    const lvl = this.player?.level || 1;
    const act = (this.actIdx || 0) + 1;
    const gold = this.player?.gold || 0;
    const hp = this.player?.hp || 0;
    const maxHp = this.player?.maxHp || 100;

    // Act-specific rumors
    if (act >= 3) rumors.push("The catacombs grow restless...");
    if (act >= 5) rumors.push("Diablo stirs in his tower...");
    if (act >= 7) rumors.push("Baal's corruption spreads...");

    // Level-based comments
    if (lvl < 5) rumors.push("Stay near town, greenhorn.");
    else if (lvl > 20) rumors.push(`Level ${lvl}? Impressive.`);
    else if (lvl > 40) rumors.push("A veteran walks among us.");

    // Building-specific rumors
    if (buildingId === "blacksmith") {
      rumors.push("Steel remembers its maker.");
      if (gold > 5000) rumors.push("Heavy purse... need something forged?");
    } else if (buildingId === "tavern") {
      rumors.push("Ale loosens tongues and purses.");
      if (hp < maxHp * 0.5) rumors.push("You look like you need a drink.");
    } else if (buildingId === "church") {
      rumors.push("The light protects the faithful.");
      if (hp < maxHp * 0.3) rumors.push("Let me tend those wounds.");
    } else if (buildingId === "barracks") {
      rumors.push("Discipline separates soldiers from corpses.");
      rumors.push("The drill yard awaits.");
    } else if (buildingId === "market") {
      rumors.push("Best prices in the realm.");
      if (gold > 10000) rumors.push("A wealthy patron approaches...");
    }

    // Recent event rumors (if any)
    if (this._recentKillCount > 50) rumors.push(`${this._recentKillCount} slain? Word travels fast.`);
    if (this._cowPortalActive) rumors.push("Strange... I smell cattle on the wind.");

    return rumors.slice(0, 5); // Limit to 5 context rumors
  }

  _drawTopTown(W,H) {
    const ctx=this.ctx; const t=this.town;
    ctx.fillStyle=t.bg; ctx.fillRect(0,0,W,H);
    this._drawTopMap(W,H,t,false,true);
    this._drawTopTownBuildings(W,H);
    this._drawAdminPlacedObjectsTop(W,H);
  }

  // ── Shared building cluster definition (DRY — used by iso/top/third/fps) ──
  _townBuildingClusters(COLS, ROWS) {
    const midX = Math.floor(COLS/2);
    const midY = Math.floor(ROWS/2);
    const clusters = [
      {tx:3,       ty:3,        bid:"church",       bscale:0.78},
      {tx:9,       ty:3,        bid:"tavern",       bscale:0.72},
      {tx:15,      ty:3,        bid:"market",       bscale:0.70},
      {tx:22,      ty:3,        bid:"archeryrange", bscale:0.68},
      {tx:4,       ty:ROWS-5,   bid:"blacksmith",   bscale:0.75},
      {tx:10,      ty:ROWS-5,   bid:"home_a",       bscale:0.62},
      {tx:17,      ty:ROWS-5,   bid:"barracks",     bscale:0.72},
      {tx:24,      ty:ROWS-5,   bid:"home_b",       bscale:0.62},
      {tx:2,       ty:midY-2,   bid:"tower_b",      bscale:0.82},
      {tx:COLS-3,  ty:midY-2,   bid:"tower_a",      bscale:0.82},
      {tx:midX-3,  ty:ROWS-8,   bid:"well",         bscale:0.55},
      {tx:COLS-5,  ty:ROWS-6,   bid:"windmill",     bscale:0.70},
    ];
    if (this.actIdx >= 5) {
      clusters.push({tx:midX, ty:2, bid:"diabl0_tower", bscale:1.15, finalArena:true});
    }
    return clusters;
  }

  // ── Top-view building + prop rendering ───────────────────────────────────
  _drawTopTownBuildings(W,H) {
    const ctx = this.ctx;
    const t = this.town; const m = t.map;
    const COLS = m[0].length, ROWS = m.length;
    const scale = this._viewScale(); const TS = this.TS;
    const tilePx = TS * scale;
    const clusters = this._townBuildingClusters(COLS, ROWS);
    clusters.sort((a,b)=>a.ty-b.ty);

    for (const cl of clusters) {
      const {sx,sy} = this._topToScreen(cl.tx*TS+TS/2, cl.ty*TS+TS/2, W, H);
      if (sx<-80||sx>W+80||sy<-80||sy>H+80) continue;
      const burl = this._buildingUrl(cl.bid);
      const bframe = this._isoAssetFrame(burl, "front");
      const bsc = cl.bscale||1;
      if (bframe) {
        const bH = tilePx*3.6*bsc, bW = bH*(bframe.width/bframe.height);
        ctx.save();
        ctx.imageSmoothingEnabled=true;
        if (this.Q.shadows) {
          ctx.fillStyle="rgba(0,0,0,0.28)";
          ctx.beginPath(); ctx.ellipse(sx,sy+tilePx*0.2,bW*0.3,tilePx*0.14,0,0,Math.PI*2); ctx.fill();
        }
        ctx.drawImage(bframe, sx-bW*0.5, sy-bH*0.88, bW, bH);
        ctx.restore();
      } else if (burl) {
        preloadGlbStripsFireAndForget(burl,["idle"],["front"]);
        ctx.fillStyle="#2a2018";
        ctx.fillRect(sx-tilePx*bsc*0.55, sy-tilePx*bsc*0.55, tilePx*bsc*1.1, tilePx*bsc*1.1);
        ctx.strokeStyle="#7a6a52"; ctx.strokeRect(sx-tilePx*bsc*0.55, sy-tilePx*bsc*0.55, tilePx*bsc*1.1, tilePx*bsc*1.1);
        ctx.fillStyle="#b7aa82"; ctx.font=`${Math.round(7*scale)}px monospace`; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(cl.bid.replace(/_/g," ").toUpperCase().slice(0,8), sx, sy);
      }
    }

    // Tree ring (top-down view)
    const seed = this.actIdx*31337+42; const rng = _rng(seed);
    const treePairs = [];
    for (let tx=0;tx<COLS;tx++) for (let ty=0;ty<ROWS;ty++) {
      const v=m[ty]?.[tx];
      if (v!==7||tx<1||ty<1||tx>COLS-2||ty>ROWS-2) continue;
      if (!(tx<5||ty<5||tx>COLS-6||ty>ROWS-6)) continue;
      const r=rng();
      if (r<0.055) {
        const tid=CR_FOREST_TREE_IDS[Math.floor(rng()*CR_FOREST_TREE_IDS.length)];
        treePairs.push({tx,ty,url:this._forestUrl(tid)});
      }
    }
    treePairs.sort((a,b)=>a.ty-b.ty);
    for (const p of treePairs) {
      const {sx,sy} = this._topToScreen(p.tx*TS+TS/2, p.ty*TS+TS/2, W, H);
      if (sx<-40||sx>W+40||sy<-40||sy>H+40) continue;
      const frame = this._isoAssetFrame(p.url, "front");
      if (frame) {
        const pH=tilePx*2.2, pW=pH*(frame.width/frame.height);
        ctx.save(); ctx.imageSmoothingEnabled=true;
        ctx.drawImage(frame, sx-pW*0.5, sy-pH*0.84, pW, pH);
        ctx.restore();
      } else if (p.url) {
        preloadGlbStripsFireAndForget(p.url,["idle"],["front"]);
        this._drawTownPropFallback(ctx, sx, sy, tilePx, tilePx*0.5, "tree", this.gameSettings?.d2oMode);
      }
    }
  }

  // ── Third-person building + prop rendering ────────────────────────────────
  _drawThirdTownBuildings(W,H) {
    const ctx=this.ctx; const t=this.town; const m=t.map;
    const COLS=m[0].length, ROWS=m.length;
    const p=this.player; const TS=this.TS;
    const clusters=this._townBuildingClusters(COLS,ROWS);

    // Build prop list
    const seed=this.actIdx*31337+42; const rng=_rng(seed);
    const items = [
      ...clusters.map(cl=>({wx:cl.tx*TS+TS/2,wy:cl.ty*TS+TS/2,bid:cl.bid,bscale:cl.bscale||1,kind:"building"})),
    ];
    for (let tx=0;tx<COLS;tx++) for (let ty=0;ty<ROWS;ty++) {
      const v=m[ty]?.[tx];
      if (v!==7||tx<1||ty<1||tx>COLS-2||ty>ROWS-2) continue;
      if (!(tx<5||ty<5||tx>COLS-6||ty>ROWS-6)) continue;
      const r=rng();
      if (r<0.05) {
        const tid=CR_FOREST_TREE_IDS[Math.floor(rng()*CR_FOREST_TREE_IDS.length)];
        items.push({wx:tx*TS+TS/2,wy:ty*TS+TS/2,url:this._forestUrl(tid),kind:"tree"});
      }
    }
    // Sort far-first
    items.sort((a,b)=>Math.hypot(b.wx-p.wx,b.wy-p.wy)-Math.hypot(a.wx-p.wx,a.wy-p.wy));

    for (const item of items) {
      const proj=this._worldToThird(item.wx,item.wy,W,H,0);
      if (!proj||proj.sx<-200||proj.sx>W+200||proj.sy<-80||proj.sy>H+200) continue;
      if (item.kind==="building") {
        const burl=this._buildingUrl(item.bid);
        const bframe = this._isoAssetFrame(burl, "front");
        const bH=Math.max(28,260*proj.scale*item.bscale);
        const bW=bframe?bH*(bframe.width/bframe.height):bH*0.7;
        ctx.save(); ctx.imageSmoothingEnabled=true;
        if (this.Q.shadows) {
          ctx.fillStyle="rgba(0,0,0,0.22)";
          ctx.beginPath(); ctx.ellipse(proj.sx,proj.sy,bW*0.28,bH*0.05,0,0,Math.PI*2); ctx.fill();
        }
        if (bframe) {
          if (this.Q.glow) { ctx.shadowColor="rgba(50,35,10,0.4)"; ctx.shadowBlur=16; }
          ctx.drawImage(bframe,proj.sx-bW*0.5,proj.sy-bH*0.9,bW,bH);
        } else if (burl) {
          preloadGlbStripsFireAndForget(burl,["idle"],["front"]);
          ctx.fillStyle="#2a2018";
          ctx.fillRect(proj.sx-bW*0.5,proj.sy-bH*0.82,bW,bH*0.8);
          ctx.strokeStyle="#7a6a52"; ctx.strokeRect(proj.sx-bW*0.5,proj.sy-bH*0.82,bW,bH*0.8);
        }
        ctx.restore();
      } else if (item.kind==="tree" && item.url) {
        const frame = this._isoAssetFrame(item.url, "front");
        if (frame) {
          const pH=Math.max(18,190*proj.scale), pW=pH*(frame.width/frame.height);
          ctx.save(); ctx.imageSmoothingEnabled=true;
          ctx.drawImage(frame,proj.sx-pW*0.5,proj.sy-pH*0.92,pW,pH);
          ctx.restore();
        } else {
          preloadGlbStripsFireAndForget(item.url,["idle"],["front"]);
          this._drawTownPropFallback(ctx, proj.sx, proj.sy, 64*proj.scale, 32*proj.scale, "tree", this.gameSettings?.d2oMode);
        }
      }
    }
  }

  _drawTownEntities(W,H) {
    const ctx=this.ctx; const t=this.town; const p=this.player;
    const spriteScale=this._gfxScale()*Math.sqrt(this._cameraZoomScale());
    // Build a list of drawables sorted by world Y (painter's algorithm)
    const list = [];
    // Portal
    list.push({ wx:t.portalWx, wy:t.portalWy, kind:"portal" });
    list.push({ wx:t.exitWx, wy:t.exitWy, kind:"exit" });
    // Easter egg portals / events
    if (this._cowPortalActive && this._cowPortalWx != null)
      list.push({ wx:this._cowPortalWx, wy:this._cowPortalWy, kind:"cow_portal" });
    if (this.darkWanderer && this.darkWanderer.opacity > 0)
      list.push({ wx:this.darkWanderer.wx, wy:this.darkWanderer.wy, kind:"wanderer" });
    this._activeStatues().filter(s=>!s.found).forEach(s => list.push({ wx:s.wx, wy:s.wy, kind:"statue", statue:s }));
    // NPCs
    t.npcs.forEach(n => list.push({ wx:n.wx, wy:n.wy, kind:"npc", npc:n }));
    // Merc
    if (this.merc && !this.merc.dead && this.screen==="town") list.push({ wx:p.wx-40, wy:p.wy+10, kind:"merc" });
    // Summons (pets follow player into town)
    this.summons.forEach((s, i) => list.push({ wx:s.wx, wy:s.wy, kind:"summon", summon:s, summonIdx:i }));
    // Player
    list.push({ wx:p.wx, wy:p.wy, kind:"player" });
    // Move target marker
    if (this.moveTarget) list.push({ wx:this.moveTarget.wx, wy:this.moveTarget.wy, kind:"marker" });

    list.sort((a,b)=>a.wy - b.wy);

    list.forEach(item => {
      const wobble = item.kind === "npc" && item.npc?.wander ? Math.sin(this._frame*0.018 + item.npc.tx*0.7) * 24 : 0;
      const drawWx = item.wx + wobble;
      const drawWy = item.wy;
      let sx, sy;
      if (this.camera === "iso") {
        const s = this._worldToIso(drawWx, drawWy);
        sx = s.sx; sy = s.sy + this.TH*this._viewScale();
      } else if (this.camera === "third") {
        const s = this._entityScreen(drawWx, drawWy, W, H);
        sx = s.sx; sy = s.sy;
      } else {
        const s = this._topToScreen(drawWx, drawWy, W, H);
        sx = s.sx; sy = s.sy;
      }
      if (item.kind === "statue") {
        const statue = item.statue;
        const playerDist = Math.hypot(statue.wx - p.wx, statue.wy - p.wy);
        const statueImg = _crRuntimeAssetImage("statue_of_death", _crAssetTierForQuality(this.quality));
        const pulse = 0.5 + 0.5*Math.sin(this._frame*0.07);
        ctx.save();
        ctx.shadowColor=statue.color;
        ctx.shadowBlur=this.Q.glow ? 18 + pulse*12 : 0;
        if (_crImageReady(statueImg)) {
          const imgW = 74*spriteScale;
          const imgH = 92*spriteScale;
          ctx.imageSmoothingEnabled = this.quality !== "low";
          ctx.drawImage(statueImg, sx-imgW/2, sy-imgH*0.88, imgW, imgH);
        } else {
          ctx.fillStyle="#32243a";
          ctx.beginPath(); ctx.roundRect(sx-18*spriteScale,sy-62*spriteScale,36*spriteScale,56*spriteScale,6); ctx.fill();
          ctx.fillStyle=statue.color;
          ctx.beginPath(); ctx.arc(sx,sy-64*spriteScale,13*spriteScale,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle="rgba(0,0,0,0.68)"; ctx.fillRect(sx-54, sy-84*spriteScale, 108, 14);
        ctx.fillStyle=statue.color; ctx.font="bold 9px monospace"; ctx.textAlign="center";
        ctx.fillText("STATUE OF DEATH", sx, sy-73*spriteScale);
        if (playerDist < 76) {
          ctx.fillStyle="#ffdd66"; ctx.font="9px monospace";
          ctx.fillText("[E] claim", sx, sy+22);
        }
      } else if (item.kind === "portal" || item.kind === "exit") {
        const isExit = item.kind === "exit";
        const pulse = 0.5 + 0.5*Math.sin(this._frame*0.08);
        const portalImg = !isExit ? _crRuntimeAssetImage("home_portal", _crAssetTierForQuality(this.quality)) : null;
        ctx.save();
        ctx.shadowColor = isExit ? "#5cc878" : "#ff44ff"; ctx.shadowBlur = 18 + pulse*16;
        if (_crImageReady(portalImg)) {
          const imgW = 88*spriteScale;
          const imgH = 92*spriteScale;
          ctx.imageSmoothingEnabled = this.quality !== "low";
          // Multiply blend so white backgrounds in the portal PNG drop out
          // (Alpha 5: Wade reported "remove all white backgrounds from my
          // dungeon portals that have white backgrounds"). Multiply turns
          // white into transparent over a dark background, and keeps the
          // colored portal core intact.
          ctx.globalCompositeOperation = "screen";
          ctx.drawImage(portalImg, sx-imgW/2, sy-imgH*0.9, imgW, imgH);
          ctx.globalCompositeOperation = "source-over";
        } else {
          ctx.fillStyle = isExit ? `rgba(92,200,120,${0.45+pulse*0.28})` : `rgba(255,68,255,${0.55+pulse*0.35})`;
          ctx.beginPath(); ctx.ellipse(sx, sy, 28*spriteScale, 14*spriteScale, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = isExit ? "#9dffb2" : "#ffaaff";
          ctx.beginPath(); ctx.ellipse(sx, sy-18*spriteScale, 16*spriteScale, 26*spriteScale, 0, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle="#ffffff"; ctx.font="bold 10px monospace"; ctx.textAlign="center";
        ctx.fillText(isExit ? "WILDERNESS" : "DUNGEON", sx, sy-50);
        ctx.fillStyle=isExit ? "#b9ffc8" : "#cc88cc"; ctx.font="9px monospace";
        ctx.fillText("(walk here)", sx, sy-38);
      } else if (item.kind === "npc") {
        const n = item.npc;
        // Highlight ring if player is near
        const playerDist = Math.hypot(n.wx - p.wx, n.wy - p.wy);
        if (n.spotlight || n.musician || n.wander) {
          const pulse = 0.5 + 0.5*Math.sin(this._frame*0.06 + n.tx);
          ctx.save();
          ctx.globalAlpha = 0.35 + pulse*0.28;
          ctx.shadowColor = n.color;
          ctx.shadowBlur = this.Q.glow ? 16 + pulse*12 : 0;
          ctx.strokeStyle = n.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.ellipse(sx, sy+9*spriteScale, 28*spriteScale, 11*spriteScale, 0, 0, Math.PI*2); ctx.stroke();
          ctx.globalAlpha *= 0.36;
          ctx.fillStyle = n.color;
          ctx.beginPath(); ctx.ellipse(sx, sy+9*spriteScale, 25*spriteScale, 9*spriteScale, 0, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }
        if (playerDist < 80) {
          ctx.strokeStyle = n.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(sx, sy+8*spriteScale, 24*spriteScale, 10*spriteScale, 0, 0, Math.PI*2); ctx.stroke();
        }
        if (n.type === "waypoint") {
          const pulse = 0.5 + 0.5*Math.sin(this._frame*0.07);
          ctx.save();
          ctx.shadowColor = n.color; ctx.shadowBlur = 18 + pulse*16;
          ctx.fillStyle = `rgba(50,160,255,${0.25+pulse*0.22})`;
          ctx.beginPath(); ctx.ellipse(sx, sy+4*spriteScale, 30*spriteScale, 12*spriteScale, 0, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = n.color; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(sx, sy-18*spriteScale, 20*spriteScale, 0, Math.PI*2); ctx.stroke();
          ctx.strokeStyle = "#dff8ff"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(sx, sy-18*spriteScale, (8+pulse*5)*spriteScale, 0, Math.PI*2); ctx.stroke();
          ctx.fillStyle = "#bcecff";
          ctx.beginPath(); ctx.arc(sx, sy-18*spriteScale, 3*spriteScale, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        } else {
          // Sprite
          // Use full KayKit rendering for town NPCs — gives them real 3D models
          const npcState = n.musician ? "idle" : (n.wander ? "walk" : "idle");
          const npcSize = (n.musician || n.wander || n.spotlight) ? 48*spriteScale : 36*spriteScale;
          const npcAngle = n.musician ? Math.sin(this._frame*0.025)*0.15 : 0;
          this._drawCharSprite(ctx, sx, sy, n.spriteId, npcAngle, this._frame*0.6 + n.tx*7, npcSize, 1, false, {state:npcState});
          if (n.musician) {
            ctx.save();
            ctx.textAlign="center";
            const notes=["♪","♫","♬"];
            for (let i=0;i<3;i++) {
              const nt=(this._frame*0.025+i*0.33)%1;
              ctx.globalAlpha=1-nt;
              ctx.fillStyle=i===1?"#ffd06a":"#ffcc88";
              ctx.font=`bold ${Math.round(11+nt*5)}px serif`;
              ctx.fillText(notes[i], sx-18+i*18+Math.sin(this._frame*0.05+i)*5, sy-54*spriteScale-nt*28);
            }
            ctx.restore();
          }
        }
        // Name label
        ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(sx-44, sy-58, 88, 14);
        ctx.fillStyle=n.color; ctx.font="bold 10px monospace"; ctx.textAlign="center";
        ctx.fillText(n.name, sx, sy-47);
        if (playerDist < 80) {
          ctx.fillStyle="#ffdd66"; ctx.font="9px monospace";
          ctx.fillText("[E] interact", sx, sy+22);
        }
        // ── Ambient speech bubble — only when player is within talking range
        if (playerDist < 120 && CR_NPC_DIALOGUES[n.type]) {
          const line = this._npcAmbientLine(n);
          if (line) {
            ctx.font = "9px monospace";
            const tw = ctx.measureText(line).width;
            const padX = 8, padY = 5;
            const bw = Math.min(tw + padX*2, 240);
            const bh = 18;
            const bx = sx - bw/2, by = sy - 78;
            // Fade in/out by frame within the cycle for a soft transition
            const period = 300;
            const phase = ((this._frame + (n.tx||0)*47 + (n.ty||0)*13) % period) / period;
            const fade = phase < 0.06 ? phase/0.06 : phase > 0.94 ? (1-phase)/0.06 : 1;
            ctx.save();
            ctx.globalAlpha = 0.86 * fade;
            // Bubble background
            ctx.fillStyle = "rgba(12,8,4,0.92)";
            ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill();
            ctx.strokeStyle = n.color; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.stroke();
            // Tail
            ctx.fillStyle = "rgba(12,8,4,0.92)";
            ctx.beginPath();
            ctx.moveTo(sx-4, by+bh); ctx.lineTo(sx+4, by+bh); ctx.lineTo(sx, by+bh+5);
            ctx.closePath(); ctx.fill();
            // Text — clip to bubble width to avoid overflow
            ctx.fillStyle = "#e8dfc2"; ctx.textAlign = "center";
            const drawText = tw > bw - padX*2
              ? line.slice(0, Math.floor(line.length * (bw - padX*2) / tw) - 1) + "…"
              : line;
            ctx.fillText(drawText, sx, by + bh - padY - 1);
            ctx.restore();
          }
        }
      } else if (item.kind === "cow_portal") {
        // Secret Cow Level portal — green rift with cow emoji
        const pulse = 0.5 + 0.5 * Math.sin(this._frame * 0.12);
        ctx.save();
        ctx.shadowColor = "#44ff88"; ctx.shadowBlur = 24 + pulse * 18;
        ctx.globalAlpha = 0.7 + pulse * 0.3;
        ctx.fillStyle = `rgba(40,200,80,${0.5 + pulse * 0.3})`;
        ctx.beginPath(); ctx.ellipse(sx, sy, 30*spriteScale, 14*spriteScale, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = `rgba(68,255,136,${0.6 + pulse * 0.35})`;
        ctx.beginPath(); ctx.ellipse(sx, sy - 20*spriteScale, 18*spriteScale, 30*spriteScale, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#44ff88"; ctx.font = `bold ${Math.round(11*spriteScale)}px monospace`; ctx.textAlign = "center";
        ctx.fillText("🐄 STRANGE RIFT", sx, sy - 55*spriteScale);
        ctx.fillStyle = "#aaffcc"; ctx.font = `${Math.round(9*spriteScale)}px monospace`;
        ctx.fillText("(walk here)", sx, sy - 42*spriteScale);
      } else if (item.kind === "wanderer") {
        // Dark Wanderer — cloaked figure, semi-transparent
        const dw = this.darkWanderer;
        if (!dw) return;
        ctx.save();
        ctx.globalAlpha = dw.opacity * 0.88;
        ctx.shadowColor = "#220044"; ctx.shadowBlur = this.Q.glow ? 28 : 0;
        // Cloak body
        const hh = 52 * spriteScale;
        ctx.fillStyle = "#1a0030";
        ctx.beginPath();
        ctx.moveTo(sx, sy - hh);
        ctx.lineTo(sx - 18*spriteScale, sy + 4);
        ctx.lineTo(sx + 18*spriteScale, sy + 4);
        ctx.closePath(); ctx.fill();
        // Hood
        ctx.fillStyle = "#0a0018";
        ctx.beginPath(); ctx.ellipse(sx, sy - hh*0.82, 13*spriteScale, 16*spriteScale, 0, 0, Math.PI*2); ctx.fill();
        // Glowing eyes
        ctx.fillStyle = `rgba(255,60,0,${0.6 + 0.4*Math.sin(this._frame*0.1)})`;
        ctx.beginPath(); ctx.arc(sx - 4*spriteScale, sy - hh*0.78, 2.5*spriteScale, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 4*spriteScale, sy - hh*0.78, 2.5*spriteScale, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = dw.opacity * 0.75;
        ctx.fillStyle = "#8855bb"; ctx.font = `bold ${Math.round(9*spriteScale)}px monospace`; ctx.textAlign = "center";
        ctx.fillText("THE DARK WANDERER", sx, sy - hh - 8*spriteScale);
        ctx.globalAlpha = 1;
      } else if (item.kind === "player") {
        this._drawCharSprite(ctx, sx, sy, this.cls.id, p.angle, this._frame, 42*spriteScale, 1, p.bearForm, {state:this._playerAnimState()});
      } else if (item.kind === "merc") {
        this._drawCharSprite(ctx, sx, sy, "iron_warden", 0, this._frame*0.7, 36*spriteScale, 1, false, {uiMode:true});
      } else if (item.kind === "summon") {
        const sumSize = Math.max(22, 30 * spriteScale);
        this._drawSummonSprite(ctx, sx, sy, item.summon, this._frame, sumSize);
      } else if (item.kind === "marker") {
        ctx.strokeStyle = "#44ff88"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(sx, sy+6, 14, 6, 0, 0, Math.PI*2); ctx.stroke();
      }
    });

    // ── Building door prompts — show "[E] Enter NAME" when player is near ─────
    if (!this.currentBuilding && this.screen === "town") {
      const m = this.town?.map;
      if (m?.[0]) {
        const COLS = m[0].length, ROWS = m.length;
        const clusters = this._townBuildingClusters(COLS, ROWS);
        for (const cl of clusters) {
          const bwx = cl.tx * this.TS + this.TS/2;
          const bwy = cl.ty * this.TS + this.TS/2;
          const dist = Math.hypot(bwx - p.wx, bwy - p.wy);
          if (dist > 100) continue;
          // Project to screen
          let bsx, bsy;
          if (this.camera === "iso") {
            const s = this._worldToIso(bwx, bwy);
            bsx = s.sx; bsy = s.sy - this.TH * this._viewScale() * 2.8;
          } else if (this.camera === "third") {
            const s = this._entityScreen(bwx, bwy, W, H);
            bsx = s.sx; bsy = s.sy - 100;
          } else {
            const s = this._topToScreen(bwx, bwy, W, H);
            bsx = s.sx; bsy = s.sy - 40;
          }
          const label = cl.bid.replace(/_/g," ").toUpperCase();
          const pulse = 0.5 + 0.5 * Math.sin(this._frame * 0.12);
          ctx.save();
          ctx.globalAlpha = 0.75 + pulse * 0.22;
          ctx.fillStyle = "rgba(0,0,0,0.62)";
          ctx.beginPath(); ctx.roundRect(bsx - 54, bsy - 20, 108, 22, 4); ctx.fill();
          ctx.fillStyle = "#ffdd66";
          ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
          ctx.fillText(`[E] Enter ${label}`, bsx, bsy - 4);
          ctx.restore();
        }
      }
    }
  }

  _drawTownHUD(W,H) {
    this._drawHUD(W,H);
  }

  // ─── Character Sprite Renderer ───────────────────────────────────────────────
  // Look up the skill icon filename (matches CR_SKILL_ICONS in crypticAssets.js)
  // for skill at the given class index (0/1/2). Returns null if unknown.
  _skillIconName(skIdx) {
    return this.cls.skills[skIdx].iconName || null;
  }

  _playerAnimState() {
    const p = this.player;
    if (this.screen === "dead" || p.hp <= 0) return "death";
    if (p.hurtTimer > 0)   return "hurt";
    if (p.attackTimer > 0) return p.attackAnimState || "attack";
    return p.animState || "idle";
  }

  _drawMeshyStandIn(ctx, sx, sy, clsId, frame, size, alpha=1, state="idle") {
    const meshy = crMeshyActor(clsId);
    if (!meshy) return false;
    const pulse = 0.5 + 0.5 * Math.sin((frame || this._frame || 0) * 0.16);
    const moving = state === "walk" || state === "run";
    const attacking = String(state || "").includes("attack") || state === "cast" || state === "whirlwind";
    const stride = moving ? Math.sin((frame || this._frame || 0) * (state === "run" ? 0.42 : 0.28)) : 0;
    const s = size * Math.max(0.95, Math.min(1.18, meshy.scale || 1.12));
    const colors = clsId === "town_bard" || clsId === "bard_musician"
      ? { body:"#7a2eaa", trim:"#ffd06a", skin:"#e0a878", accent:"#4c1f75" }
      : clsId === "town_monk" || clsId === "monk"
        ? { body:"#d9b56c", trim:"#fff0b8", skin:"#d89a68", accent:"#7a4d20" }
        : { body:"#4f555c", trim:"#d6b65c", skin:"#b88a64", accent:"#2c3036" };
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(sx, sy - pulse * 1.5);
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.beginPath(); ctx.ellipse(0, s*0.28, s*0.46, s*0.12, 0, 0, Math.PI*2); ctx.fill();
    if (this.Q.glow) { ctx.shadowColor = colors.trim; ctx.shadowBlur = 8 + pulse*6; }

    ctx.fillStyle = colors.accent;
    ctx.fillRect(-s*0.26, -s*0.05 + stride*s*0.08, s*0.18, s*0.44);
    ctx.fillRect(s*0.08, -s*0.05 - stride*s*0.08, s*0.18, s*0.44);
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.moveTo(-s*0.34, -s*1.1); ctx.lineTo(s*0.34, -s*1.1);
    ctx.lineTo(s*0.44, s*0.02); ctx.lineTo(-s*0.44, s*0.02);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = colors.trim;
    ctx.fillRect(-s*0.36, -s*0.28, s*0.72, s*0.1);

    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = Math.max(2, s*0.07);
    ctx.beginPath();
    if (attacking) {
      ctx.moveTo(s*0.26, -s*0.88); ctx.lineTo(s*0.78, -s*1.26);
      ctx.moveTo(-s*0.26, -s*0.86); ctx.lineTo(-s*0.62, -s*0.62);
    } else {
      ctx.moveTo(s*0.26, -s*0.86); ctx.lineTo(s*0.52, -s*0.38 + stride*s*0.06);
      ctx.moveTo(-s*0.26, -s*0.86); ctx.lineTo(-s*0.52, -s*0.38 - stride*s*0.06);
    }
    ctx.stroke();

    ctx.fillStyle = colors.skin;
    ctx.beginPath(); ctx.arc(0, -s*1.38, s*0.22, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = colors.trim;
    ctx.textAlign = "center";
    ctx.font = `bold ${Math.round(s*0.32)}px serif`;
    if (clsId === "town_bard" || clsId === "bard_musician") ctx.fillText("♪", s*0.34, -s*1.26);
    else if (clsId === "town_monk" || clsId === "monk") {
      ctx.beginPath(); ctx.arc(0, -s*1.38, s*0.3, Math.PI*1.08, Math.PI*1.92); ctx.stroke();
    } else {
      ctx.fillRect(-s*0.24, -s*1.62, s*0.48, s*0.12);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
    return true;
  }

  _drawCharSprite(ctx, sx, sy, clsId, angle, frame, size, alpha=1, bearForm=false, opts={}) {
    const q = _normalizeQualityTier(this.quality);
    // Priority 1: user-uploaded skin override
    const img = CR_SKIN_CACHE[clsId];
    if (img && img.complete && img.naturalWidth>0) {
      ctx.save(); ctx.globalAlpha=alpha; ctx.translate(sx,sy);
      ctx.drawImage(img,-size*1.2,-size*2.4,size*2.4,size*2.8);
      ctx.restore(); ctx.globalAlpha=1; return;
    }
    const drawGlbActorFrame = (spriteFrame, isMeshyActor, actorMeta=null) => {
      if (!spriteFrame) return false;
      if (isMeshyActor && (!spriteFrame.width || !spriteFrame.height)) return false;
      const rawScale = actorMeta?.scale || 1.18;
      // 2026-05-23: Increased Meshy scale range from [0.82, 1.22] to [0.92, 1.38]
      // and base draw multiplier from 2.0 to 2.2 for more heroic presence.
      // QA feedback: Meshy actors were too small/cropped compared to KayKit.
      const qm = isMeshyActor ? Math.max(0.92, Math.min(1.38, rawScale)) : 1.0;
      const drawH = size * (isMeshyActor ? 2.2 : 2.05) * qm;
      const drawW = drawH * (spriteFrame.width / spriteFrame.height);
      const baseline = Number.isFinite(spriteFrame._crSpriteBaseline) ? spriteFrame._crSpriteBaseline : 0.88;
      const actorLift = opts.actorLift ?? 0;
      // yOffset from actor metadata — reduced influence to prevent sinking
      const actorYOffset = isMeshyActor ? (actorMeta?.yOffset || 0) * size * 0.6 : 0;
      // Gentle vertical bob for Meshy actors at idle — makes static-texture GLBs
      // (e.g. forest_sage) feel alive, and adds micro-movement to animated actors
      // at rest. Reduced amplitude from 6% to 3% for subtlety.
      const curState = opts.state || (this.screen === "dead" ? "death" : "idle");
      const idleBob = (isMeshyActor && (curState === "idle" || curState === "stunned"))
        ? Math.sin((this._frame || 0) * 0.11) * size * 0.03
        : 0;
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(sx, sy - idleBob);
      if (this.Q.shadows) {
        // Improved shadow: larger, more diffuse, anchored at feet baseline
        const shadowY = size * 0.04 + idleBob;
        const shadowRx = drawW * 0.38;
        const shadowRy = drawH * 0.065;
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath(); ctx.ellipse(0, shadowY, shadowRx, shadowRy, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.imageSmoothingEnabled = true;
      // Baseline correction: if baseline > 0.9, actor is likely floating — nudge down
      const baselineCorrection = baseline > 0.9 ? (baseline - 0.9) * size * 0.5 : 0;
      ctx.drawImage(spriteFrame, -drawW/2, -drawH * baseline - actorLift + actorYOffset + baselineCorrection, drawW, drawH);
      ctx.restore(); ctx.globalAlpha = 1;
      return true;
    };
    // Priority 1.5: KayKit GLB sprite — animated 3D model blitted as 2D canvas.
    // Available on medium/high/ultra. Uses AnimationMixer strips so chars
    // actually walk/attack instead of T-posing.
    if (!bearForm && !opts.uiMode && (q !== "low")) {
      // Auto-derive animation state from player movement/combat; opts.state overrides.
      const isHeroChar = clsId === this.cls?.id;
      const state = isHeroChar ? this._playerAnimState(opts) : (opts.state || "idle");
      const meshy = q === "ultra" ? crMeshyActor(clsId) : null;
      // Tier picks 128bit ONLY for Meshy actors. KayKit GLBs are baked at 64bit
      // (their geometry is low-poly, lighting is toon, 128bit just costs VRAM).
      // Without this, NPCs whose spriteIds resolve to KayKit-only adventurers
      // (npc_identifier → Mage.glb, npc_wardrobe → Rogue.glb, npc_merc_captain →
      // Barbarian.glb, etc.) would request 128bit strips that never exist, then
      // fall through to procedural silhouette rendering at ultra quality.
      const tier  = meshy ? this._glbTier() : "64bit";
      const glbUrl = this._kaykitUrlForActor(clsId, state);
      if (glbUrl) {
        // 8-directional for hero/meshy, 4-directional for non-player KayKit
        // Hero uses full 8-direction; non-player Meshy NPCs snap to front/back only
        // (those are the only 2 dirs preloaded for town NPCs, avoiding cache misses
        // that cause visible flickering when the bard/monk turns left or right).
        const dir = opts.dir
          || (isHeroChar
              ? this._dir8FromAngle(angle)
              : meshy
                ? (Math.sin(angle) >= 0 ? "front" : "back")
                : crVecToDir(Math.cos(angle), Math.sin(angle)));
        // Prefer animated GLB strips, then fall back to source GLB/FBX so
        // Cryptic can show the same source assets ArcForge previews directly.
        // The sourceUrl/fbxUrl entries below are intentional display fallbacks.
        const actorUrls = meshy
          ? [...new Set([glbUrl, meshy.url, meshy.walkUrl, meshy.runUrl, meshy.attackUrl, meshy.sourceUrl, meshy.fbxUrl].filter(Boolean))]
          : [glbUrl];
        let frame = null;
        for (const actorUrl of actorUrls) {
          frame = getGlbSpriteFrame(actorUrl, state, dir, tier)
               || getGlbSpriteFrame(actorUrl, "idle", dir, tier)
               || getCachedGlbSprite(actorUrl, dir, tier);
          if (frame) {
            if (drawGlbActorFrame(frame, !!meshy, meshy)) return;
          }
        }
        if (!frame) {
          // Not yet rendered — kick off 128-bit strips in the background
          actorUrls.slice(0, meshy ? 3 : 1).forEach(actorUrl => {
            preloadGlbStripsFireAndForget(actorUrl, ["idle", state], [dir], tier);
          });
          if (meshy) {
            // While the 128-bit Meshy strips are baking, show the KayKit 64-bit
            // body as a visible proxy so the player/NPC is never a featureless blob.
            const proxyUrl = this._kaykitFallbackUrlForActor(clsId);
            if (proxyUrl) {
              preloadGlbStripsFireAndForget(proxyUrl, ["idle", state], [dir], "64bit");
              const proxyFrame = getGlbSpriteFrame(proxyUrl, state, dir, "64bit")
                              || getGlbSpriteFrame(proxyUrl, "idle", dir, "64bit")
                              || getCachedGlbSprite(proxyUrl, dir, "64bit");
              if (proxyFrame?._crActorFrame === true && drawGlbActorFrame(proxyFrame, false, null)) return;
            }
            // KayKit proxy also not loaded yet — show a class-coloured silhouette
            const pulse = 0.5 + 0.5 * Math.sin((this._frame || 0) * 0.18);
            const s = size * Math.max(0.95, Math.min(1.18, meshy.scale || 1.12));
            const colors = clsId === "town_bard" || clsId === "bard_musician"
              ? { body:"#7a2eaa", trim:"#ffd06a", skin:"#e0a878" }
              : clsId === "town_monk" || clsId === "monk"
                ? { body:"#d9b56c", trim:"#fff0b8", skin:"#d89a68" }
                : { body:"#4f555c", trim:"#d6b65c", skin:"#b88a64" };
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(sx, sy - pulse * 2);
            ctx.fillStyle = "rgba(0,0,0,0.42)";
            ctx.beginPath(); ctx.ellipse(0, s*0.42, s*0.46, s*0.12, 0, 0, Math.PI*2); ctx.fill();
            ctx.shadowColor = colors.trim;
            ctx.shadowBlur = this.Q.glow ? 10 + pulse*8 : 0;
            ctx.fillStyle = colors.body;
            ctx.beginPath();
            ctx.moveTo(-s*0.32, -s*1.05); ctx.lineTo(s*0.32, -s*1.05);
            ctx.lineTo(s*0.43, s*0.18); ctx.lineTo(-s*0.43, s*0.18);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = colors.trim;
            ctx.fillRect(-s*0.36, -s*0.18, s*0.72, s*0.1);
            ctx.fillStyle = colors.skin;
            ctx.beginPath(); ctx.arc(0, -s*1.34, s*0.22, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = colors.trim;
            ctx.textAlign = "center";
            ctx.font = `bold ${Math.round(s*0.36)}px serif`;
            if (clsId === "town_bard" || clsId === "bard_musician") {
              ctx.fillText("♪", s*0.34, -s*1.3);
            } else if (clsId === "town_monk" || clsId === "monk") {
              ctx.lineWidth = Math.max(2, s*0.05);
              ctx.beginPath(); ctx.arc(0, -s*1.34, s*0.3, Math.PI*1.1, Math.PI*1.9); ctx.stroke();
            } else {
              ctx.fillRect(-s*0.24, -s*1.58, s*0.48, s*0.12);
            }
            ctx.shadowBlur = 0;
            ctx.restore();
            return;
          }
        }
        if (meshy) {
          const fallbackUrl = this._kaykitFallbackUrlForActor(clsId);
          if (fallbackUrl && !actorUrls.includes(fallbackUrl)) {
            const fallbackFrame = getGlbSpriteFrame(fallbackUrl, state, dir, "64bit")
                              || getGlbSpriteFrame(fallbackUrl, "idle", dir, "64bit")
                              || getCachedGlbSprite(fallbackUrl, dir, "64bit");
            if (drawGlbActorFrame(fallbackFrame, false, null)) return;
            preloadGlbStripsFireAndForget(fallbackUrl, ["idle", state], [dir], "64bit");
          }
        }
      }
      // Do not replace 128-bit actors with procedural stand-ins or sliced
      // texture atlases. Meshy stays real GLB-first; KayKit GLB is the only
      // temporary fallback while Meshy bakes.
      if (meshy) return;
    }
    // Priority 2: sprite atlas frames (when user has populated assets/ folder)
    if (!bearForm && !opts.uiMode) {
      const dir = opts.dir || crVecToDir(Math.cos(angle), Math.sin(angle));
      const state = opts.state || "idle";
      const frameIdx = opts.frameIdx || Math.floor((frame||0)/8);
      const atlas = getCrFrame(clsId, this.quality, state, dir, frameIdx);
      if (atlas) {
        const atlasSrc = String(atlas.src || "");
        const isUpscaledLowTier = q === "ultra" && !atlasSrc.includes("/128bit/");
        if (isUpscaledLowTier && !opts.forceAtlas) {
          // 128-bit should not be a blown-up 16/32/64-bit frame. Fall through to model-grade rendering.
        } else {
        const box = _crSpriteContentBounds(atlas) || { x:0, y:0, w:atlas.naturalWidth, h:atlas.naturalHeight };
        const normalizedH = opts.uiMode ? 2.05 : 2.22;
        const qm = opts.forceAtlas ? 1.0 : ({low:1.0, medium:1.03, high:1.06, ultra:1.08})[this.quality] || 1.0;
        const drawH = size * normalizedH * qm;
        const drawW = drawH * (box.w / Math.max(1, box.h));
        ctx.save(); ctx.globalAlpha=alpha; ctx.translate(sx,sy);
        // Drop shadow under feet (kept across all sprite types for grounding)
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath(); ctx.ellipse(0, size*0.35, drawW*0.32, drawH*0.07, 0, 0, Math.PI*2); ctx.fill();
        ctx.imageSmoothingEnabled = (this.quality !== "low");
        if (this.Q.detail >= 2) {
          ctx.globalAlpha = alpha * 0.28;
          ctx.filter = "brightness(0)";
          ctx.drawImage(atlas, box.x, box.y, box.w, box.h, -drawW/2 + drawW*0.045, -drawH + size*0.18 + drawH*0.035, drawW, drawH);
          ctx.filter = "none";
          ctx.globalAlpha = alpha;
        }
        ctx.drawImage(atlas, box.x, box.y, box.w, box.h, -drawW/2, -drawH + size*0.18, drawW, drawH);
        ctx.restore(); ctx.globalAlpha=1; return;
        }
      }
    }
    if (bearForm) {
      ctx.save(); ctx.translate(sx,sy); ctx.globalAlpha=alpha;
      ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(0,6,size*0.9,size*0.28,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#5a2a11"; ctx.beginPath(); ctx.arc(0,0,size,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#7a3a1a";
      ctx.beginPath(); ctx.arc(-size*0.72,-size*0.58,size*0.34,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(size*0.72,-size*0.58,size*0.34,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#4a1a08"; ctx.beginPath(); ctx.arc(size*0.28,-size*0.32,size*0.16,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(-size*0.28,-size*0.32,size*0.16,0,Math.PI*2); ctx.fill();
      ctx.restore(); ctx.globalAlpha=1; return;
    }
    if (q === "ultra") {
      this._drawModelGradeCharacter(ctx, sx, sy, clsId, angle, frame, size, alpha);
      return;
    }
    const d = CR_SPRITE_DEFS[clsId] || CR_SPRITE_DEFS.ember_witch;
    const s = size*0.8;
    const walk = Math.sin(frame*0.22)*s*0.18;
    ctx.save(); ctx.translate(sx,sy); ctx.globalAlpha=alpha;
    // Shadow
    ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(0,s*0.9,s*0.76,s*0.2,0,0,Math.PI*2); ctx.fill();
    // Legs
    const lc=d.robe||d.plate||d.cloak||"#334455";
    ctx.fillStyle=lc;
    ctx.fillRect(-s*0.28,s*0.15+walk,s*0.22,s*0.6);
    ctx.fillRect(s*0.06,s*0.15-walk,s*0.22,s*0.6);
    ctx.fillStyle=this._darken(lc,28);
    ctx.fillRect(-s*0.32,s*0.64+walk,s*0.3,s*0.18);
    ctx.fillRect(s*0.02,s*0.64-walk,s*0.3,s*0.18);
    // Body trapezoid
    const bc=d.robe||d.plate||d.cloak||"#445566";
    ctx.fillStyle=bc;
    ctx.beginPath(); ctx.moveTo(-s*0.52,-s*0.34); ctx.lineTo(s*0.52,-s*0.34);
    ctx.lineTo(s*0.32,s*0.18); ctx.lineTo(-s*0.32,s*0.18); ctx.closePath(); ctx.fill();
    ctx.fillStyle=this._lighten(bc,18);
    ctx.beginPath(); ctx.moveTo(-s*0.3,-s*0.3); ctx.lineTo(s*0.1,-s*0.3);
    ctx.lineTo(s*0.04,s*0.12); ctx.lineTo(-s*0.2,s*0.12); ctx.closePath(); ctx.fill();
    // Arms
    ctx.fillStyle=this._darken(bc,12);
    ctx.fillRect(-s*0.66,-s*0.28,s*0.18,s*0.44);
    ctx.fillRect(s*0.48,-s*0.28,s*0.18,s*0.44);
    // Head
    ctx.fillStyle=d.skin||"#dd9966";
    ctx.beginPath(); ctx.arc(0,-s*0.65,s*0.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(0,0,0,0.45)";
    ctx.beginPath(); ctx.arc(-s*0.1,-s*0.67,s*0.06,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(s*0.1,-s*0.67,s*0.06,0,Math.PI*2); ctx.fill();
    if (d.hair) { ctx.fillStyle=d.hair; ctx.beginPath(); ctx.arc(0,-s*0.76,s*0.26,Math.PI,Math.PI*2); ctx.fill(); }
    // Headgear
    if (d.hat) {
      ctx.fillStyle=d.hat;
      ctx.beginPath(); ctx.moveTo(-s*0.36,-s*0.8); ctx.lineTo(s*0.04,-s*1.5); ctx.lineTo(s*0.36,-s*0.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle=this._lighten(d.hat,18); ctx.fillRect(-s*0.52,-s*0.86,s*1.04,s*0.12);
    } else if (d.helm) {
      ctx.fillStyle=d.helm;
      ctx.beginPath(); ctx.arc(0,-s*0.68,s*0.35,Math.PI,Math.PI*2); ctx.fill();
      ctx.fillRect(-s*0.35,-s*0.68,s*0.7,s*0.12);
      ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(-s*0.22,-s*0.68,s*0.16,s*0.06); ctx.fillRect(s*0.06,-s*0.68,s*0.16,s*0.06);
    } else if (d.hood) {
      ctx.fillStyle=d.hood;
      ctx.beginPath(); ctx.arc(0,-s*0.67,s*0.36,Math.PI*1.06,Math.PI*1.94); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s*0.36,-s*0.67); ctx.lineTo(-s*0.56,-s*0.28); ctx.lineTo(-s*0.32,-s*0.26); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s*0.36,-s*0.67); ctx.lineTo(s*0.56,-s*0.28); ctx.lineTo(s*0.32,-s*0.26); ctx.closePath(); ctx.fill();
    } else if (d.antler) {
      ctx.fillStyle=d.antler; ctx.strokeStyle=d.antler; ctx.lineWidth=s*0.11;
      ctx.beginPath(); ctx.moveTo(-s*0.22,-s*0.88); ctx.quadraticCurveTo(-s*0.55,-s*1.38,-s*0.44,-s*1.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s*0.36,-s*1.18); ctx.lineTo(-s*0.65,-s*1.44); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s*0.22,-s*0.88); ctx.quadraticCurveTo(s*0.55,-s*1.38,s*0.44,-s*1.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s*0.36,-s*1.18); ctx.lineTo(s*0.65,-s*1.44); ctx.stroke();
      ctx.lineWidth=1;
    }
    // Weapon
    const wa=angle;
    if (d.type==="mage"||d.type==="necro"||d.type==="druid") {
      ctx.strokeStyle=d.staffC||"#886633"; ctx.lineWidth=s*0.1;
      const tipX=s*0.55+Math.cos(wa)*s*1.3, tipY=-s*0.1+Math.sin(wa)*s*1.3;
      ctx.beginPath(); ctx.moveTo(s*0.55,-s*0.1); ctx.lineTo(tipX,tipY); ctx.stroke();
      ctx.lineWidth=1;
      if (this.Q.glow){ctx.shadowColor=d.staffC||"#8844ff";ctx.shadowBlur=12;}
      ctx.fillStyle=d.staffC||"#8844ff"; ctx.beginPath(); ctx.arc(tipX,tipY,s*0.22,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    } else if (d.type==="rogue") {
      ctx.fillStyle=d.bladC||"#ccddee";
      ctx.save(); ctx.translate(-s*0.6,s*0.06); ctx.rotate(-0.45);
      ctx.fillRect(-s*0.05,-s*0.54,s*0.1,s*0.58); ctx.fillStyle="#cc8833"; ctx.fillRect(-s*0.15,-s*0.06,s*0.3,s*0.1); ctx.restore();
      ctx.fillStyle=d.bladC||"#ccddee";
      ctx.save(); ctx.translate(s*0.6,s*0.06); ctx.rotate(0.45);
      ctx.fillRect(-s*0.05,-s*0.54,s*0.1,s*0.58); ctx.fillStyle="#cc8833"; ctx.fillRect(-s*0.15,-s*0.06,s*0.3,s*0.1); ctx.restore();
    } else if (d.type==="archer") {
      ctx.save(); ctx.translate(s*0.52,0); ctx.rotate(wa);
      ctx.strokeStyle=d.bowC||"#885533"; ctx.lineWidth=s*0.11;
      ctx.beginPath(); ctx.arc(0,0,s*0.62,-1.15,1.15); ctx.stroke();
      ctx.strokeStyle="#ccaa77"; ctx.lineWidth=s*0.04;
      ctx.beginPath(); ctx.moveTo(0,-s*0.6); ctx.lineTo(s*0.34,0); ctx.lineTo(0,s*0.6); ctx.stroke();
      ctx.lineWidth=1; ctx.restore();
    } else if (d.type==="warrior") {
      ctx.save(); ctx.translate(s*0.64,-s*0.1); ctx.rotate(wa+0.5);
      ctx.fillStyle="#ccddee"; ctx.fillRect(-s*0.08,0,s*0.16,s*1.0);
      ctx.fillStyle="#cc8833"; ctx.fillRect(-s*0.22,-s*0.06,s*0.44,s*0.13);
      ctx.fillStyle="#886633"; ctx.beginPath(); ctx.arc(0,-s*0.04,s*0.12,0,Math.PI*2); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(-s*0.72,0);
      ctx.fillStyle=d.swordC||"#4466aa";
      ctx.beginPath(); ctx.moveTo(0,-s*0.46); ctx.lineTo(s*0.32,0); ctx.lineTo(0,s*0.46); ctx.lineTo(-s*0.32,0); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (d.type==="paladin") {
      ctx.save(); ctx.translate(s*0.68,-s*0.2); ctx.rotate(wa+0.3);
      ctx.strokeStyle="#886633"; ctx.lineWidth=s*0.12;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-s*0.9); ctx.stroke(); ctx.lineWidth=1;
      ctx.fillStyle=d.maceC||"#ccaa44"; ctx.beginPath(); ctx.arc(0,-s*0.95,s*0.26,0,Math.PI*2); ctx.fill();
      for(let mi=0;mi<4;mi++){const ma=mi*Math.PI/2;ctx.fillStyle=this._lighten(d.maceC||"#ccaa44",22);ctx.beginPath();ctx.arc(Math.cos(ma)*s*0.3,-s*0.95+Math.sin(ma)*s*0.3,s*0.1,0,Math.PI*2);ctx.fill();}
      ctx.restore();
      ctx.save(); ctx.translate(-s*0.75,0);
      ctx.fillStyle=d.maceC||"#ccaa44";
      ctx.beginPath(); ctx.moveTo(-s*0.24,-s*0.54); ctx.lineTo(s*0.24,-s*0.54); ctx.lineTo(s*0.3,s*0.08); ctx.lineTo(0,s*0.54); ctx.lineTo(-s*0.3,s*0.08); ctx.closePath(); ctx.fill();
      ctx.fillStyle=this._lighten(d.maceC||"#ccaa44",28); ctx.beginPath(); ctx.moveTo(-s*0.12,-s*0.38); ctx.lineTo(s*0.12,-s*0.38); ctx.lineTo(s*0.16,0); ctx.lineTo(0,s*0.34); ctx.lineTo(-s*0.16,0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore(); ctx.globalAlpha=1;
  }

  // ─── Enemy Sprite Renderer ────────────────────────────────────────────────────
  _drawSummonSprite(ctx, sx, sy, summon, frame, size, opts={}) {
    const pet = {
      ...summon,
      type: summon.monsterType || "skeleton",
      assetId: summon.assetId || "summon_skeleton",
      modelId: summon.modelId || summon.assetId || "summon_skeleton",
      size,
      isDead:false,
      frozen:0,
    };
    ctx.save();
    ctx.globalAlpha=opts.alpha ?? 1;
    ctx.shadowColor=summon.color || "#d8d2b2";
    ctx.shadowBlur=this.Q.glow ? Math.max(8,size*0.6) : 0;
    ctx.strokeStyle="rgba(132,190,255,0.75)";
    ctx.lineWidth=Math.max(1.5,size*0.08);
    ctx.beginPath(); ctx.ellipse(sx,sy+size*0.55,size*0.86,size*0.22,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
    this._drawEnemySprite(ctx,sx,sy,pet,frame);
    ctx.save();
    ctx.fillStyle="#84beff";
    ctx.shadowColor="#84beff";
    ctx.shadowBlur=this.Q.glow ? 8 : 0;
    ctx.beginPath(); ctx.arc(sx-size*0.18,sy-size*0.54,size*0.055,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx+size*0.18,sy-size*0.54,size*0.055,0,Math.PI*2); ctx.fill();
    if (opts.label !== false && this.Q.detail>0) {
      ctx.shadowBlur=0;
      ctx.fillStyle="rgba(0,0,0,0.62)";
      ctx.fillRect(sx-size*1.08,sy-size*1.55,size*2.16,Math.max(10,size*0.34));
      ctx.fillStyle="#d8d2b2";
      ctx.font=`bold ${Math.max(7,Math.round(size*0.26))}px monospace`;
      ctx.textAlign="center";
      ctx.fillText(summon.name || "PET SKELETON", sx, sy-size*1.3);
    }
    ctx.restore();
  }

  _drawModelGradeCharacter(ctx, sx, sy, clsId, angle, frame, size, alpha=1) {
    const d = CR_SPRITE_DEFS[clsId] || CR_SPRITE_DEFS.ember_witch;
    const model = crActorAsset(clsId) || crModelTarget(clsId);
    const s = size * 1.02;
    const walk = Math.sin(frame*0.18) * s * 0.08;
    const facing = Math.cos(angle) < -0.2 ? -1 : 1;
    const metal = d.plate || d.helm || d.maceC || "#73808d";
    const cloth = d.robe || d.cloak || d.hood || "#46243a";
    const trim = d.staffC || d.bladC || d.bowC || d.swordC || d.maceC || "#caa86a";
    const skin = d.skin || "#c98b62";
    ctx.save(); ctx.translate(sx, sy); ctx.scale(facing, 1); ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(0,0,0,0.36)"; ctx.beginPath(); ctx.ellipse(0, s*0.62, s*0.78, s*0.2, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = this._darken(cloth, 10);
    ctx.beginPath(); ctx.roundRect(-s*0.34, s*0.06+walk, s*0.22, s*0.68, s*0.06); ctx.fill();
    ctx.beginPath(); ctx.roundRect(s*0.12, s*0.06-walk, s*0.22, s*0.68, s*0.06); ctx.fill();
    ctx.fillStyle = this._darken(metal, 22);
    ctx.beginPath(); ctx.roundRect(-s*0.42, s*0.58+walk, s*0.34, s*0.19, s*0.04); ctx.fill();
    ctx.beginPath(); ctx.roundRect(s*0.08, s*0.58-walk, s*0.34, s*0.19, s*0.04); ctx.fill();
    ctx.fillStyle = d.type === "warrior" ? this._lighten(skin, 16) : cloth;
    ctx.beginPath(); ctx.moveTo(-s*0.5,-s*0.44); ctx.lineTo(s*0.5,-s*0.44); ctx.lineTo(s*0.38,s*0.1); ctx.lineTo(s*0.24,s*0.32); ctx.lineTo(-s*0.24,s*0.32); ctx.lineTo(-s*0.38,s*0.1); ctx.closePath(); ctx.fill();
    if (d.type !== "mage" && d.type !== "necro" && d.type !== "druid") {
      ctx.fillStyle = this._lighten(metal, 10);
      ctx.beginPath(); ctx.roundRect(-s*0.42,-s*0.24,s*0.84,s*0.42,s*0.08); ctx.fill();
      ctx.strokeStyle = this._darken(metal, 28); ctx.lineWidth = Math.max(1, s*0.035); ctx.strokeRect(-s*0.3,-s*0.12,s*0.6,s*0.24); ctx.lineWidth = 1;
      ctx.fillStyle = trim; ctx.beginPath(); ctx.arc(0,0,s*0.16,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = d.type === "warrior" ? skin : this._darken(cloth, 8);
    ctx.beginPath(); ctx.roundRect(-s*0.68,-s*0.34,s*0.22,s*0.54,s*0.08); ctx.fill();
    ctx.beginPath(); ctx.roundRect(s*0.46,-s*0.34,s*0.22,s*0.54,s*0.08); ctx.fill();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0,-s*0.75,s*0.28,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = this._darken(skin, 20); ctx.beginPath(); ctx.ellipse(-s*0.1,-s*0.78,s*0.045,s*0.035,0,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(s*0.1,-s*0.78,s*0.045,s*0.035,0,0,Math.PI*2); ctx.fill(); ctx.fillRect(-s*0.11,-s*0.62,s*0.22,s*0.035);
    if (d.type === "warrior") {
      ctx.strokeStyle = "#267060"; ctx.lineWidth = Math.max(1, s*0.05); ctx.beginPath(); ctx.moveTo(-s*0.38,-s*0.38); ctx.lineTo(-s*0.05,-s*0.08); ctx.moveTo(s*0.38,-s*0.38); ctx.lineTo(s*0.05,-s*0.08); ctx.stroke(); ctx.lineWidth = 1;
    }
    const headC = d.hat || d.hood || d.helm;
    if (headC) { ctx.fillStyle = headC; ctx.beginPath(); ctx.arc(0,-s*0.82,s*0.34,Math.PI*1.02,Math.PI*1.98); ctx.fill(); if (d.hat) { ctx.beginPath(); ctx.moveTo(-s*0.3,-s*0.88); ctx.lineTo(s*0.06,-s*1.5); ctx.lineTo(s*0.34,-s*0.88); ctx.closePath(); ctx.fill(); } }
    ctx.save();
    if (d.type === "mage" || d.type === "necro" || d.type === "druid") {
      ctx.strokeStyle = this._darken(trim, 10); ctx.lineWidth = s*0.08; ctx.beginPath(); ctx.moveTo(s*0.52,s*0.16); ctx.lineTo(s*0.82,-s*1.1); ctx.stroke();
      ctx.shadowColor = trim; ctx.shadowBlur = 18; ctx.fillStyle = trim; ctx.beginPath(); ctx.arc(s*0.82,-s*1.16,s*0.18,0,Math.PI*2); ctx.fill();
    } else if (d.type === "archer") {
      ctx.strokeStyle = trim; ctx.lineWidth = s*0.08; ctx.beginPath(); ctx.arc(s*0.72,-s*0.06,s*0.56,-1.2,1.2); ctx.stroke();
      ctx.strokeStyle = "#e0c78e"; ctx.lineWidth = s*0.025; ctx.beginPath(); ctx.moveTo(s*0.72,-s*0.62); ctx.lineTo(s*0.98,-s*0.06); ctx.lineTo(s*0.72,s*0.5); ctx.stroke();
    } else {
      ctx.translate(s*0.72,-s*0.18); ctx.rotate(0.35); ctx.fillStyle = "#c9d4e4"; ctx.fillRect(-s*0.055,-s*0.78,s*0.11,s*0.92); ctx.fillStyle = trim; ctx.fillRect(-s*0.22,-s*0.06,s*0.44,s*0.12);
    }
    ctx.restore();
    ctx.restore(); ctx.globalAlpha = 1;
  }

  _drawEnemySprite(ctx, sx, sy, e, frame) {
    const q = _normalizeQualityTier(this.quality);
    const d = CR_ENEMY_DEFS[e.type]||CR_ENEMY_DEFS[e.monsterType]||{b:"#666",s:"#888",l:"#444",t:"zombie"};
    if (e.isDead) {
      ctx.globalAlpha=0.38; ctx.fillStyle=d.b;
      ctx.save(); ctx.translate(sx,sy); ctx.beginPath(); ctx.ellipse(0,0,e.size,e.size*0.38,0,0,Math.PI*2); ctx.fill();
      ctx.restore(); ctx.globalAlpha=1; return;
    }
    // KayKit GLB sprite for monsters — animated strips (medium+ quality).
    if (!e.flatSprite && (q !== "low")) {
      const now        = this._frame || 0;
      const recentAtk  = e.lastAtk  && (now - (e.lastAtk||0))  < 22;
      const recentHurt = e.lastHurt && (now - (e.lastHurt||0)) < 12;
      const pDist      = Math.hypot((e.wx||0)-(this.player?.wx||0),(e.wy||0)-(this.player?.wy||0));
      const enemyMoving = e.animState === "walk" || e.animState === "run"
        || (pDist < 420 && pDist > (e.size||24)+8 && !e.isDead);
      const eState     = e.isDead
        ? "death"
        : (recentAtk ? "attack" : (recentHurt ? "hurt" : (enemyMoving ? (e.animState==="run"?"run":"walk") : "idle")));
      const glbTier = this._glbTier();
      const glbUrl  = this._kaykitUrlForActor(e.assetId, eState)
                   || this._kaykitUrlForActor(e.type, eState)
                   || this._kaykitUrlForActor(e.monsterType, eState);
      if (glbUrl) {
        const ang  = e.angle ?? (e.targetAngle ?? Math.atan2((e.dy||0),(e.dx||0)));
        // 8-directional for bosses & Meshy, 4-dir for regular KayKit monsters
        const meshy = q === "ultra" ? (crMeshyActor(e.assetId) || crMeshyActor(e.type) || crMeshyActor(e.monsterType)) : null;
        const dir   = (e.isBoss || meshy)
          ? this._dir8FromAngle(ang)
          : crVecToDir(Math.cos(ang||0), Math.sin(ang||0));
        const actorUrls = meshy
          ? [...new Set([glbUrl, meshy.url, meshy.walkUrl, meshy.runUrl, meshy.attackUrl, meshy.sourceUrl, meshy.fbxUrl].filter(Boolean))]
          : [glbUrl];
        let glbFrame = null;
        for (const actorUrl of actorUrls) {
          glbFrame = getGlbSpriteFrame(actorUrl, eState, dir, glbTier)
                  || getGlbSpriteFrame(actorUrl, "idle", dir, glbTier)
                  || getCachedGlbSprite(actorUrl, dir, glbTier);
          if (glbFrame) break;
        }
        if (glbFrame) {
          const sz    = e.size || 24;
          const drawH = sz * (meshy ? (e.isBoss ? 2.55 : 2.08) : (e.isBoss ? 2.45 : 1.95)) * (meshy?.scale || 1);
          const drawW = drawH * (glbFrame.width / glbFrame.height);
          const baseline = Number.isFinite(glbFrame._crSpriteBaseline) ? glbFrame._crSpriteBaseline : 0.88;
          ctx.save(); ctx.translate(sx, sy);
          if (this.Q.shadows) {
            ctx.fillStyle = "rgba(0,0,0,0.38)";
            ctx.beginPath(); ctx.ellipse(0, sz*0.08, drawW*0.3, drawH*0.055, 0, 0, Math.PI*2); ctx.fill();
          }
          ctx.imageSmoothingEnabled = true;
          if (e.frozen > 0) ctx.filter = "hue-rotate(190deg) brightness(1.12)";
          ctx.drawImage(glbFrame, -drawW/2, -drawH * baseline, drawW, drawH);
          ctx.filter = "none";
          ctx.restore(); return;
        } else {
          actorUrls.slice(0, meshy ? 4 : 1).forEach(actorUrl => {
            preloadGlbStripsFireAndForget(actorUrl, meshy ? ["idle", eState] : ["idle","walk","attack","death","hurt"], [dir], glbTier);
          });
        }
      }
    }
    if (q === "ultra" && !e.flatSprite) {
      this._drawModelGradeEnemy(ctx, sx, sy, e, d, frame);
      return;
    }
    const bc=e.frozen>0 ? "#88ccff" : d.b, sc=e.frozen>0 ? "#aaddff" : d.s, lc=e.frozen>0 ? "#66aacc" : d.l;
    const sz=e.size;
    ctx.save(); ctx.translate(sx,sy);
    ctx.fillStyle="rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.ellipse(0,sz*0.6,sz*0.72,sz*0.2,0,0,Math.PI*2); ctx.fill();
    const walk=Math.sin(frame*0.2)*sz*0.2;
    switch(d.t){
      case "skeleton": this._spSkeleton(ctx,sz,bc,sc,walk); break;
      case "beast":    this._spBeast(ctx,sz,bc,sc,lc,walk); break;
      case "giant":    this._spGiant(ctx,sz,bc,sc,lc,walk); break;
      case "imp":      this._spImp(ctx,sz,bc,sc,walk); break;
      case "ghost":    this._spGhost(ctx,sz,bc,sc); break;
      case "caster":   this._spCaster(ctx,sz,bc,sc,lc,walk); break;
      case "knight":   this._spKnight(ctx,sz,bc,sc,lc,walk); break;
      case "plant":    this._spPlant(ctx,sz,bc,sc); break;
      case "golem":    this._spGolem(ctx,sz,bc,sc,lc,walk); break;
      case "demon":    this._spDemon(ctx,sz,bc,sc,lc,walk); break;
      default:         this._spZombie(ctx,sz,bc,sc,lc,walk);
    }
    ctx.restore();
  }

  _drawModelGradeEnemy(ctx, sx, sy, e, d, frame) {
    const model = crActorAsset(e.assetId || e.modelId || e.type) || crModelTarget(e.assetId || e.modelId || e.type);
    const sz = e.size * (e.isBoss ? 1.55 : 1.18);
    const pulse = 1 + Math.sin(frame*0.08) * 0.035;
    const b = e.frozen>0 ? "#88ccff" : d.b;
    const s = e.frozen>0 ? "#d8f0ff" : d.s;
    const l = e.frozen>0 ? "#66aacc" : d.l;
    ctx.save(); ctx.translate(sx, sy); ctx.scale(pulse, pulse);
    ctx.fillStyle="rgba(0,0,0,0.34)"; ctx.beginPath(); ctx.ellipse(0,sz*0.72,sz*0.86,sz*0.22,0,0,Math.PI*2); ctx.fill();
    if (this.Q.glow) { ctx.shadowColor=e.isBoss ? e.color : b; ctx.shadowBlur=e.isBoss ? 24 : 10; }
    if (d.t === "beast") {
      ctx.fillStyle=this._darken(b,12); ctx.beginPath(); ctx.ellipse(0,0,sz*0.78,sz*0.38,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=l; [-0.45,-0.15,0.18,0.48].forEach((x,i)=>{ctx.beginPath();ctx.roundRect(sz*x,sz*0.18+(i%2?4:-4),sz*0.16,sz*0.62,sz*0.06);ctx.fill();});
      ctx.fillStyle=s; ctx.beginPath(); ctx.arc(sz*0.58,-sz*0.2,sz*0.32,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=this._darken(s,20); ctx.beginPath(); ctx.moveTo(sz*0.44,-sz*0.44); ctx.lineTo(sz*0.3,-sz*0.8); ctx.lineTo(sz*0.62,-sz*0.52); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sz*0.72,-sz*0.42); ctx.lineTo(sz*0.92,-sz*0.76); ctx.lineTo(sz*0.86,-sz*0.36); ctx.closePath(); ctx.fill();
    } else if (d.t === "ghost") {
      ctx.globalAlpha*=0.78; ctx.fillStyle=b; ctx.beginPath(); ctx.arc(0,-sz*0.26,sz*0.52,Math.PI,Math.PI*2); ctx.fill(); ctx.fillRect(-sz*0.52,-sz*0.26,sz*1.04,sz*0.78);
      ctx.fillStyle=s; ctx.beginPath(); ctx.arc(0,-sz*0.42,sz*0.34,0,Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle=l; ctx.beginPath(); ctx.roundRect(-sz*0.34,sz*0.08,sz*0.25,sz*0.74,sz*0.06); ctx.fill(); ctx.beginPath(); ctx.roundRect(sz*0.09,sz*0.08,sz*0.25,sz*0.74,sz*0.06); ctx.fill();
      ctx.fillStyle=b; ctx.beginPath(); ctx.roundRect(-sz*0.52,-sz*0.45,sz*1.04,sz*0.72,sz*0.12); ctx.fill();
      ctx.fillStyle=s; ctx.beginPath(); ctx.arc(0,-sz*0.72,sz*(d.t==="giant"||e.isBoss?0.42:0.31),0,Math.PI*2); ctx.fill();
      if (d.t==="skeleton") { ctx.strokeStyle=this._darken(s,34); ctx.lineWidth=sz*0.06; for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-sz*0.34,-sz*0.26+i*sz*0.1);ctx.lineTo(sz*0.34,-sz*0.26+i*sz*0.1);ctx.stroke();} }
      if (d.t==="demon"||e.isBoss) { ctx.fillStyle=this._darken(b,16); [-1,1].forEach(side=>{ctx.beginPath();ctx.moveTo(side*sz*0.18,-sz*0.95);ctx.lineTo(side*sz*0.5,-sz*1.34);ctx.lineTo(side*sz*0.36,-sz*0.84);ctx.closePath();ctx.fill();}); }
      if (d.t==="knight"||d.t==="golem") { ctx.fillStyle=this._lighten(b,16); ctx.fillRect(-sz*0.38,-sz*0.34,sz*0.76,sz*0.18); ctx.strokeStyle=this._darken(b,28); ctx.strokeRect(-sz*0.32,-sz*0.16,sz*0.64,sz*0.28); }
    }
    ctx.shadowBlur=0;
    ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.beginPath(); ctx.arc(-sz*0.11,-sz*0.72,sz*0.07,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(sz*0.11,-sz*0.72,sz*0.07,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  _spZombie(ctx,sz,b,s,l,w){
    ctx.fillStyle=l; ctx.fillRect(-sz*0.26,sz*0.1+w,sz*0.22,sz*0.56); ctx.fillRect(sz*0.04,sz*0.1-w,sz*0.22,sz*0.56);
    ctx.fillStyle=b; ctx.beginPath(); ctx.moveTo(-sz*0.4,-sz*0.18); ctx.lineTo(sz*0.4,-sz*0.18); ctx.lineTo(sz*0.3,sz*0.14); ctx.lineTo(-sz*0.3,sz*0.14); ctx.closePath(); ctx.fill();
    ctx.fillStyle=this._darken(b,20); ctx.fillRect(-sz*0.7,-sz*0.16,sz*0.36,sz*0.16); ctx.fillRect(sz*0.34,-sz*0.16,sz*0.36,sz*0.16);
    ctx.fillStyle=s; ctx.beginPath(); ctx.arc(0,-sz*0.4,sz*0.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.arc(-sz*0.11,-sz*0.42,sz*0.08,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(sz*0.11,-sz*0.42,sz*0.08,0,Math.PI*2); ctx.fill();
  }
  _spSkeleton(ctx,sz,b,s,w){
    ctx.fillStyle=b; ctx.fillRect(-sz*0.08,sz*0.04+w,sz*0.14,sz*0.52); ctx.fillRect(sz*0.04,sz*0.04-w,sz*0.14,sz*0.52);
    ctx.fillRect(-sz*0.3,-sz*0.22,sz*0.6,sz*0.3);
    ctx.strokeStyle=this._darken(b,30); ctx.lineWidth=sz*0.06;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-sz*0.27,-sz*0.14+i*sz*0.09);ctx.lineTo(sz*0.27,-sz*0.14+i*sz*0.09);ctx.stroke();}
    ctx.fillStyle=b; ctx.fillRect(-sz*0.58,-sz*0.18,sz*0.28,sz*0.1); ctx.fillRect(sz*0.3,-sz*0.18,sz*0.28,sz*0.1);
    ctx.lineWidth=1;
    ctx.fillStyle=s; ctx.beginPath(); ctx.arc(0,-sz*0.44,sz*0.28,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(0,0,0,0.85)"; ctx.beginPath(); ctx.arc(-sz*0.1,-sz*0.46,sz*0.1,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(sz*0.1,-sz*0.46,sz*0.1,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=this._darken(s,22); ctx.fillRect(-sz*0.2,-sz*0.2,sz*0.4,sz*0.1);
  }
  _spBeast(ctx,sz,b,s,l,w){
    ctx.fillStyle=l; ctx.beginPath(); ctx.ellipse(-sz*0.2,sz*0.3+w,sz*0.14,sz*0.38,0.3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sz*0.2,sz*0.3-w,sz*0.14,sz*0.38,-0.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=b; ctx.beginPath(); ctx.ellipse(0,-sz*0.04,sz*0.44,sz*0.3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=this._darken(b,22);
    ctx.beginPath(); ctx.moveTo(-sz*0.44,sz*0.06); ctx.lineTo(-sz*0.76,sz*0.42); ctx.lineTo(-sz*0.58,sz*0.44); ctx.lineTo(-sz*0.28,sz*0.1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*0.44,sz*0.06); ctx.lineTo(sz*0.76,sz*0.42); ctx.lineTo(sz*0.58,sz*0.44); ctx.lineTo(sz*0.28,sz*0.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle=s; ctx.beginPath(); ctx.arc(0,-sz*0.44,sz*0.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=this._darken(s,12); ctx.beginPath(); ctx.ellipse(sz*0.1,-sz*0.4,sz*0.18,sz*0.12,0.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=b;
    ctx.beginPath(); ctx.moveTo(-sz*0.26,-sz*0.58); ctx.lineTo(-sz*0.48,-sz*0.86); ctx.lineTo(-sz*0.1,-sz*0.62); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*0.26,-sz*0.58); ctx.lineTo(sz*0.48,-sz*0.86); ctx.lineTo(sz*0.1,-sz*0.62); ctx.closePath(); ctx.fill();
  }
  _spGiant(ctx,sz,b,s,l,w){
    ctx.fillStyle=l; ctx.fillRect(-sz*0.42,sz*0.1+w,sz*0.4,sz*0.78); ctx.fillRect(sz*0.02,sz*0.1-w,sz*0.4,sz*0.78);
    ctx.fillStyle=b; ctx.beginPath(); ctx.moveTo(-sz*0.76,-sz*0.44); ctx.lineTo(sz*0.76,-sz*0.44); ctx.lineTo(sz*0.52,sz*0.18); ctx.lineTo(-sz*0.52,sz*0.18); ctx.closePath(); ctx.fill();
    ctx.fillStyle=this._darken(b,18); ctx.fillRect(-sz*1.06,-sz*0.4,sz*0.34,sz*0.6); ctx.fillRect(sz*0.72,-sz*0.4,sz*0.34,sz*0.6);
    ctx.fillStyle=s; ctx.beginPath(); ctx.arc(0,-sz*0.72,sz*0.44,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.arc(-sz*0.15,-sz*0.76,sz*0.12,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(sz*0.15,-sz*0.76,sz*0.12,0,Math.PI*2); ctx.fill();
  }
  _spImp(ctx,sz,b,s,w){
    ctx.globalAlpha*=0.75;
    ctx.fillStyle=b;
    ctx.beginPath(); ctx.moveTo(-sz*0.1,-sz*0.1); ctx.lineTo(-sz*0.84,-sz*0.64); ctx.lineTo(-sz*0.64,sz*0.24); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*0.1,-sz*0.1); ctx.lineTo(sz*0.84,-sz*0.64); ctx.lineTo(sz*0.64,sz*0.24); ctx.closePath(); ctx.fill();
    ctx.globalAlpha=Math.min(1,(ctx.globalAlpha/0.75));
    ctx.fillRect(-sz*0.24,sz*0.04+w,sz*0.2,sz*0.44); ctx.fillRect(sz*0.04,sz*0.04-w,sz*0.2,sz*0.44);
    ctx.beginPath(); ctx.moveTo(-sz*0.36,-sz*0.24); ctx.lineTo(sz*0.36,-sz*0.24); ctx.lineTo(sz*0.22,sz*0.1); ctx.lineTo(-sz*0.22,sz*0.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle=s; ctx.beginPath(); ctx.arc(0,-sz*0.46,sz*0.28,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=this._darken(b,15);
    ctx.beginPath(); ctx.moveTo(-sz*0.14,-sz*0.66); ctx.lineTo(-sz*0.34,-sz*1.0); ctx.lineTo(-sz*0.06,-sz*0.7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*0.14,-sz*0.66); ctx.lineTo(sz*0.34,-sz*1.0); ctx.lineTo(sz*0.06,-sz*0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle="rgba(255,80,0,0.9)"; ctx.beginPath(); ctx.arc(-sz*0.09,-sz*0.48,sz*0.08,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(sz*0.09,-sz*0.48,sz*0.08,0,Math.PI*2); ctx.fill();
  }
  _spGhost(ctx,sz,b,s){
    const pulse=0.78+Math.sin(this._frame*0.06)*0.22;
    ctx.globalAlpha=(ctx.globalAlpha||1)*pulse;
    ctx.fillStyle=b;
    ctx.beginPath(); ctx.arc(0,-sz*0.12,sz*0.36,Math.PI,Math.PI*2); ctx.fill();
    ctx.fillRect(-sz*0.36,-sz*0.12,sz*0.72,sz*0.54);
    ctx.beginPath(); ctx.arc(-sz*0.3,sz*0.44,sz*0.16,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0,sz*0.5,sz*0.16,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sz*0.3,sz*0.44,sz*0.16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=s; ctx.beginPath(); ctx.arc(0,-sz*0.28,sz*0.28,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(0,0,60,0.85)"; ctx.beginPath(); ctx.arc(-sz*0.1,-sz*0.3,sz*0.1,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(sz*0.1,-sz*0.3,sz*0.1,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=Math.min(1,(ctx.globalAlpha||1)/pulse);
  }
  _spCaster(ctx,sz,b,s,l,w){
    ctx.fillStyle=l; ctx.fillRect(-sz*0.15,sz*0.1+w,sz*0.13,sz*0.54); ctx.fillRect(sz*0.02,sz*0.1-w,sz*0.13,sz*0.54);
    ctx.fillStyle=b;
    ctx.beginPath(); ctx.moveTo(-sz*0.44,-sz*0.25); ctx.lineTo(sz*0.44,-sz*0.25); ctx.lineTo(sz*0.52,sz*0.55); ctx.lineTo(-sz*0.52,sz*0.55); ctx.closePath(); ctx.fill();
    ctx.fillStyle=this._darken(b,18); ctx.fillRect(sz*0.44,-sz*0.22,sz*0.18,sz*0.5);
    ctx.fillStyle=this._lighten(b,18); ctx.beginPath(); ctx.moveTo(-sz*0.2,-sz*0.22); ctx.lineTo(sz*0.04,-sz*0.22); ctx.lineTo(sz*0.1,sz*0.3); ctx.lineTo(-sz*0.24,sz*0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle=s; ctx.beginPath(); ctx.arc(0,-sz*0.44,sz*0.28,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.arc(-sz*0.09,-sz*0.46,sz*0.08,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(sz*0.09,-sz*0.46,sz*0.08,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#886633"; ctx.lineWidth=sz*0.1;
    ctx.beginPath(); ctx.moveTo(sz*0.6,sz*0.24); ctx.lineTo(sz*0.54,-sz*1.04); ctx.stroke(); ctx.lineWidth=1;
    ctx.fillStyle=b; ctx.beginPath(); ctx.arc(sz*0.52,-sz*1.1,sz*0.17,0,Math.PI*2); ctx.fill();
  }
  _spKnight(ctx,sz,b,s,l,w){
    ctx.fillStyle=l; ctx.fillRect(-sz*0.32,sz*0.08+w,sz*0.28,sz*0.62); ctx.fillRect(sz*0.04,sz*0.08-w,sz*0.28,sz*0.62);
    ctx.fillStyle=b; ctx.beginPath(); ctx.moveTo(-sz*0.62,-sz*0.42); ctx.lineTo(sz*0.62,-sz*0.42); ctx.lineTo(sz*0.42,sz*0.12); ctx.lineTo(-sz*0.42,sz*0.12); ctx.closePath(); ctx.fill();
    ctx.fillStyle=this._darken(b,15); ctx.fillRect(-sz*0.88,-sz*0.38,sz*0.3,sz*0.56); ctx.fillRect(sz*0.58,-sz*0.38,sz*0.3,sz*0.56);
    ctx.fillStyle=this._lighten(b,18); ctx.beginPath(); ctx.moveTo(-sz*0.38,-sz*0.36); ctx.lineTo(sz*0.1,-sz*0.36); ctx.lineTo(sz*0.06,sz*0.06); ctx.lineTo(-sz*0.3,sz*0.06); ctx.closePath(); ctx.fill();
    ctx.fillStyle=s; ctx.beginPath(); ctx.arc(0,-sz*0.64,sz*0.36,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=b; ctx.beginPath(); ctx.arc(0,-sz*0.68,sz*0.4,Math.PI,Math.PI*2); ctx.fill();
    ctx.fillRect(-sz*0.4,-sz*0.68,sz*0.8,sz*0.14);
    ctx.fillStyle="rgba(200,30,0,0.55)"; ctx.fillRect(-sz*0.3,-sz*0.68,sz*0.6,sz*0.08);
    ctx.strokeStyle="#cc2200"; ctx.lineWidth=sz*0.09;
    ctx.beginPath(); ctx.moveTo(sz*0.72,-sz*0.28); ctx.lineTo(sz*0.66,-sz*1.15); ctx.stroke(); ctx.lineWidth=1;
    ctx.fillStyle="#cc2200"; ctx.beginPath(); ctx.arc(sz*0.64,-sz*1.18,sz*0.14,0,Math.PI*2); ctx.fill();
  }
  _spPlant(ctx,sz,b,s){
    ctx.strokeStyle=b; ctx.lineWidth=sz*0.14;
    for(let i=0;i<6;i++){
      const a=(i/6)*Math.PI*2, r=sz*0.82, sw=Math.sin(this._frame*0.04+i)*sz*0.14;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(Math.cos(a)*r*0.5+sw,Math.sin(a)*r*0.5,Math.cos(a)*r,Math.sin(a)*r); ctx.stroke();
      ctx.fillStyle=s; ctx.beginPath(); ctx.arc(Math.cos(a)*r,Math.sin(a)*r,sz*0.16,0,Math.PI*2); ctx.fill();
    }
    ctx.lineWidth=1;
    ctx.fillStyle=b; ctx.beginPath(); ctx.arc(0,0,sz*0.42,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=s; ctx.beginPath(); ctx.arc(0,-sz*0.06,sz*0.26,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(0,100,0,0.85)"; ctx.beginPath(); ctx.arc(-sz*0.1,-sz*0.08,sz*0.08,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(sz*0.1,-sz*0.08,sz*0.08,0,Math.PI*2); ctx.fill();
  }
  _spGolem(ctx,sz,b,s,l,w){
    ctx.fillStyle=l; ctx.fillRect(-sz*0.42,sz*0.12+w,sz*0.38,sz*0.76); ctx.fillRect(sz*0.04,sz*0.12-w,sz*0.38,sz*0.76);
    ctx.fillStyle=b; ctx.fillRect(-sz*0.66,-sz*0.46,sz*1.32,sz*0.66);
    ctx.fillStyle=this._lighten(b,28); ctx.fillRect(-sz*0.6,-sz*0.4,sz*0.3,sz*0.26); ctx.fillRect(sz*0.08,-sz*0.4,sz*0.3,sz*0.26);
    ctx.fillStyle=this._darken(b,14); ctx.fillRect(-sz*0.68,-sz*0.44,sz*0.18,sz*0.64); ctx.fillRect(sz*0.5,-sz*0.44,sz*0.18,sz*0.64);
    ctx.fillStyle=s; ctx.fillRect(-sz*0.5,-sz*0.64,sz,sz*0.28);
    ctx.fillStyle="rgba(255,140,0,0.95)"; ctx.beginPath(); ctx.arc(-sz*0.2,-sz*0.52,sz*0.12,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(sz*0.2,-sz*0.52,sz*0.12,0,Math.PI*2); ctx.fill();
  }
  _spDemon(ctx,sz,b,s,l,w){
    ctx.fillStyle=l; ctx.fillRect(-sz*0.28,sz*0.1+w,sz*0.24,sz*0.58); ctx.fillRect(sz*0.04,sz*0.1-w,sz*0.24,sz*0.58);
    ctx.fillStyle=b; ctx.beginPath(); ctx.moveTo(-sz*0.52,-sz*0.3); ctx.lineTo(sz*0.52,-sz*0.3); ctx.lineTo(sz*0.36,sz*0.14); ctx.lineTo(-sz*0.36,sz*0.14); ctx.closePath(); ctx.fill();
    ctx.fillStyle=this._darken(b,15); ctx.fillRect(-sz*0.78,-sz*0.26,sz*0.28,sz*0.46); ctx.fillRect(sz*0.5,-sz*0.26,sz*0.28,sz*0.46);
    ctx.fillStyle=s; ctx.beginPath(); ctx.arc(0,-sz*0.48,sz*0.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=this._darken(b,10);
    ctx.beginPath(); ctx.moveTo(-sz*0.18,-sz*0.7); ctx.lineTo(-sz*0.42,-sz*1.08); ctx.lineTo(-sz*0.08,-sz*0.74); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*0.18,-sz*0.7); ctx.lineTo(sz*0.42,-sz*1.08); ctx.lineTo(sz*0.08,-sz*0.74); ctx.closePath(); ctx.fill();
    ctx.fillStyle="rgba(255,50,0,0.85)"; ctx.beginPath(); ctx.arc(-sz*0.1,-sz*0.5,sz*0.09,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(sz*0.1,-sz*0.5,sz*0.09,0,Math.PI*2); ctx.fill();
  }

  _drawQuestLog(W,H) {
    const ctx=this.ctx;
    const prof=this._layoutProfile(W,H);
    const rowH = prof.mobile ? 52 : 64;
    const PX = prof.mobile ? prof.edge : Math.max(20, W*0.08);
    const PY = prof.mobile ? prof.safeTop + 8 : Math.max(60, H*0.08);
    const PW = prof.mobile ? W - prof.edge*2 : Math.min(480, W*0.44);
    const PH = Math.min(H - PY - prof.safeBottom - 16, 40 + this.quests.length * rowH + 16);
    // Panel background — D2-style dark stone
    ctx.fillStyle = "rgba(0,4,12,0.96)"; ctx.fillRect(PX, PY, PW, PH);
    const edgeGrad = ctx.createLinearGradient(PX, PY, PX, PY + PH);
    edgeGrad.addColorStop(0,"rgba(100,200,120,0.18)");
    edgeGrad.addColorStop(1,"rgba(20,80,40,0.06)");
    ctx.fillStyle = edgeGrad; ctx.fillRect(PX, PY, PW, PH);
    ctx.strokeStyle = "#3a9952"; ctx.lineWidth = 2; ctx.strokeRect(PX, PY, PW, PH);
    ctx.strokeStyle = "#1a4428"; ctx.lineWidth = 1; ctx.strokeRect(PX+2, PY+2, PW-4, PH-4);
    // Title bar
    ctx.fillStyle = "rgba(0,30,10,0.85)"; ctx.fillRect(PX, PY, PW, 32);
    ctx.fillStyle = "#66ffaa"; ctx.font = `bold ${prof.mobile?13:16}px monospace`; ctx.textAlign = "left";
    ctx.fillText("QUESTS", PX+14, PY+22);
    ctx.fillStyle = "#88bbaa"; ctx.font = `${prof.mobile?10:12}px monospace`; ctx.textAlign = "right";
    ctx.fillText(`${this.quests.filter(q=>q.complete).length}/${this.quests.length} done   [Q] close`, PX+PW-10, PY+22);
    this.quests.forEach((q, i) => {
      const qy = PY + 38 + i * rowH;
      if (qy + rowH - 4 > PY + PH - 6) return;
      // Row bg
      ctx.fillStyle = q.complete ? "rgba(0,50,15,0.65)" : "rgba(8,14,35,0.72)";
      ctx.beginPath(); ctx.roundRect(PX+6, qy, PW-12, rowH-5, 4); ctx.fill();
      ctx.strokeStyle = q.complete ? "#2d7748" : "#1e3050"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(PX+6, qy, PW-12, rowH-5, 4); ctx.stroke();
      // Status badge
      const badgeColor = q.complete ? "#44ff88" : "#4488ff";
      ctx.fillStyle = q.complete ? "rgba(0,80,20,0.7)" : "rgba(10,20,60,0.7)";
      ctx.beginPath(); ctx.roundRect(PX+12, qy+8, 72, 16, 3); ctx.fill();
      ctx.fillStyle = badgeColor; ctx.font = `bold ${prof.mobile?9:10}px monospace`; ctx.textAlign = "left";
      ctx.fillText(q.complete ? "✔ COMPLETE" : "○ ACTIVE", PX+16, qy+20);
      // Quest name
      ctx.fillStyle = q.complete ? "#99ddaa" : "#e8dfc8";
      ctx.font = `bold ${prof.mobile?11:14}px monospace`; ctx.textAlign = "left";
      ctx.fillText(q.name.slice(0, prof.mobile ? 24 : 34), PX+90, qy+21);
      // Progress bar
      const pct = Math.min(1, (q.done||0) / Math.max(1, q.needed||1));
      const barX = PX+12, barY = qy+rowH-22, barW = PW-24;
      ctx.fillStyle = "#0a1020"; ctx.fillRect(barX, barY, barW, 8);
      const barGrad = ctx.createLinearGradient(barX, barY, barX+barW*pct, barY);
      barGrad.addColorStop(0, q.complete ? "#1e7c3a" : "#1a4080");
      barGrad.addColorStop(1, q.complete ? "#44ff88" : "#4488ff");
      ctx.fillStyle = barGrad; ctx.fillRect(barX, barY, barW*pct, 8);
      ctx.strokeStyle = "#1e3050"; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, 8);
      // Progress text & reward
      ctx.fillStyle = "#8899bb"; ctx.font = `${prof.mobile?8:10}px monospace`; ctx.textAlign = "left";
      ctx.fillText(`${q.done||0} / ${q.needed||1}`, barX, barY-3);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ddbb66";
      ctx.fillText(`+${q.reward?.xp||0}xp  ${q.reward?.gold ? `💰${q.reward.gold}` : ""}${q.reward?.identify ? "  🔍ID" : ""}`, PX+PW-10, barY-3);
    });
    ctx.textAlign = "left";
  }

  // Always-visible active quest tracker (top-right corner of desktop HUD)
  _drawActiveQuestTracker(W, H) {
    if (this._isMobileLayout(W, H)) return; // Mobile has its own tracker
    const q = this.quests?.find(v => !v.complete) || null;
    if (!q) return;
    const ctx = this.ctx;
    const panW = Math.min(280, W * 0.22);
    const panH = 56;
    // Position below quality button (qY=52, qH=18 → bottom=70) and below minimap if visible
    const mm = this.minimap || {};
    const mmBottom = (mm.y != null && mm.h != null) ? mm.y + mm.h + 6 : 76;
    const py = Math.max(76, mmBottom);
    const px = W - panW - 8;
    ctx.fillStyle = "rgba(6,2,0,0.82)";
    ctx.beginPath(); ctx.roundRect(px, py, panW, panH, 5); ctx.fill();
    ctx.strokeStyle = "#6a3a10"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(px, py, panW, panH, 5); ctx.stroke();
    ctx.fillStyle = "#c8a060"; ctx.font = "bold 11px monospace"; ctx.textAlign = "left";
    ctx.fillText(q.name.slice(0, 28), px+10, py+17);
    ctx.fillStyle = "#998877"; ctx.font = "10px monospace";
    ctx.fillText(`${q.done||0} / ${q.needed||1}`, px+10, py+33);
    // Progress bar
    const pct = Math.min(1, (q.done||0) / Math.max(1, q.needed||1));
    const bx = px+10, by = py+40, bw = panW-20;
    ctx.fillStyle = "#1a0f00"; ctx.fillRect(bx, by, bw, 7);
    ctx.fillStyle = this.cls.color; ctx.fillRect(bx, by, bw*pct, 7);
    ctx.strokeStyle = "#3a2010"; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, 7);
    ctx.textAlign = "left";
  }


  _skillKeyLabel(skIdx) {
    const slots = [];
    this.skillBar.forEach((s,i) => { if (s===skIdx) slots.push(["1","2","3","4","5","6","7","8","9","0"][i]); });
    return slots.length ? slots.join("/") : "(unbound)";
  }


  _skillTreeLayout(W,H) {
    const prof=this._layoutProfile(W,H);
    const mobile=prof.mobile || W < 760;
    const margin=mobile ? 10 : 16;
    const PW=mobile ? Math.max(300,W-margin*2) : Math.min(840,W-margin*2);
    const PX=mobile ? margin : W/2-PW/2;
    const PY=mobile ? prof.safeTop+8 : H*0.08;
    const available=mobile ? H-PY-prof.safeBottom-8 : H*0.84;
    const PH=Math.max(mobile ? 180 : 300,Math.min(mobile ? available : 640,H*0.84));
    const cols=mobile || PW < 620 ? 1 : 2;
    const tabW=Math.max(78,Math.min(130,(PW-28-16)/3));
    const cardW=cols===1 ? PW-28 : (PW-48)/2;
    const cardH=mobile ? 50 : 76;
    const rowH=mobile ? 58 : 88;
    return {PX,PY,PW,PH,cols,tabW,cardW,cardH,rowH,mobile};
  }

  _drawSkillTree(W,H) {
    const ctx=this.ctx, p=this.player, cls=this.cls;
    const {PX,PY,PW,PH,cols,tabW,cardW,cardH,rowH,mobile}=this._skillTreeLayout(W,H);
    ctx.fillStyle="rgba(0,5,20,0.97)"; ctx.fillRect(PX,PY,PW,PH);
    ctx.strokeStyle=cls.color; ctx.lineWidth=2; ctx.strokeRect(PX,PY,PW,PH);
    ctx.fillStyle=cls.color; ctx.font=`bold ${mobile?11:14}px monospace`; ctx.textAlign="center";
    ctx.fillText(`${cls.icon} ${cls.name} - SKILL TREE`, PX+PW/2, PY+22);
    ctx.fillStyle="#ffdd00"; ctx.font=`bold ${mobile?8:10}px monospace`;
    const leftText=this.leftSkill==="basic" ? "BASIC" : (cls.skills[this.leftSkill]?.name || "NONE");
    const rightText=cls.skills[this.rightSkill]?.name || "NONE";
    ctx.fillText(mobile ? `PTS ${p.skillPoints||0}  L:${leftText.slice(0,8)}  R:${rightText.slice(0,8)}` : `SKILL POINTS: ${p.skillPoints||0}   LEFT: ${leftText}   RIGHT: ${rightText}`, PX+PW/2, PY+42);
    ctx.fillStyle="#ff4444"; ctx.font="bold 11px monospace"; ctx.textAlign="right";
    ctx.fillText("[X] CLOSE", PX+PW-12, PY+22);
    p.skillRanks = Array.from({ length: 30 }, (_, i) => p.skillRanks?.[i] || 0);

    cls.skillTrees.forEach((tree,i)=>{
      const x=PX+14+i*(tabW+8), y=PY+54;
      ctx.fillStyle=i===this.skillTreeTab ? `${cls.color}33` : "rgba(10,16,28,0.9)";
      ctx.strokeStyle=i===this.skillTreeTab ? cls.color : "#223344";
      ctx.beginPath(); ctx.roundRect(x,y,tabW,24,5); ctx.fill(); ctx.stroke();
      ctx.fillStyle=i===this.skillTreeTab ? cls.color : "#778899";
      ctx.font="bold 10px monospace"; ctx.textAlign="center"; ctx.fillText(tree,x+tabW/2,y+16);
    });

    const start=(this.skillTreeTab||0)*10;
    for(let i=0;i<10;i++){
      const skIdx=start+i, sk=cls.skills[skIdx], rank=p.skillRanks[skIdx]||0;
      const col=i%cols, row=Math.floor(i/cols), x=PX+14+col*(cardW+20), y=PY+90+row*rowH;
      if (y+cardH > PY+PH-24) continue;
      const locked=p.level<sk.reqLevel;
      ctx.fillStyle=locked ? "rgba(20,20,20,0.82)" : `${sk.color}13`;
      ctx.strokeStyle=skIdx===this.rightSkill ? "#ffdd00" : skIdx===this.leftSkill ? "#44aaff" : sk.color;
      ctx.lineWidth=skIdx===this.rightSkill||skIdx===this.leftSkill ? 2 : 1;
      ctx.fillRect(x,y,cardW,cardH); ctx.strokeRect(x,y,cardW,cardH);
      const iconImg=getCrSkillIcon(cls.id,this.quality,this._skillIconName(skIdx));
      const iconSize=mobile ? 30 : 44;
      const textX=x+(mobile ? 48 : 62);
      if(iconImg){ctx.save();ctx.imageSmoothingEnabled=this.quality!=="low";ctx.drawImage(iconImg,x+8,y+8,iconSize,iconSize);ctx.restore();}
      else{ctx.font=`${mobile?22:28}px serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(sk.icon,x+8+iconSize/2,y+8+iconSize/2);ctx.textBaseline="alphabetic";}
      ctx.fillStyle=locked ? "#666" : sk.color;ctx.font=`bold ${mobile?9:11}px monospace`;ctx.textAlign="left";
      ctx.fillText(`${sk.name.slice(0,mobile?18:28)}  ${rank}/20`,textX,y+18);
      ctx.fillStyle="#88aabb";ctx.font="8px monospace";
      ctx.fillText(mobile ? `LV ${sk.reqLevel}  ${Math.max(2,sk.mp-rank)} MP  ${this._skillKeyLabel(skIdx)}` : `LV ${sk.reqLevel}  ${sk.type}  ${Math.max(2,sk.mp-rank)} MP  ${this._skillKeyLabel(skIdx)}`,textX,y+34);
      const barW=Math.max(54,cardW-(mobile?132:152));
      ctx.fillStyle="#556677";ctx.fillRect(textX,y+44,barW,5);
      ctx.fillStyle=sk.color;ctx.fillRect(textX,y+44,barW*(rank/20),5);
      const canSpend=!locked&&(p.skillPoints||0)>0&&rank<20;
      [["L",x+cardW-78,"#44aaff"],["R",x+cardW-52,"#ffdd00"],["+",x+cardW-26,canSpend ? "#44ff88" : "#445566"]].forEach(([label,bx,color])=>{
        ctx.fillStyle="rgba(0,0,0,0.65)";ctx.strokeStyle=color;ctx.lineWidth=1;
        ctx.beginPath();ctx.roundRect(bx,y+cardH-26,20,18,4);ctx.fill();ctx.stroke();
        ctx.fillStyle=color;ctx.font="bold 10px monospace";ctx.textAlign="center";ctx.fillText(label,bx+10,y+cardH-13);
      });
      if(locked){ctx.fillStyle="rgba(0,0,0,0.55)";ctx.fillRect(x,y,cardW,cardH);ctx.fillStyle="#aa6666";ctx.font="bold 10px monospace";ctx.textAlign="center";ctx.fillText(`REQUIRES LEVEL ${sk.reqLevel}`,x+cardW/2,y+Math.min(43,cardH-12));}
    }
    ctx.fillStyle="#556677";ctx.font="8px monospace";ctx.textAlign="center";
    ctx.fillText(mobile ? "Tap + to spend. L/R assigns mouse skills." : "Left click + to spend. Use L/R buttons to assign mouse skills. Number keys 1-9/0 fire the action bar.",PX+PW/2,PY+PH-10);
    ctx.textAlign="left";ctx.textBaseline="alphabetic";
  }

  _handleSkillTreeClick(cx, cy) {
    const W=this.canvas.width,H=this.canvas.height,p=this.player,cls=this.cls;
    const {PX,PY,PW,PH,cols,tabW,cardW,cardH,rowH}=this._skillTreeLayout(W,H);
    if(cx>PX+PW-100&&cx<PX+PW-4&&cy>PY+8&&cy<PY+30){this.showSkillTree=false;return;}
    cls.skillTrees.forEach((tree,i)=>{const x=PX+14+i*(tabW+8),y=PY+54;if(cx>x&&cx<x+tabW&&cy>y&&cy<y+24)this.skillTreeTab=i;});
    p.skillRanks=Array.from({length:30},(_,i)=>p.skillRanks?.[i]||0);
    const start=(this.skillTreeTab||0)*10;
    for(let i=0;i<10;i++){
      const skIdx=start+i,sk=cls.skills[skIdx],col=i%cols,row=Math.floor(i/cols),x=PX+14+col*(cardW+20),y=PY+90+row*rowH;
      if (y+cardH > PY+PH-24) continue;
      if(cx<x||cx>x+cardW||cy<y||cy>y+cardH)continue;
      const by=y+cardH-26;
      if(cx>x+cardW-78&&cx<x+cardW-58&&cy>by&&cy<by+18){this.leftSkill=skIdx;this._addFloat(`LEFT: ${sk.name}`,this.player.wx,this.player.wy-40,sk.color,70);return;}
      if(cx>x+cardW-52&&cx<x+cardW-32&&cy>by&&cy<by+18){this.rightSkill=skIdx;this.activeSkill=skIdx;this._addFloat(`RIGHT: ${sk.name}`,this.player.wx,this.player.wy-40,sk.color,70);return;}
      if(cx>x+cardW-26&&cx<x+cardW-6&&cy>by&&cy<by+18){
        if(p.level<sk.reqLevel){this._addFloat("Level too low",cx,cy-10,"#ff4444",60);return;}
        if((p.skillPoints||0)<=0){this._addFloat("No skill points",cx,cy-10,"#ff4444",60);return;}
        if(p.skillRanks[skIdx]>=20){this._addFloat("Rank already maxed",cx,cy-10,"#ff8800",60);return;}
        p.skillPoints--;p.skillRanks[skIdx]++;
        if(!this.skillBar.includes(skIdx)){const open=this.skillBar.findIndex(s=>s==null);if(open>=0)this.skillBar[open]=skIdx;}
        this._addFloat(`${sk.name} rank ${p.skillRanks[skIdx]}`,cx,cy-20,sk.color,80);return;
      }
    }
  }

  _drawWaypointPanel(W,H) {
    const ctx=this.ctx;
    const mobile=W<760||H<620;
    const PW=Math.min(W-24,mobile?560:820), PH=Math.min(H-80,mobile?H-48:560);
    const PX=W/2-PW/2, PY=mobile?24:H*0.12;
    this.waypointRects = [];
    ctx.save();
    ctx.fillStyle="rgba(0,0,0,0.68)";ctx.fillRect(0,0,W,H);
    ctx.fillStyle="rgba(4,7,16,0.98)";ctx.beginPath();ctx.roundRect(PX,PY,PW,PH,12);ctx.fill();
    ctx.strokeStyle=this.act.color;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=this.act.color;ctx.font=`bold ${mobile?14:18}px monospace`;ctx.textAlign="center";
    ctx.fillText(this._isDiabl0WhiteLabel() ? "DIABL0 WHITE-LABEL WAYPOINTS" : "CRYPTIC REALM WAYPOINTS",W/2,PY+34);
    ctx.fillStyle="#8899aa";ctx.font=`${mobile?8:10}px monospace`;
    ctx.fillText("Discovered route stones unlock towns, roads, caves, dungeons and boss fronts.",W/2,PY+54);
    ctx.fillStyle="rgba(80,20,30,0.72)";ctx.strokeStyle="#aa4444";ctx.beginPath();ctx.roundRect(PX+PW-88,PY+8,78,26,6);ctx.fill();ctx.stroke();
    ctx.fillStyle="#ff8888";ctx.font="bold 10px monospace";ctx.fillText("CLOSE",PX+PW-49,PY+25);
    const rowH=mobile?68:74, startY=PY+84;
    CR_ACTS.forEach((act,i)=>{
      const y=startY+i*rowH;
      if(y+rowH>PY+PH-12) return;
      const actUnlocked=!!this.waypoints[act.id] || i<=this.actIdx;
      ctx.fillStyle=actUnlocked?`${act.color}16`:"rgba(0,0,0,0.45)";
      ctx.strokeStyle=i===this.actIdx?act.color:actUnlocked?"#263a54":"#1b2230";
      ctx.lineWidth=i===this.actIdx?2:1;
      ctx.beginPath();ctx.roundRect(PX+18,y,PW-36,rowH-8,8);ctx.fill();ctx.stroke();
      ctx.textAlign="left";
      ctx.fillStyle=actUnlocked?act.color:"#46566b";ctx.font=`bold ${mobile?10:12}px monospace`;
      ctx.fillText(`ACT ${act.id}: ${this._displayTownName(i)}`,PX+34,y+18);
      ctx.fillStyle=actUnlocked?"#b6c1d0":"#526177";ctx.font=`${mobile?8:9}px monospace`;
      ctx.fillText(this._displayActLore(i).slice(0,mobile?64:98),PX+34,y+34);
      const locs = this._isDiabl0WhiteLabel()
        ? (this._diabl0ActSkin(i)?.waypoints || [this._displayTownName(i), this._displayActName(i)])
        : (act.waypoints || [act.town, act.name]);
      const chipGap=mobile?5:7, chipH=mobile?18:22;
      const chipY=y+(mobile?43:44);
      const labelW=mobile?0:104;
      if (!mobile) {
        ctx.fillStyle=actUnlocked?"#69798d":"#3d4858";
        ctx.font="bold 8px monospace";
        ctx.fillText("DISCOVERED",PX+34,chipY+14);
      }
      const startX=PX+34+labelW;
      const availW=PX+PW-48-startX;
      const chipW=Math.max(58,Math.floor((availW-chipGap*(locs.length-1))/Math.max(1,locs.length)));
      locs.forEach((loc,locIdx)=>{
        const x=startX+locIdx*(chipW+chipGap);
        const locUnlocked=actUnlocked && (locIdx===0 || !!this.waypoints[this._waypointKey(i,locIdx)]);
        this.waypointRects.push({ x, y:chipY, w:chipW, h:chipH, actIdx:i, locIdx, unlocked:locUnlocked });
        ctx.fillStyle=locUnlocked?`${act.color}2b`:"rgba(0,0,0,0.48)";
        ctx.strokeStyle=locUnlocked?act.color:"#263044";
        ctx.lineWidth=i===this.actIdx && locIdx===this._locationIndexForScreen()?2:1;
        ctx.beginPath();ctx.roundRect(x,chipY,chipW,chipH,5);ctx.fill();ctx.stroke();
        ctx.fillStyle=locUnlocked?"#e4d8b8":"#526177";
        ctx.font=`bold ${mobile?7:8}px monospace`;
        ctx.textAlign="center";
        const locLabel = this._displayWaypointName(i, locIdx) || loc;
        ctx.fillText(`${locIdx+1}. ${String(locLabel).slice(0,mobile?9:13)}`,x+chipW/2,chipY+chipH/2+3);
      });
      ctx.textAlign="right";ctx.fillStyle=actUnlocked?"#d6b65c":"#445066";ctx.font="bold 9px monospace";
      ctx.fillText(i===this.actIdx?"CURRENT ACT":actUnlocked?"ACT OPEN":"ACT LOCKED",PX+PW-34,y+18);
    });
    ctx.restore();ctx.textAlign="left";
  }

  _drawShop(W,H) {
    const ctx=this.ctx; const p=this.player;
    const mobile=W<760;
    const PW=mobile?Math.min(360,W-24):Math.min(720,W-36);
    const PX=W/2-PW/2, PY=H*0.22, PH=Math.min(560, H*0.72), buyW=Math.min(320,PW);
    ctx.fillStyle="rgba(0,5,20,0.97)"; ctx.fillRect(PX,PY,PW,PH);
    ctx.strokeStyle="#4488ff"; ctx.lineWidth=2; ctx.strokeRect(PX,PY,PW,PH);
    ctx.fillStyle="#4488ff"; ctx.font="bold 13px monospace"; ctx.textAlign="center";
    ctx.fillText("🏪 MERCHANT",W/2,PY+18);
    ctx.fillStyle="#ffdd00"; ctx.font="10px monospace";
    ctx.fillText(`Your Gold: 💰${p.gold}`,W/2,PY+34);
    // Close
    ctx.fillStyle="#ff4444"; ctx.font="bold 11px monospace"; ctx.textAlign="right";
    ctx.fillText("[X] CLOSE",PX+PW-8,PY+18);
    ctx.textAlign="left";
    // Items for sale
    this.shopItems.forEach((item,i)=>{
      const iy=PY+40+i*52;
      if (iy+48>PY+PH-90) return;
      const canAfford=p.gold>=item.price;
      ctx.fillStyle=canAfford ? "rgba(10,20,40,0.9)" : "rgba(20,5,5,0.9)";
      ctx.fillRect(PX+4,iy,buyW-8,48);
      ctx.strokeStyle=item.rarity.color; ctx.lineWidth=1; ctx.strokeRect(PX+4,iy,buyW-8,48);
      ctx.fillStyle=item.rarity.color; ctx.font="10px monospace";
      ctx.fillText(`${item.icon} ${item.name}`,PX+10,iy+16);
      ctx.fillStyle="#8899aa"; ctx.font="9px monospace";
      const stats=[];
      if(item.dmgAdd)stats.push(`+${item.dmgAdd}dmg`);
      if(item.defAdd)stats.push(`+${item.defAdd}def`);
      if(item.hpAdd)stats.push(`+${item.hpAdd}hp`);
      if(item.mpAdd)stats.push(`+${item.mpAdd}mp`);
      ctx.fillText(stats.join(" · "),PX+10,iy+30);
      ctx.fillStyle=canAfford ? "#ffdd00" : "#664444"; ctx.font="bold 10px monospace"; ctx.textAlign="right";
      ctx.fillText(`G ${item.price}`,PX+buyW-10,iy+28); ctx.textAlign="left";
    });
    // Potions
    const py=PY+40+this.shopItems.length*52+16;
    if (py+40<PY+PH-10) {
      ctx.fillStyle="#334455"; ctx.font="9px monospace"; ctx.fillText("─── POTIONS ───",PX+10,py);
      ctx.fillStyle="rgba(10,30,10,0.9)"; ctx.fillRect(PX+4,py+6,buyW/2-8,34);
      ctx.fillStyle="#44cc44"; ctx.font="10px monospace"; ctx.textAlign="center";
      ctx.fillText(`HP Potion - G30`,PX+buyW/4,py+26); ctx.textAlign="left";
      ctx.fillStyle="rgba(5,10,30,0.9)"; ctx.fillRect(PX+buyW/2+4,py+6,buyW/2-8,34);
      ctx.fillStyle="#4488ff"; ctx.font="10px monospace"; ctx.textAlign="center";
      ctx.fillText(`MP Potion - G25`,PX+buyW*3/4,py+26); ctx.textAlign="left";
    }
    if(!mobile){
      const sellX=PX+buyW+26, sellY=PY+58, cell=32, cols=10, rows=5;
      ctx.fillStyle="#d6b65c"; ctx.font="bold 10px monospace"; ctx.textAlign="left";
      ctx.fillText("SELL FROM BAG",sellX,sellY-18);
      ctx.fillStyle="#8899aa"; ctx.font="8px monospace";
      ctx.fillText("click item to sell for gold",sellX,sellY-6);
      this._drawGridSlots(sellX,sellY,cols,rows,cell,p.inventory.slice(0,cols*rows));
      const hover=this._gridHoverItem(sellX,sellY,cols,rows,cell,p.inventory);
      if(hover) this._drawItemTooltip(hover, Math.min(W-238,this.mouseX+16), Math.max(42,this.mouseY-16), 220);
    }
  }

  // ── Mercenary Captain panel ───────────────────────────────────────────────────
  _drawMercPanel(W,H) {
    const ctx=this.ctx; const p=this.player;
    const PX=W/2-175, PY=H*0.16, PW=350, PH=Math.min(490,H*0.72);
    ctx.fillStyle="rgba(0,5,18,0.97)"; ctx.fillRect(PX,PY,PW,PH);
    ctx.strokeStyle="#cc8833"; ctx.lineWidth=2; ctx.strokeRect(PX,PY,PW,PH);
    ctx.fillStyle="#cc8833"; ctx.font="bold 13px monospace"; ctx.textAlign="center";
    ctx.fillText("⚔ MERCENARY CAPTAIN",W/2,PY+18);
    ctx.fillStyle="#ff4444"; ctx.textAlign="right";
    ctx.fillText("[X] CLOSE",PX+PW-8,PY+18); ctx.textAlign="left";

    // Current merc status bar
    if (this.merc) {
      const m=this.merc;
      ctx.fillStyle=m.dead ? "rgba(60,0,0,0.8)" : "rgba(0,30,10,0.8)";
      ctx.fillRect(PX+4,PY+26,PW-8,40);
      ctx.fillStyle=m.dead ? "#ff4444" : "#44ff88"; ctx.font="bold 10px monospace"; ctx.textAlign="left";
      ctx.fillText(`${m.icon} ${m.name}  Lv.${m.level}  [${m.dead ? "FALLEN" : "ACTIVE"}]`,PX+10,PY+40);
      if (!m.dead) {
        ctx.fillStyle="#330000"; ctx.fillRect(PX+10,PY+48,PW-20,6);
        ctx.fillStyle=m.color; ctx.fillRect(PX+10,PY+48,(PW-20)*(m.hp/m.maxHp),6);
        ctx.fillStyle="#8899aa"; ctx.font="8px monospace";
        ctx.fillText(`HP ${m.hp}/${m.maxHp}  DMG:${m.dmg}  SPD:${m.spd}`,PX+10,PY+62);
      }
    }

    const listY=this.merc ? PY+76 : PY+32;
    MERC_TYPES.forEach((mt,i)=>{
      const by=listY+i*80;
      if (by+74>PY+PH-10) return;
      const isActiveHire=this.merc&&!this.merc.dead&&this.merc.name===mt.name;
      const isDeadHire=this.merc&&this.merc.dead&&this.merc.name===mt.name;
      ctx.fillStyle=isActiveHire ? "rgba(0,40,0,0.7)" : isDeadHire ? "rgba(50,0,0,0.7)" : "rgba(5,12,30,0.85)";
      ctx.fillRect(PX+4,by,PW-8,74);
      ctx.strokeStyle=mt.color; ctx.lineWidth=1; ctx.strokeRect(PX+4,by,PW-8,74);
      // Sprite preview
      ctx.save(); ctx.translate(PX+26,by+40);
      this._drawCharSprite(ctx,0,0,"iron_warden",0,this._frame,14,1,false,{uiMode:true});
      ctx.restore();
      ctx.fillStyle=mt.color; ctx.font="bold 10px monospace"; ctx.textAlign="left";
      ctx.fillText(`${mt.icon} ${mt.name}`,PX+52,by+16);
      ctx.fillStyle="#8899aa"; ctx.font="8px monospace";
      ctx.fillText(mt.desc,PX+52,by+28);
      ctx.fillText(`HP:${mt.hp}  DMG:${mt.dmg}  SPD:${mt.spd}  Range:${mt.range}`,PX+52,by+40);
      // Action button
      let lbl, bc;
      if (isActiveHire) { lbl="DISMISS"; bc="#882222"; }
      else if (isDeadHire) { lbl=`RESURRECT 💰${mt.rezCost}`; bc="#884400"; }
      else { lbl=`HIRE 💰${mt.hireCost}`; bc=p.gold>=mt.hireCost ? "#225522" : "#442222"; }
      ctx.fillStyle=bc; ctx.beginPath(); ctx.roundRect(PX+PW-108,by+10,96,28,6); ctx.fill();
      ctx.strokeStyle=mt.color; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle=p.gold>=mt.hireCost||isActiveHire||isDeadHire ? "#eee" : "#664444";
      ctx.font="bold 9px monospace"; ctx.textAlign="center";
      ctx.fillText(lbl,PX+PW-60,by+28); ctx.textAlign="left";
    });
    ctx.textAlign="left";
  }

  // ── Stash panel ───────────────────────────────────────────────────────────────
  _stashLayout(W,H) {
    const mobile = W < 820 || H < 560;
    const margin = mobile ? 8 : 18;
    const gap = mobile ? 10 : 18;
    const PY = mobile ? 44 : 54;
    const PW = mobile ? Math.min(W-margin*2, 430) : Math.min(460, Math.floor((W-margin*2-gap)/2));
    const PH = Math.max(410, Math.min(600,H-(mobile?72:120)));
    const leftX = mobile ? Math.max(margin,(W-PW)/2) : margin;
    const rightX = mobile ? leftX : W-PW-margin;
    const cell = Math.max(24, Math.min(34, Math.floor((PW-54)/10)));
    const stashCols = 10;
    const stashRows = Math.max(6, Math.min(10, Math.floor((PH-106)/cell)));
    const invCols = 10;
    const invRows = Math.max(4, Math.min(6, Math.floor((PH-318)/cell)));
    return {
      mobile, PW, PH, PY, leftX, rightX, cell, stashCols, stashRows, invCols, invRows,
      stashX:leftX+24, stashY:PY+88,
      invX:rightX+24, invY:PY+306,
    };
  }

  _drawStash(W,H) {
    const ctx=this.ctx; const p=this.player;
    const L=this._stashLayout(W,H);
    const {PW,PH,PY,leftX,rightX,cell,stashCols,stashRows,invCols,invRows,stashX,stashY,invX,invY}=L;
    const d2Armory = this._isD2ArmoryActive();
    if (!this.sharedStash) this.sharedStash = [];
    if (!this.stashTab) this.stashTab = "personal";
    if (d2Armory) {
      this._drawD2ArmoryPanelTexture(leftX,PY,PW,PH,"stash","D2 STASH",this.cls.color);
      this._drawD2ArmoryPanelTexture(rightX,PY,PW,PH,"inventory","D2 BAG",this.cls.color);
    } else {
      this._drawStonePanel(leftX,PY,PW,PH,"STASH",this.cls.color);
      this._drawStonePanel(rightX,PY,PW,PH,"INVENTORY",this.cls.color);
    }

    // ── Stash tabs: Personal | Shared | Gems | Materials | Runes ────────────
    const tabs = ["Personal","Shared","Gems","Materials","Runes"];
    const tabW = Math.floor((PW-24)/tabs.length);
    const tabY = PY+38;
    if (!this.stashTabRects) this.stashTabRects = [];
    this.stashTabRects = [];
    tabs.forEach((tab,i) => {
      const tx2 = leftX+12+i*(tabW+2), ty2 = tabY;
      const active = this.stashTab === tab.toLowerCase();
      ctx.fillStyle = active ? (d2Armory ? "rgba(198,132,45,0.32)" : "rgba(214,182,92,0.25)") : "rgba(0,0,0,0.45)";
      ctx.beginPath(); ctx.roundRect(tx2,ty2,tabW,22,4); ctx.fill();
      ctx.strokeStyle = active ? (d2Armory ? "#d6b65c" : this.cls.color) : "#3a3427"; ctx.lineWidth = active ? 2 : 1; ctx.stroke();
      ctx.fillStyle = active ? (d2Armory ? "#d6b65c" : this.cls.color) : "#a99c86";
      ctx.font = `bold ${Math.max(7,Math.floor(tabW*0.14))}px monospace`; ctx.textAlign = "center";
      ctx.fillText(tab.toUpperCase(), tx2+tabW/2, ty2+15);
      this.stashTabRects.push({tab:tab.toLowerCase(),x:tx2,y:ty2,w:tabW,h:22});
    });
    ctx.textAlign = "left";

    // ── Determine which stash array to show ──────────────────────────────────
    let displayStash;
    const sTab = this.stashTab || "personal";
    if (sTab === "shared")    displayStash = this.sharedStash;
    else if (sTab === "gems") displayStash = p.inventory.filter(it => it?.type === "gem" || it?.subType === "gem");
    else if (sTab === "materials") displayStash = p.inventory.filter(it => it?.type === "material" || it?.subType === "material");
    else if (sTab === "runes") displayStash = p.inventory.filter(it => it?.type === "rune" || it?.subType === "rune");
    else displayStash = this.stash;  // "personal"

    ctx.fillStyle=this.uiTheme.gold; ctx.font="bold 11px monospace"; ctx.textAlign="center";
    ctx.fillText(`${p.gold} GOLD`,leftX+PW/2,PY+76);
    ctx.fillText(`${p.gold} GOLD`,rightX+PW/2,PY+54);
    ctx.fillStyle=this.uiTheme.muted; ctx.font="8px monospace";
    ctx.fillText("click stash items to move to bag",leftX+PW/2,PY+92);
    ctx.fillText("click bag items to move to stash",rightX+PW/2,PY+286);
    ctx.fillStyle="#ff7777"; ctx.font="bold 10px monospace"; ctx.textAlign="right";
    ctx.fillText("[X] CLOSE",rightX+PW-16,PY+24);
    this._drawGridSlots(stashX,stashY,stashCols,stashRows,cell,displayStash.slice(0,stashCols*stashRows));
    this._drawGridSlots(invX,invY,invCols,invRows,cell,p.inventory.slice(0,invCols*invRows));
    const item=this._gridHoverItem(stashX,stashY,stashCols,stashRows,cell,displayStash) || this._gridHoverItem(invX,invY,invCols,invRows,cell,p.inventory);
    if(item) this._drawItemTooltip(item, Math.min(W-238,this.mouseX+16), Math.max(42,this.mouseY-16), 220);
    ctx.textAlign="left";
  }

  // ── Relic Forge panel ─────────────────────────────────────────────────────────
  _drawForge(W,H) {
    const ctx=this.ctx; const p=this.player;
    const PX=W/2-185, PY=H*0.13, PW=370, PH=Math.min(510,H*0.76);
    ctx.fillStyle="rgba(0,5,18,0.97)"; ctx.fillRect(PX,PY,PW,PH);
    ctx.strokeStyle="#cc8822"; ctx.lineWidth=2; ctx.strokeRect(PX,PY,PW,PH);
    if (this.Q.glow){ctx.shadowColor="#cc8822";ctx.shadowBlur=16;}
    ctx.fillStyle="#cc8822"; ctx.font="bold 13px monospace"; ctx.textAlign="center";
    ctx.fillText("⚗ RELIC FORGE",W/2,PY+18);
    ctx.shadowBlur=0;
    ctx.fillStyle="#ff4444"; ctx.textAlign="right";
    ctx.fillText("[X] CLOSE",PX+PW-8,PY+18); ctx.textAlign="left";

    // Forge slots (top right quadrant)
    ctx.fillStyle="#446644"; ctx.font="8px monospace";
    ctx.fillText("FORGE SLOTS:",PX+PW-188,PY+34);
    this.forgeSlots.forEach((item,i)=>{
      const sx=PX+PW-186+i*58, sy=PY+38;
      ctx.fillStyle=item ? "rgba(0,20,40,0.9)" : "rgba(0,0,0,0.5)";
      ctx.strokeStyle=item ? item.rarity.color : "#334455"; ctx.lineWidth=1;
      ctx.fillRect(sx,sy,52,52); ctx.strokeRect(sx,sy,52,52);
      if (item) {
        ctx.font="20px serif"; ctx.textAlign="center"; ctx.fillText(item.icon,sx+26,sy+28);
        ctx.fillStyle=item.rarity.color; ctx.font="7px monospace";
        ctx.fillText(item.name.slice(0,9),sx+26,sy+46);
      } else {
        ctx.fillStyle="#222"; ctx.font="8px monospace"; ctx.textAlign="center";
        ctx.fillText("empty",sx+26,sy+30);
      }
      ctx.textAlign="left";
    });

    // Transmute button
    const btnY=PY+100;
    ctx.fillStyle="#3a1e00"; ctx.strokeStyle="#cc8822"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(PX+PW-188,btnY,178,30,8); ctx.fill(); ctx.stroke();
    ctx.fillStyle="#ffcc44"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
    ctx.fillText("⚗ TRANSMUTE",PX+PW-99,btnY+20); ctx.textAlign="left";
    ctx.fillStyle="#8899aa"; ctx.font="8px monospace";
    ctx.fillText(`Gold: 💰${p.gold}`,PX+PW-188,btnY+42);

    // Recipe list (left half)
    ctx.fillStyle="#556677"; ctx.font="9px monospace";
    ctx.fillText("── RECIPES ──",PX+8,PY+34);
    const recipes=[
      {a:"3× Magic items",b:"→ 1 Rare item",c:"#4466ff"},
      {a:"2× Same runes",b:"→ Next rune tier",c:"#aaaaff"},
      {a:"3× Same gems",b:"→ Next gem quality",c:"#44ffaa"},
      {a:"1 item + 💰100",b:"→ Add socket",c:"#44aaff"},
      {a:"1 Rare item",b:"→ Reroll affixes",c:"#ffff44"},
    ];
    recipes.forEach((r,i)=>{
      const ry=PY+42+i*32;
      ctx.fillStyle=i%2===0 ? "rgba(5,12,30,0.7)" : "rgba(0,5,18,0.7)";
      ctx.fillRect(PX+4,ry,PW*0.48,28);
      ctx.fillStyle="#8899aa"; ctx.font="9px monospace";
      ctx.fillText(r.a,PX+8,ry+11);
      ctx.fillStyle=r.c; ctx.fillText(r.b,PX+8,ry+23);
    });

    // Inventory list (bottom, click → add to forge slot)
    const listY=PY+206;
    ctx.fillStyle="#334455"; ctx.font="9px monospace";
    ctx.fillText("── BAG (click item → add to forge) ──",PX+8,listY);
    const maxRows=Math.floor((PY+PH-listY-22)/24);
    p.inventory.slice(0,maxRows).forEach((item,i)=>{
      const iy=listY+8+i*24;
      ctx.fillStyle=i%2===0 ? "#050e1c" : "#080f1a"; ctx.fillRect(PX+4,iy,PW*0.7,22);
      ctx.fillStyle=item.rarity.color; ctx.font="9px monospace"; ctx.textAlign="left";
      ctx.fillText(`${item.icon} ${item.name.slice(0,24)}`,PX+8,iy+14);
    });
    if (p.inventory.length===0) {
      ctx.fillStyle="#334455"; ctx.font="9px monospace";
      ctx.fillText("bag is empty",PX+8,listY+22);
    }
    ctx.textAlign="left";
  }

  // ── Skin customization panel ──────────────────────────────────────────────────
  _drawSkinPanel(W,H) {
    const ctx=this.ctx;
    // Match click handler coords exactly: PY=H*0.2, cols at W/2-140 and W/2
    const classes=Object.keys(CR_SPRITE_DEFS);
    const rows=Math.ceil(classes.length/2);
    const PX=W/2-155, PY=H*0.2-20, PW=310, PH=40+rows*70+76;
    ctx.fillStyle="rgba(0,5,18,0.97)"; ctx.fillRect(PX,PY,PW,PH);
    ctx.strokeStyle="#cc44ff"; ctx.lineWidth=2; ctx.strokeRect(PX,PY,PW,PH);
    if (this.Q.glow){ctx.shadowColor="#cc44ff";ctx.shadowBlur=14;}
    ctx.fillStyle="#cc44ff"; ctx.font="bold 13px monospace"; ctx.textAlign="center";
    ctx.fillText("🎨 SKIN CUSTOMIZATION",W/2,PY+16);
    ctx.shadowBlur=0;
    // Close button: matches click check cx>W/2+130&&cy<H*0.2+30
    ctx.fillStyle="#ff4444"; ctx.font="bold 10px monospace"; ctx.textAlign="right";
    ctx.fillText("[X] CLOSE",W/2+148,PY+16);
    ctx.fillStyle="#8899aa"; ctx.font="8px monospace"; ctx.textAlign="center";
    ctx.fillText("Upload PNG/JPG to replace a character sprite",W/2,PY+30);
    ctx.textAlign="left";

    const itemPY=H*0.2+40; // matches click handler's PY
    classes.forEach((clsId,i)=>{
      const row=Math.floor(i/2), col=i%2;
      const bx=W/2-140+col*140, by=itemPY+row*70; // exact click handler coords
      const cls=Object.values(CR_CLASSES).find(c=>c.id===clsId);
      const hasSkin=!!(CR_SKIN_CACHE[clsId]&&CR_SKIN_CACHE[clsId].complete&&CR_SKIN_CACHE[clsId].naturalWidth>0);
      ctx.fillStyle=hasSkin ? "rgba(0,40,0,0.6)" : "rgba(5,12,30,0.65)";
      ctx.strokeStyle=hasSkin ? "#44ff88" : "#334455"; ctx.lineWidth=1;
      ctx.fillRect(bx,by,128,64); ctx.strokeRect(bx,by,128,64);

      // Sprite preview (left side of card)
      ctx.save(); ctx.translate(bx+16,by+35);
      if (hasSkin) {
        ctx.drawImage(CR_SKIN_CACHE[clsId],-12,-26,28,38);
      } else {
        this._drawCharSprite(ctx,0,0,clsId,0,this._frame,12,1,false,{uiMode:true});
      }
      ctx.restore();

      // Name + status
      ctx.fillStyle=cls ? cls.color : "#aaa"; ctx.font="bold 8px monospace"; ctx.textAlign="left";
      ctx.fillText(`${cls ? cls.icon : ""} ${clsId.replace(/_/g," ").toUpperCase()}`,bx+32,by+12);
      ctx.fillStyle=hasSkin ? "#44ff88" : "#556677"; ctx.font="7px monospace";
      ctx.fillText(hasSkin ? "✓ CUSTOM" : "default",bx+32,by+23);

      // Upload button: bx+30 to bx+80, by+44 to by+62 (narrow — clear is bx+82–125)
      ctx.fillStyle="#1a2244"; ctx.strokeStyle="#4466aa"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(bx+30,by+44,48,18,4); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#88aaff"; ctx.font="7px monospace"; ctx.textAlign="center";
      ctx.fillText("📤 UPLOAD",bx+54,by+55);

      // Clear button (only shown when skin exists): bx+82 to bx+125
      if (hasSkin) {
        ctx.fillStyle="#442222"; ctx.strokeStyle="#aa4444"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.roundRect(bx+82,by+44,42,18,4); ctx.fill(); ctx.stroke();
        ctx.fillStyle="#ff8888"; ctx.font="7px monospace";
        ctx.fillText("CLEAR",bx+103,by+55);
      }
      ctx.textAlign="left";
    });

    // Mercenary row
    const mercBy=itemPY+rows*70;
    const hasMercSkin=!!(CR_SKIN_CACHE.mercenary&&CR_SKIN_CACHE.mercenary.complete&&CR_SKIN_CACHE.mercenary.naturalWidth>0);
    if (mercBy+64<PY+PH-4) {
      ctx.fillStyle=hasMercSkin ? "rgba(0,40,0,0.6)" : "rgba(5,12,30,0.65)";
      ctx.strokeStyle=hasMercSkin ? "#44ff88" : "#334455"; ctx.lineWidth=1;
      ctx.fillRect(W/2-140,mercBy,PW-16,64); ctx.strokeRect(W/2-140,mercBy,PW-16,64);
      ctx.save(); ctx.translate(W/2-124,mercBy+35);
      this._drawCharSprite(ctx,0,0,"iron_warden",0,this._frame,12,1,false,{uiMode:true});
      ctx.restore();
      ctx.fillStyle="#cc8833"; ctx.font="bold 8px monospace"; ctx.textAlign="left";
      ctx.fillText("⚔ MERCENARY",W/2-108,mercBy+12);
      ctx.fillStyle=hasMercSkin ? "#44ff88" : "#556677"; ctx.font="7px monospace";
      ctx.fillText(hasMercSkin ? "✓ CUSTOM" : "default",W/2-108,mercBy+23);
      ctx.fillStyle="#1a2244"; ctx.strokeStyle="#4466aa"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(W/2-108,mercBy+44,48,18,4); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#88aaff"; ctx.font="7px monospace"; ctx.textAlign="center";
      ctx.fillText("📤 UPLOAD",W/2-84,mercBy+55);
      if (hasMercSkin) {
        ctx.fillStyle="#442222"; ctx.strokeStyle="#aa4444"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.roundRect(W/2-56,mercBy+44,42,18,4); ctx.fill(); ctx.stroke();
        ctx.fillStyle="#ff8888"; ctx.font="7px monospace";
        ctx.fillText("CLEAR",W/2-35,mercBy+55);
      }
    }
    ctx.textAlign="left";
  }

  _drawActComplete(W,H) {
    const ctx=this.ctx; const act=this.act;
    ctx.fillStyle="rgba(0,0,0,0.95)"; ctx.fillRect(0,0,W,H);
    // Logo watermark
    if (CR_LOGO_IMG && CR_LOGO_IMG.complete && CR_LOGO_IMG.naturalWidth>0) {
      const lw = Math.min(360, W*0.5), lh = lw * (CR_LOGO_IMG.naturalHeight/CR_LOGO_IMG.naturalWidth);
      ctx.save(); ctx.globalAlpha=0.85;
      ctx.drawImage(CR_LOGO_IMG, W/2-lw/2, H*0.06, lw, lh);
      ctx.restore();
    }
    ctx.fillStyle=act.color; ctx.font=`bold ${Math.min(36,W/12)}px monospace`; ctx.textAlign="center";
    ctx.shadowColor=act.color; ctx.shadowBlur=40;
    ctx.fillText(`${act.icon} ACT ${act.id} COMPLETE!`,W/2,H/2-60);
    ctx.shadowBlur=0;
    ctx.fillStyle="#ffdd00"; ctx.font="18px monospace";
    ctx.fillText(act.name,W/2,H/2-24);
    ctx.fillStyle="#8899aa"; ctx.font="13px monospace";
    ctx.fillText(`Score: ${this.score}  ·  Lv.${this.player.level}  ·  💰${this.player.gold}`,W/2,H/2+14);

    const nextAct = CR_ACTS[this.actIdx+1];
    if (nextAct) {
      // Continue button
      const bx=W/2-100, by=H/2+50;
      ctx.fillStyle="rgba(0,5,20,0.9)"; ctx.strokeStyle=nextAct.color; ctx.lineWidth=2;
      ctx.beginPath(); ctx.roundRect(bx,by,200,44,12); ctx.fill(); ctx.stroke();
      ctx.fillStyle=nextAct.color; ctx.font="bold 13px monospace";
      ctx.fillText(`${nextAct.icon} CONTINUE: ACT ${nextAct.id}`,W/2,by+28);
      // Handle click
      if (!this._actCompleteClickBound) {
        this._actCompleteClickBound=true;
        const handler=e=>{
          const r=this.canvas.getBoundingClientRect();
          const cx=e.clientX-r.left, cy=e.clientY-r.top;
          if(cx>bx&&cx<bx+200&&cy>by&&cy<by+44){
            this.canvas.removeEventListener("mousedown",handler);
            this._actCompleteClickBound=false;
            this.actIdx=Math.min(5,this.actIdx+1);
            this.act=CR_ACTS[this.actIdx];
            this.waypoints[this.actIdx+1]=true;
            const seed=Date.now()^(this.actIdx*7919);
            this.dungeon=_genDungeon(60,60,_rng(seed));
            this.town=_genTownMap(this.actIdx);
            this.wilderness=_genWildernessMap(this.actIdx,_rng(seed^0x51a7));
            this.player.wx=this.town.spawnWx;
            this.player.wy=this.town.spawnWy;
            this.enemies=[]; this.projectiles=[]; this.loot=[];
            this.particles=[]; this.floatingText=[];
            this.boss=null; this.bossSpawned=false;
            this.player.hp=this.player.maxHp; this.player.mp=this.player.maxMp;
            this.shopItems=this._genShopItems();
            this.moveTarget=null; this.attackTarget=null;
            this.screen="town"; this.gameOver=false;
            this._centerCamera();
          }
        };
        this.canvas.addEventListener("mousedown",handler);
      }
    } else {
      ctx.fillStyle="#ffdd00"; ctx.font="bold 16px monospace";
      ctx.fillText("🏆 ALL ACTS COMPLETE — CHAMPION OF THE REALM!",W/2,H/2+50);
      this.gameOver=true;
    }
    ctx.textAlign="left";
  }

  _drawDead(W,H) {
    const ctx=this.ctx;
    ctx.fillStyle="rgba(30,0,0,0.96)"; ctx.fillRect(0,0,W,H);
    if (CR_LOGO_IMG && CR_LOGO_IMG.complete && CR_LOGO_IMG.naturalWidth>0) {
      const lw = Math.min(320, W*0.45), lh = lw * (CR_LOGO_IMG.naturalHeight/CR_LOGO_IMG.naturalWidth);
      ctx.save(); ctx.globalAlpha=0.55;
      ctx.drawImage(CR_LOGO_IMG, W/2-lw/2, H*0.08, lw, lh);
      ctx.restore();
    }
    ctx.fillStyle="#ff4444"; ctx.font=`bold ${Math.min(48,W/8)}px monospace`; ctx.textAlign="center";
    ctx.shadowColor="#ff2200"; ctx.shadowBlur=60;
    ctx.fillText("YOU DIED",W/2,H/2-80);
    ctx.shadowBlur=0;
    ctx.fillStyle="#8899aa"; ctx.font="14px monospace";
    ctx.fillText(`${this.cls.icon} ${this.cls.name} — Lv.${this.player.level}  Score: ${this.score}`,W/2,H/2-30);

    // Diablo-style corpse-recovery message
    ctx.fillStyle="#ffaa44"; ctx.font="bold 13px monospace";
    ctx.fillText("Your corpse holds your gear.", W/2, H/2+10);
    ctx.fillStyle="#ffaa44"; ctx.font="11px monospace";
    ctx.fillText("Return to town, then walk back to recover it.", W/2, H/2+30);

    // RETURN TO TOWN button — large, click + key actionable.
    const bx=W/2-130, by=H/2+58, bw=260, bh=46;
    this._deadReturnRect = { x:bx, y:by, w:bw, h:bh };
    ctx.fillStyle="rgba(20,40,30,0.95)";
    ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,12); ctx.fill();
    ctx.strokeStyle="#44ff88"; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle="#44ff88"; ctx.font="bold 14px monospace";
    ctx.fillText("▶ RETURN TO TOWN (R / ENTER)", W/2, by+29);

    // Pull out from gameover so death isn't terminal.
    this.gameOver=false;

    // One-time click + key handler binding for the return button.
    if (!this._deadClickBound) {
      this._deadClickBound = true;
      const click = (e) => {
        if (this.screen !== "dead") return;
        const r = this.canvas.getBoundingClientRect();
        const cx = (e.clientX - r.left) * (this.canvas.width / r.width);
        const cy = (e.clientY - r.top) * (this.canvas.height / r.height);
        const rect = this._deadReturnRect;
        if (rect && cx >= rect.x && cx <= rect.x + rect.w && cy >= rect.y && cy <= rect.y + rect.h) {
          this._returnToTownFromDeath?.();
        }
      };
      const key = (e) => {
        if (this.screen !== "dead") return;
        if (e.key === "r" || e.key === "R" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this._returnToTownFromDeath?.();
        }
      };
      this.canvas.addEventListener("mousedown", click);
      window.addEventListener("keydown", key);
      this._deadClickHandler = click;
      this._deadKeyHandler = key;
    }
    ctx.textAlign="left";
  }

  _drawPause(W,H) {
    const ctx=this.ctx;
    this._drawPauseDashboard(W,H);
    return;
    ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#4488ff"; ctx.font="bold 28px monospace"; ctx.textAlign="center";
    ctx.fillText("⏸ PAUSED",W/2,H/2);
    ctx.fillStyle="#8899aa"; ctx.font="12px monospace";
    ctx.fillText("ESC to resume  ·  I for inventory  ·  QUIT to exit",W/2,H/2+36);
    ctx.textAlign="left";
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  _drawPauseDashboard(W,H) {
    const ctx=this.ctx;
    const mobile = this._isMobileLayout(W,H);
    const pw = Math.min(W-18, mobile ? W-16 : 920);
    const ph = Math.min(H-18, mobile ? H-14 : 590);
    const dense = ph < 450;
    const px = (W-pw)/2, py = (H-ph)/2;
    this.pauseRects = [];
    const addRect = (id,x,y,w,h) => this.pauseRects.push({id,x,y,w,h});
    const btn = (id,label,x,y,w,h,color="#d6b65c",active=false) => {
      addRect(id,x,y,w,h);
      ctx.fillStyle = active ? `${color}33` : "rgba(0,0,0,0.48)";
      ctx.beginPath(); ctx.roundRect(x,y,w,h,6); ctx.fill();
      ctx.strokeStyle = active ? color : "#3b3427"; ctx.lineWidth = active ? 2 : 1; ctx.stroke();
      ctx.fillStyle = active ? color : "#d8d1be"; ctx.font = `bold ${dense?8:mobile?9:10}px monospace`; ctx.textAlign="center";
      ctx.fillText(label,x+w/2,y+h/2+4);
    };
    ctx.fillStyle="rgba(0,0,0,0.78)"; ctx.fillRect(0,0,W,H);
    const bg=ctx.createLinearGradient(px,py,px+pw,py+ph);
    bg.addColorStop(0,"#120d0a"); bg.addColorStop(0.55,"#070708"); bg.addColorStop(1,"#17100b");
    ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(px,py,pw,ph,12); ctx.fill();
    ctx.strokeStyle="#75654b"; ctx.lineWidth=2; ctx.stroke();
    ctx.strokeStyle="#211914"; ctx.lineWidth=6; ctx.strokeRect(px+5,py+5,pw-10,ph-10);
    ctx.fillStyle=this.cls.color; ctx.font=`bold ${dense?13:mobile?17:22}px monospace`; ctx.textAlign="left";
    ctx.fillText(mobile ? "DASHBOARD" : "CRYPTIC REALM DASHBOARD",px+22,py+34);
    ctx.fillStyle="#a99c86"; ctx.font=`${dense?8:mobile?9:11}px monospace`;
    ctx.fillText(`${this.cls.name}  LV ${this.player.level}  ${this.difficulty.toUpperCase()}  P${this.playerCount || 1}  ${this.camera.toUpperCase()}  ${this.quality.toUpperCase()}`,px+22,py+54);
    btn("resume","RESUME",px+pw-(mobile?96:128),py+18,mobile?78:104,30,"#44ff88",false);

    const tabs = ["save","game","online","video","audio","controls","chronicle"];
    if (this.isSuperAdmin) tabs.push("admin");
    const tabY=py+74, tabW=Math.min(116,(pw-44)/tabs.length);
    tabs.forEach((t,i)=>btn(`tab:${t}`,t.toUpperCase(),px+22+i*(tabW+4),tabY,tabW,28,t===this.pauseTab?this.cls.color:"#6a6257",t===this.pauseTab));
    const cx=px+24, cy=tabY+48, cw=pw-48, ch=ph-(cy-py)-24;
    ctx.fillStyle="rgba(0,0,0,0.36)"; ctx.beginPath(); ctx.roundRect(cx,cy,cw,ch,8); ctx.fill();
    ctx.strokeStyle="#2d261e"; ctx.lineWidth=1; ctx.stroke();
    const sectionTitle = (text,y,color=this.cls.color) => {
      ctx.fillStyle=color; ctx.font=`bold ${dense?10:mobile?12:14}px monospace`; ctx.textAlign="left"; ctx.fillText(text,cx+18,y);
      ctx.strokeStyle=`${color}66`; ctx.beginPath(); ctx.moveTo(cx+18,y+8); ctx.lineTo(cx+cw-18,y+8); ctx.stroke();
    };
    const line = (text,x,y,color="#d8d1be") => { ctx.fillStyle=color; ctx.font=`${dense?8:mobile?9:11}px monospace`; ctx.textAlign="left"; ctx.fillText(text,x,y); };
    const grid = (items,y,cols=null,bh=32) => {
      const count = items.length;
      const useCols = cols || Math.max(1, Math.min(count, cw < 430 ? 2 : cw < 650 ? 3 : count));
      const gap = dense ? 5 : mobile ? 7 : 10;
      const actualBh = dense ? Math.min(bh,26) : bh;
      const rowStep = actualBh + (dense ? 5 : 8);
      const bw = Math.max(52, Math.floor((cw-40-gap*(useCols-1))/useCols));
      items.forEach((it,i)=>{
        const col=i%useCols, row=Math.floor(i/useCols);
        btn(it.id,it.label,cx+20+col*(bw+gap),y+row*rowStep,bw,actualBh,it.color||this.cls.color,!!it.active);
      });
      return y + Math.ceil(count/useCols)*rowStep;
    };

    if ((this.pauseTab || "save") === "save") {
      sectionTitle("SAVE GAME",cy+30,"#44ff88");
      const saveLine1 = dense ? cy+56 : cy+64;
      const saveLineStep = dense ? 16 : 20;
      line("Local browser save slot: cryptic_realm_save_v1",cx+20,saveLine1);
      line(`Last save: ${this.lastSaveAt || "not saved this session"}`,cx+20,saveLine1+saveLineStep,"#a99c86");
      line(`Act ${this.actIdx+1}: ${this.act.name}  Screen: ${this.screen}  Gold: ${this.player.gold}  Score: ${this.score}`,cx+20,saveLine1+saveLineStep*2);
      const afterSaveBtns = grid([
        { id:"save", label:"SAVE NOW", color:"#44ff88", active:true },
        { id:"resume", label:"RETURN TO GAME", color:this.cls.color },
      ],dense ? cy+104 : cy+128,cw<430?1:2,36);
      const savedBits = dense
        ? ["character, inventory, act and difficulty","camera, map position and player-count setting"]
        : ["character stats, inventory, equipment and stash","mercenary, shop inventory, act, difficulty and gold","camera mode, zoom, yaw, pitch and lock state","settings, key bindings, player-count and chronicle"];
      sectionTitle("WHAT IS SAVED",afterSaveBtns+(dense?22:36),"#d6b65c");
      savedBits.forEach((t,i)=>line(t,cx+22,afterSaveBtns+(dense?48:68)+i*(dense?16:22)));
    } else if (this.pauseTab === "game") {
      sectionTitle("GAMEPLAY",cy+30,"#ffdd66");
      line(`Difficulty: ${this.difficulty.toUpperCase()}  |  Players setting: P${this.playerCount || 1}`,cx+20,cy+64);
      const afterGameBtns = grid([
        { id:"players:-", label:"P-", color:"#ffdd66" },
        { id:"players:+", label:"P+", color:"#ffdd66" },
        { id:"bag", label:"INVENTORY", color:this.cls.color },
        { id:"skills", label:"SKILLS", color:this.cls.color },
        { id:"quests", label:"QUESTS", color:this.cls.color },
      ],cy+88,cw<520?2:5,32);
      sectionTitle("SESSION",afterGameBtns+34,"#d6b65c");
      line("P1-P8 scales enemy health/damage like a solo difficulty multiplier.",cx+20,afterGameBtns+68);
      line("Use town exits for wilderness, caves and dungeon travel.",cx+20,afterGameBtns+90);
      sectionTitle("EMERGENCY",afterGameBtns+112,"#ff8844");
      line("Stuck in void or lost in the dungeon? Teleport safely back to town.",cx+20,afterGameBtns+146,"#a99c86");
      grid([
        { id:"rescue", label:"RESCUE — RECALL TO TOWN", color:"#ff8844" },
      ],afterGameBtns+162,1,34);
    } else if (this.pauseTab === "online") {
      sectionTitle("DIABL0.NET ONLINE",cy+30,"#44ff88");
      const lobby = this.onlineLobby || {};
      line(`Bridge: ${this.gameSettings.onlineWsUrl}  |  Room: ${this.online?.roomId || "none"}  |  ${this.online?.connected ? "CONNECTED" : "OFFLINE"}`,cx+20,cy+64,this.online?.connected ? "#44ff88" : "#ff8844");
      const afterOnlineBtns = grid([
        { id:"online:refresh", label:lobby.status==="searching"?"SEARCHING...":"SEARCH PUBLIC GAMES", color:"#44ff88", active:lobby.status==="searching" },
        { id:"online:create", label:"MAKE PUBLIC GAME", color:"#ffd06a", active:lobby.status==="creating" },
        { id:"d2o:online", label:this.online?.connected?"DISCONNECT":"CONNECT BRIDGE", color:"#88ccff", active:this.online?.connected },
      ],cy+88,cw<520?1:3,34);
      const games = Array.isArray(lobby.games) ? lobby.games.slice(0,8) : [];
      sectionTitle("PUBLIC GAMES",afterOnlineBtns+28,"#d6b65c");
      if (games.length) {
        games.forEach((g,i)=>{
          const y=afterOnlineBtns+62+i*28;
          const name=String(g.name||g.id||"Diabl0 Room").slice(0,32);
          line(`${name}  P${g.players||0}/${g.maxPlayers||8}  ${String(g.difficulty||"normal").toUpperCase()}`,cx+20,y,"#d8d1be");
          btn(`online:join:${g.id}`,"JOIN",cx+cw-100,y-18,78,24,"#44ff88",this.online?.roomId===g.id);
        });
      } else {
        line(lobby.lastError || "No public games yet. Make one and it will appear here.",cx+20,afterOnlineBtns+64,lobby.lastError ? "#ff5544" : "#a99c86");
      }
    } else if (this.pauseTab === "video") {
      sectionTitle("VIDEO + CAMERA",cy+30,"#88ccff");
      if (this.showDiabloGfxPanel) {
        const ex = cx + 22, ey = cy + 58, ew = cw - 44, eh = ch - 88;
        ctx.fillStyle="rgba(30,6,4,0.72)"; ctx.beginPath(); ctx.roundRect(ex,ey,ew,eh,12); ctx.fill();
        ctx.strokeStyle="#ff5544"; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle="#ff8844"; ctx.font=`bold ${dense?13:18}px monospace`; ctx.textAlign="left";
        ctx.fillText("DIABL0.NET DEMON EGG CHAMBER",ex+22,ey+30);
        line("Hidden Diablo I / Hellfire and Diablo II compatibility controls live here as this grows.",ex+22,ey+54,"#d8d1be");
        const eggCx = ex + Math.min(170, ew*0.23), eggCy = ey + Math.min(170, eh*0.48);
        addRect("gfx:diabloegg", eggCx-70, eggCy-88, 140, 176);
        ctx.save();
        ctx.shadowColor="#ff3322"; ctx.shadowBlur=28;
        const eg=ctx.createRadialGradient(eggCx-22,eggCy-34,10,eggCx,eggCy,78);
        eg.addColorStop(0,"#ffd0a0"); eg.addColorStop(0.36,"#8a1c16"); eg.addColorStop(1,"#220403");
        ctx.fillStyle=eg;
        ctx.beginPath(); ctx.ellipse(eggCx,eggCy,54,74,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="#ff6644"; ctx.lineWidth=3; ctx.stroke();
        ctx.strokeStyle="#ffcc66"; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(eggCx-10,eggCy-54); ctx.lineTo(eggCx+10,eggCy-30); ctx.lineTo(eggCx-5,eggCy-8); ctx.lineTo(eggCx+14,eggCy+24); ctx.stroke();
        ctx.fillStyle="#ffdd88"; ctx.font="bold 11px monospace"; ctx.textAlign="center"; ctx.fillText("CLICK TO CLOSE",eggCx,eggCy+104);
        ctx.restore();
        const report = this.d2CompatibilityReport || D2Engine.compatibility?.lastReport;
        const compatText = report
          ? `D1/HF ${report.profiles?.diablo1_hellfire?.status || "?"}  |  D2 ${report.profiles?.diablo2_lod?.status || "?"}`
          : "Compatibility packs: CRYPTIC_HELLFIRE.MPQ / CRYPTIC_DIABLO2.MPQ or owned source MPQs.";
        line(compatText,ex+ew*0.38,ey+86,report?.perfectMode ? "#44ff88" : "#d6b65c");
        const chamberY = ey + 112;
        const chamberAfter = grid([
          { id:"d2o:mode",      label:this.gameSettings.d2oMode?"D2O ENGINE ON":"D2O ENGINE OFF", color:"#cc88ff", active:this.gameSettings.d2oMode },
          { id:"d2o:dvx",       label:this.gameSettings.devilutionX?"HELLFIRE MODE ON":"HELLFIRE MODE OFF", color:"#ff8844", active:this.gameSettings.devilutionX },
          { id:"d2o:campaign",  label:this.secretCampaign?.enabled?"D1->D2 CAMPAIGN ON":"D1->D2 CAMPAIGN OFF", color:"#ff5544", active:!!this.secretCampaign?.enabled },
          { id:"d2o:online",    label:this.online?.connected?"ONLINE ROOM LIVE":this.gameSettings.onlinePlay?"ONLINE CONNECTING":"ONLINE PLAY OFF", color:"#44ff88", active:!!this.online?.connected },
          { id:"d2o:loadmpq",   label:"LOAD LOCAL MPQ PACKS", color:"#88ccff", active:false },
          { id:"d2o:validate",  label:"VALIDATE ENGINE", color:"#ffd06a", active:!!report?.perfectMode },
          { id:"d2o:diablonet", label:this.gameSettings.diabl0WhiteLabel?"DIABL0 WHITE-LABEL ON":"DIABL0 WHITE-LABEL", color:"#ffdd44", active:!!this.gameSettings.diabl0WhiteLabel },
        ],chamberY,cw<620?1:3,34);
        const previewY = chamberAfter + 12;
        const previewH = Math.min(140, Math.max(0, ey + eh - previewY - 12));
        if (previewH >= 84) this._drawD2ArmoryPreview(ex + Math.min(250, ew*0.38), previewY, Math.max(220, ew - Math.min(280, ew*0.42) - 22), previewH);
        return;
      }
      const qRows=[["low","16-BIT"],["medium","32-BIT"],["high","64-BIT"],["ultra","128-BIT"]];
      const afterQuality = grid(qRows.map(([id,label])=>({ id:`quality:${id}`, label, color:id==="ultra"?"#cc44ff":id==="high"?"#ff8800":id==="medium"?"#44aaff":"#88aa88", active:this.quality===id })),cy+58,cw<520?2:4,32);
      const cams=["iso","top","third","fps"];
      const afterCameras = grid(cams.map(id=>({ id:`camera:${id}`, label:id.toUpperCase(), color:"#88ccff", active:this.camera===id })),afterQuality+8,cw<520?2:4,32);
      const afterTune = grid([
        { id:"zoom:-", label:"ZOOM -", color:"#d6b65c" },
        { id:"zoom:+", label:"ZOOM +", color:"#d6b65c" },
        { id:"pitch:-", label:"PITCH -", color:"#d6b65c" },
        { id:"pitch:+", label:"PITCH +", color:"#d6b65c" },
        { id:"camera:reset", label:"RESET CAMERA", color:"#ff8844" },
        { id:"camera:lock", label:this.cameraLocked?"UNLOCK CAMERA":"LOCK CAMERA", color:"#ff8844", active:this.cameraLocked },
      ],afterCameras+10,cw<520?2:6,32);
      line(`Zoom ${Math.round(this.cameraZoom*100)}%  Yaw ${Math.round((this.cameraYaw||0)*180/Math.PI)}deg  Pitch ${Math.round((this.cameraPitch||0)*100)}`,cx+20,afterTune+22);
      sectionTitle("DISPLAY FEEL",afterTune+52,"#d6b65c");
      line(`Gamma ${this.gameSettings.video.gamma.toFixed(2)}  Contrast ${this.gameSettings.video.contrast.toFixed(2)}  Damage text ${this.gameSettings.video.damageNumbers?"on":"off"}  Shake ${this.gameSettings.video.screenShake?"on":"off"}`,cx+20,afterTune+76);
      const afterFeel = grid([
        { id:"video:gamma:-", label:"GAMMA -", color:"#88ccff" },
        { id:"video:gamma:+", label:"GAMMA +", color:"#88ccff" },
        { id:"video:contrast:-", label:"CONTRAST -", color:"#d6b65c" },
        { id:"video:contrast:+", label:"CONTRAST +", color:"#d6b65c" },
        { id:"video:damage", label:this.gameSettings.video.damageNumbers?"DAMAGE TEXT ON":"DAMAGE TEXT OFF", color:"#ffdd66", active:this.gameSettings.video.damageNumbers },
        { id:"video:shake", label:this.gameSettings.video.screenShake?"SCREEN SHAKE ON":"SCREEN SHAKE OFF", color:"#ff8844", active:this.gameSettings.video.screenShake },
        { id:"video:glbmed", label:this.gameSettings.glbMedium?"3D @ MEDIUM ON":"3D @ MEDIUM OFF", color:"#88ccff", active:this.gameSettings.glbMedium },
      ],afterTune+92,cw<520?2:4,32);
      sectionTitle("GFX EASTER EGG",afterFeel+22,"#ff8844");
      line(this.showDiabloGfxPanel ? "Mini Diablo hatched. Diabl0.net compatibility controls are awake." : "Crack the demon egg to open the hidden Diablo I / Diablo II compatibility menus.",cx+20,afterFeel+46,"#b9b2a4");
      const eggY = afterFeel + 62;
      addRect("gfx:diabloegg",cx+20,eggY,Math.min(360,cw-40),52);
      ctx.save();
      const bx=cx+20, by=eggY, bw=Math.min(360,cw-40), bh=52;
      ctx.fillStyle="rgba(40,4,4,0.7)"; ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,10); ctx.fill();
      ctx.strokeStyle="#ff5544"; ctx.lineWidth=2; ctx.stroke();
      ctx.shadowColor="#ff3322"; ctx.shadowBlur=14;
      ctx.fillStyle="#8a1c16"; ctx.beginPath(); ctx.ellipse(bx+34,by+26,18,24,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#ffcc66"; ctx.beginPath(); ctx.moveTo(bx+32,by+10); ctx.lineTo(bx+42,by+24); ctx.lineTo(bx+30,by+40); ctx.stroke();
      ctx.shadowBlur=0; ctx.fillStyle="#ffddcc"; ctx.font="bold 11px monospace"; ctx.textAlign="left"; ctx.fillText("DEMON EGG",bx+68,by+22);
      ctx.fillStyle="#b9b2a4"; ctx.font="9px monospace"; ctx.fillText("Open full-screen Diabl0.net controls",bx+68,by+38);
      ctx.restore();
      if (this.showDiabloGfxPanel) {
        const curTheme = this._activeTheme || DEFAULT_THEME;
        const report = this.d2CompatibilityReport || D2Engine.compatibility?.lastReport;
        const compatText = report
          ? `D1/HF ${report.profiles?.diablo1_hellfire?.status || "?"}  |  D2 ${report.profiles?.diablo2_lod?.status || "?"}`
          : "Local compatibility packs: CRYPTIC_HELLFIRE.MPQ / CRYPTIC_DIABLO2.MPQ or owned source MPQs.";
        line(compatText,cx+20,eggY+24,report?.perfectMode ? "#44ff88" : "#d6b65c");
        const d2MenuY = grid([
          { id:"d2o:mode",      label:this.gameSettings.d2oMode?"D2O ENGINE ON":"D2O ENGINE OFF", color:"#cc88ff", active:this.gameSettings.d2oMode },
          { id:"d2o:dvx",       label:this.gameSettings.devilutionX?"HELLFIRE MODE ON":"HELLFIRE MODE OFF", color:"#ff8844", active:this.gameSettings.devilutionX },
          { id:"d2o:campaign",  label:this.secretCampaign?.enabled?"D1->D2 CAMPAIGN ON":"D1->D2 CAMPAIGN OFF", color:"#ff5544", active:!!this.secretCampaign?.enabled },
          { id:"d2o:online",    label:this.online?.connected?"ONLINE ROOM LIVE":this.gameSettings.onlinePlay?"ONLINE CONNECTING":"ONLINE PLAY OFF", color:"#44ff88", active:!!this.online?.connected },
          { id:"d2o:loadmpq",   label:"LOAD LOCAL MPQ PACKS", color:"#88ccff", active:false },
          { id:"d2o:validate",  label:"VALIDATE ENGINE", color:"#ffd06a", active:!!report?.perfectMode },
        { id:"d2o:diablonet", label:this.gameSettings.diabl0WhiteLabel?"DIABL0 WHITE-LABEL ON":"DIABL0 WHITE-LABEL", color:"#ffdd44", active:!!this.gameSettings.diabl0WhiteLabel },
        ],eggY+42,cw<520?1:3,32);
        const lobby = this.onlineLobby || {};
        const games = Array.isArray(lobby.games) ? lobby.games.slice(0,4) : [];
        sectionTitle("DIABL0.NET ONLINE GAMES",d2MenuY+18,"#44ff88");
        const lobbyY = grid([
          { id:"online:refresh", label:lobby.status==="searching"?"SEARCHING...":"SEARCH GAMES", color:"#44ff88", active:lobby.status==="searching" },
          { id:"online:create", label:"CREATE GAME", color:"#ffd06a", active:lobby.status==="creating" },
        ],d2MenuY+40,cw<520?1:2,32);
        if (games.length) {
          games.forEach((g,i)=>{
            const y = lobbyY + 18 + i*22;
            const name = String(g.name || g.id || "Diabl0 Room").slice(0,28);
            line(`${name}  P${g.players || 0}/${g.maxPlayers || 8}  ${String(g.difficulty || "normal").toUpperCase()}`,cx+20,y,"#d8d1be");
            btn(`online:join:${g.id}`, "JOIN", cx+cw-94, y-14, 72, 20, "#44ff88", this.online?.roomId===g.id);
          });
        } else {
          line(lobby.lastError || "No public rooms listed yet. Create one or search again.",cx+20,lobbyY+22,lobby.lastError ? "#ff5544" : "#a99c86");
        }
        const themeY = lobbyY + (games.length ? 122 : 58);
        sectionTitle("THEME SKIN",themeY,"#FFD700");
        grid(Object.values(THEMES).map(t=>({
          id:`theme:${t.id}`, label:`${t.emoji} ${t.label}`,
          color: t.palette.accentBright, active: curTheme===t.id,
        })),themeY+22,cw<520?2:5,32);
      }
    } else if (this.pauseTab === "audio") {
      sectionTitle("AUDIO + ACCESSIBILITY",cy+30,"#44ff88");
      line(`Master ${this.gameSettings.sound.master}%  Music ${this.gameSettings.sound.music}%  Effects ${this.gameSettings.sound.effects}%`,cx+20,cy+64);
      const afterAudio=grid([
        { id:"sound:master:-", label:"MASTER -", color:"#44ff88" },
        { id:"sound:master:+", label:"MASTER +", color:"#44ff88" },
        { id:"sound:music:-", label:"MUSIC -", color:"#88ccff" },
        { id:"sound:music:+", label:"MUSIC +", color:"#88ccff" },
        { id:"sound:effects:-", label:"EFFECTS -", color:"#ffdd66" },
        { id:"sound:effects:+", label:"EFFECTS +", color:"#ffdd66" },
        { id:"sound:mute", label:this.gameSettings.sound.mute?"UNMUTE":"MUTE", color:"#ff8844", active:this.gameSettings.sound.mute },
        { id:"sound:test", label:"TEST SOUND", color:"#ffcc88" },
      ],cy+88,cw<520?2:4,32);
      sectionTitle("ACCESSIBILITY",afterAudio+30,"#d6b65c");
      line("Visual tuning moved to VIDEO + CAMERA. Audio stays focused on sound, mute, and future captions/subtitles.",cx+20,afterAudio+64,"#b9b2a4");
      line("Diabl0.net compatibility lives behind the GFX demon egg in VIDEO + CAMERA.",cx+20,afterAudio+86,"#ff8844");
      if (this.showLegacyAudioDiabloPanel) {
      // ── v8.0 DIABLO ABYSS ENGINE THEME PANEL ────────────────────────────────
      sectionTitle("⚡  DIABLO ABYSS ENGINE  v8.0  ·  THEME & MODE",afterAudio+160,"#FF4500");
      line("OpenDiablo2 · DevilutionX · AbyssEngine · d2gs1.09d/1.13c  — 20 classes, all absorbed",cx+20,afterAudio+182,"#8B4513");
      const curTheme = this._activeTheme || DEFAULT_THEME;
      const report = this.d2CompatibilityReport || D2Engine.compatibility?.lastReport;
      const compatText = report
        ? `D1/HF ${report.profiles?.diablo1_hellfire?.status || "?"}  |  D2 ${report.profiles?.diablo2_lod?.status || "?"}`
        : "One file per mode: Hellfire/D1 MPQ or merged D2 compatibility MPQ.";
      line(compatText,cx+20,afterAudio+198,report?.perfectMode ? "#44ff88" : "#d6b65c");
      grid([
        { id:"d2o:mode",      label:this.gameSettings.d2oMode?"D2O MODE ON":"D2O MODE OFF",          color:"#cc88ff", active:this.gameSettings.d2oMode },
        { id:"d2o:dvx",       label:this.gameSettings.devilutionX?"DEVILUTIONX ON":"DEVILUTIONX OFF", color:"#ff8844", active:this.gameSettings.devilutionX },
        { id:"d2o:campaign",  label:this.secretCampaign?.enabled?"HELLFIRE->D2 ON":"HELLFIRE->D2 OFF", color:"#ff5544", active:!!this.secretCampaign?.enabled },
        { id:"d2o:online",    label:this.online?.connected?"ONLINE ROOM LIVE":this.gameSettings.onlinePlay?"ONLINE CONNECTING":"ONLINE PLAY OFF", color:"#44ff88", active:!!this.online?.connected },
        { id:"d2o:loadmpq",   label:"LOAD D1/D2 MPQS", color:"#88ccff", active:false },
        { id:"d2o:validate",  label:"VALIDATE PERFECT MODE", color:"#ffd06a", active:!!report?.perfectMode },
        { id:"d2o:diablonet", label:this.gameSettings.diabl0WhiteLabel?"DIABL0 WHITE-LABEL ON":"DIABL0 WHITE-LABEL", color:"#ffdd44", active:!!this.gameSettings.diabl0WhiteLabel },
      ],afterAudio+216,cw<520?1:3,32);
      sectionTitle("THEME SKIN",afterAudio+286,"#FFD700");
      grid(Object.values(THEMES).map(t=>({
        id:`theme:${t.id}`, label:`${t.emoji} ${t.label}`,
        color: t.palette.accentBright, active: curTheme===t.id,
      })),afterAudio+308,cw<520?2:5,32);
      }
    } else if (this.pauseTab === "controls") {
      sectionTitle("CONTROLS",cy+30,"#d8d1be");
      const afterBind=grid([
        { id:"bind:moveForward", label:`FORWARD: ${(this.keyBindings.moveForward||"w").toUpperCase()}`, color:"#d8d1be" },
        { id:"bind:moveBack", label:`BACK: ${(this.keyBindings.moveBack||"s").toUpperCase()}`, color:"#d8d1be" },
        { id:"bind:moveLeft", label:`LEFT: ${(this.keyBindings.moveLeft||"a").toUpperCase()}`, color:"#d8d1be" },
        { id:"bind:moveRight", label:`RIGHT: ${(this.keyBindings.moveRight||"d").toUpperCase()}`, color:"#d8d1be" },
        { id:"bind:skill1", label:`SKILL 1: ${(this.keyBindings.skill1||"z").toUpperCase()}`, color:this.cls.color },
        { id:"bind:skill2", label:`SKILL 2: ${(this.keyBindings.skill2||"x").toUpperCase()}`, color:this.cls.color },
        { id:"bind:skill3", label:`SKILL 3: ${(this.keyBindings.skill3||"c").toUpperCase()}`, color:this.cls.color },
        { id:"controller", label:this.gameSettings.controller.enabled?"XBOX ON":"XBOX OFF", color:"#44ff88", active:this.gameSettings.controller.enabled },
      ],cy+58,cw<560?2:4,32);
      [
        "S is movement/backpedal. Save is Ctrl+S or SAVE NOW.",
        "Xbox: left stick / d-pad moves, right stick looks in FPS, A/RT attacks, X/Y/B cast.",
        "Mobile: left stick move, right drag look, action cluster for attacks and panels.",
        "Map: drag when unlocked; lock state is saved."
      ].forEach((t,i)=>line(t,cx+20,afterBind+30+i*24));
      grid([{ id:"maplock", label:this.minimap.locked?"UNLOCK MAP":"LOCK MAP", color:"#d6b65c", active:this.minimap.locked }],afterBind+130,1,32);
    } else if (this.pauseTab === "admin" && this.isSuperAdmin) {
      sectionTitle("SUPER ADMIN ASSET PATCHER",cy+30,"#ffcc66");
      const monster = this._adminNearestMonster();
      const drop = this._adminNearestItem();
      line(`Nearest monster: ${monster ? `${monster.name || monster.type} (${Math.round(monster.dist)}u)` : "none in range"}`,cx+20,cy+64,monster ? "#ff8866" : "#667080");
      line(`Nearest item: ${drop ? `${this._itemDisplayName(drop.item)} (${Math.round(drop.dist)}u)` : "none in range"}`,cx+20,cy+86,drop ? "#d6b65c" : "#667080");
      const afterAdmin = grid([
        { id:"admin:editorToggle", label:this.adminEditorEnabled ? "MAP EDITOR ON" : "MAP EDITOR OFF", color:"#44ff88", active:this.adminEditorEnabled },
        { id:"admin:editorPlace", label:`PLACE ${this._adminCurrentPlaceable().label}`.slice(0, 22), color:this._adminCurrentPlaceable().color || "#d6b65c", active:true },
        { id:"admin:editorNext", label:"NEXT MAP ASSET", color:"#88ccff", active:true },
        { id:"admin:editorErase", label:"ERASE NEAREST", color:"#ff8866", active:this._adminPlacedForCurrentArea().length > 0 },
        { id:"admin:replaceAny", label:"TEXT / IMAGE REPLACE", color:"#cc44ff", active:true },
        { id:"admin:replaceMonster", label:"REPLACE MONSTER", color:"#ff8866", active:!!monster },
        { id:"admin:replaceItem", label:"REPLACE ITEM", color:"#d6b65c", active:!!drop },
        { id:"admin:replacePlayer", label:"REPLACE CLASS", color:this.cls.color, active:true },
        { id:"admin:queueMonster", label:"QUICK MONSTER GLB", color:"#ff8866", active:!!monster },
        { id:"admin:queueItem", label:"QUICK ITEM GLB", color:"#d6b65c", active:!!drop },
        { id:"admin:queuePlayer", label:"QUICK CLASS GLB", color:this.cls.color, active:true },
        { id:"admin:chronicle", label:"OPEN CHRONICLE", color:"#88ccff", active:false },
      ],cy+112,cw<520?1:4,34);
      sectionTitle("PATCH FLOW",afterAdmin+30,"#88ccff");
      [
        "Use Map Editor to drop KayKit buildings, props, rocks, and trees live in ISO/FPS/top views.",
        "Keyboard: Ctrl+E toggles, Insert places, Delete erases, ;/' cycles assets.",
        "Open the text/image replacement studio while playing or use quick queue buttons.",
        "ArcForge queue stores the replacement request locally for this admin account.",
        "Pipeline target: clear reference, build 3D model, rig, export animated GLB, STL print variant, hot-swap after review."
      ].forEach((t,i)=>line(t,cx+20,afterAdmin+64+i*22,i===0?"#d8d1be":"#a99c86"));
    } else {
      sectionTitle("CHRONICLE",cy+30,"#d6b65c");
      line(`Runewords forged: ${Object.values(this.chronicle.runewordsMade).reduce((a,b)=>a+b,0)}  Items stashed: ${this.chronicle.itemsStashed}  Sold: ${this.chronicle.itemsSold}  Merc hires: ${this.chronicle.mercHires}`,cx+20,cy+64);
      RUNEWORDS.forEach((rw,i)=>{
        const made=this.chronicle.runewordsMade[rw.name]||0;
        const y=cy+96+i*26;
        line(`${made?"MADE":"LOCKED"}  ${rw.name}  ${rw.runes.join("+").toUpperCase()}  ${made?`x${made}`:""}`,cx+20,y,made ? rw.color : "#657080");
      });
    }
    ctx.textAlign="left";
  }

  _adminAreaKey() {
    const screen = this.screen || "dungeon";
    const level = Number.isFinite(this.dungeonLevel) ? this.dungeonLevel : 1;
    return `${screen}:act${(this.actIdx || 0) + 1}:${this.difficulty || "normal"}:l${level}`;
  }

  _adminReadMapEdits() {
    // Server-first: fetch from /api/admin/map (set by ArcForgePalette save).
    // localStorage is the fallback when offline or before the server endpoint
    // has been hit. Both are loaded; server data wins on conflict.
    let local = {};
    try { local = JSON.parse(localStorage.getItem("arcforge_map_edits_v1") || "{}"); } catch {}

    // Fire-and-forget background server pull — merges into adminMapEdits when
    // it arrives so the user sees their canonical layout within ~1 frame after
    // the network responds.
    if (this.isSuperAdmin && typeof fetch === "function") {
      fetch("/api/admin/map").then(r => r.ok ? r.json() : null).then(data => {
        if (!data || !data.ok) return;
        const remote = data.edits || {};
        // Merge: remote keys win, but keep any local-only keys (e.g. if user
        // edited offline). Transforms similarly.
        const merged = { ...local, ...remote };
        this.adminMapEdits = merged;
        if (data.transforms) this.adminMapTransforms = data.transforms;
        // Quietly notify on screen.
        if (Object.keys(remote).length) {
          this._addFloat?.(`Server layout loaded`, this.player?.wx || 0, (this.player?.wy || 0) - 60, "#44ff88", 90);
        }
      }).catch(() => {});
    }
    return local;
  }

  _adminWriteMapEdits() {
    let okLocal = false;
    try { localStorage.setItem("arcforge_map_edits_v1", JSON.stringify(this.adminMapEdits || {})); okLocal = true; } catch {}

    // Best-effort server write so admin map edits survive across browsers /
    // deploys / cache wipes. We don't await — the ArcForgePalette "💾 SAVE"
    // button does an explicit awaited write for confirmation.
    if (this.isSuperAdmin && typeof fetch === "function") {
      fetch("/api/admin/map", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ edits: this.adminMapEdits || {}, transforms: this.adminMapTransforms || {} }),
      }).catch(() => {});
    }
    return okLocal;
  }

  _adminPlacedForCurrentArea() {
    const key = this._adminAreaKey();
    return Array.isArray(this.adminMapEdits?.[key]) ? this.adminMapEdits[key] : [];
  }

  _adminPlaceableDef(id) {
    return CR_ADMIN_PLACEABLES.find(p => p.id === id) || CR_ADMIN_PLACEABLES[0];
  }

  _adminCurrentPlaceable() {
    const idx = ((this.adminEditorPaletteIndex || 0) % CR_ADMIN_PLACEABLES.length + CR_ADMIN_PLACEABLES.length) % CR_ADMIN_PLACEABLES.length;
    this.adminEditorPaletteIndex = idx;
    return CR_ADMIN_PLACEABLES[idx];
  }

  // ── React palette accessors (ArcForge Evolve / ArcForgePalette.jsx) ──────
  // Returns the live placeable catalog. Includes hardcoded CR_ADMIN_PLACEABLES
  // plus any imported Meshy assets registered via _adminRegisterImportedAsset.
  _adminPlaceables() {
    const imported = Array.isArray(this._importedAdminPlaceables) ? this._importedAdminPlaceables : [];
    return [...CR_ADMIN_PLACEABLES, ...imported];
  }

  // Currently-placed items for the area the player is in.
  _adminCurrentPlaced() {
    return this._adminPlacedForCurrentArea();
  }

  // Save layout — already auto-saves on every place/erase via _adminWriteMapEdits;
  // this method is a no-op wrapper so the React UI's "SAVE" button has something
  // to call and we get a confirmation float.
  _adminSaveLayout() {
    const ok = this._adminWriteMapEdits();
    this._addFloat(ok ? "Layout saved." : "Save failed.", this.player.wx, this.player.wy - 56, ok ? "#44ff88" : "#ff4d4d", 100);
    return ok;
  }

  // Pop the most-recent placed asset (undo).
  _adminUndoLastPlaced() {
    if (!this.isSuperAdmin) return false;
    const key = this._adminAreaKey();
    const list = (this.adminMapEdits?.[key] || []).slice();
    if (!list.length) {
      this._addFloat("Nothing to undo.", this.player.wx, this.player.wy - 56, "#d6b65c", 80);
      return false;
    }
    const removed = list.pop();
    this.adminMapEdits = { ...(this.adminMapEdits || {}), [key]: list };
    this._adminWriteMapEdits();
    this._addFloat(`Undid ${removed?.label || removed?.id || "item"}`, this.player.wx, this.player.wy - 56, "#ffaa44", 100);
    return true;
  }

  // Clear every placed asset in the current area.
  _adminClearAreaPlaced() {
    if (!this.isSuperAdmin) return false;
    const key = this._adminAreaKey();
    const count = (this.adminMapEdits?.[key] || []).length;
    this.adminMapEdits = { ...(this.adminMapEdits || {}), [key]: [] };
    this._adminWriteMapEdits();
    this._addFloat(`Cleared ${count} placed asset${count === 1 ? "" : "s"}`, this.player.wx, this.player.wy - 56, "#ff4d4d", 110);
    return true;
  }

  // Register a Meshy-imported asset as a placeable so the palette can offer it.
  // Called after Meshy browser successfully downloads + writes a GLB.
  _adminRegisterImportedAsset({ id, label, kind = "imported", scale = 1.5, color = "#9d6bff", url }) {
    if (!id || !label) return false;
    if (!Array.isArray(this._importedAdminPlaceables)) this._importedAdminPlaceables = [];
    if (this._importedAdminPlaceables.find(p => p.id === id)) return false;
    this._importedAdminPlaceables.push({ id, label, kind, scale, color, url, imported: true });
    return true;
  }

  _adminToggleMapEditor(force) {
    if (!this.isSuperAdmin) return;
    this.adminEditorEnabled = force === undefined ? !this.adminEditorEnabled : !!force;
    const def = this._adminCurrentPlaceable();
    this._addFloat(this.adminEditorEnabled ? `ARCFORGE MAP EDITOR: ${def.label}` : "ARCFORGE MAP EDITOR OFF", this.player.wx, this.player.wy-68, this.adminEditorEnabled ? "#44ff88" : "#d6b65c", 100);
  }

  _adminCyclePlaceable(dir=1) {
    if (!this.isSuperAdmin) return;
    this.adminEditorPaletteIndex = (this.adminEditorPaletteIndex || 0) + dir;
    const def = this._adminCurrentPlaceable();
    this._addFloat(`PLACE: ${def.label}`, this.player.wx, this.player.wy-68, def.color || "#d6b65c", 80);
  }

  _adminPlaceCurrentAtPlayer() {
    if (!this.isSuperAdmin || !this.player) return;
    const def = this._adminCurrentPlaceable();
    const key = this._adminAreaKey();
    const tx = Math.max(0, Math.floor(this.player.wx / this.TS));
    const ty = Math.max(0, Math.floor(this.player.wy / this.TS));
    const list = this._adminPlacedForCurrentArea().filter(o => !(o.tx === tx && o.ty === ty && o.id === def.id));
    // instanceId is a stable per-placement uuid so transforms (rotation, scale,
    // raise, dx/dy) can be keyed to a specific placement and survive saves.
    const instanceId = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `i_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
    list.push({ id:def.id, instanceId, tx, ty, createdAt:Date.now(), camera:this.camera, quality:this.quality });
    this.adminMapEdits = { ...(this.adminMapEdits || {}), [key]:list };
    this._adminWriteMapEdits();
    this._addFloat(`PLACED ${def.label}`.toUpperCase(), this.player.wx, this.player.wy-72, def.color || "#44ff88", 90);
    // Auto-select the newly placed instance so the transform popup appears for
    // immediate tweaking — Mario 64 "pinch the nose" feel.
    this._adminSelectedInstance = { areaKey: key, instanceId };
  }

  // ── Transform model ─────────────────────────────────────────────────────
  // adminMapTransforms[areaKey][instanceId] = { dx, dy, rotation, scaleMul, yLift }
  //   dx, dy     : world-unit nudge from the placement tile center
  //   rotation   : radians around vertical axis
  //   scaleMul   : multiplier on def.scale (clamped 0.25..4)
  //   yLift      : vertical lift in world units (negative = lower)
  _adminGetTransform(areaKey, instanceId) {
    const t = this.adminMapTransforms?.[areaKey]?.[instanceId];
    return t || { dx:0, dy:0, rotation:0, scaleMul:1, yLift:0 };
  }

  _adminSetTransform(areaKey, instanceId, partial) {
    if (!areaKey || !instanceId) return false;
    this.adminMapTransforms = this.adminMapTransforms || {};
    const area = this.adminMapTransforms[areaKey] = this.adminMapTransforms[areaKey] || {};
    const cur = area[instanceId] || { dx:0, dy:0, rotation:0, scaleMul:1, yLift:0 };
    const next = { ...cur, ...partial };
    // Clamps
    next.scaleMul = Math.max(0.25, Math.min(4, Number(next.scaleMul) || 1));
    next.rotation = Number(next.rotation) || 0;
    next.yLift    = Math.max(-this.TS * 4, Math.min(this.TS * 4, Number(next.yLift) || 0));
    next.dx       = Math.max(-this.TS * 4, Math.min(this.TS * 4, Number(next.dx) || 0));
    next.dy       = Math.max(-this.TS * 4, Math.min(this.TS * 4, Number(next.dy) || 0));
    area[instanceId] = next;
    this._adminWriteMapEdits();
    // Also push the transform server-side immediately (per-instance endpoint).
    if (typeof fetch === "function") {
      fetch("/api/admin/transform", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ areaKey, instanceId, transform: next }),
      }).catch(() => {});
    }
    return true;
  }

  _adminDeletePlaced(areaKey, instanceId) {
    if (!areaKey || !instanceId) return false;
    const list = (this.adminMapEdits?.[areaKey] || []).filter(o => o.instanceId !== instanceId);
    this.adminMapEdits = { ...(this.adminMapEdits || {}), [areaKey]: list };
    // Drop the transform too.
    if (this.adminMapTransforms?.[areaKey]) delete this.adminMapTransforms[areaKey][instanceId];
    this._adminWriteMapEdits();
    if (typeof fetch === "function") {
      fetch("/api/admin/transform", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ areaKey, instanceId, transform: null }),
      }).catch(() => {});
    }
    this._adminSelectedInstance = null;
    return true;
  }

  // Hit-test for "which placed asset is under this screen click"
  _adminHitTestPlacedAt(cx, cy, radiusPx = 36) {
    const list = this._adminPlacedForCurrentArea();
    if (!list.length) return null;
    const key = this._adminAreaKey();
    let bestId = null, bestD = Infinity;
    for (const o of list) {
      const t = this._adminGetTransform(key, o.instanceId);
      const wx = (o.tx + 0.5) * this.TS + (t.dx || 0);
      const wy = (o.ty + 0.5) * this.TS + (t.dy || 0);
      const sp = this._worldToScreen ? this._worldToScreen(wx, wy) : null;
      if (!sp) continue;
      const d = Math.hypot(sp.x - cx, sp.y - cy);
      if (d < bestD) { bestD = d; bestId = o.instanceId; }
    }
    if (bestD < radiusPx && bestId) {
      this._adminSelectedInstance = { areaKey: key, instanceId: bestId };
      return bestId;
    }
    return null;
  }

  // Convert screen position of selected instance for the React popup overlay.
  _adminSelectionScreenPos() {
    const sel = this._adminSelectedInstance;
    if (!sel) return null;
    const list = this._adminPlacedForCurrentArea();
    const o = list.find(it => it.instanceId === sel.instanceId);
    if (!o) return null;
    const t = this._adminGetTransform(sel.areaKey, sel.instanceId);
    const wx = (o.tx + 0.5) * this.TS + (t.dx || 0);
    const wy = (o.ty + 0.5) * this.TS + (t.dy || 0);
    return this._worldToScreen ? this._worldToScreen(wx, wy) : null;
  }

  _adminEraseNearestPlaced(maxTileDist=1.5) {
    if (!this.isSuperAdmin || !this.player) return;
    const key = this._adminAreaKey();
    const px = this.player.wx / this.TS;
    const py = this.player.wy / this.TS;
    const list = [...this._adminPlacedForCurrentArea()];
    let bestIdx = -1, bestD = Infinity;
    list.forEach((o, i) => {
      const d = Math.hypot((o.tx + 0.5) - px, (o.ty + 0.5) - py);
      if (d < bestD) { bestD = d; bestIdx = i; }
    });
    if (bestIdx < 0 || bestD > maxTileDist) {
      this._addFloat("NO PLACED ASSET NEARBY", this.player.wx, this.player.wy-72, "#ff8844", 80);
      return;
    }
    const [removed] = list.splice(bestIdx, 1);
    this.adminMapEdits = { ...(this.adminMapEdits || {}), [key]:list };
    this._adminWriteMapEdits();
    const def = this._adminPlaceableDef(removed.id);
    this._addFloat(`ERASED ${def.label}`.toUpperCase(), this.player.wx, this.player.wy-72, "#ffcc66", 80);
  }

  // ── Cursor-driven placement (Minecraft-style left/right click) ─────────────
  _adminPlaceCurrentAtCursor(cx, cy) {
    if (!this.isSuperAdmin || !this.player) return;
    const w = this._screenToWorld(cx, cy);
    if (!w) return;
    const def = this._adminCurrentPlaceable();
    const tx = Math.max(0, Math.floor(w.wx / this.TS));
    const ty = Math.max(0, Math.floor(w.wy / this.TS));
    const key = this._adminAreaKey();
    const list = this._adminPlacedForCurrentArea().filter(o => !(o.tx === tx && o.ty === ty && o.id === def.id));
    list.push({ id:def.id, tx, ty, createdAt:Date.now(), camera:this.camera, quality:this.quality });
    this.adminMapEdits = { ...(this.adminMapEdits || {}), [key]:list };
    this._adminWriteMapEdits();
    this._addFloat(`PLACED ${def.label}`.toUpperCase(), w.wx, w.wy-32, def.color || "#44ff88", 70);
  }

  _adminEraseAtCursor(cx, cy) {
    if (!this.isSuperAdmin || !this.player) return;
    const w = this._screenToWorld(cx, cy);
    if (!w) return;
    const key = this._adminAreaKey();
    const list = [...this._adminPlacedForCurrentArea()];
    const px = w.wx / this.TS, py = w.wy / this.TS;
    let bestIdx = -1, bestD = Infinity;
    list.forEach((o, i) => {
      const d = Math.hypot((o.tx + 0.5) - px, (o.ty + 0.5) - py);
      if (d < bestD) { bestD = d; bestIdx = i; }
    });
    if (bestIdx < 0 || bestD > 1.7) {
      this._addFloat("NO ASSET HERE", w.wx, w.wy-32, "#ff8844", 60);
      return;
    }
    const [removed] = list.splice(bestIdx, 1);
    this.adminMapEdits = { ...(this.adminMapEdits || {}), [key]:list };
    this._adminWriteMapEdits();
    const def = this._adminPlaceableDef(removed.id);
    this._addFloat(`ERASED ${def.label}`.toUpperCase(), w.wx, w.wy-32, "#ffcc66", 60);
  }

  // ── Build-mode HUD overlay: shown across every camera view (iso/top/fps) ───
  _drawAdminBuildHud(W, H) {
    if (!this.isSuperAdmin || !this.adminEditorEnabled) return;
    const ctx = this.ctx;
    const def = this._adminCurrentPlaceable();
    const palette = (typeof CR_ADMIN_PLACEABLES !== "undefined") ? CR_ADMIN_PLACEABLES : [];
    const idx = this.adminEditorPaletteIndex || 0;
    const visible = Math.min(9, palette.length);
    const slotW = 56, slotH = 56, gap = 6;
    const barW = visible * slotW + (visible - 1) * gap + 18;
    const barX = (W - barW) / 2;
    const barY = H - slotH - 26;

    ctx.save();
    // Top banner
    ctx.fillStyle = "rgba(0, 30, 18, 0.78)";
    ctx.fillRect(0, 0, W, 28);
    ctx.fillStyle = "#7cffb0";
    ctx.font = "bold 12px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`🛠 ARCFORGE BUILD MODE — ${def.label}`, 16, 19);
    ctx.fillStyle = "#9ad3b3";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("B / Ctrl+E exit · [1–9] palette · [Click] place · [Right-click] erase · [Wheel] cycle · [Insert/Del] at player", W - 16, 19);

    // Hotbar
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(barX - 9, barY - 9, barW, slotH + 18);
    ctx.strokeStyle = "rgba(124, 255, 176, 0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 9, barY - 9, barW, slotH + 18);

    for (let i = 0; i < visible; i++) {
      const p = palette[i];
      const sx = barX + i * (slotW + gap);
      const isActive = i === (idx % palette.length);
      ctx.fillStyle = isActive ? "rgba(124,255,176,0.18)" : "rgba(255,255,255,0.04)";
      ctx.fillRect(sx, barY, slotW, slotH);
      ctx.strokeStyle = isActive ? "#7cffb0" : "rgba(255,255,255,0.18)";
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.strokeRect(sx + 0.5, barY + 0.5, slotW - 1, slotH - 1);
      // Color swatch (placeholder until icon support is added)
      ctx.fillStyle = p.color || "#888";
      ctx.fillRect(sx + 10, barY + 10, slotW - 20, 20);
      // Hotkey
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "bold 10px Inter, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(String(i + 1), sx + 4, barY + 12);
      // Label
      ctx.fillStyle = isActive ? "#ffffff" : "#b8c7dc";
      ctx.font = "9px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      const lbl = (p.label || "").slice(0, 9);
      ctx.fillText(lbl, sx + slotW / 2, barY + slotH - 5);
    }

    // Cursor ghost — show selected asset at the world tile under the mouse
    if (Number.isFinite(this.mouseX) && Number.isFinite(this.mouseY)) {
      const w = this._screenToWorld?.(this.mouseX, this.mouseY);
      if (w && this._isoToScreen) {
        const tx = Math.max(0, Math.floor(w.wx / this.TS));
        const ty = Math.max(0, Math.floor(w.wy / this.TS));
        const s = this._isoToScreen(tx, ty);
        const TW = this.TW * this._viewScale();
        const TH = this.TH * this._viewScale();
        ctx.strokeStyle = "rgba(124, 255, 176, 0.9)";
        ctx.fillStyle   = "rgba(124, 255, 176, 0.18)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.sx, s.sy);
        ctx.lineTo(s.sx + TW, s.sy + TH);
        ctx.lineTo(s.sx, s.sy + TH * 2);
        ctx.lineTo(s.sx - TW, s.sy + TH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _adminPlacedUrl(def) {
    if (!def) return null;
    if (def.kind === "building") return this._buildingUrl(def.id);
    if (def.kind === "forest") return this._forestUrl(def.id);
    return this._d11PropUrl(def.id) || this._furnitureUrl(def.id) || this._kaykitPropUrl(def.id);
  }

  _drawAdminPlacedObjectsIso(W,H,TW=this.TW*this._viewScale(),TH=this.TH*this._viewScale()) {
    const placed = this._adminPlacedForCurrentArea();
    if (!placed.length) return;
    const ctx = this.ctx;
    const areaKey = this._adminAreaKey();
    const selId = this._adminSelectedInstance?.instanceId;
    const sorted = [...placed].sort((a,b)=>(a.ty+a.tx)-(b.ty+b.tx));
    for (const obj of sorted) {
      const def = this._adminPlaceableDef(obj.id);
      const t = obj.instanceId ? this._adminGetTransform(areaKey, obj.instanceId) : { dx:0, dy:0, rotation:0, scaleMul:1, yLift:0 };
      // Apply dx/dy: shift in world units, then convert to iso screen offset.
      // Iso-projection of a delta is dx,dy → (dx-dy)*TW/(2*TS), (dx+dy)*TH/(2*TS) ish — but
      // we already convert via _isoToScreen with the *modified* tile pos.
      const tileX = obj.tx + (t.dx || 0) / this.TS;
      const tileY = obj.ty + (t.dy || 0) / this.TS;
      const {sx,sy} = this._isoToScreen(tileX, tileY);
      if (sx<-TW*8||sx>W+TW*8||sy<-TH*12||sy>H+TH*12) continue;
      const url = this._adminPlacedUrl(def);
      const frame = this._isoAssetFrame(url, "front");
      const baseH = def.kind === "building" ? TH * 5.2 * (def.scale || 0.7)
                  : def.kind === "forest" ? TH * 4.1 * (def.scale || 1)
                  : TH * 2.2 * (def.scale || 1);
      const h = baseH * (t.scaleMul || 1);
      const isSelected = obj.instanceId && obj.instanceId === selId;
      if (frame) {
        const w = h * (frame.width / frame.height);
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        if (this.Q.shadows) {
          ctx.fillStyle = "rgba(0,0,0,0.30)";
          ctx.beginPath(); ctx.ellipse(sx, sy + TH*0.5, w*0.28, TH*0.22, 0, 0, Math.PI*2); ctx.fill();
        }
        if (def.id.includes("torch") && this.Q.glow) { ctx.shadowColor="#ff8a28"; ctx.shadowBlur=18; }
        ctx.translate(sx, sy + TH*0.62 - (t.yLift || 0));
        if (t.rotation) ctx.rotate(t.rotation);
        ctx.drawImage(frame, -w*0.5, -h, w, h);
        ctx.restore();
      } else {
        if (url) preloadGlbStripsFireAndForget(url, ["idle"], ["front"]);
        ctx.save();
        ctx.translate(0, -(t.yLift || 0));
        ctx.fillStyle = def.color || "#d6b65c";
        ctx.beginPath(); ctx.ellipse(sx, sy + TH*0.42, TW*0.22 * (t.scaleMul || 1), TH*0.18 * (t.scaleMul || 1), 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
      if (this.adminEditorEnabled) {
        ctx.save();
        // Selected → pulsing accent box. Unselected → faint outline.
        if (isSelected) {
          const pulse = 0.55 + 0.45 * Math.sin((this._frame || 0) * 0.18);
          ctx.strokeStyle = `rgba(68,255,136,${0.75 + pulse * 0.25})`;
          ctx.lineWidth = 3;
        } else {
          ctx.strokeStyle = "rgba(68,255,136,0.30)";
          ctx.lineWidth = 1;
        }
        ctx.beginPath();
        ctx.moveTo(sx,sy); ctx.lineTo(sx+TW,sy+TH); ctx.lineTo(sx,sy+TH*2); ctx.lineTo(sx-TW,sy+TH); ctx.closePath();
        ctx.stroke();
        if (isSelected) {
          // small selection marker above the tile
          ctx.fillStyle = "rgba(68,255,136,0.9)";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.fillText("▼", sx, sy - 4);
        }
        ctx.restore();
      }
    }
  }

  _drawAdminPlacedObjectsTop(W,H) {
    const placed = this._adminPlacedForCurrentArea();
    if (!placed.length) return;
    const ctx = this.ctx;
    const scale = this._viewScale();
    const areaKey = this._adminAreaKey();
    const selId = this._adminSelectedInstance?.instanceId;
    for (const obj of placed) {
      const def = this._adminPlaceableDef(obj.id);
      const t = obj.instanceId ? this._adminGetTransform(areaKey, obj.instanceId) : { dx:0, dy:0, rotation:0, scaleMul:1, yLift:0 };
      const wx = (obj.tx+0.5)*this.TS + (t.dx || 0);
      const wy = (obj.ty+0.5)*this.TS + (t.dy || 0);
      const {sx,sy} = this._topToScreen(wx, wy, W, H);
      if (sx<-80||sx>W+80||sy<-80||sy>H+80) continue;
      const r = Math.max(8, this.TS * scale * (def.kind === "building" ? 0.55 : 0.28)) * (t.scaleMul || 1);
      const isSelected = obj.instanceId && obj.instanceId === selId;
      ctx.save();
      if (t.rotation) { ctx.translate(sx, sy); ctx.rotate(t.rotation); ctx.translate(-sx, -sy); }
      ctx.fillStyle = def.color || "#d6b65c";
      ctx.globalAlpha = 0.92;
      ctx.beginPath(); ctx.ellipse(sx, sy, r, r*0.62, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.font = `bold ${Math.max(8, Math.round(9*scale))}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(def.label.toUpperCase().slice(0, 8), sx, sy + 3);
      if (isSelected) {
        const pulse = 0.55 + 0.45 * Math.sin((this._frame || 0) * 0.18);
        ctx.strokeStyle = `rgba(68,255,136,${0.75 + pulse * 0.25})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(sx, sy, r * 1.4, r * 0.9, 0, 0, Math.PI*2); ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawAdminEditorHud(W,H) {
    if (!this.isSuperAdmin || !this.adminEditorEnabled) return;
    const ctx = this.ctx;
    const def = this._adminCurrentPlaceable();
    const count = this._adminPlacedForCurrentArea().length;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.strokeStyle = def.color || "#44ff88";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(16, Math.max(54, this.chromeTopInset + 18), 360, 58, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = def.color || "#44ff88";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`ARCFORGE MAP EDITOR: ${def.label.toUpperCase()}  (${count})`, 30, Math.max(76, this.chromeTopInset + 40));
    ctx.fillStyle = "#d8d1be";
    ctx.font = "10px monospace";
    ctx.fillText("B / Ctrl+E toggle · click place · right-click erase · [1-9] slot · wheel cycle", 30, Math.max(96, this.chromeTopInset + 60));
    
    // Apply CRT scanlines and retro effects
    if (this.crt) this.crt.apply(ctx, this.tick || Date.now());
    // Draw juice overlays
    if (this.juice) this.juice.drawOverlays(ctx);
    ctx.restore();
    // Minecraft-style hotbar + cursor ghost — drawn underneath/around the
    // status panel so both views (iso/top/fps) show the current palette.
    this._drawAdminBuildHud(W, H);
  }

  _adminNearestMonster(maxDist=360) {
    const p = this.player;
    if (!p) return null;
    const candidates = [
      ...(this.enemies || []).filter(e => !e.isDead),
      ...(this.boss ? [this.boss] : []),
    ];
    let best = null;
    for (const e of candidates) {
      const dist = Math.hypot((e.wx || 0) - p.wx, (e.wy || 0) - p.wy);
      if (dist <= maxDist && (!best || dist < best.dist)) best = { ...e, dist };
    }
    return best;
  }

  _adminNearestItem(maxDist=260) {
    const p = this.player;
    if (!p) return null;
    let best = null;
    for (const l of (this.loot || [])) {
      const dist = Math.hypot((l.wx || 0) - p.wx, (l.wy || 0) - p.wy);
      if (dist <= maxDist && (!best || dist < best.dist)) best = { ...l, dist };
    }
    return best;
  }

  _adminSlug(text) {
    return String(text || "asset").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "asset";
  }

  _adminReadQueue() {
    try { return JSON.parse(localStorage.getItem("arcforge_ingame_queue_v1") || "[]"); }
    catch { return []; }
  }

  _adminWriteQueue(queue) {
    try { localStorage.setItem("arcforge_ingame_queue_v1", JSON.stringify(queue)); return true; }
    catch { return false; }
  }

  _adminPrompt(kind, asset) {
    if (kind === "monster") {
      return `Upgrade Cryptic Realm monster ${asset.assetLabel}. Create a game-ready animated GLB with idle, walk, attack, hurt, death clips, readable silhouette, Diablo-style dark fantasy materials, and browser-friendly polycount.`;
    }
    if (kind === "item") {
      return `Upgrade Cryptic Realm item ${asset.assetLabel}. Create a print-quality STL plus game-ready GLB with clean PBR materials, inspectable inventory thumbnail, transparent preview PNG, and low-poly collision proxy.`;
    }
    return `Upgrade Cryptic Realm class ${asset.assetLabel}. Create a rigged animated GLB character with idle, walk, run, attack, cast, hurt, death clips and 64-bit fallback sprite export.`;
  }

  _adminOpenAssetQueue(kind="other") {
    if (!this.isSuperAdmin) return;
    let source = null;
    let selected = null;
    if (kind === "monster") {
      source = this._adminNearestMonster();
      if (source) {
        const label = source.name || CR_ENEMY_DEFS[source.type]?.name || source.type || "Monster";
        selected = {
          id: source.assetId || source.monsterType || source.type || this._adminSlug(label),
          label,
          type: "monster",
          game: `cryptic_act_${this.actIdx + 1}`,
          image: source.image || "",
          prompt: `Replace Cryptic Realm monster ${label}. Use the uploaded image or text brief as source direction, then produce a production GLB, animated GLB, readable sprite proof, combat animation plan, and STL display variant where printable.`,
        };
      }
    } else if (kind === "item") {
      source = this._adminNearestItem();
      if (source?.item) {
        const label = this._itemDisplayName(source.item);
        selected = {
          id: `item_${this._adminSlug(source.item.base || source.item.slot || label)}`,
          label,
          type: source.item.slot || "item",
          game: "cryptic_loot",
          image: source.item.image || "",
          prompt: `Replace Cryptic Realm item ${label}. Produce upgraded icon art, in-world pickup/readability pass, GLB prop when useful, and STL print-quality variant if printable.`,
        };
      }
    } else if (kind === "character") {
      const label = this.cls?.name || this.cls?.id || "Cryptic Hero";
      selected = {
        id: this.cls?.id || this._adminSlug(label),
        label,
        type: "character",
        game: "cryptic_player_class",
        image: "",
        prompt: `Upgrade playable class ${label}. Produce rigged GLB, idle/walk/run/attack/cast/hurt/death clips, sprite proof, gear attachment notes, and STL display variant.`,
      };
    }
    this.adminSelectedArcForgeAsset = selected;
    this.adminAssetQueueContext = {
      kind,
      screen:this.screen,
      act:this.actIdx + 1,
      actName:this.act?.name,
      camera:this.camera,
      quality:this.quality,
      playerClass:this.cls?.name || this.cls?.id,
      selected,
    };
    this.showAdminAssetQueue = true;
    this.paused = false;
  }

  _adminQueueAsset(kind) {
    if (!this.isSuperAdmin) return;
    let source = null;
    let asset = null;
    if (kind === "monster") {
      source = this._adminNearestMonster();
      if (!source) { this._addFloat("No monster in admin range", this.player.wx, this.player.wy-58, "#ff8844", 80); return; }
      const label = source.name || CR_ENEMY_DEFS[source.type]?.name || source.type || source.monsterType || "Monster";
      asset = {
        assetId: source.assetId || source.monsterType || source.type || this._adminSlug(label),
        assetLabel: label,
        assetType: "monster",
        game: `cryptic_act_${this.actIdx + 1}`,
      };
    } else if (kind === "item") {
      source = this._adminNearestItem();
      if (!source?.item) { this._addFloat("No item drop in admin range", this.player.wx, this.player.wy-58, "#ff8844", 80); return; }
      const label = this._itemDisplayName(source.item);
      asset = {
        assetId: `item_${this._adminSlug(source.item.base || source.item.slot || label)}`,
        assetLabel: label,
        assetType: "item",
        game: "cryptic_loot",
      };
    } else {
      const label = this.cls?.name || this.cls?.id || "Cryptic Hero";
      asset = {
        assetId: this.cls?.id || this._adminSlug(label),
        assetLabel: label,
        assetType: "character",
        game: "cryptic_player_class",
      };
    }
    const job = {
      id: `admin_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      ...asset,
      pipeline: kind === "item" ? "3d_print_glb" : "animated_glb",
      status: "queued",
      createdAt: Date.now(),
      source: {
        screen: this.screen,
        act: this.actIdx + 1,
        quality: this.quality,
        camera: this.camera,
        wx: Math.round(source?.wx ?? this.player.wx),
        wy: Math.round(source?.wy ?? this.player.wy),
      },
    };
    job.prompt = this._adminPrompt(kind, job);
    const queue = this._adminReadQueue();
    queue.push(job);
    if (this._adminWriteQueue(queue)) {
      this._addFloat(`QUEUED ${asset.assetType.toUpperCase()}: ${asset.assetLabel}`.slice(0, 42), this.player.wx, this.player.wy-58, "#44ff88", 110);
    } else {
      this._addFloat("Admin queue save failed", this.player.wx, this.player.wy-58, "#ff5544", 90);
    }
  }

  _handlePauseClick(cx, cy) {
    const hit = (this.pauseRects || []).find(r => cx>=r.x && cx<=r.x+r.w && cy>=r.y && cy<=r.y+r.h);
    if (!hit) return;
    const id = hit.id;
    if (id === "resume") { this.paused = false; return; }
    if (id.startsWith("tab:")) { this.pauseTab = id.slice(4); return; }
    if (id === "save") { this.saveToStorage(); return; }
    if (id === "players:-") { this._setPlayerCount((this.playerCount||1)-1); return; }
    if (id === "players:+") { this._setPlayerCount((this.playerCount||1)+1); return; }
    if (id === "bag") { this.showInventory = !this.showInventory; this.paused = false; return; }
    if (id === "skills") { this.showSkillTree = !this.showSkillTree; this.paused = false; return; }
    if (id === "quests") { this.questLog = !this.questLog; this.paused = false; return; }
    if (id === "rescue") { this._rescueToTown(); this.paused = false; return; }
    if (id === "admin:editorToggle") { this._adminToggleMapEditor(); return; }
    if (id === "admin:editorPlace") { this._adminToggleMapEditor(true); this._adminPlaceCurrentAtPlayer(); this.paused = false; return; }
    if (id === "admin:editorNext") { this._adminToggleMapEditor(true); this._adminCyclePlaceable(1); return; }
    if (id === "admin:editorErase") { this._adminToggleMapEditor(true); this._adminEraseNearestPlaced(); this.paused = false; return; }
    if (id === "admin:replaceAny") { this._adminOpenAssetQueue("other"); return; }
    if (id === "admin:replaceMonster") { this._adminOpenAssetQueue("monster"); return; }
    if (id === "admin:replaceItem") { this._adminOpenAssetQueue("item"); return; }
    if (id === "admin:replacePlayer") { this._adminOpenAssetQueue("character"); return; }
    if (id === "admin:queueMonster") { this._adminQueueAsset("monster"); return; }
    if (id === "admin:queueItem") { this._adminQueueAsset("item"); return; }
    if (id === "admin:queuePlayer") { this._adminQueueAsset("character"); return; }
    if (id === "admin:chronicle") { this.showMonsterChronicle = true; this.paused = false; return; }
    if (id === "cam") { this._cycleCamera(); return; }
    if (id === "maplock") { this.minimap.locked = !this.minimap.locked; this._saveMinimapState(); return; }
    if (id.startsWith("quality:")) { this.setQuality(id.slice(8)); return; }
    if (id.startsWith("camera:")) {
      const cam = id.slice(7);
      if (cam === "reset") this._resetCameraRig();
      else if (cam === "lock") this._toggleCameraLock();
      else { this.camera = cam; this._cameraSnap = true; this._centerCamera(); }
      return;
    }
    if (id === "zoom:-") { this._setCameraZoom(this.cameraZoom - 0.12); return; }
    if (id === "zoom:+") { this._setCameraZoom(this.cameraZoom + 0.12); return; }
    if (id === "pitch:-") { this._setCameraPitch(this.cameraPitch - 0.08); return; }
    if (id === "pitch:+") { this._setCameraPitch(this.cameraPitch + 0.08); return; }
    if (id === "controller") { this.gameSettings.controller.enabled=!this.gameSettings.controller.enabled; return; }
    if (id.startsWith("bind:")) { this._cycleBinding(id.slice(5)); return; }
    if (id === "sound:mute") { this.gameSettings.sound.mute=!this.gameSettings.sound.mute; this._syncAudioLevels(); return; }
    if (id === "sound:test") {
      this.gameSettings.sound.mute = false;
      const audioCtx = this._ensureAudio();
      this._syncAudioLevels();
      const playTest = () => {
        this._playSfx("loot");
        setTimeout(() => this._playSfx("spell"), 90);
        setTimeout(() => this._playSfx("smash"), 180);
        setTimeout(() => this._playBardTune(), 250);
        if (this.player) this._addFloat("TEST SOUND", this.player.wx, this.player.wy - 58, "#ffcc88", 95);
      };
      if (audioCtx?.state === "suspended" && audioCtx.resume) {
        audioCtx.resume().then(playTest).catch(playTest);
      } else {
        playTest();
      }
      return;
    }
    if (id.startsWith("sound:")) {
      const [,key,dir]=id.split(":");
      this.gameSettings.sound[key]=Math.max(0,Math.min(100,(this.gameSettings.sound[key]||0)+(dir==="+"?5:-5)));
      this._syncAudioLevels();
      return;
    }
    if (id === "video:damage") { this.gameSettings.video.damageNumbers=!this.gameSettings.video.damageNumbers; return; }
    if (id === "video:shake") { this.gameSettings.video.screenShake=!this.gameSettings.video.screenShake; return; }
    if (id === "video:glbmed") { this.gameSettings.glbMedium=!this.gameSettings.glbMedium; return; }
    if (id === "gfx:diabloegg") { this.showDiabloGfxPanel=!this.showDiabloGfxPanel; return; }
    if (id === "online:refresh") { this._requestOnlineGameList(); return; }
    if (id === "online:create") { this._createOnlineGame(); return; }
    if (id.startsWith("online:join:")) { this._joinOnlineGame(id.slice("online:join:".length)); return; }
    if (id.startsWith("video:")) {
      const [,key,dir]=id.split(":");
      const step=key==="gamma" ? 0.10 : 0.10;
      const min=key==="gamma" ? 0.65 : 0.75;
      const max=key==="gamma" ? 1.65 : 1.45;
      this.gameSettings.video[key]=Math.max(min,Math.min(max,(this.gameSettings.video[key]||1)+(dir==="+"?step:-step)));
      this._applyVideoFilter();
      return;
    }
    // Hidden D2O mode toggles
    if (id === "d2o:mode") {
      this.gameSettings.d2oMode=!this.gameSettings.d2oMode;
      D2Engine.initTheme?.(this.gameSettings.d2oMode ? "diablo2" : "cryptic_realm", { actIdx:this.actIdx }).catch?.(()=>{});
      return;
    }
    if (id === "d2o:dvx")  {
      this.gameSettings.devilutionX=!this.gameSettings.devilutionX;
      D2Engine.initTheme?.(this.gameSettings.devilutionX ? "devilutionx" : "cryptic_realm", { actIdx:this.actIdx }).catch?.(()=>{});
      return;
    }
    if (id === "d2o:campaign") {
      const on = !this.secretCampaign?.enabled;
      this.gameSettings.secretCampaign = on;
      this.gameSettings.diabl0WhiteLabel = on ? this.gameSettings.diabl0WhiteLabel : false;
      this.secretCampaign = {
        ...(this.secretCampaign || {}),
        enabled:on,
        stageIdx:this.secretCampaign?.stageIdx || 0,
        completedHellfire:!!this.secretCampaign?.completedHellfire,
        enteredD2:!!this.secretCampaign?.enteredD2,
        stageHistory:this.secretCampaign?.stageHistory || [],
      };
      if (on) {
        this._applySecretCampaignStage(true);
        this._addFloat("SECRET CAMPAIGN: DIABLO I HELLFIRE", this.player.wx, this.player.wy - 62, "#ff8844", 160);
      }
      return;
    }
    if (id === "d2o:online") {
      this.gameSettings.onlinePlay = !this.gameSettings.onlinePlay;
      if (this.gameSettings.onlinePlay) this.connectOnline(this.gameSettings.onlineWsUrl);
      else {
        this.online?.client?.disconnect?.();
        if (this.online) { this.online.connected=false; this.online.peers={}; }
      }
      return;
    }
    if (id === "d2o:loadmpq") {
      D2Engine.promptLoadCompatibilityMpqs?.().then(result => {
        this.d2CompatibilityReport = result?.report || D2Engine.compatibility?.lastReport || null;
        const ok = this.d2CompatibilityReport?.perfectMode;
        const d1 = this.d2CompatibilityReport?.profiles?.diablo1_hellfire;
        const hasD1Pack = !!(d1?.mpqs?.oneFileLoaded || d1?.mpqs?.loaded?.some?.(n => /DIABDAT|DIABLODAT|HELLFIRE|CRYPTIC_D1|CRYPTIC_HELLFIRE/i.test(n)));
        if (hasD1Pack) {
          this.gameSettings.secretCampaign = true;
          this.secretCampaign = {
            ...(this.secretCampaign || {}),
            enabled:true,
            stageIdx:this.secretCampaign?.stageIdx || 0,
            completedHellfire:!!this.secretCampaign?.completedHellfire,
            enteredD2:!!this.secretCampaign?.enteredD2,
            stageHistory:this.secretCampaign?.stageHistory || [],
          };
          this._applySecretCampaignStage(true);
        }
        this._addFloat(ok ? "D1/D2 PERFECT MODE READY" : hasD1Pack ? "HELLFIRE PACK LOADED - CAMPAIGN BOOTED" : "MPQS LOADED - VALIDATION HAS GAPS", this.player.wx, this.player.wy - 64, ok || hasD1Pack ? "#44ff88" : "#ffd06a", 190);
      }).catch(e => {
        this._addFloat(`MPQ LOAD FAILED: ${String(e?.message || e).slice(0,28)}`, this.player.wx, this.player.wy - 64, "#ff5544", 170);
      });
      return;
    }
    if (id === "d2o:validate") {
      D2Engine.validateCompatibility?.().then(report => {
        this.d2CompatibilityReport = report;
        const d1 = report.profiles?.diablo1_hellfire;
        const d2 = report.profiles?.diablo2_lod;
        const msg = report.perfectMode ? "D1/HF + D2 PERFECT MODE READY" : `D1 ${d1?.status || "?"} | D2 ${d2?.status || "?"}`;
        this._addFloat(msg, this.player.wx, this.player.wy - 64, report.perfectMode ? "#44ff88" : "#ffd06a", 190);
      }).catch(e => {
        this._addFloat(`VALIDATION FAILED: ${String(e?.message || e).slice(0,28)}`, this.player.wx, this.player.wy - 64, "#ff5544", 170);
      });
      return;
    }
    if (id === "d2o:diablonet") {
      // Toggle Diabl0.net standalone mode — D2O + DevilutionX + full dark theme
      const on = !this.gameSettings.diabl0WhiteLabel;
      this.gameSettings.d2oMode = on;
      this.gameSettings.devilutionX = on;
      this.gameSettings.diabl0WhiteLabel = on;
      this.gameSettings.secretCampaign = on;
      if (this.secretCampaign) {
        this.secretCampaign.enabled = on;
        if (on && this.secretCampaign.enteredD2 !== true) this.secretCampaign.stageIdx = this.secretCampaign.stageIdx || 0;
      }
      this._applyThemeSkin(on ? "diablonet" : DEFAULT_THEME);
      D2Engine.initTheme?.(on ? "diablonet" : "cryptic_realm", { actIdx:this.actIdx }).catch?.(()=>{});
      if (on) this._activateDiabl0WhiteLabelEasterEgg();
      // Optionally open diabl0.net in new tab
      if (on) { try { window.open("https://diabl0.net","_blank"); } catch(_){} }
      return;
    }
    // ── v8.0 Theme selector ──────────────────────────────────────────────────
    if (id.startsWith("theme:")) {
      const themeId = id.slice(6);
      this._activeTheme = themeId;
      this.gameSettings.theme = themeId;
      // Mutate uiTheme in-place so ALL existing draw calls pick up new palette
      try {
        const t = getTheme(themeId);
        if (t?.palette) {
          const p = t.palette;
          // Map Diablo Abyss Engine palette onto the existing uiTheme slots
          // (palette fields: accentBright, accent, bg, bgTile, text, textDim, textBright,
          //  ui, uiBorder, uiHighlight, wall, floor)
          this.uiTheme.trim      = p.accentBright || p.accent    || this.uiTheme.trim;
          this.uiTheme.trimDark  = p.uiHighlight  || p.uiBorder  || this.uiTheme.trimDark;
          this.uiTheme.gold      = p.textBright   || p.text      || this.uiTheme.gold;
          this.uiTheme.text      = p.text         || this.uiTheme.text;
          this.uiTheme.muted     = p.textDim      || this.uiTheme.muted;
          this.uiTheme.panel     = p.ui           || p.bg        || this.uiTheme.panel;
          this.uiTheme.panel2    = p.bgTile       || this.uiTheme.panel2;
          this.uiTheme.stone     = p.wall         || this.uiTheme.stone;
          this.uiTheme.groove    = p.floor        || this.uiTheme.groove;
          this.uiTheme.red       = p.accent       || this.uiTheme.red;
          this.uiTheme.blue      = p.uiBorder     || this.uiTheme.blue;
          // Extra v8.0 fields
          this._themeAmbient  = t.ambientLight  || '#1a0a00';
          this._themeVignette = t.vignette      || 'rgba(0,0,0,0.85)';
          this._themeParticle = t.particleColor || '#ff6600';
          this._themeFont     = t.font          || 'serif';
          this._themeDirty    = true;
        }
      } catch(_) {}
      return;
    }
  }

  // ─── D2O / DevilutionX / Project D2 helpers ──────────────────────────────
  // Returns the display class name, optionally remapped to D2/D2O equivalents.
  _applyThemeSkin(themeId = DEFAULT_THEME) {
    this._activeTheme = themeId;
    this.gameSettings.theme = themeId;
    try {
      const t = getTheme(themeId);
      if (!t?.palette) return;
      const p = t.palette;
      this.uiTheme.trim      = p.accentBright || p.accent    || this.uiTheme.trim;
      this.uiTheme.trimDark  = p.uiHighlight  || p.uiBorder  || this.uiTheme.trimDark;
      this.uiTheme.gold      = p.textBright   || p.text      || this.uiTheme.gold;
      this.uiTheme.text      = p.text         || this.uiTheme.text;
      this.uiTheme.muted     = p.textDim      || this.uiTheme.muted;
      this.uiTheme.panel     = p.ui           || p.bg        || this.uiTheme.panel;
      this.uiTheme.panel2    = p.bgTile       || this.uiTheme.panel2;
      this.uiTheme.stone     = p.wall         || this.uiTheme.stone;
      this.uiTheme.groove    = p.floor        || this.uiTheme.groove;
      this.uiTheme.red       = p.accent       || this.uiTheme.red;
      this.uiTheme.blue      = p.uiBorder     || this.uiTheme.blue;
      this._themeAmbient  = t.ambientLight  || '#1a0a00';
      this._themeVignette = t.vignette      || 'rgba(0,0,0,0.85)';
      this._themeParticle = t.particleColor || '#ff6600';
      this._themeFont     = t.fonts?.ui     || 'serif';
      this._themeDirty    = true;
    } catch(_) {}
  }

  _isDiabl0WhiteLabel() {
    return !!this.gameSettings?.diabl0WhiteLabel;
  }

  _diabl0ActSkin(actIdx = this.actIdx) {
    const i = Math.max(0, Math.min(CR_DIABL0_WHITE_LABEL_ACTS.length - 1, Number(actIdx) || 0));
    return CR_DIABL0_WHITE_LABEL_ACTS[i] || null;
  }

  _displaySecretStageLine(stage = this._secretStage?.()) {
    if (!stage) return "";
    if (this._isDiabl0WhiteLabel()) {
      const skin = stage.era === "d2" ? CR_DIABL0_WHITE_LABEL_ACTS[1] : this._diabl0ActSkin(this.actIdx);
      const area = stage.area || skin?.region || "Depths";
      const floor = stage.floor ? ` L${stage.floor}` : "";
      return `${skin?.era || "DIABL0"}  ${area}${floor}`;
    }
    return `${stage.era === "d2" ? "DIABLO II" : "HELLFIRE"}  ${stage.area}${stage.floor ? ` L${stage.floor}` : ""}`;
  }

  _displayClassName(clsId) {
    if (this._isDiabl0WhiteLabel()) {
      return CR_DIABL0_WHITE_LABEL_CLASSES[clsId] || CR_CLASSES[clsId]?.name || clsId.toUpperCase();
    }
    if (this.gameSettings?.d2oMode || this.gameSettings?.devilutionX) {
      return D2O_CLASS_NAMES[clsId] || CR_CLASSES[clsId]?.name || clsId.toUpperCase();
    }
    return CR_CLASSES[clsId]?.name || clsId.toUpperCase();
  }

  // Returns the display act name (D2O style or original).
  _displayActName(actIdx) {
    const stage = this._secretStage?.();
    const i = Math.max(0, Math.min(5, actIdx));
    if (this._isDiabl0WhiteLabel()) {
      const skin = stage?.era === "d2" ? CR_DIABL0_WHITE_LABEL_ACTS[1] : this._diabl0ActSkin(i);
      return skin ? `${skin.era}: ${skin.name}` : `DIABL0 ACT ${i+1}`;
    }
    if (stage?.era === "hellfire") return stage.actName || "DIABLO I: HELLFIRE";
    if (stage?.era === "d2") return stage.actName || "DIABLO II: ACT I";
    if (this.gameSettings?.d2oMode || this.gameSettings?.devilutionX) {
      return D2O_ACT_NAMES[i]?.name || CR_ACTS[i]?.name || `ACT ${i+1}`;
    }
    return CR_ACTS[i]?.name || `ACT ${i+1}`;
  }

  _displayTownName(actIdx) {
    const stage = this._secretStage?.();
    const i = Math.max(0, Math.min(5, actIdx));
    if (this._isDiabl0WhiteLabel()) {
      const skin = stage?.era === "d2" ? CR_DIABL0_WHITE_LABEL_ACTS[1] : this._diabl0ActSkin(i);
      return skin?.town || CR_ACTS[i]?.town || "TOWN";
    }
    if (stage?.town) return stage.town;
    if (this.gameSettings?.d2oMode || this.gameSettings?.devilutionX) {
      return D2O_ACT_NAMES[i]?.town || CR_ACTS[i]?.town || "TOWN";
    }
    return CR_ACTS[i]?.town || "TOWN";
  }

  _displayWaypointName(actIdx, locIdx = 0) {
    const i = Math.max(0, Math.min(5, Number(actIdx) || 0));
    const loc = Math.max(0, Number(locIdx) || 0);
    if (this._isDiabl0WhiteLabel()) {
      const stage = this._secretStage?.();
      const skin = stage?.era === "d2" && i === this.actIdx ? CR_DIABL0_WHITE_LABEL_ACTS[1] : this._diabl0ActSkin(i);
      return skin?.waypoints?.[loc] || skin?.town || CR_ACTS[i]?.waypoints?.[loc] || CR_ACTS[i]?.town || "Waypoint";
    }
    const act = CR_ACTS[i] || CR_ACTS[0];
    return act.waypoints?.[loc] || act.town || "Waypoint";
  }

  _displayActLore(actIdx) {
    const i = Math.max(0, Math.min(5, Number(actIdx) || 0));
    if (this._isDiabl0WhiteLabel()) {
      const stage = this._secretStage?.();
      const skin = stage?.era === "d2" && i === this.actIdx ? CR_DIABL0_WHITE_LABEL_ACTS[1] : this._diabl0ActSkin(i);
      return skin?.lore || CR_ACTS[i]?.lore || CR_ACTS[i]?.desc || "";
    }
    return CR_ACTS[i]?.lore || CR_ACTS[i]?.desc || "";
  }

  _displayDungeonName(actIdx, level) {
    const stage = this._secretStage?.();
    if (this._isDiabl0WhiteLabel()) {
      const skin = this._diabl0ActSkin(actIdx);
      const loc = skin?.waypoints?.[Math.max(1, Math.min((skin?.waypoints?.length || 2) - 1, Number(level) || 1))];
      return `${loc || skin?.region || "Diabl0 Depths"} L${level || 1}`;
    }
    if (stage?.era === "hellfire") return `${stage.area} L${stage.floor || level || 1}`;
    if (stage?.era === "d2") return stage.area || "BLOOD MOOR";
    if (this.gameSettings?.devilutionX) {
      return DVX_DUNGEON_NAMES[Math.max(0,Math.min(5,actIdx))] + ` L${level||1}`;
    }
    return `ACT ${actIdx+1} DUNGEON`;
  }

  _displaySkillName(skillId) {
    if ((this.gameSettings?.d2oMode || this.gameSettings?.devilutionX) && D2O_SKILL_RENAMES[skillId]) {
      return D2O_SKILL_RENAMES[skillId];
    }
    return null; // use default
  }

  _displayEnemyName(enemyId, fallback = "Monster") {
    if (!this._isDiabl0WhiteLabel()) return fallback;
    const key = String(enemyId || fallback || "").toLowerCase();
    const direct = CR_DIABL0_WHITE_LABEL_MONSTERS[key];
    if (direct) return direct;
    const bossKey = String(fallback || "").toUpperCase();
    if (CR_DIABL0_WHITE_LABEL_BOSSES[bossKey]) return CR_DIABL0_WHITE_LABEL_BOSSES[bossKey];
    return String(fallback || "Monster")
      .replace(/^ELITE\s+/i, "Elite ")
      .replace(/\b(DIABLO|HELLFIRE|SANCTUARY)\b/gi, "Diabl0");
  }

  _lighten(hex,amt) {
    const c = this._rgbFromColor(hex, "#101012");
    const n = Number.isFinite(amt) ? amt : 0;
    return `rgb(${Math.max(0,Math.min(255,c.r+n))},${Math.max(0,Math.min(255,c.g+n))},${Math.max(0,Math.min(255,c.b+n))})`;
  }
  _darken(hex,amt) {
    const c = this._rgbFromColor(hex, "#101012");
    const n = Number.isFinite(amt) ? amt : 0;
    return `rgb(${Math.max(0,Math.min(255,c.r-n))},${Math.max(0,Math.min(255,c.g-n))},${Math.max(0,Math.min(255,c.b-n))})`;
  }
  _rgbFromColor(color, fallback="#101012") {
    let s = String(color || fallback || "#101012").trim();
    if (/^rgb/i.test(s)) {
      const m = s.match(/rgba?\(([^)]+)\)/i);
      const parts = m ? m[1].split(",").map(v => Number.parseFloat(v)) : [];
      if (parts.length >= 3 && parts.slice(0,3).every(Number.isFinite)) {
        return { r:Math.max(0,Math.min(255,parts[0])), g:Math.max(0,Math.min(255,parts[1])), b:Math.max(0,Math.min(255,parts[2])) };
      }
    }
    if (s[0] !== "#") s = fallback || "#101012";
    if (s.length === 4) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
    const r=Number.parseInt(s.slice(1,3),16), g=Number.parseInt(s.slice(3,5),16), b=Number.parseInt(s.slice(5,7),16);
    if (![r,g,b].every(Number.isFinite)) return { r:16, g:16, b:18 };
    return { r, g, b };
  }

  // ─── Save / Load ────────────────────────────────────────────────────────────
  save() {
    return {
      characterId: this.characterId || null,
      accountKey: this.accountKey || "guest",
      player: { ...this.player, summons:[] },
      act: this.actIdx+1,
      difficulty: this.difficulty,
      playerCount: this.playerCount || 1,
      score: this.score,
      screen: this.screen,
      stash: this.stash || [],
      sharedStash: this.sharedStash || [],
      merc: this.merc || null,
      shopItems: this.shopItems || [],
      settings: this.gameSettings || {},
      secretCampaign: this.secretCampaign ? {
        enabled:!!this.secretCampaign.enabled,
        stageIdx:Number(this.secretCampaign.stageIdx || 0),
        completedHellfire:!!this.secretCampaign.completedHellfire,
        enteredD2:!!this.secretCampaign.enteredD2,
        whiteLabelDiscoveredAt:this.secretCampaign.whiteLabelDiscoveredAt || null,
        stageHistory:Array.isArray(this.secretCampaign.stageHistory) ? this.secretCampaign.stageHistory.slice(-32) : [],
      } : null,
      online: {
        roomId:this.online?.roomId || null,
        connected:false,
      },
      onlineLobby: {
        games:Array.isArray(this.onlineLobby?.games) ? this.onlineLobby.games.slice(0,16) : [],
        status:this.onlineLobby?.status || "offline",
        lastRefresh:Number(this.onlineLobby?.lastRefresh || 0),
        lastError:this.onlineLobby?.lastError || "",
      },
      chronicle: this.chronicle || _makeChronicle(),
      waypoints: { ...(this.waypoints || { 1:true }) },
      mapMode: this.mapMode || this.minimap?.mode || "small",
      mapDiscovery: this.mapDiscovery || {},
      identifierFreed: !!this.identifierFreed,
      statues: (this.statues || []).map(s => ({ ...s })),
      quests: (this.quests || []).map(q => ({ ...q, reward:{ ...(q.reward || {}) } })),
      loot: (this.loot || []).map(l => ({ ...l, item:{ ...(l.item || {}) } })),
      smashedTownProps:[...(this.smashedTownProps || [])],
      mercDiscount: !!this.mercDiscount,
      imbueCharges: Number(this.imbueCharges || 0),
      socketCharges: Number(this.socketCharges || 0),
      nameItemCharges: Number(this.nameItemCharges || 0),
      camera: this.camera,
      cameraState: {
        zoom: this.cameraZoom,
        yaw: this.cameraYaw,
        pitch: this.cameraPitch,
        fpsPitch: this.fpsPitch,
        locked: this.cameraLocked,
        preset: this.cameraPreset,
      },
      dungeonSeed: this.dungeonSeed,
    };
  }

  load(saveData) {
    if (!saveData) return;
    if (saveData.player) {
      this.player = { ...saveData.player, summons: saveData.player.summons || [] };
      this.player.skillRanks = Array.from({ length: 30 }, (_, i) => this.player.skillRanks?.[i] || 0);
      // v7.1 backfills — older saves predate Town Portal / Identify scrolls
      if (this.player.beltTp == null) this.player.beltTp = 2;
      if (this.player.beltId == null) this.player.beltId = 1;
      if (this.player.beltHp == null) this.player.beltHp = 3;
      if (this.player.beltMp == null) this.player.beltMp = 2;
    }
    this.actIdx = Math.max(0, Math.min(5, (saveData.act || this.actIdx + 1) - 1));
    this.act = CR_ACTS[this.actIdx] || CR_ACTS[0];
    this.difficulty = saveData.difficulty || this.difficulty;
    this.diffMult = { normal:1, nightmare:1.75, hell:3, inferno:4.5, torment:6, abyss:8 }[this.difficulty] || 1;
    this.playerCount = Math.max(1, Math.min(8, saveData.playerCount || this.playerCount || 1));
    this.playerCountMult = 1 + (this.playerCount - 1) * 0.45;
    this.stash = Array.isArray(saveData.stash) ? saveData.stash : (this.stash || []);
    this.sharedStash = Array.isArray(saveData.sharedStash) ? saveData.sharedStash : (this.sharedStash || []);
    this.merc = saveData.merc || this.merc || null;
    this.shopItems = Array.isArray(saveData.shopItems) ? saveData.shopItems : (this.shopItems || this._genShopItems());
    this.gameSettings = _mergeCrSettings(saveData.settings || this.gameSettings || {});
    this.keyBindings = { ...CR_DEFAULT_KEY_BINDINGS, ...(this.gameSettings.keyBindings || {}) };
    if (saveData.secretCampaign) {
      this.secretCampaign = {
        enabled:!!saveData.secretCampaign.enabled,
        stageIdx:Number(saveData.secretCampaign.stageIdx || 0),
        completedHellfire:!!saveData.secretCampaign.completedHellfire,
        enteredD2:!!saveData.secretCampaign.enteredD2,
        whiteLabelDiscoveredAt:saveData.secretCampaign.whiteLabelDiscoveredAt || null,
        stageHistory:Array.isArray(saveData.secretCampaign.stageHistory) ? saveData.secretCampaign.stageHistory : [],
      };
    }
    if (saveData.online?.roomId && this.online) this.online.roomId = saveData.online.roomId;
    this.chronicle = _makeChronicle(saveData.chronicle || this.chronicle);
    this.waypoints = { 1:true, ...(saveData.waypoints || this.waypoints || {}) };
    this.waypoints[this.actIdx+1]=true;
    this.mapMode = saveData.mapMode || this.mapMode || "small";
    this.minimap.mode = this.mapMode;
    this.mapDiscovery = saveData.mapDiscovery || this.mapDiscovery || this._loadMapDiscovery();
    this.identifierFreed = !!saveData.identifierFreed;
    this.statues = Array.isArray(saveData.statues) ? saveData.statues : (this.statues || this._initStatues());
    this.quests = Array.isArray(saveData.quests) ? this._mergeSavedQuests(saveData.quests) : (this.quests || this._initQuests());
    this.loot = Array.isArray(saveData.loot) ? saveData.loot : (this.loot || []);
    this.mercDiscount = !!saveData.mercDiscount;
    this.imbueCharges = Number(saveData.imbueCharges || this.imbueCharges || 0);
    this.socketCharges = Number(saveData.socketCharges || this.socketCharges || 0);
    this.nameItemCharges = Number(saveData.nameItemCharges || this.nameItemCharges || 0);
    this.score = Number(saveData.score || this.score || 0);
    this.characterId = saveData.characterId || this.characterId || null;
    this.accountKey = saveData.accountKey || this.accountKey || "guest";
    // D2-style checkpoint: dungeon/wilderness positions are NOT trusted on reload.
    // Outer tiles are technically walkable (v=0) but render as void darkness.
    // Always re-enter from town — act progress, quests and loot are fully preserved.
    const _savedScreen = saveData.screen || "town";
    this.screen = (_savedScreen === "dungeon" || _savedScreen === "wilderness") ? "town" : _savedScreen;
    this.camera = saveData.camera || this.camera || "iso";
    const cam = saveData.cameraState || {};
    if (Number.isFinite(cam.zoom)) this.cameraZoom = cam.zoom;
    if (Number.isFinite(cam.yaw)) this.cameraYaw = cam.yaw;
    if (Number.isFinite(cam.pitch)) this.cameraPitch = cam.pitch;
    if (Number.isFinite(cam.fpsPitch)) this.fpsPitch = cam.fpsPitch;
    this.cameraLocked = !!cam.locked;
    this.cameraPreset = cam.preset || this.cameraPreset;
    if (this.secretCampaign?.enabled) this._applySecretCampaignStage(false);
    this.paused = false;
    this.dashboardOpen = false;
    this._ensureSpawnSafe();
    this._centerCamera();
  }

  // Validates the player coords landed on a walkable tile of the active map.
  // Dungeon positions are NEVER trusted on reload — even when the seed matches,
  // the outer dungeon ring has v=0 tiles that are technically walkable but
  // render as void / open space, leaving the player visually floating in
  // darkness. We always restart at the dungeon entrance.
  _ensureSpawnSafe() {
    if (!this.player) return;
    // Dungeon screen: unconditionally snap to the dungeon spawn entrance.
    // Use _nearestWalkableTile to guarantee the exact spawn cell is open.
    if (this.screen === "dungeon") {
      if (this.dungeon) {
        const spX = this.dungeon.spawnX ?? Math.floor((this.dungeon.spawnWx ?? 0) / this.TS);
        const spY = this.dungeon.spawnY ?? Math.floor((this.dungeon.spawnWy ?? 0) / this.TS);
        const safe = this._nearestWalkableTile(this.dungeon.map, spX, spY, 12);
        this.player.wx = safe.tx * this.TS + this.TS / 2;
        this.player.wy = safe.ty * this.TS + this.TS / 2;
      } else {
        // Dungeon not yet generated — recall to town so player isn't floating in void
        this.screen = "town";
        this.player.wx = this.town?.spawnWx ?? this.player.wx;
        this.player.wy = this.town?.spawnWy ?? this.player.wy;
      }
      return;
    }
    // Wilderness / town: only relocate if the saved position is unwalkable.
    const tx = Math.floor(this.player.wx / this.TS);
    const ty = Math.floor(this.player.wy / this.TS);
    if (this._walkable(tx, ty)) return;
    // Try the screen's native spawn point first
    if (this.screen === "wilderness" && this.wilderness?.spawnWx != null) {
      this.player.wx = this.wilderness.spawnWx;
      this.player.wy = this.wilderness.spawnWy;
      if (this._walkable(Math.floor(this.player.wx/this.TS), Math.floor(this.player.wy/this.TS))) return;
    }
    // Last-resort: send the player back to town and announce it
    this.screen = "town";
    this.player.wx = this.town.spawnWx;
    this.player.wy = this.town.spawnWy;
    this._addFloat?.("RECALLED TO TOWN", this.player.wx, this.player.wy - 50, "#ffaa44", 160);
  }

  // ── Fishing minigame (Alpha 5.2) ─────────────────────────────────────────
  // Timing-based clicker: a "bite" indicator pulses; click within the
  // sweet-spot window to reel in a fish (gives gold + chance of rare loot).
  // Triggered when player walks onto a fishing tile, or via the React
  // CrypticFishingMinigame component.
  _startFishingMinigame() {
    this.fishing = {
      active: true, state: "waiting", startedAt: this._frame || 0,
      biteAt: (this._frame || 0) + 60 + Math.floor(Math.random() * 180),
      windowFrames: 28,
      hooked: false, score: 0,
    };
  }
  _fishingClick() {
    if (!this.fishing?.active) return null;
    const now = this._frame || 0;
    const f = this.fishing;
    if (now < f.biteAt) { f.active = false; this._addFloat?.("Too early — fish fled!", this.player.wx, this.player.wy - 50, "#ff5544", 90); return { ok: false }; }
    if (now > f.biteAt + f.windowFrames) { f.active = false; this._addFloat?.("Too late!", this.player.wx, this.player.wy - 50, "#ff5544", 90); return { ok: false }; }
    f.active = false; f.hooked = true;
    const r = Math.random();
    const reward = r > 0.92
      ? { gold: 250 + Math.floor(Math.random() * 250), rare: true, label: "Rare catch!" }
      : r > 0.6
      ? { gold: 60 + Math.floor(Math.random() * 80), label: "Decent catch" }
      : { gold: 12 + Math.floor(Math.random() * 30), label: "Small fish" };
    this.player.gold = (this.player.gold || 0) + reward.gold;
    this._addFloat?.(`${reward.label} +${reward.gold}g`, this.player.wx, this.player.wy - 56, reward.rare ? "#ffd700" : "#44ff88", 130);
    return { ok: true, reward };
  }
  _endFishingMinigame() { if (this.fishing) this.fishing.active = false; this.showFishing = false; }

  // Manual "unstick" — teleports the player to town immediately.
  // Called from the RESCUE button in the pause dashboard and (optionally) a key.
  _rescueToTown() {
    if (!this.player || !this.town) return;
    this.screen = "town";
    this.player.wx = this.town.spawnWx;
    this.player.wy = this.town.spawnWy;
    this.enemies = [];
    this.projectiles = [];
    this.moveTarget = null;
    this.attackTarget = null;
    this._cameraSnap = true;
    this._centerCamera();
    this._teleportSummonsToPlayer();
    this._addFloat("RECALLED TO TOWN", this.player.wx, this.player.wy - 58, "#ffaa44", 130);
  }

  // Drop a corpse marker at death location + return to town. Player can walk
  // back to the corpse to reclaim everything (Diablo II hardcore-lite). Gear
  // is unequipped + locked until corpse is picked up.
  // Alpha 5 — Wade: "when you die, you need to return to town - and you cant
  // get your gear back unless you get your body".
  _returnToTownFromDeath() {
    if (!this.player) return;
    // Alpha 5.3: if the act's town hasn't been generated yet (rare after a
    // bad load), rebuild it before teleporting. Prevents wx/wy from being
    // set to undefined which then NaN-crashes _walkable.
    if (!this.town) {
      try { this.town = _genTownMap(this.actIdx || 0); } catch (_) {}
    }
    if (!this.town || !Number.isFinite(this.town.spawnWx)) return;
    // Unbind the dead-screen one-time handlers so they don't keep firing
    // if the player dies again on a different screen.
    if (this._deadClickHandler) { this.canvas.removeEventListener("mousedown", this._deadClickHandler); this._deadClickHandler = null; }
    if (this._deadKeyHandler)   { window.removeEventListener("keydown", this._deadKeyHandler); this._deadKeyHandler = null; }
    this._deadClickBound = false;
    const p = this.player;
    // Snapshot equipment + gold for the corpse.
    const corpse = {
      areaScreen: this.screen,
      actIdx: this.actIdx,
      areaKey: this._adminAreaKey ? this._adminAreaKey() : `${this.screen}:act${this.actIdx}`,
      wx: p.wx, wy: p.wy,
      gear: p.equipped ? { ...p.equipped } : null,
      goldLost: Math.floor((p.gold || 0) * 0.25),
      createdAt: Date.now(),
    };
    this.deathCorpse = corpse;
    // Lock gear: stash a "ghost" copy and unequip everything until pickup.
    if (p.equipped) {
      p.equippedGhost = { ...p.equipped };
      p.equipped = {};
    }
    p.gold = Math.max(0, (p.gold || 0) - corpse.goldLost);
    // Revive + return to town
    p.hp = Math.max(1, Math.floor(p.maxHp * 0.5));
    p.mp = Math.max(1, Math.floor(p.maxMp * 0.4));
    p.isDead = false;
    this.screen = "town";
    this.player.wx = this.town.spawnWx;
    this.player.wy = this.town.spawnWy;
    this.enemies = []; this.projectiles = []; this.boss = null; this.bossSpawned = false;
    this.moveTarget = null; this.attackTarget = null;
    this._cameraSnap = true;
    this._centerCamera();
    this._teleportSummonsToPlayer();
    this.gameOver = false;
    this._addFloat(`You died. Recover your corpse to get your gear back.`, this.town.spawnWx, this.town.spawnWy - 70, "#ff5544", 220);
    if (corpse.goldLost > 0) {
      this._addFloat(`Lost ${corpse.goldLost} gold`, this.town.spawnWx, this.town.spawnWy - 50, "#ffd700", 180);
    }
  }

  // Player has walked onto their corpse — restore gear + gold loss waived.
  _claimDeathCorpse() {
    const c = this.deathCorpse;
    if (!c) return false;
    const p = this.player;
    if (p.equippedGhost) {
      p.equipped = { ...p.equippedGhost };
      delete p.equippedGhost;
    }
    this.deathCorpse = null;
    this._addFloat("Corpse recovered. Gear restored.", p.wx, p.wy - 64, "#44ff88", 180);
    return true;
  }

  saveToStorage() {
    try {
      const save = this.save();
      const account = String(this.accountKey || "guest").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
      const char = this.characterId ? String(this.characterId).replace(/[^a-z0-9_]/gi, "_").toLowerCase() : "";
      const key = char ? `cryptic_realm_save_v7_${account}_${char}` : "cryptic_realm_save_v1";
      localStorage.setItem(key, JSON.stringify(save));
      this.lastSaveAt = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" });
      this.lastSaveMessage = `Saved ${this.lastSaveAt}`;
      this._addFloat("GAME SAVED", this.player.wx, this.player.wy-58, "#44ff88", 100);
    } catch {}
  }

  setQuality(q) {
    const prevQuality = this.quality;
    this.quality = _normalizeQualityTier(q);
    this.Q = _buildQ(this.quality);
    this._kayUrlCache = {};
    this._buildingCache = {};
    this._cameraSnap = true;
    this._centerCamera();
    const chosen = this.cls?.id || this.player?.className || "iron_warden";
    preloadCrAtlas(chosen, this.quality);
    if (this.quality === "ultra" && prevQuality !== "ultra") {
      this._startLoadingGate(
        "128-BIT UPGRADE",
        "Baking visible Meshy actors while 64-bit fallbacks stay playable",
        72,
        false,
        false
      );
    } else {
      this._scheduleKaykitPreloads(chosen);
    }
  }

  destroy() {
    this.saveToStorage?.();
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup",   this._onKeyUp);
    this.canvas.removeEventListener("mousemove",  this._onMouseMove);
    this.canvas.removeEventListener("mousedown",  this._onMouseDown);
    if (this._onMouseUp)     this.canvas.removeEventListener("mouseup",     this._onMouseUp);
    if (this._onContextMenu) this.canvas.removeEventListener("contextmenu", this._onContextMenu);
    if (this._onWheel)       this.canvas.removeEventListener("wheel",       this._onWheel);
    if (this._onTouchStart)  this.canvas.removeEventListener("touchstart",  this._onTouchStart);
    if (this._onTouchMove)   this.canvas.removeEventListener("touchmove",   this._onTouchMove);
    if (this._onTouchEnd) {
      this.canvas.removeEventListener("touchend",    this._onTouchEnd);
      this.canvas.removeEventListener("touchcancel", this._onTouchEnd);
    }
    // Dead-screen one-time handlers (Alpha 5 corpse run flow)
    if (this._deadClickHandler) this.canvas.removeEventListener("mousedown", this._deadClickHandler);
    if (this._deadKeyHandler)   window.removeEventListener("keydown", this._deadKeyHandler);
  }
}
