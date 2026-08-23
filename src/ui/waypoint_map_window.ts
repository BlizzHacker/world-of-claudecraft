// D2 waypoint travel menu: the player's destination picker. Opened when the
// player interacts with a waypoint (the sim emits waypointMenu with the list);
// Hud.handleEvents makes the one thin open call.
//
// THE SHAPE, AND WHY. The first version painted one flat column of every
// waypoint in the world, discovered or not, straight into the prompt stack. The
// overworld carries two waypoints per zone, so that is a couple of dozen rows:
// the panel ran off the bottom of the viewport with no scroll of its own, and
// the greyed locked rows outnumbered the travelable ones badly enough to bury
// them. This version keeps the same one-call surface and fixes both halves:
//   - the panel is height-bounded against the app viewport (CSS, never a
//     measured layout read) with the destination region scrolling INSIDE it, so
//     it fits any viewport including a landscape phone,
//   - the travelable destinations paint first under their own heading, and the
//     locked ones fold behind a counted disclosure so what is left to find is
//     still one tap away without swamping what works.
// A name filter appears only once the list is long enough to need one.
//
// Cold window (src/ui/CLAUDE.md): builds its DOM per open and per filter edit,
// no forced-reflow layout read, no repeating driver (the auto-dismiss is a
// one-shot timeout). Owns no state beyond the live menu handle and never imports
// Hud; the travel action arrives via deps. Registered in UI_DOM_MODULES
// (tests/architecture.test.ts). All grouping, ordering, filtering and selection
// live in the pure core waypoint_map_view.ts.

import { markDialogRoot } from './dialog_root';
import { FocusManager, type FocusTrapHandle } from './focus_manager';
import { t } from './i18n';
import {
  type WaypointMenuWaypoint,
  waypointMenuModel,
  waypointMenuSelect,
} from './waypoint_map_view';

export interface WaypointMenuDeps {
  /** The #prompt-stack container the menu floats in. */
  stack: HTMLElement;
  /** Fires the IWorld travel command for a clicked destination. */
  travel(waypointId: string): void;
}

const MENU_ID = 'waypoint-menu';
const TITLE_ID = 'waypoint-menu-title';
const LOCKED_LIST_ID = 'waypoint-menu-locked';
const AUTO_DISMISS_MS = 30000;
// Below this many destinations the list is short enough to read at a glance, so
// a search box would be chrome with nothing to do. The live overworld sits well
// above it (a town hub plus a wilderness trail per zone).
const FILTER_MIN_DESTINATIONS = 8;

const focusManager = new FocusManager();
/** Closes the live menu (releasing its focus trap); null when none is open. */
let activeClose: (() => void) | null = null;

export function closeWaypointMenu(): void {
  activeClose?.();
}

export function openWaypointMenu(
  waypoints: readonly WaypointMenuWaypoint[],
  deps: WaypointMenuDeps,
): void {
  closeWaypointMenu();
  // Belt and braces: a menu left behind by an older build (or a failed close)
  // must never stack a second panel under the same id.
  document.getElementById(MENU_ID)?.remove();

  const menu = document.createElement('div');
  menu.id = MENU_ID;
  menu.className = 'prompt panel';
  markDialogRoot(menu, { labelledBy: TITLE_ID });

  const head = document.createElement('div');
  head.className = 'waypoint-menu-head';
  const title = document.createElement('div');
  title.id = TITLE_ID;
  title.className = 'prompt-text waypoint-menu-title';
  title.textContent = t('hudChrome.waypoints.title');
  const sub = document.createElement('div');
  sub.className = 'waypoint-menu-sub';
  sub.textContent = t('hudChrome.waypoints.choose');
  const summary = document.createElement('div');
  summary.className = 'waypoint-menu-summary';
  head.append(title, sub, summary);

  // Filter state and locked-group disclosure state live for the life of this
  // one menu; nothing persists across opens.
  let query = '';
  let lockedOpen = false;

  let filter: HTMLInputElement | null = null;
  if (waypoints.length >= FILTER_MIN_DESTINATIONS) {
    filter = document.createElement('input');
    filter.type = 'search';
    filter.className = 'waypoint-menu-filter';
    filter.autocomplete = 'off';
    filter.spellcheck = false;
    filter.placeholder = t('hudChrome.waypoints.filterPlaceholder');
    filter.setAttribute('aria-label', t('hudChrome.waypoints.filterPlaceholder'));
    // In the Tab cycle, but never the element focus lands on at open: auto
    // focusing a text field pops the on-screen keyboard over half a phone.
    filter.setAttribute('data-skip-open-focus', '');
    head.append(filter);
  }

  const scroll = document.createElement('div');
  scroll.className = 'waypoint-menu-scroll';

  const actions = document.createElement('div');
  actions.className = 'waypoint-menu-actions';
  const close = document.createElement('button');
  close.className = 'btn';
  close.type = 'button';
  close.setAttribute('data-close', '');
  close.textContent = t('hud.prompts.decline');
  actions.append(close);

  menu.append(head, scroll, actions);

  const destButton = (
    id: string,
    name: string,
    label: string,
    known: boolean,
  ): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.className = 'btn waypoint-dest';
    btn.type = 'button';
    btn.textContent = name;
    btn.disabled = !known;
    // The visible text is the bare place name (the group heading carries the
    // state); the accessible name still spells the locked state out.
    if (!known) btn.setAttribute('aria-label', label);
    if (known) btn.addEventListener('click', () => travelTo(id));
    return btn;
  };

  const renderList = (): void => {
    const model = waypointMenuModel(waypoints, query);
    summary.textContent = model.summary;
    scroll.textContent = '';
    if (model.empty) {
      const none = document.createElement('div');
      none.className = 'waypoint-menu-empty';
      none.textContent = t('hudChrome.waypoints.noMatches');
      scroll.append(none);
      return;
    }
    if (model.discovered.length > 0) {
      const heading = document.createElement('div');
      heading.className = 'waypoint-menu-group';
      heading.textContent = model.discoveredLabel;
      const list = document.createElement('div');
      list.className = 'waypoint-list';
      for (const row of model.discovered) {
        list.append(destButton(row.id, row.name, row.label, true));
      }
      scroll.append(heading, list);
    }
    if (model.undiscovered.length > 0) {
      const toggle = document.createElement('button');
      toggle.className = 'waypoint-menu-toggle';
      toggle.type = 'button';
      toggle.textContent = model.undiscoveredLabel;
      toggle.setAttribute('aria-expanded', lockedOpen ? 'true' : 'false');
      toggle.setAttribute('aria-controls', LOCKED_LIST_ID);
      toggle.addEventListener('click', () => {
        cancelAutoDismiss();
        lockedOpen = !lockedOpen;
        renderList();
      });
      const list = document.createElement('div');
      list.id = LOCKED_LIST_ID;
      list.className = 'waypoint-list waypoint-list-locked';
      list.hidden = !lockedOpen;
      for (const row of model.undiscovered) {
        list.append(destButton(row.id, row.name, row.label, false));
      }
      scroll.append(toggle, list);
    }
  };

  // Assigned once the panel is in the document; declared here so dismiss can
  // release the trap however it is reached (button, Esc, travel, auto-dismiss).
  let trap: FocusTrapHandle | null = null;
  // The auto-dismiss is a ONE-SHOT timeout, never re-armed (a self-rescheduling
  // timeout is a repeating driver by any other name, and this is a cold window).
  // Engaging with the panel CANCELS it instead, so the countdown can never yank
  // the list away mid-search.
  let dismissTimer = 0;
  const cancelAutoDismiss = (): void => {
    if (dismissTimer === 0) return;
    window.clearTimeout(dismissTimer);
    dismissTimer = 0;
  };
  const dismiss = (): void => {
    if (activeClose !== dismiss) return;
    activeClose = null;
    cancelAutoDismiss();
    const handle = trap;
    trap = null;
    menu.remove();
    handle?.release();
  };
  activeClose = dismiss;

  function travelTo(id: string): void {
    // Re-resolve through the pure core: grouping and filtering reorder the
    // painted rows, so the id a row carries is validated as travelable here
    // rather than trusted because the button happened to be enabled.
    const row = waypointMenuSelect(waypointMenuModel(waypoints, query), id);
    if (!row) return;
    dismiss();
    deps.travel(row.id);
  }

  if (filter) {
    filter.addEventListener('input', () => {
      cancelAutoDismiss();
      query = filter?.value ?? '';
      // A search that only matches locked places must show them, or the player
      // types a name they can see on the map and gets a blank panel.
      if (query.trim() !== '') lockedOpen = true;
      renderList();
    });
  }
  close.addEventListener('click', dismiss);
  // Esc closes this panel without reaching the world behind it. Scoped to the
  // menu (the camera_prompt precedent), so the shared closeAll dispatcher stays
  // the only global Escape owner.
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    dismiss();
  });

  renderList();
  deps.stack.appendChild(menu);
  trap = focusManager.open({ root: () => menu });
  trap.focusFirst();
  dismissTimer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
}
