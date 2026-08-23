/**
 * The in-game body-skin rail on the character sheet: the same three-shelf
 * appearance rail character select shows (pure rows + markup from
 * src/ui/cryptic/body_skin_rail.ts), painted beside the chroma picker row and
 * wired to the live world so a pick swaps the body ON THE FLY.
 *
 * Grants come from IWorldCosmetics.bodySkinGrants(), which is the SERVER's
 * published self verdict online (bodySkinUnlocked / bodySkinDev /
 * entitlements) and the Sim's local meta offline; nothing here derives the
 * gate. Locked rows (level / price / the lockedNoArt art gap) render exactly
 * as character select renders them: reachable, readable, and refusing
 * activation. Picking calls IWorldCosmetics.setBodySkin, whose host
 * re-authorizes before Entity.bodySkinId ever changes.
 *
 * Cold window painter (rebuilt when the character sheet renders; no driver of
 * its own, no layout reads), registered in UI_DOM_MODULES.
 */

import { audio } from '../game/audio';
import type { BodySkinGrantContext } from '../sim/cosmetics/body_skins';
import type { PlayerClass } from '../sim/types';
import { handleKeyboardActivation } from './auth_utils';
import {
  type BodySkinRailLabels,
  bodySkinRailHtml,
  bodySkinRailRows,
  unlockLevelSentence,
} from './cryptic/body_skin_rail';
import { t } from './i18n';
import { rovingTarget } from './roving_index';

/** The narrow world surface this painter reads and acts through; the live
 *  `IWorld` satisfies it structurally, so hud.ts passes its world straight in. */
export interface BodySkinSwapWorld {
  readonly cfg: { readonly playerClass: PlayerClass };
  readonly player: { bodySkinId?: string | null };
  bodySkinGrants(): BodySkinGrantContext;
  setBodySkin(skinId: string | null): void;
}

export interface BodySkinSwapHost {
  readonly world: BodySkinSwapWorld;
  /** Repaint hook after a pick lands (character sheet + frame portrait). */
  refresh(): void;
}

/** The rail's labels, resolved per paint (the shell catalog's bodySkins.*
 *  namespace, the exact keys character select paints with). */
function railLabels(): BodySkinRailLabels {
  return {
    base: t('bodySkins.base'),
    baseNote: t('bodySkins.baseNote'),
    names: {
      heavenlyHost: t('bodySkins.heavenlyHost'),
      demonic: t('bodySkins.demonic'),
      famousHeroes: t('bodySkins.famousHeroes'),
    },
    lockedLevel: unlockLevelSentence(t('bodySkins.lockedLevel')),
    lockedPremium: {
      default: t('bodySkins.lockedPremium').replace('{price}', '500'),
      famousHeroes: t('bodySkins.lockedPremium').replace('{price}', '500'),
    },
    lockedNoArt: t('bodySkins.lockedNoArt'),
    available: t('bodySkins.available'),
    groupLabel: t('bodySkins.groupLabel'),
    neutral: t('bodySkins.neutral'),
  };
}

/** The rail's host under the character sheet's skin row, created on first
 *  paint (no index.html edit; /play carries the same char window markup). */
function railHostFor(anchor: HTMLElement): HTMLElement {
  const existing = anchor.parentElement?.querySelector<HTMLElement>('.body-skin-rail-host');
  if (existing) return existing;
  const host = document.createElement('div');
  host.className = 'body-skin-rail-host';
  anchor.insertAdjacentElement('afterend', host);
  return host;
}

/** Paint (or repaint) the in-game appearance rail. A no-op when the character
 *  sheet's skin row is absent (the sheet is not built yet). */
export function paintBodySkinSwapRail(host: BodySkinSwapHost): void {
  const anchor = document.querySelector<HTMLElement>('#char-skin-row');
  if (!anchor?.parentElement) return;
  const railHost = railHostFor(anchor);
  const { world } = host;
  const labels = railLabels();
  const selected = world.player.bodySkinId ?? null;
  const rows = bodySkinRailRows({
    cls: world.cfg.playerClass,
    grants: world.bodySkinGrants(),
    selectedSkinId: selected,
    labels,
  });
  railHost.innerHTML = bodySkinRailHtml(rows, labels);
  const chips = Array.from(railHost.querySelectorAll<HTMLElement>('.body-skin-chip'));
  chips.forEach((chip, index) => {
    const pick = () => {
      // A locked chip stays reachable and readable but never selects: the
      // note it carries (level, price, or the lockedNoArt gap) IS its purpose.
      if (chip.dataset.locked) return;
      const skinId = chip.dataset.skinId ? chip.dataset.skinId : null;
      if (skinId === selected) return;
      world.setBodySkin(skinId);
      audio.click();
      // Repaint from the world's post-pick state so the selected chip moves,
      // then let the host refresh the sheet preview and frame portrait.
      paintBodySkinSwapRail(host);
      host.refresh();
    };
    chip.addEventListener('click', pick);
    chip.addEventListener('keydown', (event) => {
      const e = event as KeyboardEvent;
      // One tab stop, arrows rove without committing, Enter/Space commits
      // (the character-select rail's arrangement, kept identical here).
      const target = rovingTarget(e.key, index, chips.length, 'both');
      if (target !== null) {
        e.preventDefault();
        for (const other of chips) other.tabIndex = -1;
        chips[target].tabIndex = 0;
        chips[target].focus();
        return;
      }
      handleKeyboardActivation(e, pick);
    });
  });
}
