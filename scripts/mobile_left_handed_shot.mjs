// Screenshot the mobile left-handed touch layout in offline mode: default
// (move stick left / camera stick right) vs. mirrored (swapped).
// Needs `npm run dev` on :5173. No server/Postgres required (offline flow).
import puppeteer from 'puppeteer-core';
import { BROWSER_PATH } from './browser_path.mjs';

const URL = process.env.URL || 'http://localhost:5173/';
const OUT = process.env.OUT || '/tmp/woc-left-handed';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: BROWSER_PATH,
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
const cdp = await page.target().createCDPSession();
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: 'coarse' }] });

await page.goto(URL, { waitUntil: 'networkidle2' });
await sleep(800);

// Offline flow: #btn-offline -> pick a class -> name -> start
await page.evaluate(() => document.getElementById('btn-offline')?.click());
await sleep(400);
await page.evaluate(() => document.querySelector('.mini-class[data-class="warrior"]')?.click());
await sleep(200);
await page.evaluate(() => {
  const n = document.getElementById('char-name');
  if (n) { n.value = 'Southpaw'; n.dispatchEvent(new Event('input', { bubbles: true })); }
});
await sleep(200);
await page.evaluate(() => document.getElementById('btn-start-offline')?.click());
await sleep(3500);

async function shot(name) {
  await page.screenshot({ path: `${OUT}-${name}.png` });
  console.log('wrote', `${OUT}-${name}.png`);
}

// Default: movement joystick on the left, camera joystick on the right.
await shot('right-handed');

// Toggle left-handed mode -> joysticks mirror (movement now on the right).
await page.evaluate(() => document.body.classList.add('mobile-left-handed'));
await sleep(600);
await shot('left-handed');

await browser.close();
