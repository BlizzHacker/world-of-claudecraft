// The Cinderveil overlay (RealmContent.entityText): the infernal realm's lore
// rebrand resolves inside tEntity() BEFORE the locale table, per realm only.
// Pins the three contract points: (a) infernal reads the overlay, (b) realms
// without entityText read canonical text byte-identically, (c) an id the
// overlay does not carry falls through unchanged, prototype keys included
// (the R34 raw-id contract must survive the overlay's own-property reads).
import { afterEach, describe, expect, it } from 'vitest';
import { setRealmHostEnv } from '../src/sim/realms/registry';
import { riftFloorLabel, tEntity } from '../src/ui/entity_i18n';
import { t } from '../src/ui/i18n';

function useRealm(id: string): void {
  setRealmHostEnv({
    queryParam: (name) => (name === 'realm' ? id : null),
    storageGet: () => null,
    storageSet: () => {},
  });
}

afterEach(() => setRealmHostEnv(null));

describe('infernal lore overlay (the Cinderveil)', () => {
  it('tEntity on infernal serves the overlay name for the vale zone id', () => {
    useRealm('infernal');
    expect(tEntity({ kind: 'zone', id: 'eastbrook_vale', field: 'name' })).toBe('Candlebrook Vale');
  });

  it('realms without entityText keep the canonical name', () => {
    useRealm('claudecraft');
    expect(tEntity({ kind: 'zone', id: 'eastbrook_vale', field: 'name' })).toBe('Eastbrook Vale');
    useRealm('classic');
    expect(tEntity({ kind: 'zone', id: 'eastbrook_vale', field: 'name' })).toBe('Eastbrook Vale');
  });

  it('an id with no overlay entry falls through unchanged on infernal', () => {
    useRealm('infernal');
    // No bible rename for the Willowfen: canonical text survives the overlay.
    expect(tEntity({ kind: 'zone', id: 'willowfen', field: 'name' })).toBe('The Willowfen');
    // Canon anchor: Gravewyrm Sanctum never renames.
    expect(tEntity({ kind: 'dungeon', id: 'gravewyrm_sanctum', field: 'name' })).toBe(
      'Gravewyrm Sanctum',
    );
    // Prototype keys keep the raw-id contract even with the overlay active.
    expect(tEntity({ kind: 'npc', id: 'constructor', field: 'name' })).toBe('constructor');
    expect(tEntity({ kind: 'quest', id: 'q_future_expansion', field: 'title' })).toBe(
      'q_future_expansion',
    );
  });

  it('the catalog overlay and rift tear-words apply on infernal only', () => {
    useRealm('infernal');
    expect(t('hudChrome.vcup.title')).toBe('The Tallow Cup');
    expect(riftFloorLabel('Ember Spire', 'A')).toBe('Rend (A): Ember Spire');
    useRealm('claudecraft');
    expect(t('hudChrome.vcup.title')).toBe('The Vale Cup');
    expect(riftFloorLabel('Ember Spire', 'A')).toBe('Ember Spire (A)');
  });
});
