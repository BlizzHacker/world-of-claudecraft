// The Thornwheel Circuit: render dressing for the Derby kart ground on the
// east bluffs of Eastbrook Vale. Modeled on vale_cup_stadium.ts (built once in
// the renderer ctor, distance-culled by update(), every mesh seated on
// terrainHeight() so the sim heightfield stays authoritative). All positions
// come from src/sim/derby_layout.ts, the single source the terrain flatten,
// colliders, and race checkpoints also read, so what you see is exactly what
// the karts bank off.
//
// Dressing: a packed-cinder racing ribbon, timber sleeper fences on the
// collider runs, a checkered start gate over the start line, numbered
// checkpoint pennant poles (the racer's NEXT ring pulses), and the winners'
// podium by the paddock gate. Fully procedural: no GLB dependency, so the
// module adds nothing to the boot preload gate.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  DERBY_FLAG_POLES,
  DERBY_GATE,
  MARSHAL_POS,
  PODIUM_POS,
  THORNWHEEL_CENTER,
  TRACK_HALF_W,
  TRACK_INFIELD,
  TRACK_OUTER,
} from '../sim/derby_layout';
import { hash2 } from '../sim/rng';
import { terrainHeight } from '../sim/world';
import type { DerbyInfo } from '../world_api/derby';
import { GFX } from './gfx';

export const DERBY_TRACK = {
  x: THORNWHEEL_CENTER.x,
  z: THORNWHEEL_CENTER.z,
  cullRadius: 300,
} as const;

const VISUAL_LIFT = 0.05;

// palette (Lambert-safe, the stadium rule)
const WOOD_A = 0x9b7748;
const WOOD_B = 0x7a5a36;
const CINDER = 0x4a4038;
const CHALK = 0xe8e2d4;
const POST_RED = 0xa33c2a;

export interface DerbyTrackView {
  group: THREE.Group;
  update(px: number, pz: number, dt: number, derby: DerbyInfo | null): void;
}

interface Bag {
  geos: THREE.BufferGeometry[];
}

function addBox(
  bag: Bag,
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
  bag.geos.push(geo);
}

function bagMesh(bag: Bag, material: THREE.Material): THREE.Mesh | null {
  if (bag.geos.length === 0) return null;
  const merged = mergeGeometries(bag.geos, false);
  if (!merged) return null;
  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

// A small numbered pennant texture (procedural CanvasTexture, flags precedent).
function pennantTexture(n: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 48;
  const g = canvas.getContext('2d');
  if (g) {
    g.fillStyle = '#a33c2a';
    g.fillRect(0, 0, 64, 48);
    g.fillStyle = '#e8e2d4';
    g.font = 'bold 30px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), 32, 26);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// The checkered start banner.
function checkerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 24;
  const g = canvas.getContext('2d');
  if (g) {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 16; x++) {
        g.fillStyle = (x + y) % 2 === 0 ? '#111111' : '#f2f2f2';
        g.fillRect(x * 6, y * 6, 6, 6);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildDerbyTrack(seed: number): DerbyTrackView {
  const group = new THREE.Group();
  group.name = 'thornwheel-circuit';
  const rich = GFX.standardMaterials;

  const th = (x: number, z: number): number => terrainHeight(x, z, seed) + VISUAL_LIFT;
  const padY = th(THORNWHEEL_CENTER.x, THORNWHEEL_CENTER.z);

  const structure: Bag = { geos: [] };
  const surface: Bag = { geos: [] };
  const chalk: Bag = { geos: [] };

  // ---- racing ribbon: four flat cinder straights joining at the corners
  // (the flatten makes the ground level, so plain thin boxes read as a laid
  // surface; corners are covered by overlapping the runs). -------------------
  const o = TRACK_OUTER;
  const i = TRACK_INFIELD;
  const ribbonY = padY + 0.015;
  // west + east ribbons, full depth
  for (const rx of [
    (o.xMin + i.xMin) / 2, // west ribbon center
    (o.xMax + i.xMax) / 2, // east ribbon center
  ]) {
    addBox(
      surface,
      TRACK_HALF_W * 2,
      0.03,
      o.zMax - o.zMin,
      rx,
      ribbonY,
      (o.zMin + o.zMax) / 2,
      0,
      CINDER,
    );
  }
  // north + south ribbons, spanning between the side ribbons
  for (const rz of [(o.zMin + i.zMin) / 2, (o.zMax + i.zMax) / 2]) {
    addBox(
      surface,
      o.xMax - o.xMin,
      0.03,
      TRACK_HALF_W * 2,
      (o.xMin + o.xMax) / 2,
      ribbonY,
      rz,
      0,
      CINDER,
    );
  }

  // ---- start/finish chalk line across the west ribbon ----------------------
  addBox(chalk, TRACK_HALF_W * 2, 0.032, 0.5, (o.xMin + i.xMin) / 2, ribbonY + 0.01, 32, 0, CHALK);

  // ---- sleeper fences on the collider runs (outer ring with the gate gap,
  // infield ring closed): staggered planks + posts, the Sowfield board look. --
  const fenceRuns: { x1: number; z1: number; x2: number; z2: number }[] = [
    // west outer, gapped at the gate
    { x1: o.xMin, z1: o.zMin, x2: o.xMin, z2: DERBY_GATE.z - DERBY_GATE.halfW },
    { x1: o.xMin, z1: DERBY_GATE.z + DERBY_GATE.halfW, x2: o.xMin, z2: o.zMax },
    // east / north / south outer
    { x1: o.xMax, z1: o.zMin, x2: o.xMax, z2: o.zMax },
    { x1: o.xMin, z1: o.zMin, x2: o.xMax, z2: o.zMin },
    { x1: o.xMin, z1: o.zMax, x2: o.xMax, z2: o.zMax },
    // infield ring
    { x1: i.xMin, z1: i.zMin, x2: i.xMin, z2: i.zMax },
    { x1: i.xMax, z1: i.zMin, x2: i.xMax, z2: i.zMax },
    { x1: i.xMin, z1: i.zMin, x2: i.xMax, z2: i.zMin },
    { x1: i.xMin, z1: i.zMax, x2: i.xMax, z2: i.zMax },
  ];
  let salt = 0;
  const FENCE_H = 1.1;
  for (const run of fenceRuns) {
    const dx = run.x2 - run.x1;
    const dz = run.z2 - run.z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.5) continue;
    const ux = dx / len;
    const uz = dz / len;
    const yaw = Math.atan2(ux, uz);
    // two horizontal rails
    for (const railY of [0.45, 0.95]) {
      addBox(
        structure,
        0.16,
        0.14,
        len,
        (run.x1 + run.x2) / 2,
        padY + railY,
        (run.z1 + run.z2) / 2,
        yaw,
        WOOD_A,
      );
    }
    // posts every ~2.8yd
    const posts = Math.max(2, Math.round(len / 2.8) + 1);
    for (let p = 0; p < posts; p++) {
      salt++;
      const t = p / (posts - 1);
      const px = run.x1 + ux * len * t;
      const pz = run.z1 + uz * len * t;
      const jitter = (hash2(salt, 7, seed) - 0.5) * 0.08;
      addBox(
        structure,
        0.24,
        FENCE_H + jitter,
        0.24,
        px,
        padY + (FENCE_H + jitter) / 2,
        pz,
        yaw,
        WOOD_B,
      );
    }
  }

  // ---- start gate: two tall posts + checkered banner over the west ribbon --
  const gateX = (o.xMin + i.xMin) / 2;
  const gatePostH = 4.2;
  for (const gz of [32 - TRACK_HALF_W - 0.6, 32 + TRACK_HALF_W + 0.6]) {
    addBox(structure, 0.34, gatePostH, 0.34, gateX, padY + gatePostH / 2, gz, 0, POST_RED);
  }
  const structureMesh = bagMesh(
    structure,
    rich
      ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })
      : new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  if (structureMesh) group.add(structureMesh);
  const surfaceMesh = bagMesh(
    surface,
    rich
      ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0 })
      : new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  if (surfaceMesh) group.add(surfaceMesh);
  const chalkMesh = bagMesh(chalk, new THREE.MeshBasicMaterial({ vertexColors: true }));
  if (chalkMesh) group.add(chalkMesh);

  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(TRACK_HALF_W * 2 + 1.2, 0.9),
    new THREE.MeshBasicMaterial({ map: checkerTexture(), side: THREE.DoubleSide }),
  );
  banner.position.set(gateX, padY + gatePostH - 0.5, 32);
  banner.rotation.y = Math.PI / 2;
  group.add(banner);

  // ---- checkpoint pennant poles (index 0 is the start line itself; poles
  // stand on the outer shoulder per DERBY_FLAG_POLES). The racer's NEXT ring
  // pulses via update(). -----------------------------------------------------
  const pennants: THREE.Mesh[] = [];
  for (let n = 0; n < DERBY_FLAG_POLES.length; n++) {
    const pole = DERBY_FLAG_POLES[n];
    const poleH = 3.2;
    const poleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, poleH, 6),
      new THREE.MeshLambertMaterial({ color: WOOD_B }),
    );
    const py = th(pole.x, pole.z);
    poleMesh.position.set(pole.x, py + poleH / 2, pole.z);
    group.add(poleMesh);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.8),
      new THREE.MeshBasicMaterial({
        map: pennantTexture(n),
        side: THREE.DoubleSide,
        transparent: false,
      }),
    );
    flag.position.set(pole.x, py + poleH - 0.5, pole.z);
    // face the track center so the number reads from the groove
    flag.lookAt(THORNWHEEL_CENTER.x, py + poleH - 0.5, THORNWHEEL_CENTER.z);
    flag.userData.cpIndex = n;
    group.add(flag);
    pennants.push(flag);
  }

  // ---- the winners' podium (three steps) by the paddock gate ---------------
  const podium: Bag = { geos: [] };
  const podY = th(PODIUM_POS.x, PODIUM_POS.z);
  addBox(podium, 1.2, 0.9, 1.2, PODIUM_POS.x, podY + 0.45, PODIUM_POS.z, 0, WOOD_A);
  addBox(podium, 1.2, 0.6, 1.2, PODIUM_POS.x - 1.2, podY + 0.3, PODIUM_POS.z, 0, WOOD_B);
  addBox(podium, 1.2, 0.4, 1.2, PODIUM_POS.x + 1.2, podY + 0.2, PODIUM_POS.z, 0, WOOD_B);
  // the Marshal's stand rail
  addBox(
    podium,
    1.6,
    1.0,
    0.2,
    MARSHAL_POS.x,
    th(MARSHAL_POS.x, MARSHAL_POS.z) + 0.5,
    MARSHAL_POS.z + 1.2,
    0,
    WOOD_A,
  );
  const podiumMesh = bagMesh(podium, new THREE.MeshLambertMaterial({ vertexColors: true }));
  if (podiumMesh) group.add(podiumMesh);

  let pulse = 0;
  return {
    group,
    update(px: number, pz: number, dt: number, derby: DerbyInfo | null): void {
      const dx = px - DERBY_TRACK.x;
      const dz = pz - DERBY_TRACK.z;
      const visible = dx * dx + dz * dz < DERBY_TRACK.cullRadius * DERBY_TRACK.cullRadius;
      group.visible = visible;
      if (!visible) return;
      pulse += dt;
      const nextCp =
        derby?.race?.mySeat && derby.race.phase === 'racing'
          ? (derby.race.racers.find((r) => r.me)?.cp ?? null)
          : null;
      for (const flag of pennants) {
        const mine = nextCp !== null && flag.userData.cpIndex === nextCp;
        const s = mine ? 1.25 + Math.sin(pulse * 6) * 0.15 : 1;
        flag.scale.setScalar(s);
      }
    },
  };
}
