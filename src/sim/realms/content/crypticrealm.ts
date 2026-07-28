// Cryptic Realm — the flagship, namesake realm. Not a re-skin of another
// theme: this is the signature world the whole project is named for. A
// shadowed arcane-noir setting where forgotten magic, riddle-locked ruins,
// and the Gravecaller Saga converge.

import type { RealmContent } from '../types';
import { CRYPTICREALM_BESTIARY } from './crypticrealm.bestiary';

export const CRYPTICREALM_REALM: RealmContent = {
  id: 'crypticrealm',
  bestiary: CRYPTICREALM_BESTIARY,
  name: 'Cryptic Realm',
  tagline: 'The signature world — arcane mysteries, riddle-locked ruins, forgotten power',
  description:
    'The realm that gives the game its name. A shadowed world of buried ' +
    'cathedrals, ciphered runes, and magic the living were never meant to ' +
    'read. Solve what others fled, and the Gravecaller Saga opens to you.',
  mood: 'Cryptic · Arcane · Mysterious',
  accentHex: '#b48cff',
  bgGradient: 'linear-gradient(135deg, #120a22 0%, #07060d 100%)',
  previewColors: { primary: '#b48cff', secondary: '#ffd166', bg: '#0c0818' },
  isDefault: true,
  branding: {
    logoSrc: '/cryptic-realm-logo-512.webp',
    brandText: 'Cryptic Realm',
    loadingScreenSrc: '/cryptic-realm-loading-bg.webp',
    discordUrl: 'https://discord.gg/Zdj3JGrx',
    showDonate: false,
    showAuthentikSso: true,
  },
  classes: [
    {
      id: 'gravecaller', name: 'Gravecaller', role: 'Summoner', baseClass: 'warlock', icon: '\u{1F480}', color: '#b48cff',
      lore: 'The namesake of the saga. Gravecallers read the ciphers on the dead and bind the answers as servants. Each riddle solved is a soul recruited.',
      baseStats: { maxHp: 95, maxMp: 180, str: 8, dex: 12, vit: 12, nrg: 38, dmg: 30, def: 10, spd: 1.2 },
      skills: [
        { name: 'Raise Cipher', icon: '\u{1FAA6}', mp: 35, type: 'Summon', dmg: 0, range: 0, desc: 'Raise a riddle-bound revenant that fights for 30s', color: '#b48cff' },
        { name: 'Whisper of the Dead', icon: '\u{1F5E3}', mp: 20, type: 'Debuff', dmg: 120, range: 12, desc: 'Speak a forbidden name; target takes 120 and is silenced 4s', color: '#8e44ad' },
        { name: 'Soul Ledger', icon: '\u{1F4D6}', mp: 15, type: 'Heal', dmg: 0, range: 0, desc: 'Spend a bound soul to restore 30% HP', color: '#2ecc71' },
        { name: 'The Last Riddle', icon: '\u{1F5DD}', mp: 55, type: 'AoE', dmg: 480, range: 8, desc: 'Pose an unanswerable question; all nearby enemies take 480 over 6s', color: '#6c5ce7' },
      ],
      skillTrees: ['Necromantic Lore', 'Cipher Binding', 'The Saga'],
    },
    {
      id: 'runewarden', name: 'Rune Warden', role: 'Tank', baseClass: 'warrior', icon: '\u{1F6E1}', color: '#ffd166',
      lore: 'Wardens armor themselves in living runes scavenged from sealed vaults. The more cryptic the rune, the harder it is to break.',
      baseStats: { maxHp: 200, maxMp: 90, str: 28, dex: 10, vit: 36, nrg: 16, dmg: 20, def: 36, spd: 1.0 },
      skills: [
        { name: 'Ward Glyph', icon: '\u{1F532}', mp: 30, type: 'Buff', dmg: 0, range: 0, desc: 'Inscribe a glyph absorbing the next 400 damage', color: '#ffd166' },
        { name: 'Runic Slam', icon: '\u{1F528}', mp: 22, type: 'Melee', dmg: 240, range: 3, desc: 'Smash with a rune-etched maul, stunning 2s', color: '#e67e22' },
        { name: 'Sealing Chains', icon: '⛓', mp: 28, type: 'CC', dmg: 60, range: 8, desc: 'Bind a target in arcane chains for 4s', color: '#95a5a6' },
        { name: 'Vault Bulwark', icon: '\u{1F3F0}', mp: 40, type: 'Buff', dmg: 0, range: 0, desc: '+60% defense to nearby allies for 10s', color: '#f1c40f' },
      ],
      skillTrees: ['Living Runes', 'Vaultkeeper', 'Aegis'],
    },
    {
      id: 'cipherblade', name: 'Cipher Blade', role: 'Assassin', baseClass: 'rogue', icon: '\u{1F5E1}', color: '#7bdff2',
      lore: 'Duelists who encode their strikes — each cut a glyph, each combo a sentence only the dying can read.',
      baseStats: { maxHp: 100, maxMp: 110, str: 18, dex: 34, vit: 12, nrg: 18, dmg: 34, def: 12, spd: 1.9 },
      skills: [
        { name: 'Glyph Slash', icon: '✂', mp: 14, type: 'Melee', dmg: 260, range: 3, desc: 'A cut that carves a rune; bleeds for 90 over 5s', color: '#7bdff2' },
        { name: 'Blink Cipher', icon: '\u{1F4A0}', mp: 18, type: 'Mobility', dmg: 0, range: 12, desc: 'Teleport behind target, next hit crits', color: '#3498db' },
        { name: 'Silent Verse', icon: '\u{1F910}', mp: 20, type: 'Debuff', dmg: 0, range: 6, desc: 'Mark target; your hits on them ignore 40% armor', color: '#9b59b6' },
        { name: 'Final Sentence', icon: '\u{1F4DC}', mp: 45, type: 'Melee', dmg: 520, range: 3, desc: 'Execute: 520 damage, doubled below 25% HP', color: '#e74c3c' },
      ],
      skillTrees: ['Encrypted Strikes', 'Shadowstep', 'Execution'],
    },
    {
      id: 'oracle', name: 'Oracle', role: 'Healer', baseClass: 'priest', icon: '\u{1F52E}', color: '#2ecc71',
      lore: 'Oracles read the realm itself like a half-erased page, mending wounds by reciting what was true a moment ago.',
      baseStats: { maxHp: 100, maxMp: 175, str: 6, dex: 12, vit: 14, nrg: 36, dmg: 18, def: 12, spd: 1.3 },
      skills: [
        { name: 'Recite Health', icon: '✨', mp: 22, type: 'Heal', dmg: 0, range: 12, desc: 'Restore 280 HP to an ally', color: '#2ecc71' },
        { name: 'Prophecy Ward', icon: '\u{1F4FF}', mp: 30, type: 'Buff', dmg: 0, range: 10, desc: 'Foresee danger: ally takes -35% damage for 8s', color: '#1abc9c' },
        { name: 'Unwritten Fate', icon: '\u{1F300}', mp: 35, type: 'Heal', dmg: 0, range: 0, desc: 'Group heal 180 + cleanse one debuff', color: '#16a085' },
        { name: 'Foretold Doom', icon: '⚡', mp: 28, type: 'Debuff', dmg: 220, range: 12, desc: 'Speak an enemy’s end; 220 damage, -25% healing taken', color: '#e74c3c' },
      ],
      skillTrees: ['Divination', 'Mending Verse', 'Augury'],
    },
    {
      id: 'voidseer', name: 'Void Seer', role: 'DPS', baseClass: 'mage', icon: '\u{1F311}', color: '#6c5ce7',
      lore: 'Seers who stared too long into the sealed vaults and learned to throw the dark back. Their spells are answers to questions reality forgot.',
      baseStats: { maxHp: 85, maxMp: 190, str: 5, dex: 10, vit: 10, nrg: 40, dmg: 38, def: 8, spd: 1.4 },
      skills: [
        { name: 'Void Bolt', icon: '⚫', mp: 18, type: 'Projectile', dmg: 270, range: 16, desc: 'Hurl condensed nothing for 270 damage', color: '#6c5ce7' },
        { name: 'Riddle Rift', icon: '\u{1F573}', mp: 32, type: 'AoE', dmg: 180, range: 10, desc: 'Tear a rift that pulls enemies in and deals 180', color: '#8e44ad' },
        { name: 'Unmake', icon: '\u{1F4A5}', mp: 40, type: 'Projectile', dmg: 420, range: 14, desc: 'Erase a target from the page: 420 ignoring armor', color: '#5b3fb0' },
        { name: 'Eclipse', icon: '\u{1F315}', mp: 50, type: 'Buff', dmg: 0, range: 0, desc: 'Channel the void: +50% spell damage for 8s', color: '#2c2c54' },
      ],
      skillTrees: ['Void Lore', 'Riftcraft', 'Annihilation'],
    },
  ],
  combatFeel: { castTimeMult: 0.3, gcdMult: 0.4 }, maxLevel: 99,
  combatScaling: { fromLevel: 20, hpPerLevel: 1.05, dmgPerLevel: 1.055 },
};
