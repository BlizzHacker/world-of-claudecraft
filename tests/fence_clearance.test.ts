import { describe, expect, it } from 'vitest';
import { FENCE_HALF_DEPTH as COLLIDER_FENCE_HALF_DEPTH } from '../src/sim/colliders';
import { BUILTIN_WORLD, getActiveWorldContent } from '../src/sim/data';
import {
  FENCE_FOOTPRINT_BODY_CLEARANCE,
  FENCE_HALF_DEPTH,
  footprintCrossesAnyFenceRun,
  footprintCrossesFenceRun,
} from '../src/sim/fence_clearance';
import { PLAYER_BODY_RADIUS } from '../src/sim/pathfind';

describe('fence clearance leaf', () => {
  it('mirrors the collider fence half-depth and the player body radius', () => {
    // The leaf stays import-free (data.ts consumes it and colliders.ts imports
    // data.ts), so its constants MIRROR their homes; this is the drift pin.
    expect(FENCE_HALF_DEPTH).toBe(COLLIDER_FENCE_HALF_DEPTH);
    expect(FENCE_FOOTPRINT_BODY_CLEARANCE).toBe(PLAYER_BODY_RADIUS);
  });

  it('detects a footprint reaching a fence run, respecting rotation and width', () => {
    // Fence along x = 10, z 0..10. A 4x4 box centred at (13, 5) keeps its
    // nearest face at x = 11: clear of the rail band plus body clearance...
    const fence = { x1: 10, z1: 0, x2: 10, z2: 10 };
    expect(footprintCrossesFenceRun({ x: 13, z: 5, w: 4, d: 4, rot: 0 }, fence)).toBe(false);
    // ...but scaled 1.5x (6x6, face at x = 10) it reaches the line itself.
    expect(footprintCrossesFenceRun({ x: 13, z: 5, w: 6, d: 6, rot: 0 }, fence)).toBe(true);
    // A face inside the rail-plus-body band (gap under 0.85) crosses too.
    expect(footprintCrossesFenceRun({ x: 13, z: 5, w: 4.6, d: 4.6, rot: 0 }, fence)).toBe(true);
    // Rotation matters: the 6x2 box misses the fence side-on, hits it end-on.
    expect(footprintCrossesFenceRun({ x: 13, z: 5, w: 6, d: 2, rot: 0 }, fence)).toBe(true);
    expect(footprintCrossesFenceRun({ x: 13, z: 5, w: 6, d: 2, rot: Math.PI / 2 }, fence)).toBe(
      false,
    );
    // A wide fence (width) grows the band it protects.
    expect(
      footprintCrossesFenceRun({ x: 13, z: 5, w: 4, d: 4, rot: 0 }, { ...fence, width: 3 }),
    ).toBe(true);
    // Beyond the run's endpoints there is no fence to cross.
    expect(footprintCrossesFenceRun({ x: 10, z: 20, w: 4, d: 4, rot: 0 }, fence)).toBe(false);
    expect(
      footprintCrossesAnyFenceRun({ x: 13, z: 5, w: 6, d: 6, rot: 0 }, [
        { x1: -50, z1: 0, x2: -50, z2: 10 },
        fence,
      ]),
    ).toBe(true);
  });

  it('keeps every themed builtin building clear of every authored fence run', () => {
    // The integration ruling behind themeWorldForRealm's fallback: no building
    // the theme actually moved or grew may reach a fence run. A building the
    // fallback kept authored (identity with the base record) is exempt: its
    // yard was authored around that exact footprint. tests/pathfind.test.ts
    // proves the movement side; this pins the data side for EVERY building,
    // not just the ones a fence walk happens to hit.
    const themed = getActiveWorldContent().props.buildings;
    const base = BUILTIN_WORLD.props.buildings;
    expect(themed).toHaveLength(base.length);
    let themedCount = 0;
    for (let i = 0; i < themed.length; i++) {
      if (themed[i] === base[i]) continue; // authored/fallback record, untouched
      themedCount++;
      expect(
        footprintCrossesAnyFenceRun(themed[i], BUILTIN_WORLD.props.fences),
        `themed building ${themed[i].id ?? themed[i].kind}@(${themed[i].x},${themed[i].z})`,
      ).toBe(false);
    }
    // Vacuity floor: the default realm ships a worldTheme, so the walk above
    // must have checked a real themed population.
    expect(themedCount).toBeGreaterThan(10);
  });
});
