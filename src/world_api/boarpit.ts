// IWorldBoarpit: the Boarpit knockout-brawl facet. Bouts are fought by real
// player entities at the physical stake ring north-east of Eastbrook
// (src/sim/boarpit_layout.ts); this facet carries the signup commands and the
// presentation snapshot only. Layer-agnostic: no sim imports, no t(), no DOM
// (guarded by tests/architecture.test.ts).

export type PitPhase = 'countdown' | 'fighting' | 'over';

export interface PitFighterInfo {
  pid: number;
  name: string;
  me: boolean;
  out: boolean; // KO'd, dead, or deserted
  deserted: boolean;
}

export interface PitBoutInfo {
  id: number;
  phase: PitPhase;
  // whole seconds: countdown = time to FIGHT!, over = time until home; 0 live.
  countdown: number;
  elapsed: number; // whole seconds since the bell
  fighters: PitFighterInfo[];
  mySeat: boolean;
  winnerPid: number | null; // set once the bout is decided
}

export interface PitInfo {
  queued: number; // fighters on the card with the Pit Master
  myQueued: boolean;
  bout: PitBoutInfo | null;
}

export interface IWorldBoarpit {
  /** Presentation snapshot; null far from the pit with nothing queued. */
  pitInfo: PitInfo | null;
  pitQueueJoin(): void;
  pitQueueLeave(): void;
}
