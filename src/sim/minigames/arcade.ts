import {
  createRaceSession,
  defaultRaceTrack,
  grantRaceItem,
  raceResults,
  stepRace,
  type RaceInput,
  type RaceSession,
} from '../racing';
import {
  createBrawlerState,
  stepBrawler,
  type BrawlerInput,
  type BrawlerState,
} from './brawler';
import {
  buildRtsStructure,
  createRtsCampaign,
  stepRtsCampaign,
  trainRtsUnit,
  type RtsCampaign,
  type RtsStructureKind,
  type RtsUnitKind,
} from './rts';
import {
  createHousingLot,
  placeHousingPiece,
  type HousingLot,
  type HousingPiece,
} from './housing';
import type { MinigameFeatureId } from './index';

export const ARCADE_STATE_VERSION = 'arcade-v1';

export type ArcadeState =
  | {
      version: typeof ARCADE_STATE_VERSION;
      kind: 'racing';
      race: RaceSession;
      raceInputs: Record<string, RaceInput>;
      botPids: readonly number[];
    }
  | {
      version: typeof ARCADE_STATE_VERSION;
      kind: 'brawler';
      brawler: BrawlerState;
      brawlerInputs: Record<number, BrawlerInput>;
      botPids: readonly number[];
    }
  | {
      version: typeof ARCADE_STATE_VERSION;
      kind: 'town_rts';
      rts: RtsCampaign;
      botPids: readonly number[];
    }
  | {
      version: typeof ARCADE_STATE_VERSION;
      kind: 'housing';
      housing: HousingLot;
      botPids: readonly number[];
    };

export type ArcadeWireState =
  | { version: typeof ARCADE_STATE_VERSION; kind: 'racing'; race: Omit<RaceSession, 'itemRng'> }
  | { version: typeof ARCADE_STATE_VERSION; kind: 'brawler'; brawler: BrawlerState }
  | { version: typeof ARCADE_STATE_VERSION; kind: 'town_rts'; rts: RtsCampaign }
  | { version: typeof ARCADE_STATE_VERSION; kind: 'housing'; housing: HousingLot };

/** Deterministic, mode-neutral scoreboard values for the shared session shell. */
export type ArcadeScores = ReadonlyMap<number, number>;

export function arcadeKindSupported(kind: MinigameFeatureId): kind is ArcadeState['kind'] {
  return kind !== 'zombie_defense';
}

export function createArcadeState(
  kind: Exclude<MinigameFeatureId, 'zombie_defense'>,
  seed: number,
  playerIds: readonly number[],
  botPids: readonly number[] = [],
): ArcadeState {
  const participants = [...playerIds, ...botPids];
  if (kind === 'racing') {
    return {
      version: ARCADE_STATE_VERSION,
      kind,
      race: createRaceSession(
        defaultRaceTrack(),
        seed,
        participants.map((playerId, index) => ({ id: `p${playerId || index + 1}`, playerId })),
      ),
      raceInputs: {},
      botPids: [...botPids],
    };
  }
  if (kind === 'brawler') {
    return {
      version: ARCADE_STATE_VERSION,
      kind,
      brawler: createBrawlerState(participants),
      brawlerInputs: {},
      botPids: [...botPids],
    };
  }
  if (kind === 'town_rts') {
    return {
      version: ARCADE_STATE_VERSION,
      kind,
      rts: createRtsCampaign(playerIds[0] ?? 1),
      botPids: [],
    };
  }
  return {
    version: ARCADE_STATE_VERSION,
    kind,
    housing: createHousingLot('cryptic', 'eastbrook', playerIds[0] ?? 1),
    botPids: [],
  };
}

function botRaceInput(state: RaceSession, vehicle: RaceSession['vehicles'][number]): RaceInput {
  if (vehicle.recoveryTicks >= 35) return { recover: true };
  const target = state.track.checkpoints[vehicle.checkpoint] ?? state.track.recovery;
  const desired = Math.atan2(target.x - vehicle.x, target.z - vehicle.z);
  let delta = desired - vehicle.heading;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return {
    throttle: 1,
    steer: delta > 0.12 ? 1 : delta < -0.12 ? -1 : 0,
    drift: Math.abs(delta) > 0.45 && Math.abs(vehicle.speed) >= 4,
    useItem: vehicle.item !== null && vehicle.itemCooldown === 0,
  };
}

function botBrawlerInput(state: BrawlerState, fighter: BrawlerState['fighters'][number]): BrawlerInput {
  const target = state.fighters
    .filter((candidate) => candidate.id !== fighter.id && candidate.alive)
    .sort((a, b) => {
      const da = Math.abs(a.x - fighter.x) + Math.abs(a.z - fighter.z);
      const db = Math.abs(b.x - fighter.x) + Math.abs(b.z - fighter.z);
      return da - db || a.id - b.id;
    })[0];
  if (!target) return { move: 0, jump: false, attack: false };
  const dx = target.x - fighter.x;
  const move = dx < -0.8 ? -1 : dx > 0.8 ? 1 : 0;
  return {
    move,
    jump: fighter.grounded && target.z - fighter.z > 1.5,
    attack: Math.abs(dx) <= 1.8 && Math.abs(target.z - fighter.z) <= 2.2,
  };
}

export function addArcadePlayer(state: ArcadeState, playerId: number): void {
  if (state.kind === 'racing') {
    if (state.race.vehicles.some((vehicle) => vehicle.playerId === playerId)) return;
    const id = `p${playerId}`;
    state.race = createRaceSession(state.race.track, state.race.seed, [
      ...state.race.vehicles.map((vehicle) => ({ id: vehicle.id, playerId: vehicle.playerId })),
      { id, playerId },
    ]);
  } else if (state.kind === 'brawler') {
    if (state.brawler.fighters.some((fighter) => fighter.id === playerId)) return;
    const ids = state.brawler.fighters.map((fighter) => fighter.id);
    state.brawler = createBrawlerState([...ids, playerId], state.brawler.platforms);
  } else if (state.kind === 'town_rts') {
    if (!state.rts.acl.some((entry) => entry.playerId === playerId)) {
      state.rts.acl.push({ playerId, role: 'builder' });
      state.rts.acl.sort((a, b) => a.playerId - b.playerId);
    }
  } else if (state.kind === 'housing') {
    if (!(playerId in state.housing.acl)) state.housing.acl[playerId] = 'builder';
  }
}

export function setArcadeRaceInput(state: ArcadeState, playerId: number, input: RaceInput): boolean {
  if (state.kind !== 'racing') return false;
  const vehicle = state.race.vehicles.find((candidate) => candidate.playerId === playerId);
  if (!vehicle) return false;
  // Keep malformed offline/controller inputs from poisoning deterministic race
  // state. The online command boundary performs the same check, but this seam
  // is also called directly by the offline client and headless drivers.
  const throttle = typeof input.throttle === 'number' && Number.isFinite(input.throttle) ? input.throttle : 0;
  const steer = typeof input.steer === 'number' && Number.isFinite(input.steer) ? input.steer : 0;
  state.raceInputs[vehicle.id] = {
    throttle: Math.max(-1, Math.min(1, throttle)),
    steer: Math.max(-1, Math.min(1, steer)),
    drift: input.drift === true,
    useItem: input.useItem === true,
    recover: input.recover === true,
  };
  return true;
}

export function setArcadeBrawlerInput(
  state: ArcadeState,
  playerId: number,
  input: BrawlerInput,
): boolean {
  if (state.kind !== 'brawler' || !state.brawler.fighters.some((fighter) => fighter.id === playerId))
    return false;
  state.brawlerInputs[playerId] = {
    move: input.move === -1 || input.move === 1 ? input.move : 0,
    jump: input.jump === true,
    attack: input.attack === true,
  };
  return true;
}

export function buildArcadeRts(
  state: ArcadeState,
  playerId: number,
  kind: RtsStructureKind,
  x: number,
  z: number,
): boolean {
  return state.kind === 'town_rts' && buildRtsStructure(state.rts, playerId, kind, { x, z });
}

export function trainArcadeRts(state: ArcadeState, playerId: number, kind: RtsUnitKind): boolean {
  return state.kind === 'town_rts' && trainRtsUnit(state.rts, playerId, kind);
}

export function placeArcadeHousing(
  state: ArcadeState,
  playerId: number,
  piece: HousingPiece,
): boolean {
  return state.kind === 'housing' && placeHousingPiece(state.housing, playerId, piece);
}

export function stepArcadeState(state: ArcadeState): void {
  if (state.kind === 'racing') {
    const inputs = { ...state.raceInputs };
    for (const vehicle of state.race.vehicles) {
      if (state.botPids.includes(vehicle.playerId)) inputs[vehicle.id] = botRaceInput(state.race, vehicle);
    }
    state.race = stepRace(state.race, inputs);
    // Checkpoints are the deterministic equivalent of item boxes. Awarding
    // through the race domain keeps the seeded item stream authoritative for
    // both offline and online sessions, while avoiding a second collision/RNG
    // implementation in the adapter.
    for (const event of state.race.events) {
      if (event.type !== 'checkpoint' && event.type !== 'lap') continue;
      const vehicle = state.race.vehicles.find((candidate) => candidate.id === event.vehicleId);
      if (!vehicle || vehicle.finished || vehicle.item !== null || vehicle.itemCooldown > 0) continue;
      const place = raceResults(state.race).find((result) => result.vehicleId === vehicle.id)?.place ?? 1;
      state.race = grantRaceItem(state.race, vehicle.id, place);
    }
    return;
  }
  if (state.kind === 'brawler') {
    const inputs = new Map(Object.entries(state.brawlerInputs).map(([pid, input]) => [Number(pid), input]));
    for (const fighter of state.brawler.fighters) {
      if (state.botPids.includes(fighter.id)) inputs.set(fighter.id, botBrawlerInput(state.brawler, fighter));
    }
    stepBrawler(state.brawler, inputs);
    return;
  }
  if (state.kind === 'town_rts') {
    stepRtsCampaign(state.rts);
  }
}

export function arcadeFinished(state: ArcadeState): boolean {
  if (state.kind === 'racing') return state.race.finished;
  if (state.kind === 'brawler') {
    return state.brawler.winner !== null || state.brawler.fighters.every((fighter) => !fighter.alive);
  }
  if (state.kind === 'town_rts') return state.rts.objective === 'won' || state.rts.objective === 'lost';
  return false;
}

export function arcadeWinnerPids(state: ArcadeState): number[] {
  if (state.kind === 'racing') {
    const winnerId = raceResults(state.race)[0]?.vehicleId;
    const winner = state.race.vehicles.find((vehicle) => vehicle.id === winnerId);
    return winner ? [winner.playerId] : [];
  }
  if (state.kind === 'brawler') {
    if (state.brawler.winner !== null) return [state.brawler.winner];
    if (state.brawler.fighters.every((fighter) => !fighter.alive)) {
      return state.brawler.fighters.map((fighter) => fighter.id);
    }
    return [];
  }
  if (state.kind === 'town_rts' && state.rts.objective === 'won') return [state.rts.ownerId];
  return [];
}

/**
 * Resolve placement/KO scores at the adapter boundary. The generic session
 * deliberately does not know game rules, but it owns the compact player score
 * field that the lobby and reward UI consume.
 */
export function arcadeScores(state: ArcadeState): ArcadeScores {
  const scores = new Map<number, number>();
  if (state.kind === 'racing') {
    const points = [400, 300, 200, 100];
    for (const result of raceResults(state.race)) {
      const vehicle = state.race.vehicles.find((candidate) => candidate.id === result.vehicleId);
      if (vehicle) scores.set(vehicle.playerId, points[result.place - 1] ?? 0);
    }
    return scores;
  }
  if (state.kind === 'brawler') {
    for (const fighter of state.brawler.fighters) scores.set(fighter.id, fighter.score);
  }
  return scores;
}

export function cloneArcadeState(state: ArcadeState): ArcadeState {
  return structuredClone(state) as ArcadeState;
}

export function arcadeWire(state: ArcadeState | null): ArcadeWireState | null {
  if (!state) return null;
  if (state.kind === 'racing') {
    return {
      version: ARCADE_STATE_VERSION,
      kind: state.kind,
      race: {
        track: state.race.track,
        seed: state.race.seed,
        tick: state.race.tick,
        vehicles: state.race.vehicles.map((vehicle) => ({ ...vehicle })),
        events: state.race.events.map((event) => ({ ...event })),
        finished: state.race.finished,
        itemHistory: { ...state.race.itemHistory },
      },
    };
  }
  if (state.kind === 'brawler') {
    return {
      version: ARCADE_STATE_VERSION,
      kind: state.kind,
      brawler: {
        ...state.brawler,
        fighters: state.brawler.fighters.map((fighter) => ({ ...fighter })),
        platforms: state.brawler.platforms.map((platform) => ({ ...platform })),
      },
    };
  }
  if (state.kind === 'town_rts') {
    return {
      version: ARCADE_STATE_VERSION,
      kind: state.kind,
      rts: {
        ...state.rts,
        acl: state.rts.acl.map((entry) => ({ ...entry })),
        structures: state.rts.structures.map((structure) => ({ ...structure, cell: { ...structure.cell } })),
        units: state.rts.units.map((unit) => ({ ...unit, cell: { ...unit.cell } })),
      },
    };
  }
  return {
    version: ARCADE_STATE_VERSION,
    kind: state.kind,
    housing: {
      ...state.housing,
      acl: { ...state.housing.acl },
      pieces: state.housing.pieces.map((piece) => ({ ...piece, cell: { ...piece.cell } })),
    },
  };
}
