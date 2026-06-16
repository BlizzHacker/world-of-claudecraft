// Ground quest sparkle objects — Meshy-generated GLBs matching Kenney/Quaternius props.

import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { loadGltf } from './assets/loader';
import { registerPreload } from './assets/preload';
import { GFX, surfaceMat } from './gfx';

/** Target max height after normalization (~sparkle anchor at 1.35). */
const TARGET_HEIGHT = 1.35;

const QUEST_OBJECT_URLS: Record<string, string> = {
  supply_crate: '/models/quest/supply_crate.glb',
  lost_caravan_goods: '/models/quest/lost_caravan_goods.glb',
  gravecaller_sigil: '/models/quest/gravecaller_sigil.glb',
  gravewyrm_sigil: '/models/quest/gravewyrm_sigil.glb',
  weathered_ledger_page: '/models/quest/weathered_ledger_page.glb',
  fen_muster_order: '/models/quest/weathered_ledger_page.glb',
  highwatch_summons: '/models/quest/weathered_ledger_page.glb',
  morthen_grimoire: '/models/quest/morthen_grimoire.glb',
  rusted_censer: '/models/quest/rusted_censer.glb',
  bastion_ward_stone: '/models/quest/bastion_ward_stone.glb',
  ogre_war_totem: '/models/quest/ogre_war_totem.glb',
  sanctum_key_shard: '/models/quest/sanctum_key_shard.glb',
};

const SCROLL_ITEM_IDS = new Set(['weathered_ledger_page', 'fen_muster_order', 'highwatch_summons']);

interface ScrollStyle {
  parchmentTint?: number;
  ribbon?: number;
  seal?: number;
  ink?: number;
  textLines?: number;
}

const SCROLL_STYLES: Record<string, ScrollStyle> = {
  weathered_ledger_page: { parchmentTint: 0xd4c4a0, ink: 0x3a2818, textLines: 4 },
  fen_muster_order: { parchmentTint: 0xddd0b0, ribbon: 0xc9a227, seal: 0xa02020, ink: 0x2a1800, textLines: 3 },
  highwatch_summons: { parchmentTint: 0xd8dce8, ribbon: 0x4a6a9a, seal: 0x607888, ink: 0x1a2840, textLines: 3 },
};

const ITEM_MAT_OVERRIDES: Record<string, { emissive?: number; emissiveIntensity?: number; color?: number }> = {
  gravecaller_sigil: { emissive: 0x6b3fa0, emissiveIntensity: 0.35 },
  gravewyrm_sigil: { emissive: 0x1a4060, emissiveIntensity: 0.45 },
  bastion_ward_stone: { emissive: 0x6b3fa0, emissiveIntensity: 0.3 },
  sanctum_key_shard: { emissive: 0x1a4060, emissiveIntensity: 0.5 },
  morthen_grimoire: { emissive: 0x3a1850, emissiveIntensity: 0.12 },
};

const gltfByUrl = new Map<string, GLTF>();
const preparedByItem = new Map<string, THREE.Group>();

if (typeof window !== 'undefined') {
  const urls = [...new Set(Object.values(QUEST_OBJECT_URLS))];
  for (const url of urls) {
    registerPreload(
      loadGltf(url).then((g) => { gltfByUrl.set(url, g); }).catch(() => undefined),
    );
  }
}

function matProps(color: number): Parameters<typeof surfaceMat>[0] {
  return { color, roughness: 0.9, metalness: 0.05, flatShading: !GFX.standardMaterials };
}

function decorateScroll(root: THREE.Object3D, itemId: string): void {
  const style = SCROLL_STYLES[itemId];
  if (!style) return;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const cx = box.getCenter(new THREE.Vector3());
  const yMid = box.min.y + size.y * 0.48;
  const zFace = box.max.z + size.z * 0.02;

  if (style.ribbon !== undefined) {
    const ribbon = new THREE.Mesh(
      new THREE.BoxGeometry(size.x * 0.78, size.y * 0.07, size.z * 0.12),
      surfaceMat(matProps(style.ribbon)),
    );
    ribbon.position.set(cx.x, yMid, zFace);
    root.add(ribbon);
  }

  if (style.seal !== undefined) {
    const r = size.y * 0.11;
    const seal = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r * 0.92, size.y * 0.045, 10),
      surfaceMat(matProps(style.seal)),
    );
    seal.rotation.x = Math.PI / 2;
    seal.position.set(box.max.x - size.x * 0.14, yMid - size.y * 0.05, zFace + size.z * 0.06);
    root.add(seal);
  }

  const lines = style.textLines ?? 3;
  const ink = style.ink ?? 0x2a2010;
  for (let i = 0; i < lines; i++) {
    const w = size.x * (0.42 - (i % 2) * 0.08);
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(w, size.y * 0.012, size.z * 0.025),
      surfaceMat(matProps(ink)),
    );
    line.position.set(cx.x - size.x * 0.04, box.min.y + size.y * (0.28 + i * 0.11), zFace);
    root.add(line);
  }

  if (itemId === 'weathered_ledger_page') {
    for (const dy of [0.18, 0.78]) {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(size.x * 0.9, size.y * 0.018, size.z * 0.02),
        surfaceMat(matProps(0x5a4030)),
      );
      edge.position.set(cx.x, box.min.y + size.y * dy, zFace);
      root.add(edge);
    }
  }
}

function convertMaterial(src: THREE.Material, itemId: string): THREE.Material {
  const s = src as THREE.MeshStandardMaterial;
  const ov = ITEM_MAT_OVERRIDES[itemId];
  const scrollTint = SCROLL_STYLES[itemId]?.parchmentTint;
  const baseColor = ov?.color ?? scrollTint ?? (s.color?.getHex() ?? 0xffffff);
  const color = new THREE.Color(baseColor);
  if (scrollTint !== undefined && s.map) {
    color.lerp(new THREE.Color(scrollTint), 0.35);
  }
  return surfaceMat({
    color: color.getHex(),
    map: s.map ?? undefined,
    normalMap: s.normalMap ?? undefined,
    roughnessMap: s.roughnessMap ?? undefined,
    roughness: s.roughness ?? 0.88,
    metalness: Math.min(s.metalness ?? 0, 0.75),
    emissive: ov?.emissive,
    emissiveIntensity: ov?.emissiveIntensity,
    flatShading: !GFX.standardMaterials,
  });
}

function normalizeRoot(root: THREE.Object3D): number {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const scale = TARGET_HEIGHT / maxDim;
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  return box.max.y;
}

function prepareItem(itemId: string): THREE.Group | null {
  const cached = preparedByItem.get(itemId);
  if (cached) return cached;
  const url = QUEST_OBJECT_URLS[itemId];
  if (!url) return null;
  const gltf = gltfByUrl.get(url);
  if (!gltf) return null;

  const root = gltf.scene.clone(true);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = convertMaterial(mesh.material as THREE.Material, itemId);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  normalizeRoot(root);
  if (SCROLL_ITEM_IDS.has(itemId)) decorateScroll(root, itemId);
  preparedByItem.set(itemId, root);
  return root;
}

export function buildGroundQuestObject(itemId: string, entityId: number): { group: THREE.Group; height: number } {
  const group = new THREE.Group();
  const key = QUEST_OBJECT_URLS[itemId] ? itemId : 'supply_crate';
  const template = prepareItem(key);
  if (template) {
    const model = template.clone(true);
    group.add(model);
    group.rotation.y = (entityId % 7) * 0.45;
    return { group, height: TARGET_HEIGHT };
  }
  group.rotation.y = (entityId % 7) * 0.45;
  return { group, height: TARGET_HEIGHT };
}
