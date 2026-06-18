import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, otpauthUrl, totpCode, verifyTotpCode } from '../server/totp';

describe('TOTP utilities', () => {
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
