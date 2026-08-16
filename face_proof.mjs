// Photograph every surface that shows a character's FACE, before and after.
// Usage: node face_proof.mjs <token> <baseUrl> <tag>
// Writes /tmp/faces/<tag>_*.png and prints what each chip/frame actually
// resolved to, so "it looks right" is backed by the key it resolved.
//
// Defensive on purpose: the swiftshader renderer can die when the char-select
// turntable and the offscreen portrait context are both live, and losing the
// page must not throw away the shots already taken.
const puppeteer = (await import('puppeteer-core')).default;
const fs = await import('node:fs');
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T = process.argv[2];
const BASE = process.argv[3];
const TAG = process.argv[4] ?? 'x';
const MODE = process.argv[5] ?? 'full';
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
    // The client resolves its realm from location.origin, so the AFTER run must
    // load under the SAME origin the BEFORE run used. CR_MAP points the real
    // hostname at the local proof listener; the cert is self-signed.
    ...(process.env.CR_MAP ? [`--host-resolver-rules=MAP ${process.env.CR_MAP}`, '--ignore-certificate-errors'] : []),
  ],
});
const p = await br.newPage();
await p.setViewport({ width: 1180, height: 800 });
p.on('dialog', (d) => d.accept());
p.on('error', (e) => console.log('PAGE_CRASH:', String(e).slice(0, 160)));
const bodyGlbs = new Set();
p.on('request', (r) => {
  const u = r.url();
  if (/\/cr-realms\/.*\.glb(\?|$)/.test(u)) bodyGlbs.add(u.split('/').pop().split('?')[0]);
});
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function safe(label, fn, fallback = null) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (p.isClosed()) return fallback;
    try {
      return await fn();
    } catch (e) {
      const msg = String(e);
      // The client does a real navigation between roster and world, so a
      // detached frame mid-poll is expected, not a failure.
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
const alive = () => !p.isClosed();
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
const eval_ = (label, fn, fallback = null) =>
  alive() ? safe(label, () => p.evaluate(fn), fallback) : Promise.resolve(fallback);

await safe('goto', () => p.goto(U, { waitUntil: 'domcontentloaded', timeout: 120000 }));

// ---- character select ------------------------------------------------------
let rows = 0;
for (let i = 0; i < 40; i++) {
  rows = await eval_('rows', () => document.querySelectorAll('#char-list .char-row').length, 0);
  if (rows > 0) break;
  await sleep(4000);
}
console.log('roster rows:', rows);
await sleep(14000); // let chips settle (some fetch a body GLB)
await shot('01_charselect_full');
await shot('02_charselect_roster', '#char-list');

const chips = await eval_('chips', () =>
  [...document.querySelectorAll('#char-list .char-row')].map((row) => {
    const chip = row.querySelector('.portrait-chip');
    const img = row.querySelector('.portrait-img');
    return {
      name: row.querySelector('.char-name')?.textContent?.trim(),
      sub: row.querySelector('.char-sub')?.textContent?.trim(),
      visual: chip?.dataset.visual ?? null,
      pending: chip?.hasAttribute('data-portrait-pending') ?? null,
      src: (img?.getAttribute('src') ?? '').slice(0, 44),
    };
  }),
  [],
);
console.log('CHIPS:', JSON.stringify(chips, null, 1));

// Select the Iron Warden (the character the report named) if present.
const picked = await eval_('select', () => {
  const rows = [...document.querySelectorAll('#char-list .char-row')];
  const pick =
    rows.find((r) => /iron warden/i.test(r.querySelector('.char-sub')?.textContent ?? '')) ??
    rows[0];
  pick?.click();
  return pick?.querySelector('.char-name')?.textContent?.trim() ?? null;
});
console.log('previewing:', picked);
// A body GLB is multi-megabyte and this box is loaded. Shoot in stages: the
// renderer can die mid-settle under swiftshader and an all-or-nothing wait
// would throw away the frame we already had.
await sleep(11000);
await shot('03a_selected_early');
await shot('04a_preview_early', '#online-preview-container');
await sleep(17000);
await shot('03_charselect_full_selected');
await shot('04_charselect_preview_panel', '#online-preview-container');
console.log('BODY_GLBS_AT_CHARSELECT:', [...bodyGlbs].join(','));
const chipsAfter = await eval_('chips-after', () =>
  [...document.querySelectorAll('#char-list .char-row')].map((row) => {
    const chip = row.querySelector('.portrait-chip');
    return {
      name: row.querySelector('.char-name')?.textContent?.trim(),
      visual: chip?.dataset.visual ?? null,
      pending: chip?.hasAttribute('data-portrait-pending') ?? null,
      src: (row.querySelector('.portrait-img')?.getAttribute('src') ?? '').slice(0, 30),
    };
  }),
  [],
);
console.log('CHIPS_SETTLED:', JSON.stringify(chipsAfter));

// ---- enter world -----------------------------------------------------------
if (MODE === 'select') {
  console.log('MODE=select: stopping before world entry');
  console.log('PAGE_ERRORS:', errs.slice(0, 8).join(' | '));
  await safe('close', () => br.close());
  process.exit(0);
}
const entered = await eval_('enter', () => {
  const rows = [...document.querySelectorAll('#char-list .char-row')];
  const btnIn = (row, want) =>
    [...row.querySelectorAll('button')].find(
      (b) => b.textContent.trim().toLowerCase() === want && b.offsetParent !== null && !b.disabled,
    );
  const sel = document.querySelector('#char-list .char-row.sel') ?? rows[0];
  for (const want of ['enter world', 'take over']) {
    const b = sel && btnIn(sel, want);
    if (b) { b.click(); return `${want}: ${sel.querySelector('.char-name')?.textContent.trim()}`; }
  }
  for (const want of ['enter world', 'take over']) {
    for (const row of rows) {
      const bb = btnIn(row, want);
      if (bb) { row.click(); bb.click(); return `${want}: ${row.querySelector('.char-name')?.textContent.trim()}`; }
    }
  }
  return 'NO_BUTTON';
}, 'DEAD');
console.log('entry:', entered);

let ui = false;
for (let i = 0; i < 40; i++) {
  ui = await eval_('ui', () => !!document.getElementById('ui'), false);
  if (ui) break;
  await sleep(4000);
}
console.log('in world:', ui);
for (let i = 0; i < 10; i++) {
  const c = await eval_('confirm', () => {
    const b = [...document.querySelectorAll('button')].find(
      (x) => x.textContent.trim().toLowerCase() === 'confirm' && x.offsetParent !== null,
    );
    if (b) { b.click(); return true; }
    return false;
  }, false);
  if (c) break;
  await sleep(3000);
}
await eval_('dismiss', () => {
  for (const t of ['skip tutorial', 'not now', 'dismiss']) {
    const b = [...document.querySelectorAll('button,span')].find(
      (x) => x.textContent.trim().toLowerCase().includes(t) && x.offsetParent !== null,
    );
    b?.click();
  }
});
await sleep(22000);
const blocker = await eval_('blocker', () => {
  const text = document.body.innerText ?? '';
  const hit = ['could not enter world', 'could not start', 'failed to', 'error'].find((needle) =>
    text.toLowerCase().includes(needle),
  );
  const overlay = document.querySelector('#fatal-overlay, .fatal-overlay, #boot-error');
  return { hit: hit ?? null, overlay: overlay ? overlay.textContent?.slice(0, 160) : null };
});
console.log('WORLD_BLOCKER:', JSON.stringify(blocker));
await shot('05_world_full');
await shot('06_player_frame', '#player-frame');

// Target something so the target frame paints a face.
if (alive()) await safe('click', () => p.mouse.click(720, 420));
for (let i = 0; i < 5; i++) {
  if (!alive()) break;
  await safe('tab', () => p.keyboard.press('Tab'));
  await sleep(3000);
  const has = await eval_('tf', () => {
    const f = document.getElementById('target-frame');
    return !!f && f.offsetParent !== null;
  }, false);
  if (has) break;
}
await sleep(7000);
await shot('07_target_frame', '#target-frame');
await shot('08_world_after_target');

if (alive()) await safe('keyC', () => p.keyboard.press('KeyC'));
await sleep(10000);
await shot('09_char_sheet', '#char-window');

const world = await eval_('worldfaces', () => {
  const canv = (sel) => {
    const c = document.querySelector(sel);
    if (!(c instanceof HTMLCanvasElement)) return null;
    return {
      sel,
      portrait: (c.dataset.portrait ?? '').slice(0, 34),
      body: c.dataset.portraitBody ?? null,
    };
  };
  const chip = document.querySelector('#char-window .portrait-chip');
  return {
    pf: canv('#pf-portrait'),
    tf: canv('#target-frame canvas'),
    sheetChipVisual: chip?.dataset.visual ?? null,
    sheetChipSrc: (chip?.querySelector('.portrait-img')?.getAttribute('src') ?? '').slice(0, 34),
  };
});
console.log('WORLD_FACES:', JSON.stringify(world));
console.log('BODY_GLBS_TOTAL:', [...bodyGlbs].join(','));
console.log('PAGE_ERRORS:', errs.slice(0, 8).join(' | '));
await safe('close', () => br.close());
process.exit(0);
