// $WOC is World of ClaudeCraft's token. Every other realm uses Cryptic Realm's own.
//
// The ticker and the short game name are baked as literals into translated copy
// ("Boutique WOC", "WOCストア", "your WoC account") because neither is ever translated,
// so t() swaps them for the active realm's. The two cases are case-SENSITIVE and
// distinct: `WOC` is the ticker, `WoC` is the game.
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '../src/ui/i18n';
import { REALMS, setRealmHostEnv } from '../src/sim/realms/registry';

function forceRealm(id: string) {
  setRealmHostEnv({
    queryParam: (n) => (n === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}
afterEach(() => setRealmHostEnv(null));

describe('per-realm token + brand in translated copy', () => {
  it('claudecraft keeps upstream WOC / WoC verbatim', () => {
    expect(REALMS.claudecraft.tokenSymbol).toBe('WOC');
    expect(REALMS.claudecraft.shortBrand).toBe('WoC');

    forceRealm('claudecraft');
    expect(t('hudChrome.wocStore.title')).toBe('WOC Store');
    expect(t('hudChrome.claudium.railWoc')).toBe('WOC');
    expect(t('hudChrome.wocStore.wallet.unlinked')).toContain('WoC account');
  });

  it('every other realm shows the Cryptic Realm ticker and brand', () => {
    for (const id of ['infernal', 'crypticrealm', 'dominion', 'exchange']) {
      forceRealm(id);
      expect(t('hudChrome.wocStore.title'), id).toBe('CR Store');
      expect(t('hudChrome.claudium.railWoc'), id).toBe('CR');
      expect(t('hudChrome.wocStore.close'), id).toBe('Close CR Store');
      // The GAME name, not the ticker: mixed-case WoC resolves to the fork's name.
      expect(t('hudChrome.wocStore.wallet.unlinked'), id).toContain('Cryptic Realm account');
      expect(t('hudChrome.wocStore.wallet.unlinked'), id).not.toContain('WoC account');
    }
  });

  it('interpolates and swaps together', () => {
    forceRealm('infernal');
    expect(t('hudChrome.claudium.wocBalance', { amount: '42' })).toBe('CR: 42');
    forceRealm('claudecraft');
    expect(t('hudChrome.claudium.wocBalance', { amount: '42' })).toBe('WOC: 42');
  });

  it('leaves copy that mentions neither untouched', () => {
    forceRealm('infernal');
    // A string with no ticker and no brand must come back exactly as translated.
    expect(t('hudChrome.wocStore.storeTab')).toBe('Store');
    expect(t('hudChrome.wocStore.rewardsTab')).toBe('Daily Rewards');
  });
});
