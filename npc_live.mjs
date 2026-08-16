// The prewarm log says three character views were skipped as "not preloaded".
// Those keys are marked lazy, so the open world is supposed to back-fill them.
// Sit in world long enough for that to settle and report what the renderer
// actually holds, keyed by visual — a nameplate with no body is the failure.
const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T = process.argv[2];
const U = `https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br = await puppeteer.launch({ executablePath: B, headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist', '--enable-webgl'] });
const p = await br.newPage();
await p.setViewport({ width: 1280, height: 720 });
p.on('dialog', d => d.accept());
const misses = [];
p.on('console', m => { const t = m.text(); if (/not preloaded|unavailable, skipping|Failed to preload/.test(t)) misses.push(t.slice(0, 220)); });
await p.goto(U, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
for (let i = 0; i < 30; i++) { if (await p.evaluate(() => document.querySelectorAll('#char-list .char-row').length > 0)) break; await new Promise(r => setTimeout(r, 5000)); }
await p.evaluate(() => {
  const rows = [...document.querySelectorAll('#char-list .char-row')];
  const btnIn = (row, want) => [...row.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === want && b.offsetParent !== null && !b.disabled);
  for (const want of ['enter world', 'take over']) for (const row of rows) { const b = btnIn(row, want); if (b) { row.click(); b.click(); return; } }
});
let ui = false;
for (let i = 0; i < 40; i++) { ui = await p.evaluate(() => !!document.getElementById('ui')); if (ui) break; await new Promise(r => setTimeout(r, 5000)); }
console.log('in world:', ui);

for (const wait of [10000, 20000, 30000]) {
  await new Promise(r => setTimeout(r, wait));
  const keys = await p.evaluate(() => {
    const live = window.__crAnim ? window.__crAnim() : [];
    const c = {};
    for (const v of live) c[v.key] = (c[v.key] ?? 0) + 1;
    const plates = [...document.querySelectorAll('[class*=nameplate], [class*=name-plate]')]
      .map(e => e.textContent.trim()).filter(Boolean).slice(0, 40);
    return { visuals: c, total: live.length, plates: plates.length };
  });
  console.log(`t+${wait}ms  visuals=${keys.total} plates=${keys.plates}`, JSON.stringify(keys.visuals));
}
console.log('MISSES:', misses.length);
for (const m of [...new Set(misses)].slice(0, 12)) console.log('  ', m);
await br.close();
