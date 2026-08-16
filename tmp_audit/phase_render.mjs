#!/usr/bin/env node
// Drive phase_entry.js over an explicit list of GLBs.
//   node phase_render.mjs --list files.txt --out /tmp/sweep --clips Idle,Walk,Attack --size 448 --yaws hero,front
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
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
const SIZE = Number(arg('size', 448));
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

const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_PATH,
  headless: true,
  protocolTimeout: 900000,
  dumpio: !!process.env.DUMPIO,
  args: ['--use-angle=swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist', '--no-sandbox', '--enable-webgl'],
});
browser.on('disconnected', () => console.error('[browser] DISCONNECTED'));
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[page]', e.message));
await page.setContent(
  `<!doctype html><html><body><script>${readFileSync(bundlePath, 'utf8')}</script></body></html>`,
);
await page.waitForFunction('window.__ready === true', { timeout: 60000 });

const files = readFileSync(LIST, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
mkdirSync(OUT, { recursive: true });
const report = {};
for (const f of files) {
  const key = basename(f, '.glb');
  const outDir = join(OUT, key);
  mkdirSync(outDir, { recursive: true });
  try {
    const b64 = readFileSync(f).toString('base64');
    const res = await page.evaluate(
      (data, opts) => window.renderPhases(data, opts),
      b64,
      { size: SIZE, clips: CLIPS ? CLIPS.split(',') : undefined, yaws: YAWS, phases: PHASES },
    );
    for (const s of res.shots) {
      writeFileSync(join(outDir, `${s.name}.png`), Buffer.from(s.dataUrl.split(',')[1], 'base64'));
    }
    report[key] = res.clipNames;
    console.log(`OK   ${key}  ${res.shots.length} frames  clips=[${res.clipNames.join(' ')}]`);
  } catch (e) {
    console.log(`FAIL ${key}: ${String(e.message || e).slice(0, 160)}`);
    report[key] = null;
  }
}
writeFileSync(join(OUT, '_clips.json'), JSON.stringify(report, null, 2));
await browser.close();
