// Third-party IP guard for player-visible realm content.
//
// Cryptic Realm's realms are deliberately genre-shaped — infernal is
// Diablo-shaped, classic is Warcraft-shaped, Arcane Void is military-SF-shaped.
// Honouring a genre is fine. Shipping another company's COINED PROPER NOUNS is
// not, and that is the only thing this file polices.
//
// Two rules, because the two failure modes are different:
//
//   1. DENYLIST — distinctive coined proper nouns with no generic-English
//      meaning (Protoss, Khaydarin, Frostmourne, Horadric). These may never
//      appear in any realm's player-visible strings. A new one is a straight
//      failure.
//
//   2. KNOWN_UNCLEARED — terms the 2026-08 IP audit found in realms OTHER than
//      Arcane Void and deliberately left in place for the operator to rule on.
//      The guard pins them EXACTLY: a new offender in these realms fails, and
//      clearing one also fails until it is deleted from this list. That keeps
//      the open exposure from growing quietly and keeps this list honest.
//
// Scope note: `claudecraft` is exempt by design. It mirrors upstream
// world-of-claudecraft verbatim and must not diverge (see realms/registry.ts).
import { describe, expect, it } from 'vitest';
import { REALM_LIST, type RealmContent, type RealmId } from '../src/sim/realms';
import { REALM_FACTIONS as FACTION_ROSTERS } from '../src/sim/realms/factions';
import {
  REALM_FACTIONS as ROSTER_FACTIONS,
  REALM_ROSTERS,
} from '../src/sim/realms/rosters.generated';
import { classChoicesForRealm } from '../src/ui/cryptic/realm_class_presentation';

const EXEMPT_REALMS: readonly RealmId[] = ['claudecraft'];

/** Coined proper nouns. Deliberately excludes generic English that merely also
 *  occurs in a franchise (nexus, void, warp, archon, alliance, horde, zealot,
 *  templar, marine, ghost, swarm, hive, brood, covenant) — those are judged by
 *  cluster in review, not by substring here, or the guard would fire on every
 *  ordinary fantasy noun. */
const DENYLIST: readonly string[] = [
  // Blizzard — StarCraft
  'protoss', 'zerg', 'zergling', 'hydralisk', 'mutalisk', 'ultralisk', 'baneling',
  'infestor', 'terran', 'khala', 'khaydarin', 'aiur', 'overmind', 'nydus', 'medivac',
  'battlecruiser', 'kerrigan', 'raynor', 'zeratul', 'tassadar', 'artanis', 'mengsk',
  'xel naga', "xel'naga", 'psionic storm',
  // Blizzard — Warcraft
  'azeroth', 'stormwind', 'orgrimmar', 'arthas', 'thrall', 'sylvanas', 'illidan',
  'deathwing', 'draenei', 'worgen', 'tauren', 'northrend', 'outland', 'kalimdor',
  'felguard', 'frostmourne', 'silvermoon', 'naaru', 'ragnaros', 'onyxia', 'murloc',
  'gnomeregan', 'undercity', 'lich king', "quel'thalas",
  // Blizzard — Diablo
  'mephisto', 'andariel', 'duriel', 'izual', 'horadric', 'horadrim', 'tyrael',
  'tristram', 'kurast', 'harrogath', 'worldstone', 'zakarum', 'deckard cain',
  // Games Workshop — Warhammer 40,000
  'astartes', 'adeptus', 'tyranid', 'space marine', 'imperium of man',
  // Microsoft — Halo
  'master chief', 'forerunner', 'cortana',
  // EA/BioWare — Mass Effect
  'turian', 'asari', 'krogan', 'salarian',
  // Marvel. 'Iron Spider' is a coined suit name; the two words are ordinary
  // English apart, which is exactly how it survived. A 2026-08-17 sweep
  // quarantined the Protoss-named Dragoon assets by name pattern and left
  // arcadevoid/mechs/ironspider_colossus_019d87d3 sitting next to them,
  // because nothing on this list matched it. Both spellings, since the asset
  // drops use the closed compound and the franchise uses the open one.
  // The asset itself was cleared later that day: the store file and its decor
  // registration in src/sim/realm_decor.generated.ts both moved to
  // siege_weaver_019d87d3, and the original is in the dated quarantine. These
  // entries stay so the NEXT one cannot arrive quietly.
  'ironspider', 'iron spider',
  // Other franchises seen in this estate's asset drops
  'cybertron', 'ncc-1701', 'white walker', 'he-man', 'trap jaw', 'grinch',
];

/** Realm -> terms the audit found and left for the operator to rule on.
 *  Shrink this list as they are cleared; never grow it without a decision. */
const KNOWN_UNCLEARED: Partial<Record<RealmId, readonly string[]>> = {
  // 'Orc, tauren, troll, and outcast clans...' — the Horde faction lore in
  // realms/factions.ts. Tauren is a coined Warcraft race name; orc and troll
  // are folklore and fine. Note this realm ALSO ships 'Alliance' and 'Horde'
  // as its two faction names: both are ordinary English, so they are not
  // denylistable, but as a pair on a Warcraft-shaped realm they read as the
  // Warcraft factions. That is a judgement call for the operator, not a
  // substring rule, so it is written up in the audit rather than pinned here.
  classic: ['tauren'],
  // A deed description in the Infernal lore overlay ('bandits, murlocs, and
  // mine vermin put down'). Murloc is a coined Warcraft creature name. It
  // tracks a canonical upstream quest id (q_murlocs) whose ID must not move —
  // the fix is an entityText display override, not a rename.
  infernal: ['murloc'],
  // 'Psionic Storm' is a skill-tree name on the Psionic Operative, and it is
  // the StarCraft High Templar's ability name verbatim. 'Psionic' alone is
  // generic; the two-word phrase is the lift.
  dominion: ['psionic storm'],
};

/** Every player-visible string a realm puts on screen. */
function visibleStrings(realm: RealmContent): string[] {
  const out: string[] = [
    realm.name,
    realm.tagline,
    realm.description,
    realm.mood,
    realm.season?.eyebrow ?? '',
    realm.season?.title ?? '',
    realm.season?.body ?? '',
    realm.branding?.brandText ?? '',
    realm.currencyName ?? '',
    realm.shortBrand ?? '',
  ];

  for (const skin of realm.classes) {
    out.push(skin.name, skin.role, skin.lore, ...skin.skillTrees);
    for (const skill of skin.skills) out.push(skill.name, skill.type, skill.desc);
  }

  // RealmBestiary is the act array itself — zones, monsters, bosses, boss lore
  // and every phase-transition line all render in the Monster Chronicle.
  for (const act of realm.bestiary ?? []) {
    out.push(act.name, act.desc, ...act.zones);
    for (const mob of act.monsters) out.push(mob.name, mob.type);
    for (const boss of act.bosses) {
      out.push(boss.name, boss.type, boss.lore, ...boss.abilities);
      for (const phase of boss.phases) out.push(phase.ability);
    }
  }

  // The lore overlay (RealmEntityText) — the Infernal-style display re-skin.
  // Keys are canonical ids and never move; only the VALUES reach a player.
  const collect = (value: unknown): void => {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };
  collect(realm.entityText);

  // Faction cards, generated roster cards, and the character-select class cards.
  for (const f of FACTION_ROSTERS[realm.id] ?? []) out.push(f.name, f.lore);
  for (const row of REALM_ROSTERS[realm.id] ?? []) out.push(row.name, row.faction);
  out.push(...(ROSTER_FACTIONS[realm.id] ?? []));
  for (const choice of classChoicesForRealm(realm)) {
    out.push(choice.name, choice.faction, choice.lore, choice.role);
  }

  return out.filter((s) => s.length > 0);
}

function hits(strings: readonly string[], terms: readonly string[]): string[] {
  const hay = strings.join('\n').toLowerCase();
  return terms.filter((term) => hay.includes(term));
}

const AUDITED = REALM_LIST.filter((r) => !EXEMPT_REALMS.includes(r.id));

describe('realm content carries no third-party IP', () => {
  it.each(AUDITED.map((r) => [r.id, r] as const))(
    '%s ships no coined franchise proper nouns',
    (id, realm) => {
      const allowed = KNOWN_UNCLEARED[id] ?? [];
      const found = hits(visibleStrings(realm), DENYLIST).filter((t) => !allowed.includes(t));
      expect(found, `${id} player-visible content contains franchise proper nouns`).toEqual([]);
    },
  );

  it('Arcane Void is fully cleared — it carries no uncleared terms at all', () => {
    // The realm this audit was opened for. It gets no KNOWN_UNCLEARED budget.
    expect(KNOWN_UNCLEARED.arcadevoid).toBeUndefined();
    const arcadevoid = AUDITED.find((r) => r.id === 'arcadevoid')!;
    expect(hits(visibleStrings(arcadevoid), DENYLIST)).toEqual([]);
  });

  it('pins the known-uncleared exposure so it cannot grow or go stale', () => {
    for (const [id, terms] of Object.entries(KNOWN_UNCLEARED) as [RealmId, string[]][]) {
      const realm = AUDITED.find((r) => r.id === id);
      expect(realm, `${id} is listed as uncleared but is not an audited realm`).toBeTruthy();
      // Exactly the recorded terms: a new one fails, and a cleared one fails
      // until it is removed from KNOWN_UNCLEARED.
      expect(hits(visibleStrings(realm!), DENYLIST).sort()).toEqual([...terms].sort());
    }
  });
});
