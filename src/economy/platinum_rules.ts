// Platinum award rules. Every entry is keyed by a `reason` string the server
// emits when the triggering event fires. Every entry has explicit cooldowns
// + daily / lifetime caps so platinum stays scarce.
//
// Why platinum is not from kills: copper drops scale with mob count and time
// online. A second currency that did the same thing would just be a copper
// reskin. Platinum is achievement-based, time-bounded, and lifetime-capped so
// it stays meaningful as the unit of cross-realm cosmetics + premium unlocks.

import type { RealmId } from '../sim/realms/types';

export interface PlatinumReward {
  /** Stable key the server uses when emitting an award. */
  reason: string;
  /** Human-readable label for the UI. */
  label: string;
  /** How much platinum this award grants. */
  amount: number;
  /** Cooldown in seconds before the same account can earn the same reward
   *  again. 0 = one-time. */
  cooldownSec: number;
  /** Once-per-account-forever (e.g. first-ever clear). */
  oncePerLifetime: boolean;
  /** Which realm(s) this reward fires in. `*` = any realm. */
  realmScope: RealmId | '*';
  /** Plain-English description of the gameplay requirement. */
  requirement: string;
}

/** All platinum awards. Lookup by `reason`. */
export const PLATINUM_REWARDS: Record<string, PlatinumReward> = {
  // ── World bosses (multi-realm) ────────────────────────────────────────
  world_boss_first_kill: {
    reason: 'world_boss_first_kill',
    label: 'First Kill: World Boss',
    amount: 25,
    cooldownSec: 0,
    oncePerLifetime: true,
    realmScope: '*',
    requirement: 'Land the killing blow on a world boss for the first time on your account.',
  },
  world_boss_weekly: {
    reason: 'world_boss_weekly',
    label: 'World Boss (weekly)',
    amount: 3,
    cooldownSec: 7 * 24 * 3600,
    oncePerLifetime: false,
    realmScope: '*',
    requirement: 'Participate in a world boss kill (any). Weekly cooldown.',
  },

  // ── Dungeon completions ──────────────────────────────────────────────
  hollow_crypt_clear: {
    reason: 'hollow_crypt_clear',
    label: 'Hollow Crypt (5-man clear)',
    amount: 2,
    cooldownSec: 24 * 3600,
    oncePerLifetime: false,
    realmScope: '*',
    requirement: 'Clear the Hollow Crypt with a full 5-player party. Daily cooldown.',
  },
  gravewyrm_sanctum_clear: {
    reason: 'gravewyrm_sanctum_clear',
    label: 'Gravewyrm Sanctum (5-man clear)',
    amount: 5,
    cooldownSec: 24 * 3600,
    oncePerLifetime: false,
    realmScope: '*',
    requirement: 'Clear the Gravewyrm Sanctum with a full 5-player party. Daily cooldown.',
  },
  hollow_crypt_first: {
    reason: 'hollow_crypt_first',
    label: 'First Clear: Hollow Crypt',
    amount: 10,
    cooldownSec: 0,
    oncePerLifetime: true,
    realmScope: '*',
    requirement: 'First-ever Hollow Crypt clear on this account.',
  },
  gravewyrm_sanctum_first: {
    reason: 'gravewyrm_sanctum_first',
    label: 'First Clear: Gravewyrm Sanctum',
    amount: 25,
    cooldownSec: 0,
    oncePerLifetime: true,
    realmScope: '*',
    requirement: 'First-ever Gravewyrm Sanctum clear on this account.',
  },

  // ── PvP arena ────────────────────────────────────────────────────────
  arena_rank_gold: {
    reason: 'arena_rank_gold',
    label: 'Arena: Gold rank (weekly)',
    amount: 5,
    cooldownSec: 7 * 24 * 3600,
    oncePerLifetime: false,
    realmScope: '*',
    requirement: 'Hold Gold (1600+ Elo) at the end of the weekly cutoff.',
  },
  arena_rank_platinum: {
    reason: 'arena_rank_platinum',
    label: 'Arena: Platinum rank (weekly)',
    amount: 15,
    cooldownSec: 7 * 24 * 3600,
    oncePerLifetime: false,
    realmScope: '*',
    requirement: 'Hold Platinum (1800+ Elo) at the end of the weekly cutoff.',
  },
  arena_first_duel_win: {
    reason: 'arena_first_duel_win',
    label: 'First Arena Win',
    amount: 1,
    cooldownSec: 0,
    oncePerLifetime: true,
    realmScope: '*',
    requirement: 'Win your very first Ashen Coliseum duel.',
  },

  // ── Achievements (lifetime, once each) ───────────────────────────────
  level_20: {
    reason: 'level_20',
    label: 'Reach Level 20',
    amount: 3,
    cooldownSec: 0,
    oncePerLifetime: true,
    realmScope: '*',
    requirement: 'Hit the level cap on any character.',
  },
  full_map_explored: {
    reason: 'full_map_explored',
    label: 'Cartographer',
    amount: 5,
    cooldownSec: 0,
    oncePerLifetime: true,
    realmScope: '*',
    requirement: 'Reveal every zone on the world map.',
  },
  prestige_first: {
    reason: 'prestige_first',
    label: 'First Prestige',
    amount: 20,
    cooldownSec: 0,
    oncePerLifetime: true,
    realmScope: '*',
    requirement: 'Prestige (overflow XP rank) for the first time.',
  },

  // ── The Exchange (cross-realm hub) ──────────────────────────────────
  first_cross_realm_trade: {
    reason: 'first_cross_realm_trade',
    label: 'First Cross-Realm Trade',
    amount: 2,
    cooldownSec: 0,
    oncePerLifetime: true,
    realmScope: 'exchange',
    requirement: 'Complete your first trade with a player from a different home realm at The Exchange.',
  },
};

/** Sum of every per-week / per-day amount the server would award if a player
 *  somehow hit every triggering event. Used in tests to confirm the cap math
 *  doesn't let someone exceed the daily limit through any combination. */
export const PLATINUM_DAILY_MAX_FROM_REWARDS = (() => {
  let total = 0;
  for (const r of Object.values(PLATINUM_REWARDS)) {
    if (r.cooldownSec === 0 && r.oncePerLifetime) continue;
    if (r.cooldownSec > 0 && r.cooldownSec <= 24 * 3600) total += r.amount;
  }
  return total;
})();
