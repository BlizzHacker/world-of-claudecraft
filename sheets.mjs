#!/usr/bin/env node
// Motion sheets, rendered by the GAME'S OWN preview renderer.
//
// CharacterPreview.captureCloseup({poseClips}) runs CharacterVisual.poseFreeze,
// which only poses a clip that is actually BOUND on this body. The candidate a
// column resolves to is read from window.__crAnim()'s bound-action list, so a
// column with no bound candidate is recorded as NO-CLIP instead of quietly
// rendering an idle frame and looking fine.
//
//   CR_BUNDLE=/tmp/census_bundle.js node sheets.mjs <token> <outDir> <keysFile>
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const OUT = process.argv[3] ?? '/tmp/sheets';
const KEYS = process.argv[4];
const ORIGIN = process.env.CR_ORIGIN ?? 'https://infernal.crypticrealm.com';
const SIZE = Number(process.env.CR_SHEET_SIZE ?? 360);
const RECYCLE = Number(process.env.CR_RECYCLE ?? 3);

const COLUMNS = [
  ['idle', ['Idle', 'Idle_Combat', 'Idle_Alt_A']],
  ['walk', ['Walking_A', 'Walk', 'Walking']],
  ['run', ['Running_A', 'Run', 'Running', 'RunFast']],
  ['attack', ['1H_Melee_Attack_Chop', 'Attack_Spin', 'Attack', '2H_Melee_Attack_Chop', 'Attack_Combo']],
  ['cast', ['Spellcasting', 'Cast', 'Spellcast_Raise']],
  ['emote', ['Emote_Dance_A', 'Emote_Wave', 'Cheer', 'Wave', 'Taunt']],
];

const LAUNCH = {
  executablePath: B, headless: true, protocolTimeout: 600000,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle',
    '--ignore-gpu-blocklist', '--enable-webgl'],
};
const BUNDLE = process.env.CR_BUNDLE ? readFileSync(process.env.CR_BUNDLE, 'utf8') : null;
// CR_CHUNK pins a specific shipped build. Without it the BEFORE sheet silently
// becomes an AFTER sheet the moment the running deploy publishes a new bundle.
let CHUNK = null;
if (!BUNDLE) {
  if (process.env.CR_CHUNK) CHUNK = `${ORIGIN}/${process.env.CR_CHUNK}`;
  else {
    const entry = await (await fetch(`${ORIGIN}/play.html`)).text();
    CHUNK = `${ORIGIN}/${entry.match(/assets\/characters-[A-Za-z0-9_-]+\.js/)[0]}`;
  }
  console.error('[sheets] chunk', CHUNK);
}
const keys = readFileSync(KEYS, 'utf8').split(String.fromCharCode(10)).map((x) => x.trim()).filter(Boolean);
mkdirSync(OUT, { recursive: true });

let br = await puppeteer.launch(LAUNCH);
let p;

async function setup() {
  if (!br.connected) { try { await br.close(); } catch { /* gone */ } br = await puppeteer.launch(LAUNCH); }
  const prev = p;
  p = await br.newPage();
  if (prev) await prev.close().catch(() => {});
  await p.setViewport({ width: 900, height: 900 });
  await p.setRequestInterception(true);
  const onReq = (r) => {
    if (r.url().startsWith(`${ORIGIN}/__census__`)) {
      r.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>sheets</title>' }).catch(() => {});
    } else r.continue().catch(() => {});
  };
  p.on('request', onReq);
  await p.goto(`${ORIGIN}/__census__`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  p.off('request', onReq);
  await p.setRequestInterception(false);

  if (BUNDLE) await p.addScriptTag({ content: BUNDLE, type: 'module' });
  else await p.evaluate(async (u) => { window.__CENSUS_MODULE__ = await import(u); }, CHUNK);
  await p.waitForFunction('!!window.__CENSUS_MODULE__', { timeout: 180000 });

  await p.evaluate((size) => {
    const M = window.__CENSUS_MODULE__;
    const bind = {};
    for (const [k, v] of Object.entries(M)) {
      if (typeof v === 'object' && v && !bind.VISUALS) {
        const vals = Object.values(v);
        if (vals.length > 50 && vals.every((d) => d && typeof d === 'object' && typeof d.url === 'string' && d.clips)) bind.VISUALS = k;
      }
      if (typeof v === 'function' && v.prototype?.captureCloseup) bind.CP = k;
      if (typeof v === 'function' && v.prototype?.animDebug) bind.CV = k;
      if (typeof v === 'function' && !v.prototype?.animDebug && !v.prototype?.captureCloseup && v.length === 1) {
        let r; try { r = v('player_warrior'); } catch { r = null; }
        if (r && typeof r.then === 'function') { r.catch(() => {}); bind.preload ??= k; }
      }
    }
    window.__BIND = bind;
    const host = document.createElement('div');
    host.style.cssText = `width:${size}px;height:${size}px;position:fixed;left:0;top:0;`;
    const canvas = document.createElement('canvas');
    host.appendChild(canvas);
    document.body.appendChild(host);
    window.__PREVIEW = new M[bind.CP](host, canvas);
  }, SIZE);
}

await setup();
console.error('[sheets] bound', JSON.stringify(await p.evaluate(() => window.__BIND)));

const shoot = (key) => p.evaluate(async (k, cols, size) => {
  const M = window.__CENSUS_MODULE__, B = window.__BIND;
  try { await M[B.preload](k); } catch (e) { return { key: k, error: 'preload:' + String(e?.message ?? e).slice(0, 140) }; }
  const pv = window.__PREVIEW;
  pv.setVisualKey(k);
  await new Promise((r) => setTimeout(r, 300));
  const live = (window.__crAnim?.() ?? []).find((v) => v.key === k);
  const actions = new Set(live?.actions ?? []);
  const out = { key: k, bound: actions.size, frames: [] };
  for (const [label, candidates] of cols) {
    const clip = candidates.find((c) => actions.has(c)) ?? null;
    const url = clip
      ? pv.captureCloseup({ width: size, height: size, poseClips: candidates, poseFraction: 0.45 })
      : null;
    out.frames.push({ label, url, clip });
  }
  return out;
}, key, COLUMNS, SIZE);

const report = existsSync(join(OUT, 'report.json')) ? JSON.parse(readFileSync(join(OUT, 'report.json'), 'utf8')) : [];
const done = new Set(report.filter((r) => !r.error).map((r) => r.key));
let n = 0;
for (const key of keys) {
  if (done.has(key)) continue;
  n++;
  let shot;
  try { shot = await shoot(key); } catch (e) { shot = { key, error: String(e?.message ?? e).slice(0, 140) }; }
  if (shot.error && /context|frame|detached|Connection closed|Target closed/i.test(shot.error)) {
    try { await setup(); shot = await shoot(key); } catch (e) { shot = { key, error: 'retry:' + String(e?.message ?? e).slice(0, 140) }; }
  }
  const idx = report.findIndex((r) => r.key === key);
  if (shot.error) {
    const row = { key, error: shot.error };
    if (idx >= 0) report[idx] = row; else report.push(row);
    console.error('  FAIL', key, shot.error);
  } else {
    const dir = join(OUT, key);
    mkdirSync(dir, { recursive: true });
    const names = [];
    for (let i = 0; i < shot.frames.length; i++) {
      const f = shot.frames[i];
      if (!f.url || !f.url.startsWith('data:image')) { names.push(`${f.label}=NO-CLIP`); continue; }
      writeFileSync(join(dir, `${i}_${f.label}.png`), Buffer.from(f.url.split(',')[1], 'base64'));
      names.push(`${f.label}=${f.clip}`);
    }
    const row = { key, bound: shot.bound, frames: names };
    if (idx >= 0) report[idx] = row; else report.push(row);
    console.error('  OK', key, 'bound=' + shot.bound, names.join(','));
  }
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  if (n % RECYCLE === 0) { try { await setup(); } catch (e) { console.error('  recycle failed', String(e).slice(0, 100)); } }
}
console.error('[sheets] wrote', OUT, report.length, 'rows');
await br.close();
