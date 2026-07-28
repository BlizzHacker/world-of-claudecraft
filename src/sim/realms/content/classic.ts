// Classic — bright low-poly heroic fantasy. Hermes/Qwen origin:
// cryptic/crThemes.js "classic-realm".

import type { RealmContent } from '../types';

export const CLASSIC_REALM: RealmContent = {
  id: 'classic',
  name: 'Classic Realm',
  tagline: 'Colorful low-poly fantasy — heroes, quests, and open skies',
  description:
    'A bright, welcoming world of rolling meadows, bustling towns, and ancient ' +
    'forests. Classic MMO gameplay with modern polish.',
  mood: 'Bright · Heroic · Adventurous',
  season: {
    eyebrow: 'Season 1',
    title: 'The Adventurer\'s Armory',
    body:
      'Limited weapon skins from the Classic Realm\'s adventurer armories. Account-wide, purely cosmetic, and shown to everyone around you.',
  },
  accentHex: '#4a9eff',
  bgGradient: 'linear-gradient(135deg, #0f1a2a 0%, #080f1a 100%)',
  previewColors: { primary: '#4a9eff', secondary: '#ffd700', bg: '#0f1a2a' },
  branding: {
    logoSrc: '/cryptic-realm-logo-512.webp',
    brandText: 'Cryptic Realm - Classic',
    loadingScreenSrc: '/cryptic-realm-loading.png',
    discordUrl: 'https://discord.gg/Zdj3JGrx',
    showDonate: false,
    showAuthentikSso: true,
  },
  classes: [
    {
      id: 'steelcrusader', name: 'Steel Crusader', role: 'Tank', baseClass: 'paladin', icon: '⚔', color: '#f58cba',
      lore: 'Sworn to the Order of the Dawn, Steel Crusaders ride at the vanguard of every holy war. Their hammers glow with righteous light.',
      baseStats: { maxHp: 190, maxMp: 80, str: 30, dex: 10, vit: 35, nrg: 14, dmg: 22, def: 34, spd: 1.0 },
      skills: [
        { name: 'Holy Smite', icon: '✝', mp: 18, type: 'Melee', dmg: 220, range: 3, desc: 'Strike with divine wrath, healing self for 20% of damage', color: '#ffd700' },
        { name: 'Divine Shield', icon: '\u{1F6E1}', mp: 40, type: 'Buff', dmg: 0, range: 0, desc: 'Become immune to all damage for 6s', color: '#ffffff' },
        { name: 'Consecrate', icon: '☀', mp: 30, type: 'AoE', dmg: 160, range: 5, desc: 'Sanctify the ground, damaging undead and demons', color: '#f58cba' },
        { name: 'Judgment', icon: '⚖', mp: 35, type: 'Debuff', dmg: 180, range: 10, desc: 'Mark enemy as unworthy, -30% defense for 10s', color: '#e74c3c' },
      ],
      skillTrees: ['Holy Order', "Crusader's Vow", 'Divine Wrath'],
    },
    {
      id: 'voidarcher', name: 'Void Archer', role: 'DPS', baseClass: 'hunter', icon: '\u{1F3F9}', color: '#abd473',
      lore: 'Void Archers peer beyond the veil between shots. Their arrows pass through dimensions, striking targets that haven\'t moved yet.',
      baseStats: { maxHp: 90, maxMp: 90, str: 12, dex: 36, vit: 12, nrg: 16, dmg: 32, def: 10, spd: 1.8 },
      skills: [
        { name: 'Piercing Shot', icon: '\u{1F3AF}', mp: 15, type: 'Projectile', dmg: 280, range: 18, desc: 'Arrow pierces through all enemies in a line', color: '#abd473' },
        { name: 'Multishot', icon: '\u{1F3F9}', mp: 25, type: 'AoE', dmg: 150, range: 14, desc: 'Fire 5 arrows in a cone', color: '#2ecc71' },
        { name: 'Void Arrow', icon: '\u{1F300}', mp: 30, type: 'Projectile', dmg: 350, range: 20, desc: 'Fire an arrow from the void, ignoring armor', color: '#6c5ce7' },
        { name: 'Evasive Roll', icon: '\u{1F4A8}', mp: 10, type: 'Mobility', dmg: 0, range: 0, desc: 'Roll to dodge, gaining 50% evasion for 3s', color: '#3498db' },
      ],
      skillTrees: ['Marksmanship', 'Void Sight', 'Survivalist'],
    },
    {
      id: 'warlock', name: 'Warlock', role: 'DPS', baseClass: 'warlock', icon: '\u{1F52E}', color: '#9b59b6',
      lore: 'Warlocks bargain with entities that should not exist. Each spell is a contract, each summoning a debt.',
      baseStats: { maxHp: 75, maxMp: 190, str: 4, dex: 8, vit: 8, nrg: 38, dmg: 36, def: 6, spd: 1.2 },
      skills: [
        { name: 'Shadow Bolt', icon: '⚫', mp: 20, type: 'Projectile', dmg: 260, range: 14, desc: 'Hurl a bolt of condensed shadow', color: '#2c3e50' },
        { name: 'Summon Imp', icon: '\u{1F479}', mp: 45, type: 'Summon', dmg: 0, range: 0, desc: 'Summon a fireball-throwing imp for 30s', color: '#e74c3c' },
        { name: 'Drain Life', icon: '\u{1FA78}', mp: 15, type: 'DoT', dmg: 100, range: 8, desc: 'Siphon life force, healing self for damage dealt', color: '#c0392b' },
        { name: 'Curse of Doom', icon: '\u{1F480}', mp: 50, type: 'Debuff', dmg: 600, range: 12, desc: 'Curse target, dealing massive damage after 15s', color: '#8e44ad' },
      ],
      skillTrees: ['Demonology', 'Affliction', 'Dark Pact'],
    },
    {
      id: 'beasttamer', name: 'Beast Tamer', role: 'Support', baseClass: 'druid', icon: '\u{1F43A}', color: '#c79c6e',
      lore: 'Raised by wolves, adopted by bears, befriended by eagles — Beast Tamers speak every tongue but human.',
      baseStats: { maxHp: 120, maxMp: 110, str: 18, dex: 22, vit: 20, nrg: 16, dmg: 20, def: 18, spd: 1.5 },
      skills: [
        { name: 'Call Wolf', icon: '\u{1F43A}', mp: 30, type: 'Summon', dmg: 0, range: 0, desc: 'Summon a dire wolf companion (120 DPS)', color: '#7f8c8d' },
        { name: 'Eagle Strike', icon: '\u{1F985}', mp: 20, type: 'Projectile', dmg: 200, range: 15, desc: 'Eagle swoops down on target', color: '#f39c12' },
        { name: 'Bear Hug', icon: '\u{1F43B}', mp: 25, type: 'CC', dmg: 80, range: 3, desc: 'Bear stuns target for 3s with a crushing grip', color: '#8b4513' },
        { name: 'Pack Howl', icon: '\u{1F315}', mp: 35, type: 'Buff', dmg: 0, range: 0, desc: 'All pets gain 40% damage and 30% speed for 12s', color: '#c79c6e' },
      ],
      skillTrees: ['Wild Bond', 'Primal Fury', 'Beast Mastery'],
    },
    {
      id: 'chronomancer', name: 'Chronomancer', role: 'DPS', baseClass: 'mage', icon: '⏳', color: '#00bcd4',
      lore: "Chronomancers don't cast spells — they edit time. They rewind wounds, fast-forward decay, and pause enemies in temporal bubbles.",
      baseStats: { maxHp: 85, maxMp: 170, str: 6, dex: 14, vit: 10, nrg: 36, dmg: 28, def: 10, spd: 1.7 },
      skills: [
        { name: 'Time Warp', icon: '⏰', mp: 45, type: 'Buff', dmg: 0, range: 0, desc: 'Party gains 50% attack speed for 8s', color: '#00bcd4' },
        { name: 'Rewind', icon: '⏪', mp: 30, type: 'Heal', dmg: 0, range: 0, desc: 'Rewind HP to where it was 5 seconds ago', color: '#2ecc71' },
        { name: 'Temporal Prison', icon: '\u{1F537}', mp: 35, type: 'CC', dmg: 0, range: 10, desc: "Freeze target in time for 5s (can't act or be hit)", color: '#3498db' },
        { name: 'Decay', icon: '⏩', mp: 20, type: 'DoT', dmg: 200, range: 10, desc: "Fast-forward target's aging, 200 damage over 8s", color: '#9b59b6' },
      ],
      skillTrees: ['Temporal Arts', 'Paradox Engine', 'Eternal Flux'],
    },
  ],
  maxLevel: 80,
};
