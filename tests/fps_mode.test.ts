// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Minimal Input shim — the FPS module only touches camDist + camPitch.
// We don't need a real Input here; we just need the camera fields to mutate.
interface InputShim { camDist: number; camPitch: number; camYaw: number; }
function makeInput(): InputShim {
  return { camDist: 12, camPitch: 0.32, camYaw: Math.PI };
}

describe('fps mode (CR overlay)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.className = '';
    window.localStorage.clear();
    vi.resetModules();
  });
  afterEach(() => {
    document.body.className = '';
  });

  it('resolveFpsMode defaults to off without a saved preference', async () => {
    const { resolveFpsMode } = await import('../src/ui/cryptic/fps_mode');
    expect(resolveFpsMode()).toBe('off');
  });

  it('persistFpsMode + resolveFpsMode round-trip', async () => {
    const { resolveFpsMode, persistFpsMode } = await import('../src/ui/cryptic/fps_mode');
    persistFpsMode('on');
    expect(resolveFpsMode()).toBe('on');
    persistFpsMode('diablo');
    expect(resolveFpsMode()).toBe('diablo');
    persistFpsMode('off');
    expect(resolveFpsMode()).toBe('off');
  });

  it('mountFpsMode injects a reticle into the DOM', async () => {
    const { mountFpsMode } = await import('../src/ui/cryptic/fps_mode');
    mountFpsMode(makeInput() as never);
    expect(document.getElementById('cr-fps-reticle')).toBeTruthy();
  });

  it('setFpsMode("on") clamps camDist near zero and adds the body class', async () => {
    const { mountFpsMode, setFpsMode, isFpsActive } = await import('../src/ui/cryptic/fps_mode');
    const inp = makeInput();
    mountFpsMode(inp as never);
    expect(isFpsActive()).toBe(false);
    setFpsMode(inp as never, 'on');
    expect(isFpsActive()).toBe(true);
    expect(inp.camDist).toBeLessThan(1);
    expect(document.body.classList.contains('cr-fps-active')).toBe(true);
  });

  it('setFpsMode("off") restores the original camera distance/pitch', async () => {
    const { mountFpsMode, setFpsMode } = await import('../src/ui/cryptic/fps_mode');
    const inp = makeInput();
    const origDist = inp.camDist;
    const origPitch = inp.camPitch;
    mountFpsMode(inp as never);
    setFpsMode(inp as never, 'on');
    setFpsMode(inp as never, 'off');
    expect(inp.camDist).toBe(origDist);
    expect(inp.camPitch).toBe(origPitch);
    expect(document.body.classList.contains('cr-fps-active')).toBe(false);
  });

  it('setFpsMode("diablo") applies a high ARPG camera without the FPS reticle state', async () => {
    const { mountFpsMode, setFpsMode, isFpsActive } = await import('../src/ui/cryptic/fps_mode');
    const inp = makeInput();
    mountFpsMode(inp as never);
    setFpsMode(inp as never, 'diablo');
    expect(isFpsActive()).toBe(false);
    // Diablo preset: steep and slightly pulled OUT for a fixed tactical
    // overview. Zoom is intentionally wider than the default (12), pitch well above it.
    expect(inp.camDist).toBe(13);
    expect(inp.camPitch).toBeGreaterThan(0.8);
    expect(document.body.classList.contains('cr-fps-active')).toBe(false);
    expect(document.body.classList.contains('cr-diablo-camera-active')).toBe(true);
    setFpsMode(inp as never, 'off');
    expect(inp.camDist).toBe(12);
    expect(inp.camPitch).toBe(0.32);
  });

  it('V keypress toggles FPS mode (when no form input is focused)', async () => {
    const { mountFpsMode, isFpsActive } = await import('../src/ui/cryptic/fps_mode');
    const inp = makeInput();
    mountFpsMode(inp as never);
    expect(isFpsActive()).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v' }));
    expect(isFpsActive()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'V' }));
    expect(isFpsActive()).toBe(false);
  });

  it('V is ignored while typing in a text input', async () => {
    const { mountFpsMode, isFpsActive } = await import('../src/ui/cryptic/fps_mode');
    const inp = makeInput();
    mountFpsMode(inp as never);
    const txt = document.createElement('input');
    txt.type = 'text';
    document.body.appendChild(txt);
    txt.focus();
    // Synthesize the event with target = the focused text input.
    const ev = new KeyboardEvent('keydown', { key: 'v', bubbles: true });
    Object.defineProperty(ev, 'target', { value: txt });
    window.dispatchEvent(ev);
    expect(isFpsActive()).toBe(false);
  });

  it('cr-fps-toggle event respects whatever localStorage now reports', async () => {
    const { mountFpsMode, isFpsActive } = await import('../src/ui/cryptic/fps_mode');
    const inp = makeInput();
    mountFpsMode(inp as never);
    // Simulate the header button: persist first, dispatch event next.
    window.localStorage.setItem('cr_fps_mode', 'on');
    window.dispatchEvent(new CustomEvent('cr-fps-toggle'));
    expect(isFpsActive()).toBe(true);
    window.localStorage.setItem('cr_fps_mode', 'off');
    window.dispatchEvent(new CustomEvent('cr-fps-toggle'));
    expect(isFpsActive()).toBe(false);
  });
});


describe('an FPS-locked realm keeps the camera at the eye', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.className = '';
    window.localStorage.clear();
    vi.resetModules();
  });

  it('takes the camera back after another writer moves it', async () => {
    // The realm's premise is that the camera never leaves your eyes, and
    // mountFpsMode sets that ONCE. camDist has several other writers — the
    // remembered-zoom restore on entry, the wheel, pinch, scripted zooms — so a
    // write-once lock loses to all of them and the realm settles at the
    // third-person default. It shipped that way: booted into the FPS realm and
    // the player was looking at their own back from 12 yards.
    const frames: Array<(t: number) => void> = [];
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => frames.push(cb));
    const { setActiveRealmForOffline } = await import('../src/sim/realms');
    setActiveRealmForOffline('fps');
    try {
      const { mountFpsMode } = await import('../src/ui/cryptic/fps_mode');
      const inp = makeInput();
      mountFpsMode(inp as never);
      expect(inp.camDist).toBeLessThan(1);
      // Something else writes the camera, exactly as the settings restore does.
      inp.camDist = 12;
      for (const cb of frames.splice(0)) cb(0);
      expect(inp.camDist).toBeLessThan(1);
    } finally {
      setActiveRealmForOffline(null);
      vi.unstubAllGlobals();
    }
  });
});
