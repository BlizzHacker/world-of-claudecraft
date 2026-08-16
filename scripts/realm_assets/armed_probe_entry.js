// Browser-side ground-truth probe for ARMED BODY proportion.
//
// FIDELITY is the whole point: rawHeight is measured exactly the way
// src/render/characters/assets.ts prepareVisual() measures it (idle-posed,
// applyBoneTransform over the visible skinned meshes) and the weapon is attached
// exactly the way attachProp() attaches it, importing the REAL compose math from
// src/render/characters/weapon_grip.ts. A ratio measured here is the ratio the
// game draws, because prepareVisual's uniform normalisation scales body and
// weapon together and cancels out.
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { variantGripTransform } from '../../src/render/characters/weapon_grip';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

// Arms repeat across bodies (380 models, 1,200 wielders) so they are worth
// caching; BODIES are used once each and are the memory hogs - 1,200 undisposed
// bodies detaches the renderer frame mid-run. Load bodies fresh, free them after.
const armCache = new Map();
function loadArm(url) {
  let p = armCache.get(url);
  if (!p) {
    p = new Promise((res, rej) => loader.load(url, res, undefined, rej));
    armCache.set(url, p);
  }
  return p;
}
function loadFresh(url) {
  return new Promise((res, rej) => loader.load(url, res, undefined, rej));
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
window.__dropCache = () => armCache.clear();

// ---- verbatim from assets.ts ----------------------------------------------
function flattenWeaponScene(src) {
  if (src.children.length !== 1) return src;
  const holder = new THREE.Group();
  const child = src.children[0];
  holder.scale.copy(child.scale);
  child.scale.set(1, 1, 1);
  child.position.set(0, 0, 0);
  child.rotation.set(0, 0, 0);
  src.remove(child);
  holder.add(child);
  return holder;
}
const clean = (n) => n.replace(/[[\].:/]/g, '');
function handSide(bone) {
  return clean(bone).endsWith('l') ? 'l' : 'r';
}
function meshChainVisible(o, root) {
  let n = o;
  while (n && n !== root) {
    if (!n.visible) return false;
    n = n.parent;
  }
  return true;
}
// ---------------------------------------------------------------------------

function findBone(root, boneName) {
  const want = clean(boneName);
  let found = null;
  root.traverse((o) => {
    if (!found && clean(o.name) === want) found = o;
  });
  return found;
}

/** prepareVisual()'s rawHeight, verbatim: pose the idle clip at its midpoint,
 *  push every skinned vertex through applyBoneTransform, take the Y extent. */
function measureRawHeight(root, clips, idleName) {
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

const r4 = (v) => Math.round(v * 10000) / 10000;

/**
 * probeArmed(bodyUrl, armUrl, opts) ->
 *   { bodyH, handY, boneScale, localLongest, gripScale, weaponLen, ratio }
 * opts.grip = { lift, maxHeight, override } exactly as assets.ts would compose.
 */
window.probeArmed = async (bodyUrl, armUrl, opts = {}) => {
  const bodyGltf = await loadFresh(bodyUrl);
  const armGltf = await loadArm(armUrl);
  const root = cloneSkinned(bodyGltf.scene);
  const bounds = measureRawHeight(root, bodyGltf.animations ?? [], opts.idle ?? 'Idle');
  const bodyH = Math.max(1e-3, bounds.max.y - bounds.min.y);

  const boneName = opts.bone ?? 'handslot.r';
  const bone = findBone(root, boneName);
  if (!bone) throw new Error(`no ${boneName}`);

  const payload = flattenWeaponScene(cloneSkinned(armGltf.scene));
  const box = new THREE.Box3().setFromObject(payload);
  const nodeScale = payload.scale.x || 1;
  const size = box.getSize(new THREE.Vector3());
  const localLongest = Math.max(size.x, size.y, size.z) / nodeScale;
  const height = size.y;

  const t = variantGripTransform(
    height,
    handSide(boneName) === 'l',
    opts.grip?.lift ?? 0,
    opts.grip?.maxHeight ?? 8,
    opts.grip?.override,
    opts.wield ?? 1,
  );
  payload.position.set(...t.position);
  payload.quaternion.set(...t.quaternion);
  payload.scale.setScalar(t.scale);
  bone.add(payload);
  root.updateMatrixWorld(true);

  const bw = new THREE.Vector3();
  bone.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), bw);
  const boneScale = (bw.x + bw.y + bw.z) / 3;
  const weaponLen = localLongest * t.scale * boneScale;

  const handWorld = bone.getWorldPosition(new THREE.Vector3());
  const result = {
    bodyH: r4(bodyH),
    handY: r4((handWorld.y - bounds.min.y) / bodyH),
    boneScale: r4(boneScale),
    localLongest: r4(localLongest),
    gripScale: r4(t.scale),
    wield: opts.wield ?? 1,
    weaponLen: r4(weaponLen),
    ratio: r4(weaponLen / bodyH),
  };
  disposeTree(root);
  disposeTree(bodyGltf.scene);
  return result;
};

window.__ready = true;
