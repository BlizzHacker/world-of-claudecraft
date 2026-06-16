import { describe, expect, it } from 'vitest';
import { forcedTierFromSearch, isConstrainedBrowser, isWeakIntegratedGpu, tierFromHints, type GfxRuntimeHints } from '../src/render/gfx';

const desktop: GfxRuntimeHints = {
  search: '',
  maxTouchPoints: 0,
  coarsePointer: false,
  narrowViewport: false,
};

describe('graphics tier resolution', () => {
  it('honors explicit URL tier overrides', () => {
    expect(forcedTierFromSearch('?lowgfx')).toBe('low');
    expect(forcedTierFromSearch('?gfx=low')).toBe('low');
    expect(forcedTierFromSearch('?gfx=medium')).toBe('medium');
    expect(forcedTierFromSearch('?gfx=high')).toBe('high');
    expect(forcedTierFromSearch('?gfx=ultra')).toBe('ultra');
    expect(forcedTierFromSearch('?gfx=banana')).toBe(null);
  });

  it('treats phone-class and low-memory browsers as constrained', () => {
    expect(isConstrainedBrowser({ ...desktop, maxTouchPoints: 1, coarsePointer: true })).toBe(true);
    expect(isConstrainedBrowser({ ...desktop, maxTouchPoints: 1, narrowViewport: true })).toBe(true);
    expect(isConstrainedBrowser({ ...desktop, deviceMemory: 4 })).toBe(true);
    expect(isConstrainedBrowser({ ...desktop, maxTouchPoints: 1 })).toBe(false);
    expect(isConstrainedBrowser(desktop)).toBe(false);
  });

  it('drops automatic constrained and software sessions to low while preserving forced high', () => {
    expect(tierFromHints(desktop, false)).toBe('high');
    expect(tierFromHints(desktop, true)).toBe('low');
    expect(tierFromHints({ ...desktop, maxTouchPoints: 1, coarsePointer: true }, false)).toBe('low');
    expect(tierFromHints({ ...desktop, search: '?gfx=high', maxTouchPoints: 1, coarsePointer: true }, false)).toBe('high');
    expect(tierFromHints({ ...desktop, search: '?gfx=ultra' }, true)).toBe('ultra');
  });

  it('honors persisted presets when the URL does not force a tier', () => {
    expect(tierFromHints({ ...desktop, graphicsPreset: 1 }, false)).toBe('low');
    expect(tierFromHints({ ...desktop, graphicsPreset: 2 }, false)).toBe('medium');
    expect(tierFromHints({ ...desktop, graphicsPreset: 3 }, false)).toBe('high');
    expect(tierFromHints({ ...desktop, graphicsPreset: 4 }, false)).toBe('ultra');
    expect(tierFromHints({ ...desktop, graphicsPreset: 5 }, false)).toBe('high');
    expect(tierFromHints({ ...desktop, search: '?gfx=low', graphicsPreset: 3 }, false)).toBe('low');
  });

  it('treats older Intel integrated GPUs as constrained in auto mode', () => {
    expect(isWeakIntegratedGpu('ANGLE (Intel, ANGLE Metal Renderer: Intel(R) Iris(TM) Plus Graphics 655)')).toBe(true);
    expect(isWeakIntegratedGpu('ANGLE (Apple, ANGLE Metal Renderer: Apple M2)')).toBe(false);
    expect(tierFromHints({ ...desktop, gpuRenderer: 'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics 655)' }, false)).toBe('low');
  });
});
