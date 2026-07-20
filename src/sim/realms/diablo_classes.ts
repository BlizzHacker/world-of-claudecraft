import type { PlayerClass } from '../types';

export type DiabloLineage = 'Diablo I' | 'Diablo II' | 'Diablo III' | 'Diablo IV' | 'Diablo Immortal';

export interface DiabloRealmClass {
  readonly id: string;
  readonly name: string;
  readonly lineage: DiabloLineage;
  /** Mechanical class used by the existing combat engine. */
  readonly engineClass: PlayerClass;
  readonly factionSide: 'sanctuary' | 'hell' | 'surprise';
}

const entry = (
  lineage: DiabloLineage,
  name: string,
  engineClass: PlayerClass,
  factionSide?: DiabloRealmClass['factionSide'],
): DiabloRealmClass => ({
  id: `${lineage.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name,
  lineage,
  engineClass,
  factionSide:
    factionSide ??
    (/necromancer|witch doctor|warlock/i.test(name)
      ? 'hell'
      : /blood knight|tempest|demon hunter/i.test(name)
        ? 'surprise'
        : 'sanctuary'),
});

export const INFERNAL_DIABLO_CLASSES: readonly DiabloRealmClass[] = [
  entry('Diablo I', 'Warrior', 'warrior'), entry('Diablo I', 'Rogue', 'rogue'), entry('Diablo I', 'Sorcerer', 'mage'),
  entry('Diablo II', 'Amazon', 'hunter'), entry('Diablo II', 'Barbarian', 'warrior'), entry('Diablo II', 'Necromancer', 'warlock'),
  entry('Diablo II', 'Paladin', 'paladin'), entry('Diablo II', 'Sorceress', 'mage'), entry('Diablo II', 'Druid', 'druid'), entry('Diablo II', 'Assassin', 'rogue'),
  entry('Diablo III', 'Barbarian', 'warrior'), entry('Diablo III', 'Demon Hunter', 'hunter'), entry('Diablo III', 'Monk', 'shaman'),
  entry('Diablo III', 'Wizard', 'mage'), entry('Diablo III', 'Witch Doctor', 'warlock'), entry('Diablo III', 'Crusader', 'paladin'), entry('Diablo III', 'Necromancer', 'warlock'),
  entry('Diablo IV', 'Barbarian', 'warrior'), entry('Diablo IV', 'Druid', 'druid'), entry('Diablo IV', 'Necromancer', 'warlock'),
  entry('Diablo IV', 'Rogue', 'rogue'), entry('Diablo IV', 'Sorcerer', 'mage'), entry('Diablo IV', 'Spiritborn', 'shaman'),
  entry('Diablo IV', 'Paladin', 'paladin'), entry('Diablo IV', 'Warlock', 'warlock'),
  entry('Diablo Immortal', 'Barbarian', 'warrior'), entry('Diablo Immortal', 'Blood Knight', 'paladin'), entry('Diablo Immortal', 'Crusader', 'paladin'),
  entry('Diablo Immortal', 'Demon Hunter', 'hunter'), entry('Diablo Immortal', 'Druid', 'druid'), entry('Diablo Immortal', 'Monk', 'shaman'),
  entry('Diablo Immortal', 'Necromancer', 'warlock'), entry('Diablo Immortal', 'Tempest', 'shaman'), entry('Diablo Immortal', 'Warlock', 'warlock'), entry('Diablo Immortal', 'Wizard', 'mage'),
];

export function diabloClassesForRealm(realm: string): readonly DiabloRealmClass[] {
  return realm.toLowerCase().replace(/[^a-z0-9]+/g, '') === 'infernal'
    ? INFERNAL_DIABLO_CLASSES
    : [];
}

/** One iconic ability drawn from the class's real Diablo skill kit. */
export interface DiabloSkill {
  readonly name: string;
  readonly source: DiabloLineage;
  readonly desc: string;
}

// The signature skills per canonical Diablo hero class, taken from the real
// games (keyed by the canonical roster name; Sorcerer and Sorceress share one
// card, "Sorcerer / Sorceress"). Data-as-code, English source strings like the
// rest of the realm-class presentation content.
const DIABLO_SIGNATURE_SKILLS: Readonly<Record<string, readonly DiabloSkill[]>> = {
  Warrior: [
    { name: 'Bash', source: 'Diablo I', desc: 'A heavy overhead strike that knocks the target back.' },
    { name: 'Cleave', source: 'Diablo I', desc: 'A wide swing that cuts every foe in front of you.' },
    { name: 'Rend', source: 'Diablo I', desc: 'Opens a bleeding wound that saps health over time.' },
    { name: 'War Cry', source: 'Diablo I', desc: 'A battle shout that hardens your own resolve and armor.' },
  ],
  Rogue: [
    { name: 'Puncture', source: 'Diablo IV', desc: 'Throws blades that pierce and slow the first enemies hit.' },
    { name: 'Twisting Blades', source: 'Diablo IV', desc: 'Impales a foe, then recalls the blades through everything behind.' },
    { name: 'Rapid Fire', source: 'Diablo IV', desc: 'Looses a rapid volley of arrows at a single target.' },
    { name: 'Shadow Step', source: 'Diablo IV', desc: 'Vanishes and reappears behind the target for a lethal strike.' },
  ],
  'Sorcerer / Sorceress': [
    { name: 'Frozen Orb', source: 'Diablo II', desc: 'A slow-drifting orb that sprays a ring of freezing shards.' },
    { name: 'Fire Ball', source: 'Diablo II', desc: 'Hurls a bolt of fire that bursts on impact.' },
    { name: 'Chain Lightning', source: 'Diablo II', desc: 'A bolt that leaps between clustered enemies.' },
    { name: 'Teleport', source: 'Diablo II', desc: 'Blinks instantly to a chosen point, ignoring what lies between.' },
  ],
  Amazon: [
    { name: 'Jab', source: 'Diablo II', desc: 'A flurry of rapid spear thrusts at a single foe.' },
    { name: 'Lightning Fury', source: 'Diablo II', desc: 'Hurls a javelin that splits into forking lightning.' },
    { name: 'Charged Strike', source: 'Diablo II', desc: 'A melee stab that releases charged bolts on hit.' },
    { name: 'Valkyrie', source: 'Diablo II', desc: 'Summons a spectral warrior-maiden to fight at your side.' },
  ],
  Barbarian: [
    { name: 'Whirlwind', source: 'Diablo II', desc: 'Spins through a crowd, striking every enemy in reach.' },
    { name: 'Leap', source: 'Diablo III', desc: 'Vaults across the battlefield and cracks the ground on landing.' },
    { name: 'Battle Cry', source: 'Diablo IV', desc: 'A roar that steels allies and lowers enemy defenses.' },
    { name: 'Berserk', source: 'Diablo II', desc: 'Trades all defense for a devastating magic-damage blow.' },
  ],
  Necromancer: [
    { name: 'Raise Skeleton', source: 'Diablo II', desc: 'Raises the fallen as skeletal warriors under your command.' },
    { name: 'Corpse Explosion', source: 'Diablo II', desc: 'Detonates a corpse for area damage that chains through packs.' },
    { name: 'Bone Spear', source: 'Diablo II', desc: 'A piercing shard of bone that runs foes through in a line.' },
    { name: 'Iron Maiden', source: 'Diablo II', desc: 'A curse that reflects a share of the enemy attacks back at them.' },
  ],
  Paladin: [
    { name: 'Zeal', source: 'Diablo II', desc: 'A rapid chain of holy strikes across nearby enemies.' },
    { name: 'Fanaticism', source: 'Diablo II', desc: 'An aura that boosts attack speed and damage for you and allies.' },
    { name: 'Blessed Hammer', source: 'Diablo II', desc: 'Spiraling hammers of light that scythe through the undead.' },
    { name: 'Holy Shield', source: 'Diablo II', desc: 'Blesses the shield, raising block and adding smite damage.' },
  ],
  Druid: [
    { name: 'Werebear', source: 'Diablo II', desc: 'Shapeshifts into a towering bear with brutal maul attacks.' },
    { name: 'Tornado', source: 'Diablo II', desc: 'Unleashes a wandering cyclone that shreds anything it touches.' },
    { name: 'Summon Grizzly', source: 'Diablo II', desc: 'Calls a great spirit bear to tank and maul your foes.' },
    { name: 'Hurricane', source: 'Diablo II', desc: 'Wraps you in a freezing gale that chills all nearby enemies.' },
  ],
  Assassin: [
    { name: 'Dragon Talon', source: 'Diablo II', desc: 'A rising chain of martial kicks that finish charged foes.' },
    { name: 'Blade Fury', source: 'Diablo II', desc: 'Flings whirling blades at range from your bound weapons.' },
    { name: 'Lightning Sentry', source: 'Diablo II', desc: 'Lays a trap turret that arcs lightning at approaching enemies.' },
    { name: 'Shadow Master', source: 'Diablo II', desc: 'Summons a mirror-self that mimics your full skill kit.' },
  ],
  'Demon Hunter': [
    { name: 'Hungering Arrow', source: 'Diablo III', desc: 'An arrow that pierces and ricochets, hunting new targets.' },
    { name: 'Multishot', source: 'Diablo III', desc: 'Sprays a fan of bolts across a wide arc.' },
    { name: 'Vault', source: 'Diablo III', desc: 'A tumbling leap that repositions out of danger in an instant.' },
    { name: 'Rain of Vengeance', source: 'Diablo III', desc: 'Calls down a storm of arrows over a wide killing field.' },
  ],
  Monk: [
    { name: 'Fists of Thunder', source: 'Diablo III', desc: 'A rushing three-hit combo that teleports you to the target.' },
    { name: 'Seven-Sided Strike', source: 'Diablo III', desc: 'Dashes between seven foes, striking each in a blur.' },
    { name: 'Cyclone Strike', source: 'Diablo III', desc: 'Pulls surrounding enemies inward on a gust of spirit.' },
    { name: 'Mantra of Conviction', source: 'Diablo III', desc: 'A chant that makes nearby enemies take more damage.' },
  ],
  Wizard: [
    { name: 'Arcane Orb', source: 'Diablo III', desc: 'Lobs an unstable orb that erupts in arcane force.' },
    { name: 'Magic Missile', source: 'Diablo III', desc: 'Fires fast bolts of raw magic at the target.' },
    { name: 'Teleport', source: 'Diablo III', desc: 'Folds space to blink a short distance instantly.' },
    { name: 'Archon', source: 'Diablo III', desc: 'Becomes a being of pure arcane energy with empowered spells.' },
  ],
  'Witch Doctor': [
    { name: 'Poison Dart', source: 'Diablo III', desc: 'A blowgun dart that poisons the target over time.' },
    { name: 'Zombie Charger', source: 'Diablo III', desc: 'Sends a wall of rotting zombies clawing forward.' },
    { name: 'Summon Gargantuan', source: 'Diablo III', desc: 'Raises a hulking voodoo brute to smash your enemies.' },
    { name: 'Spirit Walk', source: 'Diablo III', desc: 'Slips into the spirit realm, untouchable for a few seconds.' },
  ],
  Crusader: [
    { name: 'Blessed Hammer', source: 'Diablo III', desc: 'Orbiting hammers of faith that batter surrounding foes.' },
    { name: 'Punish', source: 'Diablo III', desc: 'A shield-and-flail strike that builds holy wrath.' },
    { name: 'Falling Sword', source: 'Diablo III', desc: 'Leaps skyward and crashes down in a burst of light.' },
    { name: 'Laws of Valor', source: 'Diablo III', desc: 'A war-law that raises attack speed for the whole party.' },
  ],
  Spiritborn: [
    { name: 'Quill Volley', source: 'Diablo IV', desc: 'Fires a spread of spirit quills that can rebound on foes.' },
    { name: 'Rushing Claw', source: 'Diablo IV', desc: 'Dashes with raking claws, striking through a line of enemies.' },
    { name: 'Crushing Hand', source: 'Diablo IV', desc: 'Summons a giant spectral fist to slam an area.' },
    { name: 'The Devourer', source: 'Diablo IV', desc: 'A spirit-hall ultimate that unleashes a devouring swarm.' },
  ],
  Warlock: [
    { name: 'Bone Spirit', source: 'Diablo II', desc: 'A homing skull of bone that seeks out a distant foe.' },
    { name: 'Poison Nova', source: 'Diablo II', desc: 'Erupts a ring of venom that poisons everything around you.' },
    { name: 'Summon Fiend', source: 'Diablo Immortal', desc: 'Binds a lesser demon to fight under your will.' },
    { name: 'Life Tap', source: 'Diablo II', desc: 'A curse that leeches enemy life back to whoever strikes it.' },
  ],
  'Blood Knight': [
    { name: 'Blood Nova', source: 'Diablo Immortal', desc: 'Bursts stored blood outward in a crimson shockwave.' },
    { name: 'Skewer', source: 'Diablo Immortal', desc: 'Lunges and impales foes on a spear of hardened blood.' },
    { name: 'Siphon Blood', source: 'Diablo Immortal', desc: 'Draws life from enemies to heal and empower yourself.' },
    { name: 'Sanguination', source: 'Diablo Immortal', desc: 'Sheaths you in blood, punishing attackers who draw near.' },
  ],
  Tempest: [
    { name: 'Flurry', source: 'Diablo Immortal', desc: 'A rapid trident combo that builds wind charge.' },
    { name: 'Gale Slash', source: 'Diablo Immortal', desc: 'A crescent of cutting wind sent across the battlefield.' },
    { name: 'Tempest Rush', source: 'Diablo Immortal', desc: 'Charges forward as a living gale, sweeping foes along.' },
    { name: 'Boundless Squall', source: 'Diablo Immortal', desc: 'Anchors a storm that shocks enemies caught inside it.' },
  ],
};

/** The signature Diablo skills for a canonical hero class name (empty if none). */
export function diabloSignatureSkills(canonicalName: string): readonly DiabloSkill[] {
  return DIABLO_SIGNATURE_SKILLS[canonicalName] ?? [];
}
