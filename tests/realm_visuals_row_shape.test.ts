// A published override row is only served if its value is a JSON OBJECT.
// Stored as a JSON STRING it is dropped, the card falls through to
// `class:<cls>:f`, and it silently wears another card's body. Two rows sat
// inert in the live infernal document this way -- including the demon hunter,
// whose "looks like an amazon" report was the fix having been written, stored,
// and never served. Pin the contract so a publisher cannot reintroduce it.
import { describe, expect, it, vi } from 'vitest';
import { sanitizeRealmVisualsState } from '../server/realm_visuals';

const OBJ = { assetUrl: '/cr-realms/infernal/a.glb', assetName: 'A', updatedAt: '2026-01-01T00:00:00.000Z', updatedBy: 1 };

describe('override rows must be objects, not strings', () => {
  it('serves an object row', () => {
    const doc = sanitizeRealmVisualsState({ publishedRevision: 1, publishedOverrides: { 'hero:x:f': OBJ } });
    expect(Object.keys(doc.publishedOverrides)).toContain('hero:x:f');
    expect(doc.publishedOverrides['hero:x:f'].assetUrl).toBe(OBJ.assetUrl);
  });

  it('DROPS a row stored as a JSON string, and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doc = sanitizeRealmVisualsState({
      publishedRevision: 1,
      publishedOverrides: { 'hero:x:f': JSON.stringify(OBJ) as unknown as typeof OBJ },
    });
    expect(Object.keys(doc.publishedOverrides)).not.toContain('hero:x:f');
    // Silence is the actual defect: the row vanishes and the card wears
    // somebody else's body with nothing in the log to say why.
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toMatch(/not a JSON object/);
    warn.mockRestore();
  });

  it('keeps the good rows when one row in the map is a string', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const doc = sanitizeRealmVisualsState({
      publishedRevision: 1,
      publishedOverrides: {
        'hero:good:f': OBJ,
        'hero:bad:f': JSON.stringify(OBJ) as unknown as typeof OBJ,
      },
    });
    expect(Object.keys(doc.publishedOverrides)).toEqual(['hero:good:f']);
    warn.mockRestore();
  });
});
