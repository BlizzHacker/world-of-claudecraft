import { describe, expect, it } from 'vitest';
import {
  buildZombieDefenseTower,
  createZombieDefenseSession,
  EASTBROOK_ZOMBIE_ROUTE,
  startZombieDefenseWave,
  stepZombieDefenseSession,
} from '../src/sim/minigames/zombie_session';

describe('zombie defense session adapter', () => {
  it('is deterministic and rejects players outside the authoritative roster', () => {
    const first = createZombieDefenseSession(12, 9001);
    const second = createZombieDefenseSession(12, 9001);
    expect(first).toEqual(second);
    expect(startZombieDefenseWave(first, 99, [1, 2])).toBe(false);
    expect(first.state.status).toBe('ready');
    expect(startZombieDefenseWave(first, 1, [1, 2])).toBe(true);
    expect(startZombieDefenseWave(second, 1, [1, 2])).toBe(true);
    expect(first.state.zombies).toEqual(second.state.zombies);
  });

  it('keeps tower placement bounded, idempotent, and replayable', () => {
    const session = createZombieDefenseSession(4, 77);
    expect(buildZombieDefenseTower(session, 1, 'arrow', { x: -3, z: 1 }, [1])).toBe(true);
    expect(buildZombieDefenseTower(session, 1, 'arrow', { x: -3, z: 1 }, [1])).toBe(false);
    expect(buildZombieDefenseTower(session, 1, 'cannon', { x: 99, z: 1 }, [1])).toBe(false);
    expect(buildZombieDefenseTower(session, 2, 'slow', { x: 0, z: 1 }, [1])).toBe(false);
  });

  it('steps only active waves and preserves the Eastbrook route in the wire state', () => {
    const session = createZombieDefenseSession(3, 123);
    expect(session.state.route).toEqual(EASTBROOK_ZOMBIE_ROUTE);
    stepZombieDefenseSession(session);
    expect(session.state.tick).toBe(0);
    expect(startZombieDefenseWave(session, 1, [1])).toBe(true);
    stepZombieDefenseSession(session);
    expect(session.state.tick).toBe(1);
    expect(session.state.route).toEqual(EASTBROOK_ZOMBIE_ROUTE);
  });
});
