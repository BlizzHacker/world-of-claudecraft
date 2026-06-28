// Standalone placeable catalog transcribed from the original Cryptic Realm engine
// (CrypticRealmGame.js CR_ADMIN_PLACEABLES / CR_ADMIN_PLACEABLE_CATEGORIES).
//
// This is a PURE DATA module — no canvas/WebGL/engine imports. Safe to import
// from the ClaudeCraft editor UI without pulling in the heavy engine bundle.

export interface PlaceableDef {
  id: string;
  label: string;
  kind: string;
  category: string;
  scale: number;
  color: string;
  tag?: string;
  wallOnly?: boolean;
}

export interface PlaceableCategory {
  id: string;
  label: string;
  accent: string;
}

export const CR_PLACEABLE_CATEGORIES: PlaceableCategory[] = [
  { id: 'all',        label: 'All',        accent: '#9d6bff' },
  { id: 'props',      label: 'Props',      accent: '#d6b65c' },
  { id: 'lighting',   label: 'Lighting',   accent: '#ff9a34' },
  { id: 'buildings',  label: 'Buildings',   accent: '#85806f' },
  { id: 'forest',     label: 'Forest',     accent: '#2f6b34' },
  { id: 'furniture',  label: 'Furniture',   accent: '#7e572f' },
  { id: 'characters', label: 'NPCs',       accent: '#44aaff' },
  { id: 'monsters',   label: 'Monsters',   accent: '#cc44cc' },
  { id: 'imported',   label: 'Imported',   accent: '#9d6bff' },
];

export const CR_PLACEABLES: PlaceableDef[] = [
  // ── DUNGEON 1.1 PROPS ──────────────────────────────────────────────────────
  { id: 'barrel_large',      label: 'Barrel (large)',      kind: 'd11', category: 'props', scale: 1.75, color: '#b3864d', tag: 'storage' },
  { id: 'barrel_small',      label: 'Barrel (small)',      kind: 'd11', category: 'props', scale: 1.45, color: '#b3864d', tag: 'storage' },
  { id: 'barrel_small_stack', label: 'Barrel stack',       kind: 'd11', category: 'props', scale: 1.85, color: '#a0784a', tag: 'storage' },
  { id: 'crates_stacked',    label: 'Crates',              kind: 'd11', category: 'props', scale: 1.85, color: '#a0784a', tag: 'storage' },
  { id: 'box_large',         label: 'Box (large)',         kind: 'd11', category: 'props', scale: 1.65, color: '#9d7340', tag: 'storage' },
  { id: 'box_stacked',       label: 'Box stack',           kind: 'd11', category: 'props', scale: 1.75, color: '#9d7340', tag: 'storage' },
  { id: 'trunk_large_A',     label: 'Trunk',               kind: 'd11', category: 'props', scale: 1.75, color: '#7a4a2a', tag: 'storage' },
  { id: 'keg',               label: 'Keg',                 kind: 'd11', category: 'props', scale: 1.65, color: '#a76d3a', tag: 'tavern' },
  { id: 'keg_decorated',     label: 'Keg (decorated)',     kind: 'd11', category: 'props', scale: 1.65, color: '#a76d3a', tag: 'tavern' },
  { id: 'chest',             label: 'Chest',               kind: 'd11', category: 'props', scale: 1.45, color: '#a67a3d', tag: 'loot' },
  { id: 'chest_gold',        label: 'Chest (gold)',        kind: 'd11', category: 'props', scale: 1.45, color: '#ffcc44', tag: 'loot' },
  { id: 'coin_stack_large',  label: 'Coins (large)',       kind: 'd11', category: 'props', scale: 1.2,  color: '#ffd700', tag: 'loot' },
  { id: 'key',               label: 'Key',                 kind: 'd11', category: 'props', scale: 1.0,  color: '#ffd700', tag: 'loot' },
  { id: 'table_long',        label: 'Table (long)',        kind: 'd11', category: 'props', scale: 2.0,  color: '#9b6338', tag: 'furniture' },
  { id: 'shelf_large',       label: 'Shelf (large)',       kind: 'd11', category: 'props', scale: 2.0,  color: '#7e572f', tag: 'furniture' },
  { id: 'shelves',           label: 'Shelves',             kind: 'd11', category: 'props', scale: 1.9,  color: '#7e572f', tag: 'furniture' },
  { id: 'pillar',            label: 'Pillar',              kind: 'd11', category: 'props', scale: 2.35, color: '#85806f', tag: 'structure' },
  { id: 'pillar_decorated',  label: 'Pillar (decorated)',  kind: 'd11', category: 'props', scale: 2.35, color: '#a59880', tag: 'structure' },
  { id: 'stairs',            label: 'Stairs',              kind: 'd11', category: 'props', scale: 1.75, color: '#7e7165', tag: 'structure' },
  { id: 'rubble_large',      label: 'Rubble',              kind: 'd11', category: 'props', scale: 1.45, color: '#69625a', tag: 'decoration' },
  { id: 'rubble_half',       label: 'Rubble (half)',       kind: 'd11', category: 'props', scale: 1.25, color: '#69625a', tag: 'decoration' },
  { id: 'banner_red',        label: 'Banner (red)',        kind: 'd11', category: 'props', scale: 1.85, color: '#c0382b', tag: 'decoration', wallOnly: true },
  { id: 'banner_blue',       label: 'Banner (blue)',       kind: 'd11', category: 'props', scale: 1.85, color: '#3b82e8', tag: 'decoration', wallOnly: true },
  { id: 'banner_green',      label: 'Banner (green)',      kind: 'd11', category: 'props', scale: 1.85, color: '#3aa84a', tag: 'decoration', wallOnly: true },
  { id: 'sword_shield',      label: 'Sword & shield',     kind: 'd11', category: 'props', scale: 1.45, color: '#9aa8b8', tag: 'decoration', wallOnly: true },
  { id: 'bottle_A_green',    label: 'Bottle',              kind: 'd11', category: 'props', scale: 0.85, color: '#3eb04a', tag: 'decoration' },

  // ── LIGHTING ────────────────────────────────────────────────────────────────
  { id: 'torch_lit',          label: 'Torch (floor)',      kind: 'd11', category: 'lighting', scale: 1.85, color: '#ff9a34', tag: 'light' },
  { id: 'torch_mounted',      label: 'Torch (wall)',       kind: 'd11', category: 'lighting', scale: 1.95, color: '#ff9a34', tag: 'light', wallOnly: true },
  { id: 'candle_lit',         label: 'Candle',             kind: 'd11', category: 'lighting', scale: 0.95, color: '#ffe080', tag: 'light' },
  { id: 'candle_triple',      label: 'Candle (triple)',    kind: 'd11', category: 'lighting', scale: 1.05, color: '#ffe080', tag: 'light' },

  // ── BUILDINGS ───────────────────────────────────────────────────────────────
  { id: 'blacksmith',         label: 'Blacksmith',         kind: 'building', category: 'buildings', scale: 0.74, color: '#7a5132', tag: 'shop' },
  { id: 'market',             label: 'Market',             kind: 'building', category: 'buildings', scale: 0.72, color: '#8a6a42', tag: 'shop' },
  { id: 'tavern',             label: 'Tavern',             kind: 'building', category: 'buildings', scale: 0.74, color: '#8a6a42', tag: 'shop' },
  { id: 'church',             label: 'Church',             kind: 'building', category: 'buildings', scale: 0.74, color: '#9babba', tag: 'shop' },
  { id: 'castle',             label: 'Castle',             kind: 'building', category: 'buildings', scale: 0.62, color: '#8a8d92', tag: 'large' },
  { id: 'tower_a',            label: 'Tower A',            kind: 'building', category: 'buildings', scale: 0.78, color: '#77706a', tag: 'large' },
  { id: 'tower_b',            label: 'Tower B',            kind: 'building', category: 'buildings', scale: 0.78, color: '#77706a', tag: 'large' },
  { id: 'home_a',             label: 'Home A',             kind: 'building', category: 'buildings', scale: 0.72, color: '#9d7340', tag: 'residence' },
  { id: 'home_b',             label: 'Home B',             kind: 'building', category: 'buildings', scale: 0.72, color: '#9d7340', tag: 'residence' },
  { id: 'barracks',           label: 'Barracks',           kind: 'building', category: 'buildings', scale: 0.72, color: '#8a7a5a', tag: 'residence' },
  { id: 'archeryrange',       label: 'Archery range',      kind: 'building', category: 'buildings', scale: 0.78, color: '#8a7a5a', tag: 'military' },
  { id: 'windmill',           label: 'Windmill',           kind: 'building', category: 'buildings', scale: 0.62, color: '#a89572', tag: 'industry' },
  { id: 'watermill',          label: 'Watermill',          kind: 'building', category: 'buildings', scale: 0.62, color: '#a89572', tag: 'industry' },
  { id: 'mine',               label: 'Mine',               kind: 'building', category: 'buildings', scale: 0.7,  color: '#69625a', tag: 'industry' },
  { id: 'lumbermill',         label: 'Lumbermill',         kind: 'building', category: 'buildings', scale: 0.7,  color: '#a89572', tag: 'industry' },
  { id: 'well',               label: 'Well',               kind: 'building', category: 'buildings', scale: 0.56, color: '#6d7f8a', tag: 'utility' },
  { id: 'fence_stone',        label: 'Stone fence',        kind: 'building', category: 'buildings', scale: 0.7,  color: '#85806f', tag: 'perimeter' },
  { id: 'bridge_a',           label: 'Bridge',             kind: 'building', category: 'buildings', scale: 0.7,  color: '#9d7340', tag: 'perimeter' },

  // ── FOREST ──────────────────────────────────────────────────────────────────
  { id: 'tree_a',             label: 'Tree',               kind: 'forest', category: 'forest', scale: 1.45, color: '#2f6b34', tag: 'vegetation' },
  { id: 'tree_b',             label: 'Tree (alt)',          kind: 'forest', category: 'forest', scale: 1.45, color: '#2f6b34', tag: 'vegetation' },
  { id: 'tree_pine',          label: 'Pine tree',           kind: 'forest', category: 'forest', scale: 1.55, color: '#1f5829', tag: 'vegetation' },
  { id: 'tree_bare',          label: 'Bare tree',           kind: 'forest', category: 'forest', scale: 1.45, color: '#6e5942', tag: 'vegetation' },
  { id: 'bush_1_a',           label: 'Bush',                kind: 'forest', category: 'forest', scale: 0.9,  color: '#3a7842', tag: 'vegetation' },
  { id: 'bush_2_a',           label: 'Bush (small)',         kind: 'forest', category: 'forest', scale: 0.7,  color: '#3a7842', tag: 'vegetation' },
  { id: 'rock_a',             label: 'Rock',                kind: 'forest', category: 'forest', scale: 0.9,  color: '#686258', tag: 'terrain' },
  { id: 'rock_b',             label: 'Rock (large)',         kind: 'forest', category: 'forest', scale: 1.1,  color: '#686258', tag: 'terrain' },
  { id: 'rock_1_a',           label: 'Boulder',             kind: 'forest', category: 'forest', scale: 1.25, color: '#686258', tag: 'terrain' },

  // ── FURNITURE ───────────────────────────────────────────────────────────────
  { id: 'chair_a',            label: 'Chair',               kind: 'furniture', category: 'furniture', scale: 1.25, color: '#7e572f', tag: 'seating' },
  { id: 'chair_b',            label: 'Chair (alt)',          kind: 'furniture', category: 'furniture', scale: 1.25, color: '#7e572f', tag: 'seating' },
  { id: 'stool',              label: 'Stool',               kind: 'furniture', category: 'furniture', scale: 1.0,  color: '#7e572f', tag: 'seating' },
  { id: 'armchair',           label: 'Armchair',             kind: 'furniture', category: 'furniture', scale: 1.35, color: '#7e572f', tag: 'seating' },
  { id: 'table_medium',       label: 'Table (medium)',       kind: 'furniture', category: 'furniture', scale: 1.5,  color: '#7e572f', tag: 'surface' },
  { id: 'shelf_big',          label: 'Bookshelf',            kind: 'furniture', category: 'furniture', scale: 2.05, color: '#7e572f', tag: 'surface' },
  { id: 'bed_single',         label: 'Bed (single)',         kind: 'furniture', category: 'furniture', scale: 1.65, color: '#7e572f', tag: 'residence' },
  { id: 'bed_double',         label: 'Bed (double)',         kind: 'furniture', category: 'furniture', scale: 1.95, color: '#7e572f', tag: 'residence' },
  { id: 'lamp_standing',      label: 'Lamp',                kind: 'furniture', category: 'furniture', scale: 1.55, color: '#ffe080', tag: 'light' },
  { id: 'rug_oval',           label: 'Rug',                 kind: 'furniture', category: 'furniture', scale: 1.85, color: '#a23a3a', tag: 'decoration' },

  // ── NPC SET-DRESSING ────────────────────────────────────────────────────────
  { id: 'npc_blacksmith',     label: 'NPC: Blacksmith',     kind: 'npc', category: 'characters', scale: 1.0, color: '#cc8833', tag: 'vendor' },
  { id: 'npc_merchant',       label: 'NPC: Merchant',       kind: 'npc', category: 'characters', scale: 1.0, color: '#8844ff', tag: 'vendor' },
  { id: 'npc_healer',         label: 'NPC: Healer',         kind: 'npc', category: 'characters', scale: 1.0, color: '#44cc44', tag: 'vendor' },
  { id: 'npc_stash',          label: 'NPC: Stash kpr',      kind: 'npc', category: 'characters', scale: 1.0, color: '#4488ff', tag: 'vendor' },
  { id: 'npc_identifier',     label: 'NPC: Identifier',     kind: 'npc', category: 'characters', scale: 1.0, color: '#d6b65c', tag: 'vendor' },
  { id: 'npc_waypoint',       label: 'NPC: Waypoint',       kind: 'npc', category: 'characters', scale: 1.0, color: '#d6b65c', tag: 'vendor' },
  { id: 'npc_ranger',         label: 'NPC: Ranger',         kind: 'npc', category: 'characters', scale: 1.0, color: '#44cc88', tag: 'guard' },
  { id: 'npc_rogue',          label: 'NPC: Rogue',          kind: 'npc', category: 'characters', scale: 1.0, color: '#aa44ff', tag: 'guard' },
  { id: 'npc_merc_captain',   label: 'NPC: Mercenary',      kind: 'npc', category: 'characters', scale: 1.0, color: '#cc8833', tag: 'guard' },
  { id: 'town_bard',          label: 'NPC: Bard',           kind: 'npc', category: 'characters', scale: 1.0, color: '#ffd06a', tag: 'vendor' },
  { id: 'town_monk',          label: 'NPC: Monk',           kind: 'npc', category: 'characters', scale: 1.0, color: '#d9b56c', tag: 'vendor' },

  // ── MONSTER SET-DRESSING ────────────────────────────────────────────────────
  { id: 'skeleton',            label: 'Skeleton',           kind: 'monster', category: 'monsters', scale: 1.0,  color: '#dadada', tag: 'undead' },
  { id: 'skeleton_rogue',      label: 'Skeleton rogue',     kind: 'monster', category: 'monsters', scale: 1.0,  color: '#dadada', tag: 'undead' },
  { id: 'skeleton_minion',     label: 'Skeleton minion',    kind: 'monster', category: 'monsters', scale: 0.85, color: '#dadada', tag: 'undead' },
  { id: 'skeleton_mage_enemy', label: 'Skeleton mage',      kind: 'monster', category: 'monsters', scale: 1.0,  color: '#aaccff', tag: 'undead' },
];
