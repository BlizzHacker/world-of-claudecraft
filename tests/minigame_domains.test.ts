import { describe, expect, it } from 'vitest';
import { MINIGAME_FEATURES, minigameAvailable, minigameEnabled } from '../src/sim/minigames';
import {
  claimMinigameReward,
  createMinigameSession,
  finishMinigameSession,
  joinMinigameSession,
  type MinigameSessionState,
  setMinigameConnection,
  setMinigameReady,
  stepMinigameSession,
  type SessionMutation,
  practiceBotPids,
  practiceMinigameCapacity,
} from '../src/sim/minigames';
import { type BrawlerInput, createBrawlerState, stepBrawler } from '../src/sim/minigames/brawler';
import {
  arcadeFinished,
  createArcadeState,
  setArcadeRaceInput,
  stepArcadeState,
} from '../src/sim/minigames/arcade';
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
import { Sim } from '../src/sim/sim';

describe('minigame rollout guard', () => {
  it('keeps incomplete domains default-off until their checkpoints pass', () => {
    expect(MINIGAME_FEATURES).toHaveLength(5);
    expect(MINIGAME_FEATURES.every((feature) => feature.enabled)).toBe(false);
    expect(minigameEnabled('racing')).toBe(false);
    expect(minigameEnabled('housing')).toBe(false);
    expect(minigameAvailable('zombie_defense', true)).toBe(true);
    expect(minigameAvailable('zombie_defense')).toBe(false);
  });
});

describe('shared minigame session lifecycle', () => {
  const stateOf = (result: SessionMutation, fallback: MinigameSessionState): MinigameSessionState =>
    result.ok ? result.state : fallback;

  it('starts only after every human is ready, then enters active after a fixed countdown', () => {
    let state = createMinigameSession(7, 'racing', 99, 1, 4);
    expect(state.phase).toBe('lobby');
    const joined = joinMinigameSession(state, 2);
    expect(joined.ok).toBe(true);
    state = joined.ok ? joined.state : state;
    state = stateOf(setMinigameReady(state, 1, true), state);
    expect(stepMinigameSession(state).phase).toBe('lobby');
    state = stateOf(setMinigameReady(state, 2, true), state);
    state = stepMinigameSession(state);
    expect(state.phase).toBe('countdown');
    for (let i = 0; i < 60; i += 1) state = stepMinigameSession(state);
    expect(state.phase).toBe('active');
    expect(state.tick).toBe(61);
  });

  it('keeps reconnect and reward claims idempotent and authoritative', () => {
    let state = createMinigameSession(8, 'brawler', 3, 10, 2);
    let joined = joinMinigameSession(state, 11, true);
    expect(joined.ok).toBe(true);
    state = joined.ok ? joined.state : state;
    state = stateOf(setMinigameReady(state, 10, true), state);
    state = stepMinigameSession(state);
    for (let i = 0; i < 60; i += 1) state = stepMinigameSession(state);
    expect(state.phase).toBe('active');
    state = stateOf(setMinigameConnection(state, 11, false), state);
    state = stateOf(setMinigameConnection(state, 11, true), state);
    const finished = finishMinigameSession(state, [10, 11]);
    expect(finished.ok).toBe(true);
    state = finished.ok ? finished.state : state;
    const claimed = claimMinigameReward(state, 10);
    expect(claimed.ok).toBe(true);
    state = claimed.ok ? claimed.state : state;
    expect(claimMinigameReward(state, 10)).toEqual({ ok: false, reason: 'duplicate' });
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

describe('arcade race adapter', () => {
  it('keeps malformed controller values finite in the offline seam', () => {
    const state = createArcadeState('racing', 42, [1]);
    expect(setArcadeRaceInput(state, 1, { throttle: Number.NaN, steer: Number.POSITIVE_INFINITY })).toBe(true);
    for (let i = 0; i < 20; i += 1) stepArcadeState(state);
    expect(state.kind).toBe('racing');
    if (state.kind !== 'racing') return;
    const vehicle = state.race.vehicles[0];
    expect(Number.isFinite(vehicle.x)).toBe(true);
    expect(Number.isFinite(vehicle.z)).toBe(true);
    expect(arcadeFinished(state)).toBe(false);
  });

  it('fills one-player practice with deterministic CPU opponents', () => {
    const bots = practiceBotPids('racing', 7, 1);
    expect(bots).toEqual([1_000_057, 1_000_058, 1_000_059]);
    expect(practiceMinigameCapacity('racing', 1)).toBe(4);
    expect(practiceBotPids('town_rts', 7, 1)).toEqual([]);
    const first = createArcadeState('racing', 42, [1], bots);
    const second = createArcadeState('racing', 42, [1], bots);
    for (let i = 0; i < 120; i += 1) {
      stepArcadeState(first);
      stepArcadeState(second);
    }
    expect(first).toEqual(second);
    expect(
      first.kind === 'racing' &&
        first.race.vehicles
          .filter((vehicle) => bots.includes(vehicle.playerId))
          .every((vehicle) => vehicle.checkpoint > 0 || vehicle.lap > 0),
    ).toBe(true);
  });

  it('lets a solo brawler practice match resolve against CPU fighters', () => {
    const bots = practiceBotPids('brawler', 1, 1);
    const state = createArcadeState('brawler', 42, [1], bots);
    for (let i = 0; i < 300 && !arcadeFinished(state); i += 1) stepArcadeState(state);
    expect(arcadeFinished(state)).toBe(true);
    expect(state.kind === 'brawler' && state.brawler.winner).not.toBeNull();
  });

  it('exposes the same CPU roster through the offline Sim host', () => {
    const sim = new Sim({ seed: 42, playerClass: 'warrior' });
    sim.minigameCreate('brawler', 1);
    expect(sim.minigameSession?.players).toHaveLength(4);
    expect(sim.minigameSession?.players.filter((player) => player.bot)).toHaveLength(3);
    sim.minigameReady(true);
    for (let i = 0; i < 61; i += 1) sim.tick();
    expect(sim.minigameSession?.phase).toBe('active');
    for (let i = 0; i < 300 && sim.minigameSession?.phase === 'active'; i += 1) sim.tick();
    expect(sim.minigameSession?.phase).toBe('finished');
  });

  it('admits an existing couch player through the offline invite seam', () => {
    const sim = new Sim({ seed: 42, playerClass: 'warrior' });
    const couchPlayer = sim.addPlayer('mage', 'CouchTwo');
    sim.minigameCreate('racing', 4);
    sim.minigameInvite(couchPlayer);
    expect(sim.minigameSession?.players.some((player) => player.pid === couchPlayer)).toBe(true);
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

  it('exposes the same roster lifecycle to offline couch players in preview mode', () => {
    const sim = new Sim({ seed: 55, playerClass: 'warrior' });
    const owner = sim.playerId;
    sim.minigameCreate('zombie_defense', 4);
    sim.minigameJoin(1, owner + 1);
    sim.minigameReady(true, owner);
    sim.minigameReady(true, owner + 1);
    for (let i = 0; i < 61; i += 1) sim.tick();
    expect(sim.minigameSession?.phase).toBe('active');
    sim.minigameZombieStart(owner + 1);
    sim.minigameZombieBuild('arrow', -3, 1, owner + 1);
    expect(sim.minigameZombieState?.state.towers).toHaveLength(1);
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
