// The Cinderveil overlay (RealmContent.entityText): the infernal realm's lore
// rebrand resolves inside tEntity() BEFORE the locale table, per realm only.
// Pins the three contract points: (a) infernal reads the overlay, (b) realms
// without entityText read canonical text byte-identically, (c) an id the
// overlay does not carry falls through unchanged, prototype keys included
// (the R34 raw-id contract must survive the overlay's own-property reads).
import { afterEach, describe, expect, it } from 'vitest';
import { INFERNAL_ENTITY_TEXT } from '../src/sim/realms/content/infernal_lore';
import { setRealmHostEnv } from '../src/sim/realms/registry';
import { deedDesc, deedName, deedTitleText } from '../src/ui/deed_i18n';
import {
  realmWaypointName,
  riftFloorLabel,
  tEntity,
  waypointDisplayName,
} from '../src/ui/entity_i18n';
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

  // Phase 2: the surfaces that bypass tEntity (waypoints ride the wire, deeds
  // have their own locale plumbing, the armory + loading copy are catalog keys,
  // the music labels resolve in src/game/music.ts).

  it('waypoint names re-skin at render on infernal and pass through elsewhere', () => {
    useRealm('infernal');
    expect(waypointDisplayName('wp_eastbrook_vale_wild', 'Eastbrook Trail')).toBe(
      'Candlebrook Trail',
    );
    expect(waypointDisplayName('wp_eastbrook_vale', 'Eastbrook')).toBe('Candlebrook');
    // A waypoint the overlay does not carry keeps its wire name.
    expect(waypointDisplayName('wp_willowfen', 'Bridgemere')).toBe('Bridgemere');
    // The sim-log splice path: canonical name -> id -> overlay.
    expect(realmWaypointName('Eastbrook Trail')).toBe('Candlebrook Trail');
    expect(realmWaypointName('not a waypoint')).toBe('not a waypoint');
    useRealm('claudecraft');
    expect(waypointDisplayName('wp_eastbrook_vale_wild', 'Eastbrook Trail')).toBe(
      'Eastbrook Trail',
    );
    expect(realmWaypointName('Eastbrook Trail')).toBe('Eastbrook Trail');
  });

  it('deed display text resolves the realm overlay before the deed locales', () => {
    useRealm('infernal');
    expect(deedName('chr_marsh_chapter_iii')).toBe('Chronicle of the Sorrowfen');
    expect(deedTitleText('chr_marsh_chapter_iii')).toBe('of the Sorrowfen');
    expect(deedDesc('chr_vale_cup_debut')).toBe(
      'Take the field and touch the ball in a Tallow Cup match at Harrowfield.',
    );
    useRealm('claudecraft');
    expect(deedName('chr_marsh_chapter_iii')).toBe('Chronicle of the Mirefen');
    expect(deedDesc('chr_vale_cup_debut')).toBe(
      'Take the field and touch the ball in a Vale Cup match at the Sowfield.',
    );
  });

  it('the loading tagline and armory lore re-skin through the catalog overlay', () => {
    useRealm('infernal');
    expect(t('loading.world')).toBe('Entering the Cinderveil...');
    expect(t('hudChrome.wocStore.skins.fletcher_s_guild_bow.lore')).toContain('Sorrowfen');
    // The Cup banner nations and the battleground blurb are chrome keys too.
    expect(t('hudChrome.vcup.nation.vale')).toBe('Candlebrook Vale');
    expect(t('hudChrome.bg.blurb')).toContain('Martyrspike');
    useRealm('claudecraft');
    expect(t('loading.world')).toBe('Loading world...');
    expect(t('hudChrome.wocStore.skins.fletcher_s_guild_bow.lore')).toContain('Mirefen');
    expect(t('hudChrome.vcup.nation.vale')).toBe('Eastbrook Vale');
    expect(t('hudChrome.bg.blurb')).toContain('Thornpeak');
  });

  it('music-zone label overrides keep identifier keys and only re-skin values', () => {
    // Keys are MusicZone identifiers (music.ts tables + stream file names);
    // renaming one silences a zone, so pin the exact key set shipped.
    expect(Object.keys(INFERNAL_ENTITY_TEXT.musicZones ?? {}).sort()).toEqual([
      'dungeon_hollow_crypt',
      'dungeon_sunken_bastion',
      'marsh',
      'peaks',
      'town_eastbrook',
      'vale',
      'vale_cup',
      'vale_legacy',
    ]);
    expect(INFERNAL_ENTITY_TEXT.musicZones?.vale_cup).toBe('The Tallow Cup');
    // The Tallow Cup bot roster stays a full 9-seat pool (one side always
    // holds a human, nine bots is the ceiling).
    expect(INFERNAL_ENTITY_TEXT.vcBotNames).toHaveLength(9);
  });
});
