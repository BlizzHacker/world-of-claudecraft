import type { PlayerClass } from '../../sim/types';
import { factionForRealmClass } from '../../sim/realms/factions';
import type { RealmClassSkin, RealmContent, RealmId, RealmRole } from '../../sim/realms/types';
import { diabloClassesForRealm, type DiabloRealmClass } from '../../sim/realms/diablo_classes';

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
  lineage: DiabloRealmClass['lineage'];
  factionSide: DiabloRealmClass['factionSide'];
}

export type RealmClassAssetStatus = 'ready' | 'preview' | 'comingSoon';

type SkinBinding = Partial<Record<string, { baseClass: PlayerClass; faction: string }>>;
type PresentationSeed = Pick<RealmClassPresentation, 'name' | 'faction' | 'role' | 'lore' | 'color'>;
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
    warrior: seed('Rune Warden', 'Rune Court', 'Tank', 'A plated vault guardian who turns forbidden glyphs into armor and shield work.'),
    paladin: seed('Gargoyle Oathsworn', 'Rune Court', 'Tank', 'A living cathedral sentinel, sworn to hold the gate while the riddles wake.'),
    hunter: seed('Crypt Stalker', 'Gravebound', 'DPS', 'A monster-tracker who hunts by echo, bone dust, and the scent of broken seals.'),
    rogue: seed('Cipher Blade', 'Ciphered', 'Assassin', 'A duelist whose cuts spell curses only the dying can read.'),
    priest: seed('Oracle', 'Rune Court', 'Healer', 'A fate-reader who mends wounds by reciting the version of history where they never happened.'),
    shaman: seed('Grave Totemist', 'Gravebound', 'Support', 'A relic-binder who plants whispering totems and makes old spirits answer.'),
    mage: seed('Void Seer', 'Voidbound', 'DPS', 'A spellcaster who throws the dark back at the things that escaped it.'),
    warlock: seed('Gravecaller', 'Gravebound', 'Summoner', 'A dead-language summoner who recruits every solved riddle as a servant.'),
    druid: seed('Chimera Warden', 'Voidbound', 'Support', 'A shifting guardian stitched from crypt-beasts, moon rites, and impossible anatomy.'),
  },
  infernal: {
    warrior: seed('Iron Warden', 'Abyssal Legion', 'Tank', 'A fortress of grafted iron built to walk into Baal-grade punishment.'),
    paladin: seed('Hellknight', 'Burning Hells', 'Tank', 'A fallen crusader whose vows now burn hotter than mercy.'),
    hunter: seed('Pit Stalker', 'Abyssal Legion', 'DPS', 'A chain-snare hunter trained to drag prey across brimstone floors.'),
    rogue: seed('Shadow Blade', 'Abyssal Legion', 'Assassin', 'An assassin from the lightless pits, moving between heartbeats.'),
    priest: seed('Blood Bishop', 'Ashen Court', 'Healer', 'A crimson confessor who buys miracles by the pint.'),
    shaman: seed('Ash Shaman', 'Ashen Court', 'Support', 'A cinder-speaking ritualist who wakes old volcano spirits.'),
    mage: seed('Ember Witch', 'Burning Hells', 'DPS', 'A fire witch whose laughter turns the air into a furnace.'),
    warlock: seed('Bone Herald', 'Ashen Court', 'Summoner', 'A royal necromancer commanding skulls, curses, and corpse craft.'),
    druid: seed('Plague Shifter', 'Ashen Court', 'Support', 'A blighted shapeshifter who survives by becoming the infection.'),
  },
  arcadevoid: {
    warrior: seed('Void Marine', 'Terran Dominion', 'Tank', 'Powered armor, breach shields, and the job of holding the extraction line.'),
    paladin: seed('Phase Templar', 'Protoss Alliance', 'Tank', 'A psi-bladed guardian who bends shields around allies.'),
    hunter: seed('Ghost Pilot', 'Terran Dominion', 'DPS', 'A stealth marksman who marks targets for orbital knives.'),
    rogue: seed('Lurker Strain', 'Zerg Swarm', 'Assassin', 'A burrowing ambusher built for sudden violence and venom lanes.'),
    priest: seed('Khaydarin Preserver', 'Protoss Alliance', 'Healer', 'A crystal-channeling protector who restores shields and focus.'),
    shaman: seed('Turretwright', 'Terran Dominion', 'Support', 'A battlefield engineer turning scrap into angry little machines.'),
    mage: seed('High Templar', 'Protoss Alliance', 'DPS', 'A psionic storm-caster carrying the whole sky in both hands.'),
    warlock: seed('Infestor Broodmind', 'Zerg Swarm', 'Summoner', 'A parasitic commander that wins fights by making enemies multiply wrong.'),
    druid: seed('Mutalist Shifter', 'Zerg Swarm', 'Support', 'A fast-evolving strain that adapts mid-fight and refuses one final shape.'),
  },
  arcane: {
    warrior: seed('Astral Juggernaut', 'Star Court', 'Tank', 'A gravity-armored defender who anchors broken dimensions in place.'),
    paladin: seed('Star Guard', 'Star Court', 'Tank', 'A singularity knight drawing enemies into the orbit of their shield.'),
    hunter: seed('Comet Ranger', 'Crystal Concord', 'DPS', 'A relic marksman whose shots arrive with meteor certainty.'),
    rogue: seed('Rift Blade', 'Voidborn', 'Assassin', 'A phase duelist stepping through micro-rifts to strike from the wrong angle.'),
    priest: seed('Portal Keeper', 'Crystal Concord', 'Healer', 'A gateway medic opening clean exits to better timelines.'),
    shaman: seed('Crystalsmith', 'Crystal Concord', 'Support', 'A resonance engineer growing shields, beams, and singing facets.'),
    mage: seed('Voidwalker', 'Voidborn', 'DPS', 'A dimension-stepper channeling raw nothing into clean destruction.'),
    warlock: seed('Entropy Binder', 'Voidborn', 'Summoner', 'A pact-maker who leashes miniature collapses and calls them pets.'),
    druid: seed('Nebula Shaper', 'Star Court', 'Support', 'A cosmic shapeshifter blooming into starlight, mist, and pressure.'),
  },
  classic: {
    warrior: seed('Alliance Knight', 'Alliance', 'Tank', 'A shield-line veteran carrying banner law and plate discipline.'),
    paladin: seed('Alliance Paladin', 'Alliance', 'Tank', 'A holy champion with judgment, plate, and impossible patience.'),
    hunter: seed('Horde Ranger', 'Horde', 'DPS', 'A hard-country bowhand who trusts trail craft before courtly orders.'),
    rogue: seed('Horde Outrider', 'Horde', 'Assassin', 'A raider-scout who wins before the duel is officially underway.'),
    priest: seed('Alliance Cleric', 'Alliance', 'Healer', 'A chapel-trained healer holding the line with light and grit.'),
    shaman: seed('Horde Shaman', 'Horde', 'Support', 'A storm-speaker who bargains with earth, fire, wind, and ancestors.'),
    mage: seed('Alliance Archmage', 'Alliance', 'DPS', 'A tower scholar turning clean formulas into battlefield weather.'),
    warlock: seed('Horde Warlock', 'Horde', 'Summoner', 'A dangerous contractor who treats demons as a staffing problem.'),
    druid: seed('Horde Druid', 'Horde', 'Support', 'A wild guardian of claw, leaf, moonfire, and old roads.'),
  },
  dominion: {
    warrior: seed('Vanguard', 'Human Dominion', 'Tank', 'A drop-suit bruiser rated for the first breach.'),
    paladin: seed('Aegis Captain', 'Human Dominion', 'Tank', 'A commander projecting hard-light shields over a moving squad.'),
    hunter: seed('Ghost Sniper', 'Human Dominion', 'DPS', 'A patient rifle specialist fighting from the edge of the map.'),
    rogue: seed('Saboteur', 'Frontier Corps', 'Assassin', 'A breach runner with charges, knives, and plausible deniability.'),
    priest: seed('Field Medic', 'Frontier Corps', 'Healer', 'A nano-gel surgeon rebuilding the squad under fire.'),
    shaman: seed('Combat Engineer', 'Frontier Corps', 'Support', 'A deployable-tech expert with turrets, EMP, and repairs.'),
    mage: seed('Psionic Operative', 'Psionic Directorate', 'DPS', 'A classified mind weapon that makes tanks feel negotiable.'),
    warlock: seed('Xeno Binder', 'Psionic Directorate', 'Summoner', 'A handler weaponizing alien symbiotes with military paperwork.'),
    druid: seed('Adaptive Strain', 'Psionic Directorate', 'Support', 'A gene-shifting field asset that becomes whatever the fight lacks.'),
  },
  fps: {
    warrior: seed('Vanguard', 'Coalition', 'Tank', 'A shield breacher who takes space one sightline at a time.'),
    paladin: seed('Bulwark', 'Coalition', 'Tank', 'A hard-cover specialist projecting a front line where none exists.'),
    hunter: seed('Marksman', 'Coalition', 'DPS', 'One breath, one shot, one less problem.'),
    rogue: seed('Operator', 'Rogue Cell', 'Assassin', 'A flanker who ends fights before the reticle catches up.'),
    priest: seed('Combat Medic', 'Coalition', 'Healer', 'A dart-and-stim healer keeping the squad shooting.'),
    shaman: seed('Engineer', 'Coalition', 'Support', 'A deployables expert shaping the lane with turrets and mines.'),
    mage: seed('Arc Gunner', 'Rogue Cell', 'DPS', 'An experimental-energy wielder turning aim into chain lightning.'),
    warlock: seed('Signal Witch', 'Rogue Cell', 'Summoner', 'A comms saboteur calling drones, decoys, and bad omens.'),
    druid: seed('Recon Shifter', 'Rogue Cell', 'Support', 'A movement specialist swapping kit profiles as the room changes.'),
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
  assetIssue: 'ArcForge/Meshy character job queued; gameplay uses the class kit until the model is complete.',
} satisfies RealmClassAsset;

const CRYPTIC_BONE_HERALD = asset(
  'preview',
  'Animation Pass',
  {
    assetUrl: '/cr-realms/crypticrealm/bone-herald-black-meshy_ai_meshy_merged_animations_5fb3b8bb.glb',
    assetName: 'Bone Herald Black',
    assetAnimated: true,
  },
  'Run/walk only; needs idle, attack, cast, hit, and death clips before full release.',
);

const INFERNAL_CRIMSON_BEHEMOTH = asset(
  'preview',
  'Animation Pass',
  {
    assetUrl:
      '/cr-realms/infernal/meshy_ai_crimson_infernal_behe_biped_meshy_ai_meshy_merged_animations_27bab94d.glb',
    assetName: 'Crimson Infernal Behemoth',
    assetAnimated: true,
  },
  'Locomotion and jump pack present; queued for melee, cast, hit, and death clips.',
);

const INFERNAL_DEMON_HORNED = asset(
  'preview',
  'Animation Pass',
  {
    assetUrl: '/cr-realms/infernal/demon-horned_1a19d7ca.glb',
    assetName: 'Horned Demon',
    assetAnimated: true,
  },
  'Run/walk only; queued for combat and spell animation coverage.',
);

const INFERNAL_SKULLBEAST = asset(
  'ready',
  'Playable GLB',
  {
    assetUrl: '/cr-realms/infernal/skullbeast_5d2ecebf.glb',
    assetName: 'Skullbeast',
    assetAnimated: true,
  },
  'Has locomotion plus slash; still queued for class-specific casting and death clips.',
);

const INFERNAL_DURANCE_HUMANOID = asset('ready', 'Playable humanoid GLB', {
  assetUrl: '/cr-realms/infernal/durance_tester_humanoid.glb',
  assetName: 'Durance Tester Humanoid',
  assetAnimated: true,
});

const INFERNAL_DARK_PALADIN = asset('ready', 'Playable enemy GLB', {
  assetUrl: '/cr-realms/infernal/dark_paladin_commander.glb',
  assetName: 'Dark Paladin Commander',
  assetAnimated: true,
});

const INFERNAL_UNIQUE_ASSETS: readonly RealmClassAsset[] = [
  INFERNAL_DURANCE_HUMANOID,
  INFERNAL_DARK_PALADIN,
  asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/demon-horned_1a19d7ca.glb', assetName: 'Horned Demon', assetAnimated: true }),
  asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_crimson_infernal_behe_biped_meshy_ai_meshy_merged_animations_27bab94d.glb', assetName: 'Crimson Infernal Behemoth', assetAnimated: true }),
  INFERNAL_SKULLBEAST,
  asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_infernal_behemoth_biped_merged_animations.glb', assetName: 'Infernal Behemoth', assetAnimated: true }),
  asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_cursed_knight_s_iro_0616234359_texture_abda8208.glb', assetName: 'Cursed Knight', assetAnimated: true }),
  asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_demon_with_body_cover_0616234415_texture_540be2b1.glb', assetName: 'Covered Demon', assetAnimated: true }),
  asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_horned_demon_warrior_0616234420_texture_2233cac0.glb', assetName: 'Horned Demon Warrior', assetAnimated: true }),
];

const INFERNAL_DIABLO_ASSETS: Record<string, RealmClassAsset> = {
  Warrior: INFERNAL_DURANCE_HUMANOID,
  Rogue: asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/demon-horned_1a19d7ca.glb', assetName: 'Horned Demon', assetAnimated: true }),
  Sorcerer: asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_infernal_behemoth_biped_merged_animations.glb', assetName: 'Infernal Behemoth', assetAnimated: true }),
  Amazon: asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_crimson_infernal_behe_biped_character_output_56b1ac0c.glb', assetName: 'Crimson Infernal Champion', assetAnimated: true }),
  Barbarian: asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_horned_demon_warrior_0616234420_texture_2233cac0.glb', assetName: 'Horned Demon Warrior', assetAnimated: true }),
  Necromancer: asset('ready', 'Playable undead caster GLB', { assetUrl: '/cr-realms/infernal/bone-herald-black-meshy_ai_meshy_merged_animations_5fb3b8bb.glb', assetName: 'Bone Herald', assetAnimated: true }),
  Paladin: INFERNAL_DARK_PALADIN,
  Sorceress: asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_cursed_knight_s_iro_0616234359_texture_abda8208.glb', assetName: 'Cursed Knight', assetAnimated: true }),
  Druid: asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_a_black_evil_spectr_0616234348_texture_abacb7f9.glb', assetName: 'Black Evil Specter', assetAnimated: true }),
  Assassin: asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_demon_with_body_cover_0616234415_texture_540be2b1.glb', assetName: 'Covered Demon', assetAnimated: true }),
  'Demon Hunter': asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_demon_with_body_cover_0616234440_texture_fd4134d0.glb', assetName: 'Covered Demon Reaver', assetAnimated: true }),
  Monk: asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_crimson_infernal_behe_biped_meshy_ai_meshy_merged_animations_27bab94d.glb', assetName: 'Crimson Behemoth', assetAnimated: true }),
  Wizard: asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_lava_demon_visible_l_0616234410_texture_a72a9ef6.glb', assetName: 'Lava Demon', assetAnimated: true }),
  'Witch Doctor': asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_lava_demon_with_horns_0616234329_texture_9a64c154.glb', assetName: 'Lava Demon Shaman', assetAnimated: true }),
  Crusader: asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/dark_paladin_walking.glb', assetName: 'Dark Paladin', assetAnimated: true }),
  Spiritborn: asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_demon_with_body_cover_0616234440_texture_fd4134d0.glb', assetName: 'Spiritborn Demon', assetAnimated: true }),
  Warlock: asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_demon_with_body_cover_0616234415_texture_540be2b1.glb', assetName: 'Hell Warlock', assetAnimated: true }),
  'Blood Knight': asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/dark_paladin_running.glb', assetName: 'Blood Knight', assetAnimated: true }),
  Tempest: asset('ready', 'Playable GLB', { assetUrl: '/cr-realms/infernal/meshy_ai_a_primal_groudon_emer_0616234337_texture_194376eb.glb', assetName: 'Infernal Tempest', assetAnimated: true }),
};

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

const ASSETS_BY_REALM_CLASS: Partial<Record<RealmId, Partial<Record<PlayerClass, RealmClassAsset>>>> = {
  crypticrealm: {
    warlock: CRYPTIC_BONE_HERALD,
  },
  infernal: {
    // Iron Warden is intentionally a real humanoid. The old crimson demon
    // body was a placeholder and must never be used for this character.
    warrior: INFERNAL_UNIQUE_ASSETS[0],
    paladin: INFERNAL_UNIQUE_ASSETS[1],
    hunter: INFERNAL_UNIQUE_ASSETS[2],
    rogue: INFERNAL_UNIQUE_ASSETS[3],
    priest: INFERNAL_UNIQUE_ASSETS[4],
    shaman: INFERNAL_UNIQUE_ASSETS[5],
    mage: INFERNAL_UNIQUE_ASSETS[6],
    warlock: INFERNAL_UNIQUE_ASSETS[7],
    druid: INFERNAL_UNIQUE_ASSETS[8],
  },
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

function sourceForBaseClass(realm: RealmContent, baseClass: PlayerClass): { source: RealmClassSkin; faction: string } | null {
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
  return PLAYER_CLASS_ORDER
    .map((cls) => classPresentationForRealm(realm, cls))
    .filter((choice): choice is RealmClassPresentation => choice !== null);
}

function infernalFactionForDiabloClass(choice: DiabloRealmClass): { name: string; color: string } {
  if (choice.factionSide === 'hell') return { name: 'Burning Hells', color: '#d24a3a' };
  if (choice.factionSide === 'surprise') return { name: 'Ashen Court', color: '#c5a86a' };
  return { name: 'Heavenly Host', color: '#9fc8ff' };
}

/**
 * The Infernal creator has a Diablo-sized class roster, while the combat
 * server intentionally persists the existing nine mechanical classes. This
 * presentation layer keeps those contracts separate: every visible card is a
 * real named Diablo class, but its selection still submits engineClass.
 */
export function infernalDiabloClassChoicesForRealm(
  realm: RealmContent,
): InfernalDiabloClassPresentation[] {
  if (realm.id !== 'infernal') return [];
  const seen = new Set<string>();
  return diabloClassesForRealm(realm.id).filter((diablo) => {
    if (seen.has(diablo.name)) return false;
    seen.add(diablo.name);
    return true;
  }).map((diablo) => {
    const faction = infernalFactionForDiabloClass(diablo);
    const base = classPresentationForRealm(realm, diablo.engineClass);
    const isHell = diablo.factionSide === 'hell';
    const assetChoice = INFERNAL_DIABLO_ASSETS[diablo.name] ?? (isHell ? INFERNAL_DARK_PALADIN : INFERNAL_DURANCE_HUMANOID);
    return {
      ...(base ?? {
        baseClass: diablo.engineClass,
        name: diablo.name,
        faction: faction.name,
        lore: `${diablo.name}, forged for the ${diablo.lineage} war against the Burning Hells.`,
        color: faction.color,
        role: ROLE_BY_CLASS[diablo.engineClass],
      }),
      baseClass: diablo.engineClass,
      name: diablo.name,
      faction: faction.name,
      lore: `${diablo.name} — ${diablo.lineage} class. Choose a real animated body and carry this role into the Infernal Realm.`,
      color: faction.color,
      assetStatus: assetChoice.assetStatus,
      assetStatusLabel: assetChoice.assetStatusLabel,
      assetUrl: assetChoice.assetUrl,
      assetName: assetChoice.assetName,
      assetAnimated: assetChoice.assetAnimated,
      assetIssue: undefined,
      diabloId: diablo.id,
      lineage: diablo.lineage,
      factionSide: diablo.factionSide,
    };
  });
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
