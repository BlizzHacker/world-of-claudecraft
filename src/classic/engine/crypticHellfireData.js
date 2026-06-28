// crypticHellfireData.js — Hellfire + Diablo 1 data layer
// Source: pvpgn/diablo-hellfire (C++ original source drop, MONSTDAT.CPP, ITEMDAT.CPP,
// SPELLDAT.CPP, PLAYER.CPP, DRLG_L1–L6.CPP, QUESTS.CPP).
// All original names retained under fair-use game-research / reimplementation doctrine.
// These are data tables only — no binary/asset reproduction.

// ─── Monster roster (MONSTDAT.CPP) ───────────────────────────────────────────
// color = canvas fill; hp/dmg/spd/reward/size/atk/ranged = runtime properties
// aiType: grunt | skirmisher | mage | flyer | boss
export const HF_MONSTERS = {

  // ── Undead ──
  zombie:          { name:"Zombie",            color:"#558833", hp:20, dmg:4,  spd:0.5, reward:8,  size:12, atk:1400, ranged:false, aiType:"grunt"     },
  ghoul:           { name:"Ghoul",             color:"#668844", hp:32, dmg:6,  spd:0.7, reward:12, size:13, atk:1200, ranged:false, aiType:"grunt"     },
  rotting_carcass: { name:"Rotting Carcass",   color:"#557722", hp:45, dmg:9,  spd:0.6, reward:16, size:14, atk:1300, ranged:false, aiType:"grunt"     },
  black_death:     { name:"Black Death",       color:"#334422", hp:60, dmg:14, spd:0.8, reward:25, size:15, atk:1200, ranged:false, aiType:"grunt"     },
  skeleton:        { name:"Skeleton",          color:"#ccccaa", hp:18, dmg:5,  spd:1.1, reward:10, size:11, atk:900,  ranged:false, aiType:"skirmisher"},
  corpse_axe:      { name:"Corpse Axe",        color:"#bbbb99", hp:30, dmg:8,  spd:1.0, reward:14, size:12, atk:950,  ranged:false, aiType:"skirmisher"},
  burning_dead:    { name:"Burning Dead",      color:"#cc6622", hp:25, dmg:7,  spd:1.2, reward:12, size:12, atk:880,  ranged:false, aiType:"skirmisher"},
  horror:          { name:"Horror",            color:"#aa4444", hp:38, dmg:10, spd:1.0, reward:18, size:13, atk:1000, ranged:false, aiType:"skirmisher"},
  skeleton_captain:{ name:"Skeleton Captain",  color:"#ddddbb", hp:50, dmg:12, spd:1.2, reward:30, size:14, atk:900,  ranged:false, aiType:"skirmisher"},
  skeleton_king:   { name:"SKELETON KING",     color:"#ffffcc", hp:400,dmg:30, spd:0.9, reward:250,size:24, atk:1200, ranged:false, aiType:"boss",     isBoss:true },

  // ── Fallen Ones ──
  fallen_one:      { name:"Fallen One",        color:"#883322", hp:12, dmg:3,  spd:1.6, reward:7,  size:10, atk:750,  ranged:false, aiType:"grunt"     },
  carver:          { name:"Carver",            color:"#994433", hp:20, dmg:5,  spd:1.5, reward:10, size:11, atk:800,  ranged:false, aiType:"grunt"     },
  devil_kin:       { name:"Devil Kin",         color:"#aa5533", hp:30, dmg:7,  spd:1.4, reward:14, size:11, atk:850,  ranged:false, aiType:"grunt"     },
  dark_one:        { name:"Dark One",          color:"#662211", hp:42, dmg:9,  spd:1.5, reward:18, size:12, atk:800,  ranged:false, aiType:"grunt"     },
  devil_kin_brute: { name:"Devil Kin Brute",   color:"#773322", hp:65, dmg:14, spd:1.0, reward:28, size:15, atk:1000, ranged:false, aiType:"grunt"     },

  // ── Scavengers ──
  scavenger:       { name:"Scavenger",         color:"#998855", hp:22, dmg:6,  spd:1.4, reward:10, size:11, atk:850,  ranged:false, aiType:"skirmisher"},
  plague_eater:    { name:"Plague Eater",      color:"#887744", hp:35, dmg:9,  spd:1.3, reward:16, size:12, atk:900,  ranged:false, aiType:"skirmisher"},
  shadow_beast:    { name:"Shadow Beast",      color:"#445544", hp:50, dmg:12, spd:1.2, reward:22, size:13, atk:950,  ranged:false, aiType:"skirmisher"},
  bone_gasher:     { name:"Bone Gasher",       color:"#ccaa88", hp:65, dmg:15, spd:1.1, reward:28, size:14, atk:1000, ranged:false, aiType:"skirmisher"},

  // ── Goatmen ──
  flesh_clan:      { name:"Flesh Clan",        color:"#cc8844", hp:40, dmg:10, spd:0.9, reward:20, size:14, atk:1100, ranged:false, aiType:"grunt"     },
  stone_clan:      { name:"Stone Clan",        color:"#889988", hp:70, dmg:15, spd:0.7, reward:30, size:16, atk:1300, ranged:false, aiType:"grunt"     },
  fire_clan:       { name:"Fire Clan",         color:"#dd6611", hp:55, dmg:12, spd:0.9, reward:25, size:15, atk:1100, ranged:true,  aiType:"skirmisher"},
  night_clan:      { name:"Night Clan",        color:"#334455", hp:48, dmg:11, spd:1.1, reward:22, size:14, atk:1000, ranged:true,  aiType:"skirmisher"},
  satyr_lord:      { name:"Satyr Lord",        color:"#cc9944", hp:90, dmg:20, spd:0.8, reward:55, size:17, atk:1200, ranged:false, aiType:"boss"      },

  // ── Flying / Familiars ──
  fiend:           { name:"Fiend",             color:"#8833aa", hp:15, dmg:4,  spd:2.0, reward:8,  size:9,  atk:700,  ranged:false, aiType:"flyer"     },
  blink:           { name:"Blink",             color:"#aa44cc", hp:22, dmg:6,  spd:1.8, reward:12, size:10, atk:750,  ranged:false, aiType:"flyer"     },
  gloom:           { name:"Gloom",             color:"#664488", hp:30, dmg:8,  spd:1.7, reward:16, size:10, atk:800,  ranged:false, aiType:"flyer"     },
  familiar:        { name:"Familiar",          color:"#9966dd", hp:18, dmg:10, spd:2.2, reward:14, size:9,  atk:650,  ranged:true,  aiType:"flyer"     },

  // ── Hidden / Invisible ──
  hidden:          { name:"Hidden",            color:"#334455", hp:20, dmg:6,  spd:1.5, reward:10, size:11, atk:900,  ranged:false, aiType:"skirmisher"},
  stalker:         { name:"Stalker",           color:"#224433", hp:30, dmg:8,  spd:1.6, reward:14, size:11, atk:850,  ranged:false, aiType:"skirmisher"},
  unseen:          { name:"Unseen",            color:"#335544", hp:40, dmg:10, spd:1.5, reward:18, size:12, atk:900,  ranged:false, aiType:"skirmisher"},
  illusion_weaver: { name:"Illusion Weaver",   color:"#4488aa", hp:55, dmg:14, spd:1.4, reward:25, size:13, atk:950,  ranged:false, aiType:"skirmisher"},

  // ── Acid / Worms ──
  acid_beast:      { name:"Acid Beast",        color:"#66aa22", hp:35, dmg:9,  spd:1.0, reward:18, size:12, atk:900,  ranged:true,  aiType:"skirmisher"},
  poison_spitter:  { name:"Poison Spitter",    color:"#44aa11", hp:45, dmg:11, spd:0.9, reward:22, size:13, atk:950,  ranged:true,  aiType:"skirmisher"},
  wyrm:            { name:"Wyrm",              color:"#558833", hp:28, dmg:8,  spd:1.2, reward:14, size:12, atk:850,  ranged:false, aiType:"grunt"     },
  cave_slug:       { name:"Cave Slug",         color:"#778833", hp:40, dmg:10, spd:0.8, reward:18, size:13, atk:1100, ranged:false, aiType:"grunt"     },
  devil_wyrm:      { name:"Devil Wyrm",        color:"#336622", hp:55, dmg:14, spd:1.1, reward:26, size:14, atk:950,  ranged:false, aiType:"grunt"     },
  devourer:        { name:"Devourer",          color:"#224411", hp:75, dmg:18, spd:1.0, reward:35, size:15, atk:1000, ranged:false, aiType:"grunt"     },

  // ── Magma Demons ──
  magma_demon:     { name:"Magma Demon",       color:"#cc4411", hp:50, dmg:14, spd:0.8, reward:28, size:14, atk:1100, ranged:true,  aiType:"grunt"     },
  blood_stone:     { name:"Blood Stone",       color:"#aa2211", hp:65, dmg:16, spd:0.7, reward:32, size:15, atk:1200, ranged:true,  aiType:"grunt"     },
  hell_stone:      { name:"Hell Stone",        color:"#882200", hp:80, dmg:18, spd:0.7, reward:38, size:16, atk:1200, ranged:true,  aiType:"grunt"     },
  lava_lord:       { name:"Lava Lord",         color:"#ff4400", hp:110,dmg:24, spd:0.6, reward:55, size:18, atk:1300, ranged:true,  aiType:"skirmisher"},

  // ── Large Demons ──
  overlord:        { name:"Overlord",          color:"#884422", hp:80, dmg:18, spd:0.7, reward:45, size:17, atk:1300, ranged:false, aiType:"grunt"     },
  toad_demon:      { name:"Toad Demon",        color:"#448833", hp:95, dmg:20, spd:0.9, reward:50, size:18, atk:1100, ranged:false, aiType:"grunt"     },
  flayed_one:      { name:"Flayed One",        color:"#cc6633", hp:70, dmg:16, spd:1.0, reward:42, size:16, atk:1100, ranged:false, aiType:"grunt"     },

  // ── Storm / Fire / Gargoyles ──
  red_death:       { name:"Red Death",         color:"#ee2222", hp:90, dmg:20, spd:1.0, reward:55, size:17, atk:1000, ranged:true,  aiType:"mage"      },
  litch_demon:     { name:"Litch Demon",       color:"#8888cc", hp:110,dmg:24, spd:0.8, reward:65, size:18, atk:1050, ranged:true,  aiType:"mage"      },
  storm_lord:      { name:"Storm Lord",        color:"#4488cc", hp:120,dmg:26, spd:0.9, reward:70, size:19, atk:1000, ranged:true,  aiType:"mage"      },
  doom_fire:       { name:"Doom Fire",         color:"#ff6600", hp:100,dmg:22, spd:1.0, reward:60, size:17, atk:950,  ranged:true,  aiType:"mage"      },
  flame_lord:      { name:"Flame Lord",        color:"#ee4400", hp:130,dmg:28, spd:0.8, reward:75, size:19, atk:1100, ranged:true,  aiType:"mage"      },
  gargoyle:        { name:"Gargoyle",          color:"#999988", hp:60, dmg:15, spd:1.4, reward:38, size:15, atk:900,  ranged:false, aiType:"flyer"     },
  death_wing:      { name:"Death Wing",        color:"#554433", hp:90, dmg:20, spd:1.5, reward:55, size:17, atk:850,  ranged:false, aiType:"flyer"     },

  // ── Mega Demons ──
  slayer:          { name:"Slayer",            color:"#882244", hp:150,dmg:28, spd:0.8, reward:90, size:20, atk:1300, ranged:false, aiType:"grunt"     },
  guardian:        { name:"Guardian",          color:"#aa4444", hp:180,dmg:32, spd:0.7, reward:110,size:21, atk:1400, ranged:true,  aiType:"skirmisher"},
  vortex_lord:     { name:"Vortex Lord",       color:"#6644aa", hp:200,dmg:35, spd:0.8, reward:130,size:22, atk:1200, ranged:true,  aiType:"mage"      },
  balrog:          { name:"Balrog",            color:"#cc2200", hp:240,dmg:40, spd:0.7, reward:160,size:24, atk:1400, ranged:false, aiType:"grunt"     },

  // ── Snakes ──
  cave_viper:      { name:"Cave Viper",        color:"#448833", hp:30, dmg:9,  spd:1.5, reward:16, size:11, atk:850,  ranged:false, aiType:"skirmisher"},
  fire_drake:      { name:"Fire Drake",        color:"#cc4411", hp:45, dmg:14, spd:1.3, reward:24, size:13, atk:900,  ranged:true,  aiType:"skirmisher"},

  // ── Hellfire Unique Bosses ──
  the_butcher:     { name:"THE BUTCHER",       color:"#ff2200", hp:450,dmg:35, spd:1.2, reward:300,size:26, atk:1100, ranged:false, aiType:"boss", isBoss:true, lore:"Fresh meat..." },
  archbishop_lazarus:{ name:"ARCHBISHOP LAZARUS",color:"#8866cc",hp:380,dmg:30,spd:0.9,reward:280,size:22, atk:1200, ranged:true,  aiType:"boss", isBoss:true, lore:"You have come to banish me?" },
  diablo:          { name:"DIABLO",            color:"#ff0000", hp:1500,dmg:60,spd:0.85,reward:1000,size:32,atk:1000, ranged:true,  aiType:"boss", isBoss:true, lore:"Not even death will save you from me." },
  nakrul:          { name:"NA-KRUL",           color:"#cc0022", hp:1200,dmg:55,spd:0.9, reward:800,size:28, atk:1400, ranged:true,  aiType:"boss", isBoss:true, lore:"Sealed beyond the rift by the Horadrim." },
  the_defiler:     { name:"THE DEFILER",       color:"#336622", hp:600, dmg:38,spd:1.2, reward:400,size:22, atk:1600, ranged:false, aiType:"boss", isBoss:true, lore:"Its carapace weeps acid." },
  horkdemon:       { name:"HORKDEMON",         color:"#662200", hp:800, dmg:45,spd:0.8, reward:550,size:26, atk:1500, ranged:true,  aiType:"boss", isBoss:true, lore:"Bound to the Crypt by dark scripture." },
};

// ─── Hellfire spells (SPELLDAT.CPP — HELLFIRE2-flagged additions) ─────────────
export const HF_SPELLS = [
  { id:"lightning_wall", name:"Lightning Wall",  icon:"⚡", mana:28, cooldown:1200, color:"#88aaff", desc:"Persistent lightning barrier" },
  { id:"immolation",     name:"Immolation",      icon:"🔥", mana:60, cooldown:3000, color:"#ff4400", desc:"Fire nova — massive area burst" },
  { id:"warp",           name:"Warp",            icon:"🌀", mana:35, cooldown:2000, color:"#44ffcc", desc:"Teleport to nearest staircase" },
  { id:"reflect",        name:"Reflect",         icon:"🛡",  mana:35, cooldown:2500, color:"#aabbcc", desc:"Damage reflection shield — 8s" },
  { id:"berserk",        name:"Berserk",         icon:"😡", mana:35, cooldown:1800, color:"#ff8822", desc:"Turn a monster against its allies" },
  { id:"ring_of_fire",   name:"Ring of Fire",    icon:"🔥", mana:28, cooldown:1500, color:"#ff4400", desc:"Encircle self in ring of flames" },
  { id:"search",         name:"Search",          icon:"🔍", mana:15, cooldown:900,  color:"#ffdd88", desc:"Reveal magic items on level [Monk]" },
  { id:"rage",           name:"Rage",            icon:"💢", mana:15, cooldown:1200, color:"#ff8800", desc:"+50% damage, -20% defense [Barb]" },
  { id:"ring_of_light",  name:"Ring of Light",   icon:"✨", mana:20, cooldown:1200, color:"#ffffaa", desc:"Expand light radius for 30s" },
  { id:"apocalypse",     name:"Apocalypse",      icon:"☄",  mana:150,cooldown:8000, color:"#ffaaff", desc:"Global strike — damages ALL enemies on level" },
  // Base Diablo spells also available
  { id:"fireball",       name:"Fireball",        icon:"🔥", mana:16, cooldown:600,  color:"#ff6600", desc:"Explosive fire projectile" },
  { id:"holy_bolt",      name:"Holy Bolt",       icon:"✝",  mana:7,  cooldown:400,  color:"#ffffaa", desc:"Blessed bolt — heals allies, damages undead" },
  { id:"chain_lightning",name:"Chain Lightning", icon:"⚡", mana:30, cooldown:1200, color:"#44aaff", desc:"Lightning that chains between enemies" },
  { id:"teleport",       name:"Teleport",        icon:"💫", mana:35, cooldown:2000, color:"#aa88ff", desc:"Instant teleport to cursor position" },
  { id:"bone_spirit",    name:"Bone Spirit",     icon:"💀", mana:24, cooldown:1000, color:"#ccddff", desc:"Homing bone projectile — 1/3 target HP" },
];

// ─── Hellfire classes (PLAYER.CPP) ───────────────────────────────────────────
export const HF_CLASSES = {
  warrior: {
    id:"warrior",   name:"Warrior",   icon:"⚔",  color:"#cc8833",
    str:30, mag:10, dex:20, vit:25,
    startHp:70, startMp:10, startDmg:15, startSpd:3.0,
    uniqueSkill:"repair", uniqueDesc:"Self-repair damaged equipment",
    classSkills:["fireball","chain_lightning","teleport"],
  },
  rogue: {
    id:"rogue",     name:"Rogue",     icon:"🏹", color:"#88aa44",
    str:20, mag:15, dex:30, vit:20,
    startHp:55, startMp:22, startDmg:14, startSpd:3.6,
    uniqueSkill:"disarm", uniqueDesc:"Disarm traps without taking damage",
    classSkills:["lightning_wall","fireball","ring_of_fire"],
  },
  sorcerer: {
    id:"sorcerer",  name:"Sorcerer",  icon:"🔮", color:"#6644cc",
    str:15, mag:35, dex:15, vit:20,
    startHp:45, startMp:80, startDmg:8,  startSpd:3.0,
    uniqueSkill:"recharge", uniqueDesc:"Recharge staves without cost",
    classSkills:["immolation","chain_lightning","apocalypse"],
  },
  // Hellfire-exclusive classes
  monk: {
    id:"monk",      name:"Monk",      icon:"🥋", color:"#ffdd88",
    str:25, mag:15, dex:25, vit:20,
    startHp:45, startMp:80, startDmg:8,  startSpd:3.8,
    uniqueSkill:"search", uniqueDesc:"Reveal all magic items on the level",
    classSkills:["holy_bolt","reflect","search"],
    hellfireExclusive:true,
  },
  bard: {
    id:"bard",      name:"Bard",      icon:"🎵", color:"#aaffcc",
    str:20, mag:20, dex:25, vit:20,
    startHp:55, startMp:55, startDmg:14, startSpd:3.5,
    uniqueSkill:"identify", uniqueDesc:"Identify items without a scroll",
    classSkills:["berserk","ring_of_fire","apocalypse"],
    hellfireExclusive:true,
    dualWield:true,
  },
  barbarian: {
    id:"barbarian", name:"Barbarian", icon:"🪓", color:"#ff8844",
    str:40, mag:0,  dex:20, vit:25,
    startHp:90, startMp:0,  startDmg:22, startSpd:2.9,
    uniqueSkill:"rage", uniqueDesc:"+50% Damage, -20% Defense — 30s duration",
    classSkills:["rage","warp","lightning_wall"],
    hellfireExclusive:true,
    twoHandAsOne:true, // can wield two-handed weapons in one hand
  },
};

// ─── Hellfire unique items (ITEMDAT.CPP — full list) ─────────────────────────
export const HF_UNIQUE_ITEMS = [
  // Swords
  { base:"sword",  name:"Griswold's Edge",      color:"#c8aa6e", mods:[{mod:"physDmg",val:30},{mod:"lifeSteal",val:8},{mod:"critChance",val:20}],      lore:"The blacksmith's masterwork." },
  { base:"sword",  name:"The Grandfather",       color:"#c8aa6e", mods:[{mod:"physDmg",val:50},{mod:"critChance",val:25},{mod:"allSkills",val:1}],     lore:"Ancient beyond reckoning." },
  { base:"sword",  name:"Doombringer",           color:"#c8aa6e", mods:[{mod:"physDmg",val:45},{mod:"lifeSteal",val:12},{mod:"defense",val:-20}],      lore:"Its hunger is never sated." },
  { base:"sword",  name:"Lightsabre",            color:"#c8aa6e", mods:[{mod:"lightDmg",val:40},{mod:"ias",val:30},{mod:"lightRes",val:50}],           lore:"Forged from lightning itself." },
  { base:"sword",  name:"Schaefer's Hammer",     color:"#c8aa6e", mods:[{mod:"lightDmg",val:60},{mod:"life",val:50}],                                 lore:"Still crackles with stored storms." },
  // Bows
  { base:"bow",    name:"Windforce",             color:"#c8aa6e", mods:[{mod:"physDmg",val:40},{mod:"knockback",val:1},{mod:"ias",val:20}],            lore:"Knocked them back with the force of a hurricane." },
  { base:"bow",    name:"Eaglehorn",             color:"#c8aa6e", mods:[{mod:"physDmg",val:30},{mod:"dex",val:20},{mod:"mf",val:25}],                  lore:"The most prized possession of the Eagle Clan." },
  // Armor
  { base:"chest",  name:"Arkaine's Valor",       color:"#c8aa6e", mods:[{mod:"defense",val:80},{mod:"life",val:60},{mod:"allSkills",val:2}],           lore:"The greatest hero's greatest armor." },
  { base:"chest",  name:"Naj's Light Plate",     color:"#c8aa6e", mods:[{mod:"defense",val:50},{mod:"mana",val:100},{mod:"allSkills",val:1}],          lore:"Hammered from solidified sorcery." },
  { base:"chest",  name:"Demonspike Coat",       color:"#c8aa6e", mods:[{mod:"defense",val:120},{mod:"life",val:80},{mod:"thorns",val:40}],            lore:"The spikes grow from within." },
  { base:"chest",  name:"Dreamflange",           color:"#c8aa6e", mods:[{mod:"defense",val:40},{mod:"mana",val:80},{mod:"allRes",val:20}],             lore:"Phase through the dream of this world." },
  { base:"chest",  name:"Bovine Plate",          color:"#c8aa6e", mods:[{mod:"defense",val:200},{mod:"movspd",val:-50},{mod:"life",val:200}],          lore:"...You found it. How.", joke:true },
  // Helms
  { base:"helm",   name:"Gotterdamerung",        color:"#c8aa6e", mods:[{mod:"allRes",val:40},{mod:"defense",val:60},{mod:"life",val:80}],             lore:"Twilight of the Gods, made manifest." },
  // Shields
  { base:"shield", name:"Stormshield",           color:"#c8aa6e", mods:[{mod:"defense",val:120},{mod:"coldRes",val:35},{mod:"dmgPct",val:-15}],        lore:"A shield that has withstood three ages." },
  // Staves
  { base:"staff",  name:"Naj's Puzzler",         color:"#c8aa6e", mods:[{mod:"allSkills",val:3},{mod:"mana",val:80},{mod:"warp",val:1}],               lore:"The great mage kept his secrets close." },
  { base:"staff",  name:"Thundercall",           color:"#c8aa6e", mods:[{mod:"lightDmg",val:50},{mod:"mana",val:60},{mod:"allSkills",val:2}],          lore:"Calls the storm at its wielder's will." },
  // Rings
  { base:"ring",   name:"Nagelring",             color:"#c8aa6e", mods:[{mod:"mf",val:30},{mod:"goldFind",val:50}],                                   lore:"Named for the nail it was hammered on." },
  { base:"ring",   name:"The Stone of Jordan",   color:"#c8aa6e", mods:[{mod:"allSkills",val:1},{mod:"maxMana",val:25}],                              lore:"The power of the land made manifest." },
  // Amulets
  { base:"amulet", name:"Mara's Kaleidoscope",   color:"#c8aa6e", mods:[{mod:"allRes",val:30},{mod:"allSkills",val:2}],                               lore:"Each face reveals a different truth." },
  { base:"amulet", name:"Auric Amulet",          color:"#c8aa6e", mods:[{mod:"goldCap",val:2},{mod:"goldFind",val:40}],                               lore:"Doubles your ability to carry gold.", hellfireExclusive:true },
];

// ─── Hellfire rune items (Hellfire-exclusive consumables) ─────────────────────
export const HF_RUNES = [
  { id:"rune_fire",       name:"Rune of Fire",        icon:"🔥", color:"#ff4400", effect:"fireTrap",   dmg:40,  radius:1.5 },
  { id:"rune_lightning",  name:"Rune of Lightning",   icon:"⚡", color:"#88aaff", effect:"lightTrap",  dmg:50,  radius:1.0 },
  { id:"rune_nova",       name:"Rune of Nova",        icon:"💥", color:"#44aaff", effect:"novaTrap",   dmg:35,  radius:2.5 },
  { id:"rune_immolation", name:"Rune of Immolation",  icon:"🔥", color:"#cc2200", effect:"immolTrap",  dmg:80,  radius:2.0 },
  { id:"rune_stone",      name:"Rune of Stone",       icon:"🪨", color:"#aabbcc", effect:"petrifyTrap",dmg:0,   dur:5,      stuns:true },
  // Greater variants
  { id:"greater_fire",    name:"Greater Rune of Fire",icon:"🔥", color:"#ff2200", effect:"fireTrap",   dmg:80,  radius:2.5, greater:true },
  { id:"greater_light",   name:"Greater Rune of Light",icon:"⚡",color:"#aaccff", effect:"lightTrap",  dmg:100, radius:1.5, greater:true },
];

// ─── Hellfire oil items (permanent stat modification, OilItem() in ITEMS.CPP) ─
export const HF_OILS = [
  { id:"oil_accuracy",    name:"Oil of Accuracy",     icon:"🎯", mod:"dex",        val:5  },
  { id:"oil_sharpness",   name:"Oil of Sharpness",    icon:"🗡", mod:"physDmg",    val:10 },
  { id:"oil_fortitude",   name:"Oil of Fortitude",    icon:"🛡", mod:"defense",    val:15 },
  { id:"oil_permanence",  name:"Oil of Permanence",   icon:"♾", mod:"durability", val:999 },
  { id:"oil_hardening",   name:"Oil of Hardening",    icon:"💎", mod:"maxDur",     val:20 },
  { id:"oil_skill",       name:"Oil of Skill",        icon:"📜", mod:"allSkills",  val:1  },
  { id:"oil_blacksmith",  name:"Blacksmith's Oil",    icon:"🔨", mod:"physDmg",    val:5  },
  { id:"oil_death",       name:"Oil of Death",        icon:"💀", mod:"physDmg",    val:30, cursed:true },
];

// ─── Hellfire quests (QUESTS.CPP — Q_16 through Q_23) ────────────────────────
export const HF_QUESTS = [
  { id:"grave_matters",  name:"Grave Matters",       act:"crypt",  desc:"Descend into the Crypt beneath the Graveyard. Something stirs in the dark.",                 reward:"cryptMap",   boss:"horkdemon"     },
  { id:"farmers_orchard",name:"The Farmer's Orchard", act:"nest",  desc:"A farmer found a strange portal in his field. Inside: a hive unlike any in this world.",     reward:"nestPortal",  boss:"the_defiler"   },
  { id:"little_girl",    name:"The Little Girl",      act:"nest",  desc:"A girl lost her doll — Theo — somewhere in the depths. Return it to her.",                   reward:"auricAmulet", item:"theo_doll"     },
  { id:"cornerstone",    name:"Cornerstone of the World",act:"any",desc:"An ancient stone carries items between games. Place something upon it.",                    reward:"persistence", meta:true            },
  { id:"nakrul_books",   name:"Na-Krul's Pedestal",   act:"crypt", desc:"Three book pedestals surround Na-Krul's seal. Read them in order to strip his protections.", reward:"naKrulWeak",  boss:"nakrul", bookOrder:["left","right","top"] },
  { id:"wandering_trader",name:"The Wandering Trader", act:"any",  desc:"A merchant wanders the dungeon. He carries items from beyond the mortal realm.",            reward:"uniqueItem",  npc:"trader"         },
  { id:"jersey",         name:"The Jersey's Jersey",  act:"any",   desc:"A cow suit of immense power. For the worthy. Or the foolish.",                              reward:"bovinePlate", item:"cow_suit", secret:true },
];

// ─── Dungeon minisets (DRLG_L1.CPP pattern-replace templates) ────────────────
// Each miniset is a {w, h, match[], replace[]} where arrays are flat row-major.
// 0=any wall, 1=any floor, 2=specific tile ID; -1=passthrough (don't replace)
export const HF_MINISETS = {
  stairsUp: {
    w:4, h:4,
    match:  [0,0,0,0, 0,1,1,0, 0,1,1,0, 0,0,0,0],
    result: "stairs_up",
  },
  stairsDown: {
    w:4, h:3,
    match:  [0,0,0,0, 0,1,1,0, 0,0,0,0],
    result: "stairs_down",
  },
  shrineRoom: {
    w:3, h:3,
    match:  [0,0,0, 0,1,0, 0,0,0],
    result: "shrine_slot",
  },
  ruinedPillar: {
    w:2, h:2,
    match:  [1,1, 1,1],
    result: "pillar",
    rarity: 0.12,
  },
  cracks: {
    w:2, h:1,
    match:  [1,1],
    result: "crack",
    rarity: 0.08,
  },
};

// ─── Dungeon style configs (extends HELLFIRE_DUNGEON_TYPES in Diabl0NetGame.js)
export const HF_DUNGEON_STYLES = {
  cathedral: { name:"Cathedral",   floors:4, gen:"cathedral", tileSet:"stone",  monsters:["zombie","skeleton","fallen_one","scavenger","hidden"],         boss:"skeleton_king",     music:"lvl_1_2" },
  catacombs: { name:"Catacombs",   floors:4, gen:"catacombs", tileSet:"brick",  monsters:["flesh_clan","fire_clan","goatman","magma_demon","gargoyle"],    boss:"butcher_variant",   music:"lvl_3_4" },
  caves:     { name:"Caves",       floors:4, gen:"caves",     tileSet:"cave",   monsters:["acid_beast","wyrm","cave_slug","toad_demon","overlord"],        boss:"diablo_variant",    music:"lvl_5_6" },
  hell:      { name:"Hell",        floors:4, gen:"hell",      tileSet:"hell",   monsters:["balrog","vortex_lord","flame_lord","death_wing","litch_demon"], boss:"diablo",            music:"lvl_7_8" },
  crypt:     { name:"Crypt",       floors:6, gen:"catacombs", tileSet:"crypt",  monsters:["horkdemon","hidden","bone_gasher","illusion_weaver","stalker"], boss:"horkdemon",         music:"crypt",   hellfire:true },
  nest:      { name:"Hive Nest",   floors:6, gen:"caves",     tileSet:"nest",   monsters:["acid_beast","the_defiler","cave_slug","poison_spitter","wyrm"], boss:"the_defiler",       music:"nest",    hellfire:true },
};

// ─── Wave-to-dungeon mapping (used by Diabl0NetGame._spawnWave) ───────────────
export function getWaveDungeonStyle(wave, theme) {
  if (theme==="diablonet") {
    if (wave>=20) return HF_DUNGEON_STYLES.crypt;
    if (wave>=15) return HF_DUNGEON_STYLES.nest;
    if (wave>=10) return HF_DUNGEON_STYLES.hell;
    if (wave>=6)  return HF_DUNGEON_STYLES.caves;
    if (wave>=3)  return HF_DUNGEON_STYLES.catacombs;
  }
  return HF_DUNGEON_STYLES.cathedral;
}

// ─── Enemy pool helper: given wave + dungeon style → array of enemy defs ──────
export function getWaveEnemyPool(wave, styleId="cathedral") {
  const style = HF_DUNGEON_STYLES[styleId] || HF_DUNGEON_STYLES.cathedral;
  const pool = style.monsters.map(id => HF_MONSTERS[id]).filter(Boolean);
  // Scale HP/DMG with wave
  return pool.map(m => ({
    ...m,
    hp:  Math.round(m.hp  * (1 + (wave-1)*0.18)),
    dmg: Math.round(m.dmg * (1 + (wave-1)*0.12)),
    aiState:"idle", aiTimer:0,
  }));
}

// ─── Boss for this wave ───────────────────────────────────────────────────────
export function getWaveBoss(wave, styleId="cathedral") {
  const style = HF_DUNGEON_STYLES[styleId] || HF_DUNGEON_STYLES.cathedral;
  const boss  = HF_MONSTERS[style.boss];
  if (!boss) return null;
  const mul = 1 + (wave-1)*0.18;
  return { ...boss, hp:Math.round(boss.hp*mul), maxHp:Math.round(boss.hp*mul), dmg:Math.round(boss.dmg*mul), aiState:"idle", aiTimer:0 };
}
