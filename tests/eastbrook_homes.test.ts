// Eastbrook Homes behavior spec. Housing is a PREMIUM PAID feature, never a
// minigame: the deed flow is gated on the account's homeowner entitlement
// ($CR settlement side), free accounts can never buy, one deed per character,
// and ownership is plain serializable data the server persists. The lane is
// a physical site (flatten, Realtor, foundations from ONE layout module).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HOME_LOTS, HOMES_CENTER, HOMES_FLAT, REALTOR_POS } from '../src/sim/homes_layout';
import { Sim } from '../src/sim/sim';
import { HOMES_REALTOR_ID } from '../src/sim/social/homes';
import { groundHeight, terrainHeight } from '../src/sim/world';

function makeWorld() {
  return new Sim({ seed: 42, playerClass: 'warrior', noPlayer: true });
}

function addAtRealtor(sim: Sim, name: string, homeowner: boolean) {
  const pid = (sim as any).addPlayer('warrior', name, { homeowner });
  const e = sim.entities.get(pid)!;
  e.pos.x = REALTOR_POS.x + 1;
  e.pos.z = REALTOR_POS.z;
  e.pos.y = groundHeight(e.pos.x, e.pos.z, sim.cfg.seed);
  e.prevPos = { ...e.pos };
  (sim as any).rebucket(e);
  return pid;
}

describe('Homestead Lane, the physical site', () => {
  it('levels the terrace and spawns Realtor Maribel under her reserved id', () => {
    expect(
      Math.abs(terrainHeight(HOMES_CENTER.x, HOMES_CENTER.z, 42) - HOMES_FLAT.height),
    ).toBeLessThan(0.01);
    const sim = makeWorld();
    const maribel = sim.entities.get(HOMES_REALTOR_ID);
    expect(maribel).toBeTruthy();
    expect(maribel!.name).toBe('Realtor Maribel');
  });
});

describe('the paid deed gate', () => {
  it('refuses a free account, always', () => {
    const sim = makeWorld();
    const pid = addAtRealtor(sim, 'Freeloader', false);
    sim.homeBuy('lot_a', pid);
    expect(sim.homes.lots.lot_a).toBeUndefined();
    expect(sim.homesInfoFor(pid)?.entitled).toBe(false);
  });

  it('sells to an entitled account, one deed per character', () => {
    const sim = makeWorld();
    const pid = addAtRealtor(sim, 'Patron', true);
    sim.homeBuy('lot_a', pid);
    expect(sim.homes.lots.lot_a?.owner).toBe('Patron');
    const info = sim.homesInfoFor(pid)!;
    expect(info.myLotId).toBe('lot_a');
    expect(info.lots.find((l) => l.id === 'lot_a')?.mine).toBe(true);
    // a second deed is refused
    sim.homeBuy('lot_b', pid);
    expect(sim.homes.lots.lot_b).toBeUndefined();
  });

  it('never sells an owned lot out from under its owner', () => {
    const sim = makeWorld();
    const first = addAtRealtor(sim, 'Patron', true);
    sim.homeBuy('lot_c', first);
    const second = addAtRealtor(sim, 'Latecomer', true);
    sim.homeBuy('lot_c', second);
    expect(sim.homes.lots.lot_c?.owner).toBe('Patron');
  });

  it('requires doing business at the lane', () => {
    const sim = makeWorld();
    const pid = (sim as any).addPlayer('warrior', 'FarBuyer', { homeowner: true });
    // default spawn is town, ~40yd from the lane
    sim.homeBuy('lot_a', pid);
    expect(sim.homes.lots.lot_a).toBeUndefined();
  });
});

describe('ownership data', () => {
  it('is plain serializable data (the server persists it verbatim)', () => {
    const sim = makeWorld();
    const pid = addAtRealtor(sim, 'Patron', true);
    sim.homeBuy('lot_d', pid);
    const roundTrip = JSON.parse(JSON.stringify(sim.homes));
    expect(roundTrip).toEqual(sim.homes);
    // and a restored record reads back through the info surface
    const sim2 = makeWorld();
    sim2.homes.lots = roundTrip.lots;
    const viewer = addAtRealtor(sim2, 'Visitor', false);
    const info = sim2.homesInfoFor(viewer)!;
    expect(info.lots.find((l) => l.id === 'lot_d')?.owner).toBe('Patron');
  });

  it('keeps every lot and door on the flattened pad', () => {
    for (const lot of HOME_LOTS) {
      expect(lot.rect.xMin).toBeGreaterThanOrEqual(HOMES_FLAT.xMin);
      expect(lot.rect.xMax).toBeLessThanOrEqual(HOMES_FLAT.xMax);
      expect(lot.rect.zMin).toBeGreaterThanOrEqual(HOMES_FLAT.zMin);
      expect(lot.rect.zMax).toBeLessThanOrEqual(HOMES_FLAT.zMax);
      expect(Math.abs(terrainHeight(lot.door.x, lot.door.z, 42) - HOMES_FLAT.height)).toBeLessThan(
        0.01,
      );
    }
  });
});

describe('module purity', () => {
  it('never touches the shared rng stream (source guarantee)', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../src/sim/social/homes.ts'),
      'utf8',
    );
    const code = src.replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/\brng\b/i);
    expect(code).not.toContain('Math.random');
  });
});
