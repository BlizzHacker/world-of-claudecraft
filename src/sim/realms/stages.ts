// Realm stage model: every home realm runs four rings — live / beta / alpha / dev.
//
//   live  — public, stable ring. Base Platinum ($SCR) rate.
//   beta  — monthly promotion candidate; testers earn a bonus.
//   alpha — two-week tester ring (reset-prone); larger bonus.
//   dev   — admin/mod fast-iteration ring; updated live anytime, highest bonus.
//
// Promotion spine (handled by scripts/admin/promote.sh + a systemd timer):
//   alpha  ← dev   every 2 weeks
//   beta   ← alpha monthly
//   live   ← beta  monthly
//
// This module is the single source of truth shared by the client realm/stage
// picker AND the server-side env generation (scripts/admin/gen-stage-env.mjs),
// so ports, subdomains, and multipliers never drift between them.

import type { RealmId } from './types';
import { HOME_REALM_LIST } from './registry';

export type RealmStage = 'live' | 'beta' | 'alpha' | 'dev';

export const STAGE_ORDER: readonly RealmStage[] = ['live', 'beta', 'alpha', 'dev'];

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
  live: { id: 'live', label: 'Live', platinumMultiplier: 1, restricted: false,
    note: 'Stable public ring.' },
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
};

/** Realms that get the 4-stage treatment (the home realms). */
export function stagedRealmIds(): RealmId[] {
  return HOME_REALM_LIST.map((r) => r.id).filter((id) => REALM_PORT_BASE[id] != null);
}

export function stagePort(realmId: RealmId, stage: RealmStage): number | null {
  const base = REALM_PORT_BASE[realmId];
  return base == null ? null : base + STAGE_PORT_OFFSET[stage];
}

/** systemd instance name + env.d filename stem, e.g. "crypticrealm-alpha". */
export function stageInstance(realmId: RealmId, stage: RealmStage): string {
  return `${realmId}-${stage}`;
}

/** Public host for a realm stage. Live keeps the bare realm host; other stages
 *  prefix it (alpha.crypticrealm.com, dev.infernal.crypticrealm.com, ...). The
 *  flagship's live host is the apex crypticrealm.com. */
export function stageHost(realmId: RealmId, stage: RealmStage): string {
  const liveHost = realmId === 'crypticrealm' ? 'crypticrealm.com' : `${realmId}.crypticrealm.com`;
  return stage === 'live' ? liveHost : `${stage}.${liveHost}`;
}

export function stageUrl(realmId: RealmId, stage: RealmStage): string {
  return `https://${stageHost(realmId, stage)}`;
}

const STAGE_STORE_KEY = (realmId: RealmId) => `cr_realm_stage_${realmId}`;

export function resolveRealmStage(realmId: RealmId): RealmStage {
  try {
    if (typeof window !== 'undefined') {
      const ls = window.localStorage?.getItem(STAGE_STORE_KEY(realmId));
      if (ls === 'beta' || ls === 'alpha' || ls === 'dev' || ls === 'live') return ls;
    }
  } catch { /* storage unavailable */ }
  return 'live';
}

export function persistRealmStage(realmId: RealmId, stage: RealmStage): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(STAGE_STORE_KEY(realmId), stage);
      window.dispatchEvent(new CustomEvent('cr-realm-stage-change', { detail: { realmId, stage } }));
    }
  } catch { /* storage unavailable */ }
}

export function isRealmStage(s: string | null | undefined): s is RealmStage {
  return s === 'live' || s === 'beta' || s === 'alpha' || s === 'dev';
}
