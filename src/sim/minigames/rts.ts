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
