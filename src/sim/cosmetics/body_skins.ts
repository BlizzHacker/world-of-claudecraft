/**
 * THE three tiers a character's body can come from, and the one place that
 * decides which tier a given character is allowed to wear.
 *
 * The operator's rule, 2026-08-17: "don't re-use characters for classes, that's
 * lazy". Before this module there was only one layer of body assignment, so
 * every good body had to be spent somewhere, and the Heavenly Host bodies (the
 * winged gold-and-white figures) were spent as the DEFAULT look of the Infernal
 * Warrior and Rogue. That is the wrong shelf for them twice over: it denies
 * Warrior and Rogue an ordinary body of their own, and it denies every other
 * class the angelic look. So appearance splits into three tiers:
 *
 *   BASE      free, one DISTINCT body per class per sex, the default look.
 *             No body may serve two classes. Not described here at all: the
 *             base body is whatever the realm's own class assignment resolves
 *             to (published `class:<cls>` overrides, then the compiled
 *             REALM_CLASS_VISUALS table). A composed multi-part character
 *             (the Hero Forge direction) drops into the same slot later with
 *             no change here, because this module never names a base body.
 *   UNLOCKED  a cosmetic SKIN FAMILY earned at level 99, wearable by ANY class.
 *             TWO families live here, one per Infernal faction: the Heavenly
 *             Host ("Angelic") and the Ashen Court ("Demonic").
 *   PREMIUM   paid skin families ("Famous Heroes"), gated on an account
 *             entitlement exactly the way Eastbrook Homes deeds are
 *             (server/homeowner_entitlement.ts). Nothing is sold yet; the slot
 *             is defined so the first purchase does not need a new mechanism.
 *
 * Resolution order is PREMIUM, then UNLOCKED, then BASE: a character carrying
 * an owned premium skin wears it even if an unlocked skin is also selected.
 *
 * FACTION IS A THIRD AXIS, not a synonym for tier. The operator, 2026-08-17:
 * "Angelic needs a Counter / Demonic", and "Famous Heroes can be separate
 * because some heroes may have no faction or alliance but are neutral". So a
 * family carries a NULLABLE {@link SkinFaction}: the two unlocked families are
 * the two aligned sides of the realm's war (heavenly / ashen) and the paid
 * shelf is `null`, meaning it takes no side and must never be grouped under
 * either. The picker reads this field for its grouping so the rail cannot drift
 * from the data (src/ui/cryptic/body_skin_rail.ts).
 *
 * WHY THE TIER IS SEPARATE FROM THE BODY COMPOSITION: a skin id says which
 * SHELF a look comes from, never how the look is built. A base-tier character
 * assembled from Hero Forge parts and a base-tier character on one authored GLB
 * are both `skinId: null` here. Keep it that way; the two systems compose.
 *
 * SERVER IS THE ONLY AUTHORITY. {@link authorizeBodySkin} is pure and runs on
 * both sides, but the client's answer is for PAINTING THE PICKER (grey out what
 * cannot be worn). What a character actually wears is whatever the server
 * authorized and published on the entity; a client that lies about its level,
 * its entitlements or its dev status changes nothing for anyone else, and is
 * corrected on its own next full snapshot.
 */

import type { PlayerClass } from '../types';

/** The shelf a look comes from. `base` is the absence of a skin selection. */
export type AppearanceTier = 'base' | 'unlocked' | 'premium';

/**
 * The side of the realm's war a family belongs to, or null for none.
 *
 * Deliberately its OWN two-value type rather than a `RealmFaction` id from
 * src/sim/realms/factions.ts. Those ids are realm-scoped, are being rebranded
 * (the display name "Ashen Court" currently sits on the `burning-hells` id),
 * and there are five of them on Infernal alone. A cosmetic family needs exactly
 * the coarse distinction the operator asked for - angel side, demon side, or
 * neither - and binding it to a rebrandable id would make a lore rename able to
 * regroup the picker.
 */
export type SkinFaction = 'heavenly' | 'ashen';

/**
 * The level a character must reach for the UNLOCKED tier.
 *
 * 99 is the realm cap, not an arbitrary number: infernal, crypticrealm, arcane
 * and dominion all declare `maxLevel: 99` (src/sim/realms/content/*.ts), so this
 * reads as "at the cap" on every realm that offers the tier. A realm with a
 * lower cap (classic is 80) simply never satisfies it, which is correct: the
 * tier is not offered there.
 *
 * KNOWN GAP, 2026-08-17: the live sim cap is `MAX_LEVEL = 20` (src/sim/types.ts),
 * so 99 is not reachable by anyone yet and a separate rescale is in flight to
 * make it so. This constant is NOT lowered to compensate - lowering it would
 * hand every player the tier the moment the rescale lands - and the operator
 * reaches the tier meanwhile through the DEV grant below, which bypasses the
 * level question entirely instead of weakening it.
 */
export const UNLOCKED_SKIN_LEVEL = 99;

export interface BodySkinDef {
  /** Stable id, persisted on the character and never renamed. */
  readonly id: string;
  /** Which shelf. `base` is never a def: base is the absence of a selection. */
  readonly tier: Exclude<AppearanceTier, 'base'>;
  /**
   * Which side this family belongs to, or null for a FACTION-NEUTRAL family.
   *
   * Null is a real, load-bearing value, not "unset": it is how the picker knows
   * to give the family its own shelf instead of filing it under one of the two
   * aligned ones. Required (not optional) so a new family cannot become neutral
   * by omission - taking no side has to be a decision someone typed.
   */
  readonly faction: SkinFaction | null;
  /** i18n key suffix under `charcreate.bodySkins.<key>` for name and blurb. */
  readonly i18nKey: string;
  /**
   * Whether the bodies below stop being eligible as BASE bodies.
   *
   * True is the confiscating case and it exists for exactly one reason: the
   * Heavenly Host bodies were serving as the default look of the Warrior, Rogue
   * and Paladin hero cards, which is the bug this module was written to undo, so
   * those urls are struck out of base resolution on read ({@link isTieredSkinBody}).
   *
   * False means the family BORROWS art that legitimately belongs to a card of
   * its own. The Ashen Court bodies are the case: `realm_infernal_hero_horned_demon`
   * and friends are the published bodies of the six Ashen Court hell cards
   * (`hero:infernal-hell-*` in the live Infernal document), and a demon card
   * wearing a demon is CORRECT. Confiscating them would drop all six cards back
   * to a plain class body - the same regression, pointed the other way. So the
   * demonic family offers them as skin art and takes nothing away.
   */
  readonly claimsBaseBodies: boolean;
  /**
   * Class to body asset url, for the classes this family HAS art for.
   *
   * Deliberately partial and deliberately not filled by reuse. A family that
   * has three bodies offers three classes; the other six are reported as an art
   * gap (see MISSING_SKIN_CLASS_ART) rather than being papered over by lending
   * one class's body to another, which is the exact move this whole module
   * exists to undo. Realm-agnostic because the GLB store is shared across
   * realms; a realm that wants its own art for a family publishes a
   * `skin:<id>:<cls>` override, which wins over this table.
   */
  readonly bodies: Partial<Record<PlayerClass, string>>;
  /** Premium only: the entitlement the account must hold. */
  readonly entitlementId?: string;
  /** Premium only: the $CR list price, mirroring HOME_PRICE_CR's role. */
  readonly priceCr?: number;
}

/**
 * The Heavenly Host: the three winged gold-and-white bodies.
 *
 * These three GLBs are LIVE today as `hero:infernal-hero-warrior`,
 * `hero:infernal-hero-rogue` and `hero:infernal-hero-paladin` in the Infernal
 * realm-visuals document (revision 27), i.e. they are the base look of three
 * cards. Naming them here does not delete those rows; it reclassifies them.
 * {@link isTieredSkinBody} is consulted by the base resolution chain, which
 * SKIPS any body that belongs to a non-base tier, so the published rows stop
 * serving as defaults without a database write, and the same three bodies
 * become selectable by any class that has art in the family.
 */
const HEAVENLY_HOST: BodySkinDef = {
  id: 'heavenly_host',
  tier: 'unlocked',
  faction: 'heavenly',
  i18nKey: 'heavenlyHost',
  // Confiscating: an angel was the DEFAULT body of three class cards, and that
  // is the whole complaint. See BodySkinDef.claimsBaseBodies.
  claimsBaseBodies: true,
  bodies: {
    // The winged gold-and-white figure the operator singled out.
    warrior: '/cr-realms/infernal/realm_infernal_hero_heaven_warrior.glb',
    rogue: '/cr-realms/infernal/realm_infernal_hero_heaven_rogue.glb',
    paladin: '/cr-realms/infernal/realm_infernal_hero_heaven_paladin.glb',
  },
};

/**
 * The Ashen Court: the demonic counterpart the operator asked for.
 *
 * "Angelic needs a Counter / Demonic" (2026-08-17). Same tier, same level 99
 * gate, same "any class may wear it" rule as the Heavenly Host, so the two read
 * as the two halves of one choice rather than as a feature and an afterthought.
 *
 * THE ART IS BORROWED, NOT CLAIMED (claimsBaseBodies: false). Every body below
 * is the published body of one of the six Ashen Court hell cards in the live
 * Infernal document, and each was LOOKED AT as a render before being written
 * down (the store keeps a .png beside each .glb), never adopted from its file
 * name - an ip_rename pass laundered those names and they no longer describe
 * what is in the GLB. What each render actually shows:
 *
 *   warrior  horned demon   red muscular biped, curved horns, tail, hands free
 *   paladin  dark paladin   black ornate plate, horned helm, cape, hands free
 *   priest   bone herald    armoured skeletal warrior: bone-plate cuirass with
 *                          flame-crested pauldrons, exposed ribcage, a skull at
 *                          the belt over a tattered loincloth, heavy gauntlets
 *   warlock  sigil acolyte  hooded grey-blue robe, faceless, hands free
 *   druid    skullbeast     hunched bestial skeleton, horned skull, clawed
 *
 * STILL OWED ART: hunter, rogue, mage and shaman have no demonic body, and
 * missingSkinClassArt() reports them rather than lending one of the five above
 * to a second class. `realm_infernal_hero_behemoth` (a hulking crimson-black
 * armoured brute) is the sixth Ashen Court body and is deliberately NOT wired:
 * it is a second heavy melee silhouette, and the four classes still owed art
 * are three casters and a ranged one, so assigning it to any of them would be
 * the shape-blind pick this file exists to prevent.
 *
 * A realm that wants its OWN demonic art per class publishes `skin:demonic:<cls>`
 * (with the usual :f/:m tail) in its realm-visuals document; that row wins over
 * every url below with no deploy, which is the intended path off the borrowed
 * bodies once dedicated ones are generated.
 */
const DEMONIC: BodySkinDef = {
  id: 'demonic',
  tier: 'unlocked',
  faction: 'ashen',
  i18nKey: 'demonic',
  claimsBaseBodies: false,
  bodies: {
    warrior: '/cr-realms/infernal/realm_infernal_hero_horned_demon.glb',
    paladin: '/cr-realms/infernal/realm_infernal_hero_dark_paladin.glb',
    priest: '/cr-realms/infernal/realm_infernal_hero_bone_herald_black.glb',
    warlock: '/cr-realms/infernal/realm_infernal_hero_sigil_acolyte.glb',
    druid: '/cr-realms/infernal/realm_infernal_hero_skullbeast.glb',
  },
};

/**
 * Famous Heroes: the PAID shelf, and the FACTION-NEUTRAL one.
 *
 * The operator, 2026-08-17: "Famous Heroes can be separate because some heroes
 * may have no faction or alliance but are neutral". So `faction: null` is the
 * point of this entry as much as the price is: it is not a third side and it is
 * not a wing of either of the other two, and the picker gives it its own shelf
 * below the aligned pair. A famous hero who happens to be an angel or a demon
 * does NOT belong here - it belongs in that family - which is what keeps the
 * neutrality honest rather than decorative.
 *
 * It ships with no bodies: nothing is sold yet, so the picker renders the family
 * as a locked, priced row and the authorization path is already the real one.
 * Adding the first purchasable hero is a `bodies` entry plus art, not a new
 * mechanism. The entitlement id is the account-level flag the settlement
 * callback writes, mirroring the Eastbrook Homes seam
 * (server/homeowner_entitlement.ts), so the two paid features are granted and
 * audited the same way.
 */
const FAMOUS_HEROES: BodySkinDef = {
  id: 'famous_heroes',
  tier: 'premium',
  faction: null,
  i18nKey: 'famousHeroes',
  // Nothing to claim (no bodies), and nothing it ever should: a paid shelf that
  // confiscated a base body would be selling something it took away for free.
  claimsBaseBodies: false,
  bodies: {},
  entitlementId: 'skin.famous_heroes',
  priceCr: 500,
};

export const BODY_SKINS: readonly BodySkinDef[] = [HEAVENLY_HOST, DEMONIC, FAMOUS_HEROES];

const BY_ID: ReadonlyMap<string, BodySkinDef> = new Map(BODY_SKINS.map((s) => [s.id, s]));

/** Catalog position, for a deterministic tie-break inside one tier. */
const ORDER: ReadonlyMap<string, number> = new Map(BODY_SKINS.map((s, i) => [s.id, i]));

export function bodySkinById(id: string | null | undefined): BodySkinDef | null {
  return (id && BY_ID.get(id)) || null;
}

/** The families that take a side, in catalog order (the aligned shelf). */
export function alignedBodySkins(): BodySkinDef[] {
  return BODY_SKINS.filter((skin) => skin.faction !== null);
}

/** The families that take NO side, in catalog order (the neutral shelf). */
export function neutralBodySkins(): BodySkinDef[] {
  return BODY_SKINS.filter((skin) => skin.faction === null);
}

/**
 * Every asset url a family has struck out of base resolution.
 *
 * Only families with `claimsBaseBodies` contribute. That is the whole
 * un-welding mechanism, and its limit: a body listed by a CONFISCATING family is
 * by definition not a base body, so a published override still pointing a class
 * or hero card at one is stepped over rather than obeyed. A body a BORROWING
 * family lists (the Ashen Court art) stays a perfectly good base body for the
 * card that owns it, and is offered as skin art on top.
 */
const TIERED_BODY_URLS: ReadonlySet<string> = new Set(
  BODY_SKINS.filter((skin) => skin.claimsBaseBodies).flatMap((skin) => Object.values(skin.bodies)),
);

/** True when this asset belongs to a tier above BASE and must not serve as a
 *  default body. Compared on the url because that is what an override row
 *  carries; the manifest key for the same file is not stable across realms. */
export function isTieredSkinBody(assetUrl: string | null | undefined): boolean {
  return !!assetUrl && TIERED_BODY_URLS.has(assetUrl);
}

/** What a character is allowed to wear, as the SERVER knows it. */
export interface BodySkinGrantContext {
  /** The character's server-side level. Never a client-supplied number. */
  readonly level: number;
  /** Entitlement ids the ACCOUNT holds (server/body_skin_entitlement.ts). */
  readonly entitlements?: readonly string[];
  /**
   * The DEV/ADMIN grant: every unlocked family regardless of level, and every
   * premium family regardless of entitlement.
   *
   * This is a SERVER-ESTABLISHED FACT, never a client claim. It is set from the
   * account's `is_admin` column - the same check that decides whether the "Edit
   * Bodies (admin)" button exists and what `/me/api/me` reports as
   * `roles.isAdmin` - and it is re-read from the database on the character list,
   * on the selection write, and again at every world join. A client that sets
   * this field on its own copy of the context only changes which chips its own
   * picker draws bright; the write is refused and the join authorizes it back
   * down to the base body, so nothing it does reaches another player's screen.
   *
   * Note what this is NOT: it is not a lower gate. UNLOCKED_SKIN_LEVEL stays 99
   * for everybody, and a non-dev at 98 is refused exactly as before. The dev
   * simply is not asked the question.
   */
  readonly dev?: boolean;
}

export type BodySkinDenial = 'unknown' | 'level' | 'unowned' | 'noArt';

export interface BodySkinAuthorization {
  /** The skin the character may wear, or null for the base body. */
  readonly skinId: string | null;
  readonly tier: AppearanceTier;
  /** Why a requested skin was refused; absent when nothing was refused. */
  readonly denied?: BodySkinDenial;
}

const BASE: BodySkinAuthorization = { skinId: null, tier: 'base' };

/** Whether this context satisfies a single def, ignoring per-class art. */
export function meetsSkinRequirements(
  skin: BodySkinDef,
  ctx: BodySkinGrantContext,
): { ok: true } | { ok: false; denied: BodySkinDenial } {
  // The dev grant answers both questions at once - it is the operator's only
  // way to see either tier while the level cap is still 20 - but it answers
  // ONLY these two. A dev is still refused a class the family has no art for
  // (below), because that refusal is about the catalog, not about permission,
  // and pretending otherwise would show the operator a body that does not exist.
  if (ctx.dev === true) return { ok: true };
  if (skin.tier === 'premium') {
    const owned = skin.entitlementId
      ? (ctx.entitlements ?? []).includes(skin.entitlementId)
      : false;
    return owned ? { ok: true } : { ok: false, denied: 'unowned' };
  }
  // Math.trunc, not a bare compare: a level arriving as 99.9 from a bad decode
  // must not read as 99, and NaN must fail rather than throw.
  const level = Math.trunc(Number(ctx.level));
  return Number.isFinite(level) && level >= UNLOCKED_SKIN_LEVEL
    ? { ok: true }
    : { ok: false, denied: 'level' };
}

/**
 * THE gate. Resolve what a character may wear from what it asked for.
 *
 * Accepts one id or several. With several, the highest tier that authorizes
 * wins (premium over unlocked), which is the documented order; the request
 * order is ignored so a client cannot promote a skin by listing it first, and a
 * tie inside one tier (two unlocked families now exist) breaks on CATALOG
 * order, which no request can influence.
 * Returns the base tier for anything unknown, unaffordable, unearned, or
 * without art for the character's class, and says which of those it was so the
 * picker can print an honest reason.
 */
export function authorizeBodySkin(
  requested: string | readonly string[] | null | undefined,
  cls: PlayerClass,
  ctx: BodySkinGrantContext,
): BodySkinAuthorization {
  const ids = typeof requested === 'string' ? [requested] : (requested ?? []);
  if (ids.length === 0) return BASE;
  let denied: BodySkinDenial | undefined;
  let best: BodySkinDef | null = null;
  for (const id of ids) {
    const skin = bodySkinById(id);
    if (!skin) {
      denied ??= 'unknown';
      continue;
    }
    const allowed = meetsSkinRequirements(skin, ctx);
    if (!allowed.ok) {
      denied ??= allowed.denied;
      continue;
    }
    // A family with no body for this class is not wearable by this class. It is
    // not an error and not a substitution: the class simply keeps its base body
    // until the art lands (see MISSING_SKIN_CLASS_ART).
    if (!skin.bodies[cls]) {
      denied ??= 'noArt';
      continue;
    }
    if (!best || outranks(skin, best)) best = skin;
  }
  if (!best) return denied ? { ...BASE, denied } : BASE;
  return { skinId: best.id, tier: best.tier };
}

/** Premium first, then catalog order. Never request order. */
function outranks(candidate: BodySkinDef, incumbent: BodySkinDef): boolean {
  if (candidate.tier !== incumbent.tier) return candidate.tier === 'premium';
  return (ORDER.get(candidate.id) ?? 0) < (ORDER.get(incumbent.id) ?? 0);
}

/**
 * The override-map key a realm publishes to give a family its own body for a
 * class: `skin:<skinId>:<class>`, with the usual optional `:f` / `:m` sex tail.
 * Ordered most specific first, exactly like infernalHeroOverrideKeys.
 */
export function bodySkinOverrideKeys(
  skinId: string,
  cls: PlayerClass,
  gender?: 'male' | 'female' | null,
): string[] {
  const keys: string[] = [];
  if (gender === 'female') keys.push(`skin:${skinId}:${cls}:f`);
  if (gender === 'male') keys.push(`skin:${skinId}:${cls}:m`);
  keys.push(`skin:${skinId}:${cls}`);
  return keys;
}

/** The compiled body a family ships for a class, or null when the art is a gap. */
export function bodySkinAssetUrl(skinId: string, cls: PlayerClass): string | null {
  return bodySkinById(skinId)?.bodies[cls] ?? null;
}

/**
 * The classes each family still owes art for, as a work queue.
 *
 * Derived, never hand-listed, so it shrinks by itself as bodies are added to
 * BODY_SKINS. The Heavenly Host currently ships three of nine: the art brief is
 * a heaven-tier body for hunter, priest, shaman, mage, warlock and druid. The
 * Ashen Court ships five of nine and owes hunter, rogue, mage and shaman.
 * Candidates spotted in the shared store and deliberately NOT adopted without a
 * render review (realm_classic_heavenly_guardian_characters_0197d682,
 * realm_dominion_game_figure_angel_death_0195b944,
 * realm_arcane_celestial_conjuror_019eb709) are named here rather than wired
 * in, because adopting a body from its filename is what put a wall ornament in
 * the streets (see render/characters/body_shape_gate.ts).
 */
export function missingSkinClassArt(
  classes: readonly PlayerClass[],
): { skinId: string; classes: PlayerClass[] }[] {
  return BODY_SKINS.map((skin) => ({
    skinId: skin.id,
    classes: classes.filter((cls) => !skin.bodies[cls]),
  })).filter((row) => row.classes.length > 0);
}
