import type { MinigameFeatureStatus } from '../sim/minigames';

/** Read-only rollout state shared by offline and online presentation layers.
 * Gameplay commands and authoritative session snapshots land behind this seam
 * only after their dedicated wire and persistence checkpoints pass. */
export interface IWorldMinigames {
  minigameFeatures: readonly MinigameFeatureStatus[];
}
