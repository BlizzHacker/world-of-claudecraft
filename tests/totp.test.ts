import { describe, it, expect } from 'vitest';
import {
  base32Encode,
  base32Decode,
  generateSecret,
  generateTotp,
  verifyTotp,
  totpCounter,
  otpauthUri,
  otpauthUrl,
  totpCode,
  verifyTotpCode,
  generateRecoveryCodes,
  normalizeRecoveryCode,
  hashRecoveryCode,
} from '../server/totp';

// Cryptic Realm fork: the original TOTP surface (totpCode / verifyTotpCode /
// otpauthUrl) is still live in the admin, dashboard, and login paths, so keep
// its guards alongside upstream's RFC-vector suite for the newer API.
describe('TOTP utilities (fork API)', () => {
  it('round-trips base32 secrets', () => {
    const raw = Buffer.from('hello world');
    const encoded = base32Encode(raw);
    expect(encoded).toBe('NBSWY3DPEB3W64TMMQ');
    expect(base32Decode(encoded).equals(raw)).toBe(true);
  });

  it('matches RFC 6238 SHA1 test vectors truncated to 6 digits', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890'));
    expect(totpCode(secret, 59_000)).toBe('287082');
    expect(totpCode(secret, 1_111_111_109_000)).toBe('081804');
    expect(totpCode(secret, 2_000_000_000_000)).toBe('279037');
  });

  it('verifies adjacent time windows only', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890'));
    const now = 1_111_111_109_000;
    expect(verifyTotpCode(secret, totpCode(secret, now), now)).toBe(true);
    expect(verifyTotpCode(secret, totpCode(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotpCode(secret, totpCode(secret, now - 90_000), now)).toBe(false);
  });

  it('builds an authenticator app URI', () => {
    const url = otpauthUrl({ issuer: 'Cryptic Realm', account: 'account-7', secret: 'ABC' });
    expect(url).toContain('otpauth://totp/Cryptic%20Realm%3Aaccount-7');
    expect(url).toContain('issuer=Cryptic+Realm');
    expect(url).toContain('secret=ABC');
  });
});

// RFC 6238 Appendix B reference seed: the ASCII string "12345678901234567890"
// (20 bytes), which is "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ" in base32. The RFC
// publishes 8-digit codes; we run 6 digits, so we compare the last 6 of each.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));
const RFC_VECTORS: Array<[number, string]> = [
  [59, '287082'],
  [1111111109, '081804'],
  [1111111111, '050471'],
  [1234567890, '005924'],
  [2000000000, '279037'],
];

describe('base32', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = Buffer.from([0, 1, 2, 250, 255, 128, 77]);
    expect(Buffer.from(base32Decode(base32Encode(bytes)))).toEqual(bytes);
  });
  it('encodes the RFC seed to the canonical string', () => {
    expect(RFC_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  });
  it('decodes case-insensitively and ignores spaces/padding', () => {
    expect(Buffer.from(base32Decode('gezd gnbv'))).toEqual(Buffer.from(base32Decode('GEZDGNBV')));
  });
  it('rejects invalid characters', () => {
    expect(() => base32Decode('GEZD1')).toThrow();
  });
});

describe('verifyTotp against RFC 6238 vectors', () => {
  for (const [timeSec, code] of RFC_VECTORS) {
    it(`accepts ${code} at t=${timeSec}`, () => {
      const matched = verifyTotp(RFC_SECRET, code, timeSec * 1000, { window: 0 });
      expect(matched).toBe(totpCounter(timeSec * 1000));
    });
  }
  it('generateTotp reproduces the RFC code', () => {
    expect(generateTotp(RFC_SECRET, 59_000)).toBe('287082');
  });
});

describe('verifyTotp behaviour', () => {
  it('rejects a wrong code', () => {
    expect(verifyTotp(RFC_SECRET, '000000', 59_000, { window: 0 })).toBeNull();
  });
  it('rejects malformed input (non-digits / wrong length)', () => {
    expect(verifyTotp(RFC_SECRET, 'abcdef', 59_000)).toBeNull();
    expect(verifyTotp(RFC_SECRET, '12345', 59_000)).toBeNull();
    expect(verifyTotp(RFC_SECRET, '1234567', 59_000)).toBeNull();
  });
  it('tolerates clock drift within the window but not beyond', () => {
    const now = 1_000_000_000_000;
    const prevCode = generateTotp(RFC_SECRET, now - 30_000);
    expect(verifyTotp(RFC_SECRET, prevCode, now, { window: 1 })).not.toBeNull();
    expect(verifyTotp(RFC_SECRET, prevCode, now, { window: 0 })).toBeNull();
    const farCode = generateTotp(RFC_SECRET, now - 120_000);
    expect(verifyTotp(RFC_SECRET, farCode, now, { window: 1 })).toBeNull();
  });
  it('returns a strictly increasing counter across periods (enables replay guard)', () => {
    const t0 = 1_700_000_000_000;
    const c0 = verifyTotp(RFC_SECRET, generateTotp(RFC_SECRET, t0), t0, { window: 0 });
    const c1 = verifyTotp(RFC_SECRET, generateTotp(RFC_SECRET, t0 + 30_000), t0 + 30_000, { window: 0 });
    expect(c0).not.toBeNull();
    expect(c1).not.toBeNull();
    expect(c1!).toBe(c0! + 1);
  });
  it('tolerates spaces in the submitted code', () => {
    expect(verifyTotp(RFC_SECRET, '287 082', 59_000, { window: 0 })).not.toBeNull();
  });
});

describe('secret + uri generation', () => {
  it('generates a decodable 32-char (160-bit) secret', () => {
    const s = generateSecret();
    expect(s).toHaveLength(32);
    expect(base32Decode(s)).toHaveLength(20);
  });
  it('builds an otpauth URI that encodes brand spaces and carries the secret', () => {
    const uri = otpauthUri('GEZDGNBV', 'Aria', 'World of ClaudeCraft');
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('secret=GEZDGNBV');
    expect(uri).toContain('issuer=World+of+ClaudeCraft');
    expect(uri).toContain('World%20of%20ClaudeCraft%3AAria');
  });
});

describe('recovery codes', () => {
  it('mints the requested count of unique dashed codes', () => {
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);
  });
  it('hashes a code stably regardless of case, dashes, or spaces', () => {
    const h = hashRecoveryCode('4f8a-3b1c');
    expect(hashRecoveryCode('4F8A3B1C')).toBe(h);
    expect(hashRecoveryCode(' 4f8a 3b1c ')).toBe(h);
    expect(normalizeRecoveryCode('4F8A-3B1C')).toBe('4f8a3b1c');
  });
  it('hashes different codes differently', () => {
    expect(hashRecoveryCode('aaaa-bbbb')).not.toBe(hashRecoveryCode('cccc-dddd'));
  });
});
