// The Thornwheel Derby: mine-kart racing at the Thornwheel Circuit
// (src/sim/derby_layout.ts), a SimContext system module in the
// arena.ts/vale_cup.ts mold. The race is run by REAL player entities on the
// physical circuit: riders queue with Race Marshal Pip at the paddock gate,
// are seated on the starting grid, and drive their own characters (swapped
// onto loaner mine-kart mounts) through the ordered checkpoint rings for
// DERBY_LAPS laps. No parallel simulation, no private canvas: the venue, the
// karts, and the racers are all ordinary world entities.
//
// State stays on Sim as ONE holder object (`Sim.derby`, a live `ctx.derby`
// view): the queue and the race slot are mutated in place / reassigned INSIDE
// the holder, so the seam needs no setter (the vcup precedent).
//
// Determinism: ZERO rng draws anywhere in this module. Progression, standings,
// and every timer are pure functions of sim state, so the tick-path parity
// goldens are untouched.

import type { DerbyInfo, DerbyRaceInfo, DerbyRacerInfo } from '../../world_api/derby';
import { LEGACY_MOUNTS, MOUNT_AURA_PREFIX } from '../content/mounts';
import { NPCS } from '../data';
import {
  DERBY_CHECKPOINTS,
  DERBY_CP_RADIUS,
  DERBY_GRID,
  DERBY_LAPS,
  DERBY_MAX_RACERS,
  isAtThornwheel,
  MARSHAL_POS,
  THORNWHEEL_CENTER,
} from '../derby_layout';
import { createNpc } from '../entity';
import type { SimContext } from '../sim_context';
import { DT, dist2d, type Entity } from '../types';

// ---------------------------------------------------------------------------
// Tuning constants (vale_cup style: all at the top).
// ---------------------------------------------------------------------------
export const DERBY_QUEUE_WAIT = 20; // s from the first rider queueing to the grid call
export const DERBY_GRID_COUNTDOWN = 5; // s of red lights before the green flag
export const DERBY_MAX_DURATION = 300; // s; stragglers DNF when the clock runs out
export const DERBY_OVER_DELAY = 8; // s of podium aftermath before going home
export const DERBY_JOIN_RANGE = 14; // yd from the Marshal to sign the book
export const DERBY_DESERT_RANGE = 60; // yd from circuit center before a rider deserts
// Placement purses, copper (100 copper = 1 silver). Paid once, on crossing the
// line; a DNF pays nothing. Deliberately modest: the Derby is a fixture, not a
// faucet.
export const DERBY_PURSES: readonly number[] = [5000, 2500, 1000];

export const DERBY_KART_MOUNT_ID = 'derby_kart';
const DERBY_KART_AURA_ID = `${MOUNT_AURA_PREFIX}${DERBY_KART_MOUNT_ID}`;

export const DERBY_MARSHAL_NPC_ID = 'race_marshal_pip';
// Race Marshal Pip's RESERVED entity id, allocated OUTSIDE the nextId sequence
// exactly like Groundskeeper Bram (VALE_CUP_BRAM_ID = 1_000_000_000): the
// parity goldens pin nextId per frame, so a ctor-sequence spawn would shift
// every id and red the goldens.
export const DERBY_MARSHAL_ID = 1_000_000_001;

const CP_COUNT = DERBY_CHECKPOINTS.length;

// ---------------------------------------------------------------------------
// State (lives on Sim as `Sim.derby`, reached as the live `ctx.derby` view).
// ---------------------------------------------------------------------------

export interface DerbySeat {
  pid: number;
  /** Checkpoint rings taken since the green flag. The next ring's index is
   *  (cpTotal + 1) % CP_COUNT: racers launch off ring 0 (the start line), and
   *  taking ring 0 again after rings 1..7 completes a lap. */
  cpTotal: number;
  finishedAtTick: number | null;
  finishElapsed: number | null; // race.elapsed seconds at the line, once finished
  finishPlace: number; // 1-based, set on crossing the line
  deserted: boolean;
  ret: { x: number; z: number; facing: number };
}

export interface DerbyRace {
  id: number;
  phase: 'grid' | 'racing' | 'over';
  phaseLeft: number; // s remaining in the grid / over phases
  elapsed: number; // s since the green flag
  seats: DerbySeat[]; // grid order
  finishers: number; // count of seats with a finishPlace
}

export interface DerbyState {
  queue: number[]; // pids signed with the Marshal, join order
  queueDeadline: number | null; // ctx.time the grid gets called (armed by the first rider)
  race: DerbyRace | null;
  nextRaceId: number;
}

export function createDerbyState(): DerbyState {
  return { queue: [], queueDeadline: null, race: null, nextRaceId: 1 };
}

// ---------------------------------------------------------------------------
// The Marshal
// ---------------------------------------------------------------------------

export function spawnRaceMarshal(ctx: SimContext): void {
  const def = NPCS[DERBY_MARSHAL_NPC_ID];
  if (!def || ctx.entities.has(DERBY_MARSHAL_ID)) return;
  const npc = createNpc(DERBY_MARSHAL_ID, def, ctx.groundPos(MARSHAL_POS.x, MARSHAL_POS.z));
  ctx.addEntity(npc);
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export function derbySeatOf(ctx: SimContext, pid: number): DerbySeat | null {
  return ctx.derby.race?.seats.find((s) => s.pid === pid) ?? null;
}

export function derbyQueueJoin(ctx: SimContext, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const { meta, e } = r;
  if (e.dead) {
    ctx.error(meta.entityId, "You can't do that while dead.");
    return;
  }
  if (e.inCombat) {
    ctx.error(meta.entityId, "You can't do that while in combat.");
    return;
  }
  const marshal = ctx.entities.get(DERBY_MARSHAL_ID);
  if (!marshal || dist2d(e.pos, marshal.pos) > DERBY_JOIN_RANGE) {
    ctx.error(meta.entityId, 'Sign up with the Race Marshal at the Thornwheel gate.');
    return;
  }
  const derby = ctx.derby;
  if (derby.queue.includes(e.id) || derbySeatOf(ctx, e.id)) return;
  if (derby.race && derby.race.phase !== 'over') {
    ctx.error(meta.entityId, 'A race is already running. Wait for the next grid.');
    return;
  }
  if (derby.queue.length >= DERBY_MAX_RACERS) {
    ctx.error(meta.entityId, 'The grid is full for the next race.');
    return;
  }
  derby.queue.push(e.id);
  if (derby.queueDeadline === null) derby.queueDeadline = ctx.time + DERBY_QUEUE_WAIT;
  ctx.emit({
    type: 'log',
    text: `You are signed up for the Thornwheel Derby (${derby.queue.length} on the grid).`,
    color: '#9fd4ff',
    pid: e.id,
  });
}

export function derbyQueueLeave(ctx: SimContext, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  derbyQueueRemove(ctx, r.e.id);
}

/** Drop a pid from the waiting queue (leave command, logout, teardown). */
export function derbyQueueRemove(ctx: SimContext, pid: number): void {
  const derby = ctx.derby;
  const i = derby.queue.indexOf(pid);
  if (i < 0) return;
  derby.queue.splice(i, 1);
  if (derby.queue.length === 0) derby.queueDeadline = null;
}

// ---------------------------------------------------------------------------
// Kart swap
// ---------------------------------------------------------------------------

function seatKart(ctx: SimContext, e: Entity): void {
  // Only one mount up at a time (the items.ts mount-swap rule).
  for (let i = e.auras.length - 1; i >= 0; i--) {
    if (e.auras[i].id.startsWith(MOUNT_AURA_PREFIX)) {
      ctx.emit({ type: 'aura', targetId: e.id, name: e.auras[i].name, gained: false });
      e.auras.splice(i, 1);
    }
  }
  const kart = LEGACY_MOUNTS[DERBY_KART_MOUNT_ID];
  e.auras.push({
    id: DERBY_KART_AURA_ID,
    name: kart.name,
    kind: 'buff_speed',
    remaining: 86400,
    duration: 86400,
    value: kart.speedMult,
    sourceId: e.id,
    school: 'physical',
    // A loaner kart is race equipment, not a classic mount: clipping a fence
    // or a stray wolf bite must not strand a racer on foot mid-lap.
    breaksOnDamage: false,
  });
  ctx.emit({ type: 'aura', targetId: e.id, name: kart.name, gained: true });
}

function unseatKart(ctx: SimContext, e: Entity): void {
  const i = e.auras.findIndex((a) => a.id === DERBY_KART_AURA_ID);
  if (i < 0) return;
  ctx.emit({ type: 'aura', targetId: e.id, name: e.auras[i].name, gained: false });
  e.auras.splice(i, 1);
}

// ---------------------------------------------------------------------------
// Race lifecycle
// ---------------------------------------------------------------------------

function placeRacer(
  ctx: SimContext,
  e: Entity,
  spot: { x: number; z: number; facing: number },
): void {
  e.pos = ctx.groundPos(spot.x, spot.z);
  e.prevPos = { ...e.pos }; // hard teleport: no interpolated streak to the grid
  e.facing = spot.facing;
  e.prevFacing = spot.facing;
  ctx.rebucket(e);
}

function startRace(ctx: SimContext): void {
  const derby = ctx.derby;
  const seats: DerbySeat[] = [];
  for (const pid of derby.queue) {
    const e = ctx.entities.get(pid);
    const meta = ctx.players.get(pid);
    if (!e || !meta || e.dead) continue;
    seats.push({
      pid,
      cpTotal: 0,
      finishedAtTick: null,
      finishElapsed: null,
      finishPlace: 0,
      deserted: false,
      ret: { x: e.pos.x, z: e.pos.z, facing: e.facing },
    });
  }
  derby.queue.length = 0;
  derby.queueDeadline = null;
  if (seats.length === 0) return;
  const race: DerbyRace = {
    id: derby.nextRaceId++,
    phase: 'grid',
    phaseLeft: DERBY_GRID_COUNTDOWN,
    elapsed: 0,
    seats,
    finishers: 0,
  };
  derby.race = race;
  for (let i = 0; i < seats.length; i++) {
    const e = ctx.entities.get(seats[i].pid);
    if (!e) continue;
    placeRacer(ctx, e, DERBY_GRID[i]);
    seatKart(ctx, e);
    ctx.emit({ type: 'respawn', pid: seats[i].pid });
    ctx.emit({
      type: 'log',
      text: `Grid position ${i + 1}. ${DERBY_LAPS} laps: follow the flags. Green in ${DERBY_GRID_COUNTDOWN}...`,
      color: '#9fd4ff',
      pid: seats[i].pid,
    });
  }
}

/** Idempotent: a rider who leaves the vale, dies out of reach, or logs out is
 *  out of the race (the vcupResolveDesertion precedent; the server calls this
 *  BEFORE the leave save). Their kart is taken back and, when they are still
 *  in the world, they are returned to where they signed up. */
export function derbyResolveDesertion(ctx: SimContext, pid: number): void {
  derbyQueueRemove(ctx, pid);
  const race = ctx.derby.race;
  if (!race) return;
  const seat = race.seats.find((s) => s.pid === pid);
  if (!seat || seat.deserted || seat.finishedAtTick !== null) return;
  seat.deserted = true;
  const e = ctx.entities.get(pid);
  if (e) {
    unseatKart(ctx, e);
    placeRacer(ctx, e, { ...seat.ret });
    ctx.emit({ type: 'respawn', pid });
  }
}

/** The saved return position while seated in a race (serializeCharacter must
 *  persist the RETURN spot, never mid-circuit). */
export function derbyReturnFor(
  ctx: SimContext,
  pid: number,
): { x: number; z: number; facing: number } | null {
  const seat = derbySeatOf(ctx, pid);
  if (!seat || seat.deserted) return null;
  return seat.ret;
}

function finishSeat(ctx: SimContext, race: DerbyRace, seat: DerbySeat): void {
  race.finishers++;
  seat.finishPlace = race.finishers;
  seat.finishedAtTick = ctx.tickCount;
  seat.finishElapsed = Math.floor(race.elapsed);
  const meta = ctx.players.get(seat.pid);
  const purse = DERBY_PURSES[seat.finishPlace - 1] ?? 0;
  if (meta && purse > 0) meta.copper += purse;
  const placeText =
    seat.finishPlace === 1 ? 'FIRST' : seat.finishPlace === 2 ? 'second' : `${seat.finishPlace}th`;
  ctx.emit({
    type: 'log',
    text:
      purse > 0
        ? `Checkered flag! You take ${placeText} place and a ${Math.floor(purse / 100)}s purse.`
        : `Checkered flag! You finish in ${placeText} place.`,
    color: '#1eff00',
    pid: seat.pid,
  });
}

function teardownRace(ctx: SimContext): void {
  const race = ctx.derby.race;
  if (!race) return;
  for (const seat of race.seats) {
    if (seat.deserted) continue;
    const e = ctx.entities.get(seat.pid);
    if (!e) continue;
    unseatKart(ctx, e);
    placeRacer(ctx, e, seat.ret);
    ctx.emit({ type: 'respawn', pid: seat.pid });
  }
  ctx.derby.race = null;
}

// Live standing sort: finishers by place, then the pack by rings taken (more
// is further along), then by distance to the next ring (closer is ahead), then
// pid for a stable total order. Deserters trail everything.
function standingOrder(ctx: SimContext, race: DerbyRace): DerbySeat[] {
  const dist = (seat: DerbySeat): number => {
    const e = ctx.entities.get(seat.pid);
    if (!e) return Number.POSITIVE_INFINITY;
    const cp = DERBY_CHECKPOINTS[(seat.cpTotal + 1) % CP_COUNT];
    return dist2d(e.pos, { x: cp.x, y: 0, z: cp.z });
  };
  return [...race.seats].sort((a, b) => {
    if (a.deserted !== b.deserted) return a.deserted ? 1 : -1;
    const af = a.finishPlace || Number.POSITIVE_INFINITY;
    const bf = b.finishPlace || Number.POSITIVE_INFINITY;
    if (af !== bf) return af - bf;
    if (a.cpTotal !== b.cpTotal) return b.cpTotal - a.cpTotal;
    const d = dist(a) - dist(b);
    if (d !== 0) return d < 0 ? -1 : 1;
    return a.pid - b.pid;
  });
}

export function updateDerby(ctx: SimContext): void {
  const derby = ctx.derby;

  // Grid call: the first rider arms a deadline; the grid goes when it expires
  // (or instantly the moment the grid is full).
  if (!derby.race && derby.queue.length > 0) {
    if (
      derby.queue.length >= DERBY_MAX_RACERS ||
      (derby.queueDeadline !== null && ctx.time >= derby.queueDeadline)
    ) {
      startRace(ctx);
    }
  }

  const race = derby.race;
  if (!race) return;

  if (race.phase === 'grid') {
    race.phaseLeft -= DT;
    if (race.phaseLeft <= 0) {
      race.phase = 'racing';
      race.phaseLeft = 0;
      for (const seat of race.seats) {
        if (!seat.deserted) {
          ctx.emit({ type: 'log', text: 'GREEN FLAG! Go go go!', color: '#1eff00', pid: seat.pid });
        }
      }
    }
    return;
  }

  if (race.phase === 'racing') {
    race.elapsed += DT;
    for (const seat of race.seats) {
      if (seat.deserted || seat.finishedAtTick !== null) continue;
      const e = ctx.entities.get(seat.pid);
      if (!e) {
        derbyResolveDesertion(ctx, seat.pid);
        continue;
      }
      // Riders who quit the venue (hearthed, walked off, fell dead and
      // released far away) desert; dying ON the track just costs time.
      if (
        dist2d(e.pos, { x: THORNWHEEL_CENTER.x, y: 0, z: THORNWHEEL_CENTER.z }) > DERBY_DESERT_RANGE
      ) {
        derbyResolveDesertion(ctx, seat.pid);
        continue;
      }
      const next = DERBY_CHECKPOINTS[(seat.cpTotal + 1) % CP_COUNT];
      if (dist2d(e.pos, { x: next.x, y: 0, z: next.z }) <= DERBY_CP_RADIUS) {
        seat.cpTotal++;
        if (seat.cpTotal >= CP_COUNT * DERBY_LAPS) finishSeat(ctx, race, seat);
      }
    }
    const live = race.seats.some((s) => !s.deserted && s.finishedAtTick === null);
    if (!live || race.elapsed >= DERBY_MAX_DURATION) {
      race.phase = 'over';
      race.phaseLeft = DERBY_OVER_DELAY;
      for (const seat of race.seats) {
        if (!seat.deserted && seat.finishedAtTick === null) {
          ctx.emit({
            type: 'log',
            text: 'Time! The Marshal waves you in.',
            color: '#ff8080',
            pid: seat.pid,
          });
        }
      }
    }
    return;
  }

  // 'over': hold the podium beat, then send everyone home.
  race.phaseLeft -= DT;
  if (race.phaseLeft <= 0) teardownRace(ctx);
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

export function derbyInfoFor(ctx: SimContext, pid?: number): DerbyInfo | null {
  const r = ctx.resolve(pid);
  if (!r) return null;
  const me = r.e.id;
  const derby = ctx.derby;
  const myQueued = derby.queue.includes(me);
  const seat = derbySeatOf(ctx, me);
  const nearby = isAtThornwheel(r.e.pos.x, r.e.pos.z);
  if (!derby.race && !myQueued && !nearby) return null;

  let raceInfo: DerbyRaceInfo | null = null;
  const race = derby.race;
  if (race && (seat || nearby)) {
    const order = standingOrder(ctx, race);
    const racers: DerbyRacerInfo[] = order.map((s, idx) => {
      const meta = ctx.players.get(s.pid);
      return {
        pid: s.pid,
        name: meta?.name ?? '?',
        me: s.pid === me,
        lap: Math.min(DERBY_LAPS, 1 + Math.floor(s.cpTotal / CP_COUNT)),
        cp: (s.cpTotal + 1) % CP_COUNT,
        place: s.finishPlace > 0 ? s.finishPlace : idx + 1,
        finished: s.finishedAtTick !== null,
        time: s.finishElapsed,
        deserted: s.deserted,
      };
    });
    raceInfo = {
      id: race.id,
      phase: race.phase,
      countdown: race.phase === 'racing' ? 0 : Math.max(0, Math.ceil(race.phaseLeft)),
      laps: DERBY_LAPS,
      elapsed: Math.floor(race.elapsed),
      racers,
      mySeat: seat !== null && !seat.deserted,
      myNextCp:
        seat && !seat.deserted && seat.finishedAtTick === null && race.phase !== 'over'
          ? { ...DERBY_CHECKPOINTS[(seat.cpTotal + 1) % CP_COUNT] }
          : null,
    };
  }

  return { queued: derby.queue.length, myQueued, race: raceInfo };
}
