import { beforeEach, describe, expect, it } from 'vitest';
import { clickMoveButtonLabel, normalizeClickMoveButton, Settings, SETTING_RANGES } from '../src/game/settings';

function installStorage(): void {
  const map = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
  };
}

beforeEach(() => installStorage());

describe('Settings', () => {
  it('starts at the documented defaults (camera calmer than the old 1.0)', () => {
    const s = new Settings();
    expect(s.get('cameraSpeed')).toBe(SETTING_RANGES.cameraSpeed.def);
    expect(s.get('cameraSpeed')).toBeLessThan(1); // addresses the "too fast" complaint
    expect(s.get('sfxVolume')).toBe(SETTING_RANGES.sfxVolume.def);
    expect(s.get('graphicsPreset')).toBe(SETTING_RANGES.graphicsPreset.def);
    expect(s.get('terrainDetail')).toBe(SETTING_RANGES.terrainDetail.def);
    expect(s.get('foliageDensity')).toBe(SETTING_RANGES.foliageDensity.def);
    expect(s.get('effectsQuality')).toBe(SETTING_RANGES.effectsQuality.def);
    expect(s.get('shadowQuality')).toBe(SETTING_RANGES.shadowQuality.def);
    expect(s.get('renderScale')).toBe(1);
    expect(s.get('fullscreen')).toBe(1);
    expect(s.get('clickToMove')).toBe(0);
    expect(s.get('clickToMoveButton')).toBe(0);
    expect(s.get('mouseCamera')).toBe(false);
  });

  it('clamps out-of-range values to the slider bounds', () => {
    const s = new Settings();
    expect(s.set('cameraSpeed', 99)).toBe(SETTING_RANGES.cameraSpeed.max);
    expect(s.set('cameraSpeed', -5)).toBe(SETTING_RANGES.cameraSpeed.min);
    expect(s.set('sfxVolume', 0.5)).toBe(0.5);
    expect(s.set('graphicsPreset', 99)).toBe(SETTING_RANGES.graphicsPreset.max);
    expect(s.set('terrainDetail', -1)).toBe(SETTING_RANGES.terrainDetail.min);
    expect(s.set('foliageDensity', -1)).toBe(SETTING_RANGES.foliageDensity.min);
    expect(s.set('effectsQuality', 99)).toBe(SETTING_RANGES.effectsQuality.max);
    expect(s.set('shadowQuality', -1)).toBe(SETTING_RANGES.shadowQuality.min);
    expect(s.set('fullscreen', -1)).toBe(0);
  });

  it('clamps touch opacity to its 0.3–1.0 bounds and defaults to fully opaque', () => {
    const s = new Settings();
    expect(s.get('touchOpacity')).toBe(SETTING_RANGES.touchOpacity.def);
    expect(s.set('touchOpacity', 5)).toBe(SETTING_RANGES.touchOpacity.max);
    expect(s.set('touchOpacity', 0)).toBe(SETTING_RANGES.touchOpacity.min);
    expect(s.set('touchOpacity', 0.6)).toBe(0.6);
  });

  it('ignores non-finite input, keeping a valid value', () => {
    const s = new Settings();
    s.set('brightness', NaN);
    expect(Number.isFinite(s.get('brightness'))).toBe(true);
  });

  it('persists across instances', () => {
    const a = new Settings();
    a.set('cameraSpeed', 0.4);
    a.set('musicVolume', 0.2);
    a.set('fullscreen', 0);
    const b = new Settings();
    expect(b.get('cameraSpeed')).toBe(0.4);
    expect(b.get('musicVolume')).toBe(0.2);
    expect(b.get('fullscreen')).toBe(0);
  });

  it('persists boolean settings across instances', () => {
    const a = new Settings();
    a.set('mouseCamera', true);
    const b = new Settings();
    expect(b.get('mouseCamera')).toBe(true);
  });

  it('defaults left-handed touch off and persists it across instances', () => {
    const a = new Settings();
    expect(a.get('leftHandedTouch')).toBe(false);
    a.set('leftHandedTouch', true);
    const b = new Settings();
    expect(b.get('leftHandedTouch')).toBe(true);
  });

  it('defaults touch look speed to 1x, clamps, and persists', () => {
    const a = new Settings();
    expect(a.get('touchLookSpeed')).toBe(SETTING_RANGES.touchLookSpeed.def);
    expect(a.set('touchLookSpeed', 99)).toBe(SETTING_RANGES.touchLookSpeed.max);
    expect(a.set('touchLookSpeed', -5)).toBe(SETTING_RANGES.touchLookSpeed.min);
    a.set('touchLookSpeed', 1.5);
    const b = new Settings();
    expect(b.get('touchLookSpeed')).toBe(1.5);
  });

  it('falls back to defaults for missing/corrupt keys', () => {
    localStorage.setItem('woc_settings', JSON.stringify({ cameraSpeed: 0.5 }));
    const s = new Settings();
    expect(s.get('cameraSpeed')).toBe(0.5);
    expect(s.get('brightness')).toBe(SETTING_RANGES.brightness.def); // missing -> default
    expect(s.get('fullscreen')).toBe(SETTING_RANGES.fullscreen.def);
  });

  it('reset() restores every default', () => {
    const s = new Settings();
    s.set('cameraSpeed', 1.2);
    s.set('renderScale', 0.5);
    s.set('graphicsPreset', 4);
    s.set('terrainDetail', 0);
    s.set('foliageDensity', 0);
    s.set('effectsQuality', 0);
    s.set('shadowQuality', 0);
    s.set('fullscreen', 0);
    s.set('mouseCamera', true);
    s.reset();
    expect(s.get('cameraSpeed')).toBe(SETTING_RANGES.cameraSpeed.def);
    expect(s.get('renderScale')).toBe(SETTING_RANGES.renderScale.def);
    expect(s.get('graphicsPreset')).toBe(SETTING_RANGES.graphicsPreset.def);
    expect(s.get('terrainDetail')).toBe(SETTING_RANGES.terrainDetail.def);
    expect(s.get('foliageDensity')).toBe(SETTING_RANGES.foliageDensity.def);
    expect(s.get('effectsQuality')).toBe(SETTING_RANGES.effectsQuality.def);
    expect(s.get('shadowQuality')).toBe(SETTING_RANGES.shadowQuality.def);
    expect(s.get('fullscreen')).toBe(SETTING_RANGES.fullscreen.def);
    expect(s.get('clickToMoveButton')).toBe(SETTING_RANGES.clickToMoveButton.def);
    expect(s.get('mouseCamera')).toBe(false);
  });

  it('all() returns an independent snapshot', () => {
    const s = new Settings();
    const snap = s.all();
    snap.cameraSpeed = 99;
    expect(s.get('cameraSpeed')).not.toBe(99);
  });
});

describe('click-to-move mouse button setting', () => {
  it('normalizes to left or right click labels', () => {
    expect(normalizeClickMoveButton(0)).toBe(0);
    expect(normalizeClickMoveButton(0.4)).toBe(0);
    expect(normalizeClickMoveButton(1)).toBe(2);
    expect(normalizeClickMoveButton(2)).toBe(2);
    expect(clickMoveButtonLabel(0)).toBe('Left Click');
    expect(clickMoveButtonLabel(2)).toBe('Right Click');
  });
});
