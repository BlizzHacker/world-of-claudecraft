// Pure view core for the D2 waypoint travel menu (waypoint_map_window.ts is the
// thin DOM consumer). Maps the sim's waypointMenu event payload to render rows:
// localized display label (realm lore overlay via waypointDisplayName, the
// undiscovered suffix via t()) plus the enabled flag. DOM-free; i18n imports are
// allowed for label selection (see src/ui/CLAUDE.md). Registered in
// UI_PURE_CORES (tests/architecture.test.ts); tested by
// tests/waypoint_map_view.test.ts.

import { waypointDisplayName } from './entity_i18n';
import { t } from './i18n';

export interface WaypointMenuWaypoint {
  id: string;
  name: string;
  known: boolean;
}

export interface WaypointMenuRow {
  id: string;
  /** Localized button label; undiscovered rows carry the undiscovered suffix. */
  label: string;
  /** Only known (discovered) waypoints are clickable travel targets. */
  known: boolean;
}

export function waypointMenuRows(waypoints: readonly WaypointMenuWaypoint[]): WaypointMenuRow[] {
  return waypoints.map((w) => {
    // The wire carries the canonical English name; the realm lore overlay
    // (RealmContent.entityText.waypoints) re-skins it at render only.
    const name = waypointDisplayName(w.id, w.name);
    return {
      id: w.id,
      label: w.known ? name : t('hudChrome.waypoints.undiscovered', { name }),
      known: w.known,
    };
  });
}
