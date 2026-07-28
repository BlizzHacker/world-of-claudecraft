// Every realm names its cosmetic season after its own game -- except claudecraft,
// which is deliberately pristine upstream and inherits the shared "The Armory" copy.
//
// The season resolvers fall back to whatever localized string the caller passes, so a
// realm without a season keeps the existing hudChrome.wocStore.armory* wording and the
// i18n catalog needs no per-realm keys.
import { afterEach, describe, expect, it } from 'vitest';
import { REALM_LIST, setRealmHostEnv } from '../src/sim/realms/registry';
import { realmSeasonBody, realmSeasonEyebrow, realmSeasonTitle } from '../src/ui/realm_season';

function forceRealm(id: string) {
  setRealmHostEnv({
    queryParam: (n) => (n === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}
afterEach(() => setRealmHostEnv(null));

describe('per-realm cosmetic seasons', () => {
  it('gives every realm but claudecraft its own season title', () => {
    const titles = new Map<string, string>();
    for (const realm of REALM_LIST) {
      if (realm.id === 'claudecraft') {
        expect(realm.season, 'claudecraft must stay on upstream copy').toBeUndefined();
        continue;
      }
      expect(realm.season, `${realm.id} should declare a season`).toBeTruthy();
      expect(realm.season!.eyebrow.length).toBeGreaterThan(0);
      expect(realm.season!.title.length).toBeGreaterThan(0);
      expect(realm.season!.body.length).toBeGreaterThan(0);
      titles.set(realm.id, realm.season!.title);
    }
    // Each realm's season is its OWN -- no two share a name, and none is "The Armory".
    const unique = new Set(titles.values());
    expect(unique.size).toBe(titles.size);
    expect([...unique]).not.toContain('The Armory');
  });

  it('resolves the active realm season and falls back for claudecraft', () => {
    forceRealm('infernal');
    expect(realmSeasonTitle('The Armory')).toBe('The Ember Reliquary');
    expect(realmSeasonEyebrow('Season 1')).toBe('Season 1');
    expect(realmSeasonBody('fallback body')).toContain('Infernal Realm');

    forceRealm('crypticrealm');
    expect(realmSeasonTitle('The Armory')).toBe('The Ciphered Vault');

    // No season declared: the caller's localized string wins, unchanged.
    forceRealm('claudecraft');
    expect(realmSeasonTitle('The Armory')).toBe('The Armory');
    expect(realmSeasonBody('fallback body')).toBe('fallback body');
  });
});
