// Warcamp Skirmish behavior spec: muster to an instanced field past the rim,
// a real Command Tent + Camp Builder per corner, builders that walk to
// timber/stone and haul it home, barracks/footman/watchtower economy, real
// warband waves marching the tents, tent-loss elimination, and the
// banner-break win. All of it on live entities.

import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import {
  SK_COSTS,
  SK_START_STONE,
  SK_START_WOOD,
  SK_WAVES_TO_BANNER,
  skirmishOrigin,
} from '../src/sim/social/skirmish';

function makeWorld() {
  return new Sim({ seed: 42, playerClass: 'warrior', noPlayer: true });
}

function tickUntil(sim: Sim, pred: () => boolean, maxTicks: number) {
  for (let i = 0; i < maxTicks && !pred(); i++) sim.tick();
}

function musterSolo(sim: Sim): { pid: number } {
  const pid = sim.addPlayer('warrior', 'Commander');
  sim.skirmishQueueJoin(pid);
  tickUntil(sim, () => sim.skirmish.matches.length > 0, 20 * 20);
  expect(sim.skirmish.matches.length).toBe(1);
  return { pid };
}

describe('Warcamp Skirmish', () => {
  it('musters to the far field with a tent, a builder, and starting stock', () => {
    const sim = makeWorld();
    const { pid } = musterSolo(sim);
    const m = sim.skirmish.matches[0];
    const seat = m.seats.find((s) => s.pid === pid)!;
    expect(seat.wood).toBe(SK_START_WOOD);
    expect(seat.stone).toBe(SK_START_STONE);
    const tent = sim.entities.get(seat.tentId!)!;
    const builder = sim.entities.get(seat.builderId!)!;
    expect(tent.kind).toBe('npc');
    expect(tent.npcDuelMortal).toBe(true); // buildings can FALL
    expect(builder.templateId).toBe('skirmish_builder');
    // the commander stands on the instanced field, not in the vale
    const e = sim.entities.get(pid)!;
    const o = skirmishOrigin(m.slot);
    expect(Math.abs(e.pos.x - o.x)).toBeLessThan(100);
  });

  it('builders walk to the node and haul timber home', () => {
    const sim = makeWorld();
    const { pid } = musterSolo(sim);
    const m = sim.skirmish.matches[0];
    const seat = m.seats.find((s) => s.pid === pid)!;
    tickUntil(sim, () => m.phase === 'battle', 20 * 15);
    const before = seat.wood;
    sim.skirmishGather('wood', pid);
    expect(seat.builderJob).not.toBeNull();
    // a round trip on the flat field takes a while; wood must eventually bank
    tickUntil(sim, () => seat.wood > before, 20 * 60);
    expect(seat.wood).toBeGreaterThan(before);
  });

  it('spends the economy: barracks, footman, watchtower', () => {
    const sim = makeWorld();
    const { pid } = musterSolo(sim);
    const m = sim.skirmish.matches[0];
    const seat = m.seats.find((s) => s.pid === pid)!;
    tickUntil(sim, () => m.phase === 'battle', 20 * 15);
    sim.skirmishBuild('barracks', pid);
    expect(seat.barracksId).not.toBeNull();
    expect(seat.wood).toBe(SK_START_WOOD - SK_COSTS.barracks.wood);
    // bank a haul (the gather loop is proven above) so the muster can afford it
    seat.wood += 60;
    seat.stone += 60;
    sim.skirmishTrain(pid);
    expect(seat.footmanIds.length).toBe(1);
    const f = sim.entities.get(seat.footmanIds[0])!;
    expect(f.templateId).toBe('skirmish_footman');
    expect(f.npcDuelMortal).toBe(true); // soldiers can DIE
    // rally: the footman marches
    sim.skirmishRally(0, 0, pid);
    const startX = f.pos.x;
    for (let i = 0; i < 40; i++) sim.tick();
    expect(f.pos.x).not.toBe(startX);
  });

  it('raises real warband waves that march the tents, and loses the camp when the tent falls', () => {
    const sim = makeWorld();
    const { pid } = musterSolo(sim);
    const m = sim.skirmish.matches[0];
    const seat = m.seats.find((s) => s.pid === pid)!;
    tickUntil(sim, () => m.phase === 'battle' && m.warbandIds.length > 0, 20 * 20);
    expect(m.wave).toBe(1);
    for (const wid of m.warbandIds) {
      const w = sim.entities.get(wid)!;
      expect(w.kind).toBe('mob');
      expect(w.templateId).toBe('vale_bandit');
      expect(w.aggroTargetId).toBe(seat.tentId);
    }
    // the tent falls: the camp is out and the match settles lost
    const tent = sim.entities.get(seat.tentId!)!;
    const bandit = sim.entities.get(m.warbandIds[0])!;
    (sim as any).ctx.dealDamage(bandit, tent, tent.hp + 99999, false, 'physical', null, 'hit');
    tickUntil(sim, () => m.phase === 'over', 20 * 4);
    expect(seat.out).toBe(true);
    expect(m.won).toBe(false);
    // teardown returns the commander home and clears the field
    tickUntil(sim, () => sim.skirmish.matches.length === 0, 20 * 15);
    expect(sim.skirmish.matches.length).toBe(0);
  });

  it('wins by breaking the warband banner after enough waves', () => {
    const sim = makeWorld();
    const { pid } = musterSolo(sim);
    const m = sim.skirmish.matches[0];
    tickUntil(sim, () => m.phase === 'battle', 20 * 15);
    const ea = sim.entities.get(pid)!;
    // grind the waves down as they come until the banner window opens
    tickUntil(
      sim,
      () => {
        for (const wid of [...m.warbandIds]) {
          const w = sim.entities.get(wid);
          if (w && !w.dead) {
            (sim as any).ctx.dealDamage(ea, w, w.hp + 5000, false, 'physical', null, 'hit');
          }
        }
        return m.wave >= SK_WAVES_TO_BANNER && m.warbandIds.length === 0;
      },
      20 * 200,
    );
    // now fell the warlord
    const warlord = sim.entities.get(m.warlordId!)!;
    (sim as any).ctx.dealDamage(ea, warlord, warlord.hp + 99999, false, 'physical', null, 'hit');
    tickUntil(sim, () => m.phase === 'over', 20 * 4);
    expect(m.won).toBe(true);
    const meta = (sim as any).players.get(pid);
    expect(meta.copper).toBeGreaterThanOrEqual(12000);
  });
});
