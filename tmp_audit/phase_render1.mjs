#!/usr/bin/env node
// One body per browser process. The shared-page version dies on the 200k-300k
// vert Meshy bodies when the container is under memory pressure ("Target
// closed" on the first evaluate), and once the page is gone every later body in
// the run fails too. A fresh browser per GLB costs ~15s and cannot cascade.
import { readFileSync, mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const LIST = arg('list');
const OUT = arg('out', '/tmp/sweep');
const CLIPS = arg('clips', '');
const SIZE = Number(arg('size', 384));
const YAWS = String(arg('yaws', 'hero')).split(',');
const PHASES = String(arg('phases', '0,0.25,0.5,0.75')).split(',').map(Number);
const ENTRY = arg('entry', '/opt/cryptic-realm/tmp_audit/phase_entry.js');

const esbuild = await import('esbuild');
const puppeteer = (await import('puppeteer-core')).default;

const bundlePath = join(tmpdir(), `phase_preview_${process.pid}.js`);
await esbuild.build({
  entryPoints: [resolve(ENTRY)],
  bundle: true,
  format: 'iife',
  outfile: bundlePath,
  logLevel: 'silent',
  absWorkingDir: '/opt/cryptic-realm',
});
const bundle = readFileSync(bundlePath, 'utf8');

const files = readFileSync(LIST, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
mkdirSync(OUT, { recursive: true });

for (const f of files) {
  const key = basename(f, '.glb');
  const outDir = join(OUT, key);
  const have = existsSync(outDir) ? readdirSync(outDir).filter((x) => x.endsWith('.png')).length : 0;
  const want = PHASES.length * YAWS.length * (CLIPS ? CLIPS.split(',').length : 1);
  if (have >= want) { console.log(`SKIP ${key} (${have} frames)`); continue; }
  mkdirSync(outDir, { recursive: true });

  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.BROWSER_PATH,
      headless: true,
      protocolTimeout: 900000,
      args: ['--use-angle=swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist', '--no-sandbox', '--enable-webgl', '--js-flags=--max-old-space-size=3072'],
    });
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('[page]', e.message));
    await page.setContent(`<!doctype html><html><body><script>${bundle}</script></body></html>`);
    await page.waitForFunction('window.__ready === true', { timeout: 120000 });
    const b64 = readFileSync(f).toString('base64');
    const res = await page.evaluate(
      (data, opts) => window.renderPhases(data, opts),
      b64,
      { size: SIZE, clips: CLIPS ? CLIPS.split(',') : undefined, yaws: YAWS, phases: PHASES },
    );
    for (const s of res.shots) {
      writeFileSync(join(outDir, `${s.name}.png`), Buffer.from(s.dataUrl.split(',')[1], 'base64'));
    }
    console.log(`OK   ${key}  ${res.shots.length} frames  clips=[${res.clipNames.join(' ')}]`);
  } catch (e) {
    console.log(`FAIL ${key}: ${String(e.message || e).slice(0, 140)}`);
  } finally {
    try { if (browser) await browser.close(); } catch { /* already gone */ }
  }
}
