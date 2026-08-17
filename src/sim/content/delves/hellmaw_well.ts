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
// TIGHT connected-floor rooms (z 8..92, walls at |x|=26). Packs are DENSE SWARMS
// spread across the whole ~112u room so the 20-yd aggro reaches wall-to-wall — you
// cannot skirt them. ~13-14 mobs per room; with every room live at once that's a
// floor of ~500+ demons between the well and The Render. Husks are cheap (low HP)
// so the swarms melt to cleaves/AoE and reward aggressive play.
const OUTER_SANCTUM_SPAWNS = {
  id: 'hellmaw_outer_trash',
  weight: 1,
  spawns: [
    { mobId: 'hellmaw_charred_husk', x: -14, z: 16 },
    { mobId: 'hellmaw_charred_husk', x: -2, z: 18 },
    { mobId: 'hellmaw_charred_husk', x: 12, z: 20 },
    { mobId: 'hellmaw_charred_husk', x: 20, z: 28 },
    { mobId: 'hellmaw_charred_husk', x: -20, z: 30 },
    { mobId: 'hellmaw_wailing_spectre', x: -16, z: 48 },
    { mobId: 'hellmaw_cinder_acolyte', x: 16, z: 50 },
    { mobId: 'hellmaw_charred_husk', x: 0, z: 56 },
    { mobId: 'hellmaw_charred_husk', x: -12, z: 72 },
    { mobId: 'hellmaw_charred_husk', x: 12, z: 74 },
    { mobId: 'hellmaw_charred_husk', x: -20, z: 82 },
    { mobId: 'hellmaw_cursed_knight', x: 20, z: 84 },
    { mobId: 'hellmaw_charred_husk', x: 0, z: 88 },
  ],
};

const BLOOD_GALLERY_SPAWNS = {
  id: 'hellmaw_gallery_trash',
  weight: 1,
  spawns: [
    { mobId: 'hellmaw_wailing_spectre', x: -18, z: 18 },
    { mobId: 'hellmaw_wailing_spectre', x: 18, z: 20 },
    { mobId: 'hellmaw_charred_husk', x: -8, z: 24 },
    { mobId: 'hellmaw_charred_husk', x: 8, z: 26 },
    { mobId: 'hellmaw_lava_fiend', x: 0, z: 34 },
    { mobId: 'hellmaw_charred_husk', x: -16, z: 42 },
    { mobId: 'hellmaw_charred_husk', x: 16, z: 44 },
    { mobId: 'hellmaw_ember_behemoth', x: 0, z: 58 },
    { mobId: 'hellmaw_charred_husk', x: -18, z: 72 },
    { mobId: 'hellmaw_charred_husk', x: 18, z: 74 },
    { mobId: 'hellmaw_charred_husk', x: -6, z: 82 },
    { mobId: 'hellmaw_charred_husk', x: 6, z: 84 },
    { mobId: 'hellmaw_cinder_acolyte', x: 0, z: 90 },
  ],
};

const HOLLOW_DESCENT_SPAWNS = {
  id: 'hellmaw_descent_trash',
  weight: 1,
  spawns: [
    { mobId: 'hellmaw_charred_husk', x: -16, z: 16 },
    { mobId: 'hellmaw_charred_husk', x: -4, z: 18 },
    { mobId: 'hellmaw_cursed_knight', x: 14, z: 20 },
    { mobId: 'hellmaw_cinder_acolyte', x: 0, z: 30 },
    { mobId: 'hellmaw_charred_husk', x: -18, z: 44 },
    { mobId: 'hellmaw_lava_fiend', x: 18, z: 46 },
    { mobId: 'hellmaw_wailing_spectre', x: -8, z: 52 },
    { mobId: 'hellmaw_charred_husk', x: 8, z: 54 },
    { mobId: 'hellmaw_ember_behemoth', x: 0, z: 66 },
    { mobId: 'hellmaw_charred_husk', x: -16, z: 80 },
    { mobId: 'hellmaw_charred_husk', x: 16, z: 82 },
    { mobId: 'hellmaw_cinder_acolyte', x: -10, z: 88 },
    { mobId: 'hellmaw_cinder_acolyte', x: 10, z: 90 },
  ],
};

// Finale: The Butcher strides onto the dais deep at the back (dais z=92, r=16 →
// spawn just south at z=80, well inside the tight finale room).
const BUTCHER_SPAWNS = {
  id: 'boss',
  weight: 1,
  spawns: [{ mobId: 'hellmaw_the_render', x: 0, z: 80 }],
};

const CHASM_SPAWNS = {
  id: 'hellmaw_chasm_trash',
  weight: 1,
  spawns: [
    { mobId: 'hellmaw_primal_beast', x: -14, z: 26 },
    { mobId: 'hellmaw_ember_behemoth', x: 14, z: 30 },
    { mobId: 'hellmaw_charred_husk', x: 0, z: 20 },
    { mobId: 'hellmaw_sigilbound_warlock', x: -18, z: 22 },
    { mobId: 'hellmaw_charred_husk', x: 18, z: 24 },
    { mobId: 'hellmaw_charred_husk', x: -10, z: 50 },
    { mobId: 'hellmaw_charred_husk', x: 10, z: 54 },
    { mobId: 'hellmaw_charred_husk', x: 0, z: 60 },
    { mobId: 'hellmaw_cursed_knight', x: -16, z: 78 },
    { mobId: 'hellmaw_cinder_acolyte', x: 16, z: 80 },
    { mobId: 'hellmaw_charred_husk', x: -6, z: 88 },
    { mobId: 'hellmaw_charred_husk', x: 6, z: 90 },
  ],
};

const PYRE_SPAWNS = {
  id: 'hellmaw_pyre_trash',
  weight: 1,
  spawns: [
    { mobId: 'hellmaw_cinder_acolyte', x: -18, z: 16 },
    { mobId: 'hellmaw_sigilbound_warlock', x: 18, z: 18 },
    { mobId: 'hellmaw_charred_husk', x: -8, z: 24 },
    { mobId: 'hellmaw_charred_husk', x: 8, z: 26 },
    { mobId: 'hellmaw_lava_fiend', x: 0, z: 34 },
    { mobId: 'hellmaw_charred_husk', x: -18, z: 46 },
    { mobId: 'hellmaw_charred_husk', x: 18, z: 48 },
    { mobId: 'hellmaw_charred_husk', x: 0, z: 56 },
    { mobId: 'hellmaw_inferno_dragon', x: -12, z: 74 },
    { mobId: 'hellmaw_ember_behemoth', x: 12, z: 78 },
    { mobId: 'hellmaw_charred_husk', x: -8, z: 88 },
    { mobId: 'hellmaw_charred_husk', x: 8, z: 90 },
  ],
};

// ── Modules — the Hellmaw is a LONG connected descent of tight rooms linked by
// corridors. Layout ids === keys. Interior 'crypt' reuses the dark stone kit;
// dressed infernal at build time. Breakable clutter along the flanks (|x|=22, clear
// of the |x|<6 doorways at both ends). Smash them for copper/scraps. 6 per room.
const BARRELS = [
  { x: -22, z: 16, variants: ['breakable_barrel'] },
  { x: 22, z: 20, variants: ['breakable_urn'] },
  { x: -22, z: 50, variants: ['breakable_barrel'] },
  { x: 22, z: 54, variants: ['breakable_barrel'] },
  { x: -22, z: 84, variants: ['breakable_urn'] },
  { x: 22, z: 88, variants: ['breakable_barrel'] },
];

// ── Openable maze gates ──────────────────────────────────────────────────────
// Each room (except the finale) seals its northern exit with an iron portcullis
// (`locked_door`) sitting in the off-centre maze doorway. Two pressure plates in
// the room floor open it once BOTH are stepped on — so you must actually cross the
// room (and its mob pack) to proceed, instead of sprinting the corridor. The
// plate→door link is auto-wired per module by spawnDelveInteractables. `doorZ` is
// the room's back-wall z; `doorX` the room's backX maze offset (portcullis lands
// in the mouth). Plates flank the aisle mid-room so the pack guards the trigger.
function mazeGate(doorZ: number, doorX: number) {
  return [
    { x: -8, z: Math.round(doorZ * 0.55), variants: ['pressure_plate'] },
    { x: 8, z: Math.round(doorZ * 0.68), variants: ['pressure_plate'] },
    { x: doorX, z: doorZ - 2, variants: ['locked_door'] },
  ];
}

export const HELLMAW_WELL_MODULES: Record<string, DelveModuleDef> = {
  hellmaw_outer_maw: {
    id: 'hellmaw_outer_maw',
    interior: 'crypt',
    layout: 'hellmaw_outer_maw',
    length: 200,
    spawnSets: [OUTER_SANCTUM_SPAWNS],
    interactableSlots: [...BARRELS, ...mazeGate(104, 10)],
  },
  hellmaw_ember_gallery: {
    id: 'hellmaw_ember_gallery',
    interior: 'crypt',
    layout: 'hellmaw_ember_gallery',
    length: 200,
    spawnSets: [BLOOD_GALLERY_SPAWNS],
    interactableSlots: [...BARRELS, ...mazeGate(110, -10)],
  },
  hellmaw_hollow_descent: {
    id: 'hellmaw_hollow_descent',
    interior: 'crypt',
    layout: 'hellmaw_hollow_descent',
    length: 200,
    spawnSets: [HOLLOW_DESCENT_SPAWNS],
    interactableSlots: [...BARRELS, ...mazeGate(134, 10)],
  },
  hellmaw_burning_chasm: {
    id: 'hellmaw_burning_chasm',
    interior: 'crypt',
    layout: 'hellmaw_burning_chasm',
    length: 220,
    spawnSets: [CHASM_SPAWNS],
    interactableSlots: [...BARRELS, ...mazeGate(148, -10)],
  },
  hellmaw_pyre_hall: {
    id: 'hellmaw_pyre_hall',
    interior: 'crypt',
    layout: 'hellmaw_pyre_hall',
    length: 220,
    spawnSets: [PYRE_SPAWNS],
    interactableSlots: [...BARRELS, ...mazeGate(150, 10)],
  },
  hellmaw_finale: {
    id: 'hellmaw_finale',
    interior: 'crypt',
    layout: 'hellmaw_finale',
    length: 240,
    spawnSets: [BUTCHER_SPAWNS],
    interactableSlots: [...BARRELS],
  },
};

// ── The dungeon definition ──────────────────────────────────────────────────
// doorPos = the Eastbrook Vale well (ZONE1_PROPS.wells[0] = {x:0, z:2}). The
// board NPC (Cainhurst the Sage) stands at the well once you have RESCUED him;
// enter is gated on the q_save_cainhurst quest in the server handler.
export const HELLMAW_WELL_DELVE: DelveDef = {
  id: 'hellmaw_well',
  name: 'The Hellmaw Well',
  theme: 'crypt',
  index: 2,
  minLevel: 10,
  suggestedPlayers: 2,
  maxPlayers: 2,
  doorPos: { x: 0, z: 2 },
  modules: [
    'hellmaw_outer_maw',
    'hellmaw_ember_gallery',
    'hellmaw_hollow_descent',
    'hellmaw_burning_chasm',
    'hellmaw_pyre_hall',
  ],
  // A LONG connected-floor crusade: 40–50 tight rooms drawn from the pool before
  // The Render's dais, all live at once and linked by corridors — roam freely and
  // cut through demon swarms the whole way down. (Normal 40 / Infernal 50.)
  moduleCount: [40, 50],
  finaleModuleId: 'hellmaw_finale',
  bosses: ['hellmaw_the_render'],
  objective: 'kill_boss',
  boardNpcId: 'cainhurst_sage',
  enterText: 'The well mouth yawns into red dark — and the Hellmaw swallows you down.',
  leaveText: 'You haul yourself back up the well shaft, the Hellmaw seething below.',
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

// Cainhurst the Sage — the old loremaster you RESCUE from the Hellmaw. Once saved,
// he keeps vigil at the well and opens the descent for you. A red return-portal
// shimmers at his side (spawned as a prop next to him; see ZONE1 portal wiring).
export const CAINHURST_SAGE: NpcDef = {
  id: 'cainhurst_sage',
  name: 'Cainhurst the Sage',
  title: 'Keeper of the Hellmaw',
  // (0,2) was "at the well" when the well was open ground; the Eastbrook rebuild
  // gave the well a solid beacon (circle r1.5 at -0.75,2) that swallowed his
  // spot — the physics audit's NPC-overlap sweep flagged him embedded. He keeps
  // vigil from the beacon's NE rim instead.
  pos: { x: 1.6, z: 3.6 },
  facing: 0,
  color: 0x2a1520,
  questIds: [],
  greeting:
    'You pulled me from the Hellmaw, friend — I do not forget it. The well is open to you now. Steel yourself: The Render waits at the bottom.',
};
