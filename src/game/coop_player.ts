// Couch co-op player handles: the thin adapter that lets one co-op slot drive
// either a local player in the shared offline Sim (a pid) or a secondary online
// session (its own ClientWorld). The CoopManager talks only to this interface,
// so the orchestration is identical offline and online and unit-tests against a
// fake handle.
//
// Movement is twin-stick: the pad's stick direction becomes a WORLD facing
// (computed by the manager from the shared camera yaw) and the player simply
// runs forward along it, exactly how main.ts already streams a mouselook facing
// for Player 1. Idle is `applyMove(null, jump)`.

import type { PlayerClass } from '../sim/types';

/** The minimum the camera framing and the respawn scheduler read each frame. */
export interface CoopEntitySnapshot {
  x: number;
  y: number;
  z: number;
  dead: boolean;
  ghost: boolean;
}

export interface CoopPlayer {
  readonly cls: PlayerClass;
  /** Current body snapshot, or null once the player has been removed. */
  entity(): CoopEntitySnapshot | null;
  /** Run forward along `worldFacing` (radians); null = stand still. */
  applyMove(worldFacing: number | null, jump: boolean): void;
  castSlot(slot: number): void;
  tabTarget(): void;
  interact(): void;
  releaseSpirit(): void;
  resurrectAtSpiritHealer(): void;
  /** Rejoin the party (offline: teleport beside P1; online: a no-op prompt). */
  regroup(): void;
  /** Leave co-op: drop the local player / close the secondary session. */
  remove(): void;
}

// --- Offline: a pid in the one shared Sim -------------------------------------

/** The slice of Sim the offline handle needs (kept narrow for testability). */
export interface CoopOfflineSim {
  entities: Map<number, { pos: { x: number; y: number; z: number }; dead: boolean; ghost: boolean; facing: number }>;
  players: Map<number, { moveInput: { forward: boolean; back: boolean; strafeLeft: boolean; strafeRight: boolean; jump: boolean } }>;
  castAbilityBySlot(slot: number, pid?: number): void;
  tabTarget(pid?: number): void;
  interact(pid?: number): void;
  releaseSpirit(pid?: number): void;
  resurrectAtSpiritHealer(pid?: number): void;
  removePlayer(pid: number): void;
  movePlayerNear(pid: number, anchorPid: number): boolean;
}

export class OfflineCoopPlayer implements CoopPlayer {
  constructor(
    private readonly sim: CoopOfflineSim,
    readonly pid: number,
    readonly cls: PlayerClass,
    private readonly primaryPid: number,
  ) {}

  entity(): CoopEntitySnapshot | null {
    const e = this.sim.entities.get(this.pid);
    if (!e) return null;
    return { x: e.pos.x, y: e.pos.y, z: e.pos.z, dead: e.dead, ghost: e.ghost };
  }

  applyMove(worldFacing: number | null, jump: boolean): void {
    const meta = this.sim.players.get(this.pid);
    const e = this.sim.entities.get(this.pid);
    if (!meta || !e) return;
    const mi = meta.moveInput;
    mi.back = false;
    mi.strafeLeft = false;
    mi.strafeRight = false;
    if (worldFacing !== null) {
      mi.forward = true;
      e.facing = worldFacing;
    } else {
      mi.forward = false;
    }
    mi.jump = jump;
  }

  castSlot(slot: number): void {
    this.sim.castAbilityBySlot(slot, this.pid);
  }
  tabTarget(): void {
    this.sim.tabTarget(this.pid);
  }
  interact(): void {
    this.sim.interact(this.pid);
  }
  releaseSpirit(): void {
    this.sim.releaseSpirit(this.pid);
  }
  resurrectAtSpiritHealer(): void {
    this.sim.resurrectAtSpiritHealer(this.pid);
  }
  regroup(): void {
    this.sim.movePlayerNear(this.pid, this.primaryPid);
  }
  remove(): void {
    this.sim.removePlayer(this.pid);
  }
}

// --- Online: a secondary ClientWorld session ---------------------------------

/** The slice of ClientWorld the online handle needs. */
export interface CoopOnlineSession {
  player: { pos: { x: number; y: number; z: number }; dead: boolean; ghost: boolean };
  setMoveInput(input: unknown, facing?: unknown): void;
  castAbilityBySlot(slot: number): void;
  tabTarget(): void;
  interact(): void;
  releaseSpirit(): void;
  resurrectAtSpiritHealer(): void;
  close(): void;
}

export class OnlineCoopPlayer implements CoopPlayer {
  constructor(
    private readonly session: CoopOnlineSession,
    readonly cls: PlayerClass,
    // Called on remove() so the host can drop this session from its list.
    private readonly onRemove: () => void,
  ) {}

  entity(): CoopEntitySnapshot | null {
    const p = this.session.player;
    // A secondary session before its first snapshot reports id -1 with a zero
    // body; the manager tolerates a null here (no camera contribution yet).
    if (!p) return null;
    return { x: p.pos.x, y: p.pos.y, z: p.pos.z, dead: p.dead, ghost: p.ghost };
  }

  applyMove(worldFacing: number | null, jump: boolean): void {
    if (worldFacing !== null) {
      this.session.setMoveInput({ forward: true, jump }, worldFacing);
    } else {
      this.session.setMoveInput({ jump });
    }
  }

  castSlot(slot: number): void {
    this.session.castAbilityBySlot(slot);
  }
  tabTarget(): void {
    this.session.tabTarget();
  }
  interact(): void {
    this.session.interact();
  }
  releaseSpirit(): void {
    this.session.releaseSpirit();
  }
  resurrectAtSpiritHealer(): void {
    this.session.resurrectAtSpiritHealer();
  }
  regroup(): void {
    // Online we cannot teleport a character; the soft leash already keeps the
    // player inside the shared camera, and the spirit healer resurrect returns
    // them in place. Nothing to do here in v1.
  }
  remove(): void {
    this.session.close();
    this.onRemove();
  }
}
