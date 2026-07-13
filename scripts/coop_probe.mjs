import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROME, headless: 'new',
  args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-renderer-backgrounding','--disable-background-timer-throttling'],
  defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERR', e.message));
await p.goto('http://localhost:5173', { waitUntil: 'load', timeout: 45000 });
await p.bringToFront();
await p.waitForSelector('#btn-offline', { timeout: 30000 }); await sleep(2000);
await p.evaluate(() => document.querySelector('#btn-offline').click()); await sleep(400);
await p.type('#char-name', 'Probe');
await p.evaluate(() => { document.querySelector('#offline-select .mini-class[data-class=\"warrior\"]')?.click(); document.querySelector('#btn-start-offline').click(); });
await p.waitForFunction(() => !!window.__game?.sim?.player, { timeout: 120000, polling: 500 });
await p.bringToFront(); await sleep(1500);
const f1 = await p.evaluate(() => window.__coopFrames ?? 'undef');
await sleep(1500);
const f2 = await p.evaluate(() => window.__coopFrames ?? 'undef');
const hasCoop = await p.evaluate(() => !!window.__game.coopController);
console.log('COOPFRAMES', f1, '->', f2, 'hasCoop', hasCoop);
await b.close();
