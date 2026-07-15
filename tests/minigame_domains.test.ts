import { describe, expect, it } from 'vitest';
import { MINIGAME_FEATURES, minigameEnabled } from '../src/sim/minigames';
import { type BrawlerInput, createBrawlerState, stepBrawler } from '../src/sim/minigames/brawler';
import {
  canBuildHousing,
  canVisitHousing,
  createHousingLot,
  placeHousingPiece,
  restoreHousingLot,
  scheduleHousingDeletion,
  setHousingAccess,
} from '../src/sim/minigames/housing';
import {
  addRtsAcl,
  buildRtsStructure,
  createRtsCampaign,
  rtsPath,
  stepRtsCampaign,
  trainRtsUnit,
} from '../src/sim/minigames/rts';
import {
  buildDefenseTower,
  createZombieDefense,
  startZombieWave,
  stepZombieDefense,
} from '../src/sim/minigames/zombie_defense';

describe('minigame rollout guard', () => {
  it('keeps incomplete domains default-off until their checkpoints pass', () => {
    expect(MINIGAME_FEATURES).toHaveLength(5);
    expect(MINIGAME_FEATURES.every((feature) => feature.enabled)).toBe(false);
    expect(minigameEnabled('racing')).toBe(false);
    expect(minigameEnabled('housing')).toBe(false);
  });
});

describe('brawler domain', () => {
  it('keeps four fighters deterministic and supports jump, hitstun, and ring out', () => {
    const a = createBrawlerState([1, 2, 3, 4]);
    const b = createBrawlerState([1, 2, 3, 4]);
    const neutral = new Map<number, BrawlerInput>();
    for (let i = 0; i < 10; i += 1) {
      neutral.set(1, { move: 1, jump: i === 0, attack: false });
      neutral.set(2, { move: -1, jump: false, attack: i === 2 });
      const eventsA = stepBrawler(a, neutral);
      const eventsB = stepBrawler(b, neutral);
      expect(eventsA).toEqual(eventsB);
      expect(a).toEqual(b);
    }
    a.fighters[0].x = 0;
    a.fighters[0].z = 0;
    a.fighters[1].x = 1;
    a.fighters[1].z = 0;
    a.fighters[0].grounded = true;
    a.fighters[1].grounded = true;
    neutral.set(1, { move: 0, jump: false, attack: true });
    const events = stepBrawler(a, neutral);
    expect(events.some((event) => event.type === 'hit')).toBe(true);
    a.fighters[1].x = a.rightBlastZone + 1;
    stepBrawler(a, new Map());
    expect(a.fighters[1].stocks).toBe(2);
  });
});

describe('town RTS domain', () => {
  it('locks owner ACL, deterministic production, and grid pathing', () => {
    const campaign = createRtsCampaign(10);
    expect(addRtsAcl(campaign, 10, 11, 'commander')).toBe(true);
    expect(addRtsAcl(campaign, 11, 12, 'builder')).toBe(false);
    expect(buildRtsStructure(campaign, 11, 'farm', { x: 2, z: 0 })).toBe(true);
    expect(buildRtsStructure(campaign, 11, 'wall', { x: 3, z: 0 })).toBe(true);
    expect(buildRtsStructure(campaign, 11, 'wall', { x: 4, z: 0 })).toBe(true);
    expect(trainRtsUnit(campaign, 11, 'guard')).toBe(true);
    const path = rtsPath({ x: 0, z: 0 }, { x: 2, z: 1 }, new Set(['1,0']));
    expect(path).toEqual([
      { x: 0, z: 0 },
      { x: 0, z: 1 },
      { x: 1, z: 1 },
      { x: 2, z: 1 },
    ]);
    stepRtsCampaign(campaign, 20);
    expect(campaign.objective).toBe('won');
  });
});

describe('zombie defense domain', () => {
  it('uses seeded waves and tower targeting without open-world spawning', () => {
    const route = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 2, z: 0 },
      { x: 3, z: 0 },
    ];
    const a = createZombieDefense(77, route);
    const b = createZombieDefense(77, route);
    startZombieWave(a);
    startZombieWave(b);
    expect(a.zombies).toEqual(b.zombies);
    expect(buildDefenseTower(a, 10, 'arrow', { x: 1, z: 0 })).toBe(true);
    expect(buildDefenseTower(b, 10, 'arrow', { x: 1, z: 0 })).toBe(true);
    stepZombieDefense(a, 20);
    stepZombieDefense(b, 20);
    expect(a).toEqual(b);
    expect(a.status).toBe('ready');
  });
});

describe('housing domain', () => {
  it('enforces owner ACL, collision-free placement, visits, and reversible deletion', () => {
    const lot = createHousingLot('cryptic', 'eastbrook', 10);
    expect(setHousingAccess(lot, 10, 11, 'builder')).toBe(true);
    expect(canBuildHousing(lot, 11)).toBe(true);
    expect(
      placeHousingPiece(lot, 11, { id: 'wall-1', kind: 'wall', cell: { x: 1, z: 1 }, rotation: 0 }),
    ).toBe(true);
    expect(
      placeHousingPiece(lot, 11, { id: 'wall-2', kind: 'wall', cell: { x: 1, z: 1 }, rotation: 0 }),
    ).toBe(false);
    expect(scheduleHousingDeletion(lot, 10, 200)).toBe(true);
    expect(canVisitHousing(lot, 11)).toBe(false);
    expect(restoreHousingLot(lot, 10)).toBe(true);
    expect(canVisitHousing(lot, 11)).toBe(true);
  });
});
