/**
 * crypticD2Systems.js  —  CrypticRealm 8.0 "Diablo Abyss Engine"
 * Part 2 of 2: Items · Monsters · Mercenaries · Map Generation · Combat
 * Sources: OpenDiablo2 (Go), DevilutionX (C++), AbyssEngine (Go), d2gs109/113 (C)
 */
import {
  D2RNG, XP_TABLE, D2_ABSORBED_SOURCE_MANIFEST, createCrypticRealm8Core,
} from './crypticD2CoreData.js';

// ═══════════════════════════════════════════════════════════════════════════
// § 1  ITEM QUALITY  ←  OpenDiablo2 d2core/d2hero/diablo2item/item.go
// ═══════════════════════════════════════════════════════════════════════════
export const ItemQuality = {
  INFERIOR:0, NORMAL:1, SUPERIOR:2, MAGIC:3,
  SET:4, RARE:5, UNIQUE:6, CRAFTED:7,
};

// Item drop ratio info  ←  OpenDiablo2 item_ratio_record.go
// DropRatioInfo{Frequency, Divisor, DivisorMin}
// Chance = Frequency / (Divisor * ilvl) clamped to DivisorMin
export const ITEM_DROP_RATIO = {
  // Format: [Frequency, Divisor, DivisorMin]
  unique:   [200,  800, 100],
  set:      [600,  800, 100],
  rare:     [800,  800, 100],
  magic:    [4000, 800, 100],
  hiQuality:[12000,800, 100],
  normal:   [1,    1,   1  ],
};

// ItemType flags  ←  OpenDiablo2 item.go TypeRecord
export const ItemTypeFlags = {
  Normal:0, Magic:1, Rare:2, Set:3, Unique:4,
  CanBeNormal:  0x01,
  CanBeMagic:   0x02,
  CanBeRare:    0x04,
  CanBeSet:     0x08,
  CanBeUnique:  0x10,
  CanBeCrafted: 0x20,
};

// Property pool types  ←  OpenDiablo2 item.go PropertyPool
export const PropertyPool = { Prefix:'prefix', Suffix:'suffix', Unique:'unique',
                               SetItem:'set_item', Set:'set' };

// ─── Item Name Tables ───────────────────────────────────────────────────────
// Rare name parts  ←  OpenDiablo2 (RareNames.txt derivatives)
export const RARE_PREFIXES = [
  'Bitter','Razor','Lich','Arch','Death','Shadow','Demon','Grim','Viper',
  'Corpse','Storm','Plague','Blood','Soul','Doom','Chaos','Venom','Rune',
  'Hell','Cruel','Dread','Bone','Iron','Dark','Savage','Ancient','Wrath',
  'Hate','Dire','Foul','Cursed','Wicked','Divine','Holy','Saintly','Sacred',
];
export const RARE_SUFFIXES = [
  'Bane','Shout','Cry','Howl','Rend','Maul','Gore','Brand','Gash','Bite',
  'Toll','Blast','Scourge','Song','Wing','Mark','Edge','Claw','Veil','Heart',
  'Touch','Spike','Pierce','Strike','Slash','Rend','Cleave','Crush','Split',
  'Fang','Hide','Spell','Ward','Guard','Shield','Curse','Blight','Wraith',
];

// Magic affix examples  ←  OpenDiablo2 magic affixes
export const MAGIC_PREFIXES = [
  'Sharp','Jagged','Serrated','Rusty','Bent','Fine','Gleaming','Blessed',
  'Sapphire','Ruby','Emerald','Amber','Cobalt','Crimson','Viridian',
  'Azure','Scarlet','Jade','Bronze','Iron','Steel','Silver','Gold',
];
export const MAGIC_SUFFIXES = [
  'of the Fox','of the Jackal','of the Eagle','of the Oak','of the Bear',
  'of Strength','of Dexterity','of Energy','of Vitality','of Health',
  'of the Apprentice','of the Journeyman','of the Magus','of the Adept',
  'of Fire','of Ice','of Lightning','of Poison','of the Leech','of Deflection',
];

// ─── Item Drop Logic ────────────────────────────────────────────────────────
/**
 * determineItemQuality  ←  OpenDiablo2 item.go dropModifier / sanitize
 * @param {number} ilvl  item level (monster level)
 * @param {number} mlvl  magic level (player magic find %)
 * @param {number} typeFlags  ItemTypeFlags bitmask
 */
export function determineItemQuality(ilvl, mlvl = 0, typeFlags = 0x1F) {
  const eff = ilvl + Math.floor(mlvl * 0.01 * ilvl);  // effective level with MF

  function chance([freq, div, divMin]) {
    const d = Math.max(divMin, div * (1 - mlvl * 0.01));
    return freq / d;
  }

  const roll = D2RNG.GenerateRnd(10000) / 10000;
  let cum = 0;

  if ((typeFlags & ItemTypeFlags.CanBeUnique) && (cum += chance(ITEM_DROP_RATIO.unique)) > roll)
    return ItemQuality.UNIQUE;
  if ((typeFlags & ItemTypeFlags.CanBeSet)    && (cum += chance(ITEM_DROP_RATIO.set))    > roll)
    return ItemQuality.SET;
  if ((typeFlags & ItemTypeFlags.CanBeRare)   && (cum += chance(ITEM_DROP_RATIO.rare))   > roll)
    return ItemQuality.RARE;
  if ((typeFlags & ItemTypeFlags.CanBeMagic)  && (cum += chance(ITEM_DROP_RATIO.magic))  > roll)
    return ItemQuality.MAGIC;
  if (cum + chance(ITEM_DROP_RATIO.hiQuality)  > roll)
    return ItemQuality.SUPERIOR;

  return ItemQuality.NORMAL;
}

/**
 * generateItemName  ←  OpenDiablo2 item.go GetItemDescription
 * @param {string}  base     base item name e.g. "Long Sword"
 * @param {number}  quality  ItemQuality value
 */
export function generateItemName(base, quality) {
  const rng = n => D2RNG.GenerateRnd(n);
  switch (quality) {
    case ItemQuality.MAGIC: {
      const pre = D2RNG.FlipCoin(2) ? MAGIC_PREFIXES[rng(MAGIC_PREFIXES.length)] + ' ' : '';
      const suf = D2RNG.FlipCoin(2) ? ' ' + MAGIC_SUFFIXES[rng(MAGIC_SUFFIXES.length)] : '';
      return pre + base + suf;
    }
    case ItemQuality.RARE: {
      const pre = RARE_PREFIXES[rng(RARE_PREFIXES.length)];
      const suf = RARE_SUFFIXES[rng(RARE_SUFFIXES.length)];
      return `${pre} ${suf}\n${base}`;
    }
    case ItemQuality.UNIQUE:   return `[Unique] ${base}`;
    case ItemQuality.SET:      return `[Set] ${base}`;
    case ItemQuality.CRAFTED:  return `[Crafted] ${base}`;
    case ItemQuality.SUPERIOR: return `Superior ${base}`;
    case ItemQuality.INFERIOR: return `Cracked ${base}`;
    default:                   return base;
  }
}

// Quality color  ←  D2 UI convention
export const QUALITY_COLOR = {
  [ItemQuality.INFERIOR]: '#808080',
  [ItemQuality.NORMAL]:   '#FFFFFF',
  [ItemQuality.SUPERIOR]: '#FFFFFF',
  [ItemQuality.MAGIC]:    '#4169E1',
  [ItemQuality.RARE]:     '#FFFF00',
  [ItemQuality.SET]:      '#00FF00',
  [ItemQuality.UNIQUE]:   '#A59263',
  [ItemQuality.CRAFTED]:  '#FF7F00',
};

// ─── Base Item Types (representative set) ───────────────────────────────────
export const BASE_ITEMS = {
  // Weapons
  hand_axe:      { name:'Hand Axe',      type:'axe',    minDmg:3, maxDmg:6,   ilvl:1,  typeFlags:0x1F },
  long_sword:    { name:'Long Sword',     type:'sword',  minDmg:3, maxDmg:10,  ilvl:5,  typeFlags:0x1F },
  broad_sword:   { name:'Broad Sword',    type:'sword',  minDmg:7, maxDmg:14,  ilvl:8,  typeFlags:0x1F },
  war_staff:     { name:'War Staff',      type:'staff',  minDmg:12,maxDmg:28,  ilvl:20, typeFlags:0x1F },
  short_bow:     { name:'Short Bow',      type:'bow',    minDmg:1, maxDmg:4,   ilvl:1,  typeFlags:0x1F },
  long_bow:      { name:'Long Bow',       type:'bow',    minDmg:3, maxDmg:10,  ilvl:6,  typeFlags:0x1F },
  throwing_axe:  { name:'Throwing Axe',   type:'throw',  minDmg:4, maxDmg:7,   ilvl:3,  typeFlags:0x1F },
  // Armor
  quilt_armor:   { name:'Quilted Armor',  type:'armor',  defense:8,  ilvl:1,   typeFlags:0x1F },
  leather_armor: { name:'Leather Armor',  type:'armor',  defense:14, ilvl:3,   typeFlags:0x1F },
  chain_mail:    { name:'Chain Mail',     type:'armor',  defense:30, ilvl:10,  typeFlags:0x1F },
  plate_mail:    { name:'Plate Mail',     type:'armor',  defense:65, ilvl:22,  typeFlags:0x1F },
  // Helms
  cap:           { name:'Cap',            type:'helm',   defense:3,  ilvl:1,   typeFlags:0x1F },
  skull_cap:     { name:'Skull Cap',      type:'helm',   defense:8,  ilvl:3,   typeFlags:0x1F },
  helm:          { name:'Helm',           type:'helm',   defense:15, ilvl:8,   typeFlags:0x1F },
  // Shields
  buckler:       { name:'Buckler',        type:'shield', defense:4,  ilvl:1,   typeFlags:0x1F },
  small_shield:  { name:'Small Shield',   type:'shield', defense:8,  ilvl:4,   typeFlags:0x1F },
  // Misc
  health_potion: { name:'Health Potion',  type:'potion', effect:'hp', power:80, ilvl:1, typeFlags:0x01 },
  mana_potion:   { name:'Mana Potion',    type:'potion', effect:'mp', power:60, ilvl:1, typeFlags:0x01 },
  antidote:      { name:'Antidote Potion',type:'potion', effect:'unstun', ilvl:1, typeFlags:0x01 },
  tome_tp:       { name:'Tome of Town Portal', type:'tome', spell:'townportal', ilvl:3, typeFlags:0x01 },
  tome_id:       { name:'Tome of Identify',    type:'tome', spell:'identify',   ilvl:1, typeFlags:0x01 },
  gold:          { name:'Gold',           type:'gold',   ilvl:1, typeFlags:0x01 },
};

// ═══════════════════════════════════════════════════════════════════════════
// § 2  MONSTER SYSTEM  ←  DevilutionX monstdat.h + OpenDiablo2 monster_stats_record.go
// ═══════════════════════════════════════════════════════════════════════════
export const MonsterAIID = {
  Zombie:0, Fat:1, SkeletonMelee:2, SkeletonRanged:3, Scavenger:4,
  Rhino:5, GoatMelee:6, GoatRanged:7, Fallen:8, Magma:9,
  SkeletonKing:10, Bat:11, Gargoyle:12, Butcher:13, Succubus:14,
  Sneak:15, Storm:16, FireMan:17, Gharbad:18, Acid:19,
  AcidUnique:20, Golem:21, Zhar:22, Snotspill:23, Snake:24,
  Counselor:25, Mega:26, Diablo:27, Lazarus:28, LazarusSuccubus:29,
  Lachdanan:30, Warlord:31, FireBat:32, Torchant:33, HorkDemon:34,
  Lich:35, ArchLich:36, Psychorb:37, Necromorb:38, BoneDemon:39,
  Invalid:-1,
};

export const MonsterFlag = {
  HIDDEN:          1<<0,
  LOCK_ANIMATION:  1<<1,
  ALLOW_SPECIAL:   1<<2,
  TARGETS_MONSTER: 1<<4,
  GOLEM:           1<<5,
  QUEST_COMPLETE:  1<<6,
  KNOCKBACK:       1<<7,
  SEARCH:          1<<8,
  CAN_OPEN_DOOR:   1<<9,
  NO_ENEMY:        1<<10,
  BERSERK:         1<<11,
  NOLIFESTEAL:     1<<12,
};

export const MonsterMode = {
  Stand:0, MoveNorthwards:1, MoveSouthwards:2, MoveSideways:3,
  MeleeAttack:4, HitRecovery:5, Death:6, SpecialMeleeAttack:7,
  FadeIn:8, FadeOut:9, RangedAttack:10, SpecialStand:11,
  SpecialRangedAttack:12, Delay:13, Charge:14, Petrified:15, Heal:16, Talk:17,
};

export const MonsterResistance = {
  RESIST_MAGIC:1<<0, RESIST_FIRE:1<<1, RESIST_LIGHTNING:1<<2,
  IMMUNE_MAGIC:1<<3, IMMUNE_FIRE:1<<4, IMMUNE_LIGHTNING:1<<5,
  IMMUNE_ACID: 1<<7,
};

export const MonsterClass = { Undead:0, Demon:1, Animal:2 };

// Monster availability  ←  DevilutionX monstdat.h MonsterAvailability
export const MonsterAvailability = { Never:0, Always:1, Retail:2 };

// ─── D2 MonStat2 animation component flags  ←  OpenDiablo2 monster_stats2_loader.go
// HasComponent[16]: HD TR LG RA LA RH LH SH S1 S2 S3 S4 S5 S6 S7 S8
// HasAnimationMode[16]: DT NU WL GH A1 A2 BL SC S1 S2 S3 S4 DD KB SQ RN
export const MON_COMPONENT_NAMES = ['HD','TR','LG','RA','LA','RH','LH','SH',
                                     'S1','S2','S3','S4','S5','S6','S7','S8'];
export const MON_ANIM_MODES      = ['DT','NU','WL','GH','A1','A2','BL','SC',
                                     'S1','S2','S3','S4','DD','KB','SQ','RN'];

// Representative monster stats (ilvl → base HP formula: (minHP*MonLvl)/100)
export const MONSTER_DEFS = {
  // D1/HF monsters (DevilutionX monstdat.cpp values)
  zombie:      { name:'Zombie',       class:MonsterClass.Undead, ai:MonsterAIID.Zombie,
    minHP:50, maxHP:75, level:1, minDamage:4,  maxDamage:8,  ar:20, ac:4,
    resistance:0, exp:10, flags:0, availability:MonsterAvailability.Retail, color:'#5a8a5a' },
  skeleton:    { name:'Skeleton',     class:MonsterClass.Undead, ai:MonsterAIID.SkeletonMelee,
    minHP:40, maxHP:60, level:2, minDamage:5,  maxDamage:10, ar:30, ac:6,
    resistance:MonsterResistance.RESIST_MAGIC, exp:15, flags:0, availability:MonsterAvailability.Retail, color:'#d0c8a0' },
  fallen:      { name:'Fallen',       class:MonsterClass.Demon,  ai:MonsterAIID.Fallen,
    minHP:30, maxHP:50, level:2, minDamage:2,  maxDamage:6,  ar:25, ac:3,
    resistance:0, exp:8, flags:MonsterFlag.CAN_OPEN_DOOR, availability:MonsterAvailability.Retail, color:'#8B2222' },
  goat_man:    { name:'Goat Man',     class:MonsterClass.Demon,  ai:MonsterAIID.GoatMelee,
    minHP:80, maxHP:120,level:4, minDamage:8,  maxDamage:15, ar:40, ac:12,
    resistance:0, exp:30, flags:0, availability:MonsterAvailability.Retail, color:'#6B4226' },
  bat:         { name:'Firebat',      class:MonsterClass.Demon,  ai:MonsterAIID.Bat,
    minHP:25, maxHP:40, level:3, minDamage:6,  maxDamage:12, ar:35, ac:5,
    resistance:MonsterResistance.RESIST_FIRE, exp:20, flags:MonsterFlag.ALLOW_SPECIAL, availability:MonsterAvailability.Retail, color:'#2a0a00' },
  butcher:     { name:'The Butcher',  class:MonsterClass.Demon,  ai:MonsterAIID.Butcher,
    minHP:220,maxHP:220,level:10,minDamage:15, maxDamage:30, ar:75, ac:20,
    resistance:0, exp:200, flags:MonsterFlag.BERSERK|MonsterFlag.KNOCKBACK,
    availability:MonsterAvailability.Retail, color:'#8B0000', isQuest:true },
  skeleton_king:{ name:'King Leoric', class:MonsterClass.Undead, ai:MonsterAIID.SkeletonKing,
    minHP:350,maxHP:350,level:13,minDamage:20, maxDamage:35, ar:90, ac:30,
    resistance:MonsterResistance.IMMUNE_MAGIC|MonsterResistance.RESIST_FIRE, exp:500,
    flags:MonsterFlag.BERSERK, availability:MonsterAvailability.Retail, color:'#d4af00', isQuest:true },
  diablo:      { name:'Diablo',       class:MonsterClass.Demon,  ai:MonsterAIID.Diablo,
    minHP:1800,maxHP:1800,level:30,minDamage:40,maxDamage:80, ar:200,ac:80,
    resistance:MonsterResistance.IMMUNE_FIRE|MonsterResistance.RESIST_LIGHTNING|MonsterResistance.RESIST_MAGIC,
    exp:5000, flags:MonsterFlag.BERSERK|MonsterFlag.KNOCKBACK, availability:MonsterAvailability.Retail,
    color:'#FF4500', isActBoss:true },
  // D2 monsters (approximate stats for rendering)
  fallen_d2:   { name:'Fallen (D2)',  class:MonsterClass.Demon,  ai:MonsterAIID.Fallen,
    minHP:6,  maxHP:12, level:1, minDamage:1,  maxDamage:3,  ar:15, ac:3,
    resistance:0, exp:5, flags:0, availability:MonsterAvailability.Always, color:'#8B2222' },
  quill_rat:   { name:'Quill Rat',    class:MonsterClass.Animal, ai:MonsterAIID.Scavenger,
    minHP:8,  maxHP:15, level:2, minDamage:2,  maxDamage:5,  ar:20, ac:4,
    resistance:0, exp:8, flags:0, availability:MonsterAvailability.Always, color:'#8B6914' },
  cave_spitter:{ name:'Cave Spitter', class:MonsterClass.Animal, ai:MonsterAIID.Acid,
    minHP:25, maxHP:45, level:6, minDamage:5,  maxDamage:10, ar:45, ac:15,
    resistance:0, exp:22, flags:MonsterFlag.ALLOW_SPECIAL, availability:MonsterAvailability.Always, color:'#4B8B00' },
  andariel:    { name:'Andariel',     class:MonsterClass.Demon,  ai:MonsterAIID.Succubus,
    minHP:630,maxHP:630,level:12,minDamage:18, maxDamage:40, ar:120,ac:55,
    resistance:MonsterResistance.IMMUNE_MAGIC|MonsterResistance.RESIST_FIRE,
    exp:3000, flags:MonsterFlag.BERSERK, availability:MonsterAvailability.Always,
    color:'#9B0080', isActBoss:true },
  mephisto:    { name:'Mephisto',     class:MonsterClass.Demon,  ai:MonsterAIID.Counselor,
    minHP:3200,maxHP:3200,level:26,minDamage:35,maxDamage:70, ar:250,ac:110,
    resistance:MonsterResistance.IMMUNE_COLD|MonsterResistance.RESIST_LIGHTNING,
    exp:12000, flags:MonsterFlag.BERSERK|MonsterFlag.KNOCKBACK,
    availability:MonsterAvailability.Always, color:'#4B0082', isActBoss:true },
  baal:        { name:'Baal',         class:MonsterClass.Demon,  ai:MonsterAIID.Mega,
    minHP:8000,maxHP:8000,level:60,minDamage:60,maxDamage:120,ar:350,ac:160,
    resistance:MonsterResistance.IMMUNE_COLD|MonsterResistance.RESIST_FIRE|MonsterResistance.RESIST_LIGHTNING|MonsterResistance.RESIST_MAGIC,
    exp:80000, flags:MonsterFlag.BERSERK|MonsterFlag.KNOCKBACK|MonsterFlag.ALLOW_SPECIAL,
    availability:MonsterAvailability.Always, color:'#00BFFF', isActBoss:true },
};

// HP scaling: (minHP * MonLvlMult[level]) / 100
export function getMonsterHPRange(monDef, level, difficulty = 0) {
  const diffMult = [1.0, 2.0, 4.5][difficulty] || 1.0;
  const lvlMult  = Math.max(1, level * 0.8);
  return {
    min: Math.floor(monDef.minHP * lvlMult * diffMult / 100),
    max: Math.floor(monDef.maxHP * lvlMult * diffMult / 100),
  };
}

// ─── Unique Monster Names  ←  DevilutionX monster.h UniqueMonsterType ────
export const UNIQUE_MONSTERS = {
  Garbud:       { name:'Garbud',            base:'fallen',     suffix:'of Treachery' },
  SkeletonKing: { name:'King Leoric',        base:'skeleton',   suffix:'the Skeleton King' },
  Zhar:         { name:'Zhar the Mad',       base:'counselor',  suffix:'the Mad' },
  SnotSpill:    { name:'Snotspill',          base:'fallen',     suffix:'the Dark Wanderer' },
  Lazarus:      { name:'Archbishop Lazarus', base:'counselor',  suffix:'the Betrayer' },
  RedVex:       { name:'Red Vex',            base:'succubus',   suffix:'of Chaos' },
  BlackJade:    { name:'Black Jade',         base:'succubus',   suffix:'of Destruction' },
  Lachdan:      { name:'Lachdan',            base:'knight',     suffix:'of the Unholy' },
  WarlordOfBlood:{ name:'Warlord of Blood',  base:'knight',     suffix:'of Blood' },
  Butcher:      { name:'The Butcher',        base:'butcher',    suffix:'Fresh Meat' },
  HorkDemon:    { name:'Hork Demon',         base:'hork_demon', suffix:'the Maggot King' },
  Defiler:      { name:'The Defiler',        base:'spider',     suffix:'the Defiler' },
  NaKrul:       { name:"Na-Krul",            base:'lich',       suffix:'the Ancient Evil' },
};

// ═══════════════════════════════════════════════════════════════════════════
// § 3  MISSILE SCHEMA  ←  OpenDiablo2 missiles_record.go
// ═══════════════════════════════════════════════════════════════════════════
// CollisionType: 0=none,1=units,3=normal,6=walls,8=all
export const MissileCollision = { None:0, Units:1, Normal:3, Walls:6, All:8 };

export const MISSILE_DEFS = {
  firebolt:     { name:'Fire Bolt',      speed:16, range:40, hitShift:0,  collision:MissileCollision.Normal, type:'fire',      radius:0   },
  fireball:     { name:'Fireball',       speed:14, range:40, hitShift:2,  collision:MissileCollision.Normal, type:'fire',      radius:4   },
  lightning:    { name:'Lightning',      speed:32, range:60, hitShift:0,  collision:MissileCollision.Walls,  type:'lightning', radius:0   },
  arrow:        { name:'Arrow',          speed:24, range:30, hitShift:0,  collision:MissileCollision.Units,  type:'physical',  radius:0   },
  chargedbolt:  { name:'Charged Bolt',   speed:8,  range:25, hitShift:0,  collision:MissileCollision.Units,  type:'lightning', radius:0, numBolts:8 },
  holyBolt:     { name:'Holy Bolt',      speed:18, range:32, hitShift:0,  collision:MissileCollision.Normal, type:'holy',      radius:0   },
  bloodStar:    { name:'Blood Star',     speed:14, range:35, hitShift:0,  collision:MissileCollision.Normal, type:'magic',     radius:0   },
  boneSpirit:   { name:'Bone Spirit',    speed:10, range:999,hitShift:0,  collision:MissileCollision.Units,  type:'magic',     radius:0, homing:true },
  acidArrow:    { name:'Acid Arrow',     speed:20, range:30, hitShift:0,  collision:MissileCollision.Normal, type:'poison',    radius:0   },
  fireWall:     { name:'Fire Wall',      speed:0,  range:0,  hitShift:1,  collision:MissileCollision.None,   type:'fire',      radius:0, isWall:true },
  nova:         { name:'Nova',           speed:16, range:20, hitShift:0,  collision:MissileCollision.Units,  type:'lightning', radius:15, isNova:true },
  townPortal:   { name:'Town Portal',    speed:0,  range:0,  hitShift:0,  collision:MissileCollision.None,   type:'magic',     radius:0, isPortal:true },
};

// ═══════════════════════════════════════════════════════════════════════════
// § 4  MERCENARY / HIRELING SYSTEM  ←  OpenDiablo2 hireling_record.go
// ═══════════════════════════════════════════════════════════════════════════
// HirelingRecord: HP/HPPerLvl, Defense/DefPerLvl, Str/StrPerLvl, Dex/DexPerLvl,
// AR/ARPerLvl, DmgMin/Max/DmgPerLvl, Resist/ResistPerLvl, 6 skill slots
export const MERC_DEFS = {
  // Act 1 — Rogue Scout (Bow)
  act1_normal: {
    name:'Kashya\'s Rogue', act:1, difficulty:0, type:'rogue_archer',
    desc:'Female archer skilled in ice and fire arrow.',
    HP:45, HPPerLvl:5, defense:12, defPerLvl:2,
    str:45, strPerLvl:1, dex:60, dexPerLvl:2,
    ar:70, arPerLvl:8, dmgMin:4, dmgMax:8, dmgPerLvl:2,
    resist:0, resistPerLvl:0,
    skills:[
      { id:'ColdArrow',   chance:100, chancePerLvl:0, level:1,  lvlPerLvl:1 },
      { id:'FireArrow',   chance:100, chancePerLvl:0, level:1,  lvlPerLvl:1 },
      { id:'MultiShot',   chance:50,  chancePerLvl:2, level:12, lvlPerLvl:1 },
    ],
    color:'#4a9060', icon:'🏹',
  },
  // Act 2 — Desert Mercenary (Spear/Aura)
  act2_normal_offense: {
    name:'Defiance Merc', act:2, difficulty:0, type:'desert_warrior',
    desc:'Powerful aura-wielding desert fighter.',
    HP:65, HPPerLvl:8, defense:20, defPerLvl:4,
    str:70, strPerLvl:2, dex:45, dexPerLvl:1,
    ar:90, arPerLvl:12, dmgMin:8, dmgMax:16, dmgPerLvl:3,
    resist:0, resistPerLvl:0,
    aura:'Defiance',
    skills:[
      { id:'Jab',       chance:100, chancePerLvl:0, level:1,  lvlPerLvl:1 },
      { id:'Defiance',  chance:100, chancePerLvl:0, level:1,  lvlPerLvl:1 },
    ],
    color:'#d4a020', icon:'🗡️',
  },
  act2_normal_defense: {
    name:'Holy Freeze Merc', act:2, difficulty:0, type:'desert_warrior',
    desc:'Slows enemies with Holy Freeze aura.',
    HP:65, HPPerLvl:8, defense:20, defPerLvl:4,
    str:68, strPerLvl:2, dex:45, dexPerLvl:1,
    ar:85, arPerLvl:11, dmgMin:7, dmgMax:14, dmgPerLvl:3,
    resist:0, resistPerLvl:0,
    aura:'HolyFreeze',
    skills:[
      { id:'Jab',       chance:100, chancePerLvl:0, level:1, lvlPerLvl:1 },
      { id:'HolyFreeze',chance:100, chancePerLvl:0, level:1, lvlPerLvl:1 },
    ],
    color:'#20a0d0', icon:'❄️',
  },
  // Act 3 — Iron Wolf (Mage)
  act3_fire: {
    name:'Fire Iron Wolf', act:3, difficulty:0, type:'iron_wolf',
    desc:'Sorcerer mercenary specializing in fire.',
    HP:35, HPPerLvl:4, defense:10, defPerLvl:2,
    str:40, strPerLvl:1, dex:35, dexPerLvl:1,
    ar:55, arPerLvl:5, dmgMin:2, dmgMax:4, dmgPerLvl:1,
    resist:0, resistPerLvl:0,
    skills:[
      { id:'FireBall',   chance:100, chancePerLvl:0, level:2,  lvlPerLvl:2 },
      { id:'Inferno',    chance:80,  chancePerLvl:2, level:1,  lvlPerLvl:1 },
      { id:'Enchant',    chance:50,  chancePerLvl:2, level:4,  lvlPerLvl:1 },
    ],
    color:'#ff4400', icon:'🔥',
  },
  act3_lightning: {
    name:'Lightning Iron Wolf', act:3, difficulty:0, type:'iron_wolf',
    desc:'Sorcerer mercenary specializing in lightning.',
    HP:35, HPPerLvl:4, defense:10, defPerLvl:2,
    str:38, strPerLvl:1, dex:35, dexPerLvl:1,
    ar:52, arPerLvl:5, dmgMin:2, dmgMax:4, dmgPerLvl:1,
    resist:0, resistPerLvl:0,
    skills:[
      { id:'Lightning',      chance:100, chancePerLvl:0, level:2, lvlPerLvl:2 },
      { id:'ChargedBolt',    chance:80,  chancePerLvl:2, level:1, lvlPerLvl:1 },
      { id:'ChainLightning', chance:50,  chancePerLvl:2, level:6, lvlPerLvl:1 },
    ],
    color:'#ffdd00', icon:'⚡',
  },
  // Act 5 — Barbarian
  act5_normal: {
    name:'Barbarian Guard', act:5, difficulty:0, type:'barbarian_fighter',
    desc:'Powerful Harrogath barbarian warrior.',
    HP:85, HPPerLvl:10, defense:30, defPerLvl:5,
    str:85, strPerLvl:3, dex:55, dexPerLvl:1,
    ar:110,arPerLvl:14, dmgMin:12, dmgMax:22, dmgPerLvl:4,
    resist:0, resistPerLvl:0,
    skills:[
      { id:'Bash',       chance:100, chancePerLvl:0, level:1, lvlPerLvl:1 },
      { id:'Stun',       chance:50,  chancePerLvl:2, level:5, lvlPerLvl:1 },
      { id:'FindPotion', chance:25,  chancePerLvl:1, level:1, lvlPerLvl:1 },
    ],
    color:'#8B4513', icon:'🪓',
  },
};

// Scale mercenary stat to given level
export function getMercStatAtLevel(merc, stat, level) {
  const perLvlKey = stat + 'PerLvl';
  return (merc[stat] || 0) + (merc[perLvlKey] || 0) * (level - 1);
}

// ═══════════════════════════════════════════════════════════════════════════
// § 5  MAP STAMP SYSTEM  ←  OpenDiablo2 d2mapgen/act1_overworld.go
// ═══════════════════════════════════════════════════════════════════════════
// mapWidth=150, mapHeight=150, mapMargin=9
export const MAP_WIDTH   = 150;
export const MAP_HEIGHT  = 150;
export const MAP_MARGIN  = 9;
export const MAP_CENTER  = { x: Math.floor(MAP_WIDTH/2),  y: Math.floor(MAP_HEIGHT/2) };

// Stamp types  ←  OpenDiablo2 act1_overworld.go
export const STAMP_TYPES = {
  DenOfEvil:    { name:'Den of Evil',    w:24, h:24, color:'#2a0000', special:'quest1' },
  StoneFill:    { name:'Stone Fill',     w:8,  h:8,  color:'#554433', tiles:['stone'] },
  Cottages:     { name:'Cottages',       w:12, h:12, color:'#6b5040', tiles:['building'] },
  FallenCamp:   { name:'Fallen Camp',    w:10, h:10, color:'#5a2020', tiles:['hut'] },
  Pond:         { name:'Pond',           w:8,  h:8,  color:'#102850', tiles:['water'] },
  SwampFill:    { name:'Swamp Fill',     w:6,  h:6,  color:'#1a3020', tiles:['swamp'] },
};

/**
 * generateAct1Overworld  ←  OpenDiablo2 d2mapgen/act1_overworld.go
 * Returns array of placed stamps {type, x, y, w, h}
 */
export function generateAct1Overworld(seed = 0) {
  D2RNG.setSeed(seed || Date.now());
  const stamps = [];

  // Den of Evil at center + rand(10) offset
  const doeX = MAP_CENTER.x - 12 + D2RNG.GenerateRnd(10);
  const doeY = MAP_CENTER.y - 12 + D2RNG.GenerateRnd(10);
  stamps.push({ type:'DenOfEvil', ...STAMP_TYPES.DenOfEvil, x:doeX, y:doeY });

  // 25 random stamps from the fill/deco set
  const fillTypes = ['StoneFill','Cottages','FallenCamp','Pond','SwampFill'];
  for (let i = 0; i < 25; i++) {
    const typeName = fillTypes[D2RNG.GenerateRnd(fillTypes.length)];
    const def      = STAMP_TYPES[typeName];
    const x = MAP_MARGIN + D2RNG.GenerateRnd(MAP_WIDTH  - MAP_MARGIN*2 - def.w);
    const y = MAP_MARGIN + D2RNG.GenerateRnd(MAP_HEIGHT - MAP_MARGIN*2 - def.h);
    stamps.push({ type:typeName, ...def, x, y });
  }
  return stamps;
}

/**
 * Generate a tile grid from stamps  ←  renders stamps into 2D array
 * 0=open, 1=wall, 2=door, 3=water, 4=special
 */
export function stampToTileGrid(stamps, w = MAP_WIDTH, h = MAP_HEIGHT) {
  const grid = Array.from({ length:h }, () => new Uint8Array(w));
  for (const s of stamps) {
    for (let dy = 0; dy < s.h; dy++) {
      for (let dx = 0; dx < s.w; dx++) {
        const gx = s.x + dx, gy = s.y + dy;
        if (gx < 0 || gy < 0 || gx >= w || gy >= h) continue;
        const isEdge = (dx===0||dy===0||dx===s.w-1||dy===s.h-1);
        if (s.type==='Pond' || s.type==='SwampFill') grid[gy][gx] = 3;
        else if (s.type==='DenOfEvil') grid[gy][gx] = isEdge ? 1 : 4;
        else grid[gy][gx] = isEdge ? 1 : 0;
      }
    }
  }
  return grid;
}

// ═══════════════════════════════════════════════════════════════════════════
// § 6  COMBAT ENGINE  ←  DevilutionX items.cpp / monster.cpp  + D2 formulas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * calcToHit  ←  D2 to-hit formula: chance = (AR / (AR+DR)) * (2*attLvl - defLvl) / attLvl
 */
export function calcToHit(attackRating, defenseRating, attackerLevel, defenderLevel) {
  const lvlFactor = defenderLevel === 0 ? 1 : Math.max(0.5, (2*attackerLevel - defenderLevel) / attackerLevel);
  const arFactor  = attackRating / (attackRating + defenseRating);
  return Math.min(95, Math.max(5, Math.round(arFactor * lvlFactor * 100)));
}

/**
 * rollDamage  —  rolls min–max physical damage
 */
export function rollDamage(min, max) {
  return min + D2RNG.GenerateRnd(Math.max(1, max - min + 1));
}

/**
 * applyResistance  —  apply resistances/immunities
 * damage × (1 - resist/100), capped at 0 if immune (resist≥100)
 */
export function applyResistance(damage, resistPercent) {
  if (resistPercent >= 100) return 0;
  return Math.max(0, Math.round(damage * (1 - resistPercent / 100)));
}

/**
 * calcMonsterHPRegen  ←  OpenDiablo2 MonStat regen formula
 * HP regen per frame = (REGEN * HP) / 4096
 */
export function calcMonsterHPRegen(regenRate, currentHP) {
  return (regenRate * currentHP) / 4096;
}

/**
 * getExpForKill  ←  D2 XP formula
 * exp × (1 - |playerLvl - monLvl| * 0.05) clamped [5%, 100%]
 */
export function getExpForKill(baseExp, playerLevel, monsterLevel) {
  const lvlDiff = Math.abs(playerLevel - monsterLevel);
  const penalty = Math.max(0.05, 1 - lvlDiff * 0.05);
  return Math.floor(baseExp * penalty);
}

// ═══════════════════════════════════════════════════════════════════════════
// § 7  CHARACTER CREATION  ←  DevilutionX + OpenDiablo2 hero_state.go
// ═══════════════════════════════════════════════════════════════════════════
import { CLASS_ATTRS, XP_TABLE as XP, HeroClass } from './crypticD2CoreData.js';

/**
 * createHeroState  ←  OpenDiablo2 d2hero/hero_state.go HeroState
 */
export function createHeroState(heroClass, name = 'Hero') {
  const a = CLASS_ATTRS[heroClass];
  if (!a) throw new Error(`Unknown hero class: ${heroClass}`);

  const hp  = a.initLife   || (a.adjLife  + a.baseVit * a.chrLife);
  const mp  = a.initMana   || (a.adjMana  + a.baseMag * a.chrMana);
  const sta = a.startStamina || 90;

  return {
    name, heroClass, engine:a.engine,
    level:1, experience:0,
    str: a.baseStr, mag: a.baseMag, dex: a.baseDex, vit: a.baseVit,
    maxStr:a.maxStr,maxMag:a.maxMag,maxDex:a.maxDex,maxVit:a.maxVit,
    hp, maxHp:hp, mp, maxMp:mp, stamina:sta, maxStamina:sta,
    statPoints:0, skillPoints:0,
    gold:0, stashGold:0,
    skills: {},
    inventory: [],
    equipment: { head:null, neck:null, torso:null, lhand:null, rhand:null,
                 lring:null, rring:null, belt:null, boots:null, gloves:null },
    quests: {},
    mercenary: null,
    flags: { hardcore:false, expansion:true },
  };
}

/**
 * levelUp  ←  D2/D1 level-up logic
 */
export function levelUp(hero) {
  const a   = CLASS_ATTRS[hero.heroClass];
  if (!a)   return hero;
  const lvl = hero.level + 1;
  if (lvl > 99) return hero;

  const hpGain  = a.lvlLife  || Math.floor(a.chrLife  * a.baseVit / 4);
  const mpGain  = a.lvlMana  || Math.floor(a.chrMana  * a.baseMag / 4);

  hero.level     = lvl;
  hero.maxHp    += hpGain;
  hero.hp        = hero.maxHp;
  hero.maxMp    += mpGain;
  hero.mp        = hero.maxMp;
  hero.statPoints  += 5;                    // D2: 5 stat pts per level
  hero.skillPoints += 1;                    // D2: 1 skill pt per level
  return hero;
}

/**
 * checkLevelUp  —  compare XP to table, auto-level if needed
 */
export function checkLevelUp(hero) {
  while (hero.level < 99 && hero.experience >= XP[hero.level]) {
    levelUp(hero);
  }
  return hero;
}

// ═══════════════════════════════════════════════════════════════════════════
// § 8  MPQ CRYPTO TABLES  ←  AbyssEngine mpqfile/crypto.go
// ═══════════════════════════════════════════════════════════════════════════
// StormLib / MPQ crypto — encryption key table
let _mpqCryptoTable = null;
export function getMPQCryptoTable() {
  if (_mpqCryptoTable) return _mpqCryptoTable;
  const table = new Uint32Array(0x500);
  let seed = 0x00100001;
  for (let i = 0; i < 0x100; i++) {
    let idx = i;
    for (let j = 0; j < 5; j++) {
      seed  = (seed * 125 + 3) % 0x2AAAAB;
      const t1 = (seed & 0xFFFF) << 0x10;
      seed  = (seed * 125 + 3) % 0x2AAAAB;
      const t2 = seed & 0xFFFF;
      table[idx] = (t1 | t2) >>> 0;
      idx  += 0x100;
    }
  }
  _mpqCryptoTable = table;
  return table;
}

export function mpqHashString(str, type) {
  const table = getMPQCryptoTable();
  let seed1 = 0x7FED7FED, seed2 = 0xEEEEEEEE;
  for (let i = 0; i < str.length; i++) {
    const ch = str.toUpperCase().charCodeAt(i);
    const val = table[(type << 8) + ch];
    seed1 = ((val ^ (seed1 + seed2)) >>> 0);
    seed2 = ((ch + seed1 + seed2 + (seed2 << 5) + 3) >>> 0);
  }
  return seed1 >>> 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// § 9  REGION / LEVEL DATA  ←  OpenDiablo2 d2enum/region_id.go
// ═══════════════════════════════════════════════════════════════════════════
export const RegionID = {
  // Act 1
  Act1Town:1, Act1Wilderness:2, Act1Cave:3, Act1Crypt:4,
  Act1Monastery:5, Act1MonasteryGate:6, Act1CathedralEntrance:7,
  Act1Cathedral:8, Act1Catacombs:9, Act1Tristram:10,
  // Act 2
  Act2Town:11, Act2Sewer:12, Act2Harem:13, Act2Palace:14,
  Act2Caves:15, Act2Canyon:16, Act2Desert:17, Act2Tomb:18, Act2Lair:19,
  // Act 3
  Act3Town:20, Act3Jungle:21, Act3Kurast:22, Act3Temple:23, Act3Throne:24,
  // Act 4
  Act4Town:25, Act4Plains:26, Act4City:27, Act4River:28, Act4Chaos:29,
  // Act 5 (LoD)
  Act5Town:30, Act5BloodyHills:31, Act5Frigid:32, Act5Arreat:33, Act5Worldstone:34,
};

export const LEVEL_DEFS = {
  [RegionID.Act1Town]:      { name:'Rogue Encampment', act:1, mlvl:1,  music:'town1',  tiles:'act1_town'    },
  [RegionID.Act1Wilderness]:{ name:'Blood Moor',        act:1, mlvl:2,  music:'wild1',  tiles:'act1_wild'    },
  [RegionID.Act1Cave]:      { name:'Den of Evil',       act:1, mlvl:3,  music:'cave1',  tiles:'act1_cave',  questLevel:true },
  [RegionID.Act1Crypt]:     { name:'Crypt',             act:1, mlvl:5,  music:'crypt1', tiles:'act1_crypt'   },
  [RegionID.Act1Cathedral]: { name:'Cathedral',         act:1, mlvl:8,  music:'dungeon',tiles:'act1_cath'    },
  [RegionID.Act1Catacombs]: { name:'Catacombs',         act:1, mlvl:10, music:'dungeon',tiles:'act1_catac'   },
  [RegionID.Act2Town]:      { name:'Lut Gholein',       act:2, mlvl:14, music:'town2',  tiles:'act2_town'    },
  [RegionID.Act2Desert]:    { name:'Rocky Waste',       act:2, mlvl:16, music:'wild2',  tiles:'act2_wild'    },
  [RegionID.Act2Tomb]:      { name:'Tal Rasha\'s Tomb', act:2, mlvl:20, music:'tomb',   tiles:'act2_tomb'    },
  [RegionID.Act3Town]:      { name:'Kurast Docks',      act:3, mlvl:22, music:'town3',  tiles:'act3_town'    },
  [RegionID.Act3Jungle]:    { name:'Spider Forest',     act:3, mlvl:24, music:'wild3',  tiles:'act3_jungle'  },
  [RegionID.Act4Town]:      { name:'Pandemonium Fortress',act:4,mlvl:28,music:'town4',  tiles:'act4_town'    },
  [RegionID.Act4City]:      { name:'City of the Damned',act:4, mlvl:30, music:'city',   tiles:'act4_city'    },
  [RegionID.Act5Town]:      { name:'Harrogath',          act:5, mlvl:36, music:'town5',  tiles:'act5_town'    },
  [RegionID.Act5Worldstone]:{ name:'Worldstone Keep',   act:5, mlvl:43, music:'world',  tiles:'act5_world'   },
};

// ═══════════════════════════════════════════════════════════════════════════
// § 10  ABYSS ENGINE INTEGRATION EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export const AbyssEngine = {
  name: 'CrypticRealm Abyss Engine v8.0',
  version: '8.0.0',
  core: createCrypticRealm8Core,
  absorbedSources: D2_ABSORBED_SOURCE_MANIFEST,

  // Spawn a monster at tile position
  spawnMonster(monKey, tx, ty, level = 1, difficulty = 0) {
    const def = MONSTER_DEFS[monKey];
    if (!def) return null;
    const hp  = getMonsterHPRange(def, level, difficulty);
    return {
      id:    `mon_${Date.now()}_${D2RNG.GenerateRnd(9999)}`,
      key:   monKey,
      ...def,
      tx, ty,
      hp:    D2RNG.GenerateRnd(hp.max - hp.min + 1) + hp.min,
      maxHp: hp.max,
      level, difficulty,
      mode:  MonsterMode.Stand,
      flags: def.flags || 0,
      target: null,
    };
  },

  // Create a random item drop
  createItemDrop(ilvl, mlvl = 0) {
    const keys    = Object.keys(BASE_ITEMS);
    const baseKey = keys[D2RNG.GenerateRnd(keys.length)];
    const base    = BASE_ITEMS[baseKey];
    const quality = determineItemQuality(ilvl, mlvl, base.typeFlags);
    const name    = generateItemName(base.name, quality);
    return { id:`item_${Date.now()}`, key:baseKey, ...base, name, quality,
             qualityColor:QUALITY_COLOR[quality] };
  },

  // Generate a map sector
  generateMap(regionId, seed) {
    if (regionId === RegionID.Act1Wilderness || regionId === RegionID.Act1Cave) {
      const stamps = generateAct1Overworld(seed);
      const grid   = stampToTileGrid(stamps);
      return { regionId, stamps, grid, width:MAP_WIDTH, height:MAP_HEIGHT };
    }
    // Fallback — empty
    const grid = Array.from({length:32}, ()=>new Uint8Array(32));
    return { regionId, stamps:[], grid, width:32, height:32 };
  },

  // Hash file path for MPQ lookup
  hashPath: mpqHashString,
};
