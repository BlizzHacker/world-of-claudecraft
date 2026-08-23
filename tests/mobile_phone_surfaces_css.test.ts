import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Always-on companion to tests/browser/mobile_phone_surfaces.browser.test.ts and
// tests/browser/downloads_grid_mobile.browser.test.ts, which measure the REAL
// rendered geometry of these fixes but only run under the opt-in `npm run
// test:browser`. This one runs in the default Node suite and pins the declarations
// those measurements depend on, so deleting one reds CI rather than waiting for
// somebody to opt into a browser run.
//
// File-based (read CSS, flat-parse a rule body), the tests/fct_mobile_css.test.ts
// idiom: no jsdom, no cascade modelling. It deliberately asserts LESS than the
// browser suite: it can say a declaration exists, never that it reaches the element.

const read = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`../src/styles/${name}`, import.meta.url)), 'utf8');

const HUD_CSS = read('hud.css');
const HUD_MOBILE_CSS = read('hud.mobile.css');
const SHELL_CSS = read('shell.css');
const THEME_CSS = readFileSync(
  fileURLToPath(new URL('../src/ui/cryptic/theme.css', import.meta.url)),
  'utf8',
);

// The declaration body of the FIRST rule whose selector list matches `selector`
// (whitespace between selector tokens is collapsed, so a multi-line selector list
// can be written on one line here). Nested at-rules are not expected inside these
// blocks, so a simple brace scan is enough.
function ruleBody(css: string, selector: string): string {
  const flat = css.replace(/\r\n/g, '\n');
  const pattern = selector
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  const re = new RegExp(`(^|[};\\n])\\s*${pattern}\\s*\\{`);
  const m = flat.match(re);
  expect(m, `expected a rule for \`${selector}\``).not.toBeNull();
  const open = flat.indexOf('{', (m as RegExpMatchArray).index ?? 0);
  let depth = 0;
  for (let i = open; i < flat.length; i++) {
    if (flat[i] === '{') depth++;
    else if (flat[i] === '}') {
      depth--;
      if (depth === 0) return flat.slice(open + 1, i);
    }
  }
  throw new Error(`unbalanced braces after \`${selector}\``);
}

// #waypoint-menu is a `.prompt panel` in #prompt-stack, NOT a `.window`, so the
// layout.css `--window-scale` alias is not declared on it and the clamps divide by
// the live `--ui-scale` (the zoom #ui carries) directly. Same value, one less
// indirection; the assertions below pin the clamp that ships.
describe('waypoint travel menu is clamped to the viewport (hud.css)', () => {
  it('clamps the menu against the app viewport instead of growing with the list', () => {
    const body = ruleBody(HUD_CSS, '#waypoint-menu');
    // BOTH axes, against the JS-synced app viewport (--app-vw/--app-vh), divided by
    // the #ui zoom so an author length is not multiplied by it a second time.
    expect(body).toMatch(
      /max-height:\s*calc\(var\(--app-vh,\s*100vh\)\s*\*\s*0\.74\s*\/\s*var\(--ui-scale,\s*1\)\s*-\s*12px\)/,
    );
    expect(body).toMatch(
      /width:\s*min\(360px,\s*calc\(var\(--app-vw,\s*100vw\)\s*\/\s*var\(--ui-scale,\s*1\)\s*-\s*16px\)\)/,
    );
    // A clamp with no scroller underneath would just CLIP the destinations, so the
    // flex column that hands the overflow to the list is part of the same contract,
    // and min-height:0 is what lets the panel shrink inside #prompt-stack at all.
    expect(body).toMatch(/flex-direction:\s*column/);
    expect(body).toMatch(/min-height:\s*0/);
  });

  it('lifts off the prompt anchor and compacts its chrome on a short viewport', () => {
    // The height clamp alone is not the landscape answer. #prompt-stack anchors its
    // children at 34% of the screen, so a 74% share would run off the bottom: the
    // negative margin lifts THIS panel to about 20% first.
    expect(ruleBody(HUD_CSS, '#waypoint-menu')).toMatch(
      /margin-top:\s*calc\(var\(--app-vh,\s*100vh\)\s*\*\s*-0\.14\s*\/\s*var\(--ui-scale,\s*1\)\)/,
    );
    // Then a phone held sideways buys the scroller more rows by shrinking the fixed
    // chrome around it rather than letting the list collapse to a row and a half.
    expect(HUD_CSS).toMatch(/@media \(max-height: 520px\) \{\s*#waypoint-menu \{/);
    const shortViewport = HUD_CSS.slice(HUD_CSS.indexOf('@media (max-height: 520px)'));
    expect(ruleBody(shortViewport, '#waypoint-menu')).toMatch(/gap:\s*5px/);
    expect(ruleBody(shortViewport, '#waypoint-menu .waypoint-menu-sub')).toMatch(/display:\s*none/);
  });

  it('scrolls the destination region, so the title and dismiss button stay put', () => {
    // One scroller, wrapping the group headings AND both .waypoint-list groups
    // (src/ui/waypoint_map_window.ts appends head, scroll, actions). Putting it on
    // .waypoint-list instead would build TWO independent scrollers with the group
    // headings stranded between them.
    const body = ruleBody(HUD_CSS, '#waypoint-menu .waypoint-menu-scroll');
    expect(body).toMatch(/overflow-y:\s*auto/);
    // min-height: 0 is what lets a flex child actually shrink to its clamp; without
    // it the region keeps its content height and the clamp above does nothing.
    expect(body).toMatch(/min-height:\s*0/);
    expect(body).toMatch(/overscroll-behavior:\s*contain/);
    expect(body).toMatch(/flex:\s*1 1 auto/);
    // The other half of "stay put": the header and the dismiss row must not flex.
    expect(ruleBody(HUD_CSS, '#waypoint-menu .waypoint-menu-head')).toMatch(/flex:\s*0 0 auto/);
    expect(ruleBody(HUD_CSS, '#waypoint-menu .waypoint-menu-actions')).toMatch(/flex:\s*0 0 auto/);
    // And the lists inside it stay unscrolled, or the panel grows a nested scroller.
    expect(ruleBody(HUD_CSS, '#waypoint-menu .waypoint-list')).not.toMatch(/overflow/);
  });

  it('holds the 40px tap floor on touch as a class-scoped twin of the coarse rule', () => {
    expect(ruleBody(HUD_MOBILE_CSS, 'body.mobile-touch #waypoint-menu .btn')).toMatch(
      /min-height:\s*40px/,
    );
    // The @media (pointer: coarse) original stays: the twin adds a path, never
    // replaces one.
    expect(HUD_CSS).toMatch(/@media \(pointer: coarse\) \{\s*\.prompt \.btn \{/);
    // The destination rows and the dismiss button are .btn and inherit that floor.
    // The locked-group fold and the filter are NOT, so they take their own; without
    // this the two controls a player reaches for most sit under the 40px minimum.
    expect(
      ruleBody(
        HUD_CSS,
        '#waypoint-menu .waypoint-menu-toggle, #waypoint-menu .waypoint-menu-filter',
      ),
    ).toMatch(/min-height:\s*40px/);
  });
});

describe('loading screen leaves room for the progress block (shell.css)', () => {
  it('caps the overlay logo on BOTH axes so a square mark cannot fill a short viewport', () => {
    const body = ruleBody(SHELL_CSS, '#loading-screen .ls-logo');
    expect(body).toMatch(/max-width:\s*min\(380px,\s*64vw\)/);
    expect(body).toMatch(/max-height:\s*calc\(var\(--app-vh,\s*100vh\)\s*\*\s*0\.4\)/);
    // auto/auto is what keeps the aspect ratio under two maxima; a fixed width
    // would letterbox or distort instead.
    expect(body).toMatch(/width:\s*auto/);
    expect(body).toMatch(/height:\s*auto/);
  });

  it('anchors the progress block low when the art carries the wordmark', () => {
    // space-between distributes TWO children; hiding the logo left one, which slid
    // to the top of the screen.
    expect(ruleBody(SHELL_CSS, '#loading-screen.art-has-wordmark')).toMatch(
      /justify-content:\s*flex-end/,
    );
    expect(ruleBody(SHELL_CSS, '#loading-screen.art-has-wordmark .ls-logo')).toMatch(
      /display:\s*none/,
    );
  });
});

describe('pre-game touch floors and wrapping (shell.css)', () => {
  it('wraps the faction filter instead of spilling chips out of the panel', () => {
    expect(ruleBody(SHELL_CSS, '.realm-faction-filter')).toMatch(/flex-wrap:\s*wrap/);
    const tab = ruleBody(SHELL_CSS, '.realm-faction-tab');
    expect(tab).toMatch(/min-height:\s*40px/);
    // `auto` basis, not 0: a 0-basis chip always fits its line and never wraps.
    expect(tab).toMatch(/flex:\s*1 1 auto/);
  });

  it('floors the realm picker cards and both character name fields', () => {
    expect(ruleBody(SHELL_CSS, 'body.mobile-touch .offline-realm-card')).toMatch(
      /min-height:\s*40px/,
    );
    const nameField = ruleBody(
      SHELL_CSS,
      'body.mobile-touch #char-name, body.mobile-touch #new-char-name',
    );
    expect(nameField).toMatch(/min-height:\s*40px/);
    expect(nameField).toMatch(/box-sizing:\s*border-box/);
  });

  it('floors the landing token contract-address copy pill', () => {
    expect(ruleBody(SHELL_CSS, 'body.mobile-touch .token-ca-pill')).toMatch(/min-height:\s*40px/);
  });

  it('floors the landing and play footer link rows', () => {
    const body = ruleBody(
      SHELL_CSS,
      'body.mobile-touch .footer-link, body.mobile-touch .footer-hosting a',
    );
    expect(body).toMatch(/min-height:\s*40px/);
    expect(body).toMatch(/display:\s*inline-flex/);
  });

  it('never sets a mobile input font under the central 16px anti-zoom floor', () => {
    // The one rule this change adds to a text control sizes its BOX only. Any
    // font-size it grew would have to clear 16px (src/ui/CLAUDE.md).
    const nameField = ruleBody(
      SHELL_CSS,
      'body.mobile-touch #char-name, body.mobile-touch #new-char-name',
    );
    expect(nameField).not.toMatch(/font-size/);
  });
});

describe('downloads page grid tracks can collapse (cryptic theme.css)', () => {
  it('uses a collapsible minimum on both auto-fill grids', () => {
    expect(ruleBody(THEME_CSS, '.cr-dl-grid')).toMatch(
      /grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(min\(280px,\s*100%\),\s*1fr\)\)/,
    );
    expect(ruleBody(THEME_CSS, '.cr-dl-stores-row')).toMatch(
      /grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(min\(200px,\s*100%\),\s*1fr\)\)/,
    );
  });

  it('floors the download buttons at the mobile tap size', () => {
    const body = ruleBody(THEME_CSS, '.cr-dl-btn');
    expect(body).toMatch(/min-height:\s*40px/);
    expect(body).toMatch(/min-width:\s*min\(110px,\s*100%\)/);
  });
});
