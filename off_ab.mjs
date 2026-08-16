// Tier A/B via OFFLINE mode on the local vite dev server. The live rings are
// unusable right now (postgres cannot answer under the deploy load, so world
// entry times out), but offline mode runs the same Sim + the same renderer.ts
// with no server at all -- which is exactly what a lighting A/B needs.
// argv: <tier> <realmId> <outdir>
const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const TIER = process.argv[2] ?? 'medium';
const RID = process.argv[3] ?? 'infernal';
const OUT = process.argv[4] ?? '/tmp/offab';
const U = `http://127.0.0.1:5599/?gfx=${TIER}&realm=${RID}`;

const fs = await import('node:fs');
fs.mkdirSync(OUT, { recursive: true });

const br = await puppeteer.launch({
  executablePath: B, headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist',
    '--enable-unsafe-swiftshader', '--enable-webgl', '--disable-dev-shm-usage',
    '--js-flags=--max-old-space-size=2048'],
});
const p = await br.newPage();
await p.setViewport({ width: 800, height: 450 });
p.on('dialog', d => d.accept());
const logs = [];
p.on('console', m => { const t = m.text(); if (/scene built|environment prefilter|error/i.test(t)) logs.push(t.slice(0, 160)); });
p.on('pageerror', e => logs.push('PAGEERROR ' + String(e).slice(0, 160)));

await p.goto(U, { waitUntil: 'domcontentloaded', timeout: 180000 }).catch(e => logs.push('goto ' + String(e).slice(0, 100)));
// vite compiles on first hit; give the module graph time
await new Promise(r => setTimeout(r, 20000));

const started = await p.evaluate(() => {
  const vis = (el) => el && el.offsetParent !== null;
  const off = document.querySelector('#btn-offline');
  if (vis(off)) off.click();
  else {
    const sel = document.querySelector('select');
    if (sel) {
      const o = [...sel.options].find(x => /offline/i.test(x.textContent || x.value));
      if (o) { sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    }
  }
  return { offlineBtn: !!off, offlineVisible: vis(off) };
}).catch(e => ({ err: String(e).slice(0, 120) }));
await new Promise(r => setTimeout(r, 3000));

const launched = await p.evaluate(() => {
  const name = document.querySelector('#char-name');
  if (name) { name.value = 'LUMTEST'; name.dispatchEvent(new Event('input', { bubbles: true })); }
  const go = document.querySelector('#btn-start-offline');
  if (go && go.offsetParent !== null) { go.click(); return true; }
  return false;
}).catch(() => false);

let ui = false;
for (let i = 0; i < 40; i++) {
  ui = await p.evaluate(() => !!document.getElementById('ui')).catch(() => false);
  if (ui) break;
  await new Promise(r => setTimeout(r, 4000));
}
// let terrain/props stream and any intro finish
for (let i = 0; i < 8; i++) {
  await p.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .find(x => /confirm|continue|skip/i.test(x.textContent || '') && x.offsetParent !== null);
    if (b) b.click();
  }).catch(() => {});
  await new Promise(r => setTimeout(r, 4000));
}
await new Promise(r => setTimeout(r, 15000));

const diag = await p.evaluate(() => {
  try {
    const g = window.__game; if (!g) return { err: 'no __game' };
    const r = g.renderer; const s = r.scene;
    const hist = {};
    s.traverse(o => {
      const m = o.material; if (!m) return;
      for (const mm of (Array.isArray(m) ? m : [m])) hist[mm.type] = (hist[mm.type] || 0) + 1;
    });
    const lights = [];
    s.traverse(o => { if (o.isLight) lights.push({ t: o.type, i: +o.intensity.toFixed(3), c: o.color?.getHexString?.() ?? null, g: o.groundColor?.getHexString?.() ?? null }); });
    return {
      environment: !!s.environment,
      environmentIntensity: s.environmentIntensity,
      background: s.background?.getHexString ? s.background.getHexString() : (s.background ? 'texture' : null),
      fog: s.fog ? { c: s.fog.color.getHexString(), near: +s.fog.near.toFixed(1), far: +s.fog.far.toFixed(1) } : null,
      matHist: hist,
      lights: lights.filter(l => l.t === 'HemisphereLight' || l.t === 'DirectionalLight'),
      exposure: r.webgl?.toneMappingExposure,
      jsHeapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
    };
  } catch (e) { return { err: String(e).slice(0, 200) }; }
}).catch(e => ({ err: String(e).slice(0, 200) }));

const tag = `${RID}_${TIER}`;
let shot = 'failed';
try { await p.screenshot({ path: `${OUT}/${tag}.png` }); shot = 'ok'; } catch (e) { shot = String(e).slice(0, 90); }
const rec = { realm: RID, tier: TIER, started, launched, inWorld: ui, shot, diag, logs: logs.slice(0, 12) };
fs.writeFileSync(`${OUT}/${tag}.json`, JSON.stringify(rec, null, 2));
console.log(JSON.stringify(rec, null, 2));
await br.close();
