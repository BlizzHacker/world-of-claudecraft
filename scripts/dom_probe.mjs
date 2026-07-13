import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROME, headless: 'new',
  args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-renderer-backgrounding','--disable-background-timer-throttling'],
  defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage();
await p.goto('http://localhost:5173', { waitUntil: 'load', timeout: 45000 });
await p.bringToFront();
await p.waitForSelector('#btn-offline', { timeout: 30000 }); await sleep(2000);
await p.evaluate(() => document.querySelector('#btn-offline').click()); await sleep(400);
await p.type('#char-name', 'Probe');
await p.evaluate(() => { document.querySelector('#offline-select .mini-class[data-class="warrior"]')?.click(); document.querySelector('#btn-start-offline').click(); });
await p.waitForFunction(() => !!window.__game?.sim?.player, { timeout: 120000, polling: 500 });
await p.bringToFront(); await sleep(3000);
const info = await p.evaluate(() => {
  const bodyClasses = document.body.className;
  const globeEls = [...document.querySelectorAll('[id*="globe" i],[class*="globe" i],[id*="orb" i],[class*="orb" i]')].map(e => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { tag: e.tagName, id: e.id, cls: e.className?.toString?.().slice(0,60), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), display: cs.display, vis: cs.visibility };
  }).filter(o => o.w > 5 || o.id || o.cls);
  const pf = document.querySelector('#player-frame'); const pfcs = pf && getComputedStyle(pf);
  return { bodyClasses, hudSkin: window.localStorage?.getItem('cr_hud_skin'), playerFrameDisplay: pfcs?.display, globeEls };
});
console.log(JSON.stringify(info, null, 1));
await b.close();
