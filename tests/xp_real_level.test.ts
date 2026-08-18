// Pins the split between the REAL XP curve and the COSMETIC virtual-level table,
// and the realm cap that prestige is measured from.
//
// Two defects lived here. xpToReachLevel() reads VLEVEL_CUM, the post-cap
// virtual-level table, whose per-level cost grows a flat 10% from level 20 up;
// that is right for the cosmetic bar and wrong for turning a real level into a
// lifetime XP total, because lifetimeXp is what maxPrestigeRank() and the
// cosmetic milestones read. And prestige anchored on the GLOBAL cap, so in a
// 99-cap realm the ordinary 20->99 climb counted as post-cap overflow. Together
// a dev jump to 99 minted 18,611 prestige ranks; the real curve alone still left
// 1,177. Both must stay closed, and claudecraft at cap 20 must not move at all.

import { describe, expect, it } from 'vitest';
import {
  canPrestige,
  MAX_LEVEL,
  MAX_POSSIBLE_LEVEL,
  maxPrestigeRank,
  PRESTIGE_XP_PER_RANK,
  prestigeXpPerRank,
  XP_TABLE,
  xpForLevel,
  xpToReachLevel,
  xpToReachRealLevel,
  xpUntilNextPrestige,
} from '../src/sim/types';

function sumSteps(level: number): number {
  let total = 0;
  for (let lvl = 1; lvl < level; lvl++) total += XP_TABLE[Math.min(lvl - 1, XP_TABLE.length - 1)];
  return total;
}

describe('xpToReachRealLevel', () => {
  it('is the running sum of XP_TABLE at every reachable level', () => {
    for (let lvl = 1; lvl <= MAX_POSSIBLE_LEVEL; lvl++) {
      expect(xpToReachRealLevel(lvl)).toBe(sumSteps(lvl));
    }
  });

  it('agrees with the virtual table at and below the default cap', () => {
    // Upstream/claudecraft cap at MAX_LEVEL, so the two tables must be
    // interchangeable there.
    for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
      expect(xpToReachRealLevel(lvl)).toBe(xpToReachLevel(lvl));
    }
  });

  it('diverges from the virtual table above the cap, low not high', () => {
    expect(xpToReachRealLevel(50)).toBeLessThan(xpToReachLevel(50));
    // The gap is the whole reason this function exists; hold the order of
    // magnitude so a curve edit that quietly re-converges gets noticed.
    expect(xpToReachLevel(99) / xpToReachRealLevel(99)).toBeGreaterThan(10);
  });

  it('clamps out of range input instead of returning undefined', () => {
    expect(xpToReachRealLevel(0)).toBe(0);
    expect(xpToReachRealLevel(-5)).toBe(0);
    expect(xpToReachRealLevel(1)).toBe(0);
    expect(xpToReachRealLevel(MAX_POSSIBLE_LEVEL + 40)).toBe(
      xpToReachRealLevel(MAX_POSSIBLE_LEVEL),
    );
    expect(Number.isFinite(xpToReachRealLevel(43.7))).toBe(true);
  });

  it('is monotonic across the whole range', () => {
    for (let lvl = 2; lvl <= MAX_POSSIBLE_LEVEL; lvl++) {
      expect(xpToReachRealLevel(lvl)).toBeGreaterThan(xpToReachRealLevel(lvl - 1));
    }
  });
});

describe('prestige is measured from the realm cap', () => {
  it('grants nothing for merely arriving at the cap, at 20 or at 99', () => {
    expect(maxPrestigeRank(xpToReachRealLevel(MAX_LEVEL), MAX_LEVEL)).toBe(0);
    expect(maxPrestigeRank(xpToReachRealLevel(99), 99)).toBe(0);
  });

  it('still counts genuine overflow past the cap', () => {
    const at99 = xpToReachRealLevel(99);
    expect(maxPrestigeRank(at99 + prestigeXpPerRank(99), 99)).toBe(1);
    expect(maxPrestigeRank(at99 + prestigeXpPerRank(99) * 3 - 1, 99)).toBe(2);
  });

  it('does not let a 99-cap character prestige at level 20', () => {
    // The old gate was `level >= MAX_LEVEL`, so a level-20 Infernal character
    // could prestige — which zeroes their XP bar — 1,177 times over.
    const rich = xpToReachRealLevel(99);
    expect(canPrestige(20, rich, 0, 99)).toBe(false);
    expect(canPrestige(99, rich + prestigeXpPerRank(99), 0, 99)).toBe(true);
  });

  it('leaves the default cap byte-identical for claudecraft and upstream', () => {
    expect(prestigeXpPerRank()).toBe(PRESTIGE_XP_PER_RANK);
    expect(prestigeXpPerRank(MAX_LEVEL)).toBe(xpForLevel(MAX_LEVEL));
    for (const xp of [0, 167_200, 190_400, 1_000_000, 27_484_509]) {
      expect(maxPrestigeRank(xp)).toBe(maxPrestigeRank(xp, MAX_LEVEL));
      expect(xpUntilNextPrestige(xp, 0)).toBe(xpUntilNextPrestige(xp, 0, MAX_LEVEL));
      expect(canPrestige(MAX_LEVEL, xp, 0)).toBe(canPrestige(MAX_LEVEL, xp, 0, MAX_LEVEL));
    }
  });

  it('prices a rank at the cost of the level you would have gained next', () => {
    expect(prestigeXpPerRank(99)).toBe(xpForLevel(99));
    expect(prestigeXpPerRank(99)).toBeGreaterThan(PRESTIGE_XP_PER_RANK * 100);
  });

  it('reports the remaining XP against the right cap', () => {
    expect(xpUntilNextPrestige(xpToReachRealLevel(99), 0, 99)).toBe(prestigeXpPerRank(99));
    expect(xpUntilNextPrestige(xpToReachRealLevel(MAX_LEVEL), 0)).toBe(PRESTIGE_XP_PER_RANK);
  });
});
