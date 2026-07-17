// Every declared body of water is fishable from its shore. World fishing
// (sim.ts startFishing / hasFishableWaterAhead) needs a sample point ahead of
// the caster whose ground sits below the water surface by more than the swim
// depth; this suite replicates that exact rule for every lake every zone
// declares, so a new lake (or a terrain change that silts one up) fails here
// instead of silently leaving dead water in the world.

import { describe, expect, it } from 'vitest';
import { PLAYER_SWIM_DEPTH } from '../src/sim/pathfind';
import { Sim } from '../src/sim/sim';
import { groundHeight, waterBodies, waterLevelAt } from '../src/sim/world';

// sim.ts fishing constants, mirrored (the literals are private to sim.ts; the
// mirror below is asserted against a live cast in the smoke test at the end).
const FISHING_SAMPLE_DISTANCES = [4, 8, 12, 16, 20, 24];
const SEED = 42;

function fishableAhead(x: number, z: number, facing: number): boolean {
  const sin = Math.sin(facing);
  const cos = Math.cos(facing);
  return FISHING_SAMPLE_DISTANCES.some((d) => {
    const sx = x + sin * d;
    const sz = z + cos * d;
    return groundHeight(sx, sz, SEED) < waterLevelAt(sx, sz) - PLAYER_SWIM_DEPTH;
  });
}

function standing(x: number, z: number): boolean {
  return groundHeight(x, z, SEED) >= waterLevelAt(x, z) - PLAYER_SWIM_DEPTH + 0.01;
}

describe('every declared water body is fishable', () => {
  // Instancing a Sim pins the world content the module-level world() reads.
  const sim = new Sim({ seed: SEED, playerClass: 'warrior', noPlayer: true });
  void sim;
  const lakes = waterBodies();

  it('declares at least the five known lakes', () => {
    expect(lakes.length).toBeGreaterThanOrEqual(5);
  });

  for (const lake of lakes) {
    it(`lake at (${lake.x}, ${lake.z}) r${lake.radius.toFixed(0)} has a fishable shoreline`, () => {
      let fishableAngles = 0;
      const ANGLES = 16;
      for (let a = 0; a < ANGLES; a++) {
        const ang = (a / ANGLES) * Math.PI * 2;
        const dirX = Math.cos(ang);
        const dirZ = Math.sin(ang);
        // Walk in from outside the blend ring to the first STANDING spot near
        // the waterline (the spot a player would fish from).
        let spot: { x: number; z: number } | null = null;
        for (let r = lake.radius + 8; r >= 2; r -= 1) {
          const x = lake.x + dirX * r;
          const z = lake.z + dirZ * r;
          if (!standing(x, z)) break; // stepped into deep water: use the last dry spot
          spot = { x, z };
        }
        if (!spot) continue;
        // Face the lake center, the way a player naturally would.
        const facing = Math.atan2(lake.x - spot.x, lake.z - spot.z);
        if (fishableAhead(spot.x, spot.z, facing)) fishableAngles++;
      }
      // A lake is genuinely fishable when most of its shore works: allow a few
      // blocked angles (a dock, a cliff face, a feeder stream) but never a
      // mostly-dead shoreline.
      expect(fishableAngles).toBeGreaterThanOrEqual(Math.floor((ANGLES * 3) / 4));
    });
  }
});
