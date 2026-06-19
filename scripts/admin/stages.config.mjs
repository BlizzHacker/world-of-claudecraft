// Single source of truth for the per-realm staging topology, shared by the
// env generator, the per-stage deploy script, and the promotion script.
// Mirrors src/sim/realms/stages.ts (kept in sync by hand — both are tiny).

export const STAGES = ['live', 'beta', 'alpha', 'dev'];

export const STAGE_PORT_OFFSET = { live: 0, beta: 1, alpha: 2, dev: 3 };

// dev redeploys on every push; the others only move when promote.sh ff's them.
export const STAGE_GIT_REF = {
  dev: 'codex/cryptic-token-runtime',
  alpha: 'alpha',
  beta: 'beta',
  live: 'live',
};

export const STAGE_PLATINUM = { live: 1, beta: 1.5, alpha: 2, dev: 3 };
export const STAGE_RESTRICTED = { live: false, beta: false, alpha: true, dev: true };

// Home realms that get the 4-stage treatment, with a 10-port block each and the
// display name + realm type the live ring advertises.
export const REALMS = {
  crypticrealm: { base: 8800, name: 'Cryptic Realm', type: 'Normal', apex: true },
  infernal: { base: 8810, name: 'Infernal', type: 'Normal' },
  classic: { base: 8820, name: 'Classic', type: 'Normal' },
  dominion: { base: 8830, name: 'Dominion', type: 'PvP' },
  arcane: { base: 8840, name: 'Arcane', type: 'Normal' },
  claudecraft: { base: 8850, name: 'ClaudeCraft', type: 'Normal' },
};

export function stagePort(realmId, stage) {
  const r = REALMS[realmId];
  return r ? r.base + STAGE_PORT_OFFSET[stage] : null;
}

export function stageInstance(realmId, stage) {
  return `${realmId}-${stage}`;
}

export function stageHost(realmId, stage) {
  const liveHost = REALMS[realmId]?.apex ? 'crypticrealm.com' : `${realmId}.crypticrealm.com`;
  return stage === 'live' ? liveHost : `${stage}.${liveHost}`;
}

export function stageName(realmId, stage) {
  const base = REALMS[realmId]?.name ?? realmId;
  return stage === 'live' ? base : `${base} [${stage.toUpperCase()}]`;
}
