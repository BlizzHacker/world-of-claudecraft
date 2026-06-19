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

// Stage hosts are SINGLE-LABEL under crypticrealm.com so the existing
// *.crypticrealm.com wildcard covers every one (Cloudflare wildcards do NOT
// nest — beta.infernal.crypticrealm.com would need its own per-realm wildcard).
//   live  flagship -> crypticrealm.com          others -> <realm>.crypticrealm.com
//   non-live       -> <stage>-<realm>.crypticrealm.com   (flagship: <stage>.crypticrealm.com)
export function stageHost(realmId, stage) {
  if (stage === 'live') {
    return REALMS[realmId]?.apex ? 'crypticrealm.com' : `${realmId}.crypticrealm.com`;
  }
  return REALMS[realmId]?.apex
    ? `${stage}.crypticrealm.com`
    : `${stage}-${realmId}.crypticrealm.com`;
}

// Display label for the realm directory / UI (brackets OK here — client only).
export function stageName(realmId, stage) {
  const base = REALMS[realmId]?.name ?? realmId;
  return stage === 'live' ? base : `${base} [${stage.toUpperCase()}]`;
}

// Server REALM_NAME = DB partition key. Each stage is its OWN world (separate
// characters; alpha is reset-prone; promotion MIGRATES chars between rings).
// Must satisfy server/realm.ts resolveRealm(): <=24 chars, no brackets,
// charset [A-Za-z0-9 '_-]. So we suffix with a bare word, not "[BETA]".
//   crypticrealm live  -> "Cryptic Realm"        (13)
//   crypticrealm beta  -> "Cryptic Realm Beta"   (18)
//   crypticrealm alpha -> "Cryptic Realm Alpha"  (19)
//   crypticrealm dev   -> "Cryptic Realm Dev"    (17)
export function stageRealmName(realmId, stage) {
  const base = REALMS[realmId]?.name ?? realmId;
  const name = stage === 'live' ? base : `${base} ${stage.charAt(0).toUpperCase()}${stage.slice(1)}`;
  if (name.length > 24) throw new Error(`stage realm name too long (>24): "${name}" — shorten REALMS.${realmId}.name`);
  return name;
}
