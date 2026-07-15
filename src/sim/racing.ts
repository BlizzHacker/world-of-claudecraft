import { Rng } from './rng';

/**
 * Deterministic racing domain core. This module deliberately has no browser or
 * renderer dependencies so the offline client, authoritative server, and
 * headless runner can use the same state transition.
 */

export const RACE_TICK_HZ = 20;
export const RACE_DT = 1 / RACE_TICK_HZ;

export type RaceSurface = 'road' | 'mud' | 'ice' | 'boost';
export type RaceItem = 'dash' | 'ward' | 'pulse' | 'snare' | 'repair';

export interface RacePoint {
  readonly x: number;
  readonly z: number;
}

export interface RaceCheckpoint extends RacePoint {
  readonly radius: number;
}

export interface RaceSurfaceZone {
  readonly surface: RaceSurface;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface RaceObstacle extends RacePoint {
  readonly radius: number;
  readonly knockback: number;
}

export interface RaceTrack {
  readonly id: string;
  readonly laps: number;
  readonly checkpoints: readonly RaceCheckpoint[];
  readonly surfaces: readonly RaceSurfaceZone[];
  readonly obstacles: readonly RaceObstacle[];
  readonly grid: readonly RacePoint[];
  readonly recovery: RacePoint;
}

export interface RaceInput {
  readonly throttle?: number;
  readonly steer?: number;
  readonly drift?: boolean;
  readonly useItem?: boolean;
  readonly recover?: boolean;
}

export interface RaceVehicleState {
  readonly id: string;
  readonly playerId: number;
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly speed: number;
  readonly driftCharge: number;
  readonly driftDirection: -1 | 0 | 1;
  readonly boostTicks: number;
  readonly checkpoint: number;
  readonly lap: number;
  readonly finished: boolean;
  readonly finishTick: number | null;
  readonly recoveryTicks: number;
  readonly item: RaceItem | null;
  readonly itemCooldown: number;
  readonly wardTicks: number;
  readonly snareTicks: number;
  readonly stunTicks: number;
  readonly lastImpactTick: number;
}

export interface RaceEvent {
  readonly type:
    | 'checkpoint'
    | 'lap'
    | 'driftBoost'
    | 'item'
    | 'itemBlocked'
    | 'impact'
    | 'recovered'
    | 'finish';
  readonly vehicleId: string;
  readonly value?: number | string;
}

export interface RaceSession {
  readonly track: RaceTrack;
  readonly seed: number;
  readonly tick: number;
  readonly vehicles: readonly RaceVehicleState[];
  readonly events: readonly RaceEvent[];
  readonly finished: boolean;
  readonly itemRng: Rng;
  readonly itemHistory: Readonly<Record<string, RaceItem | null>>;
}

export interface RaceResult {
  readonly vehicleId: string;
  readonly place: number;
  readonly progress: number;
  readonly finishTick: number | null;
}

const MAX_SPEED = 18;
const REVERSE_SPEED = 5;
const ACCELERATION = 15;
const BRAKE = 22;
const STEER_RATE = 2.2;
const DRIFT_MIN_SPEED = 4;
const DRIFT_MAX_CHARGE = 60;
const BOOST_TICKS: Record<number, number> = { 1: 24, 2: 42, 3: 64 };
const RECOVERY_AFTER = 40;
const ITEM_COOLDOWN = 18;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distanceSquared(a: RacePoint, b: RacePoint): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function sign(value: number): -1 | 0 | 1 {
  return value < 0 ? -1 : value > 0 ? 1 : 0;
}

function surfaceAt(track: RaceTrack, x: number, z: number): RaceSurface {
  for (let i = track.surfaces.length - 1; i >= 0; i -= 1) {
    const zone = track.surfaces[i];
    if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) return zone.surface;
  }
  return 'road';
}

function traction(surface: RaceSurface): number {
  return surface === 'mud' ? 0.58 : surface === 'ice' ? 0.35 : 1;
}

function speedLimit(surface: RaceSurface): number {
  return surface === 'boost' ? MAX_SPEED + 5 : MAX_SPEED;
}

function initialVehicle(
  track: RaceTrack,
  id: string,
  playerId: number,
  index: number,
): RaceVehicleState {
  const grid = track.grid[index % Math.max(1, track.grid.length)] ?? track.recovery;
  return {
    id,
    playerId,
    x: grid.x,
    z: grid.z,
    heading: 0,
    speed: 0,
    driftCharge: 0,
    driftDirection: 0,
    boostTicks: 0,
    checkpoint: 0,
    lap: 0,
    finished: false,
    finishTick: null,
    recoveryTicks: 0,
    item: null,
    itemCooldown: 0,
    wardTicks: 0,
    snareTicks: 0,
    stunTicks: 0,
    lastImpactTick: -1,
  };
}

function replaceVehicle(session: RaceSession, vehicle: RaceVehicleState): RaceSession {
  return { ...session, vehicles: session.vehicles.map((v) => (v.id === vehicle.id ? vehicle : v)) };
}

function addEvent(session: RaceSession, event: RaceEvent): RaceSession {
  return { ...session, events: [...session.events, event] };
}

export function createRaceSession(
  track: RaceTrack,
  seed: number,
  racers: readonly { id: string; playerId: number }[],
): RaceSession {
  if (track.laps < 1 || track.checkpoints.length < 2 || track.grid.length === 0) {
    throw new Error('Race track needs laps, checkpoints, and a starting grid');
  }
  const itemHistory: Record<string, RaceItem | null> = {};
  const vehicles = racers.map((racer, index) => {
    itemHistory[racer.id] = null;
    return initialVehicle(track, racer.id, racer.playerId, index);
  });
  return {
    track,
    seed: seed >>> 0,
    tick: 0,
    vehicles,
    events: [],
    finished: false,
    itemRng: new Rng(seed),
    itemHistory,
  };
}

function progressOf(track: RaceTrack, vehicle: RaceVehicleState): number {
  return vehicle.lap * track.checkpoints.length + vehicle.checkpoint;
}

export function raceResults(session: RaceSession): RaceResult[] {
  return [...session.vehicles]
    .sort((a, b) => {
      const progress = progressOf(session.track, b) - progressOf(session.track, a);
      if (progress !== 0) return progress;
      if (a.finished && b.finished) return (a.finishTick ?? Infinity) - (b.finishTick ?? Infinity);
      return b.speed - a.speed;
    })
    .map((vehicle, index) => ({
      vehicleId: vehicle.id,
      place: index + 1,
      progress: progressOf(session.track, vehicle),
      finishTick: vehicle.finishTick,
    }));
}

export function sampleRaceItem(
  session: RaceSession,
  vehicleId: string,
  place: number,
): { session: RaceSession; item: RaceItem } {
  const vehicle = session.vehicles.find((candidate) => candidate.id === vehicleId);
  if (!vehicle) throw new Error(`Unknown race vehicle: ${vehicleId}`);
  const last = session.itemHistory[vehicleId] ?? null;
  const choices: RaceItem[] =
    place <= 1
      ? ['ward', 'dash', 'ward', 'pulse']
      : place >= session.vehicles.length
        ? ['dash', 'pulse', 'repair', 'snare']
        : ['dash', 'ward', 'pulse', 'repair'];
  let item = choices[Math.floor(session.itemRng.next() * choices.length)];
  if (item === last) item = choices[(choices.indexOf(item) + 1) % choices.length];
  const itemHistory = { ...session.itemHistory, [vehicleId]: item };
  return { session: { ...session, itemHistory }, item };
}

function releaseDriftBoost(vehicle: RaceVehicleState): { vehicle: RaceVehicleState; tier: number } {
  const tier =
    vehicle.driftCharge >= 42
      ? 3
      : vehicle.driftCharge >= 24
        ? 2
        : vehicle.driftCharge >= 10
          ? 1
          : 0;
  return {
    tier,
    vehicle: {
      ...vehicle,
      driftCharge: 0,
      driftDirection: 0,
      boostTicks: Math.max(vehicle.boostTicks, tier === 0 ? 0 : BOOST_TICKS[tier]),
    },
  };
}

function applyItem(session: RaceSession, vehicle: RaceVehicleState): RaceSession {
  if (!vehicle.item) return session;
  const item = vehicle.item;
  let updated = { ...vehicle, item: null, itemCooldown: ITEM_COOLDOWN };
  const target = [...session.vehicles]
    .filter((candidate) => candidate.id !== vehicle.id && !candidate.finished)
    .sort((a, b) => progressOf(session.track, a) - progressOf(session.track, b))[0];
  if (item === 'dash')
    updated = { ...updated, boostTicks: Math.max(updated.boostTicks, BOOST_TICKS[1]) };
  if (item === 'repair') updated = { ...updated, snareTicks: 0, stunTicks: 0 };
  if (item === 'ward') updated = { ...updated, wardTicks: 100 };
  if (target && (item === 'pulse' || item === 'snare')) {
    const blocked = target.wardTicks > 0;
    const nextTarget = blocked
      ? { ...target, wardTicks: 0 }
      : item === 'pulse'
        ? { ...target, stunTicks: 18 }
        : { ...target, snareTicks: 60 };
    const next = replaceVehicle(session, nextTarget);
    return addEvent(next, {
      type: blocked ? 'itemBlocked' : 'item',
      vehicleId: vehicle.id,
      value: blocked ? item : target.id,
    });
  }
  return addEvent(replaceVehicle(session, updated), {
    type: 'item',
    vehicleId: vehicle.id,
    value: item,
  });
}

function updateVehicle(
  session: RaceSession,
  vehicle: RaceVehicleState,
  input: RaceInput,
): RaceSession {
  if (vehicle.finished) return session;
  const throttle = clamp(input.throttle ?? 0, -1, 1);
  const steer = clamp(input.steer ?? 0, -1, 1);
  const surface = surfaceAt(session.track, vehicle.x, vehicle.z);
  const tractionFactor = traction(surface);
  let next = {
    ...vehicle,
    itemCooldown: Math.max(0, vehicle.itemCooldown - 1),
    wardTicks: Math.max(0, vehicle.wardTicks - 1),
    snareTicks: Math.max(0, vehicle.snareTicks - 1),
    stunTicks: Math.max(0, vehicle.stunTicks - 1),
    boostTicks: Math.max(0, vehicle.boostTicks - 1),
  };
  if (input.recover || next.recoveryTicks >= RECOVERY_AFTER) {
    next = {
      ...next,
      x: session.track.recovery.x,
      z: session.track.recovery.z,
      speed: 0,
      recoveryTicks: 0,
      heading: 0,
    };
    return addEvent(replaceVehicle(session, next), { type: 'recovered', vehicleId: vehicle.id });
  }
  if (next.stunTicks === 0) {
    const acceleration = throttle >= 0 ? throttle * ACCELERATION : throttle * BRAKE;
    const boost = next.boostTicks > 0 ? 5 : 0;
    const limit = speedLimit(surface) + boost;
    const snare = next.snareTicks > 0 ? 0.58 : 1;
    const speed = clamp((next.speed + acceleration * RACE_DT) * snare, -REVERSE_SPEED, limit);
    const drifting =
      Boolean(input.drift) && Math.abs(speed) >= DRIFT_MIN_SPEED && Math.abs(steer) > 0.15;
    const direction = drifting ? sign(steer) : 0;
    const charge =
      drifting &&
      direction !== 0 &&
      (next.driftDirection === 0 || next.driftDirection === direction)
        ? Math.min(DRIFT_MAX_CHARGE, next.driftCharge + 1)
        : next.driftCharge;
    next = {
      ...next,
      speed,
      heading: next.heading + steer * STEER_RATE * RACE_DT * (drifting ? 1.35 : 1) * tractionFactor,
      driftCharge: charge,
      driftDirection: direction === 0 ? next.driftDirection : direction,
    };
    if (!input.drift && next.driftCharge > 0) {
      const released = releaseDriftBoost(next);
      next = released.vehicle;
      if (released.tier > 0) {
        session = addEvent(session, {
          type: 'driftBoost',
          vehicleId: vehicle.id,
          value: released.tier,
        });
      }
    }
    const distance = next.speed * RACE_DT;
    next = {
      ...next,
      x: next.x + Math.sin(next.heading) * distance,
      z: next.z + Math.cos(next.heading) * distance,
      recoveryTicks: surface === 'road' || surface === 'boost' ? 0 : next.recoveryTicks + 1,
    };
  }
  for (const obstacle of session.track.obstacles) {
    const combined = obstacle.radius + 0.8;
    if (distanceSquared(next, obstacle) >= combined * combined) continue;
    const dx = next.x - obstacle.x;
    const dz = next.z - obstacle.z;
    const length = Math.hypot(dx, dz) || 1;
    next = {
      ...next,
      x: obstacle.x + (dx / length) * combined,
      z: obstacle.z + (dz / length) * combined,
      speed: -Math.abs(next.speed) * 0.35,
      lastImpactTick: session.tick,
    };
    session = addEvent(session, { type: 'impact', vehicleId: vehicle.id });
  }
  const checkpoint = session.track.checkpoints[next.checkpoint];
  if (checkpoint && distanceSquared(next, checkpoint) <= checkpoint.radius * checkpoint.radius) {
    const passed = next.checkpoint + 1;
    const lap = passed >= session.track.checkpoints.length ? next.lap + 1 : next.lap;
    const index = passed % session.track.checkpoints.length;
    next = { ...next, checkpoint: index, lap };
    session = addEvent(session, {
      type: passed >= session.track.checkpoints.length ? 'lap' : 'checkpoint',
      vehicleId: vehicle.id,
      value: lap,
    });
    if (lap >= session.track.laps) {
      next = { ...next, finished: true, finishTick: session.tick };
      session = addEvent(session, { type: 'finish', vehicleId: vehicle.id, value: lap });
    }
  }
  session = replaceVehicle(session, next);
  if (input.useItem && next.item && next.itemCooldown === 0) session = applyItem(session, next);
  return session;
}

export function stepRace(
  session: RaceSession,
  inputs: Readonly<Record<string, RaceInput>> = {},
): RaceSession {
  if (session.finished) return session;
  let next: RaceSession = { ...session, tick: session.tick + 1, events: [] };
  for (const vehicle of session.vehicles) {
    next = updateVehicle(
      next,
      next.vehicles.find((candidate) => candidate.id === vehicle.id) ?? vehicle,
      inputs[vehicle.id] ?? {},
    );
  }
  return {
    ...next,
    finished: next.vehicles.every((vehicle) => vehicle.finished),
  };
}

export function grantRaceItem(session: RaceSession, vehicleId: string, place: number): RaceSession {
  const vehicle = session.vehicles.find((candidate) => candidate.id === vehicleId);
  if (!vehicle || vehicle.item || vehicle.itemCooldown > 0) return session;
  const sampled = sampleRaceItem(session, vehicleId, place);
  return replaceVehicle(sampled.session, { ...vehicle, item: sampled.item });
}

export function defaultRaceTrack(): RaceTrack {
  return {
    id: 'cryptic-circuit',
    laps: 3,
    checkpoints: [
      { x: 0, z: 40, radius: 7 },
      { x: 35, z: 0, radius: 7 },
      { x: 0, z: -40, radius: 7 },
      { x: -35, z: 0, radius: 7 },
    ],
    surfaces: [
      { surface: 'mud', minX: 8, maxX: 24, minZ: -12, maxZ: 12 },
      { surface: 'ice', minX: -24, maxX: -8, minZ: -12, maxZ: 12 },
      { surface: 'boost', minX: -6, maxX: 6, minZ: 22, maxZ: 33 },
    ],
    obstacles: [
      { x: 17, z: 0, radius: 2, knockback: 0.35 },
      { x: -17, z: 0, radius: 2, knockback: 0.35 },
    ],
    grid: [
      { x: -3, z: 34 },
      { x: 3, z: 34 },
      { x: -3, z: 29 },
      { x: 3, z: 29 },
    ],
    recovery: { x: 0, z: 34 },
  };
}
