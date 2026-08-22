import { isTieredSkinBody } from '../../sim/cosmetics/body_skins';
import { realmClassVisualKey } from '../../sim/realms/class_visuals';
import { factionForRealmClass } from '../../sim/realms/factions';
import type { InfernalHeroVariant } from '../../sim/realms/infernal_classes';
import {
  infernalCharacterSelectionsForRealm,
  infernalHeroOverrideKeys,
} from '../../sim/realms/infernal_classes';
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
  /** Registered renderer body. The creator and in-world resolver share this
   *  key, so a themed realm never has to fall back to a stock class body. */
  visualKey?: string;
  source?: RealmClassSkin;
}

export interface InfernalHeroPresentation extends RealmClassPresentation {
  heroId: string;
  factionSide: 'heaven' | 'hell';
  /** Variants selectable from this canonical card's segmented toggle. */
  variants?: readonly InfernalHeroVariant[];
  /** Canonical selection id a hidden variant entry presents under; entries
   *  carrying this never render as their own card. */
  variantOf?: string;
}

export type RealmClassAssetStatus = 'ready' | 'preview' | 'comingSoon';

type SkinBinding = Partial<Record<string, { baseClass: PlayerClass; faction: string }>>;
type PresentationSeed = Pick<
  RealmClassPresentation,
  'name' | 'faction' | 'role' | 'lore' | 'color'
>;
type RealmClassAsset = Pick<
  RealmClassPresentation,
  | 'assetUrl'
  | 'assetName'
  | 'assetAnimated'
  | 'assetStatus'
  | 'assetStatusLabel'
  | 'assetIssue'
  | 'visualKey'
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
    emberwitch: { baseClass: 'mage', faction: 'Ashen Court' },
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
    voidmarine: { baseClass: 'warrior', faction: 'Shipyard Compact' },
    ghostpilot: { baseClass: 'hunter', faction: 'Shipyard Compact' },
    turretwright: { baseClass: 'shaman', faction: 'Shipyard Compact' },
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
      "A fortress of grafted iron built to withstand a pit lord's punishment.",
    ),
    paladin: seed(
      'Hellknight',
      'Ashen Court',
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
      'Ashen Court',
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
      'Shipyard Compact',
      'Tank',
      'Powered armor, breach shields, and the job of holding the extraction line.',
    ),
    paladin: seed(
      'Lumen Warden',
      'Luminate',
      'Tank',
      'A lightforged guardian who bends shields around allies.',
    ),
    hunter: seed(
      'Ghost Pilot',
      'Shipyard Compact',
      'DPS',
      'A stealth marksman who marks targets for orbital knives.',
    ),
    rogue: seed(
      'Venom Strain',
      'Hullrot Brood',
      'Assassin',
      'A burrowing ambusher built for sudden violence and venom lanes.',
    ),
    priest: seed(
      'Prism Custodian',
      'Luminate',
      'Healer',
      'A crystal-channeling protector who restores shields and focus.',
    ),
    shaman: seed(
      'Turretwright',
      'Shipyard Compact',
      'Support',
      'A battlefield engineer turning scrap into angry little machines.',
    ),
    mage: seed(
      'Corona Adept',
      'Luminate',
      'DPS',
      'A stormlight caster carrying the whole sky in both hands.',
    ),
    warlock: seed(
      'Hollow Broodmind',
      'Hullrot Brood',
      'Summoner',
      'A parasitic commander that wins fights by making enemies multiply wrong.',
    ),
    druid: seed(
      'Molt Shifter',
      'Hullrot Brood',
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

function infernalHumanAsset(fileName: string, assetName: string): RealmClassAsset {
  return asset('ready', 'Playable human GLB', {
    assetUrl: `/cr-realms/infernal/${fileName}`,
    assetName,
    assetAnimated: true,
  });
}

/**
 * A body from anywhere in the shared realm store, not just the infernal folder.
 * The Cryptic bodies below are drawn from three realm folders, so they cannot go
 * through infernalHumanAsset()'s hardcoded `/cr-realms/infernal/` prefix.
 */
function realmStoreAsset(storePath: string, assetName: string): RealmClassAsset {
  return asset('ready', 'Playable human GLB', {
    assetUrl: `/cr-realms/${storePath}`,
    assetName,
    assetAnimated: true,
  });
}

/**
 * Compiled fallback bodies for the Cryptic Realm class cards.
 *
 * These replace the condemned body bank, which was rejected in full (owner,
 * 2026-08-17; and independently by the phase-1 body catalog, which marks 15 of
 * its 18 GLBs `reject`, 2 `marginal`, 0 `ship`). See docs/condemned-body-bank.md
 * for the audit record and the name of the bank - it is deliberately not spelled
 * here, because tests/condemned_body_bank_guard.test.ts bans the string outright.
 *
 * Every body here is from the approved catalog (verdict ship / ship-with-caveat
 * AND examinedCellByCell) and was looked at on its phase-1 contact sheet before
 * being written down - no body is picked from its file name, because an
 * ip_rename pass laundered those and they no longer describe what is in the GLB.
 * None has a weapon or prop baked into its hands; realm_infernal_class_paladin_f
 * was the natural paladin fit and is deliberately NOT used, because the render
 * shows a red greatsword fused to its hand.
 *
 * STATUS, 2026-08-17 (read before reusing any of these): the operator reviewed
 * the six published class bodies and REJECTED FIVE - "failures except 1". Only
 * hunter -> Crypt Stalker survived. So EIGHT of these nine are placeholders, not
 * choices, and the approved catalog is considered spent for this realm: do not
 * "improve" them by scavenging another pool body, because that is the same move
 * that produced the five rejections.
 *
 *   hunter                          KEPT. The one that passed.
 *   warrior rogue priest mage warlock
 *                                   REJECTED - awaiting batch B (cr_rune_warden,
 *                                   cr_cipher_blade, cr_oracle, cr_void_seer,
 *                                   cr_gravecaller).
 *   paladin shaman druid (GAP)      never had a body - awaiting batch A
 *                                   (cr_gargoyle_oathsworn, cr_grave_totemist,
 *                                   cr_chimera_warden).
 *
 * The five rejected ones still MIRROR their published override, so the live card
 * resolves through the override and lands in the same place either way; when the
 * generated body replaces the override, update the entry here to match so the
 * fallback does not drift back to a rejected body.
 */
const CRYPTIC_BODY_ASSETS = {
  // Full-size authored Cryptic warrior; this is intentionally not the Infernal
  // Dark Paladin enemy body.
  runeWarden: realmStoreAsset('crypticrealm/realm_crypticrealm_rune_warden.glb', 'Rune Warden'),
  // Published as class:rogue. Repointed 2026-08-21: the white hooded assassin
  // this named is a third-party likeness and is now permanently rejected, so
  // the card falls back to the realm's own reviewed rogue body.
  cipherBlade: realmStoreAsset('infernal/realm_infernal_class_rogue_f.glb', 'Cipher Blade'),
  // Published as class:hunter. Dark hooded ranger, strapped leathers, no weapon.
  cryptStalker: realmStoreAsset('infernal/realm_infernal_hero_demon_hunter.glb', 'Crypt Stalker'),
  // Published as class:mage. Black shrouded horned faceless figure, hands free.
  voidSeer: realmStoreAsset(
    'arcane/realm_arcane_mystic_sentinel_characters_01968757.glb',
    'Void Seer',
  ),
  // Published as class:priest. Tall veiled sage in layered dark robes, no prop.
  oracle: realmStoreAsset('arcane/realm_arcane_all_seeing_sage_sage_019e1733.glb', 'Oracle'),
  // Published as class:warlock. Deep-blue full-length hooded robe, faceless.
  gravecaller: realmStoreAsset('infernal/realm_infernal_hero_warlock.glb', 'Gravecaller'),

  // GAP - placeholder until cr_gargoyle_oathsworn lands. Horned-helm armoured
  // warlord, hands free; stands in for a monumental sworn guardian.
  gargoyleStandIn: realmStoreAsset(
    'infernal/realm_infernal_evil_warlord_armor_made_0196a156.glb',
    'Gargoyle Oathsworn',
  ),
  // GAP - placeholder until cr_grave_totemist lands. Leather-clad figure, hands free.
  totemistStandIn: realmStoreAsset('infernal/realm_infernal_class_shaman_f.glb', 'Grave Totemist'),
  // GAP - placeholder until cr_chimera_warden lands. Antlered figure in wraps.
  wardenStandIn: realmStoreAsset('infernal/realm_infernal_class_druid_f.glb', 'Chimera Warden'),
} satisfies Record<string, RealmClassAsset>;

const SCARLET_BLOOD_KNIGHT = infernalHumanAsset(
  'realm_infernal_hero_blood_knight_f.glb',
  'Scarlet Blood Knight',
);

const INFERNAL_CLASS_ASSETS = {
  // 2026-08-18: repointed OFF the `infernal_class_*` bank, which was rendered body by
  // body at 320px front and hero and looked at cell by cell. Every one of the eighteen
  // is chibi (four to five head proportions, mitten hands) and several are bare-chested
  // or bare-breasted; infernal_class_warrior.glb is the brute the operator rejected by
  // name. The bank is quarantined (see docs/condemned-body-bank.md). Each entry below
  // now names the SAME body the live infernal document publishes for that card, so the
  // compiled fallback and the published override land in the same place.
  Warrior: realmStoreAsset('crypticrealm/realm_crypticrealm_rune_warden.glb', 'Warrior'),
  Rogue: realmStoreAsset('infernal/realm_infernal_class_rogue_f.glb', 'Rogue'),
  'Sorcerer / Sorceress': realmStoreAsset(
    'infernal/realm_infernal_hero_sorcerer.glb',
    'Sorcerer / Sorceress',
  ),
  Amazon: realmStoreAsset(
    'infernal/realm_infernal_shadow_warrior_characters_fashio_01942cf0.glb',
    'Amazon',
  ),
  Barbarian: realmStoreAsset('infernal/realm_infernal_hero_barbarian.glb', 'Barbarian'),
  Necromancer: realmStoreAsset(
    'infernal/realm_infernal_violet_necromancer_necromancer_m_019cb976.glb',
    'Necromancer',
  ),
  Paladin: realmStoreAsset(
    'infernal/realm_infernal_ironthorn_dread_knight_character_019dd422.glb',
    'Paladin',
  ),
  Druid: realmStoreAsset('infernal/realm_infernal_hero_druid.glb', 'Druid'),
  Assassin: realmStoreAsset('infernal/realm_infernal_hero_assassin.glb', 'Assassin'),
  'Demon Hunter': realmStoreAsset('infernal/realm_infernal_hero_demon_hunter.glb', 'Demon Hunter'),
  Monk: realmStoreAsset('infernal/realm_infernal_hero_monk.glb', 'Monk'),
  Wizard: realmStoreAsset('infernal/realm_infernal_hero_wizard.glb', 'Wizard'),
  'Witch Doctor': realmStoreAsset('infernal/realm_infernal_hero_witch_doctor.glb', 'Witch Doctor'),
  Crusader: realmStoreAsset('infernal/realm_infernal_hero_crusader.glb', 'Crusader'),
  Spiritborn: realmStoreAsset('infernal/realm_infernal_hero_spiritborn.glb', 'Spiritborn'),
  Warlock: realmStoreAsset('infernal/realm_infernal_hero_warlock.glb', 'Warlock'),
  'Blood Knight': SCARLET_BLOOD_KNIGHT,
  Tempest: realmStoreAsset('infernal/realm_infernal_hero_tempest.glb', 'Tempest'),
} satisfies Readonly<Record<string, RealmClassAsset>>;

const INFERNAL_BASE_CLASS_ASSETS: Record<PlayerClass, RealmClassAsset> = {
  warrior: INFERNAL_CLASS_ASSETS.Warrior,
  paladin: SCARLET_BLOOD_KNIGHT,
  hunter: INFERNAL_CLASS_ASSETS['Demon Hunter'],
  rogue: INFERNAL_CLASS_ASSETS.Rogue,
  priest: INFERNAL_CLASS_ASSETS.Necromancer,
  shaman: INFERNAL_CLASS_ASSETS.Monk,
  mage: INFERNAL_CLASS_ASSETS.Wizard,
  warlock: INFERNAL_CLASS_ASSETS.Warlock,
  druid: INFERNAL_CLASS_ASSETS.Druid,
};

const INFERNAL_HERO_ASSETS: Readonly<Record<string, RealmClassAsset>> = {
  ...INFERNAL_CLASS_ASSETS,
};

function classPackAsset(realm: string, cls: PlayerClass, label: string): RealmClassAsset {
  return asset('ready', 'Playable realm GLB', {
    assetUrl: `/cr-realms/${realm}/${realm}_class_${cls}.glb`,
    assetName: label,
    assetAnimated: true,
  });
}

const CRYPTIC_HUMAN_BASE_CLASS_ASSETS: Record<PlayerClass, RealmClassAsset> = {
  warrior: CRYPTIC_BODY_ASSETS.runeWarden,
  paladin: classPackAsset('classic', 'paladin', 'Oathbound Champion'),
  hunter: CRYPTIC_BODY_ASSETS.cryptStalker,
  rogue: classPackAsset('fps', 'rogue', 'Shadow Operative'),
  priest: classPackAsset('dominion', 'priest', 'Astral Oracle'),
  shaman: classPackAsset('dominion', 'shaman', 'Runic Machinist'),
  mage: classPackAsset('arcane', 'mage', 'Void Caster'),
  warlock: classPackAsset('arcane', 'warlock', 'Entropy Binder'),
  druid: classPackAsset('classic', 'druid', 'Wildshape Warden'),
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
    name: 'Sigil-Bound Acolyte',
    baseClass: 'warlock',
    asset: asset('ready', 'Playable enemy GLB', {
      assetUrl:
        '/cr-realms/infernal/meshy_ai_demon_with_body_cover_0616234440_texture_fd4134d0.glb',
      assetName: 'Sigil-Bound Acolyte',
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

function classPackAssets(realm: string, title: string): Record<PlayerClass, RealmClassAsset> {
  return Object.fromEntries(
    PLAYER_CLASS_ORDER.map((cls) => [
      cls,
      classPackAsset(realm, cls, `${title} ${cls.charAt(0).toUpperCase()}${cls.slice(1)}`),
    ]),
  ) as Record<PlayerClass, RealmClassAsset>;
}

const ASSETS_BY_REALM_CLASS: Partial<
  Record<RealmId, Partial<Record<PlayerClass, RealmClassAsset>>>
> = {
  crypticrealm: {
    ...CRYPTIC_HUMAN_BASE_CLASS_ASSETS,
  },
  infernal: INFERNAL_BASE_CLASS_ASSETS,
  classic: classPackAssets('classic', 'Classic'),
  dominion: classPackAssets('dominion', 'Dominion'),
  arcane: classPackAssets('arcane', 'Arcane'),
  arcadevoid: classPackAssets('arcadevoid', 'Arcane Void'),
  fps: classPackAssets('fps', 'FPS'),
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

/**
 * The body a class card shows, with the operator's published override winning
 * over the compiled table.
 *
 * This used to return the compiled entry verbatim, which meant the create-screen
 * CARD ART and the TURNTABLE PREVIEW ignored published `class:*` overrides on
 * every realm except Infernal. Infernal looked correct only by accident: its
 * cards come from infernalClassChoice(), which does its own override lookup, and
 * that path is unreachable for other realms (infernalHeroChoicesForRealm returns
 * [] unless realm.id === 'infernal'). So publishing a crypticrealm class body
 * changed the character in the world and on the portrait - because
 * overrideEntryForCharacter runs ahead of resolveRealmCharacterVisual in
 * manifest.ts - while the card you picked it from still advertised the old one.
 *
 * Precedence is deliberately the same as the world path: override first,
 * compiled table as the fallback. Realms and classes with no published override
 * keep rendering exactly what they render today, which is what keeps the gap
 * cards (a class whose body is still being made) on their compiled default
 * instead of blanking.
 *
 * Unsuffixed `class:<cls>` only, matching infernalClassChoice's class-level key.
 * The sex-suffixed bodies (`class:<cls>:f` / `:m`) are resolved separately, at
 * pick time, by charCreateSexPick/showClassPreview in main.ts.
 */
function assetForBaseClass(realm: RealmContent, baseClass: PlayerClass): RealmClassAsset {
  const compiled: RealmClassAsset =
    ASSETS_BY_REALM_CLASS[realm.id]?.[baseClass] ?? COMING_SOON_ASSET;
  const visualKey = realmClassVisualKey(realm.id, baseClass);
  const override = baseOverride(realm.id, [`class:${baseClass}`]);
  if (!override) return visualKey ? { ...compiled, visualKey } : compiled;
  // A published body is a real, playable GLB even when the compiled entry it
  // replaces was still a "Coming Soon" placeholder - so drop that placeholder's
  // assetIssue too, or the card keeps showing "character job queued" underneath
  // a body that has already shipped.
  const { assetIssue: _replaced, ...rest } = compiled;
  return {
    ...rest,
    assetStatus: 'ready',
    assetStatusLabel: 'Playable',
    assetUrl: override.assetUrl,
    assetName: override.assetName ?? compiled.assetName,
    assetAnimated: true,
    ...(visualKey ? { visualKey } : {}),
  };
}

/**
 * The published override for a BASE card, with tiered-skin bodies stepped over.
 *
 * Same rule as the renderer's baseEntry (render/characters/manifest.ts): a body
 * that an unlocked or paid tier claims is not a default body, so a row still
 * pointing a card at one is ignored here and the card falls back to its own
 * compiled class body. Without this the create screen would keep advertising
 * the Heavenly Host on Warrior and Rogue while the world had already stopped
 * giving it to them, which is the card-versus-world drift this file's header
 * was written about.
 */
function baseOverride(
  realmId: string,
  keys: readonly string[],
): ReturnType<typeof firstRealmVisualOverride> {
  const hit = firstRealmVisualOverride(realmId, keys);
  return hit && isTieredSkinBody(hit.assetUrl) ? null : hit;
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
const INFERNAL_HELL_FACTION = { name: 'Ashen Court', color: '#d24a3a' } as const;

function infernalClassChoice(
  realm: RealmContent,
  name: string,
  baseClass: PlayerClass,
  factionSide: InfernalHeroPresentation['factionSide'],
  assetChoice: RealmClassAsset,
  heroId: string,
  variantOf?: string,
  variants?: readonly InfernalHeroVariant[],
): InfernalHeroPresentation {
  const base = classPresentationForRealm(realm, baseClass);
  const faction = factionSide === 'hell' ? INFERNAL_HELL_FACTION : INFERNAL_HERO_FACTION;
  // Operator override: a saved reassignment for this hero (or its base class)
  // swaps the body asset live, ahead of the compiled default.
  // A hidden variant with no override of its own falls back to the canonical
  // selection's keys, so the toggle can offer a variant before its body exists.
  // Expanded archetypes share only nine mechanical kits. A class-level body is
  // therefore not a valid fallback for a selected hero: applying
  // `class:shaman` here made Monk, Spiritborn, and Tempest all show the same
  // Witch Doctor. Class overrides remain available to legacy characters that
  // have no realmHeroId; a hero card accepts only its own (or canonical variant)
  // override and otherwise keeps its distinct compiled body.
  const override = baseOverride(
    realm.id,
    infernalHeroOverrideKeys(realm.id, { id: heroId, name, variantOf }),
  );
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
        ? `An enemy champion of the Ashen Court, offered apart from the Heavenly Host.`
        : `A mortal champion of the Heavenly Host carrying the ${name} tradition into the Infernal Realm.`,
    color: faction.color,
    ...resolvedAsset,
    heroId,
    factionSide,
    ...(variants ? { variants } : {}),
    ...(variantOf ? { variantOf } : {}),
  };
}

/**
 * The Infernal creator offers one human card per archetype plus a separate
 * enemy roster. The combat server still persists the existing nine mechanical
 * classes, so every presentation choice submits its compatible baseClass.
 */
export function infernalHeroChoicesForRealm(realm: RealmContent): InfernalHeroPresentation[] {
  if (realm.id !== 'infernal') return [];
  const enemyAssets = new Map(INFERNAL_HELL_ENEMIES.map((enemy) => [enemy.name, enemy.asset]));
  const selections = infernalCharacterSelectionsForRealm(realm.id);
  const byId = new Map(selections.map((selection) => [selection.id, selection]));
  const compiledAsset = (selection: (typeof selections)[number]): RealmClassAsset =>
    selection.factionSide === 'hell'
      ? (enemyAssets.get(selection.name) ?? INFERNAL_BASE_CLASS_ASSETS[selection.engineClass])
      : (INFERNAL_HERO_ASSETS[selection.name] ?? INFERNAL_BASE_CLASS_ASSETS[selection.engineClass]);
  return selections.map((selection) =>
    infernalClassChoice(
      realm,
      selection.name,
      selection.engineClass,
      selection.factionSide,
      // A hidden variant ships no compiled asset of its own: it presents the
      // canonical card's body until an override for its own id is published.
      compiledAsset(selection.variantOf ? (byId.get(selection.variantOf) ?? selection) : selection),
      selection.id,
      selection.variantOf,
      selection.variants,
    ),
  );
}

/**
 * Whether a class card offers the compact Female/Male body toggle: true when
 * the active realm publishes a sex-suffixed body override for the card's base
 * class (`class:<cls>:f` / `class:<cls>:m`, see server/realm_visuals.ts
 * OVERRIDE_KEY_RE). One published sex is enough - the un-suffixed body keeps
 * serving the other sex, mirroring overrideEntryForCharacter's fallback, so
 * the toggle is offered as soon as either body exists.
 */
export function classSexToggleAvailable(realmId: string, baseClass: PlayerClass): boolean {
  return (
    firstRealmVisualOverride(realmId, [`class:${baseClass}:f`, `class:${baseClass}:m`]) !== null
  );
}

export function presentationFactionsForRealm(realm: RealmContent): string[] {
  if (realm.id === 'infernal') {
    return [...new Set(infernalHeroChoicesForRealm(realm).map((choice) => choice.faction))];
  }
  const out: string[] = [];
  for (const choice of classChoicesForRealm(realm)) {
    if (!out.includes(choice.faction)) out.push(choice.faction);
  }
  return out;
}
