// Warcamp Skirmish: the Command-&-Conquer game, played with REAL entities on
// an instanced battlefield far past the world rim (the flat staging plateau —
// the Vale Cup practice-pitch instancing precedent, so no terrain or collider
// work exists out here to fight).
//
// The shape of a match: 1-4 players queue at the war table. Each gets a
// CORNER of the field with a Command Tent and a Camp Builder and a little
// starting stock; timber stands and stone piles dot the midfield. Builders
// are ordered onto nodes and haul wood/stone home; barracks unlock footmen;
// watchtowers anchor a corner. The BANDIT WARBAND holds the north edge: its
// waves march on the camps, and its warlord's banner guard must be broken to
// win. Lose your tent and your camp is out.
//
// Combat pairing (the Dead Road's proven seam): player-side units and
// buildings are grinder NPCs flagged npcDuelMortal (they fight AND can die —
// no retreat-home immortality), the warband is the localized vale_bandit
// mob family with direct aggro orders and walking leash anchors. Buildings
// are grinders pinned to their anchor every tick so they hold ground.
//
// One holder on Sim (`Sim.skirmish`); a PRIVATE Rng for spawn jitter (the
// horde precedent) — never the shared stream.

import type { SkirmishInfo, SkirmishSeatInfo } from '../../world_api/skirmish';
import { MOBS, NPCS } from '../data';
import { createGroundObject, createMob, createNpc } from '../entity';
import { Rng } from '../rng';
import type { SimContext } from '../sim_context';
import { DT, dist2d, type Entity } from '../types';

// ---------------------------------------------------------------------------
// Field + tuning
// ---------------------------------------------------------------------------
// Far-origin instance band: past every existing band (delves 4773+, arena
// 4200, vc practice 30000+/dz400). One skirmish field per slot.
export const SKIRMISH_BASE_X = 40000;
export const SKIRMISH_SLOT_DZ = 500;
export const SKIRMISH_SLOTS = 4; // concurrent matches per realm

export const SK_FIELD = 140; // square field edge, centered on the slot origin
export const SK_QUEUE_WAIT = 15; // s from first signup to march-out
export const SK_OVER_DELAY = 12; // s of aftermath before teardown
export const SK_WAVE_EVERY = 45; // s between warband waves
export const SK_WAVES_TO_BANNER = 3; // waves before the banner guard is attackable

export const SK_START_WOOD = 60;
export const SK_START_STONE = 30;
export const SK_HARVEST_TRIP = 12; // resource per completed builder trip
export const SK_PLAYER_HARVEST = 6; // resource per direct player interact
export const SK_BUILDER_SPEED = 6.5; // yd/s straight-line on the flat field

export const SK_COSTS = {
  barracks: { wood: 60, stone: 20 },
  watchtower: { wood: 30, stone: 40 },
  footman: { wood: 20, stone: 10 },
} as const;
export type SkBuildKind = 'barracks' | 'watchtower';

export const SK_WARLORD_MOB = 'gorrak';
export const SK_WARBAND_MOB = 'vale_bandit';
export const SK_UNIT_LEVELS = { tent: 18, builder: 8, barracks: 16, watchtower: 20, footman: 14 };
export const SK_WIN_PURSE = 12000; // copper per surviving commander

// Corner base anchors (relative to the slot origin); the warband holds north.
export const SK_CORNERS: readonly { x: number; z: number }[] = [
  { x: -55, z: -55 },
  { x: 55, z: -55 },
  { x: -55, z: 0 },
  { x: 55, z: 0 },
];
export const SK_WARBAND_CAMP = { x: 0, z: 60 };
// Midfield resource nodes (relative): timber west/center, stone east/center.
export const SK_NODES: readonly { kind: 'wood' | 'stone'; x: number; z: number }[] = [
  { kind: 'wood', x: -25, z: -20 },
  { kind: 'wood', x: -15, z: 15 },
  { kind: 'wood', x: 5, z: -30 },
  { kind: 'stone', x: 25, z: -15 },
  { kind: 'stone', x: 15, z: 18 },
  { kind: 'stone', x: -5, z: 30 },
];

export function skirmishOrigin(slot: number): { x: number; z: number } {
  return { x: SKIRMISH_BASE_X, z: slot * SKIRMISH_SLOT_DZ };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type SkPhase = 'muster' | 'battle' | 'over';

export interface SkSeat {
  pid: number;
  corner: number;
  wood: number;
  stone: number;
  tentId: number | null; // Command Tent entity (loss when it falls)
  builderId: number | null;
  builderJob: { nodeIndex: number; carrying: boolean } | null;
  barracksId: number | null;
  towerIds: number[];
  footmanIds: number[];
  rally: { x: number; z: number } | null; // field-relative rally point
  out: boolean;
  ret: { x: number; z: number; facing: number };
}

export interface SkMatch {
  id: number;
  slot: number;
  phase: SkPhase;
  phaseLeft: number;
  elapsed: number;
  wave: number;
  seats: SkSeat[];
  warbandIds: number[];
  warlordId: number | null;
  won: boolean;
  rng: Rng;
}

export interface SkirmishState {
  queue: number[];
  queueDeadline: number | null;
  matches: SkMatch[];
  nextMatchId: number;
}

export function createSkirmishState(): SkirmishState {
  return { queue: [], queueDeadline: null, matches: [], nextMatchId: 1 };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchOf(ctx: SimContext, pid: number): { m: SkMatch; seat: SkSeat } | null {
  for (const m of ctx.skirmish.matches) {
    const seat = m.seats.find((s) => s.pid === pid);
    if (seat) return { m, seat };
  }
  return null;
}

/** Every live skirmish entity of a seat is mutually engaged with the warband:
 *  the combat itself flows through the grinder-vs-mob machinery. */
export function skirmishSeatOf(ctx: SimContext, pid: number): SkSeat | null {
  return matchOf(ctx, pid)?.seat ?? null;
}

function fieldPos(m: SkMatch, rx: number, rz: number): { x: number; z: number } {
  const o = skirmishOrigin(m.slot);
  return { x: o.x + rx, z: o.z + rz };
}

function spawnUnit(
  ctx: SimContext,
  m: SkMatch,
  defId: string,
  level: number,
  rx: number,
  rz: number,
  mortal: boolean,
): Entity | null {
  const def = NPCS[defId];
  if (!def) return null;
  const p = fieldPos(m, rx, rz);
  const npc = createNpc(
    ctx.nextId++,
    { ...def, grinds: true, grindLevel: level },
    ctx.groundPos(p.x, p.z),
  );
  npc.npcDuelMortal = mortal;
  ctx.addEntity(npc);
  return npc;
}

function costOk(seat: SkSeat, cost: { wood: number; stone: number }): boolean {
  return seat.wood >= cost.wood && seat.stone >= cost.stone;
}

function paySeat(seat: SkSeat, cost: { wood: number; stone: number }): void {
  seat.wood -= cost.wood;
  seat.stone -= cost.stone;
}

// ---------------------------------------------------------------------------
// Queue + commands
// ---------------------------------------------------------------------------

export function skirmishQueueJoin(ctx: SimContext, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const { meta, e } = r;
  if (e.dead || e.inCombat) {
    ctx.error(meta.entityId, "You can't muster a warcamp right now.");
    return;
  }
  const sk = ctx.skirmish;
  if (sk.queue.includes(e.id) || matchOf(ctx, e.id)) return;
  if (sk.queue.length >= SK_CORNERS.length) {
    ctx.error(meta.entityId, 'The muster roll is full.');
    return;
  }
  sk.queue.push(e.id);
  if (sk.queueDeadline === null) sk.queueDeadline = ctx.time + SK_QUEUE_WAIT;
  ctx.emit({
    type: 'log',
    text: `You are on the muster roll for a Warcamp Skirmish (${sk.queue.length} of 4).`,
    color: '#9fd4ff',
    pid: e.id,
  });
}

export function skirmishQueueLeave(ctx: SimContext, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const sk = ctx.skirmish;
  const i = sk.queue.indexOf(r.e.id);
  if (i >= 0) {
    sk.queue.splice(i, 1);
    if (sk.queue.length === 0) sk.queueDeadline = null;
  }
}

/** Order the builder onto the nearest resource node of `kind`. */
export function skirmishGather(ctx: SimContext, kind: 'wood' | 'stone', pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const found = matchOf(ctx, r.e.id);
  if (!found || found.seat.out) return;
  const { m, seat } = found;
  if (seat.builderId === null || !ctx.entities.get(seat.builderId)) {
    ctx.error(r.meta.entityId, 'Your camp builder has fallen.');
    return;
  }
  let best = -1;
  let bestD = Infinity;
  const corner = SK_CORNERS[seat.corner];
  for (let i = 0; i < SK_NODES.length; i++) {
    if (SK_NODES[i].kind !== kind) continue;
    const d = Math.hypot(SK_NODES[i].x - corner.x, SK_NODES[i].z - corner.z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best < 0) return;
  seat.builderJob = { nodeIndex: best, carrying: false };
  ctx.emit({
    type: 'log',
    text: kind === 'wood' ? 'Your builder shoulders the axe.' : 'Your builder hefts the pick.',
    color: '#9fd4ff',
    pid: r.e.id,
  });
}

export function skirmishBuild(ctx: SimContext, kind: SkBuildKind, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const found = matchOf(ctx, r.e.id);
  if (!found || found.seat.out) return;
  const { m, seat } = found;
  const cost = SK_COSTS[kind];
  if (!costOk(seat, cost)) {
    ctx.error(r.meta.entityId, 'Not enough timber and stone for that.');
    return;
  }
  const corner = SK_CORNERS[seat.corner];
  if (kind === 'barracks') {
    if (seat.barracksId !== null && ctx.entities.get(seat.barracksId)) {
      ctx.error(r.meta.entityId, 'Your camp already has a barracks.');
      return;
    }
    paySeat(seat, cost);
    const b = spawnUnit(
      ctx,
      m,
      'skirmish_post',
      SK_UNIT_LEVELS.barracks,
      corner.x + 6,
      corner.z,
      true,
    );
    if (b) seat.barracksId = b.id;
    ctx.emit({
      type: 'log',
      text: 'Your barracks stands. Footmen may muster.',
      color: '#6cf',
      pid: r.e.id,
    });
    return;
  }
  // watchtower (up to 3 per camp, spread on the camp's field-facing arc)
  if (seat.towerIds.filter((id) => ctx.entities.get(id)).length >= 3) {
    ctx.error(r.meta.entityId, 'Your camp has all its watchtowers.');
    return;
  }
  paySeat(seat, cost);
  const n = seat.towerIds.length;
  const t = spawnUnit(
    ctx,
    m,
    'skirmish_post',
    SK_UNIT_LEVELS.watchtower,
    corner.x + (n - 1) * 7,
    corner.z + 9,
    true,
  );
  if (t) seat.towerIds.push(t.id);
  ctx.emit({ type: 'log', text: 'A watchtower rises over your camp.', color: '#6cf', pid: r.e.id });
}

export function skirmishTrain(ctx: SimContext, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const found = matchOf(ctx, r.e.id);
  if (!found || found.seat.out) return;
  const { m, seat } = found;
  if (seat.barracksId === null || !ctx.entities.get(seat.barracksId)) {
    ctx.error(r.meta.entityId, 'Footmen need a barracks.');
    return;
  }
  if (!costOk(seat, SK_COSTS.footman)) {
    ctx.error(r.meta.entityId, 'Not enough timber and stone for that.');
    return;
  }
  paySeat(seat, SK_COSTS.footman);
  const corner = SK_CORNERS[seat.corner];
  const f = spawnUnit(
    ctx,
    m,
    'skirmish_footman',
    SK_UNIT_LEVELS.footman,
    corner.x + 3 + (seat.footmanIds.length % 4) * 2,
    corner.z + 5,
    true,
  );
  if (f) seat.footmanIds.push(f.id);
  ctx.emit({ type: 'log', text: 'A footman answers the muster.', color: '#6cf', pid: r.e.id });
}

/** March every footman of your camp toward a field point (they engage what
 *  they meet — grinders fight whatever hostile crosses them). */
export function skirmishRally(ctx: SimContext, rx: number, rz: number, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const found = matchOf(ctx, r.e.id);
  if (!found || found.seat.out) return;
  const cx = Math.max(-SK_FIELD / 2, Math.min(SK_FIELD / 2, rx));
  const cz = Math.max(-SK_FIELD / 2, Math.min(SK_FIELD / 2, rz));
  found.seat.rally = { x: cx, z: cz };
  ctx.emit({
    type: 'log',
    text: 'Your footmen march on the rally point.',
    color: '#9fd4ff',
    pid: r.e.id,
  });
}

// ---------------------------------------------------------------------------
// Match lifecycle
// ---------------------------------------------------------------------------

function startMatch(ctx: SimContext): void {
  const sk = ctx.skirmish;
  const usedSlots = new Set(sk.matches.map((mm) => mm.slot));
  let slot = -1;
  for (let i = 0; i < SKIRMISH_SLOTS; i++) {
    if (!usedSlots.has(i)) {
      slot = i;
      break;
    }
  }
  if (slot < 0) {
    sk.queueDeadline = ctx.time + SK_QUEUE_WAIT; // all fields busy; hold the roll
    return;
  }
  const pids = sk.queue.splice(0, SK_CORNERS.length);
  sk.queueDeadline = sk.queue.length > 0 ? ctx.time + SK_QUEUE_WAIT : null;
  const m: SkMatch = {
    id: sk.nextMatchId++,
    slot,
    phase: 'muster',
    phaseLeft: 10,
    elapsed: 0,
    wave: 0,
    seats: [],
    warbandIds: [],
    warlordId: null,
    won: false,
    rng: new Rng((ctx.tickCount % 0x7fffffff) + 7),
  };
  for (let i = 0; i < pids.length; i++) {
    const e = ctx.entities.get(pids[i]);
    const meta = ctx.players.get(pids[i]);
    if (!e || !meta || e.dead) continue;
    const corner = SK_CORNERS[i];
    const seat: SkSeat = {
      pid: pids[i],
      corner: i,
      wood: SK_START_WOOD,
      stone: SK_START_STONE,
      tentId: null,
      builderId: null,
      builderJob: null,
      barracksId: null,
      towerIds: [],
      footmanIds: [],
      rally: null,
      out: false,
      ret: { x: e.pos.x, z: e.pos.z, facing: e.facing },
    };
    const tent = spawnUnit(ctx, m, 'skirmish_post', SK_UNIT_LEVELS.tent, corner.x, corner.z, true);
    const builder = spawnUnit(
      ctx,
      m,
      'skirmish_builder',
      SK_UNIT_LEVELS.builder,
      corner.x + 3,
      corner.z + 3,
      true,
    );
    seat.tentId = tent?.id ?? null;
    seat.builderId = builder?.id ?? null;
    m.seats.push(seat);
    // The commander walks their own field.
    const p = fieldPos(m, corner.x, corner.z - 6);
    e.pos = ctx.groundPos(p.x, p.z);
    e.prevPos = { ...e.pos };
    e.facing = 0;
    ctx.rebucket(e);
    ctx.emit({ type: 'respawn', pid: pids[i] });
    ctx.emit({
      type: 'log',
      text: 'WARCAMP SKIRMISH: raise your camp, hold your tent, break the warband banner!',
      color: '#9fd4ff',
      pid: pids[i],
    });
  }
  if (m.seats.length === 0) return;
  // The warband musters at the north edge; the warlord waits behind his guard.
  const warlordTemplate = MOBS[SK_WARLORD_MOB];
  if (warlordTemplate) {
    const p = fieldPos(m, SK_WARBAND_CAMP.x, SK_WARBAND_CAMP.z);
    const boss = createMob(ctx.nextId++, warlordTemplate, 12, ctx.groundPos(p.x, p.z));
    ctx.addEntity(boss);
    m.warlordId = boss.id;
  }
  ctx.skirmish.matches.push(m);
}

function spawnWarbandWave(ctx: SimContext, m: SkMatch): void {
  m.wave++;
  const template = MOBS[SK_WARBAND_MOB];
  if (!template) return;
  const count = 2 + m.wave + m.seats.filter((s) => !s.out).length;
  for (let i = 0; i < count; i++) {
    const jx = (m.rng.next() - 0.5) * 24;
    const jz = (m.rng.next() - 0.5) * 8;
    const p = fieldPos(m, SK_WARBAND_CAMP.x + jx, SK_WARBAND_CAMP.z - 6 + jz);
    const mob = createMob(
      ctx.nextId++,
      template,
      Math.min(14, 6 + m.wave),
      ctx.groundPos(p.x, p.z),
    );
    ctx.addEntity(mob);
    // March order: split the wave across the LIVE camps' tents.
    const live = m.seats.filter((s) => !s.out && s.tentId !== null);
    const target = live[i % Math.max(1, live.length)];
    mob.aggroTargetId = target?.tentId ?? null;
    m.warbandIds.push(mob.id);
  }
  for (const s of m.seats) {
    if (!s.out) {
      ctx.emit({
        type: 'log',
        text: `Warband wave ${m.wave} rides for the camps!`,
        color: '#ff6b6b',
        pid: s.pid,
      });
    }
  }
}

function teardownMatch(ctx: SimContext, m: SkMatch): void {
  for (const seat of m.seats) {
    for (const id of [
      seat.tentId,
      seat.builderId,
      seat.barracksId,
      ...seat.towerIds,
      ...seat.footmanIds,
    ]) {
      if (id !== null && ctx.entities.has(id)) ctx.dropEntity(id);
    }
    const e = ctx.entities.get(seat.pid);
    if (e && !e.dead) {
      e.pos = ctx.groundPos(seat.ret.x, seat.ret.z);
      e.prevPos = { ...e.pos };
      e.facing = seat.ret.facing;
      ctx.rebucket(e);
      ctx.emit({ type: 'respawn', pid: seat.pid });
    }
  }
  for (const id of m.warbandIds) {
    if (ctx.entities.has(id)) ctx.dropEntity(id);
  }
  if (m.warlordId !== null && ctx.entities.has(m.warlordId)) ctx.dropEntity(m.warlordId);
  const i = ctx.skirmish.matches.indexOf(m);
  if (i >= 0) ctx.skirmish.matches.splice(i, 1);
}

function stepBuilder(ctx: SimContext, m: SkMatch, seat: SkSeat): void {
  if (seat.builderId === null || seat.builderJob === null) return;
  const b = ctx.entities.get(seat.builderId);
  if (!b || b.dead) {
    seat.builderId = null;
    seat.builderJob = null;
    return;
  }
  const corner = SK_CORNERS[seat.corner];
  const node = SK_NODES[seat.builderJob.nodeIndex];
  const goal = seat.builderJob.carrying ? corner : { x: node.x, z: node.z };
  const gp = fieldPos(m, goal.x, goal.z);
  const dx = gp.x - b.pos.x;
  const dz = gp.z - b.pos.z;
  const d = Math.hypot(dx, dz);
  if (d <= 1.6) {
    if (seat.builderJob.carrying) {
      // Delivered: bank the load and head back out.
      if (node.kind === 'wood') seat.wood += SK_HARVEST_TRIP;
      else seat.stone += SK_HARVEST_TRIP;
      seat.builderJob.carrying = false;
    } else {
      seat.builderJob.carrying = true; // chopped/mined a load
    }
    return;
  }
  const step = Math.min(d, SK_BUILDER_SPEED * DT);
  b.pos.x += (dx / d) * step;
  b.pos.z += (dz / d) * step;
  b.pos.y = ctx.groundPos(b.pos.x, b.pos.z).y;
  b.facing = Math.atan2(dx, dz);
  ctx.rebucket(b);
}

function stepFootmen(ctx: SimContext, m: SkMatch, seat: SkSeat): void {
  if (!seat.rally) return;
  const rp = fieldPos(m, seat.rally.x, seat.rally.z);
  for (const id of seat.footmanIds) {
    const f = ctx.entities.get(id);
    if (!f || f.dead || f.inCombat) continue;
    const dx = rp.x - f.pos.x;
    const dz = rp.z - f.pos.z;
    const d = Math.hypot(dx, dz);
    if (d <= 3) continue;
    const step = Math.min(d, SK_BUILDER_SPEED * 1.2 * DT);
    f.pos.x += (dx / d) * step;
    f.pos.z += (dz / d) * step;
    f.pos.y = ctx.groundPos(f.pos.x, f.pos.z).y;
    f.facing = Math.atan2(dx, dz);
    ctx.rebucket(f);
  }
}

export function updateSkirmish(ctx: SimContext): void {
  const sk = ctx.skirmish;

  if (sk.queue.length > 0) {
    if (
      sk.queue.length >= SK_CORNERS.length ||
      (sk.queueDeadline !== null && ctx.time >= sk.queueDeadline)
    ) {
      startMatch(ctx);
    }
  }

  for (const m of [...sk.matches]) {
    if (m.phase === 'muster') {
      m.phaseLeft -= DT;
      if (m.phaseLeft <= 0) {
        m.phase = 'battle';
        m.phaseLeft = 0;
        spawnWarbandWave(ctx, m);
      }
      continue;
    }

    if (m.phase === 'battle') {
      m.elapsed += DT;
      // Buildings hold their ground; builders haul; footmen march.
      for (const seat of m.seats) {
        if (seat.out) continue;
        // Tent loss check.
        const tent = seat.tentId !== null ? ctx.entities.get(seat.tentId) : null;
        if (!tent || tent.dead) {
          seat.out = true;
          ctx.emit({
            type: 'log',
            text: 'Your Command Tent has fallen. Your camp is out.',
            color: '#ff6b6b',
            pid: seat.pid,
          });
          continue;
        }
        stepBuilder(ctx, m, seat);
        stepFootmen(ctx, m, seat);
      }
      // Warband bookkeeping: walking anchors + re-point at live tents.
      const live = m.seats.filter((s) => !s.out && s.tentId !== null);
      for (let i = m.warbandIds.length - 1; i >= 0; i--) {
        const mob = ctx.entities.get(m.warbandIds[i]);
        if (!mob || mob.dead) {
          m.warbandIds.splice(i, 1);
          continue;
        }
        mob.leashAnchor = { x: mob.pos.x, y: mob.pos.y, z: mob.pos.z };
        const t = mob.aggroTargetId !== null ? ctx.entities.get(mob.aggroTargetId) : null;
        if ((!t || t.dead) && live.length > 0) {
          mob.aggroTargetId = live[i % live.length].tentId;
        }
      }
      if (m.warlordId !== null) {
        const w = ctx.entities.get(m.warlordId);
        if (w) w.leashAnchor = { x: w.pos.x, y: w.pos.y, z: w.pos.z };
      }
      // Next wave on the timer while the banner stands.
      if (m.warbandIds.length === 0 && m.elapsed >= m.wave * SK_WAVE_EVERY) {
        spawnWarbandWave(ctx, m);
      }
      // WIN: the warlord (banner guard) is down after enough waves broke.
      const warlord = m.warlordId !== null ? ctx.entities.get(m.warlordId) : null;
      if ((!warlord || warlord.dead) && m.wave >= SK_WAVES_TO_BANNER) {
        m.won = true;
        m.phase = 'over';
        m.phaseLeft = SK_OVER_DELAY;
        for (const s of m.seats) {
          if (s.out) continue;
          const meta = ctx.players.get(s.pid);
          if (meta) meta.copper += SK_WIN_PURSE;
          ctx.emit({
            type: 'log',
            text: 'The warband banner falls! The field is yours: 120s the commander.',
            color: '#1eff00',
            pid: s.pid,
          });
        }
        continue;
      }
      // LOSS: every camp out.
      if (live.length === 0) {
        m.won = false;
        m.phase = 'over';
        m.phaseLeft = SK_OVER_DELAY;
        for (const s of m.seats) {
          ctx.emit({
            type: 'log',
            text: 'The warband overruns the field. The skirmish is lost.',
            color: '#ff6b6b',
            pid: s.pid,
          });
        }
      }
      continue;
    }

    // over
    m.phaseLeft -= DT;
    if (m.phaseLeft <= 0) teardownMatch(ctx, m);
  }
}

/** Desertion / logout: the seat is out; camp assets stand until teardown. */
export function skirmishResolveDesertion(ctx: SimContext, pid: number): void {
  skirmishQueueLeave(ctx, pid);
  const found = matchOf(ctx, pid);
  if (!found || found.seat.out) return;
  found.seat.out = true;
}

export function skirmishReturnFor(
  ctx: SimContext,
  pid: number,
): { x: number; z: number; facing: number } | null {
  const found = matchOf(ctx, pid);
  if (!found || found.seat.out) return null;
  return found.seat.ret;
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

export function skirmishInfoFor(ctx: SimContext, pid?: number): SkirmishInfo | null {
  const r = ctx.resolve(pid);
  if (!r) return null;
  const me = r.e.id;
  const sk = ctx.skirmish;
  const found = matchOf(ctx, me);
  const myQueued = sk.queue.includes(me);
  if (!found && !myQueued) return null;
  let seatInfo: SkirmishSeatInfo | null = null;
  let phase: SkPhase | null = null;
  let wave = 0;
  let won = false;
  if (found) {
    const { m, seat } = found;
    phase = m.phase;
    wave = m.wave;
    won = m.won;
    seatInfo = {
      wood: seat.wood,
      stone: seat.stone,
      footmen: seat.footmanIds.filter((id) => !ctx.entities.get(id)?.dead && ctx.entities.has(id))
        .length,
      towers: seat.towerIds.filter((id) => ctx.entities.has(id)).length,
      hasBarracks: seat.barracksId !== null && ctx.entities.has(seat.barracksId),
      tentAlive: seat.tentId !== null && !ctx.entities.get(seat.tentId)?.dead,
      out: seat.out,
    };
  }
  return {
    queued: sk.queue.length,
    myQueued,
    phase,
    wave,
    won,
    seat: seatInfo,
    costs: SK_COSTS,
  };
}
