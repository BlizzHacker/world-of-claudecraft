// Portrait chip — a class-framed 2D headshot of a character, rendered from the
// real 3D model (src/render/characters/portrait.ts). Used in the character
// list, the create screen, the in-game profile, and the inspect-player window.
//
// Renders an HTML string (both call sites build their UI via innerHTML), then
// hydrates: while the character GLBs are still preloading the chip shows the
// class crest as a placeholder and upgrades to the real portrait once ready.

import {
  onPortraitsReady,
  type PortraitFraming,
  playerPortraitDataUrl,
  portraitsReady,
  visualPortraitDataUrl,
} from '../render/characters/portrait';
import { infernalCharacterSelection } from '../sim/realms/infernal_classes';
import type { PlayerClass } from '../sim/types';
import { firstRealmVisualOverride } from './cryptic/realm_visual_overrides';
import { esc } from './esc';
import { t } from './i18n';
import { iconDataUrl } from './icons';

export type PortraitVariant = 'sm' | 'md' | 'lg';

export interface PortraitChipOpts {
  /** Resolved body to portray. Falls back to the class model when absent. */
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
 * display name, then the base class, and the winning body's GLB url maps to
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
      ? [`hero:${selection.id}`, `hero:${selection.name}`, `class:${cls}`]
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
    visualKey,
    imageUrl,
  } = opts;
  // A resolved realm body wins over the class default: the class portrait is
  // always the KayKit model, which is not who the player is looking at.
  const portrait = visualKey
    ? (visualPortraitDataUrl(visualKey, skin, framing) ?? playerPortraitDataUrl(cls, skin, framing))
    : playerPortraitDataUrl(cls, skin, framing);
  // A published real-body portrait image beats both; if it 404s the module
  // error listener below reverts the chip to the crest/3D-portrait flow.
  const src = imageUrl ?? portrait ?? crestUrl(cls);
  const external = imageUrl ? ' data-portrait-external="1"' : '';
  const pending = imageUrl || portrait ? '' : ' data-portrait-pending="1"';
  const fallbackCls = imageUrl || portrait ? '' : ' is-fallback';
  const alt = esc(t('character.portraitAlt', { name }));
  const badgeHtml = badge
    ? `<img class="portrait-badge" src="${crestUrl(cls)}" alt="" aria-hidden="true" draggable="false">`
    : '';
  return (
    `<span class="portrait-chip portrait-${variant}${fallbackCls}" data-class="${cls}" data-cls="${cls}" data-skin="${skin}" data-framing="${framing}"${visualKey ? ` data-visual="${visualKey}"` : ''}${external}${pending}>` +
    `<span class="portrait-ring"><img class="portrait-img" src="${esc(src)}" alt="${alt}" draggable="false"></span>` +
    badgeHtml +
    `</span>`
  );
}

/** Swap any still-pending placeholder chips under `root` for the real 3D
 *  portrait. Safe to call repeatedly; a no-op until assets are ready. */
export function hydratePortraits(root: ParentNode = document): void {
  if (!portraitsReady()) return;
  root.querySelectorAll<HTMLElement>('.portrait-chip[data-portrait-pending]').forEach((chip) => {
    const cls = chip.dataset.cls as PlayerClass | undefined;
    if (!cls) return;
    const skin = Number(chip.dataset.skin ?? 0) || 0;
    const framing = (chip.dataset.framing as PortraitFraming | undefined) ?? 'headshot';
    const url = playerPortraitDataUrl(cls, skin, framing);
    if (!url) return;
    const img = chip.querySelector<HTMLImageElement>('.portrait-img');
    if (img) img.src = url;
    chip.classList.remove('is-fallback');
    chip.removeAttribute('data-portrait-pending');
  });
}

// Once the GLBs finish loading, upgrade every placeholder currently on screen.
onPortraitsReady(() => hydratePortraits(document));

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
      const url = visualKey
        ? (visualPortraitDataUrl(visualKey, skin, framing) ??
          playerPortraitDataUrl(cls, skin, framing))
        : playerPortraitDataUrl(cls, skin, framing);
      if (url) {
        img.src = url;
        return;
      }
      img.src = crestUrl(cls);
      chip.classList.add('is-fallback');
      chip.setAttribute('data-portrait-pending', '1');
    },
    true,
  );
}
