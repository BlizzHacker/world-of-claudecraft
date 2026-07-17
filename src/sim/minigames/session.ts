import { DT } from '../types';
import type { MinigameFeatureId } from './index';

/** Shared lifecycle for every deterministic Cryptic Realm minigame.
 *
 * The session owns only orchestration state. A mode adapter owns its gameplay
 * state (race laps, brawler stocks, RTS buildings, etc.) and calls this seam
 * for roster/readiness/reconnect/reward bookkeeping. It is serializable,
 * host-agnostic, and deliberately does not read wall-clock time or draw RNG.
 */
export const MINIGAME_SESSION_VERSION = 'session-v1';
export const MINIGAME_COUNTDOWN_SECONDS = 3;
export const MINIGAME_BOT_PID_BASE = 1_000_000;

export type MinigameSessionPhase = 'lobby' | 'countdown' | 'active' | 'finished' | 'aborted';

export interface MinigameSessionPlayer {
  pid: number;
  bot: boolean;
  connected: boolean;
  ready: boolean;
  score: number;
  rewardClaimed: boolean;
}

export interface MinigameSessionState {
  version: typeof MINIGAME_SESSION_VERSION;
  id: number;
  kind: MinigameFeatureId;
  seed: number;
  phase: MinigameSessionPhase;
  tick: number;
  countdownLeft: number;
  maxPlayers: number;
  ownerPid: number;
  players: MinigameSessionPlayer[];
  winnerPids: number[];
}

/**
 * A one-player practice lobby is filled with deterministic CPU opponents for
 * the modes that have a local combat/race adapter. The bot IDs are positive so
 * they can use the existing session lifecycle and reward bookkeeping, but are
 * deliberately outside normal character-id ranges.
 */
export function practiceBotPids(
  kind: MinigameFeatureId,
  sessionId: number,
  requestedMaxPlayers: number,
): number[] {
  if (requestedMaxPlayers !== 1 || (kind !== 'racing' && kind !== 'brawler')) return [];
  const base = MINIGAME_BOT_PID_BASE + Math.max(0, Math.trunc(sessionId)) * 8;
  return [base + 1, base + 2, base + 3];
}

export function practiceMinigameCapacity(
  kind: MinigameFeatureId,
  requestedMaxPlayers: number,
): number {
  return practiceBotPids(kind, 1, requestedMaxPlayers).length > 0 ? 4 : requestedMaxPlayers;
}

export type SessionMutation =
  | { ok: true; state: MinigameSessionState }
  | { ok: false; reason: 'invalid' | 'full' | 'duplicate' | 'missing' | 'closed' | 'not-owner' };

function clone(state: MinigameSessionState): MinigameSessionState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player })),
    winnerPids: [...state.winnerPids],
  };
}

function validPid(pid: number): boolean {
  return Number.isInteger(pid) && pid > 0;
}

function player(state: MinigameSessionState, pid: number): MinigameSessionPlayer | undefined {
  return state.players.find((entry) => entry.pid === pid);
}

function openForRoster(state: MinigameSessionState): boolean {
  return state.phase === 'lobby' || state.phase === 'countdown';
}

export function createMinigameSession(
  id: number,
  kind: MinigameFeatureId,
  seed: number,
  ownerPid: number,
  maxPlayers = 4,
): MinigameSessionState {
  if (!Number.isInteger(id) || id <= 0) throw new Error('minigame session id must be positive');
  if (!Number.isFinite(seed)) throw new Error('minigame session seed must be finite');
  if (!validPid(ownerPid)) throw new Error('minigame session owner must be positive');
  const capacity = Math.max(1, Math.min(4, Math.trunc(maxPlayers)));
  return {
    version: MINIGAME_SESSION_VERSION,
    id,
    kind,
    seed: Math.trunc(seed),
    phase: 'lobby',
    tick: 0,
    countdownLeft: MINIGAME_COUNTDOWN_SECONDS,
    maxPlayers: capacity,
    ownerPid,
    players: [{ pid: ownerPid, bot: false, connected: true, ready: false, score: 0, rewardClaimed: false }],
    winnerPids: [],
  };
}

export function joinMinigameSession(
  current: MinigameSessionState,
  pid: number,
  bot = false,
): SessionMutation {
  if (!validPid(pid)) return { ok: false, reason: 'invalid' };
  if (!openForRoster(current)) return { ok: false, reason: 'closed' };
  if (player(current, pid)) return { ok: false, reason: 'duplicate' };
  if (current.players.length >= current.maxPlayers) return { ok: false, reason: 'full' };
  const state = clone(current);
  state.players.push({ pid, bot, connected: true, ready: bot, score: 0, rewardClaimed: false });
  return { ok: true, state };
}

export function setMinigameReady(
  current: MinigameSessionState,
  pid: number,
  ready: boolean,
): SessionMutation {
  if (!openForRoster(current)) return { ok: false, reason: 'closed' };
  const existing = player(current, pid);
  if (!existing) return { ok: false, reason: 'missing' };
  const state = clone(current);
  const next = player(state, pid)!;
  next.ready = ready === true;
  return { ok: true, state };
}

export function setMinigameConnection(
  current: MinigameSessionState,
  pid: number,
  connected: boolean,
): SessionMutation {
  const existing = player(current, pid);
  if (!existing) return { ok: false, reason: 'missing' };
  if (current.phase === 'finished' || current.phase === 'aborted') return { ok: false, reason: 'closed' };
  const state = clone(current);
  player(state, pid)!.connected = connected === true;
  return { ok: true, state };
}

export function stepMinigameSession(current: MinigameSessionState): MinigameSessionState {
  if (current.phase === 'finished' || current.phase === 'aborted') return clone(current);
  const state = clone(current);
  state.tick += 1;
  if (state.phase === 'lobby') {
    const ready = state.players.length > 0 && state.players.every((entry) => entry.ready || entry.bot);
    const connected = state.players.some((entry) => entry.connected);
    if (ready && connected) state.phase = 'countdown';
  } else if (state.phase === 'countdown') {
    state.countdownLeft = Math.max(0, state.countdownLeft - DT);
    // A fixed 20 Hz subtraction can leave a tiny positive IEEE-754 residue
    // after exactly three seconds. Treat the final tick as the boundary.
    if (state.countdownLeft <= DT + 1e-9) {
      state.countdownLeft = 0;
      state.phase = 'active';
    }
  }
  return state;
}

export function finishMinigameSession(
  current: MinigameSessionState,
  winnerPids: readonly number[],
  scores?: ReadonlyMap<number, number>,
): SessionMutation {
  if (current.phase !== 'active' && current.phase !== 'countdown') return { ok: false, reason: 'closed' };
  const winners = [...new Set(winnerPids)].filter((pid) => player(current, pid));
  if (winners.length === 0) return { ok: false, reason: 'invalid' };
  const state = clone(current);
  state.phase = 'finished';
  state.winnerPids = winners;
  if (scores) {
    for (const entry of state.players) {
      const score = scores.get(entry.pid);
      if (score !== undefined && Number.isFinite(score)) entry.score = Math.max(0, Math.trunc(score));
    }
  }
  return { ok: true, state };
}

export function abortMinigameSession(
  current: MinigameSessionState,
  requesterPid: number,
): SessionMutation {
  if (requesterPid !== current.ownerPid) return { ok: false, reason: 'not-owner' };
  if (!openForRoster(current) && current.phase !== 'active') return { ok: false, reason: 'closed' };
  const state = clone(current);
  state.phase = 'aborted';
  return { ok: true, state };
}

export function claimMinigameReward(
  current: MinigameSessionState,
  pid: number,
): SessionMutation {
  if (current.phase !== 'finished') return { ok: false, reason: 'closed' };
  const existing = player(current, pid);
  if (!existing) return { ok: false, reason: 'missing' };
  if (existing.rewardClaimed) return { ok: false, reason: 'duplicate' };
  const state = clone(current);
  player(state, pid)!.rewardClaimed = true;
  return { ok: true, state };
}
