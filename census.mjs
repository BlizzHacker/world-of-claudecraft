#!/usr/bin/env node
// Live coverage census. Loads the SHIPPED characters chunk in a real browser on
// the real origin, builds every visual through the real CharacterVisual
// constructor, and drives it through the real update()/playAttack()/playEmote()
// state machine. Bound actions and the clip that is ACTUALLY PLAYING are read
// back per state - a clip listed in a GLB proves nothing, a bound action that
// never becomes `current` proves nothing either.
//
//   node census.mjs <token> <out.json> [startIndex] [count] [filterPrefix]
import { readFileSync, writeFileSync } from 'node:fs';

const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T = process.argv[2];
const OUT = process.argv[3] ?? '/tmp/census.json';
const START = Number(process.argv[4] ?? 0);
const COUNT = Number(process.argv[5] ?? 100000);
const FILTER = process.argv[6] ?? '';
const ORIGIN = process.env.CR_ORIGIN ?? 'https://infernal.crypticrealm.com';

const LAUNCH = {
  executablePath: B, headless: true, protocolTimeout: 600000,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle',
    '--ignore-gpu-blocklist', '--enable-webgl'],
};
let br = await puppeteer.launch(LAUNCH);
// Which characters chunk the LIVE build ships. Read from the entry HTML in node:
// booting the actual game page here would navigate mid-probe (SSO/realm redirect)
// and detach the frame. A static page on the same origin gives a stable document
// to import the real shipped module into.
const HOST_PAGE = process.env.CR_HOST_PAGE ?? '/maintenance.html';
const entry = process.env.CR_CHUNK ? `assets/${process.env.CR_CHUNK.split('/').pop()}` : await (await fetch(`${ORIGIN}/play.html`)).text();
const m = entry.match(/assets\/characters-[A-Za-z0-9_-]+\.js/);
const chunk = m ? `${ORIGIN}/${m[0]}` : null;
if (!chunk) { console.error('no characters chunk in play.html'); await br.close(); process.exit(2); }

// A synthetic same-origin document. Every real page this app serves either boots
// the game (which navigates on auth/realm resolve) or carries a
// <meta http-equiv="refresh">; either one destroys the execution context
// mid-probe and turns the census into a list of errors. Interception is switched
// off again immediately so the thousands of GLB fetches are not proxied.
async function openHost(page) {
  await page.setRequestInterception(true);
  const onReq = (req) => {
    if (req.url().startsWith(`${ORIGIN}/__census__`)) {
      req.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>census</title>' }).catch(() => {});
    } else req.continue().catch(() => {});
  };
  page.on('request', onReq);
  await page.goto(`${ORIGIN}/__census__`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  page.off('request', onReq);
  await page.setRequestInterception(false);
}

let p = await br.newPage();
await p.setViewport({ width: 800, height: 600 });
p.on('dialog', (d) => d.accept());
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await openHost(p);
console.error('[census] chunk', chunk);

// CR_BUNDLE = an esbuild bundle of the WORKING TREE's characters module,
// injected as a module script on the live origin. Without it the census reads
// the shipped chunk. Same probe either way, so BEFORE and AFTER are comparable.
const BUNDLE = process.env.CR_BUNDLE ? readFileSync(process.env.CR_BUNDLE, 'utf8') : null;
async function loadModule(page) {
  if (BUNDLE) {
    await page.addScriptTag({ content: BUNDLE, type: 'module' });
    await page.waitForFunction('!!window.__CENSUS_MODULE__', { timeout: 120000 });
    await page.evaluate(() => { window.__M = window.__CENSUS_MODULE__; });
    return;
  }
  await page.evaluate(async (url) => { window.__M = await import(url); }, chunk);
}

// Bind the module's exports by duck-typing, never by minified letter.
await loadModule(p);
const bound = await p.evaluate(async () => {
  const M = window.__M;
  const out = { VISUALS: null, CV: null, preload: null, ready: null };
  for (const [k, v] of Object.entries(M)) {
    if (!v) continue;
    if (typeof v === 'object' && !out.VISUALS) {
      const vals = Object.values(v);
      if (vals.length > 50 && vals.every((d) => d && typeof d === 'object' && typeof d.url === 'string' && d.clips)) out.VISUALS = k;
    }
    if (typeof v === 'function' && v.prototype && typeof v.prototype.animDebug === 'function') out.CV = k;
  }
  // preloadVisualAssets / visualAssetsReady: identified by behaviour on a known key.
  const anyKey = out.VISUALS ? Object.keys(M[out.VISUALS])[0] : null;
  if (anyKey) {
    for (const [k, v] of Object.entries(M)) {
      if (typeof v !== 'function' || v.prototype?.animDebug) continue;
      if (v.length !== 1) continue;
      let r; try { r = v(anyKey); } catch { continue; }
      if (r && typeof r.then === 'function') { r.catch(() => {}); out.preload ??= k; }
      else if (typeof r === 'boolean') out.ready ??= k;
    }
  }
  window.__B = out;
  return out;
});
console.error('[census] bound', JSON.stringify(bound));
if (!bound.VISUALS || !bound.CV || !bound.preload) { console.error('binding failed'); await br.close(); process.exit(3); }

const registry = await p.evaluate(() => {
  const V = window.__M[window.__B.VISUALS];
  const out = {};
  for (const [k, d] of Object.entries(V)) {
    out[k] = { url: d.url, height: d.height, lazy: !!d.lazyPreload, animUrls: d.animUrls ?? null, clips: d.clips };
  }
  return out;
});
console.error('[census] registry keys', Object.keys(registry).length);
if (process.env.CR_REGISTRY_OUT) {
  writeFileSync(process.env.CR_REGISTRY_OUT, JSON.stringify(registry));
  console.error('[census] registry dumped ->', process.env.CR_REGISTRY_OUT);
  await br.close();
  process.exit(0);
}

let keys = Object.keys(registry);
// CR_KEYS points at a newline-separated key list (the stratified sample). Keys
// that are not in the live registry are reported, never silently dropped.
if (process.env.CR_KEYS) {
  const want = readFileSync(process.env.CR_KEYS, 'utf8').split(String.fromCharCode(10)).map((x) => x.trim()).filter(Boolean);
  const missing = want.filter((k) => !registry[k]);
  if (missing.length) console.error('[census] NOT IN REGISTRY:', missing.length, missing.slice(0, 10).join(','));
  keys = want.filter((k) => registry[k]);
} else if (FILTER) keys = keys.filter((k) => k.startsWith(FILTER));
keys = keys.slice(START, START + COUNT);
console.error('[census] censusing', keys.length, 'bodies');

// The per-body probe: preload, construct, drive, sample.
const probe = async (key) => p.evaluate(async (k) => {
  const M = window.__M, B = window.__B;
  const CV = M[B.CV];
  const t0 = performance.now();
  try { await M[B.preload](k); } catch (e) { return { key: k, error: 'preload:' + String(e?.message ?? e).slice(0, 120) }; }
  let v;
  try { v = new CV(k, 0xffffff, 0, null, null, null); } catch (e) { return { key: k, error: 'construct:' + String(e?.message ?? e).slice(0, 120) }; }

  // Skeleton geometry fingerprint. Under a ROTATIONS-ONLY clip the sum of
  // parent->child bone lengths is invariant; any translation/scale channel
  // (the donor-bone-length bug that shrank bodies during emotes) moves it.
  const bones = () => {
    const set = [];
    v.root.updateMatrixWorld(true);
    v.root.traverse((o) => { if (o.isSkinnedMesh && o.skeleton) for (const b of o.skeleton.bones) if (!set.includes(b)) set.push(b); });
    return set;
  };
  const fingerprint = () => {
    const bs = bones();
    if (!bs.length) return null;
    const idx = new Set(bs);
    let len = 0, minY = Infinity, maxY = -Infinity, n = 0;
    for (const b of bs) {
      const e = b.matrixWorld.elements, x = e[12], y = e[13], z = e[14];
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      const par = b.parent;
      if (!par || !idx.has(par)) continue;
      // Skip the root->hips edge: legitimate ROOT MOTION translates it (Death_A
      // slides the body along the floor), which would swamp the real signal.
      // Every deeper edge is a fixed bone LENGTH and must not move at all under
      // a rotations-only clip - that is the emote-shrink detector.
      if (!par.parent || !idx.has(par.parent)) continue;
      const pe = par.matrixWorld.elements;
      len += Math.hypot(x - pe[12], y - pe[13], z - pe[14]); n++;
    }
    return { boneLen: +len.toFixed(5), span: +(maxY - minY).toFixed(5), bones: bs.length, edges: n };
  };

  // POSE SIGNATURE - the only thing that separates a real binding from a name.
  // three.js binds animation tracks by NODE NAME: a clip authored on a foreign
  // skeleton still yields a live AnimationAction and still reports as `current`,
  // it just drives nothing. Sampling the skeleton twice inside the same clip and
  // comparing is the only check that catches that.
  const poseSig = () => {
    const bs = bones();
    let s = 0;
    for (const b of bs) { const e = b.matrixWorld.elements; s += e[12] * 1.13 + e[13] * 3.07 + e[14] * 7.19; }
    return s;
  };

  const base = { speed: 0, moving: false, running: false, airborne: false, backwards: false, dead: false, casting: false, swimming: false, sitting: false };
  const step = (s, frames = 16, dt = 1 / 30) => { for (let i = 0; i < frames; i++) v.update(dt, s, true); };
  const EPS = 1e-4;
  // `moving` = the pose actually changed over 6 more frames of the same clip.
  const sample = (label, s) => {
    const a = poseSig(); const fp = fingerprint();
    step(s, 6); const b2 = poseSig();
    const d = v.animDebug();
    return { state: label, base: d.state, current: d.current, fp, pose: +a.toFixed(4), moved: Math.abs(b2 - a) > EPS };
  };

  const samples = [];
  const S = {
    idle: base,
    walk: { ...base, speed: 2.2, moving: true },
    run: { ...base, speed: 7, moving: true, running: true },
    walkBack: { ...base, speed: 2.2, moving: true, backwards: true },
    sit: { ...base, sitting: true },
    jump: { ...base, airborne: true },
    swim: { ...base, swimming: true },
  };
  step(S.idle, 18); samples.push(sample('idle', S.idle));
  step(S.walk, 18); samples.push(sample('walk', S.walk));
  step(S.run, 18); samples.push(sample('run', S.run));
  step(S.walkBack, 18); samples.push(sample('walkBack', S.walkBack));
  step(base, 14);
  try { v.playAttack(); } catch {}
  step(base, 3); samples.push(sample('attack', base));
  step(base, 22);
  try { v.beginCastChannel(); } catch {}
  step({ ...base, casting: true }, 18); samples.push(sample('cast', { ...base, casting: true }));
  step(base, 14);
  try { v.playHit(); } catch {}
  step(base, 2); samples.push(sample('hit', base));
  step(base, 22);
  step(S.sit, 26); samples.push(sample('sit', S.sit));
  step(S.jump, 16); samples.push(sample('jump', S.jump));
  step(S.swim, 18); samples.push(sample('swim', S.swim));
  step(base, 18);
  const EMOTES = ['wave', 'laugh', 'question', 'cheer', 'dance', 'point', 'flex', 'salute', 'cry', 'bow', 'clap', 'roar', 'kneel', 'alert', 'lookaround', 'carry', 'roll', 'collapse', 'shuffle', 'shimmy'];
  const emotes = {};
  for (const id of EMOTES) {
    step(base, 16);
    const before = v.animDebug().current, beforePose = poseSig();
    try { v.playEmote(id); } catch {}
    step(base, 3);
    const s1 = poseSig(); const fp = fingerprint();
    step(base, 5);
    const d = v.animDebug();
    emotes[id] = {
      current: d.current, changed: d.current !== before,
      played: Math.abs(s1 - beforePose) > EPS, moved: Math.abs(poseSig() - s1) > EPS,
      fp,
    };
  }
  step(base, 20);
  step({ ...base, dead: true }, 18); samples.push(sample('death', { ...base, dead: true }));
  const dbg = v.animDebug();
  const res = {
    key: k, ms: Math.round(performance.now() - t0),
    actions: dbg.actions, resolved: dbg.clips, samples, emotes,
  };
  try { v.dispose(); } catch {}
  return res;
}, key);

// Every loaded GLB stays in the module's global asset caches for the life of
// the page, so a long run has to recycle the tab or the renderer process is
// OOM-killed part-way through and the census silently stops being a census.
const RECYCLE = Number(process.env.CR_RECYCLE ?? 10);
async function recycle() {
  // Rebuild the whole browser when it has gone. Chrome dies part-way through a
  // long run (the hero GLBs are ~15MB each and every one stays in the module's
  // asset cache), and a dead browser turned 197 of 204 rows into "Connection
  // closed" - a census that reports nothing while looking like it ran.
  if (!br.connected) {
    try { await br.close(); } catch { /* already gone */ }
    br = await puppeteer.launch(LAUNCH);
    p = await br.newPage();
  } else {
    // Open the replacement BEFORE closing the old tab: headless Chrome exits
    // when its last target goes away.
    const old = p;
    p = await br.newPage();
    await old.close().catch(() => {});
  }
  await p.setViewport({ width: 800, height: 600 });
  p.on('dialog', (d) => d.accept());
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await openHost(p);
  await loadModule(p);
  await p.evaluate(async () => {
    const M = window.__M;
    const out = { VISUALS: null, CV: null, preload: null };
    for (const [k, v] of Object.entries(M)) {
      if (!v) continue;
      if (typeof v === 'object' && !out.VISUALS) {
        const vals = Object.values(v);
        if (vals.length > 50 && vals.every((d) => d && typeof d === 'object' && typeof d.url === 'string' && d.clips)) out.VISUALS = k;
      }
      if (typeof v === 'function' && v.prototype && typeof v.prototype.animDebug === 'function') out.CV = k;
    }
    const anyKey = Object.keys(M[out.VISUALS])[0];
    for (const [k, v] of Object.entries(M)) {
      if (typeof v !== 'function' || v.prototype?.animDebug || v.length !== 1) continue;
      let r; try { r = v(anyKey); } catch { continue; }
      if (r && typeof r.then === 'function') { r.catch(() => {}); out.preload ??= k; }
    }
    window.__B = out;
  });
}

const results = [];
let i = 0;
for (const key of keys) {
  i++;
  let r;
  try { r = await probe(key); } catch (e) { r = { key, error: 'probe:' + String(e?.message ?? e).slice(0, 160) }; }
  // A lost execution context poisons every later body: rebuild and retry once
  // so a transient page death cannot quietly hollow out the census.
  if (r?.error && /context|frame|detached|Connection closed|__B|__M/i.test(r.error)) {
    try { await recycle(); r = await probe(key); }
    catch (e) { r = { key, error: 'retry:' + String(e?.message ?? e).slice(0, 160) }; }
  }
  results.push(r);
  if (i % 2 === 0 || i === keys.length) {
    console.error(`[census] ${i}/${keys.length}`);
    writeFileSync(OUT, JSON.stringify({ registry, results }, null, 0));
  }
  if (i % RECYCLE === 0 && i < keys.length) {
    try { await recycle(); } catch (e) { console.error('[census] recycle failed', String(e).slice(0, 120)); }
  }
}
writeFileSync(OUT, JSON.stringify({ registry, results, pageErrors: errs.slice(0, 20) }, null, 0));
console.error('[census] wrote', OUT, 'results', results.length, 'pageErrors', errs.length);
await br.close();
