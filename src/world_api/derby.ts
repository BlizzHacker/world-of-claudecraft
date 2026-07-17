// IWorldDerby: the Thornwheel Derby mine-kart racing facet. The race is run by
// real player entities on the physical circuit east of Boar Meadow
// (src/sim/derby_layout.ts); this facet carries the queue commands and the
// presentation snapshot only. Layer-agnostic: type-only sim imports, no t(),
// no DOM (guarded by tests/architecture.test.ts).

export type DerbyPhase = 'grid' | 'racing' | 'over';

// One racer's line on the tote board.
export interface DerbyRacerInfo {
  pid: number;
  name: string;
  me: boolean;
  lap: number; // current lap, 1-based while racing
  cp: number; // next checkpoint index the racer must take (0..cps-1)
  place: number; // live standing, 1-based (finish order once finished)
  finished: boolean;
  time: number | null; // whole seconds from green flag to finish, once finished
  deserted: boolean; // left the vale / logged out mid-race
}

// The race at the circuit as one viewer sees it (walk-up spectators included).
export interface DerbyRaceInfo {
  id: number;
  phase: DerbyPhase;
  // whole seconds: grid = time to the green flag, over = time until riders are
  // returned to the paddock; 0 while racing.
  countdown: number;
  laps: number; // total laps in this race
  elapsed: number; // whole seconds since the green flag
  racers: DerbyRacerInfo[]; // sorted by live place
  mySeat: boolean; // I am racing (not just watching)
  // My next checkpoint ring, for the HUD arrow / rendered flag pulse.
  myNextCp: { x: number; z: number } | null;
}

export interface DerbyInfo {
  queued: number; // riders waiting with the Race Marshal
  myQueued: boolean;
  race: DerbyRaceInfo | null;
}

export interface IWorldDerby {
  /** Presentation snapshot; null far from the circuit with nothing queued. */
  derbyInfo: DerbyInfo | null;
  derbyQueueJoin(): void;
  derbyQueueLeave(): void;
}
