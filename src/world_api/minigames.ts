import type {
  MinigameFeatureId,
  MinigameFeatureStatus,
  MinigameSessionState,
  TowerKind,
  ZombieDefenseSessionState,
} from '../sim/minigames';

/** Read-only rollout state shared by offline and online presentation layers.
 * Gameplay commands and authoritative session snapshots land behind this seam
 * only after their dedicated wire and persistence checkpoints pass. */
export interface IWorldMinigames {
  minigameFeatures: readonly MinigameFeatureStatus[];
  /** Authoritative session roster/state, or null when the player is not enrolled. */
  minigameSession: MinigameSessionState | null;
  /** Authoritative Zombie Defense board state for the enrolled session. */
  minigameZombieState: ZombieDefenseSessionState | null;
  minigameCreate(kind: MinigameFeatureId, maxPlayers?: number): void;
  minigameJoin(sessionId: number, playerId?: number): void;
  minigameInvite(targetPlayerId: number): void;
  minigameReady(ready: boolean, playerId?: number): void;
  minigameAbort(): void;
  minigameClaim(): void;
  minigameZombieStart(playerId?: number): void;
  minigameZombieBuild(kind: TowerKind, x: number, z: number, playerId?: number): void;
}
