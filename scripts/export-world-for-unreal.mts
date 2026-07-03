// export-world-for-unreal.mts — dumps the REAL Cryptic Realm world (terrain
// heightfield, roads, water, decorations, hubs, camps) from the sim's pure
// worldgen so the Unreal client can rebuild the exact same world.
//   npx tsx scripts/export-world-for-unreal.mts [seed] [outPath]
import { writeFileSync } from 'node:fs';
import {
  generateDecorations, roadDistance, terrainHeight, WATER_LEVEL, zoneBiomeAt,
} from '../src/sim/world';
import { CAMPS, PROPS, WORLD_MAX_X, WORLD_MAX_Z, WORLD_MIN_X, WORLD_MIN_Z, ZONES } from '../src/sim/data';

const seed = Number(process.argv[2] ?? 20061);
const out = process.argv[3] ?? 'C:/MoveWeight/cryptic-realm-unreal/world-export.json';

const STEP = 3; // meters between height samples
const nx = Math.floor((WORLD_MAX_X - WORLD_MIN_X) / STEP) + 1;
const nz = Math.floor((WORLD_MAX_Z - WORLD_MIN_Z) / STEP) + 1;

const heights: number[] = new Array(nx * nz);
const road: number[] = new Array(nx * nz); // 1 = on-road
for (let iz = 0; iz < nz; iz++) {
  const z = WORLD_MIN_Z + iz * STEP;
  for (let ix = 0; ix < nx; ix++) {
    const x = WORLD_MIN_X + ix * STEP;
    heights[iz * nx + ix] = Math.round(terrainHeight(x, z, seed) * 100) / 100;
    road[iz * nx + ix] = roadDistance(x, z) < 3.5 ? 1 : 0;
  }
}

const rowBiomes: string[] = [];
for (let iz = 0; iz < nz; iz++) {
  rowBiomes.push(zoneBiomeAt(WORLD_MIN_Z + iz * STEP));
}

const decorations = generateDecorations(seed).map((d) => ({
  k: d.kind, x: Math.round(d.x * 100) / 100, z: Math.round(d.z * 100) / 100,
  s: Math.round(d.scale * 100) / 100, b: d.biome,
}));

const world = {
  seed,
  step: STEP,
  minX: WORLD_MIN_X, maxX: WORLD_MAX_X, minZ: WORLD_MIN_Z, maxZ: WORLD_MAX_Z,
  nx, nz,
  waterLevel: WATER_LEVEL,
  rowBiomes,
  heights,
  road,
  zones: ZONES.map((zn) => ({
    name: zn.name, biome: zn.biome, zMin: zn.zMin, zMax: zn.zMax,
    hub: { x: zn.hub.x, z: zn.hub.z, radius: zn.hub.radius, name: (zn.hub as any).name ?? zn.name },
  })),
  camps: CAMPS.map((c) => ({ x: c.center.x, z: c.center.z, radius: c.radius })),
  decorations,
  // Real town: the structured PROPS layout the browser renderer draws. Each
  // building/prop maps to the same /models/props GLB the fork ships.
  props: {
    buildings: PROPS.buildings.map((b) => ({ kind: b.kind, x: b.x, z: b.z, w: b.w, d: b.d, rot: b.rot })),
    wells: PROPS.wells.map((w) => ({ x: w.x, z: w.z, r: w.r })),
    stalls: PROPS.stalls.map((s) => ({ x: s.x, z: s.z, rot: s.rot, r: s.r })),
    mines: PROPS.mines.map((m) => ({ x: m.x, z: m.z, rot: m.rot })),
    docks: PROPS.docks.map((d) => ({ x: d.x, z: d.z, rot: d.rot })),
    tents: PROPS.tents.map((t) => ({ x: t.x, z: t.z, rot: t.rot, scale: t.scale })),
    crates: PROPS.crates.map(([x, z]) => ({ x, z })),
    campfires: PROPS.campfires.map(([x, z]) => ({ x, z })),
  },
};

writeFileSync(out, JSON.stringify(world));
console.log(`world seed=${seed}: ${nx}x${nz} heights, ${decorations.length} decorations -> ${out}`);
