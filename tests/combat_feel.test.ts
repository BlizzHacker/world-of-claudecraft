import { describe, it, expect, afterEach } from 'vitest';
import { getRealm, setRealmHostEnv, getActiveRealm } from '../src/sim/realms/registry';

function forceRealm(id: string) {
  setRealmHostEnv({
    queryParam: (n) => (n === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}

afterEach(() => setRealmHostEnv(null));

describe('F5 instant hack-n-slash combat feel', () => {
  const D2_REALMS = ['infernal', 'dominion', 'arcane', 'crypticrealm'];
  const VANILLA_REALMS = ['classic', 'claudecraft'];

  it('the D2 realms collapse cast time + GCD', () => {
    for (const id of D2_REALMS) {
      const r = getRealm(id as never);
      expect(r.combatFeel, `${id} has combatFeel`).toBeTruthy();
      expect(r.combatFeel!.castTimeMult).toBeLessThan(1);
      expect(r.combatFeel!.gcdMult).toBeLessThan(1);
    }
  });

  it('the vanilla realms keep WoW-style timing (no combatFeel)', () => {
    for (const id of VANILLA_REALMS) {
      const r = getRealm(id as never);
      expect(r.combatFeel, `${id} keeps vanilla timing`).toBeUndefined();
    }
  });

  it('getActiveRealm resolves combatFeel for the forced realm', () => {
    forceRealm('infernal');
    expect(getActiveRealm().combatFeel?.castTimeMult).toBe(0.3);
    forceRealm('classic');
    expect(getActiveRealm().combatFeel).toBeUndefined();
  });

  it('per-realm level caps: D2=99, classic=80, claudecraft vanilla', () => {
    for (const id of D2_REALMS) expect(getRealm(id as never).maxLevel).toBe(99);
    expect(getRealm('classic' as never).maxLevel).toBe(80);
    expect(getRealm('claudecraft' as never).maxLevel).toBeUndefined(); // vanilla → global default
  });
});
