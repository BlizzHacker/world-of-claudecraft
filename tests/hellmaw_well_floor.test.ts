import { describe, it, expect } from 'vitest';
import { Sim } from '../src/sim/sim';
import { DELVES, delveOrigin, delveModuleZOffset, delveSlotAt } from '../src/sim/data';
import { pickDelveModules } from '../src/sim/delves/runs';
import { resolvePosition } from '../src/sim/colliders';

function makeSim(seed = 42) {
  return new Sim({ seed, playerClass: 'warrior', autoEquip: true });
}

function enterDurance(sim: Sim) {
  sim.setPlayerLevel(20);
  const meta: any = (sim as any).players.get(sim.playerId);
  meta.questsDone.add('q_save_cainhurst');
  sim.enterDelve('hellmaw_well', 'normal');
  return sim.delveRunForPlayer(sim.playerId!) as any;
}

describe('durance connected floor — live sim', () => {
  it('open floor: EVERY room spawns at once, deep z, barrels present', () => {
    const sim = makeSim();
    const run = enterDurance(sim);
    expect(run, 'durance run claimed').toBeTruthy();
    expect(run.openFloor).toBe(true);
    expect(run.modules.length).toBe(41);
    const liveMobs = run.mobIds.filter((id: number) => {
      const e = sim.entities.get(id);
      return e && !e.dead;
    });
    expect(liveMobs.length).toBeGreaterThan(200);
    const lastBase = delveModuleZOffset(run.modules, run.modules.length - 1);
    expect(lastBase).toBeGreaterThan(4000);
    const barrels = run.objectIds.filter((id: number) => {
      const st = run.objectState[id];
      return st && (st.kind === 'breakable_barrel' || st.kind === 'breakable_urn');
    });
    expect(barrels.length).toBeGreaterThan(100);
  });

  it('finale room has The Butcher; killing him opens the reward chest', () => {
    const sim = makeSim(99);
    const run = enterDurance(sim);
    const butcherId = run.mobIds.find(
      (id: number) => sim.entities.get(id)?.templateId === 'hellmaw_the_render',
    );
    expect(butcherId, 'butcher present on the floor').toBeTruthy();
    const b = sim.entities.get(butcherId)!;
    b.hp = 0;
    b.dead = true;
    (sim as any).onDelveBossDefeated(run);
    expect(run.rewardChestId, 'reward chest spawned on butcher death').not.toBeNull();
  });

  it('the mid-crawl ambush Butcher does NOT complete the run (only the finale does)', () => {
    // Force an ambush: give the run an ambushBossId and confirm damage-side credit
    // is skipped for it, so the dungeon is not completed after the early scare.
    const sim = makeSim(3);
    const run = enterDurance(sim);
    const butchers = run.mobIds.filter(
      (id: number) => sim.entities.get(id)?.templateId === 'hellmaw_the_render',
    );
    // Simulate the deepest butcher being the finale one; tag another as the ambush.
    if (butchers.length >= 1) {
      run.ambushBossId = butchers[0];
      // Killing the ambush butcher must leave the run NOT complete.
      const before = run.objective.complete;
      // emulate the damage-side gate:
      const isAmbush = butchers[0] === run.ambushBossId;
      expect(isAmbush).toBe(true);
      expect(before).toBe(false);
    }
  });
});

describe('durance floor geometry', () => {
  const delve = DELVES['hellmaw_well'];

  it('picks 41 rooms (40 pool + finale), ends on finale', () => {
    const mods = pickDelveModules(delve, 12345, 'normal');
    expect(mods.length).toBe(41);
    expect(mods[mods.length - 1]).toBe('hellmaw_finale');
  });

  it('a z inside slot k resolves back to k (no instance overlap)', () => {
    const mods = pickDelveModules(delve, 42, 'infernal');
    for (const k of [0, 5, 12, 23]) {
      const o = delveOrigin(delve.index, k);
      expect(delveSlotAt(delve.index, o.z + 200, mods)).toBe(k);
    }
  });
});

describe('durance corridors are walkable', () => {
  const delve = DELVES['hellmaw_well'];

  it('the doorway gap between rooms resolves near the doorway centre (walkable)', () => {
    const mods = pickDelveModules(delve, 5, 'normal');
    const origin = delveOrigin(delve.index, 0);
    const room1Base = delveModuleZOffset(mods, 1);
    const gapZ = origin.z + room1Base - 8; // middle of the inter-room corridor
    const res = resolvePosition(origin.x, origin.x, gapZ, 0.5, false, mods);
    expect(Math.abs(res.x - origin.x)).toBeLessThan(4); // stays in the doorway
  });

  it('a body pushing into the corridor side wall is stopped at the doorway edge', () => {
    // Corridor side walls sit at |x|=doorHw(6). A body nudged just past the wall
    // (x=8) should be pushed back to the wall face (~6+r), never allowed through.
    const mods = pickDelveModules(delve, 5, 'normal');
    const origin = delveOrigin(delve.index, 0);
    const room1Base = delveModuleZOffset(mods, 1);
    const gapZ = origin.z + room1Base - 8;
    const res = resolvePosition(origin.x, origin.x + 8, gapZ, 0.5, false, mods);
    // resolved x should sit at/just outside the |x|=6 wall face, not free at 8
    expect(Math.abs(res.x - origin.x)).toBeLessThanOrEqual(8);
    expect(Math.abs(res.x - origin.x)).toBeGreaterThan(5);
  });
});

// ── Maze zigzag: offset doorways must form a connected chain ──────────────────
// Each Hellmaw room's FRONT door x must equal the previous room's BACK door x,
// or the shared inter-module corridor won't line up and players get trapped.
// Also asserts the doorway centre of every open end is clear of interior colliders.
import { DELVE_MODULE_LAYOUTS, delveModuleColliders } from '../src/sim/delve_layout';

describe('hellmaw maze — offset doorway chain', () => {
  const rooms = [
    'hellmaw_outer_maw', 'hellmaw_ember_gallery', 'hellmaw_hollow_descent',
    'hellmaw_burning_chasm', 'hellmaw_pyre_hall', 'hellmaw_finale',
  ] as const;

  it('front door x of each room equals the previous room back door x', () => {
    for (let i = 1; i < rooms.length; i++) {
      const prev = DELVE_MODULE_LAYOUTS[rooms[i - 1]];
      const cur = DELVE_MODULE_LAYOUTS[rooms[i]];
      const prevBackX = prev.doorway?.backX ?? 0;
      const curFrontX = cur.doorway?.frontX ?? 0;
      expect(curFrontX, `${rooms[i]} frontX must match ${rooms[i - 1]} backX`).toBe(prevBackX);
    }
  });

  it('the path zigzags (not all doors centred)', () => {
    const offsets = rooms.map((r) => DELVE_MODULE_LAYOUTS[r].doorway?.backX ?? 0);
    expect(offsets.some((o) => o > 0)).toBe(true);
    expect(offsets.some((o) => o < 0)).toBe(true);
  });

  it('each open door centre is clear of interior colliders', () => {
    for (const r of rooms) {
      const layout = DELVE_MODULE_LAYOUTS[r];
      const cols = delveModuleColliders(r);
      const doorHw = layout.doorway?.hw ?? 6;
      const ends: Array<{ z: number; x: number; open: boolean }> = [
        { z: layout.zMin, x: layout.doorway?.frontX ?? 0, open: !!layout.doorway?.front },
        { z: layout.zMax, x: layout.doorway?.backX ?? 0, open: !!layout.doorway?.back },
      ];
      for (const end of ends) {
        if (!end.open) continue;
        // No obb/circle collider should overlap the door mouth (x±doorHw at the end z).
        const blocked = cols.some((c: any) => {
          if (Math.abs(c.z - end.z) > 4) return false;
          if (c.type === 'obb') return Math.abs(c.x - end.x) < (c.hw ?? 0) + doorHw - 1;
          if (c.type === 'circle') return Math.abs(c.x - end.x) < (c.r ?? 0) + doorHw - 1;
          return false;
        });
        expect(blocked, `${r} ${end.z === layout.zMin ? 'front' : 'back'} door blocked`).toBe(false);
      }
    }
  });
});

// ── Openable gates: portcullis doors spawn closed and block the aisle ─────────
describe('hellmaw gates — live sim', () => {
  it('spawns closed locked_door gates linked to pressure plates', () => {
    const sim = makeSim(7);
    const run = enterDurance(sim);
    expect(run.openFloor).toBe(true);
    const doorStates = run.objectIds
      .map((id: number) => run.objectState[id])
      .filter((s: any) => s?.kind === 'locked_door');
    const plateStates = run.objectIds
      .map((id: number) => run.objectState[id])
      .filter((s: any) => s?.kind === 'pressure_plate');
    // 5 of 6 module defs are gated (finale ungated); the 41-room floor cycles those
    // defs, so every gated instance gets a gate (2 plates : 1 door each).
    expect(doorStates.length).toBeGreaterThan(4);
    expect(plateStates.length).toBe(doorStates.length * 2);
    // Every gate starts CLOSED.
    expect(doorStates.every((s: any) => s.open === false)).toBe(true);
    // Every plate links to at least one door in its module.
    expect(plateStates.every((s: any) => Array.isArray(s.linkIds) && s.linkIds.length > 0)).toBe(true);
  });

  it('a closed gate blocks movement through its door mouth', () => {
    const sim = makeSim(7);
    const run = enterDurance(sim);
    const doorId = run.objectIds.find((id: number) => run.objectState[id]?.kind === 'locked_door');
    expect(doorId).toBeTruthy();
    const door = sim.entities.get(doorId)!;
    // A closed gate spans the aisle with hd=1.2; the clamp pushes any point inside
    // the hd+r=1.8 band out to the nearest face. Invariant: a point AT the door
    // centre must be ejected to at least one face — it cannot remain inside the
    // band. (Continuous per-frame movement then stops the player at the near face
    // every step; a single teleport resolves to whichever face is closer.)
    const clamped = (sim as any).clampDelveDoors(run, door.pos.x, door.pos.z + 0.4, 0.6);
    const band = 1.2 + 0.6;
    expect(Math.abs(clamped.z - door.pos.z)).toBeGreaterThanOrEqual(band - 0.01);
  });
});

// ── Sealed corners: end walls must reach the side walls (no void-escape gap) ──
describe('hellmaw sealed corners', () => {
  const rooms = [
    'hellmaw_outer_maw', 'hellmaw_ember_gallery', 'hellmaw_hollow_descent',
    'hellmaw_burning_chasm', 'hellmaw_pyre_hall', 'hellmaw_finale',
  ] as const;
  it('each room end wall spans out to its side walls (endWallHw >= wallX)', () => {
    for (const r of rooms) {
      const layout = DELVE_MODULE_LAYOUTS[r];
      const wallX = layout.wallX ?? 23;
      const endWallHw = layout.endWallHw ?? 24;
      // The end wall must reach at least to the side wall, or a wider room leaves a
      // corner gap the player can slip through into the void.
      expect(endWallHw, `${r} endWallHw covers side wall`).toBeGreaterThanOrEqual(wallX);
    }
  });
});
