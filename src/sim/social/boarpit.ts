// The Boarpit: bare-knuckle knockout brawls at the stake ring north-east of
// Eastbrook (src/sim/boarpit_layout.ts), a SimContext system module in the
// arena.ts/vale_cup.ts/derby.ts mold. Fighters sign up with the Pit Master,
// are set into the ring as their REAL characters with a clean arena slate,
// and fight with their own kits: pit fighters are mutually hostile while the
// bout is live (the jail-brawl isHostileTo arm is the precedent), and a hit
// that would fell a fighter KOs them at 1 hp instead (the duel arm's rule:
// nobody dies in the pit). Last fighter standing takes the purse.
//
// State stays on Sim as ONE holder object (`Sim.boarpit`, a live
// `ctx.boarpit` view), the vcup/derby one-holder rule.
//
// Determinism: ZERO rng draws anywhere in this module.

import type { PitBoutInfo, PitFighterInfo, PitInfo } from '../../world_api/boarpit';
import {
  BOARPIT_CENTER,
  isAtBoarpit,
  PIT_KO_SPOT,
  PIT_MASTER_POS,
  PIT_MAX_FIGHTERS,
  PIT_SLOTS,
} from '../boarpit_layout';
import { NPCS } from '../data';
import { createNpc } from '../entity';
import type { SimContext } from '../sim_context';
import { DT, dist2d, type Entity } from '../types';

// ---------------------------------------------------------------------------
// Tuning constants (all at the top).
// ---------------------------------------------------------------------------
export const PIT_QUEUE_WAIT = 20; // s from the first signup to the bell (needs 2+)
export const PIT_COUNTDOWN = 5; // s of squaring up before fists fly
export const PIT_MAX_DURATION = 180; // s; the Pit Master calls a stalled bout a draw
export const PIT_OVER_DELAY = 6; // s of gloating before everyone goes home
export const PIT_JOIN_RANGE = 14; // yd from the Pit Master to sign up
export const PIT_DESERT_RANGE = 45; // yd from the ring before a fighter deserts
export const PIT_MIN_FIGHTERS = 2;
// Purses, copper: winner takes the pot, the last KO'd gets a consolation cut.
export const PIT_PURSE_WIN = 4000;
export const PIT_PURSE_SECOND = 1500;

export const PIT_MASTER_NPC_ID = 'pit_master_grott';
// Reserved entity id outside the nextId sequence (Bram/Pip precedent).
export const PIT_MASTER_ID = 1_000_000_002;

// ---------------------------------------------------------------------------
// State (lives on Sim as `Sim.boarpit`, reached as the live ctx.boarpit view).
// ---------------------------------------------------------------------------

export interface PitSeat {
  pid: number;
  out: boolean; // KO'd, deserted, or dead
  koPlace: number; // 1-based order of elimination (0 while standing)
  deserted: boolean;
  ret: { x: number; z: number; facing: number };
}

export interface PitBout {
  id: number;
  phase: 'countdown' | 'fighting' | 'over';
  phaseLeft: number; // s remaining in countdown / over
  elapsed: number; // s since the bell
  seats: PitSeat[];
  outs: number; // count of seats with out=true
  winnerPid: number | null;
}

export interface PitState {
  queue: number[];
  queueDeadline: number | null;
  bout: PitBout | null;
  nextBoutId: number;
}

export function createPitState(): PitState {
  return { queue: [], queueDeadline: null, bout: null, nextBoutId: 1 };
}

// ---------------------------------------------------------------------------
// The Pit Master
// ---------------------------------------------------------------------------

export function spawnPitMaster(ctx: SimContext): void {
  const def = NPCS[PIT_MASTER_NPC_ID];
  if (!def || ctx.entities.has(PIT_MASTER_ID)) return;
  const npc = createNpc(PIT_MASTER_ID, def, ctx.groundPos(PIT_MASTER_POS.x, PIT_MASTER_POS.z));
  ctx.addEntity(npc);
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export function pitSeatOf(ctx: SimContext, pid: number): PitSeat | null {
  return ctx.boarpit.bout?.seats.find((s) => s.pid === pid) ?? null;
}

/** Both pids are live (not out) seats of the ACTIVE bout: the isHostileTo and
 *  damage-clamp consumers key off this one predicate. */
export function pitBothFighting(ctx: SimContext, a: number, b: number): boolean {
  const bout = ctx.boarpit.bout;
  if (!bout || bout.phase !== 'fighting') return false;
  const sa = bout.seats.find((s) => s.pid === a);
  const sb = bout.seats.find((s) => s.pid === b);
  return !!sa && !!sb && !sa.out && !sb.out && a !== b;
}

export function pitQueueJoin(ctx: SimContext, pid?: number): void {
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
  const master = ctx.entities.get(PIT_MASTER_ID);
  if (!master || dist2d(e.pos, master.pos) > PIT_JOIN_RANGE) {
    ctx.error(meta.entityId, 'Sign up with the Pit Master at the Boarpit gate.');
    return;
  }
  const pit = ctx.boarpit;
  if (pit.queue.includes(e.id) || pitSeatOf(ctx, e.id)) return;
  if (pit.bout && pit.bout.phase !== 'over') {
    ctx.error(meta.entityId, 'A bout is on. Wait for the next bell.');
    return;
  }
  if (pit.queue.length >= PIT_MAX_FIGHTERS) {
    ctx.error(meta.entityId, 'The card is full for the next bout.');
    return;
  }
  pit.queue.push(e.id);
  if (pit.queueDeadline === null) pit.queueDeadline = ctx.time + PIT_QUEUE_WAIT;
  ctx.emit({
    type: 'log',
    text: `You are on the card for the next Boarpit bout (${pit.queue.length} signed).`,
    color: '#ffb56b',
    pid: e.id,
  });
}

export function pitQueueLeave(ctx: SimContext, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  pitQueueRemove(ctx, r.e.id);
}

export function pitQueueRemove(ctx: SimContext, pid: number): void {
  const pit = ctx.boarpit;
  const i = pit.queue.indexOf(pid);
  if (i < 0) return;
  pit.queue.splice(i, 1);
  if (pit.queue.length === 0) pit.queueDeadline = null;
}

// ---------------------------------------------------------------------------
// Bout lifecycle
// ---------------------------------------------------------------------------

function placeFighter(
  ctx: SimContext,
  e: Entity,
  spot: { x: number; z: number; facing: number },
): void {
  e.pos = ctx.groundPos(spot.x, spot.z);
  e.prevPos = { ...e.pos };
  e.facing = spot.facing;
  e.prevFacing = spot.facing;
  ctx.rebucket(e);
}

function startBout(ctx: SimContext): void {
  const pit = ctx.boarpit;
  const seats: PitSeat[] = [];
  for (const pid of pit.queue) {
    const e = ctx.entities.get(pid);
    const meta = ctx.players.get(pid);
    if (!e || !meta || e.dead) continue;
    seats.push({
      pid,
      out: false,
      koPlace: 0,
      deserted: false,
      ret: { x: e.pos.x, z: e.pos.z, facing: e.facing },
    });
  }
  pit.queue.length = 0;
  pit.queueDeadline = null;
  if (seats.length < PIT_MIN_FIGHTERS) {
    // not enough answered the bell: everyone stays queued for the next call
    for (const s of seats) pit.queue.push(s.pid);
    if (pit.queue.length > 0) pit.queueDeadline = ctx.time + PIT_QUEUE_WAIT;
    return;
  }
  const bout: PitBout = {
    id: pit.nextBoutId++,
    phase: 'countdown',
    phaseLeft: PIT_COUNTDOWN,
    elapsed: 0,
    seats,
    outs: 0,
    winnerPid: null,
  };
  pit.bout = bout;
  for (let i = 0; i < seats.length; i++) {
    const e = ctx.entities.get(seats[i].pid);
    if (!e) continue;
    placeFighter(ctx, e, PIT_SLOTS[i]);
    // arena clean slate: full hp/resource, no auras, no cooldown carry-over,
    // so the bout is a fair scrap between kits, not consumable stockpiles.
    ctx.resetForArena(e);
    ctx.emit({ type: 'respawn', pid: seats[i].pid });
    ctx.emit({
      type: 'log',
      text: `Into the pit! ${seats.length} fighters. Fists in ${PIT_COUNTDOWN}...`,
      color: '#ffb56b',
      pid: seats[i].pid,
    });
  }
}

/** A fighter is out of the bout: KO (from the damage clamp), death, or
 *  desertion. KO'd fighters catch their breath at the gate rail. */
export function pitEliminate(ctx: SimContext, pid: number, reason: 'ko' | 'desert'): void {
  const bout = ctx.boarpit.bout;
  if (!bout) return;
  const seat = bout.seats.find((s) => s.pid === pid);
  if (!seat || seat.out) return;
  seat.out = true;
  bout.outs++;
  seat.koPlace = bout.outs;
  if (reason === 'desert') seat.deserted = true;
  const e = ctx.entities.get(pid);
  if (e && reason === 'ko') {
    ctx.resetForArena(e); // clear combat state so the loser is not chained
    placeFighter(ctx, e, PIT_KO_SPOT);
    ctx.emit({ type: 'respawn', pid });
    ctx.emit({
      type: 'log',
      text: 'Knocked out! You are hauled to the rail.',
      color: '#ff8080',
      pid,
    });
  }
  if (e && reason === 'desert') {
    ctx.emit({ type: 'log', text: 'You forfeit the bout.', color: '#ff8080', pid });
  }
}

/** Idempotent desertion (server calls it BEFORE the leave save). */
export function pitResolveDesertion(ctx: SimContext, pid: number): void {
  pitQueueRemove(ctx, pid);
  const seat = pitSeatOf(ctx, pid);
  if (!seat || seat.out) return;
  pitEliminate(ctx, pid, 'desert');
}

/** The saved return position while seated in a bout (serializeCharacter). */
export function pitReturnFor(
  ctx: SimContext,
  pid: number,
): { x: number; z: number; facing: number } | null {
  const seat = pitSeatOf(ctx, pid);
  if (!seat || seat.deserted) return null;
  return seat.ret;
}

function settleBout(ctx: SimContext, winnerPid: number | null): void {
  const bout = ctx.boarpit.bout;
  if (!bout || bout.phase === 'over') return;
  bout.phase = 'over';
  bout.phaseLeft = PIT_OVER_DELAY;
  bout.winnerPid = winnerPid;
  if (winnerPid !== null) {
    const meta = ctx.players.get(winnerPid);
    if (meta) meta.copper += PIT_PURSE_WIN;
    ctx.emit({
      type: 'log',
      text: `Last one standing! You take the pot: ${Math.floor(PIT_PURSE_WIN / 100)}s.`,
      color: '#1eff00',
      pid: winnerPid,
    });
    // the final KO'd fighter earns the consolation cut
    const runnerUp = bout.seats.find((s) => s.koPlace === bout.outs && !s.deserted);
    if (runnerUp) {
      const rMeta = ctx.players.get(runnerUp.pid);
      if (rMeta) rMeta.copper += PIT_PURSE_SECOND;
    }
  } else {
    for (const s of bout.seats) {
      if (!s.out) {
        ctx.emit({
          type: 'log',
          text: 'The Pit Master calls it a draw.',
          color: '#999',
          pid: s.pid,
        });
      }
    }
  }
}

function teardownBout(ctx: SimContext): void {
  const bout = ctx.boarpit.bout;
  if (!bout) return;
  for (const seat of bout.seats) {
    if (seat.deserted) continue;
    const e = ctx.entities.get(seat.pid);
    if (!e || e.dead) continue;
    ctx.resetForArena(e);
    placeFighter(ctx, e, seat.ret);
    ctx.emit({ type: 'respawn', pid: seat.pid });
  }
  ctx.boarpit.bout = null;
}

export function updateBoarpit(ctx: SimContext): void {
  const pit = ctx.boarpit;

  if (!pit.bout && pit.queue.length > 0) {
    if (
      pit.queue.length >= PIT_MAX_FIGHTERS ||
      (pit.queueDeadline !== null &&
        ctx.time >= pit.queueDeadline &&
        pit.queue.length >= PIT_MIN_FIGHTERS)
    ) {
      startBout(ctx);
    } else if (pit.queueDeadline !== null && ctx.time >= pit.queueDeadline) {
      // alone at the bell: wait for a challenger
      pit.queueDeadline = ctx.time + PIT_QUEUE_WAIT;
    }
  }

  const bout = pit.bout;
  if (!bout) return;

  if (bout.phase === 'countdown') {
    bout.phaseLeft -= DT;
    if (bout.phaseLeft <= 0) {
      bout.phase = 'fighting';
      bout.phaseLeft = 0;
      for (const s of bout.seats) {
        if (!s.out) ctx.emit({ type: 'log', text: 'FIGHT!', color: '#1eff00', pid: s.pid });
      }
    }
    return;
  }

  if (bout.phase === 'fighting') {
    bout.elapsed += DT;
    for (const seat of bout.seats) {
      if (seat.out) continue;
      const e = ctx.entities.get(seat.pid);
      if (!e) {
        pitResolveDesertion(ctx, seat.pid);
        continue;
      }
      if (e.dead) {
        // died to something the clamp does not cover (a stray mob, a fall):
        // out of the bout, normal death handling applies.
        pitEliminate(ctx, seat.pid, 'desert');
        continue;
      }
      if (dist2d(e.pos, { x: BOARPIT_CENTER.x, y: 0, z: BOARPIT_CENTER.z }) > PIT_DESERT_RANGE) {
        pitResolveDesertion(ctx, seat.pid);
      }
    }
    const standing = bout.seats.filter((s) => !s.out);
    if (standing.length === 1) settleBout(ctx, standing[0].pid);
    else if (standing.length === 0) settleBout(ctx, null);
    else if (bout.elapsed >= PIT_MAX_DURATION) settleBout(ctx, null);
    return;
  }

  bout.phaseLeft -= DT;
  if (bout.phaseLeft <= 0) teardownBout(ctx);
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

export function pitInfoFor(ctx: SimContext, pid?: number): PitInfo | null {
  const r = ctx.resolve(pid);
  if (!r) return null;
  const me = r.e.id;
  const pit = ctx.boarpit;
  const myQueued = pit.queue.includes(me);
  const seat = pitSeatOf(ctx, me);
  const nearby = isAtBoarpit(r.e.pos.x, r.e.pos.z);
  if (!pit.bout && !myQueued && !nearby) return null;

  let boutInfo: PitBoutInfo | null = null;
  const bout = pit.bout;
  if (bout && (seat || nearby)) {
    const fighters: PitFighterInfo[] = bout.seats.map((s) => {
      const meta = ctx.players.get(s.pid);
      return {
        pid: s.pid,
        name: meta?.name ?? '?',
        me: s.pid === me,
        out: s.out,
        deserted: s.deserted,
      };
    });
    boutInfo = {
      id: bout.id,
      phase: bout.phase,
      countdown: bout.phase === 'fighting' ? 0 : Math.max(0, Math.ceil(bout.phaseLeft)),
      elapsed: Math.floor(bout.elapsed),
      fighters,
      mySeat: seat !== null && !seat.deserted,
      winnerPid: bout.winnerPid,
    };
  }

  return { queued: pit.queue.length, myQueued, bout: boutInfo };
}
