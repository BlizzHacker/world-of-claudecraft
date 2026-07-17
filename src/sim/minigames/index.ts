// Bounded minigame domains. Modes only become active after their host, wire,
// persistence, and dedicated QA checkpoints land. The rollout table below is
// the single source shared by offline Sim and the online server.

export { createRaceSession, defaultRaceTrack, stepRace } from '../racing';
export {
  ARCADE_STATE_VERSION,
  ARCADE_RACE_TIMEOUT_TICKS,
  addArcadePlayer,
  arcadeWire,
  arcadeFinished,
  arcadeKindSupported,
  arcadeScores,
  arcadeWinnerPids,
  buildArcadeRts,
  cloneArcadeState,
  createArcadeState,
  placeArcadeHousing,
  setArcadeBrawlerInput,
  setArcadeRaceInput,
  stepArcadeState,
  trainArcadeRts,
} from './arcade';
export type { ArcadeScores, ArcadeState, ArcadeWireState } from './arcade';
export { BRAWLER_VERSION, createBrawlerState, stepBrawler } from './brawler';
export {
  cloneHousingLot,
  createHousingLot,
  deserializeHousingLot,
  HOUSING_VERSION,
  placeHousingPiece,
} from './housing';
export type { HousingLot } from './housing';
export {
  cloneRtsCampaign,
  createRtsCampaign,
  deserializeRtsCampaign,
  RTS_VERSION,
  stepRtsCampaign,
} from './rts';
export type { RtsCampaign } from './rts';
export type {
  MinigameSessionPhase,
  MinigameSessionPlayer,
  MinigameSessionState,
  SessionMutation,
} from './session';
export {
  abortMinigameSession,
  claimMinigameReward,
  createMinigameSession,
  finishMinigameSession,
  joinMinigameSession,
  practiceBotPids,
  practiceMinigameCapacity,
  MINIGAME_COUNTDOWN_SECONDS,
  MINIGAME_SESSION_VERSION,
  setMinigameConnection,
  setMinigameReady,
  stepMinigameSession,
} from './session';
export { MINIGAME_BOT_PID_BASE } from './session';
export type { TowerKind, ZombieDefenseState } from './zombie_defense';
export {
  cloneZombieDefense,
  createZombieDefense,
  deserializeZombieDefense,
  stepZombieDefense,
  ZOMBIE_DEFENSE_VERSION,
} from './zombie_defense';
export type { ZombieDefenseSessionState } from './zombie_session';
export {
  buildZombieDefenseTower,
  createZombieDefenseSession,
  EASTBROOK_ZOMBIE_ROUTE,
  startZombieDefenseWave,
  stepZombieDefenseSession,
  ZOMBIE_SESSION_VERSION,
} from './zombie_session';

export type MinigameFeatureId = 'racing' | 'brawler' | 'town_rts' | 'zombie_defense' | 'housing';

export interface MinigameFeatureStatus {
  id: MinigameFeatureId;
  enabled: boolean;
  /** Implemented locally behind the rollout table; preview marks staged modes. */
  preview?: boolean;
  checkpoint: string;
}

export const MINIGAME_FEATURES: readonly MinigameFeatureStatus[] = [
  { id: 'racing', enabled: true, checkpoint: 'phase-06-racing-qa' },
  { id: 'brawler', enabled: true, checkpoint: 'phase-06-brawler-qa' },
  { id: 'town_rts', enabled: true, checkpoint: 'phase-04-rts-qa' },
  { id: 'zombie_defense', enabled: true, checkpoint: 'phase-04-zombie-qa' },
  { id: 'housing', enabled: true, checkpoint: 'phase-05-housing-qa' },
];

export function minigameEnabled(id: MinigameFeatureId): boolean {
  return MINIGAME_FEATURES.some((feature) => feature.id === id && feature.enabled);
}

export function minigameAvailable(id: MinigameFeatureId, includePreview = false): boolean {
  return MINIGAME_FEATURES.some(
    (feature) => feature.id === id && (feature.enabled || (includePreview && feature.preview)),
  );
}
