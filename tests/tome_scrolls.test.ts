import { describe, it, expect } from 'vitest';
import { ITEMS } from '../src/sim/data';
import { stackSizeOf, addStacked } from '../src/sim/bags';
import type { InvSlot } from '../src/sim/types';

describe('town portal tome scrolls (D2 refill to 20)', () => {
  it('the tome stacks to 20 (not 1 like a normal tool)', () => {
    expect(stackSizeOf(ITEMS.tome_town_portal)).toBe(20);
  });
  it('buying more scrolls refills the SAME stack up to 20, then overflows to a new slot', () => {
    const inv: InvSlot[] = [];
    addStacked(inv, 'tome_town_portal', 3);  // fresh tome = 3 scrolls
    addStacked(inv, 'tome_town_portal', 3);  // buy again → refill
    addStacked(inv, 'tome_town_portal', 3);
    // 9 scrolls, all in ONE slot (< 20 cap).
    const tomeSlots = inv.filter((s) => s.itemId === 'tome_town_portal');
    expect(tomeSlots.length).toBe(1);
    expect(tomeSlots[0].count).toBe(9);
    // Fill past 20 → overflow to a second slot.
    addStacked(inv, 'tome_town_portal', 15); // 9 + 15 = 24
    const after = inv.filter((s) => s.itemId === 'tome_town_portal');
    expect(after.reduce((a, s) => a + s.count, 0)).toBe(24);
    expect(after[0].count).toBe(20); // first slot capped at 20
    expect(after[1].count).toBe(4);
  });
});
