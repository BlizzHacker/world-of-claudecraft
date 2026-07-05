// F4c: player-vs-NPC duel to the death. A player challenges a grinding field NPC
// (the sellswords from F4b); after a short countdown both become mutually hostile
// (isHostileTo consults npcDuels), the NPC turns its combat AI on the player, and
// the fight runs until someone drops. The NPC is made MORTAL for the duel
// (npcDuelMortal bypasses the grinder HP floor); on loss it falls, then respawns
// to full at its home after a delay so the world stays intact.
//
// Kept OFF the PvP `duels` map (which assumes player pids on both sides) — this is
// its own small state machine keyed by the player pid.

import type { NpcDuelState } from '../sim';
import type { SimContext } from '../sim_context';
import { DT, dist2d, type Entity } from '../types';

const NPC_DUEL_COUNTDOWN = 3;
const NPC_DUEL_RANGE = 12; // must be within this to challenge
const NPC_DUEL_FORFEIT_DIST = 60; // run this far → duel cancels
const NPC_DUEL_RESPAWN = 12; // seconds a defeated duel-NPC stays down before restoring

/** Challenge the player's current target (if it's a duelable grinding NPC). */
export function npcDuelChallenge(ctx: SimContext, pid?: number): void {
  const r = ctx.resolve(pid);
  if (!r) return;
  const p = r.e;
  if (p.dead) {
    ctx.error(r.meta.entityId, "You can't challenge anyone while dead.");
    return;
  }
  if (ctx.npcDuels.has(p.id)) {
    ctx.error(r.meta.entityId, 'You are already in a duel.');
    return;
  }
  const npc = p.targetId !== null ? ctx.entities.get(p.targetId) : null;
  if (!npc || npc.kind !== 'npc' || !npc.grinds) {
    ctx.error(r.meta.entityId, 'Target a wandering mercenary to challenge them to a duel.');
    return;
  }
  if (npc.dead) {
    ctx.error(r.meta.entityId, 'They are in no shape to fight.');
    return;
  }
  if (dist2d(p.pos, npc.pos) > NPC_DUEL_RANGE) {
    ctx.error(r.meta.entityId, 'Get closer to issue your challenge.');
    return;
  }
  // Don't let two players duel the same NPC at once.
  for (const d of ctx.npcDuels.values()) {
    if (d.npcId === npc.id) {
      ctx.error(r.meta.entityId, 'They are already locked in a duel.');
      return;
    }
  }
  ctx.npcDuels.set(p.id, {
    playerPid: p.id,
    npcId: npc.id,
    state: 'countdown',
    timer: NPC_DUEL_COUNTDOWN,
  });
  // The NPC drops its mob quarry and squares up.
  npc.aggroTargetId = null;
  npc.npcResting = false;
  ctx.emit({
    type: 'log',
    text: `${npc.name} accepts your challenge — to the death! (${NPC_DUEL_COUNTDOWN}s)`,
    color: '#fa6',
    pid: p.id,
  });
}

/** Tick every active NPC duel: countdown → active, forfeit on distance, and resolve
 *  on a death. Called once per sim tick. */
export function updateNpcDuels(ctx: SimContext): void {
  for (const duel of [...ctx.npcDuels.values()]) {
    const p = ctx.entities.get(duel.playerPid);
    const npc = ctx.entities.get(duel.npcId);
    if (!p || !npc) {
      endNpcDuel(ctx, duel, null);
      continue;
    }
    if (duel.state === 'countdown') {
      duel.timer -= DT;
      if (duel.timer <= 0) {
        duel.state = 'active';
        npc.npcDuelMortal = true; // now killable
        ctx.emit({ type: 'log', text: 'The duel has begun!', color: '#fa6', pid: p.id });
      }
      continue;
    }
    // Active: forfeit if either side dies or the player flees.
    if (p.dead) {
      endNpcDuel(ctx, duel, 'npc');
    } else if (npc.dead) {
      endNpcDuel(ctx, duel, 'player');
    } else if (dist2d(p.pos, npc.pos) > NPC_DUEL_FORFEIT_DIST) {
      endNpcDuel(ctx, duel, null);
    }
  }
}

/** winner: 'player' | 'npc' | null (forfeit/cancel). */
function endNpcDuel(
  ctx: SimContext,
  duel: NpcDuelState,
  winner: 'player' | 'npc' | null,
): void {
  ctx.npcDuels.delete(duel.playerPid);
  const p = ctx.entities.get(duel.playerPid);
  const npc = ctx.entities.get(duel.npcId);
  if (npc) {
    npc.npcDuelMortal = false; // back to unkillable field grinder
    npc.aggroTargetId = null;
    if (p) ctx.clearAurasFromSource(npc, p.id);
    // A defeated NPC restores to full at home after a delay so it's not gone for good.
    if (npc.dead) {
      npc.npcRespawnTimer = NPC_DUEL_RESPAWN;
    }
  }
  if (p) {
    if (npc) ctx.clearAurasFromSource(p, npc.id);
    if (p.targetId === duel.npcId && npc?.dead) p.autoAttack = false;
    if (winner === 'player') {
      ctx.emit({
        type: 'log',
        text: `You have bested ${npc?.name ?? 'your foe'} in a duel!`,
        color: '#6f6',
        pid: p.id,
      });
    } else if (winner === 'npc') {
      ctx.emit({ type: 'log', text: `${npc?.name ?? 'Your foe'} stands victorious.`, color: '#f66', pid: p.id });
    } else {
      ctx.emit({ type: 'log', text: 'The duel has ended.', color: '#fa6', pid: p.id });
    }
  }
}

/** The player pid the given NPC is dueling, or null. Used by the grinder AI to
 *  target the challenger. */
export function npcDuelOpponentOf(ctx: SimContext, npc: Entity): Entity | null {
  for (const d of ctx.npcDuels.values()) {
    if (d.npcId === npc.id && d.state === 'active') return ctx.entities.get(d.playerPid) ?? null;
  }
  return null;
}

/** Restore a defeated duel-NPC once its respawn timer elapses (called per tick from
 *  the npc branch). */
export function tickNpcDuelRespawn(ctx: SimContext, npc: Entity): void {
  if (npc.npcRespawnTimer === undefined || npc.npcRespawnTimer <= 0) return;
  npc.npcRespawnTimer -= DT;
  if (npc.npcRespawnTimer <= 0) {
    npc.npcRespawnTimer = 0;
    npc.dead = false;
    npc.hp = npc.maxHp;
    npc.pos = { x: npc.spawnPos.x, y: npc.pos.y, z: npc.spawnPos.z };
    npc.aggroTargetId = null;
    npc.npcResting = false;
  }
}
