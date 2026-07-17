// Bounded minigame domains. These are host-agnostic and intentionally default-off
// until their IWorld, server wire, persistence, and dedicated QA checkpoints land.

export { createRaceSession, defaultRaceTrack, stepRace } from '../racing';
export {
  ARCADE_STATE_VERSION,
  addArcadePlayer,
  arcadeWire,
  arcadeFinished,
  arcadeKindSupported,
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
export type { ArcadeState, ArcadeWireState } from './arcade';
export { BRAWLER_VERSION, createBrawlerState, stepBrawler } from './brawler';
export { createHousingLot, HOUSING_VERSION, placeHousingPiece } from './housing';
export { createRtsCampaign, RTS_VERSION, stepRtsCampaign } from './rts';
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
export type { TowerKind } from './zombie_defense';
export { createZombieDefense, stepZombieDefense, ZOMBIE_DEFENSE_VERSION } from './zombie_defense';
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
  /** Implemented locally behind an explicit preview switch; not promoted. */
  preview?: boolean;
  checkpoint: string;
}

export const MINIGAME_FEATURES: readonly MinigameFeatureStatus[] = [
  { id: 'racing', enabled: false, preview: true, checkpoint: 'phase-33-racing-qa' },
  { id: 'brawler', enabled: false, preview: true, checkpoint: 'phase-36-brawler-qa' },
  { id: 'town_rts', enabled: false, preview: true, checkpoint: 'phase-39-rts-qa' },
  { id: 'zombie_defense', enabled: false, preview: true, checkpoint: 'phase-41-zombie-qa' },
  { id: 'housing', enabled: false, preview: true, checkpoint: 'phase-44-housing-qa' },
];

export function minigameEnabled(id: MinigameFeatureId): boolean {
  return MINIGAME_FEATURES.some((feature) => feature.id === id && feature.enabled);
}

export function minigameAvailable(id: MinigameFeatureId, includePreview = false): boolean {
  return MINIGAME_FEATURES.some(
    (feature) => feature.id === id && (feature.enabled || (includePreview && feature.preview)),
  );
}
