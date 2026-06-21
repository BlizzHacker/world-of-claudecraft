import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicDirector } from '../src/game/music';

// MusicDirector is WebAudio; jsdom has no AudioContext, so we stub the minimal
// surface init() touches. We only assert layer gain *targets* (the mix logic),
// not actual audio output.
class FakeParam {
  value = 0;
  setTargetAtTime = vi.fn();
}
class FakeGain {
  gain = new FakeParam();
  connect = vi.fn();
}
class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  createGain(): FakeGain { return new FakeGain(); }
  createDynamicsCompressor() {
    return {
      threshold: new FakeParam(), knee: new FakeParam(), ratio: new FakeParam(),
      attack: new FakeParam(), release: new FakeParam(), connect: vi.fn(),
    };
  }
  createConvolver() { return { buffer: null, connect: vi.fn() }; }
  createBuffer(_ch: number, len: number) { return { getChannelData: () => new Float32Array(len) }; }
  resume() { return Promise.resolve(); }
}

describe('MusicDirector — combat / background mix', () => {
  let director: MusicDirector;

  beforeEach(() => {
    const g = globalThis as unknown as { AudioContext: unknown; window: unknown };
    g.AudioContext = FakeAudioContext;
    // init() schedules via window.setInterval; tests run in node, so stub it to a
    // no-op (we drive update() synchronously and never need the scheduler to fire)
    g.window = { setInterval: () => 0 };
    director = new MusicDirector();
    director.init();
  });

  afterEach(() => {
    // init() registers a scheduler interval; stop it so it can't leak across tests
    clearInterval((director as unknown as { timer: number }).timer);
  });

  const layers = () => (director as unknown as {
    layers: Record<string, { target: number }>;
  }).layers;

  it('plays the zone theme and no combat layer when out of combat', () => {
    director.update('vale', false);
    expect(layers().vale.target).toBe(1);
    expect(layers().combat.target).toBe(0);
  });

  it('silences the zone theme so ONLY combat music plays in combat (no layering)', () => {
    director.update('vale', false);
    director.update('vale', true);
    // the bug was a 0.45 duck here — the zone must be fully silenced now
    expect(layers().vale.target).toBe(0);
    expect(layers().combat.target).toBe(1);
  });

  it('restores the background theme and drops combat when combat ends', () => {
    director.update('vale', true);
    director.update('vale', false);
    expect(layers().vale.target).toBe(1);
    expect(layers().combat.target).toBe(0);
  });

  it('never runs the zone and combat layers at non-zero gain simultaneously', () => {
    for (const inCombat of [false, true, false, true]) {
      director.update('vale', inCombat);
      const zone = layers().vale.target;
      const combat = layers().combat.target;
      expect(Math.min(zone, combat)).toBe(0);
    }
  });
});
