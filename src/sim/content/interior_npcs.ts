// Resident NPCs for building interiors (shop merchant / inn innkeeper / house
// villager). Kept in a LEAF module (imports only the NpcDef type) so both the NPCS
// registry (data.ts) and the interior spawner (interiors.ts) can import them without
// a circular dependency. dynamic:true so the world-init surface-placement loop skips
// them — interiors.ts spawns them inside the rooms.

import type { NpcDef } from '../types';

export const INTERIOR_MERCHANT: NpcDef = {
  id: 'interior_merchant',
  name: 'Merchant',
  title: 'Shopkeeper',
  pos: { x: 0, z: 0 },
  facing: 0,
  color: 0xc9a14a,
  questIds: [],
  dynamic: true,
  greeting: 'Wares for a wanderer? Take a look.',
  vendorItems: [
    'tome_town_portal',
    'minor_healing_potion',
    'minor_mana_potion',
    'baked_bread',
    'spring_water',
  ],
};

export const INTERIOR_INNKEEPER: NpcDef = {
  id: 'interior_innkeeper',
  name: 'Innkeeper',
  title: 'Host',
  pos: { x: 0, z: 0 },
  facing: 0,
  color: 0x9a6b3a,
  questIds: [],
  dynamic: true,
  greeting: "Rest your boots, traveller. The fire's warm.",
  vendorItems: ['baked_bread', 'spring_water', 'minor_healing_potion'],
};

export const INTERIOR_VILLAGER: NpcDef = {
  id: 'interior_villager',
  name: 'Villager',
  title: 'Resident',
  pos: { x: 0, z: 0 },
  facing: 0,
  color: 0x8a8a6a,
  questIds: [],
  dynamic: true,
  greeting: 'Oh — a visitor! Mind the mess.',
  // A modest pantry so a house visit is never a dead end: the same staples the
  // innkeeper stocks (ids proven by tests/progression.test.ts's dangling-id gate).
  vendorItems: ['baked_bread', 'spring_water', 'minor_healing_potion'],
};

export const INTERIOR_NPCS: Record<string, NpcDef> = {
  interior_merchant: INTERIOR_MERCHANT,
  interior_innkeeper: INTERIOR_INNKEEPER,
  interior_villager: INTERIOR_VILLAGER,
};
