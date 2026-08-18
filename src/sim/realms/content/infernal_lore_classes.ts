// The Cinderveil's CLASS layer: what an infernal-realm character is called, what
// its skills are called, what its talent specs are called, and what the fork's
// own tool windows are called.
//
// This is the second half of the infernal lore overlay. infernal_lore.ts re-skins
// the WORLD (zones, cast, hostiles, quests, letters); this file re-skins the
// CHARACTER, which is the half the player stares at all session: the Talents
// window, the Spell Book, the action-bar tooltips, the character sheet.
//
// The complaint this answers, in the owner's words: "I dont want to see my
// skullbeast using druid skills". A themed realm's hero runs on a canonical
// engine class ('druid'), and every window read that id's shared-world English
// straight out of the box. Nothing about the engine changes here - the ids,
// the saved talent allocations, the saved hotbar slots, the combat wire and the
// 21 locale overlays are all untouched. Only the DISPLAY strings move, resolved
// in tEntity() / tTalent() before the locale table exactly like every other
// RealmEntityText arm.
//
// SPARSE BY DESIGN. Every one of the 217 ability names in the nine class kits
// was read against the Cinderveil bible; the ones already written in this
// realm's voice by the earlier rename sweep (Dirt Nap, Cold Coffin, Gloom Bolt,
// Litany of Woe, ...) are deliberately NOT repeated here. An entry exists only
// where the shared-world name reads as somewhere else. That keeps the overlay
// auditable: what is in this file is what the Cinderveil claims as its own.
//
// Style, matching infernal_lore.ts: no em/en dashes, no emoji, short names.

import type { RealmAbilityText, RealmClassText, RealmEntityText, RealmSystemId } from '../types';

/**
 * The nine engine classes as the Cinderveil names them. Five reuse the realm's
 * own authored class skins (INFERNAL_REALM.classes) so the creator card and the
 * in-world character agree; four are authored here for the engine classes the
 * skin list never covered.
 */
export const CINDERVEIL_CLASSES: Record<string, RealmClassText> = {
  warrior: {
    name: 'Iron Warden',
    description:
      'Forged in the Abyssal Foundries, Iron Wardens are living fortresses. Their armor is grafted to bone and their shields weigh more than a mortal man. Where a Warden plants his feet, the line holds or the Warden does not leave.',
  },
  paladin: {
    name: 'Ashen Templar',
    description:
      'The last sworn order of the Ashen Court, keeping a rite nobody living remembers the start of. A Templar carries one candle into the dark and answers for everyone who walks behind it.',
  },
  hunter: {
    name: 'Harrowstalker',
    description:
      'Trackers out of Harrowfield, raised on the truce ground where the dead are counted and the living are not. They bind a beast to their name, learn the roads the crows take, and put an arrow through whatever comes down them.',
  },
  rogue: {
    name: 'Shadow Blade',
    description:
      'Trained in the Void Pits where light never reaches, Shadow Blades move between heartbeats. They strike from nowhere and vanish before the body falls.',
  },
  priest: {
    name: 'Wakekeeper',
    description:
      'Wakekeepers sit the long vigil the Cinderveil owes its dead: candles trimmed, names read, hymns held until dawn. The same litany that eases a passing will also unmake something that refuses to pass.',
  },
  shaman: {
    name: 'Ashbinder',
    description:
      'Ashbinders read the realm as a thing still burning, and bargain with what burns. Storm, stone, rime and cinder all answer the same knot of ash and hair tied around a weapon haft.',
  },
  mage: {
    name: 'Ember Witch',
    description:
      'Born in the heart of a volcano, Ember Witches channel primordial flame through their veins. Their laughter ignites the air, and their rage melts steel.',
  },
  warlock: {
    name: 'Bone Herald',
    description:
      'Once a royal necromancer of the Ashen Court, the Bone Herald commands legions of the fallen. Each skull raised is a soldier reborn, each corpse a vessel for undeath.',
  },
  druid: {
    name: 'Forest Sage',
    description:
      'While the Cinderveil burns, Forest Sages tend the last groves of living wood. They channel the quiet fury of a dying green: roots that strangle, spores that heal, bark that will not break.',
  },
};

/**
 * Ability display names, keyed by canonical ability id. Grouped by the class kit
 * each id belongs to (src/sim/content/classes.ts CLASSES[cls].abilities) so a
 * later pass can see at a glance which kit is covered and which is not.
 */
export const CINDERVEIL_ABILITIES: Record<string, RealmAbilityText> = {
  // --- Iron Warden (warrior) ------------------------------------------------
  heroic_strike: { name: 'Foundry Strike' },
  revenge: { name: 'Answering Blow' },
  battle_shout: { name: 'Foundry Bellow' },
  charge: { name: 'Ironrush' },
  thunder_clap: { name: 'Anvilfall' },
  hamstring: { name: 'Tendon Shear' },
  bloodrage: { name: 'Blood Tithe' },
  pummel: { name: 'Gauntlet Crack' },
  berserker_rage: { name: 'Forge Fury' },
  execute: { name: 'Slag Sentence' },
  furious_mending: { name: 'Grafted Mending' },
  slam: { name: 'Sledgefall' },
  whirlwind: { name: 'Grinding Wheel' },
  heroic_leap: { name: "Warden's Leap" },
  rallying_cry: { name: 'Muster the Wardens' },
  battle_stance: { name: 'Marching Stance' },
  berserker_stance: { name: 'Kilnfire Stance' },
  defensive_stance: { name: 'Bulwark Stance' },
  intimidating_shout: { name: 'Dreadcall' },
  sunder_armor: { name: 'Plate Shear' },
  seasoned_soldier: { name: 'Foundry Veteran' },
  raised_guard: { name: 'Wardstance' },
  raging_gale: { name: 'Twin Hammers' },

  // --- Ember Witch (mage) ---------------------------------------------------
  frost_armor: { name: "Witch's Rime" },
  arcane_intellect: { name: 'Emberwit' },
  ignition: { name: 'Kindling' },
  hot_streak: { name: 'Rising Heat' },
  blazing_barrier: { name: 'Pyre Shell' },
  meteor: { name: 'Skyfall Ember' },
  summon_water_elemental: { name: 'Call the Drowned Thing' },
  ice_lance: { name: 'Splinter of Cold' },
  fingers_of_frost: { name: 'Grave Chill' },
  brain_freeze: { name: 'Stilled Thought' },
  arcane_missiles: { name: 'Ember Darts' },
  frozen_orb: { name: 'The Drowned Moon' },
  blizzard: { name: 'Ashfall Squall' },
  icy_veins: { name: 'Coldblood' },
  glacial_spike: { name: 'Martyrspike Shard' },
  glacial_front: { name: "Glacier's Advance" },
  dragons_breath: { name: 'Wyrmbreath' },
  arcane_explosion: { name: 'Emberburst' },
  flamestrike: { name: 'Hellfire Cascade' },
  temporal_barrier: { name: 'The Held Hour' },
  temporal_echo: { name: 'Echo of the Hour' },
  arcane_surge: { name: 'Ember Surge' },
  temporal_cascade: { name: 'Cascade of Hours' },
  temporal_reversal: { name: 'Unmake the Hour' },
  collective_reversal: { name: 'Unmake the Vigil' },
  temporal_rewind: { name: 'Rewind the Wake' },
  temporal_hourglass: { name: 'The Stopped Glass' },
  temporal_acceleration: { name: 'Quickened Hour' },
  perfect_moment: { name: 'The Held Breath' },

  // --- Shadow Blade (rogue) -------------------------------------------------
  sinister_strike: { name: 'Voidcut' },
  backstab: { name: 'Heartbeat Thrust' },
  sap: { name: 'Hush' },
  ambush: { name: 'Pitborn Ambush' },
  vanish: { name: 'Voidstep' },

  // --- Ashen Templar (paladin) ---------------------------------------------
  holy_light: { name: 'Candlelight' },
  devotion_aura: { name: 'Vigil Aura' },
  divine_protection: { name: 'Ashen Ward' },
  consecration: { name: 'Consecrated Ash' },
  sacred_bulwark: { name: 'Reliquary Bulwark' },

  // --- Harrowstalker (hunter) ----------------------------------------------
  aspect_of_the_hawk: { name: 'Carrion Guise' },
  tame_beast: { name: 'Harrowbond' },
  dismiss_pet: { name: 'Dismiss the Bound' },
  revive_pet: { name: 'Mend the Bound' },
  volley: { name: 'Arrow Rain' },

  // --- Wakekeeper (priest) --------------------------------------------------
  smite: { name: 'Censure' },

  // --- Ashbinder (shaman) ---------------------------------------------------
  earthquake: { name: 'Sundering Ground' },

  // --- Bone Herald (warlock) ------------------------------------------------
  rain_of_fire: { name: 'Ashfall' },
  spell_lock: { name: 'Silence the Tongue' },

  // --- Forest Sage (druid) --------------------------------------------------
  // The kit behind the owner's Skullbeast report: every name a themed hero
  // could read as "this is somebody else's game" is claimed here.
  wrath: { name: 'Grovebolt' },
  healing_touch: { name: "Nature's Embrace" },
  mark_of_the_wild: { name: 'Grove Ward' },
  moonfire: { name: 'Drowned Moonfire' },
  rejuvenation: { name: 'Sporebloom' },
  entangling_roots: { name: 'Strangleroot' },
  bear_form: { name: 'Barkhide Form' },
  bear_charge: { name: 'Barkhide Rush' },
  cat_form: { name: 'Gaunt Form' },
  claw: { name: 'Rend' },
  barkskin: { name: 'Ancient Bark' },
  starfire: { name: 'Ashen Star' },
  dash: { name: 'Bolt' },
  insect_swarm: { name: 'Spore Cloud' },
  rip: { name: 'Gutting Root' },
  hurricane: { name: 'Ashstorm' },
  primal_reflexes: { name: "Grovekeeper's Reflexes" },

  // --- talent-granted signature abilities -----------------------------------
  // These are not in any class kit array; they arrive from a spec choice, and
  // the Talents spec card advertises each one by name, so they are the first
  // ability names a player reads on this screen.
  moonkin_form: { name: 'Drowned Moon Form' },
  feral_charge: { name: 'Gaunt Surge' },
  swiftmend: { name: 'Quickbloom' },
};

/**
 * Talent MASTERY labels, keyed `<class>.<specId>` exactly like the spec names.
 * Sparse for the same reason: Blood Debt, Grave Mercy, Gloamveil, Redhanded and
 * the rest already read Cinderveil, so they are not repeated here.
 */
export const CINDERVEIL_TALENT_MASTERIES: Record<string, string> = {
  'warrior.arms': 'Foundry Master',
  'paladin.holy': 'Candleflame Faith',
  'hunter.beast_mastery': 'Houndbond',
  'priest.discipline': 'Unbroken Vigil',
  'mage.arcane': 'Hourweave',
  'mage.fire': 'Emberbrand',
  'druid.balance': 'Drowned Rage',
  'druid.feral': 'Gauntheart',
  'druid.restoration': "The Grove's Last Gift",
};

/**
 * Talent spec display names, keyed `<class>.<specId>`. Spec ids repeat across
 * classes ('holy' is both paladin and priest, 'restoration' both shaman and
 * druid), so the class qualifies the key. Ids are save data and never move.
 */
export const CINDERVEIL_TALENT_SPECS: Record<string, string> = {
  'warrior.arms': 'Foundry Craft',
  'warrior.fury': 'Kilnfire',
  'warrior.prot': 'Bulwark of Ash',
  'paladin.holy': 'Candlerite',
  'paladin.protection': 'Reliquary',
  'paladin.retribution': 'Ashen Verdict',
  'hunter.beast_mastery': 'Harrow Houndmaster',
  'hunter.survival': 'Gravecraft',
  'rogue.subtlety': 'Voidwork',
  'priest.discipline': 'Vigil Doctrine',
  'priest.holy': 'Candlemass',
  'mage.arcane': 'Hourwork',
  'mage.fire': 'Emberwitchery',
  'mage.frost': 'Martyrspike Rime',
  'shaman.enhancement': 'Ashbrand',
  'druid.balance': 'Drowned Moon',
  'druid.restoration': 'The Last Grove',
};

/** Titles for the fork's own tool windows on this realm (RealmSystemId). */
export const CINDERVEIL_SYSTEMS: Partial<Record<RealmSystemId, string>> = {
  skillTrees: 'Rites of Descent',
  lootVault: 'The Ember Reliquary',
  pickit: "The Pardoner's Ledger",
  bestiary: 'The Cinder Chronicle',
};

/**
 * The chrome keys that title the BUILT-IN windows. These are ordinary catalog
 * keys, so they ride the overlay's existing `catalog` map rather than a new
 * mechanism; merged into INFERNAL_ENTITY_TEXT.catalog at the bottom of
 * infernal_lore.ts.
 */
export const CINDERVEIL_SYSTEM_CATALOG: Record<string, string> = {
  'game.talents.title': 'Lineage',
  'abilityUi.spellbook.title': 'Grimoire',
  'itemUi.bags.title': 'Satchels',
  'hudChrome.finder.title': 'The Descent Board',
};

/** The class layer, ready to spread into INFERNAL_ENTITY_TEXT. */
export const CINDERVEIL_CLASS_LAYER: Pick<
  RealmEntityText,
  'classes' | 'abilities' | 'talentSpecs' | 'talentMasteries' | 'systems'
> = {
  classes: CINDERVEIL_CLASSES,
  abilities: CINDERVEIL_ABILITIES,
  talentSpecs: CINDERVEIL_TALENT_SPECS,
  talentMasteries: CINDERVEIL_TALENT_MASTERIES,
  systems: CINDERVEIL_SYSTEMS,
};
