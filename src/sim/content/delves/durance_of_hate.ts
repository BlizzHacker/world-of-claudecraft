import type { DelveDef, DelveModuleDef, NpcDef } from '../../types';

// ── The Durance of Hate — a hidden Diabl0.net Easter-egg delve ──────────────
// Unlocked by the "Sigil of Hate" quest (3 hidden sigils around Eastbrook Vale).
// The descent opens at the town WELL: Warden Kaine appears once the sigils are
// gathered, and the well becomes the delve mouth. Dark stone halls, torch-lit,
// tuned as a secret high-end reward room echoing the DuranceOfHate dungeon.
//
// Built on the same rails as COLLAPSED_RELIQUARY: mobs in DELVE_MOBS, modules
// keyed by layout id, registered through delves/index.ts → sim/data.ts.

// ── Enemy spawn sets per module ─────────────────────────────────────────────
// Blood-warped horrors of the Durance: fast Hateful Husks rush, Sigil-Bound
// casters brand from range, and the Behemoth anchors the deep hall.
// Rooms are big (~200yd) now, so packs are DENSE and spread across the hall —
// a real dungeon-crawler mob count. x ranges within the ±36 wide halls; z spans
// the room depth so you fight the whole way through, not one clump.
const OUTER_SANCTUM_SPAWNS = {
  id: 'durance_outer_trash',
  weight: 1,
  spawns: [
    { mobId: 'durance_hateful_husk', x: -14, z: 24 },
    { mobId: 'durance_hateful_husk', x: 12, z: 26 },
    { mobId: 'durance_hateful_husk', x: 0, z: 34 },
    { mobId: 'durance_sigilbound_acolyte', x: -20, z: 58 },
    { mobId: 'durance_sigilbound_acolyte', x: 20, z: 60 },
    { mobId: 'durance_hateful_husk', x: -8, z: 92 },
    { mobId: 'durance_hateful_husk', x: 8, z: 96 },
    { mobId: 'durance_hateful_husk', x: -18, z: 120 },
    { mobId: 'durance_sigilbound_acolyte', x: 0, z: 128 },
    { mobId: 'durance_hateful_husk', x: 16, z: 132 },
  ],
};

const BLOOD_GALLERY_SPAWNS = {
  id: 'durance_gallery_trash',
  weight: 1,
  spawns: [
    { mobId: 'durance_sigilbound_acolyte', x: -22, z: 26 },
    { mobId: 'durance_hateful_husk', x: 22, z: 28 },
    { mobId: 'durance_hateful_husk', x: -10, z: 40 },
    { mobId: 'durance_hateful_husk', x: 10, z: 44 },
    { mobId: 'durance_blood_behemoth', x: -18, z: 78 },
    { mobId: 'durance_blood_behemoth', x: 18, z: 82 },
    { mobId: 'durance_hateful_husk', x: 0, z: 100 },
    { mobId: 'durance_sigilbound_acolyte', x: -14, z: 128 },
    { mobId: 'durance_sigilbound_acolyte', x: 14, z: 132 },
  ],
};

const HOLLOW_DESCENT_SPAWNS = {
  id: 'durance_descent_trash',
  weight: 1,
  spawns: [
    { mobId: 'durance_hateful_husk', x: -16, z: 24 },
    { mobId: 'durance_hateful_husk', x: 16, z: 26 },
    { mobId: 'durance_sigilbound_acolyte', x: 0, z: 40 },
    { mobId: 'durance_hateful_husk', x: -22, z: 62 },
    { mobId: 'durance_hateful_husk', x: 22, z: 66 },
    { mobId: 'durance_blood_behemoth', x: 0, z: 84 },
    { mobId: 'durance_sigilbound_acolyte', x: -18, z: 110 },
    { mobId: 'durance_sigilbound_acolyte', x: 18, z: 114 },
    { mobId: 'durance_hateful_husk', x: -8, z: 134 },
    { mobId: 'durance_hateful_husk', x: 8, z: 138 },
  ],
};

// Finale: The Butcher strides onto the dais deep at the back (dais z=160,
// r=18 → spawn just south at z=148).
const BUTCHER_SPAWNS = {
  id: 'boss',
  weight: 1,
  spawns: [{ mobId: 'durance_the_butcher', x: 0, z: 148 }],
};

// Extra deep-descent packs — the Durance is a long, sprawling descent, so there
// are many distinct room encounters between the well and The Butcher.
const CHASM_SPAWNS = {
  id: 'durance_chasm_trash',
  weight: 1,
  spawns: [
    { mobId: 'durance_blood_behemoth', x: -20, z: 34 },
    { mobId: 'durance_blood_behemoth', x: 20, z: 38 },
    { mobId: 'durance_hateful_husk', x: -8, z: 30 },
    { mobId: 'durance_hateful_husk', x: 8, z: 32 },
    { mobId: 'durance_hateful_husk', x: 0, z: 70 },
    { mobId: 'durance_sigilbound_acolyte', x: -24, z: 96 },
    { mobId: 'durance_sigilbound_acolyte', x: 24, z: 100 },
    { mobId: 'durance_hateful_husk', x: -12, z: 128 },
    { mobId: 'durance_hateful_husk', x: 12, z: 132 },
  ],
};

const PYRE_SPAWNS = {
  id: 'durance_pyre_trash',
  weight: 1,
  spawns: [
    { mobId: 'durance_sigilbound_acolyte', x: -26, z: 26 },
    { mobId: 'durance_sigilbound_acolyte', x: 26, z: 28 },
    { mobId: 'durance_hateful_husk', x: -12, z: 44 },
    { mobId: 'durance_hateful_husk', x: 12, z: 46 },
    { mobId: 'durance_hateful_husk', x: 0, z: 74 },
    { mobId: 'durance_blood_behemoth', x: -16, z: 104 },
    { mobId: 'durance_blood_behemoth', x: 16, z: 108 },
    { mobId: 'durance_hateful_husk', x: -8, z: 134 },
    { mobId: 'durance_sigilbound_acolyte', x: 8, z: 138 },
  ],
};

// ── Modules — the Durance is a LONG, sprawling descent. Six big distinct room
// types (each a wide 200-yd hall) feed the finale. Layout ids === keys. Interior
// 'crypt' reuses the dark stone kit; the delve is dressed infernal at build time.
// Breakable dungeon clutter along the flanks of every big hall — smash them for
// copper/scraps, D2-style. 'breakable_barrel'/'breakable_urn' are real delve-
// object kinds (createDelveObject: 5 HP, lootable).
const BARRELS = [
  { x: -30, z: 20, variants: ['breakable_barrel'] },
  { x: 30, z: 24, variants: ['breakable_urn'] },
  { x: -34, z: 62, variants: ['breakable_barrel'] },
  { x: 34, z: 66, variants: ['breakable_barrel'] },
  { x: -28, z: 104, variants: ['breakable_urn'] },
  { x: 28, z: 108, variants: ['breakable_barrel'] },
  { x: -32, z: 142, variants: ['breakable_barrel'] },
  { x: 32, z: 146, variants: ['breakable_urn'] },
];

export const DURANCE_OF_HATE_MODULES: Record<string, DelveModuleDef> = {
  durance_outer_sanctum: {
    id: 'durance_outer_sanctum',
    interior: 'crypt',
    layout: 'durance_outer_sanctum',
    length: 200,
    spawnSets: [OUTER_SANCTUM_SPAWNS],
    interactableSlots: [...BARRELS],
  },
  durance_blood_gallery: {
    id: 'durance_blood_gallery',
    interior: 'crypt',
    layout: 'durance_blood_gallery',
    length: 200,
    spawnSets: [BLOOD_GALLERY_SPAWNS],
    interactableSlots: [...BARRELS],
  },
  durance_hollow_descent: {
    id: 'durance_hollow_descent',
    interior: 'crypt',
    layout: 'durance_hollow_descent',
    length: 200,
    spawnSets: [HOLLOW_DESCENT_SPAWNS],
    interactableSlots: [...BARRELS],
  },
  durance_burning_chasm: {
    id: 'durance_burning_chasm',
    interior: 'crypt',
    layout: 'durance_burning_chasm',
    length: 220,
    spawnSets: [CHASM_SPAWNS],
    interactableSlots: [...BARRELS],
  },
  durance_pyre_hall: {
    id: 'durance_pyre_hall',
    interior: 'crypt',
    layout: 'durance_pyre_hall',
    length: 220,
    spawnSets: [PYRE_SPAWNS],
    interactableSlots: [...BARRELS],
  },
  durance_finale: {
    id: 'durance_finale',
    interior: 'crypt',
    layout: 'durance_finale',
    length: 240,
    spawnSets: [BUTCHER_SPAWNS],
    interactableSlots: [...BARRELS],
  },
};

// ── The delve definition ────────────────────────────────────────────────────
// doorPos = the Eastbrook Vale well (ZONE1_PROPS.wells[0] = {x:0, z:2}). The
// board NPC (Warden Kaine) stands at the well once the sigil quest is complete;
// enter_delve is gated on that quest in the server handler.
export const DURANCE_OF_HATE_DELVE: DelveDef = {
  id: 'durance_of_hate',
  name: 'The Durance of Hate',
  theme: 'crypt',
  index: 1,
  minLevel: 10,
  suggestedPlayers: 2,
  doorPos: { x: 0, z: 2 },
  modules: [
    'durance_outer_sanctum',
    'durance_blood_gallery',
    'durance_hollow_descent',
    'durance_burning_chasm',
    'durance_pyre_hall',
  ],
  // A LONG dungeon crawl: 24–30 big rooms drawn from the pool before the
  // Butcher's dais — smash barrels and cut through demon packs the whole way down.
  moduleCount: [24, 30],
  finaleModuleId: 'durance_finale',
  bosses: ['durance_the_butcher'],
  objective: 'kill_boss',
  boardNpcId: 'warden_kaine',
  enterText: 'The well drops away into black water — and beyond it, the Durance of Hate.',
  leaveText: 'You climb from the well, the whispers of the Durance fading behind you.',
  tiers: [
    {
      id: 'normal',
      label: 'Normal',
      enemyLevelBonus: 0,
      affixCount: 0,
      rewardMult: 1,
    },
    {
      id: 'infernal',
      label: 'Infernal',
      enemyLevelBonus: 3,
      affixCount: 1,
      rewardMult: 1.4,
      minPlayerLevel: 12,
      firstClearXp: 1400,
      repeatClearXp: 850,
      copperMin: 20,
      copperMax: 30,
    },
  ],
  baseRewards: {
    copperMin: 10,
    copperMax: 18,
    firstClearXp: 950,
    repeatClearXp: 560,
  },
};

// The descent-keeper who appears at the well once the sigil quest is complete.
export const WARDEN_KAINE: NpcDef = {
  id: 'warden_kaine',
  name: 'Warden Kaine',
  title: 'Keeper of the Descent',
  pos: { x: 0, z: 2 },
  facing: 0,
  color: 0x241d22,
  questIds: [],
  greeting: 'You carry the three sigils. The Durance remembers its own — descend, if your hate is equal to its.',
};
