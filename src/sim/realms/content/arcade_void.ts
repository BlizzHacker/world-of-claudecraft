// Arcane Void - sci-fi tactical realm skin backed by the local
// public/cr-realms/arcadevoid asset pack.

import type { RealmContent } from '../types';

export const ARCADE_VOID_REALM: RealmContent = {
  id: 'arcadevoid',
  name: 'Arcane Void',
  tagline: 'Neon squad combat, shipyards, turrets, and void tech',
  description:
    'Arcane Void is Cryptic Realm pushed into a bright sci-fi war cabinet: ' +
    'marines, alien tech, ship silhouettes, and turret-heavy battlefield toys.',
  mood: 'Sci-Fi - Tactical - Void',
  accentHex: '#57f0ff',
  bgGradient: 'linear-gradient(135deg, #02131c 0%, #090514 55%, #16060d 100%)',
  previewColors: { primary: '#57f0ff', secondary: '#ffcf4a', bg: '#07111c' },
  branding: {
    // `characters.png` is the Arcane Void character sheet, not a logo. It was
    // previously wired here and made the landing header render a random
    // creature whenever a player had the Arcade Void realm selected. Keep the
    // Cryptic Realm mark in the shared chrome; realm art belongs in the hero /
    // in-world surfaces where it cannot replace the product identity.
    logoSrc: '/cryptic-realm-logo-512.webp',
    brandText: 'Cryptic Realm - Arcane Void',
    loadingScreenSrc: '/cr-realms/arcadevoid/cr-loggedin.png',
    discordUrl: 'https://discord.gg/Zdj3JGrx',
    showDonate: false,
    showAuthentikSso: true,
  },
  classes: [
    {
      id: 'voidmarine', name: 'Void Marine', role: 'Tank', baseClass: 'warrior', icon: 'M', color: '#57f0ff',
      lore: 'Front-line armor crews trained to hold extraction lines while the void tears open around them.',
      baseStats: { maxHp: 190, maxMp: 80, str: 30, dex: 18, vit: 34, nrg: 12, dmg: 24, def: 32, spd: 1.1 },
      skills: [
        { name: 'Shield Wall', icon: '[]', mp: 24, type: 'Buff', dmg: 0, range: 0, desc: 'Brace behind powered plating and cut incoming damage.', color: '#57f0ff' },
        { name: 'Pulse Burst', icon: '*', mp: 18, type: 'AoE', dmg: 180, range: 7, desc: 'Fire a close-range cone of kinetic rounds.', color: '#ffcf4a' },
        { name: 'Crash Advance', icon: '>>', mp: 22, type: 'Mobility', dmg: 140, range: 8, desc: 'Push through the line and stagger enemies.', color: '#ff6b6b' },
      ],
      skillTrees: ['Armor', 'Breach', 'Command'],
    },
    {
      id: 'ghostpilot', name: 'Ghost Pilot', role: 'Assassin', baseClass: 'rogue', icon: 'G', color: '#b967ff',
      lore: 'Stealth operators who mark targets, vanish, and call precision strikes from the dark side of orbit.',
      baseStats: { maxHp: 90, maxMp: 125, str: 14, dex: 38, vit: 12, nrg: 22, dmg: 38, def: 10, spd: 2.1 },
      skills: [
        { name: 'Cloak Drift', icon: '..', mp: 18, type: 'Buff', dmg: 0, range: 0, desc: 'Fade out while sprinting between cover.', color: '#b967ff' },
        { name: 'Mark Shot', icon: '+', mp: 16, type: 'Projectile', dmg: 320, range: 18, desc: 'Tag a weak point and strike for heavy damage.', color: '#57f0ff' },
        { name: 'Orbital Knife', icon: '/', mp: 30, type: 'Melee', dmg: 420, range: 3, desc: 'Blink behind the target for a finisher.', color: '#ff6b6b' },
      ],
      skillTrees: ['Stealth', 'Targeting', 'Extraction'],
    },
    {
      id: 'turretwright', name: 'Turretwright', role: 'Support', baseClass: 'hunter', icon: 'T', color: '#ffcf4a',
      lore: 'Engineers who turn scrap, crystals, and field batteries into little angry machines.',
      baseStats: { maxHp: 120, maxMp: 150, str: 16, dex: 22, vit: 22, nrg: 28, dmg: 20, def: 18, spd: 1.3 },
      skills: [
        { name: 'Auto Turret', icon: '^', mp: 34, type: 'Summon', dmg: 0, range: 0, desc: 'Deploy a sentry that fires at nearby enemies.', color: '#ffcf4a' },
        { name: 'Repair Cloud', icon: '+', mp: 26, type: 'Heal', dmg: 0, range: 8, desc: 'Nanite mist repairs allies and constructs.', color: '#4dff9b' },
        { name: 'Mine Web', icon: 'x', mp: 28, type: 'Trap', dmg: 260, range: 6, desc: 'Lay proximity mines across the path.', color: '#ff6b6b' },
      ],
      skillTrees: ['Sentries', 'Nanites', 'Mines'],
    },
  ],
};
