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
