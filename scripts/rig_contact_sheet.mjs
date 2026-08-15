// Renders each body at 4 phases of Idle / Walk / Attack and writes one contact
// sheet per body: ORIGINAL on the top row, REPAIRED beneath it, same clip, same
// phase, same camera. The repo's rule is that a body is judged by looking at it
// in motion, not by its numbers, so this exists to make that possible offline.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = '/opt/cryptic-realm';
const OUT = '/opt/cr-rig-repair/shots';
const PORT = 8911;
mkdirSync(OUT, { recursive: true });

const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.glb':'model/gltf-binary', '.json':'application/json', '.png':'image/png', '.bin':'application/octet-stream' };

const srv = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let file;
  if (p === '/' || p === '/rigshot.html') file = join(ROOT, 'scripts/rigshot/rigshot.html');
  else if (p.startsWith('/staged/')) file = join('/opt/cr-rig-repair/staged', normalize(p.slice(8)));
  else if (p.startsWith('/orig/')) file = join(ROOT, 'public/cr-realms/infernal', normalize(p.slice(6)));
  else if (p.startsWith('/store/')) file = join('/opt/cr-realms-store/infernal', normalize(p.slice(7)));
  else file = join(ROOT, normalize(p));
  if (!existsSync(file)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => srv.listen(PORT, r));

const puppeteer = (await import('puppeteer-core')).default;
const br = await puppeteer.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
  headless: true,
  args: ['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl'],
});
const page = await br.newPage();
await page.setViewport({ width: 500, height: 640 });
page.on('pageerror', e => console.log('  pageerror:', e.message));
await page.goto(`http://127.0.0.1:${PORT}/rigshot.html`, { waitUntil: 'networkidle2' });
await page.waitForFunction('window.__ready === true', { timeout: 60000 });

const BODIES = process.argv.slice(2);
const CLIPS = ['Idle', 'Walk', 'Attack'];
const PHASES = [0, 0.25, 0.5, 0.75];

for (const b of BODIES) {
  const rows = [];
  for (const [label, url] of [['ORIGINAL', `/orig/${b}.glb`], ['REPAIRED', `/staged/${b}.CLAIM.glb`]]) {
    for (const clip of CLIPS) {
      for (const phase of PHASES) {
        const r = await page.evaluate(a => window.renderBody(a), { url, clip, phase });
        rows.push({ label, clip, phase, ...r });
      }
    }
  }
  const meta = rows[0];
  console.log(`\n### ${b}  clips=[${meta.clips.join(', ')}]`);
  for (const lab of ['ORIGINAL','REPAIRED']) {
    const r = rows.filter(x => x.label === lab);
    const hs = r.map(x => x.height.toFixed(3));
    const ws = r.map(x => x.width.toFixed(3));
    console.log(`  ${lab}  posed height ${Math.min(...hs)}..${Math.max(...hs)}   posed width ${Math.min(...ws)}..${Math.max(...ws)}`);
  }
  // Contact sheet: 12 columns (3 clips x 4 phases), 2 rows.
  const sheet = await page.evaluate((rows, W, H) => {
    const cols = 12, cw = W / 2, ch = H / 2;
    const c = document.createElement('canvas');
    c.width = cols * cw; c.height = 2 * ch + 40;
    const g = c.getContext('2d');
    g.fillStyle = '#141821'; g.fillRect(0, 0, c.width, c.height);
    return Promise.all(rows.map(r => new Promise(res => {
      const im = new Image(); im.onload = () => res({ im, r }); im.src = r.png;
    }))).then(list => {
      list.forEach(({ im, r }, i) => {
        const row = r.label === 'ORIGINAL' ? 0 : 1;
        const idx = i % 12;
        g.drawImage(im, idx * cw, 20 + row * ch, cw, ch);
        g.fillStyle = '#cfd6e4'; g.font = '11px monospace';
        if (row === 0) g.fillText(`${r.clip} ${r.phase}`, idx * cw + 4, 14);
        if (idx === 0) { g.fillStyle = '#ffd479'; g.fillText(r.label, 4, 20 + row * ch + 12); }
      });
      return c.toDataURL('image/png');
    });
  }, rows, 420, 560);
  writeFileSync(join(OUT, `${b}.sheet.png`), Buffer.from(sheet.split(',')[1], 'base64'));
  console.log(`  sheet -> ${join(OUT, `${b}.sheet.png`)}`);
}
await br.close(); srv.close();
