import { describe, it, expect } from 'vitest';
import { Sim } from '../src/sim/sim';

// Population segregation: within ONE realm-stage process, players only see /
// group / chat / fight others of the SAME (ladder, hardcore) tuple. See
// server/game.ts (canObserveEntity + chat filter) and Sim.samePopulationPlayers
// + isHostileTo. These assert the sim-level rule the server delivery relies on.
function freshSim(): Sim {
  return new Sim({ seed: 42, playerClass: 'warrior', noPlayer: true });
}

describe('population segregation', () => {
  it('samePopulationPlayers: same (ladder,hardcore) tuple = same population', () => {
    const sim = freshSim();
    const a = sim.addPlayer('warrior', 'Norm1', { ladder: false, hardcore: false });
    const b = sim.addPlayer('mage', 'Norm2', { ladder: false, hardcore: false });
    expect(sim.samePopulationPlayers(sim.entities.get(a)!, sim.entities.get(b)!)).toBe(true);
  });

  it('different hardcore flag = different population', () => {
    const sim = freshSim();
    const normal = sim.addPlayer('warrior', 'Normal', { ladder: false, hardcore: false });
    const hc = sim.addPlayer('warrior', 'Hardcore', { ladder: false, hardcore: true });
    expect(sim.samePopulationPlayers(sim.entities.get(normal)!, sim.entities.get(hc)!)).toBe(false);
  });

  it('different ladder flag = different population', () => {
    const sim = freshSim();
    const normal = sim.addPlayer('warrior', 'Normal', { ladder: false, hardcore: false });
    const ladder = sim.addPlayer('warrior', 'Ladder', { ladder: true, hardcore: false });
    expect(sim.samePopulationPlayers(sim.entities.get(normal)!, sim.entities.get(ladder)!)).toBe(false);
  });

  it('hardcore-ladder is its own population vs hardcore-only and ladder-only', () => {
    const sim = freshSim();
    const hc = sim.addPlayer('warrior', 'HC', { ladder: false, hardcore: true });
    const ladder = sim.addPlayer('warrior', 'L', { ladder: true, hardcore: false });
    const hcLadder = sim.addPlayer('warrior', 'HCL', { ladder: true, hardcore: true });
    const eHc = sim.entities.get(hc)!, eL = sim.entities.get(ladder)!, eHcL = sim.entities.get(hcLadder)!;
    expect(sim.samePopulationPlayers(eHcL, eHc)).toBe(false);
    expect(sim.samePopulationPlayers(eHcL, eL)).toBe(false);
    expect(sim.samePopulationPlayers(eHcL, eHcL)).toBe(true);
  });

  it('cross-population players are never hostile (no PvP across populations)', () => {
    const sim = freshSim();
    const normal = sim.addPlayer('warrior', 'Normal', { ladder: false, hardcore: false });
    const hc = sim.addPlayer('warrior', 'Hardcore', { ladder: false, hardcore: true });
    // Even if open-world PvP were enabled, a cross-population pair must not be
    // hostile — the population guard short-circuits isHostileTo.
    expect(sim.isHostileTo(sim.entities.get(normal)!, sim.entities.get(hc)!)).toBe(false);
    expect(sim.isHostileTo(sim.entities.get(hc)!, sim.entities.get(normal)!)).toBe(false);
  });

  it('default population (no opts) is normal: ladder=false, hardcore=false', () => {
    const sim = freshSim();
    const a = sim.addPlayer('warrior', 'Default');
    const meta = sim.meta(a)!;
    expect(meta.ladder).toBe(false);
    expect(meta.hardcore).toBe(false);
  });
});
