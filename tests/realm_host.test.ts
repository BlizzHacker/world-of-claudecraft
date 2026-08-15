// The realm a client renders must come from the ORIGIN it was served from.
// Before this, resolveActiveRealmId consulted only ?realm= and localStorage, so
// every realm host except the apex silently rendered as DEFAULT_REALM.
import { describe, expect, it } from 'vitest';
import { realmIdFromHostname } from '../src/ui/cryptic/realm_env';
import { isRealmId, resolveActiveRealmId, setRealmHostEnv } from '../src/sim/realms/registry';

describe('realmIdFromHostname', () => {
  it('maps each realm host to its realm id', () => {
    for (const id of ['infernal', 'classic', 'dominion', 'arcane', 'claudecraft', 'fps', 'exchange', 'arcadevoid']) {
      expect(realmIdFromHostname(`${id}.crypticrealm.com`)).toBe(id);
      expect(isRealmId(realmIdFromHostname(`${id}.crypticrealm.com`))).toBe(true);
    }
  });

  it('maps the apex, www and the legacy play alias to the flagship', () => {
    expect(realmIdFromHostname('crypticrealm.com')).toBe('crypticrealm');
    expect(realmIdFromHostname('www.crypticrealm.com')).toBe('crypticrealm');
    expect(realmIdFromHostname('play.crypticrealm.com')).toBe('crypticrealm');
  });

  it('still resolves leftover stage hostnames to their realm', () => {
    expect(realmIdFromHostname('beta-infernal.crypticrealm.com')).toBe('infernal');
    expect(realmIdFromHostname('alpha-classic.crypticrealm.com')).toBe('classic');
    expect(realmIdFromHostname('dev-fps.crypticrealm.com')).toBe('fps');
  });

  it('ignores a port and is case-insensitive', () => {
    expect(realmIdFromHostname('Infernal.CrypticRealm.com:8810')).toBe('infernal');
  });

  it('yields null where the host names no realm, so storage still decides', () => {
    for (const h of ['localhost', '127.0.0.1', '192.168.0.171', '', null, undefined]) {
      expect(realmIdFromHostname(h as string)).toBeNull();
    }
  });
});

describe('resolveActiveRealmId host precedence', () => {
  const env = (host: string | null, stored: string | null, query: string | null = null) => ({
    queryParam: () => query,
    storageGet: () => stored,
    storageSet: () => {},
    hostRealmId: () => host,
  });

  it('prefers the origin over a stale stored realm', () => {
    setRealmHostEnv(env('infernal', 'crypticrealm'));
    expect(resolveActiveRealmId()).toBe('infernal');
  });

  it('still lets an explicit ?realm= win, for shareable dev links', () => {
    setRealmHostEnv(env('infernal', 'crypticrealm', 'classic'));
    expect(resolveActiveRealmId()).toBe('classic');
  });

  it('falls back to storage when the host names no realm', () => {
    setRealmHostEnv(env(null, 'dominion'));
    expect(resolveActiveRealmId()).toBe('dominion');
  });

  it('falls back to the default when neither is available', () => {
    setRealmHostEnv(env(null, null));
    expect(resolveActiveRealmId()).toBe('crypticrealm');
  });
});
