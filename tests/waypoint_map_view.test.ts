import { describe, expect, it } from 'vitest';
import {
  waypointMenuModel,
  waypointMenuRows,
  waypointMenuSelect,
} from '../src/ui/waypoint_map_view';

// The live payload shape: the authored N-to-S waypoint order, with the town hub
// and its wilderness trail adjacent, and most of the list still locked. This is
// what made the shipped menu an undifferentiated grey wall taller than the
// viewport (the operator report), so every case below drives this ordering.
const PAYLOAD = [
  { id: 'wp_zone1', name: 'Eastbrook Vale', known: true },
  { id: 'wp_zone1_wild', name: 'Eastbrook Vale Trail', known: false },
  { id: 'wp_zone2', name: 'Duskmoor', known: false },
  { id: 'wp_zone2_wild', name: 'Duskmoor Trail', known: false },
  { id: 'wp_zone3', name: 'Mirefen', known: true },
  { id: 'wp_zone3_wild', name: 'Mirefen Trail', known: false },
];

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

  it('keeps the visible row text free of the state suffix the accessible name carries', () => {
    const rows = waypointMenuRows(PAYLOAD);
    const locked = rows.find((r) => r.id === 'wp_zone2');
    expect(locked?.name).toBe('Duskmoor');
    expect(locked?.label).toContain('undiscovered');
  });
});

describe('waypoint_map_view grouping', () => {
  it('splits travelable destinations out of the locked wall, authored order intact', () => {
    const model = waypointMenuModel(PAYLOAD);
    expect(model.discovered.map((r) => r.id)).toEqual(['wp_zone1', 'wp_zone3']);
    expect(model.undiscovered.map((r) => r.id)).toEqual([
      'wp_zone1_wild',
      'wp_zone2',
      'wp_zone2_wild',
      'wp_zone3_wild',
    ]);
    expect(model.empty).toBe(false);
  });

  it('counts the whole payload for the summary, not the filtered slice', () => {
    const model = waypointMenuModel(PAYLOAD, 'mire');
    expect(model.discoveredTotal).toBe(2);
    expect(model.total).toBe(6);
    expect(model.discovered.map((r) => r.id)).toEqual(['wp_zone3']);
    expect(model.undiscovered.map((r) => r.id)).toEqual(['wp_zone3_wild']);
  });

  it('filters case-insensitively on the display name and ignores surrounding space', () => {
    const model = waypointMenuModel(PAYLOAD, '  DUSKMOOR ');
    expect(model.discovered).toHaveLength(0);
    expect(model.undiscovered.map((r) => r.id)).toEqual(['wp_zone2', 'wp_zone2_wild']);
    expect(model.empty).toBe(false);
  });

  it('reports empty when nothing matches, so the panel can say so instead of going blank', () => {
    const model = waypointMenuModel(PAYLOAD, 'no such place');
    expect(model.discovered).toHaveLength(0);
    expect(model.undiscovered).toHaveLength(0);
    expect(model.empty).toBe(true);
  });

  it('localizes the header and group labels through t(), never concatenation', () => {
    const model = waypointMenuModel(PAYLOAD);
    expect(model.summary).toContain('2');
    expect(model.summary).toContain('6');
    expect(model.discoveredLabel.length).toBeGreaterThan(0);
    expect(model.undiscoveredLabel).toContain('4');
  });

  it('handles a payload with nothing locked by leaving the disclosure group empty', () => {
    const model = waypointMenuModel([{ id: 'wp_zone1', name: 'Eastbrook Vale', known: true }]);
    expect(model.undiscovered).toHaveLength(0);
    expect(model.discoveredTotal).toBe(1);
    expect(model.total).toBe(1);
  });
});

describe('waypoint_map_view selection', () => {
  it('resolves a clicked row to its own waypoint id after grouping and filtering', () => {
    const model = waypointMenuModel(PAYLOAD, 'mire');
    // The row moved from index 4 of the payload to index 0 of the discovered
    // group; the id it names must still be the exact travel command argument.
    expect(waypointMenuSelect(model, model.discovered[0].id)?.id).toBe('wp_zone3');
  });

  it('refuses a locked destination, so a reordered list can never fire an invalid travel', () => {
    const model = waypointMenuModel(PAYLOAD);
    expect(waypointMenuSelect(model, 'wp_zone2')).toBeNull();
    expect(waypointMenuSelect(model, 'wp_zone1')?.id).toBe('wp_zone1');
  });

  it('refuses an id that is not in the payload at all', () => {
    const model = waypointMenuModel(PAYLOAD);
    expect(waypointMenuSelect(model, 'wp_nowhere')).toBeNull();
  });
});
