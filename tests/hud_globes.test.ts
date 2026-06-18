// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The globes module reads from `window.localStorage` and the DOM. JSDOM is the
// default Vitest environment, so we set a per-test storage shim and rebuild
// the player-frame markup before each case.
//
// We import the module dynamically inside each test so module-level state
// (the cached mount info) doesn't leak between cases.

const HP_TEXT = '#pf-hp-text';
const RES_TEXT = '#pf-res-text';
const RES_BAR = '#pf-resource';

function setupDom(hpText: string, resText: string, barClass: string) {
  document.body.innerHTML = `
    <div id="parent-host">
      <div id="player-frame">
        <div class="uf-bars">
          <div class="uf-name" id="pf-name">Hero</div>
          <div class="bar hp"><div id="pf-hp"></div><div id="pf-hp-text">${hpText}</div></div>
          <div class="bar ${barClass}" id="pf-resource"><div id="pf-res"></div><div id="pf-res-text">${resText}</div></div>
        </div>
      </div>
    </div>
  `;
}

describe('hud globes (CR overlay)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    document.body.innerHTML = '';
    document.body.className = '';
    window.localStorage.clear();
    if (typeof requestAnimationFrame === 'undefined') {
      // JSDOM in older envs may not have rAF; stub it to a no-op that runs once.
      (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => {
        setTimeout(() => cb(performance.now()), 16);
        return 1 as unknown as number;
      };
      (globalThis as Record<string, unknown>).cancelAnimationFrame = () => undefined;
    }
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolveHudSkin falls back to globes for non-claudecraft realms', async () => {
    window.localStorage.setItem('cr_active_realm', 'infernal');
    const { resolveHudSkin } = await import('../src/ui/cryptic/globes');
    expect(resolveHudSkin()).toBe('globes');
  });

  it('resolveHudSkin falls back to classic bars on the claudecraft realm', async () => {
    window.localStorage.setItem('cr_active_realm', 'claudecraft');
    const { resolveHudSkin } = await import('../src/ui/cryptic/globes');
    expect(resolveHudSkin()).toBe('classic');
  });

  it('persisted user choice wins over the realm default', async () => {
    window.localStorage.setItem('cr_active_realm', 'infernal');
    window.localStorage.setItem('cr_hud_skin', 'classic');
    const { resolveHudSkin } = await import('../src/ui/cryptic/globes');
    expect(resolveHudSkin()).toBe('classic');
  });

  it('setHudSkin persists and toggles the body class', async () => {
    const { setHudSkin } = await import('../src/ui/cryptic/globes');
    setHudSkin('globes');
    expect(window.localStorage.getItem('cr_hud_skin')).toBe('globes');
    expect(document.body.classList.contains('cr-hud-skin-globes')).toBe(true);
    setHudSkin('classic');
    expect(window.localStorage.getItem('cr_hud_skin')).toBe('classic');
    expect(document.body.classList.contains('cr-hud-skin-classic')).toBe(true);
    expect(document.body.classList.contains('cr-hud-skin-globes')).toBe(false);
  });

  it('mountHudGlobes injects a sibling and mirrors hp/resource text', async () => {
    setupDom('850 / 1000', '40 / 60', 'mana');
    window.localStorage.setItem('cr_hud_skin', 'globes');
    const { mountHudGlobes } = await import('../src/ui/cryptic/globes');
    mountHudGlobes();
    // Advance one rAF tick to let the loop run.
    await vi.advanceTimersByTimeAsync(20);
    const host = document.getElementById('cr-hud-globes');
    expect(host).toBeTruthy();
    expect(document.getElementById('cr-globe-hp-text')?.textContent).toBe('850 / 1000');
    expect(document.getElementById('cr-globe-res-text')?.textContent).toBe('40 / 60');
    // dashoffset for 85% fill should be ~15% of circumference (≈263.89), so ~39-40.
    const hpFill = document.getElementById('cr-globe-hp-fill') as unknown as SVGElement | null;
    const off = parseFloat(hpFill?.style.strokeDashoffset ?? '0');
    expect(off).toBeGreaterThan(35);
    expect(off).toBeLessThan(45);
  });

  it('idempotent: mounting twice does not duplicate the host', async () => {
    setupDom('500 / 500', '30 / 100', 'rage');
    window.localStorage.setItem('cr_hud_skin', 'globes');
    const { mountHudGlobes } = await import('../src/ui/cryptic/globes');
    mountHudGlobes();
    mountHudGlobes();
    await vi.advanceTimersByTimeAsync(20);
    expect(document.querySelectorAll('#cr-hud-globes').length).toBe(1);
  });
});
