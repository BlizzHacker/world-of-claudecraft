// crypticAssets.js — Cryptic Realm asset URLs & sprite atlas loaders
// Assets are deployed to public/cryptic-assets/ by update-app.
// Folder structure:
//   /cryptic-assets/Logo/Cryptic Realm Logo.png
//   /cryptic-assets/Character Templates/<CLASS>/<TIER>/assets/<frame>.png
// Template sheets are also used as class-select portraits. The actual gameplay
// frames still load from assets/, never from the labeled template sheet.

export const CR_ASSET_BASE = "/classic/cryptic-assets";
export const CR_ASSET_VERSION = "arcforge-pipeline-20260519-2";

// Public logo URL. The deployed asset is lower-case; keep this path stable
// across Windows dev, Linux deploy, and browser cache manifests.
export const CR_LOGO_URL = "/classic/crypticrealm-logo.png";

// Map game class id → template folder name
export const CR_CLASS_FOLDERS = {
  amazon: "amazon",
  assassin: "assassin",
  barbarian: "barbarian",
  bone_herald: "bone-herald",
  crusader: "crusader",
  demon_hunter: "demon-hunter",
  druid: "druid",
  ember_witch: "ember-witch",
  forest_sage: "forest-sage",
  iron_warden: "iron-warden",
  monk: "monk",
  necromancer: "necromancer",
  paladin: "paladin",
  rogue: "rogue",
  shadow_blade: "shadow-blade",
  sorcerer: "sorcerer",
  spirit_born: "spirit-born",
  steel_crusader: "steel-crusader",
  void_archer: "void-archer",
  warlock: "warlock",
  warrior: "warrior",
  witch_doctor: "witch-doctor",
  wizard: "wizard",
  d2_amazon: "amazon",
  d2_assassin: "assassin",
  d2_barbarian: "barbarian",
  d2_druid: "druid",
  d2_necromancer: "necromancer",
  d2_paladin: "paladin",
  d2_sorceress: "sorcerer",
  d1_rogue: "rogue",
  d1_sorcerer: "sorcerer",
  d1_warrior: "warrior",
  hf_barbarian: "barbarian",
  hf_bard: "rogue",
  hf_monk: "monk",
};

export const CR_CLASS_PREFIXES = {
  d2_amazon: "Amazon",
  d2_assassin: "Assassin",
  d2_barbarian: "Barbarian",
  d2_druid: "Druid",
  d2_necromancer: "Necromancer",
  d2_paladin: "Paladin",
  d2_sorceress: "Sorcerer",
  d1_rogue: "Rogue",
  d1_sorcerer: "Sorcerer",
  d1_warrior: "Warrior",
  hf_barbarian: "Barbarian",
  hf_bard: "Rogue",
  hf_monk: "Monk",
};

// gQuality (low/medium/high/ultra) → template tier folder
export const CR_QUALITY_TIERS = {
  low:    "16bit",
  medium: "32bit",
  high:   "64bit",
  ultra:  "128bit",
};

function _encPath(s) { return s.split("/").map(encodeURIComponent).join("/"); }

function _classFolderVariants(classId) {
  const folder = CR_CLASS_FOLDERS[classId];
  if (!folder) return [];
  return [...new Set([
    folder,
    folder.toUpperCase(),
    folder.toLowerCase(),
  ])];
}

function _classTemplateUrls(classId) {
  return _classFolderVariants(classId).map((folder) =>
    `${CR_ASSET_BASE}/${_encPath(`char-templates/${folder}/16bit/Template.png`)}?v=${CR_ASSET_VERSION}`
  );
}

function _classFrameUrls(classId, quality, frameFilename) {
  const tier = CR_QUALITY_TIERS[quality] || "16bit";
  return _classFolderVariants(classId).map((folder) =>
    `${CR_ASSET_BASE}/${_encPath(`char-templates/${folder}/${tier}/assets/${frameFilename}.png`)}?v=${CR_ASSET_VERSION}`
  );
}

export function crFrameFallbackUrls(classId, quality, state = "idle", dir = "front") {
  const filename = crStateDirFilename(classId, state, dir);
  const tiers = [quality, "ultra", "high", "medium", "low"].filter((t, i, a) => t && a.indexOf(t) === i);
  return tiers.flatMap((tier) => _classFrameUrls(classId, tier, filename));
}

export function crTemplateUrl(classId, quality = "low") {
  const urls = _classTemplateUrls(classId);
  // Force 16bit here: the black-background source sheets are the best visual
  // selectors and exist consistently before higher-tier sheet generation.
  return urls[0] || null;
}

export function crTemplateFallbackUrls(classId) {
  return _classTemplateUrls(classId);
}

// Naming convention for sliced frame files (when user populates assets/).
// Files are named: <ClassPrefix>_<State>_<Dir>.png — e.g. Bone_Herald_Idle_Front.png
// Plus per-class skill icons: <ClassPrefix>_<SkillName>.png — e.g. Bone_Herald_Bone_Spear.png
export const CR_FRAME_STATES = ["idle", "walk", "run", "attack", "hurt", "death"];
export const CR_FRAME_DIRS   = ["front", "right", "back", "left"];

// Skill icon filenames per class (relative to assets/) — extension implicit
export const CR_SKILL_ICONS = {
  bone_herald: ["Bone_Spear", "Raise_Skeleton", "Corpse_Explosion"],
  ember_witch: ["Fireball", "Frost_Nova", "Chain_Lightning"],
  iron_warden: ["Whirlwind", "Battle_Cry", "Leap_Attack"],
  shadow_blade: ["Shadow_Strike", "Smoke_Bomb", "Death_Trap"],
  forest_sage: ["Vine_Snare", "Bear_Form", "Storm_Call"],
  steel_crusader: ["Holy_Strike", "Divine_Shield", "Vengeance"],
  void_archer: ["Multi_Shot", "Rain_Of_Arrows", "Shadow_Step"],
};

// "bone_herald" → "Bone_Herald"
function _classPrefix(classId) {
  if (CR_CLASS_PREFIXES[classId]) return CR_CLASS_PREFIXES[classId];
  return classId.split("_").map(s => s ? s[0].toUpperCase() + s.slice(1) : s).join("_");
}
function _cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

// Build the URL for a single sliced sprite file
export function crFrameUrl(classId, quality, frameFilename) {
  const urls = _classFrameUrls(classId, quality, frameFilename);
  return urls[0] || null;
}

// Compose the canonical state+dir filename for a class
export function crStateDirFilename(classId, state, dir) {
  return `${_classPrefix(classId)}_${_cap(state)}_${_cap(dir)}`;
}

// Compose a skill icon filename
export function crSkillIconFilename(classId, skillName) {
  return `${_classPrefix(classId)}_${skillName}`;
}

const _portraitCache = {};
const _frameCache    = {};
let   _atlasEnabled  = false;
let   _atlasProbed   = {};
const _atlasClassEnabled = {}; // per-class enable flags { "bone_herald_low": true, ... }

// Master toggle (legacy) and per-class enable
export function enableCrSpriteAtlas(enabled = true) { _atlasEnabled = !!enabled; }
export function isCrSpriteAtlasEnabled() { return _atlasEnabled; }
export function isCrSpriteAtlasEnabledFor(classId, quality) {
  return _atlasEnabled || !!_atlasClassEnabled[`${classId}_${quality}`];
}

// Runtime must never load internal helper sheets.
export function loadCrPortrait(classId, quality = "ultra") {
  return null;
}

// Probe whether the sliced-asset folder exists for a class+tier.
// Auto-enables loading for that specific class+quality when files are detected.
export async function probeCrSpriteAtlas(classId, quality = "ultra") {
  const probeKey = `${classId}_${quality}`;
  if (_atlasProbed[probeKey] !== undefined) return _atlasProbed[probeKey];
  const folder = CR_CLASS_FOLDERS[classId];
  if (!folder) { _atlasProbed[probeKey] = false; return false; }
  if (quality === "low") {
    _atlasProbed[probeKey] = true;
    _atlasClassEnabled[probeKey] = true;
    return true;
  }
  const probeFile = crStateDirFilename(classId, "idle", "front");
  const probe = crFrameUrl(classId, quality, probeFile);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      _atlasProbed[probeKey] = true;
      _atlasClassEnabled[probeKey] = true;
      resolve(true);
    };
    img.onerror = () => {
      _atlasProbed[probeKey] = false;
      resolve(false);
    };
    img.src = probe;
  });
}

// Load (and cache) a single sliced frame by raw filename (no .png).
// Returns the Image (may not be loaded yet) or null if class/folder unknown.
// Atlas-enable is checked by the caller (getCrFrame / getCrSkillIcon).
export function loadCrFrame(classId, quality, frameFilename) {
  if (!CR_CLASS_FOLDERS[classId]) return null;
  const cache = _frameCache[classId] = _frameCache[classId] || {};
  const tcache = cache[quality] = cache[quality] || {};
  if (frameFilename in tcache) return tcache[frameFilename];
  const img = new Image();
  const urls = _classFrameUrls(classId, quality, frameFilename);
  if (!urls.length) return null;
  let idx = 0;
  img.onerror = () => {
    idx += 1;
    if (idx < urls.length) {
      img.src = urls[idx];
      return;
    }
    tcache[frameFilename] = null;
  };
  img.src = urls[idx];
  tcache[frameFilename] = img;
  return img;
}

// High-level: pick the right frame for an animation state + facing direction.
// Returns an HTMLImageElement (loaded) or null when no atlas frame is ready.
// Will fall through to lower quality tiers if the requested tier isn't sliced yet.
export function getCrFrame(classId, quality, state, dir, frameIdx = 0) {
  if (!isCrSpriteAtlasEnabledFor(classId, quality)) {
    // Try other tiers — user may have only sliced 16bit so far
    const tiers = [quality, "ultra","high","medium","low"].filter((t, i, a) => t && a.indexOf(t) === i);
    let found = null;
    for (const t of tiers) {
      if (isCrSpriteAtlasEnabledFor(classId, t)) { found = t; break; }
    }
    if (!found) return null;
    quality = found;
  }
  const tiers = [quality, "ultra","high","medium","low"].filter((t, i, a) => t && a.indexOf(t) === i);
  for (const tier of tiers) {
    if (!isCrSpriteAtlasEnabledFor(classId, tier)) continue;
    const filename = crStateDirFilename(classId, state, dir);
    const img = loadCrFrame(classId, tier, filename);
    if (img && img.complete && img.naturalWidth > 0) return img;
    // Idle is the universal fallback (death/hurt may not be sliced yet for a class)
    if (state !== "idle") {
      const fallback = loadCrFrame(classId, tier, crStateDirFilename(classId, "idle", dir));
      if (fallback && fallback.complete && fallback.naturalWidth > 0) return fallback;
    }
  }
  return null;
}

// Pre-warm the cache: load all 24 state×dir frames + skill icons for a class+quality.
// Call this when the user picks a class — by the time they enter the game, every
// frame is in the browser cache so there's no first-render hitch.
export async function preloadCrAtlas(classId, quality = "low") {
  const ok = await probeCrSpriteAtlas(classId, quality);
  if (!ok) {
    if (quality !== "low") return preloadCrAtlas(classId, "low");
    return false;
  }
  for (const state of CR_FRAME_STATES) {
    for (const dir of CR_FRAME_DIRS) {
      loadCrFrame(classId, quality, crStateDirFilename(classId, state, dir));
    }
  }
  for (const skillName of CR_SKILL_ICONS[classId] || []) {
    loadCrFrame(classId, quality, crSkillIconFilename(classId, skillName));
  }
  return true;
}

// Probe + preload across all 4 quality tiers. Whichever tiers exist get cached.
export async function preloadCrAtlasAllTiers(classId) {
  const results = await Promise.all(
    ["low","medium","high","ultra"].map(q => preloadCrAtlas(classId, q))
  );
  return results.some(Boolean);
}

// Skill icon loader (e.g. "Bone_Spear" → Bone_Herald_Bone_Spear.png)
export function getCrSkillIcon(classId, quality, skillName) {
  if (!skillName) return null;
  if (!isCrSpriteAtlasEnabledFor(classId, quality)) {
    const tiers = ["ultra","high","medium","low"];
    for (const t of tiers) {
      if (isCrSpriteAtlasEnabledFor(classId, t)) { quality = t; break; }
    }
  }
  const tiers = [quality, "ultra","high","medium","low"].filter((t, i, a) => t && a.indexOf(t) === i);
  const filename = crSkillIconFilename(classId, skillName);
  for (const tier of tiers) {
    if (!isCrSpriteAtlasEnabledFor(classId, tier)) continue;
    const img = loadCrFrame(classId, tier, filename);
    if (img && img.complete && img.naturalWidth > 0) return img;
  }
  return null;
}

// Convert a (dx, dy) movement vector to a 4-direction facing string.
export function crVecToDir(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "front" : "back";
}

// ── Item Assets (post-processed from ArcForge pipeline) ──────────────────
const CR_ITEM_BASE = `${CR_ASSET_BASE}/items`;

export const CR_ITEM_INDEX = {
  iron_helm: {
    image: `${CR_ITEM_BASE}/cryptic-realm/armor/iron_helm.png`,
    processed: `${CR_ITEM_BASE}/cryptic-realm/armor/processed/iron_helm_processed.png`,
    icon: `${CR_ITEM_BASE}/cryptic-realm/armor/processed/icons/iron_helm_icon.png`,
    normal: `${CR_ITEM_BASE}/cryptic-realm/armor/processed/normals/iron_helm_normal.png`,
    silhouette: `${CR_ITEM_BASE}/cryptic-realm/armor/processed/silhouettes/iron_helm_silhouette.png`,
    slot: "armor",
    label: "Iron Helm",
  },
  health_potion: {
    image: `${CR_ITEM_BASE}/cryptic-realm/consumables/health_potion.png`,
    processed: `${CR_ITEM_BASE}/cryptic-realm/consumables/processed/health_potion_processed.png`,
    icon: `${CR_ITEM_BASE}/cryptic-realm/consumables/processed/icons/health_potion_icon.png`,
    normal: `${CR_ITEM_BASE}/cryptic-realm/consumables/processed/normals/health_potion_normal.png`,
    silhouette: `${CR_ITEM_BASE}/cryptic-realm/consumables/processed/silhouettes/health_potion_silhouette.png`,
    slot: "consumable",
    label: "Health Potion",
  },
  iron_sword: {
    image: `${CR_ITEM_BASE}/cryptic-realm/weapons/iron_sword.png`,
    processed: `${CR_ITEM_BASE}/cryptic-realm/weapons/processed/iron_sword_processed.png`,
    icon: `${CR_ITEM_BASE}/cryptic-realm/weapons/processed/icons/iron_sword_icon.png`,
    normal: `${CR_ITEM_BASE}/cryptic-realm/weapons/processed/normals/iron_sword_normal.png`,
    silhouette: `${CR_ITEM_BASE}/cryptic-realm/weapons/processed/silhouettes/iron_sword_silhouette.png`,
    slot: "weapon",
    label: "Iron Sword",
  },
  sling: {
    image: `${CR_ITEM_BASE}/cryptic-realm/weapons/sling.png`,
    processed: `${CR_ITEM_BASE}/cryptic-realm/weapons/processed/sling_processed.png`,
    icon: `${CR_ITEM_BASE}/cryptic-realm/weapons/processed/icons/sling_icon.png`,
    normal: `${CR_ITEM_BASE}/cryptic-realm/weapons/processed/normals/sling_normal.png`,
    silhouette: `${CR_ITEM_BASE}/cryptic-realm/weapons/processed/silhouettes/sling_silhouette.png`,
    slot: "weapon",
    label: "Sling",
  },
  dragon_scale_mail: {
    image: `${CR_ITEM_BASE}/diablo-wl/armor/dragon_scale_mail.png`,
    processed: `${CR_ITEM_BASE}/diablo-wl/armor/processed/dragon_scale_mail_processed.png`,
    icon: `${CR_ITEM_BASE}/diablo-wl/armor/processed/icons/dragon_scale_mail_icon.png`,
    normal: `${CR_ITEM_BASE}/diablo-wl/armor/processed/normals/dragon_scale_mail_normal.png`,
    silhouette: `${CR_ITEM_BASE}/diablo-wl/armor/processed/silhouettes/dragon_scale_mail_silhouette.png`,
    slot: "armor",
    label: "Dragon Scale Mail",
  },
  skull_gem: {
    image: `${CR_ITEM_BASE}/diablo-wl/gems/skull_gem.png`,
    processed: `${CR_ITEM_BASE}/diablo-wl/gems/processed/skull_gem_processed.png`,
    icon: `${CR_ITEM_BASE}/diablo-wl/gems/processed/icons/skull_gem_icon.png`,
    normal: `${CR_ITEM_BASE}/diablo-wl/gems/processed/normals/skull_gem_normal.png`,
    silhouette: `${CR_ITEM_BASE}/diablo-wl/gems/processed/silhouettes/skull_gem_silhouette.png`,
    slot: "gem",
    label: "Skull Gem",
  },
};

export function getCrItemIcon(itemId) {
  return CR_ITEM_INDEX[itemId]?.icon ?? null;
}

// ── 3D Animated Model Assets (ArcForge 3D pipeline) ─────────────────────
const CR_3D_ANIM_BASE = `${CR_ASSET_BASE}/3d-animated`;

export const CR_3D_ANIMATED = {
  cr_fallen_one_elite: {
    model: `${CR_3D_ANIM_BASE}/cryptic-realm/cryptic_realm_Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01/model.glb`,
    diffuse: `${CR_3D_ANIM_BASE}/cryptic-realm/cryptic_realm_Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01/textures/cryptic_realm_Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01_diffuse.png`,
    emissive: `${CR_3D_ANIM_BASE}/cryptic-realm/cryptic_realm_Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01/textures/cryptic_realm_Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01_emissive.png`,
    normal: `${CR_3D_ANIM_BASE}/cryptic-realm/cryptic_realm_Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01/textures/cryptic_realm_Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01_normal.png`,
    label: "Fallen One Elite",
  },
  cr_fallen_chieftain: {
    model: `${CR_3D_ANIM_BASE}/cryptic-realm/cryptic_realm_Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01/model.glb`,
    diffuse: `${CR_3D_ANIM_BASE}/cryptic-realm/cryptic_realm_Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01/textures/cryptic_realm_Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01_diffuse.png`,
    emissive: `${CR_3D_ANIM_BASE}/cryptic-realm/cryptic_realm_Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01/textures/cryptic_realm_Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01_emissive.png`,
    normal: `${CR_3D_ANIM_BASE}/cryptic-realm/cryptic_realm_Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01/textures/cryptic_realm_Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01_normal.png`,
    label: "Fallen Chieftain",
  },
  d1wl_fallen_one_elite: {
    model: `${CR_3D_ANIM_BASE}/diablo-wl/Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01/model.glb`,
    diffuse: `${CR_3D_ANIM_BASE}/diablo-wl/Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01/textures/Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01_diffuse.png`,
    emissive: `${CR_3D_ANIM_BASE}/diablo-wl/Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01/textures/Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01_emissive.png`,
    normal: `${CR_3D_ANIM_BASE}/diablo-wl/Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01/textures/Diablo1_ARPG_001_re_imagined_diablo_1_fallen_one_elite_01_normal.png`,
    label: "Fallen One Elite (D1 WL)",
  },
  d1wl_fallen_chieftain: {
    model: `${CR_3D_ANIM_BASE}/diablo-wl/Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01/model.glb`,
    diffuse: `${CR_3D_ANIM_BASE}/diablo-wl/Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01/textures/Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01_diffuse.png`,
    emissive: `${CR_3D_ANIM_BASE}/diablo-wl/Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01/textures/Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01_emissive.png`,
    normal: `${CR_3D_ANIM_BASE}/diablo-wl/Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01/textures/Diablo1_ARPG_002_re_imagined_diablo_1_fallen_one_boss_chieftain_01_normal.png`,
    label: "Fallen Chieftain (D1 WL)",
  },
};
