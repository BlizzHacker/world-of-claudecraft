import { afterEach, describe, expect, it } from 'vitest';
import { ITEMS } from '../src/sim/data';
import { itemSourceLevel } from '../src/sim/item_level';
import { meetsLevelRequirement, requiredLevelFor } from '../src/sim/item_level_req';
import { activeMaxLevel, setRealmHostEnv } from '../src/sim/realms/registry';
import type { ItemDef } from '../src/sim/types';
import { MAX_LEVEL } from '../src/sim/types';

// The gate is the ACTIVE REALM's cap, not the vanilla 20. The default realm
// (crypticrealm) caps at 99, so `MAX_LEVEL` is no longer the right yardstick
// here — it is only the fallback for a realm that declares no cap of its own.
const ACTIVE_CAP = () => activeMaxLevel(MAX_LEVEL);

function forceRealm(id: string) {
  setRealmHostEnv({
    queryParam: (n) => (n === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}
afterEach(() => setRealmHostEnv(null));

function gear(quality: ItemDef['quality'], extra: Partial<ItemDef> = {}): ItemDef {
  return {
    id: 'test_item',
    name: 'Test Item',
    kind: 'armor',
    slot: 'chest',
    armorType: 'cloth',
    sellValue: 1,
    quality,
    ...extra,
  } as ItemDef;
}

describe('requiredLevelFor', () => {
  it('leaves the leveling greens ungated and gates rare and above', () => {
    expect(requiredLevelFor(gear('poor'))).toBe(1);
    expect(requiredLevelFor(gear('common'))).toBe(1);
    expect(requiredLevelFor(gear('uncommon'))).toBe(1);
    expect(requiredLevelFor(gear('rare'))).toBe(12);
    expect(requiredLevelFor(gear('epic'))).toBe(18);
    expect(requiredLevelFor(gear('legendary'))).toBe(MAX_LEVEL);
  });

  it('treats a missing quality as common (ungated)', () => {
    expect(requiredLevelFor(gear(undefined))).toBe(1);
  });

  it('lets an explicit requiredLevel override the quality default', () => {
    expect(requiredLevelFor(gear('common', { requiredLevel: 10 }))).toBe(10);
    expect(requiredLevelFor(gear('legendary', { requiredLevel: 3 }))).toBe(3);
  });

  it('clamps the requirement to [1, the active realm cap]', () => {
    expect(requiredLevelFor(gear('common', { requiredLevel: 0 }))).toBe(1);
    expect(requiredLevelFor(gear('common', { requiredLevel: -5 }))).toBe(1);
    expect(requiredLevelFor(gear('common', { requiredLevel: 999 }))).toBe(ACTIVE_CAP());
  });

  it('never gates higher than the level cap, so the rarest gear stays reachable', () => {
    for (const q of ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary'] as const) {
      expect(requiredLevelFor(gear(q))).toBeLessThanOrEqual(ACTIVE_CAP());
    }
  });

  // ---- the 1-99 rescale: explicit vs derived clamp ------------------------
  //
  // An EXPLICIT requiredLevel is authoring intent and may reach the realm cap —
  // that is how 21-99 content declares its gates. A DERIVED requirement stays
  // pinned to the vanilla 20, because the shipped endgame content authors item
  // levels ABOVE the old character cap on purpose (heroic 22/25, raid 27) and
  // taking those literally would un-equip the whole raid set from every existing
  // level-20 character. See the clampDerived note in item_level_req.ts.

  it('lets an EXPLICIT requiredLevel reach into the 21-99 range on a 99-cap realm', () => {
    forceRealm('infernal');
    expect(requiredLevelFor(gear('epic', { requiredLevel: 70 }))).toBe(70);
    expect(requiredLevelFor(gear('legendary', { requiredLevel: 99 }))).toBe(99);
    expect(requiredLevelFor(gear('common', { requiredLevel: 999 }))).toBe(99); // clamped to cap
  });

  it('still clamps an explicit requirement to the VANILLA cap on claudecraft', () => {
    forceRealm('claudecraft');
    expect(activeMaxLevel(MAX_LEVEL)).toBe(MAX_LEVEL);
    expect(requiredLevelFor(gear('epic', { requiredLevel: 70 }))).toBe(MAX_LEVEL);
  });

  it('keeps DERIVED endgame gates at the vanilla 20 on every realm — save compat', () => {
    // The regression guard: heroic (25) and raid (27) source levels must keep
    // folding down to 20 so an existing level-20 character does not lose its gear
    // the moment the realm cap moved to 99.
    for (const realm of ['claudecraft', 'classic', 'infernal', 'crypticrealm']) {
      forceRealm(realm);
      for (const id of ['heroic_soulflame_cowl', 'soulflame_mantle']) {
        if (!ITEMS[id]) continue;
        expect(requiredLevelFor(ITEMS[id])).toBeLessThanOrEqual(MAX_LEVEL);
      }
      expect(requiredLevelFor(gear('legendary'))).toBe(MAX_LEVEL);
    }
  });

  it('keeps the ungated leveling greens ungated on every realm', () => {
    for (const realm of ['claudecraft', 'classic', 'infernal']) {
      forceRealm(realm);
      expect(requiredLevelFor(gear('uncommon'))).toBe(1);
    }
  });
});

describe('meetsLevelRequirement', () => {
  it('is false below the requirement and true at or above it', () => {
    const rare = gear('rare'); // requires 12
    expect(meetsLevelRequirement(11, rare)).toBe(false);
    expect(meetsLevelRequirement(12, rare)).toBe(true);
    expect(meetsLevelRequirement(20, rare)).toBe(true);
  });

  it('always passes common/poor starter gear at level 1', () => {
    expect(meetsLevelRequirement(1, gear('common'))).toBe(true);
    expect(meetsLevelRequirement(1, gear('poor'))).toBe(true);
  });

  it('is a pure function of its inputs (same inputs, same result)', () => {
    const item = gear('epic');
    expect(meetsLevelRequirement(18, item)).toEqual(meetsLevelRequirement(18, item));
  });
});

describe('requiredLevelFor against real content', () => {
  it('never gates a rare-and-above item above the level of the content it drops from', () => {
    for (const item of Object.values(ITEMS)) {
      if (item.requiredLevel !== undefined) continue; // explicit override, not derived
      const quality = item.quality ?? 'common';
      if (quality !== 'rare' && quality !== 'epic' && quality !== 'legendary') continue;
      const source = itemSourceLevel(item.id);
      if (source === undefined) continue; // no derivable source: falls back to the quality band
      expect(requiredLevelFor(item)).toBeLessThanOrEqual(source);
    }
  });

  it("gates a known dungeon-tier rare (mogger's shiv) to where it actually drops", () => {
    const item = ITEMS.moggers_shiv;
    expect(item).toBeDefined();
    const source = itemSourceLevel(item.id);
    expect(source).toBeDefined();
    expect(requiredLevelFor(item)).toBe(source);
  });
});
