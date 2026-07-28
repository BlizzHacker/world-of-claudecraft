// Infernal — dark gothic ARPG. Hermes/Qwen origin: cryptic/crThemes.js
// "infernal-realm". Default Cryptic Realm theme.

import type { RealmContent } from '../types';

export const INFERNAL_REALM: RealmContent = {
  id: 'infernal',
  name: 'Infernal Realm',
  tagline: 'Dark gothic ARPG — blood, fire, and forgotten crypts',
  description:
    'Descend into a shattered underworld where ember-lit cathedrals crumble above ' +
    'pits of molten sin. Every corridor hides a boss, every boss hides a relic.',
  mood: 'Dark · Gothic · Brutal',
  accentHex: '#d4442a',
  bgGradient: 'linear-gradient(135deg, #1a0505 0%, #0a0202 100%)',
  previewColors: { primary: '#d4442a', secondary: '#c9a14a', bg: '#0a0505' },
  isDefault: true,
  branding: {
    logoSrc: '/cryptic-realm-logo-512.webp',
    brandText: 'Cryptic Realm - Infernal',
    loadingScreenSrc: '/cryptic-realm-loading.png',
    discordUrl: 'https://discord.gg/Zdj3JGrx',
    showDonate: false,
    showAuthentikSso: true,
  },
  classes: [
    {
      id: 'boneherald', name: 'Bone Herald', role: 'Summoner', baseClass: 'warlock', icon: '\u{1F480}', color: '#8e7cc3',
      lore: 'Once a royal necromancer of the Ashen Court, the Bone Herald commands legions of the fallen. Each skull raised is a soldier reborn, each corpse a vessel for undeath.',
      baseStats: { maxHp: 95, maxMp: 180, str: 8, dex: 10, vit: 12, nrg: 38, dmg: 22, def: 10, spd: 1.4 },
      skills: [
        { name: 'Raise Legion', icon: '☠', mp: 40, type: 'Summon', dmg: 0, range: 8, desc: 'Summon 3 skeletal warriors that fight for 20s', color: '#8e7cc3' },
        { name: 'Bone Spear', icon: '\u{1F9B4}', mp: 18, type: 'Projectile', dmg: 185, range: 14, desc: 'Pierce through enemies with a spear of calcified death', color: '#c0c0c0' },
        { name: 'Corpse Explosion', icon: '\u{1F4A5}', mp: 35, type: 'AoE', dmg: 260, range: 5, desc: 'Detonate a corpse dealing massive AoE damage', color: '#d4442a' },
        { name: 'Life Tap', icon: '\u{1FA78}', mp: 0, type: 'Buff', dmg: 0, range: 0, desc: 'Convert 15% HP to MP instantly', color: '#c0392b' },
      ],
      skillTrees: ['Necromancy', 'Blood Arts', 'Bone Constructs'],
    },
    {
      id: 'emberwitch', name: 'Ember Witch', role: 'DPS', baseClass: 'warlock', icon: '\u{1F525}', color: '#e67e22',
      lore: 'Born in the heart of a volcano, Ember Witches channel primordial flame through their veins. Their laughter ignites the air, and their rage melts steel.',
      baseStats: { maxHp: 80, maxMp: 165, str: 6, dex: 14, vit: 9, nrg: 35, dmg: 34, def: 8, spd: 1.6 },
      skills: [
        { name: 'Hellfire Cascade', icon: '\u{1F30B}', mp: 30, type: 'AoE', dmg: 310, range: 7, desc: 'Rain molten fire across a wide area for 4s', color: '#e67e22' },
        { name: 'Immolate', icon: '\u{1F525}', mp: 22, type: 'DoT', dmg: 120, range: 10, desc: 'Set target ablaze, dealing damage over 8s', color: '#ff4500' },
        { name: 'Flame Nova', icon: '☀', mp: 45, type: 'AoE', dmg: 380, range: 6, desc: 'Explode in a ring of fire around you', color: '#ffd700' },
        { name: 'Ember Dash', icon: '\u{1F4A8}', mp: 15, type: 'Mobility', dmg: 80, range: 0, desc: 'Dash forward leaving a trail of fire', color: '#ff6347' },
      ],
      skillTrees: ['Inferno', 'Chaos Flame', 'Molten Core'],
    },
    {
      id: 'shadowblade', name: 'Shadow Blade', role: 'Assassin', baseClass: 'rogue', icon: '\u{1F5E1}', color: '#6c5ce7',
      lore: 'Trained in the Void Pits where light never reaches, Shadow Blades move between heartbeats. They strike from nowhere and vanish before the body falls.',
      baseStats: { maxHp: 85, maxMp: 100, str: 16, dex: 36, vit: 10, nrg: 14, dmg: 30, def: 12, spd: 2.4 },
      skills: [
        { name: 'Shadowstep', icon: '\u{1F464}', mp: 20, type: 'Mobility', dmg: 0, range: 12, desc: 'Teleport behind target, next attack crits', color: '#6c5ce7' },
        { name: 'Venom Strike', icon: '\u{1F40D}', mp: 15, type: 'Melee', dmg: 150, range: 2, desc: 'Poison target for 120 damage over 10s', color: '#2ecc71' },
        { name: 'Blade Storm', icon: '⚔', mp: 35, type: 'AoE', dmg: 220, range: 4, desc: 'Spin blades in all directions at blinding speed', color: '#c0c0c0' },
        { name: 'Death Mark', icon: '\u{1F480}', mp: 40, type: 'Debuff', dmg: 0, range: 8, desc: 'Mark target: all damage taken +50% for 8s', color: '#d4442a' },
      ],
      skillTrees: ['Shadow Arts', 'Blade Mastery', 'Trap Crafting'],
    },
    {
      id: 'ironwarden', name: 'Iron Warden', role: 'Tank', baseClass: 'warrior', icon: '\u{1F6E1}', color: '#7f8c8d',
      lore: 'Forged in the Abyssal Foundries, Iron Wardens are living fortresses. Their armor is grafted to bone, their shields weigh more than a mortal man.',
      baseStats: { maxHp: 200, maxMp: 60, str: 32, dex: 8, vit: 38, nrg: 8, dmg: 18, def: 36, spd: 0.9 },
      skills: [
        { name: 'Iron Fortress', icon: '\u{1F3F0}', mp: 30, type: 'Buff', dmg: 0, range: 0, desc: 'Gain 60% damage reduction for 10s, taunt all', color: '#7f8c8d' },
        { name: 'Shield Slam', icon: '\u{1F6E1}', mp: 12, type: 'Melee', dmg: 200, range: 3, desc: 'Slam shield into target, stun for 2s', color: '#95a5a6' },
        { name: 'Ground Quake', icon: '\u{1F30D}', mp: 40, type: 'AoE', dmg: 180, range: 6, desc: 'Stomp ground, stunning all nearby for 3s', color: '#d35400' },
        { name: 'Rallying Cry', icon: '\u{1F4EF}', mp: 25, type: 'Buff', dmg: 0, range: 0, desc: 'Party gains 25% max HP shield for 12s', color: '#f1c40f' },
      ],
      skillTrees: ['Ironclad', "Warden's Oath", 'Siege Engine'],
    },
    {
      id: 'forestsage', name: 'Forest Sage', role: 'Healer', baseClass: 'druid', icon: '\u{1F33F}', color: '#27ae60',
      lore: 'While the Infernal Realm burns, Forest Sages tend the last groves of living wood. They channel nature\'s quiet fury — roots that strangle, spores that heal.',
      baseStats: { maxHp: 110, maxMp: 160, str: 6, dex: 12, vit: 18, nrg: 32, dmg: 14, def: 14, spd: 1.3 },
      skills: [
        { name: "Nature's Embrace", icon: '\u{1F33F}', mp: 25, type: 'Heal', dmg: 0, range: 10, desc: "Restore 40% of target's max HP", color: '#27ae60' },
        { name: 'Entangling Roots', icon: '\u{1F333}', mp: 20, type: 'CC', dmg: 60, range: 8, desc: 'Root target for 4s, dealing damage over time', color: '#8b4513' },
        { name: 'Spore Cloud', icon: '\u{1F344}', mp: 30, type: 'AoE', dmg: 140, range: 6, desc: 'Release toxic spores, healing allies and poisoning enemies', color: '#9b59b6' },
        { name: 'Ancient Bark', icon: '\u{1F6E1}', mp: 35, type: 'Buff', dmg: 0, range: 8, desc: 'Encase ally in bark armor, +40% def for 10s', color: '#2ecc71' },
      ],
      skillTrees: ['Verdant Path', 'Spore Mastery', 'Ancient Grove'],
    },
  ],
  // Per-realm world re-skin: a grander, darker Diabl0-style settlement. Bigger
  // buildings, pushed apart, under a dim red-shifted infernal sky with heavier fog
  // and a changing-weather cycle. claudecraft has no worldTheme so it stays vanilla.
  worldTheme: {
    buildingScale: 1.9,
    buildingSpread: 2.6,
    lighting: {
      ambientHex: '#5a2018',
      ambientScale: 0.62,
      skyHex: '#3a0e0a',
      fogScale: 1.6,
    },
    weather: { enabled: true, moods: ['emberfall', 'bloodmoon', 'ashstorm', 'brooding'] },
  },
  // D2 hack-n-slash: cast times collapse to ~30% and the GCD to ~40% so abilities
  // fire the instant you press them — clicky ARPG carnage, not WoW cast bars.
  combatFeel: { castTimeMult: 0.3, gcdMult: 0.4 },
  // D2 power fantasy: level 99 cap (vs the vanilla 20).
  maxLevel: 99,
  // D2 stat scaling: past level 20, HP/mana + damage ramp ~5%/level (compounding)
  // so a level-99 hero hits for hundreds→thousands. Mobs ramp with them so the
  // descent stays lethal (D2 Hell-style). Nothing changes at/below level 20.
  combatScaling: { fromLevel: 20, hpPerLevel: 1.05, dmgPerLevel: 1.055 },
};
