// IWorldSkirmish: the Warcamp Skirmish facet — the C&C-style battle fought
// with real entities on an instanced field past the rim
// (src/sim/social/skirmish.ts). Commands + readout only. Layer-agnostic: no
// sim imports, no t(), no DOM (tests/architecture.test.ts).

export type SkirmishPhase = 'muster' | 'battle' | 'over';

export interface SkirmishSeatInfo {
  wood: number;
  stone: number;
  footmen: number;
  towers: number;
  hasBarracks: boolean;
  tentAlive: boolean;
  out: boolean;
}

export interface SkirmishInfo {
  queued: number;
  myQueued: boolean;
  phase: SkirmishPhase | null; // null while only queued
  wave: number;
  won: boolean;
  seat: SkirmishSeatInfo | null;
  costs: {
    barracks: { wood: number; stone: number };
    watchtower: { wood: number; stone: number };
    footman: { wood: number; stone: number };
  };
}

export interface IWorldSkirmish {
  /** Presentation snapshot; null when neither queued nor seated. */
  skirmishInfo: SkirmishInfo | null;
  skirmishQueueJoin(): void;
  skirmishQueueLeave(): void;
  /** Order the camp builder onto the nearest node of this kind. */
  skirmishGather(kind: 'wood' | 'stone'): void;
  skirmishBuild(kind: 'barracks' | 'watchtower'): void;
  skirmishTrain(): void;
  /** March the footmen to a field-relative point. */
  skirmishRally(x: number, z: number): void;
}
