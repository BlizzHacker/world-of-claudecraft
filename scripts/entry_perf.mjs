// World-entry timing harness for Cryptic Realm (offline mode, local dist).
//
// Serves /opt/cryptic-realm/dist statically, boots the offline world headless
// (npc_shots.mjs pattern), and reports a phase breakdown of world entry:
//   - deferred preload burst size + assets phase wall time
//   - prepareZone / prewarm wall times (from [entry-guard] console lines and
//     the loading-bar progress timeline)
//   - main-thread long tasks before and after the loading screen drops
//   - failed / 404 asset requests
//
// Usage: node scripts/entry_perf.mjs [--label NAME]
//   env: GFX_TIER=high|medium|... (adds ?gfx=), PORT=8788, OUT=/tmp/entry_perf
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { BROWSER_PATH } from './browser_path.mjs';

const DIST = process.env.DIST_DIR ?? '/opt/cryptic-realm/dist';
const PORT = Number(process.env.PORT ?? 8788);
const OUT = process.env.OUT ?? '/tmp/entry_perf';
const LABEL = process.argv.includes('--label')
  ? process.argv[process.argv.indexOf('--label') + 1]
  : 'run';
const GFX_TIER = process.env.GFX_TIER ?? '';
const POST_ENTRY_WATCH_MS = Number(process.env.POST_ENTRY_WATCH_MS ?? 25000);
mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm', '.ktx2': 'application/octet-stream',
  '.basis': 'application/octet-stream', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.txt': 'text/plain', '.xml': 'application/xml',
  '.hdr': 'application/octet-stream', '.exr': 'application/octet-stream',
  '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let filePath = normalize(join(DIST, urlPath));
  if (!filePath.startsWith(normalize(DIST))) { res.writeHead(403); res.end(); return; }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    const withIndex = join(filePath, 'index.html');
    if (existsSync(withIndex)) filePath = withIndex;
    else if (!extname(urlPath)) filePath = join(DIST, 'index.html'); // SPA fallback
    else { res.writeHead(404); res.end('not found'); return; }
  }
  res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const URLBASE = `http://127.0.0.1:${PORT}/${GFX_TIER ? `?gfx=${GFX_TIER}` : ''}`;
console.log(`[harness] serving ${DIST} at ${URLBASE} label=${LABEL}`);

const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_PATH ?? BROWSER_PATH,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900',
         '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1600, height: 900 },
  protocolTimeout: 900000,
});
const page = await browser.newPage();

const t0 = Date.now();
const consoleLog = []; // {t, text}
const netFailures = []; // {t, url, status/reason}
page.on('pageerror', (e) => consoleLog.push({ t: Date.now() - t0, text: `PAGEERROR: ${e.message.slice(0, 200)}` }));
page.on('console', (m) => {
  const text = m.text();
  if (/entry-guard|entry-diag|prewarm|deferred|preload|assets|Failed|failed/i.test(text)) {
    consoleLog.push({ t: Date.now() - t0, text: text.slice(0, 400) });
  }
});
page.on('requestfailed', (req) => {
  const f = req.failure();
  if (f && f.errorText !== 'net::ERR_ABORTED') {
    netFailures.push({ t: Date.now() - t0, url: req.url().slice(0, 200), reason: f.errorText });
  }
});
page.on('response', (res) => {
  if (res.status() >= 400) {
    netFailures.push({ t: Date.now() - t0, url: res.url().slice(0, 200), status: res.status() });
  }
});

// In-page probes: long tasks + loading bar timeline, armed before any app code runs.
await page.evaluateOnNewDocument(() => {
  window.__perfProbe = { longTasks: [], bar: [], t0: performance.now() };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__perfProbe.longTasks.push({ start: e.startTime, dur: e.duration });
      }
    }).observe({ entryTypes: ['longtask'] });
  } catch { /* longtask unsupported: leave empty */ }
  const poll = () => {
    const fill = document.querySelector('#ls-fill');
    const status = document.querySelector('#ls-status');
    const screen = document.querySelector('#loading-screen');
    const rec = {
      t: performance.now(),
      w: fill ? fill.style.width : null,
      s: status ? (status.textContent || '').slice(0, 60) : null,
      visible: screen ? screen.classList.contains('visible') : null,
    };
    const prev = window.__perfProbe.bar[window.__perfProbe.bar.length - 1];
    if (!prev || prev.w !== rec.w || prev.s !== rec.s || prev.visible !== rec.visible) {
      window.__perfProbe.bar.push(rec);
    }
    setTimeout(poll, 80);
  };
  poll();
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: `${OUT}/${LABEL}_${name}.png` }).catch(() => undefined);

await page.goto(URLBASE, { waitUntil: 'load', timeout: 240000 });
await wait(9000);
await page.evaluate(() => {
  const n = [...document.querySelectorAll('button, a')].find((b) => /not now/i.test(b.textContent || ''));
  n?.click();
});
await wait(600);
await page.evaluate(() => {
  const sel = document.querySelector('#mode-select, .mode-select, #play-mode')
    ?? [...document.querySelectorAll('*')].find((e) => /Characters Created/i.test(e.textContent || '') && e.children.length < 8);
  sel?.click();
  (sel?.closest('button, [role=button], div'))?.click();
});
await wait(1200);
await page.evaluate(() => document.querySelector('#btn-offline')?.click());
await wait(2500);
const panel = await page.evaluate(() => ({
  hasName: !!document.querySelector('#char-name'),
  start: !!document.querySelector('#btn-start-offline'),
}));
console.log('[harness] offline panel:', JSON.stringify(panel));
if (!panel.start) { await shot('no_panel'); throw new Error('offline panel not reachable'); }
if (panel.hasName) {
  await page.evaluate(() => {
    const el = document.querySelector('#char-name');
    if (!el) return;
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, 'PerfScout');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#offline-select .mini-class[data-class="warrior"]')?.click();
  });
  await wait(400);
}
const tPlay = Date.now() - t0;
const tPlayPage = await page.evaluate(() => performance.now());
await page.evaluate(() => document.querySelector('#btn-start-offline')?.click());
console.log(`[harness] pressed start at +${tPlay}ms`);

await page.waitForFunction(() => !!window.__game, { timeout: 900000, polling: 1000 });
const tGame = Date.now() - t0;
console.log(`[harness] world booted at +${tGame}ms (entry ${tGame - tPlay}ms so far)`);
await page.waitForFunction(
  () => {
    const el = document.querySelector('#loading-screen');
    return !el || !el.classList.contains('visible');
  },
  { timeout: 900000, polling: 500 },
);
const tHidden = Date.now() - t0;
console.log(`[harness] loading screen dropped at +${tHidden}ms (entry total ${tHidden - tPlay}ms)`);
await shot('entered');

// Post-entry stall watch: keep collecting long tasks with the world live.
await wait(POST_ENTRY_WATCH_MS);
const probe = await page.evaluate(() => window.__perfProbe);
// Which body did each nearby character view actually resolve to? Realm bank
// bodies carry names outside the KayKit families; a published override body
// that failed to stream would show its KayKit fallback here instead.
const viewBodies = await page.evaluate(() => {
  try {
    const g = window.__game;
    const out = [];
    const views = g?.renderer?.views;
    if (!views || !(views instanceof Map)) return { error: 'no views map' };
    for (const [id, view] of views) {
      if (out.length >= 60) break;
      const entity = (g.sim ?? g.world)?.entities?.get?.(id);
      const names = [];
      let tris = 0;
      view.group?.traverse?.((o) => {
        if (o.isSkinnedMesh || o.isMesh) {
          if (names.length < 4 && o.name) names.push(o.name);
          const index = o.geometry?.index;
          const pos = o.geometry?.attributes?.position;
          tris += Math.floor((index ? index.count : (pos?.count ?? 0)) / 3);
        }
      });
      out.push({
        id,
        kind: entity?.kind ?? null,
        templateId: entity?.templateId ?? null,
        rootName: view.group?.name || view.visual?.root?.name || null,
        meshNames: names,
        triangles: tris,
      });
    }
    return { views: out };
  } catch (e) { return { error: String(e).slice(0, 200) }; }
});

// Per-entry prewarm attribution straight from the renderer.
const prewarmStats = await page.evaluate(() => {
  try {
    const stats = window.__game?.renderer?.perfStats?.();
    const zonePrep = window.__game?.renderer?.lastZonePrepareStats ?? null;
    return stats
      ? { tier: stats.tier, glRenderer: stats.glRenderer, prewarm: stats.prewarm, zonePrep }
      : null;
  } catch (e) { return { error: String(e).slice(0, 200) }; }
});
const tEnd = Date.now() - t0;

// Split long tasks at the loading-screen drop (page clock).
const hideBarRec = probe.bar.find((r) => r.visible === false);
const pageHideT = hideBarRec ? hideBarRec.t : null;
const ltBefore = [];
const ltAfter = [];
for (const lt of probe.longTasks) {
  if (pageHideT !== null && lt.start >= pageHideT) ltAfter.push(lt);
  else ltBefore.push(lt);
}
const summarize = (arr) => ({
  count: arr.length,
  totalMs: Math.round(arr.reduce((s, e) => s + e.dur, 0)),
  maxMs: Math.round(arr.reduce((m, e) => Math.max(m, e.dur), 0)),
  over1s: arr.filter((e) => e.dur >= 1000).length,
  over5s: arr.filter((e) => e.dur >= 5000).length,
});

const report = {
  label: LABEL,
  url: URLBASE,
  gfxTier: GFX_TIER || 'auto',
  pressedPlayAtMs: tPlay,
  worldBootedAtMs: tGame,
  loadingHiddenAtMs: tHidden,
  entryToGameMs: tGame - tPlay,
  entryTotalMs: tHidden - tPlay,
  playPagePerfNow: tPlayPage,
  longTasksBeforeReveal: summarize(ltBefore),
  longTasksAfterReveal: summarize(ltAfter),
  longTasksAfterList: ltAfter.filter((e) => e.dur >= 500).map((e) => ({
    start: Math.round(e.start), dur: Math.round(e.dur),
  })),
  barTimeline: probe.bar,
  console: consoleLog,
  netFailures,
  watchedUntilMs: tEnd,
  rendererStats: prewarmStats,
  viewBodies,
};
writeFileSync(`${OUT}/${LABEL}.json`, JSON.stringify(report, null, 2));
console.log(`[harness] report: ${OUT}/${LABEL}.json`);
console.log('[harness] ---- summary ----');
console.log(`entry press->game: ${report.entryToGameMs}ms  press->revealed: ${report.entryTotalMs}ms`);
console.log('longtasks before reveal:', JSON.stringify(report.longTasksBeforeReveal));
console.log('longtasks after reveal :', JSON.stringify(report.longTasksAfterReveal));
for (const line of consoleLog) {
  if (/entry-guard/.test(line.text)) console.log(`  +${line.t}ms ${line.text.slice(0, 240)}`);
}
console.log('net failures:', netFailures.length);
for (const f of netFailures.slice(0, 20)) console.log('  ', JSON.stringify(f));
if (prewarmStats?.prewarm?.manifestEntries) {
  console.log(`[harness] tier=${prewarmStats.tier} gl=${(prewarmStats.glRenderer || '').slice(0, 60)}`);
  console.log('[harness] prewarm manifest entries by elapsed:');
  const entries = [...prewarmStats.prewarm.manifestEntries].sort((a, b) => b.elapsedMs - a.elapsedMs);
  for (const e of entries) {
    console.log(
      `  ${String(e.elapsedMs).padStart(8)}ms ${e.status.padEnd(9)} ${e.id}` +
      ` (programs +${e.programDelta}, textures +${e.textureDelta})${e.detail ? ' ' + e.detail : ''}`,
    );
  }
}

await browser.close();
server.close();
process.exit(0);
