// Stand ON a computed decoration site and photograph it. Uses /dev tp on a DEV
// ring (flag reverted by the caller afterwards) because walking blind under
// software GL cannot reliably reach a coordinate.
const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const [T, HOST, REALM, RID, TAG, ...spots] = process.argv.slice(2);
const U = `${HOST}/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=${encodeURIComponent(REALM)}&realm_id=${RID}`;

const br = await puppeteer.launch({ executablePath: B, headless: true,
  args: ['--no-sandbox','--use-angle=swiftshader','--use-gl=angle','--ignore-gpu-blocklist','--enable-webgl'] });
const p = await br.newPage(); await p.setViewport({ width: 1280, height: 720 });
p.on('dialog', d => d.accept());
await p.goto(U, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});

// A dev ring's hash handoff lands on the realm picker (the hop name never
// matches the directory label), so drive the picker: test rings -> Dev -> Enter.
const FAM = process.env.DECOR_FAM ?? 'FPS';
for (let i = 0; i < 24; i++) {
  const has = await p.evaluate(() => document.querySelectorAll('#char-list .char-row').length > 0 || document.querySelectorAll('.realm-card').length > 0);
  if (has) break;
  await new Promise(r => setTimeout(r, 5000));
}
if (await p.evaluate(() => document.querySelectorAll('#char-list .char-row').length === 0)) {
  await p.evaluate((fam) => {
    const cb = document.querySelector('.rl-test-rings[data-fam="' + fam + '"]');
    if (cb && !cb.checked) cb.click();
  }, FAM);
  await new Promise(r => setTimeout(r, 1500));
  await p.evaluate((fam) => {
    document.querySelector('.rl-stage[data-fam="' + fam + '"][data-stage="dev"]')?.click();
  }, FAM);
  await new Promise(r => setTimeout(r, 1500));
  await p.evaluate((fam) => {
    document.querySelector('.rc-enter[data-fam="' + fam + '"]')?.click();
  }, FAM);
  for (let i = 0; i < 24; i++) {
    if (await p.evaluate(() => document.querySelectorAll('#char-list .char-row').length > 0)) break;
    await new Promise(r => setTimeout(r, 5000));
  }
}
const picked = await p.evaluate(() => {
  const row = document.querySelector('#char-list .char-row');
  if (!row) return 'NO_ROW';
  row.click();
  return row.querySelector('.char-name')?.textContent.trim() ?? '?';
});
console.log('char:', picked);
if (picked === 'NO_ROW') { await br.close(); process.exit(2); }
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
  const css = document.createElement('style');
  css.textContent = '#chat-panel,[class*=season],[id*=install]{opacity:.05!important}';
  document.head.appendChild(css);
});
await new Promise(r => setTimeout(r, 12000));

for (const spot of spots) {
  const [x, z] = spot.split(',');
  await p.mouse.click(640, 300);
  await p.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 700));
  await p.keyboard.type(`/dev tp ${x} ${z}`, { delay: 25 });
  await p.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 9000));
  // back up a little so the object is in frame rather than on top of the camera
  await p.keyboard.down('s'); await new Promise(r => setTimeout(r, 1200)); await p.keyboard.up('s');
  await new Promise(r => setTimeout(r, 3500));
  await p.screenshot({ path: `/tmp/tp_${TAG}_${x}_${z}.png` });
  console.log('shot', x, z);
}
await br.close();
console.log('done');
