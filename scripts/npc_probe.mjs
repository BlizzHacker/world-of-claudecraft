// Boot the offline world and report how NPCs and their RESOLVED bodies are
// exposed, before writing any capture. Guessing field names against a live sim
// wastes a 3-minute boot per wrong guess.
import puppeteer from 'puppeteer-core';
import { BROWSER_PATH as EDGE } from './browser_path.mjs';

const URL = process.env.GAME_URL ?? 'http://localhost:5173';

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

let booted = false;
for (let attempt = 0; attempt < 4 && !booted; attempt++) {
  try {
    await page.goto(URL, { waitUntil: 'load', timeout: 90000 });
    await page.waitForSelector('#btn-offline', { timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2500));
    await page.evaluate(() => document.querySelector('#btn-offline').click());
    await new Promise((r) => setTimeout(r, 400));
    await page.type('#char-name', 'Scout');
    await page.evaluate(() => {
      document.querySelector('#offline-select .mini-class[data-class="warrior"]').click();
      document.querySelector('#btn-start-offline').click();
    });
    // Wait for the HOOK, not for a field inside it. main.ts sets __game = { sim: world },
    // and this fork's world may not carry .player at all - waiting on that path
    // times out even when the world booted perfectly.
    await page.waitForFunction(() => !!window.__game, { timeout: 240000, polling: 1000 });
    booted = true;
  } catch (err) {
    console.log(`boot attempt ${attempt + 1} failed:`, err.message);
  }
}
if (!booted) { await browser.close(); throw new Error('could not boot the offline world'); }

await new Promise((r) => setTimeout(r, 4000));
await page.evaluate(() => {
  const skip = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Skip Tutorial'));
  skip?.click();
});
await new Promise((r) => setTimeout(r, 2500));

const info = await page.evaluate(() => {
  const g = window.__game;
  const sim = g.sim;
  const out = { simKeys: Object.keys(sim).slice(0, 40), rendererKeys: Object.keys(g.renderer).slice(0, 40) };

  // Find the array holding NPCs, whatever it is called.
  const arrays = {};
  for (const k of Object.keys(sim)) {
    const v = sim[k];
    if (Array.isArray(v) && v.length) arrays[k] = v.length;
    else if (v instanceof Map && v.size) arrays[k] = `Map(${v.size})`;
  }
  out.arrays = arrays;

  out.hasPlayer = !!sim.player;
  const pick = sim.npcs ?? sim.mobs ?? sim.entities ?? null;
  const list = pick instanceof Map ? [...pick.values()] : Array.isArray(pick) ? pick : [];
  out.sample = list.slice(0, 3).map((n) => ({
    keys: Object.keys(n).slice(0, 30),
    id: n.id, name: n.name, kind: n.kind, type: n.type,
    pos: n.pos ? { x: Math.round(n.pos.x), z: Math.round(n.pos.z) } : null,
  }));
  out.count = list.length;
  return out;
});
console.log(JSON.stringify(info, null, 2).slice(0, 3000));
await browser.close();
