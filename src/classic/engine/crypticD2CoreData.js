/**
 * crypticD2CoreData.js  —  CrypticRealm 8.0 "Diablo Abyss Engine"
 * Full absorption of:
 *   DevilutionX (C++)  — RNG, path, player classes, spells, monsters
 *   OpenDiablo2  (Go)  — Formula parser, BitMuncher, CharStats, XP table
 *   AbyssEngine  (Go)  — COF / DCC / DT1 format decoders
 *   d2gs109/113  (C)   — Binary save parser, server protocol
 * Part 1 of 2: RNG · Classes · Spells · XP · Formula Parser · BitMuncher
 */

// ═══════════════════════════════════════════════════════════════════════════
// § 1  BORLAND LCG RNG  ←  DevilutionX Source/engine/random.cpp
// ═══════════════════════════════════════════════════════════════════════════
export const D2RNG = (() => {
  // Borland C++ linear_congruential_engine<uint32_t, 0x015A4E35, 1, 0>
  const LCG_MUL = 0x015A4E35;
  let _seed = 0;

  function advanceSeed() {
    // (seed * LCG_MUL + 1) mod 2^32
    _seed = (Math.imul(_seed, LCG_MUL) + 1) >>> 0;
    return _seed >>> 0;
  }

  return {
    setSeed(s) { _seed = s >>> 0; },
    getSeed()  { return _seed; },

    // GenerateRnd(v): high 16 bits of advanced seed mod v  (v ≤ 0x7FFF)
    GenerateRnd(v) {
      if (v <= 0) return 0;
      return (advanceSeed() >> 16) % v;
    },

    // FlipCoin(odds): true with probability 1/odds
    FlipCoin(odds) { return this.GenerateRnd(odds) === 0; },

    // AdvanceRndSeed: raw advance, returns new seed (for direct use)
    advance() { return advanceSeed(); },

    // xoshiro128++ — fast non-crypto PRNG for visual FX
    xoshiro128pp: (() => {
      let s = new Uint32Array([0xDEADBEEF, 0x01234567, 0x89ABCDEF, 0xFEDCBA98]);
      function rol32(x, k) { return (x << k) | (x >>> (32-k)); }
      return {
        next() {
          const r = rol32((s[0] + s[3]) >>> 0, 7) + s[0];
          const t = s[1] << 9;
          s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
          s[2] ^= t; s[3] = rol32(s[3], 11);
          return r >>> 0;
        },
        nextFloat() { return this.next() / 4294967296; },
        range(lo, hi) { return lo + (this.next() % (hi - lo + 1)); },
        seed(v) { s = new Uint32Array([v, v^0xDEAD, v^0xBEEF, v^0xCAFE]); }
      };
    })(),
  };
})();

// ═══════════════════════════════════════════════════════════════════════════
// § 2  PATH DIRECTION TABLE  ←  DevilutionX Source/engine/path.cpp
// ═══════════════════════════════════════════════════════════════════════════
// PathDirections[9] — A* direction encoding
// Indices 0‑8 map to: SW W NW N NE E SE S stay
export const PathDirections = [5, 1, 6, 2, 0, 3, 8, 4, 7];
export const PathAxisAlignedStepCost = 100;
export const PathDiagonalStepCost   = 101; // DevilutionX PATH.CPP: diagonals are only slightly costlier

// Walk direction constants  ←  DevilutionX Source/player.h
export const WalkDir = { NE:1, NW:2, SE:3, SW:4, N:5, E:6, S:7, W:8, NONE:-1 };

// ═══════════════════════════════════════════════════════════════════════════
// § 3  HERO CLASSES  ←  DevilutionX playerdat.hpp + OpenDiablo2 hero.go
//      10 classes: D1(3) + D2(5) + LoD(2) + HF-exclusive(2) + merged HF Barb
// ═══════════════════════════════════════════════════════════════════════════
export const HeroClass = {
  // Diablo 1 originals
  WARRIOR:    'warrior',
  ROGUE:      'rogue',
  SORCERER:   'sorcerer',
  // Diablo 2 core
  AMAZON:     'amazon',
  NECROMANCER:'necromancer',
  BARBARIAN:  'barbarian',   // D2 Barb (different from HF Barbarian)
  SORCERESS:  'sorceress',
  PALADIN:    'paladin',
  // Lord of Destruction
  DRUID:      'druid',
  ASSASSIN:   'assassin',
  // Hellfire exclusives
  MONK:       'monk',
  BARD:       'bard',
  HELLFIRE_BARBARIAN: 'hf_barbarian',
};

/**
 * ClassAttributes  ←  DevilutionX Source/tables/playerdat.hpp ClassAttributes
 *                  +   OpenDiablo2 d2core/d2records/charstats_record.go
 *
 * All fixed-point values stored as ×256 (D1/HF) or ×8 (D2) per original source.
 * lifePerVit / manaPerEne stored as float for convenience.
 */
export const CLASS_ATTRS = {
  // ── Diablo 1 + Hellfire  (DevilutionX playerdat.cpp values) ──────────────
  [HeroClass.WARRIOR]: {
    label:'Warrior', engine:'d1',
    portrait:0, folderName:'warrior',
    lore:'A seasoned soldier skilled in melee combat.',
    flags:{ criticalStrike:false, dualWield:false, ironSkin:true, naturalResist:false, trapSense:false },
    baseStr:30, baseMag:10, baseDex:25, baseVit:25,
    maxStr:250,  maxMag:50,  maxDex:60,  maxVit:100,
    adjLife:256, adjMana:0,  lvlLife:8,  lvlMana:2,
    chrLife:2,   chrMana:1,  itmLife:1,  itmMana:0,
    baseToBlock:30, baseMeleeToHit:50, baseRangedToHit:10, baseMagicToHit:10,
    lifePerVit:2, manaPerEne:1, staminaPerVit:1,
    color:'#8B4513', glowColor:'#CD853F',
    icon:'⚔️',
    skills: ['firebolt','healing','lightning','flash'],
  },
  [HeroClass.ROGUE]: {
    label:'Rogue', engine:'d1',
    portrait:1, folderName:'rogue',
    lore:'A skilled archer and trap expert.',
    flags:{ criticalStrike:true, dualWield:false, ironSkin:false, naturalResist:false, trapSense:true },
    baseStr:25, baseMag:15, baseDex:30, baseVit:20,
    maxStr:75,  maxMag:50,  maxDex:115, maxVit:80,
    adjLife:48,  adjMana:22, lvlLife:6,  lvlMana:4,
    chrLife:1,   chrMana:1,  itmLife:0,  itmMana:0,
    baseToBlock:20, baseMeleeToHit:30, baseRangedToHit:50, baseMagicToHit:20,
    lifePerVit:1, manaPerEne:1, staminaPerVit:1,
    color:'#556B2F', glowColor:'#6B8E23',
    icon:'🏹',
    skills: ['healing','identify','infravision','phasing'],
  },
  [HeroClass.SORCERER]: {
    label:'Sorcerer', engine:'d1',
    portrait:2, folderName:'sorceror',
    lore:'A master of the arcane arts.',
    flags:{ criticalStrike:false, dualWield:false, ironSkin:false, naturalResist:false, trapSense:false },
    baseStr:15, baseMag:35, baseDex:15, baseVit:20,
    maxStr:45,  maxMag:250, maxDex:85,  maxVit:80,
    adjLife:0,   adjMana:96, lvlLife:4,  lvlMana:8,
    chrLife:1,   chrMana:2,  itmLife:0,  itmMana:1,
    baseToBlock:10, baseMeleeToHit:10, baseRangedToHit:20, baseMagicToHit:50,
    lifePerVit:1, manaPerEne:2, staminaPerVit:1,
    color:'#4B0082', glowColor:'#9400D3',
    icon:'🔮',
    skills: ['firebolt','lightning','fireball','nova'],
  },
  // ── Hellfire exclusives (DevilutionX) ────────────────────────────────────
  [HeroClass.MONK]: {
    label:'Monk', engine:'hf',
    portrait:3, folderName:'monk',
    lore:'A warrior-mystic who fights with staff and fists.',
    flags:{ criticalStrike:false, dualWield:false, ironSkin:true, naturalResist:true, trapSense:false },
    baseStr:25, baseMag:15, baseDex:25, baseVit:20,
    maxStr:150, maxMag:80,  maxDex:120, maxVit:80,
    adjLife:64,  adjMana:16, lvlLife:8,  lvlMana:4,
    chrLife:2,   chrMana:1,  itmLife:1,  itmMana:0,
    baseToBlock:25, baseMeleeToHit:40, baseRangedToHit:20, baseMagicToHit:30,
    lifePerVit:2, manaPerEne:1, staminaPerVit:1,
    color:'#DAA520', glowColor:'#FFD700',
    icon:'🥋',
    skills: ['holyBolt','healing','townPortal','telekinesis'],
  },
  [HeroClass.BARD]: {
    label:'Bard', engine:'hf',
    portrait:4, folderName:'bard',
    lore:'A jack-of-all-trades who fights with song and blade.',
    flags:{ criticalStrike:true, dualWield:true, ironSkin:false, naturalResist:false, trapSense:false },
    baseStr:20, baseMag:15, baseDex:30, baseVit:20,
    maxStr:120, maxMag:120, maxDex:120, maxVit:120,
    adjLife:24,  adjMana:24, lvlLife:6,  lvlMana:4,
    chrLife:1,   chrMana:1,  itmLife:0,  itmMana:0,
    baseToBlock:20, baseMeleeToHit:35, baseRangedToHit:35, baseMagicToHit:35,
    lifePerVit:1.5, manaPerEne:1.5, staminaPerVit:1,
    color:'#DC143C', glowColor:'#FF69B4',
    icon:'🎵',
    skills: ['healing','identify','infravision','mana'],
  },
  [HeroClass.HELLFIRE_BARBARIAN]: {
    label:'Barbarian (HF)', engine:'hf',
    portrait:5, folderName:'barbarian',
    lore:'A brutal warrior with unstoppable rage.',
    flags:{ criticalStrike:false, dualWield:false, ironSkin:true, naturalResist:false, trapSense:false },
    baseStr:40, baseMag:0,  baseDex:20, baseVit:25,
    maxStr:255, maxMag:0,   maxDex:55,  maxVit:150,
    adjLife:92,  adjMana:0,  lvlLife:10, lvlMana:0,
    chrLife:2,   chrMana:0,  itmLife:1,  itmMana:0,
    baseToBlock:35, baseMeleeToHit:55, baseRangedToHit:5,  baseMagicToHit:5,
    lifePerVit:2, manaPerEne:0, staminaPerVit:1,
    color:'#8B0000', glowColor:'#FF4500',
    icon:'🪓',
    skills: ['rage','healing'],
  },
  // ── Diablo 2 classes (OpenDiablo2 charstats.go + known charstat.txt) ────
  [HeroClass.AMAZON]: {
    label:'Amazon', engine:'d2',
    portrait:6, folderName:'ama',
    lore:'A fierce warrior woman from the isles of Skovos.',
    flags:{ criticalStrike:true, dualWield:false, ironSkin:false, naturalResist:false, trapSense:false },
    baseStr:20, baseMag:15, baseDex:25, baseVit:20,
    maxStr:250, maxMag:180, maxDex:250, maxVit:300,
    adjLife:50, adjMana:15, lvlLife:3,  lvlMana:1,
    chrLife:3,  chrMana:1.5,itmLife:1,  itmMana:0,
    baseToBlock:25, baseMeleeToHit:35, baseRangedToHit:55, baseMagicToHit:25,
    lifePerVit:3, manaPerEne:1.5, staminaPerVit:1,
    startStamina:84, initLife:50, initMana:15,
    color:'#228B22', glowColor:'#32CD32',
    icon:'🏹',
    skillTabs:['Javelin & Spear','Passive & Magic','Bow & Crossbow'],
    skills: { javelinSpear:['InnerSight','CriticalStrike','Jab','SlowMissiles','Dodge','PowerStrike',
                'PoisonJavelin','Evade','Decoy','LightningBolt','Avoid','Valkyrie','PlagueJavelin',
                'Fend','LightningStrike','LightningFury'],
              passiveMagic:['InnerSight','CriticalStrike','Dodge','SlowMissiles','Avoid',
                'Penetrate','Decoy','Evade','Valkyrie','Pierce'],
              bowCrossbow:['MagicArrow','FireArrow','MultipleShot','ExplodingArrow','IceArrow',
                'GuidedArrow','Strafe','ImbuedArrow','FrozenArrow','Immolation Arrow'] }
  },
  [HeroClass.NECROMANCER]: {
    label:'Necromancer', engine:'d2',
    portrait:7, folderName:'nec',
    lore:'A dark mage who commands the dead.',
    flags:{ criticalStrike:false, dualWield:false, ironSkin:false, naturalResist:false, trapSense:false },
    baseStr:15, baseMag:25, baseDex:25, baseVit:15,
    maxStr:150, maxMag:250, maxDex:150, maxVit:300,
    adjLife:40, adjMana:25, lvlLife:2,  lvlMana:2,
    chrLife:2,  chrMana:2,  itmLife:0,  itmMana:1,
    baseToBlock:15, baseMeleeToHit:20, baseRangedToHit:15, baseMagicToHit:55,
    lifePerVit:2, manaPerEne:2, staminaPerVit:1,
    startStamina:79, initLife:45, initMana:25,
    color:'#708090', glowColor:'#C0C0C0',
    icon:'💀',
    skillTabs:['Summoning','Poison & Bone','Curses'],
    skills: { summoning:['SkeletonMastery','RaiseSkeleton','ClayGolem','GolemMastery','RaiseSkeletalMage',
                'BloodGolem','SummonResist','IronGolem','ReviveMonstersRes','FireGolem','Revive'],
              poisonBone:['TeethD2','BoneArmor','PoisonDagger','CorpseExplosion','BoneWall','PoisonExplosion',
                'BoneSpear','BonePrison','PoisonNova','BoneSpirit'],
              curses:['Amplify Damage','Dim Vision','Weaken','IronMaiden','Terror','Confuse',
                'LifeTap','Attract','Decrepify','LowerResist'] }
  },
  [HeroClass.BARBARIAN]: {
    label:'Barbarian', engine:'d2',
    portrait:8, folderName:'bar',
    lore:'A mighty warrior from the northern steppes.',
    flags:{ criticalStrike:false, dualWield:true, ironSkin:false, naturalResist:false, trapSense:false },
    baseStr:30, baseMag:10, baseDex:20, baseVit:25,
    maxStr:300, maxMag:50,  maxDex:200, maxVit:300,
    adjLife:55, adjMana:10, lvlLife:4,  lvlMana:1,
    chrLife:4,  chrMana:1,  itmLife:1,  itmMana:0,
    baseToBlock:30, baseMeleeToHit:55, baseRangedToHit:10, baseMagicToHit:10,
    lifePerVit:4, manaPerEne:1, staminaPerVit:1,
    startStamina:92, initLife:55, initMana:10,
    color:'#A52A2A', glowColor:'#FF6347',
    icon:'⚔️',
    skillTabs:['Warcries','Combat Masteries','Combat Skills'],
    skills: { warcries:['HowlD2','ShoutD2','Taunt','BattleCry','ItemFind','BattleOrders',
                'Grim Ward','WarCry','BattleCommand'],
              combatMasteries:['SwordMastery','AxeMastery','MaceMastery','PolearmMastery','ThrowingMastery',
                'SpearMastery','IncreasedStamina','IronSkinD2','IncreasedSpeed','NaturalResistance'],
              combatSkills:['DoubleSwing','Stab','DoubleThrow','LeapD2','Concentrate',
                'FrenzyD2','WhirlwindD2','Berserk','Leap Attack'] }
  },
  [HeroClass.SORCERESS]: {
    label:'Sorceress', engine:'d2',
    portrait:9, folderName:'sor',
    lore:'A mistress of elemental magic.',
    flags:{ criticalStrike:false, dualWield:false, ironSkin:false, naturalResist:false, trapSense:false },
    baseStr:10, baseMag:35, baseDex:25, baseVit:10,
    maxStr:150, maxMag:300, maxDex:250, maxVit:300,
    adjLife:40, adjMana:35, lvlLife:2,  lvlMana:2,
    chrLife:2,  chrMana:2,  itmLife:0,  itmMana:1,
    baseToBlock:10, baseMeleeToHit:10, baseRangedToHit:15, baseMagicToHit:60,
    lifePerVit:2, manaPerEne:2, staminaPerVit:1,
    startStamina:74, initLife:40, initMana:35,
    color:'#00008B', glowColor:'#4169E1',
    icon:'🔥',
    skillTabs:['Fire Spells','Cold Spells','Lightning Spells'],
    skills: { fire:['FireBolt','WarmthD2','InfernoD2','BlazeSor','FireBallD2','FireWallD2',
                'EnchantD2','MeteorD2','FireMastery','Hydra'],
              cold:['IceBolt','FrozenArmor','FrostNova','IceBlast','ShiverArmor','GlacialSpike',
                'Blizzard','ChillingArmor','FrozenOrb','ColdMastery'],
              lightning:['ChargedBoltD2','StaticField','TelekinesisD2','Nova','LightningD2',
                'ChainLightningD2','TeleportD2','ThunderStorm','EnergyShield','LightningMastery'] }
  },
  [HeroClass.PALADIN]: {
    label:'Paladin', engine:'d2',
    portrait:10, folderName:'pal',
    lore:'A holy warrior devoted to the Light.',
    flags:{ criticalStrike:false, dualWield:false, ironSkin:false, naturalResist:false, trapSense:false },
    baseStr:25, baseMag:15, baseDex:20, baseVit:25,
    maxStr:300, maxMag:150, maxDex:200, maxVit:300,
    adjLife:55, adjMana:15, lvlLife:3,  lvlMana:1,
    chrLife:3,  chrMana:1.5,itmLife:1,  itmMana:0,
    baseToBlock:30, baseMeleeToHit:50, baseRangedToHit:15, baseMagicToHit:30,
    lifePerVit:3, manaPerEne:1.5, staminaPerVit:1,
    startStamina:89, initLife:55, initMana:15,
    color:'#DAA520', glowColor:'#FFD700',
    icon:'🛡️',
    skillTabs:['Combat Skills','Offensive Auras','Defensive Auras'],
    skills: { combat:['Sacrifice','Smite','Holy Bolt','Charge','Zeal','Vengeance',
                'Blessed Hammer','Conversion','Holy Shield','Fist of the Heavens'],
              offensiveAuras:['Might','Holy Fire','Thorns','Blessed Aim','Concentration',
                'Holy Freeze','Holy Shock','Sanctuary','Fanaticism','Conviction'],
              defensiveAuras:['Prayer','Resist Fire','Defiance','Resist Cold','Cleansing',
                'Resist Lightning','Vigor','Meditation','Redemption','Salvation'] }
  },
  [HeroClass.DRUID]: {
    label:'Druid', engine:'d2lod',
    portrait:11, folderName:'dru',
    lore:'A shapeshifting nature mage from the Scosglen forests.',
    flags:{ criticalStrike:false, dualWield:false, ironSkin:false, naturalResist:true, trapSense:false },
    baseStr:15, baseMag:20, baseDex:20, baseVit:25,
    maxStr:250, maxMag:200, maxDex:250, maxVit:300,
    adjLife:45, adjMana:20, lvlLife:2,  lvlMana:2,
    chrLife:2.5,chrMana:2,  itmLife:0,  itmMana:1,
    baseToBlock:20, baseMeleeToHit:25, baseRangedToHit:25, baseMagicToHit:45,
    lifePerVit:2.5, manaPerEne:2, staminaPerVit:1,
    startStamina:84, initLife:45, initMana:20,
    color:'#228B22', glowColor:'#7CFC00',
    icon:'🌿',
    skillTabs:['Elemental','Shape Shifting','Summoning'],
    skills: { elemental:['Firestorm','Molten Boulder','Arctic Blast','Fissure','Cyclone Armor',
                'Twister','Volcano','Tornado','Hurricane','Armageddon'],
              shapeShifting:['Werewolf','Lycanthropy','Werebear','Feral Rage','Maul',
                'Rabies','Fire Claws','Hunger','Shock Wave','Fury'],
              summoning:['Raven','Poison Creeper','Oak Sage','Summon Spirit Wolf','Carrion Vine',
                'Heart of Wolverine','Summon Dire Wolf','Solar Creeper','Spirit of Barbs','Summon Grizzly'] }
  },
  [HeroClass.ASSASSIN]: {
    label:'Assassin', engine:'d2lod',
    portrait:12, folderName:'ass',
    lore:'A dark hunter trained to destroy demons.',
    flags:{ criticalStrike:true, dualWield:true, ironSkin:false, naturalResist:false, trapSense:true },
    baseStr:20, baseMag:25, baseDex:20, baseVit:20,
    maxStr:200, maxMag:250, maxDex:250, maxVit:300,
    adjLife:50, adjMana:25, lvlLife:3,  lvlMana:1,
    chrLife:3,  chrMana:1.5,itmLife:0,  itmMana:0,
    baseToBlock:25, baseMeleeToHit:45, baseRangedToHit:35, baseMagicToHit:30,
    lifePerVit:3, manaPerEne:1.5, staminaPerVit:1,
    startStamina:95, initLife:50, initMana:25,
    color:'#2F4F4F', glowColor:'#00CED1',
    icon:'🗡️',
    skillTabs:['Martial Arts','Shadow Disciplines','Traps'],
    skills: { martialArts:['Tiger Strike','Dragon Talon','Fists of Fire','Dragon Claw','Cobra Strike',
                'Claws of Thunder','Dragon Tail','Blades of Ice','Dragon Flight','Phoenix Strike'],
              shadowDisciplines:['Claw Mastery','Psychic Hammer','Burst of Speed','Weapon Block',
                'Cloak of Shadows','Fade','Shadow Warrior','Mind Blast','Venom','Shadow Master'],
              traps:['Fire Blast','Shock Web','Blade Sentinel','Charged Bolt Sentry','Wake of Fire',
                'Blade Fury','Lightning Sentry','Wake of Inferno','Death Sentry','Blade Shield'] }
  },
};

// All selectable classes in display order
export const ALL_CLASSES = [
  HeroClass.AMAZON, HeroClass.NECROMANCER, HeroClass.BARBARIAN,
  HeroClass.SORCERESS, HeroClass.PALADIN,
  HeroClass.DRUID, HeroClass.ASSASSIN,
  HeroClass.WARRIOR, HeroClass.ROGUE, HeroClass.SORCERER,
  HeroClass.MONK, HeroClass.BARD, HeroClass.HELLFIRE_BARBARIAN,
];

// ═══════════════════════════════════════════════════════════════════════════
// § 4  SPELL IDs  ←  DevilutionX Source/tables/spelldat.h SpellID enum
// ═══════════════════════════════════════════════════════════════════════════
export const SpellID = {
  Null:0, Firebolt:1, Healing:2, Lightning:3, Flash:4, Identify:5,
  FireWall:6, TownPortal:7, StoneCurse:8, Infravision:9, Phasing:10,
  ManaShield:11, Fireball:12, Guardian:13, ChainLightning:14, FlameWave:15,
  DoomSerpents:16, BloodRitual:17, Nova:18, Invisibility:19, Inferno:20,
  Golem:21, Rage:22, Teleport:23, Apocalypse:24, Etherealize:25,
  ItemRepair:26, StaffRecharge:27, TrapDisarm:28, Elemental:29,
  ChargedBolt:30, HolyBolt:31, Resurrect:32, Telekinesis:33,
  HealOther:34, BloodStar:35, BoneSpirit:36,
  // Hellfire extras
  Mana:37, Magi:38, Jester:39, LightningWall:40, Immolation:41,
  Warp:42, Reflect:43, Berserk:44, RingOfFire:45, Search:46,
  RuneOfFire:47, RuneOfLight:48, RuneOfNova:49, RuneOfImmolation:50, RuneOfStone:51,
};

export const SpellInfo = {
  [SpellID.Firebolt]:      { name:'Fire Bolt',       manaCost:2,   type:'fire',      maxLvl:15 },
  [SpellID.Healing]:       { name:'Healing',          manaCost:5,   type:'magic',     maxLvl:15 },
  [SpellID.Lightning]:     { name:'Lightning',        manaCost:6,   type:'lightning', maxLvl:15 },
  [SpellID.Flash]:         { name:'Flash',            manaCost:30,  type:'lightning', maxLvl:15 },
  [SpellID.Identify]:      { name:'Identify',         manaCost:0,   type:'magic',     maxLvl:1  },
  [SpellID.FireWall]:      { name:'Fire Wall',        manaCost:28,  type:'fire',      maxLvl:15 },
  [SpellID.TownPortal]:    { name:'Town Portal',      manaCost:35,  type:'magic',     maxLvl:1  },
  [SpellID.StoneCurse]:    { name:'Stone Curse',      manaCost:60,  type:'magic',     maxLvl:15 },
  [SpellID.Infravision]:   { name:'Infravision',      manaCost:0,   type:'magic',     maxLvl:1  },
  [SpellID.Phasing]:       { name:'Phasing',          manaCost:12,  type:'magic',     maxLvl:15 },
  [SpellID.ManaShield]:    { name:'Mana Shield',      manaCost:33,  type:'magic',     maxLvl:15 },
  [SpellID.Fireball]:      { name:'Fireball',         manaCost:16,  type:'fire',      maxLvl:15 },
  [SpellID.Guardian]:      { name:'Guardian',         manaCost:50,  type:'fire',      maxLvl:15 },
  [SpellID.ChainLightning]:{ name:'Chain Lightning',  manaCost:30,  type:'lightning', maxLvl:15 },
  [SpellID.FlameWave]:     { name:'Flame Wave',       manaCost:35,  type:'fire',      maxLvl:15 },
  [SpellID.Nova]:          { name:'Nova',             manaCost:60,  type:'lightning', maxLvl:15 },
  [SpellID.Inferno]:       { name:'Inferno',          manaCost:11,  type:'fire',      maxLvl:15 },
  [SpellID.Golem]:         { name:'Golem',            manaCost:100, type:'magic',     maxLvl:15 },
  [SpellID.Rage]:          { name:'Rage',             manaCost:0,   type:'magic',     maxLvl:15 },
  [SpellID.Teleport]:      { name:'Teleport',         manaCost:35,  type:'magic',     maxLvl:15 },
  [SpellID.Apocalypse]:    { name:'Apocalypse',       manaCost:150, type:'fire',      maxLvl:15 },
  [SpellID.Etherealize]:   { name:'Etherealize',      manaCost:0,   type:'magic',     maxLvl:1  },
  [SpellID.ChargedBolt]:   { name:'Charged Bolt',     manaCost:6,   type:'lightning', maxLvl:15 },
  [SpellID.HolyBolt]:      { name:'Holy Bolt',        manaCost:7,   type:'magic',     maxLvl:15 },
  [SpellID.Resurrect]:     { name:'Resurrect',        manaCost:0,   type:'magic',     maxLvl:1  },
  [SpellID.Telekinesis]:   { name:'Telekinesis',      manaCost:15,  type:'magic',     maxLvl:15 },
  [SpellID.BloodStar]:     { name:'Blood Star',       manaCost:25,  type:'magic',     maxLvl:15 },
  [SpellID.BoneSpirit]:    { name:'Bone Spirit',      manaCost:24,  type:'magic',     maxLvl:15 },
  // Hellfire
  [SpellID.Mana]:          { name:'Mana',             manaCost:0,   type:'magic',     maxLvl:1, hellfire:true },
  [SpellID.LightningWall]: { name:'Lightning Wall',   manaCost:28,  type:'lightning', maxLvl:15,hellfire:true },
  [SpellID.Immolation]:    { name:'Immolation',       manaCost:60,  type:'fire',      maxLvl:15,hellfire:true },
  [SpellID.Warp]:          { name:'Warp',             manaCost:35,  type:'magic',     maxLvl:15,hellfire:true },
  [SpellID.Reflect]:       { name:'Reflect',          manaCost:35,  type:'magic',     maxLvl:15,hellfire:true },
  [SpellID.Berserk]:       { name:'Berserk',          manaCost:35,  type:'magic',     maxLvl:15,hellfire:true },
  [SpellID.RingOfFire]:    { name:'Ring of Fire',     manaCost:16,  type:'fire',      maxLvl:15,hellfire:true },
  [SpellID.Search]:        { name:'Search',           manaCost:15,  type:'magic',     maxLvl:15,hellfire:true },
};

// ═══════════════════════════════════════════════════════════════════════════
// § 5  EXPERIENCE TABLE  ←  OpenDiablo2 / real D2 charstat data  (99 levels)
// ═══════════════════════════════════════════════════════════════════════════
// Real Diablo 2 XP thresholds (vanilla 1.13c)
export const XP_TABLE = [
  0,         500,       1500,      3750,      7875,
  14175,     22680,     32886,     44396,     57715,
  72144,     127012,    208046,    323988,    475674,
  663430,    892728,    1166508,   1490016,   1868040,
  2302776,   2800872,   3368532,   4011552,   4735128,
  5544180,   6444612,   7441128,   8539536,   9745344,
  11063916,  12500688,  14060784,  15748656,  17569656,
  19528032,  21629280,  23878896,  26281800,  28842000,
  31563600,  34451520,  37510560,  40745520,  44160000,
  47759040,  51547440,  55530000,  59711520,  64096800,
  68690880,  73498560,  78524640,  83772000,  89245680,
  94949520,  100887600, 107064000, 113482800, 120148080,
  127064160, 134234640, 141663360, 149354160, 157310880,
  165537360, 174037680, 182815680, 191874240, 201216000,
  210844800, 220764000, 230977440, 241488000, 252299520,
  263415360, 274838880, 286573200, 298622400, 310990560,
  323681280, 336697200, 350042400, 363720000, 377733600,
  392086800, 406783200, 421826400, 437219400, 452966200,
  469070300, 485535200, 502364600, 519562000, 537130400,
  555073400, 573394000, 592095000, 611179000, 630648999,
];

// ═══════════════════════════════════════════════════════════════════════════
// § 6  BIT MUNCHER  ←  OpenDiablo2 d2common/d2datautils/bitmuncher.go
// ═══════════════════════════════════════════════════════════════════════════
export class BitMuncher {
  constructor(data) {
    this._data   = data instanceof Uint8Array ? data : new Uint8Array(data);
    this._offset = 0;   // bit offset
  }

  get offset() { return this._offset; }
  set offset(v) { this._offset = v; }

  // GetBit — read 1 bit at current position (LSB first)
  getBit() {
    const byteIdx = this._offset >> 3;
    const bitIdx  = this._offset & 7;
    const bit = (this._data[byteIdx] >> bitIdx) & 1;
    this._offset++;
    return bit;
  }

  // GetBits — read n bits, return unsigned value
  getBits(n) {
    let result = 0;
    for (let i = 0; i < n; i++) {
      if (this.getBit()) result |= (1 << i);
    }
    return result >>> 0;
  }

  // MakeSigned — two's complement sign extension
  // twosComplimentNegativeOne = 4294967295
  static makeSigned(val, bits) {
    const signBit = 1 << (bits - 1);
    if (val & signBit) return val - (signBit << 1);
    return val;
  }

  // GetSignedBits — read n bits as signed
  getSignedBits(n) {
    return BitMuncher.makeSigned(this.getBits(n), n);
  }

  // Skip n bits
  skip(n) { this._offset += n; }

  // Align to next byte boundary
  alignToByte() {
    const rem = this._offset & 7;
    if (rem) this._offset += 8 - rem;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// § 7  D2 FORMULA PARSER  ←  OpenDiablo2 d2common/d2calculation/
//      Pratt parser: lexer → tokens → AST → eval
// ═══════════════════════════════════════════════════════════════════════════

// Token types  ←  d2lexer/lexer.go
export const TokenType = { Name:0, String:1, Symbol:2, Number:3, EOF:4 };

class D2Lexer {
  constructor(src) {
    this._src = src;
    this._pos = 0;
    this._tokens = [];
    this._tokenize();
  }

  _peek() { return this._src[this._pos]; }
  _next() { return this._src[this._pos++]; }
  _done() { return this._pos >= this._src.length; }

  _skipWS() {
    while (!this._done() && /\s/.test(this._peek())) this._next();
  }

  _tokenize() {
    while (true) {
      this._skipWS();
      if (this._done()) { this._tokens.push({ type:TokenType.EOF, val:'' }); break; }
      const c = this._peek();
      if (/[a-zA-Z_]/.test(c)) {
        let buf = '';
        while (!this._done() && /[a-zA-Z0-9_]/.test(this._peek())) buf += this._next();
        this._tokens.push({ type:TokenType.Name, val:buf });
      } else if (/[0-9]/.test(c) || (c==='-' && /[0-9]/.test(this._src[this._pos+1]||''))) {
        let buf = this._next();
        while (!this._done() && /[0-9.]/.test(this._peek())) buf += this._next();
        this._tokens.push({ type:TokenType.Number, val:parseFloat(buf) });
      } else if (c==="'") {
        this._next(); let buf = '';
        while (!this._done() && this._peek()!=="'") buf += this._next();
        if (!this._done()) this._next();
        this._tokens.push({ type:TokenType.String, val:buf });
      } else {
        // multi-char symbols: ==, !=, <=, >=
        const two = this._src.slice(this._pos, this._pos+2);
        if (['==','!=','<=','>='].includes(two)) { this._pos+=2; this._tokens.push({type:TokenType.Symbol,val:two}); }
        else this._tokens.push({ type:TokenType.Symbol, val:this._next() });
      }
    }
  }

  get tokens() { return this._tokens; }
}

// Pratt parser  ←  d2parser/parser.go
class D2Parser {
  constructor(tokens) {
    this._toks = tokens;
    this._pos  = 0;
  }

  _cur()  { return this._toks[this._pos]; }
  _peek() { return this._toks[this._pos]; }
  _consume() { return this._toks[this._pos++]; }

  _expect(val) {
    const t = this._consume();
    if (t.val !== val) throw new Error(`D2Parser: expected '${val}' got '${t.val}'`);
    return t;
  }

  // precedence table  ←  d2parser/operations.go
  _prec(op) {
    return { '?':1, ':':1, '==':2, '!=':2, '<':2, '>':2, '<=':2, '>=':2,
             '+':3, '-':3, '*':4, '/':4, '^':5 }[op] || 0;
  }

  parseExpr(minPrec = 0) {
    let left = this._parseUnary();
    while (true) {
      const t = this._peek();
      if (t.type === TokenType.EOF) break;
      const prec = this._prec(t.val);
      if (prec === 0 || prec <= minPrec) break;
      this._consume();
      if (t.val === '?') {
        const then = this.parseExpr(0);
        this._expect(':');
        const els  = this.parseExpr(0);
        left = { op:'?:', left, then, els };
      } else {
        left = { op:t.val, left, right:this.parseExpr(prec) };
      }
    }
    return left;
  }

  _parseUnary() {
    const t = this._peek();
    if (t.type === TokenType.Symbol && (t.val==='+' || t.val==='-')) {
      this._consume();
      return { op:`u${t.val}`, arg:this._parseUnary() };
    }
    return this._parsePrimary();
  }

  _parsePrimary() {
    const t = this._consume();
    if (t.type === TokenType.Number) return { op:'lit', val:t.val };
    if (t.type === TokenType.String) return { op:'str', val:t.val };
    if (t.type === TokenType.Symbol && t.val === '(') {
      const e = this.parseExpr(0); this._expect(')'); return e;
    }
    if (t.type === TokenType.Name) {
      // function call: min(a,b) max(a,b) rand(a,b)
      if (this._peek().val === '(') {
        this._consume();
        const args = [];
        while (this._peek().val !== ')') {
          args.push(this.parseExpr(0));
          if (this._peek().val === ',') this._consume();
        }
        this._consume();
        return { op:'call', fn:t.val.toLowerCase(), args };
      }
      // property: skill('name'.qual)  miss  stat
      return { op:'prop', name:t.val };
    }
    return { op:'lit', val:0 };
  }

  parse() { return this.parseExpr(0); }
}

// AST evaluator
function evalD2Ast(node, ctx = {}) {
  if (!node) return 0;
  const ev = n => evalD2Ast(n, ctx);
  switch (node.op) {
    case 'lit': return node.val;
    case 'str': return node.val;
    case 'prop': {
      const k = node.name.toLowerCase();
      if (k in ctx) return ctx[k];
      return 0;
    }
    case 'u+': return +ev(node.arg);
    case 'u-': return -ev(node.arg);
    case '+':  return ev(node.left) + ev(node.right);
    case '-':  return ev(node.left) - ev(node.right);
    case '*':  return ev(node.left) * ev(node.right);
    case '/':  { const d=ev(node.right); return d===0?0:ev(node.left)/d; }
    case '^':  return Math.pow(ev(node.left), ev(node.right));
    case '==': return ev(node.left) === ev(node.right) ? 1 : 0;
    case '!=': return ev(node.left) !== ev(node.right) ? 1 : 0;
    case '<':  return ev(node.left) <  ev(node.right)  ? 1 : 0;
    case '>':  return ev(node.left) >  ev(node.right)  ? 1 : 0;
    case '<=': return ev(node.left) <= ev(node.right)  ? 1 : 0;
    case '>=': return ev(node.left) >= ev(node.right)  ? 1 : 0;
    case '?:': return ev(node.left) ? ev(node.then) : ev(node.els);
    case 'call': {
      const args = node.args.map(ev);
      switch (node.fn) {
        case 'min':  return Math.min(...args);
        case 'max':  return Math.max(...args);
        case 'rand': return args[0] + Math.floor(Math.random() * (args[1]-args[0]+1));
        default:     return 0;
      }
    }
    default: return 0;
  }
}

// Public formula API
export const D2Formula = {
  parse(src) {
    const lexer  = new D2Lexer(src);
    const parser = new D2Parser(lexer.tokens);
    return parser.parse();
  },
  eval(src, ctx = {}) {
    try { return evalD2Ast(this.parse(src), ctx); }
    catch(e) { console.warn('D2Formula eval error:', e.message); return 0; }
  },
  evalAst(ast, ctx = {}) { return evalD2Ast(ast, ctx); },
};

// ═══════════════════════════════════════════════════════════════════════════
// § 8  BINARY CHARSTAT PARSER  ←  d2gs113/D2GS/charstat.c
// ═══════════════════════════════════════════════════════════════════════════
export function parseD2BinaryCharStat(buffer) {
  // buffer: ArrayBuffer or Uint8Array of raw .d2s save data
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const bm = new BitMuncher(bytes);

  // stat section starts at offset 0x2FF+2 = 0x301
  bm.offset = 0x301 * 8;

  const charclass = bytes[0x28 + 2];
  const r = { charclass, str:0, ene:0, dex:0, vit:0, statpoint:0, skillpoint:0,
               currlife:0, maxlife:0, currmana:0, maxmana:0, currsta:0, maxsta:0,
               level:1, experience:0, gold1:0, gold2:0 };

  for (let bits = 0; bits < 54*8; ) {
    const save = bm.offset;
    const statid = bm.getBits(9); bits += 9;
    switch (statid) {
      case 0:  r.str       = bm.getBits(10); bits+=10; break;
      case 1:  r.ene       = bm.getBits(10); bits+=10; break;
      case 2:  r.dex       = bm.getBits(10); bits+=10; break;
      case 3:  r.vit       = bm.getBits(10); bits+=10; break;
      case 4:  r.statpoint = bm.getBits(10); bits+=10; break;
      case 5:  r.skillpoint= bm.getBits(8);  bits+=8;  break;
      case 6:  r.currlife  = bm.getBits(21)>>8; bits+=21; break;
      case 7:  r.maxlife   = bm.getBits(21)>>8; bits+=21; break;
      case 8:  r.currmana  = bm.getBits(21)>>8; bits+=21; break;
      case 9:  r.maxmana   = bm.getBits(21)>>8; bits+=21; break;
      case 10: r.currsta   = bm.getBits(21)>>8; bits+=21; break;
      case 11: r.maxsta    = bm.getBits(21)>>8; bits+=21; break;
      case 12: r.level     = bm.getBits(7);  bits+=7;  break;
      case 13: r.experience= bm.getBits(32); bits+=32; break;
      case 14: r.gold1     = bm.getBits(25); bits+=25; break;
      case 15: r.gold2     = bm.getBits(25); bits+=25; break;
      default: bm.offset = save; return r;  // terminator
    }
  }
  return r;
}

// ═══════════════════════════════════════════════════════════════════════════
// § 9  THEME SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
export const THEMES = {
  diablonet: {
    id:'diablonet', label:'Diabl0.net', emoji:'D0',
    palette: {
      bg:'#050202', bgTile:'#100806', wall:'#2a1610',
      floor:'#18100a', accent:'#8B0000', accentBright:'#FF5A1F',
      text:'#c8b06a', textDim:'#7a6840', textBright:'#FFD06A',
      ui:'#160a05', uiBorder:'#6b3a10', uiHighlight:'#9B3A16',
      hpBar:'#8B0000', mpBar:'#0A1C66', xpBar:'#5a3600',
      npcColor:'#D6A342', bossColor:'#B10F1B', lootColor:'#A45CFF',
    },
    fonts: { title:'Georgia, serif', ui:'Arial Narrow, sans-serif' },
    vignette: 0.58,
    ambientLight: '#261006',
    groundFog: true,
    particleColor: '#FF5A1F',
    soundTheme: 'diablonet',
    baseEngine: 'd2',
    absorbedModes: ['openDiablo2','devilutionX','hellfire','projectD2','d2rReimagined','d2gs'],
  },
  diablo2: {
    id:'diablo2', label:'Diablo II', emoji:'🔥',
    palette: {
      bg:'#0a0a0e', bgTile:'#111118', wall:'#2d2420',
      floor:'#1a1510', accent:'#8B0000', accentBright:'#FF4500',
      text:'#c8b06a', textDim:'#6a5a30', textBright:'#FFD700',
      ui:'#1c1009', uiBorder:'#5a3a10', uiHighlight:'#8B4513',
      hpBar:'#8B0000', mpBar:'#00008B', xpBar:'#4a3000',
      npcColor:'#DAA520', bossColor:'#9B111E', lootColor:'#9400D3',
    },
    fonts: { title:'Georgia, serif', ui:'Arial Narrow, sans-serif' },
    vignette: 0.5,
    ambientLight: '#2a1808',
    groundFog: true,
    particleColor: '#FF4500',
    soundTheme: 'd2',
  },
  diablo1: {
    id:'diablo1', label:'Diablo I', emoji:'👹',
    palette: {
      bg:'#050505', bgTile:'#0d0d0d', wall:'#252018',
      floor:'#151208', accent:'#6B0000', accentBright:'#CC3300',
      text:'#b8a05a', textDim:'#5a4a20', textBright:'#EEC900',
      ui:'#140804', uiBorder:'#4a2808', uiHighlight:'#6B3513',
      hpBar:'#6B0000', mpBar:'#000066', xpBar:'#3a2000',
      npcColor:'#C8A000', bossColor:'#800000', lootColor:'#7000AA',
    },
    fonts: { title:'Georgia, serif', ui:'Courier New, monospace' },
    vignette: 0.65,
    ambientLight: '#1a0a04',
    groundFog: true,
    particleColor: '#CC3300',
    soundTheme: 'd1',
  },
  hellfire: {
    id:'hellfire', label:'Hellfire', emoji:'🪓',
    palette: {
      bg:'#080408', bgTile:'#120810', wall:'#2d1428',
      floor:'#18080f', accent:'#6B006B', accentBright:'#CC00CC',
      text:'#c8a0c8', textDim:'#6a406a', textBright:'#FF99FF',
      ui:'#100008', uiBorder:'#5a0050', uiHighlight:'#8B005B',
      hpBar:'#8B0000', mpBar:'#4B0082', xpBar:'#3a0030',
      npcColor:'#DA70D6', bossColor:'#4B0082', lootColor:'#8B008B',
    },
    fonts: { title:'Georgia, serif', ui:'Arial Narrow, sans-serif' },
    vignette: 0.6,
    ambientLight: '#1a0412',
    groundFog: true,
    particleColor: '#CC00CC',
    soundTheme: 'hf',
  },
  starcraft: {
    id:'starcraft', label:'StarCraft', emoji:'🚀',
    palette: {
      bg:'#010510', bgTile:'#030a1c', wall:'#0a1428',
      floor:'#060d18', accent:'#005080', accentBright:'#00C8FF',
      text:'#80D0FF', textDim:'#305060', textBright:'#00FFFF',
      ui:'#020814', uiBorder:'#003850', uiHighlight:'#00506B',
      hpBar:'#006400', mpBar:'#0000CD', xpBar:'#003050',
      npcColor:'#00BFFF', bossColor:'#FF4500', lootColor:'#FFD700',
    },
    fonts: { title:'"Orbitron", "Arial Black", sans-serif', ui:'"Exo 2", Arial, sans-serif' },
    vignette: 0.4,
    ambientLight: '#010814',
    groundFog: false,
    particleColor: '#00C8FF',
    soundTheme: 'sc',
  },
  warcraft: {
    id:'warcraft', label:'WarCraft', emoji:'⚔️',
    palette: {
      bg:'#0a1008', bgTile:'#121c10', wall:'#2a3818',
      floor:'#141e0a', accent:'#B8860B', accentBright:'#FFD700',
      text:'#F0D060', textDim:'#706030', textBright:'#FFE44D',
      ui:'#0c1408', uiBorder:'#5a4010', uiHighlight:'#8B6914',
      hpBar:'#006400', mpBar:'#00008B', xpBar:'#4a3800',
      npcColor:'#FFD700', bossColor:'#8B0000', lootColor:'#9400D3',
    },
    fonts: { title:'"Cinzel", Georgia, serif', ui:'"Palatino Linotype", Palatino, serif' },
    vignette: 0.3,
    ambientLight: '#0a1408',
    groundFog: false,
    particleColor: '#FFD700',
    soundTheme: 'wc',
  },
};

export const DEFAULT_THEME = 'diablonet';

export function getTheme(id) { return THEMES[id] || THEMES[DEFAULT_THEME]; }

// ═══════════════════════════════════════════════════════════════════════════
// § 10  DT1 ISOMETRIC DECODER TABLES  ←  AbyssEngine dt1file/gfx_decode.go
// ═══════════════════════════════════════════════════════════════════════════
// RLE iso-tile decode tables (confirmed from AbyssEngine + OpenDiablo2)
export const DT1_XJUMP = [14,12,10,8,6,4,2,0, 2,4,6,8,10,12,14];
export const DT1_NBPIX = [4, 8,12,16,20,24,28,32,28,24,20,16,12, 8, 4];
// RLE encoding: b1=transparent skip count, b2=opaque pixel count
// (b1|b2)==0 → newline; directionOffsetMultiplier=8 (offsets in bits)
export const DCC_SIGNATURE = 0x74;
export const DCC_DIR_OFFSET_MULT = 8; // offsets stored in bits

// ═══════════════════════════════════════════════════════════════════════════
// § 11  COF FORMAT PARSER  ←  AbyssEngine pkg/fileformats/coffile/cof.go
// ═══════════════════════════════════════════════════════════════════════════
// COF = Component Object Format — describes animation layer composition
export const COF_NUM_HEADER_BYTES = 25; // 4 + 21 unknown
// Byte[0]=numLayers, [1]=framesPerDir, [2]=numDirs, [24]=speed
// Each layer record = 9 bytes
export const COF_LAYER_RECORD_SIZE = 9;

// Component layer names (HD/TR/LG/RA/LA/RH/LH/SH/S1-S8)
export const COF_LAYERS = ['HD','TR','LG','RA','LA','RH','LH','SH',
                            'S1','S2','S3','S4','S5','S6','S7','S8'];

// Animation mode codes → full names
export const COF_MODES = {
  DT:'Death',   NU:'Neutral', WL:'Walk',    GH:'GetHit',
  A1:'Attack1', A2:'Attack2', BL:'Block',   SC:'Special Cast',
  S1:'Skill1',  S2:'Skill2',  S3:'Skill3',  S4:'Skill4',
  DD:'Dead',    KB:'Knockback',SQ:'Sequence',RN:'Run',
};

export function parseCOFHeader(bytes) {
  // bytes: Uint8Array
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return {
    numLayers:    u8[0],
    framesPerDir: u8[1],
    numDirs:      u8[2],
    // bytes 3-23 unknown
    speed:        u8[24],
    // Layer records start at byte COF_NUM_HEADER_BYTES
    layerOffset:  COF_NUM_HEADER_BYTES,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// § 12  D2GS SERVER PROTOCOL  ←  d2gs109/sources/d2cs_d2gs_protocol.h
// ═══════════════════════════════════════════════════════════════════════════
export const D2GSPacket = {
  AUTHREQ:         0x10,  // D2CS→D2GS: auth request
  AUTHREPLY:       0x11,  // bidirectional
  SETGSINFO:       0x12,  // D2GS→D2CS: max games
  ECHOREQ:         0x13,  // D2CS→D2GS
  ECHOREPLY:       0x13,  // D2GS→D2CS
  CREATEGAMEREQ:   0x20,  // D2CS→D2GS
  CREATEGAMEREPLY: 0x20,  // D2GS→D2CS
  JOINGAMEREQ:     0x21,  // D2CS→D2GS
  JOINGAMEREPLY:   0x21,  // D2GS→D2CS
  UPDATEGAMEINFO:  0x22,  // D2GS→D2CS
  CLOSEGAME:       0x23,  // D2GS→D2CS
};
export const D2Difficulty = { NORMAL:0, NIGHTMARE:1, HELL:2 };
export const D2GameUpdateFlag = { UPDATE:0, ENTER:1, LEAVE:2 };
export const D2GSAuthResult = { SUCCEED:0x00, BAD_VERSION:0x01, BAD_CHECKSUM:0x02 };
export const D2GameResult   = { SUCCEED:0, FAILED:1 };

// ═══════════════════════════════════════════════════════════════════════════
// § 13  ABSORBED SOURCE MANIFEST
// ═══════════════════════════════════════════════════════════════════════════
export const D2_ABSORBED_SOURCE_MANIFEST = [
  {
    repo: 'diasurgical/devilutionX',
    local: 'devilutionX',
    files: ['Source/engine/random.cpp', 'Source/engine/path.cpp', 'Source/tables/playerdat.cpp'],
    absorbed: ['Borland LCG RNG', 'A* path direction/cost constants', 'D1/Hellfire class stat model'],
  },
  {
    repo: 'OpenDiablo2/OpenDiablo2',
    local: 'OpenDiablo2/OpenDiablo2',
    files: [
      'd2common/d2calculation/*',
      'd2common/d2datautils/bitmuncher.go',
      'd2core/d2records/*',
      'd2core/d2map/d2mapgen/act1_overworld.go',
    ],
    absorbed: ['D2 formula parser', 'BitMuncher', 'CharStats/XP records', 'item ratios', 'hirelings', 'missiles', 'stamp map generation'],
  },
  {
    repo: 'AbyssEngine/AbyssEngine',
    local: 'AbyssEngine/AbyssEngine',
    files: ['pkg/fileformats/coffile/cof.go', 'pkg/fileformats/dccfile/dcc.go', 'pkg/fileformats/dt1file/gfx_decode.go'],
    absorbed: ['COF layer metadata', 'DCC header constants', 'DT1 isometric/RLE decode tables'],
  },
  {
    repo: 'pvpgn/d2gs109 + d2gs113',
    local: 'server/d2gs109, server/d2gs113',
    files: ['sources/d2cs_d2gs_protocol.h', 'd2gs/D2GS/charstat.c'],
    absorbed: ['D2GS packet catalog', 'binary D2 save stat parser'],
  },
  {
    repo: 'pvpgn/diablo-hellfire',
    local: 'diablo-hellfire',
    files: ['MONSTDAT.CPP', 'ITEMDAT.CPP', 'SPELLDAT.CPP', 'PLAYER.CPP', 'DRLG_L1-L6.CPP', 'QUESTS.CPP'],
    absorbed: ['Hellfire monsters', 'Crypt/Nest styles', 'Monk/Bard/Barbarian classes', 'runes/oils/quests'],
  },
  {
    repo: 'Project-Diablo-2 / D2R Reimagined',
    local: 'Project D2 and D2R data references',
    files: ['loot filter conventions', 'affix/stat schemas', 'terror-zone style modifiers'],
    absorbed: ['loot filtering', 'corruption-style item mutation', 'D2R-inspired affix/zone extension hooks'],
  },
];

export function createCrypticRealm8Core(seed = 0xC0DEFACE) {
  D2RNG.setSeed(seed >>> 0);
  return {
    name: 'Cryptic Realm 8.0 Diablo Abyss Core',
    seed: seed >>> 0,
    defaultTheme: DEFAULT_THEME,
    themes: THEMES,
    rng: D2RNG,
    formula: D2Formula,
    heroClasses: HeroClass,
    classAttrs: CLASS_ATTRS,
    xpTable: XP_TABLE,
    packets: D2GSPacket,
    manifest: D2_ABSORBED_SOURCE_MANIFEST,
  };
}
