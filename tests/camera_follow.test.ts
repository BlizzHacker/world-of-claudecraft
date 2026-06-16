import { describe, expect, it } from 'vitest';
import { updateFollowCameraYaw, wrapAngle } from '../src/game/camera_follow';

describe('camera follow', () => {
  it('wraps angles to the shortest signed turn', () => {
    expect(wrapAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2);
    expect(wrapAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
  });

  it('animates character turn deltas under the global yaw-speed cap', () => {
    const next = updateFollowCameraYaw({
      camYaw: 1.0,
      interpFacing: 0.4,
      lastInterpFacing: 0.2,
      frameDt: 1 / 60,
      mouselook: false,
      moving: false,
      orbiting: false,
    });
    expect(next.camYaw).toBeGreaterThan(1.0);
    expect(next.camYaw).toBeLessThan(1.2);
    expect(next.camYaw).toBeCloseTo(1.06);
    expect(next.lastInterpFacing).toBe(0.4);
  });

  it('caps automatic yaw movement even after a long frame hitch', () => {
    const next = updateFollowCameraYaw({
      camYaw: 0,
      interpFacing: Math.PI,
      lastInterpFacing: 0,
      frameDt: 1,
      mouselook: false,
      moving: true,
      orbiting: false,
    });
    expect(next.camYaw).toBeGreaterThan(0);
    expect(next.camYaw).toBeLessThan(0.13);
  });

  it('tracks facing through mouselook without changing yaw', () => {
    const next = updateFollowCameraYaw({
      camYaw: 2.0,
      interpFacing: 0.6,
      lastInterpFacing: 0.1,
      frameDt: 1 / 60,
      mouselook: true,
      moving: true,
      orbiting: false,
    });
    expect(next.camYaw).toBe(2.0);
    expect(next.lastInterpFacing).toBe(0.6);
  });

  it('eases large moving offsets instead of snapping the camera behind the character', () => {
    const next = updateFollowCameraYaw({
      camYaw: Math.PI,
      interpFacing: 0,
      lastInterpFacing: 0,
      frameDt: 1 / 60,
      mouselook: false,
      moving: true,
      orbiting: false,
    });
    expect(next.camYaw).toBeLessThan(Math.PI);
    expect(next.camYaw).toBeGreaterThan(Math.PI - 0.2);
  });

  it('settles medium moving offsets quickly but not instantly', () => {
    const next = updateFollowCameraYaw({
      camYaw: 1.2,
      interpFacing: 0,
      lastInterpFacing: 0,
      frameDt: 1 / 60,
      mouselook: false,
      moving: true,
      orbiting: false,
    });
    expect(next.camYaw).toBeLessThan(1.2);
    expect(next.camYaw).toBeGreaterThan(0);
    expect(next.camYaw).toBeGreaterThan(1.0);
  });

  it('does not follow or auto-settle while the player is actively orbit-dragging', () => {
    const next = updateFollowCameraYaw({
      camYaw: 1,
      interpFacing: 0.4,
      lastInterpFacing: 0.1,
      frameDt: 1 / 60,
      mouselook: false,
      moving: true,
      orbiting: true,
    });
    expect(next.camYaw).toBe(1);
  });

  it('decouples click-to-move turns from the camera and eases only gently', () => {
    const next = updateFollowCameraYaw({
      camYaw: Math.PI,
      interpFacing: 0,
      lastInterpFacing: Math.PI - 0.5,
      frameDt: 1 / 60,
      mouselook: false,
      moving: true,
      clickMoving: true,
      orbiting: false,
    });
    expect(next.camYaw).toBeLessThan(Math.PI);
    expect(next.camYaw).toBeGreaterThan(Math.PI - 0.04);
  });

  it('settles click-to-move turns more softly when the facing jump is large', () => {
    const large = updateFollowCameraYaw({
      camYaw: Math.PI,
      interpFacing: 0,
      lastInterpFacing: Math.PI - 0.5,
      frameDt: 1 / 60,
      mouselook: false,
      moving: true,
      clickMoving: true,
      orbiting: false,
    });
    const small = updateFollowCameraYaw({
      camYaw: 0.25,
      interpFacing: 0,
      lastInterpFacing: 0.3,
      frameDt: 1 / 60,
      mouselook: false,
      moving: true,
      clickMoving: true,
      orbiting: false,
    });
    expect(Math.PI - large.camYaw).toBeGreaterThan(0);
    expect(Math.PI - large.camYaw).toBeLessThan(0.01);
    expect(0.25 - small.camYaw).toBeGreaterThan(Math.PI - large.camYaw);
  });
});
