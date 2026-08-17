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
 *             The Heavenly Host is the seed of this tier.
 *   PREMIUM   paid skin families ("Famous Heroes"), gated on an account
 *             entitlement exactly the way Eastbrook Homes deeds are
 *             (server/homeowner_entitlement.ts). Nothing is sold yet; the slot
 *             is defined so the first purchase does not need a new mechanism.
 *
 * Resolution order is PREMIUM, then UNLOCKED, then BASE: a character carrying
 * an owned premium skin wears it even if an unlocked skin is also selected.
 *
 * WHY THE TIER IS SEPARATE FROM THE BODY COMPOSITION: a skin id says which
 * SHELF a look comes from, never how the look is built. A base-tier character
 * assembled from Hero Forge parts and a base-tier character on one authored GLB
 * are both `skinId: null` here. Keep it that way; the two systems compose.
 *
 * SERVER IS THE ONLY AUTHORITY. {@link authorizeBodySkin} is pure and runs on
 * both sides, but the client's answer is for PAINTING THE PICKER (grey out what
 * cannot be worn). What a character actually wears is whatever the server
 * authorized and published on the entity; a client that lies about its level or
 * its entitlements changes nothing for anyone else, and is corrected on its own
 * next full snapshot.
 */

import type { PlayerClass } from '../types';

/** The shelf a look comes from. `base` is the absence of a skin selection. */
export type AppearanceTier = 'base' | 'unlocked' | 'premium';

/**
 * The level a character must reach for the UNLOCKED tier.
 *
 * 99 is the realm cap, not an arbitrary number: infernal, crypticrealm, arcane
 * and dominion all declare `maxLevel: 99` (src/sim/realms/content/*.ts), so this
 * reads as "at the cap" on every realm that offers the tier. A realm with a
 * lower cap (classic is 80) simply never satisfies it, which is correct: the
 * tier is not offered there.
 */
export const UNLOCKED_SKIN_LEVEL = 99;

export interface BodySkinDef {
  /** Stable id, persisted on the character and never renamed. */
  readonly id: string;
  /** Which shelf. `base` is never a def: base is the absence of a selection. */
  readonly tier: Exclude<AppearanceTier, 'base'>;
  /** i18n key suffix under `charcreate.bodySkins.<key>` for name and blurb. */
  readonly i18nKey: string;
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
  i18nKey: 'heavenlyHost',
  bodies: {
    // The winged gold-and-white figure the operator singled out.
    warrior: '/cr-realms/infernal/realm_infernal_hero_heaven_warrior.glb',
    rogue: '/cr-realms/infernal/realm_infernal_hero_heaven_rogue.glb',
    paladin: '/cr-realms/infernal/realm_infernal_hero_heaven_paladin.glb',
  },
};

/**
 * Famous Heroes: the PAID shelf, defined empty on purpose.
 *
 * The operator likes the concept and nothing is sold yet, so this ships with no
 * bodies: the picker renders the family as a locked, priced row and the
 * authorization path is already the real one. Adding the first purchasable hero
 * is a `bodies` entry plus art, not a new mechanism. The entitlement id is the
 * account-level flag the settlement callback writes, mirroring the Eastbrook
 * Homes seam (server/homeowner_entitlement.ts), so the two paid features are
 * granted and audited the same way.
 */
const FAMOUS_HEROES: BodySkinDef = {
  id: 'famous_heroes',
  tier: 'premium',
  i18nKey: 'famousHeroes',
  bodies: {},
  entitlementId: 'skin.famous_heroes',
  priceCr: 500,
};

export const BODY_SKINS: readonly BodySkinDef[] = [HEAVENLY_HOST, FAMOUS_HEROES];

const BY_ID: ReadonlyMap<string, BodySkinDef> = new Map(BODY_SKINS.map((s) => [s.id, s]));

export function bodySkinById(id: string | null | undefined): BodySkinDef | null {
  return (id && BY_ID.get(id)) || null;
}

/**
 * Every asset url claimed by a non-base tier.
 *
 * The base resolution chain skips these. That is the whole un-welding
 * mechanism: a body listed in a tier is BY DEFINITION not a base body, so a
 * published override that still points a class or hero card at one is stepped
 * over rather than obeyed, and the card falls through to its own class body.
 */
const TIERED_BODY_URLS: ReadonlySet<string> = new Set(
  BODY_SKINS.flatMap((skin) => Object.values(skin.bodies)),
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
 * order is ignored so a client cannot promote a skin by listing it first.
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
    if (!best || (skin.tier === 'premium' && best.tier !== 'premium')) best = skin;
  }
  if (!best) return denied ? { ...BASE, denied } : BASE;
  return { skinId: best.id, tier: best.tier };
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
 * a heaven-tier body for hunter, priest, shaman, mage, warlock and druid.
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
