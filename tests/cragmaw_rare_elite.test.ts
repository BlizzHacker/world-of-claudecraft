import { describe, expect, it } from 'vitest';
import { CAMPS, ITEMS, MOBS } from '../src/sim/data';
import { createMob } from '../src/sim/entity';
import { Sim } from '../src/sim/sim';

describe('Old Cragmaw — rare elite ridge beast (Thornpeak Heights)', () => {
  it('is registered as a rare elite beast at the ridge entry level', () => {
    const m = MOBS.old_cragmaw;
    expect(m).toBeTruthy();
    expect(m.name).toBe('Old Cragmaw');
    expect(m.family).toBe('beast');
    expect(m.rare).toBe(true);
    expect(m.elite).toBe(true);
    expect(m.minLevel).toBe(14);
    expect(m.maxLevel).toBe(14);
  });

  it('carries only existing, composable mechanics (a rending pounce + wounded enrage)', () => {
    const m = MOBS.old_cragmaw;
    expect(m.aoePulse).toMatchObject({ name: 'Savage Pounce', school: 'physical' });
    expect(m.enrage).toMatchObject({ belowHpPct: 0.35, dmgMult: 1.4, hasteMult: 1.3 });
  });

  it('drops its unique rare boots and every loot itemId resolves', () => {
    const m = MOBS.old_cragmaw;
    const drop = m.loot.find((l) => l.itemId === 'cragmaw_prowlboots');
    expect(drop).toBeTruthy();
    expect(drop!.chance).toBeGreaterThan(0);
    for (const l of m.loot) {
      if (l.itemId) expect(ITEMS[l.itemId], `loot item ${l.itemId} must exist`).toBeTruthy();
    }

    const boots = ITEMS.cragmaw_prowlboots;
    expect(boots).toMatchObject({ kind: 'armor', slot: 'feet', quality: 'rare' });
    // A clear upgrade over the uncommon Ridgestalker Treads it sits beside.
    expect(boots.stats!.armor!).toBeGreaterThan(ITEMS.ridgestalker_treads.stats!.armor!);
  });

  it('has exactly one lone overworld spawn placed on the Thornpeak ridge', () => {
    const camps = CAMPS.filter((c) => c.mobId === 'old_cragmaw');
    expect(camps).toHaveLength(1);
    expect(camps[0].count).toBe(1);
    expect(camps[0].center.z).toBeGreaterThanOrEqual(540); // inside Thornpeak (zMin 540)
  });

  it('spawns into a live sim with elite-scaled health above a normal Ridge Stalker', () => {
    const sim = new Sim({ seed: 11, playerClass: 'warrior', noPlayer: true });
    const cragmaw = createMob((sim as any).nextId++, MOBS.old_cragmaw, 14, { x: 0, y: 0, z: 560 });
    const stalker = createMob((sim as any).nextId++, MOBS.ridge_stalker, 14, { x: 4, y: 0, z: 560 });
    // Elite scaling (~2.3x health) puts Cragmaw well above a normal Ridge Stalker.
    expect(cragmaw.maxHp).toBeGreaterThan(stalker.maxHp * 2);
  });
});
