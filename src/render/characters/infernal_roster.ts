/**
 * Authored Infernal civilian and opponent roster.
 *
 * Keep this mapping independent from NPC behavior: template ids still drive
 * quests, vendors, housing, and persistence. Only their rendered bodies vary.
 */

// AUDIT 2026-08-08. Every body reachable as an infernal hero/class/NPC and every
// crypticrealm class body was rendered through the game's own preview renderer at
// four phases each of Idle, Walk and Attack, from two angles, and looked at. The
// bank is in far worse shape than the previous note implied: of the 28 distinct
// GLBs behind these keys, only three civilians survive with working limbs.
//
// The rotation below is now the SHORT list, not the long one. A body qualifies
// only if its arms are driven by the arm bones (they move through Walk), it has
// hands, and nothing shears into a plank. Everything else moved to
// INFERNAL_DEFECTIVE_BODY_KEYS with the reason recorded there.
//
// This is deliberately three bodies rather than fourteen mostly-broken ones: a
// town of three repeated men reads as cheap, a town of scarecrows reads as
// broken. Repairing the bank is what takes this list back up - see the note on
// INFERNAL_DEFECTIVE_BODY_KEYS.
export const INFERNAL_HUMAN_VISUAL_KEYS = [
  'realm_infernal_human_iron_warden',
  'realm_infernal_human_weathered_elder',
  'realm_infernal_human_hooded_wanderer',
] as const;

/**
 * Bodies kept registered (an explicit assignment or an operator override can
 * still name one) but barred from the civilian rotation.
 *
 * Grouped by what is actually wrong, because the fix differs per group:
 *
 * ARMS NEVER MOVE - the arm surface is weighted to Hips/Spine instead of the arm
 * chain, so the arms hold their bind pose through every clip. Where that bind is
 * a T-pose the character walks through town as a scarecrow ("arms spread like a
 * kite"). Measurable: bind-pose X span / height >= 0.94 and hand vertices
 * carrying almost no arm-chain weight.
 *   forge_worker   span 1.06, 31% arm weight on the hands. Arms locked straight
 *                  out, forearms shredded to flat blades, feet dragged as planks.
 *   hermit         span 1.19, 9% arm weight, LeftHand carries NO weight at all.
 *   white_sage     no face under the hat, arm stubs with no hands, plank feet.
 *   monk           span 0.94; arms stay splayed through Walk.
 *   road_mercenary forearms end in flat blades, no hands; RightHand 0% arm weight.
 *   vanguard       no forearms and no hands at all - frozen stubs at the pauldrons.
 *
 * ONE ARM FROZEN - one side's hand joint carries no weight, so that arm holds
 * bind while the other animates.
 *   iron_ranger    LeftHand dead; the whole lower body shears into one flat plank.
 *   veil_adept     RightHand dead; robe hem lies on the ground through Idle.
 *   crusader       LeftHand dead; the held weapon stays on the floor as the body
 *                  walks away from it.
 *   spiritborn     left hand travels 0.027 of body height per Walk against the
 *                  right's 0.123 - it grips its book rigidly while the right arm
 *                  gestures.
 *
 * HANDS FUSED TO THE WAIST - forearms pinned at the belt, hands merged into the
 * buckle, feet torn into planks. reweight_topo already shipped one pass at this
 * body and it still fails, so it needs a re-bind, not more weight surgery.
 *   barbarian
 *
 * TORN CLOTH - limbs are sound but the hem/skirt tears into a flat slab that
 * lies on the ground through the whole Idle loop.
 *   tainted_hood
 *
 * TEMPEST is the same GLB as the class Wizard body: frozen arms, no hands, and a
 * slab under the gown in every Idle frame.
 *
 * BLOOD_KNIGHT is the one entry here that is NOT a rig fault - it renders and
 * animates correctly. It is barred from the CIVILIAN rotation because it is a
 * blue horned demoness, and handing it to a random townsperson (it was cast on
 * mercenary_kael) is why the town read wrong. It stays fully usable as a hero or
 * class body.
 *
 * ASSASSIN has not been looked at yet - its render was still queued when the box
 * was throttled. It sits in the same numeric band as the failures above
 * (13% arm weight on the hands, 256x worst edge stretch), so it is barred
 * pending that render rather than left in rotation on a guess.
 *
 * REPAIR: forge_worker and hermit both come back inside the healthy band under
 * scripts/reweight_topo.mjs rule K (the geodesic claim) - see the recipe at the
 * bottom of this file. That repair is measured but NOT yet visually signed off,
 * so nothing here has been un-barred on the strength of it.
 */
export const INFERNAL_DEFECTIVE_BODY_KEYS = [
  'realm_infernal_human_forge_worker',
  'realm_infernal_human_white_sage',
  'realm_infernal_human_hermit',
  'realm_infernal_human_monk',
  'realm_infernal_human_vanguard',
  'realm_infernal_human_road_mercenary',
  'realm_infernal_human_iron_ranger',
  'realm_infernal_human_barbarian',
  'realm_infernal_human_veil_adept',
  'realm_infernal_human_crusader',
  'realm_infernal_human_spiritborn',
  'realm_infernal_human_tempest',
  'realm_infernal_human_tainted_hood',
  'realm_infernal_human_blood_knight',
  'realm_infernal_human_assassin',
] as const;

/**
 * The playable class bank has the same disease. These keys are still registered
 * and still selectable as hero cards, but no class table may point at one:
 * REALM_CLASS_VISUALS was moved off every entry below.
 *
 *   sorcerer     bind span 1.01 - a full T-pose held through Idle and Walk, with
 *                shredded sleeves and the elongated fingers the owner named.
 *   assassin     span 0.84, forearms end in pale blades, no hands.
 *   warlock      worst body in the bank: 0% arm weight on BOTH hands, 646x worst
 *                edge stretch, and the dress hem lies flat on the ground.
 *   wizard       frozen arms, no hands, slab under the gown every Idle frame.
 *   amazon       feet tear off into planks in Attack; elongated finger spike.
 *   paladin      feet stretched into flat pale planks.
 *   necromancer  RightHand dead (same GLB as the veil_adept civilian).
 *   crusader     LeftHand dead (same GLB as the crusader civilian).
 *   tempest      left arm frozen (same GLB as the spiritborn civilian).
 *   barbarian    hands fused to the belt (same GLB as the barbarian civilian).
 *   druid        same body family as barbarian, same fused hands.
 *   monk         span 0.94, arms splayed through Walk.
 *   spiritborn   not yet looked at - render queued. Numerically in the failure
 *                band (3% arm weight on the hands, 375x worst stretch).
 */
export const INFERNAL_DEFECTIVE_CLASS_BODY_KEYS = [
  'realm_infernal_class_sorcerer',
  'realm_infernal_class_assassin',
  'realm_infernal_class_warlock',
  'realm_infernal_class_wizard',
  'realm_infernal_class_amazon',
  'realm_infernal_class_paladin',
  'realm_infernal_class_necromancer',
  'realm_infernal_class_crusader',
  'realm_infernal_class_tempest',
  'realm_infernal_class_barbarian',
  'realm_infernal_class_druid',
  'realm_infernal_class_monk',
  'realm_infernal_class_spiritborn',
] as const;

export type InfernalHumanVisualKey = (typeof INFERNAL_HUMAN_VISUAL_KEYS)[number];

// Every role that used to name a barred body now names one of the three that
// work. The mapping is deliberately explicit rather than falling through to the
// hash so the intent per role survives the next time the bank changes:
//   iron_warden      -> anyone armed, armoured, or physically heavy
//   weathered_elder  -> anyone older, seated behind a counter, or keeping records
//   hooded_wanderer  -> anyone robed, hooded, scholarly, or on the road
const NPC_ROLE_VISUALS: Record<string, InfernalHumanVisualKey> = {
  the_merchant: 'realm_infernal_human_hooded_wanderer',
  marshal_redbrook: 'realm_infernal_human_iron_warden',
  warden_fenwick: 'realm_infernal_human_iron_warden',
  // was vanguard: that body has no forearms and no hands
  captain_thessaly: 'realm_infernal_human_iron_warden',
  trader_wilkes: 'realm_infernal_human_weathered_elder',
  // was veil_adept: its right hand carries no weight, so that arm never moves
  apothecary_lin: 'realm_infernal_human_hooded_wanderer',
  herbalist_yara: 'realm_infernal_human_hooded_wanderer',
  // was barbarian: hands fused to the belt on every clip
  smith_haldren: 'realm_infernal_human_iron_warden',
  armorer_hode: 'realm_infernal_human_iron_warden',
  foreman_odell: 'realm_infernal_human_iron_warden',
  fisherman_brandt: 'realm_infernal_human_weathered_elder',
  stable_master_wren: 'realm_infernal_human_iron_warden',
  // was blood_knight: a blue horned demoness standing in as a human mercenary
  mercenary_kael: 'realm_infernal_human_iron_warden',
  // was iron_ranger: its lower body shears into a single flat plank
  huntress_verr: 'realm_infernal_human_hooded_wanderer',
  bursar_fernando: 'realm_infernal_human_hooded_wanderer',
  realtor_maribel: 'realm_infernal_human_weathered_elder',
  pit_master_grott: 'realm_infernal_human_iron_warden',
  race_marshal_pip: 'realm_infernal_human_hooded_wanderer',
  groundskeeper_bram: 'realm_infernal_human_weathered_elder',
  loremaster_caddis: 'realm_infernal_human_hooded_wanderer',
  cainhurst_sage: 'realm_infernal_human_hooded_wanderer',
  brother_halven: 'realm_infernal_human_hooded_wanderer',
  brother_halven_marsh: 'realm_infernal_human_hooded_wanderer',
  // was tainted_hood: its hem tears into a slab that lies on the ground
  spirit_healer: 'realm_infernal_human_hooded_wanderer',
  scout_maren: 'realm_infernal_human_hooded_wanderer',
  // was tempest: frozen arms, no hands
  scout_maren_highwatch: 'realm_infernal_human_hooded_wanderer',
  tidewatcher_ondrel: 'realm_infernal_human_hooded_wanderer',
  provisioner_hale: 'realm_infernal_human_weathered_elder',
  // was road_mercenary: forearms end in flat blades, no hands
  quartermaster_bree: 'realm_infernal_human_hooded_wanderer',
  interior_merchant: 'realm_infernal_human_iron_warden',
  interior_innkeeper: 'realm_infernal_human_weathered_elder',
  interior_villager: 'realm_infernal_human_hooded_wanderer',
  skirmish_builder: 'realm_infernal_human_iron_warden',
  skirmish_footman: 'realm_infernal_human_iron_warden',

  // --- Eastbrook townsfolk -----------------------------------------------------
  forgemistress_darva: 'realm_infernal_human_iron_warden',
  weaver_ottilie: 'realm_infernal_human_hooded_wanderer',
  toolmaster_gethin: 'realm_infernal_human_iron_warden',
  cook_marlow: 'realm_infernal_human_weathered_elder',
  tanner_briggs: 'realm_infernal_human_hooded_wanderer',
  alchemist_sable: 'realm_infernal_human_hooded_wanderer',
  card_master: 'realm_infernal_human_hooded_wanderer',
  chronicler_saul: 'realm_infernal_human_weathered_elder',
  chronicler_osric_fenn: 'realm_infernal_human_weathered_elder',
  chronicler_edda_hartwell: 'realm_infernal_human_weathered_elder',
  wren_saddleworth: 'realm_infernal_human_iron_warden',
};

const OPPONENT_KEYS = ['hellmaw_cursed_knight_body', 'hellmaw_sigilbound_body'] as const;

const HOSTILE_HUMANOID_KEYS = [
  'realm_infernal_dark_paladin',
  'hellmaw_cursed_knight_body',
  'hellmaw_sigilbound_body',
] as const;

export const INFERNAL_UNDEAD_VISUAL_KEYS = [
  'realm_cryptic_bone_herald',
  'skel_warrior',
  'skel_rogue',
  'skel_mage',
  'skel_golem',
  'hellmaw_spectre_body',
] as const;

function stableIndex(value: string, size: number): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % size;
}

export function infernalNpcVisualKey(templateId: string): InfernalHumanVisualKey {
  // was veil_adept, whose right arm never moves
  if (templateId.startsWith('brother_aldric')) return 'realm_infernal_human_hooded_wanderer';
  return (
    NPC_ROLE_VISUALS[templateId] ??
    INFERNAL_HUMAN_VISUAL_KEYS[stableIndex(templateId, INFERNAL_HUMAN_VISUAL_KEYS.length)]
  );
}

export function infernalOpponentVisualKey(
  templateId: string,
): 'realm_infernal_dark_paladin' | (typeof OPPONENT_KEYS)[number] {
  if (/(?:captain|commander|foreman|warlord|mogger|gorrak|drogmar|brutok)/.test(templateId)) {
    return 'realm_infernal_dark_paladin';
  }
  return OPPONENT_KEYS[stableIndex(templateId, OPPONENT_KEYS.length)];
}

/** Infernal and Cryptic undead rotate through the approved skeleton, spectre,
 * and Bone Herald bank instead of cloning one model across every graveyard. */
export function infernalUndeadVisualKey(
  templateId: string,
): (typeof INFERNAL_UNDEAD_VISUAL_KEYS)[number] {
  if (/(?:restless_bones|bone_herald|bonewalker|gravecaller|necromancer)/.test(templateId)) {
    return 'realm_cryptic_bone_herald';
  }
  return INFERNAL_UNDEAD_VISUAL_KEYS[stableIndex(templateId, INFERNAL_UNDEAD_VISUAL_KEYS.length)];
}

/** Full-size living/corrupted humanoids only. Shared by crossroads realms that
 * must never turn an ordinary bandit or soldier into an undead Bone Herald. */
export function hostileHumanoidVisualKey(
  templateId: string,
): (typeof HOSTILE_HUMANOID_KEYS)[number] {
  return HOSTILE_HUMANOID_KEYS[stableIndex(templateId, HOSTILE_HUMANOID_KEYS.length)];
}

// ---------------------------------------------------------------------------
// REPAIR RECIPE (measured 2026-08-08, not yet visually signed off)
//
// The "arms never move" group is repairable with the geodesic CLAIM rule, which
// is exactly the case rule K was written for: the arm SURFACE is carrying core
// weight, and the surface field can tell arm from torso where distance cannot.
//
//   node scripts/reweight_topo.mjs --input <body>.glb --out <out>.glb \
//     --band 0.26 --claim-gain 1.0 --claim-min 0.7 --claim-max-dist 0.35 \
//     --smooth-iters 6 --smooth-lambda 0.6 --smooth-rings 4
//
// claim-max-dist 0.35, not the 0.18 the barbarian shipped with: on these
// low-poly bodies the arm surface sits up to 0.32 off its own bone axis, so 0.18
// excluded half the arm and left the strip half-done.
//
// Measured before -> after (same mesh against itself, which is the only valid
// comparison):
//   forge_worker  arm weight on hands 0.31 -> 0.94, hand travel per Walk
//                 0.084 -> 0.173 of body height, Idle worst stretch 6.42x ->
//                 3.43x, Attack edges over 2x 64.0 -> 20.6
//   hermit        arm weight on hands 0.09 -> 0.87 (LeftHand went from carrying
//                 no weight at all to 0.87), hand travel 0.059 -> 0.201,
//                 Attack edges over 2x 47.6 -> 17.0
//
// For reference the healthiest body in the bank (iron_warden) reads 1.00 arm
// weight and 0.156 hand travel, so both repairs land inside the healthy band.
// The script's own validation gate passes: animation samplers, images, node
// names and primitive counts all hash identical.
//
// Candidates are staged, NOT shipped. Nothing above was un-barred on these
// numbers - the owner has rejected this work twice for bodies judged on numbers
// or on a static pose, so they need the Idle/Walk/Attack render first.
// ---------------------------------------------------------------------------
