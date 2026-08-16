// Log the headless browser in as the real account and capture the character-select
// exception. Screenshots and server-side payload checks both said "fine"; the row
// loop clearly throws, so this reads the actual error instead of inferring.
const puppeteer = (await import('puppeteer-core')).default;
const BROWSER = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const TOKEN = process.argv[2];
const URL = 'https://infernal.crypticrealm.com';

const browser = await puppeteer.launch({
  executablePath: BROWSER, headless: true,
  args: ['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
const errs = [], logs = [];
page.on('pageerror', (e) => errs.push(String(e.stack || e.message).slice(0, 400)));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text().slice(0, 250)); });

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.evaluate((t) => {
  localStorage.setItem('woc_session', JSON.stringify({ token: t, username: 'MOVEWEIGHT' }));
  
  
}, TOKEN);
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 }).catch(()=>{});
await new Promise((r) => setTimeout(r, 15000));

const state = await page.evaluate(() => {
  const ul = document.querySelector('#char-list');
  return {
    listHtml: ul ? ul.innerHTML.slice(0, 200) : 'NO #char-list',
    rows: ul ? ul.querySelectorAll('li').length : -1,
    panel: document.querySelector('#charselect-panel')?.hasAttribute('hidden') ? 'hidden' : 'visible',
    err: (document.querySelector('#charselect-error')||{}).textContent || '',
  };
});
console.log('rows in #char-list :', state.rows);
console.log('panel              :', state.panel);
console.log('charselect-error   :', JSON.stringify(state.err));
console.log('list html          :', JSON.stringify(state.listHtml));
console.log('--- page errors ---'); errs.slice(0,3).forEach(e=>console.log(e));
console.log('--- console errors ---'); logs.slice(0,6).forEach(e=>console.log(' ', e));
await page.screenshot({ path: '/tmp/auth_shot.png' });
await browser.close();
