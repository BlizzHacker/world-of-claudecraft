import { describe, expect, it } from 'vitest';
import { isDuranceTesterCharacter } from '../server/durance_tester_entitlement';
import { DURANCE_TESTER_MOUNT_ITEM_IDS } from '../src/sim/content/mounts';
import { Sim } from '../src/sim/sim';

describe('DuranceTester mount entitlement', () => {
  it('requires the exact test name and an Infernal realm', () => {
    expect(isDuranceTesterCharacter('DuranceTester', 'Infernal')).toBe(true);
    expect(isDuranceTesterCharacter('durance tester', 'Infernal Realm')).toBe(true);
    expect(isDuranceTesterCharacter('DuranceTester2', 'Infernal')).toBe(false);
    expect(isDuranceTesterCharacter('DuranceTester', 'Classic')).toBe(false);
  });

  it('grants all three bridles idempotently at the authoritative join seam', () => {
    const sim = new Sim({ seed: 7, playerClass: 'warrior', noPlayer: true });
    const pid = sim.addPlayer('warrior', 'DuranceTester', { duranceTester: true });
    const meta = sim.players.get(pid);
    expect(meta).toBeDefined();
    expect(
      meta?.inventory.filter((slot) =>
        DURANCE_TESTER_MOUNT_ITEM_IDS.includes(slot.itemId as never),
      ),
    ).toEqual(DURANCE_TESTER_MOUNT_ITEM_IDS.map((itemId) => ({ itemId, count: 1 })));
    expect(
      sim
        .serializeCharacter(pid)
        ?.inventory.filter((slot) => DURANCE_TESTER_MOUNT_ITEM_IDS.includes(slot.itemId as never)),
    ).toHaveLength(3);
  });

  it('lets only the host-stamped tester ride mounts above the normal level gate', () => {
    const normal = new Sim({ seed: 9, playerClass: 'warrior', autoEquip: false });
    normal.addItem('mount_emerald_wyrm', 1, normal.player.id);
    normal.useItem('mount_emerald_wyrm', normal.player.id);
    expect(normal.player.auras.some((a) => a.id === 'mount_emerald_wyrm')).toBe(false);
    expect(normal.drainEvents().some((e) => e.type === 'error' && e.text.includes('level 20'))).toBe(true);

    const tester = new Sim({ seed: 9, playerClass: 'warrior', noPlayer: true });
    const pid = tester.addPlayer('warrior', 'DuranceTester', { duranceTester: true });
    tester.useItem('mount_emerald_wyrm', pid);
    expect(tester.entities.get(pid)?.auras.some((a) => a.id === 'mount_emerald_wyrm')).toBe(true);
  });
});
