import { describe, expect, it } from 'vitest';
import { CLASSES } from '../src/sim/content/classes';
import {
  clearHotbarSlot, parseHotbarActions, placeAbilityOnSlot, placeItemOnSlot, syncHotbarActions,
} from '../src/ui/hotbar';

const abilityIds = new Set(['fireball', 'frost_armor', 'arcane_intellect', 'polymorph', 'shared_id']);
const itemIds = new Set(['baked_bread', 'spring_water', 'shared_id']);
const abilityExists = (id: string) => abilityIds.has(id);
const itemExists = (id: string) => itemIds.has(id);

describe('hotbar action parsing', () => {
  it('migrates legacy ability strings and drops duplicate abilities', () => {
    const actions = parseHotbarActions(
      ['fireball', 'frost_armor', 'fireball', 'baked_bread'],
      5,
      abilityExists,
      itemExists,
    );

    expect(actions).toEqual([
      { type: 'ability', id: 'fireball' },
      { type: 'ability', id: 'frost_armor' },
      null,
      null,
      null,
    ]);
  });

  it('keeps item and ability actions distinct even when ids overlap', () => {
    const actions = parseHotbarActions(
      [{ type: 'ability', id: 'shared_id' }, { type: 'item', id: 'shared_id' }],
      2,
      abilityExists,
      itemExists,
    );

    expect(actions).toEqual([
      { type: 'ability', id: 'shared_id' },
      { type: 'item', id: 'shared_id' },
    ]);
  });
});

describe('hotbar action placement', () => {
  it('places a spellbook ability onto the target action slot', () => {
    const slots = [
      { type: 'ability' as const, id: 'fireball' },
      { type: 'ability' as const, id: 'frost_armor' },
      { type: 'ability' as const, id: 'arcane_intellect' },
      null,
    ];

    const next = placeAbilityOnSlot(slots, 'polymorph', 1);

    expect(next).toEqual([
      { type: 'ability', id: 'fireball' },
      { type: 'ability', id: 'polymorph' },
      { type: 'ability', id: 'arcane_intellect' },
      null,
    ]);
    expect(slots).toEqual([
      { type: 'ability', id: 'fireball' },
      { type: 'ability', id: 'frost_armor' },
      { type: 'ability', id: 'arcane_intellect' },
      null,
    ]);
  });

  it('swaps instead of duplicating when the spellbook ability is already on the bar', () => {
    const slots = [
      { type: 'ability' as const, id: 'fireball' },
      { type: 'ability' as const, id: 'frost_armor' },
      { type: 'ability' as const, id: 'arcane_intellect' },
      null,
    ];

    const next = placeAbilityOnSlot(slots, 'arcane_intellect', 0);

    expect(next).toEqual([
      { type: 'ability', id: 'arcane_intellect' },
      { type: 'ability', id: 'frost_armor' },
      { type: 'ability', id: 'fireball' },
      null,
    ]);
  });

  it('places a food item on an occupied action slot without removing other item shortcuts', () => {
    const slots = [
      { type: 'item' as const, id: 'baked_bread' },
      { type: 'ability' as const, id: 'fireball' },
      null,
    ];

    const next = placeItemOnSlot(slots, 'baked_bread', 1);

    expect(next).toEqual([
      { type: 'item', id: 'baked_bread' },
      { type: 'item', id: 'baked_bread' },
      null,
    ]);
  });

  it('keeps item shortcuts when learned abilities resync', () => {
    const slots = [
      { type: 'item' as const, id: 'spring_water' },
      { type: 'ability' as const, id: 'fireball' },
      null,
    ];

    const synced = syncHotbarActions(slots, ['fireball', 'polymorph'], new Set(['polymorph']));

    expect(synced.actions).toEqual([
      { type: 'item', id: 'spring_water' },
      { type: 'ability', id: 'fireball' },
      { type: 'ability', id: 'polymorph' },
    ]);
    expect(synced.changed).toBe(true);
  });

  it('places the mage overflow spell onto a full non-Attack action bar', () => {
    const barSlots = 11;
    const mageAbilities = CLASSES.mage.abilities;
    const slots = mageAbilities.slice(0, barSlots).map((id) => ({ type: 'ability' as const, id }));
    const targetIndex = 4;
    const displacedAbility = slots[targetIndex];

    expect(slots).toHaveLength(barSlots);
    // ice_barrier is an overflow spell learned beyond the initial bar slots.
    expect(mageAbilities.indexOf('ice_barrier')).toBeGreaterThanOrEqual(barSlots);
    expect(slots.some((action) => action.id === 'ice_barrier')).toBe(false);

    const next = placeAbilityOnSlot(slots, 'ice_barrier', targetIndex);
    const occupied = next.filter((action) => action !== null);

    expect(next[targetIndex]).toEqual({ type: 'ability', id: 'ice_barrier' });
    expect(next).not.toContain(displacedAbility);
    expect(occupied).toHaveLength(barSlots);
    expect(new Set(occupied.map((action) => action!.id)).size).toBe(occupied.length);
    expect(slots).toEqual(mageAbilities.slice(0, barSlots).map((id) => ({ type: 'ability', id })));
  });
});

describe('hotbar slot clearing', () => {
  it('clears an occupied slot', () => {
    const slotMap = [{ type: 'ability' as const, id: 'fireball' }, { type: 'ability' as const, id: 'frostbolt' }, null];

    expect(clearHotbarSlot(slotMap, 1)).toEqual([{ type: 'ability', id: 'fireball' }, null, null]);
  });

  it('leaves an empty slot stable', () => {
    const slotMap = [{ type: 'ability' as const, id: 'fireball' }, null, { type: 'ability' as const, id: 'blink' }];

    expect(clearHotbarSlot(slotMap, 1)).toEqual([
      { type: 'ability', id: 'fireball' },
      null,
      { type: 'ability', id: 'blink' },
    ]);
  });

  it('does not mutate the input array', () => {
    const slotMap = [{ type: 'ability' as const, id: 'fireball' }, { type: 'ability' as const, id: 'frostbolt' }, null];

    clearHotbarSlot(slotMap, 1);

    expect(slotMap).toEqual([{ type: 'ability', id: 'fireball' }, { type: 'ability', id: 'frostbolt' }, null]);
  });

  it('ignores out-of-range slots', () => {
    const slotMap = [{ type: 'ability' as const, id: 'fireball' }, { type: 'ability' as const, id: 'frostbolt' }, null];

    expect(clearHotbarSlot(slotMap, -1)).toEqual(slotMap);
    expect(clearHotbarSlot(slotMap, 3)).toEqual(slotMap);
  });
});

describe('hotbar slot sync', () => {
  it('preserves a missing already-known ability as a cleared slot', () => {
    const slots = [{ type: 'ability' as const, id: 'fireball' }, null, { type: 'ability' as const, id: 'blink' }];

    expect(syncHotbarActions(slots, ['fireball', 'frostbolt', 'blink'], new Set()).actions).toEqual(slots);
  });

  it('places a newly learned ability into the first empty slot', () => {
    const slots = [{ type: 'ability' as const, id: 'fireball' }, null, { type: 'ability' as const, id: 'blink' }];

    expect(syncHotbarActions(slots, ['fireball', 'frostbolt', 'blink'], new Set(['frostbolt'])).actions).toEqual([
      { type: 'ability', id: 'fireball' },
      { type: 'ability', id: 'frostbolt' },
      { type: 'ability', id: 'blink' },
    ]);
  });

  it('drops abilities that are no longer known', () => {
    const slots = [
      { type: 'ability' as const, id: 'fireball' },
      { type: 'ability' as const, id: 'frostbolt' },
      { type: 'ability' as const, id: 'blink' },
    ];

    expect(syncHotbarActions(slots, ['fireball', 'blink'], new Set()).actions).toEqual([
      { type: 'ability', id: 'fireball' },
      null,
      { type: 'ability', id: 'blink' },
    ]);
  });
});
