// Boot the DEPLOYED offline world and photograph NPCs in it, reporting which
// body each NPC actually resolved to.
//
// The offline entry is not a top-level button: #btn-offline lives inside the
// collapsed "Online" mode dropdown, so clicking it straight from the start
// screen is a no-op and every wait times out afterwards. Open the picker first.
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { BROWSER_PATH as EDGE } from './browser_path.mjs';

const URL = process.env.GAME_URL ?? 'https://infernal.crypticrealm.com';
const OUT = process.env.OUT_DIR ?? '/tmp/npcshots';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900',
         '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1600, height: 900 },
  // Booting the world pegs the main thread for minutes on this box, which stalls
  // CDP evals; the 180s default protocolTimeout kills the wait even though the
  // world is loading fine. This is a slow-machine limit, not a hang.
  protocolTimeout: 900000,
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 160)));
// A ShaderMaterial that fails to compile is the difference between 'the portal
// is broken for players' and 'SwiftShader cannot run it in this capture'. Log
// GL/shader complaints so the magenta can be attributed rather than guessed at.
page.on('console', (m) => {
  const t = m.text();
  if (/shader|WebGLProgram|GL_|compile|THREE\./i.test(t)) console.log('GL:', t.slice(0, 300));
});

const shot = (t) => page.screenshot({ path: `${OUT}/${t}.png` });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
await wait(9000);

// Dismiss the install nag; it overlays the start panel.
await page.evaluate(() => {
  const n = [...document.querySelectorAll('button, a')].find((b) => /not now/i.test(b.textContent || ''));
  n?.click();
});
await wait(600);

// Open the mode picker, then take the offline entry.
await page.evaluate(() => {
  const sel = document.querySelector('#mode-select, .mode-select, #play-mode')
    ?? [...document.querySelectorAll('*')].find((e) => /Characters Created/i.test(e.textContent || '') && e.children.length < 8);
  sel?.click();
  (sel?.closest('button, [role=button], div'))?.click();
});
await wait(1200);
await shot('01_picker');

await page.evaluate(() => document.querySelector('#btn-offline')?.click());
await wait(2500);
await shot('02_offline_panel');

const panel = await page.evaluate(() => ({
  hasName: !!document.querySelector('#char-name'),
  classes: [...document.querySelectorAll('#offline-select .mini-class')].map((c) => c.dataset.class),
  start: !!document.querySelector('#btn-start-offline'),
}));
console.log('offline panel:', JSON.stringify(panel));

if (panel.hasName) {
  // page.type() silently no-ops here (the field reports empty afterwards and the
  // panel says "Please enter a character name"). Drive the input through the
  // native value setter and fire the events the app listens for, then CONFIRM the
  // field took before pressing start.
  const filled = await page.evaluate(() => {
    const el = document.querySelector('#char-name');
    if (!el) return null;
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, 'Scout');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#offline-select .mini-class[data-class="warrior"]')?.click();
    return el.value;
  });
  console.log('name field now:', JSON.stringify(filled));
  await wait(500);
  await page.evaluate(() => document.querySelector('#btn-start-offline')?.click());
}

await wait(9000);
await shot('03_after_start');
const post = await page.evaluate(() => ({
  startVisible: !!document.querySelector('#start-screen') &&
    getComputedStyle(document.querySelector('#start-screen')).display !== 'none',
  nameVal: document.querySelector('#char-name')?.value ?? null,
  selected: document.querySelector('#offline-select .mini-class.selected, #offline-select .mini-class[aria-selected=true]')?.dataset?.class ?? null,
  err: [...document.querySelectorAll('.error, .err, [class*=error]')].map((e) => (e.textContent||'').trim()).filter(Boolean).slice(0,4),
  bodyText: (document.body.innerText || '').replace(/\s+/g,' ').slice(0, 300),
}));
console.log('post-start:', JSON.stringify(post));
await page.waitForFunction(() => !!window.__game, { timeout: 300000, polling: 1000 });
console.log('world booted');
await wait(9000);
// Clear everything that dims or covers the scene: the first-run camera prompt
// (a modal that greys the whole world), the no-GPU toast, and the tutorial.
await page.evaluate(() => {
  const hit = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.textContent || ''));
  hit(/confirm/i)?.click();
  hit(/dismiss/i)?.click();
  hit(/skip tutorial/i)?.click();
  hit(/not now/i)?.click();
});
await wait(2500);
await page.evaluate(() => {
  const hit = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.textContent || ''));
  hit(/dismiss/i)?.click();
  hit(/skip tutorial/i)?.click();
});
await wait(3000);
await shot('03_in_world');

// What NPCs exist, and which body did each resolve to?
const npcs = await page.evaluate(() => {
  const g = window.__game;
  const sim = g.sim ?? g.world;
  const buckets = {};
  for (const k of Object.keys(sim)) {
    const v = sim[k];
    const arr = v instanceof Map ? [...v.values()] : v;
    if (Array.isArray(arr) && arr.length && typeof arr[0] === 'object') buckets[k] = arr.length;
  }
  // NPCs are not in sim.npcs on this build - the world keeps everything in
  // sim.entities (505 of them), so read that and keep the named, positioned ones.
  const raw = sim.entities instanceof Map ? [...sim.entities.values()] : (sim.entities ?? []);
  const list = raw.filter((e) => e && e.pos && (e.name || e.npcId || e.kind));
  const player = sim.player ?? null;
  return {
    buckets,
    playerPos: player?.pos ? { x: Math.round(player.pos.x), z: Math.round(player.pos.z) } : null,
    sampleKeys: raw.slice(0, 3).map((e) => Object.keys(e).slice(0, 22)),
    npcs: list.slice(0, 60).map((n) => ({
      id: n.id, name: n.name ?? n.kind ?? n.type,
      visual: n.visual ?? n.visualKey ?? n.bodyKey ?? null,
      pos: n.pos ? { x: Math.round(n.pos.x), z: Math.round(n.pos.z) } : null,
    })),
    total: list.length,
  };
});
writeFileSync(`${OUT}/npcs.json`, JSON.stringify(npcs, null, 1));
console.log('buckets:', JSON.stringify(npcs.buckets));
console.log('npc total:', npcs.total, 'player at', JSON.stringify(npcs.playerPos));
console.log('first npcs:', JSON.stringify(npcs.npcs.slice(0, 8)));

// Photograph the nearest few NPCs with the editor cam.
const targets = npcs.npcs.filter((n) => n.pos).slice(0, 6);
for (const [i, n] of targets.entries()) {
  await page.evaluate((t) => {
    const g = window.__game;
    const sim = g.sim ?? g.world;
    const p = sim.player;
    if (p) { p.maxHp = 99999; p.hp = 99999; }
    const gy = p?.pos?.y ?? 0;
    g.renderer.editorCam = {
      pos: { x: t.x + 4, y: gy + 2.4, z: t.z + 4 },
      target: { x: t.x, y: gy + 1.1, z: t.z },
    };
  }, n.pos);
  // The first-run camera prompt is raised AFTER the spawn cinematic, so a
  // single dismissal before the loop is too early and it greys every frame.
  // Clear it (and the no-GPU toast) immediately before each shot instead.
  await page.evaluate(() => {
    const hit = (re) => [...document.querySelectorAll('button')].find((b) => re.test((b.textContent || '').trim()));
    hit(/^confirm$/i)?.click();
    hit(/^dismiss$/i)?.click();
    hit(/skip tutorial/i)?.click();
  });
  await wait(2200);
  await shot(`npc_${String(i).padStart(2, '0')}_${String(n.name).replace(/\W+/g, '_').slice(0, 24)}`);
  console.log('shot', n.name, JSON.stringify(n.pos));
}

await browser.close();
console.log('done ->', OUT);
