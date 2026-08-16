// Browser-side entry for the appearance-mask proof renders (bundled by
// appearance_mask_proof.mjs, the preview.mjs pattern). Imports the REAL
// client hook (src/render/characters/override_appearance.ts), so what these
// frames show is byte-for-byte the shader the game ships, not a lookalike.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  attachAppearanceMaskTint,
  setAppearanceTintColors,
} from '../../src/render/characters/override_appearance';

function b64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function loadMaskTexture(maskB64) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      `data:image/png;base64,${maskB64}`,
      (tex) => {
        // Match the client loader: GLB atlas convention (no flip), data space.
        tex.flipY = false;
        tex.colorSpace = THREE.NoColorSpace;
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
}

/**
 * Render base + per-appearance frames of a body with its mask.
 * opts.appearances: [{name, app}] where app carries the ModularAppearance
 * hair/skin HSL fields. Views: full front, head closeup front, head back.
 * Returns [{name, dataUrl}].
 */
window.renderTintProof = async (glbB64, maskB64, opts) => {
  const size = opts.size ?? 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a2d36);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.4));
  const d1 = new THREE.DirectionalLight(0xffffff, 1.6);
  d1.position.set(3, 5, 4);
  scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.8);
  d2.position.set(-3, 3, -4);
  scene.add(d2);

  const gltf = await new GLTFLoader().parseAsync(b64ToArrayBuffer(glbB64), '');
  const model = gltf.scene;
  // Normalize to height 2, feet at y=0, centered.
  const box = new THREE.Box3().setFromObject(model);
  const sizeV = box.getSize(new THREE.Vector3());
  const scale = 2 / (sizeV.y || 1);
  const wrap = new THREE.Group();
  wrap.add(model);
  model.position.set(
    -(box.min.x + sizeV.x / 2) * 1,
    -box.min.y,
    -(box.min.z + sizeV.z / 2) * 1,
  );
  wrap.scale.setScalar(scale);
  scene.add(wrap);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 50);
  const views = {
    full: () => {
      camera.position.set(0, 1.05, 3.4);
      camera.lookAt(0, 0.95, 0);
    },
    head: () => {
      camera.position.set(0, 1.72, 1.05);
      camera.lookAt(0, 1.68, 0);
    },
    headback: () => {
      camera.position.set(0, 1.74, -1.05);
      camera.lookAt(0, 1.68, 0);
    },
    headside: () => {
      camera.position.set(1.0, 1.72, 0.25);
      camera.lookAt(0, 1.68, 0);
    },
  };

  const shots = [];
  const snap = (label) => {
    for (const [view, place] of Object.entries(views)) {
      place();
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      shots.push({ name: `${label}_${view}`, dataUrl: canvas.toDataURL('image/png') });
    }
  };

  snap('base');

  if (maskB64) {
    const maskTex = await loadMaskTexture(maskB64);
    const first = opts.appearances[0].app;
    const spec = {
      maskUrl: 'proof-inline',
      mask: { value: maskTex },
      hairHex: 0xffffff,
      skinHex: 0xffffff,
    };
    window.__hookRan = 0;
    window.__fragHasMask = false;
    model.traverse((o) => {
      if (o.isMesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          attachAppearanceMaskTint(m, spec);
          // Diagnostic shim: prove the compile hook actually runs and that
          // the injected sampler survived into the final fragment source.
          const obc = m.onBeforeCompile;
          if (typeof obc === 'function') {
            m.onBeforeCompile = (s, r) => {
              window.__hookRan++;
              obc.call(m, s, r);
              if (s.fragmentShader.includes('uCrApMask')) window.__fragHasMask = true;
              const at = s.fragmentShader.indexOf('crApHairW');
              console.warn(
                `[proof] blendInjected=${at >= 0} ctx=${
                  at >= 0 ? s.fragmentShader.slice(at - 120, at + 60).replace(/\n/g, ' | ') : 'ABSENT'
                }`,
              );
            };
          }
        }
      }
    });
    for (const { name, app } of opts.appearances) {
      setAppearanceTintColors(model, app);
      snap(name);
    }
    console.warn(`[proof] hookRan=${window.__hookRan} fragHasMask=${window.__fragHasMask}`);
    // Diagnostics: decoded mask content + UV alignment. The maskviz frames
    // draw the mask AS the body texture: red must land on hair, green on the
    // face, black everywhere else.
    {
      const c2 = document.createElement('canvas');
      c2.width = maskTex.image.width;
      c2.height = maskTex.image.height;
      const ctx = c2.getContext('2d');
      ctx.drawImage(maskTex.image, 0, 0);
      const data = ctx.getImageData(0, 0, c2.width, c2.height).data;
      let r = 0;
      let g = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 128) r++;
        if (data[i + 1] > 128) g++;
      }
      console.warn(`[proof] mask decoded ${c2.width}x${c2.height} hairTexels=${r} faceTexels=${g}`);
      model.traverse((o) => {
        if (o.isMesh) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            m.map = maskTex;
            m.needsUpdate = true;
          }
        }
      });
      snap('maskviz');
    }
  }
  renderer.dispose();
  return shots;
};

window.__ready = true;
