// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const arcForgeMock = vi.hoisted(() => ({
  allowed: false,
  openEditor: vi.fn(),
}));

vi.mock('../src/ui/cryptic/arcforge_editor', () => ({
  openArcForgeEditor: (...args: unknown[]) => arcForgeMock.openEditor(...args),
  canUseArcForgeEditor: vi.fn(async () => arcForgeMock.allowed),
  arcForgeEditorAllowedCached: vi.fn(() => arcForgeMock.allowed),
}));

const CR_TOKEN = '3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv';
const CR_WALLET = 'GncAXx6j38osJns395XZtf6rSA9MU3K1gwafTrHpBJpi';
const WOC_TOKEN = '3WjLscH2JsXLEFJZRA9z8ti8yRGxWGKbqymPd7UicRth';

describe('Cryptic Realm in-game customization menu', () => {
  beforeEach(() => {
    vi.resetModules();
    arcForgeMock.allowed = false;
    arcForgeMock.openEditor.mockReset();
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.body.innerHTML = '';
  });

  it('opens Cryptic token/realm controls and a separate Mods tab', async () => {
    window.localStorage.setItem('cr_active_realm', 'infernal');
    const { openCustomization } = await import('../src/ui/cryptic/ingame_options');

    openCustomization();

    const modal = document.getElementById('cr-customization-modal')!;
    expect(modal.hasAttribute('hidden')).toBe(false);
    expect(modal.textContent).toContain('Infernal Realm');
    expect(modal.textContent).toContain('$CR token');
    expect(modal.innerHTML).toContain(CR_TOKEN);
    expect(modal.innerHTML).toContain(CR_WALLET);
    expect(modal.querySelectorAll('[data-cr-realm]').length).toBeGreaterThanOrEqual(6);
    expect(modal.querySelector<HTMLButtonElement>('[data-cr-fps="diablo"]')?.textContent).toContain(
      'Diablo angle',
    );
    expect(modal.querySelectorAll('[data-cr-tab]')).toHaveLength(2);

    modal.querySelector<HTMLButtonElement>('[data-cr-tab="mods"]')!.click();

    expect(modal.textContent).toContain('Realm stage');
    expect(modal.querySelectorAll('[data-cr-stage]')).toHaveLength(4);
    expect(modal.querySelector('[data-cr-bug-report]')).not.toBeNull();
    // Mini-games left the menus: they live in the world now (venues + NPCs),
    // so the Mods tab must not offer any canvas mini-game cards.
    expect(modal.querySelectorAll('[data-cr-minigame]')).toHaveLength(0);
    expect(modal.textContent).not.toContain('Nova Swarm');
  });

  it('switches presentation realm and preserves Claudecraft WOC token', async () => {
    window.localStorage.setItem('cr_active_realm', 'infernal');
    const events: string[] = [];
    window.addEventListener('cr-realm-change', () => events.push('changed'));
    const { openCustomization } = await import('../src/ui/cryptic/ingame_options');

    openCustomization();
    document.querySelector<HTMLButtonElement>('[data-cr-realm="claudecraft"]')!.click();

    const modal = document.getElementById('cr-customization-modal')!;
    expect(window.localStorage.getItem('cr_active_realm')).toBe('claudecraft');
    expect(document.documentElement.getAttribute('data-theme')).toBe('claudecraft');
    expect(events).toEqual(['changed']);
    expect(modal.textContent).toContain('World of ClaudeCraft');
    expect(modal.textContent).toContain('$WOC token');
    expect(modal.innerHTML).toContain(WOC_TOKEN);
    expect(modal.innerHTML).not.toContain(CR_TOKEN);
  });

  it('surfaces the ArcForge live editor CTA for admin/mod sessions inside the Mods tab', async () => {
    arcForgeMock.allowed = true;
    arcForgeMock.openEditor.mockImplementation(() => {
      const editor = document.createElement('div');
      editor.id = 'cr-arcforge-editor-modal';
      document.body.appendChild(editor);
    });
    const { openArcForge } = await import('../src/ui/cryptic/ingame_options');

    openArcForge();

    const modal = document.getElementById('cr-customization-modal')!;
    expect(modal.hasAttribute('hidden')).toBe(false);
    expect(modal.textContent).toContain('ArcForge');
    const button = modal.querySelector<HTMLButtonElement>('[data-cr-arcforge-editor]');
    expect(button?.textContent).toContain('Open Live Asset Editor');

    button!.click();

    expect(arcForgeMock.openEditor).toHaveBeenCalledTimes(1);
    expect(document.getElementById('cr-arcforge-editor-modal')).not.toBeNull();
  });
});
