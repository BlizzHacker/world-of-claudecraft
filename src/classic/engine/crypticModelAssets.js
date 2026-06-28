// crypticModelAssets.js — legal 3D model source map for Cryptic Realm 64/128-bit assets.
// Do not import Diablo/Blizzard ripped models. The linked Diablo-style references are art direction only.
//
// v7.1: 64bit slots are wired to KayKit (CC0) via crypticKayKitMap.js. The Quaternius
// targets below remain as 128bit roadmap entries until a full 128bit pack is purchased.

import {
  crKayClassBody, crKayMonster, crKaySummon, crKayNpc,
  CR_KAYKIT_CLASS_BODIES, CR_KAYKIT_MONSTERS, CR_KAYKIT_SUMMONS, CR_KAYKIT_NPCS,
} from "./crypticKayKitMap.js";

export const CR_MODEL_SOURCE_PACKS = [
  {
    id: "kaykit_adventurers_2",
    name: "KayKit Adventurers 2.0 (FREE)",
    license: "CC0",
    formats: ["glTF", "FBX", "OBJ", "Blend"],
    url: "https://kaylousberg.itch.io/kaykit-adventurers",
    notes: "Stylized low-poly adventurer bodies. Powering Cryptic Realm 64bit player classes in v7.1.",
  },
  {
    id: "kaykit_skeletons_1_1",
    name: "KayKit Skeletons 1.1 (FREE)",
    license: "CC0",
    formats: ["glTF", "FBX"],
    url: "https://kaylousberg.itch.io/kaykit-skeletons",
    notes: "Undead bodies — used for Bone Herald, summons, and skeleton enemy types.",
  },
  {
    id: "kaykit_dungeon_1",
    name: "KayKit Dungeon 1.0 (FREE)",
    license: "CC0",
    formats: ["glTF", "FBX"],
    url: "https://kaylousberg.itch.io/dungeonpack",
    notes: "Chests, barrels, weapons, banners — used as Cryptic Realm dungeon props and loot drops.",
  },
  {
    id: "kaykit_char_animations",
    name: "KayKit Character Animations 1.1",
    license: "CC0",
    formats: ["glTF", "FBX"],
    url: "https://kaylousberg.itch.io/kaykit-animations",
    notes: "Mannequin Medium/Large rigs and movement/combat clips — animation source for KayKit characters.",
  },
  {
    id: "quaternius_rpg_characters",
    name: "Quaternius RPG Character Pack",
    license: "CC0",
    formats: ["glTF", "FBX", "OBJ", "Blend"],
    url: "https://quaternius.com/packs/rpgcharacters.html",
    notes: "Rigged, animated, textured fantasy humanoids. Good base for class/NPC bodies.",
  },
  {
    id: "quaternius_modular_fantasy_outfits",
    name: "Quaternius Modular Character Outfits - Fantasy",
    license: "CC0",
    formats: ["glTF", "FBX", "OBJ", "Blend"],
    url: "https://quaternius.com/packs/modularcharacteroutfitsfantasy.html",
    notes: "Modular humanoid outfits, armor, robes, and accessories for 128-bit class variants.",
  },
];

// 64bit slots resolve to KayKit GLBs (live in v7.1). 128bit roadmap remains
// pointed at a future Quaternius/Sketchfab buy and is overridable per-account.
function _kayClass(id) { return crKayClassBody(id)?.url || null; }
function _kayMonster(id) { return crKayMonster(id)?.url || null; }
function _kaySummon(id) { return crKaySummon(id)?.url || null; }
function _kayNpc(id) { return crKayNpc(id)?.url || null; }

export const CR_MODEL_TARGETS = {
  ember_witch:    { archetype: "robed caster",       sourcePack: "arcforge_sprite_pipeline", localGlb: "/cryptic-assets/models/classes/ember_witch.glb" },
  iron_warden:    { archetype: "heavy warrior",      sourcePack: "arcforge_sprite_pipeline", localGlb: "/cryptic-assets/models/classes/iron_warden.glb" },
  bone_herald:    { archetype: "necromancer caster", sourcePack: "arcforge_sprite_pipeline", localGlb: "/cryptic-assets/models/classes/bone_herald.glb" },
  shadow_blade:   { archetype: "dual blade rogue",   sourcePack: "arcforge_sprite_pipeline", localGlb: "/cryptic-assets/models/classes/shadow_blade.glb" },
  forest_sage:    { archetype: "druid shaman",       sourcePack: "arcforge_sprite_pipeline", localGlb: "/cryptic-assets/models/classes/forest_sage.glb" },
  steel_crusader: { archetype: "armored paladin",    sourcePack: "arcforge_sprite_pipeline", localGlb: "/cryptic-assets/models/classes/steel_crusader.glb" },
  void_archer:    { archetype: "hooded archer",      sourcePack: "arcforge_sprite_pipeline", localGlb: "/cryptic-assets/models/classes/void_archer.glb" },
  kaykit_mage:          { archetype: "robed caster",    sourcePack: "kaykit_adventurers_2", localGlb: _kayClass("kaykit_mage") },
  kaykit_necromancer:   { archetype: "dark caster",     sourcePack: "kaykit_adventurers_2", localGlb: _kayClass("kaykit_necromancer") },
  kaykit_barbarian:     { archetype: "heavy barbarian", sourcePack: "kaykit_adventurers_2", localGlb: _kayClass("kaykit_barbarian") },
  kaykit_knight:        { archetype: "armored knight",  sourcePack: "kaykit_adventurers_2", localGlb: _kayClass("kaykit_knight") },
  kaykit_ranger:        { archetype: "hooded ranger",   sourcePack: "kaykit_adventurers_2", localGlb: _kayClass("kaykit_ranger") },
  kaykit_rogue:         { archetype: "rogue",           sourcePack: "kaykit_adventurers_2", localGlb: _kayClass("kaykit_rogue") },
  kaykit_rogue_hooded:  { archetype: "hooded rogue",    sourcePack: "kaykit_adventurers_2", localGlb: _kayClass("kaykit_rogue_hooded") },

  npc_blacksmith: { archetype: "town blacksmith",    sourcePack: "kaykit_adventurers_2",   localGlb: _kayNpc("npc_blacksmith") || "/cryptic-assets/models/npcs/blacksmith.glb" },
  npc_merchant:   { archetype: "town merchant",      sourcePack: "kaykit_adventurers_2",   localGlb: _kayNpc("npc_merchant")   || "/cryptic-assets/models/npcs/merchant.glb" },
  npc_healer:     { archetype: "town healer",        sourcePack: "kaykit_adventurers_2",   localGlb: _kayNpc("npc_healer")     || "/cryptic-assets/models/npcs/healer.glb" },
  npc_stash:      { archetype: "town guard",         sourcePack: "kaykit_adventurers_2",   localGlb: _kayNpc("npc_stash")      || "/cryptic-assets/models/npcs/stash_keeper.glb" },

  zombie:   { archetype: "undead humanoid", sourcePack: "kaykit_skeletons_1_1", localGlb: _kayMonster("skeleton")        || "/cryptic-assets/models/monsters/zombie.glb" },
  skeleton: { archetype: "skeleton warrior", sourcePack: "kaykit_skeletons_1_1", localGlb: _kayMonster("skeleton")        || "/cryptic-assets/models/monsters/skeleton.glb" },
  skeleton_rogue: { archetype: "skeleton rogue", sourcePack: "kaykit_skeletons_1_1", localGlb: _kayMonster("skeleton_rogue") || "/cryptic-assets/models/monsters/skeleton_rogue.glb" },
  skeleton_mage_enemy: { archetype: "skeleton caster", sourcePack: "kaykit_skeletons_1_1", localGlb: _kayMonster("skeleton_mage_enemy") || "/cryptic-assets/models/monsters/skeleton_mage.glb" },
  summon_skeleton: { archetype: "friendly skeleton minion", sourcePack: "kaykit_skeletons_1_1", localGlb: _kaySummon("summon_skeleton") || "/cryptic-assets/models/summons/skeleton_minion.glb" },
  summon_mage:     { archetype: "friendly skeletal mage",   sourcePack: "kaykit_skeletons_1_1", localGlb: _kaySummon("summon_mage")     || "/cryptic-assets/models/summons/skeletal_mage.glb" },
  summon_warrior:  { archetype: "friendly skeletal warrior", sourcePack: "kaykit_skeletons_1_1", localGlb: _kaySummon("summon_warrior")  || "/cryptic-assets/models/summons/skeletal_warrior.glb" },
  summon_golem: { archetype: "friendly bone golem", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/summons/bone_golem.glb" },
  werewolf: { archetype: "wolf beast", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/werewolf.glb" },
  sand_golem: { archetype: "sand golem", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/sand_golem.glb" },
  mummy: { archetype: "mummy undead", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/mummy.glb" },
  scorpion: { archetype: "giant scorpion", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/scorpion.glb" },
  jungle_demon: { archetype: "jungle demon", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/jungle_demon.glb" },
  shaman: { archetype: "fallen shaman caster", sourcePack: "quaternius_modular_fantasy_outfits", localGlb: "/cryptic-assets/models/monsters/shaman.glb" },
  plant_horror: { archetype: "plant horror", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/plant_horror.glb" },
  fire_imp: { archetype: "fire imp", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/fire_imp.glb" },
  blood_knight: { archetype: "blood knight", sourcePack: "quaternius_modular_fantasy_outfits", localGlb: "/cryptic-assets/models/monsters/blood_knight.glb" },
  chaos_mage: { archetype: "chaos mage", sourcePack: "quaternius_modular_fantasy_outfits", localGlb: "/cryptic-assets/models/monsters/chaos_mage.glb" },
  ice_wraith: { archetype: "ice wraith", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/ice_wraith.glb" },
  frost_giant: { archetype: "frost giant", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/frost_giant.glb" },
  snow_witch: { archetype: "snow witch", sourcePack: "quaternius_modular_fantasy_outfits", localGlb: "/cryptic-assets/models/monsters/snow_witch.glb" },
  rift_spawn: { archetype: "rift demon", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/rift_spawn.glb" },
  dim_horror: { archetype: "dimensional horror", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/dim_horror.glb" },
  star_eater: { archetype: "star eater beast", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/star_eater.glb" },
  demon:    { archetype: "horned demon",    sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/demon.glb" },
  beast:    { archetype: "quadruped beast", sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/beast.glb" },
  golem:    { archetype: "stone golem",     sourcePack: "quaternius_rpg_characters", localGlb: "/cryptic-assets/models/monsters/golem.glb" },
};

export const CR_MODEL_TARGET_ALIASES = {
  merc_archer: "void_archer",
  merc_warrior: "iron_warden",
  merc_mage: "ember_witch",
  skeleton_pet: "summon_skeleton",
  skeleton_guard: "summon_skeleton",
  bone_golem: "summon_golem",
  skeletal_mage: "summon_mage",
};

export const CR_ACTOR_ASSET_SLOTS = Object.freeze(
  Object.fromEntries(Object.entries(CR_MODEL_TARGETS).map(([id, target]) => [
    id,
    {
      id,
      label: id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      kind: id.startsWith("npc_") ? "npc" : id.startsWith("summon_") ? "summon" : CR_MODEL_TARGETS[id]?.localGlb?.includes("/classes/") ? "class" : "monster",
      spriteRoot: `/cryptic-assets/sprites/${id}/`,
      modelRoot: target.localGlb,
      textureRoot: `/cryptic-assets/textures/${id}/`,
      replaceable: true,
      ...target,
    },
  ]))
);

function _overrideFor(id) {
  if (typeof localStorage === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(`cr_actor_asset_${id}`) || "null");
  } catch {
    return null;
  }
}

export function crModelTarget(id) {
  const key = CR_MODEL_TARGET_ALIASES[id] || id;
  const base = CR_MODEL_TARGETS[key] || null;
  const override = _overrideFor(key) || _overrideFor(id);
  return override ? { ...(base || {}), ...override, id:key, override:true } : base;
}

export function crActorAsset(id) {
  const key = CR_MODEL_TARGET_ALIASES[id] || id;
  const slot = CR_ACTOR_ASSET_SLOTS[key] || null;
  const override = _overrideFor(key) || _overrideFor(id);
  return override ? { ...(slot || {}), ...override, id:key, override:true } : slot;
}

export function crRegisterActorAsset(id, asset) {
  if (typeof localStorage === "undefined") return false;
  localStorage.setItem(`cr_actor_asset_${id}`, JSON.stringify(asset || {}));
  return true;
}

export function crClearActorAsset(id) {
  if (typeof localStorage === "undefined") return false;
  localStorage.removeItem(`cr_actor_asset_${id}`);
  return true;
}
