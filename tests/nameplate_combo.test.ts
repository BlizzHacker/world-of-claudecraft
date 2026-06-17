import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { comboPipsFor, COMBO_PIP_MAX } from '../src/render/nameplate_combo';

function makeWorld() {
  const sim = new Sim({ seed: 42, playerClass: 'rogue', noPlayer: true });
  const pid = sim.addPlayer('rogue', 'Aleph');
  const foe = sim.addPlayer('warrior', 'Bet');
  sim.tick();
  return { player: sim.entities.get(pid)!, foe: sim.entities.get(foe)! };
}

describe('comboPipsFor', () => {
  it('lights one pip per combo point on the targeted entity', () => {
    const { player, foe } = makeWorld();
    player.comboPoints = 3;
    player.comboTargetId = foe.id;
    expect(comboPipsFor(player, foe)).toBe(3);
  });

  it('shows nothing on entities that are not the combo target', () => {
    const { player, foe } = makeWorld();
    player.comboPoints = 4;
    player.comboTargetId = player.id; // points anchored elsewhere
    expect(comboPipsFor(player, foe)).toBe(0);
  });

  it('shows nothing when no points are built', () => {
    const { player, foe } = makeWorld();
    player.comboPoints = 0;
    player.comboTargetId = foe.id;
    expect(comboPipsFor(player, foe)).toBe(0);
  });

  it('clears pips once the target is dead', () => {
    const { player, foe } = makeWorld();
    player.comboPoints = 5;
    player.comboTargetId = foe.id;
    foe.dead = true;
    expect(comboPipsFor(player, foe)).toBe(0);
  });

  it('never exceeds the pip cap even on a transient overshoot', () => {
    const { player, foe } = makeWorld();
    player.comboPoints = 99;
    player.comboTargetId = foe.id;
    expect(comboPipsFor(player, foe)).toBe(COMBO_PIP_MAX);
  });
});
