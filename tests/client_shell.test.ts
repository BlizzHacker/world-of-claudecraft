import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const mainTs = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

function splitGameUiTemplate(): { templateHtml: string; liveHtml: string } {
  const marker = '<template id="game-ui-template">';
  const start = html.indexOf(marker);
  const end = html.indexOf('</template>', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const templateHtml = html.slice(start, end + '</template>'.length);
  return {
    templateHtml,
    liveHtml: html.slice(0, start) + html.slice(end + '</template>'.length),
  };
}

describe('client HTML shell', () => {
  it('keeps game HUD controls out of the live startup DOM', () => {
    const { liveHtml, templateHtml } = splitGameUiTemplate();

    expect(templateHtml).toContain('id="ui"');
    expect(templateHtml).toContain('Release Spirit');
    expect(templateHtml).toContain('Combat Log');
    expect(templateHtml).toContain('id="chat-input"');

    expect(liveHtml).not.toContain('id="ui"');
    expect(liveHtml).not.toContain('Release Spirit');
    expect(liveHtml).not.toContain('Combat Log');
    expect(liveHtml).not.toContain('id="chat-input"');
  });

  it('offers the quest log in the mobile controls drawer', () => {
    expect(html).toContain('id="mobile-extra-controls"');
    expect(html).toContain('id="mobile-quest"');
    expect(html).toContain('aria-label="Quest Log"');
  });

  it('only displays mobile touch controls after the game is active', () => {
    expect(html).toContain('body.mobile-touch.game-active #mobile-controls');
    expect(html).not.toContain('body.mobile-touch #mobile-controls { position: absolute; inset: 0; display: block;');
  });

  it('does not expose inert scrollbars on fixed mobile game overlays', () => {
    expect(html).toContain('#ui { position: fixed; left: 0; top: 0; width: var(--app-vw); max-width: 100vw; height: var(--app-vh); overflow: hidden;');
    expect(html).toContain('body.mobile-touch.game-active #ui,\n  body.mobile-touch.game-active #nameplates,\n  body.mobile-touch.game-active #mobile-controls {\n    overflow: hidden;\n    scrollbar-width: none;');
    expect(html).toContain('body.mobile-touch.game-active #ui::-webkit-scrollbar,\n  body.mobile-touch.game-active #nameplates::-webkit-scrollbar,\n  body.mobile-touch.game-active #mobile-controls::-webkit-scrollbar');
    expect(html).toContain('height: 0;\n    display: none;');
    expect(html).toContain('body.mobile-touch.game-active::-webkit-scrollbar {\n    height: 0;');
    expect(html).toContain('body.mobile-touch.game-active *::-webkit-scrollbar {\n    height: 0;');
    expect(html).toContain('body.mobile-touch.game-active *::-webkit-scrollbar:horizontal {\n    height: 0;\n    display: none;');
  });

  it('hides only the in-game community donate affordance on mobile', () => {
    expect(html).toContain('<a class="donate-cta"');
    expect(html).toContain('<a class="community-link donate"');
    expect(html).toContain('body.mobile-touch .community-link.donate {\n    display: none;');
    expect(html).not.toContain('body.mobile-touch .donate-cta {\n    display: none;');
  });

  it('renders the mobile XP bar under the top-left player card', () => {
    expect(html).toContain('body.mobile-touch #xpbar {\n    position: fixed;');
    expect(html).toContain('left: max(8px, env(safe-area-inset-left));');
    expect(html).toContain('top: calc(max(8px, env(safe-area-inset-top)) + 70px);');
    expect(html).toContain('bottom: auto;');
    expect(html).toContain('width: 246px;');
    expect(html).toContain('height: 6px;\n    display: block;');
    expect(html).not.toContain('body.mobile-touch.mobile-left-handed #xpbar,');
  });

  it('keeps the mobile homepage scrollable with a sticky header', () => {
    expect(html).toContain('touch-action: pan-y; overscroll-behavior-y: auto;');
    expect(html).toContain('body.game-active {\n    overflow: hidden;\n    touch-action: none;');
    expect(html).toContain('-webkit-overflow-scrolling: touch;');
    expect(html).toContain('body.mobile-touch .homepage-header {\n    display: flex;\n    position: sticky;\n    top: 0;\n    z-index: 120;');
    expect(html).not.toContain('body.mobile-touch .homepage-header {\n    display: flex;\n    position: relative;');
    expect(mainTs).not.toContain("visualViewport?.addEventListener('scroll', syncAppViewport)");
  });

  it('lays out mobile More tray buttons horizontally', () => {
    expect(html).toContain('body.mobile-touch #mobile-extra-controls .mobile-btn');
    expect(html).toContain('flex-direction: row;');
    expect(html).toContain('body.mobile-touch #mobile-extra-controls .mobile-btn .ui-icon');
  });

  it('omits Meters from the mobile More tray while keeping the desktop window', () => {
    expect(html).toContain('id="meters-window"');
    expect(html).not.toContain('id="mobile-meters"');
  });

  it('keeps the mobile More button in the combat row', () => {
    const combatControls = html.slice(html.indexOf('<div id="mobile-combat-controls">'), html.indexOf('<div id="mobile-extra-controls">'));
    const primaryButtons = [...combatControls.matchAll(/<button class="mobile-btn"/g)];

    expect(primaryButtons).toHaveLength(6);
    expect(html).toContain('grid-template-columns: 124px repeat(5, 58px);');
    expect(html).toContain('grid-template-columns: 115px repeat(5, 54px);');
    expect(html).toContain('grid-template-columns: 96px repeat(5, 42px);');
    expect(html).toContain('pointer-events: auto; align-items: end; z-index: 30;');
    expect(html).toContain('body.mobile-touch #mobile-more {\n    position: static;');
  });

  it('keeps the mobile move zone clear of the centered skill bar', () => {
    expect(html).toContain('width: min(34vw, calc(50vw - 126px));');
    expect(html).toContain('min-width: 142px;');
    expect(html).toContain('max-width: 300px;');
  });

  it('places mobile Autorun beside the spell bar', () => {
    expect(html).toContain('body.mobile-touch #mobile-autorun {\n    position: fixed;');
    expect(html).toContain('left: max(calc(18px + env(safe-area-inset-left)), calc(50% - 208px));');
    expect(html).toContain('bottom: calc(72px + env(safe-area-inset-bottom));');
    expect(html).toContain('body.mobile-touch.mobile-window-open #mobile-autorun { display: none; }');
  });

  it('keeps the expanded mobile More tray inside the viewport', () => {
    expect(html).toContain('calc(100vw - 222px - max(12px, env(safe-area-inset-right, 0px)))');
    expect(html).toContain('calc(100vw - 208px - max(12px, env(safe-area-inset-right, 0px)))');
  });

  it('caps mobile quest and NPC panels instead of stretching them edge to edge', () => {
    expect(html).toContain('body.mobile-touch #quest-log-window,\n  body.mobile-touch #vendor-window,\n  body.mobile-touch #quest-dialog');
    expect(html).toContain('width: clamp(320px, 76vw, 680px);');
    expect(html).toContain('max-width: calc(100vw - 20px);');
    expect(html).toContain('transform: translateX(-50%);');
  });

  it('centers mobile Talents above touch controls', () => {
    expect(html).toContain('body.mobile-touch.mobile-window-open #ui {\n    z-index: 90;');
    expect(html).toContain('body.mobile-touch #talents-window {\n    position: fixed;');
    expect(html).toContain('top: 50%;');
    expect(html).toContain('transform: translate(-50%, -50%);');
    expect(html).toContain('z-index: 95 !important;');
  });
});
