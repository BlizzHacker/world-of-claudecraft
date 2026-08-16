// Screenshot the LIVE public site with the headless Chromium in LXC 171, and read
// back what the client actually resolved — not what the manifest claims.
const puppeteer = (await import('puppeteer-core')).default;

const BROWSER = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const URL = process.argv[2] ?? 'https://infernal.crypticrealm.com';
const OUT = process.argv[3] ?? '/tmp/live.png';

const browser = await puppeteer.launch({
  executablePath: BROWSER,
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle',
         '--ignore-gpu-blocklist', '--enable-webgl', '--window-size=1600,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 12000));

// Ask the page what it loaded: every /cr-realms GLB it fetched.
const seen = await page.evaluate(() =>
  performance.getEntriesByType('resource')
    .map((e) => e.name)
    .filter((n) => n.includes('/cr-realms/'))
    .map((n) => n.split('/').pop().replace('.glb', ''))
);
await page.screenshot({ path: OUT, fullPage: false });
console.log('url        :', URL);
console.log('title      :', await page.title());
console.log('cr-realms GLBs the live client fetched:', seen.length);
for (const s of [...new Set(seen)].slice(0, 12)) console.log('   ', s);
if (errs.length) console.log('page errors:', errs.slice(0, 3));
await browser.close();
