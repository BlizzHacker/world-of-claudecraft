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
const OUTER_SANCTUM_SPAWNS = {
  id: 'durance_outer_trash',
  weight: 1,
  spawns: [
    { mobId: 'durance_hateful_husk', x: -5, z: 26 },
    { mobId: 'durance_hateful_husk', x: 5, z: 28 },
    { mobId: 'durance_sigilbound_acolyte', x: -4, z: 54 },
    { mobId: 'durance_hateful_husk', x: 4, z: 56 },
  ],
};

const BLOOD_GALLERY_SPAWNS = {
  id: 'durance_gallery_trash',
  weight: 1,
  spawns: [
    { mobId: 'durance_sigilbound_acolyte', x: -6, z: 26 },
    { mobId: 'durance_hateful_husk', x: 6, z: 28 },
    { mobId: 'durance_blood_behemoth', x: 0, z: 58 },
  ],
};

const HOLLOW_DESCENT_SPAWNS = {
  id: 'durance_descent_trash',
  weight: 1,
  spawns: [
    { mobId: 'durance_hateful_husk', x: -4, z: 26 },
    { mobId: 'durance_sigilbound_acolyte', x: 4, z: 28 },
    { mobId: 'durance_sigilbound_acolyte', x: -5, z: 54 },
    { mobId: 'durance_hateful_husk', x: 5, z: 56 },
  ],
};

// Finale: the Hatelord strides onto the dais as the encounter opens (dais z=80,
// r=12 → spawn just south at z=72, matching the reliquary finale convention).
const HATELORD_SPAWNS = {
  id: 'boss',
  weight: 1,
  spawns: [{ mobId: 'durance_hatelord_baelgor', x: 0, z: 72 }],
};

// ── Modules (layout id === key; interior 'crypt' reuses the dark stone kit) ──
export const DURANCE_OF_HATE_MODULES: Record<string, DelveModuleDef> = {
  durance_outer_sanctum: {
    id: 'durance_outer_sanctum',
    interior: 'crypt',
    layout: 'durance_outer_sanctum',
    length: 110,
    spawnSets: [OUTER_SANCTUM_SPAWNS],
    interactableSlots: [
      { x: -7, z: 40, variants: ['durance_brazier', 'durance_bones'] },
    ],
  },
  durance_blood_gallery: {
    id: 'durance_blood_gallery',
    interior: 'crypt',
    layout: 'durance_blood_gallery',
    length: 110,
    spawnSets: [BLOOD_GALLERY_SPAWNS],
    interactableSlots: [],
  },
  durance_hollow_descent: {
    id: 'durance_hollow_descent',
    interior: 'crypt',
    layout: 'durance_hollow_descent',
    length: 110,
    spawnSets: [HOLLOW_DESCENT_SPAWNS],
    interactableSlots: [],
  },
  durance_finale: {
    id: 'durance_finale',
    interior: 'crypt',
    layout: 'durance_finale',
    length: 110,
    spawnSets: [HATELORD_SPAWNS],
    interactableSlots: [
      { x: 0, z: 88, variants: ['durance_hate_reliquary'] },
    ],
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
  modules: ['durance_outer_sanctum', 'durance_blood_gallery', 'durance_hollow_descent'],
  moduleCount: [3, 3],
  finaleModuleId: 'durance_finale',
  bosses: ['durance_hatelord_baelgor'],
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
