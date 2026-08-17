#!/usr/bin/env node
// Build a big faction roster for every realm, in the shape infernal already proved:
//   { id, name, engineClass, factionSide, visualKey }
//
// infernal_classes.ts hardcoded this to one realm. Nothing about the shape is
// infernal-specific, so this emits the same structure for all of them and binds each
// entry to a REAL body out of that realm's generated pool — no new asset work, every
// character already rigged, animated and socketed.
//
// Names are original. Genre targets are honoured (Warcraft-shaped classic, Diablo-
// shaped infernal, CoD-shaped fps, 40K-shaped arcane, Avowed-shaped dominion) without
// lifting protected names from those franchises.

import { readFileSync, writeFileSync } from 'node:fs';

const GEN = readFileSync('/opt/cryptic-realm/src/render/characters/manifest.generated.ts', 'utf8');
const POOLS = {};
{
  const b = GEN.slice(GEN.indexOf('GENERATED_REALM_BODIES'));
  for (const m of b.matchAll(/^ {2}([a-z0-9]+): \[([^\]]*)\]/gms)) {
    POOLS[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  }
}

const C = { war: 'warrior', pal: 'paladin', hun: 'hunter', rog: 'rogue', pri: 'priest', mag: 'mage', wlk: 'warlock', dru: 'druid' };

// [name, engineClass, faction, canonicalKey?]
//
// `canonicalKey` pins the two things derived from the display name so a RENAME
// stays display-only. Both derivations are load-bearing and neither may move:
//   - id = slug(key). That id is `realmHeroId` save data — the client sends it
//     back at character create and server/characters.ts validates it through
//     infernalCharacterSelection(). Reslugging it orphans existing characters.
//   - body = pool[fnv(realm + ':' + key) % pool.length]. Rehashing re-rolls the
//     entry's body, and because the collision-skip loop below walks forward from
//     the pick, one changed hash cascades into every LATER entry's body too.
// Omit it and the name is the key (the original behaviour, right for new rows).
// Set it, to the name the row shipped under, whenever a name changes.
const ROSTERS = {
  // Warcraft-shaped: two-faction, race+class flavoured.
  classic: {
    factions: ['Covenant', 'Warhost'],
    list: [
      ['Ironbrand Champion', C.war, 'Covenant'], ['Silverwatch Templar', C.pal, 'Covenant'],
      ['Highglade Marksman', C.hun, 'Covenant'], ['Duskveil Cutthroat', C.rog, 'Covenant'],
      ['Dawnkeeper', C.pri, 'Covenant'], ['Runespire Adept', C.mag, 'Covenant'],
      ['Pactbinder', C.wlk, 'Covenant'], ['Greenmantle Warden', C.dru, 'Covenant'],
      ['Stonehelm Vanguard', C.war, 'Covenant'], ['Lightforge Sentinel', C.pal, 'Covenant'],
      ['Wyrmscout', C.hun, 'Covenant'], ['Gloamblade', C.rog, 'Covenant'],
      ['Oathspeaker', C.pri, 'Covenant'], ['Frostquill Savant', C.mag, 'Covenant'],
      ['Bloodtusk Berserker', C.war, 'Warhost'], ['Emberfang Bulwark', C.pal, 'Warhost'],
      ['Ashbow Stalker', C.hun, 'Warhost'], ['Nightfang Reaver', C.rog, 'Warhost'],
      ['Spiritmender', C.pri, 'Warhost'], ['Stormcaller', C.mag, 'Warhost'],
      ['Souldrinker', C.wlk, 'Warhost'], ['Beastspeaker', C.dru, 'Warhost'],
      ['Ironjaw Warlord', C.war, 'Warhost'], ['Sunscar Zealot', C.pal, 'Warhost'],
      ['Boneshot Tracker', C.hun, 'Warhost'], ['Shadowtooth', C.rog, 'Warhost'],
      ['Ancestor Voice', C.pri, 'Warhost'], ['Cindermage', C.mag, 'Warhost'],
    ],
  },
  // Diablo-shaped: bad humans, demons, undead.
  infernal: {
    factions: ['Ashen Court', 'Heavenly Host', 'The Damned'],
    list: [
      ['Fallen Inquisitor', C.pal, 'The Damned'], ['Blood Cardinal', C.pri, 'The Damned'],
      ['Flesh Baron', C.war, 'The Damned'], ['Plaguewright', C.wlk, 'The Damned'],
      ['Gallows Marshal', C.hun, 'The Damned'], ['Skinbinder', C.rog, 'The Damned'],
      ['Horned Tyrant', C.war, 'Ashen Court'], ['Emberlord', C.mag, 'Ashen Court'],
      ['Soulflayer', C.wlk, 'Ashen Court'], ['Pit Stalker', C.rog, 'Ashen Court'],
      ['Brimstone Herald', C.pri, 'Ashen Court'], ['Abyssal Warden', C.pal, 'Ashen Court'],
      ['Bone Legionnaire', C.war, 'The Damned'], ['Grave Archer', C.hun, 'The Damned'],
      ['Crypt Sovereign', C.wlk, 'The Damned'], ['Rotcaller', C.dru, 'The Damned'],
      ['Wight Sentinel', C.pal, 'The Damned'], ['Shroud Assassin', C.rog, 'The Damned'],
      ['Radiant Exarch', C.pal, 'Heavenly Host'], ['Seraph Lancer', C.war, 'Heavenly Host'],
      ['Choir Warden', C.pri, 'Heavenly Host'], ['Aureate Magus', C.mag, 'Heavenly Host'],
      ['Judgement Bow', C.hun, 'Heavenly Host'], ['Silent Blade', C.rog, 'Heavenly Host'],
    ],
  },
  // CoD/Fortnite-shaped: the ultimate operator roster, unlockable.
  fps: {
    factions: ['Vanguard Company', 'Iron Syndicate', 'Freelancers'],
    list: [
      ['Breacher', C.war, 'Vanguard Company'], ['Point Man', C.war, 'Vanguard Company'],
      ['Designated Marksman', C.hun, 'Vanguard Company'], ['Overwatch', C.hun, 'Vanguard Company'],
      ['Combat Medic', C.pri, 'Vanguard Company'], ['Field Engineer', C.hun, 'Vanguard Company'],
      ['Recon Scout', C.rog, 'Vanguard Company'], ['Demolitions', C.war, 'Vanguard Company'],
      ['Shield Bearer', C.pal, 'Vanguard Company'], ['Comms Officer', C.mag, 'Vanguard Company'],
      ['Enforcer', C.war, 'Iron Syndicate'], ['Ghost Operative', C.rog, 'Iron Syndicate'],
      ['Longshot', C.hun, 'Iron Syndicate'], ['Saboteur', C.rog, 'Iron Syndicate'],
      ['Chem Trooper', C.wlk, 'Iron Syndicate'], ['Heavy Gunner', C.war, 'Iron Syndicate'],
      ['Drone Handler', C.hun, 'Iron Syndicate'], ['Cutthroat', C.rog, 'Iron Syndicate'],
      ['Warden', C.pal, 'Iron Syndicate'], ['Signal Jammer', C.mag, 'Iron Syndicate'],
      ['Bounty Runner', C.rog, 'Freelancers'], ['Scrapjack', C.hun, 'Freelancers'],
      ['Street Doc', C.pri, 'Freelancers'], ['Pit Brawler', C.war, 'Freelancers'],
      ['Wildcard', C.rog, 'Freelancers'], ['Gunsmith', C.hun, 'Freelancers'],
      ['Juggernaut', C.war, 'Freelancers'], ['Trickshot', C.hun, 'Freelancers'],
    ],
  },
  // 40K-shaped rebrand: grimdark gothic-industrial.
  arcane: {
    factions: ['The Aegis', 'Warpborn', 'Forge Conclave'],
    list: [
      ['Aegis Templar', C.pal, 'The Aegis'], ['Bulwark Sergeant', C.war, 'The Aegis'],
      ['Purgation Marshal', C.hun, 'The Aegis'], ['Confessor', C.pri, 'The Aegis'],
      ['Sanctioned Warpseer', C.mag, 'The Aegis'], ['Vigil Sister', C.pal, 'The Aegis'],
      ['Interdictor', C.rog, 'The Aegis'], ['Relic Bearer', C.pri, 'The Aegis'],
      ['Warp Herald', C.wlk, 'Warpborn'], ['Riftblade', C.rog, 'Warpborn'],
      ['Chaos Anointed', C.war, 'Warpborn'], ['Rot Prophet', C.dru, 'Warpborn'],
      ['Mind Render', C.mag, 'Warpborn'], ['Plagueknight', C.pal, 'Warpborn'],
      ['Forge-Adept', C.hun, 'Forge Conclave'], ['Servo Warden', C.war, 'Forge Conclave'],
      ['Arc Magus', C.mag, 'Forge Conclave'], ['Cogpriest', C.pri, 'Forge Conclave'],
      ['Void Purgator', C.hun, 'Forge Conclave'], ['Iron Ascetic', C.rog, 'Forge Conclave'],
    ],
  },
  // Avowed-shaped rebrand: fantasy with firearms.
  dominion: {
    factions: ['Crown Marshals', 'The Verdant', 'Freeholds'],
    list: [
      ['Marshal Warden', C.pal, 'Crown Marshals'], ['Pistol Duelist', C.rog, 'Crown Marshals'],
      ['Line Musketeer', C.hun, 'Crown Marshals'], ['Court Physician', C.pri, 'Crown Marshals'],
      ['Arcane Envoy', C.mag, 'Crown Marshals'], ['Bastion Guard', C.war, 'Crown Marshals'],
      ['Godcaller', C.mag, 'The Verdant'], ['Thornspeaker', C.dru, 'The Verdant'],
      ['Riven', C.war, 'The Verdant'], ['Grove Warden', C.pal, 'The Verdant'],
      ['Hollow Seer', C.pri, 'The Verdant'], ['Beast Marshal', C.hun, 'The Verdant'],
      ['Ranger-Marshal', C.hun, 'Freeholds'], ['Fieldwright', C.hun, 'Freeholds'],
      ['Blackpowder Rogue', C.rog, 'Freeholds'], ['Hedge Binder', C.wlk, 'Freeholds'],
      ['Freehold Bravo', C.war, 'Freeholds'], ['Salt Preacher', C.pri, 'Freeholds'],
    ],
  },
  // StarCraft-shaped: three asymmetric factions.
  arcadevoid: {
    factions: ['Shipyard Compact', 'Hullrot Brood', 'Luminate'],
    list: [
      ['Void Marine', C.war, 'Shipyard Compact'], ['Ghost Pilot', C.rog, 'Shipyard Compact'],
      ['Turretwright', C.hun, 'Shipyard Compact'], ['Firebrand', C.war, 'Shipyard Compact'],
      ['Field Corpsman', C.pri, 'Shipyard Compact'], ['Siege Marshal', C.hun, 'Shipyard Compact'],
      ['Brood Render', C.rog, 'Hullrot Brood'], ['Carapace Tyrant', C.war, 'Hullrot Brood'],
      ['Spore Caller', C.wlk, 'Hullrot Brood'], ['Hive Mender', C.dru, 'Hullrot Brood'],
      ['Lumen Ascendant', C.pal, 'Luminate', 'Zealot Ascendant'],
      ['High Seer', C.mag, 'Luminate'],
      ['Phase Lancer', C.rog, 'Luminate', 'Phase Stalker'],
      ['Lightbinder', C.pri, 'Luminate'],
    ],
  },
  // Deliberately unknowable — the namesake realm keeps its mystery.
  crypticrealm: {
    factions: ['The Unnamed', 'Wanderers'],
    list: [
      ['The Hollow One', C.wlk, 'The Unnamed'], ['Maskbearer', C.rog, 'The Unnamed'],
      ['Silent Choir', C.pri, 'The Unnamed'], ['Thresholder', C.mag, 'The Unnamed'],
      ['The Tall Stranger', C.war, 'The Unnamed'], ['Keeper of Doors', C.pal, 'The Unnamed'],
      ['Cipherblade', C.rog, 'Wanderers'], ['Gravecaller', C.wlk, 'Wanderers'],
      ['Runewarden', C.war, 'Wanderers'], ['Oracle', C.pri, 'Wanderers'],
      ['Voidseer', C.mag, 'Wanderers'], ['Lantern Scout', C.hun, 'Wanderers'],
    ],
  },
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const fnv = (s) => { let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x >>> 0; };

const L = [];
L.push('// GENERATED FILE - DO NOT EDIT BY HAND.');
L.push('// Produced by scripts/realm_assets/gen_rosters.mjs.');
L.push('//');
L.push('// Per-realm faction rosters in the shape infernal_classes.ts proved out:');
L.push('// a name, the upstream class it plays as, a faction, and a body. Every entry is');
L.push('// bound to a REAL body from that realm\'s generated pool, so all of them are');
L.push('// already rigged, animated and weapon-socketed - adding a character costs a table');
L.push('// row, not an asset run.');
L.push('//');
L.push('// Names are original. Genre targets are honoured without lifting protected names.');
L.push('');
L.push("import type { PlayerClass } from '../types';");
L.push('');
L.push('export interface RealmRosterEntry {');
L.push('  id: string;');
L.push('  name: string;');
L.push('  /** Upstream class this character actually plays as. */');
L.push('  engineClass: PlayerClass;');
L.push('  faction: string;');
L.push('  /** Key into VISUALS / GENERATED_VISUALS. */');
L.push('  visualKey: string;');
L.push('}');
L.push('');
L.push('export const REALM_ROSTERS: Record<string, readonly RealmRosterEntry[]> = {');

let total = 0;
const summary = {};
for (const [realm, spec] of Object.entries(ROSTERS)) {
  const pool = POOLS[realm] ?? [];
  if (!pool.length) { console.log(`  ! ${realm}: no pool, skipped`); continue; }
  const used = new Set();
  L.push(`  ${realm}: [`);
  for (const [name, cls, faction, canonicalKey] of spec.list) {
    // The id and the body both key off `canonicalKey` (default: the name), so a
    // display rename never moves save data or re-rolls a body — see ROSTERS.
    const key = canonicalKey ?? name;
    // Deterministic body pick, skipping collisions so each character looks distinct.
    let idx = fnv(realm + ':' + key) % pool.length;
    let guard = 0;
    while (used.has(pool[idx]) && guard++ < pool.length) idx = (idx + 1) % pool.length;
    used.add(pool[idx]);
    L.push(`    { id: '${slug(key)}', name: ${JSON.stringify(name)}, engineClass: '${cls}', faction: ${JSON.stringify(faction)}, visualKey: '${pool[idx]}' },`);
    total++;
  }
  L.push('  ],');
  summary[realm] = spec.list.length;
}
L.push('};');
L.push('');
L.push('export const REALM_FACTIONS: Record<string, readonly string[]> = {');
for (const [realm, spec] of Object.entries(ROSTERS)) {
  if (!POOLS[realm]?.length) continue;
  L.push(`  ${realm}: [${spec.factions.map((f) => JSON.stringify(f)).join(', ')}],`);
}
L.push('};');
L.push('');

writeFileSync('/opt/cryptic-realm/src/sim/realms/rosters.generated.ts', L.join('\n'));
console.log('[rosters]', total, 'characters ->', JSON.stringify(summary));
