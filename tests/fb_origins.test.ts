// The Facebook Instant Games origin predicate (server/fb_origins.ts): the ONE
// definition every consumer lane shares (maybeCors, allowedCorsOrigin,
// isWebClientRequest, passesTurnstile). Pins the guarded suffix rule: https
// only, no port, exactly one [a-z0-9-] label in front of .apps.fbsbx.com.
import { describe, expect, it } from 'vitest';
import { isFacebookInstantOrigin, isFacebookInstantRequest } from '../server/fb_origins';

const STAGED = 'https://shield-apps-1725436805394319.apps.fbsbx.com';
const PROD = 'https://apps-1725436805394319.apps.fbsbx.com';

describe('isFacebookInstantOrigin', () => {
  it('accepts the staged and production hosting origins for the app', () => {
    expect(isFacebookInstantOrigin(STAGED)).toBe(true);
    expect(isFacebookInstantOrigin(PROD)).toBe(true);
  });

  it('accepts any single-label fbsbx hosting origin (Facebook mints these per app)', () => {
    expect(isFacebookInstantOrigin('https://apps-1.apps.fbsbx.com')).toBe(true);
    expect(isFacebookInstantOrigin('https://shield-apps-9.apps.fbsbx.com')).toBe(true);
    expect(isFacebookInstantOrigin('https://a.apps.fbsbx.com')).toBe(true);
  });

  it('rejects suffix-spoofing look-alikes (the end anchor)', () => {
    expect(isFacebookInstantOrigin('https://apps.fbsbx.com.evil.com')).toBe(false);
    expect(isFacebookInstantOrigin('https://apps-123.apps.fbsbx.com.evil.com')).toBe(false);
    expect(isFacebookInstantOrigin('https://apps-123.apps.fbsbx.com/evil')).toBe(false);
    expect(isFacebookInstantOrigin('https://apps-123.apps.fbsbx.comx')).toBe(false);
  });

  it('rejects multi-label prefixes (the single-label rule)', () => {
    expect(isFacebookInstantOrigin('https://foo.bar.apps.fbsbx.com')).toBe(false);
    expect(isFacebookInstantOrigin('https://a.b.c.apps.fbsbx.com')).toBe(false);
  });

  it('rejects the bare apps.fbsbx.com host (no prefix label)', () => {
    expect(isFacebookInstantOrigin('https://apps.fbsbx.com')).toBe(false);
    expect(isFacebookInstantOrigin('https://.apps.fbsbx.com')).toBe(false);
  });

  it('rejects http, explicit ports, and other schemes', () => {
    expect(isFacebookInstantOrigin('http://apps-123.apps.fbsbx.com')).toBe(false);
    expect(isFacebookInstantOrigin('https://apps-123.apps.fbsbx.com:443')).toBe(false);
    expect(isFacebookInstantOrigin('https://apps-123.apps.fbsbx.com:8443')).toBe(false);
    expect(isFacebookInstantOrigin('wss://apps-123.apps.fbsbx.com')).toBe(false);
  });

  it('rejects non-string, empty, and unrelated origins', () => {
    expect(isFacebookInstantOrigin(undefined)).toBe(false);
    expect(isFacebookInstantOrigin(null)).toBe(false);
    expect(isFacebookInstantOrigin('')).toBe(false);
    expect(isFacebookInstantOrigin('https://crypticrealm.com')).toBe(false);
    expect(isFacebookInstantOrigin('capacitor://localhost')).toBe(false);
    expect(isFacebookInstantOrigin('app://worldofclaudecraft')).toBe(false);
  });

  it('rejects uppercase and whitespace variants (browsers send the origin lowercased)', () => {
    expect(isFacebookInstantOrigin('https://Apps-123.apps.fbsbx.com')).toBe(false);
    expect(isFacebookInstantOrigin(' https://apps-123.apps.fbsbx.com')).toBe(false);
    expect(isFacebookInstantOrigin('https://apps-123.apps.fbsbx.com ')).toBe(false);
    expect(isFacebookInstantOrigin('https://apps-123.apps.fbsbx.com\n')).toBe(false);
  });
});

describe('isFacebookInstantRequest', () => {
  const req = (headers: Record<string, string>) => ({ headers });

  it('reads the Origin header through the same predicate', () => {
    expect(isFacebookInstantRequest(req({ origin: STAGED }))).toBe(true);
    expect(isFacebookInstantRequest(req({ origin: PROD }))).toBe(true);
    expect(isFacebookInstantRequest(req({ origin: 'https://apps.fbsbx.com.evil.com' }))).toBe(
      false,
    );
    expect(isFacebookInstantRequest(req({}))).toBe(false);
  });
});
