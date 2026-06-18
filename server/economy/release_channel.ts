export type EconomyReleaseChannel = 'alpha' | 'beta' | 'public';

interface ChannelDefaults {
  rewardMultiplier: number;
  dailyCapMultiplier: number;
  lifetimeCapMultiplier: number;
  characterResetDays: number;
}

const DEFAULTS: Record<EconomyReleaseChannel, ChannelDefaults> = {
  alpha: {
    rewardMultiplier: 3,
    dailyCapMultiplier: 3,
    lifetimeCapMultiplier: 1,
    characterResetDays: 14,
  },
  beta: {
    rewardMultiplier: 1.5,
    dailyCapMultiplier: 1.5,
    lifetimeCapMultiplier: 1,
    characterResetDays: 30,
  },
  public: {
    rewardMultiplier: 1,
    dailyCapMultiplier: 1,
    lifetimeCapMultiplier: 1,
    characterResetDays: 0,
  },
};

function channelFromEnv(): EconomyReleaseChannel {
  const raw = (process.env.CR_RELEASE_CHANNEL ?? '').trim().toLowerCase();
  if (raw === 'alpha' || raw === 'beta' || raw === 'public') return raw;
  return 'public';
}

function finitePositiveEnv(name: string, fallback: number): number {
  const n = Number((process.env[name] ?? '').trim());
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function nonNegativeEnv(name: string, fallback: number): number {
  const raw = (process.env[name] ?? '').trim();
  if (raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function releaseChannelInfo(): {
  channel: EconomyReleaseChannel;
  rewardMultiplier: number;
  dailyCapMultiplier: number;
  lifetimeCapMultiplier: number;
  characterResetDays: number;
} {
  const channel = channelFromEnv();
  const defaults = DEFAULTS[channel];
  return {
    channel,
    rewardMultiplier: finitePositiveEnv('CR_PLATINUM_REWARD_MULTIPLIER', defaults.rewardMultiplier),
    dailyCapMultiplier: finitePositiveEnv('CR_PLATINUM_DAILY_CAP_MULTIPLIER', defaults.dailyCapMultiplier),
    lifetimeCapMultiplier: finitePositiveEnv('CR_PLATINUM_LIFETIME_CAP_MULTIPLIER', defaults.lifetimeCapMultiplier),
    characterResetDays: nonNegativeEnv('CR_CHARACTER_RESET_DAYS', defaults.characterResetDays),
  };
}

export function platinumRewardAmount(baseAmount: number): number {
  const { rewardMultiplier } = releaseChannelInfo();
  return Math.max(1, Math.floor(baseAmount * rewardMultiplier));
}

export function platinumDailyCap(baseCap: number): number {
  if (baseCap <= 0) return 0;
  const { dailyCapMultiplier } = releaseChannelInfo();
  return Math.max(1, Math.floor(baseCap * dailyCapMultiplier));
}

export function platinumLifetimeCap(baseCap: number): number {
  if (baseCap <= 0) return 0;
  const { lifetimeCapMultiplier } = releaseChannelInfo();
  return Math.max(1, Math.floor(baseCap * lifetimeCapMultiplier));
}
