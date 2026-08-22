// Tests for the High Scores realm filter (src/ui/cryptic/highscores_realm_filter.ts):
// the pure tag normalization and chip matching the client-side filter runs on, plus
// the render-time contract that the global board's rows actually carry the tag the
// filter matches against (src/ui/highscore_board.ts stamps data-realm per row).

import { describe, expect, it } from 'vitest';
import { REALM_LIST } from '../src/sim/realms';
import { normalizeRealmTag, rowMatchesChip } from '../src/ui/cryptic/highscores_realm_filter';
import { highscoreRowHtml } from '../src/ui/highscore_board';
import { setLanguage } from '../src/ui/i18n';
import type { LeaderboardEntry } from '../src/world_api';

setLanguage('en');

function entry(over: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    rank: 1,
    name: 'Zyzz',
    cls: 'warrior',
    level: 60,
    virtualLevel: 12,
    lifetimeXp: 5_000_000,
    prestigeRank: 0,
    title: null,
    realm: 'Claudemoon',
    ...over,
  };
}

describe('normalizeRealmTag', () => {
  it('folds a display string, an id, and a host label onto one axis', () => {
    expect(normalizeRealmTag('Arcane Nexus')).toBe('arcanenexus');
    expect(normalizeRealmTag('arcadevoid')).toBe('arcadevoid');
    expect(normalizeRealmTag("Mal'Ganis")).toBe('malganis');
    expect(normalizeRealmTag(undefined)).toBe('');
    expect(normalizeRealmTag(null)).toBe('');
  });
});

describe('rowMatchesChip', () => {
  it('shows every row on the all chip and every untagged row on any chip', () => {
    expect(rowMatchesChip('claudemoon', 'all')).toBe(true);
    expect(rowMatchesChip('', 'arcane')).toBe(true);
  });

  it('matches a realm chip by registry id or display name', () => {
    // Arcane Nexus is the arcane realm; Arcane Void is arcadevoid. The chip id
    // is the REALM_LIST id, the row tag is whatever the server process reports.
    expect(rowMatchesChip('arcane', 'arcane')).toBe(true);
    expect(rowMatchesChip('arcanenexus', 'arcane')).toBe(true);
    expect(rowMatchesChip('arcadevoid', 'arcadevoid')).toBe(true);
    expect(rowMatchesChip('arcanevoid', 'arcadevoid')).toBe(true);
    expect(rowMatchesChip('arcanenexus', 'arcadevoid')).toBe(false);
    expect(rowMatchesChip('claudemoon', 'arcane')).toBe(false);
  });

  it('accepts every REALM_LIST realm by both of its spellings', () => {
    for (const realm of REALM_LIST) {
      expect(rowMatchesChip(normalizeRealmTag(realm.id), realm.id)).toBe(true);
      expect(rowMatchesChip(normalizeRealmTag(realm.name), realm.id)).toBe(true);
    }
  });
});

describe('highscore_board rows are realm-tagged for the filter', () => {
  it('stamps data-realm with the normalized realm on every row', () => {
    expect(highscoreRowHtml(entry({ realm: 'Arcane Nexus' }))).toContain(
      'data-realm="arcanenexus"',
    );
    expect(highscoreRowHtml(entry({ realm: undefined as unknown as string }))).toContain(
      'data-realm=""',
    );
  });
});
