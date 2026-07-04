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
// TIGHT connected-floor rooms (z 8..92, walls at |x|=26). Packs are DENSE and
// spread across the whole ~112u room so the 20-yd mob aggro reaches wall-to-wall —
// you cannot skirt them. ~7-8 mobs per room; with every room live at once that is
// a floor of ~200+ demons between the well and The Butcher.
const OUTER_SANCTUM_SPAWNS = {
  id: 'durance_outer_trash',
  weight: 1,
  spawns: [
    { mobId: 'durance_hateful_husk', x: -12, z: 18 },
    { mobId: 'durance_hateful_husk', x: 12, z: 20 },
    { mobId: 'durance_hateful_husk', x: 0, z: 30 },
    { mobId: 'durance_sigilbound_acolyte', x: -16, z: 50 },
    { mobId: 'durance_sigilbound_acolyte', x: 16, z: 52 },
    { mobId: 'durance_hateful_husk', x: -10, z: 74 },
    { mobId: 'durance_hateful_husk', x: 10, z: 78 },
    { mobId: 'durance_hateful_husk', x: 0, z: 88 },
  ],
};

const BLOOD_GALLERY_SPAWNS = {
  id: 'durance_gallery_trash',
  weight: 1,
  spawns: [
    { mobId: 'durance_sigilbound_acolyte', x: -15, z: 20 },
    { mobId: 'durance_hateful_husk', x: 15, z: 22 },
    { mobId: 'durance_hateful_husk', x: -8, z: 34 },
    { mobId: 'durance_hateful_husk', x: 8, z: 38 },
    { mobId: 'durance_blood_behemoth', x: 0, z: 58 },
    { mobId: 'durance_hateful_husk', x: -14, z: 80 },
    { mobId: 'durance_sigilbound_acolyte', x: 14, z: 84 },
  ],
};

const HOLLOW_DESCENT_SPAWNS = {
  id: 'durance_descent_trash',
  weight: 1,
  spawns: [
    { mobId: 'durance_hateful_husk', x: -14, z: 18 },
    { mobId: 'durance_hateful_husk', x: 14, z: 20 },
    { mobId: 'durance_sigilbound_acolyte', x: 0, z: 32 },
    { mobId: 'durance_hateful_husk', x: -16, z: 52 },
    { mobId: 'durance_hateful_husk', x: 16, z: 56 },
    { mobId: 'durance_blood_behemoth', x: 0, z: 66 },
    { mobId: 'durance_sigilbound_acolyte', x: -12, z: 84 },
    { mobId: 'durance_sigilbound_acolyte', x: 12, z: 88 },
  ],
};

// Finale: The Butcher strides onto the dais deep at the back (dais z=92, r=16 →
// spawn just south at z=80, well inside the tight finale room).
const BUTCHER_SPAWNS = {
  id: 'boss',
  weight: 1,
  spawns: [{ mobId: 'durance_the_butcher', x: 0, z: 80 }],
};

const CHASM_SPAWNS = {
  id: 'durance_chasm_trash',
  weight: 1,
  spawns: [
    { mobId: 'durance_blood_behemoth', x: -14, z: 26 },
    { mobId: 'durance_blood_behemoth', x: 14, z: 30 },
    { mobId: 'durance_hateful_husk', x: 0, z: 22 },
    { mobId: 'durance_hateful_husk', x: -10, z: 54 },
    { mobId: 'durance_hateful_husk', x: 10, z: 58 },
    { mobId: 'durance_sigilbound_acolyte', x: -16, z: 82 },
    { mobId: 'durance_sigilbound_acolyte', x: 16, z: 84 },
  ],
};

const PYRE_SPAWNS = {
  id: 'durance_pyre_trash',
  weight: 1,
  spawns: [
    { mobId: 'durance_sigilbound_acolyte', x: -18, z: 18 },
    { mobId: 'durance_sigilbound_acolyte', x: 18, z: 20 },
    { mobId: 'durance_hateful_husk', x: -10, z: 36 },
    { mobId: 'durance_hateful_husk', x: 10, z: 40 },
    { mobId: 'durance_hateful_husk', x: 0, z: 56 },
    { mobId: 'durance_blood_behemoth', x: -12, z: 76 },
    { mobId: 'durance_blood_behemoth', x: 12, z: 80 },
    { mobId: 'durance_hateful_husk', x: 0, z: 90 },
  ],
};

// ── Modules — the Durance is a LONG, sprawling descent. Six big distinct room
// types (each a wide 200-yd hall) feed the finale. Layout ids === keys. Interior
// 'crypt' reuses the dark stone kit; the delve is dressed infernal at build time.
// Breakable dungeon clutter along the flanks of every big hall — smash them for
// copper/scraps, D2-style. 'breakable_barrel'/'breakable_urn' are real delve-
// object kinds (createDelveObject: 5 HP, lootable).
// Breakable clutter along the flanks (|x|=22, clear of the |x|<6 doorways at both
// ends). Smash them D2-style for copper/scraps. 6 per tight room.
const BARRELS = [
  { x: -22, z: 16, variants: ['breakable_barrel'] },
  { x: 22, z: 20, variants: ['breakable_urn'] },
  { x: -22, z: 50, variants: ['breakable_barrel'] },
  { x: 22, z: 54, variants: ['breakable_barrel'] },
  { x: -22, z: 84, variants: ['breakable_urn'] },
  { x: 22, z: 88, variants: ['breakable_barrel'] },
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
  // A LONG connected-floor crusade: 40–50 tight rooms drawn from the pool before
  // the Butcher's dais, all live at once and linked by corridors — roam freely and
  // cut through demon packs the whole way down. (Normal 40 / Infernal 50.)
  moduleCount: [40, 50],
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
