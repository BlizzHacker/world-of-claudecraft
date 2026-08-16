// Region-mask appearance tinting for realm OVERRIDE bodies.
//
// A realm body (the operator-published GLBs under /cr-realms/<realm>/) is one
// mesh, one material, one baked atlas: there are no separable hair/face parts,
// so the modular per-part material swap (assets.ts recolored()) has nothing to
// grab and the appearance editor's hair/skin wheels used to do NOTHING on
// them. The viable mechanism is a REGION MASK: an offline pass
// (scripts/realm_assets/gen_appearance_masks.mjs) classifies each body's
// vertices by skeleton weights and rasterizes their UV footprints into a
// sidecar PNG served beside the GLB (<body>.mask.png, R = hair, G = face
// skin). This module loads that sidecar 404-tolerantly and patches the body
// material's fragment stage (the attachArmorDye onBeforeCompile precedent in
// assets.ts) to blend the ModularAppearance hair colour over the atlas where
// mask.R is high, and a subtle skin-tone shift where mask.G is. The blend is
// luminance-preserving (colour x texel luma), so the painted strand/pore
// detail survives recolouring.
//
// The hook only ever activates for bodies whose VisualDef.url lives under
// /cr-realms/ — which never render on the claudecraft realm (see
// createCharacterVisual's realm gate in index.ts) — so claudecraft stays 100%
// stock. A body with no published mask stays untouched: the sampler holds a
// 1x1 black placeholder until (unless) the sidecar loads, and black masks to
// a no-op in the shader.
import * as THREE from 'three';
import type { VisualDef } from './manifest';
import { hairColor, type ModularAppearance, skinColor } from './modular';

/** Sidecar mask URL for an override body, or null for anything that is not a
 *  realm-store body (compiled class rigs, modular parts, weapons keep null). */
export function overrideAppearanceMaskUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('/cr-realms/') || !url.endsWith('.glb')) return null;
  // Weapon/prop stores share the /cr-realms tree but are never a character's
  // own body material sweep target; skip the fetch noise for the known ones.
  if (url.includes('/weapons/') || url.includes('/shared/')) return null;
  return url.replace(/\.glb$/, '.mask.png');
}

/** Everything the material patch needs, resolved once per visual build. */
export interface OverrideAppearanceSpec {
  maskUrl: string;
  /** Shared uniform holder for the mask sampler: starts as a 1x1 black
   *  placeholder and is swapped in place when the sidecar arrives, so already
   *  compiled programs pick it up without a rebuild. */
  mask: { value: THREE.Texture };
  hairHex: number;
  skinHex: number;
}

// One black texel: mask.rgb = 0 disables both blends, so an absent sidecar
// (or one still in flight) renders the body byte-identically to today.
let noMask: THREE.DataTexture | null = null;
function noMaskTexture(): THREE.DataTexture {
  if (!noMask) {
    noMask = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    noMask.needsUpdate = true;
  }
  return noMask;
}

interface MaskEntry {
  holder: { value: THREE.Texture };
  state: 'loading' | 'ready' | 'missing';
}

// Shared per-URL cache, never disposed: there is one mask per body GLB, the
// same boundedness argument as the geometry/material caches in assets.ts.
const maskEntries = new Map<string, MaskEntry>();

function maskEntryFor(maskUrl: string): MaskEntry {
  let entry = maskEntries.get(maskUrl);
  if (entry) return entry;
  entry = { holder: { value: noMaskTexture() }, state: 'loading' };
  maskEntries.set(maskUrl, entry);
  new THREE.TextureLoader().load(
    maskUrl,
    (tex) => {
      // Match the embedded GLB atlas convention (GLTFLoader textures are
      // flipY=false); the generator rasterizes with the same top-left origin.
      tex.flipY = false;
      tex.colorSpace = THREE.NoColorSpace; // region data, not colour
      tex.needsUpdate = true;
      entry.holder.value = tex;
      entry.state = 'ready';
    },
    undefined,
    () => {
      // 404 (or any load failure): the body simply has no mask. Keep the
      // black placeholder forever; every hook attached against this holder
      // stays a no-op and later visuals skip the spec entirely.
      entry.state = 'missing';
    },
  );
  return entry;
}

/** Resolve the appearance spec for one visual build, or null when the hook
 *  must stay off: no appearance to apply, not an override body, or the mask
 *  sidecar is already known to be absent. */
export function resolveOverrideAppearanceSpec(
  def: Pick<VisualDef, 'url'>,
  app: ModularAppearance | null | undefined,
): OverrideAppearanceSpec | null {
  if (!app) return null;
  const maskUrl = overrideAppearanceMaskUrl(def.url);
  if (!maskUrl) return null;
  const entry = maskEntryFor(maskUrl);
  if (entry.state === 'missing') return null;
  return { maskUrl, mask: entry.holder, hairHex: hairColor(app), skinHex: skinColor(app) };
}

/** matCache key fragment for a spec (assets.ts folds it into tintedMaterial's
 *  key so per-appearance variants never collide with the shared untinted
 *  ones). Colour changes arrive on SAVE (a visual rebuild), not per
 *  pointermove — the live colour-wheel drag runs on the preview's private
 *  external-model materials via uniforms — so the per-hex growth here is a
 *  handful of entries per session, not a drag's worth. */
export function overrideAppearanceCacheKey(ap: OverrideAppearanceSpec | null): string {
  return ap ? `|ap:${ap.maskUrl}|${ap.hairHex}|${ap.skinHex}` : '';
}

const AP_TINT_TAG = 'crApTint';
/** Blend weights: hair replaces fully where the mask says hair (the HSV value
 *  modulation keeps the painted detail); the face shift is deliberately
 *  subtler. */
const HAIR_STRENGTH = 1.0;
const SKIN_STRENGTH = 0.5;

interface ApTintHandles {
  /** Target HAIR colour as HSV (h 0..1, s 0..1, v 0..1). HSV rather than RGB
   *  because a multiply tint dies on these atlases: the baked hair paint is
   *  DARK (linear luma ~0.03), so any picked colour times the texel is mud.
   *  The shader instead rotates the texel's hue/sat to the target and REMAPS
   *  value around it — the attachArmorDye lesson, in miniature. */
  hair: { value: THREE.Vector3 };
  skin: { value: THREE.Vector3 };
  weights: { value: THREE.Vector2 };
}

/** sRGB hex int to HSV vector (h 0..1, s, v). The spec carries the picked
 *  colours as hex (they double as the material cache key); the shader wants
 *  them back in HSV. */
function hexToHsvVec(hex: number): THREE.Vector3 {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return new THREE.Vector3(h, s, max);
}

/** ModularAppearance HSL (hue deg, sat 0..1, light 0..1) to HSV vector. */
function hslToHsvVec(h: number, s: number, l: number): THREE.Vector3 {
  const v = l + s * Math.min(l, 1 - l);
  const sv = v === 0 ? 0 : 2 * (1 - l / v);
  return new THREE.Vector3(((h % 360) + 360) % 360 / 360, sv, v);
}

function hairHsv(app: ModularAppearance): THREE.Vector3 {
  return hslToHsvVec(app.hairHue, app.hairSat, app.hairLight);
}

function skinHsv(app: ModularAppearance): THREE.Vector3 {
  return hslToHsvVec(app.skinHue, app.skinSat, app.skinLight);
}

/** Attach the mask-tint hook to a material IN PLACE. Composes with whatever
 *  onBeforeCompile the material already carries (armour dye / rim glow /
 *  surface detail all use the same pattern) and folds the previous program
 *  key in. One program serves every colour: only uniforms differ (the
 *  attachArmorDye precedent). Callers own the clone discipline: never attach
 *  to a SHARED cached material another character can be holding. */
export function attachAppearanceMaskTint(mat: THREE.Material, spec: OverrideAppearanceSpec): void {
  // The injected GLSL samples vMapUv, which only exists under USE_MAP; a
  // mapless material has no atlas to tint anyway.
  if (!(mat as THREE.MeshStandardMaterial).map) return;
  const handles: ApTintHandles = {
    hair: { value: hexToHsvVec(spec.hairHex) },
    skin: { value: hexToHsvVec(spec.skinHex) },
    weights: { value: new THREE.Vector2(HAIR_STRENGTH, SKIN_STRENGTH) },
  };
  mat.userData[AP_TINT_TAG] = handles;
  const prev = mat.onBeforeCompile;
  const prevKey = typeof prev === 'function' ? prev.toString() : '';
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.call(mat, shader, renderer);
    shader.uniforms.uCrApMask = spec.mask;
    shader.uniforms.uCrApHair = handles.hair;
    shader.uniforms.uCrApSkin = handles.skin;
    shader.uniforms.uCrApW = handles.weights;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `uniform sampler2D uCrApMask;
uniform vec3 uCrApHair;
uniform vec3 uCrApSkin;
uniform vec2 uCrApW;
vec3 crApRgb2Hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 crApHsv2Rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
vec3 crApLin2Srgb(vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }
vec3 crApSrgb2Lin(vec3 c) { return pow(max(c, vec3(0.0)), vec3(2.2)); }
void main() {`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
{
  vec4 crApM = texture2D(uCrApMask, vMapUv);
  float crApHairW = crApM.r * uCrApW.x;
  float crApSkinW = crApM.g * uCrApW.y;
  if (crApHairW + crApSkinW > 0.004) {
    // Recolour in sRGB HSV (the armour-dye precedent): the baked hair paint
    // is far too dark for a multiply tint to read, so take the target
    // hue/sat outright and remap the texel's VALUE around the target — the
    // painted strand/pore detail keeps modulating brightness, the picked
    // colour decides what it modulates.
    vec3 crApSrgb = crApLin2Srgb(diffuseColor.rgb);
    vec3 crApHsv = crApRgb2Hsv(crApSrgb);
    if (crApHairW > 0.002) {
      vec3 crApH = vec3(
        uCrApHair.x,
        clamp(uCrApHair.y * (0.55 + 0.9 * crApHsv.y), 0.0, 1.0),
        clamp(uCrApHair.z * (0.35 + 1.35 * crApHsv.z), 0.0, 1.0));
      diffuseColor.rgb = mix(diffuseColor.rgb, crApSrgb2Lin(crApHsv2Rgb(crApH)), crApHairW);
    }
    if (crApSkinW > 0.002) {
      vec3 crApS = vec3(
        uCrApSkin.x,
        clamp(mix(crApHsv.y, uCrApSkin.y, 0.65), 0.0, 1.0),
        clamp(crApHsv.z * (0.25 + uCrApSkin.z), 0.0, 1.0));
      diffuseColor.rgb = mix(diffuseColor.rgb, crApSrgb2Lin(crApHsv2Rgb(crApS)), crApSkinW);
    }
  }
}`,
      );
  };
  mat.customProgramCacheKey = () => `cr_ap_tint|${prevKey}`;
  // A hook added to an ALREADY-COMPILED material is silently ignored until
  // the program rebuilds (the external-preview sweep can attach after the
  // mount's first frame); force the rebuild. Free on a fresh clone.
  mat.needsUpdate = true;
}

/** Live-update the tint colours on every hooked material under `root` (pure
 *  uniform writes: no recompile, no reallocation — what makes the appearance
 *  editor's colour-wheel drag cheap on the create-screen turntable). */
export function setAppearanceTintColors(root: THREE.Object3D, app: ModularAppearance): void {
  const hair = hairHsv(app);
  const skin = skinHsv(app);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const handles = m?.userData?.[AP_TINT_TAG] as ApTintHandles | undefined;
      if (!handles) continue;
      handles.hair.value.copy(hair);
      handles.skin.value.copy(skin);
    }
  });
}

// ---------------------------------------------------------------------------
// External-preview path (the create screen's realm-body turntable).
//
// CharacterPreview.setExternalModel mounts a SkeletonUtils clone of the
// loader-cached GLTF scene, which SHARES materials with the cache — the same
// originals assembleModel snapshots for the in-world rigs — so the hook must
// never be attached to those in place. This sweep gives each mesh a private
// clone (raw loader materials carry no onBeforeCompile to lose; the
// worn_stone clone caveat does not bite here), hooks the clone, and tracks it
// for disposal when the mount is torn down.
// ---------------------------------------------------------------------------

const AP_CLONES_TAG = 'crApTintClones';

/** Attach (idempotently) and colour the appearance tint on an external
 *  preview mount. Returns true when the hook is live on at least one
 *  material. No-op (false) for non-realm URLs and mask-less bodies. */
export function applyExternalAppearanceTint(
  root: THREE.Object3D,
  modelUrl: string | null,
  app: ModularAppearance | null,
): boolean {
  if (!app) return false;
  const spec = resolveOverrideAppearanceSpec({ url: modelUrl ?? '' }, app);
  if (!spec) return false;
  let hooked = false;
  const clones: THREE.Material[] = (root.userData[AP_CLONES_TAG] ??= []);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const swap = (m: THREE.Material): THREE.Material => {
      if (m?.userData?.[AP_TINT_TAG]) {
        hooked = true;
        return m; // already ours (a re-apply after a colour change)
      }
      if (!(m as THREE.MeshStandardMaterial).map) return m;
      const clone = m.clone();
      attachAppearanceMaskTint(clone, spec);
      clones.push(clone);
      hooked = true;
      return clone;
    };
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(swap)
      : swap(mesh.material);
  });
  if (hooked) setAppearanceTintColors(root, app);
  return hooked;
}

/** Release the private material clones a preview mount's tint sweep created
 *  (the shared loader-cached originals are untouched and stay cached). */
export function disposeExternalAppearanceTint(root: THREE.Object3D): void {
  const clones = root.userData[AP_CLONES_TAG] as THREE.Material[] | undefined;
  if (!clones) return;
  for (const m of clones) m.dispose();
  delete root.userData[AP_CLONES_TAG];
}
