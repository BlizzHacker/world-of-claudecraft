import {
  type DiabloSkill,
  diabloClassesForRealm,
  diabloSignatureSkills,
} from '../../sim/realms/diablo_classes';
import { factionForRealmClass } from '../../sim/realms/factions';
import type { RealmClassSkin, RealmContent, RealmId, RealmRole } from '../../sim/realms/types';
import type { PlayerClass } from '../../sim/types';
import { firstRealmVisualOverride } from './realm_visual_overrides';

export const PLAYER_CLASS_ORDER: readonly PlayerClass[] = [
  'warrior',
  'paladin',
  'hunter',
  'rogue',
  'priest',
  'shaman',
  'mage',
  'warlock',
  'druid',
];

export interface RealmClassPresentation {
  baseClass: PlayerClass;
  name: string;
  faction: string;
  lore: string;
  color: string;
  role: RealmRole;
  assetStatus: RealmClassAssetStatus;
  assetStatusLabel: string;
  assetIssue?: string;
  assetUrl?: string;
  assetName?: string;
  assetAnimated?: boolean;
  source?: RealmClassSkin;
}

export interface InfernalDiabloClassPresentation extends RealmClassPresentation {
  diabloId: string;
  factionSide: 'sanctuary' | 'hell';
  /** Real Diablo skills for this class, shown as its signature abilities. */
  signatureSkills: readonly DiabloSkill[];
}

export type RealmClassAssetStatus = 'ready' | 'preview' | 'comingSoon';

type SkinBinding = Partial<Record<string, { baseClass: PlayerClass; faction: string }>>;
type PresentationSeed = Pick<
  RealmClassPresentation,
  'name' | 'faction' | 'role' | 'lore' | 'color'
>;
type RealmClassAsset = Pick<
  RealmClassPresentation,
  'assetUrl' | 'assetName' | 'assetAnimated' | 'assetStatus' | 'assetStatusLabel' | 'assetIssue'
>;

const ROLE_BY_CLASS: Record<PlayerClass, RealmRole> = {
  warrior: 'Tank',
  paladin: 'Tank',
  hunter: 'DPS',
  rogue: 'Assassin',
  priest: 'Healer',
  shaman: 'Support',
  mage: 'DPS',
  warlock: 'Summoner',
  druid: 'Support',
};

const CLASS_COLORS: Record<PlayerClass, string> = {
  warrior: '#c79c6e',
  paladin: '#f58cba',
  hunter: '#abd473',
  rogue: '#fff569',
  priest: '#ffffff',
  shaman: '#0070de',
  mage: '#69ccf0',
  warlock: '#9482c9',
  druid: '#ff7d0a',
};

const SKIN_BINDINGS: Partial<Record<RealmId, SkinBinding>> = {
  crypticrealm: {
    gravecaller: { baseClass: 'warlock', faction: 'Gravebound' },
    runewarden: { baseClass: 'warrior', faction: 'Rune Court' },
    cipherblade: { baseClass: 'rogue', faction: 'Ciphered' },
    oracle: { baseClass: 'priest', faction: 'Rune Court' },
    voidseer: { baseClass: 'mage', faction: 'Voidbound' },
  },
  infernal: {
    boneherald: { baseClass: 'warlock', faction: 'Ashen Court' },
    emberwitch: { baseClass: 'mage', faction: 'Burning Hells' },
    shadowblade: { baseClass: 'rogue', faction: 'Abyssal Legion' },
    ironwarden: { baseClass: 'warrior', faction: 'Abyssal Legion' },
  },
  classic: {
    steelcrusader: { baseClass: 'paladin', faction: 'Alliance' },
    voidarcher: { baseClass: 'hunter', faction: 'Horde' },
    warlock: { baseClass: 'warlock', faction: 'Horde' },
    beasttamer: { baseClass: 'druid', faction: 'Horde' },
    chronomancer: { baseClass: 'mage', faction: 'Alliance' },
  },
  dominion: {
    vanguard: { baseClass: 'warrior', faction: 'Human Dominion' },
    ghostsniper: { baseClass: 'hunter', faction: 'Human Dominion' },
    fieldmedic: { baseClass: 'priest', faction: 'Frontier Corps' },
    combatengineer: { baseClass: 'shaman', faction: 'Frontier Corps' },
    psionicoperative: { baseClass: 'mage', faction: 'Psionic Directorate' },
  },
  arcane: {
    voidwalker: { baseClass: 'mage', faction: 'Voidborn' },
    crystalsmith: { baseClass: 'shaman', faction: 'Crystal Concord' },
    portalkeeper: { baseClass: 'priest', faction: 'Crystal Concord' },
    starguard: { baseClass: 'paladin', faction: 'Star Court' },
    riftblade: { baseClass: 'rogue', faction: 'Voidborn' },
  },
  arcadevoid: {
    voidmarine: { baseClass: 'warrior', faction: 'Terran Dominion' },
    ghostpilot: { baseClass: 'hunter', faction: 'Terran Dominion' },
    turretwright: { baseClass: 'shaman', faction: 'Terran Dominion' },
  },
  fps: {
    vanguard: { baseClass: 'warrior', faction: 'Coalition' },
    marksman: { baseClass: 'hunter', faction: 'Coalition' },
    operator: { baseClass: 'rogue', faction: 'Rogue Cell' },
    medic: { baseClass: 'priest', faction: 'Coalition' },
    engineer: { baseClass: 'shaman', faction: 'Coalition' },
  },
};

const FALLBACKS: Partial<Record<RealmId, Record<PlayerClass, PresentationSeed>>> = {
  crypticrealm: {
    warrior: seed(
      'Rune Warden',
      'Rune Court',
      'Tank',
      'A plated vault guardian who turns forbidden glyphs into armor and shield work.',
    ),
    paladin: seed(
      'Gargoyle Oathsworn',
      'Rune Court',
      'Tank',
      'A living cathedral sentinel, sworn to hold the gate while the riddles wake.',
    ),
    hunter: seed(
      'Crypt Stalker',
      'Gravebound',
      'DPS',
      'A monster-tracker who hunts by echo, bone dust, and the scent of broken seals.',
    ),
    rogue: seed(
      'Cipher Blade',
      'Ciphered',
      'Assassin',
      'A duelist whose cuts spell curses only the dying can read.',
    ),
    priest: seed(
      'Oracle',
      'Rune Court',
      'Healer',
      'A fate-reader who mends wounds by reciting the version of history where they never happened.',
    ),
    shaman: seed(
      'Grave Totemist',
      'Gravebound',
      'Support',
      'A relic-binder who plants whispering totems and makes old spirits answer.',
    ),
    mage: seed(
      'Void Seer',
      'Voidbound',
      'DPS',
      'A spellcaster who throws the dark back at the things that escaped it.',
    ),
    warlock: seed(
      'Gravecaller',
      'Gravebound',
      'Summoner',
      'A dead-language summoner who recruits every solved riddle as a servant.',
    ),
    druid: seed(
      'Chimera Warden',
      'Voidbound',
      'Support',
      'A shifting guardian stitched from crypt-beasts, moon rites, and impossible anatomy.',
    ),
  },
  infernal: {
    warrior: seed(
      'Iron Warden',
      'Abyssal Legion',
      'Tank',
      'A fortress of grafted iron built to walk into Baal-grade punishment.',
    ),
    paladin: seed(
      'Hellknight',
      'Burning Hells',
      'Tank',
      'A fallen crusader whose vows now burn hotter than mercy.',
    ),
    hunter: seed(
      'Pit Stalker',
      'Abyssal Legion',
      'DPS',
      'A chain-snare hunter trained to drag prey across brimstone floors.',
    ),
    rogue: seed(
      'Shadow Blade',
      'Abyssal Legion',
      'Assassin',
      'An assassin from the lightless pits, moving between heartbeats.',
    ),
    priest: seed(
      'Blood Bishop',
      'Ashen Court',
      'Healer',
      'A crimson confessor who buys miracles by the pint.',
    ),
    shaman: seed(
      'Ash Shaman',
      'Ashen Court',
      'Support',
      'A cinder-speaking ritualist who wakes old volcano spirits.',
    ),
    mage: seed(
      'Ember Witch',
      'Burning Hells',
      'DPS',
      'A fire witch whose laughter turns the air into a furnace.',
    ),
    warlock: seed(
      'Bone Herald',
      'Ashen Court',
      'Summoner',
      'A royal necromancer commanding skulls, curses, and corpse craft.',
    ),
    druid: seed(
      'Plague Shifter',
      'Ashen Court',
      'Support',
      'A blighted shapeshifter who survives by becoming the infection.',
    ),
  },
  arcadevoid: {
    warrior: seed(
      'Void Marine',
      'Terran Dominion',
      'Tank',
      'Powered armor, breach shields, and the job of holding the extraction line.',
    ),
    paladin: seed(
      'Phase Templar',
      'Protoss Alliance',
      'Tank',
      'A psi-bladed guardian who bends shields around allies.',
    ),
    hunter: seed(
      'Ghost Pilot',
      'Terran Dominion',
      'DPS',
      'A stealth marksman who marks targets for orbital knives.',
    ),
    rogue: seed(
      'Lurker Strain',
      'Zerg Swarm',
      'Assassin',
      'A burrowing ambusher built for sudden violence and venom lanes.',
    ),
    priest: seed(
      'Khaydarin Preserver',
      'Protoss Alliance',
      'Healer',
      'A crystal-channeling protector who restores shields and focus.',
    ),
    shaman: seed(
      'Turretwright',
      'Terran Dominion',
      'Support',
      'A battlefield engineer turning scrap into angry little machines.',
    ),
    mage: seed(
      'High Templar',
      'Protoss Alliance',
      'DPS',
      'A psionic storm-caster carrying the whole sky in both hands.',
    ),
    warlock: seed(
      'Infestor Broodmind',
      'Zerg Swarm',
      'Summoner',
      'A parasitic commander that wins fights by making enemies multiply wrong.',
    ),
    druid: seed(
      'Mutalist Shifter',
      'Zerg Swarm',
      'Support',
      'A fast-evolving strain that adapts mid-fight and refuses one final shape.',
    ),
  },
  arcane: {
    warrior: seed(
      'Astral Juggernaut',
      'Star Court',
      'Tank',
      'A gravity-armored defender who anchors broken dimensions in place.',
    ),
    paladin: seed(
      'Star Guard',
      'Star Court',
      'Tank',
      'A singularity knight drawing enemies into the orbit of their shield.',
    ),
    hunter: seed(
      'Comet Ranger',
      'Crystal Concord',
      'DPS',
      'A relic marksman whose shots arrive with meteor certainty.',
    ),
    rogue: seed(
      'Rift Blade',
      'Voidborn',
      'Assassin',
      'A phase duelist stepping through micro-rifts to strike from the wrong angle.',
    ),
    priest: seed(
      'Portal Keeper',
      'Crystal Concord',
      'Healer',
      'A gateway medic opening clean exits to better timelines.',
    ),
    shaman: seed(
      'Crystalsmith',
      'Crystal Concord',
      'Support',
      'A resonance engineer growing shields, beams, and singing facets.',
    ),
    mage: seed(
      'Voidwalker',
      'Voidborn',
      'DPS',
      'A dimension-stepper channeling raw nothing into clean destruction.',
    ),
    warlock: seed(
      'Entropy Binder',
      'Voidborn',
      'Summoner',
      'A pact-maker who leashes miniature collapses and calls them pets.',
    ),
    druid: seed(
      'Nebula Shaper',
      'Star Court',
      'Support',
      'A cosmic shapeshifter blooming into starlight, mist, and pressure.',
    ),
  },
  classic: {
    warrior: seed(
      'Alliance Knight',
      'Alliance',
      'Tank',
      'A shield-line veteran carrying banner law and plate discipline.',
    ),
    paladin: seed(
      'Alliance Paladin',
      'Alliance',
      'Tank',
      'A holy champion with judgment, plate, and impossible patience.',
    ),
    hunter: seed(
      'Horde Ranger',
      'Horde',
      'DPS',
      'A hard-country bowhand who trusts trail craft before courtly orders.',
    ),
    rogue: seed(
      'Horde Outrider',
      'Horde',
      'Assassin',
      'A raider-scout who wins before the duel is officially underway.',
    ),
    priest: seed(
      'Alliance Cleric',
      'Alliance',
      'Healer',
      'A chapel-trained healer holding the line with light and grit.',
    ),
    shaman: seed(
      'Horde Shaman',
      'Horde',
      'Support',
      'A storm-speaker who bargains with earth, fire, wind, and ancestors.',
    ),
    mage: seed(
      'Alliance Archmage',
      'Alliance',
      'DPS',
      'A tower scholar turning clean formulas into battlefield weather.',
    ),
    warlock: seed(
      'Horde Warlock',
      'Horde',
      'Summoner',
      'A dangerous contractor who treats demons as a staffing problem.',
    ),
    druid: seed(
      'Horde Druid',
      'Horde',
      'Support',
      'A wild guardian of claw, leaf, moonfire, and old roads.',
    ),
  },
  dominion: {
    warrior: seed(
      'Vanguard',
      'Human Dominion',
      'Tank',
      'A drop-suit bruiser rated for the first breach.',
    ),
    paladin: seed(
      'Aegis Captain',
      'Human Dominion',
      'Tank',
      'A commander projecting hard-light shields over a moving squad.',
    ),
    hunter: seed(
      'Ghost Sniper',
      'Human Dominion',
      'DPS',
      'A patient rifle specialist fighting from the edge of the map.',
    ),
    rogue: seed(
      'Saboteur',
      'Frontier Corps',
      'Assassin',
      'A breach runner with charges, knives, and plausible deniability.',
    ),
    priest: seed(
      'Field Medic',
      'Frontier Corps',
      'Healer',
      'A nano-gel surgeon rebuilding the squad under fire.',
    ),
    shaman: seed(
      'Combat Engineer',
      'Frontier Corps',
      'Support',
      'A deployable-tech expert with turrets, EMP, and repairs.',
    ),
    mage: seed(
      'Psionic Operative',
      'Psionic Directorate',
      'DPS',
      'A classified mind weapon that makes tanks feel negotiable.',
    ),
    warlock: seed(
      'Xeno Binder',
      'Psionic Directorate',
      'Summoner',
      'A handler weaponizing alien symbiotes with military paperwork.',
    ),
    druid: seed(
      'Adaptive Strain',
      'Psionic Directorate',
      'Support',
      'A gene-shifting field asset that becomes whatever the fight lacks.',
    ),
  },
  fps: {
    warrior: seed(
      'Vanguard',
      'Coalition',
      'Tank',
      'A shield breacher who takes space one sightline at a time.',
    ),
    paladin: seed(
      'Bulwark',
      'Coalition',
      'Tank',
      'A hard-cover specialist projecting a front line where none exists.',
    ),
    hunter: seed('Marksman', 'Coalition', 'DPS', 'One breath, one shot, one less problem.'),
    rogue: seed(
      'Operator',
      'Rogue Cell',
      'Assassin',
      'A flanker who ends fights before the reticle catches up.',
    ),
    priest: seed(
      'Combat Medic',
      'Coalition',
      'Healer',
      'A dart-and-stim healer keeping the squad shooting.',
    ),
    shaman: seed(
      'Engineer',
      'Coalition',
      'Support',
      'A deployables expert shaping the lane with turrets and mines.',
    ),
    mage: seed(
      'Arc Gunner',
      'Rogue Cell',
      'DPS',
      'An experimental-energy wielder turning aim into chain lightning.',
    ),
    warlock: seed(
      'Signal Witch',
      'Rogue Cell',
      'Summoner',
      'A comms saboteur calling drones, decoys, and bad omens.',
    ),
    druid: seed(
      'Recon Shifter',
      'Rogue Cell',
      'Support',
      'A movement specialist swapping kit profiles as the room changes.',
    ),
  },
};

type AssetBase = Pick<RealmClassAsset, 'assetUrl' | 'assetName' | 'assetAnimated'>;

function asset(
  status: RealmClassAssetStatus,
  label: string,
  base: AssetBase,
  issue?: string,
): RealmClassAsset {
  return {
    ...base,
    assetStatus: status,
    assetStatusLabel: label,
    ...(issue ? { assetIssue: issue } : {}),
  };
}

const COMING_SOON_ASSET = {
  assetStatus: 'comingSoon',
  assetStatusLabel: 'Coming Soon',
  assetIssue:
    'ArcForge/Meshy character job queued; gameplay uses the class kit until the model is complete.',
} satisfies RealmClassAsset;

const CRYPTIC_BONE_HERALD = asset(
  'preview',
  'Animation Pass',
  {
    assetUrl:
      '/cr-realms/crypticrealm/bone-herald-black-meshy_ai_meshy_merged_animations_5fb3b8bb.glb',
    assetName: 'Bone Herald Black',
    assetAnimated: true,
  },
  'Run/walk only; needs idle, attack, cast, hit, and death clips before full release.',
);

function infernalHumanAsset(fileName: string, assetName: string): RealmClassAsset {
  return asset('ready', 'Playable human GLB', {
    assetUrl: `/cr-realms/infernal/${fileName}`,
    assetName,
    assetAnimated: true,
  });
}

const INFERNAL_HUMAN_ASSETS = {
  ironWarden: infernalHumanAsset('infernal_human_iron_warden.glb', 'Iron Warden'),
  vanguard: infernalHumanAsset('infernal_human_vanguard.glb', 'Vanguard'),
  forgeWorker: infernalHumanAsset('infernal_human_forge_worker.glb', 'Forge Worker'),
  whiteSage: infernalHumanAsset('infernal_human_white_sage.glb', 'White Sage'),
  weatheredElder: infernalHumanAsset('infernal_human_weathered_elder.glb', 'Weathered Elder'),
  roadMercenary: infernalHumanAsset('infernal_human_road_mercenary.glb', 'Road Mercenary'),
  ironRanger: infernalHumanAsset('infernal_human_iron_ranger.glb', 'Iron Ranger'),
  hoodedWanderer: infernalHumanAsset('infernal_human_hooded_wanderer.glb', 'Hooded Wanderer'),
  hermit: infernalHumanAsset('infernal_human_hermit.glb', 'Hermit'),
} satisfies Record<string, RealmClassAsset>;

const INFERNAL_BASE_CLASS_ASSETS: Record<PlayerClass, RealmClassAsset> = {
  warrior: INFERNAL_HUMAN_ASSETS.ironWarden,
  paladin: INFERNAL_HUMAN_ASSETS.vanguard,
  hunter: INFERNAL_HUMAN_ASSETS.ironRanger,
  rogue: INFERNAL_HUMAN_ASSETS.roadMercenary,
  priest: INFERNAL_HUMAN_ASSETS.whiteSage,
  shaman: INFERNAL_HUMAN_ASSETS.weatheredElder,
  mage: INFERNAL_HUMAN_ASSETS.hoodedWanderer,
  warlock: INFERNAL_HUMAN_ASSETS.forgeWorker,
  druid: INFERNAL_HUMAN_ASSETS.hermit,
};

const INFERNAL_HERO_ASSETS: Readonly<Record<string, RealmClassAsset>> = {
  Warrior: INFERNAL_HUMAN_ASSETS.ironWarden,
  Rogue: INFERNAL_HUMAN_ASSETS.roadMercenary,
  'Sorcerer / Sorceress': INFERNAL_HUMAN_ASSETS.hoodedWanderer,
  Amazon: INFERNAL_HUMAN_ASSETS.ironRanger,
  Barbarian: INFERNAL_HUMAN_ASSETS.vanguard,
  Necromancer: INFERNAL_HUMAN_ASSETS.whiteSage,
  Paladin: INFERNAL_HUMAN_ASSETS.vanguard,
  Druid: INFERNAL_HUMAN_ASSETS.hermit,
  Assassin: INFERNAL_HUMAN_ASSETS.roadMercenary,
  'Demon Hunter': INFERNAL_HUMAN_ASSETS.ironRanger,
  Monk: INFERNAL_HUMAN_ASSETS.weatheredElder,
  Wizard: INFERNAL_HUMAN_ASSETS.whiteSage,
  'Witch Doctor': INFERNAL_HUMAN_ASSETS.hermit,
  Crusader: INFERNAL_HUMAN_ASSETS.ironWarden,
  Spiritborn: INFERNAL_HUMAN_ASSETS.hermit,
  Warlock: INFERNAL_HUMAN_ASSETS.hoodedWanderer,
  'Blood Knight': INFERNAL_HUMAN_ASSETS.roadMercenary,
  Tempest: INFERNAL_HUMAN_ASSETS.weatheredElder,
};

interface InfernalEnemySeed {
  name: string;
  baseClass: PlayerClass;
  asset: RealmClassAsset;
}

const INFERNAL_HELL_ENEMIES: readonly InfernalEnemySeed[] = [
  {
    name: 'Dark Paladin',
    baseClass: 'paladin',
    asset: asset('ready', 'Playable enemy GLB', {
      assetUrl: '/cr-realms/infernal/dark_paladin_commander.glb',
      assetName: 'Dark Paladin Commander',
      assetAnimated: true,
    }),
  },
  {
    name: 'Tainted Hood',
    baseClass: 'rogue',
    asset: asset('ready', 'Playable enemy GLB', {
      assetUrl: '/cr-realms/infernal/infernal_human_tainted_hood.glb',
      assetName: 'Tainted Hood',
      assetAnimated: true,
    }),
  },
  {
    name: 'Horned Demon',
    baseClass: 'warrior',
    asset: asset('ready', 'Playable enemy GLB', {
      assetUrl: '/cr-realms/infernal/demon-horned_1a19d7ca.glb',
      assetName: 'Horned Demon',
      assetAnimated: true,
    }),
  },
  {
    name: 'Crimson Infernal Behemoth',
    baseClass: 'warrior',
    asset: asset('ready', 'Playable enemy GLB', {
      assetUrl:
        '/cr-realms/infernal/meshy_ai_crimson_infernal_behe_biped_meshy_ai_meshy_merged_animations_27bab94d.glb',
      assetName: 'Crimson Infernal Behemoth',
      assetAnimated: true,
    }),
  },
  {
    name: 'Bone Herald',
    baseClass: 'warlock',
    asset: asset('ready', 'Playable enemy GLB', {
      assetUrl:
        '/cr-realms/crypticrealm/bone-herald-black-meshy_ai_meshy_merged_animations_5fb3b8bb.glb',
      assetName: 'Bone Herald',
      assetAnimated: true,
    }),
  },
  {
    name: 'Skullbeast',
    baseClass: 'druid',
    asset: asset('ready', 'Playable enemy GLB', {
      assetUrl: '/cr-realms/infernal/skullbeast_5d2ecebf.glb',
      assetName: 'Skullbeast',
      assetAnimated: true,
    }),
  },
];

const CLASSIC_ORC = asset('ready', 'Playable GLB', {
  assetUrl: '/cr-realms/classic/another-orc-meshy_ai_meshy_merged_animations_743223cb.glb',
  assetName: 'Animated Orc',
  assetAnimated: true,
});

const CLASSIC_BIG_ORC = asset(
  'preview',
  'Animation Pass',
  {
    assetUrl: '/cr-realms/classic/bigass-orc-meshy_ai_meshy_merged_animations_86937638.glb',
    assetName: 'Armored Orc',
    assetAnimated: true,
  },
  'Movement/jump pack present; combat, cast, hit, and death clips still needed.',
);

const CLASSIC_FIGHTING_ELF = asset('ready', 'Playable GLB', {
  assetUrl: '/cr-realms/classic/fighting-elf-meshy_ai_meshy_merged_animations_943c5367.glb',
  assetName: 'Fighting Elf',
  assetAnimated: true,
});

const CLASSIC_DWARF = asset(
  'preview',
  'Animation Pass',
  {
    assetUrl: '/cr-realms/classic/gray-dwarf-meshy_ai_meshy_merged_animations_a33ff315.glb',
    assetName: 'Gray Dwarf',
    assetAnimated: true,
  },
  'Run/walk only; queued for attack, cast, hit, and death clips.',
);

const CLASSIC_FEMALE_ELF = asset(
  'preview',
  'Animation Pass',
  {
    assetUrl: '/cr-realms/classic/female-elf-meshy_ai_meshy_merged_animations_2dde3113.glb',
    assetName: 'Female Elf',
    assetAnimated: true,
  },
  'Run/walk only; queued for healer/caster animation coverage.',
);

const CLASSIC_FEMALE_ORC = asset(
  'preview',
  'Animation Pass',
  {
    assetUrl: '/cr-realms/classic/female-orc-meshy_ai_meshy_merged_animations_a5a08a67.glb',
    assetName: 'Female Orc',
    assetAnimated: true,
  },
  'Run/walk only; queued for rogue attack and hit reactions.',
);

const CLASSIC_TREASURE_DWARF = asset(
  'preview',
  'Animation Pass',
  {
    assetUrl: '/cr-realms/classic/treasure-dwarf-meshy_ai_meshy_merged_animations_91488daf.glb',
    assetName: 'Treasure Dwarf',
    assetAnimated: true,
  },
  'Run/walk only; queued for spellcast and death clips.',
);

const CLASSIC_KITTY = asset(
  'preview',
  'Animation Pass',
  {
    assetUrl: '/cr-realms/classic/kitty_a4be04fa.glb',
    assetName: 'Kitty',
    assetAnimated: true,
  },
  'Single imported clip; queued for normalized locomotion and class action set.',
);

const ASSETS_BY_REALM_CLASS: Partial<
  Record<RealmId, Partial<Record<PlayerClass, RealmClassAsset>>>
> = {
  crypticrealm: {
    warlock: CRYPTIC_BONE_HERALD,
  },
  infernal: INFERNAL_BASE_CLASS_ASSETS,
  classic: {
    warrior: CLASSIC_DWARF,
    paladin: CLASSIC_FIGHTING_ELF,
    hunter: CLASSIC_ORC,
    rogue: CLASSIC_FEMALE_ORC,
    priest: CLASSIC_FEMALE_ELF,
    shaman: CLASSIC_BIG_ORC,
    mage: CLASSIC_TREASURE_DWARF,
    druid: CLASSIC_KITTY,
  },
};

function seed(name: string, faction: string, role: RealmRole, lore: string): PresentationSeed {
  return { name, faction, role, lore, color: '#ffffff' };
}

function sourceForBaseClass(
  realm: RealmContent,
  baseClass: PlayerClass,
): { source: RealmClassSkin; faction: string } | null {
  const bindings: SkinBinding = SKIN_BINDINGS[realm.id] ?? {};
  for (const source of realm.classes) {
    const binding = bindings[source.id];
    if (binding?.baseClass === baseClass) return { source, faction: binding.faction };
  }
  return null;
}

function assetForBaseClass(realm: RealmContent, baseClass: PlayerClass): RealmClassAsset {
  return ASSETS_BY_REALM_CLASS[realm.id]?.[baseClass] ?? COMING_SOON_ASSET;
}

export function realmHasClassOverlay(realm: RealmContent): boolean {
  return realm.id !== 'claudecraft' && realm.id !== 'exchange' && !!FALLBACKS[realm.id];
}

export function classPresentationForRealm(
  realm: RealmContent,
  baseClass: PlayerClass,
): RealmClassPresentation | null {
  if (!realmHasClassOverlay(realm)) return null;
  const fallback = FALLBACKS[realm.id]?.[baseClass];
  if (!fallback) return null;
  const bound = sourceForBaseClass(realm, baseClass);
  if (bound) {
    const asset = assetForBaseClass(realm, baseClass);
    return {
      baseClass,
      name: bound.source.name,
      faction: factionForRealmClass(realm.id, baseClass)?.name ?? bound.faction,
      lore: bound.source.lore,
      color: bound.source.color,
      role: bound.source.role,
      ...asset,
      source: bound.source,
    };
  }
  const asset = assetForBaseClass(realm, baseClass);
  return {
    baseClass,
    name: fallback.name,
    faction: factionForRealmClass(realm.id, baseClass)?.name ?? fallback.faction,
    lore: fallback.lore,
    color: fallback.color === '#ffffff' ? CLASS_COLORS[baseClass] : fallback.color,
    role: fallback.role ?? ROLE_BY_CLASS[baseClass],
    ...asset,
  };
}

export function classChoicesForRealm(realm: RealmContent): RealmClassPresentation[] {
  if (!realmHasClassOverlay(realm)) return [];
  return PLAYER_CLASS_ORDER.map((cls) => classPresentationForRealm(realm, cls)).filter(
    (choice): choice is RealmClassPresentation => choice !== null,
  );
}

const INFERNAL_HERO_FACTION = { name: 'Heavenly Host', color: '#9fc8ff' } as const;
const INFERNAL_HELL_FACTION = { name: 'Burning Hells', color: '#d24a3a' } as const;

function canonicalInfernalHeroName(name: string): string {
  return name === 'Sorcerer' || name === 'Sorceress' ? 'Sorcerer / Sorceress' : name;
}

function infernalChoiceId(side: 'hero' | 'hell', name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `infernal-${side}-${slug}`;
}

function infernalClassChoice(
  realm: RealmContent,
  name: string,
  baseClass: PlayerClass,
  factionSide: InfernalDiabloClassPresentation['factionSide'],
  assetChoice: RealmClassAsset,
): InfernalDiabloClassPresentation {
  const base = classPresentationForRealm(realm, baseClass);
  const faction = factionSide === 'hell' ? INFERNAL_HELL_FACTION : INFERNAL_HERO_FACTION;
  const side = factionSide === 'hell' ? 'hell' : 'hero';
  // Operator override: a saved reassignment for this hero (or its base class)
  // swaps the body asset live, ahead of the compiled default.
  const override = firstRealmVisualOverride(realm.id, [`hero:${name}`, `class:${baseClass}`]);
  const resolvedAsset: RealmClassAsset = override
    ? {
        ...assetChoice,
        assetUrl: override.assetUrl,
        assetName: override.assetName ?? assetChoice.assetName,
      }
    : assetChoice;
  return {
    ...(base ?? {
      baseClass,
      name,
      faction: faction.name,
      lore: name,
      color: faction.color,
      role: ROLE_BY_CLASS[baseClass],
    }),
    baseClass,
    name,
    faction: faction.name,
    lore:
      factionSide === 'hell'
        ? `An enemy champion of the Burning Hells, offered apart from Sanctuary's human heroes.`
        : `A human champion of Sanctuary carrying the ${name} tradition into the Infernal Realm.`,
    color: faction.color,
    ...resolvedAsset,
    diabloId: infernalChoiceId(side, name),
    factionSide,
    signatureSkills: diabloSignatureSkills(name),
  };
}

/**
 * The Infernal creator offers one human card per archetype plus a separate
 * enemy roster. The combat server still persists the existing nine mechanical
 * classes, so every presentation choice submits its compatible baseClass.
 */
export function infernalDiabloClassChoicesForRealm(
  realm: RealmContent,
): InfernalDiabloClassPresentation[] {
  if (realm.id !== 'infernal') return [];
  const heroes: InfernalDiabloClassPresentation[] = [];
  const seen = new Set<string>();
  for (const source of diabloClassesForRealm(realm.id)) {
    const name = canonicalInfernalHeroName(source.name);
    if (seen.has(name)) continue;
    seen.add(name);
    heroes.push(
      infernalClassChoice(
        realm,
        name,
        source.engineClass,
        'sanctuary',
        INFERNAL_HERO_ASSETS[name] ?? INFERNAL_BASE_CLASS_ASSETS[source.engineClass],
      ),
    );
  }
  return [
    ...heroes,
    ...INFERNAL_HELL_ENEMIES.map((enemy) =>
      infernalClassChoice(realm, enemy.name, enemy.baseClass, 'hell', enemy.asset),
    ),
  ];
}

export function presentationFactionsForRealm(realm: RealmContent): string[] {
  if (realm.id === 'infernal') {
    return [...new Set(infernalDiabloClassChoicesForRealm(realm).map((choice) => choice.faction))];
  }
  const out: string[] = [];
  for (const choice of classChoicesForRealm(realm)) {
    if (!out.includes(choice.faction)) out.push(choice.faction);
  }
  return out;
}
