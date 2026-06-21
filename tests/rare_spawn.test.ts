import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';
import { MOBS, ITEMS, CAMPS } from '../src/sim/data';

// Captain Verlan — the undead family's rare elite in the Eastbrook Vale ruins.
// These tests pin the content contract (a tougher named mob with a guaranteed
// quality drop and a mutually-exclusive rare chase group) and verify the loot
// roll honours it deterministically through the real Sim rng.

describe('rare spawn: Captain Verlan', () => {
  it('is defined as a rare elite undead with sensible scaling', () => {
    const v = MOBS['captain_verlan'];
    expect(v).toBeTruthy();
    expect(v.rare).toBe(true);
    expect(v.elite).toBe(true);
    expect(v.family).toBe('undead');
    // tougher than the trash it rises among (Restless Bones)
    expect(v.hpBase).toBeGreaterThan(MOBS['restless_bones'].hpBase);
    expect(v.respawnMult).toBeGreaterThan(1); // rares come back slowly
  });

  it('spawns from a single-mob camp in the ruins', () => {
    const camps = CAMPS.filter((c) => c.mobId === 'captain_verlan');
    expect(camps).toHaveLength(1);
    expect(camps[0].count).toBe(1);
  });

  it('every loot itemId resolves and the chase group is all rare quality', () => {
    const v = MOBS['captain_verlan'];
    for (const l of v.loot) {
      if (l.itemId) expect(ITEMS[l.itemId], `loot ${l.itemId}`).toBeTruthy();
    }
    const chase = v.loot.filter((l) => l.rollGroup === 'verlan_chase');
    expect(chase.length).toBeGreaterThanOrEqual(2);
    for (const l of chase) expect(ITEMS[l.itemId!].quality).toBe('rare');
  });

  it('always drops the guaranteed loot and at most one chase item', () => {
    const sim = new Sim({ seed: 7, playerClass: 'warrior', autoEquip: true });
    const meta = [...(sim as any).players.values()][0];
    // a throwaway corpse entity to receive rolled loot
    const mob: any = { templateId: 'captain_verlan', loot: null, lootable: false };
    const chaseIds = new Set(['verlans_oathblade', 'hollow_vigil_staff', 'gravewardens_shiv']);

    for (let i = 0; i < 300; i++) {
      mob.loot = null; mob.lootable = false;
      (sim as any).rollLoot(mob, meta);
      const items: string[] = (mob.loot?.items ?? []).map((s: any) => s.itemId);
      // guaranteed entries (chance 1) are always present
      expect(items).toContain('bone_fragments');
      expect(mob.loot.copper).toBeGreaterThan(0);
      // the rollGroup is mutually exclusive: never more than one chase item
      expect(items.filter((id) => chaseIds.has(id)).length).toBeLessThanOrEqual(1);
    }
  });
});
