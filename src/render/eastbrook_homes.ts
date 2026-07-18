// Eastbrook Homes: render dressing for Homestead Lane (premium housing).
// Static parts (lane, foundations, sale boards, the Realtor's stand) build
// once from src/sim/homes_layout.ts; the cottages are DYNAMIC, appearing on a
// lot when homesInfo reports an owner. homesInfo is proximity-gated, so the
// last non-null readout is cached: walking away never demolishes a cottage
// that was already seen.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HOME_LOTS, HOMES_CENTER, REALTOR_POS } from '../sim/homes_layout';
import { terrainHeight } from '../sim/world';
import type { HomesInfo } from '../world_api/homes';

export const HOMES_VIEW = {
  x: HOMES_CENTER.x,
  z: HOMES_CENTER.z,
  cullRadius: 260,
} as const;

const VISUAL_LIFT = 0.05;
const WOOD = 0x8a6238;
const WALL = 0xd8cbb2;
const ROOF = 0x9c3d2e;
const BOARD = 0xc9a14a;

export interface EastbrookHomesView {
  group: THREE.Group;
  update(px: number, pz: number, dt: number, homes: HomesInfo | null): void;
}

function box(
  bag: THREE.BufferGeometry[],
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: number,
): void {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x, y, z);
  const c = new THREE.Color(color);
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  bag.push(geo);
}

export function buildEastbrookHomes(seed: number): EastbrookHomesView {
  const group = new THREE.Group();
  group.name = 'eastbrook-homes';
  const th = (x: number, z: number): number => terrainHeight(x, z, seed) + VISUAL_LIFT;

  // ---- static: foundations, sale boards, the Realtor's stand --------------
  const staticBag: THREE.BufferGeometry[] = [];
  for (const lot of HOME_LOTS) {
    const cx = (lot.rect.xMin + lot.rect.xMax) / 2;
    const cz = (lot.rect.zMin + lot.rect.zMax) / 2;
    const y = th(cx, cz);
    box(
      staticBag,
      lot.rect.xMax - lot.rect.xMin,
      0.35,
      lot.rect.zMax - lot.rect.zMin,
      cx,
      y + 0.17,
      cz,
      WOOD,
    );
    // sale-board post by the door (the board face is dynamic, below)
    box(staticBag, 0.16, 1.5, 0.16, lot.door.x - 1.6, y + 0.75, lot.door.z, WOOD);
  }
  box(
    staticBag,
    1.6,
    1.0,
    0.9,
    REALTOR_POS.x + 1.4,
    th(REALTOR_POS.x + 1.4, REALTOR_POS.z) + 0.5,
    REALTOR_POS.z,
    BOARD,
  );
  const staticMerged = mergeGeometries(staticBag, false);
  if (staticMerged) {
    const mesh = new THREE.Mesh(
      staticMerged,
      new THREE.MeshLambertMaterial({ vertexColors: true }),
    );
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // ---- dynamic: one cottage + one sale board face per lot ------------------
  const cottages = new Map<string, THREE.Group>();
  const saleBoards = new Map<string, THREE.Mesh>();
  for (const lot of HOME_LOTS) {
    const cx = (lot.rect.xMin + lot.rect.xMax) / 2;
    const cz = (lot.rect.zMin + lot.rect.zMax) / 2;
    const y = th(cx, cz);
    const w = lot.rect.xMax - lot.rect.xMin - 0.6;
    const d = lot.rect.zMax - lot.rect.zMin - 0.6;

    const cottage = new THREE.Group();
    const bag: THREE.BufferGeometry[] = [];
    box(bag, w, 2.4, d, cx, y + 0.35 + 1.2, cz, WALL);
    // gabled roof, boxes stepped inward
    box(bag, w + 0.5, 0.5, d + 0.5, cx, y + 2.95, cz, ROOF);
    box(bag, w * 0.6, 0.5, d + 0.5, cx, y + 3.4, cz, ROOF);
    box(bag, w * 0.25, 0.45, d + 0.5, cx, y + 3.82, cz, ROOF);
    // door on the lane side
    box(bag, 0.9, 1.6, 0.12, lot.door.x, y + 0.35 + 0.8, lot.rect.zMax + 0.02, WOOD);
    const merged = mergeGeometries(bag, false);
    if (merged) {
      const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true }));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      cottage.add(mesh);
    }
    cottage.visible = false;
    group.add(cottage);
    cottages.set(lot.id, cottage);

    const boardMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.6, 0.08),
      new THREE.MeshLambertMaterial({ color: BOARD }),
    );
    boardMesh.position.set(lot.door.x - 1.6, y + 1.35, lot.door.z);
    group.add(boardMesh);
    saleBoards.set(lot.id, boardMesh);
  }

  let lastHomes: HomesInfo | null = null;
  return {
    group,
    update(px: number, pz: number, _dt: number, homes: HomesInfo | null): void {
      if (homes) lastHomes = homes;
      const dx = px - HOMES_VIEW.x;
      const dz = pz - HOMES_VIEW.z;
      group.visible = dx * dx + dz * dz < HOMES_VIEW.cullRadius * HOMES_VIEW.cullRadius;
      if (!group.visible || !lastHomes) return;
      for (const lotView of lastHomes.lots) {
        const owned = lotView.owner !== '';
        const cottage = cottages.get(lotView.id);
        if (cottage) cottage.visible = owned;
        const boardMesh = saleBoards.get(lotView.id);
        if (boardMesh) boardMesh.visible = !owned;
      }
    },
  };
}
