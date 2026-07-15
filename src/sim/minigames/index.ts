// Bounded minigame domains. These are host-agnostic and intentionally default-off
// until their IWorld, server wire, persistence, and dedicated QA checkpoints land.

export { createRaceSession, defaultRaceTrack, stepRace } from '../racing';
export { BRAWLER_VERSION, createBrawlerState, stepBrawler } from './brawler';
export { createHousingLot, HOUSING_VERSION, placeHousingPiece } from './housing';
export { createRtsCampaign, RTS_VERSION, stepRtsCampaign } from './rts';
export { createZombieDefense, stepZombieDefense, ZOMBIE_DEFENSE_VERSION } from './zombie_defense';
export {
  abortMinigameSession,
  claimMinigameReward,
  createMinigameSession,
  finishMinigameSession,
  joinMinigameSession,
  MINIGAME_COUNTDOWN_SECONDS,
  MINIGAME_SESSION_VERSION,
  setMinigameConnection,
  setMinigameReady,
  stepMinigameSession,
} from './session';
export type {
  MinigameSessionPhase,
  MinigameSessionPlayer,
  MinigameSessionState,
  SessionMutation,
} from './session';

export type MinigameFeatureId = 'racing' | 'brawler' | 'town_rts' | 'zombie_defense' | 'housing';

export interface MinigameFeatureStatus {
  id: MinigameFeatureId;
  enabled: boolean;
  checkpoint: string;
}

export const MINIGAME_FEATURES: readonly MinigameFeatureStatus[] = [
  { id: 'racing', enabled: false, checkpoint: 'phase-33-racing-qa' },
  { id: 'brawler', enabled: false, checkpoint: 'phase-36-brawler-qa' },
  { id: 'town_rts', enabled: false, checkpoint: 'phase-39-rts-qa' },
  { id: 'zombie_defense', enabled: false, checkpoint: 'phase-41-zombie-qa' },
  { id: 'housing', enabled: false, checkpoint: 'phase-44-housing-qa' },
];

export function minigameEnabled(id: MinigameFeatureId): boolean {
  return MINIGAME_FEATURES.some((feature) => feature.id === id && feature.enabled);
}
