import type {
  ArcadeState,
  ArcadeWireState,
  MinigameFeatureId,
  MinigameFeatureStatus,
  MinigameSessionState,
  TowerKind,
  ZombieDefenseSessionState,
} from '../sim/minigames';
import type { BrawlerInput } from '../sim/minigames/brawler';
import type { HousingPiece } from '../sim/minigames/housing';
import type { RaceInput } from '../sim/racing';
import type { RtsStructureKind, RtsUnitKind } from '../sim/minigames/rts';

/** Read-only rollout state shared by offline and online presentation layers.
 * Gameplay commands and authoritative session snapshots land behind this seam
 * only after their dedicated wire and persistence checkpoints pass. */
export interface IWorldMinigames {
  minigameFeatures: readonly MinigameFeatureStatus[];
  /** Authoritative session roster/state, or null when the player is not enrolled. */
  minigameSession: MinigameSessionState | null;
  /** Mode state for racing, brawler, town RTS, or housing preview sessions. */
  minigameArcadeState: ArcadeWireState | ArcadeState | null;
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
  minigameRaceInput(input: RaceInput): void;
  minigameBrawlerInput(input: BrawlerInput): void;
  minigameRtsBuild(kind: RtsStructureKind, x: number, z: number): void;
  minigameRtsTrain(kind: RtsUnitKind): void;
  minigameHousingPlace(piece: HousingPiece): void;
}
