import { describe, expect, it } from 'vitest';
import { nativeSsoStartUrl, ssoHashFromAppUrl } from '../src/ui/cryptic/native_sso';

describe('native app SSO helpers', () => {
  it('builds a native-aware Authentik start URL', () => {
    const url = new URL(nativeSsoStartUrl(), 'https://crypticrealm.com');
    expect(url.pathname).toBe('/api/oauth/authentik');
    expect(url.searchParams.get('native')).toBe('1');
    expect(url.searchParams.get('native_return')).toBe('crypticrealm://auth/callback');
  });

  it('extracts the auth hash from registered app URL schemes', () => {
    const token = 'a'.repeat(64);
    expect(ssoHashFromAppUrl(`crypticrealm://auth/callback#auth_token=${token}&auth_user=moveweight`))
      .toBe(`#auth_token=${token}&auth_user=moveweight`);
    expect(ssoHashFromAppUrl(`com.crypticrealm.game://auth/callback?auth_token=${token}&auth_user=moveweight`))
      .toBe(`#auth_token=${token}&auth_user=moveweight`);
  });

  it('ignores non-app URLs and links without an auth token', () => {
    expect(ssoHashFromAppUrl('https://crypticrealm.com/#auth_token=' + 'a'.repeat(64))).toBeNull();
    expect(ssoHashFromAppUrl('crypticrealm://auth/callback#ok=1')).toBeNull();
  });
});
