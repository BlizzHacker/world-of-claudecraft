// The router that keeps the split civilian bank honest. The bank went from four
// women plus one man to four women plus four men on 2026-08-21, and rendezvous
// hashing distributes blind, so without this a man lands on Widow Tansy and
// Huntsman Deral keeps his gown.
//
// It reads the AUTHORED display name only. The template id is a persistence key
// that outlives renames, and the asset filenames were laundered by the
// ip_rename pass and are known to lie (body_shape_gate.ts).

import { describe, expect, it } from 'vitest';
import { civilianGenderForName } from '../src/render/characters/civilian_gender';
import { NPCS } from '../src/sim/data';

describe('civilian gender router', () => {
  it('reads a gendered title, wherever it sits in the name', () => {
    expect(civilianGenderForName('Widow Tansy')).toBe('female');
    expect(civilianGenderForName('Mother Sedge')).toBe('female');
    expect(civilianGenderForName('Huntress Verr')).toBe('female');
    expect(civilianGenderForName('Brother Halven')).toBe('male');
    expect(civilianGenderForName('Huntsman Deral')).toBe('male');
    expect(civilianGenderForName('Fisherman Brandt')).toBe('male');
  });

  // The roster writes some titles as one word, so a word list alone misses them.
  it('reads a compound title the roster spells as a single word', () => {
    expect(civilianGenderForName('Wickmother Sorrel')).toBe('female');
    expect(civilianGenderForName('Loremother Bryn')).toBe('female');
    expect(civilianGenderForName('Forgemistress Darva')).toBe('female');
    // Hyphens split like spaces, so the compound need not be one token.
    expect(civilianGenderForName('Pearl-Mother Isha')).toBe('female');
  });

  it('reads the given name when the title carries no gender', () => {
    expect(civilianGenderForName('Saul the Chronicler')).toBe('male');
    expect(civilianGenderForName('Cainhurst the Sage')).toBe('male');
    expect(civilianGenderForName('Trader Wilkes')).toBe('male');
    expect(civilianGenderForName('Loremaster Caddis')).toBe('male');
    expect(civilianGenderForName('Keeper Bram')).toBe('male');
    expect(civilianGenderForName('Bursar Aldous Crane')).toBe('male');
    expect(civilianGenderForName('Bursar Petra Vell')).toBe('female');
    expect(civilianGenderForName('Hearthkeeper Maeve')).toBe('female');
  });

  // The title opens the name and is what a reader sees first, so it outranks a
  // given name behind it. Without the ordering the two lists would have to know
  // about each other.
  it('lets the title outrank the given name behind it', () => {
    expect(civilianGenderForName('Wickmother Sorrel')).toBe('female');
    expect(civilianGenderForName('Brother Sorrel')).toBe('male');
    expect(civilianGenderForName('Widow Saul')).toBe('female');
  });

  // Null is the common case and is not a failure: it draws from the whole bank,
  // which is exactly what shipped before the split.
  it('asserts nothing for a name that carries nothing', () => {
    expect(civilianGenderForName('Bellkeeper Tam')).toBeNull();
    expect(civilianGenderForName('Riftwatch Ollun')).toBeNull();
    expect(civilianGenderForName('Quartermaster Vex')).toBeNull();
    expect(civilianGenderForName('')).toBeNull();
    expect(civilianGenderForName(null)).toBeNull();
    expect(civilianGenderForName(undefined)).toBeNull();
  });

  // "-master" is NOT a male marker, and that is a roster fact rather than a
  // style choice: this roster hands it to Quartermaster Bree, Quartermaster
  // Edda, Quartermaster Sela and Harbormaster Odile, all women. Reading it as
  // male would put a man on four of them at once.
  it('leaves the neutral craft and office titles alone', () => {
    expect(civilianGenderForName('Ferrymaster Caddow')).toBeNull();
    expect(civilianGenderForName('Quartermaster Vex')).toBeNull();
    expect(civilianGenderForName('Quartermaster Bree')).toBe('female');
    expect(civilianGenderForName('Harbormaster Odile')).toBe('female');
  });

  // The male marker is "-man" and it is spelled out as whole words on purpose.
  // As a SUFFIX it would gender any future given name ending in those letters.
  // The female suffixes are real suffixes, so they must not fire mid-word.
  it('does not gender a name that merely contains a marker', () => {
    expect(civilianGenderForName('Warmarshal Draven Kole')).toBeNull();
    // "Merchant" ends in -hant, not -man, and must stay neutral.
    expect(civilianGenderForName('Merchant')).toBeNull();
    // "Wren Saddleworth" carries no marker and no listed given name.
    expect(civilianGenderForName('Wren Saddleworth')).toBeNull();
    // A suffix must not match the whole token, or "Mother" alone would be a
    // suffix hit rather than the title hit it is, and "Ress" would gender.
    expect(civilianGenderForName('Ress')).toBeNull();
  });

  // A guard against the table drifting off the roster it was written for: a
  // name the router claims to read must still exist to be read.
  it('reads a real, non-trivial share of the live roster', () => {
    const read = Object.values(NPCS).filter((npc) => civilianGenderForName(npc.name) !== null);
    expect(read.length).toBeGreaterThan(40);
  });
});
