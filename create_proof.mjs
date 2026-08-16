// Photograph the CREATE CHARACTER screen: per-class card thumbnails and the big
// 3D preview panel. Reports, per card, the body GLB it points at, whether the
// published portrait png exists, and whether a thumbnail actually painted.
// Usage: node create_proof.mjs <token> <baseUrl> <tag>
const puppeteer = (await import('puppeteer-core')).default;
const fs = await import('node:fs');
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T = process.argv[2];
const BASE = process.argv[3];
const TAG = process.argv[4] ?? 'x';
const OUT = '/tmp/faces';
fs.mkdirSync(OUT, { recursive: true });
const U = `${BASE}/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;

const br = await puppeteer.launch({
  executablePath: B,
  headless: true,
  protocolTimeout: 240000,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-angle=swiftshader',
    '--use-gl=angle',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--js-flags=--max-old-space-size=3072',
    ...(process.env.CR_MAP ? [`--host-resolver-rules=MAP ${process.env.CR_MAP}`, '--ignore-certificate-errors'] : []),
  ],
});
const p = await br.newPage();
await p.setViewport({ width: 1120, height: 780 });
p.on('dialog', (d) => d.accept());
p.on('error', (e) => console.log('PAGE_CRASH:', String(e).slice(0, 160)));
const logs = [];
p.on('console', (m) => {
  const t = m.text();
  if (/preview|portrait|glb|visual|Failed/i.test(t)) logs.push(t.slice(0, 180));
});
const png404 = new Map();
p.on('response', (r) => {
  const u = r.url();
  if (/\/cr-realms\/.*\.(png|glb)(\?|$)/.test(u)) png404.set(u.split('/').pop().split('?')[0], r.status());
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = () => !p.isClosed();
async function safe(label, fn, fallback = null) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!alive()) return fallback;
    try {
      return await fn();
    } catch (e) {
      const msg = String(e);
      // A real navigation happens between roster and create; a detached frame is
      // expected mid-poll, not a failure. Only the last attempt is reported.
      if (/detached Frame|Execution context/i.test(msg) && attempt < 2) {
        await sleep(2500);
        continue;
      }
      console.log(`${label}: FAIL ${msg.slice(0, 130)}`);
      return fallback;
    }
  }
  return fallback;
}
async function shot(name, sel) {
  if (!alive()) return console.log(`shot ${name}: page gone`);
  await safe(`shot ${name}`, async () => {
    const path = `${OUT}/${TAG}_${name}.png`;
    if (sel) {
      const el = await p.$(sel);
      if (!el) return console.log(`shot ${name}: NO ELEMENT ${sel}`);
      await el.screenshot({ path });
    } else {
      await p.screenshot({ path });
    }
    console.log(`shot ${name}: ok`);
  });
}
const eval_ = (label, fn, fallback = null) => safe(label, () => p.evaluate(fn), fallback);

await safe('goto', () => p.goto(U, { waitUntil: 'domcontentloaded', timeout: 120000 }));
for (let i = 0; i < 40; i++) {
  const ready = await eval_('roster', () => document.querySelectorAll('#char-list .char-row').length > 0
    || !!document.querySelector('#charcreate-panel .mini-class'), false);
  if (ready) break;
  await sleep(4000);
}
await sleep(8000);

// Reach the create screen. Prefer the button; fall back to the panel switch.
const opened = await eval_('open-create', () => {
  const b = [...document.querySelectorAll('button,a')].find(
    (x) => /new character|create character/i.test(x.textContent ?? '') && x.offsetParent !== null,
  );
  if (b) { b.click(); return 'clicked'; }
  return 'none';
}, 'dead');
console.log('open create:', opened);
for (let i = 0; i < 30; i++) {
  const n = await eval_('cards', () => document.querySelectorAll('#charcreate-panel .mini-class').length, 0);
  if (n > 0) break;
  await sleep(3000);
}
// Cards render a thumbnail from a published png; a 3D fallback needs a GLB
// fetch + offscreen render, so give it real time.
await sleep(20000);
await shot('20a_create_early');
await sleep(22000);
await shot('20_create_full');
await shot('21_create_class_list', '#charcreate-panel .mini-class-row');
await shot('22_create_preview_panel', '#charcreate-preview-container');

const cards = await eval_('cards-dump', () =>
  [...document.querySelectorAll('#charcreate-panel .mini-class')].map((c) => {
    const img = c.querySelector('.mini-class-portrait');
    const r = img?.getBoundingClientRect();
    return {
      label: c.querySelector('.mini-class-label')?.textContent?.trim(),
      cls: c.dataset.class,
      heroId: c.dataset.heroId,
      asset: (c.dataset.realmAsset ?? '').split('/').pop(),
      hasImg: !!img,
      imgSrc: (img?.getAttribute('src') ?? '').slice(0, 48),
      painted: !!r && r.width > 4 && r.height > 4 && img.style.display !== 'none',
      complete: img?.complete ?? null,
      naturalW: img?.naturalWidth ?? null,
    };
  }),
  [],
);
console.log('CARDS:', JSON.stringify(cards, null, 1));

// How much of the preview canvas is actually a model? Sample the canvas.
const canvasInk = await eval_('canvas-ink', () => {
  const c = document.querySelector('#charcreate-preview-container canvas')
    ?? document.getElementById('char-preview-canvas');
  if (!(c instanceof HTMLCanvasElement)) return { err: 'no canvas' };
  const gl = c.getContext('webgl2') ?? c.getContext('webgl');
  if (!gl) return { err: 'no gl ctx', w: c.width, h: c.height };
  const w = Math.min(c.width, 240), h = Math.min(c.height, 240);
  const px = new Uint8Array(w * h * 4);
  try { gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); } catch (e) { return { err: String(e).slice(0, 80) }; }
  let lit = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 8 && px[i] + px[i + 1] + px[i + 2] > 24) lit++;
  return { w: c.width, h: c.height, sampled: w * h, lit, pct: +(100 * lit / (w * h)).toFixed(1) };
}, { err: 'dead' });
console.log('PREVIEW_CANVAS:', JSON.stringify(canvasInk));

// The sorcerer male/female variant toggle: a clean before/after pair.
const variant = await eval_('variant', () => {
  const card = [...document.querySelectorAll('#charcreate-panel .mini-class')].find((c) =>
    /sorcer/i.test(c.querySelector('.mini-class-label')?.textContent ?? ''),
  );
  if (!card) return 'no sorcerer card';
  card.click();
  const chips = [...card.querySelectorAll('.mini-class-variant')];
  return { chips: chips.map((c) => c.dataset.variantHeroId), heroId: card.dataset.heroId };
});
console.log('SORC:', JSON.stringify(variant));
await sleep(22000);
await shot('23_sorc_female_preview', '#charcreate-preview-container');
await shot('24_sorc_female_full');

const male = await eval_('male', () => {
  const card = [...document.querySelectorAll('#charcreate-panel .mini-class')].find((c) =>
    /sorcer/i.test(c.querySelector('.mini-class-label')?.textContent ?? ''),
  );
  const chip = [...(card?.querySelectorAll('.mini-class-variant') ?? [])].find(
    (c) => /-m$/.test(c.dataset.variantHeroId ?? ''),
  );
  if (!chip) return 'no male chip';
  chip.click();
  return card?.dataset.heroId ?? 'clicked';
});
console.log('SORC_MALE:', JSON.stringify(male));
await sleep(22000);
await shot('25_sorc_male_preview', '#charcreate-preview-container');
await shot('26_sorc_male_full');

const statuses = [...png404.entries()].filter(([k]) => /\.png$/.test(k));
console.log('PNG_STATUSES:', JSON.stringify(statuses));
console.log('LOGS:', logs.slice(0, 14).join(' | '));
await safe('close', () => br.close());
process.exit(0);
