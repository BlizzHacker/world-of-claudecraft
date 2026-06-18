import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { CURRENCIES, PLATINUM_LIFETIME_CAP_PER_ACCOUNT, formatCopperAsGSC, decomposeCopper } from '../src/economy/currencies';
import { PLATINUM_REWARDS, PLATINUM_DAILY_MAX_FROM_REWARDS } from '../src/economy/platinum_rules';
import { buildSignChallenge, isChallengeExpired } from '../src/economy/walletService';
import { LocalMockChainAdapter } from '../src/economy/chainAdapter';
import { ECONOMY_ITEMS, itemsForRealmContext, itemsByScope } from '../src/economy/itemCatalog';
import { ECONOMY_DISCLOSURE } from '../src/economy/types';
import { verifySolanaSignature } from '../server/economy/solana_verify';
import {
  platinumDailyCap,
  platinumRewardAmount,
  releaseChannelInfo,
} from '../server/economy/release_channel';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(input: Uint8Array): string {
  const bytes = [...input];
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  return '1'.repeat(zeros) + digits.reverse().map((d) => BASE58_ALPHABET[d]).join('');
}

describe('economy currencies', () => {
  it('platinum is achievement-only, never auto-converted', () => {
    expect(CURRENCIES.platinum.source).toBe('achievement-only');
    expect(CURRENCIES.platinum.copperEquivalent).toBeNull();
  });
  it('copper/silver/gold convert at vanilla rates', () => {
    expect(CURRENCIES.copper.copperEquivalent).toBe(1);
    expect(CURRENCIES.silver.copperEquivalent).toBe(100);
    expect(CURRENCIES.gold.copperEquivalent).toBe(10_000);
  });
  it('platinum has a daily + lifetime cap', () => {
    expect(CURRENCIES.platinum.dailyCapPerAccount).toBeGreaterThan(0);
    expect(PLATINUM_LIFETIME_CAP_PER_ACCOUNT).toBeGreaterThan(CURRENCIES.platinum.dailyCapPerAccount);
  });
  it('formats copper into g/s/c', () => {
    expect(formatCopperAsGSC(12_345)).toBe('1g 23s 45c');
    expect(formatCopperAsGSC(99)).toBe('99c');
    expect(formatCopperAsGSC(100)).toBe('1s 0c');
    expect(decomposeCopper(12_345)).toEqual({ gold: 1, silver: 23, copper: 45 });
  });
});

describe('platinum rules', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('every reward has positive amount and either oncePerLifetime or a cooldown', () => {
    for (const r of Object.values(PLATINUM_REWARDS)) {
      expect(r.amount).toBeGreaterThan(0);
      expect(r.oncePerLifetime || r.cooldownSec > 0).toBe(true);
    }
  });
  it('daily-cap math from recurring rewards fits inside dailyCapPerAccount', () => {
    expect(PLATINUM_DAILY_MAX_FROM_REWARDS).toBeLessThanOrEqual(CURRENCIES.platinum.dailyCapPerAccount);
  });
  it('alpha and beta release channels scale platinum rewards and caps', () => {
    vi.stubEnv('CR_RELEASE_CHANNEL', '');
    vi.stubEnv('CR_PLATINUM_REWARD_MULTIPLIER', '');
    vi.stubEnv('CR_PLATINUM_DAILY_CAP_MULTIPLIER', '');
    vi.stubEnv('CR_CHARACTER_RESET_DAYS', '');
    expect(releaseChannelInfo().channel).toBe('public');
    expect(platinumRewardAmount(10)).toBe(10);

    vi.stubEnv('CR_RELEASE_CHANNEL', 'alpha');
    expect(releaseChannelInfo()).toMatchObject({
      channel: 'alpha',
      rewardMultiplier: 3,
      dailyCapMultiplier: 3,
      characterResetDays: 14,
    });
    expect(platinumRewardAmount(10)).toBe(30);
    expect(platinumDailyCap(100)).toBe(300);

    vi.stubEnv('CR_RELEASE_CHANNEL', 'beta');
    expect(releaseChannelInfo()).toMatchObject({
      channel: 'beta',
      rewardMultiplier: 1.5,
      dailyCapMultiplier: 1.5,
      characterResetDays: 30,
    });
    expect(platinumRewardAmount(10)).toBe(15);
    expect(platinumDailyCap(100)).toBe(150);
  });
});

describe('wallet service challenge', () => {
  it('contains the account id + nonce + a 10-minute expiry', () => {
    const c = buildSignChallenge(42, 'example.com');
    expect(c.accountId).toBe(42);
    expect(c.message).toContain('Account: 42');
    expect(c.message).toContain(c.nonce);
    const issued = new Date(c.issuedAt).getTime();
    const expires = new Date(c.expiresAt).getTime();
    expect(expires - issued).toBeGreaterThan(8 * 60 * 1000);
    expect(expires - issued).toBeLessThan(12 * 60 * 1000);
    expect(isChallengeExpired(c)).toBe(false);
  });
  it('flags expired challenges', () => {
    const c = buildSignChallenge(1);
    const past = new Date(Date.now() + 20 * 60 * 1000);
    expect(isChallengeExpired(c, past)).toBe(true);
  });

  it('verifies Solana ed25519 signatures without SDK dependencies', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const message = 'crypticrealm.com wants you to sign in';
    const signature = sign(null, Buffer.from(message, 'utf8'), privateKey);
    const publicDer = publicKey.export({ format: 'der', type: 'spki' }) as Buffer;
    const rawPublicKey = publicDer.subarray(-32);

    const wallet = encodeBase58(rawPublicKey);
    const sig = encodeBase58(signature);

    await expect(verifySolanaSignature(message, sig, wallet)).resolves.toBe(true);
    await expect(verifySolanaSignature(`${message}!`, sig, wallet)).resolves.toBe(false);
  });
});

describe('mock chain adapter', () => {
  it('reports unavailable and throws from mintTo', async () => {
    const a = new LocalMockChainAdapter();
    expect(a.isAvailable()).toBe(false);
    await expect(a.mintTo()).rejects.toThrow();
  });
});

describe('item catalog filtering', () => {
  it('shared items show in every realm', () => {
    const items = itemsForRealmContext('infernal');
    expect(items.some((i) => i.id === 'skin_void_blade')).toBe(true);
    const items2 = itemsForRealmContext('classic');
    expect(items2.some((i) => i.id === 'skin_void_blade')).toBe(true);
  });
  it('realm-locked items only show in their own realm', () => {
    expect(itemsForRealmContext('infernal').some((i) => i.id === 'mount_infernal_steed')).toBe(true);
    expect(itemsForRealmContext('classic').some((i) => i.id === 'mount_infernal_steed')).toBe(false);
    expect(itemsForRealmContext('arcane').some((i) => i.id === 'cr_spellbook_voidwalker')).toBe(true);
    expect(itemsForRealmContext('infernal').some((i) => i.id === 'cr_spellbook_voidwalker')).toBe(false);
  });
  it('itemsByScope filters by realm scope value', () => {
    expect(itemsByScope('shared').length).toBeGreaterThan(0);
    expect(itemsByScope('infernal').every((i) => i.realm === 'infernal')).toBe(true);
  });
  it('catalog covers a mix of cosmetics / mounts / premium', () => {
    const types = new Set(Object.values(ECONOMY_ITEMS).map((i) => i.itemType));
    expect(types.has('cosmetic')).toBe(true);
    expect(types.has('mount')).toBe(true);
    expect(types.has('premium')).toBe(true);
  });
});

describe('economy disclosure', () => {
  it('every export carries the not-investment disclosure', () => {
    expect(ECONOMY_DISCLOSURE.notInvestment).toBe(true);
    expect(ECONOMY_DISCLOSURE.text.toLowerCase()).toContain('not investments');
  });
});
