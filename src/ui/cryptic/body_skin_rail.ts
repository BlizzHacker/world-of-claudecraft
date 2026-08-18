/**
 * The appearance-tier rail: the row of chips that lets a player see, and where
 * allowed pick, which SHELF their body comes from (src/sim/cosmetics/body_skins.ts).
 *
 * Pure: it builds a view model and a string of HTML and touches no DOM, no
 * network and no globals, so the whole thing is testable and so the creator and
 * the in-world appearance editor can render the identical rail from their own
 * hosts rather than each growing their own copy.
 *
 * THE READING ORDER, which is the operator's own sentence turned into layout:
 * your class body, then the two unlockable FACTION-ALIGNED families (Angelic and
 * Demonic, the two sides of the realm's war), then - set apart, below its own
 * caption - the FACTION-NEUTRAL premium shelf. "Famous Heroes can be separate
 * because some heroes may have no faction or alliance but are neutral"
 * (2026-08-17). The split is driven off BodySkinDef.faction being null, never
 * off the tier and never off a hand-kept list here, so a family added to the
 * catalog lands on the correct shelf without this file being edited.
 *
 * Locked rows are RENDERED, not hidden. A player who cannot yet wear the
 * Heavenly Host should be able to see that it exists and read the one sentence
 * that says how to get it; hiding it turns a goal into a rumour. They are
 * focusable for exactly the same reason (a console player must be able to reach
 * the text) but carry aria-disabled and refuse activation.
 */

import {
  authorizeBodySkin,
  BODY_SKINS,
  type BodySkinDef,
  type BodySkinDenial,
  type BodySkinGrantContext,
  type SkinFaction,
  UNLOCKED_SKIN_LEVEL,
} from '../../sim/cosmetics/body_skins';
import type { PlayerClass } from '../../sim/types';

/** Which of the rail's three bands a row sits in. */
export type BodySkinShelf = 'base' | 'aligned' | 'neutral';

export interface BodySkinRailRow {
  /** null is the BASE row: the class's own body, always available. */
  readonly skinId: string | null;
  readonly tier: 'base' | 'unlocked' | 'premium';
  /** The side this family takes, or null when it takes none. */
  readonly faction: SkinFaction | null;
  /** The band this row is drawn in; derived from the tier and the faction. */
  readonly shelf: BodySkinShelf;
  readonly label: string;
  /** Why this row cannot be picked, or null when it can. */
  readonly lockedBecause: BodySkinDenial | null;
  /** One short sentence under the label: the unlock condition or the price. */
  readonly note: string;
  readonly selected: boolean;
}

export interface BodySkinRailLabels {
  /** Row label for the base tier, e.g. "Class Body". */
  readonly base: string;
  /** Sentence for the base row, e.g. "Your class's own look." */
  readonly baseNote: string;
  /** Display name per skin id, keyed by BodySkinDef.i18nKey. */
  readonly names: Readonly<Record<string, string>>;
  /** "Unlocks at level {level}" with {level} already substituted. */
  readonly lockedLevel: string;
  /** "Purchase with {price} $CR" with {price} already substituted, per skin. */
  readonly lockedPremium: Readonly<Record<string, string>>;
  /** "No {class} body yet" for a family that is missing this class's art. */
  readonly lockedNoArt: string;
  /** Ready-to-wear note, e.g. "Unlocked". */
  readonly available: string;
  /** aria-label for the whole group. */
  readonly groupLabel: string;
  /** Caption over the neutral shelf, e.g. "Neutral - no faction". */
  readonly neutral: string;
}

export interface BodySkinRailOptions {
  readonly cls: PlayerClass;
  /** The SERVER's answer about this character, never a client guess. */
  readonly grants: BodySkinGrantContext;
  readonly selectedSkinId: string | null;
  readonly labels: BodySkinRailLabels;
}

/** Which band a family belongs to. Neutrality is the ONLY thing that separates
 *  a family from the aligned pair - not its price, and not its tier. */
function shelfFor(skin: BodySkinDef): Exclude<BodySkinShelf, 'base'> {
  return skin.faction === null ? 'neutral' : 'aligned';
}

/** The rail's rows: base first, then the aligned families in catalog order,
 *  then the neutral ones. */
export function bodySkinRailRows(opts: BodySkinRailOptions): BodySkinRailRow[] {
  const { cls, grants, selectedSkinId, labels } = opts;
  const rows: BodySkinRailRow[] = [
    {
      skinId: null,
      tier: 'base',
      faction: null,
      shelf: 'base',
      label: labels.base,
      lockedBecause: null,
      note: labels.baseNote,
      selected: selectedSkinId === null,
    },
  ];
  // Two passes rather than one sort: the catalog's own order is meaningful
  // inside a shelf (Angelic before Demonic, the pair the operator named in that
  // order), and a sort would need a comparator that re-encoded it.
  for (const shelf of ['aligned', 'neutral'] as const) {
    for (const skin of BODY_SKINS) {
      if (shelfFor(skin) !== shelf) continue;
      const decision = authorizeBodySkin(skin.id, cls, grants);
      const locked = decision.skinId === null ? (decision.denied ?? 'unknown') : null;
      rows.push({
        skinId: skin.id,
        tier: skin.tier,
        faction: skin.faction,
        shelf,
        label: labels.names[skin.i18nKey] ?? skin.id,
        lockedBecause: locked,
        note: noteFor(locked, skin.i18nKey, labels),
        // A selection that is no longer authorized shows as NOT selected: the
        // world already fell back to the base body, so the rail must agree.
        selected: locked === null && selectedSkinId === skin.id,
      });
    }
  }
  return rows;
}

function noteFor(
  locked: BodySkinDenial | null,
  i18nKey: string,
  labels: BodySkinRailLabels,
): string {
  if (locked === null) return labels.available;
  if (locked === 'level') return labels.lockedLevel;
  if (locked === 'unowned') return labels.lockedPremium[i18nKey] ?? labels.lockedPremium.default;
  if (locked === 'noArt') return labels.lockedNoArt;
  return labels.lockedNoArt;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The rail markup.
 *
 * Chips are 44px-plus tap targets in the stylesheet and carry no hover-only
 * affordance, so the same markup works under a finger and under a D-pad. One
 * roving tabindex for the group (the selected row, or the first) matches the
 * hero roster's arrangement: the rail is ONE tab stop, arrows move inside it.
 * The shelves are presentational wrappers only - every chip stays a direct
 * `.body-skin-chip` match in document order, so the roving-focus wiring in
 * main.ts sees one flat list and needed no change when the neutral shelf was
 * split out.
 */
export function bodySkinRailHtml(
  rows: readonly BodySkinRailRow[],
  labels: BodySkinRailLabels,
): string {
  const focusIndex = Math.max(
    0,
    rows.findIndex((row) => row.selected),
  );
  const chip = (row: BodySkinRailRow, index: number): string => {
    const locked = row.lockedBecause !== null;
    const classes = [
      'body-skin-chip',
      `tier-${row.tier}`,
      row.faction ? `faction-${row.faction}` : 'faction-none',
      row.selected ? 'sel' : '',
      locked ? 'locked' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      `<button type="button" class="${classes}"` +
      ` data-skin-id="${esc(row.skinId ?? '')}" data-tier="${row.tier}"` +
      ` data-shelf="${row.shelf}" data-faction="${esc(row.faction ?? '')}"` +
      (locked ? ` data-locked="${esc(row.lockedBecause as string)}" aria-disabled="true"` : '') +
      ` tabindex="${index === focusIndex ? 0 : -1}"` +
      ` aria-pressed="${row.selected ? 'true' : 'false'}"` +
      ` aria-label="${esc(`${row.label}. ${row.note}`)}" title="${esc(row.note)}">` +
      `<span class="body-skin-chip-label">${esc(row.label)}</span>` +
      `<span class="body-skin-chip-note">${esc(row.note)}</span>` +
      `</button>`
    );
  };
  const bands: string[] = [];
  for (const shelf of ['base', 'aligned', 'neutral'] as const) {
    const chips = rows
      .map((row, index) => (row.shelf === shelf ? chip(row, index) : ''))
      .filter(Boolean)
      .join('');
    if (!chips) continue;
    // Only the neutral shelf is captioned. The base row and the aligned pair
    // read for themselves; "no faction" is the fact a player cannot infer from
    // a chip, and it is the one the operator asked to be explicit.
    const caption =
      shelf === 'neutral'
        ? `<span class="body-skin-shelf-caption">${esc(labels.neutral)}</span>`
        : '';
    const group =
      shelf === 'neutral' ? ` role="group" aria-label="${esc(labels.neutral)}"` : '';
    bands.push(
      `<div class="body-skin-shelf shelf-${shelf}"${group}>${caption}` +
        `<div class="body-skin-shelf-chips">${chips}</div></div>`,
    );
  }
  return `<div class="body-skin-rail" role="group" aria-label="${esc(labels.groupLabel)}">${bands.join('')}</div>`;
}

/** The level sentence with the gate substituted, for callers assembling labels. */
export function unlockLevelSentence(template: string): string {
  return template.replace('{level}', String(UNLOCKED_SKIN_LEVEL));
}
