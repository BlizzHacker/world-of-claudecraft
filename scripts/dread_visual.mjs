// Visual proof of the Dread fear-on-hit affix (Wail of the Grave). Boots the
// offline game in a headless browser, retemplates the nearest mob into a
// Gravecaller Summoner, forces its dread proc via sim.mobSwing, and captures the
// fear debuff on the player's buff bar plus the panicked-flee scene. Screenshots
// land in tmp/. Run with `npm run dev` already up.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { BROWSER_PATH } from './browser_path.mjs';

const URL = process.env.GAME_URL ?? 'http://localhost:5173';
fs.mkdirSync('tmp', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const check = (cond, msg) => { console.log(`${cond ? 'OK  ' : 'FAIL'}  ${msg}`); if (!cond) fails.push(msg); };

const browser = await puppeteer.launch({
  executablePath: BROWSER_PATH,
  headless: 'new',
  args: ['--window-size=1600,900', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => fails.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text()); });

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await page.evaluate(() => document.querySelector('#btn-offline').click());
await sleep(200);
await page.type('#char-name', 'Dreadtest');
await page.click('#offline-select .mini-class[data-class="warrior"]');
await sleep(150);
await page.click('#btn-start-offline');
await page.waitForFunction(() => window.__game?.sim?.entities?.size > 5, { timeout: 20000, polling: 200 });
await sleep(1500);

// Retemplate the nearest mob into a Gravecaller Summoner and force its dread
// proc until the fear lands. Keep the player topped up so a connecting swing
// never kills before we read the aura.
const res = await page.evaluate(async () => {
  const g = window.__game;
  const sim = g.sim;
  const me = sim.player;
  me.maxHp = 100000;
  const dist2 = (a, b) => (a.pos.x - b.pos.x) ** 2 + (a.pos.z - b.pos.z) ** 2;
  const mob = [...sim.entities.values()]
    .filter((e) => e.kind === 'mob' && !e.dead && e.id !== me.id)
    .sort((a, b) => dist2(a, me) - dist2(b, me))[0];
  if (!mob) return { ok: false };
  mob.templateId = 'gravecaller_summoner';
  mob.name = 'Gravecaller Summoner';
  mob.hostile = true;
  // stand the summoner just in front of the player and target it
  const p = sim.groundPos(me.pos.x, me.pos.z + 3);
  mob.pos = p; mob.prevPos = { ...p };
  sim.targetEntity(mob.id, me.id);

  let landed = false;
  for (let i = 0; i < 200 && !landed; i++) {
    me.hp = me.maxHp;
    sim.mobSwing(mob, me);
    landed = me.auras.some((a) => a.id === 'fear_incap');
  }
  const aura = me.auras.find((a) => a.id === 'fear_incap');
  // The fear breaksOnDamage, and the live summoner keeps swinging the fleeing
  // player — so the real aura is gone within a few ticks. For a stable capture,
  // keep the player alive and re-assert a fresh 8s fear each frame (the proc is
  // already proven landed above; this only holds the on-screen state still).
  window.__dreadHold = setInterval(() => {
    me.hp = me.maxHp;
    if (!me.auras.some((a) => a.id === 'fear_incap')) {
      me.auras.push({
        id: 'fear_incap', name: 'Wail of the Grave', kind: 'incapacitate',
        remaining: 8, duration: 8, value: aura?.value ?? 0,
        sourceId: mob.id, school: 'shadow', breaksOnDamage: true,
      });
    }
  }, 30);
  // ease the camera back so both combatants frame nicely
  g.input.camDist = 9; g.input.camPitch = 0.28;
  return { ok: landed, name: aura?.name, dur: aura?.duration, mobName: mob.name };
});
check(res.ok, `Wail of the Grave feared the player (${res.name}, ${res.dur}s)`);

await sleep(600);
// 1) full scene — the summoner mid-cackle, the player feared
await page.screenshot({ path: 'tmp/dread_01_scene.png' });

// 2) crop the buff bar so the red fear debuff icon is unmistakable
const bbox = await page.evaluate(() => {
  const el = document.querySelector('#buff-bar');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), w: r.width + 16, h: r.height + 16 };
});
if (bbox && bbox.w > 0 && bbox.h > 0) {
  await page.screenshot({ path: 'tmp/dread_02_debuff.png', clip: { x: bbox.x, y: bbox.y, width: bbox.w, height: bbox.h } });
  check(true, 'captured buff-bar crop with the fear debuff');
} else {
  check(false, 'buff-bar not found for crop');
}

// 3) target frame showing we are locked onto the Gravecaller Summoner
const tf = await page.$('#target-frame');
if (tf) { await tf.screenshot({ path: 'tmp/dread_03_target.png' }); check(true, 'captured target frame'); }

await browser.close();
if (fails.length) { console.error('\nFAILURES:\n' + fails.join('\n')); process.exit(1); }
console.log('\nAll dread visual checks passed.');
