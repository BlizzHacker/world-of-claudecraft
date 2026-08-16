#!/usr/bin/env node
// appearance_mask_proof.mjs — before/after render proof for the appearance
// region masks (gen_appearance_masks.mjs) using the REAL client tint hook.
//
// For each body: renders base + 3 hair colours (and a skin shift) from four
// views through the game's own override_appearance shader patch, then stitches
// per-view comparison strips into <out>/proof/. The review bar: hair clearly
// recolours, face and outfit visibly do NOT, no smearing across UV seams.
// Bodies whose generator emptied the hair channel must show NO change.
//
// Usage:
//   node scripts/realm_assets/appearance_mask_proof.mjs \
//     --masks /opt/meshy-gen/masks --out /opt/meshy-gen/masks/proof \
//     /opt/cr-realms-store/infernal/realm_infernal_class_warrior_f.glb ...
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const opt = { masks: '/opt/meshy-gen/masks', out: '/opt/meshy-gen/masks/proof', files: [] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--masks') opt.masks = args[++i];
  else if (a === '--out') opt.out = args[++i];
  else opt.files.push(a);
}
if (!opt.files.length) {
  console.error('no GLBs given');
  process.exit(2);
}

// The colours are deliberately loud: leakage onto face or outfit must be
// impossible to miss. HSL matches the game's wheels (modular.ts hslToHex).
const APPEARANCES = [
  {
    name: 'blonde',
    app: { hairHue: 45, hairSat: 0.75, hairLight: 0.65, skinHue: 27, skinSat: 0.34, skinLight: 0.62 },
  },
  {
    name: 'crimson',
    app: { hairHue: 2, hairSat: 0.85, hairLight: 0.42, skinHue: 27, skinSat: 0.34, skinLight: 0.62 },
  },
  {
    name: 'teal_darkskin',
    app: { hairHue: 180, hairSat: 0.7, hairLight: 0.5, skinHue: 22, skinSat: 0.45, skinLight: 0.28 },
  },
];

async function launchPage() {
  const esbuild = await import('esbuild');
  const puppeteer = (await import('puppeteer-core')).default;
  const { BROWSER_PATH } = await import(resolve(__dirname, '../browser_path.mjs'));
  const { tmpdir } = await import('node:os');
  const bundlePath = join(tmpdir(), `appearance_proof_${process.pid}.js`);
  await esbuild.build({
    entryPoints: [resolve(__dirname, 'appearance_proof_entry.js')],
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
  page.on('pageerror', (err) => console.error('[proof page error]', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warn')
      console.error('[proof console]', msg.text());
  });
  const html = `<!doctype html><html><body><script>${readFileSync(bundlePath, 'utf8')}</script></body></html>`;
  await page.setContent(html);
  await page.waitForFunction('window.__ready === true', { timeout: 30000 });
  return { browser, page };
}

const sharp = (await import('sharp')).default;
const { browser, page } = await launchPage();
try {
  mkdirSync(opt.out, { recursive: true });
  for (const glbPath of opt.files) {
    const name = basename(glbPath, '.glb');
    const maskPath = join(opt.masks, `${name}.mask.png`);
    let maskB64 = null;
    try {
      maskB64 = readFileSync(maskPath).toString('base64');
    } catch {
      console.log(`(no mask for ${name}; rendering base only)`);
    }
    const glbB64 = readFileSync(glbPath).toString('base64');
    const shots = await page.evaluate(
      (g, m, o) => window.renderTintProof(g, m, o),
      glbB64,
      maskB64,
      { size: 512, appearances: APPEARANCES },
    );
    // Group by view; stitch base|blonde|crimson|teal into one strip per view.
    const byView = new Map();
    for (const s of shots) {
      const [label, ...rest] = s.name.split('_');
      const view = rest.join('_');
      if (!byView.has(view)) byView.set(view, []);
      byView.get(view).push({ label, buf: Buffer.from(s.dataUrl.split(',')[1], 'base64') });
    }
    for (const [view, frames] of byView) {
      const W = 512;
      const strip = sharp({
        create: {
          width: W * frames.length,
          height: W,
          channels: 3,
          background: { r: 20, g: 20, b: 24 },
        },
      }).composite(frames.map((f, i) => ({ input: f.buf, left: i * W, top: 0 })));
      const dest = join(opt.out, `${name}_${view}.png`);
      await strip.png().toFile(dest);
      console.log('wrote', dest);
    }
  }
} finally {
  await browser.close();
}
