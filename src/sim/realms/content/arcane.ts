// Arcane — cosmic crystal void. Hermes/Qwen origin: cryptic/crThemes.js
// "arcane-void".

import type { RealmContent } from '../types';

export const ARCANE_REALM: RealmContent = {
  id: 'arcane',
  name: 'Arcane Nexus',
  tagline: 'Cosmic crystal realms — portals, relics, and void mysteries',
  description:
    'Explore shattered dimensions connected by ancient portals. Harness void energy, ' +
    'collect crystal relics, and uncover the secrets of the Arcane.',
  mood: 'Mysterious · Cosmic · Ethereal',
  season: {
    eyebrow: 'Season 1',
    title: 'The Relic Vault',
    body:
      'Limited weapon skins drawn from the crystal vaults of the Arcane Nexus. Account-wide, purely cosmetic, and shown to everyone around you.',
  },
  accentHex: '#a855f7',
  bgGradient: 'linear-gradient(135deg, #0a0510 0%, #05020a 100%)',
  previewColors: { primary: '#a855f7', secondary: '#3ad6c8', bg: '#0a0510' },
  branding: {
    logoSrc: '/cryptic-realm-logo-512.webp',
    brandText: 'Cryptic Realm - Arcane Nexus',
    loadingScreenSrc: '/cryptic-realm-loading.png',
    discordUrl: 'https://discord.gg/WnxcamHJdh',
    showDonate: false,
    showAuthentikSso: true,
  },
  classes: [
    {
      id: 'voidwalker', name: 'Voidwalker', role: 'DPS', baseClass: 'rogue', icon: '\u{1F300}', color: '#a855f7',
      lore: 'Voidwalkers step between dimensions as easily as walking through doors. They channel raw void energy into devastating attacks.',
      baseStats: { maxHp: 85, maxMp: 180, str: 6, dex: 14, vit: 10, nrg: 36, dmg: 34, def: 8, spd: 1.8 },
      skills: [
        { name: 'Void Ray', icon: '\u{1F300}', mp: 22, type: 'Projectile', dmg: 280, range: 14, desc: 'Beam of void energy that disintegrates matter', color: '#a855f7' },
        { name: 'Dimensional Rift', icon: '\u{1F573}', mp: 35, type: 'AoE', dmg: 320, range: 6, desc: 'Open a rift that pulls in and damages enemies', color: '#6c5ce7' },
        { name: 'Blink', icon: '\u{1F4AB}', mp: 12, type: 'Mobility', dmg: 0, range: 12, desc: 'Teleport short distance, leaving void echo', color: '#00bcd4' },
        { name: 'Nullify', icon: '\u{1F6AB}', mp: 28, type: 'Debuff', dmg: 0, range: 10, desc: 'Silence target, preventing spells for 5s', color: '#7f8c8d' },
      ],
      skillTrees: ['Void Channeling', 'Rift Mastery', 'Entropy'],
    },
    {
      id: 'crystalsmith', name: 'Crystalsmith', role: 'Support', baseClass: 'mage', icon: '\u{1F48E}', color: '#3ad6c8',
      lore: 'Crystalsmiths grow living crystals that sing with arcane resonance. Each gem is a spell, each facet a rune.',
      baseStats: { maxHp: 110, maxMp: 155, str: 8, dex: 12, vit: 18, nrg: 30, dmg: 16, def: 18, spd: 1.3 },
      skills: [
        { name: 'Crystal Shield', icon: '\u{1F48E}', mp: 25, type: 'Buff', dmg: 0, range: 8, desc: 'Encase ally in crystal, absorbing 400 damage', color: '#3ad6c8' },
        { name: 'Prismatic Beam', icon: '\u{1F308}', mp: 20, type: 'Projectile', dmg: 180, range: 12, desc: 'Fire a beam that splits into 3 random elements', color: '#e879f9' },
        { name: 'Resonance Field', icon: '\u{1F52E}', mp: 35, type: 'Buff', dmg: 0, range: 0, desc: 'Party gains +25% all stats for 12s', color: '#ffd700' },
        { name: 'Crystal Prison', icon: '\u{1F537}', mp: 30, type: 'CC', dmg: 120, range: 10, desc: 'Encase enemy in crystal for 4s', color: '#3498db' },
      ],
      skillTrees: ['Crystal Growing', 'Resonance Arts', 'Gem Enchanting'],
    },
    {
      id: 'portalkeeper', name: 'Portal Keeper', role: 'Healer', baseClass: 'priest', icon: '\u{1F6AA}', color: '#e879f9',
      lore: 'Portal Keepers guard the gateways between realms. They can open portals to healing dimensions and banish enemies to pocket prisons.',
      baseStats: { maxHp: 105, maxMp: 165, str: 6, dex: 10, vit: 18, nrg: 34, dmg: 14, def: 14, spd: 1.4 },
      skills: [
        { name: 'Healing Portal', icon: '\u{1F6AA}', mp: 30, type: 'Heal', dmg: 0, range: 12, desc: 'Open portal to healing dimension, restore 50% HP to area', color: '#2ecc71' },
        { name: 'Banishment', icon: '\u{1F573}', mp: 40, type: 'CC', dmg: 0, range: 10, desc: 'Banish enemy to pocket dimension for 6s', color: '#e879f9' },
        { name: 'Redirect', icon: '\u{1F504}', mp: 20, type: 'Buff', dmg: 0, range: 8, desc: 'Redirect next attack on ally to yourself (with 50% reduction)', color: '#f39c12' },
        { name: 'Dimensional Anchor', icon: '⚓', mp: 35, type: 'Buff', dmg: 0, range: 0, desc: 'Party immune to knockback and teleport for 10s', color: '#7f8c8d' },
      ],
      skillTrees: ['Gateway Arts', 'Spatial Fold', 'Realm Walking'],
    },
    {
      id: 'starguard', name: 'Star Guard', role: 'Tank', baseClass: 'paladin', icon: '⭐', color: '#fbbf24',
      lore: 'Star Guards channel the gravity of dying stars into their armor. They are walking singularities — enemies are pulled toward them.',
      baseStats: { maxHp: 200, maxMp: 75, str: 32, dex: 6, vit: 38, nrg: 12, dmg: 18, def: 38, spd: 0.8 },
      skills: [
        { name: 'Gravity Well', icon: '\u{1F311}', mp: 30, type: 'CC', dmg: 100, range: 7, desc: 'Create gravity well pulling all enemies toward center', color: '#2c3e50' },
        { name: 'Star Shield', icon: '⭐', mp: 25, type: 'Buff', dmg: 0, range: 0, desc: 'Absorb 60% of all incoming damage for 8s', color: '#fbbf24' },
        { name: 'Nova Burst', icon: '\u{1F4A5}', mp: 40, type: 'AoE', dmg: 280, range: 6, desc: 'Release stored stellar energy in devastating burst', color: '#f39c12' },
        { name: 'Time Dilation', icon: '⏳', mp: 35, type: 'CC', dmg: 0, range: 8, desc: 'Slow all enemies to 30% speed for 6s', color: '#a855f7' },
      ],
      skillTrees: ['Stellar Armor', 'Gravity Mastery', 'Cosmic Forge'],
    },
    {
      id: 'riftblade', name: 'Rift Blade', role: 'Assassin', baseClass: 'rogue', icon: '⚡', color: '#06b6d4',
      lore: 'Rift Blades slice through the fabric of reality itself. They step through micro-rifts to appear behind targets.',
      baseStats: { maxHp: 80, maxMp: 95, str: 20, dex: 34, vit: 10, nrg: 14, dmg: 32, def: 12, spd: 2.6 },
      skills: [
        { name: 'Rift Slash', icon: '⚡', mp: 18, type: 'Melee', dmg: 300, range: 3, desc: 'Cut through dimensional fabric, ignoring armor', color: '#06b6d4' },
        { name: 'Phase Step', icon: '\u{1F464}', mp: 15, type: 'Mobility', dmg: 0, range: 14, desc: 'Phase through reality to appear at target location', color: '#a855f7' },
        { name: 'Void Blades', icon: '\u{1F5E1}', mp: 25, type: 'Buff', dmg: 0, range: 0, desc: 'Weapons gain +80% damage and void piercing for 10s', color: '#6c5ce7' },
        { name: 'Reality Tear', icon: '\u{1F573}', mp: 45, type: 'AoE', dmg: 350, range: 5, desc: 'Tear a hole in reality, massive damage to all nearby', color: '#e74c3c' },
      ],
      skillTrees: ['Rift Combat', 'Phase Arts', 'Dimensional Edge'],
    },
  ],
  combatFeel: { castTimeMult: 0.3, gcdMult: 0.4 }, maxLevel: 99,
  combatScaling: { fromLevel: 20, hpPerLevel: 1.05, dmgPerLevel: 1.055 },
};
