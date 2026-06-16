// Realm pack types — display metadata that overlays the upstream sim.
//
// A realm describes *how* the same underlying world should look and read.
// It never mutates Sim state directly; it just supplies the strings, colors,
// model glob patterns, and bestiary entries the UI / renderer use.

export type RealmId = 'infernal' | 'classic' | 'dominion' | 'arcane' | 'claudecraft';

export type RealmRole = 'Tank' | 'DPS' | 'Healer' | 'Support' | 'Assassin' | 'Summoner';

/** A class skin: how the realm presents one of the underlying upstream classes. */
export interface RealmClassSkin {
  /** Stable id; unique per realm. */
  id: string;
  /** Display name shown in character select, party frames, tooltips. */
  name: string;
  /** Combat role the player slots into; used for matchmaking / LFG. */
  role: RealmRole;
  /** Emoji or icon glyph used in compact UI surfaces. */
  icon: string;
  /** CSS hex color used for the class accent (frames, projectiles, FX). */
  color: string;
  /** One-paragraph flavor text shown on the class select screen. */
  lore: string;
  /** Stat block used by realm-native ARPG screens (not the upstream sim). */
  baseStats: RealmClassStats;
  /** Skill flavor entries; shown in the skill tree panel. */
  skills: RealmClassSkill[];
  /** Names of the talent trees the skill-tree UI groups skills under. */
  skillTrees: string[];
}

export interface RealmClassStats {
  maxHp: number; maxMp: number;
  str: number; dex: number; vit: number; nrg: number;
  dmg: number; def: number; spd: number;
}

export interface RealmClassSkill {
  name: string; icon: string; mp: number;
  type: string; dmg: number; range: number;
  desc: string; color: string;
}

export interface RealmContent {
  id: RealmId;
  /** Visible name in the picker. */
  name: string;
  /** One-line summary shown under the name in the picker. */
  tagline: string;
  /** Longer paragraph used on the loading screen and lore panel. */
  description: string;
  /** Three-keyword vibe descriptor (e.g. 'Dark · Gothic · Brutal'). */
  mood: string;
  /** Single accent color for the picker chip and theme highlights. */
  accentHex: string;
  /** CSS gradient for the loading-screen and login backdrop. */
  bgGradient: string;
  /** Two extra swatches the picker shows under each option. */
  previewColors: { primary: string; secondary: string; bg: string };
  /** Class skins; the renderer maps these onto underlying upstream PlayerClasses. */
  classes: RealmClassSkin[];
  /** True for the realm that should auto-load when no preference exists. */
  isDefault?: boolean;
}
