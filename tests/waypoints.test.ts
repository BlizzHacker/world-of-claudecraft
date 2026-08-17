import { describe, expect, it } from 'vitest';
import { pylonOffset, waypointDefs } from '../src/sim/waypoints';

describe('realm waypoints', () => {
  it('keeps the authored Infernal entrance as a scoped travel landmark', () => {
    const infernal = waypointDefs().find((waypoint) => waypoint.id === 'wp_infernal_dungeon');
    expect(infernal).toMatchObject({
      name: 'Hellmaw Dungeon',
      realmId: 'infernal',
      assetKey: 'infernal_dungeon_entrance',
      x: 18,
      z: -52,
    });
    expect(pylonOffset('wp_infernal_dungeon')).toEqual({ x: 0, z: 0 });
  });
});
