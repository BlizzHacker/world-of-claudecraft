// Portrait chip — a class-framed 2D headshot of a character, rendered from the
// real 3D model (src/render/characters/portrait.ts). Used in the character
// list, the create screen, the in-game profile, and the inspect-player window.
//
// Renders an HTML string (both call sites build their UI via innerHTML), then
// hydrates: while the character GLBs are still preloading the chip shows the
// class crest as a placeholder and upgrades to the real portrait once ready.

import { modularVisualKey } from '../render/characters/manifest';
import type { ModularLook } from '../render/characters/modular';
import {
  modularPortraitDataUrl,
  onPortraitsReady,
  onPortraitUpdate,
  type PortraitFraming,
  playerPortraitDataUrl,
  portraitsReady,
  requestVisualPortrait,
  visualPortraitDataUrl,
} from '../render/characters/portrait';
import {
  infernalCharacterSelection,
  infernalHeroOverrideKeys,
} from '../sim/realms/infernal_classes';
import type { PlayerClass, SkinCatalog } from '../sim/types';
import { firstRealmVisualOverride } from './cryptic/realm_visual_overrides';
import { esc } from './esc';
import { t } from './i18n';
import { iconDataUrl } from './icons';

// This module is the UI's sanctioned crossing into the portrait renderer, so
// the look resolver is surfaced here too: painters that stay out of the render
// layer (char_window's paperdoll boundary test) get it without their own
// render import.
export { modularLookFor } from '../render/characters';

export type PortraitVariant = 'sm' | 'md' | 'lg';

export interface PortraitChipOpts {
  /** Resolved realm body to portray. Falls back to the class model when absent. */
  visualKey?: string;
  cls: PlayerClass;
  skin?: number;
  /** Character name — used for the accessible label. */
  name: string;
  variant?: PortraitVariant;
  /** Show the small class-crest badge in the corner (default true). */
  badge?: boolean;
  /** Which slice of the model to show (default 'headshot'). Pass 'body' for a
   *  normal 3/4 figure framing where the chip is shown large, e.g. the
   *  Inspect window, so it does not read as an over-zoomed helmet crop. */
  framing?: PortraitFraming;
  /** Omit the potentially large data URL from generated HTML and let
   *  hydratePortraits assign it after the subtree is mounted. Useful for dense
   *  repeated grids where embedding one cached portrait dozens of times would
   *  create multi-megabyte innerHTML strings. Assets must already be ready. */
  deferSource?: boolean;
  /** Draw this chip as the COMPOSED character rather than the stock art for
   *  `cls`. Only the local player has an authored look (it is presentation
   *  state and is not on the wire), so this is set on the player's own chips,
   *  their Character sheet, and left off for everyone else's. */
  look?: ModularLook | null;
  /** Which skin catalog `skin` indexes. Under `'mech'` the chip draws the
   *  Combat Mech body in that chroma, `skin` is a chroma index there, not a
   *  class-atlas index, and any `look` is ignored (the world shows the mech,
   *  so the chip must too). */
  catalog?: SkinCatalog;
  /** A ready-made portrait image URL — the real-body png published beside a
   *  hero GLB (see {@link characterPortraitUrl}). Wins over the crest and the
   *  rendered 3D class/visual portraits; a failed load reverts to that
   *  pre-existing flow via the module-level error listener below. */
  imageUrl?: string | null;
}

/** Portrait render published next to a body GLB (same basename, .png) — the
 *  create-screen convention (realmHeroPortraitUrl in main.ts delegates here). */
export function portraitUrlForBodyAsset(assetUrl: string | null | undefined): string | null {
  if (!assetUrl || !/\.glb$/i.test(assetUrl)) return null;
  return assetUrl.replace(/\.glb$/i, '.png');
}

/**
 * The real-body portrait png for a character, or null when it has no
 * reassigned realm body. Resolution mirrors overrideVisualKeyForEntity
 * (render/characters/manifest.ts) and the create screen's infernalClassChoice:
 * the realm's operator overrides are consulted for the hero id, then the hero
 * display name, then — for a hidden hero variant — its canonical selection's
 * id and name, then the base class, and the winning body's GLB url maps to
 * the portrait png published beside it. Never loads a GLB — callers keep their
 * crest/class-portrait fallback for a missing override or a 404ing png.
 * `realm` must be the id the overrides were installed under (the active realm
 * id: realmContentForCharacterUi().id at char-select, resolveActiveRealmId()
 * in world).
 */
export function characterPortraitUrl(
  realm: string | null | undefined,
  realmHeroId: string | null | undefined,
  cls: PlayerClass,
): string | null {
  if (!realm) return null;
  const selection = infernalCharacterSelection(realm, realmHeroId ?? null, cls);
  const override = firstRealmVisualOverride(
    realm,
    selection
      ? [...infernalHeroOverrideKeys(realm, selection), `class:${cls}`]
      : [`class:${cls}`],
  );
  return override ? portraitUrlForBodyAsset(override.assetUrl) : null;
}

/** Class crest data URL — the placeholder before the 3D portrait is ready and
 *  the small class badge overlaid on the portrait. */
function crestUrl(cls: PlayerClass): string {
  return iconDataUrl('crest', `class_${cls}`, 96);
}

/** Build a portrait-chip HTML string. Call {@link hydratePortraits} on the
 *  container afterwards (or rely on the global ready hook to upgrade it). */
export function portraitChipHtml(opts: PortraitChipOpts): string {
  const {
    cls,
    skin = 0,
    name,
    variant = 'sm',
    badge = true,
    framing = 'headshot',
    deferSource = false,
    look = null,
    catalog = 'class',
    visualKey,
    imageUrl,
  } = opts;
  const mech = catalog === 'mech';
  // A composed chip is never `deferSource`: that path re-derives the URL in
  // hydratePortraits from data attributes alone, and a look does not fit in
  // one. It is only used for dense repeated grids of OTHER players anyway.
  // A resolved realm body wins over the class default: the class portrait is
  // always the KayKit model, which is not who the player is looking at.
  const bodyPortrait =
    !mech && !look && visualKey ? visualPortraitDataUrl(visualKey, skin, framing) : null;
  const portrait = mech
    ? visualPortraitDataUrl('player_mech', skin, framing)
    : look
      ? modularPortraitDataUrl(modularVisualKey(cls), look, framing)
      : visualKey
        ? (bodyPortrait ?? playerPortraitDataUrl(cls, skin, framing))
        : deferSource
          ? null
          : playerPortraitDataUrl(cls, skin, framing);
  // A published real-body portrait image beats both; if it 404s the module
  // error listener below reverts the chip to the crest/3D-portrait flow.
  const src = deferSource ? null : (imageUrl ?? portrait ?? crestUrl(cls));
  const source = src ? ` src="${esc(src)}"` : '';
  const external = imageUrl ? ' data-portrait-external="1"' : '';
  // "Pending" covers three cases: no portrait at all (crest placeholder), a
  // deferred source, AND a realm body whose GLB is not resident yet, where
  // `portrait` above silently became the KayKit class rig. Only flagging the
  // first is why a reassigned character kept a stock face for the life of the
  // page — hydratePortraits was never invited to look at it again.
  const needsBody = !mech && !look && !!visualKey && !bodyPortrait;
  const pending =
    !imageUrl && (needsBody || !portrait || deferSource) ? ' data-portrait-pending="1"' : '';
  const fallbackCls = imageUrl || (portrait && !deferSource) ? '' : ' is-fallback';
  const alt = esc(t('character.portraitAlt', { name }));
  const badgeHtml = badge
    ? `<img class="portrait-badge" src="${crestUrl(cls)}" alt="" aria-hidden="true" draggable="false">`
    : '';
  return (
    `<span class="portrait-chip portrait-${variant}${fallbackCls}" data-class="${cls}" data-cls="${cls}" data-skin="${skin}" data-catalog="${catalog}" data-framing="${framing}"${visualKey ? ` data-visual="${visualKey}"` : ''}${external}${pending}>` +
    `<span class="portrait-ring"><img class="portrait-img"${source} alt="${alt}" loading="lazy" decoding="async" draggable="false"></span>` +
    badgeHtml +
    `</span>`
  );
}

/** Paint `url` into a chip and mark it settled. */
function settleChip(chip: HTMLElement, url: string): void {
  const img = chip.querySelector<HTMLImageElement>('.portrait-img');
  if (img) img.src = url;
  chip.classList.remove('is-fallback');
  chip.removeAttribute('data-portrait-pending');
}

/**
 * Swap any still-pending chip under `root` for the real 3D portrait.
 *
 * The chip's own body (`data-visual`) is authoritative — it is the key the WORLD
 * renders that character on. This used to ignore data-visual entirely and always
 * paint `playerPortraitDataUrl(cls)`, so the one function whose whole job was to
 * upgrade a placeholder actively OVERWROTE a correct realm portrait with the
 * KayKit class rig. When the body is not resident the class headshot still shows
 * immediately (no blank chip), but the chip stays pending and the GLB is fetched
 * so the real face lands a moment later. Safe to call repeatedly.
 */
export function hydratePortraits(
  root: ParentNode = document,
  onlyClass?: PlayerClass,
  onlySkin?: number,
): void {
  if (!portraitsReady()) return;
  root
    .querySelectorAll<HTMLElement>(
      '.portrait-chip[data-portrait-pending]:not([data-portrait-external])',
    )
    .forEach((chip) => {
      const cls = chip.dataset.cls as PlayerClass | undefined;
      if (!cls) return;
      const skin = Number(chip.dataset.skin ?? 0) || 0;
      if (onlyClass && (cls !== onlyClass || skin !== onlySkin)) return;
      const framing = (chip.dataset.framing as PortraitFraming | undefined) ?? 'headshot';
      if (chip.dataset.catalog === 'mech') {
        const url = visualPortraitDataUrl('player_mech', skin, framing);
        if (url) settleChip(chip, url);
        return;
      }
      const visualKey = chip.dataset.visual;
      if (visualKey) {
        const body = visualPortraitDataUrl(visualKey, skin, framing);
        if (body) {
          settleChip(chip, body);
          return;
        }
        // Stand the class rig in so the row is not blank, but leave the chip
        // pending: the real body is on its way.
        const stand = playerPortraitDataUrl(cls, skin, framing);
        if (stand) {
          const img = chip.querySelector<HTMLImageElement>('.portrait-img');
          if (img) img.src = stand;
          chip.classList.remove('is-fallback');
        }
        if (chip.dataset.portraitLoading) return;
        chip.dataset.portraitLoading = '1';
        void requestVisualPortrait(visualKey, skin, framing).then((url) => {
          delete chip.dataset.portraitLoading;
          // The chip may have been re-rendered onto a different character while
          // the GLB was in flight; only paint if it still wants this body.
          if (url && chip.isConnected && chip.dataset.visual === visualKey) settleChip(chip, url);
        });
        return;
      }
      const url = playerPortraitDataUrl(cls, skin, framing);
      if (url) settleChip(chip, url);
    });
}

/** Re-arm every body-backed chip under `root` and repaint it. Call after the
 *  operator's overrides change: the chip's `data-visual` may now name a
 *  different GLB, and a settled chip is otherwise never looked at again. */
export function refreshPortraits(root: ParentNode = document): void {
  root
    .querySelectorAll<HTMLElement>('.portrait-chip[data-visual]')
    .forEach((chip) => chip.setAttribute('data-portrait-pending', '1'));
  hydratePortraits(root);
}

// Once the GLBs finish loading, upgrade every placeholder currently on screen.
onPortraitsReady(() => hydratePortraits(document));
onPortraitUpdate((visualKey, skin) => {
  if (!visualKey.startsWith('player_')) return;
  hydratePortraits(document, visualKey.slice('player_'.length) as PlayerClass, skin);
});

// A real-body portrait image (data-portrait-external) that fails to load falls
// back to the pre-existing behavior: the rendered 3D portrait when available,
// else the class crest (upgraded later by hydratePortraits). Image error
// events do not bubble, so listen in the capture phase; one listener covers
// every chip on the page. Guarded so importing this module outside a DOM
// (vitest node env) stays safe.
if (typeof document !== 'undefined') {
  document.addEventListener(
    'error',
    (ev) => {
      const img = ev.target;
      if (!(img instanceof HTMLImageElement) || !img.classList.contains('portrait-img')) return;
      const chip = img.closest<HTMLElement>('.portrait-chip[data-portrait-external]');
      if (!chip) return;
      chip.removeAttribute('data-portrait-external');
      const cls = chip.dataset.cls as PlayerClass | undefined;
      if (!cls) return;
      const skin = Number(chip.dataset.skin ?? 0) || 0;
      const framing = (chip.dataset.framing as PortraitFraming | undefined) ?? 'headshot';
      const visualKey = chip.dataset.visual;
      const url = visualKey ? visualPortraitDataUrl(visualKey, skin, framing) : null;
      if (url) {
        img.src = url;
        return;
      }
      // No resident body: paint the best stand-in we have RIGHT NOW and re-arm
      // the chip so hydratePortraits fetches the real body. This is the live
      // path in practice — no realm publishes the sibling portrait png that
      // characterPortraitUrl points at, so every external chip lands here.
      const stand = playerPortraitDataUrl(cls, skin, framing);
      img.src = stand ?? crestUrl(cls);
      if (!stand) chip.classList.add('is-fallback');
      chip.setAttribute('data-portrait-pending', '1');
      hydratePortraits(chip.parentElement ?? document);
    },
    true,
  );
}
