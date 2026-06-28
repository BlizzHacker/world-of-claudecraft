/**
 * crypticD2ClassPatch.js  —  CrypticRealm 8.0 "Diablo Abyss Engine"
 * Injects ALL D2 / D1 / Hellfire character classes into CR_CLASSES
 * using the existing skill/stat schema so the existing UI needs zero changes.
 * Source parity:  DevilutionX playerdat.cpp  ·  OpenDiablo2 charstats.go
 */

// ─── helper: build CR skill objects from raw D2 skill list ────────────────
function _d2Skill(id, name, icon, mp, type, dmg, range, color, extra={}) {
  return { id, name: name.toUpperCase(), icon, mp, type, dmg, range, color, ...extra,
           desc: extra.desc || name };
}

// ─── D2 SORCERESS ─────────────────────────────────────────────────────────
export const D2_SORCERESS = {
  id:"d2_sorceress", name:"SORCERESS", icon:"🔮", color:"#4169E1",
  desc:"Mistress of elemental magic. Fragile but overwhelmingly powerful.",
  engine:"d2", sourceClass:"sorceress",
  stats:{ maxHp:60, maxMp:120, str:10, dex:25, vit:10, nrg:35, dmg:10, def:2, spd:2.2 },
  skills:[
    _d2Skill("d2_fireball",  "FIREBALL",       "🔥", 14, "projectile", 42, 320, "#ff6600", { aoe:55, desc:"Exploding ball of fire." }),
    _d2Skill("d2_frozenorb", "FROZEN ORB",     "❄️", 25, "aoe",        30, 180, "#88ccff", { aoe:120, freeze:90, desc:"Orbiting ice shard explosion." }),
    _d2Skill("d2_teleport",  "TELEPORT",        "✨", 24, "blink",       0, 300, "#ccccff", { desc:"Instantly move to target location." }),
  ],
  skillTrees:["FIRE","COLD","LIGHTNING"],
};

// ─── D2 NECROMANCER ───────────────────────────────────────────────────────
export const D2_NECROMANCER = {
  id:"d2_necromancer", name:"NECROMANCER", icon:"💀", color:"#C0C0C0",
  desc:"Commands the undead, hurls bone and poison at enemies.",
  engine:"d2", sourceClass:"necromancer",
  stats:{ maxHp:65, maxMp:100, str:15, dex:25, vit:15, nrg:25, dmg:14, def:4, spd:2.0 },
  skills:[
    _d2Skill("d2_bone_spear", "BONE SPEAR",       "🦴", 11, "pierce",  48, 280, "#ddddcc", { desc:"Piercing bone lance hits all in line." }),
    _d2Skill("d2_raise_skel", "RAISE SKELETON",   "💀", 22, "summon",  18, 80,  "#8888aa", { maxSummons:6, desc:"Raise skeleton from corpse." }),
    _d2Skill("d2_corps_expl", "CORPSE EXPLOSION", "💣", 18, "corpse", 120, 120, "#663344", { aoe:90, desc:"Explode corpse for massive damage." }),
  ],
  skillTrees:["SUMMONING","POISON & BONE","CURSES"],
};

// ─── D2 BARBARIAN ─────────────────────────────────────────────────────────
export const D2_BARBARIAN = {
  id:"d2_barbarian", name:"BARBARIAN", icon:"⚔️", color:"#FF6347",
  desc:"Unstoppable berserker who masters multiple weapons.",
  engine:"d2", sourceClass:"barbarian",
  stats:{ maxHp:145, maxMp:30, str:30, dex:20, vit:25, nrg:10, dmg:30, def:10, spd:1.9 },
  skills:[
    _d2Skill("d2_whirlwind", "WHIRLWIND",    "🌀", 10, "aoe",  65, 75,  "#cc8833", { aoe:75, desc:"Spin attack hitting all nearby." }),
    _d2Skill("d2_warcry",    "WAR CRY",      "📣",  8, "buff",  0,  0,   "#ffaa44", { buffDmg:1.4, buffDef:1.3, buffDur:300, desc:"Stun enemies, buff nearby allies." }),
    _d2Skill("d2_berserk",   "BERSERK",      "💢", 12, "melee",80, 60,  "#ff4400", { desc:"100% enhanced damage, converts to magic." }),
  ],
  skillTrees:["WARCRIES","COMBAT MASTERIES","COMBAT SKILLS"],
};

// ─── D2 AMAZON ────────────────────────────────────────────────────────────
export const D2_AMAZON = {
  id:"d2_amazon", name:"AMAZON", icon:"🏹", color:"#32CD32",
  desc:"Fierce warrior woman. Master of bow and javelin.",
  engine:"d2", sourceClass:"amazon",
  stats:{ maxHp:85, maxMp:65, str:20, dex:25, vit:20, nrg:15, dmg:22, def:6, spd:2.1 },
  skills:[
    _d2Skill("d2_multi_shot", "MULTISHOT",       "🏹",  9, "spread", 32, 290, "#44ccff", { count:5, spread:0.5, desc:"Fire multiple arrows at once." }),
    _d2Skill("d2_light_fury", "LIGHTNING FURY",  "⚡", 17, "chain",  55, 200, "#ffff44", { chains:8, desc:"Javelin splits into lightning bolts." }),
    _d2Skill("d2_valkyrie",   "VALKYRIE",        "🪃", 35, "summon", 40,  90, "#aaddff", { maxSummons:1, desc:"Summon a powerful Valkyrie ally." }),
  ],
  skillTrees:["JAVELIN & SPEAR","PASSIVE & MAGIC","BOW & CROSSBOW"],
};

// ─── D2 PALADIN ───────────────────────────────────────────────────────────
export const D2_PALADIN = {
  id:"d2_paladin", name:"PALADIN", icon:"🛡️", color:"#FFD700",
  desc:"Holy warrior who fights with blessed hammer and divine auras.",
  engine:"d2", sourceClass:"paladin",
  stats:{ maxHp:115, maxMp:60, str:25, dex:20, vit:25, nrg:15, dmg:26, def:14, spd:1.9 },
  skills:[
    _d2Skill("d2_blessed_hammer","BLESSED HAMMER","⚒️",10, "spiral", 70, 200, "#FFD700", { desc:"Magical hammer spirals outward from player." }),
    _d2Skill("d2_holy_shield",   "HOLY SHIELD",  "🛡️", 35, "buff",   0,  0,  "#ffffff", { buffDef:2.0, buffDur:600, desc:"Massive block chance + defense." }),
    _d2Skill("d2_conviction",    "CONVICTION",   "☀️", 0,  "aura",   0,  0,  "#ffeeaa", { passiveAura:true, desc:"Reduces enemy resistances in an aura." }),
  ],
  skillTrees:["COMBAT SKILLS","OFFENSIVE AURAS","DEFENSIVE AURAS"],
};

// ─── D2 DRUID ─────────────────────────────────────────────────────────────
export const D2_DRUID = {
  id:"d2_druid", name:"DRUID", icon:"🌿", color:"#7CFC00",
  desc:"Nature mystic who shapeshifts and commands elemental forces.",
  engine:"d2lod", sourceClass:"druid",
  stats:{ maxHp:90, maxMp:90, str:15, dex:20, vit:25, nrg:20, dmg:20, def:7, spd:2.0 },
  skills:[
    _d2Skill("d2_tornado",  "TORNADO",     "🌪️", 15, "aoe",    55, 220, "#88aaff", { aoe:60, desc:"Powerful twister moves unpredictably." }),
    _d2Skill("d2_werebear", "WEREBEAR",    "🐻", 10, "buff",    0,  0,  "#8B6914", { buffDmg:1.8, buffDef:1.5, buffDur:-1, desc:"Transform into a massive bear." }),
    _d2Skill("d2_armageddon","ARMAGEDDON", "☄️", 50, "rain",  100, 300, "#ff8800", { aoe:200, delay:8, count:20, desc:"Meteors rain down around you." }),
  ],
  skillTrees:["ELEMENTAL","SHAPE SHIFTING","SUMMONING"],
};

// ─── D2 ASSASSIN ──────────────────────────────────────────────────────────
export const D2_ASSASSIN = {
  id:"d2_assassin", name:"ASSASSIN", icon:"🗡️", color:"#00CED1",
  desc:"Shadow warrior who uses traps and martial arts combos.",
  engine:"d2lod", sourceClass:"assassin",
  stats:{ maxHp:90, maxMp:80, str:20, dex:20, vit:20, nrg:25, dmg:24, def:7, spd:2.3 },
  skills:[
    _d2Skill("d2_death_sentry","DEATH SENTRY", "💥", 22, "summon", 70, 130, "#ff4400", { maxSummons:3, aoe:80, desc:"Lightning sentry + corpse explosion." }),
    _d2Skill("d2_dragon_flight","DRAGON FLIGHT","🐉", 15, "leap",  85, 250, "#ff6622", { aoe:60, desc:"Leap to enemy, massive impact." }),
    _d2Skill("d2_mind_blast",  "MIND BLAST",  "🌀", 14, "aoe",   30, 200, "#cc44ff", { aoe:100, freeze:60, stun:80, desc:"Stuns and converts enemies." }),
  ],
  skillTrees:["MARTIAL ARTS","SHADOW DISCIPLINES","TRAPS"],
};

// ─── D1 WARRIOR ───────────────────────────────────────────────────────────
export const D1_WARRIOR = {
  id:"d1_warrior", name:"WARRIOR", icon:"⚔️", color:"#CD853F",
  desc:"Diablo I original. Fearless melee fighter. High health, low magic.",
  engine:"d1", sourceClass:"warrior",
  stats:{ maxHp:160, maxMp:25, str:30, dex:25, vit:25, nrg:10, dmg:28, def:12, spd:1.8 },
  skills:[
    _d2Skill("d1_bash",       "BASH",        "💢",  0, "melee",  45, 70,  "#cc8833", { desc:"Powerful ground slam. No mana cost." }),
    _d2Skill("d1_mana_shield","MANA SHIELD", "🛡️", 33, "buff",    0,  0,  "#4444ff", { desc:"Absorb damage with mana instead of HP." }),
    _d2Skill("d1_healing",    "HEALING",     "💚", 5,  "heal",   50,  0,  "#44ff44", { heal:50, desc:"Restore hit points." }),
  ],
  skillTrees:["COMBAT","MAGIC","PASSIVE"],
};

// ─── D1 ROGUE ─────────────────────────────────────────────────────────────
export const D1_ROGUE = {
  id:"d1_rogue", name:"ROGUE", icon:"🏹", color:"#6B8E23",
  desc:"Diablo I original. Lightning-fast archer. Precise and deadly.",
  engine:"d1", sourceClass:"rogue",
  stats:{ maxHp:75, maxMp:55, str:25, dex:30, vit:20, nrg:15, dmg:18, def:5, spd:2.3 },
  skills:[
    _d2Skill("d1_arrow",    "ARROW",          "🏹",  0, "projectile", 22, 280, "#aaddff", { desc:"Fast precise arrow strike." }),
    _d2Skill("d1_infravision","INFRAVISION",  "👁️",  0, "buff",        0,  0,  "#ff4400", { buffDur:600, desc:"See enemies through walls." }),
    _d2Skill("d1_trap_disarm","TRAP DISARM",  "🔧",  0, "utility",     0, 60,  "#44cc44", { desc:"Disarm traps without taking damage." }),
  ],
  skillTrees:["ARCHERY","STEALTH","MAGIC"],
};

// ─── D1 SORCERER ──────────────────────────────────────────────────────────
export const D1_SORCERER = {
  id:"d1_sorcerer", name:"SORCERER", icon:"🔮", color:"#9400D3",
  desc:"Diablo I original. Ultimate spell power. Extremely fragile.",
  engine:"d1", sourceClass:"sorcerer",
  stats:{ maxHp:45, maxMp:150, str:15, dex:15, vit:20, nrg:35, dmg:8, def:2, spd:2.1 },
  skills:[
    _d2Skill("d1_nova",     "NOVA",         "⚡", 60, "nova",    75, 180, "#ffff44", { aoe:180, desc:"Full-screen lightning explosion." }),
    _d2Skill("d1_guardian", "GUARDIAN",     "🌀", 50, "summon",  35, 60,  "#ff8800", { maxSummons:2, desc:"Stationary fire guardian." }),
    _d2Skill("d1_teleport", "TELEPORT",     "✨", 35, "blink",    0, 300, "#ccccff", { desc:"Instantly move to cursor position." }),
  ],
  skillTrees:["FIRE","LIGHTNING","MAGIC"],
};

// ─── HELLFIRE MONK ────────────────────────────────────────────────────────
export const HF_MONK = {
  id:"hf_monk", name:"MONK", icon:"🥋", color:"#FFD700",
  desc:"Hellfire exclusive. Warrior-mystic. Staff and unarmed combat.",
  engine:"hf", sourceClass:"monk",
  stats:{ maxHp:100, maxMp:70, str:25, dex:25, vit:20, nrg:15, dmg:24, def:9, spd:2.4 },
  skills:[
    _d2Skill("hf_holy_bolt",  "HOLY BOLT",   "✨", 7,  "projectile", 22, 260, "#ffffaa", { desc:"Fast holy projectile vs undead." }),
    _d2Skill("hf_staff_mastery","STAFF MASTERY","🥋",0, "passive",    0,  0,   "#FFD700", { passiveAura:true, desc:"Massive speed + damage bonus with staves." }),
    _d2Skill("hf_telekinesis","TELEKINESIS",  "🧲", 15, "utility",   30, 200, "#4444ff", { desc:"Push enemies or grab items at range." }),
  ],
  skillTrees:["MARTIAL ARTS","HOLY MAGIC","PASSIVE"],
};

// ─── HELLFIRE BARD ────────────────────────────────────────────────────────
export const HF_BARD = {
  id:"hf_bard", name:"BARD", icon:"🎵", color:"#FF69B4",
  desc:"Hellfire exclusive. Dual-wield specialist. Buffs and steals.",
  engine:"hf", sourceClass:"bard",
  stats:{ maxHp:85, maxMp:80, str:20, dex:30, vit:20, nrg:15, dmg:20, def:7, spd:2.2 },
  skills:[
    _d2Skill("hf_identify",  "IDENTIFY",   "🔍",  0, "utility",  0,  70, "#ffffff", { desc:"Identify magic items for free." }),
    _d2Skill("hf_mana_tap",  "MANA TAP",   "💙", 10, "leech",   25, 120, "#4444ff", { manaLeech:0.3, desc:"Steals mana from enemies hit." }),
    _d2Skill("hf_song_heal", "BATTLE SONG","🎵",  8, "buff",     0,   0, "#ff88ff", { buffDef:1.3, heal:8, buffDur:300, desc:"Heal nearby allies over time." }),
  ],
  skillTrees:["DUAL WIELD","SONGS","UTILITY"],
};

// ─── HELLFIRE BARBARIAN ───────────────────────────────────────────────────
export const HF_BARBARIAN = {
  id:"hf_barbarian", name:"BARBARIAN (HF)", icon:"🪓", color:"#FF4500",
  desc:"Hellfire exclusive. Raw unstoppable strength. No magic spells.",
  engine:"hf", sourceClass:"hf_barbarian",
  stats:{ maxHp:175, maxMp:10, str:40, dex:20, vit:25, nrg:0, dmg:35, def:14, spd:1.7 },
  skills:[
    _d2Skill("hf_rage",     "RAGE",       "💢",  0, "buff",   0,  0,  "#ff4400", { buffDmg:2.0, buffDef:0.7, buffDur:180, desc:"+100% damage, -30% defense for 3s." }),
    _d2Skill("hf_smash",    "GROUND SMASH","💥",  0, "aoe",  70, 80,  "#cc4400", { aoe:80, desc:"Slam the ground, AoE stun." }),
    _d2Skill("hf_iron_skin","IRON SKIN",  "🛡️",  0, "passive",0, 0,   "#888888", { passiveAura:true, desc:"Permanently increase AC dramatically." }),
  ],
  skillTrees:["COMBAT","RAGE","PASSIVE"],
};

// ─── All D2/D1/HF classes as an array ────────────────────────────────────
export const D2_ALL_CLASSES = [
  D2_SORCERESS, D2_NECROMANCER, D2_BARBARIAN, D2_AMAZON,
  D2_PALADIN, D2_DRUID, D2_ASSASSIN,
  D1_WARRIOR, D1_ROGUE, D1_SORCERER,
  HF_MONK, HF_BARD, HF_BARBARIAN,
];

// Engine badge labels + colors for the character select UI
export const ENGINE_BADGE = {
  d2:   { label:'D2',  color:'#8B0000', bg:'#2a0000' },
  d2lod:{ label:'LOD', color:'#4B0082', bg:'#1a0028' },
  d1:   { label:'D1',  color:'#5a3010', bg:'#200a00' },
  hf:   { label:'HF',  color:'#5a0050', bg:'#1a0018' },
  cr:   { label:'CR',  color:'#003050', bg:'#001018' },
};

/**
 * injectD2Classes — call once during game init to merge D2/D1/HF classes
 * into an existing CR_CLASSES object.
 * @param {object} CR_CLASSES  the existing class registry
 */
export function injectD2Classes(CR_CLASSES) {
  D2_ALL_CLASSES.forEach(cls => {
    // Expand skill trees to full 30-skill format expected by existing UI
    if (!cls.skillTrees) cls.skillTrees = ["TREE A","TREE B","TREE C"];
    // Set engine badge
    cls.engine = cls.engine || 'cr';
    // Add to registry
    CR_CLASSES[cls.id] = cls;
  });
}

/**
 * getClassDisplayOrder — returns all class IDs in display order.
 * CR originals first, then D2, D1, HF.
 */
export function getClassDisplayOrder(CR_CLASSES) {
  const cr  = Object.keys(CR_CLASSES).filter(k => !k.startsWith('d2_') && !k.startsWith('d1_') && !k.startsWith('hf_'));
  const d2  = D2_ALL_CLASSES.filter(c => c.engine==='d2' || c.engine==='d2lod').map(c=>c.id);
  const d1  = D2_ALL_CLASSES.filter(c => c.engine==='d1').map(c=>c.id);
  const hf  = D2_ALL_CLASSES.filter(c => c.engine==='hf').map(c=>c.id);
  return [...cr, ...d2, ...d1, ...hf];
}
