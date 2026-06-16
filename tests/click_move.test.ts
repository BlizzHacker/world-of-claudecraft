import { describe, expect, it } from 'vitest';
import { clickMoveStep, facingToward, manualMovementOverrides } from '../src/game/click_move';

const NO_INPUT = { forward: false, back: false, turnLeft: false, turnRight: false, strafeLeft: false, strafeRight: false, jump: false };

describe('click-to-move math (#95)', () => {
  it('walks forward and faces the destination while far away', () => {
    const step = clickMoveStep({ x: 0, z: 0 }, { x: 0, z: 10 }, 0.5);
    expect(step.forward).toBe(true);
    expect(step.arrived).toBe(false);
    expect(step.facing).toBeCloseTo(facingToward({ x: 0, z: 0 }, { x: 0, z: 10 }));
  });

  it('stops once within the stop distance (e.g. melee approach)', () => {
    const step = clickMoveStep({ x: 0, z: 0 }, { x: 0, z: 4 }, 5);
    expect(step.forward).toBe(false);
    expect(step.arrived).toBe(true);
  });

  it('faces +z and +x correctly (sim atan2(dx, dz) convention)', () => {
    expect(facingToward({ x: 0, z: 0 }, { x: 0, z: 1 })).toBeCloseTo(0); // due north
    expect(facingToward({ x: 0, z: 0 }, { x: 1, z: 0 })).toBeCloseTo(Math.PI / 2); // due east
  });

  it('manual movement input cancels click-to-move', () => {
    expect(manualMovementOverrides(NO_INPUT)).toBe(false);
    expect(manualMovementOverrides({ ...NO_INPUT, forward: true })).toBe(true);
    expect(manualMovementOverrides({ ...NO_INPUT, strafeLeft: true })).toBe(true);
    expect(manualMovementOverrides({ ...NO_INPUT, jump: true })).toBe(true);
  });
});
