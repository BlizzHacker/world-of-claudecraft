// d2MpqPaths.js — Diablo 1/2 MPQ path mappings for CrypticRealm monster/item/tile types.
// Maps each CR enemy type to its closest D2 monster DC6 path.
// When real D2 MPQs are loaded, these paths resolve to authentic sprites.

// D2 monster animation mode codes (from COF/DC6 naming convention)
export const D2_ANIM = {
  idle:  'NU', // neutral
  walk:  'WL', // walk
  attack:'A1', // attack 1
  hurt:  'GH', // get hit
  death: 'DD', // death (dialog) / 'DT' = die
};

// D2 monster codes used in data/global/monsters/{code}/
const D2_MON = {
  sk:   'sk',   // Skeleton Warrior (D2 Act 1)
  skm:  'skm',  // Skeleton Mage (D2 Act 1)
  zm:   'zm',   // Zombie (D2 Act 1)
  fal:  'fal',  // Fallen (D2 Act 1)
  fsh:  'fsh',  // Fallen Shaman (D2 Act 1)
  wra:  'wra',  // Wraith (D2 Act 1 Catacombs)
  gst:  'gst',  // Ghost (D2 Act 1)
  skd:  'skd',  // Skeleton Archer / Bone Warrior
  golem:'golem',// Blood Golem / Sand Golem
  mum:  'mum',  // Mummy (D2 Act 2)
  scb:  'scb',  // Scarab (D2 Act 2)
  ug:   'ug',   // Undead Scavenger / vulture
  dml:  'dml',  // Dune Male / desert monster
  fl:   'fl',   // Flayer (D2 Act 3)
  fgm:  'fgm',  // Flayer Shaman
  tg:   'tg',   // Terror Demon / jungle demon
  imp:  'imp',  // Imp / fire imp (D2 Act 4)
  bf:   'bf',   // Blood Fanatic / demon
  cm:   'cm',   // Chaos Knight / blood knight
  sty:  'sty',  // Stygian Doll / chaos mage
  fw:   'fw',   // Frozen Wraith / ice wraith
  fg:   'fg',   // Frost Giant / yeti (D2 Act 5)
  sw:   'sw',   // Succubus / snow witch
  bs:   'bs',   // Blood Lord / rift spawn
  cm2:  'cm2',  // Corpse Mummy / dim horror
  se:   'se',   // Storm Eagle / star eater
  wc:   'wc',   // Werewolf (D2 Act 3 / Druid form)
  pl:   'pl',   // Plant / briar beast (D2 Act 3)
  sc:   'sc',   // Scorpion (D2 Act 2)
  rs:   'rs',   // Rift Spawn / abyss creature
  dim:  'dim',  // Dim Horror
  star: 'star', // Star Eater
};

// Map CR enemy types to D2 monster DC6 paths
// Format: data/global/monsters/{code}/{animation}/dc6/{code}{animMode}.dc6
export const D2_MONSTER_PATHS = {
  // Act 1 undead
  zombie:      { code:D2_MON.zm,   act:1, label:"Zombie" },
  skeleton:    { code:D2_MON.sk,   act:1, label:"Skeleton Warrior" },
  skeleton_mage:{ code:D2_MON.skm, act:1, label:"Skeleton Mage" },
  werewolf:    { code:D2_MON.wc,   act:3, label:"Werewolf" },
  sand_golem:  { code:D2_MON.golem,act:2, label:"Blood Golem" },
  mummy:       { code:D2_MON.mum,  act:2, label:"Mummy" },
  scorpion:    { code:D2_MON.sc,   act:2, label:"Scorpion" },
  jungle_demon:{ code:D2_MON.tg,   act:3, label:"Terror Demon" },
  shaman:      { code:D2_MON.fsh,  act:1, label:"Fallen Shaman" },
  plant_horror:{ code:D2_MON.pl,   act:3, label:"Briar Beast" },
  fire_imp:    { code:D2_MON.imp,  act:4, label:"Imp" },
  blood_knight:{ code:D2_MON.cm,   act:4, label:"Chaos Knight" },
  chaos_mage:  { code:D2_MON.sty,  act:4, label:"Stygian Doll" },
  ice_wraith:  { code:D2_MON.fw,   act:5, label:"Frozen Wraith" },
  frost_giant: { code:D2_MON.fg,   act:5, label:"Frost Giant" },
  snow_witch:  { code:D2_MON.sw,   act:5, label:"Succubus" },
  rift_spawn:  { code:D2_MON.bs,   act:4, label:"Blood Lord" },
  dim_horror:  { code:D2_MON.cm2,  act:4, label:"Corpse Mummy" },
  star_eater:  { code:D2_MON.se,   act:4, label:"Storm Eagle" },
};

// D1 monster CEL paths (for Diablo 1 MPQ)
export const D1_MONSTER_PATHS = {
  zombie:      "monsters\\zomb\\zomb.cel",
  skeleton:    "monsters\\sklt\\sklt.cel",
  skeleton_mage:"monsters\\sklm\\sklm.cel",
  werewolf:    "monsters\\wolf\\wolf.cel",
  sand_golem:  "monsters\\golem\\golem.cel",
  mummy:       "monsters\\mtd\\mtd.cel",
  scorpion:    "monsters\\scav\\scav.cel",
  jungle_demon:"monsters\\skel\\skel.cel",
  shaman:      "monsters\\fall\\fall.cel",
  plant_horror:"monsters\\succ\\succ.cel",
  fire_imp:    "monsters\\imp\\imp.cel",
  blood_knight:"monsters\\warl\\warl.cel",
  chaos_mage:  "monsters\\mage\\mage.cel",
  ice_wraith:  "monsters\\wraith\\wraith.cel",
  frost_giant: "monsters\\btln\\btln.cel",
  snow_witch:  "monsters\\succ\\succ.cel",
  rift_spawn:  "monsters\\demn\\demn.cel",
  dim_horror:  "monsters\\sklb\\sklb.cel",
  star_eater:  "monsters\\sklb\\sklb.cel",
};

// D2 tile DT1 paths per act
export const D2_TILE_PATHS = {
  act1_outdoor: [
    "data/global/tiles/act1/outdoors/ground.dt1",
    "data/global/tiles/act1/outdoors/walls.dt1",
    "data/global/tiles/act1/outdoors/floor.dt1",
  ],
  act1_dungeon: [
    "data/global/tiles/act1/dungeons/basementa.dt1",
    "data/global/tiles/act1/dungeons/catacombs.dt1",
    "data/global/tiles/act1/dungeons/crypt.dt1",
  ],
  act1_town: [
    "data/global/tiles/act1/town/town.dt1",
  ],
  act2_desert: [
    "data/global/tiles/act2/outdoors/desert.dt1",
    "data/global/tiles/act2/outdoors/rock.dt1",
  ],
  act2_dungeon: [
    "data/global/tiles/act2/dungeons/sewers.dt1",
    "data/global/tiles/act2/dungeons/tombs.dt1",
    "data/global/tiles/act2/dungeons/harem.dt1",
  ],
  act2_town: [
    "data/global/tiles/act2/town/town.dt1",
  ],
  act3_jungle: [
    "data/global/tiles/act3/outdoors/jungle.dt1",
    "data/global/tiles/act3/outdoors/spider.dt1",
  ],
  act3_dungeon: [
    "data/global/tiles/act3/dungeons/steplvl.dt1",
    "data/global/tiles/act3/dungeons/travincal.dt1",
  ],
  act3_town: [
    "data/global/tiles/act3/town/town.dt1",
  ],
  act4_hell: [
    "data/global/tiles/act4/outdoors/mesablue.dt1",
    "data/global/tiles/act4/outdoors/lava.dt1",
  ],
  act5_snow: [
    "data/global/tiles/act5/outdoors/snow.dt1",
    "data/global/tiles/act5/outdoors/temple.dt1",
  ],
  act5_dungeon: [
    "data/global/tiles/act5/dungeons/icecellar.dt1",
    "data/global/tiles/act5/dungeons/nihlathak.dt1",
  ],
  act5_town: [
    "data/global/tiles/act5/town/town.dt1",
  ],
};

// D2 item DC6 paths — base types mapped to inventory sprite paths
// Format: data/global/items/{itemCode}.dc6
export const D2_ITEM_PATHS = {
  // Weapons
  short_sword:   "data/global/items/SSS.dc6",
  broad_sword:   "data/global/items/BSM.dc6",
  long_sword:    "data/global/items/LSM.dc6",
  great_sword:   "data/global/items/GSd.dc6",
  dagger:        "data/global/items/dKI.dc6",
  wand:          "data/global/items/wan.dc6",
  staff:         "data/global/items/stf.dc6",
  bow_short:     "data/global/items/SSB.dc6",
  bow_long:      "data/global/items/LXB.dc6",
  crossbow:      "data/global/items/MXb.dc6",
  axe:           "data/global/items/AXE.dc6",
  mace:          "data/global/items/MAC.dc6",
  scepter:       "data/global/items/SPC.dc6",
  javelin:       "data/global/items/jav.dc6",
  spear:         "data/global/items/spR.dc6",
  club:          "data/global/items/CLB.dc6",
  // Armor
  leather_armor: "data/global/items/LTH.dc6",
  chain_mail:    "data/global/items/CHN.dc6",
  plate_mail:    "data/global/items/ful.dc6",
  shield_small:  "data/global/items/SCL.dc6",
  shield_large:  "data/global/items/tow.dc6",
  helm:          "data/global/items/HLM.dc6",
  // Potions
  health_potion: "data/global/items/PS1.dc6",
  mana_potion:   "data/global/items/PM1.dc6",
  rejuv_potion:  "data/global/items/PV1.dc6",
  // Runes (D2)
  rune_el:       "data/global/items/r01.dc6",
  rune_eld:      "data/global/items/r02.dc6",
  rune_tir:      "data/global/items/r03.dc6",
  rune_nef:      "data/global/items/r04.dc6",
  rune_ith:      "data/global/items/r05.dc6",
  rune_tal:      "data/global/items/r06.dc6",
  rune_ral:      "data/global/items/r07.dc6",
  rune_ort:      "data/global/items/r08.dc6",
  rune_thul:     "data/global/items/r09.dc6",
  rune_amn:      "data/global/items/r10.dc6",
  rune_sol:      "data/global/items/r11.dc6",
  rune_shael:    "data/global/items/r12.dc6",
  rune_dol:      "data/global/items/r13.dc6",
  rune_hel:      "data/global/items/r14.dc6",
  rune_io:       "data/global/items/r15.dc6",
  rune_lum:      "data/global/items/r16.dc6",
  rune_ko:       "data/global/items/r17.dc6",
  rune_fal:      "data/global/items/r18.dc6",
  rune_lem:      "data/global/items/r19.dc6",
  rune_pul:      "data/global/items/r20.dc6",
  rune_um:       "data/global/items/r21.dc6",
  rune_mal:      "data/global/items/r22.dc6",
  rune_ist:      "data/global/items/r23.dc6",
  rune_gul:      "data/global/items/r24.dc6",
  rune_vex:      "data/global/items/r25.dc6",
  rune_ohm:      "data/global/items/r26.dc6",
  rune_lo:       "data/global/items/r27.dc6",
  rune_sur:      "data/global/items/r28.dc6",
  rune_ber:      "data/global/items/r29.dc6",
  rune_jah:      "data/global/items/r30.dc6",
  rune_cham:     "data/global/items/r31.dc6",
  rune_zod:      "data/global/items/r32.dc6",
  // Misc
  gold:          "data/global/items/gld.dc6",
  key:           "data/global/items/KEY.dc6",
  tome_tp:       "data/global/items/TBK.dc6",
  tome_id:       "data/global/items/IBK.dc6",
  scroll_tp:     "data/global/items/tsc.dc6",
  scroll_id:     "data/global/items/isc.dc6",
};

// D2 UI panel DC6 paths
export const D2_UI_PATHS = {
  panel_ctrl:    "data/global/ui/PANEL/800ctrlpnl7.dc6",
  panel_glob:    "data/global/ui/PANEL/800glob.dc6",
  panel_skill:   "data/global/ui/PANEL/skillpanel.dc6",
  panel_miniauto:"data/global/ui/PANEL/miniautobelt.dc6",
  panel_belt:    "data/global/ui/PANEL/800Qkbtn.dc6",
  cursor_hand:   "data/global/ui/CURSOR/Hand.dc6",
  cursor_attack: "data/global/ui/CURSOR/Attack.dc6",
  cursor_talk:   "data/global/ui/CURSOR/Talk.dc6",
  cursor_pick:   "data/global/ui/CURSOR/PickUp.dc6",
  inventory_bg:  "data/global/ui/MENU/invchar6.dc6",
  char_panel:    "data/global/ui/MENU/invchar6.dc6",
  skilltree_bg:  "data/global/ui/MENU/skilltree.dc6",
  merc_panel:    "data/global/ui/MENU/expansion/dc6/exHIRE.dc6",
};

// D2 DS1 map layout files per act (pre-built town/dungeon layouts)
export const D2_DS1_PATHS = {
  act1_rogue_camp: "data/global/tiles/act1/town/townE1.ds1",
  act2_lut_gholein:"data/global/tiles/act2/town/townE2.ds1",
  act3_kurast:     "data/global/tiles/act3/town/townE3.ds1",
  act4_pandemonium:"data/global/tiles/act4/town/townE4.ds1",
  act5_harrogath:  "data/global/tiles/act5/town/townE5.ds1",
};

// Helper: build full DC6 path for a monster + animation
export function getD2MonsterDC6Path(monsterType, animMode = 'NU') {
  const entry = D2_MONSTER_PATHS[monsterType];
  if (!entry) return null;
  return `data/global/monsters/${entry.code}/${animMode.toLowerCase()}/dc6/${entry.code}${animMode}.dc6`;
}

// Helper: get all DC6 paths for a monster's animation states
export function getD2MonsterAnimPaths(monsterType) {
  const entry = D2_MONSTER_PATHS[monsterType];
  if (!entry) return null;
  const base = `data/global/monsters/${entry.code}`;
  const paths = {};
  for (const [state, mode] of Object.entries(D2_ANIM)) {
    paths[state] = `${base}/${mode.toLowerCase()}/dc6/${entry.code}${mode}.dc6`;
  }
  return paths;
}

// Helper: get D1 monster CEL path
export function getD1MonsterCELPath(monsterType) {
  return D1_MONSTER_PATHS[monsterType] || null;
}

// Helper: get DT1 tile paths for an act/stage
export function getD2TilePathsForAct(actIdx) {
  const map = {
    0: [...D2_TILE_PATHS.act1_town, ...D2_TILE_PATHS.act1_dungeon, ...D2_TILE_PATHS.act1_outdoor],
    1: [...D2_TILE_PATHS.act2_town, ...D2_TILE_PATHS.act2_dungeon, ...D2_TILE_PATHS.act2_desert],
    2: [...D2_TILE_PATHS.act3_town, ...D2_TILE_PATHS.act3_dungeon, ...D2_TILE_PATHS.act3_jungle],
    3: [...D2_TILE_PATHS.act4_hell],
    4: [...D2_TILE_PATHS.act5_town, ...D2_TILE_PATHS.act5_dungeon, ...D2_TILE_PATHS.act5_snow],
  };
  return map[actIdx] || map[0];
}
