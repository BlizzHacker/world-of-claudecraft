import {
  buildDefenseTower,
  createZombieDefense,
  startZombieWave,
  stepZombieDefense,
  type TowerKind,
  type ZombieDefenseState,
  type ZombieRouteCell,
} from './zombie_defense';

export const ZOMBIE_SESSION_VERSION = 'zombie-session-v1';

/**
 * Eastbrook's first strategy board. Coordinates are local board cells, not
 * world coordinates, so the same deterministic match can run offline, on the
 * authoritative server, and in a future isolated practice instance.
 */
export const EASTBROOK_ZOMBIE_ROUTE: readonly ZombieRouteCell[] = [
  { x: -6, z: 0 },
  { x: -5, z: 0 },
  { x: -4, z: 0 },
  { x: -3, z: 0 },
  { x: -2, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 0 },
  { x: 1, z: 0 },
  { x: 2, z: 0 },
  { x: 3, z: 0 },
  { x: 4, z: 0 },
  { x: 5, z: 0 },
  { x: 6, z: 0 },
];

export interface ZombieDefenseSessionState {
  version: typeof ZOMBIE_SESSION_VERSION;
  sessionId: number;
  state: ZombieDefenseState;
}

export function createZombieDefenseSession(
  sessionId: number,
  seed: number,
): ZombieDefenseSessionState {
  return {
    version: ZOMBIE_SESSION_VERSION,
    sessionId,
    state: createZombieDefense(seed, EASTBROOK_ZOMBIE_ROUTE),
  };
}

function validPlayer(playerId: number, participants?: readonly number[]): boolean {
  return (
    Number.isInteger(playerId) && playerId > 0 && (!participants || participants.includes(playerId))
  );
}

export function startZombieDefenseWave(
  session: ZombieDefenseSessionState,
  playerId: number,
  participants?: readonly number[],
): boolean {
  if (!validPlayer(playerId, participants) || session.state.status !== 'ready')
    return false;
  startZombieWave(session.state);
  return (session.state.status as ZombieDefenseState['status']) === 'active';
}

export function buildZombieDefenseTower(
  session: ZombieDefenseSessionState,
  playerId: number,
  kind: TowerKind,
  cell: ZombieRouteCell,
  participants?: readonly number[],
): boolean {
  if (!validPlayer(playerId, participants)) return false;
  if (!Number.isInteger(cell.x) || !Number.isInteger(cell.z)) return false;
  if (Math.abs(cell.x) > 8 || Math.abs(cell.z) > 8) return false;
  return buildDefenseTower(session.state, playerId, kind, cell);
}

export function stepZombieDefenseSession(session: ZombieDefenseSessionState): void {
  if (session.state.status === 'active') stepZombieDefense(session.state, 1);
}
