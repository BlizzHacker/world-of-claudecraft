import { describe, it, expect } from 'vitest';
import { CR_PLACEABLES, CR_PLACEABLE_CATEGORIES } from '../../src/classic/placeables';

describe('placeables catalog', () => {
  it('every placeable has id/label/category in a known category', () => {
    expect(CR_PLACEABLES.length).toBeGreaterThan(0);
    const catIds = CR_PLACEABLE_CATEGORIES.map((c) => c.id);
    for (const p of CR_PLACEABLES) {
      expect(p.id).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(catIds).toContain(p.category);
    }
  });

  it('no placeable uses the "all" meta-category', () => {
    for (const p of CR_PLACEABLES) {
      expect(p.category).not.toBe('all');
    }
  });

  it('categories have id, label, and accent', () => {
    expect(CR_PLACEABLE_CATEGORIES.length).toBeGreaterThan(0);
    for (const c of CR_PLACEABLE_CATEGORIES) {
      expect(c.id).toBeTruthy();
      expect(c.label).toBeTruthy();
      expect(c.accent).toBeTruthy();
    }
  });
});
