// Tier A/B with live scene numbers, not just a picture.
// argv: <token> <tier> <realmId> <RealmName> <outdir>
const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T = process.argv[2];
const TIER = process.argv[3] ?? 'medium';
const RID = process.argv[4] ?? 'infernal';
const RNAME = process.argv[5] ?? 'Infernal';
const OUT = process.argv[6] ?? '/tmp/darkab';
const HOST = `${RID}.crypticrealm.com`;
const U = `https://${HOST}/?gfx=${TIER}#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=${RNAME}&realm_id=${RID}`;

const fs = await import('node:fs');
fs.mkdirSync(OUT, { recursive: true });

const br = await puppeteer.launch({
  executablePath: B, headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist',
    // Without this, current Chromium REFUSES the software-WebGL fallback outright:
    // getContext('webgl2') returns null, the world never boots, and the page shows
    // the "could not enter world" text on black. That black is a dead context, not
    // a lighting bug -- it is what makes a headless run look like a dark-render bug.
    '--enable-unsafe-swiftshader',
    '--enable-webgl', '--disable-dev-shm-usage', '--disable-gpu-shader-disk-cache',
    // 2048 is what the known-good probe uses; 1536 OOM-kills the renderer mid-load
    // and the tab detaches ("Target closed") long before anything is drawn.
    '--js-flags=--max-old-space-size=2048'],
});
const p = await br.newPage();
await p.setViewport({ width: 800, height: 450 });
p.on('dialog', d => d.accept());
let entry = '';
p.on('console', m => {
  const t = m.text();
  if (/scene built:|environment prefilter|gfx tier|WebGL/i.test(t)) entry += t.slice(0, 180) + '\n';
});

const t0 = Date.now();
await p.goto(U, { waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {});

// Prove WebGL exists BEFORE judging any pixel. A null context renders black and
// looks exactly like a lighting bug.
const gl = await p.evaluate(() => {
  const c = document.createElement('canvas');
  const g = c.getContext('webgl2') || c.getContext('webgl');
  if (!g) return { ok: false };
  const d = g.getExtension('WEBGL_debug_renderer_info');
  return { ok: true, renderer: d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a' };
}).catch(() => ({ ok: false, err: 'eval failed' }));
console.log('webgl:', JSON.stringify(gl));
for (let i = 0; i < 30; i++) {
  if (await p.evaluate(() => document.querySelectorAll('#char-list .char-row').length > 0).catch(() => false)) break;
  await new Promise(r => setTimeout(r, 5000));
}
const clickEnter = () => p.evaluate(() => {
  const rows = [...document.querySelectorAll('#char-list .char-row')];
  const btnIn = (row, want) => [...row.querySelectorAll('button')]
    .find(b => b.textContent.trim().toLowerCase() === want && b.offsetParent !== null && !b.disabled);
  for (const want of ['enter world', 'take over'])
    for (const row of rows) { const b = btnIn(row, want); if (b) { row.click(); b.click(); return true; } }
  return false;
}).catch(() => false);

// The box is heavily loaded, so world entry intermittently times out server-side
// (postgres cannot answer in time). That failure is a black screen with an error
// string -- indistinguishable from a "dark render" if you only look at the pixels.
// Retry entry in place instead of paying a fresh browser boot each time.
let ui = false; let attempts = 0;
outer:
for (attempts = 1; attempts <= 6; attempts++) {
  await clickEnter();
  for (let i = 0; i < 24; i++) {
    ui = await p.evaluate(() => !!document.getElementById('ui')).catch(() => false);
    if (ui) break outer;
    const err = await p.evaluate(() => /could not enter world/i.test(document.body.innerText || ''))
      .catch(() => false);
    if (err) {
      console.log(`attempt ${attempts}: server refused entry, retrying`);
      await p.evaluate(() => {
        const b = [...document.querySelectorAll('button')]
          .find(x => /return to login/i.test(x.textContent || '') && x.offsetParent !== null);
        if (b) b.click();
      }).catch(() => {});
      // wait for the roster to come back before the next attempt
      for (let k = 0; k < 24; k++) {
        const back = await p.evaluate(() => document.querySelectorAll('#char-list .char-row').length > 0)
          .catch(() => false);
        if (back) break;
        await new Promise(r => setTimeout(r, 5000));
      }
      break;
    }
    await new Promise(r => setTimeout(r, 5000));
  }
}
console.log('entered:', ui, 'after attempts:', attempts);
const bootMs = Date.now() - t0;
for (let i = 0; i < 10; i++) {
  const c = await p.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .find(x => x.textContent.trim().toLowerCase() === 'confirm' && x.offsetParent !== null);
    if (b) { b.click(); return true; } return false;
  }).catch(() => false);
  if (c) break;
  await new Promise(r => setTimeout(r, 4000));
}
await new Promise(r => setTimeout(r, 20000));

// Park the camera identically in every run so the A/B is the same view.
const posed = await p.evaluate(() => {
  try {
    const g = window.__game; if (!g) return 'no __game';
    const pl = g.sim?.player; if (!pl) return 'no player';
    return { x: pl.pos.x, y: pl.pos.y, z: pl.pos.z };
  } catch (e) { return String(e).slice(0, 80); }
}).catch(e => String(e).slice(0, 80));

const diag = await p.evaluate(() => {
  try {
    const g = window.__game; if (!g) return { err: 'no __game' };
    const r = g.renderer; const s = r.scene;
    const hist = {}; let stdCount = 0; let envLit = 0;
    s.traverse(o => {
      const m = o.material; if (!m) return;
      for (const mm of (Array.isArray(m) ? m : [m])) {
        hist[mm.type] = (hist[mm.type] || 0) + 1;
        if (mm.isMeshStandardMaterial) { stdCount++; if (s.environment) envLit++; }
      }
    });
    const lights = [];
    s.traverse(o => {
      if (o.isLight) lights.push({
        t: o.type, i: Number(o.intensity.toFixed(3)),
        c: o.color?.getHexString?.() ?? null,
        g: o.groundColor?.getHexString?.() ?? null,
      });
    });
    const mem = r.webgl?.info?.memory ?? null;
    return {
      environment: !!s.environment,
      environmentIntensity: s.environmentIntensity,
      background: s.background?.getHexString ? s.background.getHexString() : (s.background ? 'texture' : null),
      fog: s.fog ? { c: s.fog.color.getHexString(), near: s.fog.near, far: s.fog.far } : null,
      matHist: hist, stdCount, envLit,
      lights: lights.filter(l => l.t === 'HemisphereLight' || l.t === 'DirectionalLight'),
      pointLights: lights.filter(l => l.t === 'PointLight').length,
      mem,
      jsHeapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
    };
  } catch (e) { return { err: String(e).slice(0, 200) }; }
}).catch(e => ({ err: String(e).slice(0, 200) }));

const tag = `${RID}_${TIER}`;
let shot = 'failed';
try { await p.screenshot({ path: `${OUT}/${tag}.png` }); shot = 'ok'; } catch (e) { shot = String(e).slice(0, 100); }

// If the page is showing an error instead of a world, say so loudly -- otherwise
// a black failure screen gets scored as a "dark render".
const fail = await p.evaluate(() => {
  const t = document.body.innerText || '';
  const m = t.match(/could not enter world[^\n]*/i);
  return m ? m[0].slice(0, 160) : null;
}).catch(() => null);

const rec = { realm: RID, tier: TIER, webgl: gl, inWorld: ui, entryAttempts: attempts,
  failText: fail, bootMs, shot, pos: posed, diag, entry: entry.trim() };
fs.writeFileSync(`${OUT}/${tag}.json`, JSON.stringify(rec, null, 2));
console.log(JSON.stringify(rec, null, 2));
await br.close();
