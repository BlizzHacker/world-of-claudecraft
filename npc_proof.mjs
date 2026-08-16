// Prove the 20 published NPC casting rows actually reach the screen: enter the
// live infernal ring, ask the renderer what it loaded for each NPC, then stand
// in front of a handful and photograph them. A published override row is a
// promise; only the picture is evidence.
const puppeteer = (await import('puppeteer-core')).default;
const B = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
const T = process.argv[2];
const QS = process.env.CR_QS ?? '';
const U = `https://infernal.crypticrealm.com/${QS}#auth_token=${T}&auth_user=MOVEWEIGHT&auth_via=realm&realm=Infernal&realm_id=infernal`;
const br = await puppeteer.launch({ executablePath: B, headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--ignore-gpu-blocklist', '--enable-webgl'] });
const p = await br.newPage();
await p.setViewport({ width: 1280, height: 720 });
p.on('dialog', d => d.accept());
await p.goto(U, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});

for (let i = 0; i < 30; i++) { if (await p.evaluate(() => document.querySelectorAll('#char-list .char-row').length > 0)) break; await new Promise(r => setTimeout(r, 5000)); }
// Match on the button's own label rather than a class name: a character that is
// already in world offers TAKE OVER instead of ENTER WORLD, and guessing the
// class is what left the last run parked on the roster screen.
const entered = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('#char-list .char-row')];
  const btnIn = (row, want) => [...row.querySelectorAll('button')]
    .find(b => b.textContent.trim().toLowerCase() === want && b.offsetParent !== null && !b.disabled);
  for (const want of ['enter world', 'take over']) {
    for (const row of rows) {
      const b = btnIn(row, want);
      if (b) { row.click(); b.click(); return `${want}: ${row.querySelector('.char-name')?.textContent.trim()}`; }
    }
  }
  return 'NO_BUTTON';
});
console.log('entry:', entered);
let ui = false;
for (let i = 0; i < 40; i++) { ui = await p.evaluate(() => !!document.getElementById('ui')); if (ui) break; await new Promise(r => setTimeout(r, 5000)); }
console.log('in world:', ui);
for (let i = 0; i < 12; i++) {
  const c = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().toLowerCase() === 'confirm' && x.offsetParent !== null); if (b) { b.click(); return true; } return false; });
  if (c) break;
  await new Promise(r => setTimeout(r, 4000));
}
await p.evaluate(() => {
  for (const t of ['skip tutorial', 'not now', 'dismiss']) {
    const b = [...document.querySelectorAll('button,span')].find(x => x.textContent.trim().toLowerCase().includes(t) && x.offsetParent !== null);
    b?.click();
  }
  const css = document.createElement('style');
  css.textContent = '#chat-panel,[class*=season],[id*=install]{opacity:.05!important}';
  document.head.appendChild(css);
});
await new Promise(r => setTimeout(r, 14000));

// Where are the NPCs? Ask the sim, not a hardcoded guess.
const npcs = await p.evaluate(() => {
  const w = window.__crWorld ?? window.world ?? window.__world;
  const src = w?.npcs ?? w?.sim?.npcs ?? window.__crSim?.npcs;
  if (!src) return { err: 'NO_NPC_SOURCE', globals: Object.keys(window).filter(k => /^__cr|world|sim/i.test(k)).slice(0, 30) };
  const list = Array.isArray(src) ? src : [...src.values?.() ?? Object.values(src)];
  return list.map(n => ({ id: n.id ?? n.key ?? n.npcId, name: n.name, x: Math.round(n.x ?? n.pos?.x ?? 0), z: Math.round(n.z ?? n.pos?.z ?? 0) }));
});
console.log('NPCS:', JSON.stringify(npcs).slice(0, 3000));

// Walk a short leg in each direction and photograph what is standing there —
// there is no chat teleport in this build, so the camera has to earn its shots.
const TAG = process.env.CR_TAG ?? 'x';
await p.mouse.click(640, 300);
for (const [key, ms, tag] of [['w', 0, 'spawn'], ['w', 2200, 'fwd'], ['a', 1800, 'left'], ['d', 3200, 'right']]) {
  if (ms) { await p.keyboard.down(key); await new Promise(r => setTimeout(r, ms)); await p.keyboard.up(key); }
  await new Promise(r => setTimeout(r, 4000));
  await p.screenshot({ path: `/tmp/npcp_${TAG}_${tag}.png` });
  console.log('shot', tag);
}

const live = await p.evaluate(() => (window.__crAnim ? window.__crAnim() : 'NO_HOOK'));
console.log('LIVE:', JSON.stringify(live).slice(0, 4000));
await br.close();
console.log('done');
