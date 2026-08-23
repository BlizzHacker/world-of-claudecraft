// Phone-viewport layout pass over the surfaces the wave2 work touched: the branded
// loading screen, the character-creation faction strip, the new waypoint travel menu,
// and the landing/play footer links. Rendered geometry under the real style barrel
// (getBoundingClientRect), never a CSS-text assertion, so a rule that exists but does
// not actually reach the element still fails. Every case runs in BOTH phone
// orientations, the standard src/ui/CLAUDE.md asks for.
//
// The floors under test are class-scoped (body.mobile-touch), not @media (pointer:
// coarse): Playwright's context is fine-pointer, so a coarse-only rule can never match
// here (the same reason tests/browser/target_size.browser.test.ts gives for
// .prof-effect-btn).

import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { openWaypointMenu } from '../../src/ui/waypoint_map_window';
import { cleanup } from './_harness';

const LANDSCAPE = { w: 844, h: 390 };
const PORTRAIT = { w: 390, h: 844 };
const TOUCH_FLOOR = 40;
// getBoundingClientRect can land a hair under an exact declaration on sub-pixel
// rounding; the same half-pixel slack target_size.browser.test.ts allows.
const EPSILON = 0.5;

// A square stand-in for the shipped wordmark. Both entries ship a SQUARE logo
// (cryptic-realm-logo-512.webp is 512x512, cryptic-realm-logo.png is 1024x1024), and
// the aspect ratio is the whole point here: a square logo sized only by width is what
// grew taller than a landscape phone. A real <img src> would 404 in this harness and
// collapse to zero intrinsic size, hiding the defect.
const SQUARE_LOGO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#c8a838"/></svg>',
  );

beforeEach(() => {
  cleanup();
  document.body.className = '';
});

function el(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'id') node.id = v;
    else node.setAttribute(k, v);
  }
  return node;
}

// The real #loading-screen subtree from index.html / play.html.
function mountLoadingScreen(wordmarkArt: boolean): HTMLElement {
  const screen = el('div', { id: 'loading-screen' });
  screen.classList.add('visible');
  if (wordmarkArt) screen.classList.add('art-has-wordmark');
  const logo = el('img', { class: 'ls-logo', alt: 'Cryptic Realm' });
  (logo as HTMLImageElement).src = SQUARE_LOGO;
  const progress = el('div', { class: 'ls-progress' });
  const bar = el('div', { class: 'ls-bar' });
  bar.appendChild(el('div', { id: 'ls-fill' }));
  const status = el('div', { id: 'ls-status' });
  status.textContent = 'Entering the world...';
  const tip = el('div', { id: 'ls-tip' });
  tip.textContent = 'Waypoints let you travel between towns you have discovered.';
  progress.append(bar, status, tip, el('div', { id: 'ls-slow-hint' }));
  screen.append(logo, progress);
  document.body.appendChild(screen);
  return screen;
}

async function decodedLoadingScreen(wordmarkArt: boolean): Promise<HTMLElement> {
  const screen = mountLoadingScreen(wordmarkArt);
  // The logo must have real intrinsic dimensions before its box is measured.
  await (screen.querySelector('.ls-logo') as HTMLImageElement).decode();
  return screen;
}

describe('loading screen fits a phone in both orientations', () => {
  for (const [name, v] of [
    ['landscape', LANDSCAPE],
    ['portrait', PORTRAIT],
  ] as const) {
    it(`keeps the progress bar, status and tip on screen (${name})`, async () => {
      await page.viewport(v.w, v.h);
      document.body.className = 'mobile-touch';
      const screen = await decodedLoadingScreen(false);
      const logo = screen.querySelector('.ls-logo') as HTMLElement;
      const progress = screen.querySelector('.ls-progress') as HTMLElement;
      const logoBox = logo.getBoundingClientRect();
      const progressBox = progress.getBoundingClientRect();

      // The logo alone may never claim so much height that the progress block is
      // pushed off the bottom: at width min(380px, 64vw) a SQUARE logo rendered
      // 380x380 inside a 390px-tall landscape phone.
      expect(
        logoBox.height,
        `logo height ${logoBox.height} should leave room in a ${v.h}px viewport`,
      ).toBeLessThan(v.h * 0.6);
      expect(progressBox.top).toBeGreaterThanOrEqual(logoBox.bottom - EPSILON);
      expect(
        progressBox.bottom,
        `progress bottom ${progressBox.bottom} > viewport ${v.h}`,
      ).toBeLessThanOrEqual(v.h + EPSILON);
    });

    it(`anchors the progress block low when the art carries the wordmark (${name})`, async () => {
      await page.viewport(v.w, v.h);
      document.body.className = 'mobile-touch';
      const screen = await decodedLoadingScreen(true);
      const logo = screen.querySelector('.ls-logo') as HTMLElement;
      const progress = screen.querySelector('.ls-progress') as HTMLElement;
      // The overlay logo is hidden for wordmark art (the shipped behaviour).
      expect(logo.getBoundingClientRect().height).toBe(0);
      const box = progress.getBoundingClientRect();
      // justify-content: space-between distributes TWO children; with the logo gone
      // the progress block was the only one left and slid to the very top of the
      // screen. It belongs where it sits when the logo is showing: near the bottom.
      expect(
        box.top,
        `progress top ${box.top} jumped to the top of a ${v.h}px screen`,
      ).toBeGreaterThan(v.h * 0.4);
      expect(box.bottom).toBeLessThanOrEqual(v.h + EPSILON);
    });
  }
});

describe('character-creation faction strip never spills out of its panel', () => {
  for (const [name, v] of [
    ['portrait', PORTRAIT],
    ['landscape', LANDSCAPE],
  ] as const) {
    it(`keeps every faction tab inside the strip (${name})`, async () => {
      await page.viewport(v.w, v.h);
      document.body.className = 'mobile-touch';
      // The creation column is a narrow fixed-width band inside the panel, not the
      // viewport; 274px is what #offline-select renders on a 390px phone.
      const column = el('div');
      column.style.width = '274px';
      column.style.overflow = 'hidden';
      const strip = el('div', { class: 'realm-faction-filter' });
      for (const label of ['Rune Court', 'Gravebound', 'Ciphered', 'Voidbound']) {
        const tab = el('button', { class: 'realm-faction-tab', type: 'button' });
        tab.textContent = label;
        strip.appendChild(tab);
      }
      column.appendChild(strip);
      document.body.appendChild(column);

      expect(
        strip.scrollWidth,
        `strip content ${strip.scrollWidth} overflows its ${strip.clientWidth}px box`,
      ).toBeLessThanOrEqual(strip.clientWidth + EPSILON);
      const stripBox = strip.getBoundingClientRect();
      for (const tab of Array.from(strip.children) as HTMLElement[]) {
        const box = tab.getBoundingClientRect();
        expect(box.right, `tab "${tab.textContent}" right ${box.right}`).toBeLessThanOrEqual(
          stripBox.right + EPSILON,
        );
        expect(box.height, `tab "${tab.textContent}" height ${box.height}`).toBeGreaterThanOrEqual(
          TOUCH_FLOOR - EPSILON,
        );
      }
    });
  }
});

describe('waypoint travel menu fits the screen and every destination is reachable', () => {
  // The realm ships one waypoint per town hub PLUS a wilderness pylon per zone, so the
  // menu is a ~29-row list: the one .prompt whose height is content-driven.
  const waypoints = Array.from({ length: 29 }, (_, i) => ({
    id: `wp_zone${i}`,
    name: `Waypoint ${i}`,
    known: i % 5 !== 0,
  }));

  for (const [name, v] of [
    ['landscape', LANDSCAPE],
    ['portrait', PORTRAIT],
  ] as const) {
    it(`keeps the whole menu inside the viewport (${name})`, async () => {
      await page.viewport(v.w, v.h);
      document.body.className = 'mobile-touch game-active';
      const stack = el('div', { id: 'prompt-stack' });
      document.body.appendChild(stack);
      openWaypointMenu(waypoints, { stack, travel: () => undefined });

      const menu = document.getElementById('waypoint-menu') as HTMLElement;
      const box = menu.getBoundingClientRect();
      expect(box.bottom, `menu bottom ${box.bottom} > viewport ${v.h}`).toBeLessThanOrEqual(
        v.h + EPSILON,
      );
      expect(box.right, `menu right ${box.right} > viewport ${v.w}`).toBeLessThanOrEqual(
        v.w + EPSILON,
      );
      expect(box.left).toBeGreaterThanOrEqual(-EPSILON);
    });

    it(`scrolls the destination list instead of painting rows off screen (${name})`, async () => {
      await page.viewport(v.w, v.h);
      document.body.className = 'mobile-touch game-active';
      const stack = el('div', { id: 'prompt-stack' });
      document.body.appendChild(stack);
      openWaypointMenu(waypoints, { stack, travel: () => undefined });

      const list = document.querySelector('.waypoint-list') as HTMLElement;
      expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
      list.scrollTop = list.scrollHeight;
      expect(list.scrollTop, 'the destination list must scroll').toBeGreaterThan(0);

      // The LAST destination becomes reachable once scrolled to the end.
      const last = list.lastElementChild as HTMLElement;
      const lastBox = last.getBoundingClientRect();
      expect(lastBox.bottom).toBeLessThanOrEqual(v.h + EPSILON);
      expect(lastBox.height).toBeGreaterThanOrEqual(TOUCH_FLOOR - EPSILON);

      // The dismiss button lives outside the scroller, so it is on screen at any
      // scroll position (a long list used to push it past the bottom edge).
      const dismiss = menuDismissButton();
      const dismissBox = dismiss.getBoundingClientRect();
      expect(dismissBox.bottom, 'the dismiss button must stay on screen').toBeLessThanOrEqual(
        v.h + EPSILON,
      );
      expect(dismissBox.height).toBeGreaterThanOrEqual(TOUCH_FLOOR - EPSILON);
    });
  }

  function menuDismissButton(): HTMLElement {
    const menu = document.getElementById('waypoint-menu') as HTMLElement;
    return menu.lastElementChild as HTMLElement;
  }
});

describe('character screens clear the mobile tap floor', () => {
  for (const [name, v] of [
    ['portrait', PORTRAIT],
    ['landscape', LANDSCAPE],
  ] as const) {
    it(`floors the realm picker cards and the name field (${name})`, async () => {
      await page.viewport(v.w, v.h);
      document.body.className = 'mobile-touch';
      const row = el('div', { class: 'offline-realm-row' });
      for (const label of ['Cryptic Realm', 'Infernal Realm', 'Classic Realm', 'FPS Realm']) {
        const card = el('button', { class: 'offline-realm-card', type: 'button' });
        card.append(el('span', { class: 'offline-realm-swatch' }));
        const nameEl = el('span', { class: 'offline-realm-name' });
        nameEl.textContent = label;
        card.append(nameEl);
        row.appendChild(card);
      }
      const group = el('div', { class: 'char-input-group' });
      const input = el('input', { id: 'char-name', maxlength: '16' });
      group.appendChild(input);
      document.body.append(row, group);

      for (const card of Array.from(row.children) as HTMLElement[]) {
        expect(
          card.getBoundingClientRect().height,
          `realm card "${card.textContent}" height`,
        ).toBeGreaterThanOrEqual(TOUCH_FLOOR - EPSILON);
      }
      const inputBox = input.getBoundingClientRect();
      expect(inputBox.height, `#char-name height ${inputBox.height}`).toBeGreaterThanOrEqual(
        TOUCH_FLOOR - EPSILON,
      );
    });
  }
});

describe('landing and play footer links clear the mobile tap floor', () => {
  for (const [name, v] of [
    ['portrait', PORTRAIT],
    ['landscape', LANDSCAPE],
  ] as const) {
    it(`floors the legal row and the hosting credits (${name})`, async () => {
      await page.viewport(v.w, v.h);
      document.body.className = 'mobile-touch';
      const footer = el('footer', { class: 'homepage-footer' });
      const legal = el('div', { class: 'footer-legal-row' });
      for (const [label, href] of [
        ['Whitepaper', '/whitepaper'],
        ['Terms of Service', '/terms'],
        ['Privacy Policy', '/privacy'],
      ]) {
        const link = el('a', { class: 'footer-link', href });
        link.textContent = label;
        legal.appendChild(link);
      }
      const hosting = el('div', { class: 'footer-hosting' });
      hosting.append('Hosted by ');
      for (const label of ['MoveWeight.net', 'MoveWeight.com', 'Diabl0.net']) {
        const link = el('a', { href: 'https://example.invalid' });
        link.textContent = label;
        hosting.append(link, ' ');
      }
      footer.append(legal, hosting);
      document.body.appendChild(footer);

      for (const link of Array.from(footer.querySelectorAll('a'))) {
        const box = link.getBoundingClientRect();
        expect(
          box.height,
          `footer link "${link.textContent}" height ${box.height} < ${TOUCH_FLOOR}`,
        ).toBeGreaterThanOrEqual(TOUCH_FLOOR - EPSILON);
      }
    });
  }
});
