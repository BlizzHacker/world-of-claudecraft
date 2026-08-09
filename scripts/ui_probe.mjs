// Look at the deployed page instead of guessing selectors. Screenshots each
// step and dumps the ids/buttons actually present, so the boot script can be
// written against the real UI rather than a sibling repo's.
import puppeteer from 'puppeteer-core';
import { BROWSER_PATH as EDGE } from './browser_path.mjs';

const URL = process.env.GAME_URL ?? 'https://infernal.crypticrealm.com';
const OUT = '/tmp/uiprobe';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900',
         '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)); });

const dump = async (tag) => {
  await page.screenshot({ path: `${OUT}/${tag}.png` });
  const d = await page.evaluate(() => ({
    ids: [...document.querySelectorAll('[id]')].map((e) => e.id).slice(0, 40),
    buttons: [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim().slice(0, 30)).filter(Boolean).slice(0, 25),
    hasGame: !!window.__game,
    title: document.title,
  }));
  console.log(`--- ${tag}:`, JSON.stringify(d).slice(0, 900));
};

await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
await new Promise((r) => setTimeout(r, 8000));
await dump('01_load');

// Try the offline entry if it is there.
const clicked = await page.evaluate(() => {
  const b = document.querySelector('#btn-offline')
    ?? [...document.querySelectorAll('button')].find((x) => /offline|play|single/i.test(x.textContent || ''));
  if (b) { b.click(); return (b.textContent || b.id).trim(); }
  return null;
});
console.log('clicked:', clicked);
await new Promise((r) => setTimeout(r, 6000));
await dump('02_after_offline');

await browser.close();
