// Verbose GLBSpriter diagnostics: set `window._mwGlbDebug = true` in DevTools
// to re-enable. Off by default — the per-frame logging spammed the console.
const _mwGlbDebug = () => (typeof window !== "undefined" && window._mwGlbDebug === true);
const _glog  = (...a) => { if (_mwGlbDebug()) console.log(...a); };
const _gwarn = (...a) => { if (_mwGlbDebug()) console.warn(...a); };
if (typeof window !== "undefined") window._mwGlbDebug = window._mwGlbDebug ?? false;
// crypticGlbSpriter.js v2 — animated KayKit GLB sprite renderer
// Renders GLB characters/props to 2D canvas strips (N frames per animation
// state) for fast blitting in the isometric renderer.
//
// Design:
//   - One shared off-screen WebGLRenderer (no per-frame creation).
//   - Each (url, animName, direction) triple renders N frames via THREE.AnimationMixer
//     and stores them as HTMLCanvasElement[].
//   - getGlbSpriteFrame() returns the time-indexed current frame → smooth loops.
//   - All rendering is sequential per URL to avoid WebGL context fights.
//   - getCachedGlbSprite / preloadGlbSpriteFireAndForget kept for backward compat.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

// ── Tier-differentiated render config ────────────────────────────────────────
// 64-bit  (KayKit low-poly, quality="high") : clean toon/flat lighting, 192×256
// 128-bit (Meshy PBR,       quality="ultra"): dramatic key+rim+fill, 256×352
// iso64   (Architecture-only): KayKit walls / floors / props baked at a true
//   isometric camera angle (~30° elevation, model un-rotated so the decorated
//   front face points at camera). The wider/taller canvas captures the wall
//   face + the top edge of bricks the way KayKit's promo screenshots show.
const TIER_CFG = {
  "64bit": {
    w: 192, h: 256,
    ambient:   0.92,  ambientColor: 0xfff5e8,
    keyInt:    1.05,  keyColor:     0xffeedd,  keyPos: [2.5, 5, 4],
    rimInt:    0.22,  rimColor:     0xaabbee,  rimPos: [-3, 2, -2],
    fillInt:   0.12,  fillColor:    0xffdd90,  fillPos: [0, -1, 3],
    camElevation: 0.36, camDist: 5.4,    // ~20° above horizon for character framing
  },
  "128bit": {
    w: 256, h: 352,
    ambient:   0.42,  ambientColor: 0xfff0e0,
    keyInt:    1.65,  keyColor:     0xffe8cc,  keyPos: [3, 6, 4.5],
    rimInt:    0.55,  rimColor:     0x5577ff,  rimPos: [-3.5, 2.5, -2.5],
    fillInt:   0.28,  fillColor:    0xffcc80,  fillPos: [0.5, -1.5, 3.5],
    camElevation: 0.36, camDist: 5.4,
  },
  "iso64": {
    // Same lighting as 64bit but a taller canvas + higher camera so the wall
    // face AND its top brick edge are both visible (classic Diablo II iso look).
    w: 224, h: 288,
    ambient:   0.94,  ambientColor: 0xfff5e8,
    keyInt:    1.10,  keyColor:     0xffeedd,  keyPos: [2.5, 6, 4],
    rimInt:    0.22,  rimColor:     0xaabbee,  rimPos: [-3, 2, -2],
    fillInt:   0.14,  fillColor:    0xffdd90,  fillPos: [0, -1, 3],
    // tan(30°) ≈ 0.577 — true iso elevation
    camElevation: 0.62, camDist: 5.6,
  },
};
const DEFAULT_TIER = "64bit";

// Legacy single-size constants (kept for backward-compat external reads)
const SPRITE_W = 192;
const SPRITE_H = 256;
const TARGET_HEIGHT = 1.24; // units: GLB/FBX is scaled so its height == this
const VIEW_HALF = 1.05;
const VIEW_CENTER = TARGET_HEIGHT * 0.54;
const FEET_BASELINE = (VIEW_CENTER + VIEW_HALF) / (VIEW_HALF * 2);

// Per-animation: how many frames to bake and at what playback fps
const ANIM_CFG = {
  idle:   { frames: 6,  fps: 5  },
  walk:   { frames: 8,  fps: 10 },
  run:    { frames: 8,  fps: 12 },
  attack: { frames: 6,  fps: 12 },
  attack_heavy: { frames: 7, fps: 10 },
  cast:   { frames: 6,  fps: 8  },
  block:  { frames: 4,  fps: 8  },
  dodge:  { frames: 5,  fps: 12 },
  death:  { frames: 4,  fps: 5  },
  hurt:   { frames: 3,  fps: 8  },
  taunt:  { frames: 6,  fps: 6  },
  battle_cry: { frames: 6, fps: 7 },
  leap:   { frames: 7,  fps: 10 },
  whirlwind: { frames: 8, fps: 13 },
  execute:{ frames: 7,  fps: 10 },
  pickup: { frames: 4,  fps: 8  },
  interact:{ frames: 4, fps: 8  },
  stunned:{ frames: 4,  fps: 6  },
  victory:{ frames: 6,  fps: 6  },
  spawn:  { frames: 6,  fps: 7  },
};

// KayKit + Meshy clip name lookup — tried in order (case-insensitive).
// Meshy merged animation GLBs often use Mixamo-style names or their own labels.
// Meshy's 20-animation preset pack maps roughly to ANIM_STATE_ORDER so the
// index-based positional fallback in _findClip is a last resort for any naming.
const CLIP_ALIASES = {
  idle:   ["Idle", "idle", "Stand", "stand", "Idle_2", "Idle_A", "idle_A", "Idle_1",
           "Breathing Idle", "Idle_Short", "Idle_Long", "Standing Idle", "Standing_Idle",
           "Idle_Breathing", "Idle 2", "0_Idle", "00_Idle", "idle_animation",
           "Idle (2)", "Idle(2)", "mixamo.com", "CharacterArmature|Idle"],
  walk:   ["Walk", "walk", "Walking", "walking", "Walk_A", "Walk_Forward",
           "Animation_Walking", "Walking_withSkin", "walking_glb_url",
           "Walk_Inplace", "WalkInplace", "Walking_Inplace", "Walk Forward",
           "Slow Walk", "slow_walk", "Take 001", "ArmatureAction",
           "CharacterArmature|Walk", "walk_forward", "HumanArmature|Walk",
           "mixamo.com|Layer0.001"],
  run:    ["Run", "run", "Running", "Sprint", "sprint",
           "Animation_Running", "Running_withSkin", "running_glb_url",
           "Run_Forward", "Run Forward", "Running_Inplace", "RunInplace",
           "Walk", "walk", "Walking", "Take 001", "ArmatureAction",
           "CharacterArmature|Run", "run_forward", "HumanArmature|Run"],
  attack: ["Attack", "attack", "Attack_A", "attack_a", "Slash", "slash",
           "Melee", "melee", "1H_Melee_Attack_Slice_1", "Right Uppercut from Guard",
           "Animation_Right_Uppercut_from_Guard", "Roundhouse Kick", "Animation_Roundhouse_Kick",
           "Double_Combo_Attack", "Triple_Combo_Attack", "Axe_Spin_Attack",
           "Sword_Slash", "Sword_Attack", "Punch", "punch", "Strike", "strike",
           "Hit", "hit", "Attack1", "attack1", "Take 001", "ArmatureAction",
           "CharacterArmature|Attack", "attack_1", "attack_melee",
           "1H_Melee_Attack_Chop", "Jab", "Cross", "Hook",
           "mixamo.com|Layer0.003"],
  cast:   ["Cast", "cast", "Magic", "magic", "Spell", "spell", "Casting", "casting",
           "Spell_Cast", "Magic_Cast", "Attack", "attack", "Roundhouse Kick",
           "CharacterArmature|Cast"],
  death:  ["Death", "death", "Die", "die", "Dead", "dead", "Dying", "dying",
           "Death_A", "Death_Back", "Death_Forward",
           "CharacterArmature|Death", "Falling Back Death", "Falling Forward Death"],
  hurt:   ["Hurt", "hurt", "HitReact", "Hit_React", "GetHit", "get_hit",
           "Damage", "damage", "Stagger", "stagger", "Idle", "idle",
           "CharacterArmature|HitReact", "Reaction", "Hit"],
  attack_heavy: ["Heavy Attack", "Attack_Heavy", "Power Attack", "Heavy_Attack",
           "Axe_Spin_Attack", "Double_Combo_Attack", "Triple_Combo_Attack",
           "Right Uppercut from Guard", "Animation_Right_Uppercut_from_Guard",
           "Attack", "attack", "2H_Melee_Attack_Slice", "Great Sword"],
  block:  ["Block", "block", "Guard", "guard", "Shield Block", "Shield_Block", "Idle", "idle",
           "CharacterArmature|Block"],
  dodge:  ["Dodge", "dodge", "Evade", "evade", "Roll", "roll",
           "Roundhouse Kick", "Animation_Roundhouse_Kick", "Run", "run",
           "Side Step Left", "Side_Step"],
  taunt:  ["Taunt", "taunt", "Roar", "roar", "Shout", "shout", "Battle Cry", "Idle", "idle",
           "CharacterArmature|Taunt"],
  battle_cry: ["Battle Cry", "battle_cry", "Roar", "roar", "Shout", "shout",
           "Sword_Shout", "Taunt", "Idle", "idle"],
  leap:   ["Leap", "leap", "Jump", "jump", "Basic_Jump", "Jump Attack", "Jumping",
           "Jump_Forward", "Run", "run", "Jump_Landing", "Running Jump"],
  whirlwind: ["Whirlwind", "whirlwind", "Spin Attack", "Spin_Attack",
           "Axe_Spin_Attack", "Roundhouse Kick", "Animation_Roundhouse_Kick",
           "Attack", "attack"],
  execute: ["Execute", "execute", "Finisher", "finisher", "Heavy Attack", "Attack", "attack"],
  pickup:  ["Pickup", "pickup", "Pick Up", "PickUp", "Interact", "interact", "Idle", "idle",
           "Pick_Up", "Grab"],
  interact:["Interact", "interact", "Use", "use", "Pickup", "pickup", "Idle", "idle"],
  stunned: ["Stunned", "stunned", "Dizzy", "dizzy", "Hurt", "hurt", "Stagger", "Idle", "idle"],
  victory: ["Victory", "victory", "Celebrate", "celebrate", "Taunt", "taunt", "Idle", "idle",
           "CharacterArmature|Victory"],
  spawn:   ["Spawn", "spawn", "Summon", "summon", "Appear", "appear", "Idle", "idle"],
};

let _renderer = null;
let _loader   = null;
let _fbxLoader = null;
let _rendererRecoveryUntil = 0;

const _gltfCache  = new Map(); // url → Promise<gltf>
const _stripCache = new Map(); // `${url}|${anim}|${dir}` → Canvas[]
const _pending    = new Map(); // `${url}|${anim}|${dir}` → Promise<Canvas[]>
let _renderQueue  = Promise.resolve();
// Max number of strips that may be ACTIVELY PENDING (queued but not yet
// rendered) at one time. We deliberately do NOT count _stripCache.size here;
// those are already finished and should not block future scene props. 128-bit
// Meshy strips are expensive, so background jobs get a much smaller cap while
// critical loading-gate jobs still use preloadGlbStrips directly.
const MAX_BACKGROUND_STRIP_JOBS = 96;
const MAX_128BIT_BACKGROUND_STRIP_JOBS = 24;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _ensureRenderer(w = SPRITE_W, h = SPRITE_H) {
  if (typeof document === "undefined") return null;
  if (_renderer) {
    // Resize if this strip needs different dimensions (sequential queue ensures safety)
    if (_renderer._crW !== w || _renderer._crH !== h) {
      _renderer.setSize(w, h, false);
      _renderer._crW = w;
      _renderer._crH = h;
    }
    return _renderer;
  }
  try {
    _renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });
    _renderer.setSize(w, h, false);
    _renderer.setClearColor(0x000000, 0);
    _renderer.autoClear = true;
    _renderer.outputColorSpace = THREE.SRGBColorSpace;
    _renderer.shadowMap.enabled = false;
    _renderer.setPixelRatio(1);
    _renderer._crW = w;
    _renderer._crH = h;
    _renderer.domElement.addEventListener("webglcontextlost", evt => {
      evt.preventDefault?.();
      const lostRenderer = _renderer;
      _stripCache.clear();
      _pending.clear();
      _renderQueue = Promise.resolve();
      _rendererRecoveryUntil = Date.now() + 100;
      try { lostRenderer?.dispose?.(); } catch (_e) {}
      _renderer = null;
    }, false);
  } catch (_e) {
    _renderer = null;
  }
  return _renderer;
}

function _ensureLoader() {
  if (!_loader) _loader = new GLTFLoader();
  return _loader;
}

function _ensureFbxLoader() {
  if (!_fbxLoader) _fbxLoader = new FBXLoader();
  return _fbxLoader;
}

// ── QUIC / fetch-failure tracking ──────────────────────────────────────────────
// When a GLB fetch fails with net::ERR_QUIC_PROTOCOL_ERROR (or generic fetch
// failure), we retry once using fetch()+parse to bypass the QUIC transport.
// Permanently broken URLs are tracked so we don't loop forever.
const _failedUrls = new Map();   // URL -> retry-after timestamp
const _retryingUrls = new Set(); // URLs currently in a retry cycle
const GLB_MAX_RETRIES = 2;
const GLB_FAILURE_COOLDOWN_MS = 5 * 60 * 1000;
const _glbRetryCount = new Map(); // url -> attempt count

function _isMoveWeightAssetUrl(url) {
  try {
    const u = new URL(String(url), typeof window !== "undefined" ? window.location.href : "https://moveweight.com");
    return /(^|\.)moveweight\.com$/i.test(u.hostname) || u.origin === (typeof window !== "undefined" ? window.location.origin : "");
  } catch {
    return false;
  }
}

async function _fetchGlbArrayBuffer(url) {
  // Use fetch() with cache:"no-store" to force the browser off QUIC if possible.
  // Some browsers will fall back to HTTP/1.1 or TCP-based HTTP/2 on retry.
  let fetchUrl = url;
  if (_isMoveWeightAssetUrl(url)) {
    try {
      const u = new URL(String(url), typeof window !== "undefined" ? window.location.href : "https://moveweight.com");
      u.searchParams.set("_cr", String(Date.now()));
      fetchUrl = u.href;
    } catch {
      const cacheBust = (url.includes("?") ? "&" : "?") + "_cr=" + Date.now();
      fetchUrl = url + cacheBust;
    }
  }
  const resp = await fetch(fetchUrl, { cache: "no-store", credentials: "same-origin" });
  if (!resp.ok) throw new Error(`GLB fetch ${resp.status}`);
  return resp.arrayBuffer();
}

function _loadModel(url) {
  if (_gltfCache.has(url)) return _gltfCache.get(url);
  const p = new Promise((res, rej) => {
    const lower = String(url).toLowerCase();
    if (lower.endsWith(".fbx")) {
      _ensureFbxLoader().load(
        url,
        obj => res({ scene: obj, animations: obj.animations || [] }),
        undefined,
        rej
      );
      return;
    }
    _ensureLoader().load(url, res, undefined, rej);
  }).catch(err => {
    // On failure, evict the rejected promise from cache so a retry can try again.
    _gltfCache.delete(url);
    throw err;
  });
  _gltfCache.set(url, p);
  return p;
}

/**
 * Load a GLB/GLTF model with QUIC-error retry + fetch() fallback.
 * If the standard Three.js loader fails (typically ERR_QUIC_PROTOCOL_ERROR),
 * we retry using fetch() + GLTFLoader.parse() which often succeeds because
 * the browser negotiates a different HTTP transport for the retry request.
 */
async function _loadModelWithRetry(url) {
  // Cool down broken URLs so we do not loop forever, but allow recovery later.
  const retryAfter = _failedUrls.get(url) || 0;
  if (retryAfter > Date.now()) {
    return Promise.reject(new Error(`GLB retry cooling down: ${url.slice(-60)}`));
  }
  if (retryAfter) _failedUrls.delete(url);

  try {
    return await _loadModel(url);
  } catch (firstErr) {
    const attempts = (_glbRetryCount.get(url) || 0) + 1;
    _glbRetryCount.set(url, attempts);

    if (attempts > GLB_MAX_RETRIES || _retryingUrls.has(url)) {
      _failedUrls.set(url, Date.now() + GLB_FAILURE_COOLDOWN_MS);
      _retryingUrls.delete(url);
      console.warn("[crypticGlbSpriter] GLB exhausted retries:", url.slice(-60));
      throw firstErr;
    }

    _retryingUrls.add(url);
    // Small delay before retry to let QUIC session reset
    await new Promise(r => setTimeout(r, 800 * attempts));

    try {
      // Retry strategy: fetch() the bytes manually, then parse with GLTFLoader.
      // This often bypasses the QUIC transport error.
      const buffer = await _fetchGlbArrayBuffer(url);
      const gltf = await new Promise((res, rej) => {
        _ensureLoader().parse(buffer, "", res, rej);
      });
      _gltfCache.set(url, Promise.resolve(gltf));
      _retryingUrls.delete(url);
      return gltf;
    } catch (retryErr) {
      _retryingUrls.delete(url);
      // Try one more time with standard loader on a fresh URL
      if (attempts < GLB_MAX_RETRIES) {
        _gltfCache.delete(url);
        return _loadModelWithRetry(url);
      }
      _failedUrls.set(url, Date.now() + GLB_FAILURE_COOLDOWN_MS);
      console.warn("[crypticGlbSpriter] GLB retry failed:", url.slice(-60), retryErr?.message);
      throw retryErr;
    }
  }
}

// KayKit character bodies have no embedded animations — load external rig GLB for clips.
// Returns merged { scene, animations } where scene is the body, animations from the rig.
const _KAY_RIG_BASE = "/cryptic-assets/3d-assets/KayKit/Adventurers/KayKit_Adventurers_2.0_FREE/Animations/gltf/Rig_Medium";
const _KAY_ANIM_RIGS = {
  // Which rig GLB holds clips for each animation state
  idle:    `${_KAY_RIG_BASE}/Rig_Medium_General.glb`,
  death:   `${_KAY_RIG_BASE}/Rig_Medium_General.glb`,
  hurt:    `${_KAY_RIG_BASE}/Rig_Medium_General.glb`,
  victory: `${_KAY_RIG_BASE}/Rig_Medium_General.glb`,
  taunt:   `${_KAY_RIG_BASE}/Rig_Medium_General.glb`,
  cast:    `${_KAY_RIG_BASE}/Rig_Medium_General.glb`,
  walk:    `${_KAY_RIG_BASE}/Rig_Medium_MovementBasic.glb`,
  run:     `${_KAY_RIG_BASE}/Rig_Medium_MovementBasic.glb`,
  attack:  `${_KAY_RIG_BASE}/Rig_Medium_General.glb`,
};

async function _loadKayBodyWithAnim(bodyUrl, animName) {
  // Load body and rig in parallel
  const rigUrl = _KAY_ANIM_RIGS[animName] || _KAY_ANIM_RIGS.idle;
  const [bodyGltf, rigGltf] = await Promise.all([
    _loadModelWithRetry(bodyUrl),
    _loadModelWithRetry(rigUrl).catch(() => null),
  ]);
  // Merge: body scene + rig animations
  const animations = [
    ...(bodyGltf.animations || []),
    ...(rigGltf?.animations || []),
  ];
  return { scene: bodyGltf.scene, animations };
}

// Ordered list of game animation states — used for index-based fallback
// when a merged GLB uses numeric/positional clip naming.
const ANIM_STATE_ORDER = [
  "idle","walk","run","attack","attack_heavy","cast","block","dodge",
  "hurt","death","taunt","battle_cry","leap","whirlwind","execute",
  "pickup","interact","stunned","victory","spawn",
];

function _findClip(animations, animName, isMeshy = false) {
  if (!animations || !animations.length) return null;
  const aliases = CLIP_ALIASES[animName] || [animName];

  // 1. Exact match (case-insensitive)
  for (const alias of aliases) {
    const c = animations.find(a => a.name.toLowerCase() === alias.toLowerCase());
    if (c) {
      if (isMeshy) _glog(`[GLBSpriter] ${animName} → exact "${c.name}"`);
      return c;
    }
  }

  // 2. Fuzzy substring match
  const needles = aliases.map(a => String(a).toLowerCase()).filter(Boolean);
  const fuzzy = animations.find(a =>
    needles.some(n => a.name.toLowerCase().includes(n) || n.includes(a.name.toLowerCase()))
  );
  if (fuzzy) {
    if (isMeshy) _glog(`[GLBSpriter] ${animName} → fuzzy "${fuzzy.name}"`);
    return fuzzy;
  }

  // 3. Single-animation GLB: always use the one clip (walk/run/attack file selected for that state)
  if (animations.length === 1) {
    if (isMeshy) _glog(`[GLBSpriter] ${animName} → single clip "${animations[0].name}"`);
    return animations[0];
  }

  // 4. Multi-animation merged GLB with non-matching names.
  //    Strategy A: All clips are generically named (Take 001, Armature|Action, etc.)
  //    Strategy B: Meshy merged GLB with >3 clips where nothing matched — treat as
  //    positionally ordered (Meshy's 20-preset pack follows ANIM_STATE_ORDER).
  const allGeneric = animations.every(a => {
    const n = a.name.toLowerCase();
    return n.startsWith("take") || n.startsWith("armature") || n.startsWith("action") ||
           n.startsWith("mixamo") || n.startsWith("clip") || n.startsWith("meshy") ||
           n.startsWith("characterarmature") || n.startsWith("humanarmature") ||
           /^\d/.test(n) || n === "animation" || n === "scene";
  });
  // For Meshy merged GLBs (≥10 clips) also apply positional fallback even when
  // clip names appear descriptive but simply don't match any alias — the ordering
  // in Meshy's preset export is stable and matches ANIM_STATE_ORDER.
  const usePosIdx = allGeneric || (isMeshy && animations.length >= 10);
  if (usePosIdx && animations.length >= 3) {
    const stateIdx = ANIM_STATE_ORDER.indexOf(animName);
    const chosen = (stateIdx >= 0 && stateIdx < animations.length)
      ? animations[stateIdx]
      : animations[0];
    if (isMeshy) {
      _glog(`[GLBSpriter] ${animName} → positional[${stateIdx}] "${chosen.name}" (allGeneric=${allGeneric}, clips=${animations.length})`);
    }
    return chosen;
  }

  if (isMeshy) {
    _gwarn(`[GLBSpriter] ${animName} → NO MATCH. Available clips:`,
      animations.map(a => `"${a.name}"`).join(", "));
  }
  return null;
}

// 8-directional Y-rotation angles for the baking camera (orthographic, looking from +Z at origin).
//
// The model starts facing +Z (toward the camera).  Rotating by DIR_ANGLES[dir] around Y exposes
// whichever face the game camera should see for that movement direction.
//
// Derivation: after Y rotation θ, the model face visible from +Z is the face that was at
//   (-sin θ, 0, cos θ) in model space BEFORE rotation.
//
//   dir           movement          desired visible face   θ (= DIR_ANGLES)
//   front         toward camera     BACK                   +π    (-Z face)
//   front_right   toward+right      BACK-LEFT              +3π/4 (-Z-X face)
//   right         rightward         LEFT side              +π/2  (-X face)
//   back_right    away+right        FRONT-LEFT             +π/4  (+Z-X face)
//   back          away from camera  FRONT                   0    (+Z face)
//   back_left     away+left         FRONT-RIGHT            −π/4  (+Z+X face)
//   left          leftward          RIGHT side             −π/2  (+X face)
//   front_left    toward+left       BACK-RIGHT             −3π/4 (-Z+X face)
const DIR_ANGLES = {
  front:        Math.PI,          // toward-camera → see BACK
  front_right:  Math.PI * 0.75,   // toward+right → see BACK-LEFT
  right:        Math.PI * 0.5,    // rightward → see LEFT side
  back_right:   Math.PI * 0.25,   // away+right → see FRONT-LEFT
  back:         0,                // away from camera → see FRONT
  back_left:   -Math.PI * 0.25,   // away+left → see FRONT-RIGHT
  left:        -Math.PI * 0.5,    // leftward → see RIGHT side
  front_left:  -Math.PI * 0.75,   // toward+left → see BACK-RIGHT
};

function _normalize(root) {
  const box = new THREE.Box3().setFromObject(root);
  const sz  = new THREE.Vector3();
  box.getSize(sz);
  const scale = sz.y > 1e-4 ? TARGET_HEIGHT / sz.y : 1;
  root.scale.setScalar(scale);
  // Re-compute after scale
  box.setFromObject(root);
  root.position.x -= (box.min.x + box.max.x) / 2;
  root.position.z -= (box.min.z + box.max.z) / 2;
  root.position.y -= box.min.y; // feet at y=0
}

/** Copy the renderer's framebuffer to a fresh Canvas. */

function _crIsMeshyLikeUrl(url) {
  const s = String(url || "");
  return /Meshy|meshy-|TOWNCHARS|VOID%20ARCHER|VOID ARCHER|BOSSES%2FButcher|BOSSES\/Butcher|Merged_Animations|rigged_character|animation_glb|walking_glb|running_glb/i.test(s);
}

function _snap(scene, camera, opts = {}) {
  const td = TIER_CFG[opts.tier || DEFAULT_TIER] || TIER_CFG[DEFAULT_TIER];
  const snapW = td.w;
  const snapH = td.h;
  const relaxed = !!opts.relaxed;
  const renderer = _ensureRenderer(snapW, snapH);
  if (!renderer) return null;
  renderer.setClearColor(0x000000, 0);
  renderer.clear(true, true, true);
  renderer.render(scene, camera);
  const c = document.createElement("canvas");
  c.width = snapW;
  c.height = snapH;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, snapW, snapH);
  ctx.drawImage(renderer.domElement, 0, 0);

  // Reject blank/failed render frames. Some source GLBs briefly resolve before
  // their textured/skinned mesh is actually visible; if we cache that transparent
  // frame the game draws a shadow/label and thinks the actor is valid.
  let opaque = 0;
  let left = snapW;
  let right = -1;
  let top = snapH;
  let bottom = -1;
  const rowCounts = new Array(snapH).fill(0);
  try {
    const data = ctx.getImageData(0, 0, snapW, snapH).data;
    for (let y = 0; y < snapH; y++) {
      let rowHit = false;
      for (let x = 0; x < snapW; x++) {
        const a = data[((y * snapW + x) * 4) + 3];
        if (a > 18) {
          opaque++;
          rowHit = true;
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          rowCounts[y]++;
        }
      }
      if (rowHit) bottom = y;
    }
  } catch (_) {
    opaque = 999;
    bottom = Math.round(FEET_BASELINE * snapH);
  }
  if (opaque < 48 || bottom < 0) return null;
  const reject = (reason, extra = {}) => {
    if (opts.meshy || opts.meshyForce || _crIsMeshyLikeUrl(opts.url)) {
      _gwarn("[GLBSpriter 128bit] rejected frame", reason, {
        opaque, bottom, snapW, snapH, url: String(opts.url || "").split("/").slice(-1)[0],
        ...extra,
      });
    }
    return null;
  };
  if (!relaxed && bottom < snapH * 0.34) return reject("low-bottom");
  const bw = Math.max(1, right - left + 1);
  const bh = Math.max(1, bottom - top + 1);
  const density = opaque / (bw * bh);
  // Texture-slab failure mode: Meshy character bakes can produce a moving
  // material sheet instead of a skinned actor. Only apply this to character
  // bakes; buildings/props are allowed to be rectangular.
  if (!opts.meshy && opts.actor && density > 0.9 && bw > snapW * 0.5 && bh > snapH * 0.5) return reject("solid-actor-slab", { bw, bh, density });
  let slabRun = 0;
  let maxSlabRun = 0;
  for (let y = top; y <= bottom; y++) {
    const fill = rowCounts[y] / bw;
    if (fill > 0.68) {
      slabRun++;
      if (slabRun > maxSlabRun) maxSlabRun = slabRun;
    } else {
      slabRun = 0;
    }
  }
  // KayKit actor slab filter — tight because toon models render cleanly
  if (!opts.meshy && opts.actor && bw > snapW * 0.42 && bh > snapH * 0.2 && density > 0.32 && maxSlabRun > bh * 0.22) return reject("kaykit-actor-slab", { bw, bh, density, maxSlabRun });
  if (opts.meshy) {
    // Meshy PBR humanoids on 256×352 canvas legitimately fill 30-55% of width
    // and 65-90% of height — thresholds must pass animated/T-pose humanoids.
    // Only reject clearly-failed bakes: near-solid rectangles or very long horizontal slabs.
    if (density > 0.85 && bw > snapW * 0.70 && bh > snapH * 0.60) return reject("meshy-solid-fill", { bw, bh, density, maxSlabRun }); // solid fill rect
    if (density > 0.60 && maxSlabRun > bh * 0.65) return reject("meshy-wide-slab", { bw, bh, density, maxSlabRun });   // ultra-wide slab
    // Flat texture-sheet billboard: wider than tall AND very dense
    const aspect = bw / bh;
    if (aspect > 1.15 && density > 0.60 && bh > snapH * 0.50) return reject("meshy-texture-billboard", { bw, bh, density, maxSlabRun, aspect });
  }

  // Keep the whole camera frame. Cropping made transparent padding look tidy,
  // but it also made animated rigs with low-alpha legs look like half-bodies.
  // Runtime placement now uses this measured baseline without deleting pixels.
  c._crSpriteBaseline = Math.max(0.1, Math.min(0.98, (bottom + 1) / snapH));
  c._crOpaquePixels = opaque;
  c._crSpriteBounds = { left, right, top, bottom, density };
  c._crActorFrame = true;
  c._crActorKind = opts.meshy ? "meshy" : (opts.actor ? "actor" : "prop");
  return c;
}

// ─── Core strip renderer ──────────────────────────────────────────────────────

async function _renderStrip(url, animName, direction, tier = DEFAULT_TIER) {
  const td = TIER_CFG[tier] || TIER_CFG[DEFAULT_TIER];
  const urlString = String(url || "");
  const isMeshyUrl = _crIsMeshyLikeUrl(urlString);
  // KayKit Adventurer character bodies have no embedded clips — load external rig animations.
  // Meshy and prop GLBs have their own animations; use _loadModel directly for those.
  const isKayBody = /Adventurers.*Characters.*\.glb$/i.test(urlString);
  const gltf = isKayBody
    ? await _loadKayBodyWithAnim(url, animName)
    : await _loadModelWithRetry(url);
  const root = SkeletonUtils.clone(gltf.scene);
  const isActorBake = /Adventurers|Characters|Character%20Templates|char-templates|Meshy.*(?:API|Characters|Monsters|Bosses)/i.test(urlString);
  const isMeshyBake = /Meshy|Character%20Templates|char-templates/i.test(urlString) || isMeshyUrl;
  if (!isMeshyBake) _normalize(root);
  root.traverse(obj => {
    if (!obj?.isMesh) return;
    obj.frustumCulled = false;
    obj.castShadow = false;
    obj.receiveShadow = false;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach(mat => {
      if (!mat) return;
      mat.depthWrite = true;
      mat.depthTest  = true;
      mat.premultipliedAlpha = false;
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;

      if (isMeshyBake) {
        // ── Meshy PBR 128-bit characters ─────────────────────────────────────
        // CRITICAL: do NOT zero emissive — Meshy textures bake lighting into the
        // emissive channel. Zeroing it makes the character appear nearly black,
        // failing the opacity check and producing invisible actors.
        // Keep emissive but clamp extreme values that would blow out the render.
        if (mat.emissiveIntensity !== undefined && mat.emissiveIntensity > 2.0) mat.emissiveIntensity = 1.0;
        if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
        // Force full opacity — Meshy exports sometimes set opacity<1 or blending modes
        // that cause rendered pixels to have alpha<255, failing the _snap() opacity count.
        mat.transparent = false;
        mat.opacity     = 1.0;
        mat.alphaTest   = 0.0; // no alphaTest: let slab filter handle card failures
        mat.blending    = THREE.NormalBlending;
        // Meshy exports are not consistent about winding/normals. Some valid
        // humanoids render fully transparent from the Cryptic camera when culled
        // to FrontSide; DoubleSide keeps the source model visible like ArcForge.
        mat.side        = THREE.DoubleSide;
        if (mat.alphaMap) mat.alphaMap = null;
        // Ensure normals are computed for PBR lighting
        if (mat.normalMap && !mat.normalScale) mat.normalScale = new THREE.Vector2(1, 1);
      } else {
        // ── KayKit / prop toon models ─────────────────────────────────────────
        // These are flat-shaded models where emissive adds unwanted glow — zero it.
        mat.transparent = false;
        mat.alphaTest   = Math.max(mat.alphaTest || 0, 0.025);
        mat.side        = isActorBake ? THREE.FrontSide : THREE.DoubleSide;
        if (mat.alphaMap)     mat.alphaMap = null;
        if (mat.emissive)     mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
        if (mat.emissiveMap)  mat.emissiveMap = null;
      }
      mat.needsUpdate = true;
    });
  });

  const allClips = gltf.animations || [];

  // Diagnostic — log clip inventory for Meshy GLBs on first bake of each URL
  if (isMeshyBake && animName === "idle") {
    _glog(`[GLBSpriter 128bit] ${url.split("/").slice(-2).join("/")} → ${allClips.length} clips:`,
      allClips.map(a => `"${a.name}"`).join(", ") || "(none)");
  }

  // Best clip for this state; fall back to ANY available clip
  const clip = _findClip(allClips, animName, isMeshyBake) ?? allClips[0] ?? null;

  const cfg    = ANIM_CFG[animName] || ANIM_CFG.idle;
  const mixer  = new THREE.AnimationMixer(root);
  let duration = 0;

  if (clip) {
    const action = mixer.clipAction(clip);
    action.clampWhenFinished = false;
    action.loop = THREE.LoopRepeat;
    action.play();
    duration = clip.duration;
  } else {
    // No animation at all → render a single frame at a slightly raised
    // camera angle to avoid pure T-pose silhouette
  }

  // Build lightweight scene — lighting driven by tier (64bit toon vs 128bit dramatic)
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(isMeshyBake ? 0xffffff : td.ambientColor, isMeshyBake ? 1.2 : td.ambient));
  const key = new THREE.DirectionalLight(isMeshyBake ? 0xffffff : td.keyColor, isMeshyBake ? 2.0 : td.keyInt);
  key.position.set(...(isMeshyBake ? [3, 6, 4] : td.keyPos));
  scene.add(key);
  const rim = new THREE.DirectionalLight(td.rimColor, td.rimInt);
  rim.position.set(...td.rimPos);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(td.fillColor, td.fillInt);
  fill.position.set(...td.fillPos);
  scene.add(fill);

  root.rotation.y = DIR_ANGLES[direction] ?? 0;
  scene.add(root);

  // Orthographic billboard camera — aspect ratio matches tier canvas size.
  // 128-bit gets a slightly narrower frustum so Meshy characters fill more canvas.
  // Camera elevation comes from the tier config (characters ~20°, iso arch ~30°).
  const halfH = VIEW_HALF;
  const halfW = halfH * (td.w / td.h);
  const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.05, 100);
  const camElevation = td.camElevation ?? 0.36;
  const camDist = td.camDist ?? 5.4;
  camera.position.set(0, VIEW_CENTER + camElevation * camDist, camDist);
  camera.lookAt(0, VIEW_CENTER - 0.08, 0);

  const nFrames = clip ? cfg.frames : 1;
  const frames  = [];
  const refitMeshyCamera = () => {
    if (!isMeshyBake) return;
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const fitHalfH = maxDim * 0.72;
    const fitHalfW = fitHalfH * (td.w / td.h);
    camera.left = -fitHalfW;
    camera.right = fitHalfW;
    camera.top = fitHalfH;
    camera.bottom = -fitHalfH;
    camera.position.set(center.x, center.y + maxDim * 0.6, center.z + maxDim * 2.2);
    camera.lookAt(center.x, center.y, center.z);
    camera.updateProjectionMatrix();
  };

  for (let i = 0; i < nFrames; i++) {
    const t = duration > 0
      ? (nFrames > 1 ? (i / nFrames) * duration : duration * 0.28)
      : 0;

    if (clip) {
      // Advance mixer to an absolute sample time for this baked frame.
      mixer.setTime(t);
      root.updateMatrixWorld(true);
    }
    refitMeshyCamera();

    const canvas = _snap(scene, camera, { actor: isActorBake, meshy: isMeshyBake || _crIsMeshyLikeUrl(url), meshyForce: _crIsMeshyLikeUrl(url), tier, url });
    if (canvas) frames.push(canvas);
  }

  if (isMeshyBake && frames.length === 0 && nFrames > 0) {
    if (clip && duration > 0) {
      mixer.setTime(duration * 0.35);
      root.updateMatrixWorld(true);
    }
    refitMeshyCamera();
    const fallbackCanvas = _snap(scene, camera, { actor: isActorBake, meshy: true, meshyForce: _crIsMeshyLikeUrl(url), tier, relaxed: true, url });
    if (fallbackCanvas) {
      frames.push(fallbackCanvas);
      _gwarn(`[GLBSpriter 128bit] FALLBACK relaxed frame kept for "${animName}" ${direction}`,
        url.split("/").slice(-1)[0]);
    }
  }

  if (isMeshyBake && frames.length === 0 && nFrames > 0) {
    const fallbackMaterial = new THREE.MeshNormalMaterial({
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1,
    });
    scene.overrideMaterial = fallbackMaterial;
    if (clip && duration > 0) {
      mixer.setTime(duration * 0.18);
      root.updateMatrixWorld(true);
    }
    refitMeshyCamera();
    const materialFallback = _snap(scene, camera, { actor: isActorBake, meshy: true, tier, relaxed: true, url });
    scene.overrideMaterial = null;
    fallbackMaterial.dispose();
    if (materialFallback) {
      frames.push(materialFallback);
      _gwarn(`[GLBSpriter 128bit] MATERIAL fallback kept visible geometry for "${animName}" ${direction}`,
        String(url).split("/").slice(-1)[0]);
    }
  }

  if (isMeshyBake && frames.length === 0 && nFrames > 0) {
    // Meshy actor fallback: our strict slab filter can reject valid dense humanoid renders.
    // Keep one final relaxed frame so Meshy actors do not disappear.
    if (clip && duration > 0) {
      mixer.setTime(duration * 0.25);
      root.updateMatrixWorld(true);
    }
    refitMeshyCamera();
    const forced = _snap(scene, camera, { actor: isActorBake, meshy: true, tier, relaxed: true });
    if (forced) {
      frames.push(forced);
      _gwarn(`[GLBSpriter 128bit] MESHY FORCE kept first visible actor frame for "${animName}" ${direction}`,
        String(url).split("/").slice(-1)[0]);
    }
  }

  scene.remove(root);
  mixer.stopAllAction();

  if (isMeshyBake && frames.length === 0 && nFrames > 0) {
    _gwarn(`[GLBSpriter 128bit] ALL ${nFrames} frames rejected by slab filter for "${animName}" ${direction}`,
      url.split("/").slice(-1)[0]);
  } else if (isMeshyBake) {
    _glog(`[GLBSpriter 128bit] "${animName}" ${direction}: ${frames.length}/${nFrames} frames kept, clip="${clip?.name ?? "none"}"`);
  }

  return frames;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the current animation frame (time-based, wraps strip), or null if
 * the strip is not yet cached. Caller should trigger a preload on miss.
 * `tier` = "64bit" | "128bit" (default: "64bit")
 */
export function getGlbSpriteFrame(url, animName = "idle", direction = "front", tier = DEFAULT_TIER) {
  if (!url) return null;
  // Try exact tier first, fall back to either tier so the game always shows something
  const key    = `${url}|${animName}|${direction}|${tier}`;
  const altKey = `${url}|${animName}|${direction}|${tier === "128bit" ? "64bit" : "128bit"}`;
  const strip  = _stripCache.get(key) || _stripCache.get(altKey);
  if (!strip || !strip.length) return null;
  const cfg = ANIM_CFG[animName] || ANIM_CFG.idle;
  const idx = Math.floor(Date.now() / (1000 / cfg.fps)) % strip.length;
  return strip[idx] || strip[0];
}

/** Backward compat: returns idle strip frame 0, or null. */
export function getCachedGlbSprite(url, direction = "front", tier = DEFAULT_TIER) {
  if (!url) return null;
  const strip = _stripCache.get(`${url}|idle|${direction}|${tier}`)
             || _stripCache.get(`${url}|idle|${direction}|64bit`);
  return (strip && strip[0]) || null;
}

/** Async: render and cache the strip for (url, animName, direction, tier). */
export async function renderGlbStrip(url, animName = "idle", direction = "front", tier = DEFAULT_TIER) {
  if (!url) return [];
  const key = `${url}|${animName}|${direction}|${tier}`;
  if (_stripCache.has(key))  return _stripCache.get(key);
  if (_pending.has(key))     return _pending.get(key);

  const promise = (_renderQueue = _renderQueue.catch(() => {}).then(async () => {
    try {
      if (_rendererRecoveryUntil > Date.now() && typeof requestAnimationFrame === "function") {
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      const frames = await _renderStrip(url, animName, direction, tier);
      _stripCache.set(key, frames.length ? frames : []);
      return frames;
    } catch (err) {
      console.warn("[crypticGlbSpriter]", animName, direction, tier, url.slice(-40), err?.message);
      _stripCache.set(key, []); // sentinel — don't retry on next frame
      return [];
    } finally {
      _pending.delete(key);
    }
  }));

  _pending.set(key, promise);
  return promise;
}

/**
 * Preload all (animName × direction) combos for a URL at the given tier.
 * Sequential rendering avoids fighting over the shared WebGLRenderer.
 */
export async function preloadGlbStrips(
  url,
  animNames = ["idle"],
  dirs = ["front", "right", "back", "left"],
  tier = DEFAULT_TIER
) {
  if (!url) return;
  let renderedFrames = 0;
  for (const anim of animNames) {
    for (const dir of dirs) {
      // eslint-disable-next-line no-await-in-loop
      const frames = await renderGlbStrip(url, anim, dir, tier);
      renderedFrames += Array.isArray(frames) ? frames.length : 0;
    }
  }
  return renderedFrames;
}

/** Fire-and-forget version — kicks off background rendering. */
export function preloadGlbStripsFireAndForget(
  url,
  animNames = ["idle"],
  dirs,
  tier = DEFAULT_TIER
) {
  if (!url) return Promise.resolve();
  const maxPending = tier === "128bit"
    ? MAX_128BIT_BACKGROUND_STRIP_JOBS
    : MAX_BACKGROUND_STRIP_JOBS;
  // Only count currently-pending (not-yet-rendered) strips, not the strip cache.
  // Once a strip is rendered it lives in _stripCache and should not prevent new
  // scene props from queuing. Critical actors bypass this by calling
  // preloadGlbStrips from the loading gate instead of this background helper.
  if (_pending.size > maxPending) {
    return Promise.resolve();
  }
  const p = preloadGlbStrips(url, animNames, dirs || ["front", "right", "back", "left"], tier).catch(() => {});
  return p;
}

// ─── Backward-compat shims (v1 callers) ──────────────────────────────────────

export async function renderGlbSprite(url, direction = "front") {
  await renderGlbStrip(url, "idle", direction);
  return getCachedGlbSprite(url, direction);
}

export async function preloadGlbSprite(url, directions = ["front", "right", "back", "left"]) {
  await preloadGlbStrips(url, ["idle"], directions);
}

/** Backward compat: now also kicks off walk+attack strips while it's at it. */
export function preloadGlbSpriteFireAndForget(url, directions) {
  preloadGlbStripsFireAndForget(
    url,
    ["idle", "walk", "attack"],
    directions || ["front", "right", "back", "left"]
  );
}

export function clearGlbSpriteCache() {
  _stripCache.clear();
  _pending.clear();
  _renderQueue = Promise.resolve();
}

export const GLB_SPRITE_DIMS = { width: SPRITE_W, height: SPRITE_H };

// Per-tier dimensions for callers that need to size destination rects correctly
export const GLB_TIER_DIMS = {
  "64bit":  { width: TIER_CFG["64bit"].w,  height: TIER_CFG["64bit"].h  },
  "128bit": { width: TIER_CFG["128bit"].w, height: TIER_CFG["128bit"].h },
};

/**
 * 8-directional vector → direction name.
 * vx/vy are game world-space deltas: +x=right, +y=screen-down (toward camera = "front").
 * We negate vy so that the angle aligns with standard math convention where
 * +y is "up" in a unit circle. That way atan2(-vy, vx) gives:
 *   vx=+1,vy= 0  → right      vx= 0,vy=+1  → front (screen-down)
 *   vx= 0,vy=-1  → back       vx=-1,vy= 0  → left
 */
export function glbVecToDir8(vx, vy) {
  if (Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05) return "front";
  const angle = Math.atan2(-vy, vx); // negate vy: game +y is screen-down = "front"
  const deg = ((angle * 180 / Math.PI) + 360) % 360;
  // Sector centres at 0°=right, 45°=back_right, 90°=back, 135°=back_left,
  //   180°=left, 225°=front_left, 270°=front, 315°=front_right
  if (deg < 22.5 || deg >= 337.5) return "right";
  if (deg < 67.5)  return "back_right";
  if (deg < 112.5) return "back";
  if (deg < 157.5) return "back_left";
  if (deg < 202.5) return "left";
  if (deg < 247.5) return "front_left";
  if (deg < 292.5) return "front";
  return "front_right";
}

/** 4-directional version (legacy compat). */
export function glbVecToDir4(vx, vy) {
  const d8 = glbVecToDir8(vx, vy);
  const map = { front:"front", front_right:"right", right:"right", back_right:"back",
                back:"back",   back_left:"left",    left:"left",   front_left:"front" };
  return map[d8] || "front";
}
