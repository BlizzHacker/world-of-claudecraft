export const HOUSING_VERSION = 'housing-v1';
export type HousingRole = 'owner' | 'builder' | 'visitor';
const HOUSING_PIECE_KINDS = new Set(['floor', 'wall', 'door', 'roof', 'decoration']);
export interface HousingCell {
  x: number;
  z: number;
}
export interface HousingPiece {
  id: string;
  kind: string;
  cell: HousingCell;
  rotation: 0 | 90 | 180 | 270;
}
export interface HousingLot {
  version: string;
  realm: string;
  town: string;
  ownerId: number;
  acl: Record<number, HousingRole>;
  pieces: HousingPiece[];
  deletedAtTick: number | null;
  revision: number;
}

export function createHousingLot(realm: string, town: string, ownerId: number): HousingLot {
  return {
    version: HOUSING_VERSION,
    realm,
    town,
    ownerId,
    acl: { [ownerId]: 'owner' },
    pieces: [],
    deletedAtTick: null,
    revision: 0,
  };
}

export function housingRole(lot: HousingLot, playerId: number): HousingRole | null {
  return lot.acl[playerId] ?? null;
}

export function canBuildHousing(lot: HousingLot, playerId: number): boolean {
  const role = housingRole(lot, playerId);
  return lot.deletedAtTick === null && (role === 'owner' || role === 'builder');
}

export function canVisitHousing(lot: HousingLot, playerId: number): boolean {
  return lot.deletedAtTick === null && housingRole(lot, playerId) !== null;
}

export function setHousingAccess(
  lot: HousingLot,
  ownerId: number,
  playerId: number,
  role: HousingRole,
): boolean {
  if (
    housingRole(lot, ownerId) !== 'owner' ||
    !Number.isInteger(playerId) ||
    playerId <= 0 ||
    playerId === lot.ownerId ||
    (role !== 'builder' && role !== 'visitor')
  )
    return false;
  lot.acl[playerId] = role;
  lot.revision += 1;
  return true;
}

export function placeHousingPiece(lot: HousingLot, playerId: number, piece: HousingPiece): boolean {
  if (
    !canBuildHousing(lot, playerId) ||
    !piece ||
    !piece.cell ||
    typeof piece.id !== 'string' ||
    piece.id.length < 1 ||
    piece.id.length > 64 ||
    !HOUSING_PIECE_KINDS.has(piece.kind) ||
    !Number.isInteger(piece.cell.x) ||
    !Number.isInteger(piece.cell.z) ||
    Math.abs(piece.cell.x) > 8 ||
    Math.abs(piece.cell.z) > 8 ||
    (piece.rotation !== 0 && piece.rotation !== 90 && piece.rotation !== 180 && piece.rotation !== 270) ||
    lot.pieces.some(
      (existing) => existing.cell.x === piece.cell.x && existing.cell.z === piece.cell.z,
    )
  )
    return false;
  lot.pieces.push({ ...piece, cell: { ...piece.cell } });
  lot.pieces.sort((a, b) => a.id.localeCompare(b.id));
  lot.revision += 1;
  return true;
}

export function scheduleHousingDeletion(lot: HousingLot, playerId: number, tick: number): boolean {
  if (housingRole(lot, playerId) !== 'owner' || lot.deletedAtTick !== null || tick < 0)
    return false;
  lot.deletedAtTick = tick;
  lot.revision += 1;
  return true;
}

export function restoreHousingLot(lot: HousingLot, playerId: number): boolean {
  if (housingRole(lot, playerId) !== 'owner' || lot.deletedAtTick === null) return false;
  lot.deletedAtTick = null;
  lot.revision += 1;
  return true;
}

/** Return a detached snapshot suitable for a world-state JSONB row. */
export function cloneHousingLot(lot: HousingLot): HousingLot {
  return structuredClone(lot) as HousingLot;
}

/** Validate and detach a persisted lot; reject corrupt or incompatible rows. */
export function deserializeHousingLot(value: unknown): HousingLot | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (input.version !== HOUSING_VERSION || typeof input.realm !== 'string' || typeof input.town !== 'string') return null;
  if (!Number.isInteger(input.ownerId) || Number(input.ownerId) <= 0 || !Number.isInteger(input.revision) || Number(input.revision) < 0) return null;
  if (input.deletedAtTick !== null && (!Number.isInteger(input.deletedAtTick) || Number(input.deletedAtTick) < 0)) return null;
  if (!input.acl || typeof input.acl !== 'object' || Array.isArray(input.acl) || !Array.isArray(input.pieces)) return null;
  const acl: Record<number, HousingRole> = {};
  for (const [rawId, rawRole] of Object.entries(input.acl as Record<string, unknown>)) {
    const playerId = Number(rawId);
    if (!Number.isInteger(playerId) || playerId <= 0 || (rawRole !== 'owner' && rawRole !== 'builder' && rawRole !== 'visitor')) return null;
    acl[playerId] = rawRole;
  }
  const ownerId = Number(input.ownerId);
  if (acl[ownerId] !== 'owner') return null;
  const pieces = input.pieces.flatMap((value): HousingPiece[] => {
    if (!value || typeof value !== 'object') return [];
    const piece = value as Record<string, unknown>;
    const cell = piece.cell;
    if (!cell || typeof cell !== 'object') return [];
    const position = cell as Record<string, unknown>;
    if (typeof piece.id !== 'string' || piece.id.length < 1 || piece.id.length > 64 || typeof piece.kind !== 'string' || !HOUSING_PIECE_KINDS.has(piece.kind) || !Number.isInteger(position.x) || !Number.isInteger(position.z) || Math.abs(Number(position.x)) > 8 || Math.abs(Number(position.z)) > 8 || (piece.rotation !== 0 && piece.rotation !== 90 && piece.rotation !== 180 && piece.rotation !== 270)) return [];
    return [{ id: piece.id, kind: piece.kind, cell: { x: Number(position.x), z: Number(position.z) }, rotation: piece.rotation }];
  });
  if (pieces.length !== input.pieces.length || new Set(pieces.map((piece) => `${piece.cell.x},${piece.cell.z}`)).size !== pieces.length) return null;
  return { version: HOUSING_VERSION, realm: input.realm, town: input.town, ownerId, acl, pieces, deletedAtTick: input.deletedAtTick as number | null, revision: Number(input.revision) };
}
