// Stuck give-up in the roaming-NPC AI (npc/roam.ts): the wave-13 hub-anchored
// building spread can put a pure-hash wander target inside a building, and the
// walk toward it then never arrives — before the give-up existed, every pinned
// town NPC re-ran the full moveToward slide fan (terrain sampling + collider
// depenetration) 20 times a second forever, which is what starved the server
// event loop in the 2026-08-16 infernal/classic incident. These tests drive
// updateRoamingNpc against a minimal fake SimContext and count moveToward calls:
// the fan's price must only be paid while it buys movement.
import { describe, expect, it, vi } from 'vitest';
import { updateRoamingNpc } from '../src/sim/npc/roam';
import type { SimContext } from '../src/sim/sim_context';
import { DT, type Entity } from '../src/sim/types';

const STUCK_GIVE_UP_TICKS = 20; // mirrors npc/roam.ts
const STUCK_RETRY_EVERY = 40; // mirrors npc/roam.ts

function makeNpc(over: Partial<Entity> = {}): Entity {
  return {
    id: 7,
    kind: 'npc',
    dead: false,
    roams: true,
    pos: { x: 0, y: 0, z: 0 },
    spawnPos: { x: 0, y: 0, z: 0 },
    wanderTarget: null,
    wanderTimer: 0,
    roamHop: 0,
    moveSpeed: 2,
  } as unknown as Entity;
}

interface FakeCtxOpts {
  // moveToward result per call; default: pinned (no movement, never arrives)
  moveToward?: (npc: Entity, dest: { x: number; z: number }, speed: number) => boolean;
  resolveMovePoint?: (x: number, z: number) => { x: number; z: number };
  playerNearHome?: boolean;
}

function makeCtx(opts: FakeCtxOpts = {}) {
  const entities = new Map<number, Entity>();
  const players = new Map<number, unknown>();
  if (opts.playerNearHome) {
    const player = {
      id: 1,
      kind: 'player',
      dead: false,
      targetId: null,
      pos: { x: 0, y: 0, z: 1 },
    } as unknown as Entity;
    entities.set(1, player);
    players.set(1, {});
  }
  const moveToward = vi.fn(opts.moveToward ?? (() => false)); // pinned: no pos change, no arrival
  const resolveMovePoint = vi.fn((x: number, z: number) =>
    opts.resolveMovePoint ? opts.resolveMovePoint(x, z) : { x, z },
  );
  const ctx = {
    entities,
    players,
    npcDuels: new Map(),
    moveToward,
    resolveMovePoint,
    groundPos: (x: number, z: number) => ({ x, y: 0, z }),
    isRooted: () => false,
    moveSpeedMult: () => 1,
  } as unknown as SimContext;
  return { ctx, moveToward, resolveMovePoint };
}

describe('roaming NPC stuck give-up', () => {
  it('resolves each hop target out of colliders at pick time', () => {
    const { ctx, resolveMovePoint } = makeCtx({
      // "target was inside a building": the resolver returns the wall-face point
      resolveMovePoint: () => ({ x: 1.25, z: -0.5 }),
    });
    const npc = makeNpc();
    updateRoamingNpc(ctx, npc); // wanderTimer 0 -> picks a hop
    expect(resolveMovePoint).toHaveBeenCalledTimes(1);
    expect(npc.wanderTarget).toEqual({ x: 1.25, y: 0, z: -0.5 });
  });

  it('a pinned walk abandons the hop after the give-up threshold and dwells instead of grinding the fan forever', () => {
    const { ctx, moveToward } = makeCtx(); // pinned moveToward
    const npc = makeNpc();
    updateRoamingNpc(ctx, npc); // picks the hop target
    expect(npc.wanderTarget).not.toBeNull();

    // 100 further ticks (5s at 20 Hz). Pre-give-up behavior would burn 100
    // moveToward fans; the give-up abandons the hop after STUCK_GIVE_UP_TICKS
    // and the NPC dwells (hashed 3-8s, i.e. >= 60 ticks) before even PICKING
    // again, so at most two walk phases fit — the fan runs at most ~40 times.
    for (let i = 0; i < 100; i++) updateRoamingNpc(ctx, npc);
    expect(moveToward.mock.calls.length).toBeGreaterThanOrEqual(STUCK_GIVE_UP_TICKS);
    expect(moveToward.mock.calls.length).toBeLessThanOrEqual(2 * STUCK_GIVE_UP_TICKS + 5);
  });

  it('a walk that is actually progressing never gives up and still arrives', () => {
    const { ctx, moveToward } = makeCtx({
      moveToward: (npc, dest, speed) => {
        // real movement: step toward dest at full speed, arrive inside 0.3
        const dx = dest.x - npc.pos.x;
        const dz = dest.z - npc.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.3) return true;
        const step = Math.min(speed * DT, d);
        npc.pos.x += (dx / d) * step;
        npc.pos.z += (dz / d) * step;
        return d - step < 0.3;
      },
    });
    const npc = makeNpc();
    updateRoamingNpc(ctx, npc); // pick
    const target = npc.wanderTarget!;
    expect(target).not.toBeNull();
    let arrivedTicks = 0;
    for (let i = 0; i < 200 && npc.wanderTarget; i++) {
      updateRoamingNpc(ctx, npc);
      arrivedTicks = i + 1;
    }
    expect(npc.wanderTarget).toBeNull(); // arrived into the dwell
    expect(npc.wanderTimer).toBeGreaterThan(0);
    // Sanity: it took a plausible number of walking ticks, all of them real
    // moveToward calls (no held ticks on a progressing walk).
    expect(moveToward).toHaveBeenCalledTimes(arrivedTicks);
    expect(npc.roamStuckTicks ?? 0).toBe(0);
  });

  it('the pinned return-home arm holds still and re-probes sparsely instead of fanning every tick', () => {
    const { ctx, moveToward } = makeCtx({ playerNearHome: true });
    const npc = makeNpc();
    npc.pos.x = 3; // displaced from home; a collider (pinned stub) blocks the way back

    // First STUCK_GIVE_UP_TICKS ticks pay the probe; after that the arm holds,
    // re-probing once every STUCK_RETRY_EVERY ticks.
    for (let i = 0; i < STUCK_GIVE_UP_TICKS; i++) updateRoamingNpc(ctx, npc);
    const probesAtGiveUp = moveToward.mock.calls.length;
    expect(probesAtGiveUp).toBe(STUCK_GIVE_UP_TICKS);

    for (let i = 0; i < 4 * STUCK_RETRY_EVERY; i++) updateRoamingNpc(ctx, npc);
    const heldPhaseProbes = moveToward.mock.calls.length - probesAtGiveUp;
    // 160 held-phase ticks may probe at most once per retry interval.
    expect(heldPhaseProbes).toBeLessThanOrEqual(4);
    expect(heldPhaseProbes).toBeGreaterThanOrEqual(3);
  });
});
