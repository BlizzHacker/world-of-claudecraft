// Runtime asset loading: glTF models (meshopt-compressed) + HDR environment
// maps, with a promise cache so every consumer shares one parse per URL.
// Render-layer only — the sim must never import this (it runs headless).
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { assetUrl } from './media';

let gltfLoader: GLTFLoader | null = null;
const gltfCache = new Map<string, Promise<GLTF>>();
const hdrCache = new Map<string, Promise<THREE.DataTexture>>();
const texCache = new Map<string, Promise<THREE.Texture>>();

function loader(): GLTFLoader {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);
  }
  return gltfLoader;
}

/** Load + parse a .glb once; subsequent calls share the same parsed scene.
 *  Consumers must treat the result as immutable — clone before mutating. */
export function loadGltf(url: string): Promise<GLTF> {
  const resolved = assetUrl(url);
  let p = gltfCache.get(resolved);
  if (!p) {
    p = new Promise<GLTF>((resolve, reject) => {
      loader().load(resolved, resolve, undefined, () =>
        reject(new Error(`asset load failed: ${url} (missing file or bad GLB)`)));
    });
    gltfCache.set(resolved, p);
  }
  return p;
}

/** Drop a parsed glTF from the cache once its data has been extracted into
 *  module-owned structures — lets the parsed scene, original geometry and any
 *  duplicate decoded textures be garbage-collected. A later loadGltf for the
 *  same url would simply re-fetch. */
export function releaseGltf(url: string): void {
  gltfCache.delete(assetUrl(url));
}

/** Equirectangular Radiance .hdr for IBL / sky sampling (HalfFloat). */
export function loadHdr(url: string): Promise<THREE.DataTexture> {
  const resolved = assetUrl(url);
  let p = hdrCache.get(resolved);
  if (!p) {
    p = new Promise<THREE.DataTexture>((resolve, reject) => {
      new RGBELoader().load(resolved, (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        resolve(tex);
      }, undefined, () => reject(new Error(`hdr load failed: ${url}`)));
    });
    hdrCache.set(resolved, p);
  }
  return p;
}

/** Plain image texture (terrain splats, water normals, VFX sprites). */
export function loadTexture(url: string, opts: { srgb?: boolean; repeat?: boolean } = {}): Promise<THREE.Texture> {
  const resolved = assetUrl(url);
  const key = `${resolved}|${opts.srgb ? 's' : 'l'}|${opts.repeat ? 'r' : 'c'}`;
  let p = texCache.get(key);
  if (!p) {
    p = new Promise<THREE.Texture>((resolve, reject) => {
      new THREE.TextureLoader().load(resolved, (tex) => {
        if (opts.srgb) tex.colorSpace = THREE.SRGBColorSpace;
        if (opts.repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        resolve(tex);
      }, undefined, () => reject(new Error(`texture load failed: ${url}`)));
    });
    texCache.set(key, p);
  }
  return p;
}
