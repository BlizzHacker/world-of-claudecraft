// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const CR_TOKEN = '3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv';
const CR_WALLET = 'GncAXx6j38osJns395XZtf6rSA9MU3K1gwafTrHpBJpi';
const WOC_TOKEN = '3WjLscH2JsXLEFJZRA9z8ti8yRGxWGKbqymPd7UicRth';

function setupOptionsMenu(): void {
  document.body.innerHTML = `
    <div id="options-menu">
      <div class="opt-list">
        <button type="button" class="btn opt-btn">Return to Game</button>
      </div>
    </div>
  `;
}

describe('Cryptic Realm in-game customization menu', () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    setupOptionsMenu();
  });

  it('injects one launcher and opens Cryptic token/realm controls', async () => {
    window.localStorage.setItem('cr_active_realm', 'infernal');
    const { mountIngameOptions } = await import('../src/ui/cryptic/ingame_options');

    mountIngameOptions();
    mountIngameOptions();

    const launchers = document.querySelectorAll<HTMLButtonElement>('.cr-customization-launcher');
    expect(launchers).toHaveLength(1);

    launchers[0].click();

    const modal = document.getElementById('cr-customization-modal')!;
    expect(modal.hasAttribute('hidden')).toBe(false);
    expect(modal.textContent).toContain('Infernal Realm');
    expect(modal.textContent).toContain('$CR token');
    expect(modal.innerHTML).toContain(CR_TOKEN);
    expect(modal.innerHTML).toContain(CR_WALLET);
    expect(modal.querySelectorAll('[data-cr-realm]')).toHaveLength(6);
    expect(modal.querySelector<HTMLButtonElement>('[data-cr-fps="diablo"]')?.textContent).toContain('Diablo angle');
    expect(modal.querySelectorAll('[data-cr-minigame]')).toHaveLength(3);
    expect(modal.textContent).toContain('Nova Swarm');
  });

  it('switches presentation realm and preserves Claudecraft WOC token', async () => {
    window.localStorage.setItem('cr_active_realm', 'infernal');
    const events: string[] = [];
    window.addEventListener('cr-realm-change', () => events.push('changed'));
    const { mountIngameOptions } = await import('../src/ui/cryptic/ingame_options');

    mountIngameOptions();
    document.querySelector<HTMLButtonElement>('.cr-customization-launcher')!.click();
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
});
