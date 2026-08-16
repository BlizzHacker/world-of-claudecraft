// Stop guessing at the black world: capture every console line, page error and
// failed request from boot through world entry, and report the GPU string the
// page actually got.
const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T = process.argv[2];
const U = `https://infernal.crypticrealm.com/#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br = await puppeteer.launch({ executablePath: B, headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist', '--enable-webgl'] });
const p = await br.newPage();
await p.setViewport({ width: 1280, height: 720 });
p.on('dialog', d => d.accept());
const logs = [];
p.on('console', m => logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
p.on('pageerror', e => logs.push(`[PAGEERROR] ${String(e).slice(0, 300)}`));
p.on('requestfailed', r => logs.push(`[REQFAIL] ${r.url().slice(0, 160)} ${r.failure()?.errorText}`));
p.on('response', r => { if (r.status() >= 400) logs.push(`[HTTP ${r.status()}] ${r.url().slice(0, 160)}`); });

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
await new Promise(r => setTimeout(r, 16000));

console.log('GPU:', JSON.stringify(await p.evaluate(() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') ?? c.getContext('webgl');
  if (!gl) return 'NO_GL';
  const d = gl.getExtension('WEBGL_debug_renderer_info');
  return { renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE), ver: gl.getParameter(gl.VERSION) };
})));

console.log('--- console (' + logs.length + ' lines) ---');
const seen = new Set();
for (const l of logs) { const k = l.slice(0, 120); if (seen.has(k)) continue; seen.add(k); console.log(l); }
await br.close();
