import { describe, expect, it } from 'vitest';
import {
  allowedCorsOrigin,
  DESKTOP_APP_ORIGINS,
  isDesktopAppRequest,
  isNativeAppRequest,
  isWebClientRequest,
  webLoginEnforced,
} from '../server/web_login_guard';

const req = (headers: Record<string, string>) => ({ headers }) as any;

describe('web login guard (anti-bot)', () => {
  it('enforces in production, is off in dev/test, and honours REQUIRE_WEB_LOGIN', () => {
    expect(webLoginEnforced({ NODE_ENV: 'production' } as any)).toBe(true);
    expect(webLoginEnforced({ NODE_ENV: 'test' } as any)).toBe(false);
    expect(webLoginEnforced({ NODE_ENV: 'development' } as any)).toBe(false);
    expect(webLoginEnforced({ NODE_ENV: 'production', REQUIRE_WEB_LOGIN: '0' } as any)).toBe(false);
    expect(webLoginEnforced({ NODE_ENV: 'development', REQUIRE_WEB_LOGIN: '1' } as any)).toBe(true);
  });

  it('rejects requests with no Origin (curl / headless scripts / multibox)', () => {
    expect(isWebClientRequest(req({}))).toBe(false);
    expect(isWebClientRequest(req({ 'user-agent': 'Mozilla/5.0' }))).toBe(false); // spoofed UA, still no Origin
  });

  it('accepts a same-origin browser POST (Origin host matches Host / X-Forwarded-Host)', () => {
    expect(
      isWebClientRequest(req({ origin: 'https://play.example.com', host: 'play.example.com' })),
    ).toBe(true);
    expect(
      isWebClientRequest(
        req({ origin: 'https://play.example.com', 'x-forwarded-host': 'play.example.com' }),
      ),
    ).toBe(true);
  });

  it('accepts an explicit WEB_ORIGINS allow-list entry and localhost dev', () => {
    expect(
      isWebClientRequest(req({ origin: 'https://play.example.com' }), {
        WEB_ORIGINS: 'https://play.example.com',
      } as any),
    ).toBe(true);
    expect(
      isWebClientRequest(req({ origin: 'http://localhost:5173', host: '127.0.0.1:8787' })),
    ).toBe(true);
  });

  it('accepts Capacitor native app origins', () => {
    expect(
      isWebClientRequest(req({ origin: 'capacitor://localhost', host: 'crypticrealm.com' })),
    ).toBe(true);
    expect(isWebClientRequest(req({ origin: 'http://localhost', host: 'crypticrealm.com' }))).toBe(
      true,
    );
    expect(isWebClientRequest(req({ origin: 'https://localhost', host: 'crypticrealm.com' }))).toBe(
      true,
    );
  });

  it('identifies native app origins for Turnstile bypass', () => {
    expect(
      isNativeAppRequest(req({ origin: 'capacitor://localhost', host: 'crypticrealm.com' })),
    ).toBe(true);
    expect(isNativeAppRequest(req({ origin: 'http://localhost', host: 'crypticrealm.com' }))).toBe(
      true,
    );
    expect(isNativeAppRequest(req({ origin: 'https://localhost', host: 'crypticrealm.com' }))).toBe(
      true,
    );
    expect(
      isNativeAppRequest(req({ origin: 'https://crypticrealm.com', host: 'crypticrealm.com' })),
    ).toBe(false);
    expect(
      isNativeAppRequest(req({ origin: 'https://evil.example.com', host: 'crypticrealm.com' })),
    ).toBe(false);
    expect(isNativeAppRequest(req({ host: 'crypticrealm.com' }))).toBe(false);
    expect(
      isWebClientRequest(req({ origin: 'capacitor://localhost', host: 'worldofclaudecraft.com' })),
    ).toBe(true);
    expect(
      isWebClientRequest(req({ origin: 'http://localhost', host: 'worldofclaudecraft.com' })),
    ).toBe(true);
    expect(
      isWebClientRequest(req({ origin: 'https://localhost', host: 'worldofclaudecraft.com' })),
    ).toBe(true);
    expect(
      isWebClientRequest(req({ origin: 'capacitor://localhost', host: 'worldofclaudecraft.com' })),
    ).toBe(true);
    expect(
      isWebClientRequest(req({ origin: 'http://localhost', host: 'worldofclaudecraft.com' })),
    ).toBe(true);
    expect(
      isWebClientRequest(req({ origin: 'https://localhost', host: 'worldofclaudecraft.com' })),
    ).toBe(true);
  });

  it('identifies native app origins for Turnstile bypass', () => {
    expect(
      isNativeAppRequest(req({ origin: 'capacitor://localhost', host: 'worldofclaudecraft.com' })),
    ).toBe(true);
    expect(
      isNativeAppRequest(req({ origin: 'http://localhost', host: 'worldofclaudecraft.com' })),
    ).toBe(true);
    expect(
      isNativeAppRequest(req({ origin: 'https://localhost', host: 'worldofclaudecraft.com' })),
    ).toBe(true);
    expect(
      isNativeAppRequest(
        req({ origin: 'https://worldofclaudecraft.com', host: 'worldofclaudecraft.com' }),
      ),
    ).toBe(false);
    expect(
      isNativeAppRequest(
        req({ origin: 'https://evil.example.com', host: 'worldofclaudecraft.com' }),
      ),
    ).toBe(false);
    expect(isNativeAppRequest(req({ host: 'worldofclaudecraft.com' }))).toBe(false);
  });

  it('rejects a foreign origin', () => {
    expect(
      isWebClientRequest(req({ origin: 'https://evil.example.com', host: 'play.example.com' })),
    ).toBe(false);
  });
});

describe('desktop app origins (Electron shell)', () => {
  it('identifies every desktop app origin for the Turnstile bypass', () => {
    for (const origin of DESKTOP_APP_ORIGINS) {
      expect(isDesktopAppRequest(req({ origin }))).toBe(true);
    }
  });

  it('rejects look-alike, web, native, and missing origins', () => {
    expect(isDesktopAppRequest(req({ origin: 'app://evil' }))).toBe(false);
    expect(isDesktopAppRequest(req({ origin: 'app://worldofclaudecraft.evil' }))).toBe(false);
    expect(isDesktopAppRequest(req({ origin: 'https://worldofclaudecraft.com' }))).toBe(false);
    expect(isDesktopAppRequest(req({ origin: 'capacitor://localhost' }))).toBe(false);
    expect(isDesktopAppRequest(req({}))).toBe(false);
  });

  it('passes the web-login guard for every desktop origin while enforcement is on', () => {
    expect(webLoginEnforced({ NODE_ENV: 'production' } as any)).toBe(true);
    for (const origin of DESKTOP_APP_ORIGINS) {
      expect(isWebClientRequest(req({ origin, host: 'worldofclaudecraft.com' }))).toBe(true);
    }
    expect(isWebClientRequest(req({ origin: 'app://evil', host: 'worldofclaudecraft.com' }))).toBe(
      false,
    );
  });
});

describe('Facebook Instant Games origins (fbsbx sandbox)', () => {
  const staged = 'https://shield-apps-1725436805394319.apps.fbsbx.com';
  const prod = 'https://apps-1725436805394319.apps.fbsbx.com';

  it('passes the web-login guard for the fbsbx hosting origins in CODE (no WEB_ORIGINS needed)', () => {
    expect(webLoginEnforced({ NODE_ENV: 'production' } as any)).toBe(true);
    expect(isWebClientRequest(req({ origin: staged, host: 'crypticrealm.com' }), {} as any)).toBe(
      true,
    );
    expect(isWebClientRequest(req({ origin: prod, host: 'crypticrealm.com' }), {} as any)).toBe(
      true,
    );
  });

  it('rejects fbsbx look-alikes in the web-login guard', () => {
    for (const origin of [
      'https://apps.fbsbx.com.evil.com',
      'https://foo.bar.apps.fbsbx.com',
      'http://apps-1725436805394319.apps.fbsbx.com',
      'https://apps.fbsbx.com',
    ]) {
      expect(isWebClientRequest(req({ origin, host: 'crypticrealm.com' }), {} as any)).toBe(false);
    }
  });

  it('keeps the WEB_ORIGINS env list additive on top of the code lane', () => {
    // The env list still admits its own entries; the fbsbx code lane does not
    // replace it.
    expect(
      isWebClientRequest(req({ origin: 'https://partner.example.com' }), {
        WEB_ORIGINS: 'https://partner.example.com',
      } as any),
    ).toBe(true);
    expect(
      isWebClientRequest(req({ origin: staged }), {
        WEB_ORIGINS: 'https://partner.example.com',
      } as any),
    ).toBe(true);
  });

  it('reflects the fbsbx hosting origins in the CORS allow-list', () => {
    expect(allowedCorsOrigin(staged)).toBe(staged);
    expect(allowedCorsOrigin(prod)).toBe(prod);
  });

  it('does not reflect fbsbx look-alikes (evil suffix, multi-label, http, no label)', () => {
    expect(allowedCorsOrigin('https://apps.fbsbx.com.evil.com')).toBeNull();
    expect(allowedCorsOrigin('https://foo.bar.apps.fbsbx.com')).toBeNull();
    expect(allowedCorsOrigin('http://apps-1725436805394319.apps.fbsbx.com')).toBeNull();
    expect(allowedCorsOrigin('https://apps-1725436805394319.apps.fbsbx.com:8443')).toBeNull();
    expect(allowedCorsOrigin('https://apps.fbsbx.com')).toBeNull();
  });
});

describe('API CORS reflection allow-list (allowedCorsOrigin)', () => {
  it('reflects each desktop app origin', () => {
    for (const origin of DESKTOP_APP_ORIGINS) {
      expect(allowedCorsOrigin(origin)).toBe(origin);
    }
  });

  it('reflects native app origins', () => {
    expect(allowedCorsOrigin('capacitor://localhost')).toBe('capacitor://localhost');
    expect(allowedCorsOrigin('http://localhost')).toBe('http://localhost');
    expect(allowedCorsOrigin('https://localhost')).toBe('https://localhost');
  });

  it('does not reflect look-alikes, unlisted origins, or a missing Origin', () => {
    expect(allowedCorsOrigin('app://evil')).toBeNull();
    expect(allowedCorsOrigin('app://worldofclaudecraft.evil')).toBeNull();
    // Unlisted here because REALM_ORIGINS is empty in the test env; a
    // deployment that lists the site origin as a realm URL reflects it. The
    // same-origin page never needs CORS either way.
    expect(allowedCorsOrigin('https://worldofclaudecraft.com')).toBeNull();
    expect(allowedCorsOrigin(undefined)).toBeNull();
    expect(allowedCorsOrigin('')).toBeNull();
  });
});
