#!/usr/bin/env node
// Stage 8b: measure every rigged body in the realm store the way the ENGINE
// measures it, so the weapon in its hand can be sized against its wielder.
//
//   BROWSER_PATH=/root/.cache/ms-playwright/chromium-*/chrome-linux64/chrome \
//   node scripts/realm_assets/measure_bodies.mjs \
//     --store /opt/cr-realms-store \
//     --out scripts/realm_assets/bodies_geometry.generated.json
//
// Idempotent: same store => same output, so re-running is safe and the diff is
// the set of bodies that changed.
//
// ---------------------------------------------------------------------------
// WHY THIS STAGE EXISTS
// ---------------------------------------------------------------------------
// prepareVisual() normalises every body to VisualDef.height (2.6 for the
// generated bank) by dividing by its measured raw height. The weapon is a child
// of a hand BONE, so it is normalised by the same divisor - which means the
// weapon's ON-SCREEN length is
//
//     gripTargetLength * (def.height / rawHeight)
//
// and its size RELATIVE to the wielder is gripTargetLength / rawHeight. The
// grip target is a constant per weapon. rawHeight is not: across this library it
// runs 1.32 to 4.03 world units, a 3.06x spread, because the source meshes were
// authored at wildly different scales and manual_rig binds them as authored.
// So the same sword reads as a longsword on one body and a greatsword on the
// next, purely as a function of how big the artist's mesh happened to be.
//
// This file is the missing term. emit_wield.mjs turns it into a per-body
// multiplier (rawHeight / reference height) that the attach path applies, and
// the ratio collapses onto the per-class fraction emit_arms.mjs asked for.
//
// The handslot world SCALE is recorded too: it is 1.0 on every body in this
// library (one shared 24-joint skeleton, bound unscaled), and the wield term is
// only exact while that holds. emit_wield.mjs fails loudly if it ever stops.
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv;
const arg = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);

const STORE = arg('store', '/opt/cr-realms-store');
const OUT = arg('out', resolve(__dirname, 'bodies_geometry.generated.json'));
const LIMIT = Number(arg('limit', Infinity));
// Chrome eventually dies under a long run of GLTF payloads however carefully the
// page disposes them. A fresh BROWSER every RECYCLE bodies costs ~1s and removes
// the failure mode entirely; a fresh page alone does not, because the process
// that runs out of memory is the renderer, not the frame.
const RECYCLE = Number(arg('recycle', 120));
const MERGE = argv.includes('--merge');

// Serve the store over localhost rather than shipping GLB bytes through CDP as
// base64: 1,600 bodies at ~3MB each is 5GB of string marshalling, several times
// the cost of the measurement itself.
const server = createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  const p = join(STORE, rel);
  if (!p.startsWith(STORE) || !existsSync(p) || !statSync(p).isFile()) {
    res.writeHead(404);
    res.end();
    return;
  }
  // The probe page is set via setContent, so its origin is about:blank and every
  // fetch is cross-origin. Without this header three's loader reports a bare
  // "Failed to fetch" for EVERY body and the whole run silently measures nothing.
  res.writeHead(200, {
    'content-type': 'model/gltf-binary',
    'access-control-allow-origin': '*',
  });
  createReadStream(p).pipe(res);
});
// Measuring one body can take longer than Node's 5s idle keep-alive timeout, and
// when it does the next load races the server closing the socket Chrome is about
// to reuse - reported as a bare "Failed to fetch" on a file that is perfectly
// fine. Never time an idle connection out; the server lives for one run.
server.keepAliveTimeout = 0;
server.headersTimeout = 0;
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const esbuild = await import('esbuild');
const puppeteer = (await import('puppeteer-core')).default;
const { BROWSER_PATH } = await import(resolve(__dirname, '../browser_path.mjs'));
if (!BROWSER_PATH) {
  console.error('[bodies] no browser; set BROWSER_PATH to the playwright chromium');
  process.exit(2);
}

const bundlePath = join(tmpdir(), `realm_body_probe_${process.pid}.js`);
await esbuild.build({
  entryPoints: [resolve(__dirname, 'body_probe_entry.js')],
  bundle: true,
  format: 'iife',
  outfile: bundlePath,
  logLevel: 'silent',
});
const bundle = readFileSync(bundlePath, 'utf8');

// A run of 1,600 bodies kills the BROWSER, not just the page: three keeps enough
// per-load state that the renderer process is eventually OOM-killed, and every
// later load then fails with "Failed to fetch" followed by a dead CDP socket.
// So the recycle - and the error path - replace the whole browser.
let browser = null;
let page = null;
async function restart() {
  if (browser) await browser.close().catch(() => {});
  browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: [
      '--use-angle=swiftshader',
      '--use-gl=angle',
      '--ignore-gpu-blocklist',
      '--no-sandbox',
      // /dev/shm in an LXC is small; without this Chrome dies on the first big GLB.
      '--disable-dev-shm-usage',
    ],
  });
  page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[page]', e.message));
  await page.setContent(`<!doctype html><html><body><script>${bundle}</script></body></html>`);
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });
}
await restart();

// Only pipeline-generated bodies: `realm_*.glb` at a realm's top level. The
// buckets below it (weapons/melee/buildings/...) are props, and the curated
// hand-registered GLBs alongside them are already sized by hand in manifest.ts.
const realms = readdirSync(STORE, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'review' && d.name !== 'shared')
  .map((d) => d.name)
  .sort();
const targets = [];
for (const realm of realms) {
  for (const f of readdirSync(join(STORE, realm)).sort()) {
    if (f.startsWith('realm_') && f.endsWith('.glb')) targets.push(`${realm}/${f}`);
  }
}

// --merge keeps rows already in the output file and measures only what is
// missing, which is how you top a run back up after a handful of transport
// misses without paying for all 1,600 again.
const out = MERGE && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const wanted = targets.slice(0, LIMIT).filter((rel) => !(MERGE && out[rel]));
if (MERGE) console.error(`[bodies] merge: ${Object.keys(out).length} kept, ${wanted.length} to measure`);

let done = 0;
async function measure(rel, loud) {
  const url = `http://127.0.0.1:${PORT}/${rel}`;
  try {
    return await page.evaluate((u) => window.measureBody(u), url);
  } catch (e) {
    // A dead frame or socket means the browser died on the PREVIOUS payload, not
    // that this body is unmeasurable. Rebuild and retry once, so one bad
    // neighbour cannot blank a hundred rows.
    try {
      await restart();
      return await page.evaluate((u) => window.measureBody(u), url);
    } catch (e2) {
      if (loud) console.error(`[bodies] FAIL ${rel}: ${String(e2.message ?? e2).slice(0, 120)}`);
      return null;
    }
  }
}

for (const rel of wanted) {
  done++;
  const row = await measure(rel, false);
  if (row?.height > 1e-3) out[rel] = row;
  if (done % 100 === 0) console.error(`[bodies] ${done}/${wanted.length}`);
  if (done % RECYCLE === 0 && done < wanted.length) await restart();
}

// Second sweep over whatever missed. Misses cluster (a browser that is already
// dying takes its neighbours down with it), so a body that failed in a bad
// stretch usually measures fine on a quiet browser - and a body that fails twice
// on a fresh one is a genuinely unreadable asset worth naming.
const misses = wanted.filter((rel) => !out[rel]);
if (misses.length) {
  console.error(`[bodies] retry sweep over ${misses.length} misses`);
  await restart();
  for (const rel of misses) {
    const row = await measure(rel, true);
    if (row?.height > 1e-3) out[rel] = row;
    await restart();
  }
}
const failed = wanted.filter((rel) => !out[rel]).length;

await browser.close().catch(() => {});
server.close();

mkdirSync(dirname(OUT), { recursive: true });
const keys = Object.keys(out).sort();
const sorted = {};
for (const k of keys) sorted[k] = out[k];
writeFileSync(OUT, `${JSON.stringify(sorted, null, 1)}\n`);

const hs = keys.map((k) => out[k].height).sort((a, b) => a - b);
console.log(`[bodies] measured ${keys.length}/${targets.length} (${failed} unmeasurable) -> ${OUT}`);
console.log(
  `[bodies] height: min ${hs[0]}  median ${hs[Math.floor(hs.length / 2)]}  max ${hs[hs.length - 1]}` +
    `  spread ${(hs[hs.length - 1] / hs[0]).toFixed(2)}x`,
);
const odd = keys.filter((k) => out[k].handR !== null && Math.abs(out[k].handR - 1) > 1e-3);
console.log(`[bodies] handslot.r world scale != 1 on ${odd.length} bodies`);
