import { describe, expect, it } from 'vitest';
import {
  createRaceSession,
  defaultRaceTrack,
  grantRaceItem,
  type RaceInput,
  type RaceSession,
  raceResults,
  stepRace,
} from '../src/sim/racing';

function run(
  seed: number,
  inputs: Readonly<Record<string, RaceInput>>,
  ticks: number,
): RaceSession {
  let session = createRaceSession(defaultRaceTrack(), seed, [
    { id: 'p1', playerId: 1 },
    { id: 'p2', playerId: 2 },
    { id: 'p3', playerId: 3 },
    { id: 'p4', playerId: 4 },
  ]);
  for (let tick = 0; tick < ticks; tick += 1) session = stepRace(session, inputs);
  return session;
}

describe('racing domain', () => {
  it('replays bit-for-bit from the same seed and inputs', () => {
    const inputs = {
      p1: { throttle: 1, steer: 0.4, drift: true },
      p2: { throttle: 0.85, steer: -0.2 },
      p3: { throttle: 1 },
      p4: { throttle: 0.5, steer: 0.1 },
    };
    expect(run(77, inputs, 240)).toEqual(run(77, inputs, 240));
  });

  it('charges drift and releases a bounded boost tier', () => {
    let session = createRaceSession(defaultRaceTrack(), 9, [{ id: 'p1', playerId: 1 }]);
    for (let tick = 0; tick < 50; tick += 1) {
      session = stepRace(session, { p1: { throttle: 1, steer: 1, drift: true } });
    }
    expect(session.vehicles[0].driftCharge).toBeGreaterThan(0);
    session = stepRace(session, { p1: { throttle: 1, steer: 0 } });
    expect(session.vehicles[0].boostTicks).toBeGreaterThan(0);
    expect(session.events.some((event) => event.type === 'driftBoost')).toBe(true);
  });

  it('applies terrain traction without changing the deterministic tick rate', () => {
    const track = defaultRaceTrack();
    let road = createRaceSession(track, 3, [{ id: 'road', playerId: 1 }]);
    let mud = createRaceSession(track, 3, [{ id: 'mud', playerId: 1 }]);
    road = { ...road, vehicles: [{ ...road.vehicles[0], x: 0, z: 0 }] };
    mud = { ...mud, vehicles: [{ ...mud.vehicles[0], x: 16, z: 0 }] };
    road = stepRace(road, { road: { throttle: 1, steer: 1 } });
    mud = stepRace(mud, { mud: { throttle: 1, steer: 1 } });
    expect(road.tick).toBe(1);
    expect(mud.tick).toBe(1);
    expect(Math.abs(mud.vehicles[0].heading)).toBeLessThan(Math.abs(road.vehicles[0].heading));
  });

  it('only advances the next checkpoint and rejects a shortcut to the finish', () => {
    const track = defaultRaceTrack();
    let session = createRaceSession(track, 4, [{ id: 'p1', playerId: 1 }]);
    session = {
      ...session,
      vehicles: [{ ...session.vehicles[0], x: 35, z: 0, checkpoint: 0, lap: 0 }],
    };
    session = stepRace(session, {});
    expect(session.vehicles[0].lap).toBe(0);
    expect(session.vehicles[0].checkpoint).toBe(0);
  });

  it('collides with obstacles and offers a deterministic recovery point', () => {
    const track = defaultRaceTrack();
    let session = createRaceSession(track, 5, [{ id: 'p1', playerId: 1 }]);
    session = {
      ...session,
      vehicles: [{ ...session.vehicles[0], x: 17, z: 0, speed: 8, recoveryTicks: 40 }],
    };
    session = stepRace(session, { p1: { throttle: 1 } });
    expect(session.events.some((event) => event.type === 'recovered')).toBe(true);
    expect(session.vehicles[0].x).toBe(track.recovery.x);
    expect(session.vehicles[0].z).toBe(track.recovery.z);
  });

  it('bounds item distribution, prevents chains, and exposes counters', () => {
    let session = createRaceSession(defaultRaceTrack(), 101, [
      { id: 'leader', playerId: 1 },
      { id: 'trailer', playerId: 2 },
    ]);
    let previous: string | null = null;
    for (let i = 0; i < 20; i += 1) {
      const sampled = grantRaceItem(session, 'leader', 1);
      session = sampled;
      const item = session.vehicles[0].item;
      expect(item).not.toBe(previous);
      previous = item;
      session = {
        ...session,
        vehicles: [{ ...session.vehicles[0], item: null }, session.vehicles[1]],
      };
    }
    session = grantRaceItem(session, 'trailer', 2);
    expect(session.vehicles[1].item).not.toBeNull();
    expect(['dash', 'pulse', 'repair', 'snare']).toContain(session.vehicles[1].item);
    session = {
      ...session,
      vehicles: [
        { ...session.vehicles[0], x: 0, z: 0, item: 'pulse' },
        { ...session.vehicles[1], x: 0, z: 1, item: null, wardTicks: 100 },
      ],
    };
    session = stepRace(session, { leader: { useItem: true }, trailer: {} });
    expect(session.vehicles[1].stunTicks).toBe(0);
    expect(session.events.some((event) => event.type === 'itemBlocked')).toBe(true);
  });

  it('ranks ties by finish tick and otherwise by validated course progress', () => {
    let session = createRaceSession(defaultRaceTrack(), 12, [
      { id: 'a', playerId: 1 },
      { id: 'b', playerId: 2 },
    ]);
    session = {
      ...session,
      vehicles: [
        { ...session.vehicles[0], lap: 1, checkpoint: 2, finished: true, finishTick: 120 },
        { ...session.vehicles[1], lap: 1, checkpoint: 2, finished: true, finishTick: 121 },
      ],
    };
    expect(raceResults(session).map((result) => result.vehicleId)).toEqual(['a', 'b']);
  });
});
