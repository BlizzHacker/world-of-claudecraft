// Pure view core for the D2 waypoint travel menu (waypoint_map_window.ts is the
// thin DOM consumer). Maps the sim's waypointMenu event payload to render rows:
// localized display label (realm lore overlay via waypointDisplayName, the
// undiscovered suffix via t()) plus the enabled flag. DOM-free; i18n imports are
// allowed for label selection (see src/ui/CLAUDE.md). Registered in
// UI_PURE_CORES (tests/architecture.test.ts); tested by
// tests/waypoint_map_view.test.ts.
//
// WHY THERE IS A MODEL AND NOT JUST ROWS. The shipped menu painted one flat list
// of every waypoint in authored order, so a player with two active waypoints and
// twenty-odd locked ones read a grey wall taller than the viewport and had to
// hunt for the two rows that did anything. waypointMenuModel splits the payload
// into the travelable group and the locked group, keeping the authored N-to-S
// order INSIDE each, and carries the counts the header and the locked-group
// disclosure need. The window paints the travelable group first and folds the
// locked one behind a labeled toggle, so what exists to find is still visible
// without burying what is usable.
//
// Ordering is a stable partition, never a sort: the payload order is authored
// world geography (each town hub next to its wilderness trail, north to south),
// and re-sorting it alphabetically would scramble a mental map players build
// from the world itself.

import { waypointDisplayName } from './entity_i18n';
import { formatNumber, t } from './i18n';

export interface WaypointMenuWaypoint {
  id: string;
  name: string;
  known: boolean;
}

export interface WaypointMenuRow {
  id: string;
  /** Visible button text: the localized display name, with no state suffix. */
  name: string;
  /** Accessible name; undiscovered rows carry the undiscovered suffix. */
  label: string;
  /** Only known (discovered) waypoints are clickable travel targets. */
  known: boolean;
}

export interface WaypointMenuModel {
  /** Travelable destinations that survived the filter, in authored order. */
  discovered: WaypointMenuRow[];
  /** Locked destinations that survived the filter, in authored order. */
  undiscovered: WaypointMenuRow[];
  /** Discovered count over the WHOLE payload (the header count, not the filter). */
  discoveredTotal: number;
  /** Every waypoint in the payload. */
  total: number;
  /** Nothing survived the filter, so the panel says so instead of going blank. */
  empty: boolean;
  /** Localized header count line. */
  summary: string;
  /** Localized heading over the travelable group. */
  discoveredLabel: string;
  /** Localized disclosure label for the locked group, carrying its count. */
  undiscoveredLabel: string;
}

function count(n: number): string {
  return formatNumber(n, { maximumFractionDigits: 0 });
}

export function waypointMenuRows(waypoints: readonly WaypointMenuWaypoint[]): WaypointMenuRow[] {
  return waypoints.map((w) => {
    // The wire carries the canonical English name; the realm lore overlay
    // (RealmContent.entityText.waypoints) re-skins it at render only.
    const name = waypointDisplayName(w.id, w.name);
    return {
      id: w.id,
      name,
      label: w.known ? name : t('hudChrome.waypoints.undiscovered', { name }),
      known: w.known,
    };
  });
}

/**
 * Group the payload for the travel panel: travelable rows first, locked rows
 * behind them, authored order preserved inside each group, optionally narrowed
 * by a player-typed name filter. The counts stay whole-payload so the header
 * still reads "2 of 29 discovered" while a filter is active.
 */
export function waypointMenuModel(
  waypoints: readonly WaypointMenuWaypoint[],
  query = '',
): WaypointMenuModel {
  const rows = waypointMenuRows(waypoints);
  // Plain toLowerCase, not the locale-aware form: a pure core must not vary with
  // the host's default locale, and the filter is a forgiving substring match.
  const needle = query.trim().toLowerCase();
  const visible = needle === '' ? rows : rows.filter((r) => r.name.toLowerCase().includes(needle));
  const discovered = visible.filter((r) => r.known);
  const undiscovered = visible.filter((r) => !r.known);
  const discoveredTotal = rows.reduce((n, r) => n + (r.known ? 1 : 0), 0);
  return {
    discovered,
    undiscovered,
    discoveredTotal,
    total: rows.length,
    empty: visible.length === 0,
    summary: t('hudChrome.waypoints.summary', {
      known: count(discoveredTotal),
      total: count(rows.length),
    }),
    discoveredLabel: t('hudChrome.waypoints.discoveredGroup'),
    undiscoveredLabel: t('hudChrome.waypoints.locked', { count: count(undiscovered.length) }),
  };
}

/**
 * Resolve a row the player picked back to its own waypoint id, and only when it
 * is actually travelable. Grouping and filtering reorder the painted list, so
 * the id a row names must keep meaning the exact travel command argument (the
 * bank_filter lesson); a locked id resolves to null rather than firing a command
 * the server would reject.
 */
export function waypointMenuSelect(model: WaypointMenuModel, id: string): WaypointMenuRow | null {
  return model.discovered.find((r) => r.id === id) ?? null;
}
