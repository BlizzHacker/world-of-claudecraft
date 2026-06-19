import { describe, expect, it, vi } from 'vitest';
import { mountGamepadControls, moveInputFromGamepad, type GamepadLike } from '../src/game/gamepad';

function pad(options: { axes?: number[]; pressed?: number[]; id?: string } = {}): GamepadLike {
  const pressed = new Set(options.pressed ?? []);
  return {
    index: 0,
    id: options.id ?? 'Test Controller',
    connected: true,
    axes: options.axes ?? [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, (_, i) => ({
      pressed: pressed.has(i),
      value: pressed.has(i) ? 1 : 0,
    })),
  };
}

describe('gamepad controls', () => {
  it('maps the left stick and jump button into movement intent', () => {
    const result = moveInputFromGamepad(pad({ axes: [0.85, -0.92, 0, 0], pressed: [0] }));

    expect(result.movementActive).toBe(true);
    expect(result.move).toMatchObject({
      forward: true,
      back: false,
      strafeLeft: false,
      strafeRight: true,
      jump: true,
    });
  });

  it('drives the existing controller bridge with camera-facing movement', () => {
    const moves: { input: unknown; facing?: unknown }[] = [];
    const input = { camYaw: 1.25, camPitch: 0.2 };
    const mounted = mountGamepadControls(input, {
      autoStart: false,
      getGamepads: () => [pad({ axes: [0, -1, 0.5, 0] })],
      controller: {
        move: (moveInput, facing) => moves.push({ input: moveInput, facing }),
        face: vi.fn(),
        stop: vi.fn(),
      },
    });

    mounted.poll(32);

    expect(moves.at(-1)?.input).toMatchObject({ forward: true });
    expect(moves.at(-1)?.facing).toBeCloseTo(input.camYaw);
    expect(input.camYaw).toBeLessThan(1.25);
  });

  it('fires edge actions once while a button remains held', () => {
    let current = pad({ pressed: [2] });
    const attack = vi.fn();
    const mounted = mountGamepadControls({ camYaw: 0, camPitch: 0 }, {
      autoStart: false,
      getGamepads: () => [current],
      onAttackNearest: attack,
      controller: { move: vi.fn(), face: vi.fn(), stop: vi.fn() },
    });

    mounted.poll(16);
    mounted.poll(32);
    current = pad();
    mounted.poll(48);
    current = pad({ pressed: [2] });
    mounted.poll(64);

    expect(attack).toHaveBeenCalledTimes(2);
  });

  it('keeps the Start button available while gameplay keys are blocked', () => {
    const menu = vi.fn();
    const move = vi.fn();
    const mounted = mountGamepadControls({ camYaw: 0, camPitch: 0 }, {
      autoStart: false,
      getGamepads: () => [pad({ axes: [0, -1, 0, 0], pressed: [9] })],
      canUseGameKeys: () => false,
      onMenu: menu,
      controller: { move, face: vi.fn(), stop: vi.fn() },
    });

    mounted.poll(16);

    expect(menu).toHaveBeenCalledTimes(1);
    expect(move).not.toHaveBeenCalled();
  });
});
