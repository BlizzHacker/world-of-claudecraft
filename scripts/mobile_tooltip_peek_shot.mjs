// Mobile screenshot: long-press an action-bar slot to PEEK its ability tooltip
// (without casting). Drives the offline flow on an emulated landscape phone and
// fires a real CDP touch long-press on a hotbar slot.
//
// Prereq: `npm run dev` running on :5173.
//   node scripts/mobile_tooltip_peek_shot.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { BROWSER_PATH } from './browser_path.mjs';

const URL = 'http://localhost:5173/';
const OUT = 'tmp/shots';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: BROWSER_PATH,
  headless: 'new',
  args: [
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--no-sandbox', '--hide-scrollbars',
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const client = await page.target().createCDPSession();
  // Satisfy PHONE_TOUCH_QUERY = '(pointer: coarse) and (max-width: 940px)'.
  await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: 'coarse' }] });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#btn-offline', { visible: true });

  // Offline flow: pick mode → name → class → enter.
  await page.evaluate(() => document.getElementById('btn-offline').click());
  await sleep(250);
  await page.evaluate(() => {
    const n = document.getElementById('char-name');
    n.value = 'Thorgar';
    n.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.mini-class[data-class="mage"]').click();
  });
  await sleep(150);
  await page.evaluate(() => document.getElementById('btn-start-offline').click());

  // Let the world boot and the action bar populate.
  await page.waitForSelector('body.mobile-touch', { timeout: 8000 });
  await sleep(2500);

  // Pick a populated hotbar slot (skip slot 0 = Attack) and long-press it.
  const rect = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#actionbar .action-btn')];
    const target = btns.find((b, i) => i >= 1 && !b.classList.contains('empty')) || btns[1];
    const r = target.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  // Real CDP touch hold > TOOLTIP_PEEK_MS (950ms) so the tooltip appears.
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart', touchPoints: [{ x: rect.x, y: rect.y }],
  });
  await sleep(1200);
  await page.screenshot({ path: `${OUT}/mobile-tooltip-peek.png` });
  console.log('captured mobile-tooltip-peek.png (tooltip shown while held)');

  // Release: tooltip dismisses and NO cast fires.
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(400);
  const tooltipVisible = await page.evaluate(() => {
    const t = document.getElementById('tooltip');
    return t && getComputedStyle(t).display !== 'none';
  });
  console.log('tooltip visible after release:', tooltipVisible, '(expected false)');
} finally {
  await browser.close();
}
