#!/usr/bin/env node
// What does each infernal hero card ACTUALLY resolve to on the live site?
// Mirrors infernalClassChoice(): published override wins over the compiled
// HERO_VISUALS default, using the ordered key list from infernalHeroOverrideKeys.
import { execFileSync } from 'node:child_process';

const raw = execFileSync('curl', ['-s', 'https://infernal.crypticrealm.com/api/realm-visuals/infernal'], {
  maxBuffer: 1 << 28,
}).toString();
const doc = JSON.parse(raw);
const ov = doc.overrides || {};

// Canonical card list, deduped exactly like buildSelections().
const CARDS = [
  ['Warrior', 'warrior', 'realm_infernal_class_warrior'],
  ['Rogue', 'rogue', 'realm_infernal_class_rogue'],
  ['Sorcerer / Sorceress', 'mage', 'realm_infernal_class_sorcerer'],
  ['Amazon', 'hunter', 'realm_infernal_class_amazon'],
  ['Barbarian', 'warrior', 'realm_infernal_class_barbarian'],
  ['Necromancer', 'warlock', 'realm_infernal_class_necromancer'],
  ['Paladin', 'paladin', 'realm_infernal_class_paladin'],
  ['Druid', 'druid', 'realm_infernal_class_druid'],
  ['Assassin', 'rogue', 'realm_infernal_class_assassin'],
  ['Demon Hunter', 'hunter', 'realm_infernal_class_demon_hunter'],
  ['Monk', 'shaman', 'realm_infernal_class_monk'],
  ['Wizard', 'mage', 'realm_infernal_class_wizard'],
  ['Witch Doctor', 'warlock', 'realm_infernal_class_witch_doctor'],
  ['Crusader', 'paladin', 'realm_infernal_class_crusader'],
  ['Spiritborn', 'shaman', 'realm_infernal_class_spiritborn'],
  ['Warlock', 'warlock', 'realm_infernal_class_warlock'],
  ['Blood Knight', 'paladin', 'realm_infernal_class_blood_knight'],
  ['Tempest', 'shaman', 'realm_infernal_class_tempest'],
];

// Hidden variants (HERO_VARIANTS).
const VARIANTS = {
  'Sorcerer / Sorceress': [
    ['Female', 'infernal-hero-sorceress'],
    ['Male', 'infernal-hero-sorcerer-m'],
  ],
};

const slug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const selId = (name) => `infernal-hero-${slug(name)}`;

function resolve(keys, baseClass) {
  for (const k of [...keys, `class:${baseClass}`]) {
    if (ov[k]) return { key: k, url: ov[k].assetUrl, name: ov[k].assetName };
  }
  return null;
}

console.log(`published revision ${doc.revision}\n`);
const rows = [];
for (const [name, baseClass, compiled] of CARDS) {
  const id = selId(name);
  const hit = resolve([`hero:${id}`, `hero:${name}`], baseClass);
  rows.push({
    card: name,
    source: hit ? `OVERRIDE ${hit.key}` : `COMPILED HERO_VISUALS`,
    asset: hit ? hit.url.split('/').pop() : `${compiled}  (-> class bank)`,
  });
  for (const [label, vid] of VARIANTS[name] ?? []) {
    // Variant falls back to the canonical id then canonical display name.
    const vhit = resolve([`hero:${vid}`, `hero:${name} (${label})`, `hero:${id}`, `hero:${name}`], baseClass);
    rows.push({
      card: `  ${name} [${label}]`,
      source: vhit ? `OVERRIDE ${vhit.key}` : 'COMPILED HERO_VISUALS',
      asset: vhit ? vhit.url.split('/').pop() : `${compiled}  (-> class bank)`,
    });
  }
}
const w = Math.max(...rows.map((r) => r.card.length));
for (const r of rows) {
  console.log(`${r.card.padEnd(w)}  ${r.source.padEnd(42)}  ${r.asset}`);
}
