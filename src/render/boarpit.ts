// The Boarpit: render dressing for the knockout-brawl stake ring north-east
// of Eastbrook. Modeled on derby_track.ts (built once in the renderer ctor,
// distance-culled by update(), meshes seated on terrainHeight()). All
// positions come from src/sim/boarpit_layout.ts, the single source the
// terrain flatten and colliders also read, so the stakes you see are exactly
// the stakes fighters bounce off.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BOARPIT_CENTER,
  PIT_GATE_ANGLE,
  PIT_GATE_HALF_ANGLE,
  PIT_MASTER_POS,
  PIT_R,
  PIT_TORCHES,
} from '../sim/boarpit_layout';
import { hash2 } from '../sim/rng';
import { terrainHeight } from '../sim/world';

export const BOARPIT_VIEW = {
  x: BOARPIT_CENTER.x,
  z: BOARPIT_CENTER.z,
  cullRadius: 260,
} as const;

const VISUAL_LIFT = 0.05;
const WOOD_DARK = 0x6b4a2c;
const WOOD_MID = 0x8a6238;
const EARTH = 0x5a4632;
const EMBER = 0xff9a3c;

export interface BoarpitView {
  group: THREE.Group;
  update(px: number, pz: number, dt: number): void;
}

function coloredBox(
  bag: THREE.BufferGeometry[],
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  yaw: number,
  color: number,
): void {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.rotateY(yaw);
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

export function buildBoarpit(seed: number): BoarpitView {
  const group = new THREE.Group();
  group.name = 'boarpit';
  const th = (x: number, z: number): number => terrainHeight(x, z, seed) + VISUAL_LIFT;
  const padY = th(BOARPIT_CENTER.x, BOARPIT_CENTER.z);

  const bag: THREE.BufferGeometry[] = [];

  // stamped-earth fighting floor
  const floor = new THREE.CircleGeometry(PIT_R - 0.2, 28);
  floor.rotateX(-Math.PI / 2);
  floor.translate(BOARPIT_CENTER.x, padY + 0.02, BOARPIT_CENTER.z);
  {
    const c = new THREE.Color(EARTH);
    const count = floor.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    floor.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    bag.push(floor);
  }

  // stake ring: individual sharpened posts, skipping the south gate arc
  const STAKES = 36;
  for (let i = 0; i < STAKES; i++) {
    const ang = (i / STAKES) * Math.PI * 2;
    let delta = ang - PIT_GATE_ANGLE;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    if (Math.abs(delta) <= PIT_GATE_HALF_ANGLE) continue;
    const x = BOARPIT_CENTER.x + Math.sin(ang) * PIT_R;
    const z = BOARPIT_CENTER.z + Math.cos(ang) * PIT_R;
    const jitter = (hash2(i, 3, seed) - 0.5) * 0.25;
    const h = 1.5 + jitter;
    coloredBox(
      bag,
      0.26,
      h,
      0.26,
      x,
      padY + h / 2,
      z,
      ang,
      hash2(i, 5, seed) < 0.5 ? WOOD_DARK : WOOD_MID,
    );
  }

  // gate posts, twice the stake height, flanking the opening
  for (const side of [-1, 1]) {
    const ang = PIT_GATE_ANGLE + side * (PIT_GATE_HALF_ANGLE + 0.06);
    const x = BOARPIT_CENTER.x + Math.sin(ang) * PIT_R;
    const z = BOARPIT_CENTER.z + Math.cos(ang) * PIT_R;
    coloredBox(bag, 0.4, 3.0, 0.4, x, padY + 1.5, z, ang, WOOD_DARK);
  }

  // the Pit Master's signing table
  coloredBox(
    bag,
    1.8,
    0.9,
    0.8,
    PIT_MASTER_POS.x + 1.6,
    th(PIT_MASTER_POS.x + 1.6, PIT_MASTER_POS.z) + 0.45,
    PIT_MASTER_POS.z,
    0,
    WOOD_MID,
  );

  const merged = mergeGeometries(bag, false);
  if (merged) {
    const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // torch posts with an emissive ember tip (no dynamic light: the pit stays
  // inside the renderer's existing light budget)
  for (const torch of PIT_TORCHES) {
    const ty = th(torch.x, torch.z);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.11, 2.2, 6),
      new THREE.MeshLambertMaterial({ color: WOOD_DARK }),
    );
    pole.position.set(torch.x, ty + 1.1, torch.z);
    group.add(pole);
    const ember = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshBasicMaterial({ color: EMBER }),
    );
    ember.position.set(torch.x, ty + 2.3, torch.z);
    group.add(ember);
  }

  return {
    group,
    update(px: number, pz: number, _dt: number): void {
      const dx = px - BOARPIT_VIEW.x;
      const dz = pz - BOARPIT_VIEW.z;
      group.visible = dx * dx + dz * dz < BOARPIT_VIEW.cullRadius * BOARPIT_VIEW.cullRadius;
    },
  };
}
