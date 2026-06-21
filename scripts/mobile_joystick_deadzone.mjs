// Screenshot harness for the touch-only "Joystick Deadzone" accessibility
// setting (Esc → Graphics, shown only on phone-touch devices). Boots the game
// in a phone-sized viewport with touch emulation, forces the mobile-touch
// layout (headless Chromium doesn't report pointer:coarse), then opens the
// Graphics options to capture the new slider at a few values.
//
// Run with `npm run dev` up:  node scripts/mobile_joystick_deadzone.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

import { BROWSER_PATH as EDGE } from './browser_path.mjs';
const URL = process.env.GAME_URL ?? 'http://localhost:5173';
fs.mkdirSync('tmp', { recursive: true });

// iPhone-ish landscape: pointer:coarse + small height triggers PHONE_TOUCH_QUERY.
const VIEWPORT = { width: 880, height: 412, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--window-size=880,412', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: VIEWPORT,
});
const page = await browser.newPage();
// Headless Chromium reports pointer:fine even under touch emulation, so the
// PHONE_TOUCH_QUERY (pointer: coarse ...) never matches and the touch-only UI
// stays hidden. Patch matchMedia at document start so isPhoneTouchDevice() is
// true and the whole mobile path (joysticks + Graphics deadzone slider) renders.
await page.evaluateOnNewDocument(() => {
  const real = window.matchMedia.bind(window);
  window.matchMedia = (q) => (/coarse/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false } : real(q));
});
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await page.click('#btn-offline');
await new Promise((r) => setTimeout(r, 200));
await page.type('#char-name', 'Tapper');
await page.click('#offline-select .mini-class[data-class="warrior"]');
await page.click('#btn-start-offline');
await new Promise((r) => setTimeout(r, 2500));

// Headless Chromium reports pointer:fine, so force the touch layout the same
// way the other mobile harnesses do, and make isPhoneTouchDevice() return true
// so the Graphics view renders the touch-only slider.
await page.evaluate(() => {
  document.body.classList.add('mobile-touch');
  const mc = window.__game?.mobileControls;
  if (mc) mc.setActive?.(true);
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: 'tmp/mobile_deadzone_01_controls.png' });

// Open Esc menu → Graphics.
await page.evaluate(() => window.__game?.hud?.toggleOptionsMenu?.());
await new Promise((r) => setTimeout(r, 200));
// Click the Graphics entry in the options menu.
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('#options-menu .btn')];
  const g = btns.find((b) => /graphics/i.test(b.textContent || ''));
  g?.click();
});
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: 'tmp/mobile_deadzone_02_graphics.png' });

// Drag the deadzone slider to its max and re-shoot.
const set = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#options-menu .set-row')];
  const row = rows.find((r) => /deadzone/i.test(r.querySelector('.set-name')?.textContent || ''));
  if (!row) return { found: false };
  const slider = row.querySelector('input[type="range"]');
  slider.value = slider.max;
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  return { found: true, value: slider.value, label: row.querySelector('.set-val')?.textContent };
});
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: 'tmp/mobile_deadzone_03_max.png' });

console.log('slider:', JSON.stringify(set));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console/page errors');
await browser.close();
process.exit(errors.length ? 1 : 0);
