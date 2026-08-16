// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Pin for the in-game reference tools' post-entry disappearance: after
// 7f2439e84a removed #cr-bestiary-host from the realm panel, the Skill Trees /
// Loot Vault / Pickit Filter launchers fell back to a bare document.body
// append — static flow at the page top-left, which the fixed full-viewport
// #game-canvas (z-index:0) paints over as soon as the world renders. The
// buttons flashed during loading and then were unreachable for the whole
// session. The fix mounts them into the fixed #cr-tools-host toolbar
// (src/ui/cryptic/tools_host.ts); these tests pin that surface so a future
// intake cannot regress the mounts back into body flow.

const TOOL_BUTTONS = ['cr-skilltree-btn', 'cr-loot-btn', 'cr-pickit-btn'] as const;

async function mountAll(): Promise<void> {
  const { mountSkillTree } = await import('../src/ui/cryptic/skilltree');
  const { mountLootVault } = await import('../src/ui/cryptic/loot_vault');
  const { mountPickitPanel } = await import('../src/ui/cryptic/pickit_panel');
  mountSkillTree();
  mountLootVault();
  mountPickitPanel();
}

describe('in-game reference tools host', () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    document.body.innerHTML = '';
    document.body.className = '';
    document.head.querySelectorAll('style').forEach((s) => s.remove());
    // Realm with classes so mountSkillTree passes its realm gate; the mounts
    // run from startGame(), i.e. with the world (body.game-active) up.
    window.localStorage.setItem('cr_active_realm', 'infernal');
    document.body.classList.add('game-active');
  });

  it('mounts Skill Trees / Loot Vault / Pickit Filter into the fixed toolbar, not body flow', async () => {
    await mountAll();
    const host = document.getElementById('cr-tools-host');
    expect(host).not.toBeNull();
    expect(host!.parentElement).toBe(document.body);
    for (const id of TOOL_BUTTONS) {
      const btn = document.getElementById(id);
      expect(btn, id).not.toBeNull();
      // The regression shape: a button whose parent is <body> sits in static
      // flow under the fixed game canvas and is invisible in the world.
      expect(btn!.parentElement, `${id} must live in the toolbar`).toBe(host);
    }
    // The host's stylesheet is what lifts the buttons above the canvas: it
    // must position the toolbar fixed with a positive z-index.
    const style = document.getElementById('cr-tools-host-style');
    expect(style).not.toBeNull();
    const hostRule = style!.textContent!.split('\n').find((l) => l.includes('#cr-tools-host {'));
    expect(hostRule).toBeDefined();
    expect(hostRule).toMatch(/position:\s*fixed/);
    expect(hostRule).toMatch(/z-index:\s*[1-9]/);
  });

  it('opens each tool panel from its toolbar button', async () => {
    await mountAll();
    const modalFor: Record<(typeof TOOL_BUTTONS)[number], string> = {
      'cr-skilltree-btn': 'cr-skilltree-modal',
      'cr-loot-btn': 'cr-loot-modal',
      'cr-pickit-btn': 'cr-pickit-modal',
    };
    for (const id of TOOL_BUTTONS) {
      document.getElementById(id)!.click();
      const modal = document.getElementById(modalFor[id]);
      expect(modal, `${id} panel`).not.toBeNull();
      expect(modal!.classList.contains('open'), `${id} panel open`).toBe(true);
      modal!.classList.remove('open');
    }
  });

  it('still prefers a page-provided #cr-bestiary-host over the floating toolbar', async () => {
    const legacy = document.createElement('div');
    legacy.id = 'cr-bestiary-host';
    document.body.appendChild(legacy);
    await mountAll();
    for (const id of TOOL_BUTTONS) {
      expect(document.getElementById(id)!.parentElement, id).toBe(legacy);
    }
    expect(document.getElementById('cr-tools-host')).toBeNull();
  });
});
