// D2 waypoint travel menu: a floating list of the player's DISCOVERED waypoints;
// click one to travel. Locked (undiscovered) waypoints show greyed. Opened when
// the player interacts with a waypoint (the sim emits waypointMenu with the
// list); Hud.handleEvents makes the one thin open call.
//
// Cold window (src/ui/CLAUDE.md): builds its DOM once per open, no forced-reflow
// layout read, no repeating driver (the auto-dismiss is a one-shot timeout).
// Owns no state and never imports Hud; the travel action arrives via deps.
// Registered in UI_DOM_MODULES (tests/architecture.test.ts).

import { t } from './i18n';
import { type WaypointMenuWaypoint, waypointMenuRows } from './waypoint_map_view';

export interface WaypointMenuDeps {
  /** The #prompt-stack container the menu floats in. */
  stack: HTMLElement;
  /** Fires the IWorld travel command for a clicked destination. */
  travel(waypointId: string): void;
}

const MENU_ID = 'waypoint-menu';
const AUTO_DISMISS_MS = 30000;

export function closeWaypointMenu(): void {
  document.getElementById(MENU_ID)?.remove();
}

export function openWaypointMenu(
  waypoints: readonly WaypointMenuWaypoint[],
  deps: WaypointMenuDeps,
): void {
  closeWaypointMenu();
  const menu = document.createElement('div');
  menu.id = MENU_ID;
  menu.className = 'prompt panel';
  const title = document.createElement('div');
  title.className = 'prompt-text';
  const heading = document.createElement('b');
  heading.textContent = t('hudChrome.waypoints.title');
  title.append(heading, `: ${t('hudChrome.waypoints.choose')}`);
  menu.appendChild(title);
  const list = document.createElement('div');
  list.className = 'waypoint-list';
  for (const row of waypointMenuRows(waypoints)) {
    const btn = document.createElement('button');
    btn.className = 'btn waypoint-dest';
    btn.type = 'button';
    btn.textContent = row.label;
    btn.disabled = !row.known;
    if (row.known) {
      btn.addEventListener('click', () => {
        menu.remove();
        deps.travel(row.id);
      });
    }
    list.appendChild(btn);
  }
  menu.appendChild(list);
  const close = document.createElement('button');
  close.className = 'btn';
  close.type = 'button';
  close.textContent = t('hud.prompts.decline');
  close.addEventListener('click', () => menu.remove());
  menu.appendChild(close);
  deps.stack.appendChild(menu);
  window.setTimeout(() => menu.isConnected && menu.remove(), AUTO_DISMISS_MS);
}
