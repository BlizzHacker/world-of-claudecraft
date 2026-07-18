// The Dead Road: Eastbrook's live horde defense. NOT a board game — when the
// alarm sounds, waves of REAL undead mobs spawn on the north road and march
// on the town square; hired sellswords (the existing grinder-NPC machinery:
// they fight, they bleed, they retreat instead of dying) hold the line with
// every player who answers the bell. Between waves defenders FORTIFY the town
// (copper: raises the ward count and puts the line back on its feet). A
// zombie that breaks into the square costs a ward; lose every ward and the
// horde has the town. Survive all waves and the town pays out.
//
// Same discipline as derby/boarpit: one holder on Sim (`Sim.horde`), zero rng
// on the SHARED stream (the horde owns a private seeded Rng for wave jitter,
// the zombie_defense precedent), and every consumer reads ctx.horde.
//
// Reuse over invention (ships without i18n churn): the waves are the already
// localized `restless_bones` undead at escalating levels and counts; the
// defense line is Kael the Sellsword and Huntress Verr (grinders), hired on
// for the night.

import type { HordeInfo } from '../../world_api/horde';
import { MOBS, NPCS } from '../data';
import { createMob, createNpc } from '../entity';
import { Rng } from '../rng';
import type { SimContext } from '../sim_context';
import { DT, dist2d, type Entity } from '../types';

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------
export const HORDE_WAVES = 7; // survive these to win
export const HORDE_PREP = 20; // s from the alarm to wave 1
export const HORDE_INTERMISSION = 15; // s between waves (fortify window)
export const HORDE_OVER_DELAY = 10; // s of aftermath before the event clears
export const HORDE_START_WARDS = 3; // town wards (lives)
export const HORDE_MAX_WARDS = 5;
export const HORDE_FORTIFY_COST = 2000; // copper: +1 ward and heals the line
export const HORDE_WIN_PURSE = 8000; // copper per defender standing at the win
export const HORDE_MOB_ID = 'restless_bones';
export const HORDE_GUARD_IDS = ['mercenary_kael', 'huntress_verr'] as const;
// Watch posts: buildable defenses flanking the line. Each build hires a
// boar-culler archer at the next free post; further builds UPGRADE the
// weakest post (+levels). Cost scales per action.
export const HORDE_POSTS: readonly { x: number; z: number }[] = [
  { x: -14, z: 34 },
  { x: 16, z: 34 },
  { x: -6, z: 26 },
  { x: 8, z: 26 },
];
export const HORDE_POST_BASE_LEVEL = 14;
export const HORDE_POST_UPGRADE_LEVELS = 4;
export const HORDE_POST_MAX_LEVEL = 30;
export const HORDE_BUILD_COST = 1500; // copper per build/upgrade action

// The town square breach circle: a zombie inside costs a ward.
export const HORDE_PLAZA = { x: 0, z: 2, r: 16 };
// Wave spawn line on the north road (staggered across it), marching south.
export const HORDE_SPAWNS: readonly { x: number; z: number }[] = [
  { x: -10, z: 66 },
  { x: -2, z: 70 },
  { x: 6, z: 68 },
  { x: 14, z: 64 },
];
// The defense line: posts between the road and the square where the hired
// blades stand (players naturally form up here too).
export const HORDE_GUARD_POSTS: readonly { x: number; z: number; facing: number }[] = [
  { x: -8, z: 30, facing: 0 },
  { x: -2, z: 32, facing: 0 },
  { x: 4, z: 32, facing: 0 },
  { x: 10, z: 30, facing: 0 },
];
export const HORDE_VENUE_R = 90; // yd from the plaza that counts as defending

// Wave composition: count and mob level scale up; every wave is the same
// LOCALIZED undead so the event ships with zero new entity strings.
export function hordeWavePlan(wave: number): { count: number; level: number } {
  return { count: 3 + wave * 2, level: Math.min(12, 2 + wave) };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type HordePhase = 'idle' | 'prep' | 'wave' | 'intermission' | 'over';

export interface HordeState {
  phase: HordePhase;
  phaseLeft: number; // s in prep/intermission/over
  wave: number; // 1-based current/last wave
  wards: number;
  kills: number;
  won: boolean;
  zombieIds: number[]; // live wave mobs (module-owned entities)
  guardIds: number[]; // hired line NPCs for this event
  posts: { entityId: number; level: number; postIndex: number }[]; // built watch posts
  // Private jittered spawn spread; NEVER the shared stream (parity).
  rng: Rng | null;
}

export function createHordeState(): HordeState {
  return {
    phase: 'idle',
    phaseLeft: 0,
    wave: 0,
    wards: HORDE_START_WARDS,
    kills: 0,
    won: false,
    zombieIds: [],
    guardIds: [],
    posts: [],
    rng: null,
  };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export function hordeStart(ctx: SimContext, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const h = ctx.horde;
  if (h.phase !== 'idle') {
    ctx.error(r.meta.entityId, 'The horde alarm is already sounding.');
    return;
  }
  if (dist2d(r.e.pos, { x: HORDE_PLAZA.x, y: 0, z: HORDE_PLAZA.z }) > HORDE_VENUE_R) {
    ctx.error(r.meta.entityId, 'Sound the alarm from the town defense board.');
    return;
  }
  h.phase = 'prep';
  h.phaseLeft = HORDE_PREP;
  h.wave = 0;
  h.wards = HORDE_START_WARDS;
  h.kills = 0;
  h.won = false;
  h.rng = new Rng((ctx.tickCount % 0x7fffffff) + 1);
  // Hire the line: sellsword copies at the posts (grinders — they fight and
  // retreat, never die; the event releases them at teardown).
  for (let i = 0; i < HORDE_GUARD_POSTS.length; i++) {
    const def = NPCS[HORDE_GUARD_IDS[i % HORDE_GUARD_IDS.length]];
    if (!def) continue;
    const post = HORDE_GUARD_POSTS[i];
    const npc = createNpc(ctx.nextId++, def, ctx.groundPos(post.x, post.z));
    npc.facing = post.facing;
    ctx.addEntity(npc);
    h.guardIds.push(npc.id);
  }
  ctx.emit({
    type: 'log',
    text: 'THE HORDE ALARM SOUNDS! The dead march on Eastbrook from the north road!',
    color: '#ff6b6b',
    pid: r.e.id,
  });
}

export function hordeFortify(ctx: SimContext, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const h = ctx.horde;
  if (h.phase !== 'intermission' && h.phase !== 'prep') {
    ctx.error(r.meta.entityId, 'Fortify between waves, not while the dead are inside the walls.');
    return;
  }
  if (h.wards >= HORDE_MAX_WARDS) {
    ctx.error(r.meta.entityId, 'The town is fortified to the rafters already.');
    return;
  }
  if (r.meta.copper < HORDE_FORTIFY_COST) {
    ctx.error(r.meta.entityId, 'Fortifying the town costs 20s in timber and nails.');
    return;
  }
  r.meta.copper -= HORDE_FORTIFY_COST;
  h.wards++;
  // Put the line back on its feet.
  for (const gid of h.guardIds) {
    const g = ctx.entities.get(gid);
    if (g && !g.dead) g.hp = g.maxHp;
  }
  ctx.emit({
    type: 'log',
    text: `You fortify the town. Wards: ${h.wards}. The line stands taller.`,
    color: '#6cf',
    pid: r.e.id,
  });
}

/** Build the next watch post, or upgrade the weakest one (the "build and
 *  upgrade the defenses" loop). Prep/intermission only, copper-priced. */
export function hordeBuild(ctx: SimContext, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const h = ctx.horde;
  if (h.phase !== 'intermission' && h.phase !== 'prep') {
    ctx.error(r.meta.entityId, 'Build between waves, not while the dead are inside the walls.');
    return;
  }
  if (r.meta.copper < HORDE_BUILD_COST) {
    ctx.error(r.meta.entityId, 'Raising a watch post costs 15s in timber and bowstrings.');
    return;
  }
  const def = NPCS.huntress_verr;
  if (!def) return;
  if (h.posts.length < HORDE_POSTS.length) {
    r.meta.copper -= HORDE_BUILD_COST;
    const postIndex = h.posts.length;
    const spot = HORDE_POSTS[postIndex];
    const npc = createNpc(
      ctx.nextId++,
      { ...def, grindLevel: HORDE_POST_BASE_LEVEL },
      ctx.groundPos(spot.x, spot.z),
    );
    ctx.addEntity(npc);
    h.posts.push({ entityId: npc.id, level: HORDE_POST_BASE_LEVEL, postIndex });
    ctx.emit({
      type: 'log',
      text: `A watch post rises on the line (${h.posts.length} of ${HORDE_POSTS.length}).`,
      color: '#6cf',
      pid: r.e.id,
    });
    return;
  }
  // All posts built: upgrade the weakest.
  const weakest = [...h.posts].sort((a, b) => a.level - b.level)[0];
  if (!weakest || weakest.level >= HORDE_POST_MAX_LEVEL) {
    ctx.error(r.meta.entityId, 'The watch posts are built out.');
    return;
  }
  r.meta.copper -= HORDE_BUILD_COST;
  weakest.level = Math.min(HORDE_POST_MAX_LEVEL, weakest.level + HORDE_POST_UPGRADE_LEVELS);
  const old = ctx.entities.get(weakest.entityId);
  const spot = HORDE_POSTS[weakest.postIndex];
  if (old) ctx.dropEntity(weakest.entityId);
  const npc = createNpc(
    ctx.nextId++,
    { ...def, grindLevel: weakest.level },
    ctx.groundPos(spot.x, spot.z),
  );
  ctx.addEntity(npc);
  weakest.entityId = npc.id;
  ctx.emit({
    type: 'log',
    text: `A watch post is reinforced to strength ${weakest.level}.`,
    color: '#6cf',
    pid: r.e.id,
  });
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

function spawnWave(ctx: SimContext): void {
  const h = ctx.horde;
  h.wave++;
  const plan = hordeWavePlan(h.wave);
  const template = MOBS[HORDE_MOB_ID];
  if (!template) return;
  const rng = h.rng ?? new Rng(1);
  for (let i = 0; i < plan.count; i++) {
    const spot = HORDE_SPAWNS[i % HORDE_SPAWNS.length];
    const jx = (rng.next() - 0.5) * 6;
    const jz = (rng.next() - 0.5) * 6;
    const mob = createMob(
      ctx.nextId++,
      template,
      plan.level,
      ctx.groundPos(spot.x + jx, spot.z + jz),
    );
    ctx.addEntity(mob);
    // March order: point each riser straight at the defense line (aggro
    // radius lives on the TEMPLATE, so the order is a direct aggro target;
    // the tick below re-points any zombie whose target falls or retreats).
    mob.aggroTargetId = h.guardIds[i % Math.max(1, h.guardIds.length)] ?? null;
    h.zombieIds.push(mob.id);
  }
  ctx.emit({
    type: 'log',
    text: `WAVE ${h.wave} of ${HORDE_WAVES}: ${plan.count} of the dead are on the road!`,
    color: '#ff6b6b',
  });
}

function despawnAll(ctx: SimContext, ids: number[]): void {
  for (const id of ids) {
    if (ctx.entities.has(id)) ctx.dropEntity(id);
  }
  ids.length = 0;
}

function settle(ctx: SimContext, won: boolean): void {
  const h = ctx.horde;
  h.won = won;
  h.phase = 'over';
  h.phaseLeft = HORDE_OVER_DELAY;
  despawnAll(ctx, h.zombieIds);
  if (won) {
    // Every defender still standing near the square shares the town's thanks.
    for (const [pid, meta] of ctx.players) {
      const e = ctx.entities.get(pid);
      if (!e || e.dead) continue;
      if (dist2d(e.pos, { x: HORDE_PLAZA.x, y: 0, z: HORDE_PLAZA.z }) > HORDE_VENUE_R) continue;
      meta.copper += HORDE_WIN_PURSE;
      ctx.emit({
        type: 'log',
        text: 'The town stands! The bursar counts out your share: 80s.',
        color: '#1eff00',
        pid,
      });
    }
  } else {
    ctx.emit({
      type: 'log',
      text: 'The last ward falls. The dead have Eastbrook tonight.',
      color: '#ff6b6b',
    });
  }
}

export function updateHorde(ctx: SimContext): void {
  const h = ctx.horde;
  if (h.phase === 'idle') return;

  if (h.phase === 'prep' || h.phase === 'intermission') {
    h.phaseLeft -= DT;
    if (h.phaseLeft <= 0) {
      h.phase = 'wave';
      spawnWave(ctx);
    }
    return;
  }

  if (h.phase === 'wave') {
    let alive = 0;
    for (let i = h.zombieIds.length - 1; i >= 0; i--) {
      const id = h.zombieIds[i];
      const mob = ctx.entities.get(id);
      if (!mob || mob.dead) {
        if (mob?.dead) h.kills++;
        h.zombieIds.splice(i, 1);
        continue;
      }
      // The anchor walks with the mob: no evade-home mid-march (leash is
      // measured from leashAnchor ?? spawnPos in mob locomotion).
      mob.leashAnchor = { x: mob.pos.x, y: mob.pos.y, z: mob.pos.z };
      // Re-issue the march order if this zombie's quarry fell or fled: next
      // guard on the line, else the nearest defender keeps them honest.
      const t = mob.aggroTargetId !== null ? ctx.entities.get(mob.aggroTargetId) : null;
      if (!t || t.dead) {
        const g = h.guardIds.map((gid) => ctx.entities.get(gid)).find((e2) => e2 && !e2.dead);
        mob.aggroTargetId = g ? g.id : null;
      }
      // Breach: a zombie inside the square circle burns a ward and is spent
      // (it scatters into the alleys — despawned, not killed).
      if (dist2d(mob.pos, { x: HORDE_PLAZA.x, y: 0, z: HORDE_PLAZA.z }) <= HORDE_PLAZA.r) {
        ctx.dropEntity(id);
        h.zombieIds.splice(i, 1);
        h.wards--;
        ctx.emit({
          type: 'log',
          text: `The dead break into the square! Wards left: ${Math.max(0, h.wards)}.`,
          color: '#ff6b6b',
        });
        continue;
      }
      alive++;
    }
    if (h.wards <= 0) {
      settle(ctx, false);
      return;
    }
    if (alive === 0 && h.zombieIds.length === 0) {
      if (h.wave >= HORDE_WAVES) {
        settle(ctx, true);
      } else {
        h.phase = 'intermission';
        h.phaseLeft = HORDE_INTERMISSION;
        ctx.emit({
          type: 'log',
          text: `Wave ${h.wave} is down. Fortify while you can — the next comes soon.`,
          color: '#6cf',
        });
      }
    }
    return;
  }

  // 'over': aftermath, then release the hired blades and go quiet.
  h.phaseLeft -= DT;
  if (h.phaseLeft <= 0) {
    despawnAll(ctx, h.guardIds);
    despawnAll(
      ctx,
      h.posts.map((p) => p.entityId),
    );
    h.posts.length = 0;
    const fresh = createHordeState();
    h.phase = fresh.phase;
    h.phaseLeft = fresh.phaseLeft;
    h.wave = fresh.wave;
    h.wards = fresh.wards;
    h.kills = fresh.kills;
    h.won = fresh.won;
    h.rng = null;
  }
}

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

export function hordeInfoFor(ctx: SimContext, pid?: number): HordeInfo | null {
  const r = ctx.resolve(pid);
  if (!r) return null;
  const h = ctx.horde;
  const near = dist2d(r.e.pos, { x: HORDE_PLAZA.x, y: 0, z: HORDE_PLAZA.z }) <= HORDE_VENUE_R + 40;
  if (h.phase === 'idle' && !near) return null;
  return {
    phase: h.phase,
    countdown:
      h.phase === 'prep' || h.phase === 'intermission' ? Math.max(0, Math.ceil(h.phaseLeft)) : 0,
    wave: h.wave,
    waves: HORDE_WAVES,
    wards: Math.max(0, h.wards),
    zombiesLeft: h.zombieIds.length,
    kills: h.kills,
    won: h.won,
    fortifyCostCopper: HORDE_FORTIFY_COST,
    posts: h.posts.map((p) => ({ level: p.level })),
    buildCostCopper: HORDE_BUILD_COST,
  };
}
