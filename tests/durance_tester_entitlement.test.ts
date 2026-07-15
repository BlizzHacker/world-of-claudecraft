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
});
