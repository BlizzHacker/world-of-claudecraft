// @vitest-environment jsdom
//
// The in-game reference tools (Skill Trees, Loot Vault, Pickit Filter, Monster
// Chronicle) and where they live.
//
// History this file guards, in order:
//   1. After 7f2439e84a removed #cr-bestiary-host from the realm panel, the
//      launchers fell back to a bare document.body append: static flow at the
//      page top-left, which the fixed full-viewport #game-canvas (z-index:0)
//      paints over as soon as the world renders. They flashed during loading and
//      were unreachable for the rest of the session. A launcher whose parent is
//      <body> is still the regression shape, and is still asserted against.
//   2. 51721ad963 rescued them into a fixed #cr-tools-host toolbar. That is kept
//      as the LAST-RESORT host (the landing chrome, a document without the HUD)
//      and is still pinned below, so the rescue cannot be lost.
//   3. The tools now JOIN the game instead of floating beside it: launchers are
//      .micro-btn entries on the micro-menu rail (#side-buttons-col-b) next to
//      Talents / Dungeon Finder, and panels are real `.window.panel` windows
//      with the shared `.panel-title` chrome. That class pair is the whole
//      contract Hud keys off (its MutationObserver adopts any .window.panel for
//      placement, z-order, titlebar drag and Escape teardown), so these tests
//      assert the SHAPE Hud looks for, not a Hud instance.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const TOOL_BUTTONS = ['cr-skilltree-btn', 'cr-loot-btn', 'cr-pickit-btn'] as const;

const WINDOW_FOR: Record<(typeof TOOL_BUTTONS)[number], string> = {
  'cr-skilltree-btn': 'cr-skilltree-window',
  'cr-loot-btn': 'cr-loot-window',
  'cr-pickit-btn': 'cr-pickit-window',
};

async function mountAll(): Promise<void> {
  const { mountSkillTree } = await import('../src/ui/cryptic/skilltree');
  const { mountLootVault } = await import('../src/ui/cryptic/loot_vault');
  const { mountPickitPanel } = await import('../src/ui/cryptic/pickit_panel');
  mountSkillTree();
  mountLootVault();
  mountPickitPanel();
}

/** The in-world DOM the launchers expect: the #ui layer and the micro-menu rail
 *  the built-in interface buttons live in (index.html). */
function buildGameChrome(): void {
  document.body.innerHTML =
    '<div id="ui"><div id="side-buttons">' +
    '<div id="side-buttons-col-a" class="side-buttons-col"></div>' +
    '<div id="side-buttons-col-b" class="side-buttons-col">' +
    '<button type="button" class="micro-btn" id="mm-dfinder"></button>' +
    '</div></div></div>';
}

describe('in-game reference tools live on the game rail', () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    document.body.innerHTML = '';
    document.body.className = '';
    for (const s of document.head.querySelectorAll('style')) s.remove();
    // Realm with classes so mountSkillTree passes its realm gate; the mounts
    // run from startGame(), i.e. with the world (body.game-active) up.
    window.localStorage.setItem('cr_active_realm', 'infernal');
    document.body.classList.add('game-active');
  });

  it('mounts every launcher into the micro-menu rail, never into body flow', async () => {
    buildGameChrome();
    await mountAll();
    const rail = document.getElementById('side-buttons-col-b');
    expect(rail).not.toBeNull();
    for (const id of TOOL_BUTTONS) {
      const btn = document.getElementById(id);
      expect(btn, id).not.toBeNull();
      expect(btn?.parentElement, `${id} belongs on the rail`).toBe(rail);
      // The rail's own class is what gives it the built-in launcher's art and
      // sizing; without it the button would render as a stray text control.
      expect(btn?.classList.contains('micro-btn'), `${id} is a rail button`).toBe(true);
      expect(btn?.getAttribute('aria-label'), `${id} is named`).toBeTruthy();
    }
    // The regression shape from (1): nothing landed directly on <body>, and the
    // floating rescue toolbar is not even created while the rail exists.
    for (const id of TOOL_BUTTONS) {
      expect(document.getElementById(id)?.parentElement).not.toBe(document.body);
    }
    expect(document.getElementById('cr-tools-host')).toBeNull();
  });

  it('opens each tool as a managed .window.panel with the shared chrome', async () => {
    buildGameChrome();
    await mountAll();
    for (const id of TOOL_BUTTONS) {
      (document.getElementById(id) as HTMLButtonElement).click();
      const win = document.getElementById(WINDOW_FOR[id]);
      expect(win, `${id} window`).not.toBeNull();
      // `.window.panel` IS the contract: Hud's observer adopts anything with
      // that pair for placement, the 50-89 z band and Escape teardown.
      expect(win?.classList.contains('window'), `${id} window class`).toBe(true);
      expect(win?.classList.contains('panel'), `${id} panel class`).toBe(true);
      // `.panel-title` is what Hud.isWindowDragHandle accepts as a drag grip,
      // so a window without it could never be moved.
      expect(win?.querySelector('.panel-title'), `${id} titlebar`).not.toBeNull();
      expect(win?.querySelector('.panel-title .x-btn[data-close]'), `${id} close`).not.toBeNull();
      // Windows live in the #ui layer with the built-in ones so they inherit the
      // same --window-scale zoom.
      expect(win?.parentElement?.id, `${id} window parent`).toBe('ui');
      // Open state is INLINE display: that is what Hud reads (isWindowVisible)
      // and what closeManagedWindow writes back on Escape.
      expect(win?.style.display, `${id} open`).toBe('flex');
      expect(win?.querySelector('.cr-tool-body')?.innerHTML.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('the rail button toggles its window shut again, like the built-ins', async () => {
    buildGameChrome();
    await mountAll();
    const btn = document.getElementById('cr-loot-btn') as HTMLButtonElement;
    btn.click();
    expect(document.getElementById('cr-loot-window')?.style.display).toBe('flex');
    btn.click();
    expect(document.getElementById('cr-loot-window')?.style.display).toBe('none');
    btn.click();
    expect(document.getElementById('cr-loot-window')?.style.display).toBe('flex');
  });

  it('the X closes the window the way Hud would', async () => {
    buildGameChrome();
    await mountAll();
    (document.getElementById('cr-pickit-btn') as HTMLButtonElement).click();
    const win = document.getElementById('cr-pickit-window') as HTMLElement;
    win.querySelector<HTMLButtonElement>('.x-btn[data-close]')?.click();
    expect(win.style.display).toBe('none');
  });

  it('still prefers a page-provided #cr-bestiary-host over the rail', async () => {
    buildGameChrome();
    const legacy = document.createElement('div');
    legacy.id = 'cr-bestiary-host';
    document.body.appendChild(legacy);
    await mountAll();
    for (const id of TOOL_BUTTONS) {
      expect(document.getElementById(id)?.parentElement, id).toBe(legacy);
    }
  });

  it('without the rail, the fixed rescue toolbar still catches every launcher', async () => {
    // The 51721ad963 fix, unchanged: a document with no HUD (the landing, an
    // entry document before the world builds) must not drop the launchers into
    // body flow under the game canvas.
    await mountAll();
    const host = document.getElementById('cr-tools-host');
    expect(host).not.toBeNull();
    expect(host?.parentElement).toBe(document.body);
    for (const id of TOOL_BUTTONS) {
      expect(document.getElementById(id)?.parentElement, `${id} in the rescue toolbar`).toBe(host);
    }
    const style = document.getElementById('cr-tools-host-style');
    expect(style).not.toBeNull();
    const hostRule = style?.textContent?.split('\n').find((l) => l.includes('#cr-tools-host {'));
    expect(hostRule).toBeDefined();
    expect(hostRule).toMatch(/position:\s*fixed/);
    expect(hostRule).toMatch(/z-index:\s*[1-9]/);
  });
});
