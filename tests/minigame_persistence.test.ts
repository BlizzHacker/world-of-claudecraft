import { describe, expect, it } from 'vitest';
import { cloneHousingLot, createHousingLot, deserializeHousingLot, placeHousingPiece } from '../src/sim/minigames/housing';
import { addRtsAcl, buildRtsStructure, cloneRtsCampaign, createRtsCampaign, deserializeRtsCampaign } from '../src/sim/minigames/rts';

describe('minigame persistence snapshots', () => {
  it('round-trips and detaches a housing lot', () => {
    const lot = createHousingLot('cryptic', 'eastbrook', 7);
    expect(placeHousingPiece(lot, 7, { id: 'floor-1', kind: 'floor', cell: { x: 1, z: 0 }, rotation: 0 })).toBe(true);
    const restored = deserializeHousingLot(JSON.parse(JSON.stringify(cloneHousingLot(lot))));
    expect(restored).toEqual(lot);
    expect(restored).not.toBe(lot);
    expect(deserializeHousingLot({ ...lot, version: 'old' })).toBeNull();
  });

  it('round-trips and rejects malformed RTS campaigns', () => {
    const campaign = createRtsCampaign(7);
    expect(addRtsAcl(campaign, 7, 8, 'commander')).toBe(true);
    expect(buildRtsStructure(campaign, 7, 'farm', { x: 2, z: 0 })).toBe(true);
    const restored = deserializeRtsCampaign(JSON.parse(JSON.stringify(cloneRtsCampaign(campaign))));
    expect(restored).toEqual(campaign);
    expect(restored).not.toBe(campaign);
    expect(deserializeRtsCampaign({ ...campaign, objective: 'cheat' })).toBeNull();
    expect(deserializeRtsCampaign({ ...campaign, structures: [{ ...campaign.structures[0], cell: { x: 99, z: 0 } }] })).toBeNull();
  });
});
