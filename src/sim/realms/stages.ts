// Realm stage model: every home realm runs four rings — live / beta / alpha / dev.
//
//   live  — public, stable ring. Base Platinum ($SCR) rate.
//   beta  — monthly promotion candidate; testers earn a bonus.
//   alpha — two-week tester ring (reset-prone); larger bonus.
//   dev   — admin/mod fast-iteration ring; updated live anytime, highest bonus.
//
// Promotion spine (handled by scripts/admin/promote.sh + systemd timers):
//   alpha  ← dev code every 2 weeks (dev characters stay dev)
//   beta   ← alpha after the alpha ring has soaked for roughly 2 weeks
//   live   ← beta on the release cadence
//
// This module is the single source of truth shared by the client realm/stage
// picker AND the server-side env generation (scripts/admin/gen-stage-env.mjs),
// so ports, subdomains, and multipliers never drift between them.

import type { RealmId } from './types';
import { REALM_LIST, realmHostEnv } from './registry';

export type RealmStage = 'live' | 'beta' | 'alpha' | 'dev';

// 2026-08-15: one ring per realm. Only 'live' is generated, deployed, or
// offered in the stage picker — see the note in scripts/admin/stages.config.mjs
// (the two files are kept in sync by hand). The RealmStage union and STAGE_META
// below are deliberately left whole so a stored 'cr_realm_stage_*' value from
// the old four-ring world still parses and resolves, rather than throwing.
export const STAGE_ORDER: readonly RealmStage[] = ['live'];

export interface StageMeta {
  id: RealmStage;
  label: string;
  /** Platinum ($SCR) earn multiplier for time spent on this stage. */
  platinumMultiplier: number;
  /** dev/alpha rings are gated to admins, mods, and approved testers. */
  restricted: boolean;
  note: string;
}

export const STAGE_META: Record<RealmStage, StageMeta> = {
  live: { id: 'live', label: 'In Development', platinumMultiplier: 1, restricted: false,
    note: 'The realm’s only ring — in active development.' },
  beta: { id: 'beta', label: 'Beta', platinumMultiplier: 1.5, restricted: false,
    note: 'Monthly promotion candidate — testers earn 1.5x Platinum.' },
  alpha: { id: 'alpha', label: 'Alpha', platinumMultiplier: 2, restricted: true,
    note: 'Two-week tester ring (reset-prone) — 2x Platinum.' },
  dev: { id: 'dev', label: 'Dev', platinumMultiplier: 3, restricted: true,
    note: 'Admin / moderator fast-iteration ring — updated live, 3x Platinum.' },
};

// Git branch each stage tracks. dev redeploys on every push; the others only
// move when promote.sh fast-forwards them.
export const STAGE_GIT_REF: Record<RealmStage, string> = {
  dev: 'codex/cryptic-token-runtime',
  alpha: 'alpha',
  beta: 'beta',
  live: 'live',
};

// Port allocation: a 10-port block per home realm, stage = block + offset.
// live=+0 beta=+1 alpha=+2 dev=+3. Bases chosen above the legacy 8787-8797 band.
const STAGE_PORT_OFFSET: Record<RealmStage, number> = { live: 0, beta: 1, alpha: 2, dev: 3 };

export const REALM_PORT_BASE: Partial<Record<RealmId, number>> = {
  crypticrealm: 8800,
  infernal: 8810,
  classic: 8820,
  dominion: 8830,
  arcane: 8840,
  claudecraft: 8850,
  fps: 8860,
  exchange: 8870,
  arcadevoid: 8880,
};

/** Realms that get the 4-stage treatment, including special-purpose hubs. */
export function stagedRealmIds(): RealmId[] {
  return REALM_LIST.map((r) => r.id).filter((id) => REALM_PORT_BASE[id] != null);
}

export function stagePort(realmId: RealmId, stage: RealmStage): number | null {
  const base = REALM_PORT_BASE[realmId];
  return base == null ? null : base + STAGE_PORT_OFFSET[stage];
}

/** systemd instance name + env.d filename stem, e.g. "crypticrealm-alpha". */
export function stageInstance(realmId: RealmId, stage: RealmStage): string {
  return `${realmId}-${stage}`;
}

/** Public host for a realm stage. SINGLE-LABEL under crypticrealm.com so the
 *  existing *.crypticrealm.com wildcard covers every stage (Cloudflare wildcards
 *  don't nest). Live keeps the bare realm host (flagship = apex); non-live uses
 *  <stage>-<realm>.crypticrealm.com (flagship: <stage>.crypticrealm.com). */
export function stageHost(realmId: RealmId, stage: RealmStage): string {
  const isApex = realmId === 'crypticrealm';
  if (stage === 'live') {
    return isApex ? 'crypticrealm.com' : `${realmId}.crypticrealm.com`;
  }
  return isApex ? `${stage}.crypticrealm.com` : `${stage}-${realmId}.crypticrealm.com`;
}

export function stageUrl(realmId: RealmId, stage: RealmStage): string {
  return `https://${stageHost(realmId, stage)}`;
}

const STAGE_STORE_KEY = (realmId: RealmId) => `cr_realm_stage_${realmId}`;

export function resolveRealmStage(realmId: RealmId): RealmStage {
  try {
    const ls = realmHostEnv()?.storageGet(STAGE_STORE_KEY(realmId));
    // Clamp to the rings that still exist. A browser that picked 'dev' or
    // 'alpha' before the 2026-08-15 cutdown still has that value in
    // localStorage, and honouring it would route the player to
    // dev-<realm>.crypticrealm.com — a host with no server behind it any more.
    if (isRealmStage(ls) && STAGE_ORDER.includes(ls)) return ls;
  } catch { /* storage unavailable */ }
  return 'live';
}

export function persistRealmStage(realmId: RealmId, stage: RealmStage): void {
  try {
    const env = realmHostEnv();
    env?.storageSet(STAGE_STORE_KEY(realmId), stage);
    env?.notifyStageChange?.(realmId, stage);
  } catch { /* storage unavailable */ }
}

export function isRealmStage(s: string | null | undefined): s is RealmStage {
  return s === 'live' || s === 'beta' || s === 'alpha' || s === 'dev';
}
