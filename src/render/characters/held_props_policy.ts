/**
 * Who is allowed to be holding something.
 *
 * 2026-08-17, from the same sweep as body_shape_gate.ts. Fisherman Brandt was
 * standing in Eastbrook with an INFERNAL SCYTHE in his right hand and a round
 * shield in his left. He is a fish vendor. Nobody authored that.
 *
 * scripts/realm_assets/emit_manifest.mjs gives EVERY generated body a mainhand
 * weapon drawn by hash from the melee library plus `shield_round.glb`, and
 * decides who is exempt with `ARMED`, a regex on the FILENAME. So the exemption
 * lands on bodies whose *mesh* already holds a weapon, and everything else -
 * every civilian in the library - is handed live weapon sockets it was never
 * meant to have. The bald robed elder (realm_infernal_hero_monk, on nine NPCs
 * across two realms) carries a steampunk war hammer.
 *
 * The regex cannot be repaired in place, because the filenames it reads were
 * laundered by the ip_rename pass and do not describe the models
 * (body_catalog/catalog.json, `namesAreNotTruth`). So the decision moves here,
 * where the ENTITY is known, and it is made from the entity's ROLE:
 *
 *   - an NPC is empty-handed unless its template says it fights,
 *   - a mob that cannot aggro and whose damage never scales is a non-combatant
 *     (an escortee, a vision, a training dummy, a stabled horse) and is
 *     empty-handed,
 *   - a Vale Cup bot is a villager playing a ball game, not a soldier,
 *   - everyone else, players above all, keeps their sockets untouched, so
 *     equipped weapons still render exactly as they always have.
 *
 * Deny-by-default in the safe direction: a role this file forgets renders
 * empty-handed, which is wrong quietly. The reverse - forgetting a civilian -
 * is what put a scythe in a fisherman's hand.
 */

import { VC_BOT_BODY_KEYS } from '../../sim/content/vale_cup';
import { MOBS, NPCS } from '../../sim/data';
import type { Entity } from '../../sim/types';
import type { WeaponLayoutOverride } from './manifest';
import { GENERATED_VISUALS } from './manifest.generated';

/**
 * NPC templates whose ROLE is to be armed, by template id.
 *
 * Curated by reading the roster's authored `title` field - "Town Marshal",
 * "Highwatch Captain", "Camp Footman" - which is English written by a person,
 * NOT the laundered asset filenames. Ids, never substrings: `marshal_redbrook`
 * is a lawman and belongs here; `race_marshal_pip` keeps the grid book at a
 * horse race and does not. A substring rule on "marshal" cannot tell them
 * apart, and that class of mistake is the whole reason this file exists.
 *
 * NPCs flagged `grinds` in content data (they hunt field mobs and therefore
 * genuinely fight) are armed WITHOUT being listed here - that is a real role
 * signal already in the data, so it is read rather than duplicated.
 */
export const ARMED_NPC_TEMPLATES: ReadonlySet<string> = new Set([
  // Lawmen, commanders and garrison troops.
  'marshal_redbrook', // Town Marshal
  'warden_fenwick', // Warden of Fenbridge
  'warden_kaldra', // Warden of Icemantle
  'warden_coalfast', // Redoubt Commander
  'captain_thessaly', // Highwatch Captain
  'gatecaptain_brannoc', // Commander of Wyrmwatch
  'skirmish_footman', // Camp Footman
  'warmarshal_draven_kole', // Master of the Warfare Stores
  // Scouts and sentries who walk the line.
  'scout_maren', // Marshal's Scout
  'scout_maren_highwatch',
  'scout_yerrin', // Far-Dune Watcher
  'scout_einna', // Snowline Scout
  'waywatcher_sorrel', // Watcher of the Goldmelt
  'strandwatcher_pell', // Watcher of the Tanglemouth
  'gatewarden_pell', // Keeper of the Garden Gate
  'huntsman_deral', // Warden of the Herds
]);

/** True when this NPC template's role is an armed one. */
export function npcRendersArmed(templateId: string): boolean {
  if (NPCS[templateId]?.grinds === true) return true;
  return ARMED_NPC_TEMPLATES.has(templateId);
}

/**
 * True when this mob template is not a fighter.
 *
 * Read from the template's own combat numbers rather than a list: a mob that
 * cannot aggro (`aggroRadius` 0) AND whose damage does not scale with level
 * (`dmgPerLevel` 0) is scenery or an escortee - Fisher Bram in his wrecked
 * boat, the training dummy, the Nythraxis visions, a stabled horse, an egg
 * sac. A warlock's imp has dmgPerLevel 0.7 and a widow hatchling 1.6, so
 * neither is caught: summons and vermin keep their weapons.
 */
export function mobIsNonCombatant(templateId: string): boolean {
  const mob = MOBS[templateId];
  if (!mob) return false;
  return (mob.aggroRadius ?? 0) === 0 && (mob.dmgPerLevel ?? 0) === 0;
}

/** True when `key` is one of the Vale Cup practice/backfill bot bodies. */
export function isValeCupBotBody(key: string | null | undefined): boolean {
  return !!key && (VC_BOT_BODY_KEYS as readonly string[]).includes(key);
}

/**
 * The held-item layout to force on this entity, or null to keep the body's own.
 *
 * Scoped to GENERATED bodies on purpose. The hash-drawn weapon and round shield
 * are emit_manifest.mjs's doing and exist only on keys it emitted; a
 * hand-authored def that carries a prop carries it because someone chose it,
 * and this must not strip that. So the check is membership of
 * GENERATED_VISUALS, which is precise and needs no name matching.
 */
export function forcedHeldLayoutFor(e: Entity, key: string): WeaponLayoutOverride | null {
  if (!GENERATED_VISUALS[key]) return null;
  if (e.kind === 'npc') {
    return npcRendersArmed(e.templateId) ? null : EMPTY_HELD_LAYOUT;
  }
  if (e.kind === 'mob') {
    return mobIsNonCombatant(e.templateId) ? EMPTY_HELD_LAYOUT : null;
  }
  // Players keep their sockets: an equipped weapon must still render. The one
  // exception is a Vale Cup bot, which is a player-KIND entity standing in for
  // a villager on a ball pitch.
  if (e.kind === 'player') {
    return isValeCupBotBody(e.visualKey) ? EMPTY_HELD_LAYOUT : null;
  }
  return null;
}

/** No attachments, no live weapon slot, no offhand slot: empty hands. */
export const EMPTY_HELD_LAYOUT: WeaponLayoutOverride = {
  attach: undefined,
  weaponSlots: undefined,
  offhandSlot: undefined,
};
