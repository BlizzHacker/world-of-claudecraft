// Thin DOM painter for the character window (the paperdoll sheet).
//
// The consumer half of the pure-core + thin-painter split: it paints
// #char-window from the structured PaperdollView (char_view.ts) plus the
// HUD-supplied stat / talent / progression fragments, and wires the equip-slot
// unequip / drag / tooltip affordances. It owns no Sim reference and reaches into
// Hud only through its deps.
//
// Two regions stay HUD concerns and are triggered here through callbacks, never
// built in this module: the shared 3D turntable preview (the single WebGL preview
// is borrowed by the skin-event overlay and the player card, so its lifecycle
// stays HUD-owned) and the cosmetic skin picker (its async mech-asset loading +
// preview remounts live with the preview). The pure core stays paperdoll-only; no
// 3D types or RNG cross into it.
//
// Colors live in the extracted stylesheet: item-quality tint comes
// from the shared QUALITY_COLOR map and the empty-slot greys are CSS tokens, so no
// raw hex sits in this painter.

import { audio } from '../game/audio';
import { ITEMS } from '../sim/data';
import type { EquipSlot, ItemDef } from '../sim/types';
import type { IWorld } from '../world_api';
import { STAT_PANELS } from './char_stats_view';
import {
  buildCharacterSheetLayout,
  buildPaperdollView,
  type CharacterSheetTab,
  type PaperdollSlot,
} from './char_view';
import { markDialogRoot } from './dialog_root';
import { classDisplayName, itemDisplayName } from './entity_i18n';
import { dropRequiredLevel, paperdollDropAction } from './equip_drop_core';
import { esc } from './esc';
import { buildGatheringProficiencyRows } from './gathering_view';
import { formatNumber, type TranslationKey, t } from './i18n';
import { iconDataUrl, QUALITY_COLOR } from './icons';
import type { ItemDragState } from './item_drag_state';
import { wornTooltipInstance } from './item_instance_tooltip';
import { itemModelUrl } from './item_model_catalog';
import type { PainterHostPresentation } from './painter_host';
import { hydratePortraits, portraitChipHtml } from './portrait_chip';
import { archetypeImageUrl, professionImageUrl } from './profession_art';
import { qualityGlowShadow } from './quality_glow';
import { tSim } from './sim_i18n';
import type { StatId } from './stat_tooltip';
import { svgIcon } from './ui_icons';
import { renderWindowFrame, type WindowFrameParts } from './window_frame';
import type { WindowFrameDescriptor } from './window_frame_view';
const ARCHETYPE_TITLE_KEYS: Record<string, TranslationKey> = {
  armorcrafting: 'hudChrome.archetypeTitle.armorcrafting',
  weaponcrafting: 'hudChrome.archetypeTitle.weaponcrafting',
  jewelcrafting: 'hudChrome.archetypeTitle.jewelcrafting',
  alchemy: 'hudChrome.archetypeTitle.alchemy',
  engineering: 'hudChrome.archetypeTitle.engineering',
  cooking: 'hudChrome.archetypeTitle.cooking',
  inscription: 'hudChrome.archetypeTitle.inscription',
  enchanting: 'hudChrome.archetypeTitle.enchanting',
  tailoring: 'hudChrome.archetypeTitle.tailoring',
  leatherworking: 'hudChrome.archetypeTitle.leatherworking',
};


// Quality / empty-slot colors as CSS custom properties: the shared
// QUALITY_COLOR map carries the per-quality hex, and these tokens cover the
// unranked item plus the empty-slot label and icon border, so no raw hex lives
// in this painter.
const QUALITY_DEFAULT_COLOR = 'var(--color-quality-default)';
const SLOT_EMPTY_TEXT_COLOR = 'var(--color-slot-empty-text)';
const SLOT_EMPTY_BORDER_COLOR = 'var(--color-slot-empty-border)';

// The ten pair-archetype title keys (issue 1130, pair-named under Professions
// 2.0), one per canonical pair id (see src/sim/professions/archetype.ts
// ARCHETYPE_PAIR_TARGETS and getArchetypeTitle: the title identifier IS the
// pair id). Every player-visible string is a t() key, so this is a literal
// id-to-key table, never a built string.
const ARCHETYPE_PAIR_TITLE_KEYS: Record<string, TranslationKey> = {
  'engineering+alchemy': 'hudChrome.archetypePair.engineering+alchemy',
  'alchemy+cooking': 'hudChrome.archetypePair.alchemy+cooking',
  'cooking+leatherworking': 'hudChrome.archetypePair.cooking+leatherworking',
  'leatherworking+tailoring': 'hudChrome.archetypePair.leatherworking+tailoring',
  'tailoring+inscription': 'hudChrome.archetypePair.tailoring+inscription',
  'inscription+enchanting': 'hudChrome.archetypePair.inscription+enchanting',
  'enchanting+jewelcrafting': 'hudChrome.archetypePair.enchanting+jewelcrafting',
  'jewelcrafting+weaponcrafting': 'hudChrome.archetypePair.jewelcrafting+weaponcrafting',
  'weaponcrafting+armorcrafting': 'hudChrome.archetypePair.weaponcrafting+armorcrafting',
  'armorcrafting+engineering': 'hudChrome.archetypePair.armorcrafting+engineering',
};

// The ten per-craft display-name keys, one per craft id on the ring (see
// src/sim/content/professions.ts CRAFT_RING). Used wherever a CRAFT (not a
// title) is meant: the hobby line, skill rows, section headers, combo labels.
const CRAFT_NAME_KEYS: Record<string, TranslationKey> = {
  armorcrafting: 'hudChrome.craftName.armorcrafting',
  weaponcrafting: 'hudChrome.craftName.weaponcrafting',
  jewelcrafting: 'hudChrome.craftName.jewelcrafting',
  alchemy: 'hudChrome.craftName.alchemy',
  engineering: 'hudChrome.craftName.engineering',
  cooking: 'hudChrome.craftName.cooking',
  inscription: 'hudChrome.craftName.inscription',
  enchanting: 'hudChrome.craftName.enchanting',
  tailoring: 'hudChrome.craftName.tailoring',
  leatherworking: 'hudChrome.craftName.leatherworking',
};

/** Localized text for the granted pair-archetype title (the input is the
 *  canonical pair id from IWorld `archetypeTitle`), or the "no title yet" copy
 *  when the player has not completed the zone-1 acceptance quest (or the id is
 *  somehow unrecognized). Exported for the view-model test. */
export function archetypeTitleText(pairId: string | null): string {
  const key = pairId !== null ? ARCHETYPE_PAIR_TITLE_KEYS[pairId] : undefined;
  return t(key ?? 'hudChrome.archetypeTitle.none');
}

/** Localized display name for one craft on the ring, or the same "none" copy
 *  for null/unrecognized ids. Exported for the crafting window, identity card,
 *  and quest dialog (every surface that names a CRAFT rather than a title). */
export function craftNameText(craftId: string | null): string {
  const key = craftId !== null ? CRAFT_NAME_KEYS[craftId] : undefined;
  return t(key ?? 'hudChrome.archetypeTitle.none');
}

export function hobbyCraftText(craftId: string | null): string {
  // Issue 1294: the hobby row names the CRAFT, not the archetype title.
  return craftNameText(craftId);
}

const PRIMARY_STATS: readonly StatId[] = ['str', 'agi', 'sta', 'int', 'spi'];
const COMBAT_STATS: readonly StatId[] = [
  'attackPower',
  'dps',
  'critChance',
  'spellPower',
  'critRating',
  'hasteRating',
];
const DEFENSE_STATS: readonly StatId[] = ['armor', 'dodge'];

/**
 * Hud-supplied glue. Composes the shared PainterHostPresentation bag
 * (icon/tooltip) and adds the character-sheet surface: world reads, the localized
 * slot name, the HUD-built stat / talent / progression fragments, the unequip +
 * drag plumbing (the bags drop target reads HUD's drag slot), focus capture for
 * WCAG focus-return, and the two HUD-owned render regions (3D preview + skin
 * picker) invoked by callback.
 */
export interface CharWindowDeps extends PainterHostPresentation {
  root(): HTMLElement;
  world(): IWorld;
  closeOthers(): void;
  hideTooltip(): void;
  captureFocus(): HTMLElement | null;
  restoreFocus(target: HTMLElement | null): void;
  slotName(slot: EquipSlot): string;
  statCellHtml(stat: StatId): string;
  statTooltipHtml(stat: StatId): string;
  talentSummaryHtml(): string;
  progressionHtml(level: number): string;
  /** Remove the equipped piece in `slot` to bags and repaint bags + the sheet. */
  unequip(slot: EquipSlot): void;
  /** Stage a drag-to-unequip: record the slot HUD-side and reveal the bags drop. */
  beginUnequipDrag(slot: EquipSlot): void;
  /** End a drag-to-unequip: clear the HUD slot and the bags drop-target hint. */
  endUnequipDrag(): void;
  /** Mount the shared 3D turntable into the model panel (HUD-owned lifecycle). */
  renderPreview(): void;
  /** Mount a lazily-loaded 3D item turntable for the selected paperdoll piece. */
  renderItemPreview?(item: ItemDef | null): void;
  /** Release the item turntable's WebGL context when the character window closes. */
  disposeItemPreview?(): void;
  /** Paint the cosmetic skin picker into the skin row (HUD-owned cosmetics). */
  renderSkinPicker(): void;
  openPlayerCard(): void;
  openPrestige(): void;
  /** Open the Book of Deeds (the active-title line's button). */
  openDeeds(): void;
  /** The shared in-flight bag-item drag (published by the bags grid). The paperdoll
   *  sockets read it during dragover, where the DataTransfer payload is unreadable. */
  dragState: ItemDragState;
  /** Repaint the bags grid after a drop equipped a piece out of it. */
  renderBags(): void;
  /** Refusal toast for a drop the socket will not take. */
  showError(text: string): void;
}

// Maps each gathering profession id to its hud_chrome display-name key (issue
// 1124). String-keyed like the sibling professions_window.ts GATHERING_NAME_KEYS
// (and this file's CRAFT_NAME_KEYS): an id with no key here renders no row
// (fishing landed with Professions 2.0).
const GATHERING_PROFESSION_LABEL_KEY: Record<string, TranslationKey> = {
  mining: 'hudChrome.gathering.mining',
  logging: 'hudChrome.gathering.logging',
  herbalism: 'hudChrome.gathering.herbalism',
  fishing: 'hudChrome.gathering.fishing',
};

const SHARE_GLYPH =
  '<svg class="pc-share-ico" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M18 16.1a3 3 0 0 0-2.3 1.1l-6.7-3.9a3 3 0 0 0 0-2.6l6.7-3.9A3 3 0 1 0 15 4l-6.7 3.9a3 3 0 1 0 0 8.2L15 20a3 3 0 1 0 3-3.9z"/></svg>';

// The character sheet is a closable, footer-less frame: the paperdoll + stats
// two-pane, the class identity strip, and the share row all render as sections of
// one scrollable body. The title reuses the existing "Character" action label and
// the close reuses the returnToGame key (no new i18n keys). The frame IS the dialog
// (role + aria-labelledby on the inner mount), so the module no longer marks the
// shared #char-window root as a dialog.
const CHAR_FRAME: WindowFrameDescriptor = {
  id: 'char-window',
  titleKey: 'hud.keybinds.actions.char',
  closeLabelKey: 'hud.options.returnToGame',
};

export class CharWindow {
  /**
   * Stamp the shared window frame cold at first open, then reuse it. The frame
   * mounts on an INNER container (never on the shared #char-window root), so the
   * root stays a pristine `.window.panel`: the id-scoped viewport clamp, the
   * resize grip (window_resize.ts targets the root), and the mobile inset rules
   * keep matching it. An intact mounted frame (its body present) is the reuse
   * marker; only the body repaints per render.
   */
  private ensureFrame(el: HTMLElement): WindowFrameParts {
    const mounted = el.querySelector<HTMLElement>(':scope > .window-frame');
    const body = mounted?.querySelector<HTMLElement>('.window-body');
    if (mounted && body) return { root: mounted, body, footer: null, tabButtons: [] };
    const mount = document.createElement('div');
    const parts = renderWindowFrame(mount, CHAR_FRAME, { onClose: () => this.close() });
    el.replaceChildren(mount);
    return parts;
  }
  private openerFocus: HTMLElement | null = null;
  private selectedItemId: string | null = null;
  private activeTab: CharacterSheetTab = 'equipment';

  constructor(private readonly deps: CharWindowDeps) {}

  get isOpen(): boolean {
    return this.deps.root().style.display === 'block';
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
      return;
    }
    this.openerFocus = this.deps.captureFocus();
    this.deps.closeOthers();
    this.render();
    this.deps.root().style.display = 'block';
  }

  close(): void {
    const el = this.deps.root();
    if (el.style.display !== 'block') return;
    el.style.display = 'none';
    this.deps.hideTooltip();
    this.deps.disposeItemPreview?.();
    this.selectedItemId = null;
    this.deps.restoreFocus(this.openerFocus);
    this.openerFocus = null;
  }

  renderIfOpen(): void {
    if (this.isOpen) this.render();
  }

  render(): void {
    const el = this.deps.root();
    const world = this.deps.world();
    const p = world.player;
    const className = classDisplayName(world.cfg.playerClass);
    const level = formatNumber(p.level, { maximumFractionDigits: 0 });
    // The shared frame carries the dialog role + aria-labelledby (its "Character"
    // title); the body repaints below. The close routes to this.close() via the
    // frame's onClose, wired once when the frame is stamped cold.
    const { body } = this.ensureFrame(el);
    const selectedItem = this.selectedItemId ? (ITEMS[this.selectedItemId] ?? null) : null;
    const selectedModelUrl = selectedItem ? itemModelUrl(selectedItem) : null;
    const archetypeTitle = archetypeTitleText(world.archetypeTitle);
    const archetypeCrestUrl = archetypeImageUrl(world.archetypeTitle);
    const archetypeCrest = archetypeCrestUrl
      ? `<img class="char-archetype-title-crest" src="${esc(archetypeCrestUrl)}" alt="" draggable="false">`
      : '';
    const hobbyCraft = hobbyCraftText(world.hobbyCraft);
    const hobbyRow =
      world.hobbyCraft !== null
        ? `<span class="panel-subtitle char-hobby-craft">${esc(t('hudChrome.archetypeTitle.hobbyLabel'))}: ${esc(hobbyCraft)}</span>`
        : '';
    // The class identity strip (portrait + name + level/class/archetype/hobby): the
    // former sticky .panel-title header content, now the first body row under the
    // frame titlebar (the close moved to the frame).
    const layout = buildCharacterSheetLayout(
      this.activeTab,
      world.inventory ?? [],
      ITEMS,
      world.bagCapacity ?? 16,
    );
    const tabs = `<div class="char-sheet-tabs" role="tablist" aria-label="${esc(t('guide.stats.sheetHeading'))}">
      <button type="button" role="tab" class="char-sheet-tab${this.activeTab === 'equipment' ? ' is-active' : ''}" aria-selected="${this.activeTab === 'equipment'}" data-char-tab="equipment">${esc(t('hud.keybinds.actions.char'))}</button>
      <button type="button" role="tab" class="char-sheet-tab${this.activeTab === 'overview' ? ' is-active' : ''}" aria-selected="${this.activeTab === 'overview'}" data-char-tab="overview">${esc(t('guide.nav.overview'))}</button>
    </div>`;
    const currency = this.deps.moneyHtml?.(world.copper) ?? '';
    const identity = `<div class="char-identity">${portraitChipHtml({ cls: world.cfg.playerClass, skin: p.skin ?? 0, name: p.name, variant: 'md' })}<span class="char-title-text" id="char-title">${esc(p.name)} <span class="panel-subtitle">${esc(t('itemUi.equipment.levelClass', { level, className }))}</span><span class="panel-subtitle char-archetype-title">${esc(t('hudChrome.archetypeTitle.label'))}: ${esc(archetypeTitle)}</span>${hobbyRow}<span class="panel-subtitle char-honor-balance">${esc(t('hudChrome.warfare.balance', { amount: formatNumber(world.honor, { maximumFractionDigits: 0 }) }))}</span></span>${currency ? `<span class="char-sheet-currency">${currency}</span>` : ''}</div>`;
    const paperdoll = `<div class="paperdoll">
      <div class="equip-col" id="equip-col-left"></div>
      <div class="char-model-panel">
        <div id="char-model-preview" class="char-model-preview" role="img" aria-label="${esc(t('hudChrome.character.modelPreview'))}"></div>
        <div id="char-skin-row" class="skin-row char-skin-row" role="list" aria-label="${esc(t('auth.appearance'))}"></div>
      </div>
      <div class="equip-col equip-col-right" id="equip-col-right"></div>
    </div>`;
    const itemViewer =
      selectedItem && selectedModelUrl
        ? `<section class="char-item-viewer" aria-labelledby="char-item-viewer-title">
        <div class="char-item-viewer-title" id="char-item-viewer-title">${esc(t('guide.models.title'))}: ${esc(itemDisplayName(selectedItem))}</div>
        <div id="char-item-model-preview" class="char-item-model-preview" role="img" tabindex="0" aria-label="${esc(t('guide.viewer.canvasLabel', { name: itemDisplayName(selectedItem) }))}"></div>
        <div id="char-item-model-status" class="char-item-model-status" role="status" aria-live="polite">${esc(t('guide.viewer.loading'))}</div>
        <div class="char-item-viewer-hint">${esc(t('guide.viewer.dragHint'))}</div>
      </section>`
        : '';
    const stats = this.statsSectionsHtml();
    const extras = `${this.deps.talentSummaryHtml()}${this.deps.progressionHtml(p.level)}${this.gatheringHtml(world)}`;
    let html = `${identity}${tabs}`;
    if (this.activeTab === 'overview') {
      html += `<div class="char-sheet char-sheet-overview">
        <section class="char-sheet-overview-model" aria-label="${esc(t('hud.keybinds.actions.char'))}">${paperdoll}</section>
        <section class="char-sheet-bags" aria-labelledby="char-sheet-bags-title"><div class="char-sheet-section-title" id="char-sheet-bags-title">${esc(t('itemUi.bags.title'))}<span class="char-sheet-bag-count">${formatNumber(world.inventory?.length ?? 0, { maximumFractionDigits: 0 })} / ${formatNumber(layout.bagCapacity, { maximumFractionDigits: 0 })}</span></div>${this.bagGridHtml(layout)}</section>
        <aside class="char-sheet-sidebar">${stats}${extras}</aside>
      </div>`;
    } else {
      html += `<div class="char-sheet char-sheet-equipment">
        <section class="char-sheet-paperdoll">${paperdoll}${itemViewer}<section class="char-sheet-bags" aria-labelledby="char-sheet-equipment-bags-title"><div class="char-sheet-section-title" id="char-sheet-equipment-bags-title">${esc(t('itemUi.bags.title'))}<span class="char-sheet-bag-count">${formatNumber(world.inventory?.length ?? 0, { maximumFractionDigits: 0 })} / ${formatNumber(layout.bagCapacity, { maximumFractionDigits: 0 })}</span></div>${this.bagGridHtml(layout)}</section></section>
        <aside class="char-sheet-sidebar">${stats}${extras}</aside>
      </div>`;
    }
    html += `<div class="pc-share-row"><button type="button" class="btn pc-share-btn" data-act="share-card">${SHARE_GLYPH}<span>${esc(t('playerCard.shareButton'))}</span></button></div>`;
    body.innerHTML = html;
    hydratePortraits(body);
    body
      .querySelector('[data-act="prestige"]')
      ?.addEventListener('click', () => this.deps.openPrestige());
    for (const tab of body.querySelectorAll<HTMLButtonElement>('[data-char-tab]')) {
      tab.addEventListener('click', () => {
        const next = tab.dataset.charTab;
        if (next !== 'equipment' && next !== 'overview') return;
        this.activeTab = next;
        this.render();
      });
    }
    body.querySelector('[data-act="share-card"]')?.addEventListener('click', () => {
      audio.click();
      this.deps.openPlayerCard();
    });
    const view = buildPaperdollView(world.equipment, ITEMS);
    const leftCol = el.querySelector('#equip-col-left');
    const rightCol = el.querySelector('#equip-col-right');
    for (const cell of view.left) leftCol?.appendChild(this.buildSlotRow(cell));
    for (const cell of view.right) rightCol?.appendChild(this.buildSlotRow(cell));

    for (const cell of el.querySelectorAll<HTMLElement>('.stat-panels [data-stat]')) {
      const stat = cell.dataset.stat as StatId;
      // Resolve the tooltip lazily, on show, so the breakdown reflects the
      // player's current stats at the moment they hover, not at render time.
      this.deps.attachTooltip(cell, () => this.deps.statTooltipHtml(stat));
    }

    this.deps.renderPreview();
    this.deps.renderSkinPicker();
    this.deps.renderItemPreview?.(
      this.activeTab === 'equipment' && selectedItem && selectedModelUrl ? selectedItem : null,
    );
  }

  /** The reference sheet keeps attributes, combat and defense as independently
   * bounded groups. The stat tooltip painter still owns the value/breakdown; this
   * method only provides the stable section grammar used by both tabs. */
  private statsSectionsHtml(): string {
    const groups: readonly [string, readonly StatId[]][] = [
      [t('guide.stats.primaryHeading'), PRIMARY_STATS],
      [t('hudChrome.options.sec.combatTooltips'), COMBAT_STATS],
      [t('itemUi.stats.armor'), DEFENSE_STATS],
    ];
    return groups
      .map(
        ([title, stats]) =>
          `<section class="char-sheet-section char-sheet-stat-section"><h3 class="char-sheet-section-title">${esc(title)}</h3><div class="char-stats">${stats.map((stat) => this.deps.statCellHtml(stat)).join('')}</div></section>`,
      )
      .join('');
  }

  /** Paints the compact overview bag tray. The actual bag window remains the
   * interactive inventory surface; these cells are a stable, read-only summary
   * that makes the character sheet match the equipment/overview reference. */
  private bagGridHtml(layout: ReturnType<typeof buildCharacterSheetLayout>): string {
    const cells = layout.bagCells
      .map((cell) => {
        if (!cell.item) {
          return `<div class="char-sheet-bag-cell is-empty" aria-hidden="true"></div>`;
        }
        const name = itemDisplayName(cell.item);
        const count =
          cell.count > 1
            ? ` <span class="char-sheet-bag-count">${esc(t('itemUi.bags.stackCount', { count: formatNumber(cell.count, { maximumFractionDigits: 0 }) }))}</span>`
            : '';
        return `<div class="char-sheet-bag-cell" role="img" aria-label="${esc(t('itemUi.bags.itemAria', { item: name, count: formatNumber(cell.count, { maximumFractionDigits: 0 }) }))}">${this.deps.itemIcon(cell.item)}${count}</div>`;
      })
      .join('');
    return `<div class="char-sheet-bag-grid">${cells}</div>`;
  }

  // The "Gathering" section (issue 1124): one row per gathering profession, showing
  // the viewer's own proficiency points (IWorldProfessions#professionsState).
  // Data comes from the pure gathering_view.ts core; this painter only formats it.
  private gatheringHtml(world: IWorld): string {
    const rows = buildGatheringProficiencyRows(world);
    const items = rows
      .map((r) => {
        const key = GATHERING_PROFESSION_LABEL_KEY[r.professionId];
        if (key === undefined) return '';
        const imageUrl = professionImageUrl(`gather_${r.professionId}`);
        const icon = imageUrl
          ? `<img class="char-gather-icon" src="${esc(imageUrl)}" alt="" draggable="false">`
          : '';
        return `<span class="char-gather-row">${icon}<span>${esc(t(key))}: <b>${formatNumber(r.displayValue, { maximumFractionDigits: 0 })}</b></span></span>`;
      })
      .join('');
    return `<div class="char-progression"><div class="cp-title">${esc(t('hudChrome.gathering.title'))}</div><div class="char-stats cp-stats">${items}</div></div>`;
  }

  private buildSlotRow(cell: PaperdollSlot): HTMLElement {
    const { slot, item } = cell;
    const row = document.createElement('div');
    row.className = 'equip-slot';
    // Stable id + programmatic focusability so the corner-x rebuild can hand focus
    // back to this slot (the rebuilt row may be empty, with no x to focus).
    row.id = `equip-slot-${slot}`;
    row.tabIndex = -1;
    // The socket's equipment key, read by BOTH drop arms: the HTML5 drop below and
    // the touch hit test (item_drop_hit_test.ts), which has no drop event to read.
    row.dataset.equipSlot = slot;
    this.bindEquipDropTarget(row, slot);
    const qColor = !item
      ? SLOT_EMPTY_TEXT_COLOR
      : (QUALITY_COLOR[item.quality ?? 'common'] ?? QUALITY_DEFAULT_COLOR);
    const icon = item
      ? this.deps.itemIcon(item)
      : `<img class="item-icon" style="border-color:${SLOT_EMPTY_BORDER_COLOR}" src="${iconDataUrl('item', 'slot_empty')}" alt="" draggable="false">`;
    row.innerHTML = `${icon}
        <div><div class="slot-name">${esc(this.deps.slotName(slot))}</div><div class="slot-item" style="color:${qColor}">${item ? esc(itemDisplayName(item)) : esc(t('itemUi.equipment.empty'))}</div></div>`;
    if (item) {
      const modelUrl = itemModelUrl(item);
      if (modelUrl) {
        row.classList.add('equip-slot-3d');
        row.setAttribute('role', 'button');
        row.tabIndex = 0;
        row.setAttribute('aria-label', t('guide.viewer.view3d', { name: itemDisplayName(item) }));
        row.addEventListener('click', () => {
          this.selectedItemId = item.id;
          this.render();
          document.getElementById('char-item-model-preview')?.focus();
        });
        row.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          this.selectedItemId = item.id;
          this.render();
          document.getElementById('char-item-model-preview')?.focus();
        });
      }
      this.deps.attachTooltip(
        row,
        () =>
          `${this.deps.itemTooltip(item)}<div class="tt-sub">${esc(t('hudChrome.paperdoll.unequipHint'))}</div>`,
      );
      // Corner x: a styled glyph control (not an in-game icon), revealed on
      // hover/focus and always shown on touch where right-click is unavailable.
      const unequip = document.createElement('button');
      unequip.type = 'button';
      unequip.className = 'equip-unequip-btn';
      unequip.textContent = '×';
      unequip.setAttribute(
        'aria-label',
        t('hudChrome.paperdoll.unequipAria', { item: itemDisplayName(item) }),
      );
      unequip.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.doUnequip(slot, true);
      });
      row.appendChild(unequip);
      // Right-click the slot (classic-MMO muscle memory; matches the bags grid).
      row.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        this.doUnequip(slot, false);
      });
      // Drag the piece out onto the bags window to unequip it.
      row.draggable = true;
      row.addEventListener('dragstart', (e) => {
        this.deps.beginUnequipDrag(slot);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        this.deps.hideTooltip();
      });
      row.addEventListener('dragend', () => this.deps.endUnequipDrag());
    } else {
      // Empty slot: still swallow the native menu so right-click feels consistent.
      row.addEventListener('contextmenu', (ev) => ev.preventDefault());
    }
    return row;
  }

  /** Equip a bag stack into the exact socket it was dropped on (both drag arms land
   *  here). The refusals are pre-empted client-side with the sim's OWN wording
   *  (tSim), so no doomed command is sent and the toast reads identically to the
   *  authoritative one the server would emit; the sim re-validates regardless. */
  dropOnEquipSlot(itemId: string, slot: EquipSlot): void {
    const item = ITEMS[itemId];
    if (!item) return;
    const world = this.deps.world();
    switch (
      paperdollDropAction(item, slot, world.cfg.playerClass, world.player.level, world.talentSpec)
    ) {
      case 'blockedSlot':
        this.deps.showError(tSim('error.wrongEquipSlot'));
        return;
      case 'blockedClass':
        this.deps.showError(tSim('error.cannotEquip'));
        return;
      case 'blockedLevel':
        this.deps.showError(
          tSim('error.equipLevel', {
            level: formatNumber(dropRequiredLevel(item), { maximumFractionDigits: 0 }),
          }),
        );
        return;
      case 'equip':
        world.equipItemToSlot(itemId, slot);
        audio.click();
        this.deps.hideTooltip();
        this.deps.renderBags();
        this.renderIfOpen();
    }
  }

  /** Light up every socket that would ACCEPT the stack in flight (null clears them).
   *  Only the accepting sockets light: the feedback is the same pure decision the
   *  drop itself runs, so a lit socket always takes the piece. */
  markDropTargets(itemId: string | null): void {
    const el = this.deps.root();
    const world = this.deps.world();
    const item = itemId ? ITEMS[itemId] : undefined;
    for (const row of el.querySelectorAll<HTMLElement>('.equip-slot[data-equip-slot]')) {
      const slot = row.dataset.equipSlot as EquipSlot | undefined;
      const accepts =
        !!item &&
        !!slot &&
        paperdollDropAction(
          item,
          slot,
          world.cfg.playerClass,
          world.player.level,
          world.talentSpec,
        ) === 'equip';
      row.classList.toggle('drop-target', accepts);
    }
  }

  // A paperdoll socket as a drop target for a bag stack: dragover accepts only what
  // the socket would really take (so the cursor never promises an equip the drop
  // then refuses), and the drop routes into the one shared dropOnEquipSlot.
  private bindEquipDropTarget(row: HTMLElement, slot: EquipSlot): void {
    row.addEventListener('dragover', (e) => {
      const drag = this.deps.dragState.get();
      if (!drag) return;
      const item = ITEMS[drag.itemId];
      const world = this.deps.world();
      if (
        !item ||
        paperdollDropAction(
          item,
          slot,
          world.cfg.playerClass,
          world.player.level,
          world.talentSpec,
        ) !== 'equip'
      )
        return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    });
    row.addEventListener('drop', (e) => {
      const drag = this.deps.dragState.get();
      if (!drag) return;
      e.preventDefault();
      this.deps.dragState.end();
      this.markDropTargets(null);
      this.dropOnEquipSlot(drag.itemId, slot);
    });
  }

  // `keepFocus` hands focus back to the now-empty slot row after the unequip
  // rebuilds the paperdoll (the innerHTML rebuild otherwise drops focus to
  // <body>); the keyboard/touch x path needs this, right-click and drag do not.
  private doUnequip(slot: EquipSlot, keepFocus: boolean): void {
    this.deps.unequip(slot);
    if (keepFocus) {
      const rebuilt = document.getElementById(`equip-slot-${slot}`);
      this.deps.restoreFocus(rebuilt instanceof HTMLElement ? rebuilt : null);
    }
  }
}
