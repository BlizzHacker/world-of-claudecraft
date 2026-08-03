// Browser-side entry for the realm-arms grip audit. Bundled by esbuild into a
// self-contained IIFE and injected into a blank page by audit_arms_render.mjs.
//
// The point of this file is FIDELITY: it reproduces src/render/characters/
// assets.ts attachProp() step for step (flattenWeaponScene -> variant grip ->
// bone.add) and imports the REAL compose math from
// src/render/characters/weapon_grip.ts rather than copying it, so a grip that
// looks right here is the grip the game applies.
//
//   window.renderArm(bodyB64, armB64, opts) -> [{ name, dataUrl }]
//     opts.grip   = null (bare attach, no family) or { lift, maxHeight, override }
//     opts.clip   = animation clip name to pose at (default Idle)
//     opts.at     = normalized time within the clip (default 0.3)
//     opts.size   = square pixel size
//     opts.bone   = 'handslot.r' | 'handslot.l'
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { variantGripTransform } from '../../src/render/characters/weapon_grip';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

function makeLights() {
  const g = new THREE.Group();
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
  key.position.set(2.5, 4, 3);
  g.add(key);
  const fill = new THREE.DirectionalLight(0x9fb6e0, 1.0);
  fill.position.set(-3, 1, -1.5);
  g.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2);
  rim.position.set(0, 2, -4);
  g.add(rim);
  g.add(new THREE.AmbientLight(0xffffff, 0.55));
  return g;
}

function b64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

function parseGlb(b64) {
  return new Promise((resolve, reject) => {
    loader.parse(b64ToArrayBuffer(b64), '', resolve, reject);
  });
}

// ---- verbatim from src/render/characters/assets.ts -------------------------
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

function isHandslotBone(name) {
  const n = name.replace(/[[\].:/]/g, '');
  return n === 'handslotr' || n === 'handslotl';
}

function handSide(bone) {
  return bone.replace(/[[\].:/]/g, '').endsWith('l') ? 'l' : 'r';
}

const variantBox = new THREE.Box3();
function applyVariantGrip(payload, bone, grip) {
  variantBox.setFromObject(payload);
  const height = variantBox.max.y - variantBox.min.y;
  const t = variantGripTransform(
    height,
    handSide(bone) === 'l',
    grip.lift,
    grip.maxHeight,
    grip.override,
  );
  payload.position.set(t.position[0], t.position[1], t.position[2]);
  payload.quaternion.set(t.quaternion[0], t.quaternion[1], t.quaternion[2], t.quaternion[3]);
  payload.scale.setScalar(t.scale);
  return { height, applied: t };
}
// ---------------------------------------------------------------------------

function findBone(root, boneName) {
  const want = boneName.replace(/[[\].:/]/g, '');
  let found = null;
  root.traverse((o) => {
    if (!found && o.name.replace(/[[\].:/]/g, '') === want) found = o;
  });
  return found;
}

function frameWhole(scene, obj, yaw, size) {
  obj.rotation.set(0, yaw, 0);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = sphere.radius || 1;
  const fov = 32;
  const cam = new THREE.PerspectiveCamera(fov, 1, 0.01, 1000);
  const dist = (r / Math.sin((fov * Math.PI) / 360)) * 1.1;
  cam.position.set(center.x, center.y + dist * 0.1, center.z + dist);
  cam.lookAt(center);
  renderer.setSize(size, size);
  renderer.setClearColor(0x1a1e26, 1);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

// Tight shot centred on the hand: the only view that actually shows a gun
// clipping through the palm.
function frameHand(scene, obj, bone, yaw, size, radius) {
  obj.rotation.set(0, yaw, 0);
  obj.updateMatrixWorld(true);
  const center = bone.getWorldPosition(new THREE.Vector3());
  const fov = 32;
  const cam = new THREE.PerspectiveCamera(fov, 1, 0.01, 1000);
  const dist = (radius / Math.sin((fov * Math.PI) / 360)) * 1.1;
  cam.position.set(center.x + dist * 0.35, center.y + dist * 0.25, center.z + dist);
  cam.lookAt(center);
  renderer.setSize(size, size);
  renderer.setClearColor(0x1a1e26, 1);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}

function dispose(obj, scene) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
    }
  });
  scene.clear();
}

window.renderArm = async (bodyB64, armB64, opts = {}) => {
  const size = opts.size ?? 420;
  const boneName = opts.bone ?? 'handslot.r';
  const bodyGltf = await parseGlb(bodyB64);
  const armGltf = await parseGlb(armB64);
  const scene = new THREE.Scene();
  scene.add(makeLights());
  const rig = bodyGltf.scene;
  scene.add(rig);

  const bone = findBone(rig, boneName);
  if (!bone) throw new Error(`rig has no ${boneName} bone`);

  const payload = flattenWeaponScene(armGltf.scene);
  let diag = { nativeScale: payload.scale.x };
  if (opts.grip && isHandslotBone(boneName)) {
    diag = { ...diag, ...applyVariantGrip(payload, boneName, opts.grip) };
  }
  bone.add(payload);

  // World size of the attached weapon vs the body, so the caller can flag a
  // car-sized gun numerically as well as visually.
  rig.updateMatrixWorld(true);
  const armBox = new THREE.Box3().setFromObject(payload);
  const rigBox = new THREE.Box3().setFromObject(rig);
  diag.armWorldSize = [
    armBox.max.x - armBox.min.x,
    armBox.max.y - armBox.min.y,
    armBox.max.z - armBox.min.z,
  ].map((v) => Math.round(v * 1000) / 1000);
  diag.bodyHeight = Math.round((rigBox.max.y - rigBox.min.y) * 1000) / 1000;

  const clips = bodyGltf.animations ?? [];
  const mixer = clips.length ? new THREE.AnimationMixer(rig) : null;
  const poseWith = (name, at) => {
    if (!mixer) return false;
    const clip = clips.find((c) => c.name === name) ?? null;
    if (!clip) return false;
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.reset().play();
    mixer.setTime(Math.max(0.001, clip.duration * at));
    rig.updateMatrixWorld(true);
    return true;
  };

  const shots = [];
  const yaws = opts.yaws ?? [['', -Math.PI / 5]];
  const poses = opts.poses ?? [
    ['idle', 'Idle', 0.3],
    ['shoot', '2H_Ranged_Shoot', 0.45],
  ];
  const shoot = (label) => {
    for (const [suffix, yaw] of yaws) {
      const tag = suffix ? `${label}${suffix}` : label;
      shots.push({ name: `${tag}_body`, dataUrl: frameWhole(scene, rig, yaw, size) });
      shots.push({
        name: `${tag}_hand`,
        dataUrl: frameHand(scene, rig, bone, yaw, size, opts.handRadius ?? 1.0),
      });
    }
  };
  diag.poses = {};
  for (const [label, clipName, at] of poses) {
    if (!poseWith(clipName, at)) continue;
    // Where the hand actually is versus the rig's own extent: the only way to
    // tell "the gun is floating at the ankles" apart from "this body's arms
    // hang to its ankles" without guessing from a thumbnail.
    const rb = new THREE.Box3().setFromObject(rig);
    const bp = bone.getWorldPosition(new THREE.Vector3());
    const pb = new THREE.Box3().setFromObject(payload);
    const r3 = (v) => Math.round(v * 1000) / 1000;
    diag.poses[label] = {
      rigY: [r3(rb.min.y), r3(rb.max.y)],
      boneY: r3(bp.y),
      armCentreY: r3((pb.min.y + pb.max.y) / 2),
      armSpanY: [r3(pb.min.y), r3(pb.max.y)],
    };
    shoot(label);
  }
  if (!shots.length) shoot('rest');
  dispose(rig, scene);
  return { shots, diag };
};

// Geometry probe for emit_arms.mjs. Accessor min/max (readable straight out of
// the GLB header) give the bounding box, but NOT which end of a weapon is the
// handle — and that is the one fact a generated grip cannot guess: hold a mace
// by its skull and every fantasy realm ships backwards. The vertex data is
// EXT_meshopt_compression'd, so decoding it needs the same loader the game uses,
// hence a browser probe rather than a header parse.
//
//   window.measureArm(b64) -> { worldSize, nodeScale, axis, thinEnd, radius }
//
// `thinEnd` is the end of the longest axis whose outer slab has the smaller mean
// cross-section radius: the handle on every melee shape (blade tip is thin only
// in the plane, the grip is thin in BOTH cross-axes) and the muzzle on a gun.
window.measureArm = async (b64) => {
  const gltf = await parseGlb(b64);
  const payload = flattenWeaponScene(gltf.scene);
  payload.updateMatrixWorld(true);
  const nodeScale = payload.scale.x;
  const pts = [];
  payload.traverse((o) => {
    const g = o.geometry;
    if (!g?.attributes?.position) return;
    const pos = g.attributes.position;
    const step = Math.max(1, Math.ceil(pos.count / 24000));
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      pts.push(v.x, v.y, v.z);
    }
  });
  if (!pts.length) return null;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pts.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      if (pts[i + k] < lo[k]) lo[k] = pts[i + k];
      if (pts[i + k] > hi[k]) hi[k] = pts[i + k];
    }
  }
  const size = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  let axis = 0;
  if (size[1] > size[axis]) axis = 1;
  if (size[2] > size[axis]) axis = 2;
  const b = (axis + 1) % 3;
  const c = (axis + 2) % 3;
  const mid = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const slab = size[axis] * 0.16;
  let nMin = 0;
  let rMin = 0;
  let nMax = 0;
  let rMax = 0;
  for (let i = 0; i < pts.length; i += 3) {
    const a = pts[i + axis];
    const r = Math.hypot(pts[i + b] - mid[b], pts[i + c] - mid[c]);
    if (a <= lo[axis] + slab) {
      nMin++;
      rMin += r;
    } else if (a >= hi[axis] - slab) {
      nMax++;
      rMax += r;
    }
  }
  const meanMin = nMin ? rMin / nMin : 0;
  const meanMax = nMax ? rMax / nMax : 0;
  const r4 = (v) => Math.round(v * 10000) / 10000;
  return {
    worldSize: size.map(r4),
    nodeScale: r4(nodeScale),
    axis: ['x', 'y', 'z'][axis],
    thinEnd: meanMin <= meanMax ? 'min' : 'max',
    radius: { min: r4(meanMin), max: r4(meanMax), nMin, nMax },
  };
};

window.__ready = true;
