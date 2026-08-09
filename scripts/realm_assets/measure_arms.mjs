#!/usr/bin/env node
// Measure every weapon GLB in the realm store: bounding box, uniform node scale,
// longest axis, and which end of that axis is the HANDLE.
//
// emit_arms.mjs turns those numbers into grip transforms. The bbox alone is
// readable straight from the GLB header, but the handle end needs real vertex
// positions, and the store is EXT_meshopt_compression'd — so this drives the same
// headless loader the game uses (scripts/realm_assets/arms_preview_entry.js).
//
//   BROWSER_PATH=... node scripts/realm_assets/measure_arms.mjs \
//     --store /opt/cr-realms-store --out scripts/realm_assets/arms_geometry.generated.json
//
// Idempotent: results are keyed by `<realm>/<bucket>/<file>` and merged into the
// existing file, so a re-run only adds new assets. --force re-measures everything.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function arg(n, d = null) {
  const i = process.argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const STORE = arg('store', '/opt/cr-realms-store');
const OUT = arg('out', resolve(__dirname, 'arms_geometry.generated.json'));
const FORCE = !!arg('force', false);
// Only the buckets that get held in a hand. Vehicles/ships/props are placed in
// the world, never gripped, so their handle end is meaningless.
const BUCKETS = String(arg('buckets', 'weapons,melee')).split(',');

async function launchPage() {
  const esbuild = await import('esbuild');
  const puppeteer = (await import('puppeteer-core')).default;
  const { BROWSER_PATH } = await import(resolve(__dirname, '../browser_path.mjs'));
  const bundlePath = join(tmpdir(), `realm_arms_measure_${process.pid}.js`);
  await esbuild.build({
    entryPoints: [resolve(__dirname, 'arms_preview_entry.js')],
    bundle: true,
    format: 'iife',
    outfile: bundlePath,
    logLevel: 'silent',
  });
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: [
      '--use-angle=swiftshader',
      '--use-gl=angle',
      '--ignore-gpu-blocklist',
      '--no-sandbox',
      '--enable-webgl',
    ],
  });
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.error('[page error]', err.message));
  await page.setContent(
    `<!doctype html><html><body><script>${readFileSync(bundlePath, 'utf8')}</script></body></html>`,
  );
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });
  return { browser, page };
}

function listTargets() {
  const out = [];
  for (const realm of readdirSync(STORE, { withFileTypes: true })) {
    if (!realm.isDirectory() || realm.name === 'review' || realm.name === 'shared') continue;
    for (const bucket of BUCKETS) {
      const dir = join(STORE, realm.name, bucket);
      if (!existsSync(dir)) continue;
      for (const f of readdirSync(dir).sort()) {
        if (f.endsWith('.glb')) {
          out.push({ id: `${realm.name}/${bucket}/${f}`, path: join(dir, f) });
        }
      }
    }
  }
  return out;
}

async function main() {
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  const targets = listTargets();
  const todo = FORCE ? targets : targets.filter((t) => !prev[t.id]);
  console.log(`[measure] ${targets.length} weapons, ${todo.length} to measure`);
  if (!todo.length) {
    console.log('[measure] up to date');
    return;
  }
  const { browser, page } = await launchPage();
  const results = { ...prev };
  let done = 0;
  for (const t of todo) {
    try {
      const b64 = readFileSync(t.path).toString('base64');
      const m = await page.evaluate((d) => window.measureArm(d), b64);
      if (m) results[t.id] = m;
    } catch (e) {
      console.log(`  FAIL ${t.id}: ${String(e.message || e).slice(0, 120)}`);
    }
    if (++done % 25 === 0) console.log(`  ${done}/${todo.length}`);
  }
  await browser.close();
  mkdirSync(dirname(OUT), { recursive: true });
  const ordered = Object.fromEntries(
    Object.keys(results)
      .sort()
      .map((k) => [k, results[k]]),
  );
  writeFileSync(OUT, `${JSON.stringify(ordered, null, 1)}\n`);
  console.log(`[measure] ${Object.keys(ordered).length} entries -> ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
