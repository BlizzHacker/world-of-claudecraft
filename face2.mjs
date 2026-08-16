// Lean face prover. One surface family per run so a renderer death under load
// costs one batch, not the set.
//   mode=select : click a row (which loads the game runtime, without which
//                 portraitsReady() is false and every chip shows the class
//                 CREST, not a face), let the chips settle, then shoot.
//   mode=world  : enter the world and shoot the unit frames + char sheet.
// Usage: node face2.mjs <token> <base> <tag> <mode>
const puppeteer = (await import('puppeteer-core')).default;
const fs = await import('node:fs');
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const [, , T, BASE, TAG, MODE = 'select'] = process.argv;
const OUT = '/tmp/faces';
fs.mkdirSync(OUT, { recursive: true });

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
    ...(process.env.CR_MAP
      ? [`--host-resolver-rules=MAP ${process.env.CR_MAP}`, '--ignore-certificate-errors']
      : []),
  ],
});
const p = await br.newPage();
await p.setViewport({ width: 1120, height: 780 });
p.on('dialog', (d) => d.accept());
p.on('error', (e) => console.log('PAGE_CRASH:', String(e).slice(0, 120)));
const glbs = new Set();
p.on('request', (r) => {
  const u = r.url();
  if (/\/cr-realms\/.*\.glb(\?|$)/.test(u)) glbs.add(u.split('/').pop().split('?')[0]);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = () => !p.isClosed();
async function safe(label, fn, fallback = null) {
  for (let i = 0; i < 3; i++) {
    if (!alive()) return fallback;
    try {
      return await fn();
    } catch (e) {
      const m = String(e);
      if (/detached Frame|Execution context/i.test(m) && i < 2) {
        await sleep(2500);
        continue;
      }
      console.log(`${label}: FAIL ${m.slice(0, 110)}`);
      return fallback;
    }
  }
  return fallback;
}
async function shot(name, sel) {
  await safe(`shot ${name}`, async () => {
    const path = `${OUT}/${TAG}_${name}.png`;
    if (sel) {
      const el = await p.$(sel);
      if (!el) return console.log(`shot ${name}: NO ELEMENT`);
      await el.screenshot({ path });
    } else await p.screenshot({ path });
    console.log(`shot ${name}: ok`);
  });
}
const ev = (l, fn, fb = null) => safe(l, () => p.evaluate(fn), fb);

const U = `${BASE}/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
await safe('goto', () => p.goto(U, { waitUntil: 'domcontentloaded', timeout: 120000 }));
for (let i = 0; i < 40; i++) {
  const n = await ev('rows', () => document.querySelectorAll('#char-list .char-row').length, 0);
  if (n > 0) { console.log('roster rows:', n); break; }
  await sleep(4000);
}

// Clicking a row is what loads the game runtime; until then portraitsReady() is
// false and every chip is a class crest, so shooting before this proves nothing.
const picked = await ev('select', () => {
  const rows = [...document.querySelectorAll('#char-list .char-row')];
  const pick =
    rows.find((r) => /iron warden/i.test(r.querySelector('.char-sub')?.textContent ?? '')) ??
    rows[0];
  pick?.click();
  return pick?.querySelector('.char-name')?.textContent?.trim() ?? null;
});
console.log('selected:', picked);

if (MODE === 'select') {
  for (const wait of [20000, 20000, 20000]) {
    await sleep(wait);
    const state = await ev('state', () => {
      const chips = [...document.querySelectorAll('#char-list .portrait-chip')];
      return {
        pending: chips.filter((c) => c.hasAttribute('data-portrait-pending')).length,
        total: chips.length,
        rendered: chips.filter((c) =>
          (c.querySelector('.portrait-img')?.getAttribute('src') ?? '').startsWith('data:'),
        ).length,
        fallback: chips.filter((c) => c.classList.contains('is-fallback')).length,
      };
    });
    console.log('CHIP_STATE:', JSON.stringify(state), 'glbs:', [...glbs].join(','));
    await shot('R_roster', '#char-list');
    await shot('R_turntable', '#online-preview-container');
    if (state && state.pending === 0) break;
  }
  const dump = await ev('dump', () =>
    [...document.querySelectorAll('#char-list .char-row')].map((r) => {
      const c = r.querySelector('.portrait-chip');
      return [
        r.querySelector('.char-name')?.textContent?.trim(),
        c?.dataset.visual ?? null,
        c?.hasAttribute('data-portrait-pending') ? 'PENDING' : 'settled',
        c?.classList.contains('is-fallback') ? 'CREST' : 'face',
      ].join(' | ');
    }),
    [],
  );
  console.log('CHIPS:\n ', (dump ?? []).join('\n  '));
  console.log('GLBS:', [...glbs].join(','));
  await safe('close', () => br.close());
  process.exit(0);
}

// ---- world -----------------------------------------------------------------
const entered = await ev('enter', () => {
  const rows = [...document.querySelectorAll('#char-list .char-row')];
  const sel = document.querySelector('#char-list .char-row.sel') ?? rows[0];
  const find = (row, want) =>
    [...row.querySelectorAll('button')].find(
      (b) => b.textContent.trim().toLowerCase() === want && b.offsetParent !== null && !b.disabled,
    );
  for (const want of ['enter world', 'take over']) {
    const b = sel && find(sel, want);
    if (b) { b.click(); return want; }
  }
  return 'NO_BUTTON';
}, 'DEAD');
console.log('entry:', entered);
let ui = false;
for (let i = 0; i < 40; i++) {
  ui = await ev('ui', () => !!document.getElementById('ui'), false);
  if (ui) break;
  await sleep(4000);
}
console.log('in world:', ui);
for (let i = 0; i < 8; i++) {
  const c = await ev('confirm', () => {
    const b = [...document.querySelectorAll('button')].find(
      (x) => x.textContent.trim().toLowerCase() === 'confirm' && x.offsetParent !== null,
    );
    if (b) { b.click(); return true; }
    return false;
  }, false);
  if (c) break;
  await sleep(3000);
}
await ev('dismiss', () => {
  for (const t of ['skip tutorial', 'not now', 'dismiss']) {
    [...document.querySelectorAll('button,span')]
      .find((x) => x.textContent.trim().toLowerCase().includes(t) && x.offsetParent !== null)
      ?.click();
  }
});
await sleep(20000);
// A dark frame is only a render if nothing is blocking it. Check the text first.
const blocker = await ev('blocker', () => {
  const t = (document.body.innerText ?? '').toLowerCase();
  const needle = ['could not enter world', 'could not start', 'disconnected', 'linkdead'].find((n) =>
    t.includes(n),
  );
  return { needle: needle ?? null, hasUi: !!document.getElementById('ui') };
});
console.log('BLOCKER:', JSON.stringify(blocker));
await shot('W_player_frame', '#player-frame');
await safe('click', () => p.mouse.click(560, 380));
for (let i = 0; i < 5; i++) {
  await safe('tab', () => p.keyboard.press('Tab'));
  await sleep(3500);
  const has = await ev('tf', () => {
    const f = document.getElementById('target-frame');
    return !!f && f.offsetParent !== null;
  }, false);
  if (has) break;
}
await sleep(6000);
await shot('W_target_frame', '#target-frame');
await safe('keyC', () => p.keyboard.press('KeyC'));
await sleep(10000);
await shot('W_char_sheet', '#char-window');
const faces = await ev('faces', () => {
  const c = document.getElementById('pf-portrait');
  const chip = document.querySelector('#char-window .portrait-chip');
  return {
    pfBody: c instanceof HTMLCanvasElement ? (c.dataset.portraitBody ?? 'painted') : null,
    pfPortrait: (c instanceof HTMLCanvasElement ? c.dataset.portrait ?? '' : '').slice(0, 24),
    sheetVisual: chip?.dataset.visual ?? null,
    sheetPending: chip?.hasAttribute('data-portrait-pending') ?? null,
  };
});
console.log('FACES:', JSON.stringify(faces));
console.log('GLBS:', [...glbs].join(','));
await safe('close', () => br.close());
process.exit(0);
