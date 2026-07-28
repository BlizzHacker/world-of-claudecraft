import { describe, expect, it } from 'vitest';
import { REALMS } from '../src/sim/realms/registry';

// The user's hard requirement: no realm except ClaudeCraft may show upstream's
// $WOC ticker or WoC brand anywhere in user-visible copy. applyRealmBrand() in
// i18n.ts rewrites both at the t() seam, driven by RealmContent.tokenSymbol /
// shortBrand, so this asserts the DATA those substitutions read.
describe('no WOC branding outside the claudecraft realm', () => {
  for (const realm of Object.values(REALMS)) {
    const isCC = realm.id === 'claudecraft';
    it(`${realm.id}: ticker + brand`, () => {
      const ticker = realm.tokenSymbol ?? 'CR';
      const brand = realm.shortBrand ?? 'Cryptic Realm';
      if (isCC) {
        expect(ticker).toBe('WOC');
        expect(brand).toBe('WoC');
      } else {
        expect(ticker).not.toBe('WOC');
        expect(brand).not.toBe('WoC');
        expect(ticker).toBe('CR');
      }
    });
    it(`${realm.id}: name/tagline/description carry no WoC`, () => {
      const prose = `${realm.name} ${realm.tagline} ${realm.description} ${realm.mood}`;
      if (!isCC) {
        expect(prose).not.toMatch(/\bWOC\b/);
        expect(prose).not.toMatch(/\bWoC\b/);
        expect(prose).not.toMatch(/ClaudeCraft/i);
      }
    });
    it(`${realm.id}: declares its own season`, () => {
      if (!isCC) expect(realm.season?.title).toBeTruthy();
    });
  }
});
