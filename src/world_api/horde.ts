// IWorldHorde: The Dead Road live horde-defense facet. The event is fought by
// real mobs and real defenders in the town itself (src/sim/social/horde.ts);
// this facet carries the alarm/fortify commands and the wave readout only.
// Layer-agnostic: no sim imports, no t(), no DOM (tests/architecture.test.ts).

export type HordePhase = 'idle' | 'prep' | 'wave' | 'intermission' | 'over';

export interface HordeInfo {
  phase: HordePhase;
  /** Whole seconds to the next wave (prep/intermission), 0 during a wave. */
  countdown: number;
  wave: number; // current/last wave, 1-based (0 before wave 1)
  waves: number; // total waves to survive
  wards: number; // town lives remaining
  zombiesLeft: number; // live wave mobs on the road
  kills: number; // event kill count
  won: boolean; // set once the event settles
  fortifyCostCopper: number;
  /** Built watch posts (count, levels) for the board readout. */
  posts: { level: number }[];
  buildCostCopper: number;
}

export interface IWorldHorde {
  /** Presentation snapshot; null far from town while nothing is happening. */
  hordeInfo: HordeInfo | null;
  /** Sound the alarm at the town defense board (starts the event). */
  hordeStart(): void;
  /** Spend copper between waves: +1 ward and the hired line is healed. */
  hordeFortify(): void;
  /** Build the next watch post / upgrade the weakest (prep+intermission). */
  hordeBuild(): void;
}
