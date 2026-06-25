// Realm pack types — display metadata that overlays the upstream sim.
//
// A realm describes *how* the same underlying world should look and read.
// It never mutates Sim state directly; it just supplies the strings, colors,
// model glob patterns, and bestiary entries the UI / renderer use.

export type RealmId =
  // The signature realm. 'crypticrealm' is the flagship — the namesake world
  // with its own identity, not a re-skin of another theme.
  | 'crypticrealm'
  | 'infernal'
  | 'classic'
  | 'dominion'
  | 'arcane'
  | 'arcadevoid'
  | 'claudecraft'
  // First-person-only realm (fps.moveweight.com). Camera is locked to the
  // first-person view; the third-person / Diablo presets are disabled here.
  | 'fps'
  // The Exchange is a neutral hub realm — the only place where characters
  // from any home realm can meet. Auctions + cross-realm item trades happen
  // exclusively here. Players keep their home-realm progression; visiting
  // the Exchange copies their character into a read/trade-only context.
  | 'exchange';

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

/** Per-realm branding & UX overrides. Every field is optional — when a realm
 *  doesn't set one, the renderer keeps the upstream base value. This is the
 *  seam that lets each realm have its own logo, loading screen, and Discord
 *  link without forking the base index.html. */
export interface RealmBranding {
  /** Path to a square logo (e.g. '/cr-realms/infernal/logo.png'). Falls back
   *  to the upstream `/crypticrealm-logo.png` when undefined. */
  logoSrc?: string;
  /** Visible brand text shown in the header / SEO `<title>`. */
  brandText?: string;
  /** Loading-screen background image. Defaults to `/loading-screen.jpg`. */
  loadingScreenSrc?: string;
  /** Discord invite URL shown in community footer. */
  discordUrl?: string;
  /** GitHub repo URL shown in community footer. */
  githubUrl?: string;
  /** Whether to show the upstream Donate button. Defaults to false (only
   *  the claudecraft realm sets this true — Cryptic Realm proper does not
   *  ask players to fund upstream). */
  showDonate?: boolean;
  /** Whether to show the "Sign in with Authentik" SSO button on the login
   *  panel. Defaults to true. The claudecraft realm sets it false to keep
   *  the pristine base login flow. */
  showAuthentikSso?: boolean;
}

/** A standard (non-boss) monster entry in a realm's bestiary. */
export interface RealmMonster {
  id: string;
  name: string;
  level: number;
  hp: number;
  dmg: number;
  /** Creature family, e.g. 'Undead', 'Demon', 'Construct'. */
  type: string;
  xp: number;
  gold: number;
  /** Drop-table keys (resolved against the item system). */
  drops: string[];
}

/** A boss encounter: phased, with abilities, loot, and lore. */
export interface RealmBoss {
  id: string;
  name: string;
  level: number;
  hp: number;
  dmg: number;
  type: string;
  xp: number;
  gold: number;
  abilities: string[];
  /** Phase transitions keyed by remaining-HP threshold (%). */
  phases: { threshold: number; ability: string }[];
  loot: string[];
  lore: string;
}

/** An act / chapter grouping zones, monsters, and bosses by level band. */
export interface RealmAct {
  id: string;
  name: string;
  /** Inclusive level range [min, max]. */
  level: [number, number];
  desc: string;
  zones: string[];
  monsters: RealmMonster[];
  bosses: RealmBoss[];
}

/** A realm's bestiary / monster chronicle — acts of themed content. */
export type RealmBestiary = RealmAct[];

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
  /** Per-realm overrides for logo / brand text / loading screen / Discord /
   *  donate visibility. All optional — see RealmBranding. */
  branding?: RealmBranding;
  /** True for the realm that should auto-load when no preference exists. */
  isDefault?: boolean;
  /** Marks a realm as a cross-realm hub — characters from any other realm
   *  are admitted, but combat / questing are disabled. Today only The
   *  Exchange uses this flag. Standard realms are isolated worlds with their
   *  own process + state per the systemd-template deploy. */
  crossRealm?: boolean;
  /** First-person-only realm: the camera is locked to the first-person view
   *  and the third-person / Diablo presets are hidden. The FPS realm
   *  (fps.moveweight.com) sets this; everywhere else first-person stays an
   *  optional toggle. */
  fpsOnly?: boolean;
  /** Optional themed bestiary (acts → zones / monsters / bosses) surfaced in
   *  the Monster Chronicle. Display content only; never drives Sim state. */
  bestiary?: RealmBestiary;
}
