// The Warden's Ledger screenshots: the 10-quest Eastbrook bounty chain in the
// quest log, the on-screen quest tracker mid-chain, and Marshal Redbrook
// offering the ledger quests in his gossip dialog.
// Offline flow (no server). Needs `npm run dev`. Writes PNGs to tmp/.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

import { BROWSER_PATH as EDGE } from './browser_path.mjs';
const URL = process.env.GAME_URL ?? 'http://localhost:5173';
fs.mkdirSync('tmp', { recursive: true });

// The full chain, with a plausible mid-playthrough mix of progress states.
// counts arrays match each quest's objective list length.
const LEDGER = [
  { id: 'q_ledger_first_duty', counts: [8], state: 'ready' },
  { id: 'q_ledger_teeth', counts: [6], state: 'active' },
  { id: 'q_ledger_reedwater', counts: [3], state: 'active' },
  { id: 'q_ledger_silk', counts: [8], state: 'ready' },
  { id: 'q_ledger_brood', counts: [2], state: 'active' },
  { id: 'q_ledger_deepvermin', counts: [12], state: 'ready' },
  { id: 'q_ledger_toll', counts: [5], state: 'active' },
  { id: 'q_ledger_vigil', counts: [4], state: 'active' },
  { id: 'q_ledger_great_boar', counts: [1, 3], state: 'active' },
  { id: 'q_ledger_outlaw_captain', counts: [2, 0], state: 'active' },
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
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const tap = (sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);
const clip = async (sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), width: Math.round(r.width), height: Math.round(r.height) };
}, sel);

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
await tap('#btn-offline');
await wait(200);
await page.evaluate(() => {
  const n = document.querySelector('#char-name');
  if (n) { n.value = 'Warden'; n.dispatchEvent(new Event('input', { bubbles: true })); }
});
await tap('#offline-select .mini-class[data-class="warrior"]');
await tap('#btn-start-offline');
await wait(3000);

// Populate the quest log directly with the whole ledger chain (offline sandbox).
const offered = await page.evaluate(({ LEDGER }) => {
  const sim = window.__game.sim;
  sim.player.maxHp = 99999; sim.player.hp = 99999;
  for (const q of LEDGER) {
    sim.questLog.set(q.id, { questId: q.id, counts: q.counts.slice(), state: q.state });
  }
  return [...sim.questLog.keys()];
}, { LEDGER });
await wait(400);

// 1) Quest log — the full chain with mixed in-progress / complete states.
await page.evaluate(() => window.__game.hud.toggleQuestLog());
await wait(600);
let box = await clip('#quest-log-window');
if (box && box.width > 0) await page.screenshot({ path: 'tmp/ledger_quest_log.png', clip: box });
await page.screenshot({ path: 'tmp/ledger_quest_log_full.png' });

// select the capstone quest so the detail pane shows its narrative + rewards
await page.evaluate(() => {
  const hud = window.__game.hud;
  hud.selectedQuestLogId = 'q_ledger_outlaw_captain';
  hud.renderQuestLog?.();
});
await wait(400);
box = await clip('#quest-log-window');
if (box && box.width > 0) await page.screenshot({ path: 'tmp/ledger_quest_detail.png', clip: box });
await page.evaluate(() => window.__game.hud.toggleQuestLog());
await wait(300);

// 2) Quest tracker — the on-screen objective tracker updates from the log each frame.
await wait(400);
box = await clip('#quest-tracker');
if (box && box.width > 0) await page.screenshot({ path: 'tmp/ledger_quest_tracker.png', clip: box });

// 3) Marshal Redbrook's gossip — offer the ledger quests. Clear the log, mark the
// main story + two ledger prereqs done so the dialog surfaces ledger entries,
// stand on the Marshal so the proximity gate passes, then open the dialog.
const dialogInfo = await page.evaluate(() => {
  const sim = window.__game.sim;
  sim.questLog.clear();
  for (const id of [
    'q_wolves', 'q_greyjaw', 'q_bandits', 'q_ringleader', 'q_mogger_tracks', 'q_mogger',
    'q_ledger_deepvermin', 'q_ledger_great_boar',
  ]) sim.questsDone.add(id);
  sim.player.level = 7;
  let m = null;
  for (const e of sim.entities.values()) if (e.templateId === 'marshal_redbrook') m = e;
  if (m) {
    const p = sim.entities.get(sim.player.id);
    p.pos.x = m.pos.x + 1; p.pos.z = m.pos.z; p.prevPos = { ...p.pos };
  }
  if (m) window.__game.hud.openQuestDialog(m.id);
  return { found: !!m };
});
await wait(700);
box = await clip('#quest-dialog');
if (box && box.width > 0) await page.screenshot({ path: 'tmp/ledger_quest_gossip.png', clip: box });
await page.screenshot({ path: 'tmp/ledger_quest_gossip_full.png' });

console.log('quests in log:', JSON.stringify(offered));
console.log('redbrook found:', dialogInfo.found);
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
console.log('wrote tmp/ledger_quest_{log,detail,tracker,gossip}.png');
await browser.close();
