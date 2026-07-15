import { Rng } from '../rng';

export const ZOMBIE_DEFENSE_VERSION = 'zombie-defense-v1';
export type ZombieArchetype = 'shambler' | 'runner' | 'brute';
export type TowerKind = 'arrow' | 'slow' | 'cannon';

export interface ZombieRouteCell {
  x: number;
  z: number;
}
export interface Zombie {
  id: number;
  archetype: ZombieArchetype;
  routeIndex: number;
  hp: number;
  speed: number;
  blockedTicks: number;
}
export interface DefenseTower {
  id: number;
  kind: TowerKind;
  cell: ZombieRouteCell;
  cooldown: number;
  level: number;
}
export interface ZombieDefenseState {
  version: string;
  seed: number;
  tick: number;
  wave: number;
  lives: number;
  resources: number;
  route: ZombieRouteCell[];
  zombies: Zombie[];
  towers: DefenseTower[];
  nextId: number;
  status: 'ready' | 'active' | 'won' | 'lost';
}

const ARCHETYPE: Record<ZombieArchetype, { hp: number; speed: number; reward: number }> = {
  shambler: { hp: 40, speed: 0.045, reward: 5 },
  runner: { hp: 25, speed: 0.09, reward: 7 },
  brute: { hp: 180, speed: 0.025, reward: 18 },
};
const TOWER: Record<TowerKind, { range: number; damage: number; cooldown: number; cost: number }> =
  {
    arrow: { range: 4, damage: 10, cooldown: 4, cost: 35 },
    slow: { range: 3, damage: 4, cooldown: 5, cost: 50 },
    cannon: { range: 5, damage: 22, cooldown: 8, cost: 80 },
  };

export function createZombieDefense(
  seed: number,
  route: readonly ZombieRouteCell[],
): ZombieDefenseState {
  return {
    version: ZOMBIE_DEFENSE_VERSION,
    seed,
    tick: 0,
    wave: 0,
    lives: 10,
    resources: 120,
    route: route.map((cell) => ({ ...cell })),
    zombies: [],
    towers: [],
    nextId: 1,
    status: 'ready',
  };
}

export function startZombieWave(state: ZombieDefenseState): void {
  if (state.status === 'lost' || state.status === 'won' || state.route.length < 2) return;
  state.wave += 1;
  state.status = 'active';
  const rng = new Rng(state.seed + state.wave * 7919);
  const count = Math.min(30, 4 + state.wave * 2);
  for (let i = 0; i < count; i += 1) {
    const roll = rng.next();
    const archetype: ZombieArchetype =
      state.wave >= 5 && roll > 0.88 ? 'brute' : roll > 0.65 ? 'runner' : 'shambler';
    const stats = ARCHETYPE[archetype];
    state.zombies.push({
      id: state.nextId++,
      archetype,
      routeIndex: 0,
      hp: stats.hp + state.wave * 2,
      speed: stats.speed,
      blockedTicks: 0,
    });
  }
}

export function buildDefenseTower(
  state: ZombieDefenseState,
  playerId: number,
  kind: TowerKind,
  cell: ZombieRouteCell,
): boolean {
  if (
    playerId <= 0 ||
    state.status === 'lost' ||
    state.status === 'won' ||
    state.towers.some((tower) => tower.cell.x === cell.x && tower.cell.z === cell.z)
  )
    return false;
  const cost = TOWER[kind].cost;
  if (state.resources < cost) return false;
  state.resources -= cost;
  state.towers.push({ id: state.nextId++, kind, cell: { ...cell }, cooldown: 0, level: 1 });
  return true;
}

function distance(a: ZombieRouteCell, b: ZombieRouteCell): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function stepZombieDefense(state: ZombieDefenseState, ticks = 1): void {
  for (let tick = 0; tick < ticks; tick += 1) {
    if (state.status !== 'active') continue;
    state.tick += 1;
    for (const tower of state.towers) {
      tower.cooldown = Math.max(0, tower.cooldown - 1);
      if (tower.cooldown > 0) continue;
      const target = state.zombies.find(
        (zombie) =>
          zombie.hp > 0 &&
          distance(tower.cell, state.route[Math.min(zombie.routeIndex, state.route.length - 1)]) <=
            TOWER[tower.kind].range,
      );
      if (!target) continue;
      target.hp -= TOWER[tower.kind].damage * tower.level;
      tower.cooldown = TOWER[tower.kind].cooldown;
    }
    for (const zombie of state.zombies) {
      if (zombie.hp <= 0) continue;
      const next = Math.min(state.route.length - 1, zombie.routeIndex + 1);
      if (next === zombie.routeIndex) zombie.blockedTicks += 1;
      else {
        zombie.routeIndex = next;
        zombie.blockedTicks = 0;
      }
      if (zombie.blockedTicks > 200)
        zombie.routeIndex = Math.min(state.route.length - 1, zombie.routeIndex + 1);
      if (zombie.routeIndex >= state.route.length - 1) {
        state.lives -= 1;
        zombie.hp = 0;
      }
    }
    for (const zombie of state.zombies.filter((candidate) => candidate.hp <= 0))
      state.resources += ARCHETYPE[zombie.archetype].reward;
    state.zombies = state.zombies.filter((zombie) => zombie.hp > 0);
    if (state.lives <= 0) state.status = 'lost';
    else if (state.zombies.length === 0) state.status = 'ready';
    if (state.wave >= 10 && state.status === 'ready') state.status = 'won';
  }
}
