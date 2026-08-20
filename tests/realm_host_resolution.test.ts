import { afterEach, describe, expect, it } from 'vitest';
import { resolveActiveRealmId, setRealmHostEnv } from '../src/sim/realms/registry';
import { realmIdForHostname } from '../src/ui/cryptic/realm_env';

afterEach(() => setRealmHostEnv(null));

describe('realm host resolution', () => {
  it('recognizes every live and staged realm hostname', () => {
    expect(realmIdForHostname('crypticrealm.com')).toBe('crypticrealm');
    expect(realmIdForHostname('beta.crypticrealm.com')).toBe('crypticrealm');
    expect(realmIdForHostname('infernal.crypticrealm.com')).toBe('infernal');
    expect(realmIdForHostname('beta-infernal.crypticrealm.com')).toBe('infernal');
    expect(realmIdForHostname('classic.crypticrealm.com')).toBe('classic');
    expect(realmIdForHostname('dominion.crypticrealm.com')).toBe('dominion');
    expect(realmIdForHostname('arcane.crypticrealm.com')).toBe('arcane');
    expect(realmIdForHostname('arcadevoid.crypticrealm.com')).toBe('arcadevoid');
    expect(realmIdForHostname('claudecraft.crypticrealm.com')).toBe('claudecraft');
    expect(realmIdForHostname('exchange.crypticrealm.com')).toBe('exchange');
    expect(realmIdForHostname('fps.moveweight.com')).toBe('fps');
    expect(realmIdForHostname('localhost')).toBeNull();
    expect(realmIdForHostname('infernal.crypticrealm.com.evil.example')).toBeNull();
    expect(realmIdForHostname('fps.moveweight.com.evil.example')).toBeNull();
  });

  it('lets the direct realm host beat a stale realm stored by another domain', () => {
    setRealmHostEnv({
      queryParam: () => null,
      hostRealmId: () => 'infernal',
      storageGet: () => 'crypticrealm',
      storageSet: () => undefined,
    });
    expect(resolveActiveRealmId()).toBe('infernal');
  });

  it('keeps an explicit realm query above host inference', () => {
    setRealmHostEnv({
      queryParam: (name) => (name === 'realm' ? 'classic' : null),
      hostRealmId: () => 'infernal',
      storageGet: () => 'crypticrealm',
      storageSet: () => undefined,
    });
    expect(resolveActiveRealmId()).toBe('classic');
  });
});
