#!/usr/bin/env node
// Route PICKTURA (and other unlabeled) meshes to realms by filename lexicon.
//
// Routing is NON-EXCLUSIVE: an asset may serve several realms (assets are to be
// re-used appropriately). `realms[]` lists every match; `primary` is its home.
//
// Realm themes (as directed):
//   infernal    dark gothic ARPG          demons, undead, hell
//   classic     bright fantasy (WoW-ish)  orcs vs humans vs elves; demons only at low tier
//   dominion    sci-fi alien war (SC-ish)  space, mechs, aliens, troopers
//   fps         Fortnite-ish shooter       gun-holders + ANY humanoid
//   arcane      cosmic crystal void        crystal, astral, ethereal, mage
//   arcadevoid  arcade                     neon, retro, synth
//   crypticrealm namesake landing          curated best-of
//   exchange    cross-realm hub            vendors/merchants only
//   claudecraft pristine upstream          left untouched
//
// Usage: node classify.mjs --src /mnt/usb4/meshy/PICKTURA/glb --out entries.json [--limit N]

import { readdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const SRC = arg('src', '/mnt/usb4/meshy/PICKTURA/glb');
const OUT = arg('out', 'entries.json');
const LIMIT = Number(arg('limit', 0));
const PER_REALM_CAP = Number(arg('cap', 0));
// Let prose-named meshes through to the shape gate instead of dropping them here.
const PERMISSIVE = !!arg('permissive');

const LEX = {
  infernal: ['demon', 'devil', 'imp', 'balrog', 'fiend', 'hell', 'fallen', 'butcher', 'skeleton',
    'skull', 'undead', 'zombie', 'wraith', 'necro', 'bone', 'cursed', 'doom', 'plague', 'grave',
    'soul', 'blood', 'infernal', 'diabl', 'reaper', 'lich', 'ghoul', 'vampire', 'nightmare',
    'shadow', 'dread', 'gore', 'hexed', 'damned', 'abyss', 'sinister', 'torment'],
  classic: ['orc', 'human', 'elf', 'dwarf', 'knight', 'paladin', 'ranger', 'troll', 'goblin',
    'beast', 'warrior', 'archer', 'druid', 'hunter', 'bear', 'wolf', 'boar', 'villager', 'farmer',
    'blacksmith', 'peasant', 'squire', 'guard', 'barbarian', 'berserker', 'ogre', 'kobold',
    'gnome', 'halfling', 'centaur', 'minotaur', 'griffin', 'medieval', 'tavern'],
  dominion: ['space', 'alien', 'mech', 'robot', 'cyber', 'marine', 'trooper', 'drone', 'exosuit',
    'android', 'galactic', 'laser', 'plasma', 'starship', 'astronaut', 'sci-fi', 'scifi', 'tech',
    'cybernetic', 'terminator', 'mecha', 'bot', 'machine', 'steel', 'iron', 'chrome', 'titanium',
    'reactor', 'orbital', 'nebula', 'xeno'],
  fps: ['gun', 'rifle', 'soldier', 'tactical', 'commando', 'sniper', 'swat', 'operative',
    'mercenary', 'militia', 'trooper', 'gunner', 'shooter', 'pistol', 'shotgun', 'assault',
    'special forces', 'spec ops', 'ranger', 'agent', 'operator'],
  arcane: ['crystal', 'cosmic', 'astral', 'ethereal', 'arcane', 'mage', 'wizard', 'rune',
    'spectral', 'celestial', 'starlight', 'prism', 'aether', 'sorcer', 'enchant', 'mystic',
    'eldritch', 'void', 'nebul', 'lumin', 'radiant', 'glow', 'spirit', 'phantom', 'conjur'],
  arcadevoid: ['neon', 'arcade', 'retro', 'pixel', 'synth', 'vapor', 'glitch', 'cyberpunk',
    '8-bit', '8bit', 'chiptune', 'hologram'],
  exchange: ['merchant', 'vendor', 'trader', 'shopkeeper', 'banker', 'auction'],
};

// Anything that reads as a person gets to be an FPS body ("can have any humanoid really").
const HUMANOID = ['warrior', 'knight', 'soldier', 'mage', 'ranger', 'orc', 'elf', 'human',
  'man', 'woman', 'girl', 'boy', 'guy', 'lady', 'lord', 'king', 'queen', 'warlord', 'captain',
  'hunter', 'rogue', 'thief', 'assassin', 'monk', 'priest', 'cleric', 'bard', 'archer',
  'goblin', 'troll', 'dwarf', 'gnome', 'hero', 'villain', 'guard', 'fighter', 'champion',
  'ninja', 'samurai', 'pirate', 'viking', 'wizard', 'witch', 'sorcer', 'demon', 'skeleton',
  'zombie', 'robot', 'android', 'cyborg', 'alien', 'trooper', 'marine', 'outlaw', 'bandit'];

// Non-humanoid shapes the KayKit biped rig cannot represent — excluded outright.
const NON_HUMANOID = ['unicycle', 'vehicle', 'car', 'truck', 'tank', 'ship', 'boat', 'plane',
  'sword', 'axe', 'shield', 'helmet', 'potion', 'chest', 'barrel', 'crate', 'tree', 'rock',
  'house', 'building', 'tower', 'castle', 'bridge', 'chair', 'table', 'lamp', 'door',
  'portrait', 'bust', 'statue', 'emblem', 'logo', 'icon', 'coin', 'ring', 'amulet', 'book',
  'scroll', 'gem', 'crystal ball', 'flower', 'plant', 'food', 'cake', 'pizza', 'bottle',
  'dragon', 'wyvern', 'horse', 'wolf', 'bear', 'spider', 'crab', 'fish', 'bird', 'snake',
  'quadruped', 'mount', 'pet', 'turret', 'cannon', 'gun rack', 'banner', 'flag'];

// Names here are full Meshy PROMPTS, often a paragraph. Keep only the first few
// meaningful words so keys stay short and readable; uniqueness comes from the
// resultId suffix the caller appends, not from the prose.
const STOP = new Set(['a', 'an', 'the', 'of', 'with', 'and', 'in', 'on', 'his', 'her', 'its',
  'their', 'is', 'are', 'that', 'this', 'it', 'has', 'from', 'for', 'to', 'by', 'full', 'size',
  'body', 'object', 'features', 'model', 'style', 'high', 'detail', 'detailed', 'very']);

function slug(s) {
  const words = s.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').split(/\s+/)
    .filter((w) => w && !STOP.has(w));
  return words.slice(0, 4).join('_').slice(0, 32) || 'asset';
}

// resultId -> {name, tags, categories} from the PUBLIC Meshy showcase listing
// (enum_names.py). Most PICKTURA GLBs are named `<resultId>__model.glb` and carry
// no descriptive name on disk, so this map is what makes them classifiable at all.
const NAMES = (() => {
  try { return JSON.parse(readFileSync(arg('names', '/tmp/meshy_names.json'), 'utf8')); }
  catch { return {}; }
})();

// Meshy's OWN categories beat anything inferable from the prose prompt, and they
// catch what geometry cannot. The alien "face relief" busts that flooded dominion
// measure identically to a slim humanoid (wide/y 0.42 vs 0.43, thin/y 0.27 vs 0.32),
// so no bbox rule can separate them — but 11/11 of the ones I rejected by eye carry
// ArtAbstract, against 1/11 of the ones I kept. These categories are sculpture,
// decor, scenery and non-biped subjects: nothing here should get a humanoid rig.
const REJECT_CATEGORIES = new Set([
  'ArtAbstract', 'Vehicles', 'Architecture', 'FurnitureHome', 'NaturePlants',
  'Music', 'PlacesTravel', 'Animals', 'FoodDrink', 'Electronics',
]);

function categoriesOf(file) {
  return NAMES[file.split('__')[0]]?.categories ?? [];
}

function nameOf(file) {
  // <resultId>__<Descriptive_Name>.glb  |  <resultId>__model.glb
  const rid = file.split('__')[0];
  const meta = NAMES[rid];
  const fromFile = file.match(/^[0-9a-f-]+__(.+)\.glb$/i)?.[1]?.replace(/_/g, ' ') ?? '';
  const base = (meta?.name || (fromFile === 'model' ? '' : fromFile) || '').trim();
  if (!base) return '';
  // Fold tags/categories in so the lexicon has more to match on.
  const extra = [...(meta?.tags ?? []), ...(meta?.categories ?? [])].join(' ');
  return extra ? `${base} ${extra}` : base;
}

function classify(pretty) {
  const s = pretty.toLowerCase();
  const isHumanoid = HUMANOID.some((k) => s.includes(k));
  // Positive humanoid evidence BEATS prop evidence. These are prose prompts, so
  // "warrior with a sword" and "orc in rusted armor holding an axe" both trip the
  // prop list — and those are precisely the armed bodies wanted as NPC/enemy
  // assets. Checking the prop list first silently discarded them.
  if (!isHumanoid && NON_HUMANOID.some((k) => s.includes(k))) return null;
  const realms = [];
  for (const [realm, keys] of Object.entries(LEX)) {
    if (keys.some((k) => s.includes(k))) realms.push(realm);
  }
  // Permissive fallback. Names here are full Meshy PROMPTS — long, free-form prose
  // that frequently describes a perfectly good character without ever using one of
  // our keywords, which is why a strict lexicon dropped ~2,250 meshes. The
  // geometric shape gate in rig_batch is now reliable (14/14 on measured ground
  // truth) and rejects non-humanoids for 0.1s, so classification can afford to let
  // the uncertain through and be judged on proportions instead of vocabulary.
  if (!isHumanoid && realms.length === 0) {
    if (!PERMISSIVE) return null;
    return { realms: ['fps', 'classic'], primary: 'classic', weak: true };
  }
  // Every humanoid is FPS-eligible.
  if (isHumanoid && !realms.includes('fps')) realms.push('fps');
  // Classic only takes demons at low tier; apex demon words stay infernal-only.
  if (realms.includes('classic') && realms.includes('infernal')) {
    if (/(boss|nightmare|lord|king|prime|ancient|elder)/.test(s)) {
      const i = realms.indexOf('classic');
      if (i >= 0) realms.splice(i, 1);
    }
  }
  if (realms.length === 0) return null;
  // Primary = first non-fps match if there is one, else fps.
  const primary = realms.find((r) => r !== 'fps') ?? 'fps';
  return { realms, primary };
}

const files = readdirSync(SRC).filter((f) => f.endsWith('.glb'));
const entries = [];
const counts = {};
const skipped = { nonHumanoid: 0, unmatched: 0, byCategory: 0 };

for (const f of files) {
  const cats = categoriesOf(f);
  // Category veto first: sculpture/decor/scenery/animals never get a humanoid rig.
  // 'Characters' present does NOT rescue an ArtAbstract piece — the two worst
  // dominion busts carried both.
  if (cats.some((c) => REJECT_CATEGORIES.has(c))) { skipped.byCategory++; continue; }
  const pretty = nameOf(f);
  if (!pretty) { skipped.unmatched++; continue; }
  const c = classify(pretty);
  if (!c) { skipped.nonHumanoid++; continue; }
  const rid = f.split('__')[0];
  const key = `realm_${c.primary}_${slug(pretty)}_${rid.slice(0, 8)}`;
  if (PER_REALM_CAP && (counts[c.primary] ?? 0) >= PER_REALM_CAP) continue;
  counts[c.primary] = (counts[c.primary] ?? 0) + 1;
  entries.push({ src: join(SRC, f), key, rid, realm: c.primary, realms: c.realms,
    name: pretty.slice(0, 140) });
  if (LIMIT && entries.length >= LIMIT) break;
}

writeFileSync(OUT, JSON.stringify(entries, null, 1));
console.log(`[classify] ${files.length} files -> ${entries.length} routed`);
console.log('[classify] per primary realm:', counts);
console.log('[classify] skipped:', skipped);
const multi = entries.filter((e) => e.realms.length > 1).length;
console.log(`[classify] multi-realm (re-used): ${multi}`);
