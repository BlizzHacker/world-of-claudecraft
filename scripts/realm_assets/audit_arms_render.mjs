#!/usr/bin/env node
// Render rigged bodies HOLDING realm-library weapons, through the engine's own
// attach math (arms_preview_entry.js bundles src/render/characters/weapon_grip.ts
// directly). A gun clipping through a hand or scaled to a car is only ever
// visible; poly counts and 200s prove nothing about grip.
//
//   BROWSER_PATH=... node scripts/realm_assets/audit_arms_render.mjs \
//     --cases /tmp/cases.json --out /tmp/arms_audit --size 420
//
// cases.json: [{ label, body, arm, grip: null | { lift, maxHeight, override } }]
// Writes out/<label>/<view>.png and prints one diagnostic line per case.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const CASES = arg('cases');
const OUT = arg('out', '/tmp/arms_audit');
const SIZE = Number(arg('size', 420));

async function launchPage() {
  const esbuild = await import('esbuild');
  const puppeteer = (await import('puppeteer-core')).default;
  const { BROWSER_PATH } = await import(resolve(__dirname, '../browser_path.mjs'));

  const bundlePath = join(tmpdir(), `realm_arms_preview_${process.pid}.js`);
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
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('[console]', msg.text());
  });
  await page.setContent(
    `<!doctype html><html><body><script>${readFileSync(bundlePath, 'utf8')}</script></body></html>`,
  );
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });
  return { browser, page };
}

async function main() {
  if (!CASES) {
    console.error('--cases <json> required');
    process.exit(2);
  }
  const cases = JSON.parse(readFileSync(CASES, 'utf8'));
  mkdirSync(OUT, { recursive: true });
  const { browser, page } = await launchPage();
  for (const c of cases) {
    const body = readFileSync(c.body).toString('base64');
    const arm = readFileSync(c.arm).toString('base64');
    const outDir = join(OUT, c.label);
    mkdirSync(outDir, { recursive: true });
    try {
      const res = await page.evaluate((b, a, o) => window.renderArm(b, a, o), body, arm, {
        size: SIZE,
        grip: c.grip ?? null,
        bone: c.bone ?? 'handslot.r',
        poses: c.poses,
        yaws: c.yaws,
        handRadius: c.handRadius,
      });
      for (const s of res.shots) {
        writeFileSync(
          join(outDir, `${s.name}.png`),
          Buffer.from(s.dataUrl.split(',')[1], 'base64'),
        );
      }
      const d = res.diag;
      console.log(
        `OK  ${c.label}  ${JSON.stringify(res.diag.poses)}  armWorldSize=${JSON.stringify(d.armWorldSize)} bodyH=${d.bodyHeight} ` +
          `nativeScale=${d.nativeScale?.toFixed?.(4)} appliedScale=${d.applied?.scale?.toFixed?.(4) ?? 'native'}`,
      );
    } catch (e) {
      console.log(`FAIL ${c.label}: ${String(e.message || e).slice(0, 200)}`);
    }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
