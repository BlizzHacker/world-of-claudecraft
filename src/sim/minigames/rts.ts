export const RTS_VERSION = 'town-rts-v1';
export const RTS_REALM = 'cryptic';
export const RTS_PILOT_TOWNS = ['eastbrook', 'highwatch'] as const;

export type RtsTown = (typeof RTS_PILOT_TOWNS)[number];
export type RtsRole = 'owner' | 'builder' | 'commander' | 'spectator';
export type RtsStructureKind = 'town_hall' | 'wall' | 'farm' | 'barracks' | 'tower';
export type RtsUnitKind = 'worker' | 'guard' | 'ranger';

const STRUCTURE_KINDS: readonly RtsStructureKind[] = ['town_hall', 'wall', 'farm', 'barracks', 'tower'];
const UNIT_KINDS: readonly RtsUnitKind[] = ['worker', 'guard', 'ranger'];

export interface RtsAclEntry {
  playerId: number;
  role: RtsRole;
}

export interface RtsCell {
  x: number;
  z: number;
}

export interface RtsStructure {
  id: number;
  kind: RtsStructureKind;
  cell: RtsCell;
  hp: number;
  maxHp: number;
}

export interface RtsUnit {
  id: number;
  ownerId: number;
  kind: RtsUnitKind;
  cell: RtsCell;
  hp: number;
  targetId: number | null;
}

export interface RtsCampaign {
  version: string;
  realm: string;
  town: RtsTown;
  ownerId: number;
  acl: RtsAclEntry[];
  tick: number;
  resources: number;
  nextId: number;
  structures: RtsStructure[];
  units: RtsUnit[];
  objective: 'build' | 'defend' | 'won' | 'lost';
}

const STRUCTURE_COST: Record<RtsStructureKind, number> = {
  town_hall: 0,
  wall: 20,
  farm: 40,
  barracks: 70,
  tower: 90,
};

const STRUCTURE_HP: Record<RtsStructureKind, number> = {
  town_hall: 1000,
  wall: 260,
  farm: 220,
  barracks: 420,
  tower: 300,
};

const UNIT_COST: Record<RtsUnitKind, number> = { worker: 0, guard: 35, ranger: 45 };

export function createRtsCampaign(ownerId: number, town: RtsTown = 'eastbrook'): RtsCampaign {
  return {
    version: RTS_VERSION,
    realm: RTS_REALM,
    town,
    ownerId,
    acl: [{ playerId: ownerId, role: 'owner' }],
    tick: 0,
    resources: 180,
    nextId: 2,
    structures: [{ id: 1, kind: 'town_hall', cell: { x: 0, z: 0 }, hp: 1000, maxHp: 1000 }],
    units: [{ id: 2, ownerId, kind: 'worker', cell: { x: 1, z: 0 }, hp: 100, targetId: null }],
    objective: 'build',
  };
}

export function rtsRole(campaign: RtsCampaign, playerId: number): RtsRole | null {
  return campaign.acl.find((entry) => entry.playerId === playerId)?.role ?? null;
}

export function canCommand(campaign: RtsCampaign, playerId: number): boolean {
  const role = rtsRole(campaign, playerId);
  return role === 'owner' || role === 'builder' || role === 'commander';
}

export function addRtsAcl(
  campaign: RtsCampaign,
  actorId: number,
  playerId: number,
  role: RtsRole,
): boolean {
  if (
    rtsRole(campaign, actorId) !== 'owner' ||
    !Number.isInteger(playerId) ||
    playerId <= 0 ||
    playerId === campaign.ownerId ||
    role === 'owner'
  )
    return false;
  const existing = campaign.acl.find((entry) => entry.playerId === playerId);
  if (existing) existing.role = role;
  else campaign.acl.push({ playerId, role });
  campaign.acl.sort((a, b) => a.playerId - b.playerId);
  return true;
}

export function buildRtsStructure(
  campaign: RtsCampaign,
  playerId: number,
  kind: RtsStructureKind,
  cell: RtsCell,
): boolean {
  if (
    !canCommand(campaign, playerId) ||
    !STRUCTURE_KINDS.includes(kind) ||
    !Number.isInteger(cell.x) ||
    !Number.isInteger(cell.z) ||
    Math.abs(cell.x) > 8 ||
    Math.abs(cell.z) > 8 ||
    campaign.structures.some(
      (structure) => structure.cell.x === cell.x && structure.cell.z === cell.z,
    )
  )
    return false;
  const cost = STRUCTURE_COST[kind];
  if (campaign.resources < cost) return false;
  campaign.resources -= cost;
  const hp = STRUCTURE_HP[kind];
  campaign.structures.push({ id: campaign.nextId++, kind, cell: { ...cell }, hp, maxHp: hp });
  return true;
}

export function trainRtsUnit(campaign: RtsCampaign, playerId: number, kind: RtsUnitKind): boolean {
  if (!canCommand(campaign, playerId) || !UNIT_KINDS.includes(kind)) return false;
  const cost = UNIT_COST[kind];
  if (campaign.resources < cost) return false;
  campaign.resources -= cost;
  campaign.units.push({
    id: campaign.nextId++,
    ownerId: playerId,
    kind,
    cell: { x: 1, z: 1 },
    hp: 100,
    targetId: null,
  });
  return true;
}

export function stepRtsCampaign(campaign: RtsCampaign, ticks = 1): void {
  for (let i = 0; i < ticks; i += 1) {
    if (campaign.objective === 'won' || campaign.objective === 'lost') continue;
    campaign.tick += 1;
    campaign.resources += campaign.structures.filter(
      (structure) => structure.kind === 'farm',
    ).length;
    if (
      campaign.structures.some((structure) => structure.kind === 'barracks') &&
      campaign.units.length < 8
    ) {
      campaign.resources += 1;
    }
    const hall = campaign.structures.find((structure) => structure.kind === 'town_hall');
    if (!hall || hall.hp <= 0) campaign.objective = 'lost';
    else if (campaign.tick >= 20 && campaign.structures.length >= 4) campaign.objective = 'won';
  }
}

export function rtsPath(
  start: RtsCell,
  goal: RtsCell,
  blocked: ReadonlySet<string>,
  limit = 128,
): RtsCell[] {
  const key = (cell: RtsCell): string => `${cell.x},${cell.z}`;
  const queue: RtsCell[] = [{ ...start }];
  const cameFrom = new Map<string, string | null>([[key(start), null]]);
  while (queue.length > 0 && cameFrom.size <= limit) {
    const current = queue.shift() as RtsCell;
    if (current.x === goal.x && current.z === goal.z) {
      const path: RtsCell[] = [];
      let cursor: string | null = key(current);
      while (cursor !== null) {
        const [x, z] = cursor.split(',').map(Number);
        path.unshift({ x, z });
        cursor = cameFrom.get(cursor) ?? null;
      }
      return path;
    }
    for (const next of [
      { x: current.x + 1, z: current.z },
      { x: current.x - 1, z: current.z },
      { x: current.x, z: current.z + 1 },
      { x: current.x, z: current.z - 1 },
    ]) {
      const nextKey = key(next);
      if (blocked.has(nextKey) || cameFrom.has(nextKey)) continue;
      cameFrom.set(nextKey, key(current));
      queue.push(next);
    }
  }
  return [];
}

/** Return a detached, JSON-safe campaign snapshot for persistence adapters. */
export function cloneRtsCampaign(campaign: RtsCampaign): RtsCampaign {
  return structuredClone(campaign) as RtsCampaign;
}

/**
 * Validate and detach a persisted campaign. World-state JSON is external to
 * the deterministic sim, so malformed or stale rows must fail closed rather
 * than poisoning the next town session.
 */
export function deserializeRtsCampaign(value: unknown): RtsCampaign | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (input.version !== RTS_VERSION || input.realm !== RTS_REALM) return null;
  if (!RTS_PILOT_TOWNS.includes(input.town as RtsTown)) return null;
  if (!Number.isInteger(input.ownerId) || Number(input.ownerId) <= 0) return null;
  if (!Number.isInteger(input.tick) || Number(input.tick) < 0) return null;
  if (typeof input.resources !== 'number' || !Number.isFinite(input.resources) || input.resources < 0) return null;
  if (!Number.isInteger(input.nextId) || Number(input.nextId) <= 0) return null;
  if (!Array.isArray(input.acl) || !Array.isArray(input.structures) || !Array.isArray(input.units)) return null;
  if (input.objective !== 'build' && input.objective !== 'defend' && input.objective !== 'won' && input.objective !== 'lost') return null;
  const acl = input.acl.flatMap((entry): RtsAclEntry[] => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    if (!Number.isInteger(row.playerId) || Number(row.playerId) <= 0) return [];
    if (row.role !== 'owner' && row.role !== 'builder' && row.role !== 'commander' && row.role !== 'spectator') return [];
    return [{ playerId: Number(row.playerId), role: row.role }];
  });
  if (acl.length !== input.acl.length || !acl.some((entry) => entry.playerId === input.ownerId && entry.role === 'owner')) return null;
  const cell = (value: unknown): RtsCell | null => {
    if (!value || typeof value !== 'object') return null;
    const row = value as Record<string, unknown>;
    if (!Number.isInteger(row.x) || !Number.isInteger(row.z) || Math.abs(Number(row.x)) > 8 || Math.abs(Number(row.z)) > 8) return null;
    return { x: Number(row.x), z: Number(row.z) };
  };
  const structures = input.structures.flatMap((entry): RtsStructure[] => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    const position = cell(row.cell);
    if (!position || !Number.isInteger(row.id) || Number(row.id) <= 0 || !STRUCTURE_KINDS.includes(row.kind as RtsStructureKind)) return [];
    if (typeof row.hp !== 'number' || !Number.isFinite(row.hp) || typeof row.maxHp !== 'number' || !Number.isFinite(row.maxHp) || row.maxHp <= 0 || row.hp > row.maxHp) return [];
    return [{ id: Number(row.id), kind: row.kind as RtsStructureKind, cell: position, hp: row.hp, maxHp: row.maxHp }];
  });
  if (structures.length !== input.structures.length) return null;
  const units = input.units.flatMap((entry): RtsUnit[] => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as Record<string, unknown>;
    const position = cell(row.cell);
    if (!position || !Number.isInteger(row.id) || Number(row.id) <= 0 || !Number.isInteger(row.ownerId) || Number(row.ownerId) <= 0 || !UNIT_KINDS.includes(row.kind as RtsUnitKind)) return [];
    if (typeof row.hp !== 'number' || !Number.isFinite(row.hp) || row.hp < 0) return [];
    if (row.targetId !== null && !Number.isInteger(row.targetId)) return [];
    return [{ id: Number(row.id), ownerId: Number(row.ownerId), kind: row.kind as RtsUnitKind, cell: position, hp: row.hp, targetId: row.targetId as number | null }];
  });
  if (units.length !== input.units.length) return null;
  return {
    version: RTS_VERSION,
    realm: RTS_REALM,
    town: input.town as RtsTown,
    ownerId: Number(input.ownerId),
    acl,
    tick: Number(input.tick),
    resources: input.resources,
    nextId: Number(input.nextId),
    structures,
    units,
    objective: input.objective,
  };
}
