// Thin impure half of the WebXR groundwork (src/render/xr_session.ts): the
// navigator.xr probe and the renderer attach/detach lifecycle, driven with a
// stubbed navigator and a structural fake renderer (XrTargetRenderer), so the
// whole contract runs in plain Node. The module holds the active session as
// module state, so every test re-imports through vi.resetModules().
import { afterEach, describe, expect, it, vi } from 'vitest';

type XrSessionModule = typeof import('../src/render/xr_session');

class FakeSession {
  ended = false;
  private listeners = new Map<string, Array<() => void>>();

  addEventListener(type: string, cb: () => void, _opts?: unknown): void {
    const list = this.listeners.get(type) ?? [];
    list.push(cb);
    this.listeners.set(type, list);
  }

  dispatch(type: string): void {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(type, []);
    for (const cb of list) cb();
  }

  end(): Promise<void> {
    this.ended = true;
    this.dispatch('end');
    return Promise.resolve();
  }
}

function fakeRenderer() {
  const calls: string[] = [];
  let setSessionImpl = (_s: unknown): Promise<void> => Promise.resolve();
  const renderer = {
    xr: {
      enabled: false,
      setReferenceSpaceType: (type: string) => calls.push(`refSpace:${type}`),
      setSession: (s: unknown) => {
        calls.push('setSession');
        return setSessionImpl(s);
      },
    },
  };
  return {
    renderer,
    calls,
    failSetSession(): void {
      setSessionImpl = () => Promise.reject(new Error('context lost'));
    },
  };
}

async function loadWithNavigator(nav: unknown): Promise<XrSessionModule> {
  vi.resetModules();
  vi.stubGlobal('navigator', nav);
  return await import('../src/render/xr_session');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('vrSupported', () => {
  it('is false without navigator.xr', async () => {
    const mod = await loadWithNavigator({});
    expect(await mod.vrSupported()).toBe(false);
  });

  it('mirrors the UA verdict for immersive-vr', async () => {
    const asked: string[] = [];
    const mod = await loadWithNavigator({
      xr: {
        isSessionSupported: (mode: string) => {
          asked.push(mode);
          return Promise.resolve(true);
        },
      },
    });
    expect(await mod.vrSupported()).toBe(true);
    expect(asked).toEqual(['immersive-vr']);
  });

  it('is false when the probe rejects (permissions policy)', async () => {
    const mod = await loadWithNavigator({
      xr: { isSessionSupported: () => Promise.reject(new Error('denied')) },
    });
    expect(await mod.vrSupported()).toBe(false);
  });
});

describe('enterVr', () => {
  it('attaches the session and restores the renderer when the session ends', async () => {
    const session = new FakeSession();
    const requested: unknown[] = [];
    const mod = await loadWithNavigator({
      xr: {
        requestSession: (mode: string, init: unknown) => {
          requested.push(mode, init);
          return Promise.resolve(session);
        },
      },
    });
    const rig = fakeRenderer();
    const got = await mod.enterVr(rig.renderer);
    expect(got).toBe(session);
    expect(mod.activeVrSession()).toBe(session);
    expect(rig.renderer.xr.enabled).toBe(true);
    expect(rig.calls).toEqual(['refSpace:local-floor', 'setSession']);
    expect(requested[0]).toBe('immersive-vr');
    expect(requested[1]).toEqual({ optionalFeatures: ['local-floor'] });

    session.dispatch('end');
    expect(mod.activeVrSession()).toBe(null);
    expect(rig.renderer.xr.enabled).toBe(false);
  });

  it('returns the active session on a double entry instead of re-requesting', async () => {
    const session = new FakeSession();
    let requests = 0;
    const mod = await loadWithNavigator({
      xr: {
        requestSession: () => {
          requests += 1;
          return Promise.resolve(session);
        },
      },
    });
    const rig = fakeRenderer();
    await mod.enterVr(rig.renderer);
    expect(await mod.enterVr(rig.renderer)).toBe(session);
    expect(requests).toBe(1);
  });

  it('returns null and touches nothing when the UA rejects the request', async () => {
    const mod = await loadWithNavigator({
      xr: { requestSession: () => Promise.reject(new Error('no activation')) },
    });
    const rig = fakeRenderer();
    expect(await mod.enterVr(rig.renderer)).toBe(null);
    expect(rig.renderer.xr.enabled).toBe(false);
    expect(rig.calls).toEqual([]);
    expect(mod.activeVrSession()).toBe(null);
  });

  it('ends the session and disarms the renderer when the attach fails', async () => {
    const session = new FakeSession();
    const mod = await loadWithNavigator({
      xr: { requestSession: () => Promise.resolve(session) },
    });
    const rig = fakeRenderer();
    rig.failSetSession();
    expect(await mod.enterVr(rig.renderer)).toBe(null);
    expect(rig.renderer.xr.enabled).toBe(false);
    expect(session.ended).toBe(true);
    expect(mod.activeVrSession()).toBe(null);
  });

  it('is a no-op without navigator.xr', async () => {
    const mod = await loadWithNavigator({});
    const rig = fakeRenderer();
    expect(await mod.enterVr(rig.renderer)).toBe(null);
    expect(rig.calls).toEqual([]);
  });
});
