// Mobile screenshot harness for the Joystick Size setting.
// Boots the offline game in a touch-emulated landscape phone viewport and
// captures the on-screen joysticks at the min / default / max joystick scales.
// Needs `npm run dev` running on :5173. Saves PNGs to tmp/.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

import { BROWSER_PATH as EDGE } from './browser_path.mjs';
const URL = process.env.GAME_URL ?? 'http://localhost:5173';
fs.mkdirSync('tmp', { recursive: true });

// A landscape phone: width<940 keeps us inside PHONE_TOUCH_QUERY, landscape
// avoids the rotate-device overlay.
const VIEWPORT = { width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--window-size=844,390', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: VIEWPORT,
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await page.click('#btn-offline');
await new Promise((r) => setTimeout(r, 200));
await page.type('#char-name', 'Thumbster');
await page.click('#offline-select .mini-class[data-class="warrior"]');
await page.click('#btn-start-offline');
await new Promise((r) => setTimeout(r, 2500));

// Force the touch layer on. Headless Chromium doesn't always report
// (pointer: coarse), so we apply the same body class MobileControls would.
await page.evaluate(() => document.body.classList.add('mobile-touch'));
await new Promise((r) => setTimeout(r, 200));
const touchOn = await page.evaluate(() => document.body.classList.contains('mobile-touch'));
console.log('mobile-touch active:', touchOn);

// Apply a joystick scale exactly as applySetting('joystickScale') does, then shoot.
async function shoot(scale, name) {
  await page.evaluate((s) => {
    document.getElementById('mobile-controls')?.style.setProperty('--joy-scale', String(s));
  }, scale);
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: `tmp/${name}` });
  console.log('saved tmp/' + name, '(scale ' + scale + ')');
}

await shoot(0.7, 'joystick_small.png');
await shoot(1.0, 'joystick_default.png');
await shoot(1.3, 'joystick_large.png');

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
