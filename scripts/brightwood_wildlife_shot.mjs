// Screenshot harness for the Brightwood Glade wildlife pack
// (src/sim/content/zone1.ts mobs/camps/quests/npcs + items.ts). Boots an offline
// level-6 hunter, teleports to the new glade in the north of Eastbrook Vale to
// frame the new beasts, then captures the bag of new drops/rewards and the
// two-step Brightwood questline in the quest log.
//
// Needs `npm run dev` on :5173 (override with GAME_URL). Writes PNGs to tmp/.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { BROWSER_PATH } from './browser_path.mjs';

const URL = process.env.GAME_URL ?? 'http://localhost:5173';
fs.mkdirSync('tmp', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NEW_ITEMS = [
  'glade_pelt', 'soft_down', 'amber_hide', 'stag_antler', 'brightwood_venison',
  'bramblehide_jerkin', 'monarch_crown_helm', 'monarch_heart',
];

const browser = await puppeteer.launch({
  executablePath: BROWSER_PATH,
  headless: 'new',
  args: ['--window-size=1600,1200', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1600, height: 1200 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
const clip = async (sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), width: Math.round(r.width), height: Math.round(r.height) };
}, sel);

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await page.evaluate(() => document.querySelector('#btn-offline').click());
await sleep(200);
await page.evaluate(() => {
  const n = document.querySelector('#char-name');
  if (n) { n.value = 'Gladewatch'; n.dispatchEvent(new Event('input', { bubbles: true })); }
});
await page.click('#offline-select .mini-class[data-class="hunter"]');
await page.click('#btn-start-offline');
await sleep(3000);

// Level 6 hunter, god-moded, teleported into the heart of Brightwood Glade.
await page.evaluate(() => {
  const g = window.__game;
  const p = g.sim.player;
  g.sim.setPlayerLevel(6, p.id);
  p.gm = true; p.maxHp = 99999; p.hp = 99999; p.maxMp = 99999; p.mp = 99999;
  // Brightwood Glade sits around (38, 140) in the far north of Eastbrook Vale.
  p.pos.x = 38; p.pos.z = 138; p.prevPos = { ...p.pos };
  g.input.camYaw = 0; g.input.camPitch = 0.34;
});
await sleep(2500);

// 1) In-world: the new beasts roaming the glade.
await page.screenshot({ path: 'tmp/brightwood_glade.png' });

// pan slightly for a second framing toward the deep glade (stag/bear/monarch).
await page.evaluate(() => {
  const g = window.__game;
  const p = g.sim.player;
  p.pos.x = 36; p.pos.z = 158; p.prevPos = { ...p.pos };
  g.input.camYaw = 0; g.input.camPitch = 0.28;
});
await sleep(2000);
await page.screenshot({ path: 'tmp/brightwood_glade_deep.png' });

// 2) Bags — the eight new drops, reagents, food and reward gear.
const bagBox = await page.evaluate((ids) => {
  const sim = window.__game.sim;
  const pid = sim.player.id;
  for (const id of ids) sim.addItem(id, 1, pid);
  const el = document.querySelector('#bags');
  el.style.display = 'block';
  window.__game.hud.renderBags?.();
  const r = el.getBoundingClientRect();
  return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), width: Math.round(r.width), height: Math.round(r.height) };
}, NEW_ITEMS);
await sleep(700);
{
  const w = Math.max(bagBox.width, 320);
  const h = Math.max(bagBox.height, 360);
  await page.screenshot({ path: 'tmp/brightwood_bags.png', clip: { x: bagBox.x, y: bagBox.y, width: w, height: h } });
}
await page.evaluate(() => { const el = document.querySelector('#bags'); if (el) el.style.display = 'none'; });
await sleep(200);

// 2b) Character paperdoll — the two reward pieces (Monarch's Crown helm +
// Bramblehide Jerkin chest) worn, showing their stats.
await page.evaluate(() => {
  const sim = window.__game.sim;
  const pid = sim.player.id;
  sim.equipItem('monarch_crown_helm', pid);
  sim.equipItem('bramblehide_jerkin', pid);
  window.__game.hud.toggleChar();
});
await sleep(600);
{
  const cbox = await clip('#char-window');
  if (cbox && cbox.width > 0) await page.screenshot({ path: 'tmp/brightwood_character.png', clip: cbox });
  else await page.screenshot({ path: 'tmp/brightwood_character.png' });
}
await page.evaluate(() => window.__game.hud.toggleChar());
await sleep(200);

// 3) Quest log — show the two-step Brightwood questline (with some progress).
// Populate the log directly (same shape acceptQuest builds) so we don't need to
// stand on the giver for the shot.
await page.evaluate(() => {
  const sim = window.__game.sim;
  sim.questLog.set('q_brightwood_thinning', { questId: 'q_brightwood_thinning', counts: [5, 4], state: 'active' });
  sim.questLog.set('q_brightwood_monarch', { questId: 'q_brightwood_monarch', counts: [0], state: 'active' });
  window.__game.hud.renderQuestTracker?.();
});
await sleep(300);
await page.evaluate(() => window.__game.hud.toggleQuestLog());
await sleep(700);
const box = await clip('#quest-log-window');
if (box && box.width > 0) await page.screenshot({ path: 'tmp/brightwood_quests.png', clip: box });
else await page.screenshot({ path: 'tmp/brightwood_quests.png' });

if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
console.log('done -> tmp/brightwood_{glade,glade_deep,bags,quests}.png');
await browser.close();
