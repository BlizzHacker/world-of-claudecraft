import { describe, expect, it } from 'vitest';
import { gfxInternalsForTest } from '../src/render/gfx';

// Reported from a real Xbox One X: the page died with SBOX_FATAL_MEMORY_EXCEEDED
// on world entry. The console browser has the same hard resident-memory ceiling
// as iOS WebKit, and the bounded-residency path exists for exactly that. Before
// this, Xbox pooled character visuals without limit.
const xbox = { xboxConsole: true, maxTouchPoints: 0, coarsePointer: false, narrowViewport: false };
const desktop = { xboxConsole: false, maxTouchPoints: 0, coarsePointer: false, narrowViewport: false };

describe('console memory ceiling', () => {
  it('caps pooled character visuals on Xbox', () => {
    const s = gfxInternalsForTest.settingsFor('medium', xbox);
    expect(s.maxPooledCharacterVisuals).toBe(6);
    expect(Number.isFinite(s.maxPooledCharacterVisuals)).toBe(true);
  });

  it('leaves desktop pooling unbounded', () => {
    const s = gfxInternalsForTest.settingsFor('medium', desktop);
    expect(s.maxPooledCharacterVisuals).toBe(Number.POSITIVE_INFINITY);
  });

  // The composer and AO are the two largest one-shot GPU allocations, and the
  // runtime governor cannot reclaim them once created.
  it('drops the composer and AO on Xbox even at high tier', () => {
    const s = gfxInternalsForTest.settingsFor('high', xbox);
    expect(s.composer).toBe(false);
    expect(s.ao).toBe(false);
  });

  it('keeps them on an equivalent desktop tier', () => {
    const s = gfxInternalsForTest.settingsFor('high', desktop);
    expect(s.composer).toBe(true);
  });

  it('caps point lights on Xbox', () => {
    expect(gfxInternalsForTest.settingsFor('high', xbox).maxPointLights).toBe(2);
  });
});
