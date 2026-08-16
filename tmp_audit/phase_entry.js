// Phase-sweep preview entry. Unlike renderViews (ONE mid-pose frame per clip,
// auto-refit camera), this samples several phases of each named clip through a
// SINGLE FIXED camera solved from the rest pose. A refit camera hides splayed
// arms (the bounding sphere grows, so the model shrinks to compensate); a fixed
// camera makes a kite silhouette obvious.
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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

function dispose(obj, scene) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose();
    }
  });
  scene.clear();
}

const YAWS = { front: 0, right: Math.PI / 2, back: Math.PI, left: -Math.PI / 2, hero: -Math.PI / 5 };

window.renderPhases = async (b64, opts = {}) => {
  const size = opts.size ?? 448;
  const phases = opts.phases ?? [0.0, 0.25, 0.5, 0.75];
  const yaws = opts.yaws ?? ['hero'];
  const gltf = await parseGlb(b64);
  const scene = new THREE.Scene();
  scene.add(makeLights());
  const obj = gltf.scene;
  scene.add(obj);

  const all = gltf.animations ?? [];
  const names = all.map((c) => c.name);
  const wantClips = (opts.clips ?? names).filter((n) => names.includes(n));

  // Fixed camera solved from the widest pose in the sweep, so every frame of
  // every clip shares one scale. Measure first, render second.
  obj.rotation.set(0, 0, 0);
  obj.updateMatrixWorld(true);
  const union = new THREE.Box3().setFromObject(obj);
  const mixer = new THREE.AnimationMixer(obj);
  for (const name of wantClips) {
    const clip = all.find((c) => c.name === name);
    if (!clip) continue;
    const action = mixer.clipAction(clip);
    action.reset().play();
    for (const p of phases) {
      mixer.setTime(Math.max(0.0001, clip.duration * p));
      obj.updateMatrixWorld(true);
      union.union(new THREE.Box3().setFromObject(obj));
    }
    action.stop();
  }
  const center = union.getCenter(new THREE.Vector3());
  const radius = union.getBoundingSphere(new THREE.Sphere()).radius || 1;
  const fov = 32;
  const dist = (radius / Math.sin((fov * Math.PI) / 360)) * 1.1;

  function shoot(yaw) {
    obj.rotation.set(0, yaw, 0);
    obj.updateMatrixWorld(true);
    const cam = new THREE.PerspectiveCamera(fov, 1, 0.01, 1000);
    cam.position.set(center.x, center.y + dist * 0.1, center.z + dist);
    cam.lookAt(center);
    renderer.setSize(size, size);
    renderer.setClearColor(0x1a1e26, 1);
    renderer.render(scene, cam);
    return renderer.domElement.toDataURL('image/png');
  }

  const shots = [];
  for (const name of wantClips) {
    const clip = all.find((c) => c.name === name);
    if (!clip) continue;
    const action = mixer.clipAction(clip);
    action.reset().play();
    for (let i = 0; i < phases.length; i++) {
      mixer.setTime(Math.max(0.0001, clip.duration * phases[i]));
      for (const yn of yaws) {
        const safe = name.replace(/[^a-zA-Z0-9_]+/g, '_');
        shots.push({
          name: `${safe}__p${i}__${yn}`,
          dataUrl: shoot(YAWS[yn] ?? YAWS.hero),
        });
      }
    }
    action.stop();
    mixer.uncacheClip(clip);
  }

  dispose(obj, scene);
  return { shots, clipNames: names };
};

window.__ready = true;
