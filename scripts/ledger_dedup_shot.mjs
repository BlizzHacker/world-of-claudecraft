// Screenshots for the Warden's Ledger de-duplication fix: the retargeted ledger
// quests in the quest log + Marshal Redbrook offering them, proving each is now a
// distinct task (badger/fox/crane/fawn/boar) rather than a clone of a main-story
// quest. Offline flow (no server). Needs `npm run dev`. Writes PNGs to tmp/.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { BROWSER_PATH as EDGE } from './browser_path.mjs';

const URL = process.env.GAME_URL ?? 'http://localhost:5173';
fs.mkdirSync('tmp', { recursive: true });

const LEDGER = [
  { id: 'q_ledger_first_duty', counts: [8], state: 'ready' },
  { id: 'q_ledger_teeth', counts: [6], state: 'active' },
  { id: 'q_ledger_reedwater', counts: [3], state: 'active' },
  { id: 'q_ledger_silk', counts: [8], state: 'ready' },
  { id: 'q_ledger_toll', counts: [5], state: 'active' },
];

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 960 });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const tap = (sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);
const ready = () => page.waitForFunction(() => window.__game && window.__game.sim && window.__game.hud, { timeout: 20000 });
const clip = async (sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), width: Math.round(r.width), height: Math.round(r.height) };
}, sel);

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await tap('#btn-offline');
await wait(300);
await page.evaluate(() => {
  const n = document.querySelector('#char-name');
  if (n) { n.value = 'Warden'; n.dispatchEvent(new Event('input', { bubbles: true })); }
});
await tap('#offline-select .mini-class[data-class="warrior"]');
await tap('#btn-start-offline');
await ready();
await wait(2500);
await ready();

const offered = await page.evaluate(({ LEDGER }) => {
  const sim = window.__game.sim;
  sim.player.maxHp = 99999; sim.player.hp = 99999;
  for (const q of LEDGER) sim.questLog.set(q.id, { questId: q.id, counts: q.counts.slice(), state: q.state });
  return [...sim.questLog.keys()];
}, { LEDGER });
await wait(400);

// 1) Quest log — the retargeted chain.
await page.evaluate(() => window.__game.hud.toggleQuestLog());
await wait(700);
let box = await clip('#quest-log-window');
if (box && box.width > 0) await page.screenshot({ path: 'tmp/dedup_quest_log.png', clip: box });
await page.evaluate(() => window.__game.hud.toggleQuestLog());
await wait(300);

// 2) Marshal Redbrook's gossip — offer the retargeted ledger quests.
const dialogInfo = await page.evaluate(() => {
  const sim = window.__game.sim;
  sim.questLog.clear();
  for (const id of ['q_wolves', 'q_greyjaw', 'q_bandits', 'q_ringleader', 'q_mogger_tracks', 'q_mogger']) sim.questsDone.add(id);
  sim.player.level = 7;
  let m = null;
  for (const e of sim.entities.values()) if (e.templateId === 'marshal_redbrook') m = e;
  if (m) {
    const p = sim.entities.get(sim.player.id);
    p.pos.x = m.pos.x + 1; p.pos.z = m.pos.z; p.prevPos = { ...p.pos };
    window.__game.hud.openQuestDialog(m.id);
  }
  return { found: !!m };
});
await wait(800);
box = await clip('#quest-dialog');
if (box && box.width > 0) await page.screenshot({ path: 'tmp/dedup_quest_gossip.png', clip: box });

console.log('quests in log:', JSON.stringify(offered));
console.log('redbrook found:', dialogInfo.found);
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
await browser.close();
