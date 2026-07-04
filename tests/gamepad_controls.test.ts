import { describe, expect, it } from 'vitest';
import {
  AXIS,
  GP,
  risingEdges,
  stickToLook,
  stickToMoveFlags,
} from '../src/game/gamepad_map';

// v0.20 rewrote the gamepad consumer into GamepadManager (side effects) plus the
// pure math core in gamepad_map.ts. These tests pin the deterministic core that
// the old moveInputFromGamepad/mountGamepadControls bridge used to wrap.

const DZ = 0.18;

describe('gamepad movement mapping', () => {
  it('maps the left stick into 8-way movement flags (up = forward)', () => {
    const move = stickToMoveFlags(0.85, -0.92, DZ);
    expect(move).toMatchObject({
      forward: true,
      back: false,
      strafeLeft: false,
      strafeRight: true,
    });
  });

  it('returns no movement inside the deadzone', () => {
    const move = stickToMoveFlags(0.05, -0.05, DZ);
    expect(move).toMatchObject({
      forward: false,
      back: false,
      strafeLeft: false,
      strafeRight: false,
    });
  });
});

describe('gamepad camera look', () => {
  it('turns the camera from the right stick and returns zero in the deadzone', () => {
    const look = stickToLook(0.5, -1, DZ, 2.4, false, 0.032);
    // Pushing the right stick right yields a negative yaw delta (turn right).
    expect(look.yaw).toBeLessThan(0);
    expect(look.pitch).not.toBe(0);

    const still = stickToLook(0, 0, DZ, 2.4, false, 0.032);
    expect(still).toEqual({ yaw: 0, pitch: 0 });
  });

  it('exposes the standard axis and button index tables', () => {
    expect(AXIS.LEFT_Y).toBe(1);
    expect(typeof GP.A).toBe('number');
  });
});

describe('gamepad edge detection', () => {
  it('reports a button only on its rising edge (up -> down)', () => {
    const none = new Array(17).fill(false);
    const attackDown = none.slice();
    attackDown[GP.X] = true;

    // First press: rising edge fires.
    expect(risingEdges(none, attackDown)).toContain(GP.X);
    // Held: no new edge.
    expect(risingEdges(attackDown, attackDown)).not.toContain(GP.X);
    // Released then pressed again: edge fires once more.
    expect(risingEdges(attackDown, none)).not.toContain(GP.X);
    expect(risingEdges(none, attackDown)).toContain(GP.X);
  });
});
