#!/usr/bin/env node
// Node driver for armed_probe_entry.js. Serves the asset store over localhost so
// GLB bytes never travel through CDP as base64 (1,200 bodies x ~3MB would take
// longer than the render itself), then asks the page for one measurement row per
// armed body.
//
//   node armed_probe.mjs --cases /tmp/cases.json --out /tmp/armed_probe.json
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv;
const arg = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const CASES = arg('cases', '/tmp/cases.json');
const OUT = arg('out', '/tmp/armed_probe.json');
const ROOTS = { store: '/opt/cr-realms-store', pub: '/opt/cryptic-realm/public' };

const server = createServer((req, res) => {
  const [, tag, ...rest] = decodeURIComponent(req.url).split('/');
  const base = ROOTS[tag];
  const p = base ? join(base, rest.join('/')) : null;
  if (!p || !existsSync(p) || !statSync(p).isFile()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'content-type': 'model/gltf-binary', 'access-control-allow-origin': '*' });
  createReadStream(p).pipe(res);
});
server.keepAliveTimeout = 0;
server.headersTimeout = 0;
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const esbuild = await import('esbuild');
const puppeteer = (await import('puppeteer-core')).default;
const { BROWSER_PATH } = await import(resolve(__dirname, 'scripts/browser_path.mjs'));
const bundlePath = join(tmpdir(), `armed_probe_${process.pid}.js`);
await esbuild.build({
  entryPoints: [resolve(__dirname, 'scripts/realm_assets/armed_probe_entry.js')],
  bundle: true,
  format: 'iife',
  outfile: bundlePath,
  logLevel: 'silent',
});
const browser = await puppeteer.launch({
  executablePath: BROWSER_PATH,
  headless: true,
  args: ['--use-angle=swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const bundle = readFileSync(bundlePath, 'utf8');
async function freshPage(old) {
  if (old) await old.close();
  const p = await browser.newPage();
  p.on('pageerror', (e) => console.error('[page]', e.message));
  await p.setContent(`<!doctype html><html><body><script>${bundle}</script></body></html>`);
  await p.waitForFunction('window.__ready === true', { timeout: 60000 });
  return p;
}
let page = await freshPage(null);

const cases = JSON.parse(readFileSync(CASES, 'utf8'));
const rows = [];
let i = 0;
async function probe(c) {
  return page.evaluate(
    (b, a, o) => window.probeArmed(b, a, o),
    `http://127.0.0.1:${PORT}${c.body}`,
    `http://127.0.0.1:${PORT}${c.arm}`,
    { grip: c.grip ?? null, bone: c.bone ?? 'handslot.r', wield: c.wield ?? 1 },
  );
}
for (const c of cases) {
  i++;
  try {
    rows.push({ ...c, ...(await probe(c)) });
  } catch (e) {
    // A detached frame means the renderer died on the previous payload, not that
    // THIS body is unmeasurable: rebuild the page and give it one more go before
    // recording a real failure.
    try {
      page = await freshPage(null).catch(() => freshPage(null));
      rows.push({ ...c, ...(await probe(c)) });
    } catch (e2) {
      rows.push({ ...c, err: String(e2.message ?? e2).slice(0, 120) });
    }
  }
  if (i % 25 === 0) {
    await page.evaluate(() => window.__dropCache());
    process.stderr.write(`  ...${i}/${cases.length}\n`);
  }
}
writeFileSync(OUT, JSON.stringify(rows, null, 1));
await browser.close();
server.close();

const ok = rows.filter((r) => !r.err);
console.log(`${ok.length}/${rows.length} measured -> ${OUT}`);
const rs = ok.map((r) => r.ratio).sort((a, b) => a - b);
const q = (p) => rs[Math.min(rs.length - 1, Math.floor(p * rs.length))];
if (rs.length) {
  console.log(
    `ratio  min ${rs[0]}  p05 ${q(0.05)}  MEDIAN ${q(0.5)}  p95 ${q(0.95)}  max ${rs[rs.length - 1]}` +
      `   spread p95/p05 ${(q(0.95) / q(0.05)).toFixed(2)}x  max/min ${(rs[rs.length - 1] / rs[0]).toFixed(2)}x`,
  );
}
