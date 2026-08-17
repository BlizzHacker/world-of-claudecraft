import type { PlayerClass } from '../types';
import type { RealmFaction, RealmFactionAlignment, RealmId } from './types';

export interface RealmFactionRoster extends RealmFaction {
  classes: readonly PlayerClass[];
}

const faction = (
  id: string,
  name: string,
  alignment: RealmFactionAlignment,
  lore: string,
  classes: readonly PlayerClass[],
  surprise = false,
): RealmFactionRoster => ({ id, name, alignment, lore, classes, surprise });

export const REALM_FACTIONS: Readonly<Record<RealmId, readonly RealmFactionRoster[]>> = {
  crypticrealm: [
    faction('rune-court', 'Rune Court', 'good', 'Keepers of the seals beneath Eastbrook.', [
      'warrior',
      'paladin',
      'priest',
    ]),
    faction(
      'gravebound',
      'Gravebound',
      'neutral',
      'Relic-binders who bargain with the dead without serving them.',
      ['hunter', 'shaman', 'warlock'],
    ),
    faction(
      'voidbound',
      'Voidbound',
      'mixed',
      'Survivors who use the dark to contain worse things.',
      ['mage', 'druid'],
    ),
    faction(
      'ciphered',
      'Ciphered',
      'neutral',
      'Information brokers who treat every secret as a weapon.',
      ['rogue'],
    ),
  ],
  infernal: [
    faction(
      'heavenly-host',
      'Heavenly Host',
      'good',
      'Angels and mortal crusaders defending the last sanctuaries.',
      ['paladin', 'priest'],
    ),
    faction(
      'burning-hells',
      'Ashen Court',
      'evil',
      'Demon legions and corrupted soldiers that want the world reduced to embers.',
      ['mage', 'warlock'],
    ),
    faction(
      'ashen-court',
      'Veilbound Court',
      'mixed',
      'Necromancers, good vampires, and deathbound nobles who reject both thrones.',
      ['hunter', 'shaman'],
      true,
    ),
    faction(
      'abyssal-legion',
      'Abyssal Legion',
      'evil',
      'Ironbound enforcers and pit assassins serving the deepest warlords.',
      ['warrior', 'rogue'],
    ),
    faction(
      'redeemed',
      'The Redeemed',
      'good',
      'Tainted angels and repentant demons who fight their former masters.',
      ['druid'],
      true,
    ),
  ],
  classic: [
    faction(
      'alliance',
      'Alliance',
      'good',
      'Human, elven, and dwarf kingdoms defending the old roads.',
      ['warrior', 'paladin', 'priest', 'mage'],
    ),
    faction('horde', 'Horde', 'mixed', 'Orc, tauren, troll, and outcast clans bound by survival.', [
      'hunter',
      'rogue',
      'shaman',
      'warlock',
      'druid',
    ]),
  ],
  dominion: [
    faction(
      'human-dominion',
      'Human Dominion',
      'good',
      'A disciplined expeditionary government holding the frontier.',
      ['warrior', 'paladin', 'hunter'],
    ),
    faction(
      'frontier-corps',
      'Frontier Corps',
      'neutral',
      'Engineers and medics protecting civilians between powers.',
      ['priest', 'shaman'],
    ),
    faction(
      'psionic-directorate',
      'Psionic Directorate',
      'mixed',
      'A secretive agency that believes control is mercy.',
      ['rogue', 'mage', 'warlock', 'druid'],
    ),
  ],
  arcane: [
    faction(
      'star-court',
      'Star Court',
      'good',
      'Astral guardians who stabilize collapsing worlds.',
      ['warrior', 'paladin', 'druid'],
    ),
    faction(
      'crystal-concord',
      'Crystal Concord',
      'neutral',
      'Portal keepers and resonance engineers sharing forbidden knowledge.',
      ['hunter', 'priest', 'shaman'],
    ),
    faction(
      'voidborn',
      'Voidborn',
      'mixed',
      'Rift survivors who use entropy before entropy uses them.',
      ['rogue', 'mage', 'warlock'],
    ),
  ],
  // Arcane Void's three powers are named off the realm's OWN spine — the void
  // shipyards, the derelict hulls between them, and the light that predates
  // both — and they are the same three names the generated roster uses
  // (REALM_FACTIONS in rosters.generated.ts). Order is load-bearing: index 0 is
  // styled as the 'heaven' side in rosterSelectionsFor (infernal_classes.ts).
  //
  // These ids are safe to have been renamed because a faction id never leaves
  // this module: factionForRealmClass / factionForRealmCharacter return the
  // whole record and every caller reads `.name`, factionIdsForRealm has no
  // non-test consumer, and no id is persisted, wired, or routed. Roster entry
  // ids (rosters.generated.ts) are the opposite case and did NOT move — those
  // are `realmHeroId` save data validated in server/characters.ts.
  arcadevoid: [
    faction(
      'shipyard-compact',
      'Shipyard Compact',
      'neutral',
      'A militarized salvage charter fighting to keep its shipyards intact.',
      ['warrior', 'hunter', 'shaman'],
    ),
    faction(
      'luminate',
      'Luminate',
      'good',
      'Lightforged guardians defending the last crystal worlds.',
      ['paladin', 'priest', 'mage'],
    ),
    faction(
      'hullrot-brood',
      'Hullrot Brood',
      'evil',
      'An adaptive brood that treats every derelict hull as a nest.',
      ['rogue', 'warlock', 'druid'],
    ),
  ],
  fps: [
    faction(
      'coalition',
      'Coalition',
      'good',
      'A field alliance built around rescue, cover, and fire discipline.',
      ['warrior', 'paladin', 'hunter', 'priest', 'shaman'],
    ),
    faction(
      'rogue-cell',
      'Rogue Cell',
      'mixed',
      'Operators who choose their own missions and their own rules.',
      ['rogue', 'mage', 'warlock', 'druid'],
    ),
  ],
  claudecraft: [
    faction(
      'claudecraft',
      'Claudecraft',
      'neutral',
      'The original shared world and its existing roster.',
      ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'shaman', 'mage', 'warlock', 'druid'],
    ),
  ],
  exchange: [
    faction(
      'free-trade',
      'Free Trade Compact',
      'neutral',
      'A neutral market charter that forbids realm warfare.',
      [],
    ),
  ],
};

export function factionsForRealm(id: RealmId): readonly RealmFactionRoster[] {
  return REALM_FACTIONS[id] ?? [];
}

export function factionForRealmClass(id: RealmId, cls: PlayerClass): RealmFactionRoster | null {
  return factionsForRealm(id).find((entry) => entry.classes.includes(cls)) ?? null;
}

/** Character identity overrides are intentionally explicit. DuranceTester is a
 * humanoid Infernal tester; demon bodies remain reserved for Hell enemies. */
export function factionForRealmCharacter(
  id: RealmId,
  cls: PlayerClass,
  characterName: string,
): RealmFactionRoster | null {
  const normalized = characterName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (id === 'infernal' && normalized === 'durancetester') {
    return factionsForRealm(id).find((entry) => entry.id === 'heavenly-host') ?? null;
  }
  return factionForRealmClass(id, cls);
}

export function factionIdsForRealm(id: RealmId): readonly string[] {
  return factionsForRealm(id).map((entry) => entry.id);
}
