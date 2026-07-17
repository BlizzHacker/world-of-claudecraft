import { describe, expect, it } from 'vitest';
import { FLYING_MIN_ALTITUDE } from '../src/sim/content/mounts';
import { isFlying, moveSpeedMult } from '../src/sim/player_motion';
import { Sim } from '../src/sim/sim';
import { terrainHeight } from '../src/sim/world';

describe('authoritative flying mount motion', () => {
  it('leaves ground collision, climbs, and descends without gravity', () => {
    const sim = new Sim({ seed: 42, playerClass: 'warrior', autoEquip: false, noPlayer: true });
    const pid = sim.addPlayer('warrior', 'DuranceTester', { duranceTester: true });
    sim.addItem('mount_emerald_wyrm', 1, pid);
    sim.useItem('mount_emerald_wyrm', pid);
    const p = sim.player;
    expect(isFlying(p)).toBe(true);
    expect(p.onGround).toBe(false);
    const floor = terrainHeight(p.pos.x, p.pos.z, sim.cfg.seed) + FLYING_MIN_ALTITUDE;
    expect(p.pos.y).toBeGreaterThanOrEqual(floor);
    const meta = sim.players.get(pid);
    if (!meta) throw new Error('missing player meta');

    const startY = p.pos.y;
    meta.moveInput.jump = true;
    sim.tick();
    expect(p.pos.y).toBeGreaterThan(startY);
    expect(p.vy).toBe(0);

    meta.moveInput.jump = false;
    meta.moveInput.back = true;
    for (let i = 0; i < 20; i++) sim.tick();
    expect(p.pos.y).toBeGreaterThanOrEqual(
      terrainHeight(p.pos.x, p.pos.z, sim.cfg.seed) + FLYING_MIN_ALTITUDE,
    );
    expect(moveSpeedMult(p)).toBe(2);
  });

  it('lands cleanly when the flying mount is toggled off', () => {
    const sim = new Sim({ seed: 42, playerClass: 'warrior', autoEquip: false, noPlayer: true });
    const pid = sim.addPlayer('warrior', 'DuranceTester', { duranceTester: true });
    sim.addItem('mount_emerald_wyrm', 1, pid);
    sim.useItem('mount_emerald_wyrm', pid);
    const meta = sim.players.get(pid);
    if (!meta) throw new Error('missing player meta');
    meta.moveInput.jump = true;
    sim.tick();
    meta.moveInput.jump = false;
    sim.useItem('mount_emerald_wyrm', pid);
    expect(isFlying(sim.player)).toBe(false);
    expect(sim.player.onGround).toBe(true);
    expect(sim.player.pos.y).toBe(terrainHeight(sim.player.pos.x, sim.player.pos.z, sim.cfg.seed));
  });
});
