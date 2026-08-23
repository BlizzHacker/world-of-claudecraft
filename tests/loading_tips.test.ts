import { describe, expect, it } from 'vitest';
import { t } from '../src/ui/i18n';
import { createLoadingTipRotation, loadingTipKeysForRealm } from '../src/ui/loading_tips';

const THEMED_REALMS = ['infernal', 'classic', 'arcane', 'dominion', 'arcadevoid'] as const;

describe('loading tip key selection', () => {
  it('serves the generic list alone for realms with no themed tips', () => {
    for (const realm of [null, undefined, 'crypticrealm', 'claudecraft', 'exchange', 'fps']) {
      const keys = loadingTipKeysForRealm(realm);
      expect(keys[0]).toBe('loading.tips.classes');
      expect(keys).toContain('loading.tips.pvp');
      expect(keys.some((k) => k.startsWith('loading.tips.infernal.'))).toBe(false);
    }
  });

  it('prepends each themed realm list and keeps the generic tips behind it', () => {
    const generic = loadingTipKeysForRealm(null);
    for (const realm of THEMED_REALMS) {
      const keys = loadingTipKeysForRealm(realm);
      const themed = keys.filter((k) => k.startsWith(`loading.tips.${realm}.`));
      expect(themed.length).toBeGreaterThanOrEqual(3);
      // Themed first, generic after: the tail is exactly the generic list.
      expect(keys.slice(0, themed.length)).toEqual(themed);
      expect(keys.slice(themed.length)).toEqual(generic);
      // No duplicates, and every key resolves to real, distinct English copy.
      expect(new Set(keys).size).toBe(keys.length);
      const texts = keys.map((k) => t(k));
      for (const text of texts) expect(text.length).toBeGreaterThan(0);
      expect(new Set(texts).size).toBe(texts.length);
    }
  });
});

describe('loading tip rotation', () => {
  it('current() returns non-empty resolved text at the given start index', () => {
    const rotation = createLoadingTipRotation(null, 0);
    expect(rotation.current().length).toBeGreaterThan(0);
  });

  it("opens a themed realm rotation on that realm's first themed tip", () => {
    const rotation = createLoadingTipRotation('infernal', 0);
    expect(rotation.current()).toBe(t('loading.tips.infernal.delves'));
    // The generic gameplay tips still follow the themed ones.
    const keys = loadingTipKeysForRealm('infernal');
    let text = rotation.current();
    for (let i = 1; i < keys.length; i++) text = rotation.next();
    expect(text).toBe(t('loading.tips.pvp'));
  });

  it('next() advances and wraps around back to the first tip', () => {
    for (const realm of [null, 'infernal'] as const) {
      const keys = loadingTipKeysForRealm(realm);
      const rotation = createLoadingTipRotation(realm, 0);
      const first = rotation.current();
      const seen = new Set([first]);
      let wrapped = false;
      for (let i = 0; i < keys.length; i++) {
        const tip = rotation.next();
        if (tip === first) {
          wrapped = true;
          // The wrap lands exactly one full pass through the realm's list.
          expect(i).toBe(keys.length - 1);
          break;
        }
        seen.add(tip);
      }
      expect(wrapped).toBe(true);
      expect(seen.size).toBe(keys.length);
    }
  });

  it('normalizes an out-of-range or negative start index into bounds', () => {
    const a = createLoadingTipRotation(null, -1);
    const b = createLoadingTipRotation('infernal', 1000);
    expect(a.current().length).toBeGreaterThan(0);
    expect(b.current().length).toBeGreaterThan(0);
  });
});
