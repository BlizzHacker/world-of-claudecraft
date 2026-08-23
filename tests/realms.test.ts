import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REALM,
  getRealm,
  isRealmId,
  REALM_LIST,
  REALMS,
  type RealmId,
} from '../src/sim/realms';
import { evaluateItem, parsePickitFilter } from '../src/sim/realms/pickit';
import { generateRealmItem, RARITY, RARITY_ORDER, rollRarity } from '../src/sim/realms/rarity';
import { Rng } from '../src/sim/rng';

describe('realm registry', () => {
  it('ships nine realms (eight playable realm families + The Exchange)', () => {
    expect(Object.keys(REALMS).sort()).toEqual([
      'arcadevoid',
      'arcane',
      'classic',
      'claudecraft',
      'crypticrealm',
      'dominion',
      'exchange',
      'fps',
      'infernal',
    ]);
    expect(REALM_LIST.length).toBe(9);
  });

  it('default realm is registered and matches DEFAULT_REALM', () => {
    expect(REALMS[DEFAULT_REALM]).toBeTruthy();
    expect(REALMS[DEFAULT_REALM].id).toBe(DEFAULT_REALM);
  });

  it('each realm exposes the required display metadata', () => {
    for (const realm of REALM_LIST) {
      expect(realm.id).toBeTruthy();
      expect(realm.name).toBeTruthy();
      expect(realm.tagline).toBeTruthy();
      expect(realm.description.length).toBeGreaterThan(20);
      expect(realm.mood).toBeTruthy();
      expect(realm.accentHex).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      expect(realm.previewColors.primary).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      expect(realm.previewColors.secondary).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });

  it('themed realms (non-claudecraft) carry 5 class skins each', () => {
    const themed: RealmId[] = ['infernal', 'classic', 'dominion', 'arcane'];
    for (const id of themed) {
      const realm = getRealm(id);
      expect(realm.classes.length).toBe(5);
      for (const c of realm.classes) {
        expect(c.id).toBeTruthy();
        expect(c.name).toBeTruthy();
        expect(c.skills.length).toBeGreaterThanOrEqual(4);
        expect(c.skillTrees.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('claudecraft is the pristine fallback (zero re-skins)', () => {
    expect(getRealm('claudecraft').classes).toEqual([]);
  });

  it('The Exchange is a cross-realm hub with no classes of its own', () => {
    const ex = getRealm('exchange');
    expect(ex.crossRealm).toBe(true);
    expect(ex.classes).toEqual([]);
  });

  it('Arcane Void keeps the Cryptic Realm mark and serves no realm-pack art', () => {
    const arcade = getRealm('arcadevoid');
    expect(arcade.name).toBe('Arcane Void');
    expect(arcade.classes.length).toBeGreaterThanOrEqual(3);
    // This realm's source art drop is third-party material (see the note in
    // realms/content/arcade_void.ts), so no branding surface may point into
    // its asset-pack directory until original art replaces it.
    const branding = Object.values(arcade.branding ?? {}).filter(
      (v): v is string => typeof v === 'string',
    );
    for (const src of branding) expect(src).not.toContain('/cr-realms/arcadevoid/');
    expect(arcade.branding?.loadingScreenSrc).toBe('/cryptic-realm-loading-bg.webp');
  });

  it('every realm on the wordmark art declares it so the overlay logo stays hidden', () => {
    // The shared Cryptic Realm loading art paints the title itself. A realm that
    // serves it without the flag would stack the overlay logo on the baked one.
    for (const realm of Object.values(REALMS)) {
      const src = realm.branding?.loadingScreenSrc;
      if (src === '/cryptic-realm-loading-bg.webp') {
        expect(realm.branding?.loadingArtHasWordmark).toBe(true);
      } else {
        expect(realm.branding?.loadingArtHasWordmark ?? false).toBe(false);
      }
    }
  });

  it('isRealmId narrows correctly', () => {
    expect(isRealmId('infernal')).toBe(true);
    expect(isRealmId('CLAUDECRAFT')).toBe(false);
    expect(isRealmId(null)).toBe(false);
    expect(isRealmId(undefined)).toBe(false);
    expect(isRealmId('Diablo')).toBe(false);
  });

  it('getRealm falls back to default for unknown ids', () => {
    expect(getRealm('infernal').id).toBe('infernal');
    // @ts-expect-error invalid id at compile time, runtime fallback
    expect(getRealm('made-up').id).toBe(DEFAULT_REALM);
  });
});

describe('rarity system', () => {
  it('rarity order matches the table', () => {
    expect(RARITY_ORDER).toEqual(['common', 'magic', 'rare', 'legendary', 'mythic', 'unique']);
    for (const id of RARITY_ORDER) {
      expect(RARITY[id].id).toBe(id);
    }
  });

  it('rollRarity is deterministic per seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 20; i++) {
      expect(rollRarity(a)).toBe(rollRarity(b));
    }
  });

  it('generateRealmItem emits affix counts matching rarity', () => {
    const rng = new Rng(1234);
    const magicItem = generateRealmItem(rng, 'weapon', 'magic', 5);
    expect(magicItem.affixes.length).toBe(2);
    expect(magicItem.slot).toBe('weapon');
    expect(magicItem.rarity).toBe('magic');
    const rareItem = generateRealmItem(rng, 'armor', 'rare', 10);
    expect(rareItem.affixes.length).toBe(4);
    const uniqueItem = generateRealmItem(rng, 'amulet', 'unique', 20);
    expect(uniqueItem.affixes.length).toBe(0);
  });
});

describe('pickit loot filter', () => {
  it('parses SHOW / HIDE rules with rarity conditions', () => {
    const rules = parsePickitFilter(
      `# show all rares and up\nSHOW rarity>=rare HIGHLIGHT\nHIDE rarity=common`,
    );
    expect(rules.length).toBe(2);
    expect(rules[0]).toMatchObject({ action: 'show', highlight: true });
    expect(rules[0].conditions[0]).toEqual({ key: 'rarity', op: '>=', value: 'rare' });
    expect(rules[1]).toMatchObject({ action: 'hide', highlight: false });
  });

  it('first matching rule wins; default is show', () => {
    const rules = parsePickitFilter(`SHOW rarity>=rare\nHIDE slot=weapon`);
    const rng = new Rng(7);
    const rareWeapon = generateRealmItem(rng, 'weapon', 'rare', 1);
    expect(evaluateItem(rareWeapon, rules).show).toBe(true);
    const commonWeapon = generateRealmItem(rng, 'weapon', 'common', 1);
    expect(evaluateItem(commonWeapon, rules).show).toBe(false);
    const commonArmor = generateRealmItem(rng, 'armor', 'common', 1);
    expect(evaluateItem(commonArmor, rules).show).toBe(true);
  });

  it('parses COLOR: tokens and HIGHLIGHT flag', () => {
    const rules = parsePickitFilter(`SHOW rarity=legendary HIGHLIGHT COLOR:#ff8c00`);
    expect(rules[0].color).toBe('#ff8c00');
    expect(rules[0].highlight).toBe(true);
  });
});
