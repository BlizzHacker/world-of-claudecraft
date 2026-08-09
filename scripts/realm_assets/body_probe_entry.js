// Browser-side body measurement for the wield-scale stage. Bundled by esbuild
// into a self-contained IIFE and injected into a blank page by
// measure_bodies.mjs.
//
//   window.measureBody(url) -> { height, width, depth, handR, handL, handRY }
//
// WHY A BROWSER. The number that matters is the one prepareVisual() measures in
// src/render/characters/assets.ts: the idle-POSED bounds of the skinned meshes,
// taken through applyBoneTransform. A GLB header parse cannot produce it - these
// bodies carry inverse-bind matrices whose scale differs from the raw POSITION
// extents by anywhere from 1.8x to 2.9x, so a header-only measurement is not
// even monotonic with the on-screen height. The vertex data is also
// EXT_meshopt_compression'd, so decoding it needs the loader the game uses.
//
// The measurement below is prepareVisual's, step for step, and deliberately so:
// prepareVisual divides def.height by this exact number to normalise the body,
// and the wield term exists to cancel that division for the weapon in its hand.
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

const clean = (n) => (n ?? '').replace(/[[\].:/]/g, '');
const r4 = (v) => Math.round(v * 10000) / 10000;

function meshChainVisible(o, root) {
  let n = o;
  while (n && n !== root) {
    if (!n.visible) return false;
    n = n.parent;
  }
  return true;
}

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    for (const m of [].concat(o.material ?? [])) {
      for (const k of Object.keys(m)) if (m[k]?.isTexture) m[k].dispose();
      m.dispose();
    }
  });
}

/** prepareVisual()'s rawHeight bounds, verbatim: pose the idle clip at its
 *  midpoint, push every visible skinned vertex through applyBoneTransform, take
 *  the extents. Falls back to plain mesh bounds for a rig with no skinned mesh,
 *  exactly like the engine. */
function posedBounds(root, clips, idleName) {
  const idle = clips.find((c) => c.name === idleName) ?? clips[0] ?? null;
  if (idle) {
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(idle).play();
    mixer.update(Math.min(0.5, idle.duration * 0.5));
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (o.isSkinnedMesh) o.skeleton.update();
    });
    mixer.stopAllAction();
    mixer.uncacheRoot(root);
  } else {
    root.updateMatrixWorld(true);
  }
  const bounds = new THREE.Box3();
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isSkinnedMesh || !meshChainVisible(o, root)) return;
    const pos = o.geometry.getAttribute('position');
    // Every 20,000th-vertex stride: the extents of a 200k-vertex body are set by
    // its silhouette, and a full sweep over 1,600 bodies costs an hour for a
    // fourth decimal place nothing reads.
    const step = Math.max(1, Math.ceil(pos.count / 20000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i);
      o.applyBoneTransform(i, v);
      v.applyMatrix4(o.matrixWorld);
      bounds.expandByPoint(v);
    }
  });
  if (bounds.isEmpty()) {
    root.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || !meshChainVisible(o, root)) return;
      bounds.expandByObject(o);
    });
  }
  return bounds;
}

function boneWorldScale(bone) {
  const s = new THREE.Vector3();
  bone.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
  return (s.x + s.y + s.z) / 3;
}

function loadOnce(url) {
  return new Promise((res, rej) => loader.load(url, res, undefined, rej));
}

window.measureBody = async (url, opts = {}) => {
  // One retry on a transport hiccup: a keep-alive socket closing under the load
  // is indistinguishable from a broken asset at this level, and re-reading a
  // local file is far cheaper than losing the row.
  const gltf = await loadOnce(url).catch(
    () => new Promise((r) => setTimeout(r, 250)).then(() => loadOnce(url)),
  );
  const root = cloneSkinned(gltf.scene);
  const bounds = posedBounds(root, gltf.animations ?? [], opts.idle ?? 'Idle');
  if (bounds.isEmpty()) {
    disposeTree(root);
    disposeTree(gltf.scene);
    return null;
  }
  const size = bounds.getSize(new THREE.Vector3());
  let handR = null;
  let handL = null;
  root.traverse((o) => {
    const n = clean(o.name);
    if (n === 'handslotr' && !handR) handR = o;
    if (n === 'handslotl' && !handL) handL = o;
  });
  const out = {
    height: r4(size.y),
    width: r4(size.x),
    depth: r4(size.z),
    handR: handR ? r4(boneWorldScale(handR)) : null,
    handL: handL ? r4(boneWorldScale(handL)) : null,
    // Hand height as a fraction of body height: a sanity read for "the weapon is
    // floating at the ankles" that does not need a render.
    handRY: handR
      ? r4((handR.getWorldPosition(new THREE.Vector3()).y - bounds.min.y) / Math.max(1e-6, size.y))
      : null,
  };
  disposeTree(root);
  disposeTree(gltf.scene);
  return out;
};

window.__ready = true;
