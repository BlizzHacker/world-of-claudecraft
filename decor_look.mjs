// Look at the deployed automatic decoration in a LIVE world. Enters as an existing
// character, dismisses the entry dialogs, then walks a short circuit taking shots so
// floating/buried props, scale blowouts and theme mismatches are visible.
const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T = process.argv[2];
const HOST = process.argv[3] ?? 'https://classic.crypticrealm.com';
const REALM = process.argv[4] ?? 'Classic';
const RID = process.argv[5] ?? 'classic';
const TAG = process.argv[6] ?? 'classic';
const U = `${HOST}/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=${encodeURIComponent(REALM)}&realm_id=${RID}`;

const br = await puppeteer.launch({ executablePath: B, headless: true,
  args: ['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl'] });
const p = await br.newPage(); await p.setViewport({ width: 1280, height: 720 });
p.on('dialog', d => d.accept());
await p.goto(U, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});

let rows = 0;
for (let i = 0; i < 30; i++) {
  rows = await p.evaluate(() => document.querySelectorAll('#char-list .char-row').length);
  if (rows > 0) break;
  await new Promise(r => setTimeout(r, 5000));
}
console.log('rows:', rows);
if (!rows) { await p.screenshot({ path: `/tmp/decor_${TAG}_norows.png` }); await br.close(); console.log('NO ROSTER'); process.exit(0); }

await p.evaluate(() => document.querySelector('#char-list .char-row')?.click());
await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => {
  const row = document.querySelector('#char-list .char-row.sel') ?? document.querySelector('#char-list .char-row');
  const take = row?.querySelector('.take-over-btn');
  if (take) { take.click(); return; }
  const b = document.getElementById('btn-charselect-enter');
  if (b && b.offsetParent !== null && !b.disabled) { b.click(); return; }
  row?.querySelector('.enter-world-btn')?.click();
});
let ui = false;
for (let i = 0; i < 40; i++) {
  ui = await p.evaluate(() => !!document.getElementById('ui'));
  if (ui) break;
  await new Promise(r => setTimeout(r, 5000));
}
console.log('in world:', ui);
for (let i = 0; i < 12; i++) {
  const c = await p.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().toLowerCase() === 'confirm' && x.offsetParent !== null);
    if (b) { b.click(); return true; } return false;
  });
  if (c) break;
  await new Promise(r => setTimeout(r, 4000));
}
await p.evaluate(() => {
  for (const t of ['skip tutorial', 'not now', 'dismiss']) {
    const b = [...document.querySelectorAll('button,span')].find(x => x.textContent.trim().toLowerCase().includes(t) && x.offsetParent !== null);
    b?.click();
  }
  // Hide HUD chrome so the world is judgeable.
  const css = document.createElement('style');
  css.textContent = '#chat-panel,[class*=season],[id*=install],[class*=quest],[class*=minimap]{opacity:.06!important}';
  document.head.appendChild(css);
});
await new Promise(r => setTimeout(r, 15000));

// Report what the decoration layer actually built, straight from the page.
const stats = await p.evaluate(() => {
  const w = window;
  const out = { group: null, children: 0, names: [] };
  const scene = w.__crScene ?? null;
  if (scene && scene.traverse) {
    scene.traverse((o) => {
      if (o.name && /decor/i.test(o.name)) { out.group = o.name; out.children = o.children?.length ?? 0;
        out.names = (o.children ?? []).slice(0, 8).map(c => c.name || '(anon)'); }
    });
  }
  return out;
});
console.log('decor group:', JSON.stringify(stats));

await p.screenshot({ path: `/tmp/decor_${TAG}_0.png` });
const step = async (key, ms, shot) => {
  await p.mouse.click(640, 300);
  await p.keyboard.down(key); await new Promise(r => setTimeout(r, ms)); await p.keyboard.up(key);
  await new Promise(r => setTimeout(r, 2500));
  await p.screenshot({ path: shot });
};
await step('w', 3500, `/tmp/decor_${TAG}_1.png`);
await step('a', 2500, `/tmp/decor_${TAG}_2.png`);
await step('w', 3500, `/tmp/decor_${TAG}_3.png`);
await step('d', 3000, `/tmp/decor_${TAG}_4.png`);
await br.close();
console.log('done');
