import { DT } from '../types';

export const BRAWLER_VERSION = 'brawler-v1';
export const BRAWLER_MAX_PLAYERS = 4;
const GRAVITY = 28;
const MOVE_ACCEL = 42;
const MAX_RUN_SPEED = 9;
const JUMP_SPEED = 13;
const AIR_CONTROL = 0.65;
const HITSTUN_PER_DAMAGE = 0.025;
const BASE_KNOCKBACK = 7;
const DAMAGE_KNOCKBACK = 0.08;
const RESPAWN_INVULNERABILITY = 2;

export interface BrawlerPlatform {
  x: number;
  z: number;
  width: number;
  height: number;
}

export interface BrawlerInput {
  move: -1 | 0 | 1;
  jump: boolean;
  attack: boolean;
}

export interface BrawlerFighter {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  vy: number;
  damage: number;
  stocks: number;
  grounded: boolean;
  jumps: number;
  hitstun: number;
  respawnInvulnerable: number;
  facing: -1 | 1;
  attackCooldown: number;
  alive: boolean;
}

export interface BrawlerState {
  tick: number;
  fighters: BrawlerFighter[];
  platforms: BrawlerPlatform[];
  leftBlastZone: number;
  rightBlastZone: number;
  bottomBlastZone: number;
  winner: number | null;
}

export interface BrawlerEvent {
  type: 'hit' | 'ring_out' | 'respawn' | 'match_over';
  fighterId: number;
  targetId?: number;
  stocks?: number;
}

export function createBrawlerState(
  ids: readonly number[],
  platforms?: readonly BrawlerPlatform[],
): BrawlerState {
  const fighters = ids.slice(0, BRAWLER_MAX_PLAYERS).map((id, index) => ({
    id,
    x: -9 + index * 6,
    z: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    damage: 0,
    stocks: 3,
    grounded: true,
    jumps: 2,
    hitstun: 0,
    respawnInvulnerable: 0,
    facing: 1 as const,
    attackCooldown: 0,
    alive: true,
  }));
  return {
    tick: 0,
    fighters,
    platforms: platforms
      ? platforms.map((platform) => ({ ...platform }))
      : [{ x: 0, z: 0, width: 26, height: 1 }],
    leftBlastZone: -28,
    rightBlastZone: 28,
    bottomBlastZone: -16,
    winner: null,
  };
}

function overlap(a: BrawlerFighter, b: BrawlerFighter): boolean {
  return Math.abs(a.x - b.x) <= 1.5 && Math.abs(a.z - b.z) <= 2.2;
}

function landOnPlatform(fighter: BrawlerFighter, platforms: readonly BrawlerPlatform[]): boolean {
  if (fighter.vy > 0) return false;
  for (const platform of platforms) {
    const top = platform.z + platform.height / 2;
    if (fighter.x < platform.x - platform.width / 2 || fighter.x > platform.x + platform.width / 2)
      continue;
    if (fighter.z <= top + 0.25 && fighter.z >= top - 2.5) {
      fighter.z = top;
      fighter.vy = 0;
      fighter.grounded = true;
      fighter.jumps = 2;
      return true;
    }
  }
  return false;
}

function respawn(fighter: BrawlerFighter, index: number): void {
  fighter.x = -9 + index * 6;
  fighter.z = 8;
  fighter.vx = 0;
  fighter.vz = 0;
  fighter.vy = 0;
  fighter.damage = 0;
  fighter.grounded = false;
  fighter.jumps = 2;
  fighter.hitstun = 0;
  fighter.respawnInvulnerable = RESPAWN_INVULNERABILITY;
  fighter.alive = fighter.stocks > 0;
}

export function stepBrawler(
  state: BrawlerState,
  inputs: ReadonlyMap<number, BrawlerInput>,
  dt = DT,
): BrawlerEvent[] {
  if (state.winner !== null) return [];
  const events: BrawlerEvent[] = [];
  const before = state.fighters.map((fighter) => ({ ...fighter }));
  for (const fighter of state.fighters) {
    const input = inputs.get(fighter.id) ?? { move: 0, jump: false, attack: false };
    if (!fighter.alive) continue;
    fighter.attackCooldown = Math.max(0, fighter.attackCooldown - dt);
    fighter.hitstun = Math.max(0, fighter.hitstun - dt);
    fighter.respawnInvulnerable = Math.max(0, fighter.respawnInvulnerable - dt);
    if (fighter.hitstun <= 0) {
      const control = fighter.grounded ? 1 : AIR_CONTROL;
      fighter.vx += input.move * MOVE_ACCEL * control * dt;
      fighter.vx = Math.max(-MAX_RUN_SPEED, Math.min(MAX_RUN_SPEED, fighter.vx));
      if (input.move !== 0) fighter.facing = input.move;
      if (input.jump && fighter.jumps > 0) {
        fighter.vy = JUMP_SPEED;
        fighter.grounded = false;
        fighter.jumps -= 1;
      }
      if (input.attack && fighter.attackCooldown <= 0) {
        fighter.attackCooldown = 0.35;
        for (const target of state.fighters) {
          if (target.id === fighter.id || !target.alive || target.respawnInvulnerable > 0) continue;
          if (Math.sign(target.x - fighter.x) !== fighter.facing || !overlap(fighter, target))
            continue;
          const knockback = BASE_KNOCKBACK + target.damage * DAMAGE_KNOCKBACK;
          target.damage = Math.min(999, target.damage + 8);
          target.vx = fighter.facing * knockback;
          target.vy = 4 + target.damage * 0.02;
          target.grounded = false;
          target.hitstun = Math.min(1.5, 0.18 + target.damage * HITSTUN_PER_DAMAGE);
          events.push({ type: 'hit', fighterId: fighter.id, targetId: target.id });
        }
      }
    }
    fighter.vz += -GRAVITY * dt;
    fighter.x += fighter.vx * dt;
    fighter.z += fighter.vz * dt;
    fighter.vx *= fighter.grounded ? 0.82 : 0.98;
    fighter.vz *= 0.99;
    fighter.grounded = landOnPlatform(fighter, state.platforms);
    if (!fighter.grounded && fighter.z < state.bottomBlastZone) {
      fighter.stocks -= 1;
      events.push({ type: 'ring_out', fighterId: fighter.id, stocks: fighter.stocks });
      if (fighter.stocks > 0) {
        respawn(fighter, state.fighters.indexOf(fighter));
        events.push({ type: 'respawn', fighterId: fighter.id, stocks: fighter.stocks });
      } else {
        fighter.alive = false;
      }
    } else if (fighter.x < state.leftBlastZone || fighter.x > state.rightBlastZone) {
      fighter.stocks -= 1;
      events.push({ type: 'ring_out', fighterId: fighter.id, stocks: fighter.stocks });
      if (fighter.stocks > 0) {
        respawn(fighter, state.fighters.indexOf(fighter));
        events.push({ type: 'respawn', fighterId: fighter.id, stocks: fighter.stocks });
      } else {
        fighter.alive = false;
      }
    }
  }
  state.tick += 1;
  const alive = state.fighters.filter((fighter) => fighter.alive);
  if (alive.length === 1 && state.fighters.length > 1) {
    state.winner = alive[0].id;
    events.push({ type: 'match_over', fighterId: alive[0].id });
  } else if (alive.length === 0 && before.some((fighter) => fighter.alive)) {
    events.push({ type: 'match_over', fighterId: 0 });
  }
  return events;
}
