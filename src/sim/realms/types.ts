import type { PlayerClass } from '../types';
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

export type RealmFactionAlignment = 'good' | 'evil' | 'neutral' | 'mixed';

export interface RealmFaction {
  id: string;
  name: string;
  alignment: RealmFactionAlignment;
  lore: string;
  surprise?: boolean;
}

/** A class skin: how the realm presents one of the underlying upstream classes. */
export interface RealmClassSkin {
  /** Stable id; unique per realm. */
  id: string;
  /** The upstream PlayerClass this skin actually runs as. Character creation
   *  validates against the upstream classes, so without this a realm skin id
   *  (steelcrusader, voidarcher, ...) is rejected with 400 INVALID_CLASS. */
  baseClass: PlayerClass;
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
  maxHp: number;
  maxMp: number;
  str: number;
  dex: number;
  vit: number;
  nrg: number;
  dmg: number;
  def: number;
  spd: number;
}

export interface RealmClassSkill {
  name: string;
  icon: string;
  mp: number;
  type: string;
  dmg: number;
  range: number;
  desc: string;
  color: string;
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
  /** Whether `loadingScreenSrc` already paints the game wordmark. When true the
   *  loading screen hides its own logo overlay, so the art's baked-in title is
   *  the only one on screen instead of a title stacked on a title. Defaults to
   *  false (art with no wordmark, overlay shown). */
  loadingArtHasWordmark?: boolean;
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

/** A realm's cosmetic SEASON: the storefront banner over the weapon-skin
 *  catalog. Realm content, not chrome -- each realm names its season after its
 *  own game (the Infernal reliquaries, the Dominion arsenals, the Exchange
 *  consignment floor) instead of every realm advertising the same "Armory".
 *  A realm that omits this falls back to the shared hudChrome.wocStore.armory*
 *  strings, which is what claudecraft (pristine upstream) wants. Display copy
 *  only: the skin catalog, pricing and grants are untouched. */
export interface RealmSeason {
  /** Small label above the title, e.g. 'Season 1'. */
  eyebrow: string;
  /** The season's name, e.g. 'The Ember Reliquary'. */
  title: string;
  /** One-paragraph blurb under the title. */
  body: string;
}

/** Per-realm DISPLAY-TEXT override for one zone. Keys of the parent record are
 *  canonical zone ids; nothing id-shaped is ever renamed. */
export interface RealmZoneText {
  name?: string;
  welcome?: string;
  /** POI label overrides keyed by the zone's poi array index. */
  pois?: Record<string, string>;
}

export interface RealmNpcText {
  name?: string;
  title?: string;
  greeting?: string;
}

export interface RealmQuestText {
  title?: string;
  text?: string;
  completion?: string;
  /** Objective label overrides keyed by objective array index. */
  objectives?: Record<string, string>;
}

/** Name-only display override (mobs, items). */
export interface RealmNamedText {
  name?: string;
}

/** A named UI SYSTEM a realm can re-title. The built-in windows are catalog
 *  keys and re-skin through `catalog` below; these four are the fork's own
 *  in-game reference tools, which have no catalog keys (src/sim/realms/system_text.ts). */
export type RealmSystemId = 'skillTrees' | 'lootVault' | 'pickit' | 'bestiary';

/** Class display override, keyed by canonical PlayerClass id ('druid'). The
 *  save wire, the class registry and every talent/ability lookup keep the
 *  canonical id; only what the player READS changes. */
export interface RealmClassText {
  name?: string;
  description?: string;
}

/** Ability display override, keyed by canonical ability id ('moonfire'). Same
 *  display-only contract as RealmClassText: hotbar slot maps, talent grants and
 *  the combat wire all keep the canonical id. */
export interface RealmAbilityText {
  name?: string;
  description?: string;
}

/** Dungeon / delve display override. */
export interface RealmInstanceText {
  name?: string;
  enterText?: string;
  leaveText?: string;
}

export interface RealmLetterText {
  sender?: string;
  subject?: string;
  body?: string;
}

/** Deed display override (the Book of Deeds): name/desc, plus the title-reward
 *  display string for title deeds. Keys of the parent record are canonical deed
 *  ids (save data - never renamed). Resolved in src/ui/deed_i18n.ts before the
 *  deed locale tables, mirroring the tEntity precedence. */
export interface RealmDeedText {
  name?: string;
  desc?: string;
  title?: string;
}

/** A realm's sparse LORE OVERLAY: display strings the realm re-skins on top of
 *  the shared world content. Keyed by canonical entity ids and resolved inside
 *  tEntity() (src/ui/entity_i18n.ts) BEFORE the locale table; t() consults the
 *  `catalog` sub-map the same way for dotted chrome keys. Canonical English sim
 *  text and the 21 locale overlays are untouched, so a realm that omits this
 *  field (claudecraft) is byte-identical in behavior and the untranslated-key
 *  guard stays green. DISPLAY ONLY: ids, i18n keys, save data, music-zone keys,
 *  dungeon-finder wire tokens and API routes never move here.
 *  Known limitation: overlay strings are English-only until a per-realm
 *  per-locale overlay exists; on an overlaid key a non-English player reads the
 *  realm's English name over otherwise-localized text. */
export interface RealmEntityText {
  zones?: Record<string, RealmZoneText>;
  npcs?: Record<string, RealmNpcText>;
  quests?: Record<string, RealmQuestText>;
  mobs?: Record<string, RealmNamedText>;
  /** Class display names/lore keyed by canonical PlayerClass id. This is what
   *  stops a themed realm's hero reading as "Druid" in Talents, the Spell Book,
   *  the character sheet and every tooltip that names a class. */
  classes?: Record<string, RealmClassText>;
  /** Ability display names/descriptions keyed by canonical ability id: the
   *  spell book, the action bar, talent tooltips and combat log all resolve
   *  through tEntity, so one entry re-voices the skill everywhere it appears. */
  abilities?: Record<string, RealmAbilityText>;
  /** Talent SPEC display names keyed by `<class>.<specId>` - spec ids repeat
   *  across classes ('holy' is both paladin and priest), so the class qualifies
   *  the key. Resolved in src/ui/talent_i18n.ts before the locale titles. */
  talentSpecs?: Record<string, string>;
  /** Talent MASTERY display names, keyed `<class>.<specId>` like talentSpecs.
   *  The spec card headlines its mastery, so a realm that renames the spec but
   *  not its mastery still reads half shared-world. */
  talentMasteries?: Record<string, string>;
  /** Display titles for the fork's named UI systems (see RealmSystemId). */
  systems?: Partial<Record<RealmSystemId, string>>;
  items?: Record<string, RealmNamedText>;
  dungeons?: Record<string, RealmInstanceText>;
  delves?: Record<string, RealmInstanceText>;
  letters?: Record<string, RealmLetterText>;
  /** Deed display overrides keyed by canonical deed id (see RealmDeedText). */
  deeds?: Record<string, RealmDeedText>;
  /** Dotted t() catalog keys (chrome copy) this realm overrides. */
  catalog?: Record<string, string>;
  /** Rift rank display words keyed by the wire rank letter (C/B/A/S). The UI
   *  keeps the letter for sorting and prepends the word. */
  riftRanks?: Record<string, string>;
  /** Waypoint display names keyed by waypoint id (wp_<zoneId>[_wild], ...).
   *  The sim wire keeps carrying the canonical English name; the client
   *  translates at render (waypointDisplayName in src/ui/entity_i18n.ts). */
  waypoints?: Record<string, string>;
  /** Now-playing display labels keyed by MusicZone KEY (src/game/music.ts
   *  MUSIC_ZONE_LABELS). Keys are identifiers - only the label changes. */
  musicZones?: Record<string, string>;
  /** Vale Cup bot name pool for this realm (display-only identity strings;
   *  bots are transient match participants, never save data). Falls back to
   *  the canonical VC_BOT_NAMES pool when omitted. */
  vcBotNames?: readonly string[];
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
  /** Per-realm cosmetic SEASON banner (see RealmSeason). Omit to inherit the
   *  shared "Season 1 / The Armory" copy from the i18n chrome catalog. */
  season?: RealmSeason;
  /** This realm's on-chain TICKER, substituted into translated store/wallet copy
   *  (which bakes the ticker as a literal, because tickers are not translated).
   *  Omit for Cryptic Realm's own 'CR'; claudecraft declares upstream's 'WOC'. */
  tokenSymbol?: string;
  /** Short game name used in prose like "your <brand> account". Omit for
   *  'Cryptic Realm'; claudecraft declares upstream's 'WoC'. */
  shortBrand?: string;
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
  /** Per-realm WORLD THEME: how this realm re-skins the shared overworld — town
   *  building scale/spacing, ambient lighting, sky/weather. Applied by
   *  themeWorldForRealm (data.ts) on top of BUILTIN_WORLD, so claudecraft (which
   *  omits this) stays vanilla / true to upstream. Render-only + prop layout; it
   *  never changes Sim entity spawns or determinism. */
  worldTheme?: RealmWorldTheme;
  /** VANILLA WORLD opt-out: this realm serves the upstream world untouched, so the
   *  Cryptic Realm features layered ON the world (today: enterable town-building
   *  interiors, see sim/interiors.ts realmHasBuildingInteriors) stay off. Only
   *  claudecraft sets it.
   *
   *  Deliberately an opt-OUT. The interiors gate used to be "does this realm have a
   *  worldTheme", and worldTheme is an optional COSMETIC block that only infernal has
   *  ever set — so seven realms (crypticrealm, classic, dominion, arcane, arcadevoid,
   *  fps, exchange) silently had no doors at all: no interior rooms spawned, no door
   *  areas computed, every town building solid scenery. With an opt-out, a realm added
   *  tomorrow gets its doors by default and only a deliberate vanilla realm loses them. */
  vanillaWorld?: boolean;
  /** Per-realm COMBAT FEEL: how snappy the moment-to-moment combat is. The D2
   *  realms collapse cast times + the GCD for instantaneous hack-n-slash; the
   *  vanilla realms (classic, claudecraft) omit this and keep WoW-style timing.
   *  Applied at the cast site (casting_lifecycle.ts). Deterministic — it only
   *  scales existing timers, draws no rng. */
  combatFeel?: RealmCombatFeel;
  /** Per-realm LEVEL CAP. Absent = the global default (MAX_LEVEL, 20). The D2
   *  realms set 99, classic 80; claudecraft omits it (vanilla 20). Read via
   *  maxLevelForActiveRealm(). */
  maxLevel?: number;
  /** Per-realm D2 STAT SCALING: past level 20 the D2 realms ramp HP / damage /
   *  mana super-linearly so a level-99 hero hits for hundreds→thousands (the D2
   *  power fantasy). Absent = vanilla (no extra scaling, so the linear 20-level
   *  curve stands — classic, claudecraft). Applied to BOTH players and mobs so the
   *  challenge ratio holds (mirrors D2 Hell scaling monster life while heroes stack
   *  Vitality). Deterministic — a pure multiplier off level, draws no rng. */
  combatScaling?: RealmCombatScaling;
  /** Per-realm LORE OVERLAY (see RealmEntityText): sparse display-string
   *  re-skin of the shared world, resolved at the tEntity()/t() display sinks.
   *  Omit (claudecraft) for byte-identical vanilla behavior. */
  entityText?: RealmEntityText;
  /** Display word for the shared 'Claudium' soft currency, substituted into
   *  translated copy by applyRealmBrand exactly like tokenSymbol/shortBrand
   *  (the word is baked untranslated into every locale). Omit to keep
   *  'Claudium'. The /api/claudium/* routes, env names, Stripe webhook and
   *  economy-service wire fields are identifiers and never rename. */
  currencyName?: string;
}

/** Per-realm D2 stat ramp. Nothing scales at/below `fromLevel` (mult = 1). Above it,
 *  the multiplier grows geometrically per level so late levels feel like D2. */
export interface RealmCombatScaling {
  /** Level at/below which the multiplier is exactly 1 (the vanilla curve). Default 20. */
  fromLevel?: number;
  /** Per-level growth for HP/mana pools past fromLevel (e.g. 1.05 = +5%/level,
   *  compounding — ~48× over 79 levels). */
  hpPerLevel?: number;
  /** Per-level growth for outgoing damage (attack power / spell power / weapon). */
  dmgPerLevel?: number;
  /** Same ramp applied to MONSTERS (their level-scaled HP + damage) so the fight
   *  stays hard. Defaults to matching hp/dmg so the ratio is preserved. */
  mobHpPerLevel?: number;
  mobDmgPerLevel?: number;
}

/** Per-realm combat snappiness. Every field optional; absent = vanilla WoW timing. */
export interface RealmCombatFeel {
  /** Multiply every ability's cast time by this (0 = fully instant, 0.35 = 65%
   *  faster). Physical/instant abilities are already 0 so they're unaffected. */
  castTimeMult?: number;
  /** Multiply the global cooldown by this so abilities chain faster (D2 clicky
   *  carnage). Clamped to a small floor so the sim can't livelock. */
  gcdMult?: number;
}

/** Per-realm re-skin of the shared overworld. Every field optional; an absent
 *  field means "leave the built-in world as-is" (so a realm with no worldTheme,
 *  like claudecraft, is untouched). */
export interface RealmWorldTheme {
  /** Multiply every town building's footprint (w/d) by this — a larger, grander
   *  WoW-style settlement. Collision derives from the same w/d, so it stays solid. */
  buildingScale?: number;
  /** Multiply the spread of building positions from the hub centre by this, so a
   *  bigger settlement doesn't overlap itself. */
  buildingSpread?: number;
  /** Ambient/scene lighting tint + intensity for a darker or moodier realm
   *  (e.g. infernal = dim, red-shifted). Render-only. */
  lighting?: {
    /** Hex tint multiplied into the ambient/hemisphere light. */
    ambientHex?: string;
    /** 0..1 ambient intensity scale (1 = default; <1 = darker). */
    ambientScale?: number;
    /** Hex sky/fog tint for the horizon + fog (e.g. a bruised red sky). */
    skyHex?: string;
    /** Fog density scale (1 = default; >1 = thicker, gloomier air). */
    fogScale?: number;
  };
  /** Weather: enable a changing-sky system for this realm. */
  weather?: {
    enabled?: boolean;
    /** Weighted moods the sky cycles through (e.g. ['stormy','ashfall','bloodmoon']). */
    moods?: string[];
  };
}
