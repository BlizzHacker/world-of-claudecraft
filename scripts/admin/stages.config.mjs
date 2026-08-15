// Single source of truth for the per-realm staging topology, shared by the
// env generator, the per-stage deploy script, and the promotion script.
// Mirrors src/sim/realms/stages.ts (kept in sync by hand — both are tiny).

// 2026-08-15: collapsed to a single ring per realm. The beta/alpha/dev rings
// each carried their own 8.3 GB worktree under /opt/cr-stages (27 idle copies,
// 222 GB) and their own env file, systemd instance, port and directory entry,
// none of which were ever promoted off the stale 15d54b7617 build. One ring per
// realm now, advertised as "(In Development)" — see stageName below.
//
// The rest of the stage vocabulary (offsets, git refs, multipliers) is kept so
// re-adding a ring is a one-line change to this array, but nothing generates or
// deploys a non-live ring while STAGES holds only 'live'.
export const STAGES = ['live'];

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
  arcane: { base: 8840, name: 'Arcane Nexus', type: 'Normal' },
  claudecraft: { base: 8850, name: 'ClaudeCraft', type: 'Normal' },
  fps: { base: 8860, name: 'FPS', type: 'Normal' },
  exchange: { base: 8870, name: 'Exchange', type: 'RP' },
  arcadevoid: { base: 8880, name: 'Arcane Void', type: 'Normal' },
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
// The single remaining ring advertises itself as in development so the realm
// list reads honestly; this is display text only and never reaches
// stageRealmName (the DB partition key), so existing characters are untouched.
export const IN_DEVELOPMENT_SUFFIX = '(In Development)';

export function stageName(realmId, stage) {
  const base = REALMS[realmId]?.name ?? realmId;
  return stage === 'live'
    ? `${base} ${IN_DEVELOPMENT_SUFFIX}`
    : `${base} [${stage.toUpperCase()}]`;
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
