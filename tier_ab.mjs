// A/B the graphics tier from the same spawn. The low tier skips the whole IBL
// build (`if (!LOW_GFX)` in renderer.ts has no else), so scene.environment stays
// null there. If medium comes back lit and low does not, low-tier players are
// looking at a black world — and that is lighting maths, not a headless quirk.
const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T = process.argv[2];
const TIER = process.argv[3] ?? 'medium';
const U = `https://infernal.crypticrealm.com/?gfx=${TIER}#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br = await puppeteer.launch({ executablePath: B, headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist',
    '--enable-webgl', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=2048'] });
const p = await br.newPage();
await p.setViewport({ width: 960, height: 540 });
p.on('dialog', d => d.accept());
let tierLine = '';
p.on('console', m => { const t = m.text(); if (/scene built:|environment prefilter/.test(t)) tierLine += t.slice(0, 200) + '\n'; });
await p.goto(U, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
for (let i = 0; i < 30; i++) { if (await p.evaluate(() => document.querySelectorAll('#char-list .char-row').length > 0)) break; await new Promise(r => setTimeout(r, 5000)); }
await p.evaluate(() => {
  const rows = [...document.querySelectorAll('#char-list .char-row')];
  const btnIn = (row, want) => [...row.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === want && b.offsetParent !== null && !b.disabled);
  for (const want of ['enter world', 'take over']) for (const row of rows) { const b = btnIn(row, want); if (b) { row.click(); b.click(); return; } }
});
let ui = false;
for (let i = 0; i < 40; i++) { ui = await p.evaluate(() => !!document.getElementById('ui')); if (ui) break; await new Promise(r => setTimeout(r, 5000)); }
console.log(TIER, 'in world:', ui);
for (let i = 0; i < 10; i++) {
  const c = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().toLowerCase() === 'confirm' && x.offsetParent !== null); if (b) { b.click(); return true; } return false; });
  if (c) break;
  await new Promise(r => setTimeout(r, 4000));
}
await new Promise(r => setTimeout(r, 20000));
try { await p.screenshot({ path: `/tmp/tier_${TIER}.png` }); console.log('shot ok'); }
catch (e) { console.log('shot failed:', String(e).slice(0, 120)); }
console.log('ENTRY:\n' + tierLine.trim());
await br.close();
