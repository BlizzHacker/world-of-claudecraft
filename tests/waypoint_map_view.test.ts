import { describe, expect, it } from 'vitest';
import { waypointMenuRows } from '../src/ui/waypoint_map_view';

describe('waypoint_map_view', () => {
  it('maps the waypointMenu payload to labeled rows with the known flag', () => {
    const rows = waypointMenuRows([
      { id: 'wp_zone1', name: 'Eastbrook Vale', known: true },
      { id: 'wp_zone1_wild', name: 'Eastbrook Vale Trail', known: false },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('wp_zone1');
    expect(rows[0].known).toBe(true);
    expect(rows[0].label).toContain('Eastbrook Vale');
    expect(rows[0].label).not.toContain('undiscovered');
    expect(rows[1].known).toBe(false);
    // The undiscovered suffix comes from the t() key, name interpolated.
    expect(rows[1].label).toContain('Eastbrook Vale Trail');
    expect(rows[1].label).toContain('undiscovered');
  });
});
