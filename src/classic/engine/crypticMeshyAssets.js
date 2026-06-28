import { CR_GENERATED_MESHY_ACTORS, crGeneratedMeshyActor } from "./crypticGeneratedMeshyAssets.js";

// crypticMeshyAssets.js - 128-bit Meshy AI asset routing for Cryptic Realm.
// Files are served by update-app from:
//   CrypticRealmAssets/3d-assets/Meshy -> /cryptic-assets/3d-assets/Meshy
//
// Runtime contract:
// - Prefer GLB for browser play.
// - Keep FBX + texture folders as editable source archives until converted.
// - Meshy assets are 128-bit first; lower tiers stay on KayKit/procedural until
//   each heavy model gets LODs and sprite bake QA.

export const CR_MESHY_BASE = "/cryptic-assets/3d-assets/Meshy";
export const CR_CRYPTIC_ASSET_BASE = "/cryptic-assets";

function _encPath(s) {
  return s.split("/").map(encodeURIComponent).join("/");
}

export function crMeshyUrl(relPath) {
  if (!relPath) return null;
  return `${CR_MESHY_BASE}/${_encPath(relPath)}`;
}

export function crCrypticAssetUrl(relPath) {
  if (!relPath) return null;
  return `${CR_CRYPTIC_ASSET_BASE}/${_encPath(relPath)}`;
}

export const CR_MESHY_ANIM_SET_20 = [
  "idle", "walk", "run", "attack", "attack_heavy",
  "cast", "block", "dodge", "hurt", "death",
  "taunt", "battle_cry", "leap", "whirlwind", "execute",
  "pickup", "interact", "stunned", "victory", "spawn",
];

export const CR_MESHY_ACTORS = {
  iron_warden: {
    id: "iron_warden",
    name: "Ironfur Berserker",
    role: "player",
    classSkin: "Iron Warden / Warrior / Barbarian",
    priority: "128bit",
    url: crMeshyUrl("Characters/Meshy_AI_Ironfur_Berserker_biped/Meshy_AI_Ironfur_Berserker_biped/Meshy_AI_Ironfur_Berserker_biped_Meshy_AI_Meshy_Merged_Animations.glb"),
    sourceUrl: crMeshyUrl("Characters/Meshy_AI_Ironfur_Berserker_biped/Meshy_AI_Ironfur_Berserker_biped/Meshy_AI_Ironfur_Berserker_biped_Character_output.glb"),
    scale: 1.62,
    yOffset: 0.28,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },
  warrior: { alias: "iron_warden" },
  barbarian: { alias: "iron_warden" },

  void_archer: {
    id: "void_archer",
    name: "Meshy Amazon",
    role: "player",
    classSkin: "Void Archer / Amazon",
    priority: "128bit",
    url: crMeshyUrl("Characters/Meshy_AI_Create_a_Amazon_with__biped/Meshy_AI_Create_a_Amazon_with__biped/Meshy_AI_Create_a_Amazon_with__biped_Meshy_AI_Meshy_Merged_Animations.glb"),
    sourceUrl: crMeshyUrl("Characters/Meshy_AI_Create_a_Amazon_with__biped/Meshy_AI_Create_a_Amazon_with__biped/Meshy_AI_Create_a_Amazon_with__biped_Character_output.glb"),
    scale: 1.34,
    yOffset: 0.30,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },
  amazon: { alias: "void_archer" },

  monk: {
    id: "monk",
    name: "Fair Monk",
    role: "player",
    classSkin: "Monk / Hellfire Martial Adept",
    priority: "128bit",
    url: crMeshyUrl("API/meshy-monk-fair-male/00_Unsorted/meshy-monk-fair-male_animation_glb_url.glb"),
    sourceUrl: crMeshyUrl("API/meshy-monk-fair-male/00_Unsorted/meshy-monk-fair-male_rigged_character_glb_url.glb"),
    walkUrl: crMeshyUrl("API/meshy-monk-fair-male/00_Unsorted/meshy-monk-fair-male_walking_glb_url.glb"),
    runUrl: crMeshyUrl("API/meshy-monk-fair-male/00_Unsorted/meshy-monk-fair-male_running_glb_url.glb"),
    scale: 1.34,
    yOffset: 0.30,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },
  hellfire_monk: { alias: "monk" },
  town_monk: { alias: "monk" },

  town_bard: {
    id: "town_bard",
    name: "Town Bard",
    role: "town-npc",
    classSkin: "Non-combat musician",
    priority: "128bit",
    url: crMeshyUrl("API/meshy-bard-fair-male-playing/00_Unsorted/Meshy_Asset_20260505_205150_animation_glb_url.glb"),
    sourceUrl: crMeshyUrl("API/meshy-bard-fair-male-playing/00_Unsorted/Meshy_Asset_20260505_205150_rigged_character_glb_url.glb"),
    walkUrl: crMeshyUrl("API/meshy-bard-fair-male-playing/00_Unsorted/Meshy_Asset_20260505_205150_walking_glb_url.glb"),
    runUrl: crMeshyUrl("API/meshy-bard-fair-male-playing/00_Unsorted/Meshy_Asset_20260505_205150_running_glb_url.glb"),
    scale: 1.32,
    yOffset: 0.30,
    nonCombat: true,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },
  bard_musician: { alias: "town_bard" },

  forest_sage: {
    id: "forest_sage",
    name: "Peachlight Forest Spirit",
    role: "player",
    classSkin: "Forest Sage / Druid",
    priority: "128bit",
    url: crMeshyUrl("Characters/Meshy_AI_Peachlight_Forest_Spr_0505181154_texture.glb"),
    scale: 0.86,
    yOffset: 0.5,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },
  druid: { alias: "forest_sage" },

  bone_herald_lich: {
    id: "bone_herald_lich",
    name: "Bonebound Lich",
    role: "player-skin",
    classSkin: "Bone Herald 128-bit template",
    priority: "128bit",
    url: crCrypticAssetUrl("char-templates/BONE-HERALD/128bit/assets/Meshy_AI_The_Bonebound_Lich_biped/Meshy_AI_The_Bonebound_Lich_biped_Meshy_AI_Meshy_Merged_Animations.glb"),
    sourceUrl: crCrypticAssetUrl("char-templates/BONE-HERALD/128bit/assets/Meshy_AI_The_Bonebound_Lich_biped/Meshy_AI_The_Bonebound_Lich_biped_Character_output.glb"),
    scale: 1.14,
    yOffset: 0.38,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },
  bone_herald: { alias: "bone_herald_lich" },
  necromancer: { alias: "bone_herald_lich" },
  bonebound_lich: { alias: "bone_herald_lich" },

  treasure_maw: {
    id: "treasure_maw",
    name: "Treasure Maw",
    role: "monster",
    priority: "128bit",
    url: crMeshyUrl("Monsters/Meshy_AI_Treasure_Maw_0505181103_texture.glb"),
    scale: 1.1,
    yOffset: 0.55,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },
  dim_horror: { alias: "treasure_maw" },

  crimson_emberwyrm: {
    id: "crimson_emberwyrm",
    name: "Crimson Emberwyrm",
    role: "monster",
    priority: "128bit",
    url: crMeshyUrl("Monsters/Meshy_AI_Crimson_Emberwyrm_biped/Meshy_AI_Crimson_Emberwyrm_biped/Meshy_AI_Crimson_Emberwyrm_biped_Animation_Walking_withSkin.glb"),
    runUrl: crMeshyUrl("Monsters/Meshy_AI_Crimson_Emberwyrm_biped/Meshy_AI_Crimson_Emberwyrm_biped/Meshy_AI_Crimson_Emberwyrm_biped_Animation_Running_withSkin.glb"),
    attackUrl: crMeshyUrl("Monsters/Meshy_AI_Crimson_Emberwyrm_biped/Meshy_AI_Crimson_Emberwyrm_biped/Meshy_AI_Crimson_Emberwyrm_biped_Animation_Right_Uppercut_from_Guard_withSkin.glb"),
    scale: 1.1,
    yOffset: 0.52,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },
  rift_spawn: { alias: "crimson_emberwyrm" },
  fire_imp: { alias: "crimson_emberwyrm" },

  infernal_behemoth: {
    id: "infernal_behemoth",
    name: "Infernal Behemoth",
    role: "boss",
    priority: "128bit",
    url: crMeshyUrl("Bosses/Meshy_AI_Infernal_Behemoth_biped/Meshy_AI_Infernal_Behemoth_biped/Meshy_AI_Infernal_Behemoth_biped_Meshy_AI_Meshy_Merged_Animations.glb"),
    sourceUrl: crMeshyUrl("Bosses/Meshy_AI_Infernal_Behemoth_biped/Meshy_AI_Infernal_Behemoth_biped/Meshy_AI_Infernal_Behemoth_biped_Character_output.glb"),
    scale: 1.32,
    yOffset: 0.56,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },
  act6_final_boss: { alias: "infernal_behemoth" },
  star_eater: { alias: "infernal_behemoth" },

  crimson_infernal_behemoth: {
    id: "crimson_infernal_behemoth",
    name: "Crimson Infernal Behemoth",
    role: "boss",
    priority: "128bit",
    url: crMeshyUrl("Bosses/Meshy_AI_Crimson_Infernal_Behe_biped_DIABL0/Meshy_AI_Crimson_Infernal_Behe_biped/Meshy_AI_Crimson_Infernal_Behe_biped_Meshy_AI_Meshy_Merged_Animations.glb"),
    sourceUrl: crMeshyUrl("Bosses/Meshy_AI_Crimson_Infernal_Behe_biped_DIABL0/Meshy_AI_Crimson_Infernal_Behe_biped/Meshy_AI_Crimson_Infernal_Behe_biped_Character_output.glb"),
    scale: 1.28,
    yOffset: 0.56,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },

  diabl0_archfiend: {
    id: "diabl0_archfiend",
    name: "Diabl0 Archfiend",
    role: "boss",
    priority: "128bit",
    url: crMeshyUrl("Bosses/Meshy_AI_Character_output_DIABL0.glb"),
    scale: 1.36,
    yOffset: 0.56,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },

  // ── ArcForge-generated classes (Meshy pipeline) ───────────────────────────
  ember_witch: {
    id: "ember_witch",
    name: "Ember Witch",
    role: "player",
    classSkin: "Ember Witch / Fire Sorceress",
    priority: "128bit",
    url: null, // populated at runtime from generated assets
    scale: 1.34,
    yOffset: 0.30,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },

  shadow_blade: {
    id: "shadow_blade",
    name: "Shadow Blade",
    role: "player",
    classSkin: "Shadow Blade / Dark Assassin",
    priority: "128bit",
    url: null,
    scale: 1.38,
    yOffset: 0.28,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },

  steel_crusader: {
    id: "steel_crusader",
    name: "Steel Crusader",
    role: "player",
    classSkin: "Steel Crusader / Holy Knight",
    priority: "128bit",
    url: null,
    scale: 1.42,
    yOffset: 0.26,
    desiredAnimations: CR_MESHY_ANIM_SET_20,
  },

  abyssal_harbinger: {
    id: "abyssal_harbinger",
    name: "Abyssal Harbinger",
    role: "boss-source",
    priority: "fbx-source",
    fbxUrl: crMeshyUrl("Bosses/Meshy_AI_Abyssal_Harbinger_0501035624_texture_fbx/Meshy_AI_Abyssal_Harbinger_0501035624_texture_fbx/Meshy_AI_Abyssal_Harbinger_0501035624_texture.fbx"),
    textureUrl: crMeshyUrl("Bosses/Meshy_AI_Abyssal_Harbinger_0501035624_texture_fbx/Meshy_AI_Abyssal_Harbinger_0501035624_texture_fbx/Meshy_AI_Abyssal_Harbinger_0501035624_texture.png"),
  },
};

export const CR_MESHY_STRUCTURES = {
  diabl0_tower: {
    id: "diabl0_tower",
    name: "Diabl0 Tower",
    role: "act6-final-arena",
    priority: "128bit",
    url: crMeshyUrl("Buildings/Meshy_AI_Infernal_Citadel_0505185450_texture.glb"),
    sourceFbxUrl: crMeshyUrl("Buildings/Meshy_AI_Infernal_Citadel_0501035305_texture_fbx/Meshy_AI_Infernal_Citadel_0501035305_texture_fbx/Meshy_AI_Infernal_Citadel_0501035305_texture.fbx"),
    scale: 2.4,
    yOffset: 0.66,
    lore: "Act VI Nexus Void terminus. The final descent into Hell is fought through this tower's boss floors.",
  },
  infernal_citadel: { alias: "diabl0_tower" },
};

// ── ArcForge generated asset discovery ────────────────────────────────────────
// Scans the local filesystem for Meshy pipeline-generated GLBs and populates
// actor URLs for classes that have been processed by meshy-cryptic-character-pipeline.
// This runs once at module load time and is safe — it only adds URLs if files exist.
const _GENERATED_BASE_REL = "/cryptic-assets/3d-assets/Meshy/Characters/ArcForgeGenerated";
const _GENERATED_CLASSES = ["ember_witch", "shadow_blade", "steel_crusader",
  "amazon", "assassin", "barbarian", "bone_herald", "crusader", "demon_hunter",
  "druid", "forest_sage", "iron_warden", "monk", "necromancer", "paladin",
  "rogue", "sorcerer", "spirit_born", "warlock", "warrior", "witch_doctor", "wizard"];

function _publicAssetUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  const s = String(pathOrUrl).replace(/\\/g, "/");
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/cryptic-assets/")) return s;
  if (s.startsWith("public/")) return `/${s.slice("public/".length)}`;
  return s.startsWith("/") ? s : `/${s}`;
}

/**
 * Resolve a generated ArcForge GLB URL for a class + action.
 * Returns the URL string or null if no generated asset exists.
 * Used by the pipeline manifest loader at game init time.
 */
export function crGeneratedActorUrl(cls, action = "rigged") {
  const generated = crGeneratedMeshyActor(cls);
  if (!generated) return null;
  const key = {
    rigged: "riggedUrl",
    refined: "refinedUrl",
    idle: "idleUrl",
    walk: "walkUrl",
    run: "runUrl",
    attack: "attackUrl",
    attack_heavy: "attackUrl",
    cast: "castUrl",
    hurt: "hurtUrl",
    death: "deathUrl",
  }[action] || `${action}Url`;
  return _publicAssetUrl(generated[key]);
}

/**
 * Apply generated asset URLs from a run manifest to the actor table.
 * Called by CrypticRealmGame after loading the manifest JSON.
 * @param {object} manifest - The run manifest from meshy-cryptic-character-runs/<runId>.json
 */
export function applyGeneratedManifest(manifest) {
  if (!manifest || !manifest.classes) return;
  for (const clsData of manifest.classes) {
    if (clsData.status !== "SUCCEEDED") continue;
    const actor = CR_MESHY_ACTORS[clsData.class];
    if (!actor) continue;

    // Set rigged model as the base URL
    actor.url = _publicAssetUrl(clsData.files?.animations?.idle?.path)
      || _publicAssetUrl(clsData.files?.rigged?.path)
      || _publicAssetUrl(clsData.files?.refined?.path)
      || actor.url;
    actor.sourceUrl = _publicAssetUrl(clsData.files?.rigged?.path)
      || _publicAssetUrl(clsData.files?.refined?.path)
      || actor.sourceUrl;
    // Set per-action animation URLs
    if (clsData.files?.animations) {
      for (const [action, fileInfo] of Object.entries(clsData.files.animations)) {
        const url = _publicAssetUrl(fileInfo.path);
        if (action === "walk") actor.walkUrl = url;
        else if (action === "run") actor.runUrl = url;
        else if (action === "attack") actor.attackUrl = url;
        else if (action === "cast") actor.castUrl = url;
        else if (action === "hurt") actor.hurtUrl = url;
        else if (action === "death") actor.deathUrl = url;
        else if (action === "idle") actor.idleUrl = url;
      }
    }
    actor.generatedRunId = clsData.runId;
  }
}

function _applyGeneratedActors() {
  for (const [id, generated] of Object.entries(CR_GENERATED_MESHY_ACTORS || {})) {
    const actor = CR_MESHY_ACTORS[id];
    if (!actor) continue;
    actor.url = _publicAssetUrl(generated.idleUrl || generated.riggedUrl || generated.refinedUrl) || actor.url;
    actor.sourceUrl = _publicAssetUrl(generated.riggedUrl || generated.refinedUrl) || actor.sourceUrl;
    actor.idleUrl = _publicAssetUrl(generated.idleUrl) || actor.idleUrl;
    actor.walkUrl = _publicAssetUrl(generated.walkUrl) || actor.walkUrl;
    actor.runUrl = _publicAssetUrl(generated.runUrl) || actor.runUrl;
    actor.attackUrl = _publicAssetUrl(generated.attackUrl) || actor.attackUrl;
    actor.castUrl = _publicAssetUrl(generated.castUrl) || actor.castUrl;
    actor.hurtUrl = _publicAssetUrl(generated.hurtUrl) || actor.hurtUrl;
    actor.deathUrl = _publicAssetUrl(generated.deathUrl) || actor.deathUrl;
    actor.generatedRunId = generated.runId || actor.generatedRunId;
  }
}

_applyGeneratedActors();

function _resolve(table, id) {
  const raw = table[id];
  if (!raw) return null;
  if (raw.alias) return _resolve(table, raw.alias);
  return raw;
}

export function crMeshyActor(id) {
  return _resolve(CR_MESHY_ACTORS, id);
}

export function crMeshyStructure(id) {
  return _resolve(CR_MESHY_STRUCTURES, id);
}

export function crMeshyActorUrl(id, animState = "idle") {
  const actor = crMeshyActor(id);
  if (!actor) return null;
  // Per-action URL resolution (supports generated + legacy URLs)
  if (animState === "walk" && actor.walkUrl) return actor.walkUrl;
  if (animState === "run" && (actor.runUrl || actor.walkUrl)) return actor.runUrl || actor.walkUrl;
  if ((animState === "attack" || animState === "attack_heavy" || animState === "whirlwind") && actor.attackUrl) return actor.attackUrl;
  if (animState === "cast" && (actor.castUrl || actor.attackUrl)) return actor.castUrl || actor.attackUrl;
  if (animState === "hurt" && (actor.hurtUrl || actor.idleUrl)) return actor.hurtUrl || actor.idleUrl;
  if (animState === "death" && actor.deathUrl) return actor.deathUrl;
  if (animState === "idle" && actor.idleUrl) return actor.idleUrl;
  return actor.url || actor.sourceUrl || actor.fbxUrl || null;
}

export function crMeshyPreloadActorIds() {
  return Object.values(CR_MESHY_ACTORS)
    .filter(a => a && !a.alias && (a.url || a.sourceUrl || a.walkUrl || a.runUrl))
    .map(a => a.id);
}
