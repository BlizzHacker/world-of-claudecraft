import type { PlayerClass } from '../types';

export type InfernalLegend =
  | 'First Descent'
  | 'The Dark Exile'
  | 'The Reckoning'
  | 'The Hollow Age'
  | 'The Sundering';

export interface InfernalHeroClass {
  readonly id: string;
  readonly name: string;
  readonly lineage: InfernalLegend;
  /** Mechanical class used by the existing combat engine. */
  readonly engineClass: PlayerClass;
  readonly factionSide: 'sanctuary' | 'hell' | 'surprise';
}

const entry = (
  lineage: InfernalLegend,
  name: string,
  engineClass: PlayerClass,
  factionSide?: InfernalHeroClass['factionSide'],
): InfernalHeroClass => ({
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

export const INFERNAL_HERO_CLASSES: readonly InfernalHeroClass[] = [
  entry('First Descent', 'Warrior', 'warrior'),
  entry('First Descent', 'Rogue', 'rogue'),
  entry('First Descent', 'Sorcerer', 'mage'),
  entry('The Dark Exile', 'Amazon', 'hunter'),
  entry('The Dark Exile', 'Barbarian', 'warrior'),
  entry('The Dark Exile', 'Necromancer', 'warlock'),
  entry('The Dark Exile', 'Paladin', 'paladin'),
  entry('The Dark Exile', 'Sorceress', 'mage'),
  entry('The Dark Exile', 'Druid', 'druid'),
  entry('The Dark Exile', 'Assassin', 'rogue'),
  entry('The Reckoning', 'Barbarian', 'warrior'),
  entry('The Reckoning', 'Demon Hunter', 'hunter'),
  entry('The Reckoning', 'Monk', 'shaman'),
  entry('The Reckoning', 'Wizard', 'mage'),
  entry('The Reckoning', 'Witch Doctor', 'warlock'),
  entry('The Reckoning', 'Crusader', 'paladin'),
  entry('The Reckoning', 'Necromancer', 'warlock'),
  entry('The Hollow Age', 'Barbarian', 'warrior'),
  entry('The Hollow Age', 'Druid', 'druid'),
  entry('The Hollow Age', 'Necromancer', 'warlock'),
  entry('The Hollow Age', 'Rogue', 'rogue'),
  entry('The Hollow Age', 'Sorcerer', 'mage'),
  entry('The Hollow Age', 'Spiritborn', 'shaman'),
  entry('The Hollow Age', 'Paladin', 'paladin'),
  entry('The Hollow Age', 'Warlock', 'warlock'),
  entry('The Sundering', 'Barbarian', 'warrior'),
  entry('The Sundering', 'Blood Knight', 'paladin'),
  entry('The Sundering', 'Crusader', 'paladin'),
  entry('The Sundering', 'Demon Hunter', 'hunter'),
  entry('The Sundering', 'Druid', 'druid'),
  entry('The Sundering', 'Monk', 'shaman'),
  entry('The Sundering', 'Necromancer', 'warlock'),
  entry('The Sundering', 'Tempest', 'shaman'),
  entry('The Sundering', 'Warlock', 'warlock'),
  entry('The Sundering', 'Wizard', 'mage'),
];

export function infernalHeroClassesForRealm(realm: string): readonly InfernalHeroClass[] {
  return realm.toLowerCase().replace(/[^a-z0-9]+/g, '') === 'infernal' ? INFERNAL_HERO_CLASSES : [];
}

/** One iconic ability drawn from the class signature skill kit. */
export interface SignatureSkill {
  readonly name: string;
  readonly source: InfernalLegend;
  readonly desc: string;
}

// The signature skills per canonical hero class, taken from the real
// games (keyed by the canonical roster name; Sorcerer and Sorceress share one
// card, "Sorcerer / Sorceress"). Data-as-code, English source strings like the
// rest of the realm-class presentation content.
const INFERNAL_SIGNATURE_SKILLS: Readonly<Record<string, readonly SignatureSkill[]>> = {
  Warrior: [
    {
      name: 'Bash',
      source: 'First Descent',
      desc: 'A heavy overhead strike that knocks the target back.',
    },
    {
      name: 'Cleave',
      source: 'First Descent',
      desc: 'A wide swing that cuts every foe in front of you.',
    },
    {
      name: 'Rend',
      source: 'First Descent',
      desc: 'Opens a bleeding wound that saps health over time.',
    },
    {
      name: 'War Cry',
      source: 'First Descent',
      desc: 'A battle shout that hardens your own resolve and armor.',
    },
  ],
  Rogue: [
    {
      name: 'Puncture',
      source: 'The Hollow Age',
      desc: 'Throws blades that pierce and slow the first enemies hit.',
    },
    {
      name: 'Twisting Blades',
      source: 'The Hollow Age',
      desc: 'Impales a foe, then recalls the blades through everything behind.',
    },
    {
      name: 'Rapid Fire',
      source: 'The Hollow Age',
      desc: 'Looses a rapid volley of arrows at a single target.',
    },
    {
      name: 'Shadow Step',
      source: 'The Hollow Age',
      desc: 'Vanishes and reappears behind the target for a lethal strike.',
    },
  ],
  'Sorcerer / Sorceress': [
    {
      name: 'Frozen Orb',
      source: 'The Dark Exile',
      desc: 'A slow-drifting orb that sprays a ring of freezing shards.',
    },
    {
      name: 'Fire Ball',
      source: 'The Dark Exile',
      desc: 'Hurls a bolt of fire that bursts on impact.',
    },
    {
      name: 'Chain Lightning',
      source: 'The Dark Exile',
      desc: 'A bolt that leaps between clustered enemies.',
    },
    {
      name: 'Teleport',
      source: 'The Dark Exile',
      desc: 'Blinks instantly to a chosen point, ignoring what lies between.',
    },
  ],
  Amazon: [
    {
      name: 'Jab',
      source: 'The Dark Exile',
      desc: 'A flurry of rapid spear thrusts at a single foe.',
    },
    {
      name: 'Lightning Fury',
      source: 'The Dark Exile',
      desc: 'Hurls a javelin that splits into forking lightning.',
    },
    {
      name: 'Charged Strike',
      source: 'The Dark Exile',
      desc: 'A melee stab that releases charged bolts on hit.',
    },
    {
      name: 'Valkyrie',
      source: 'The Dark Exile',
      desc: 'Summons a spectral warrior-maiden to fight at your side.',
    },
  ],
  Barbarian: [
    {
      name: 'Whirlwind',
      source: 'The Dark Exile',
      desc: 'Spins through a crowd, striking every enemy in reach.',
    },
    {
      name: 'Leap',
      source: 'The Reckoning',
      desc: 'Vaults across the battlefield and cracks the ground on landing.',
    },
    {
      name: 'Battle Cry',
      source: 'The Hollow Age',
      desc: 'A roar that steels allies and lowers enemy defenses.',
    },
    {
      name: 'Berserk',
      source: 'The Dark Exile',
      desc: 'Trades all defense for a devastating magic-damage blow.',
    },
  ],
  Necromancer: [
    {
      name: 'Raise Skeleton',
      source: 'The Dark Exile',
      desc: 'Raises the fallen as skeletal warriors under your command.',
    },
    {
      name: 'Corpse Explosion',
      source: 'The Dark Exile',
      desc: 'Detonates a corpse for area damage that chains through packs.',
    },
    {
      name: 'Bone Spear',
      source: 'The Dark Exile',
      desc: 'A piercing shard of bone that runs foes through in a line.',
    },
    {
      name: 'Iron Maiden',
      source: 'The Dark Exile',
      desc: 'A curse that reflects a share of the enemy attacks back at them.',
    },
  ],
  Paladin: [
    {
      name: 'Zeal',
      source: 'The Dark Exile',
      desc: 'A rapid chain of holy strikes across nearby enemies.',
    },
    {
      name: 'Fanaticism',
      source: 'The Dark Exile',
      desc: 'An aura that boosts attack speed and damage for you and allies.',
    },
    {
      name: 'Blessed Hammer',
      source: 'The Dark Exile',
      desc: 'Spiraling hammers of light that scythe through the undead.',
    },
    {
      name: 'Holy Shield',
      source: 'The Dark Exile',
      desc: 'Blesses the shield, raising block and adding smite damage.',
    },
  ],
  Druid: [
    {
      name: 'Werebear',
      source: 'The Dark Exile',
      desc: 'Shapeshifts into a towering bear with brutal maul attacks.',
    },
    {
      name: 'Tornado',
      source: 'The Dark Exile',
      desc: 'Unleashes a wandering cyclone that shreds anything it touches.',
    },
    {
      name: 'Summon Grizzly',
      source: 'The Dark Exile',
      desc: 'Calls a great spirit bear to tank and maul your foes.',
    },
    {
      name: 'Hurricane',
      source: 'The Dark Exile',
      desc: 'Wraps you in a freezing gale that chills all nearby enemies.',
    },
  ],
  Assassin: [
    {
      name: 'Dragon Talon',
      source: 'The Dark Exile',
      desc: 'A rising chain of martial kicks that finish charged foes.',
    },
    {
      name: 'Blade Fury',
      source: 'The Dark Exile',
      desc: 'Flings whirling blades at range from your bound weapons.',
    },
    {
      name: 'Lightning Sentry',
      source: 'The Dark Exile',
      desc: 'Lays a trap turret that arcs lightning at approaching enemies.',
    },
    {
      name: 'Shadow Master',
      source: 'The Dark Exile',
      desc: 'Summons a mirror-self that mimics your full skill kit.',
    },
  ],
  'Demon Hunter': [
    {
      name: 'Hungering Arrow',
      source: 'The Reckoning',
      desc: 'An arrow that pierces and ricochets, hunting new targets.',
    },
    {
      name: 'Multishot',
      source: 'The Reckoning',
      desc: 'Sprays a fan of bolts across a wide arc.',
    },
    {
      name: 'Vault',
      source: 'The Reckoning',
      desc: 'A tumbling leap that repositions out of danger in an instant.',
    },
    {
      name: 'Rain of Vengeance',
      source: 'The Reckoning',
      desc: 'Calls down a storm of arrows over a wide killing field.',
    },
  ],
  Monk: [
    {
      name: 'Fists of Thunder',
      source: 'The Reckoning',
      desc: 'A rushing three-hit combo that teleports you to the target.',
    },
    {
      name: 'Seven-Sided Strike',
      source: 'The Reckoning',
      desc: 'Dashes between seven foes, striking each in a blur.',
    },
    {
      name: 'Cyclone Strike',
      source: 'The Reckoning',
      desc: 'Pulls surrounding enemies inward on a gust of spirit.',
    },
    {
      name: 'Mantra of Conviction',
      source: 'The Reckoning',
      desc: 'A chant that makes nearby enemies take more damage.',
    },
  ],
  Wizard: [
    {
      name: 'Arcane Orb',
      source: 'The Reckoning',
      desc: 'Lobs an unstable orb that erupts in arcane force.',
    },
    {
      name: 'Magic Missile',
      source: 'The Reckoning',
      desc: 'Fires fast bolts of raw magic at the target.',
    },
    {
      name: 'Teleport',
      source: 'The Reckoning',
      desc: 'Folds space to blink a short distance instantly.',
    },
    {
      name: 'Archon',
      source: 'The Reckoning',
      desc: 'Becomes a being of pure arcane energy with empowered spells.',
    },
  ],
  'Witch Doctor': [
    {
      name: 'Poison Dart',
      source: 'The Reckoning',
      desc: 'A blowgun dart that poisons the target over time.',
    },
    {
      name: 'Zombie Charger',
      source: 'The Reckoning',
      desc: 'Sends a wall of rotting zombies clawing forward.',
    },
    {
      name: 'Summon Gargantuan',
      source: 'The Reckoning',
      desc: 'Raises a hulking voodoo brute to smash your enemies.',
    },
    {
      name: 'Spirit Walk',
      source: 'The Reckoning',
      desc: 'Slips into the spirit realm, untouchable for a few seconds.',
    },
  ],
  Crusader: [
    {
      name: 'Blessed Hammer',
      source: 'The Reckoning',
      desc: 'Orbiting hammers of faith that batter surrounding foes.',
    },
    {
      name: 'Punish',
      source: 'The Reckoning',
      desc: 'A shield-and-flail strike that builds holy wrath.',
    },
    {
      name: 'Falling Sword',
      source: 'The Reckoning',
      desc: 'Leaps skyward and crashes down in a burst of light.',
    },
    {
      name: 'Laws of Valor',
      source: 'The Reckoning',
      desc: 'A war-law that raises attack speed for the whole party.',
    },
  ],
  Spiritborn: [
    {
      name: 'Quill Volley',
      source: 'The Hollow Age',
      desc: 'Fires a spread of spirit quills that can rebound on foes.',
    },
    {
      name: 'Rushing Claw',
      source: 'The Hollow Age',
      desc: 'Dashes with raking claws, striking through a line of enemies.',
    },
    {
      name: 'Crushing Hand',
      source: 'The Hollow Age',
      desc: 'Summons a giant spectral fist to slam an area.',
    },
    {
      name: 'The Devourer',
      source: 'The Hollow Age',
      desc: 'A spirit-hall ultimate that unleashes a devouring swarm.',
    },
  ],
  Warlock: [
    {
      name: 'Bone Spirit',
      source: 'The Dark Exile',
      desc: 'A homing skull of bone that seeks out a distant foe.',
    },
    {
      name: 'Poison Nova',
      source: 'The Dark Exile',
      desc: 'Erupts a ring of venom that poisons everything around you.',
    },
    {
      name: 'Summon Fiend',
      source: 'The Sundering',
      desc: 'Binds a lesser demon to fight under your will.',
    },
    {
      name: 'Life Tap',
      source: 'The Dark Exile',
      desc: 'A curse that leeches enemy life back to whoever strikes it.',
    },
  ],
  'Blood Knight': [
    {
      name: 'Blood Nova',
      source: 'The Sundering',
      desc: 'Bursts stored blood outward in a crimson shockwave.',
    },
    {
      name: 'Skewer',
      source: 'The Sundering',
      desc: 'Lunges and impales foes on a spear of hardened blood.',
    },
    {
      name: 'Siphon Blood',
      source: 'The Sundering',
      desc: 'Draws life from enemies to heal and empower yourself.',
    },
    {
      name: 'Sanguination',
      source: 'The Sundering',
      desc: 'Sheaths you in blood, punishing attackers who draw near.',
    },
  ],
  Tempest: [
    {
      name: 'Flurry',
      source: 'The Sundering',
      desc: 'A rapid trident combo that builds wind charge.',
    },
    {
      name: 'Gale Slash',
      source: 'The Sundering',
      desc: 'A crescent of cutting wind sent across the battlefield.',
    },
    {
      name: 'Tempest Rush',
      source: 'The Sundering',
      desc: 'Charges forward as a living gale, sweeping foes along.',
    },
    {
      name: 'Boundless Squall',
      source: 'The Sundering',
      desc: 'Anchors a storm that shocks enemies caught inside it.',
    },
  ],
};

/** The signature skills for a canonical hero class name (empty if none). */
export function signatureSkillsFor(canonicalName: string): readonly SignatureSkill[] {
  return INFERNAL_SIGNATURE_SKILLS[canonicalName] ?? [];
}
