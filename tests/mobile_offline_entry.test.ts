// @vitest-environment happy-dom
//
// A phone must be able to finish the offline creator and enter the world.
// Three separate defects made that impossible, and each gets a pin here
// because each fails silently: nothing throws, nothing logs, the button simply
// never does anything.
//
// 1. THE MERGE THAT SWALLOWED A CLOSING TAG. f07988f845 (upstream v0.30.0
//    intake) dropped the `</section>` that closed #mobile-controls, so every
//    element after it in both game entries - #mobile-window-backdrop,
//    #mobile-preflight, #rotate-device, #loading-screen - was PARSED AS ITS
//    CHILD. #mobile-controls is `display: none` until body.mobile-touch
//    .game-active, so all four had no box at all before the world starts.
//    prepareWorldEntry() awaits showMobilePreflightPrompt() on every touch
//    device: the dialog was styled, classed `.visible` and given an inline
//    display:flex, and still measured 0x0, so its Continue button could never
//    be tapped and the promise never resolved. Enter World did nothing,
//    forever. The loading screen was equally boxless on every platform.
//
// 2. AN ACTION ROW 700px BELOW THE FOLD. On a 390x844 phone the offline form
//    runs past 2000px inside an 800px scrollport, and Enter World / Back were
//    last in that flow at y=1540. Worse, the hero roster is its OWN scroller
//    (.infernal-hero-roster caps at 52vh) and occupies the middle of the panel,
//    which is exactly where a thumb lands, so the swipe drove the roster rather
//    than the form. The desktop card solved this with a footer band outside the
//    scroll region (offline_creator_layout.test.ts); on touch the panel itself
//    is the scroller, so the same guarantee is a sticky-bottom footer plus a
//    rule that nothing inside the panel scrolls except the panel.
//
// 3. THE INSTALL PROMPT PARKED ON THE BUTTON. #cr-pwa-banner is
//    position:fixed, bottom:16px, z-index:12000. Once the action row is pinned
//    to the bottom of the panel, that is the same band: elementFromPoint at
//    Enter World's centre returned the banner's <strong>, so the tap landed on
//    the install prompt instead. It also covers the in-world HUD.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string): string =>
  readFileSync(resolve(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

// Strip sub-resources before parsing: happy-dom would otherwise try to FETCH
// every <link>/<script> off a dev server that is not running in a unit run.
const parse = (html: string): Document =>
  new DOMParser().parseFromString(
    html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<link\b[^>]*>/gi, ''),
    'text/html',
  );

const shellCss = read('src/styles/shell.css');
const hudMobileCss = read('src/styles/hud.mobile.css');
const pwaCss = read('src/ui/cryptic/pwa_install.css');

/** Declaration blocks of EVERY rule whose selector list starts with `sel`. The
 *  same selector appears more than once on purpose here - the landscape query
 *  re-tunes the action row - so the pins ask "is it pinned somewhere" and, for
 *  the touch floor, "is it never below the floor anywhere". */
function blocks(css: string, sel: string): string[] {
  const out: string[] = [];
  let at = css.indexOf(sel);
  while (at >= 0) {
    const open = css.indexOf('{', at);
    if (open < 0) break;
    out.push(css.slice(open + 1, css.indexOf('}', open)));
    at = css.indexOf(sel, open);
  }
  return out;
}

/** The first such block (for selectors that appear exactly once). */
const block = (css: string, sel: string): string => blocks(css, sel)[0] ?? '';

describe('the pre-game overlays are not children of the in-game control layer', () => {
  // Both entries carry the same block and both lost the same tag.
  for (const entry of ['index.html', 'play.html']) {
    const doc = parse(read(entry));
    const controls = doc.querySelector('#mobile-controls');

    it(`${entry}: has the control layer and the four overlays`, () => {
      expect(controls).not.toBeNull();
      for (const id of [
        '#mobile-window-backdrop',
        '#mobile-preflight',
        '#rotate-device',
        '#loading-screen',
      ]) {
        expect(doc.querySelector(id), `${entry} is missing ${id}`).not.toBeNull();
      }
    });

    it(`${entry}: keeps every pre-game overlay OUT of #mobile-controls`, () => {
      // The parser is the assertion. A missing closing tag does not throw, it
      // re-parents: with the tag gone every id below answered `true` here, and
      // inherited the layer's display:none.
      for (const id of [
        '#mobile-window-backdrop',
        '#mobile-preflight',
        '#rotate-device',
        '#loading-screen',
      ]) {
        const el = doc.querySelector(id);
        expect(controls?.contains(el as Node), `${entry}: ${id} is inside #mobile-controls`).toBe(
          false,
        );
      }
    });

    it(`${entry}: leaves the touch controls themselves inside the layer`, () => {
      // The counterpart: closing the tag in the wrong place would strand the
      // joysticks and the action ring outside their own container.
      for (const id of ['#mobile-move-joystick', '#mobile-action-ring', '#mobile-extra-controls']) {
        const el = doc.querySelector(id);
        expect(el, `${entry} is missing ${id}`).not.toBeNull();
        expect(controls?.contains(el as Node), `${entry}: ${id} escaped #mobile-controls`).toBe(
          true,
        );
      }
    });
  }

  it('documents why the nesting was fatal: the layer is hidden until game-active', () => {
    // If this ever stops being true the pins above are still correct, but the
    // failure mode they describe changes, so read them together.
    expect(hudMobileCss).toMatch(/#mobile-controls\s*\{\s*display:\s*none;/);
    expect(hudMobileCss).toMatch(/body\.mobile-touch\.game-active #mobile-controls\s*\{/);
  });
});

describe('offline creator on touch: the action row is always under the thumb', () => {
  const actionRules = blocks(shellCss, 'body.mobile-touch #offline-select .auth-actions {');

  it('pins Enter World / Back to the bottom of the panel scrollport', () => {
    const pinned = actionRules.find((b) => /position:\s*sticky/.test(b));
    expect(pinned, 'no touch rule makes the offline action row sticky').toBeDefined();
    expect(pinned).toMatch(/bottom:\s*0/);
    // The turntable above it is sticky at z-index 10; the buttons are the one
    // thing that may never be covered.
    expect(pinned).toMatch(/z-index:\s*1[1-9]/);
    // Opaque, because the roster and the class sheet scroll UNDER the band.
    expect(pinned).toMatch(/background:/);
    // Nothing later may un-pin it.
    for (const b of actionRules) expect(b).not.toMatch(/position:\s*(static|relative|absolute)/);
  });

  it('never sizes the buttons under the 40px touch floor, in any orientation', () => {
    const btnRules = blocks(shellCss, 'body.mobile-touch #offline-select .auth-actions .btn {');
    expect(btnRules.length).toBeGreaterThan(0);
    for (const b of btnRules) {
      const m = /min-height:\s*(\d+)px/.exec(b);
      expect(m, `an offline action-row button rule sets no min-height: ${b.trim()}`).not.toBeNull();
      expect(Number(m?.[1])).toBeGreaterThanOrEqual(40);
    }
  });

  it('leaves the panel as the ONLY scroller inside itself', () => {
    // A nested scroller in the middle of the panel captures the swipe that was
    // meant to move the form - the roster is 52vh of a 844px screen.
    const nested = block(
      shellCss,
      'body.mobile-touch #offline-select .mini-class-row.infernal-hero-roster,',
    );
    expect(nested).toMatch(/max-height:\s*none/);
    expect(nested).toMatch(/overflow-y:\s*visible/);
    // and the panel itself must not hand its overscroll to the landing page.
    expect(block(shellCss, 'body.mobile-touch #offline-select {')).toMatch(
      /overscroll-behavior:\s*contain/,
    );
  });

  it('orders the action row LAST in the phone stack', () => {
    // A sticky-bottom box only stays pinned until its own natural position
    // scrolls into view, so anywhere but last and Enter World slides away
    // again on the final screenful.
    const orders = new Map<string, number>();
    for (const [, sel, value] of shellCss.matchAll(
      /#offline-select (#[\w-]+|\.[\w-]+)\s*\{[^}]*?order:\s*(\d+)/g,
    )) {
      orders.set(sel, Number(value));
    }
    const actionsOrder = orders.get('.auth-actions');
    expect(actionsOrder, 'no order set on the offline action row').toBeDefined();
    for (const [sel, value] of orders) {
      if (sel === '.auth-actions') continue;
      expect(value, `${sel} is ordered after the action row`).toBeLessThan(actionsOrder as number);
    }
    // The faction strip filters the roster: it belongs WITH it, not floated to
    // the top of the stack by an unset order (which is what it did).
    expect(orders.get('#offline-faction-filter')).toBeDefined();
    expect(orders.get('#offline-faction-filter')).toBeLessThan(
      orders.get('.mini-class-row') as number,
    );
  });
});

describe('the PWA install banner never covers the game', () => {
  it('is hidden on touch once the player leaves the landing page, and in-world', () => {
    expect(pwaCss).toMatch(
      /body\.mobile-touch:not\(\[data-start-panel="mode-select"\]\) #cr-pwa-banner/,
    );
    expect(pwaCss).toMatch(/body\.game-active #cr-pwa-banner/);
    const hide = block(
      pwaCss,
      'body.mobile-touch:not([data-start-panel="mode-select"]) #cr-pwa-banner,',
    );
    expect(hide).toMatch(/display:\s*none/);
  });
});
