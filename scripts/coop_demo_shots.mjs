// Headless demonstration of couch co-op. Boots the offline world as Player 1
// (keyboard), plugs in a synthetic Xbox pad, presses Start to open the co-op
// join overlay via the LIVE game loop, picks a class for Player 2, then drives
// the left stick so both heroes are framed by the shared camera. Real input
// through the running loop — but swiftshader renders at ~1 fps headless, so each
// step polls for its result instead of relying on real-time cadence.
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const URL = process.env.GAME_URL ?? 'http://localhost:5173';
const CHROME = process.env.CHROME;
const OUT = process.env.OUT_DIR ?? '/tmp/coop-shots';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1600,900', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

const setBtn = (i, v) => page.evaluate(([i, v]) => { window.__pad.buttons[i] = v; }, [i, v]);
const setAxes = (x, y) => page.evaluate(([x, y]) => { window.__pad.axes = [x, y, 0, 0]; }, [x, y]);
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', n); };
async function pollFor(fn, ms = 12000, step = 400) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(fn)) return true; await sleep(step); }
  return false;
}

// --- boot offline as Player 1 (warrior, keyboard) ----------------------------
let booted = false;
for (let a = 0; a < 4 && !booted; a++) {
  try {
    await page.goto(URL, { waitUntil: 'load', timeout: 45000 });
    await page.bringToFront();
    await page.waitForSelector('#btn-offline', { timeout: 30000 });
    await sleep(2500);
    await page.evaluate(() => document.querySelector('#btn-offline').click());
    await sleep(500);
    await page.type('#char-name', 'Parent');
    await page.evaluate(() => {
      document.querySelector('#offline-select .mini-class[data-class="warrior"]')?.click();
      document.querySelector('#btn-start-offline').click();
    });
    await page.waitForFunction(() => !!window.__game?.sim?.player, { timeout: 120000, polling: 500 });
    booted = true;
  } catch (err) { console.log(`boot attempt ${a + 1}:`, err.message); }
}
if (!booted) { await browser.close(); throw new Error('could not boot offline world'); }
await page.bringToFront();
await sleep(2500);
await page.evaluate(() =>
  [...document.querySelectorAll('button')].find((b) => /skip/i.test(b.textContent || ''))?.click());
await sleep(1500);
await shot('01-player1-solo');

// --- plug in the controller (synthetic Xbox pad; never claimed by P1) --------
await page.evaluate(() => {
  window.__pad = { index: 0, id: 'Xbox 360 Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)',
    mapping: 'standard', connected: true, buttons: new Array(17).fill(false), axes: [0, 0, 0, 0] };
  navigator.getGamepads = () => [{
    index: 0, id: window.__pad.id, mapping: 'standard', connected: true, timestamp: performance.now(),
    buttons: window.__pad.buttons.map((p) => ({ pressed: p, touched: p, value: p ? 1 : 0 })),
    axes: window.__pad.axes.slice(), vibrationActuator: null }, null, null, null];
});
await sleep(1200); // baseline frames with Start released

// --- press Start -> live loop opens the join overlay -------------------------
await setBtn(9, true); // hold Start until the ~1fps loop samples the rising edge
const overlayOpen = await pollFor(() => !!document.getElementById('coop-join-overlay'), 15000);
await setBtn(9, false);
console.log('join overlay opened by the live loop:', overlayOpen);
await sleep(400);
await shot('02-join-overlay');

// --- pick Mage for Player 2 (overlay button is clickable) --------------------
const picked = await page.evaluate(() => {
  const root = document.getElementById('coop-join-overlay');
  const btn = [...(root?.querySelectorAll('.coop-option') || [])].find((b) => /mage/i.test(b.textContent || ''));
  btn?.click();
  return btn?.textContent ?? null;
});
console.log('picked class:', picked);
const joined = await pollFor(() => (window.__game?.sim?.players?.size ?? 0) >= 2, 12000);
await sleep(2500); // let the shared camera fit both heroes
const players = await page.evaluate(() => window.__game?.sim?.players?.size ?? 0);
console.log('two players joined:', joined, 'players:', players);
await shot('03-two-players');

// --- drive Player 2 with the left stick; shared camera reframes --------------
const startSpread = await page.evaluate(() => {
  const s = window.__game.sim, ids = [...s.players.keys()];
  const a = s.entities.get(ids[0]).pos, b = s.entities.get(ids[1]).pos;
  return Math.hypot(a.x - b.x, a.z - b.z);
});
await setAxes(0.9, -0.7); // up-right
const moved = await pollFor((sp) => {
  const s = window.__game.sim, ids = [...s.players.keys()];
  if (ids.length < 2) return false;
  const a = s.entities.get(ids[0]).pos, b = s.entities.get(ids[1]).pos;
  return Math.hypot(a.x - b.x, a.z - b.z) > sp + 6;
}, 16000, 500);
await setAxes(0, 0);
await sleep(1500);
const endSpread = await page.evaluate(() => {
  const s = window.__game.sim, ids = [...s.players.keys()];
  const a = s.entities.get(ids[0]).pos, b = s.entities.get(ids[1]).pos;
  return +Math.hypot(a.x - b.x, a.z - b.z).toFixed(2);
});
console.log('player 2 moved:', moved, 'spread', startSpread.toFixed(2), '->', endSpread);
await shot('04-coop-moving');

fs.writeFileSync(`${OUT}/result.json`, JSON.stringify({ overlayOpen, picked, players, moved, endSpread }, null, 2));
await browser.close();
console.log(`DEMO_DONE overlay=${overlayOpen} players=${players} moved=${moved}`);
