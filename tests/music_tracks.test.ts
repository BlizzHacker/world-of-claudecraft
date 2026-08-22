import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COMBAT_STREAM_URLS,
  pickCombatTrackIndex,
  ZONE_STREAM_URLS,
} from '../src/game/music_tracks';

const publicDir = path.join(__dirname, '..', 'public');

function assetPath(url: string): string {
  return path.join(publicDir, ...url.split('/').filter(Boolean));
}

// The operator's Cryptic Realm soundtrack, byte-pinned: these twelve tracks
// are the only shipped music. A hash change means the shipped audio changed;
// recompute deliberately if a track is intentionally re-exported.
const CR_TRACK_HASHES: Record<string, string> = {
  'act-2-welcome-cryptic-realm.mp3':
    'ff493eda90474cfc9bf168f3220692f195dd024ed9337faee52f8a9db03cf28e',
  'act-5-sanctum-cryptic-realm.mp3':
    '3e0a40c6965dd80a0f8ec28eae8dd5534a1f05c86884720bfbe70c59aaacdee5',
  'catacomb-calls-cryptic-realm.mp3':
    '0140f9b17baf66d8a310c57afb9bf1a0e8de8acb52f26b36dd6dca7aee840209',
  'corrupted-temple-cryptic-realm.mp3':
    '1f0a22f23b30bb27a7e810e33b0885af381fc129cfd90e9b0a26b070cf018b9c',
  'dungeon-time-cryptic-realm.mp3':
    'cdf3c9e1c338ab307a3ed26b72a0636f965691292f22de7c86d1d5a5bcb0ba7b',
  'just-another-crypt-cryptic-realm.mp3':
    'd1b0e289100ea5f66989e4ea4c3560491b86ee1e10d46a755a979d897c146436',
  'loading-screen-cryptic-realm.mp3':
    '873ecba0763d0adbe80b8fa18e6ded9b6ed37a8a017db6b242b2830a93f10ee4',
  'the-forest-calls-cryptic-realm.mp3':
    'e9d9ac35984a5c69ad2f30cbdf4a29b39242817ad8fd1faf6450dd049e04ce48',
  'the-journey-begins-cryptic-realm.mp3':
    '1c224747c2557c0a3464bb9ee4b9ce395e32a0945a5d2a1092ebb86c92a4b81f',
  'throne-of-ashes-boss-fight-activated-cryptic-realm.mp3':
    'f1369a642b6ad65b60304ee017d1d4656f04b04a54c72fab2083a12324e6721d',
  'town-hall-cryptic-realm.mp3': 'b128925492a828faf8ed84ca442e6b396131ffd871d29938589391ce4de9649b',
  'welcome-home-cryptic-realm.mp3':
    '1d382dfb0b3d0e17e01dd68d10524c90f3e0e19acaaa67314dce86e64687d1a7',
};

describe('Cryptic Realm soundtrack catalog', () => {
  it('maps every routable zone to a committed CR mp3 under public/audio/cryptic', () => {
    for (const [zone, url] of Object.entries(ZONE_STREAM_URLS)) {
      expect(url, `zone '${zone}'`).toMatch(/^\/audio\/cryptic\/[a-z0-9-]+\.mp3$/);
      expect(existsSync(assetPath(url)), `missing asset for zone '${zone}': ${url}`).toBe(true);
    }
  });

  it('pins the operator CR track bytes for every shipped file', () => {
    for (const [file, expectedHash] of Object.entries(CR_TRACK_HASHES)) {
      const url = `/audio/cryptic/${file}`;
      expect(existsSync(assetPath(url)), `missing CR track: ${file}`).toBe(true);
      const hash = createHash('sha256')
        .update(readFileSync(assetPath(url)))
        .digest('hex');
      expect(hash, `${file} bytes`).toBe(expectedHash);
    }
  });

  it('streams only tracks from the pinned CR set', () => {
    const urls = [...Object.values(ZONE_STREAM_URLS), ...COMBAT_STREAM_URLS];
    for (const url of urls) {
      const file = url.split('/').at(-1) ?? '';
      expect(CR_TRACK_HASHES[file], `unpinned track: ${url}`).toBeDefined();
    }
  });

  it('routes the thematic anchors to their matching CR cues', () => {
    expect(ZONE_STREAM_URLS.town_eastbrook).toBe('/audio/cryptic/welcome-home-cryptic-realm.mp3');
    expect(ZONE_STREAM_URLS.town_fenbridge).toBe('/audio/cryptic/town-hall-cryptic-realm.mp3');
    expect(ZONE_STREAM_URLS.town_highwatch).toBe(
      '/audio/cryptic/the-journey-begins-cryptic-realm.mp3',
    );
    expect(ZONE_STREAM_URLS.vale).toBe('/audio/cryptic/the-forest-calls-cryptic-realm.mp3');
    expect(ZONE_STREAM_URLS.peaks).toBe('/audio/cryptic/act-5-sanctum-cryptic-realm.mp3');
    expect(ZONE_STREAM_URLS.farshore).toBe('/audio/cryptic/act-2-welcome-cryptic-realm.mp3');
    expect(ZONE_STREAM_URLS.haunt).toBe('/audio/cryptic/just-another-crypt-cryptic-realm.mp3');
    expect(ZONE_STREAM_URLS.dungeon_hollow_crypt).toBe(
      '/audio/cryptic/just-another-crypt-cryptic-realm.mp3',
    );
    expect(ZONE_STREAM_URLS.dungeon_sunken_bastion).toBe(
      '/audio/cryptic/catacomb-calls-cryptic-realm.mp3',
    );
    expect(ZONE_STREAM_URLS.dungeon_gravewyrm_sanctum).toBe(
      '/audio/cryptic/dungeon-time-cryptic-realm.mp3',
    );
  });

  it('streams the vale_cup stadium from the CR set now the Sowfield pair is retired', () => {
    expect(ZONE_STREAM_URLS.vale_cup).toBe('/audio/cryptic/the-forest-calls-cryptic-realm.mp3');
  });

  it('opens combat on the throne-of-ashes track and it exists on disk', () => {
    expect(COMBAT_STREAM_URLS).toEqual([
      '/audio/cryptic/throne-of-ashes-boss-fight-activated-cryptic-realm.mp3',
    ]);
    for (const url of COMBAT_STREAM_URLS) {
      expect(existsSync(assetPath(url)), `missing combat asset: ${url}`).toBe(true);
    }
  });

  it('covers every MusicZone key exactly once', () => {
    const zones: string[] = [
      'town_eastbrook',
      'town_fenbridge',
      'town_highwatch',
      'vale',
      'vale_legacy',
      'marsh',
      'peaks',
      'dusk',
      'ember',
      'frost',
      'amber',
      'fen',
      'night',
      'haunt',
      'jungle',
      'garden',
      'gale',
      'farshore',
      'vale_cup',
      'dungeon_hollow_crypt',
      'dungeon_sunken_bastion',
      'dungeon_gravewyrm_sanctum',
      'rift_frost',
      'rift_ember',
      'rift_venom',
      'rift_bone',
      'rift_brute',
      'rift_void',
      'rift_storm',
      'rift_tide',
    ];
    expect(Object.keys(ZONE_STREAM_URLS).sort()).toEqual([...zones].sort());
  });
});

describe('pickCombatTrackIndex', () => {
  it('spreads uniformly over the catalog', () => {
    expect(pickCombatTrackIndex(2, () => 0)).toBe(0);
    expect(pickCombatTrackIndex(2, () => 0.49)).toBe(0);
    expect(pickCombatTrackIndex(2, () => 0.5)).toBe(1);
    expect(pickCombatTrackIndex(2, () => 0.99)).toBe(1);
  });

  it('clamps degenerate rand values into range', () => {
    expect(pickCombatTrackIndex(2, () => 1)).toBe(1);
    expect(pickCombatTrackIndex(2, () => -0.5)).toBe(0);
    expect(pickCombatTrackIndex(0, () => 0.5)).toBe(0);
  });
});
